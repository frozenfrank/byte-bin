import Papa, { ParseResult } from 'papaparse';
import { renderPeriodBarCharts, renderSummaryCharts } from './charts';
import { getElementById } from './helper';
import { updateDataStatus, updateDataStatusMissingColumns } from './import-data';
import { DateValue, TimeScale } from './model/types';
import { WaButton, WaCallout, WaFileInput, WaOption, WaRadioGroup, WaSelect, WaSwitch, WaTab, WaTabGroup } from './model/web-awesome';
import { buildMonthlyMarkdownReport } from './markdown-report';
import { buildTimecardReportElement } from './report';
import { PapaParseCSVResult, TimeEntry, TimeEntryData, TogglExportTimeEntry } from './time-entry/time-entry';
import { convertApiDataToTimeEntryData, convertParsedCsvToTimeEntryData, findMissingRequiredColumns } from './time-entry/time-entry-processing';
import { analyzeTimeEntry } from './time-entry/analysis';
import { filterTimeEntriesByDateRange, prepareTimecardEntries } from './time-entry/timecard-grouping';
import { getTimeEntries } from './toggl/access';

const IMPORT_METHOD_INPUT_ID = 'import-data-method';
const IMPORT_METHOD_STORAGE_KEY = 'importMethod';
const INPUT_FILE_ID = 'togglFileInput';

const TIME_SCALE_INPUT_ID = 'timeScaleInput';
const DAY_SELECT_ID = 'daySelect';
const WEEK_SELECT_ID = 'weekSelect';
const MONTH_SELECT_ID = 'monthSelect';
const CLIENT_SELECT_ID = 'clientSelect';
const CLIENT_FILTER_STORAGE_KEY = 'clientFilter';
const OUTPUT_PRE_ID = 'timecardReport';
const SHOW_ALL_DESC_ID = 'showAllDescriptionsSwitch';
const REQUIRE_BILLABLE_ID = 'requireBillableSwitch';
const GROUP_BY_XDS_ID = 'groupByXdsSwitch';
const GROUP_BY_TLP_ID = 'groupByTlpSwitch';
const PERCENT_STACKED_ID = 'percentStackedSwitch';
const NEXT_DAY_BUTTON_ID = 'nextDayButton';
const PREV_DAY_BUTTON_ID = 'prevDayButton';
const PREV_NEXT_LABEL_CLASS = 'prevNextLabel';
const EXPORT_MONTHLY_BUTTON_ID = 'exportMonthlyButton';
const EXPORT_MONTHLY_LABEL_ID = 'exportMonthlyLabel';

const TOGGL_FORM = 'download-toggl-form';
const TOGGL_TOKEN_ID = 'download-toggl-token';
const TOGGL_DOWNLOAD_BUTTON = 'download-toggl-button';
const TOGGL_DOWNLOAD_LABEL = 'download-toggl-label';
const TOGGL_TIP_ID = 'toggl-api-tip';


let interpretedTimeData = {
  /** Sorted list of unique projects */
  uniqueProjects: [] as string[],
  /** Sorted list of unique client names */
  uniqueClients: [] as string[],
  /** Sorted list of unique dates */
  uniqueDays: [] as Date[],
  /** Sorted list of unique weeks */
  uniqueWeeks: [] as Date[],
  /** Sorted list of unique months */
  uniqueMonths: [] as Date[],
  /** Sorted list of unique date values (number values). Used for moving between dates. */
  uniqueDayValues: [] as DateValue[],
  /** Sorted list of unique date values (number values). Used for moving between dates. */
  uniqueWeekValues: [] as DateValue[],
  /** Sorted list of unique date values (number values). Used for moving between dates. */
  uniqueMonthValues: [] as DateValue[],
  /** Whether the data includes client information */
  hasClientData: false as boolean,
  /** Whether the data includes billable information */
  hasBillableData: false as boolean,

  /** All the data from PapaParse */
  allData: null as TimeEntry[] | null,
};

// ### Handle File Input and Data Parsing ###

