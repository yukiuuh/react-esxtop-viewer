import { describe, expect, test } from "vite-plus/test";
import { computeEsxtopFieldTree } from "./esxtop";

describe("computeEsxtopFieldTree", () => {
  test("builds nested nodes for esxtop fields", () => {
    const tree = computeEsxtopFieldTree([
      "Timestamp",
      "\\Host\\CPU\\Usage(%)",
      "\\Host\\CPU\\Ready(%)",
    ]);

    expect(tree.children).toHaveLength(1);
    expect(tree.children[0]?.id).toBe("Host");
    expect(tree.children[0]?.children[0]?.id).toBe("CPU");
    expect(tree.children[0]?.children[0]?.children.map((node) => node.id)).toEqual([
      "Usage",
      "Ready",
    ]);
  });

  test("splits virtual disk and vcpu nodes using esxtop rules", () => {
    const tree = computeEsxtopFieldTree([
      "Timestamp",
      "\\Group\\Vcpu\\0:vmname:1:cpu\\Costop(%)",
      "\\Group\\Virtual Disk\\naa.1:READ/s",
    ]);

    const group = tree.children[0];
    expect(group?.id).toBe("Group");

    const vcpu = group?.children.find((node) => node.id === "Vcpu");
    expect(vcpu?.children[0]?.id).toBe("0:vmname");
    expect(vcpu?.children[0]?.children[0]?.id).toBe("1:cpu");

    const virtualDisk = group?.children.find((node) => node.id === "Virtual Disk");
    expect(virtualDisk?.children[0]?.id).toBe("naa.1");
    expect(virtualDisk?.children[0]?.children[0]?.id).toBe("READ/s");
  });
});
