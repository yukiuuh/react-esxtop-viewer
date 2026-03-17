import { describe, expect, test } from "vite-plus/test";
import { parseCsvHeaderLine } from "./csvFormat";
import { esxtopHeaderFields, esxtopHeaderLine } from "../test/fixtures/esxtopHeader";

describe("parseCsvHeaderLine", () => {
  test("parses an esxtop header fixture", () => {
    expect(parseCsvHeaderLine(esxtopHeaderLine)).toEqual(esxtopHeaderFields);
  });

  test("decodes URI-encoded header fields", () => {
    expect(parseCsvHeaderLine('"Cpu%20Ready","Memory%20Consumed"')).toEqual([
      "Cpu Ready",
      "Memory Consumed",
    ]);
  });

  test("throws on empty header input", () => {
    expect(() => parseCsvHeaderLine("")).toThrow("Empty CSV file");
  });
});
