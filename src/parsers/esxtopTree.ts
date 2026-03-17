import { TreeNode } from "../TreeNode";

// test(aaa) -> test aaa
const splitAtFirstParensis = (str: string): string[] => {
  return str.split(/(?<=^[^(]+?)\(/).map((value) => value.replace(/(\)*)\)/, ""));
};

// 1234:sh.12345:12345:sh -> 1234:sh.12345 12345:sh
const splitAtSecondColon = (str: string): string[] => {
  const firstColonPosition = str.indexOf(":");
  if (firstColonPosition < 0) return [str];
  const secondColonPosition = str.indexOf(":", firstColonPosition + 1);
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

export const computeEsxtopFieldTree = (
  fields: string[],
  onProgress?: (percent: number) => void,
): TreeNode => {
  const total = fields.length;
  const ignoreFieldNum = 1;

  const root: TreeNode = {
    id: "root",
    field_index: -1,
    children: [],
    path: "",
  };

  fields.forEach((field, fieldIndex) => {
    if (onProgress && total > 0 && (fieldIndex % 100 === 0 || fieldIndex === total - 1)) {
      onProgress(((fieldIndex + 1) / total) * 100.0);
    }

    if (!field || fieldIndex < ignoreFieldNum) return;

    const segmentsByBackSlash = field
      .split("\\")
      .filter((segment) => segment.length > 0);
    const segmentsByFirstParensis = segmentsByBackSlash
      .map((segment) => {
        if (
          [
            "Average Packet Size",
            "Link Speed",
            "Memory Overcommit",
            "Cpu Load",
            "Effective Min",
          ].some((pattern) => segment.match(pattern))
        ) {
          return segment;
        }

        return splitAtFirstParensis(segment);
      })
      .flat();

    const category = segmentsByFirstParensis[1];
    const segments = segmentsByFirstParensis
      .map((segment) => {
        if (category === "Vcpu") {
          return splitAtSecondColon(segment);
        }

        if (
          [
            "Virtual Disk",
            "Network Port",
            "Interrupt Cookie",
            "Physical Disk",
          ].includes(category)
        ) {
          return splitAtFirstColon(segment);
        }

        return segment;
      })
      .flat();

    let currentNode = root;
    segments.forEach((segment, segmentIndex) => {
      let childNode = currentNode.children?.find((node) => node.id === segment);

      if (!childNode) {
        childNode = {
          id: segment,
          field_index: segmentIndex + 1 === segments.length ? fieldIndex : -1,
          children: [],
          path: segments.slice(0, segmentIndex + 1).join(" > "),
        };
        currentNode.children = currentNode.children || [];
        currentNode.children.push(childNode);
      }

      currentNode = childNode;
    });
  });

  return root;
};
