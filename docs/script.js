console.log("Hello from script.js");

const INPUT_FILE_ID = 'togglFileInput';
const DAY_SELECT_ID = 'daySelect';
const OUTPUT_PRE_ID = 'timecardReport';

const TLP_REGEX = /tlp(\d{5})/i;
const PRJ_REGEX = /PRJ\s*(\d+)/i;
const DLG_REGEX = /DLG\s*(\d+)/i;
const QAN_REGEX = /QAN\s*(\d+)/i;

let interpretedTimeData = {
  /** Sorted list of unique projects */
  uniqueProjects: [],
  /** Sorted list of unique dates */
  uniqueDates: [],
  /** All the data from PapaParse */
  allData: null,
};

// ### Handle File Input and Data Parsing ###

// Respond to file input change
const input = document.getElementById(INPUT_FILE_ID);
input.addEventListener('change', handleInputFileChange);
function handleInputFileChange(e) {
  const files = e.target.files;
  if (files && files.length) {
    console.log('File selected:', files[0].name, '-', files[0].size, 'bytes');
    Papa.parse(files[0], {
      header: true,
      complete: handleDataParsed,
    });
  } else {
    console.log('No file selected');
  }
}

// Respond to data parsing
function handleDataParsed(results) {
  console.log('Parsed data:', results);

  const allProjects = new Set();
  const allDates = new Set();

  results.data.forEach((entry) => {
    allProjects.add(entry.Project);
    allDates.add(entry["Start date"]);
  });

  console.log('All projects:', Array.from(allProjects).sort());
  console.log('All dates:', Array.from(allDates).sort());

  interpretedTimeData = {
    uniqueProjects: Array.from(allProjects).sort(),
    uniqueDates: Array.from(allDates).sort(),
    allData: results.data,
  }

  populateDaySelect(interpretedTimeData.uniqueDates);
}

// Respond to day selection change
const daySelect = document.getElementById(DAY_SELECT_ID);
daySelect.addEventListener('change', handleDayChange);
function handleDayChange(e) {
  const selectedDay = e.target.value;
  console.log('Selected day:', selectedDay);

  if (selectedDay && interpretedTimeData.allData) {
    const entries = prepareTimecardEntries(selectedDay, interpretedTimeData.allData);
    const report = formatTimecardEntries(entries);

    const outputPre = document.getElementById(OUTPUT_PRE_ID);
    outputPre.textContent = report;
    console.log('Prepared timecard entries:', entries);
  } else {
    console.log('No day selected or no data available');
  }
}

function populateDaySelect(dates) {
  // Get select element
  const select = document.getElementById(DAY_SELECT_ID);
  if (!select) {
    console.error(`Day select element with ID '${DAY_SELECT_ID}' not found.`);
    return;
  }

  // Reset options
  select.innerHTML = '';

  // Empty state
  if (!dates.length) {
    select.appendChild(createOptionElement('', '-- No available dates --'));
    return;
  }

  // Add a default prompt option
  select.appendChild(createOptionElement('', '-- Choose a date --'));

  // Populate options
  dates.forEach(dateString => {
    const formattedDate = parseDateString(dateString).toLocaleDateString();
    select.appendChild(createOptionElement(dateString, formattedDate));
  });
}

function createOptionElement(value,text) {
  const opt = document.createElement('wa-option');
  opt.setAttribute('value', value);
  opt.textContent = text;
  return opt;
}


// ### Extract and Prepare Timecard Entries ###

function prepareTimecardEntries(forDay,timeData) {
  const entriesForDay = timeData.filter(entry =>
    (entry["Start date"] === forDay) &&
    (entry["Billable"] === "Yes"));
  console.log(`Entries for ${forDay}:`, entriesForDay);

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

    groupedEntries[groupKey].totalSeconds += calculateDurationInSeconds(entry);
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
  const tags = entry.Tags;
  if (!tags) return null;
  return TLP_REGEX.exec(tags)?.[1] || null;
}

function extractPRJNumber(entry) {
  let prjNum;

  // Search Project field
  prjNum = PRJ_REGEX.exec(entry.Project)?.[1];
  if (prjNum) return prjNum;

  // Search Description field
  prjNum = PRJ_REGEX.exec(entry.Description)?.[1];
  return prjNum || null;
}

function extractDLGNumber(entry) {
  return DLG_REGEX.exec(entry.Description)?.[1] || null;
}

function extractQANNumber(entry) {
  return QAN_REGEX.exec(entry.Description)?.[1] || null;
}

function calculateDurationInSeconds(entry) {
  const duration = entry["Duration"]; // e.g., "01:30:00"
  const [h,m,s] = duration.split(':').map(Number);
  return (h*60*60) + (m*60) + s;
}

// ### Printing and Output Functions ###

function formatTimecardEntries(entries) {
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
  const headerLine=formatTimecardLine(minWidths, ["TLP", "Dev Log", "QAN", "PRJ", "Hours", "Descriptions (All Unique)"], true);
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
      dateVal = parseDateString(e["Start date"]);
      if (+dateVal < minDate) minDate = dateVal;
      if (+dateVal > maxDate) maxDate = dateVal;

      if (!e.Description) continue;
      uniqueDescriptions.add(e.Description);
      lineEntriesSet.add(e.Description);
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

  // Summary lines
  message += '-'.repeat(headerLine.length) + '\n';
  message += formatTimecardLine(minWidths, [
    uniqueTLPs.size,
    uniquePRJs.size,
    uniqueDLGs.size,
    uniqueQANs.size,
    totalRoundedHours,
    uniqueDescriptions.size + " unique descriptions"
  ]) + "\n";

  // Footer message
  footer += `Total Rounded hours: ${totalRoundedHours.toFixed(2)} hrs\n`;
  footer += `Total Actual hours: ${totalHours.toFixed(2)} hrs`;
  if (totalRoundedHours !== totalHours) {
    footer += `  (Gap: ${((totalRoundedHours-totalHours)*60).toFixed(1)} mins)`;
  }
  footer += `\n\n`;

  footer += `Total Timecard Lines: ${timecardLines}\n`;
  footer += `Total Represented Entries: ${representedEntries}\n`;
  footer += "\n";
  footer += `Generated on: ${new Date().toLocaleString()}\n`;


  // Prepare introductory summaries
  introduction += "DeLorean Transfer Timecard Report\n";
  introduction += `Report date: ${minDate.toLocaleDateString()}`
  if (maxDate != minDate) introduction += ` to ${maxDate.toLocaleDateString()}`;
  introduction += `\n`;


  // Combine introduction and message
  message = introduction + '\n' + message + '\n\n' + footer;

  return message;
}

function parseDateString(dateStr) {
  // Expects dateStr in "YYYY-MM-DD" format
  const [year,month,day] = dateStr.split('-').map(Number);
  return new Date(year, month-1, day);
}

function formatTimecardLine(minWidths,values,isHeader=false,isSubsequent=false) {
  const descriptionColIdx = minWidths.length - 1;
  return values.map((val,idx) => {
    const strVal = (val !== null && val !== undefined) ? String(val) : '';
    const alignLeft = (idx === descriptionColIdx) || isHeader;
    return alignLeft ? strVal.padEnd(minWidths[idx]) : strVal.padStart(minWidths[idx]);
  }).join(isSubsequent ? ' . ' : ' | ');
}
