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
      rows.push(line.replace(/\r$/, "").split(","));
    }
  }
  if (buffer.length > 0 && firstLineSkipped) {
    rows.push(buffer.replace(/\r$/, "").split(","));
  }
  return { data: rows };
};

const analysisFields = (fields: string[]) => {
  const ignoreFieldNum = 1;

  const root: TreeNode = {
    id: "root",
    field_index: -1,
    children: [],
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
        };
        currentNode.children = currentNode.children || [];
        currentNode.children.push(childNode);
      }

      currentNode = childNode;
    });
  });
  return root;
};

const isTauri = () => {
  return (
    typeof window !== "undefined" && typeof window.__TAURI__ !== "undefined"
  );
};

export { analysisFields, isTauri };
