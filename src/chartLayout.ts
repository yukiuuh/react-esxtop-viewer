import { Layout } from "plotly.js";

type AxisRange = {
  range?: unknown[];
  autorange?: unknown;
};

type LayoutWithAxes = Partial<Layout> & {
  xaxis?: Partial<Layout["xaxis"]> & AxisRange;
  yaxis?: Partial<Layout["yaxis"]> & AxisRange;
};

export const createBaseChartLayout = (title: string): LayoutWithAxes => ({
  yaxis: { rangemode: "tozero" },
  xaxis: { showspikes: true, tickmode: "auto", nticks: 20 },
  hovermode: "x",
  autosize: true,
  title: title || "Performance Chart",
  font: {
    family: "var(--cds-global-typography-font-family)",
  },
});

export const mergeChartLayout = (
  previousLayout: LayoutWithAxes | undefined,
  baseLayout: LayoutWithAxes,
): LayoutWithAxes => ({
  ...previousLayout,
  ...baseLayout,
  xaxis: {
    ...baseLayout.xaxis,
    ...previousLayout?.xaxis,
  },
  yaxis: {
    ...baseLayout.yaxis,
    ...previousLayout?.yaxis,
  },
});

export const applyRelayoutToChartLayout = (
  layout: LayoutWithAxes,
  relayout: Record<string, unknown>,
): LayoutWithAxes => {
  const nextLayout = {
    ...layout,
    xaxis: { ...layout.xaxis },
    yaxis: { ...layout.yaxis },
  };

  const setAxisRangeValue = (axisKey: "xaxis" | "yaxis", index: 0 | 1, value: unknown) => {
    const axis = nextLayout[axisKey];
    const range = [...(axis?.range ?? [undefined, undefined])];
    range[index] = value;
    nextLayout[axisKey] = {
      ...axis,
      range,
      autorange: false,
    };
  };

  for (const [key, value] of Object.entries(relayout)) {
    if (key === "xaxis.autorange") {
      nextLayout.xaxis = { ...nextLayout.xaxis, autorange: Boolean(value) };
      if (value) {
        delete nextLayout.xaxis.range;
      }
      continue;
    }

    if (key === "yaxis.autorange") {
      nextLayout.yaxis = { ...nextLayout.yaxis, autorange: Boolean(value) };
      if (value) {
        delete nextLayout.yaxis.range;
      }
      continue;
    }

    if (key === "xaxis.range[0]") {
      setAxisRangeValue("xaxis", 0, value);
      continue;
    }

    if (key === "xaxis.range[1]") {
      setAxisRangeValue("xaxis", 1, value);
      continue;
    }

    if (key === "yaxis.range[0]") {
      setAxisRangeValue("yaxis", 0, value);
      continue;
    }

    if (key === "yaxis.range[1]") {
      setAxisRangeValue("yaxis", 1, value);
    }
  }

  return nextLayout;
};
