import { computeEsxtopFieldTree } from "./parsers/esxtopTree";

self.onmessage = (e) => {
  const { fields } = e.data;
  const root = computeEsxtopFieldTree(fields, (percent) => {
    self.postMessage({
      type: "progress",
      data: percent,
    });
  });

  self.postMessage({ type: "done", data: root });
  self.close();
};
