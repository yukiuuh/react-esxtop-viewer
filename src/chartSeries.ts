import { Datum, PlotData } from "plotly.js";
import { TreeNode } from "./TreeNode";
import { MetricColumn } from "./models/dataset";
import type { LegendSetting } from "./PerformanceChart";

export const sanitizeDatum = (datum: Datum): number | null => {
  if (datum === null || datum === undefined) {
    return null;
  }

  if (typeof datum === "number") {
    return isNaN(datum) ? null : datum;
  }

  if (typeof datum === "string") {
    if (datum.toLowerCase() === "nan") {
      return null;
    }

    const num = parseFloat(datum);
    return isNaN(num) ? null : num;
  }

  return null;
};

export const buildChartTitle = (
  node: TreeNode,
  metricField: string[],
): string => {
  return node.field_index < 0 ? node.path : metricField[node.field_index];
};

export const buildBaseSeries = (
  node: TreeNode,
  metricColumns: MetricColumn[],
): Partial<PlotData>[] => {
  const x = (metricColumns[0] ?? []) as Datum[] | string[];

  if (node.field_index < 0) {
    return node.children
      .filter((child) => child.children.length === 0 && child.field_index > 0)
      .map((leaf) => ({
        type: "scattergl",
        x,
        y: metricColumns[leaf.field_index] as unknown as PlotData["y"],
        name: leaf.id,
        marker: { symbol: "circle", opacity: 1, size: 5 },
        mode: "lines+markers",
      }));
  }

  return [
    {
      type: "scattergl",
      x,
      y: metricColumns[node.field_index] as unknown as PlotData["y"],
      marker: { symbol: "circle", opacity: 1, size: 3 },
      mode: "lines+markers",
    },
  ];
};

export const applyLegendVisibility = (
  series: Partial<PlotData>[],
  legendSettings: LegendSetting[],
): Partial<PlotData>[] => {
  return series.map((item) => {
    const visible = legendSettings.find((setting) => setting.name === item.name)
      ?.visible;

    return {
      ...item,
      visible: visible || visible === undefined ? true : "legendonly",
    };
  });
};
