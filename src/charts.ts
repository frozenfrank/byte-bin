import { getElementById } from "./helper";
import { TimeScale } from "./model/types";
import { WaBarChart, WaPieChart } from "./model/web-awesome";
import { TimeEntry } from "./time-entry/time-entry";
import { extractPRJNumber, extractTLPCode } from "./time-entry/time-entry-processing";

// ### Chart Data Aggregation & Rendering ###
// Produces summary pie charts of filtered time entries by PRJ and TLP,
// plus a bar chart of total hours per time period.
// Called from renderTimecardReport() in script.ts.

const UNTAGGED_LABEL = 'Untagged';

/** Maximum number of bars shown in the period bar chart. Single source of truth; may become dynamic. */
export const MAX_BAR_CHART_PERIODS = 10;
/** Fraction of the visible window where the active bar sits (~70% from the left). */
const ACTIVE_BAR_POSITION_FRACTION = 0.7;
/** Auto-scale thresholds for All Time mode. */
const ALL_TIME_DAY_THRESHOLD = 21;
const ALL_TIME_WEEK_THRESHOLD = 26;

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

export async function renderSummaryCharts(filteredData: FilteredData): Promise<void> {
  const prjChart = getElementById<WaPieChart>('prjPieChart');
  const tlpChart = getElementById<WaPieChart>('tlpPieChart');
  const updates: Array<Promise<boolean>> = [];
  if (prjChart) {
    applyPieChartData(prjChart, aggregateHoursByPRJ(filteredData), 'Hours');
    updates.push(prjChart.updateComplete);
  }
  if (tlpChart) {
    applyPieChartData(tlpChart, aggregateHoursByTLP(filteredData), 'Hours');
    updates.push(tlpChart.updateComplete);
  }
  await Promise.all(updates);
}

// ### Period Bar Chart ###

type PeriodScale = 'day' | 'week' | 'month';

interface BarChartInput {
  /** Time entries with non-date filters (client, billable) already applied. */
  allFiltered: FilteredData;
  /** Selected time scale. Determines the bar bucket size. */
  timeScale: TimeScale;
  /** Numeric ms value of the currently-active period; null in All Time mode. */
  activePeriodValue: number | null;
  uniqueDayValues:   number[];
  uniqueWeekValues:  number[];
  uniqueMonthValues: number[];
}

interface BarColors {
  activeBg: string;
  activeBorder: string;
  neutralBg: string;
  neutralBorder: string;
}

function resolvePeriodScale(input: BarChartInput): PeriodScale {
  switch (input.timeScale) {
    case TimeScale.Day:   return 'day';
    case TimeScale.Week:  return 'week';
    case TimeScale.Month: return 'month';
    case TimeScale.All:
      if (input.uniqueDayValues.length  <= ALL_TIME_DAY_THRESHOLD)  return 'day';
      if (input.uniqueWeekValues.length <= ALL_TIME_WEEK_THRESHOLD) return 'week';
      return 'month';
  }
}

function aggregateHoursByPeriod(entries: FilteredData, scale: PeriodScale): Map<number, number> {
  const sumsByPeriod = new Map<number, number>();
  entries.forEach(entry => {
    if (!entry._computedDates) return;
    const periodMs = +entry._computedDates[scale];
    const seconds = entry.durationSeconds || 0;
    sumsByPeriod.set(periodMs, (sumsByPeriod.get(periodMs) || 0) + seconds);
  });
  return sumsByPeriod;
}

