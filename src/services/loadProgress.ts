export type LoadStage =
  | "detect"
  | "read-header"
  | "build-tree"
  | "trim-header"
  | "parse-data";

export interface LoadProgressEvent {
  fileName: string;
  stage: LoadStage;
  message: string;
  percent?: number;
  bytesRead?: number;
}

export const formatLoadProgress = (event: LoadProgressEvent): string => {
  if (event.bytesRead !== undefined) {
    return `${event.message}: ${event.bytesRead} bytes`;
  }

  if (event.percent !== undefined) {
    return `${event.message}: ${Math.trunc(event.percent)}%`;
  }

  return event.message;
};
