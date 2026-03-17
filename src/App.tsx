import { ControlStatus } from "@cds/core/forms";
import "@cds/core/global.css"; // pre-minified version breaks
import "@cds/core/icon/register.js";
import "@cds/core/internal-components/split-handle/register.js";
import "@cds/core/styles/theme.dark.css"; // pre-minified version breaks
import { CdsButton } from "@cds/react/button";
import { CdsDivider } from "@cds/react/divider";
import React, { useMemo, useRef, useState } from "react";
import "./App.css";
import {
  FileLoadMetric,
  MetricViewMetric,
  logMemorySnapshotToConsole,
  logMetricViewPerfToConsole,
  logPerfSessionToConsole,
} from "./devPerf";
import FileLoader from "./FileLoader";
import Header from "./Header";
import LoadingOverlay from "./LoadingOverlay";
import MultiFileMetricBrowser from "./MultiFileMetricBrowser";
import { Dataset } from "./models/dataset";
import PerformanceChart, { PerformanceChartHandle } from "./PerformanceChart";
import { formatLoadProgress } from "./services/loadProgress";
import {
  getDatasetMetricColumns,
  getDatasetMetricFields,
  loadFiles,
} from "./services/fileLoadService";
import SplitPane from "./SplitPane";
import { filterTree, TreeNode } from "./TreeNode";

const App: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetIndex, setSelectedDatasetIndex] = useState(0);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileStatus, setFileStatus] = useState<ControlStatus>("neutral");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [splitPosition, setSplitPosition] = useState(20);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [renderMeasurementToken, setRenderMeasurementToken] = useState(0);

  const performanceChartRef = useRef<PerformanceChartHandle>(null);
  const pendingMetricViewRef = useRef<{
    token: number;
    startedAtMs: number;
    fileName: string;
    nodePath: string;
    fieldIndex: number;
  } | null>(null);
  const metricViewMetricsRef = useRef<MetricViewMetric[]>([]);

  const currentMetricField = useMemo(
    () => getDatasetMetricFields(datasets[selectedDatasetIndex]),
    [datasets, selectedDatasetIndex],
  );
  const currentMetricColumns = useMemo(
    () => getDatasetMetricColumns(datasets[selectedDatasetIndex]),
    [datasets, selectedDatasetIndex],
  );

  const filteredDatasets = useMemo(() => {
    if (!filterKeyword) {
      return datasets;
    }
    return datasets.map((dataset) => ({
      ...dataset,
      metricFieldTree: filterTree(dataset.metricFieldTree, filterKeyword),
    }));
  }, [datasets, filterKeyword]);

  const handleExportToImage = () => {
    performanceChartRef.current?.exportToImage();
  };

  const clearLoadedState = () => {
    pendingMetricViewRef.current = null;
    setSelectedNode(null);
    setSelectedDatasetIndex(0);
    setDatasets([]);
  };

  const handleMetricViewRendered = (stats: {
    token: number;
    seriesCount: number;
    pointCount: number;
  }) => {
    const pendingMetricView = pendingMetricViewRef.current;

    if (!pendingMetricView || pendingMetricView.token !== stats.token) {
      return;
    }

    const metric: MetricViewMetric = {
      fileName: pendingMetricView.fileName,
      nodePath: pendingMetricView.nodePath,
      fieldIndex: pendingMetricView.fieldIndex,
      durationMs: performance.now() - pendingMetricView.startedAtMs,
      seriesCount: stats.seriesCount,
      pointCount: stats.pointCount,
      renderedAt: new Date().toISOString(),
    };

    metricViewMetricsRef.current.push(metric);
    logMetricViewPerfToConsole(metric, metricViewMetricsRef.current);
    pendingMetricViewRef.current = null;
  };

  const handleFileChange = async (files: File[]) => {
    if (files.length === 0) {
      clearLoadedState();
      setFileStatus("neutral");
      setLoading(false);
      logMemorySnapshotToConsole("[dev-perf] after clear files");
      return;
    }

    logMemorySnapshotToConsole("[dev-perf] before clearing current dataset");
    clearLoadedState();
    setFileStatus("neutral");
    setLoading(true);

    const sessionStart = performance.now();
    const startedAt = new Date().toISOString();

    try {
      const result = await loadFiles(files, {
        onProgress(event) {
          setLoadingMessage(formatLoadProgress(event));
        },
      });
      setDatasets(result.datasets);
      setFileStatus("success");
      logPerfSessionToConsole({
        startedAt,
        totalDurationMs: performance.now() - sessionStart,
        files: result.metrics,
      });
      logMemorySnapshotToConsole("[dev-perf] after load");
    } catch (e) {
      console.error("File processing failed:", e);
      setFileStatus("error");
      const failedMetric = (e as Error & { __perfMetric?: FileLoadMetric }).__perfMetric;
      if (failedMetric) {
        logPerfSessionToConsole({
          startedAt,
          totalDurationMs: performance.now() - sessionStart,
          files: [failedMetric],
        });
      }
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  return (
    <div className="main-container">
      <Header
        onFilterKeywordChange={setFilterKeyword}
        appVersion={import.meta.env.VITE_APP_VERSION}
      />
      <div cds-layout="horizontal align:stretch" style={{ height: "100%" }}>
        <div cds-layout="vertical align:stretch" style={{ height: "100%" }}>
          <div cds-layout="horizontal align:stretch gap:md wrap:none">
            <SplitPane initPosition={20} onPositionChanged={setSplitPosition}>
              <MultiFileMetricBrowser
                loading={loading}
                datasets={filteredDatasets}
                onSelectedChange={(node, dataIndex) => {
                  const nextToken = renderMeasurementToken + 1;
                  const dataset = datasets[dataIndex];
                  pendingMetricViewRef.current = {
                    token: nextToken,
                    startedAtMs: performance.now(),
                    fileName: dataset?.fileName ?? `dataset-${dataIndex}`,
                    nodePath: node.path,
                    fieldIndex: node.field_index,
                  };
                  setSelectedNode(node);
                  setSelectedDatasetIndex(dataIndex);
                  setRenderMeasurementToken(nextToken);
                }}
              />
              {selectedNode ? (
                <PerformanceChart
                  key={`${datasets[selectedDatasetIndex]?.fileName ?? "none"}:${selectedNode.path}`}
                  ref={performanceChartRef}
                  splitPosition={splitPosition}
                  node={selectedNode}
                  metricColumns={currentMetricColumns}
                  metricField={currentMetricField}
                  renderMeasurementToken={renderMeasurementToken}
                  onRenderMeasured={handleMetricViewRendered}
                />
              ) : (
                <></>
              )}
            </SplitPane>
          </div>
          <CdsDivider orientation="horizontal" cds-layout="align:shrink"></CdsDivider>
          <div cds-layout="align:shrink m:sm">
            <div cds-layout="horizontal gap:md align:vertical-center">
              <FileLoader status={fileStatus} loading={loading} onChangeFiles={handleFileChange} />
              <CdsButton
                cds-layout="align:right"
                action="outline"
                size="sm"
                disabled={!selectedNode}
                onClick={handleExportToImage}
              >
                EXPORT
              </CdsButton>
            </div>
          </div>
        </div>
      </div>
      <LoadingOverlay message={loadingMessage} loading={loading} />
    </div>
  );
};

export default App;
