import { CdsTree, CdsTreeItem } from "@cds/react/tree-view";
import React, { useState } from "react";
import { TreeNode } from "./TreeNode";

type Props = {
  loading?: boolean;
  metricNodes?: TreeNode[];
  onSelectedChange?: (node: TreeNode, selectedEsxtopDataIndex: number) => void;
};
type MetricProps = {
  node: TreeNode;
  onSelectedChange?: (node: TreeNode) => void;
};
const MultiFileMetricBrowser: React.FC<Props> = (props) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const metricNodes = props.metricNodes;
  return (
    <>
      {props.loading ? (
        <></>
      ) : (
        <div cds-layout="wrap:none">
          <CdsTree
            onSelectCapture={(e) => {
              console.debug("onSelectCapture", e);
            }}
          >
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
                      onSelectedChange={(node) => {
                        props.onSelectedChange &&
                          props.onSelectedChange(node, index);
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

const Metric: React.FC<MetricProps> = (props) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  if (props.node.children.length > 0) {
    return (
      <CdsTreeItem
        expandable
        key={props.node.id}
        expanded={isExpanded}
        onSelectedChange={() => {
          props.onSelectedChange && props.onSelectedChange(props.node);
        }}
        onExpandedChange={() => {
          setIsExpanded(!isExpanded);
        }}
      >
        {props.node.id}
        {isExpanded &&
          props.node.children.map((child) => {
            return (
              <Metric
                key={child.id}
                node={child}
                onSelectedChange={props.onSelectedChange}
              />
            );
          })}
      </CdsTreeItem>
    );
  } else {
    return (
      <CdsTreeItem
        expandable={props.node.children.length > 0}
        key={props.node.id}
        onSelectedChange={() => {
          props.onSelectedChange && props.onSelectedChange(props.node);
        }}
      >
        {props.node.id}
      </CdsTreeItem>
    );
  }
};

export default MultiFileMetricBrowser;
