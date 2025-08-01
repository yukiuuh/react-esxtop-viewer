self.onmessage = async (e) => {
    const { file, skipFirstRow } = e.data;
    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    let buffer = ""; const rows = [];
    let firstLineSkipped = !skipFirstRow;
    let loaded = 0;
    const total = file.size;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
            loaded += value.length;
            if (total > 0) {
                self.postMessage({ type: 'progress', data: (loaded / total) * 100.0 });
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
            rows.push(line.replace(/\r$/, "").split(",").map((str) => {
                let unquoted;
                try {
                    unquoted = str.slice(1, -1);
                } catch {
                    console.error(`failed to unquote ${str} in ${line}`);
                    unquoted = "";
                }
                return unquoted;
            }));
        }
    }
    if (buffer.length > 0 && firstLineSkipped) {
        rows.push(buffer.replace(/\r$/, "").split(",").map((str) => {
            let unquoted;
            try {
                unquoted = str.slice(1, -1);
            } catch {
                unquoted = "";
            }
            return unquoted;
        }));
    }
    self.postMessage({
        type: 'done', data: { data: rows }
    });
    self.close();
};