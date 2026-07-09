// In dev, Vite proxies /api and /uploads to the local backend (see vite.config.js).
// In production the frontend and backend are deployed separately, so point at
// the deployed backend's origin via VITE_API_URL (e.g. https://your-api.up.railway.app).
export const API_ORIGIN = import.meta.env.VITE_API_URL || "";
const BASE = `${API_ORIGIN}/api`;

export function uploadUrl(path) {
  return `${API_ORIGIN}/uploads/captures/${path}`;
}

async function req(method, url, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${url}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.blob();
}

export const api = {
  createSession: (data) => req("POST", "/sessions", data),
  getSession: (id) => req("GET", `/sessions/${id}`),
  patchSession: (id, data) => req("PATCH", `/sessions/${id}`, data),

  createCapture: (data) => req("POST", "/captures", data),
  listCaptures: (sessionId) => req("GET", `/captures?sessionId=${sessionId}`),
  calibrateCapture: (id, data) => req("POST", `/captures/${id}/calibrate`, data),

  runStep: (data) => req("POST", "/step", data),
  getMessages: (sessionId, stepId) =>
    req("GET", `/step/messages?sessionId=${sessionId}${stepId ? `&stepId=${stepId}` : ""}`),

  listGrid: (sessionId) => req("GET", `/grid?sessionId=${sessionId}`),
  createGridRow: (data) => req("POST", "/grid", data),
  patchGridRow: (id, data) => req("PATCH", `/grid/${id}`, data),
  deleteGridRow: (id) => req("DELETE", `/grid/${id}`),
  gridTotals: (sessionId, opPct) => req("GET", `/grid/totals/${sessionId}${opPct ? `?opPct=${opPct}` : ""}`),
  lockGrid: (sessionId, section) => req("POST", `/grid/lock/${sessionId}`, { section }),

  listAnnotations: (captureId) => req("GET", `/annotations?captureId=${captureId}`),
  createAnnotation: (data) => req("POST", "/annotations", data),
  patchAnnotation: (id, data) => req("PATCH", `/annotations/${id}`, data),
  deleteAnnotation: (id) => req("DELETE", `/annotations/${id}`),

  logDelta: (data) => req("POST", "/corrections/deltas", data),
  listDeltas: (params = {}) => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""));
    const qs = new URLSearchParams(clean).toString();
    return req("GET", `/corrections/deltas${qs ? `?${qs}` : ""}`);
  },
  listHelpEvents: () => req("GET", "/corrections/help-events"),

  autofillPricing: (data) => req("POST", "/pricing/autofill", data),

  exportXlsxUrl: (sessionId) => `${BASE}/export/xlsx/${sessionId}`,
  generateProposalPdf: async (sessionId, data) => {
    const res = await fetch(`${BASE}/export/proposal-pdf/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to generate proposal");
    }
    return res.blob();
  },
};
