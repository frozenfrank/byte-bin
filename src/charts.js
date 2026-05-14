// ### Chart Data Aggregation & Rendering ###
// Produces summary pie charts of filtered time entries by PRJ and TLP.
// Called from renderTimecardReport() in script.js.

const UNTAGGED_LABEL = 'Untagged';

function aggregateHoursByPRJ(filteredData) {
  const secondsByPRJ = new Map();
  filteredData.forEach(entry => {
    const prj = extractPRJNumber(entry);
    const key = prj ? `PRJ ${prj}` : UNTAGGED_LABEL;
    const seconds = entry.durationSeconds || 0;
    secondsByPRJ.set(key, (secondsByPRJ.get(key) || 0) + seconds);
  });
  return toChartData(secondsByPRJ);
}

function aggregateHoursByTLP(filteredData) {
  const secondsByTLP = new Map();
  filteredData.forEach(entry => {
    const tlp = extractTLPCode(entry);
    const key = tlp ? `TLP ${tlp}` : UNTAGGED_LABEL;
    const seconds = entry.durationSeconds || 0;
    secondsByTLP.set(key, (secondsByTLP.get(key) || 0) + seconds);
  });
  return toChartData(secondsByTLP);
}

function toChartData(secondsByKey) {
  const sorted = [...secondsByKey.entries()].sort((a, b) => b[1] - a[1]);
  return {
    labels: sorted.map(([key]) => key),
    data: sorted.map(([, seconds]) => Math.round((seconds / 3600) * 10) / 10),
  };
}

function applyPieChartData(chartEl, {labels, data}, datasetLabel) {
  chartEl.config = {
    data: {
      labels,
      datasets: [{label: datasetLabel, data}],
    },
  };
}

export function renderSummaryCharts(filteredData) {
  const prjChart = document.getElementById('prjPieChart');
  const tlpChart = document.getElementById('tlpPieChart');
  if (prjChart) applyPieChartData(prjChart, aggregateHoursByPRJ(filteredData), 'Hours');
  if (tlpChart) applyPieChartData(tlpChart, aggregateHoursByTLP(filteredData), 'Hours');
}
