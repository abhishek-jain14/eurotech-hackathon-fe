import axiosClient from "./axiosClient";

const BASE = "/api/v1/applications";

export const onboardApplication = (payload) => axiosClient.post(BASE, payload).then((r) => r.data.data);
export const updateApplication = (id, payload) => axiosClient.put(`${BASE}/${id}`, payload).then((r) => r.data.data);
export const getApplication = (id) => axiosClient.get(`${BASE}/${id}`).then((r) => r.data.data);
export const listApplications = (params) => axiosClient.get(BASE, { params }).then((r) => r.data.data);
export const resolveSpecUrl = (id) => axiosClient.get(`${BASE}/${id}/resolve-spec-url`).then((r) => r.data.data);
export const archiveApplication = (id) => axiosClient.patch(`${BASE}/${id}/archive`).then((r) => r.data.data);
export const deleteApplication = (id) => axiosClient.delete(`${BASE}/${id}`).then((r) => r.data.data);

export const uploadApplicationSpec = (id, file) => {
  const form = new FormData();
  form.append("file", file);
  return axiosClient.post(`${BASE}/${id}/spec`, form, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data.data);
};
export const fetchApplicationSpec = (id) => axiosClient.post(`${BASE}/${id}/fetch-spec`).then((r) => r.data.data);

// Spec version history / pending-approval workflow
export const listSpecVersions = (id) => axiosClient.get(`${BASE}/${id}/spec-versions`).then((r) => r.data.data);
export const diffSpecVersion = (id, versionId) => axiosClient.get(`${BASE}/${id}/spec-versions/${versionId}/diff`).then((r) => r.data.data);
export const getSpecVersionImpact = (id, versionId) => axiosClient.get(`${BASE}/${id}/spec-versions/${versionId}/impact`).then((r) => r.data.data);
export const approveSpecVersion = (id, versionId) => axiosClient.post(`${BASE}/${id}/spec-versions/${versionId}/approve`).then((r) => r.data.data);
export const rejectSpecVersion = (id, versionId) => axiosClient.post(`${BASE}/${id}/spec-versions/${versionId}/reject`).then((r) => r.data.data);

// Fetch available endpoints for an application
export const fetchEndpoints = (id) => axiosClient.get(`${BASE}/${id}/fetch-endpoints`).then((r) => r.data.data);
