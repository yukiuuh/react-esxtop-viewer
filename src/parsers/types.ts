import { Datum } from "plotly.js";
import { TreeNode } from "../TreeNode";
import { buildMetricColumnStore, Dataset, DatasetFormat } from "../models/dataset";
import { LoadProgressEvent } from "../services/loadProgress";

export interface ParsedMetricData {
  fields: string[];
  fieldTree: TreeNode;
  rows: Datum[][];
}

export interface FileParser {
  readonly format: DatasetFormat;
  canParse(file: File): boolean | Promise<boolean>;
  parse(file: File, onProgress?: (event: LoadProgressEvent) => void): Promise<ParsedMetricData>;
}

export const toDataset = (file: File, parser: FileParser, parsed: ParsedMetricData): Dataset => ({
  fileName: file.name,
  format: parser.format,
  metricField: parsed.fields,
  metricFieldTree: parsed.fieldTree,
  metricStore: buildMetricColumnStore(parsed.rows),
});
