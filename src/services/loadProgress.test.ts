import { describe, expect, test } from "vite-plus/test";
import { formatLoadProgress } from "./loadProgress";

describe("formatLoadProgress", () => {
  test("formats byte-based progress", () => {
    expect(
      formatLoadProgress({
        fileName: "sample.csv",
        stage: "read-header",
        message: "Loading header from sample.csv",
        bytesRead: 256,
        totalBytes: 1024,
      }),
    ).toBe("Loading header from sample.csv: 256 / 1024 bytes (25%)");
  });

  test("formats percentage progress", () => {
    expect(
      formatLoadProgress({
        fileName: "sample.csv",
        stage: "parse-data",
        message: "Parsing data from sample.csv",
        percent: 42.9,
      }),
    ).toBe("Parsing data from sample.csv: 42%");
  });

  test("returns base message when no progress payload is present", () => {
    expect(
      formatLoadProgress({
        fileName: "sample.csv",
        stage: "detect",
        message: "Detecting parser for sample.csv",
      }),
    ).toBe("Detecting parser for sample.csv");
  });
});
