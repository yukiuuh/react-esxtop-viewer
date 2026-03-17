export type FileLoadStepMetric = {
  label: string;
  durationMs: number;
  progressEvents: number;
  extra?: Record<string, number | string>;
};

export type FileLoadMetric = {
  fileName: string;
  fileSize: number;
  totalDurationMs: number;
  steps: FileLoadStepMetric[];
  metricFieldCount?: number;
  metricRowCount?: number;
  metricStoreBytes?: number;
  metricNumericColumnCount?: number;
  status: "success" | "error";
  errorMessage?: string;
};

export type PerfSessionMetric = {
  startedAt: string;
  totalDurationMs: number;
  files: FileLoadMetric[];
};

export type MetricViewMetric = {
  fileName: string;
  nodePath: string;
  fieldIndex: number;
  durationMs: number;
  seriesCount: number;
  pointCount: number;
  renderedAt: string;
};

type MemoryMeasurement = {
  usedJsHeapSize: number;
  totalJsHeapSize: number;
  jsHeapSizeLimit: number;
};

export const isDevPerfEnabled = () => import.meta.env.DEV;

export const roundMs = (value: number): number => Math.round(value * 10) / 10;

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`;
};

export const logPerfSessionToConsole = (session: PerfSessionMetric) => {
  if (!isDevPerfEnabled()) {
    return;
  }

  console.groupCollapsed(`[dev-perf] file loading session ${roundMs(session.totalDurationMs)} ms`);
  console.table(
    session.files.map((fileMetric) => ({
      file: fileMetric.fileName,
      size: formatBytes(fileMetric.fileSize),
      fields: fileMetric.metricFieldCount ?? "-",
      rows: fileMetric.metricRowCount ?? "-",
      store: fileMetric.metricStoreBytes ? formatBytes(fileMetric.metricStoreBytes) : "-",
      numericColumns: fileMetric.metricNumericColumnCount ?? "-",
      totalMs: roundMs(fileMetric.totalDurationMs),
      status: fileMetric.status,
    })),
  );

  session.files.forEach((fileMetric) => {
    console.groupCollapsed(
      `[dev-perf] ${fileMetric.fileName} ${roundMs(fileMetric.totalDurationMs)} ms`,
    );
    console.table(
      fileMetric.steps.map((step) => ({
        step: step.label,
        durationMs: roundMs(step.durationMs),
        progressEvents: step.progressEvents,
        ...step.extra,
      })),
    );
    if (fileMetric.errorMessage) {
      console.error(fileMetric.errorMessage);
    }
    console.groupEnd();
  });

  console.groupEnd();
};

const summarizeMetricViewMetrics = (metrics: MetricViewMetric[]) => {
  const durations = metrics.map((metric) => metric.durationMs).sort((a, b) => a - b);
  const total = durations.reduce((sum, value) => sum + value, 0);
  const average = durations.length > 0 ? total / durations.length : 0;
  const percentile95Index =
    durations.length > 0 ? Math.min(durations.length - 1, Math.floor(durations.length * 0.95)) : 0;
  const percentile95 = durations[percentile95Index] ?? 0;
  const slowest = durations[durations.length - 1] ?? 0;

  return {
    count: metrics.length,
    avgMs: roundMs(average),
    p95Ms: roundMs(percentile95),
    maxMs: roundMs(slowest),
  };
};

export const logMetricViewPerfToConsole = (
  metric: MetricViewMetric,
  sessionMetrics: MetricViewMetric[],
) => {
  if (!isDevPerfEnabled()) {
    return;
  }

  const summary = summarizeMetricViewMetrics(sessionMetrics);

  console.groupCollapsed(
    `[dev-perf] metric view ${roundMs(metric.durationMs)} ms ${metric.fileName} ${metric.nodePath}`,
  );
  console.table([
    {
      file: metric.fileName,
      nodePath: metric.nodePath,
      fieldIndex: metric.fieldIndex,
      durationMs: roundMs(metric.durationMs),
      seriesCount: metric.seriesCount,
      pointCount: metric.pointCount,
      renderedAt: metric.renderedAt,
    },
  ]);
  console.table([summary]);
  console.groupEnd();
};

const getMemoryMeasurement = (): MemoryMeasurement | null => {
  const performanceWithMemory = performance as Performance & {
    memory?: MemoryMeasurement;
  };

  if (!performanceWithMemory.memory) {
    return null;
  }

  return performanceWithMemory.memory;
};

export const logMemorySnapshotToConsole = (label: string) => {
  if (!isDevPerfEnabled()) {
    return;
  }

  const memory = getMemoryMeasurement();
  if (!memory) {
    return;
  }

  console.table([
    {
      label,
      usedHeap: formatBytes(memory.usedJsHeapSize),
      totalHeap: formatBytes(memory.totalJsHeapSize),
      heapLimit: formatBytes(memory.jsHeapSizeLimit),
    },
  ]);
};
