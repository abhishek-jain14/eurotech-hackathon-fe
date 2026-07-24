import axiosClient from "./axiosClient";

const BASE = "/api/v1/applications";

export const onboardApplication = (payload) => axiosClient.post(BASE, payload).then((r) => r.data.data);
export const updateApplication = (id, payload) => axiosClient.put(`${BASE}/${id}`, payload).then((r) => r.data.data);
export const getApplication = (id) => axiosClient.get(`${BASE}/${id}`).then((r) => r.data.data);
export const listApplications = (params) => axiosClient.get(BASE, { params }).then((r) => r.data.data);
export const resolveSpecUrl = (id) => axiosClient.get(`${BASE}/${id}/resolve-spec-url`).then((r) => r.data.data);
export const archiveApplication = (id) => axiosClient.patch(`${BASE}/${id}/archive`).then((r) => r.data.data);
export const deleteApplication = (id) => axiosClient.delete(`${BASE}/${id}`).then((r) => r.data.data);

// Any call that may trigger a real LLM/external-agent call server-side (AI agent spec ingestion,
// AI scenario generation) can legitimately take up to 60-90s, well past axiosClient's default 20s
// timeout - without this override the browser gives up and shows an error while the backend request
// thread keeps running and commits anyway, so the spec/scenarios land in the DB even though the UI
// just reported failure.
const AI_CALL_TIMEOUT_MS = 120000;

export const uploadApplicationSpec = (id, file, useAiAgent = false) => {
  const form = new FormData();
  form.append("file", file);
  return axiosClient
    .post(`${BASE}/${id}/spec`, form, {
      params: { useAiAgent },
      headers: { "Content-Type": "multipart/form-data" },
      ...(useAiAgent ? { timeout: AI_CALL_TIMEOUT_MS } : {})
    })
    .then((r) => r.data.data);
};
export const fetchApplicationSpec = (id, useAiAgent = false) =>
  axiosClient
    .post(`${BASE}/${id}/fetch-spec`, null, { params: { useAiAgent }, ...(useAiAgent ? { timeout: AI_CALL_TIMEOUT_MS } : {}) })
    .then((r) => r.data);

// Spec version history / pending-approval workflow
export const listSpecVersions = (id) => axiosClient.get(`${BASE}/${id}/spec-versions`).then((r) => r.data.data);
export const diffSpecVersion = (id, versionId) => axiosClient.get(`${BASE}/${id}/spec-versions/${versionId}/diff`).then((r) => r.data.data);
export const getSpecVersionImpact = (id, versionId) => axiosClient.get(`${BASE}/${id}/spec-versions/${versionId}/impact`).then((r) => r.data.data);
export const approveSpecVersion = (id, versionId) => axiosClient.post(`${BASE}/${id}/spec-versions/${versionId}/approve`).then((r) => r.data.data);
export const rejectSpecVersion = (id, versionId) => axiosClient.post(`${BASE}/${id}/spec-versions/${versionId}/reject`).then((r) => r.data.data);

// AI scenario generation from a spec version, scoped by scenario type. Whether the server actually
// uses the (slower) AI generator or the fast rule-based one is a server-side config flag the FE has
// no visibility into, so the longer timeout is applied unconditionally - harmless for the fast path.
export const generateScenariosForSpecVersion = (id, versionId, scenarioType, prompt) =>
  axiosClient
    .post(`${BASE}/${id}/spec-versions/${versionId}/generate-scenarios`, { scenarioType, prompt }, { timeout: AI_CALL_TIMEOUT_MS })
    .then((r) => r.data.data);

// Fetch available endpoints for an application
export const fetchEndpoints = (id) => axiosClient.get(`${BASE}/${id}/fetch-endpoints`).then((r) => r.data.data);
