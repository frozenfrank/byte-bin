import { getElementById } from "./helper";
import { TimeScale } from "./model/types";
import { WaBarChart, WaPieChart } from "./model/web-awesome";
import { TimeEntry } from "./time-entry/time-entry";
import { extractPRJNumber, extractTLPCode } from "./time-entry/time-entry-processing";
import { enumLabelsByValue, PrjType, TlpType } from "./time-entry/analysis";

// ### Chart Data Aggregation & Rendering ###
// Produces summary pie charts of filtered time entries by PRJ and TLP,
// plus a bar chart of total hours per time period and two stacked bar charts
// splitting those same periods by PRJ/TLP type.
// Called from renderTimecardReport() in script.ts.

const NO_PRJ_LABEL = 'No Project';
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

/** Seconds → hours, rounded to one decimal. The unit every chart plots. */
function toHours(seconds: number): number {
  return Math.round((seconds / 3600) * 10) / 10;
}

/**
 * A slice's share of its period, 0–100, rounded to one decimal. The alternate unit for the
 * stacked charts. Rounding leaves a bar summing to 100 ± ~0.2, which is imperceptible against
 * the axis max, and keeps the hover tooltip from reading as a long float.
 */
function toPercent(seconds: number, totalSeconds: number): number {
  if (!totalSeconds) return 0;
  return Math.round((seconds / totalSeconds) * 1000) / 10;
}

function aggregateHoursByPRJ(filteredData: FilteredData): ChartData {
  return toChartData(filteredData, entry => {
    const prj = extractPRJNumber(entry);
    return prj ? `PRJ ${prj}` : NO_PRJ_LABEL;
  });
}

function aggregateHoursByTLP(filteredData: FilteredData): ChartData {
  return toChartData(filteredData, entry => {
    const tlp = extractTLPCode(entry);
    return tlp ? `TLP ${tlp}` : UNTAGGED_LABEL;
  });
}

function aggregateHoursByTlpType(filteredData: FilteredData): ChartData {
  return toChartData(filteredData, entry => (entry._analysis && TlpType[entry._analysis.tlpType]) ?? UNTAGGED_LABEL);
}

function aggregateHoursByPrjType(filteredData: FilteredData): ChartData {
  return toChartData(filteredData, entry => (entry._analysis && PrjType[entry._analysis.prjType]) ?? NO_PRJ_LABEL);
}

