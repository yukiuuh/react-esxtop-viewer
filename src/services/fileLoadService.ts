import { FileLoadMetric, FileLoadStepMetric } from "../devPerf";
import { Dataset, MetricColumn } from "../models/dataset";
import { esxtopParser } from "../parsers/esxtopParser";
import { FileParser, toDataset } from "../parsers/types";
import { LoadProgressEvent } from "./loadProgress";

type LoadFilesOptions = {
  onProgress?: (event: LoadProgressEvent) => void;
  parsers?: FileParser[];
};

type LoadFilesResult = {
  datasets: Dataset[];
  metrics: FileLoadMetric[];
};

const availableParsers: FileParser[] = [esxtopParser];

const resolveParser = async (file: File, parsers: FileParser[]): Promise<FileParser> => {
  for (const parser of parsers) {
    if (await parser.canParse(file)) {
      return parser;
    }
  }

  throw new Error(`No parser available for file: ${file.name}`);
};

const createParseProgressTracker = (
  fileName: string,
  onProgress?: (event: LoadProgressEvent) => void,
) => {
  let progressEvents = 0;

  return {
    emit(event: LoadProgressEvent) {
      progressEvents += 1;
      onProgress?.(event);
    },
    getProgressEventCount() {
      return progressEvents;
    },
    emitDetectingParser() {
      progressEvents += 1;
      onProgress?.({
        fileName,
        stage: "detect",
        message: `Detecting parser for ${fileName}`,
      });
    },
  };
};

const loadFile = async (
  file: File,
  parsers: FileParser[],
  onProgress?: (event: LoadProgressEvent) => void,
): Promise<{ dataset: Dataset; metric: FileLoadMetric }> => {
  const fileStart = performance.now();
  const steps: FileLoadStepMetric[] = [];
  let metricFieldCount = 0;
  let metricRowCount = 0;
  const progressTracker = createParseProgressTracker(file.name, onProgress);

  try {
    const parserStart = performance.now();
    progressTracker.emitDetectingParser();
    const parser = await resolveParser(file, parsers);
    steps.push({
      label: "resolve parser",
      durationMs: performance.now() - parserStart,
      progressEvents: 1,
      extra: { format: parser.format },
    });

    const parseStart = performance.now();
    const parsed = await parser.parse(file, (event) => progressTracker.emit(event));
    metricFieldCount = parsed.fields.length;
    metricRowCount = parsed.rows.length;
    steps.push({
      label: "parse dataset",
      durationMs: performance.now() - parseStart,
      progressEvents: progressTracker.getProgressEventCount() - 1,
      extra: {
        fields: metricFieldCount,
        rows: metricRowCount,
      },
    });

    const dataset = toDataset(file, parser, parsed);
    const metric: FileLoadMetric = {
      fileName: file.name,
      fileSize: file.size,
      totalDurationMs: performance.now() - fileStart,
      steps,
      metricFieldCount,
      metricRowCount,
      metricStoreBytes: dataset.metricStore.estimatedBytes,
      metricNumericColumnCount: dataset.metricStore.numericColumnCount,
      status: "success",
    };

    return { dataset, metric };
  } catch (error) {
    const metric: FileLoadMetric = {
      fileName: file.name,
      fileSize: file.size,
      totalDurationMs: performance.now() - fileStart,
      steps,
      metricFieldCount,
      metricRowCount,
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
    (error as Error & { __perfMetric?: FileLoadMetric }).__perfMetric = metric;
    throw error;
  }
};

export const loadFiles = async (
  files: File[],
  options: LoadFilesOptions = {},
): Promise<LoadFilesResult> => {
  const parsers = options.parsers ?? availableParsers;
  const results = await Promise.all(
    files.map((file) => loadFile(file, parsers, options.onProgress)),
  );

  return {
    datasets: results.map((result) => result.dataset),
    metrics: results.map((result) => result.metric),
  };
};

export const getDatasetMetricFields = (dataset: Dataset | undefined): string[] =>
  dataset?.metricField || [];

export const getDatasetMetricColumns = (dataset: Dataset | undefined): MetricColumn[] =>
  dataset?.metricStore.columns || [];
