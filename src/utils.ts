import Papa, { ParseResult } from "papaparse";
import { TreeNode } from "./TreeNode";

const parseCSV = (file: File) => {
  return new Promise<ParseResult<unknown>>((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        resolve(results);
      },
      header: false,
      worker: true,
      dynamicTyping: true,
      error: () => {
        reject("error in parseCSV");
      },
    });
  });
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

export { parseCSV, analysisFields };
