export type LoadStage = "detect" | "read-header" | "build-tree" | "trim-header" | "parse-data";

export interface LoadProgressEvent {
  fileName: string;
  stage: LoadStage;
  message: string;
  percent?: number;
  bytesRead?: number;
  totalBytes?: number;
}

export const formatLoadProgress = (event: LoadProgressEvent): string => {
  if (event.bytesRead !== undefined) {
    if (event.totalBytes !== undefined && event.totalBytes > 0) {
      const percent = Math.trunc((event.bytesRead / event.totalBytes) * 100);
      return `${event.message}: ${event.bytesRead} / ${event.totalBytes} bytes (${percent}%)`;
    }

    return `${event.message}: ${event.bytesRead} bytes`;
  }

  if (event.percent !== undefined) {
    return `${event.message}: ${Math.trunc(event.percent)}%`;
  }

  return event.message;
};
