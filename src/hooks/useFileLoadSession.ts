import { Dispatch } from "react";
import {
  FileLoadMetric,
  logMemorySnapshotToConsole,
  logPerfSessionToConsole,
} from "../devPerf";
import { Dataset } from "../models/dataset";
import { formatLoadProgress } from "../services/loadProgress";
import { loadFiles } from "../services/fileLoadService";

type FileLoadAction =
  | { type: "set-loading-message"; loadingMessage: string }
  | { type: "start-loading" }
  | { type: "load-succeeded"; datasets: Dataset[] }
  | { type: "load-failed" }
  | { type: "clear-files" };

export const useFileLoadSession = (
  dispatch: Dispatch<FileLoadAction>,
  resetMetricViewPerf: () => void,
) => {
  return async (files: File[]) => {
    if (files.length === 0) {
      resetMetricViewPerf();
      dispatch({ type: "clear-files" });
      logMemorySnapshotToConsole("[dev-perf] after clear files");
      return;
    }

    logMemorySnapshotToConsole("[dev-perf] before clearing current dataset");
    resetMetricViewPerf();
    dispatch({ type: "start-loading" });

    const sessionStart = performance.now();
    const startedAt = new Date().toISOString();

    try {
      const result = await loadFiles(files, {
        onProgress(event) {
          dispatch({
            type: "set-loading-message",
            loadingMessage: formatLoadProgress(event),
          });
        },
      });
      dispatch({ type: "load-succeeded", datasets: result.datasets });
      logPerfSessionToConsole({
        startedAt,
        totalDurationMs: performance.now() - sessionStart,
        files: result.metrics,
      });
      logMemorySnapshotToConsole("[dev-perf] after load");
    } catch (error) {
      console.error("File processing failed:", error);
      dispatch({ type: "load-failed" });
      const failedMetric = (error as Error & { __perfMetric?: FileLoadMetric })
        .__perfMetric;
      if (failedMetric) {
        logPerfSessionToConsole({
          startedAt,
          totalDurationMs: performance.now() - sessionStart,
          files: [failedMetric],
        });
      }
    }
  };
};
