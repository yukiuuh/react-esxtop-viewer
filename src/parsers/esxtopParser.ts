import { Datum } from "plotly.js";
import { LoadProgressEvent } from "../services/loadProgress";
import { FileParser, ParsedMetricData } from "./types";

export const esxtopParser: FileParser = {
  format: "esxtop",

  canParse(file) {
    return file.name.toLowerCase().endsWith(".csv");
  },

  async parse(file, onProgress): Promise<ParsedMetricData> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL("./esxtopParser.worker.ts", import.meta.url),
        {
          type: "module",
        },
      );

      worker.onmessage = (event) => {
        if (event.data.type === "progress") {
          onProgress?.(event.data.data as LoadProgressEvent);
          return;
        }

        if (event.data.type === "done") {
          worker.terminate();
          resolve({
            fields: event.data.data.fields,
            fieldTree: event.data.data.fieldTree,
            rows: event.data.data.rows as Datum[][],
          });
          return;
        }

        if (event.data.type === "error") {
          worker.terminate();
          reject(new Error(event.data.data));
        }
      };

      worker.onerror = (event) => {
        worker.terminate();
        reject(event instanceof ErrorEvent ? event.error : event);
      };

      worker.postMessage({ file });
    });
  },
};
