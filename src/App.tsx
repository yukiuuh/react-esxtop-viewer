import "@cds/city/css/bundles/default.min.css"; // load base font
import { ControlStatus } from "@cds/core/forms";
import "@cds/core/global.css"; // pre-minified version breaks
import "@cds/core/icon/register.js";
import "@cds/core/internal-components/split-handle/register.js";
import "@cds/core/styles/theme.dark.css"; // pre-minified version breaks
import { CdsDivider } from "@cds/react/divider";
import { Datum } from "plotly.js";
import { useRef, useState } from "react";
import "./App.css";
import { computeEsxtopFieldTree } from "./esxtop";
import FileLoader from "./FileLoader";
import Header from "./Header";
import LoadingOverlay from "./LoadingOverlay";
import MultiFileMetricBrowser from "./MultiFileMetricBrowser";
import PerformanceChart, { PerformanceChartHandle } from "./PerformanceChart";
import SplitPane from "./SplitPane";
import { filterTree, TreeNode } from "./TreeNode";
import { parseCSVv3, readCsvHeaderV2, removeFirstLineFromCSV } from "./utils";
import { CdsButton } from "@cds/react/button";

const App: React.FC = () => {
  const [selectedEsxtopDataIndex, setSelectedEsxtopDataIndex] = useState(0);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileStatus, setFileStatus] = useState<ControlStatus>("neutral");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [splitPosition, setSplitPosition] = useState(20);
  const [metricFields, setMetricFields] = useState<string[][]>([]);
  const [metricFieldTrees, setMetricFieldTrees] = useState<TreeNode[]>([]);
  const [loadingMessage, setLoadingMessage] = useState("")

  const metricField = metricFields[selectedEsxtopDataIndex] || [];
  const [metricData, setMetricData] = useState<Datum[][][]>([]);
  const performanceChartRef = useRef<PerformanceChartHandle>(null);
  const handleExportToImage = () => {
    performanceChartRef.current?.exportToImage();
  };

  return (
    <div className="main-container">
      <Header
        onFilterKeywordChange={(s) => {
          setFilterKeyword(s);
        }}
      />
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
                    metricNodes={
                      filterKeyword
                        ? metricFieldTrees.map((t) => {
                          const r = filterTree(t, filterKeyword);
                          return r.children.length > 0
                            ? r
                            : {
                              id: t.id,
                              field_index: t.field_index,
                              children: [],
                              path: "",
                            };
                        })
                        : metricFieldTrees
                    }
                    onSelectedChange={(node, dataIndex) => {
                      console.debug("selected", node);
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
                  metricData={metricData[selectedEsxtopDataIndex] || []}
                  metricField={metricField}
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
                onChangeFiles={(f) => {
                  setFileStatus("neutral");
                  setMetricFields([]);
                  setMetricFieldTrees([]);
                  setMetricData([]);
                  if (f.length > 0) {
                    setLoading(true);
                    Promise.all(
                      f.map(async (file) => {
                        try {
                          const fields = await readCsvHeaderV2(
                            file,
                            (bytesRead) => {
                              const msg = `file ${file.name} header loading progress: ${bytesRead} bytes`
                              console.debug(msg)
                              setLoadingMessage(msg)
                            },
                          );
                          const msg = `computing field tree from ${file.name}`
                          console.debug(msg);
                          setLoadingMessage(msg)
                          const fieldTree = computeEsxtopFieldTree(fields);
                          const trimmedFile = await removeFirstLineFromCSV(
                            file,
                            (progress) => {
                              const msg = `file ${file.name} trim header line progress: ${Math.trunc(progress)}%`
                              console.debug(msg)
                              setLoadingMessage(msg)
                            },
                          );
                          const csvData = await parseCSVv3(
                            trimmedFile,
                            false,
                            (progress) => {
                              const msg = `file ${file.name} loading progress: ${Math.trunc(progress)}%`
                              console.debug(msg)
                              setLoadingMessage(msg)
                            },
                          );
                          return {
                            fileName: file.name,
                            metricField: fields,
                            metricFieldTree: fieldTree,
                            metricData: csvData.data as Datum[][],
                          };
                        } catch (e) {
                          console.error(
                            `Error processing file ${file.name}:`,
                            e,
                          );
                          throw e;
                        }
                      }),
                    )
                      .then((res) => {
                        setMetricFields(res.map((r) => r.metricField));
                        setMetricFieldTrees(res.map((r) => r.metricFieldTree));
                        setMetricData(res.map((r) => r.metricData));
                        setFileStatus("success");
                        setLoading(false);
                      })
                      .catch((e) => {
                        console.error("file loading failed", e);
                        setFileStatus("error");
                      });
                  }
                }}
              />
              <CdsButton
                cds-layout="align:right"
                action="outline"
                size="sm"
                disabled={!selectedNode}
                onClick={() => {
                  handleExportToImage();
                }}
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
