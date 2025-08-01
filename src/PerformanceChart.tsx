import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import { Datum, PlotData, Layout, Data } from "plotly.js";
import { TreeNode } from "./TreeNode";
import { isTauri } from "./utils";
import { save } from "@tauri-apps/api/dialog";
import { writeBinaryFile } from "@tauri-apps/api/fs";
const Plot = createPlotlyComponent(Plotly);

export type LegendSetting = {
  name: string
  visible: boolean
}

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
const PerformanceChart = forwardRef<PerformanceChartHandle, Props>(
  (props, ref) => {
    const { node, metricData, metricField, splitPosition } = props;
    const selectedFieldIndex = node.field_index;
    const [rendered, setRendered] = useState(false);
    const [legendSettings, setLegendSettings] = useState<LegendSetting[]>([]);

    useEffect(() => {
      if (rendered) Plotly.Plots.resize(chartDivId);
    }, [props.node.id, rendered, splitPosition]);

    useImperativeHandle(ref, () => ({
      exportToImage() {
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
                const arrayBuffer = await blob.arrayBuffer();
                if (path) await writeBinaryFile(path, arrayBuffer);
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
            y: metricData.map((d) => {
              const _d = d as Datum[];
              return _d[leafIndex];
            }),
            name: leaf.id,
            marker: { symbol: "circle", opacity: 1, size: 5 },
            mode: "lines+markers",
          };
          return data;
        });
    } else {
      const y = metricData.map((d) => {
        const _d = d as Datum[];
        return _d[selectedFieldIndex];
      });

      const data1: Partial<PlotData> = {
        type: "scattergl",
        x: x,
        y: y,
        marker: { symbol: "circle", opacity: 1, size: 3 },
        mode: "lines+markers",
      };
      allData = [data1];
    }
    const selectedData = allData.map(d => {
      const visible = legendSettings.find(s => s.name == d.name)?.visible
      return ({
        ...d,
        visible: (visible || (visible == undefined)) ? true : "legendonly"
      })
    })
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
    return (
      <Plot
        onAfterPlot={() => {
          setRendered(true);
        }}
        onUpdate={(f) => {
          const nextLegendSettings = f.data?.map((d) => {
            /* @ts-expect-error d.visible */
            return { name: d.name || "", visible: d.visible == undefined || d.visible == true }
          }) || []
          if (JSON.stringify(nextLegendSettings) != JSON.stringify(legendSettings)) {
            setLegendSettings(nextLegendSettings)
          }
        }}
        divId={chartDivId}
        style={{ width: "100%", height: "100%" }}
        data={selectedData as Data[]}
        useResizeHandler
        layout={layout}
        config={{ responsive: true, modeBarButtonsToRemove: ["toImage"] }}
      />
    );
  },
);

export default PerformanceChart;
