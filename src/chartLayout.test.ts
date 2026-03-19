import { describe, expect, test } from "vite-plus/test";
import { applyRelayoutToChartLayout, createBaseChartLayout, mergeChartLayout } from "./chartLayout";

describe("chartLayout helpers", () => {
  test("mergeChartLayout preserves user zoom ranges while refreshing base props", () => {
    const baseLayout = createBaseChartLayout("Updated Title");
    const merged = mergeChartLayout(
      {
        title: "Old Title",
        xaxis: { range: [10, 20], autorange: false },
      },
      baseLayout,
    );

    expect(merged.title).toBe("Updated Title");
    expect(merged.xaxis?.range).toEqual([10, 20]);
    expect(merged.xaxis?.autorange).toBe(false);
    expect(merged.xaxis?.nticks).toBe(20);
  });

  test("applyRelayoutToChartLayout stores zoomed ranges", () => {
    const updated = applyRelayoutToChartLayout(createBaseChartLayout("CPU"), {
      "xaxis.range[0]": 100,
      "xaxis.range[1]": 200,
      "yaxis.range[0]": 0,
      "yaxis.range[1]": 50,
    });

    expect(updated.xaxis?.range).toEqual([100, 200]);
    expect(updated.xaxis?.autorange).toBe(false);
    expect(updated.yaxis?.range).toEqual([0, 50]);
    expect(updated.yaxis?.autorange).toBe(false);
  });

  test("applyRelayoutToChartLayout clears explicit ranges on autorange reset", () => {
    const updated = applyRelayoutToChartLayout(
      {
        ...createBaseChartLayout("CPU"),
        xaxis: { range: [1, 2], autorange: false },
      },
      { "xaxis.autorange": true },
    );

    expect(updated.xaxis?.autorange).toBe(true);
    expect(updated.xaxis?.range).toBeUndefined();
  });
});
