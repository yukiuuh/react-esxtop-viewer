import { parseCsvHeaderLine } from "./csvFormat";
import { computeEsxtopFieldTree } from "./esxtopTree";

type WorkerRequest = {
  file: File;
};

const emitProgress = (data: unknown) => {
  self.postMessage({ type: "progress", data });
};

const parseCsvRow = (line: string): string[] =>
  line
    .replace(/\r$/, "")
    .split(",")
    .map((value) => {
      try {
        return value.slice(1, -1);
      } catch {
        return "";
      }
    });

const readCsvHeader = async (
  file: File,
  onRead?: (bytesRead: number) => void,
): Promise<string[]> => {
  const reader = file.stream().getReader();
  const decoder = new TextDecoder();
  let header = "";
  let done = false;
  let loaded = 0;

  while (!done) {
    const { done: isDone, value } = await reader.read();
    done = isDone;

    if (done) {
      break;
    }

    if (value) {
      loaded += value.length;
      onRead?.(loaded);

      const chunk = decoder.decode(value, { stream: true });
      const newlineIndex = chunk.indexOf("\n");

      if (newlineIndex !== -1) {
        header += chunk.slice(0, newlineIndex);
        reader.cancel();
        break;
      }

      header += chunk;
    }
  }

  if (!header) {
    throw new Error("Empty CSV file");
  }

  return parseCsvHeaderLine(header);
};

const parseCsvRows = async (
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string[][]> => {
  const reader = file.stream().getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const rows: string[][] = [];
  let firstLineSkipped = false;
  let loaded = 0;
  const total = file.size;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      loaded += value.length;
      if (total > 0) {
        onProgress?.((loaded / total) * 100.0);
      }
      buffer += decoder.decode(value, { stream: true });
    }

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!firstLineSkipped) {
        firstLineSkipped = true;
        continue;
      }

      rows.push(parseCsvRow(line));
    }
  }

  if (buffer.length > 0 && firstLineSkipped) {
    rows.push(parseCsvRow(buffer));
  }

  return rows;
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    const { file } = event.data;

    emitProgress({
      fileName: file.name,
      stage: "read-header",
      message: `Loading header from ${file.name}`,
      bytesRead: 0,
      totalBytes: file.size,
    });
    const fields = await readCsvHeader(file, (bytesRead) => {
      emitProgress({
        fileName: file.name,
        stage: "read-header",
        message: `Loading header from ${file.name}`,
        bytesRead,
        totalBytes: file.size,
      });
    });

    emitProgress({
      fileName: file.name,
      stage: "build-tree",
      message: `Computing field tree from ${file.name}`,
      percent: 0,
    });
    const fieldTree = computeEsxtopFieldTree(fields, (percent) => {
      emitProgress({
        fileName: file.name,
        stage: "build-tree",
        message: `Computing field tree from ${file.name}`,
        percent,
      });
    });

    emitProgress({
      fileName: file.name,
      stage: "trim-header",
      message: `Preparing data parse from ${file.name}`,
    });
    emitProgress({
      fileName: file.name,
      stage: "parse-data",
      message: `Parsing data from ${file.name}`,
      percent: 0,
    });
    const rows = await parseCsvRows(file, (percent) => {
      emitProgress({
        fileName: file.name,
        stage: "parse-data",
        message: `Parsing data from ${file.name}`,
        percent,
      });
    });

    self.postMessage({
      type: "done",
      data: { fields, fieldTree, rows },
    });
    self.close();
  } catch (error) {
    self.postMessage({
      type: "error",
      data: error instanceof Error ? error.message : "Unknown error",
    });
    self.close();
  }
};
