import { TreeNode } from "./TreeNode";
import { computeEsxtopFieldTree } from "./parsers/esxtopTree";

export const computeEsxtopFieldTreeV2 = (
  fields: string[],
  onProgress?: (percent: number) => void,
): Promise<TreeNode> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./fieldTree.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (e) => {
      if (e.data.type === "progress") {
        if (onProgress) {
          onProgress(e.data.data);
        }
      } else if (e.data.type === "done") {
        resolve(e.data.data);
        worker.terminate();
      }
    };

    worker.onerror = (e) => {
      reject(e);
      worker.terminate();
    };

    worker.postMessage({ fields });
  });
};

export { computeEsxtopFieldTree };
