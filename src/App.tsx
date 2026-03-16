import { ControlStatus } from "@cds/core/forms";
import "@cds/core/global.css"; // pre-minified version breaks
import "@cds/core/icon/register.js";
import "@cds/core/internal-components/split-handle/register.js";
import "@cds/core/styles/theme.dark.css"; // pre-minified version breaks
import { CdsButton } from "@cds/react/button";
import { CdsDivider } from "@cds/react/divider";
import { Datum } from "plotly.js";
import React, { useMemo, useRef, useState } from "react";
import "./App.css";
import {
  FileLoadMetric,
  FileLoadStepMetric,
  logPerfSessionToConsole,
} from "./devPerf";
import { computeEsxtopFieldTreeV2, EsxtopData } from "./esxtop";
import FileLoader from "./FileLoader";
import Header from "./Header";
import LoadingOverlay from "./LoadingOverlay";
import MultiFileMetricBrowser from "./MultiFileMetricBrowser";
import PerformanceChart, { PerformanceChartHandle } from "./PerformanceChart";
import SplitPane from "./SplitPane";
import { filterTree, TreeNode } from "./TreeNode";
import { parseCSVv3, readCsvHeaderV2, removeFirstLineFromCSV } from "./utils";

const App: React.FC = () => {
  // 1. Stateの統合：関連するデータを一つのオブジェクト配列にまとめる
  const [esxtopData, setEsxtopData] = useState<EsxtopData[]>([]);
  const [selectedEsxtopDataIndex, setSelectedEsxtopDataIndex] = useState(0);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileStatus, setFileStatus] = useState<ControlStatus>("neutral");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [splitPosition, setSplitPosition] = useState(20);
  const [loadingMessage, setLoadingMessage] = useState("");

  const performanceChartRef = useRef<PerformanceChartHandle>(null);

  // 2. 派生データのメモ化：esxtopDataやselectedEsxtopDataIndexが変更されたときだけ再計算
  const currentMetricField = useMemo(
    () => esxtopData[selectedEsxtopDataIndex]?.metricField || [],
    [esxtopData, selectedEsxtopDataIndex],
  );
  const currentMetricData = useMemo(
    () => esxtopData[selectedEsxtopDataIndex]?.metricData || [],
    [esxtopData, selectedEsxtopDataIndex],
  );

  // 3. フィルタリングされたツリーのメモ化：esxtopDataかfilterKeywordが変更されたときだけ再計算
  const filteredEsxtopData = useMemo(() => {
    if (!filterKeyword) {
      return esxtopData;
    }
    // Return a new EsxtopData array with filtered trees
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

    // State更新をまとめて行う
    setEsxtopData([]);
    setFileStatus("neutral");
    setLoading(true);

    const sessionStart = performance.now();
    const startedAt = new Date().toISOString();

    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const fileStart = performance.now();
          const steps: FileLoadStepMetric[] = [];
          let headerProgressEvents = 0;
          let fieldTreeProgressEvents = 0;
          let trimProgressEvents = 0;
          let parseProgressEvents = 0;
          let fields: string[] = [];
          let rowCount = 0;

          try {
            let stepStart = performance.now();
            fields = await readCsvHeaderV2(file, (bytesRead) => {
              headerProgressEvents += 1;
              setLoadingMessage(
                `Loading header from ${file.name}: ${bytesRead} bytes`,
              );
            });
            steps.push({
              label: "read header",
              durationMs: performance.now() - stepStart,
              progressEvents: headerProgressEvents,
              extra: { fields: fields.length },
            });

            stepStart = performance.now();
            const fieldTree = await computeEsxtopFieldTreeV2(fields, (progress) => {
              fieldTreeProgressEvents += 1;
              setLoadingMessage(
                `Computing field tree from ${file.name}: ${Math.trunc(progress)}%`,
              );
            });
            steps.push({
              label: "build field tree",
              durationMs: performance.now() - stepStart,
              progressEvents: fieldTreeProgressEvents,
              extra: { fields: fields.length },
            });

            stepStart = performance.now();
            const trimmedFile = await removeFirstLineFromCSV(file, (progress) => {
              trimProgressEvents += 1;
              setLoadingMessage(
                `Trimming header from ${file.name}: ${Math.trunc(progress)}%`,
              );
            });
            steps.push({
              label: "trim header line",
              durationMs: performance.now() - stepStart,
              progressEvents: trimProgressEvents,
              extra: { outputSize: trimmedFile.size },
            });

            stepStart = performance.now();
            const csvData = await parseCSVv3(trimmedFile, false, (progress) => {
              parseProgressEvents += 1;
              setLoadingMessage(
                `Parsing data from ${file.name}: ${Math.trunc(progress)}%`,
              );
            });
            rowCount = csvData.data.length;
            steps.push({
              label: "parse csv",
              durationMs: performance.now() - stepStart,
              progressEvents: parseProgressEvents,
              extra: { rows: rowCount },
            });

            const fileMetric: FileLoadMetric = {
              fileName: file.name,
              fileSize: file.size,
              totalDurationMs: performance.now() - fileStart,
              steps,
              metricFieldCount: fields.length,
              metricRowCount: rowCount,
              status: "success",
            };

            return {
              fileName: file.name,
              metricField: fields,
              metricFieldTree: fieldTree,
              metricData: csvData.data as Datum[][],
              __perfMetric: fileMetric,
            };
          } catch (error) {
            const errorMetric: FileLoadMetric = {
              fileName: file.name,
              fileSize: file.size,
              totalDurationMs: performance.now() - fileStart,
              steps,
              metricFieldCount: fields.length,
              metricRowCount: rowCount,
              status: "error",
              errorMessage:
                error instanceof Error ? error.message : "Unknown error",
            };
            (error as Error & { __perfMetric?: FileLoadMetric }).__perfMetric =
              errorMetric;
            throw error;
          }
        }),
      );
      // 成功時に一度だけStateを更新
      setEsxtopData(
        results.map(({ __perfMetric: _perfMetric, ...data }) => data),
      );
      setFileStatus("success");
      logPerfSessionToConsole({
        startedAt,
        totalDurationMs: performance.now() - sessionStart,
        files: results.map((result) => result.__perfMetric),
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
