import { CdsDivider } from "@cds/react/divider";
import React, { useState, useEffect, useRef, useCallback } from "react";

interface SplitPaneProps {
  initPosition?: number;
  minPosition?: number;
  maxPosition?: number;
  children: React.ReactNode;
  onPositionChanged?: (position: number) => void;
}

const SplitPane: React.FC<SplitPaneProps> = ({
  initPosition = 50,
  minPosition = 10,
  maxPosition = 90,
  children,
  onPositionChanged = () => {},
}) => {
  const [splitPos, setSplitPos] = useState<number>(initPosition);
  const containerRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const isDragging = useRef<boolean>(false);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    rangeRef.current?.focus();
    document.body.style.userSelect = "none";
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;
      const newSplitPos =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;
      if (minPosition < newSplitPos && newSplitPos < maxPosition)
        setSplitPos(newSplitPos);
    },
    [setSplitPos, maxPosition, minPosition],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    onPositionChanged(splitPos);
    document.body.style.userSelect = "auto";
  }, [splitPos, onPositionChanged]);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        height: "100%",
        background: "var(--cds-alias-object-app-background)",
      }}
    >
      <div style={{ width: splitPos + "%", overflow: "hidden" }}>
        {React.Children.toArray(children)[0]}
      </div>
      <CdsDivider
        className="split"
        style={{ cursor: "col-resize", padding: "10px" }}
        orientation="vertical"
        onMouseDown={handleMouseDown}
      />
      <div style={{ width: 100.0 - splitPos + "%", overflow: "hidden" }}>
        {React.Children.toArray(children)[1]}
      </div>
    </div>
  );
};
export default SplitPane;
