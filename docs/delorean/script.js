const INPUT_FILE_ID = 'togglFileInput';
const DAY_SELECT_ID = 'daySelect';
const WEEK_SELECT_ID = 'weekSelect';
const MONTH_SELECT_ID = 'monthSelect';
const OUTPUT_PRE_ID = 'timecardReport';
const SHOW_ALL_DESC_ID = 'showAllDescriptionsSwitch';
const NEXT_DAY_BUTTON_ID = 'nextDayButton';
const PREV_DAY_BUTTON_ID = 'prevDayButton';

const TOGGL_FORM = 'download-toggl-form';
const TOGGL_TOKEN_ID = 'download-toggl-token';
const TOGGL_DOWNLOAD_BUTTON = 'download-toggl-button';
const TOGGL_DOWNLOAD_LABEL = 'download-toggl-label';

const TLP_REGEX = /tlp(\d{5})/i;
const PRJ_REGEX = /PRJ\s*(\d+)/i;
const DLG_REGEX = /DLG\s*(\d+)/i;
const QAN_REGEX = /QAN\s*(\d+)/i;

let interpretedTimeData = {
  /** Sorted list of unique projects */
  uniqueProjects: [],
  /** Sorted list of unique dates */
  uniqueDays: [],
  /** Sorted list of unique date values (number values). Used for moving between dates. */
  uniqueDateValues: [],
  /** Whether the data includes client information */
  hasClientData: false,
  /** Whether the data includes billable information */
  hasBillableData: false,

  /** {TimeEntryData<any>} All the data from PapaParse */
  allData: null,
};

// ### Handle File Input and Data Parsing ###

// Respond to file input change
const fileInput = document.getElementById(INPUT_FILE_ID);
fileInput.addEventListener('change', handleInputFileChange);
function handleInputFileChange(e) {
  const files = e.target.files;
  if (!files?.length) {
    return;
  }

  Papa.parse(files[0], {
    header: true,
    complete: handleDataParsed,
  });
}

// Respond to data parsing
function handleDataParsed(results) {
  const timeEntryData = convertParsedCsvToTimeEntryData(results);
  processTimeEntryData(timeEntryData);
}

