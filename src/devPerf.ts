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
  status: "success" | "error";
  errorMessage?: string;
};

export type PerfSessionMetric = {
  startedAt: string;
  totalDurationMs: number;
  files: FileLoadMetric[];
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

  console.groupCollapsed(
    `[dev-perf] file loading session ${roundMs(session.totalDurationMs)} ms`,
  );
  console.table(
    session.files.map((fileMetric) => ({
      file: fileMetric.fileName,
      size: formatBytes(fileMetric.fileSize),
      fields: fileMetric.metricFieldCount ?? "-",
      rows: fileMetric.metricRowCount ?? "-",
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
