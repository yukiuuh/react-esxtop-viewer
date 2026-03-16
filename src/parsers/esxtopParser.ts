import { Datum } from "plotly.js";
import { computeEsxtopFieldTreeV2 } from "../esxtop";
import { LoadProgressEvent } from "../services/loadProgress";
import { parseCSVv3, readCsvHeaderV2, removeFirstLineFromCSV } from "../utils";
import { FileParser, ParsedMetricData } from "./types";

export const esxtopParser: FileParser = {
  format: "esxtop",

  canParse(file) {
    return file.name.toLowerCase().endsWith(".csv");
  },

  async parse(file, onProgress): Promise<ParsedMetricData> {
    const emit = (event: LoadProgressEvent) => onProgress?.(event);

    emit({
      fileName: file.name,
      stage: "read-header",
      message: `Loading header from ${file.name}`,
    });
    const fields = await readCsvHeaderV2(file, (bytesRead) => {
      emit({
        fileName: file.name,
        stage: "read-header",
        message: `Loading header from ${file.name}`,
        bytesRead,
      });
    });

    emit({
      fileName: file.name,
      stage: "build-tree",
      message: `Computing field tree from ${file.name}`,
    });
    const fieldTree = await computeEsxtopFieldTreeV2(fields, (progress) => {
      emit({
        fileName: file.name,
        stage: "build-tree",
        message: `Computing field tree from ${file.name}`,
        percent: progress,
      });
    });

    emit({
      fileName: file.name,
      stage: "trim-header",
      message: `Trimming header from ${file.name}`,
    });
    const trimmedFile = await removeFirstLineFromCSV(file, (progress) => {
      emit({
        fileName: file.name,
        stage: "trim-header",
        message: `Trimming header from ${file.name}`,
        percent: progress,
      });
    });

    emit({
      fileName: file.name,
      stage: "parse-data",
      message: `Parsing data from ${file.name}`,
    });
    const csvData = await parseCSVv3(trimmedFile, false, (progress) => {
      emit({
        fileName: file.name,
        stage: "parse-data",
        message: `Parsing data from ${file.name}`,
        percent: progress,
      });
    });

    return {
      fields,
      fieldTree,
      rows: csvData.data as Datum[][],
    };
  },
};
