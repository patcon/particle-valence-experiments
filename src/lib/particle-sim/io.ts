import type { Recording } from "./types";

export function buildExportPayload(recordings: Recording[]) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    recordings: recordings.map((r) => ({
      points: r.points,
      duration: r.duration,
    })),
  };
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// parses an imported JSON blob into valid recordings, or throws
export function parseImportedRecordings(json: string): Recording[] {
  const data = JSON.parse(json);
  const recs: Recording[] = (data.recordings || []).filter(
    (r: Recording) => Array.isArray(r.points) && r.points.length > 1 && r.duration > 0
  );
  return recs.map((r) => ({ ...r, _idx: 0 }));
}
