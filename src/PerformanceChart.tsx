import { forwardRef, useEffect, useImperativeHandle, useMemo, useState, memo } from "react";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponentModule from "react-plotly.js/factory.js";
import { Layout, Data } from "plotly.js";
import { TreeNode } from "./TreeNode";
import { MetricColumn } from "./models/dataset";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { isTauri } from "@tauri-apps/api/core";
import {
  applyLegendVisibility,
  buildBaseSeries,
  buildChartTitle,
  buildLegendSettings,
  reconcileLegendSettings,
} from "./chartSeries";
import type { LegendSetting } from "./chartSeries";
import { applyRelayoutToChartLayout, createBaseChartLayout, mergeChartLayout } from "./chartLayout";

const createPlotlyComponent =
  (
    createPlotlyComponentModule as {
      default?: typeof createPlotlyComponentModule;
    }
  ).default ?? createPlotlyComponentModule;
const Plot = createPlotlyComponent(Plotly);

export type { LegendSetting };

type Props = {
  node: TreeNode;
  metricColumns: MetricColumn[];
  metricField: string[];
  splitPosition: number;
  renderMeasurementToken?: number;
  onRenderMeasured?: (stats: { token: number; seriesCount: number; pointCount: number }) => void;
};

export interface PerformanceChartHandle {
  exportToImage: () => void;
}

const chartDivId = "plotlyChart";

const PerformanceChart = memo(
  forwardRef<PerformanceChartHandle, Props>((props, ref) => {
    const {
      node,
      metricColumns,
      metricField,
      splitPosition,
      renderMeasurementToken,
      onRenderMeasured,
    } = props;
    const hasNoData = node.field_index == -1 && !node.children.some((n) => n.field_index != -1);
    useImperativeHandle(ref, () => ({
      exportToImage() {
        if (hasNoData) return;
        Plotly.toImage(chartDivId, {
          format: "png",
          width: null,
          height: null,
        }).then(async (dataUrl: string) => {
          fetch(dataUrl)
            .then((res) => res.blob())
            .then(async (blob) => {
              if (isTauri()) {
                const path = await save({ defaultPath: "export.png" });
                if (path) {
                  const arrayBuffer = await blob.arrayBuffer();
                  await writeFile(path, new Blob([arrayBuffer]).stream());
                }
              } else {
                const link = document.createElement("a");
                link.download = "export.png";
                link.href = URL.createObjectURL(blob);
                link.click();
                URL.revokeObjectURL(link.href);
              }
            });
        });
      },
    }));

    useEffect(() => {
      Plotly.Plots.resize(chartDivId);
    }, [splitPosition]);

    useEffect(() => {
      return () => {
        const chartElement = document.getElementById(chartDivId);
        if (chartElement) {
          Plotly.purge(chartElement);
        }
      };
    }, []);

    const title = useMemo(() => buildChartTitle(node, metricField), [node, metricField]);
    const baseSeries = useMemo(() => buildBaseSeries(node, metricColumns), [node, metricColumns]);
    const defaultLegendSettings = useMemo(() => buildLegendSettings(baseSeries), [baseSeries]);
    const [legendSettings, setLegendSettings] = useState<LegendSetting[]>(defaultLegendSettings);
    const baseLayout = useMemo(() => createBaseChartLayout(title), [title]);
    const [layout, setLayout] = useState<Partial<Layout>>(baseLayout);

    useEffect(() => {
      setLegendSettings((previousSettings) =>
        reconcileLegendSettings(previousSettings, defaultLegendSettings),
      );
    }, [defaultLegendSettings]);

    useEffect(() => {
      setLayout((previousLayout) => mergeChartLayout(previousLayout, baseLayout));
    }, [baseLayout]);

    const selectedData = useMemo(
      () => applyLegendVisibility(baseSeries, legendSettings),
      [baseSeries, legendSettings],
    );
    const pointCount = useMemo(
      () =>
        selectedData.reduce((total, series) => {
          if (!series.y) {
            return total;
          }

          if (Array.isArray(series.y) || ArrayBuffer.isView(series.y)) {
            return total + series.y.length;
          }

          return total;
        }, 0),
      [selectedData],
    );

    useEffect(() => {
      if (!renderMeasurementToken || !onRenderMeasured) {
        return;
      }

      const frameId = requestAnimationFrame(() => {
        onRenderMeasured({
          token: renderMeasurementToken,
          seriesCount: selectedData.length,
          pointCount,
        });
      });

      return () => cancelAnimationFrame(frameId);
    }, [onRenderMeasured, pointCount, renderMeasurementToken, selectedData.length]);

    if (hasNoData) return <div id={chartDivId}></div>;

    return (
      <Plot
        divId={chartDivId}
        style={{ width: "100%", height: "100%" }}
        data={selectedData as Data[]}
        layout={layout}
        config={{ responsive: true, modeBarButtonsToRemove: ["toImage"] }}
        useResizeHandler
        onUpdate={(f) => {
          const nextLegendSettings =
            f.data?.map((d) => {
              return {
                name: d.name || "",
                /* @ts-expect-error d.visible */
                visible: d.visible == undefined || d.visible == true,
              };
            }) || [];
          if (JSON.stringify(nextLegendSettings) != JSON.stringify(legendSettings)) {
            setLegendSettings(nextLegendSettings);
          }
        }}
        onRelayout={(event) => {
          setLayout((previousLayout) =>
            applyRelayoutToChartLayout(
              previousLayout as Partial<Layout>,
              event as Record<string, unknown>,
            ),
          );
        }}
      />
    );
  }),
);

export default PerformanceChart;
