import { Datum, PlotData } from "plotly.js";
import { TreeNode } from "./TreeNode";
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
  metricData: Datum[][],
): Partial<PlotData>[] => {
  const x = metricData.map((row) => (row as string[])[0]);

  if (node.field_index < 0) {
    return node.children
      .filter((child) => child.children.length === 0 && child.field_index > 0)
      .map((leaf) => ({
        type: "scattergl",
        x,
        y: metricData.map((row) => sanitizeDatum((row as Datum[])[leaf.field_index])),
        name: leaf.id,
        marker: { symbol: "circle", opacity: 1, size: 5 },
        mode: "lines+markers",
      }));
  }

  return [
    {
      type: "scattergl",
      x,
      y: metricData.map((row) => sanitizeDatum((row as Datum[])[node.field_index])),
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