function toChartData(filteredData: FilteredData, getKey: (entry: TimeEntry) => string): ChartData {
  const secondsByKey: SecondsByKey = new Map();
  filteredData.forEach(entry => {
    const key = getKey(entry);
    const seconds = entry.durationSeconds || 0;
    secondsByKey.set(key, (secondsByKey.get(key) || 0) + seconds);
  });

  const sorted = [...secondsByKey.entries()].sort((a, b) => b[1] - a[1]);
  return {
    labels: sorted.map(([key]) => key),
    data: sorted.map(([, seconds]) => toHours(seconds)),
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
  const prjTypeChart = getElementById<WaPieChart>('prjTypePieChart');
  const tlpTypeChart = getElementById<WaPieChart>('tlpTypePieChart');
  const updates: Array<Promise<boolean>> = [];
  if (prjChart) {
    applyPieChartData(prjChart, aggregateHoursByPRJ(filteredData), 'Hours');
    updates.push(prjChart.updateComplete);
  }
  if (tlpChart) {
    applyPieChartData(tlpChart, aggregateHoursByTLP(filteredData), 'Hours');
    updates.push(tlpChart.updateComplete);
  }
  if (prjTypeChart) {
    applyPieChartData(prjTypeChart, aggregateHoursByPrjType(filteredData), 'Hours');
    updates.push(prjTypeChart.updateComplete);
  }
  if (tlpTypeChart) {
    applyPieChartData(tlpTypeChart, aggregateHoursByTlpType(filteredData), 'Hours');
    updates.push(tlpTypeChart.updateComplete);
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
  /** Plot the stacked charts as each period's 0–100% composition instead of hours. */
  stackAsPercent: boolean;
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

/** The window of periods every period chart shares: same bucket size, same bars, same labels. */
interface PeriodWindow {
  scale: PeriodScale;
  /** Period start timestamps, one per bar, left to right. */
  windowValues: number[];
  labels: string[];
  activeIndexInWindow: number;
}

function resolvePeriodWindow(input: BarChartInput): PeriodWindow {
  const scale = resolvePeriodScale(input);
  const uniquePeriodValues = uniquePeriodValuesFor(scale, input);
  const isAllTime = input.timeScale === TimeScale.All;
  const { windowValues, activeIndexInWindow } = pickWindow(uniquePeriodValues, input.activePeriodValue, isAllTime);
  return {
    scale,
    windowValues,
    labels: windowValues.map(ms => formatPeriodLabel(ms, scale)),
    activeIndexInWindow,
  };
}

async function renderTimePeriodBarChart(input: BarChartInput, periodWindow: PeriodWindow): Promise<void> {
  const chartEl = getElementById<WaBarChart>('periodBarChart');
  if (!chartEl) return;

  const { scale, windowValues, labels, activeIndexInWindow } = periodWindow;
  if (windowValues.length === 0) {
    chartEl.config = { data: { labels: [], datasets: [{ label: 'Hours', data: [] }] } };
    await chartEl.updateComplete;
    return;
  }

  const sumsByPeriod = aggregateHoursByPeriod(input.allFiltered, scale);
  const hoursPerBar = windowValues.map(ms => toHours(sumsByPeriod.get(ms) ?? 0));
  const colors = resolveBarColors(chartEl);

  applyBarChartData(chartEl, { labels, hoursPerBar, activeIndexInWindow, colors }, 'Hours');
  await chartEl.updateComplete;
}

// ### Stacked Type Bar Charts ###
// The same periods as the bar chart above, but each bar is split by PRJ/TLP type.
// No active-period highlight here: the bar colors are spent on the categories.

/** One stacked bar chart: a dataset per enum member, ordered by numeric enum value. */
interface CategorySeries {
  /** Element id of the <wa-bar-chart stacked> to render into. */
  elementId: string;
  /** Everything after the unit in the chart title, which changes with the unit. */
  titleSubject: string;
  /** Enum member names in numeric order. Index === dataset index === color slot. */
  labels: string[];
  /** The entry's category index, or null to exclude it. */
  categoryIndexOf: (entry: TimeEntry) => number | null;
}

const STACKED_TYPE_SERIES: CategorySeries[] = [
  {
    elementId: 'prjTypeBarChart',
    titleSubject: 'by PRJ Type over Time',
    labels: enumLabelsByValue(PrjType),
    categoryIndexOf: entry => entry._analysis?.prjType ?? null,
  },
  {
    elementId: 'tlpTypeBarChart',
    titleSubject: 'by TLP Type over Time',
    labels: enumLabelsByValue(TlpType),
    categoryIndexOf: entry => entry._analysis?.tlpType ?? null,
  },
];

/** Sum seconds per period, split into one slot per category. Slot order follows {@linkcode CategorySeries.labels}. */
function aggregateHoursByPeriodAndCategory(
  entries: FilteredData, scale: PeriodScale, series: CategorySeries,
): Map<number, number[]> {
  const sumsByPeriod = new Map<number, number[]>();
  entries.forEach(entry => {
    if (!entry._computedDates) return;
    const categoryIndex = series.categoryIndexOf(entry);
    if (categoryIndex === null) return;
    const periodMs = +entry._computedDates[scale];
    let byCategory = sumsByPeriod.get(periodMs);
    if (!byCategory) sumsByPeriod.set(periodMs, byCategory = new Array(series.labels.length).fill(0));
    byCategory[categoryIndex] += entry.durationSeconds || 0;
  });
  return sumsByPeriod;
}

async function renderStackedTypeBarChart(
  series: CategorySeries, input: BarChartInput, periodWindow: PeriodWindow,
): Promise<void> {
  const chartEl = getElementById<WaBarChart>(series.elementId);
  if (!chartEl) return;

  const { stackAsPercent } = input;
  const sumsByPeriod = aggregateHoursByPeriodAndCategory(input.allFiltered, periodWindow.scale, series);
  const barValue = (periodMs: number, categoryIndex: number): number => {
    const byCategory = sumsByPeriod.get(periodMs);
    const seconds = byCategory?.[categoryIndex] ?? 0;
    if (!stackAsPercent) return toHours(seconds);
    return toPercent(seconds, byCategory?.reduce((total, s) => total + s, 0) ?? 0);
  };

  chartEl.config = {
    data: {
      labels: periodWindow.labels,
      datasets: series.labels.map((label, categoryIndex) => ({
        label,
        data: periodWindow.windowValues.map(ms => barValue(ms, categoryIndex)),
      })),
    },
  };
  // Pin the axis to a whole period in percent mode; otherwise let it fit the hours.
  // yLabel is always set — every bar chart carries one so toggling doesn't reflow the plot area.
  chartEl.max = stackAsPercent ? 100 : null;
  chartEl.yLabel = stackAsPercent ? '% of period' : 'Hours';
  chartEl.label = `${stackAsPercent ? 'Percent' : 'Hours'} ${series.titleSubject}`;
  await chartEl.updateComplete;
}

/** Render every period chart off one shared window, so their bars always line up. */
export async function renderPeriodBarCharts(input: BarChartInput): Promise<void> {
  const periodWindow = resolvePeriodWindow(input);
  await Promise.all([
    renderTimePeriodBarChart(input, periodWindow),
    ...STACKED_TYPE_SERIES.map(series => renderStackedTypeBarChart(series, input, periodWindow)),
  ]);
}
