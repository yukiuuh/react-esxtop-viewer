import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { computeEsxtopFieldTree } from "../esxtop";
import { parseCsvHeaderLine } from "../parsers/csvFormat";

const samplePath = resolve(__dirname, "esxtop_sample.csv");
const sampleHeader = readFileSync(samplePath, "utf-8").split("\n")[0] || "";

describe("esxtop sample fixture", () => {
  test("is anonymized and still parseable", () => {
    const fields = parseCsvHeaderLine(sampleHeader);
    const serialized = fields.join(",");

    expect(fields[1]).toContain("\\esxtop-host.local\\");
    expect(serialized).not.toMatch(/\\[^\\]+\.lab\\/);
    expect(serialized).not.toMatch(/\b[A-Za-z][A-Za-z0-9_-]*\.\d{4,}\b/);
  });

  test("still exercises group and vcpu field splitting", () => {
    const fields = parseCsvHeaderLine(sampleHeader);
    const tree = computeEsxtopFieldTree(fields);
    const rootNames = tree.children.map((node) => node.id);

    expect(rootNames).toContain("esxtop-host.local");

    const host = tree.children.find((node) => node.id === "esxtop-host.local");
    const groupCpu = host?.children.find((node) => node.id === "Group Cpu");
    const vcpu = host?.children.find((node) => node.id === "Vcpu");

    expect(groupCpu?.children.some((node) => node.id.includes("entity"))).toBe(true);
    expect(vcpu?.children.some((node) => node.id.includes("entity"))).toBe(true);
  });
});
