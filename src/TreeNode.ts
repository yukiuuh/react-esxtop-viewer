export interface TreeNode {
  id: string;
  field_index: number;
  children: TreeNode[];
  path: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const deepCopy = (node: TreeNode): TreeNode => {
  return {
    id: node.id,
    field_index: node.field_index,
    children: (node.children || []).map((x) => deepCopy(x)),
    path: node.path,
  };
};

const filterTree = (tree: TreeNode, filterString?: string): TreeNode => {
  const MIN_FILTER_STRING = 2;
  if (
    !filterString ||
    filterString.length <= MIN_FILTER_STRING ||
    (filterString.toLowerCase() == filterString // case-insensitive search if filter string is all in lower case.
      ? tree.id.toLowerCase().includes(filterString)
      : tree.id.includes(filterString))
  ) {
    return tree;
  }
  const filteredNode: TreeNode = {
    id: tree.id,
    field_index: tree.field_index,
    children: [],
    path: "",
  };

  if (tree.children) {
    for (const child of tree.children) {
      const filteredChild = filterTree(child, filterString);
      if (filteredChild.children.length > 0 && filteredChild.id.length > 0)
        filteredNode.children.push(filteredChild);
    }
  }

  return filteredNode;
};

export { filterTree };
