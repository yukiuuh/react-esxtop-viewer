import { Datum } from "plotly.js";
import { FileLoadMetric, FileLoadStepMetric } from "../devPerf";
import { Dataset } from "../models/dataset";
import { esxtopParser } from "../parsers/esxtopParser";
import { FileParser, toDataset } from "../parsers/types";
import { LoadProgressEvent } from "./loadProgress";

type LoadFilesOptions = {
  onProgress?: (event: LoadProgressEvent) => void;
};

type LoadFilesResult = {
  datasets: Dataset[];
  metrics: FileLoadMetric[];
};

const availableParsers: FileParser[] = [esxtopParser];

const resolveParser = async (file: File): Promise<FileParser> => {
  for (const parser of availableParsers) {
    if (await parser.canParse(file)) {
      return parser;
    }
  }

  throw new Error(`No parser available for file: ${file.name}`);
};

export const loadFiles = async (
  files: File[],
  options: LoadFilesOptions = {},
): Promise<LoadFilesResult> => {
  const metrics: FileLoadMetric[] = [];

  const datasets = await Promise.all(
    files.map(async (file) => {
      const fileStart = performance.now();
      const steps: FileLoadStepMetric[] = [];
      let metricFieldCount = 0;
      let metricRowCount = 0;

      try {
        const parserStart = performance.now();
        const parser = await resolveParser(file);
        steps.push({
          label: "resolve parser",
          durationMs: performance.now() - parserStart,
          progressEvents: 0,
          extra: { format: parser.format },
        });

        const parseStart = performance.now();
        const parsed = await parser.parse(file, options.onProgress);
        metricFieldCount = parsed.fields.length;
        metricRowCount = parsed.rows.length;
        steps.push({
          label: "parse dataset",
          durationMs: performance.now() - parseStart,
          progressEvents: 0,
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
          status: "success",
        };
        metrics.push(metric);

        return dataset;
      } catch (error) {
        const metric: FileLoadMetric = {
          fileName: file.name,
          fileSize: file.size,
          totalDurationMs: performance.now() - fileStart,
          steps,
          metricFieldCount,
          metricRowCount,
          status: "error",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        };
        metrics.push(metric);
        (error as Error & { __perfMetric?: FileLoadMetric }).__perfMetric = metric;
        throw error;
      }
    }),
  );

  return { datasets, metrics };
};

export const getDatasetMetricData = (dataset: Dataset | undefined): Datum[][] =>
  dataset?.metricData || [];

export const getDatasetMetricFields = (dataset: Dataset | undefined): string[] =>
  dataset?.metricField || [];
