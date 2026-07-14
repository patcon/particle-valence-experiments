import { describe, expect, it } from "vitest";
import { buildExportPayload, parseImportedRecordings } from "./io";
import type { Recording } from "./types";

describe("buildExportPayload", () => {
  it("strips internal _idx field and wraps recordings with version/exportedAt", () => {
    const recs: Recording[] = [{ points: [{ x: 0, y: 0, t: 0 }], duration: 100, _idx: 3 }];
    const payload = buildExportPayload(recs);
    expect(payload.version).toBe(1);
    expect(typeof payload.exportedAt).toBe("string");
    expect(payload.recordings).toEqual([{ points: recs[0].points, duration: 100 }]);
  });
});

describe("parseImportedRecordings", () => {
  it("parses valid recordings and resets _idx to 0", () => {
    const json = JSON.stringify({
      recordings: [
        { points: [{ x: 0, y: 0, t: 0 }, { x: 1, y: 1, t: 10 }], duration: 10 },
      ],
    });
    const recs = parseImportedRecordings(json);
    expect(recs).toHaveLength(1);
    expect(recs[0]._idx).toBe(0);
  });

  it("filters out recordings with fewer than 2 points", () => {
    const json = JSON.stringify({
      recordings: [{ points: [{ x: 0, y: 0, t: 0 }], duration: 10 }],
    });
    expect(parseImportedRecordings(json)).toHaveLength(0);
  });

  it("filters out recordings with non-positive duration", () => {
    const json = JSON.stringify({
      recordings: [{ points: [{ x: 0, y: 0, t: 0 }, { x: 1, y: 1, t: 10 }], duration: 0 }],
    });
    expect(parseImportedRecordings(json)).toHaveLength(0);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseImportedRecordings("not json")).toThrow();
  });

  it("treats a missing recordings field as empty", () => {
    expect(parseImportedRecordings("{}")).toEqual([]);
  });
});
