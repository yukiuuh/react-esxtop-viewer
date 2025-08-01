import { CdsTree, CdsTreeItem } from "@cds/react/tree-view";
import React, { useState, memo, useEffect } from "react";
import { TreeNode } from "./TreeNode";

type Props = {
  loading?: boolean;
  metricNodes?: TreeNode[];
  onSelectedChange?: (node: TreeNode, selectedEsxtopDataIndex: number) => void;
};
type MetricProps = {
  node: TreeNode;
  onSelectedChange?: (node: TreeNode) => void;
  selectedNodePath: string;
};

const MultiFileMetricBrowser: React.FC<Props> = (props) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const metricNodes = props.metricNodes;
  const [selectedNodePath, setSelectedNodePath] = useState<string>("");
  return (
    <>
      {props.loading ? (
        <></>
      ) : (
        <div cds-layout="wrap:none" style={{ width: "stretch" }}>
          <CdsTree>
            <CdsTreeItem
              onExpandedChange={() => {
                setIsExpanded(!isExpanded);
              }}
              expanded={isExpanded}
              expandable={metricNodes && metricNodes.length > 0}
            >
              root
              {metricNodes != undefined &&
                metricNodes.length > 0 &&
                metricNodes.map((_child, index) => {
                  const child = _child.children[0];
                  return child ? (
                    <Metric
                      key={child.id + " " + index}
                      node={child}
                      selectedNodePath={selectedNodePath}
                      onSelectedChange={(node) => {
                        props.onSelectedChange &&
                          props.onSelectedChange(node, index);
                        setSelectedNodePath(node.path);
                      }}
                    />
                  ) : null; // when search result is empty
                })}
            </CdsTreeItem>
          </CdsTree>
        </div>
      )}
    </>
  );
};

const Metric: React.FC<MetricProps> = memo((props) => {
  const { selectedNodePath, node, onSelectedChange } = props;
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [renderedChildren, setRenderedChildren] = useState<TreeNode[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState<boolean>(false);

  const BATCH_SIZE = 50; // 一度にレンダリングするアイテム数

  useEffect(() => {
    // このeffectがキャンセルされたかどうかを追跡するフラグ
    let isCancelled = false;

    if (isExpanded) {
      // 展開が開始されたら、まず既存の子をクリアし、ローディング状態にする
      setRenderedChildren([]);
      setIsLoadingChildren(true);
      let currentIndex = 0;

      const renderBatch = () => {
        // この処理がキャンセルされていたら、何もせずに終了
        if (isCancelled) {
          return;
        }

        const nextBatch = node.children.slice(
          currentIndex,
          currentIndex + BATCH_SIZE,
        );
        if (nextBatch.length > 0) {
          setRenderedChildren((prev) => [...prev, ...nextBatch]);
          currentIndex += BATCH_SIZE;
          setTimeout(renderBatch, 0);
        } else {
          setIsLoadingChildren(false);
        }
      };

      renderBatch();
    } else {
      // 閉じられたら、状態をリセット
      setRenderedChildren([]);
      setIsLoadingChildren(false);
    }

    // クリーンアップ関数
    return () => {
      isCancelled = true;
    };
  }, [isExpanded, node.children]); // node.childrenも依存配列に含め、データソースが変わった場合にも対応

  if (node.children.length > 0) {
    return (
      <CdsTreeItem
        expandable
        loading={isLoadingChildren}
        key={node.id}
        expanded={isExpanded}
        selected={selectedNodePath == node.path}
        onSelectedChange={() => {
          onSelectedChange && onSelectedChange(node);
        }}
        onExpandedChange={() => {
          setIsExpanded(!isExpanded);
        }}
      >
        {node.id}
        {renderedChildren.map((child) => (
          <Metric
            key={child.id}
            node={child}
            selectedNodePath={selectedNodePath}
            onSelectedChange={onSelectedChange}
          />
        ))}
        {isLoadingChildren && <CdsTreeItem disabled>Loading...</CdsTreeItem>}
      </CdsTreeItem>
    );
  } else {
    return (
      <CdsTreeItem
        expandable={false}
        selected={selectedNodePath == node.path}
        key={node.id}
        onSelectedChange={() => {
          onSelectedChange && onSelectedChange(node);
        }}
      >
        {node.id}
      </CdsTreeItem>
    );
  }
});

export default MultiFileMetricBrowser;
