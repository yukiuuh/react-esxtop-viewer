import { Datum } from "plotly.js";
import { TreeNode } from "../TreeNode";
import { Dataset, DatasetFormat } from "../models/dataset";

export interface ParsedMetricData {
  fields: string[];
  fieldTree: TreeNode;
  rows: Datum[][];
}

export interface FileParser {
  readonly format: DatasetFormat;
  canParse(file: File): boolean | Promise<boolean>;
  parse(
    file: File,
    onProgress?: (message: string) => void,
  ): Promise<ParsedMetricData>;
}

export const toDataset = (
  file: File,
  parser: FileParser,
  parsed: ParsedMetricData,
): Dataset => ({
  fileName: file.name,
  format: parser.format,
  metricField: parsed.fields,
  metricFieldTree: parsed.fieldTree,
  metricData: parsed.rows,
});
