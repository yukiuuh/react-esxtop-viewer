import { Datum } from "plotly.js";
import { TreeNode } from "../TreeNode";

export type DatasetFormat = "esxtop";

export interface Dataset {
  fileName: string;
  format: DatasetFormat;
  metricFieldTree: TreeNode;
  metricField: string[];
  metricData: Datum[][];
}
