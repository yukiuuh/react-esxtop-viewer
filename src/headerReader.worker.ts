self.onmessage = async (e) => {
  const { file } = e.data;
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
      self.postMessage({ type: "progress", data: loaded });
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
    self.postMessage({ type: "error", data: "Empty CSV file" });
    self.close();
    return;
  }
  const headerFields = header
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
  self.postMessage({ type: "done", data: headerFields });
  self.close();
};
