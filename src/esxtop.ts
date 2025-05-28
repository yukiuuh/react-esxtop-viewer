import { Datum } from "plotly.js";
import { TreeNode } from "./TreeNode";

interface EsxtopData {
  fileName: string;
  metricFieldTree: TreeNode;
  metricField: string[];
  metricData: Datum[][];
}

const computeEsxtopFieldTree = (fields: string[]) => {
  const ignoreFieldNum = 1;

  const root: TreeNode = {
    id: "root",
    field_index: -1,
    children: [],
  };
  fields.forEach((field, field_index) => {
    if (!field) return;
    if (field_index < ignoreFieldNum) return;
    const segmentsByBackSlash = field
      .split("\\")
      .filter((segment) => segment.length > 0);
    const segmentsByFirstParensis = segmentsByBackSlash
      .map((seg) => {
        if (
          [
            "Average Packet Size",
            "Link Speed",
            "Memory Overcommit",
            "Cpu Load",
            "Effective Min",
          ].some((pattern) => seg.match(pattern))
        ) {
          return seg;
        } else {
          return splitAtFirstParensis(seg);
        }
      })
      .flat();

    const category = segmentsByFirstParensis[1];
    const segments = segmentsByFirstParensis
      .map((seg) => {
        if (category === "Vcpu") {
          return splitAtSecondColon(seg);
        } else if (
          [
            "Virtual Disk",
            "Network Port",
            "Interrupt Cookie",
            "Physical Disk",
          ].includes(category)
        ) {
          return splitAtFirstColon(seg);
        } else {
          return seg;
        }
      })
      .flat();

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

// test(aaa) -> test aaa
const splitAtFirstParensis = (str: string): string[] => {
  return str.split(/(?<=^[^(]+?)\(/).map((str) => str.replace(/(\)*)\)/, ""));
};

// 1234:sh.12345:12345:sh -> 1234:sh.12345 12345:sh
const splitAtSecondColon = (str: string): string[] => {
  const firstColonPosition = str.indexOf(":");
  if (firstColonPosition < 0) return [str]; // to eliminate unnecessary ""
  const secondColonPosition = str.indexOf(":", 1 + firstColonPosition);
  return [
    str.substring(0, secondColonPosition),
    str.substring(secondColonPosition + 1),
  ];
};

// 1234:sh.12345:12345:sh -> 1234 sh.12345:12345:sh
const splitAtFirstColon = (str: string): string[] => {
  const firstColonPosition = str.indexOf(":");
  return firstColonPosition > 0
    ? [
        str.substring(0, firstColonPosition),
        str.substring(firstColonPosition + 1),
      ]
    : [str];
};

export { computeEsxtopFieldTree };
export type { EsxtopData };
