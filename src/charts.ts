import { getElementById } from "./helper";
import { WaPieChart } from "./model/web-awesome";
import { TimeEntry } from "./time-entry/time-entry";
import { extractPRJNumber, extractTLPCode } from "./time-entry/time-entry-processing";

// ### Chart Data Aggregation & Rendering ###
// Produces summary pie charts of filtered time entries by PRJ and TLP.
// Called from renderTimecardReport() in script.js.

const UNTAGGED_LABEL = 'Untagged';

type FilteredData = TimeEntry<unknown>[];
/** Maps the number of seconds by a total accumulator represented by `key`. */
type SecondsByKey = Map<string, number>;

interface ChartData {
  labels: string[];
  data: number[];
}

function aggregateHoursByPRJ(filteredData: FilteredData) {
  const secondsByPRJ = new Map();
  filteredData.forEach(entry => {
    const prj = extractPRJNumber(entry);
    const key = prj ? `PRJ ${prj}` : UNTAGGED_LABEL;
    const seconds = entry.durationSeconds || 0;
    secondsByPRJ.set(key, (secondsByPRJ.get(key) || 0) + seconds);
  });
  return toChartData(secondsByPRJ);
}

function aggregateHoursByTLP(filteredData: FilteredData) {
  const secondsByTLP: SecondsByKey = new Map();
  filteredData.forEach(entry => {
    const tlp = extractTLPCode(entry);
    const key = tlp ? `TLP ${tlp}` : UNTAGGED_LABEL;
    const seconds = entry.durationSeconds || 0;
    secondsByTLP.set(key, (secondsByTLP.get(key) || 0) + seconds);
  });
  return toChartData(secondsByTLP);
}

function toChartData(secondsByKey: SecondsByKey): ChartData {
  const sorted = [...secondsByKey.entries()].sort((a, b) => b[1] - a[1]);
  return {
    labels: sorted.map(([key]) => key),
    data: sorted.map(([, seconds]) => Math.round((seconds / 3600) * 10) / 10),
  };
}

function applyPieChartData(chartEl: WaPieChart, {labels, data}: ChartData, datasetLabel: string) {
  chartEl.config = {
    data: {
      labels,
      datasets: [{label: datasetLabel, data}],
    },
  };
}

export function renderSummaryCharts(filteredData: FilteredData) {
  const prjChart = getElementById<WaPieChart>('prjPieChart');
  const tlpChart = getElementById<WaPieChart>('tlpPieChart');
  if (prjChart) applyPieChartData(prjChart, aggregateHoursByPRJ(filteredData), 'Hours');
  if (tlpChart) applyPieChartData(tlpChart, aggregateHoursByTLP(filteredData), 'Hours');
}
