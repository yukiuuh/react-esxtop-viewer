import { TreeNode } from "./TreeNode";

export const removeFirstLineFromCSV = (
  inputFile: File,
  onProgress?: (percent: number) => void,
): Promise<File> => {
  let firstLineSkipped = false;
  let buffer = "";
  let loaded = 0;
  const total = inputFile.size;

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      loaded += chunk.length;
      if (onProgress && total > 0) {
        onProgress((loaded / total) * 100.0);
      }
      const decoder = new TextDecoder();
      const chunkText = decoder.decode(chunk, { stream: true });
      buffer += chunkText;

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!firstLineSkipped) {
          firstLineSkipped = true;
          continue;
        }
        controller.enqueue(new TextEncoder().encode(line + "\n"));
      }
    },

    flush(controller) {
      if (buffer.length > 0 && firstLineSkipped) {
        controller.enqueue(new TextEncoder().encode(buffer));
      }
    },
  });

  const processedStream = inputFile.stream().pipeThrough(transformStream);

  return new Response(processedStream).blob().then((blob) => {
    const originalName = inputFile.name;
    const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, "");
    const extension = originalName.split(".").pop() || "";
    const newFileName = `${nameWithoutExtension}_processed.${extension}`;

    return new File([blob], newFileName, {
      type: inputFile.type || "text/csv",
      lastModified: Date.now(),
    });
  });
};

export const readCsvHeader = async (
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

    loaded += value?.length || 0;
    if (onRead) onRead(loaded);

    const chunk = decoder.decode(value, { stream: true });
    const newlineIndex = chunk.indexOf("\n");

    if (newlineIndex !== -1) {
      header += chunk.slice(0, newlineIndex);
      reader.cancel();
      break;
    }

    header += chunk;
  }

  if (!header) {
    throw new Error("Empty CSV file");
  }

  return header
    .split(",")
    .map((field) => {
      const f = field.trim().split('"')[1] || "";
      try {
        return decodeURI(f);
      } catch (e) {
        return f;
      }
    })
    .filter((field) => field.length > 0);
};

export const parseCSVv2 = async (
  file: File,
  skipFirstRow?: boolean,
  onProgress?: (percent: number) => void,
): Promise<{ data: string[][] }> => {
  const reader = file.stream().getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const rows: string[][] = [];
  let firstLineSkipped = !skipFirstRow;
  let loaded = 0;
  const total = file.size;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    loaded += value.length;
    if (onProgress && total > 0) {
      onProgress((loaded / total) * 100.0);
    }
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!firstLineSkipped) {
        firstLineSkipped = true;
        continue;
      }
      rows.push(
        line
          .replace(/\r$/, "")
          .split(",")
          .map((str) => {
            let unquoted;
            try {
              unquoted = str.slice(1, -1);
            } catch {
              console.error(`failed to unquote ${str} in ${line}`);
              unquoted = "";
            }
            return unquoted;
          }),
      );
    }
  }
  if (buffer.length > 0 && firstLineSkipped) {
    rows.push(buffer.replace(/\r$/, "").split(","));
  }
  return { data: rows };
};

export const parseCSVv3 = async (
  file: File,
  skipFirstRow?: boolean,
  onProgress?: (percent: number) => void,
): Promise<{ data: string[][] }> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./csvParser.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    const allRows: string[][] = [];

    worker.onmessage = (e) => {
      if (e.data.type === "progress") {
        if (onProgress) {
          onProgress(e.data.data);
        }
      } else if (e.data.type === "chunk") {
        allRows.push(...e.data.data);
      } else if (e.data.type === "done") {
        resolve({ data: allRows });
        worker.terminate();
      }
    };

    worker.onerror = (e) => {
      reject(e);
      worker.terminate();
    };

    worker.postMessage({ file, skipFirstRow });
  });
};

const analysisFields = (fields: string[]) => {
  const ignoreFieldNum = 1;

  const root: TreeNode = {
    id: "root",
    field_index: -1,
    children: [],
    path: "",
  };
  fields.forEach((field, field_index) => {
    if (field_index < ignoreFieldNum) return;
    const segments = field.split("\\").filter((segment) => segment.length > 0);
    let currentNode = root;
    segments.forEach((segment, segment_index) => {
      let childNode = currentNode.children?.find((node) => node.id === segment);

      if (!childNode) {
        childNode = {
          id: segment,
          field_index: segment_index + 1 == segments.length ? field_index : -1,
          children: [],
          path: "",
        };
        currentNode.children = currentNode.children || [];
        currentNode.children.push(childNode);
      }

      currentNode = childNode;
    });
  });
  return root;
};

export { analysisFields };

export const readCsvHeaderV2 = async (
  file: File,
  onRead?: (bytesRead: number) => void,
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./headerReader.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    worker.onmessage = (e) => {
      if (e.data.type === "progress") {
        if (onRead) {
          onRead(e.data.data);
        }
      } else if (e.data.type === "done") {
        resolve(e.data.data);
        worker.terminate();
      } else if (e.data.type === "error") {
        reject(new Error(e.data.data));
        worker.terminate();
      }
    };

    worker.onerror = (e) => {
      reject(e);
      worker.terminate();
    };

    worker.postMessage({ file });
  });
};
