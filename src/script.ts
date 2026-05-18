import Papa, { ParseResult } from 'papaparse';
import { renderSummaryCharts } from './charts';
import { getElementById } from './helper';
import { DateValue } from './model/types';
import { WaButton, WaCallout, WaFileInput, WaOption, WaRadioGroup, WaSelect, WaSwitch } from './model/web-awesome';
import { buildTimecardReportElement } from './report';
import { EntryGrouping, PapaParseCSVResult, TimeEntry, TimeEntryData, TogglExportTimeEntry } from './time-entry/time-entry';
import { convertApiDataToTimeEntryData, convertParsedCsvToTimeEntryData, extractDLGNumber, extractPRJNumber, extractQANNumber, extractTLPCode, extractXDSNumber } from './time-entry/time-entry-processing';
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
const NEXT_DAY_BUTTON_ID = 'nextDayButton';
const PREV_DAY_BUTTON_ID = 'prevDayButton';
const PREV_NEXT_LABEL_CLASS = 'prevNextLabel';

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
  .then(() => {
    const saved = localStorage.getItem(IMPORT_METHOD_STORAGE_KEY);
    if (saved !== null) importMethodInput.value = saved;
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
    return;
  }

  Papa.parse<TogglExportTimeEntry, File>(files[0], {
    header: true,
    complete: handleDataParsed,
  });
}

// Respond to data parsing
function handleDataParsed(results: ParseResult<TogglExportTimeEntry>) {
  const timeEntryData = convertParsedCsvToTimeEntryData(results as PapaParseCSVResult<TogglExportTimeEntry>);
  processTimeEntryData(timeEntryData);
}

