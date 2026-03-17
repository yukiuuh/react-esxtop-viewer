import { describe, expect, test } from "vite-plus/test";
import {
  applyLegendVisibility,
  buildBaseSeries,
  buildChartTitle,
  sanitizeDatum,
} from "./chartSeries";
import { buildMetricColumnStore } from "./models/dataset";
import { TreeNode } from "./TreeNode";

describe("chartSeries helpers", () => {
  test("sanitizeDatum normalizes chart values", () => {
    expect(sanitizeDatum("nan")).toBeNull();
    expect(sanitizeDatum("12.5")).toBe(12.5);
    expect(sanitizeDatum(4)).toBe(4);
  });

  test("buildChartTitle prefers node path for grouped nodes", () => {
    const node: TreeNode = {
      id: "CPU",
      field_index: -1,
      path: "Host > CPU",
      children: [],
    };

    expect(buildChartTitle(node, ["Timestamp", "CPU Usage"])).toBe("Host > CPU");
  });

  test("buildBaseSeries builds grouped leaf series", () => {
    const metricData = [
      ["t1", "1", "2"],
      ["t2", "3", "nan"],
    ];
    const node: TreeNode = {
      id: "CPU",
      field_index: -1,
      path: "Host > CPU",
      children: [
        {
          id: "Usage",
          field_index: 1,
          path: "Host > CPU > Usage",
          children: [],
        },
        {
          id: "Ready",
          field_index: 2,
          path: "Host > CPU > Ready",
          children: [],
        },
      ],
    };

    const series = buildBaseSeries(node, buildMetricColumnStore(metricData).columns);

    expect(series).toHaveLength(2);
    expect(series[0]?.name).toBe("Usage");
    expect(Array.from(series[0]?.y as Float64Array)).toEqual([1, 3]);
    expect(Number.isNaN((series[1]?.y as Float64Array)[1] as number)).toBe(true);
  });

  test("buildMetricColumnStore transposes row-major metric data", () => {
    const store = buildMetricColumnStore([
      ["t1", "1", "2"],
      ["t2", "3", "4"],
    ]);

    expect(store.rowCount).toBe(2);
    expect(store.numericColumnCount).toBe(2);
    expect(store.columns[0]).toEqual(["t1", "t2"]);
    expect(Array.from(store.columns[1] as Float64Array)).toEqual([1, 3]);
    expect(Array.from(store.columns[2] as Float64Array)).toEqual([2, 4]);
    expect(store.estimatedBytes).toBeGreaterThan(0);
  });

  test("applyLegendVisibility hides series marked invisible", () => {
    const visible = applyLegendVisibility(
      [
        { name: "Usage", y: [1, 2] },
        { name: "Ready", y: [3, 4] },
      ],
      [{ name: "Ready", visible: false }],
    );

    expect(visible[0]?.visible).toBe(true);
    expect(visible[1]?.visible).toBe("legendonly");
  });
});