function pickWindow(uniquePeriodValues: number[], activePeriodValue: number | null, isAllTime: boolean) {
  const total = uniquePeriodValues.length;
  if (isAllTime) {
    return { windowValues: uniquePeriodValues.slice(), activeIndexInWindow: -1 };
  }
  if (total === 0) {
    return { windowValues: [] as number[], activeIndexInWindow: -1 };
  }

  let activeIndex = activePeriodValue != null ? uniquePeriodValues.indexOf(activePeriodValue) : -1;
  if (activeIndex === -1) activeIndex = total - 1;

  const windowSize = Math.min(MAX_BAR_CHART_PERIODS, total);
  const preferredOffsetFromLeft = Math.floor((windowSize - 1) * ACTIVE_BAR_POSITION_FRACTION);
  let windowStart = Math.max(0, activeIndex - preferredOffsetFromLeft);
  let windowEnd = Math.min(total, windowStart + windowSize);
  if (windowEnd === total) windowStart = Math.max(0, windowEnd - windowSize);

  return {
    windowValues: uniquePeriodValues.slice(windowStart, windowEnd),
    activeIndexInWindow: activeIndex - windowStart,
  };
}

function formatPeriodLabel(periodMs: number, scale: PeriodScale): string {
  const d = new Date(periodMs);
  switch (scale) {
    case 'day':   return d.toLocaleDateString('default', { weekday: 'short', month: 'numeric', day: 'numeric' });
    case 'week':  return d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    case 'month': return d.toLocaleString('default', { month: 'short', year: 'numeric' });
  }
}

function resolveBarColors(chartEl: WaBarChart): BarColors {
  // Chart.js paints to <canvas>, which does NOT resolve var(--...). Read computed values up front.
  const hostStyle = getComputedStyle(chartEl);
  const rootStyle = getComputedStyle(document.documentElement);
  const read = (name: string) => (hostStyle.getPropertyValue(name) || rootStyle.getPropertyValue(name)).trim();
  return {
    activeBg:      read('--wa-color-brand-fill-loud'),
    activeBorder:  read('--wa-color-brand-border-loud'),
    neutralBg:     read('--wa-color-neutral-fill-loud'),
    neutralBorder: read('--wa-color-neutral-border-loud'),
  };
}

interface BarChartRenderData {
  labels: string[];
  hoursPerBar: number[];
  activeIndexInWindow: number;
  colors: BarColors;
}

function applyBarChartData(chartEl: WaBarChart, render: BarChartRenderData, datasetLabel: string) {
  const { labels, hoursPerBar, activeIndexInWindow, colors } = render;
  const backgroundColor = hoursPerBar.map((_, i) => i === activeIndexInWindow ? colors.activeBg : colors.neutralBg);
  const borderColor     = hoursPerBar.map((_, i) => i === activeIndexInWindow ? colors.activeBorder : colors.neutralBorder);
  chartEl.config = {
    data: {
      labels,
      datasets: [{ label: datasetLabel, data: hoursPerBar, backgroundColor, borderColor }],
    },
  };
}

function uniquePeriodValuesFor(scale: PeriodScale, input: BarChartInput): number[] {
  switch (scale) {
    case 'day':   return input.uniqueDayValues;
    case 'week':  return input.uniqueWeekValues;
    case 'month': return input.uniqueMonthValues;
  }
}

export function renderTimePeriodBarChart(input: BarChartInput): void {
  const chartEl = getElementById<WaBarChart>('periodBarChart');
  if (!chartEl) return;

  const scale = resolvePeriodScale(input);
  const uniquePeriodValues = uniquePeriodValuesFor(scale, input);
  const isAllTime = input.timeScale === TimeScale.All;
  const { windowValues, activeIndexInWindow } = pickWindow(uniquePeriodValues, input.activePeriodValue, isAllTime);

  if (windowValues.length === 0) {
    chartEl.config = { data: { labels: [], datasets: [{ label: 'Hours', data: [] }] } };
    return;
  }

  const sumsByPeriod = aggregateHoursByPeriod(input.allFiltered, scale);
  const labels = windowValues.map(ms => formatPeriodLabel(ms, scale));
  const hoursPerBar = windowValues.map(ms => Math.round(((sumsByPeriod.get(ms) ?? 0) / 3600) * 10) / 10);
  const colors = resolveBarColors(chartEl);

  applyBarChartData(chartEl, { labels, hoursPerBar, activeIndexInWindow, colors }, 'Hours');
}
