import { Datum } from "plotly.js";
import { computeEsxtopFieldTreeV2 } from "../esxtop";
import { parseCSVv3, readCsvHeaderV2, removeFirstLineFromCSV } from "../utils";
import { FileParser, ParsedMetricData } from "./types";

export const esxtopParser: FileParser = {
  format: "esxtop",

  canParse(file) {
    return file.name.toLowerCase().endsWith(".csv");
  },

  async parse(file, onProgress): Promise<ParsedMetricData> {
    onProgress?.(`Loading header from ${file.name}`);
    const fields = await readCsvHeaderV2(file, (bytesRead) => {
      onProgress?.(`Loading header from ${file.name}: ${bytesRead} bytes`);
    });

    onProgress?.(`Computing field tree from ${file.name}`);
    const fieldTree = await computeEsxtopFieldTreeV2(fields, (progress) => {
      onProgress?.(
        `Computing field tree from ${file.name}: ${Math.trunc(progress)}%`,
      );
    });

    onProgress?.(`Trimming header from ${file.name}`);
    const trimmedFile = await removeFirstLineFromCSV(file, (progress) => {
      onProgress?.(`Trimming header from ${file.name}: ${Math.trunc(progress)}%`);
    });

    onProgress?.(`Parsing data from ${file.name}`);
    const csvData = await parseCSVv3(trimmedFile, false, (progress) => {
      onProgress?.(`Parsing data from ${file.name}: ${Math.trunc(progress)}%`);
    });

    return {
      fields,
      fieldTree,
      rows: csvData.data as Datum[][],
    };
  },
};
