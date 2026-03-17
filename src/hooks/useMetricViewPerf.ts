import { useRef } from "react";
import {
  MetricViewMetric,
  logMetricViewPerfToConsole,
} from "../devPerf";

type PendingMetricView = {
  token: number;
  startedAtMs: number;
  fileName: string;
  nodePath: string;
  fieldIndex: number;
};

export const useMetricViewPerf = () => {
  const pendingMetricViewRef = useRef<PendingMetricView | null>(null);
  const metricViewMetricsRef = useRef<MetricViewMetric[]>([]);

  return {
    reset() {
      pendingMetricViewRef.current = null;
      metricViewMetricsRef.current = [];
    },
    beginMeasurement(metricView: PendingMetricView) {
      pendingMetricViewRef.current = metricView;
    },
    completeMeasurement(stats: {
      token: number;
      seriesCount: number;
      pointCount: number;
    }) {
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
    },
  };
};
