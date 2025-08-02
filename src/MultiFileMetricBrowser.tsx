import { CdsTree, CdsTreeItem } from "@cds/react/tree-view";
import React, { useState, useMemo, useRef } from "react";
import { TreeNode } from "./TreeNode";
import { useVirtualizer } from "@tanstack/react-virtual";
import { EsxtopData } from "./esxtop";
import {
  ClarityIcons,
  blockIcon,
  blocksGroupIcon,
  folderIcon,
} from "@cds/core/icon";
import { CdsIcon } from "@cds/react/icon";

ClarityIcons.addIcons(blockIcon, blocksGroupIcon, folderIcon);

type Props = {
  loading?: boolean;
  esxtopData?: EsxtopData[];
  onSelectedChange?: (node: TreeNode, selectedEsxtopDataIndex: number) => void;
};

interface FlatRow {
  id: string;
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
  dataIndex: number;
  isSelectable: boolean;
}

const MultiFileMetricBrowser: React.FC<Props> = ({
  loading,
  esxtopData,
  onSelectedChange,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNodePath, setSelectedNodePath] = useState<string>("");

  const flatRows = useMemo((): FlatRow[] => {
    const rows: FlatRow[] = [];
    if (!esxtopData) return rows;

    const buildMetricRows = (
      nodes: TreeNode[],
      depth: number,
      dataIndex: number,
      parentPath: string,
    ) => {
      nodes.forEach((node) => {
        const currentPath = `${parentPath}/${node.id}`;
        const isExpanded = expandedNodes.has(currentPath);
        rows.push({
          id: currentPath,
          node,
          depth,
          isExpanded,
          dataIndex,
          isSelectable: true,
        });

        if (isExpanded && node.children) {
          buildMetricRows(node.children, depth + 1, dataIndex, currentPath);
        }
      });
    };

    esxtopData.forEach((data, index) => {
      // フィルタリングによって子が空になった場合でもファイル名は表示する
      if (!data.metricFieldTree) return;

      const fileNodeId = `file-${index}`;
      const isFileExpanded = expandedNodes.has(fileNodeId);

      rows.push({
        id: fileNodeId,
        node: {
          id: data.fileName,
          children: data.metricFieldTree.children,
          path: fileNodeId,
          field_index: -2,
        },
        depth: 0,
        isExpanded: isFileExpanded,
        dataIndex: index,
        isSelectable: false,
      });

      if (isFileExpanded) {
        buildMetricRows(data.metricFieldTree.children, 1, index, fileNodeId);
      }
    });

    return rows;
  }, [esxtopData, expandedNodes]);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36, // 1行の高さをより現実に即した36pxに修正
    overscan: 10,
  });

  const handleToggleExpand = (rowId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const handleSelectNode = (node: TreeNode, dataIndex: number) => {
    onSelectedChange?.(node, dataIndex);
    setSelectedNodePath(node.path);
  };

  if (loading) {
    return <></>;
  }

  return (
    <div ref={parentRef} style={{ height: "100%", overflow: "auto" }}>
      <CdsTree
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const row = flatRows[virtualItem.index];
          if (!row) return null;

          return (
            <CdsTreeItem
              key={row.id}
              selected={selectedNodePath === row.node.path && row.isSelectable}
              expanded={row.isExpanded}
              expandable={row.node.children.length > 0}
              onExpandedChange={() => handleToggleExpand(row.id)}
              onSelectedChange={() =>
                row.isSelectable && handleSelectNode(row.node, row.dataIndex)
              }
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
                paddingLeft: `${row.depth * 1.2}rem`,
                cursor: row.isSelectable ? "pointer" : "default",
              }}
            >
              <CdsIcon
                shape={
                  row.node.children.length == 0
                    ? "block"
                    : row.node.children.some((child) => child.field_index == -1)
                      ? "folder"
                      : "blocks-group"
                }
              />
              {row.node.id}
            </CdsTreeItem>
          );
        })}
      </CdsTree>
    </div>
  );
};

export default MultiFileMetricBrowser;
