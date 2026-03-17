import { ControlStatus } from "@cds/core/forms";
import "@cds/core/global.css"; // pre-minified version breaks
import "@cds/core/icon/register.js";
import "@cds/core/internal-components/split-handle/register.js";
import "@cds/core/styles/theme.dark.css"; // pre-minified version breaks
import { CdsButton } from "@cds/react/button";
import { CdsDivider } from "@cds/react/divider";
import React, { useMemo, useReducer, useRef } from "react";
import "./App.css";
import FileLoader from "./FileLoader";
import Header from "./Header";
import { useFileLoadSession } from "./hooks/useFileLoadSession";
import { useMetricViewPerf } from "./hooks/useMetricViewPerf";
import LoadingOverlay from "./LoadingOverlay";
import MultiFileMetricBrowser from "./MultiFileMetricBrowser";
import { Dataset } from "./models/dataset";
import PerformanceChart, { PerformanceChartHandle } from "./PerformanceChart";
import {
  getDatasetMetricColumns,
  getDatasetMetricFields,
} from "./services/fileLoadService";
import SplitPane from "./SplitPane";
import { filterTree, TreeNode } from "./TreeNode";

type AppState = {
  datasets: Dataset[];
  selectedDatasetIndex: number;
  selectedNode: TreeNode | null;
  loading: boolean;
  fileStatus: ControlStatus;
  filterKeyword: string;
  splitPosition: number;
  loadingMessage: string;
  renderMeasurementToken: number;
};

type AppAction =
  | { type: "set-filter-keyword"; filterKeyword: string }
  | { type: "set-split-position"; splitPosition: number }
  | { type: "set-loading-message"; loadingMessage: string }
  | { type: "start-loading" }
  | { type: "load-succeeded"; datasets: Dataset[] }
  | { type: "load-failed" }
  | { type: "clear-files" }
  | {
      type: "select-node";
      node: TreeNode;
      selectedDatasetIndex: number;
      renderMeasurementToken: number;
    };

const initialState: AppState = {
  datasets: [],
  selectedDatasetIndex: 0,
  selectedNode: null,
  loading: false,
  fileStatus: "neutral",
  filterKeyword: "",
  splitPosition: 20,
  loadingMessage: "",
  renderMeasurementToken: 0,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "set-filter-keyword":
      return { ...state, filterKeyword: action.filterKeyword };
    case "set-split-position":
      return { ...state, splitPosition: action.splitPosition };
    case "set-loading-message":
      return { ...state, loadingMessage: action.loadingMessage };
    case "start-loading":
      return {
        ...state,
        datasets: [],
        selectedDatasetIndex: 0,
        selectedNode: null,
        loading: true,
        fileStatus: "neutral",
        loadingMessage: "",
      };
    case "load-succeeded":
      return {
        ...state,
        datasets: action.datasets,
        loading: false,
        fileStatus: "success",
        loadingMessage: "",
      };
    case "load-failed":
      return {
        ...state,
        loading: false,
        fileStatus: "error",
        loadingMessage: "",
      };
    case "clear-files":
      return {
        ...state,
        datasets: [],
        selectedDatasetIndex: 0,
        selectedNode: null,
        loading: false,
        fileStatus: "neutral",
        loadingMessage: "",
      };
    case "select-node":
      return {
        ...state,
        selectedNode: action.node,
        selectedDatasetIndex: action.selectedDatasetIndex,
        renderMeasurementToken: action.renderMeasurementToken,
      };
    default:
      return state;
  }
};

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const performanceChartRef = useRef<PerformanceChartHandle>(null);
  const metricViewPerf = useMetricViewPerf();
  const handleFileChange = useFileLoadSession(dispatch, metricViewPerf.reset);

  const currentMetricField = useMemo(
    () => getDatasetMetricFields(state.datasets[state.selectedDatasetIndex]),
    [state.datasets, state.selectedDatasetIndex],
  );
  const currentMetricColumns = useMemo(
    () => getDatasetMetricColumns(state.datasets[state.selectedDatasetIndex]),
    [state.datasets, state.selectedDatasetIndex],
  );

  const filteredDatasets = useMemo(() => {
    if (!state.filterKeyword) {
      return state.datasets;
    }
    return state.datasets.map((dataset) => ({
      ...dataset,
      metricFieldTree: filterTree(dataset.metricFieldTree, state.filterKeyword),
    }));
  }, [state.datasets, state.filterKeyword]);
  const browserResetKey = useMemo(
    () => state.datasets.map((dataset) => dataset.fileName).join("|"),
    [state.datasets],
  );

  const handleExportToImage = () => {
    performanceChartRef.current?.exportToImage();
  };

  const handleMetricViewRendered = (stats: {
    token: number;
    seriesCount: number;
    pointCount: number;
  }) => {
    metricViewPerf.completeMeasurement(stats);
  };

  return (
    <div className="main-container">
      <Header
        onFilterKeywordChange={(filterKeyword) =>
          dispatch({ type: "set-filter-keyword", filterKeyword })
        }
        appVersion={import.meta.env.VITE_APP_VERSION}
      />
      <div cds-layout="horizontal align:stretch" style={{ height: "100%" }}>
        <div cds-layout="vertical align:stretch" style={{ height: "100%" }}>
          <div cds-layout="horizontal align:stretch gap:md wrap:none">
            <SplitPane
              initPosition={20}
              onPositionChanged={(splitPosition) =>
                dispatch({ type: "set-split-position", splitPosition })
              }
            >
              <MultiFileMetricBrowser
                loading={state.loading}
                datasets={filteredDatasets}
                resetKey={browserResetKey}
                onSelectedChange={(node, dataIndex) => {
                  const nextToken = state.renderMeasurementToken + 1;
                  const dataset = state.datasets[dataIndex];
                  metricViewPerf.beginMeasurement({
                    token: nextToken,
                    startedAtMs: performance.now(),
                    fileName: dataset?.fileName ?? `dataset-${dataIndex}`,
                    nodePath: node.path,
                    fieldIndex: node.field_index,
                  });
                  dispatch({
                    type: "select-node",
                    node,
                    selectedDatasetIndex: dataIndex,
                    renderMeasurementToken: nextToken,
                  });
                }}
              />
              {state.selectedNode ? (
                <PerformanceChart
                  key={`${state.datasets[state.selectedDatasetIndex]?.fileName ?? "none"}:${state.selectedNode.path}`}
                  ref={performanceChartRef}
                  splitPosition={state.splitPosition}
                  node={state.selectedNode}
                  metricColumns={currentMetricColumns}
                  metricField={currentMetricField}
                  renderMeasurementToken={state.renderMeasurementToken}
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
              <FileLoader
                status={state.fileStatus}
                loading={state.loading}
                onChangeFiles={handleFileChange}
              />
              <CdsButton
                cds-layout="align:right"
                action="outline"
                size="sm"
                disabled={!state.selectedNode}
                onClick={handleExportToImage}
              >
                EXPORT
              </CdsButton>
            </div>
          </div>
        </div>
      </div>
      <LoadingOverlay message={state.loadingMessage} loading={state.loading} />
    </div>
  );
};

export default App;
