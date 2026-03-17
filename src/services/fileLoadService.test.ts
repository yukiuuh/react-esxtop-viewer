import { describe, expect, test } from "vite-plus/test";
import { TreeNode } from "../TreeNode";
import { LoadProgressEvent } from "./loadProgress";
import { loadFiles } from "./fileLoadService";

const createTree = (): TreeNode => ({
  id: "root",
  field_index: -1,
  path: "",
  children: [],
});

describe("loadFiles", () => {
  test("returns datasets and metrics in the same file order", async () => {
    const parser = {
      format: "esxtop" as const,
      canParse: async () => true,
      parse: async (file: File) => ({
        fields: ["Timestamp", `${file.name}-metric`],
        fieldTree: createTree(),
        rows: [["t1", "1"]],
      }),
    };

    const result = await loadFiles(
      [
        new File(["a"], "first.csv", { type: "text/csv" }),
        new File(["b"], "second.csv", { type: "text/csv" }),
      ],
      { parsers: [parser] },
    );

    expect(result.datasets.map((dataset) => dataset.fileName)).toEqual(["first.csv", "second.csv"]);
    expect(result.metrics.map((metric) => metric.fileName)).toEqual(["first.csv", "second.csv"]);
  });

  test("emits detecting and parse progress events", async () => {
    const progressStages: string[] = [];
    const parser = {
      format: "esxtop" as const,
      canParse: async () => true,
      parse: async (file: File, onProgress?: (event: LoadProgressEvent) => void) => {
        onProgress?.({
          fileName: file.name,
          stage: "read-header",
          message: "reading",
        });

        return {
          fields: ["Timestamp", "CPU"],
          fieldTree: createTree(),
          rows: [["t1", "1"]],
        };
      },
    };

    const result = await loadFiles([new File(["a"], "sample.csv", { type: "text/csv" })], {
      parsers: [parser],
      onProgress(event) {
        progressStages.push(event.stage);
      },
    });

    expect(progressStages).toEqual(["detect", "read-header"]);
    expect(result.metrics[0]?.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "resolve parser",
          progressEvents: 1,
        }),
        expect.objectContaining({
          label: "parse dataset",
          progressEvents: 1,
        }),
      ]),
    );
  });
});