// Dynamically display input options
const importMethodInput = getElementById<WaRadioGroup>(IMPORT_METHOD_INPUT_ID);
customElements.whenDefined('wa-radio-group')
  .then(() => importMethodInput.updateComplete)
  .then(async () => {
    const saved = localStorage.getItem(IMPORT_METHOD_STORAGE_KEY);
    if (saved !== null) importMethodInput.value = saved;
    await importMethodInput.updateComplete;
    handleImportMethodChange();
  });
importMethodInput.addEventListener('change', handleImportMethodChange);
importMethodInput.addEventListener('click', handleImportMethodChange);
function handleImportMethodChange(_e?: Event) {
  const selectedValue = importMethodInput.value as string;
  try {
    localStorage.setItem(IMPORT_METHOD_STORAGE_KEY, selectedValue);
  } catch (err) {
    console.warn('Could not save import method to localStorage', err);
  }
  const displayElements = document.querySelectorAll<HTMLElement>(`[show-data-for=${IMPORT_METHOD_INPUT_ID}]`);
  displayElements.forEach(el => {
    const displayValue = el.getAttribute("data-value");
    el.style.display = displayValue === selectedValue ? "contents" : "none";
  });
}

// Respond to file input change
const fileInput = getElementById<WaFileInput>(INPUT_FILE_ID);
fileInput.addEventListener('change', handleInputFileChange);
function handleInputFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (!files?.length) {
    updateDataStatus(null);
    return;
  }

  Papa.parse<TogglExportTimeEntry, File>(files[0], {
    header: true,
    complete: handleDataParsed,
  });
}

// Respond to data parsing
function handleDataParsed(results: ParseResult<TogglExportTimeEntry>) {
  if (results.errors?.length) {
    console.error("Errors parsing the input file: \n  " + results.errors.map(e => e.message).join("\n  ") + "\n", results.errors);
    updateDataStatus([]);
    return;
  }

  const parsed = results as PapaParseCSVResult<TogglExportTimeEntry>;

  const missing = findMissingRequiredColumns(parsed);
  if (missing.length) {
    console.error('Import missing required columns: ' + missing.join(', '));
    void updateDataStatusMissingColumns(missing);
    return;
  }

  const timeEntryData = convertParsedCsvToTimeEntryData(parsed);
  void processTimeEntryData(timeEntryData);
}

// ### Workflow Step Gating ###

// All steps after the first ("Import Data"). Referenced positionally so we never
// depend on a tab's id or panel attribute. The initial disabled state lives in the
// HTML (fragment.html); we only re-toggle it as data becomes available/unavailable.
const tabGroup = document.querySelector<WaTabGroup>('wa-tab-group')!;
const gatedTabs = Array.from(tabGroup.querySelectorAll<WaTab>('wa-tab')).slice(1);

// Tab strip sits on the side for desktop, but moves to the top on tablet and
// smaller viewports where horizontal space is scarce. See dark-mode handler in
// index.html for the matchMedia pattern this mirrors.
const compactTabsQuery = matchMedia('(max-width: 768px)');
async function applyTabPlacement(): Promise<void> {
  tabGroup.placement = compactTabsQuery.matches ? 'top' : 'start';
  await tabGroup.updateComplete;
}
void applyTabPlacement();
compactTabsQuery.addEventListener('change', () => void applyTabPlacement());

/**
 * Enables every workflow step after the first when `available` is true, and
 * disables them (leaving only "Import Data" reachable) when false.
 */
export async function setStepsAvailable(available: boolean): Promise<void> {
  gatedTabs.forEach(tab => { tab.disabled = !available; });
  await Promise.all(gatedTabs.map(tab => tab.updateComplete));
}

