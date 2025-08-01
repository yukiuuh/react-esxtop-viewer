import "@cds/city/css/bundles/default.min.css"; // load base font
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
    [esxtopData, selectedEsxtopDataIndex]
  );
  const currentMetricData = useMemo(
    () => esxtopData[selectedEsxtopDataIndex]?.metricData || [],
    [esxtopData, selectedEsxtopDataIndex]
  );

  // 3. フィルタリングされたツリーのメモ化：esxtopDataかfilterKeywordが変更されたときだけ再計算
  const filteredMetricFieldTrees = useMemo(() => {
    if (!filterKeyword) {
      return esxtopData.map((d) => d.metricFieldTree);
    }
    return esxtopData.map((d) => {
      const filtered = filterTree(d.metricFieldTree, filterKeyword);
      return filtered.children.length > 0
        ? filtered
        : { id: d.metricFieldTree.id, field_index: -1, children: [], path: "" };
    });
  }, [esxtopData, filterKeyword]);

  const handleExportToImage = () => {
    performanceChartRef.current?.exportToImage();
  };

  const handleFileChange = async (files: File[]) => {
    if (files.length === 0) return;

    // State更新をまとめて行う
    setEsxtopData([]);
    setFileStatus("neutral");
    setLoading(true);

    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const fields = await readCsvHeaderV2(file, (bytesRead) => {
            setLoadingMessage(`Loading header from ${file.name}: ${bytesRead} bytes`);
          });

          const fieldTree = await computeEsxtopFieldTreeV2(fields, (progress) => {
            setLoadingMessage(`Computing field tree from ${file.name}: ${Math.trunc(progress)}%`);
          });

          const trimmedFile = await removeFirstLineFromCSV(file, (progress) => {
            setLoadingMessage(`Trimming header from ${file.name}: ${Math.trunc(progress)}%`);
          });

          const csvData = await parseCSVv3(trimmedFile, false, (progress) => {
            setLoadingMessage(`Parsing data from ${file.name}: ${Math.trunc(progress)}%`);
          });

          return {
            fileName: file.name,
            metricField: fields,
            metricFieldTree: fieldTree,
            metricData: csvData.data as Datum[][],
          };
        })
      );
      // 成功時に一度だけStateを更新
      setEsxtopData(results);
      setFileStatus("success");
    } catch (e) {
      console.error("File processing failed:", e);
      setFileStatus("error");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  return (
    <div className="main-container">
      <Header onFilterKeywordChange={setFilterKeyword} />
      <div cds-layout="horizontal align:stretch" style={{ height: "100%" }}>
        <div cds-layout="vertical align:stretch" style={{ height: "100%" }}>
          <div cds-layout="horizontal align:stretch gap:md wrap:none">
            <SplitPane initPosition={20} onPositionChanged={setSplitPosition}>
              <div
                style={{
                  overflowY: "scroll",
                  overflowX: "clip",
                  position: "relative",
                  height: "100%",
                }}
              >
                <div
                  cds-layout="horizontal"
                  style={{
                    overflow: "clip",
                    width: "90vw",
                  }}
                >
                  <MultiFileMetricBrowser
                    loading={loading}
                    metricNodes={filteredMetricFieldTrees}
                    onSelectedChange={(node, dataIndex) => {
                      setSelectedNode(node);
                      setSelectedEsxtopDataIndex(dataIndex);
                    }}
                  />
                </div>
              </div>
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