function processTimeEntryData(timeEntryData: TimeEntryData<any>) {
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

  populateDateSelector(DAY_SELECT_ID, uniqueDays, "date", d => d.toLocaleDateString('default', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' }));
  populateDateSelector(WEEK_SELECT_ID, uniqueWeeks, "week", w => {
    const end = new Date(w);
    end.setDate(end.getDate() + 6);
    return w.toLocaleDateString('default', { month: 'short', day: 'numeric' }) + " – "
       + end.toLocaleDateString('default', { month: 'short', day: 'numeric', year: '2-digit' });
  });
  populateDateSelector(MONTH_SELECT_ID, uniqueMonths, "month", m => m.toLocaleString('default', { month: 'long', year: 'numeric' }));

  populateClientSelector(uniqueClients, interpretedTimeData.hasClientData);

  const mostRecentDay = interpretedTimeData.uniqueDayValues[interpretedTimeData.uniqueDayValues.length - 1];
  const targetDay = prevDayValue && interpretedTimeData.uniqueDayValues.some(d => d >= prevDayValue)
    ? prevDayValue
    : mostRecentDay;
  setDateSelectValues(targetDay);
  updatePrevNextLabels();
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
function applySavedTogglToken() {
  const _savedToken = localStorage.getItem(TOGGL_TOKEN_STORAGE_KEY);
  if (!_savedToken) return;

  togglTokenInput.value = _savedToken;
  togglTokenInput.dispatchEvent(new Event('input', { bubbles: true }));
  setTogglTipVisible(false);
}

// Restore saved switch settings on page load
// Wait for the wa-switch class to be defined, then wait for each element's
// first Lit render to complete before applying saved state.
customElements.whenDefined('wa-switch')
  .then(() => Promise.all(switchSettings.map(sw => sw.updateComplete)))
  .then(() => applySavedSwitchSettings());

function applySavedSwitchSettings() {
  for (const sw of switchSettings) {
    const saved = localStorage.getItem(sw.id);
    if (saved !== null) sw.checked = saved === 'true';
  }
}

togglTokenInput.addEventListener('input', handleTogglTokenChange);
function handleTogglTokenChange(e: Event) {
  const token = (e.target as HTMLInputElement).value;

  if (!token?.length) {
    localStorage.removeItem(TOGGL_TOKEN_STORAGE_KEY);
    setTogglTipVisible(true);
  }
  const tokenInputValid = token?.length>=32
  togglSubmitButton.disabled=!tokenInputValid;
}

togglForm.addEventListener('submit', handleTogglFormSubmit);
function handleTogglFormSubmit(e: Event) {
  e.preventDefault();  // Skip default form submit behavior
  if (togglSubmitButton.loading) return; // Ensure no double-submitting

  togglSubmitButton.loading = true;
  togglSubmitLabel.innerText = "Refresh Data";

  const token = togglTokenInput.value;

  // Persist token to localStorage so it can be restored on next visit
  try {
    localStorage.setItem(TOGGL_TOKEN_STORAGE_KEY, token);
  } catch (err) {
    // Ignore storage errors (e.g. private mode) but don't prevent download
    console.warn('Could not save Toggl token to localStorage', err);
  }

  void downloadTogglTimeEntries(token)
    .then(() => togglSubmitButton.loading = false);
}

async function downloadTogglTimeEntries(token: string) {
  const downloadStartDate = new Date();
  downloadStartDate.setMonth(downloadStartDate.getMonth() - 2,1); // First of the month, two months ago
  const togglApiData = await getTimeEntries(token, downloadStartDate);

  const timeEntryData = convertApiDataToTimeEntryData(togglApiData);
  processTimeEntryData(timeEntryData);
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
function handleClientChange(_e?: Event) {
  try {
    localStorage.setItem(CLIENT_FILTER_STORAGE_KEY, clientSelect.value as string); // We only allow selecting a single Client
  } catch (err) {
    console.warn('Could not save client filter to localStorage', err);
  }
  renderTimecardReport();
}

timeScaleInput.addEventListener('change', handleTimeScaleChange);
document.addEventListener('DOMContentLoaded', updatePrevNextLabels);
function handleTimeScaleChange(_e: Event) {
  updatePrevNextLabels();
  renderTimecardReport();
}

function updatePrevNextLabels() {
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
}

daySelect.addEventListener('change', handleDayChange);
function handleDayChange(e: Event) {
  const selectedDay = (e.target as HTMLInputElement).value;
  setDateSelectValues(+selectedDay,true);
}

weekSelect.addEventListener('change', handleWeekChange);
function handleWeekChange(e: Event) {
  const selectedWeek = (e.target as HTMLInputElement).value;
  setDateSelectValues(+selectedWeek,true);
}

monthSelect.addEventListener('change', handleMonthChange);
function handleMonthChange(e: Event) {
  const selectedMonth = (e.target as HTMLInputElement).value;
  setDateSelectValues(+selectedMonth,true);
}

/** Updates all date selectors with the provided date value.
 * @param {number} dateValue - The date value to set (as a number, or Date object).
 * @param {boolean} suppressEvent - Whether to suppress change events for the selectors.
 */
function setDateSelectValues(dateValue: Date|DateValue, suppressEvent=false) {
  const computedDates = prepareComputedDateValues(new Date(dateValue));
  const dayValue = Number(computedDates.day);
  const weekValue = Number(computedDates.week);
  const monthValue = Number(computedDates.month);

  daySelect.value = ""+interpretedTimeData.uniqueDayValues.find(d => d >= dayValue);
  weekSelect.value = ""+interpretedTimeData.uniqueWeekValues.find(w => w >= weekValue);
  monthSelect.value = ""+interpretedTimeData.uniqueMonthValues.find(m => m >= monthValue);

  if (!suppressEvent) {
    const changedSelector = +(timeScaleInput.value || 0);
    (changedSelector === 1) && daySelect.dispatchEvent(new Event('change', { bubbles: true }));
    (changedSelector === 2) && weekSelect.dispatchEvent(new Event('change', { bubbles: true }));
    (changedSelector === 3) && monthSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  renderTimecardReport();
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
function populateDateSelector(selectId: string, dates: Date[], entityNameSingular: string, dateFormatter: (date: Date) => string): void {
  // Get select element
  const select = document.getElementById(selectId);
  if (!select) {
    console.error(`Date selector element with ID '${selectId}' not found.`);
    return;
  }

  // Reset options
  select.innerHTML = '';

  // Empty state
  if (!dates.length) {
    select.appendChild(createOptionElement('', `-- No available ${entityNameSingular}s --`));
    return;
  }

  // Add a default prompt option
  select.appendChild(createOptionElement('', `-- Choose a ${entityNameSingular} --`));

  // Populate options
  dates.forEach(date => {
    const formattedDate = dateFormatter(date);
    select.appendChild(createOptionElement(+date, formattedDate));
  });
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
function populateClientSelector(clients: string[], hasClientData: boolean) {
  clientSelect.innerHTML = '';

  if (!hasClientData || !clients.length) {
    const opt = createOptionElement('', '-- No Clients --');
    opt.setAttribute('selected', '');
    opt.setAttribute('disabled', '');
    clientSelect.appendChild(opt);
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
}


// Attach event listeners to next/prev buttons
const nextButton = getElementById<WaButton>(NEXT_DAY_BUTTON_ID);
nextButton.addEventListener('click', () => incrementSelectedDate(false));

const prevButton = getElementById<WaButton>(PREV_DAY_BUTTON_ID);
prevButton.addEventListener('click', () => incrementSelectedDate(true));

// Keyboard shortcuts: N = next, P = previous
document.addEventListener('keydown', (e) => {
  // ignore when modifier keys are held
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  // don't interfere while typing in inputs/textareas/contenteditable
  const active = document.activeElement as HTMLElement | null;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;

  const key = e.key.toLowerCase();
  switch (key) {
    case 'n':  incrementSelectedDate(false);  break;
    case 'p':  incrementSelectedDate(true);   break;
    case 'd':  showAllDescSwitch.click();     break;
    case 'b':  requireBillableSwitch.click();  break;
    case 'l':  groupByTlpSwitch.click();       break;
    case 'x':  groupByXdsSwitch.click();       break;
    case 't':  incrementTimeScale(false);     break;

    case 'o':  setTimeScale(1);               break;
    case 'w':  setTimeScale(2);               break;
    case 'm':  setTimeScale(3);               break;
    case 'a':  setTimeScale(4);               break;

    default:
      return; // ignore other keys
  }
  e.preventDefault();
});

function incrementSelectedDate(backward=false) {
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
  setDateSelectValues(nextValue);
}

function incrementTimeScale(backward=false) {
  const numValues = 4; // Day, Week, Month, All [Ranged 1-4]

  const currentScale = +(timeScaleInput.value || 0);
  const direction = backward ? -1 : 1;
  const nextScale = ((currentScale - 1 + direction + numValues) % numValues) + 1; // Shift to 0-based, mod, shift back to 1-based
  setTimeScale(nextScale);
}

function setTimeScale(scaleValue: number) {
  timeScaleInput.value = ""+scaleValue;
  updatePrevNextLabels();
  renderTimecardReport();
}

// Allow toggling display of all descriptions
const showAllDescSwitch = getElementById<WaSwitch>(SHOW_ALL_DESC_ID);
showAllDescSwitch.addEventListener('change', handleShowAllDescChange);
function handleShowAllDescChange(_e: Event) {
  renderTimecardReport();
}

// Allow toggling require-billable filter
const requireBillableSwitch = getElementById<WaSwitch>(REQUIRE_BILLABLE_ID);
requireBillableSwitch.addEventListener('change', () => renderTimecardReport());

const groupByXdsSwitch = getElementById<WaSwitch>(GROUP_BY_XDS_ID);
groupByXdsSwitch.addEventListener('change', () => renderTimecardReport());

const groupByTlpSwitch = getElementById<WaSwitch>(GROUP_BY_TLP_ID);
groupByTlpSwitch.addEventListener('change', () => renderTimecardReport());

const switchSettings = [showAllDescSwitch, requireBillableSwitch, groupByXdsSwitch, groupByTlpSwitch];

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

function renderTimecardReport() {
  // Retrieve current settings from UI
  const timeData = interpretedTimeData.allData ?? [];
  const showAllDescriptions = showAllDescSwitch.checked;
  const {minDateIncl,maxDateExcl} = interpretMinMaxFilterDates();
  const filterClientName = clientSelect.value as string || null;

  // Organize and format entries
  const groupByTlp = groupByTlpSwitch.checked;
  const groupByXds = groupByXdsSwitch.checked;
  const filteredData = filterTimeEntriesByDateRange(timeData,minDateIncl,maxDateExcl,requireBillableSwitch.checked,filterClientName);
  renderSummaryCharts(filteredData);
  const entries = prepareTimecardEntries(filteredData, groupByXds, groupByTlp);
  const reportEl = buildTimecardReportElement(entries, showAllDescriptions, groupByXds, groupByTlp);
  const outputEl = getElementById(OUTPUT_PRE_ID);
  outputEl.replaceChildren(reportEl);
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

function filterTimeEntriesByDateRange(timeData: TimeEntry[], minDateIncl: Date|null, maxDateExcl: Date|null, requireBillable=false, clientName: string|null=null) {
  if (!timeData?.length) return [];

  return timeData.filter(entry => {
    if (requireBillable && !entry.billable) return false;
    if (clientName && (entry.clientName !== clientName)) return false;

    const entryDate = entry.start;
    return (!minDateIncl || entryDate >= minDateIncl) &&
           (!maxDateExcl || entryDate < maxDateExcl);
  });
}

function prepareTimecardEntries<T>(timeData: TimeEntry<T>[], groupByXds=false, groupByTlp=true): EntryGrouping<T>[] {
  if (!timeData?.length) {
    return [];
  }

  const groupedEntries: Record<string, EntryGrouping<T>> = {};
  timeData.forEach(entry => {
    const tlpCode = extractTLPCode(entry) || "";
    const prjNumber = extractPRJNumber(entry) || "";
    const dlgNumber = extractDLGNumber(entry) || "";
    const qanNumber = extractQANNumber(entry) || "";
    const xdsNumber = extractXDSNumber(entry) || "";

    const groupingTlp = (!groupByTlp && tlpCode) ? "00000" : tlpCode; // Treat all entries *with a TLP* as equivalent
    let groupKey = `${groupingTlp}|${prjNumber}|${dlgNumber}|${qanNumber}`;
    if (groupByXds) groupKey += `|${xdsNumber}`;
    if (!groupedEntries[groupKey]) {
      groupedEntries[groupKey] = {
        tlpCode,
        prjNumber,
        dlgNumber,
        qanNumber,
        xdsNumber,
        totalSeconds: 0,
        entries: [],
      };
    }

    groupedEntries[groupKey].totalSeconds += entry.durationSeconds || 0;
    groupedEntries[groupKey].entries.push(entry);
  });

  // Return a sorted array of grouped entries
  return Object.values(groupedEntries).sort((a,b) =>
    a.prjNumber.localeCompare(b.prjNumber) ||
    (groupByTlp && a.tlpCode.localeCompare(b.tlpCode)) ||
    a.dlgNumber.localeCompare(b.dlgNumber) ||
    a.qanNumber.localeCompare(b.qanNumber) ||
    (groupByXds && a.xdsNumber.localeCompare(b.xdsNumber)) ||
    b.totalSeconds - a.totalSeconds
  );
}
