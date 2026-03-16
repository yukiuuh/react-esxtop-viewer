import { describe, expect, test } from "vite-plus/test";
import { TreeNode, filterTree } from "./TreeNode";

const tree: TreeNode = {
  id: "root",
  field_index: -1,
  path: "",
  children: [
    {
      id: "CPU",
      field_index: -1,
      path: "CPU",
      children: [
        {
          id: "Usage",
          field_index: 1,
          path: "CPU > Usage",
          children: [],
        },
      ],
    },
    {
      id: "Memory",
      field_index: -1,
      path: "Memory",
      children: [
        {
          id: "Consumed",
          field_index: 2,
          path: "Memory > Consumed",
          children: [],
        },
      ],
    },
  ],
};

describe("filterTree", () => {
  test("returns original tree for short filters", () => {
    expect(filterTree(tree, "c")).toBe(tree);
    expect(filterTree(tree, "cp")).toBe(tree);
  });

  test("keeps matching branches for lowercase case-insensitive search", () => {
    const filtered = filterTree(tree, "consumed");

    expect(filtered.children.map((node) => node.id)).toEqual(["Memory"]);
    expect(filtered.children[0]?.children[0]?.id).toBe("Consumed");
  });

  test("uses case-sensitive search when filter has uppercase letters", () => {
    const filtered = filterTree(tree, "uSage");

    expect(filtered.children).toHaveLength(0);
  });
});
