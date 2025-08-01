self.onmessage = async (e) => {
  const { file, skipFirstRow } = e.data;
  const reader = file.stream().getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let rows: string[][] = []; // This will now be a batch
  const batchSize = 1000; // Send data in chunks of 1000 rows
  let firstLineSkipped = !skipFirstRow;
  let loaded = 0;
  const total = file.size;

  const processLine = (line: string) => {
    if (!firstLineSkipped) {
      firstLineSkipped = true;
      return;
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

    if (rows.length >= batchSize) {
      self.postMessage({ type: "chunk", data: rows });
      rows = []; // Reset the batch
    }
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      loaded += value.length;
      if (total > 0) {
        self.postMessage({ type: "progress", data: (loaded / total) * 100.0 });
      }
      buffer += decoder.decode(value, { stream: true });
    }
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      processLine(line);
    }
  }

  if (buffer.length > 0) {
    processLine(buffer);
  }

  // Send any remaining rows
  if (rows.length > 0) {
    self.postMessage({ type: "chunk", data: rows });
  }

  self.postMessage({ type: "done" }); // Signal completion
  self.close();
};