function processTimeEntryData(timeEntryData) {
  const allProjects = new Set();
  const allDates = new Map();
  const allWeeks = new Map();
  const allMonths = new Map();

  timeEntryData.entries.forEach((entry) => {
    allProjects.add(entry.projectName);

    entry._computedDates = prepareComputedDateValues(entry.start);
    allDates.set(+entry._computedDates.day, entry._computedDates.day);
    allWeeks.set(+entry._computedDates.week, entry._computedDates.week);
    allMonths.set(+entry._computedDates.month, entry._computedDates.month);
  });

  const uniqueProjects = Array.from(allProjects).sort();

  const dateMapToSortedArr = dateMap => Array.from(dateMap.values()).sort((a,b) => a - b);
  const dateArrToValuesArr = dateArr => dateArr.map(d => +d);

  const uniqueDays = dateMapToSortedArr(allDates);
  const uniqueWeeks = dateMapToSortedArr(allWeeks);
  const uniqueMonths = dateMapToSortedArr(allMonths);

  interpretedTimeData = {
    uniqueProjects,
    uniqueDays, uniqueDateValues: dateArrToValuesArr(uniqueDays),
    uniqueWeeks, uniqueWeekValues: dateArrToValuesArr(uniqueWeeks),
    uniqueMonths, uniqueMonthValues: dateArrToValuesArr(uniqueMonths),
    hasClientData: timeEntryData.hasClientData,
    hasBillableData: timeEntryData.hasBillableData,
    allData: timeEntryData.entries,
  }

  populateDateSelector(DAY_SELECT_ID, uniqueDays, "date", d => d.toLocaleDateString('default', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' }));
  populateDateSelector(WEEK_SELECT_ID, uniqueWeeks, "week", w => {
    const end = new Date(w);
    end.setDate(end.getDate() + 6);
    return w.toLocaleDateString('default', { month: 'short', day: 'numeric' }) + " – "
       + end.toLocaleDateString('default', { month: 'short', day: 'numeric', year: '2-digit' });
  });
  populateDateSelector(MONTH_SELECT_ID, uniqueMonths, "month", m => m.toLocaleString('default', { month: 'long', year: 'numeric' }));

  setDateSelectValues(interpretedTimeData.uniqueDateValues[0]);
}

function prepareComputedDateValues(start) {
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
const togglForm = document.getElementById(TOGGL_FORM);
const togglTokenInput = document.getElementById(TOGGL_TOKEN_ID);
const togglSubmitButton = document.getElementById(TOGGL_DOWNLOAD_BUTTON);
const togglSubmitLabel = document.getElementById(TOGGL_DOWNLOAD_LABEL);

/** Local storage key for saving/restoring the Toggl API token */
const TOGGL_TOKEN_STORAGE_KEY = 'togglApiToken';

// Restore saved token (if any) when the page loads and update UI
document.addEventListener('DOMContentLoaded', applySavedTogglToken);
function applySavedTogglToken() {
  const _savedToken = localStorage.getItem(TOGGL_TOKEN_STORAGE_KEY);
  if (!_savedToken) return;

  togglTokenInput.value = _savedToken;
  togglTokenInput.dispatchEvent(new Event('input', { bubbles: true }));
}

togglTokenInput.addEventListener('input', handleTogglTokenChange);
function handleTogglTokenChange(e) {
  const token = e.target.value;

  if (!token?.length) {
    localStorage.removeItem(TOGGL_TOKEN_STORAGE_KEY);
  }
  const tokenInputValid = token?.length>=32
  togglSubmitButton.disabled=!tokenInputValid;
}

togglForm.addEventListener('submit', handleTogglFormSubmit);
function handleTogglFormSubmit(e) {
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

  console.warn("Temporarily skipping toggl download."); return;

  void downloadTogglTimeEntries(token)
    .then(() => togglSubmitButton.loading = false);
}

async function downloadTogglTimeEntries(token) {
  const downloadStartDate = new Date();
  downloadStartDate.setMonth(downloadStartDate.getMonth() - 2,1); // First of the month, two months ago
  const togglApiData = await getTimeEntries(token, downloadStartDate);

  const timeEntryData = convertApiDataToTimeEntryData(togglApiData);
  processTimeEntryData(timeEntryData);
}

// ### Handle Filter Changes ###

// Respond to date selector change
const daySelect = document.getElementById(DAY_SELECT_ID);
const weekSelect = document.getElementById(WEEK_SELECT_ID);
const monthSelect = document.getElementById(MONTH_SELECT_ID);

daySelect.addEventListener('change', handleDayChange);
function handleDayChange(e) {
  const selectedDay = e.target.value;
  setDateSelectValues(selectedDay,1);
  renderTimecardReport(selectedDay);
}

weekSelect.addEventListener('change', handleWeekChange);
function handleWeekChange(e) {
  const selectedWeek = e.target.value;
  setDateSelectValues(selectedWeek,2);
  renderTimecardReport(selectedWeek);
}

monthSelect.addEventListener('change', handleMonthChange);
function handleMonthChange(e) {
  const selectedMonth = e.target.value;
  setDateSelectValues(selectedMonth,3);
  renderTimecardReport(selectedMonth);
}

/** Updates all date selectors with the provided date value.
 * @param {number} dateValue - The date value to set (as a number, or Date object, or string form of the number).
 * @param {string} [changedSelector] - The ID of the selector that triggered the change (to avoid redundant updates).
 *                                     - 1=daySelect, 2=weekSelect, 3=monthSelect
 */
function setDateSelectValues(dateValue,changedSelector) {
  const computedDates = prepareComputedDateValues(new Date(dateValue))

  daySelect.value = ""+Number(computedDates.day);
  weekSelect.value = ""+Number(computedDates.week);
  monthSelect.value = ""+Number(computedDates.month);

  (changedSelector !== 1) && daySelect.dispatchEvent(new Event('change', { bubbles: true }));
  (changedSelector !== 2) && weekSelect.dispatchEvent(new Event('change', { bubbles: true }));
  (changedSelector !== 3) && monthSelect.dispatchEvent(new Event('change', { bubbles: true }));
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
function populateDateSelector(selectId, dates, entityNameSingular, dateFormatter) {
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

function createOptionElement(value,text) {
  const opt = document.createElement('wa-option');
  opt.setAttribute('value', value);
  opt.textContent = text;
  return opt;
}


// Attach event listeners to next/prev buttons
document.getElementById(NEXT_DAY_BUTTON_ID)
  .addEventListener('click', () => incrementSelectedDay(false));

document.getElementById(PREV_DAY_BUTTON_ID)
  .addEventListener('click', () => incrementSelectedDay(true));

// Keyboard shortcuts: N = next, P = previous
document.addEventListener('keydown', (e) => {
  // ignore when modifier keys are held
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  // don't interfere while typing in inputs/textareas/contenteditable
  const active = document.activeElement;
  if (active && (active.id !== INPUT_FILE_ID) && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;

  const key = e.key.toLowerCase();
  switch (key) {
    case 'n':  incrementSelectedDay(false);   break;
    case 'p':  incrementSelectedDay(true);    break;
    case 'd':  showAllDescSwitch.click();     break;

    default:
      return; // ignore other keys
  }
  e.preventDefault();
});

function incrementSelectedDay(backward=false) {
  const numValues = interpretedTimeData.uniqueDateValues.length;
  if (!numValues) return;
  if (!daySelect) {
    console.error(`Day select element with ID '${DAY_SELECT_ID}' not found.`);
    return;
  }

  const currentValue = +daySelect.value;
  let currentIndex = currentValue ? interpretedTimeData.uniqueDateValues.indexOf(currentValue) : 0;  // O(n) operation
  if (currentIndex < 0) currentIndex = 0;

  const direction = backward ? -1 : 1;
  const nextIndex = (currentIndex + direction + numValues) % numValues;
  const nextValue = interpretedTimeData.uniqueDateValues[nextIndex];
  setDateSelectValues(nextValue);
}


// Allow toggling display of all descriptions
const showAllDescSwitch = document.getElementById(SHOW_ALL_DESC_ID);
showAllDescSwitch.addEventListener('change', handleShowAllDescChange);
function handleShowAllDescChange(e) {
  const showAll = e.target.checked;
  renderTimecardReport(null,null,showAll);
}

// ### Extract and Prepare Timecard Entries ###

function renderTimecardReport(forDay=null,timeData=null,showAllDescriptions=null) {
  if (forDay === null) forDay = daySelect.value;
  if (timeData === null) timeData = interpretedTimeData.allData;
  if (showAllDescriptions === null) showAllDescriptions = showAllDescSwitch.checked;

  const entries = prepareTimecardEntries(forDay, timeData);
  const report = formatTimecardEntries(entries, showAllDescriptions);
  const outputPre = document.getElementById(OUTPUT_PRE_ID);
  outputPre.textContent = report;
}

function prepareTimecardEntries(forDay,timeData) {
  if (!forDay || !timeData?.length) {
    return [];
  }

  const entriesForDay = timeData.filter(entry =>
    (+entry.startDate === +forDay) &&
    (entry.billable === true));

  // Group entries by project and TLP and DLG/QAN code
  const groupedEntries = {};
  entriesForDay.forEach(entry => {
    const tlpCode = extractTLPCode(entry) || "";
    const prjNumber = extractPRJNumber(entry) || "";
    const dlgNumber = extractDLGNumber(entry) || "";
    const qanNumber = extractQANNumber(entry) || "";

    const groupKey = `${tlpCode}|${prjNumber}|${dlgNumber}|${qanNumber}`;
    if (!groupedEntries[groupKey]) {
      groupedEntries[groupKey] = {
        tlpCode,
        prjNumber,
        dlgNumber,
        qanNumber,
        totalSeconds: 0,
        entries: [],
      };
    }

    groupedEntries[groupKey].totalSeconds += entry.durationSeconds;
    groupedEntries[groupKey].entries.push(entry);
  });

  // Return a sorted array of grouped entries
  return Object.values(groupedEntries).sort((a,b) =>
    a.prjNumber.localeCompare(b.prjNumber) ||
    a.tlpCode.localeCompare(b.tlpCode) ||
    a.dlgNumber.localeCompare(b.dlgNumber) ||
    a.qanNumber.localeCompare(b.qanNumber) ||
    b.totalSeconds - a.totalSeconds
  );
}

function extractTLPCode(entry) {
  const tags = entry.tagNames?.join(',');
  if (!tags) return null;
  return TLP_REGEX.exec(tags)?.[1] || null;
}

function extractPRJNumber(entry) {
  let prjNum;

  // Search Project field
  prjNum = PRJ_REGEX.exec(entry.projectName)?.[1];
  if (prjNum) return prjNum;

  // Search Description field
  prjNum = PRJ_REGEX.exec(entry.description)?.[1];
  return prjNum || null;
}

function extractDLGNumber(entry) {
  return DLG_REGEX.exec(entry.description)?.[1] || null;
}

function extractQANNumber(entry) {
  return QAN_REGEX.exec(entry.description)?.[1] || null;
}


// ### Printing and Output Functions ###

function formatTimecardEntries(entries,displayAllDescriptions=false) {
  let message = '',introduction='',footer='';

  const uniqueTLPs = new Set();
  const uniquePRJs = new Set();
  const uniqueDLGs = new Set();
  const uniqueQANs = new Set();
  const uniqueDescriptions = new Set();

  let totalHours = 0;
  let totalRoundedHours = 0;
  let timecardLines = 0;
  let representedEntries = 0;

  let minDate = Infinity;
  let maxDate = -Infinity;

  // Introductory message
  message += 'Timecard Entries:\n';

  // Header line
  const minWidths = [5,8,8,8,5,40];
  const descHeader = `Descriptions ${(displayAllDescriptions ? '(All Distinct)' : '(Sample)')}`;
  const headerLine=formatTimecardLine(minWidths, ["TLP", "Dev Log", "QAN", "PRJ", "Hours", descHeader], true);
  message += headerLine + '\n';
  message += '='.repeat(headerLine.length) + '\n';

  // Generate lines for each entry
  let tlpCode,hours,hoursRounded,lineEntriesSet,lineEntriesArr,dateVal;
  for (const entry of entries) {

    // Perform basic validation
    tlpCode = +entry.tlpCode;
    if (!tlpCode) continue; // Skip entries without TLP code

    hours = entry.totalSeconds / 3600;
    hoursRounded = Math.round(hours * 4) / 4; // Round to nearest quarter hour

    totalHours += hours;
    totalRoundedHours += hoursRounded;
    if (hoursRounded <= 0) continue; // Hide zero-hour entries, while counting in totals


    // Collect unique identifiers
    if (tlpCode) uniqueTLPs.add(tlpCode);
    if (entry.prjNumber) uniquePRJs.add(entry.prjNumber);
    if (entry.dlgNumber) uniqueDLGs.add(entry.dlgNumber);
    if (entry.qanNumber) uniqueQANs.add(entry.qanNumber);

    lineEntriesSet = new Set();
    for (const e of entry.entries) {
      dateVal = e._computedDates.day;
      if (+dateVal < minDate) minDate = dateVal;
      if (+dateVal > maxDate) maxDate = dateVal;

      if (!e.description) continue;
      uniqueDescriptions.add(e.description);
      lineEntriesSet.add(e.description);
    }
    lineEntriesArr = Array.from(lineEntriesSet).sort();


    // Represent main line
    timecardLines++;
    message += formatTimecardLine(minWidths, [
      tlpCode,
      entry.dlgNumber,
      entry.qanNumber,
      entry.prjNumber,
      hoursRounded,
      lineEntriesArr[0]
    ]) + "\n";

    // Represent each unique description on its own line
    representedEntries += entry.entries.length || 0;
    if (displayAllDescriptions) {
      for (let i=1; i<lineEntriesArr.length; i++) {
        message += formatTimecardLine(minWidths, [
          // Carets indicate continuation lines
          '^',
          entry.dlgNumber ? '^' : '',
          entry.qanNumber ? '^' : '',
          entry.prjNumber ? '^' : '',
          '^',
          lineEntriesArr[i]
        ],false,true) + "\n";
      }
    }
  }

  if (timecardLines <= 0) {
    message = ""; // Wipe out blank message
    message += "No loggable time entries.\n";
  } else {
    // Summary lines
    message += '-'.repeat(headerLine.length) + '\n';
    message += formatTimecardLine(minWidths, [
      uniqueTLPs.size,
      uniqueDLGs.size,
      uniqueQANs.size,
      uniquePRJs.size,
      totalRoundedHours,
      uniqueDescriptions.size + "   (distinct entities)"
    ]) + "\n";

    // Report Detail
    message += '\n\n';
    message += `Total Rounded hours: ${totalRoundedHours.toFixed(2)} hrs\n`;
    message += `Total Actual hours: ${totalHours.toFixed(2)} hrs`;
    if (totalRoundedHours !== totalHours) {
      message += `  (Gap: ${((totalRoundedHours-totalHours)*60).toFixed(1)} mins)`;
    }
    message += `\n\n`;

    message += `Total Timecard Lines: ${timecardLines}\n`;
    message += `Total Represented Entries: ${representedEntries}\n`;
  }

  // ### Finalization of Report ###

  // Prepare introductory summaries
  introduction += "DeLorean Transfer Timecard Report\n";
  if (timecardLines > 0) {
    introduction += `Report date: ${minDate.toLocaleDateString()}`
    if (maxDate != minDate) introduction += ` to ${maxDate.toLocaleDateString()}`;
  }
  introduction += `\n`;

  // Prepare footer
  footer += `Generated on: ${new Date().toLocaleString()}\n`;


  // Combine introduction and message
  message = introduction + '\n' + message + '\n\n' + footer;

  return message;
}

function formatTimecardLine(minWidths,values,isHeader=false,isSubsequent=false) {
  const descriptionColIdx = minWidths.length - 1;
  return values.map((val,idx) => {
    const strVal = (val !== null && val !== undefined) ? String(val) : '';
    const alignLeft = (idx === descriptionColIdx) || isHeader;
    return alignLeft ? strVal.padEnd(minWidths[idx]) : strVal.padStart(minWidths[idx]);
  }).join(isSubsequent ? ' . ' : ' | ');
}