async function processTimeEntryData(timeEntryData: TimeEntryData<any>): Promise<void> {
  /** Maps some numeric value to a unique Date value */
  type DateMap = Map<number, Date>;

  const allProjects = new Set<string>();
  const allClients = new Set<string>();
  const allDates: DateMap = new Map();
  const allWeeks: DateMap = new Map();
  const allMonths: DateMap = new Map();

  timeEntryData.entries.forEach((entry) => {
    allProjects.add(entry.projectName);
    if (entry.clientName) allClients.add(entry.clientName);

    entry._computedDates = prepareComputedDateValues(entry.start);
    entry._analysis = analyzeTimeEntry(entry);
    allDates.set(+entry._computedDates.day, entry._computedDates.day);
    allWeeks.set(+entry._computedDates.week, entry._computedDates.week);
    allMonths.set(+entry._computedDates.month, entry._computedDates.month);
  });

  const uniqueProjects = Array.from(allProjects).sort();
  const uniqueClients = Array.from(allClients).sort();

  const dateMapToSortedArr = (dateMap: DateMap) => Array.from(dateMap.values()).sort((a,b) => +a - +b);
  const dateArrToValuesArr = (dateArr: Date[]) => dateArr.map(d => +d);

  const uniqueDays = dateMapToSortedArr(allDates);
  const uniqueWeeks = dateMapToSortedArr(allWeeks);
  const uniqueMonths = dateMapToSortedArr(allMonths);

  interpretedTimeData = {
    uniqueProjects,
    uniqueClients,
    uniqueDays, uniqueDayValues: dateArrToValuesArr(uniqueDays),
    uniqueWeeks, uniqueWeekValues: dateArrToValuesArr(uniqueWeeks),
    uniqueMonths, uniqueMonthValues: dateArrToValuesArr(uniqueMonths),
    hasClientData: timeEntryData.hasClientData,
    hasBillableData: timeEntryData.hasBillableData,
    allData: timeEntryData.entries,
  }

  requireBillableSwitch.disabled = !interpretedTimeData.hasBillableData;
  if (interpretedTimeData.hasBillableData) {
    const savedRequireBillable = localStorage.getItem(requireBillableSwitch.id);
    requireBillableSwitch.checked = savedRequireBillable !== null ? savedRequireBillable === 'true' : false;
  } else {
    requireBillableSwitch.checked = false;
  }

  const prevDayValue = +(daySelect.value || 0);

  await Promise.all([
    requireBillableSwitch.updateComplete,
    populateDateSelector(DAY_SELECT_ID, uniqueDays, "date", d => d.toLocaleDateString('default', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' })),
    populateDateSelector(WEEK_SELECT_ID, uniqueWeeks, "week", w => {
      const end = new Date(w);
      end.setDate(end.getDate() + 6);
      return w.toLocaleDateString('default', { month: 'short', day: 'numeric' }) + " – "
         + end.toLocaleDateString('default', { month: 'short', day: 'numeric', year: '2-digit' });
    }),
    populateDateSelector(MONTH_SELECT_ID, uniqueMonths, "month", m => m.toLocaleString('default', { month: 'long', year: 'numeric' })),
    populateClientSelector(uniqueClients, interpretedTimeData.hasClientData),
  ]);

  const mostRecentDay = interpretedTimeData.uniqueDayValues[interpretedTimeData.uniqueDayValues.length - 1];
  const targetDay = prevDayValue && interpretedTimeData.uniqueDayValues.some(d => d >= prevDayValue)
    ? prevDayValue
    : mostRecentDay;
  await setDateSelectValues(targetDay);

  await Promise.all([
    updatePrevNextLabels(),
    updateDataStatus(interpretedTimeData.allData, interpretedTimeData.uniqueDays),
  ]);
}

function prepareComputedDateValues(start: Date) {
  const year = start.getFullYear();
  const month = start.getMonth();
  const date = start.getDate();

  return {
    day: new Date(year, month, date),
    week: new Date(year, month, date - start.getDay()),
    month: new Date(year, month, 1),
  };
}

// Respond to form submit
const togglForm = getElementById(TOGGL_FORM);
const togglTokenInput = getElementById<WaButton>(TOGGL_TOKEN_ID);
const togglSubmitButton = getElementById<WaButton>(TOGGL_DOWNLOAD_BUTTON);
const togglSubmitLabel = getElementById(TOGGL_DOWNLOAD_LABEL);

/** Local storage key for saving/restoring the Toggl API token */
const TOGGL_TOKEN_STORAGE_KEY = 'togglApiToken';

function setTogglTipVisible(visible: boolean) {
  getElementById<WaCallout>(TOGGL_TIP_ID)!.style.display = visible ? '' : 'none';
}

// Restore saved token (if any) when the page loads and update UI
document.addEventListener('DOMContentLoaded', applySavedTogglToken);
async function applySavedTogglToken(): Promise<void> {
  const _savedToken = localStorage.getItem(TOGGL_TOKEN_STORAGE_KEY);
  if (!_savedToken) return;

  togglTokenInput.value = _savedToken;
  await togglTokenInput.updateComplete;
  togglTokenInput.dispatchEvent(new Event('input', { bubbles: true }));
  setTogglTipVisible(false);
}

// Restore saved switch settings on page load
// Wait for the wa-switch class to be defined, then wait for each element's
// first Lit render to complete before applying saved state.
customElements.whenDefined('wa-switch')
  .then(() => Promise.all(switchSettings.map(sw => sw.updateComplete)))
  .then(() => applySavedSwitchSettings());

async function applySavedSwitchSettings(): Promise<void> {
  for (const sw of switchSettings) {
    const saved = localStorage.getItem(sw.id);
    if (saved !== null) sw.checked = saved === 'true';
  }
  await Promise.all(switchSettings.map(sw => sw.updateComplete));
}

togglTokenInput.addEventListener('input', handleTogglTokenChange);
async function handleTogglTokenChange(e: Event): Promise<void> {
  const token = (e.target as HTMLInputElement).value;

  if (!token?.length) {
    localStorage.removeItem(TOGGL_TOKEN_STORAGE_KEY);
    setTogglTipVisible(true);
  }
  const tokenInputValid = token?.length>=32
  togglSubmitButton.disabled=!tokenInputValid;
  await togglSubmitButton.updateComplete;
}

togglForm.addEventListener('submit', handleTogglFormSubmit);
async function handleTogglFormSubmit(e: Event): Promise<void> {
  e.preventDefault();  // Skip default form submit behavior
  if (togglSubmitButton.loading) return; // Ensure no double-submitting

  togglSubmitButton.loading = true;
  togglSubmitLabel.innerText = "Refresh Data";
  await togglSubmitButton.updateComplete;

  const token = togglTokenInput.value;

  // Persist token to localStorage so it can be restored on next visit
  try {
    localStorage.setItem(TOGGL_TOKEN_STORAGE_KEY, token);
  } catch (err) {
    // Ignore storage errors (e.g. private mode) but don't prevent download
    console.warn('Could not save Toggl token to localStorage', err);
  }

  await downloadTogglTimeEntries(token);
  togglSubmitButton.loading = false;
  await togglSubmitButton.updateComplete;
}

async function downloadTogglTimeEntries(token: string) {
  const downloadStartDate = new Date(+new Date() - 1000*60*60*24*89); // most recent 89 days
  const togglApiData = await getTimeEntries(token, downloadStartDate);

  const timeEntryData = convertApiDataToTimeEntryData(togglApiData);
  await processTimeEntryData(timeEntryData);
  setTogglTipVisible(false);
}

// ### Handle Filter Changes ###

// Respond to date selector change
const timeScaleInput = getElementById<WaRadioGroup>(TIME_SCALE_INPUT_ID);
const nextPrevLabels = document.getElementsByClassName(PREV_NEXT_LABEL_CLASS)!;
const daySelect = getElementById<WaSelect>(DAY_SELECT_ID);
const weekSelect = getElementById<WaSelect>(WEEK_SELECT_ID);
const monthSelect = getElementById<WaSelect>(MONTH_SELECT_ID);
const clientSelect = getElementById<WaSelect>(CLIENT_SELECT_ID);

clientSelect.addEventListener('change', handleClientChange);
async function handleClientChange(_e?: Event): Promise<void> {
  try {
    localStorage.setItem(CLIENT_FILTER_STORAGE_KEY, clientSelect.value as string); // We only allow selecting a single Client
  } catch (err) {
    console.warn('Could not save client filter to localStorage', err);
  }
  await renderTimecardReport();
}

timeScaleInput.addEventListener('change', handleTimeScaleChange);
document.addEventListener('DOMContentLoaded', () => void updatePrevNextLabels());
async function handleTimeScaleChange(_e: Event): Promise<void> {
  await updatePrevNextLabels();
  await renderTimecardReport();
}

async function updatePrevNextLabels(): Promise<void> {
  let labelText = "";
  let buttonsDisabled = false;
  let displaySelect = null;

  switch (+(timeScaleInput.value || 0)) {
    case 1: labelText = 'Day'; displaySelect = daySelect; break;
    case 2: labelText = 'Week'; displaySelect = weekSelect; break;
    case 3: labelText = 'Month'; displaySelect = monthSelect; break;
    default:
      buttonsDisabled = true;
      break;
  }

  if (!interpretedTimeData.uniqueDayValues.length) buttonsDisabled = true;
  nextButton.disabled = buttonsDisabled;
  prevButton.disabled = buttonsDisabled;

  for (const label of nextPrevLabels) {
    label.textContent = labelText;
  }
  for (const selectEl of [daySelect, weekSelect, monthSelect]) {
    selectEl.style.display = (selectEl === displaySelect) ? '' : 'none';
  }

  await Promise.all([nextButton.updateComplete, prevButton.updateComplete]);
}

daySelect.addEventListener('change', handleDayChange);
function handleDayChange(e: Event) {
  const selectedDay = (e.target as HTMLInputElement).value;
  void setDateSelectValues(+selectedDay,true);
}

weekSelect.addEventListener('change', handleWeekChange);
function handleWeekChange(e: Event) {
  const selectedWeek = (e.target as HTMLInputElement).value;
  void setDateSelectValues(+selectedWeek,true);
}

monthSelect.addEventListener('change', handleMonthChange);
function handleMonthChange(e: Event) {
  const selectedMonth = (e.target as HTMLInputElement).value;
  void setDateSelectValues(+selectedMonth,true);
}

/** Updates all date selectors with the provided date value.
 * @param {number} dateValue - The date value to set (as a number, or Date object).
 * @param {boolean} suppressEvent - Whether to suppress change events for the selectors.
 */
async function setDateSelectValues(dateValue: Date|DateValue, suppressEvent=false) {
  const computedDates = prepareComputedDateValues(new Date(dateValue));
  const dayValue = Number(computedDates.day);
  const weekValue = Number(computedDates.week);
  const monthValue = Number(computedDates.month);

  daySelect.value = ""+interpretedTimeData.uniqueDayValues.find(d => d >= dayValue);
  weekSelect.value = ""+interpretedTimeData.uniqueWeekValues.find(w => w >= weekValue);
  monthSelect.value = ""+interpretedTimeData.uniqueMonthValues.find(m => m >= monthValue);

  // After populateDateSelector() replaces a wa-select's options, its options
  // cache is briefly stale (refreshed via a queued microtask), and reading
  // back daySelect.value returns null until that completes. Await each
  // select's updateComplete so the subsequent value reads in
  // interpretMinMaxFilterDates() pick up the new selection.
  await Promise.all([
    daySelect.updateComplete,
    weekSelect.updateComplete,
    monthSelect.updateComplete,
  ]);

  if (!suppressEvent) {
    const changedSelector = +(timeScaleInput.value || 0);
    (changedSelector === 1) && daySelect.dispatchEvent(new Event('change', { bubbles: true }));
    (changedSelector === 2) && weekSelect.dispatchEvent(new Event('change', { bubbles: true }));
    (changedSelector === 3) && monthSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  await renderTimecardReport();
}

/**
 * Populate a date selector dropdown with options.
 *
 * @param {string} selectId - The ID of the select element.
 * @param {Array<Date>} dates - The sorted array of date values to populate.
 * @param {string} entityNameSingular - The singular name of the entity (e.g., "date").
 * @param {Function<Date,string>} dateFormatter - A function to format the date for display.
 * @returns {void}
 */
async function populateDateSelector(selectId: string, dates: Date[], entityNameSingular: string, dateFormatter: (date: Date) => string): Promise<void> {
  // Get select element
  const select = document.getElementById(selectId) as WaSelect | null;
  if (!select) {
    console.error(`Date selector element with ID '${selectId}' not found.`);
    return;
  }

  // Reset options
  select.innerHTML = '';

  // Empty state
  if (!dates.length) {
    select.appendChild(createOptionElement('', `-- No available ${entityNameSingular}s --`));
    await select.updateComplete;
    return;
  }

  // Add a default prompt option
  select.appendChild(createOptionElement('', `-- Choose a ${entityNameSingular} --`));

  // Populate options
  dates.forEach(date => {
    const formattedDate = dateFormatter(date);
    select.appendChild(createOptionElement(+date, formattedDate));
  });

  await select.updateComplete;
}

function createOptionElement(value: string|number, text: string): WaOption {
  const opt = document.createElement('wa-option') as WaOption;
  opt.setAttribute('value', ""+value);
  opt.textContent = text;
  return opt;
}

/**
 * Populate the client selector with sorted unique client names. If no client
 * data is available, render a single disabled placeholder. Restores any saved
 * selection from localStorage when the saved client still exists in the list.
 *
 * @param {string[]} clients - Sorted array of unique client names.
 * @param {boolean} hasClientData - Whether the dataset includes client info.
 */
async function populateClientSelector(clients: string[], hasClientData: boolean): Promise<void> {
  clientSelect.innerHTML = '';
  clientSelect.disabled = !hasClientData;

  if (!hasClientData || !clients.length) {
    const opt = createOptionElement('', '-- No Clients --');
    opt.setAttribute('selected', '');
    opt.setAttribute('disabled', '');
    clientSelect.appendChild(opt);

    await clientSelect.updateComplete;
    return;
  }

  clientSelect.appendChild(createOptionElement('', '-- All Clients --'));
  clients.forEach(name => clientSelect.appendChild(createOptionElement(name, name)));

  const saved = localStorage.getItem(CLIENT_FILTER_STORAGE_KEY);
  if (saved && clients.includes(saved)) {
    clientSelect.value = saved;
  } else {
    clientSelect.value = '';
  }

  await clientSelect.updateComplete;
}


// Attach event listeners to next/prev buttons
const nextButton = getElementById<WaButton>(NEXT_DAY_BUTTON_ID);
nextButton.addEventListener('click', () => void incrementSelectedDate(false));

const prevButton = getElementById<WaButton>(PREV_DAY_BUTTON_ID);
prevButton.addEventListener('click', () => void incrementSelectedDate(true));

const exportMonthlyButton = getElementById<WaButton>(EXPORT_MONTHLY_BUTTON_ID);
const exportMonthlyLabel = getElementById(EXPORT_MONTHLY_LABEL_ID);
exportMonthlyButton.addEventListener('click', () => void handleExportMonthlyClick());

// Keyboard shortcuts: N = next, P = previous
document.addEventListener('keydown', (e) => {
  // ignore when modifier keys are held
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  // don't interfere while typing in inputs/textareas/contenteditable
  const active = document.activeElement as HTMLElement | null;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;

  const key = e.key.toLowerCase();
  switch (key) {
    case 'n':  void incrementSelectedDate(false);  break;
    case 'p':  void incrementSelectedDate(true);   break;
    case 'd':  showAllDescSwitch.click();          break;
    case 'b':  requireBillableSwitch.click();      break;
    case 'l':  groupByTlpSwitch.click();           break;
    case 'x':  groupByXdsSwitch.click();           break;
    case 'c':  percentStackedSwitch.click();       break;
    case 't':  void incrementTimeScale(false);     break;

    case 'o':  void setTimeScale(1);               break;
    case 'w':  void setTimeScale(2);               break;
    case 'm':  void setTimeScale(3);               break;
    case 'a':  void setTimeScale(4);               break;

    default:
      return; // ignore other keys
  }
  e.preventDefault();
});

async function incrementSelectedDate(backward=false): Promise<void> {
  let dateValuesArr;
  let dateSelect;
  switch (+(timeScaleInput.value || 0)) {
    case 1: dateValuesArr = interpretedTimeData.uniqueDayValues; dateSelect = daySelect; break;
    case 2: dateValuesArr = interpretedTimeData.uniqueWeekValues; dateSelect = weekSelect; break;
    case 3: dateValuesArr = interpretedTimeData.uniqueMonthValues; dateSelect = monthSelect; break;
    default:
      return; // Mode does not support date incrementing
  }

  const numValues = dateValuesArr.length;
  if (!numValues) return;
  if (!dateSelect) {
    throw new Error(`Date select element no longer present in DOM.`);
  }

  const currentValue = +(dateSelect.value || 0);
  let currentIndex = currentValue ? dateValuesArr.indexOf(currentValue) : 0;  // O(n) operation
  if (currentIndex < 0) currentIndex = 0;

  const direction = backward ? -1 : 1;
  const nextIndex = (currentIndex + direction + numValues) % numValues;
  const nextValue = dateValuesArr[nextIndex];
  await setDateSelectValues(nextValue);
}

async function incrementTimeScale(backward=false): Promise<void> {
  const numValues = 4; // Day, Week, Month, All [Ranged 1-4]

  const currentScale = +(timeScaleInput.value || 0);
  const direction = backward ? -1 : 1;
  const nextScale = ((currentScale - 1 + direction + numValues) % numValues) + 1; // Shift to 0-based, mod, shift back to 1-based
  await setTimeScale(nextScale);
}

async function setTimeScale(scaleValue: number): Promise<void> {
  timeScaleInput.value = ""+scaleValue;
  await timeScaleInput.updateComplete;
  await updatePrevNextLabels();
  await renderTimecardReport();
}

// Allow toggling display of all descriptions
const showAllDescSwitch = getElementById<WaSwitch>(SHOW_ALL_DESC_ID);
showAllDescSwitch.addEventListener('change', handleShowAllDescChange);
async function handleShowAllDescChange(_e: Event): Promise<void> {
  await renderTimecardReport();
}

// Allow toggling require-billable filter
const requireBillableSwitch = getElementById<WaSwitch>(REQUIRE_BILLABLE_ID);
requireBillableSwitch.addEventListener('change', () => void renderTimecardReport());

const groupByXdsSwitch = getElementById<WaSwitch>(GROUP_BY_XDS_ID);
groupByXdsSwitch.addEventListener('change', () => void renderTimecardReport());

const groupByTlpSwitch = getElementById<WaSwitch>(GROUP_BY_TLP_ID);
groupByTlpSwitch.addEventListener('change', () => void renderTimecardReport());

// Allow plotting the stacked type charts as each period's 0-100% composition
const percentStackedSwitch = getElementById<WaSwitch>(PERCENT_STACKED_ID);
percentStackedSwitch.addEventListener('change', () => void renderTimecardReport());

const switchSettings = [showAllDescSwitch, requireBillableSwitch, groupByXdsSwitch, groupByTlpSwitch, percentStackedSwitch];

function saveSwitchSettings() {
  try {
    for (const sw of switchSettings) localStorage.setItem(sw.id, ""+sw.checked);
  } catch (err) {
    console.warn('Could not save settings to localStorage', err);
  }
}

for (const sw of switchSettings) {
  sw.addEventListener('change', saveSwitchSettings);
}

// ### Extract and Prepare Timecard Entries ###

async function renderTimecardReport(): Promise<void> {
  // Retrieve current settings from UI
  const timeData = interpretedTimeData.allData ?? [];
  const showAllDescriptions = showAllDescSwitch.checked;
  const {minDateIncl,maxDateExcl} = interpretMinMaxFilterDates();
  const filterClientName = clientSelect.value as string || null;

  // Organize and format entries
  const groupByTlp = groupByTlpSwitch.checked;
  const groupByXds = groupByXdsSwitch.checked;
  const filteredData = filterTimeEntriesByDateRange(timeData,minDateIncl,maxDateExcl,requireBillableSwitch.checked,filterClientName);
  const entries = prepareTimecardEntries(filteredData, groupByXds, groupByTlp);

  const reportEl = buildTimecardReportElement(entries, showAllDescriptions, groupByXds, groupByTlp);
  const outputEl = getElementById(OUTPUT_PRE_ID);
  outputEl.replaceChildren(reportEl);

  // Summarize data for time period chart
  const allFilteredForBars = filterTimeEntriesByDateRange(timeData, null, null, requireBillableSwitch.checked, filterClientName);
  const timeScale = +timeScaleInput.value! as TimeScale;
  const activePeriodValue =
    timeScale === TimeScale.Day   ? +(daySelect.value   || 0) :
    timeScale === TimeScale.Week  ? +(weekSelect.value  || 0) :
    timeScale === TimeScale.Month ? +(monthSelect.value || 0) :
    null;

  await Promise.all([
    renderSummaryCharts(filteredData),
    renderPeriodBarCharts({
      allFiltered: allFilteredForBars,
      timeScale,
      activePeriodValue,
      stackAsPercent: percentStackedSwitch.checked,
      uniqueDayValues:   interpretedTimeData.uniqueDayValues,
      uniqueWeekValues:  interpretedTimeData.uniqueWeekValues,
      uniqueMonthValues: interpretedTimeData.uniqueMonthValues,
    }),
    updateExportButtonLabel(),
  ]);
}

function interpretMinMaxFilterDates() {
  let minDateIncl = null;
  let maxDateExcl = null;

  const oneDay = 24 * 60 * 60 * 1000;
  switch (+timeScaleInput.value!) {
    case 1: // Day
      if (!daySelect.value) break;
      minDateIncl = new Date(+daySelect.value);
      maxDateExcl = new Date(+daySelect.value + oneDay);
      break;
    case 2: // Week
      if (!weekSelect.value) break;
      minDateIncl = new Date(+weekSelect.value);
      maxDateExcl = new Date(+weekSelect.value + (7 * oneDay));
      break;
    case 3: // Month
      if (!monthSelect.value) break;
      minDateIncl = new Date(+monthSelect.value);
      maxDateExcl = new Date(minDateIncl.getFullYear(), minDateIncl.getMonth() + 1, 1);
      break;
  }

  return { minDateIncl, maxDateExcl };
}

// ### Monthly Markdown Report Export ###

/**
 * Resolve the month the Export button should target, based on the current time
 * scale and selection. For All Time (4) we fall back to the most recent month
 * that has data so the user doesn't have to narrow the selection first.
 */
function getCurrentlySelectedMonth(): Date | null {
  let sourceValue: number;
  switch (+(timeScaleInput.value || 0)) {
    case 1: sourceValue = +(daySelect.value   || 0); break;
    case 2: sourceValue = +(weekSelect.value  || 0); break;
    case 3: sourceValue = +(monthSelect.value || 0); break;
    case 4: {
      const months = interpretedTimeData.uniqueMonthValues;
      sourceValue = months.length ? months[months.length - 1] : 0;
      break;
    }
    default: return null;
  }
  if (!sourceValue) return null;
  const d = new Date(sourceValue);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function updateExportButtonLabel(): Promise<void> {
  const month = getCurrentlySelectedMonth();
  const hasData = !!interpretedTimeData.allData?.length;
  if (!month || !hasData) {
    exportMonthlyLabel.textContent = 'Export Monthly';
    exportMonthlyButton.disabled = true;
  } else {
    const label = month.toLocaleString('default', { month: 'long', year: 'numeric' });
    exportMonthlyLabel.textContent = `Export ${label} data`;
    exportMonthlyButton.disabled = false;
  }
  await exportMonthlyButton.updateComplete;
}

/**
 * Produces names like "toggl-to-delorean-jan2026-543.md". The salt is the
 * number of minutes past midnight at generation time, which makes most
 * same-month exports get distinct filenames without needing a counter.
 */
function generateReportFilename(monthDate: Date): string {
  const monthShort = monthDate.toLocaleString('en-US', { month: 'short' }).toLowerCase();
  const year = monthDate.getFullYear();
  const now = new Date();
  const salt = now.getHours() * 60 + now.getMinutes();
  return `toggl-to-delorean-${monthShort}${year}-${salt}.md`;
}

function triggerDownload(filename: string, content: string, mimeType = 'text/markdown'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function handleExportMonthlyClick(): Promise<void> {
  const monthDate = getCurrentlySelectedMonth();
  if (!monthDate) return;
  const timeData = interpretedTimeData.allData ?? [];
  if (!timeData.length) return;

  const content = buildMonthlyMarkdownReport({
    timeData, monthDate,
    requireBillable:     requireBillableSwitch.checked,
    clientName:          (clientSelect.value as string) || null,
  });
  triggerDownload(generateReportFilename(monthDate), content);
}

// Set the button to a sensible disabled state before any data is loaded.
document.addEventListener('DOMContentLoaded', () => void updateExportButtonLabel());
