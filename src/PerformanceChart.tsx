import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  memo,
} from "react";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import { Datum, PlotData, Layout, Data } from "plotly.js";
import { TreeNode } from "./TreeNode";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { isTauri } from "@tauri-apps/api/core";
const Plot = createPlotlyComponent(Plotly);

export type LegendSetting = {
  name: string;
  visible: boolean;
};

type Props = {
  node: TreeNode;
  metricData: Datum[][];
  metricField: string[];
  splitPosition: number;
};

export interface PerformanceChartHandle {
  exportToImage: () => void;
}

const chartDivId = "plotlyChart";

// "nan"などの文字列をプロット可能なnullに変換し、数値をパースするヘルパー関数
const sanitizeDatum = (datum: Datum): number | null => {
  if (datum === null || datum === undefined) {
    return null;
  }
  if (typeof datum === "number") {
    return isNaN(datum) ? null : datum;
  }
  if (typeof datum === "string") {
    // "nan" は大文字小文字を区別せずにチェック
    if (datum.toLowerCase() === "nan") {
      return null;
    }
    const num = parseFloat(datum);
    return isNaN(num) ? null : num;
  }
  // string, number, null 以外はプロットしない
  return null;
};

const PerformanceChart = memo(
  forwardRef<PerformanceChartHandle, Props>((props, ref) => {
    const { node, metricData, metricField, splitPosition } = props;
    const selectedFieldIndex = node.field_index;
    const [legendSettings, setLegendSettings] = useState<LegendSetting[]>([]);
    const hasNoData =
      node.field_index == -1 && !node.children.some((n) => n.field_index != -1);
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

    const x = metricData.map((d) => {
      const _d = d as string[];
      return _d[0];
    });
    const title =
      selectedFieldIndex < 0 ? node.path : metricField[selectedFieldIndex];
    let allData: Partial<PlotData>[];

    if (selectedFieldIndex < 0) {
      const leafs = node.children.filter((v) => v.children.length == 0);

      allData = leafs
        .filter((leaf) => leaf.field_index > 0)
        .map((leaf) => {
          const leafIndex = leaf.field_index;
          const data: Partial<PlotData> = {
            type: "scattergl",
            x: x,
            y: metricData.map((d) => sanitizeDatum((d as Datum[])[leafIndex])),
            name: leaf.id,
            marker: { symbol: "circle", opacity: 1, size: 5 },
            mode: "lines+markers",
          };
          return data;
        });
    } else {
      const y = metricData.map((d) =>
        sanitizeDatum((d as Datum[])[selectedFieldIndex]),
      );

      const data1: Partial<PlotData> = {
        type: "scattergl",
        x: x,
        y: y,
        marker: { symbol: "circle", opacity: 1, size: 3 },
        mode: "lines+markers",
      };
      allData = [data1];
    }
    const selectedData = allData.map((d) => {
      const visible = legendSettings.find((s) => s.name == d.name)?.visible;
      return {
        ...d,
        visible: visible || visible == undefined ? true : "legendonly",
      };
    });
    const layout: Partial<Layout> = {
      yaxis: { rangemode: "tozero" },
      xaxis: { showspikes: true, tickmode: "auto", nticks: 20 },
      hovermode: "x",
      autosize: true,
      title: title || "Performance Chart",
      font: {
        family: "var(--cds-global-typography-font-family)",
      },
    };
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
          if (
            JSON.stringify(nextLegendSettings) != JSON.stringify(legendSettings)
          ) {
            setLegendSettings(nextLegendSettings);
          }
        }}
      />
    );
  }),
);

export default PerformanceChart;
