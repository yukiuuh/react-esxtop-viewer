import "@cds/city/css/bundles/default.min.css"; // load base font
import { ControlStatus } from "@cds/core/forms";
import "@cds/core/global.css"; // pre-minified version breaks
import "@cds/core/icon/register.js";
import "@cds/core/internal-components/split-handle/register.js";
import "@cds/core/styles/theme.dark.css"; // pre-minified version breaks
import { CdsDivider } from "@cds/react/divider";
import { Datum } from "plotly.js";
import { useState } from "react";
import "./App.css";
import { computeEsxtopFieldTree, EsxtopData } from "./esxtop";
import FileLoader from "./FileLoader";
import Header from "./Header";
import LoadingOverlay from "./LoadingOverlay";
import MultiFileMetricBrowser from "./MultiFileMetricBrowser";
import PerformanceChart from "./PerformanceChart";
import SplitPane from "./SplitPane";
import { filterTree, TreeNode } from "./TreeNode";
import { parseCSV } from "./utils";

const App: React.FC = () => {
  const [esxtopData, setEsxtopData] = useState<EsxtopData[]>([]);
  const [selectedEsxtopDataIndex, setSelectedEsxtopDataIndex] = useState(0);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileStatus, setFileStatus] = useState<ControlStatus>("neutral");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [splitPosition, setSplitPosition] = useState(20);
  const metricField = esxtopData[selectedEsxtopDataIndex]?.metricField || [];
  const metricData = esxtopData[selectedEsxtopDataIndex]?.metricData || [];

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
                    overflow: "hidden",
                    width: "100vh",
                  }}
                >
                  <MultiFileMetricBrowser
                    loading={loading}
                    metricNodes={
                      filterKeyword
                        ? esxtopData.map((d) => {
                            const r = filterTree(
                              d.metricFieldTree,
                              filterKeyword,
                            );
                            return r.children.length > 0
                              ? r
                              : {
                                  id: d.metricFieldTree.id,
                                  field_index: d.metricFieldTree.field_index,
                                  children: [],
                                };
                          })
                        : esxtopData.map((d) => d.metricFieldTree)
                    }
                    onSelectedChange={(node, dataIndex) => {
                      console.debug(node);
                      setSelectedNode(node);
                      setSelectedEsxtopDataIndex(dataIndex);
                    }}
                  />
                </div>
              </div>
              {selectedNode ? (
                <PerformanceChart
                  splitPosition={splitPosition}
                  node={selectedNode}
                  metricData={metricData}
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
            <FileLoader
              status={fileStatus}
              loading={loading}
              onChangeFiles={(f) => {
                setFileStatus("neutral");
                if (f.length == 0) {
                  setEsxtopData([]);
                } else {
                  setLoading(true);
                  Promise.all(
                    f.map(async (file) => {
                      return new Promise<EsxtopData>((resolve, reject) => {
                        parseCSV(file)
                          .then((r) => {
                            const field = (r.data[0] as string[]) || [];
                            const metricData =
                              (r.data.slice(1) as Datum[][]) || [];
                            const fieldTree = computeEsxtopFieldTree(field);
                            resolve({
                              fileName: file.name,
                              metricField: field,
                              metricFieldTree: fieldTree,
                              metricData: metricData,
                            });
                          })
                          .catch(reject);
                      });
                    }),
                  )
                    .then((e) => {
                      setEsxtopData([...e]);
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
          </div>
        </div>
      </div>
      <LoadingOverlay loading={loading} />
    </div>
  );
};

export default App;
