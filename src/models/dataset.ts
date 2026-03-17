import { Datum } from "plotly.js";
import { TreeNode } from "../TreeNode";

export type DatasetFormat = "esxtop";
export type MetricColumn = Datum[] | Float64Array;

export interface MetricColumnStore {
  rowCount: number;
  columns: MetricColumn[];
  numericColumnCount: number;
  estimatedBytes: number;
}

export const buildMetricColumnStore = (rows: Datum[][]): MetricColumnStore => {
  const columnCount = rows[0]?.length ?? 0;
  const rowCount = rows.length;
  const metricColumns: MetricColumn[] = Array.from(
    { length: columnCount },
    () => [],
  );

  if (columnCount === 0) {
    return {
      rowCount,
      columns: metricColumns,
      numericColumnCount: 0,
      estimatedBytes: 0,
    };
  }

  const xColumn: Datum[] = Array.from({ length: rowCount }, (_, rowIndex) => {
    return rows[rowIndex]?.[0] ?? null;
  });
  metricColumns[0] = xColumn;

  for (let columnIndex = 1; columnIndex < columnCount; columnIndex += 1) {
    const values = new Float64Array(rowCount);
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const datum = rows[rowIndex]?.[columnIndex];
      if (typeof datum === "number") {
        values[rowIndex] = Number.isNaN(datum) ? Number.NaN : datum;
        continue;
      }

      if (typeof datum === "string") {
        if (datum.toLowerCase() === "nan") {
          values[rowIndex] = Number.NaN;
          continue;
        }

        const parsed = Number.parseFloat(datum);
        values[rowIndex] = Number.isNaN(parsed) ? Number.NaN : parsed;
        continue;
      }

      values[rowIndex] = Number.NaN;
    }
    metricColumns[columnIndex] = values;
  }

  const estimatedBytes =
    xColumn.reduce<number>((total, value) => {
      if (typeof value === "string") {
        return total + value.length * 2;
      }

      return total + 8;
    }, 0) +
    Math.max(0, columnCount - 1) * rowCount * Float64Array.BYTES_PER_ELEMENT;

  return {
    rowCount,
    columns: metricColumns,
    numericColumnCount: Math.max(0, columnCount - 1),
    estimatedBytes,
  };
};

export interface Dataset {
  fileName: string;
  format: DatasetFormat;
  metricFieldTree: TreeNode;
  metricField: string[];
  metricStore: MetricColumnStore;
}
