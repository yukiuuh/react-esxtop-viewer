import { ControlStatus } from "@cds/core/forms";
import "@cds/core/global.css"; // pre-minified version breaks
import "@cds/core/icon/register.js";
import "@cds/core/internal-components/split-handle/register.js";
import "@cds/core/styles/theme.dark.css"; // pre-minified version breaks
import { CdsButton } from "@cds/react/button";
import { CdsDivider } from "@cds/react/divider";
import React, { useMemo, useRef, useState } from "react";
import "./App.css";
import { FileLoadMetric, logPerfSessionToConsole } from "./devPerf";
import FileLoader from "./FileLoader";
import Header from "./Header";
import LoadingOverlay from "./LoadingOverlay";
import MultiFileMetricBrowser from "./MultiFileMetricBrowser";
import { Dataset } from "./models/dataset";
import PerformanceChart, { PerformanceChartHandle } from "./PerformanceChart";
import {
  getDatasetMetricData,
  getDatasetMetricFields,
  loadFiles,
} from "./services/fileLoadService";
import SplitPane from "./SplitPane";
import { filterTree, TreeNode } from "./TreeNode";

const App: React.FC = () => {
  const [esxtopData, setEsxtopData] = useState<Dataset[]>([]);
  const [selectedEsxtopDataIndex, setSelectedEsxtopDataIndex] = useState(0);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileStatus, setFileStatus] = useState<ControlStatus>("neutral");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [splitPosition, setSplitPosition] = useState(20);
  const [loadingMessage, setLoadingMessage] = useState("");

  const performanceChartRef = useRef<PerformanceChartHandle>(null);

  const currentMetricField = useMemo(
    () => getDatasetMetricFields(esxtopData[selectedEsxtopDataIndex]),
    [esxtopData, selectedEsxtopDataIndex],
  );
  const currentMetricData = useMemo(
    () => getDatasetMetricData(esxtopData[selectedEsxtopDataIndex]),
    [esxtopData, selectedEsxtopDataIndex],
  );

  const filteredEsxtopData = useMemo(() => {
    if (!filterKeyword) {
      return esxtopData;
    }
    return esxtopData.map((data) => ({
      ...data,
      metricFieldTree: filterTree(data.metricFieldTree, filterKeyword),
    }));
  }, [esxtopData, filterKeyword]);

  const handleExportToImage = () => {
    performanceChartRef.current?.exportToImage();
  };

  const handleFileChange = async (files: File[]) => {
    if (files.length === 0) {
      setEsxtopData([]);
      setFileStatus("neutral");
      setLoading(false);
      return;
    }

    setEsxtopData([]);
    setFileStatus("neutral");
    setLoading(true);

    const sessionStart = performance.now();
    const startedAt = new Date().toISOString();

    try {
      const result = await loadFiles(files, {
        onProgress(message) {
          setLoadingMessage(message);
        },
      });
      setEsxtopData(result.datasets);
      setFileStatus("success");
      logPerfSessionToConsole({
        startedAt,
        totalDurationMs: performance.now() - sessionStart,
        files: result.metrics,
      });
    } catch (e) {
      console.error("File processing failed:", e);
      setFileStatus("error");
      const failedMetric = (e as Error & { __perfMetric?: FileLoadMetric })
        .__perfMetric;
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
                esxtopData={filteredEsxtopData}
                onSelectedChange={(node, dataIndex) => {
                  setSelectedNode(node);
                  setSelectedEsxtopDataIndex(dataIndex);
                }}
              />
              {selectedNode ? (
                <PerformanceChart
                  ref={performanceChartRef}
                  splitPosition={splitPosition}
                  node={selectedNode}
                  metricData={currentMetricData}
                  metricField={currentMetricField}
                />
              ) : (
                <></>
              )}
            </SplitPane>
          </div>
          <CdsDivider
            orientation="horizontal"
            cds-layout="align:shrink"
          ></CdsDivider>
          <div cds-layout="align:shrink m:sm">
            <div cds-layout="horizontal gap:md align:vertical-center">
              <FileLoader
                status={fileStatus}
                loading={loading}
                onChangeFiles={handleFileChange}
              />
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
