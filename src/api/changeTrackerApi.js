import axiosClient from './axiosClient';

const BASE = '/api/v1/change-tracker';

export const analyzeApplication = (applicationId) => axiosClient.post(`${BASE}/application/${applicationId}/analyze`).then((r) => r.data.data);
export const listPendingVersions = (applicationId) => axiosClient.get(`${BASE}/application/${applicationId}`).then((r) => r.data.data);
export const getPendingImpact = (applicationId, versionId) => axiosClient.get(`${BASE}/application/${applicationId}/spec-versions/${versionId}/impact`).then((r) => r.data.data);
export const healVersion = (applicationId, versionId) => axiosClient.patch(`${BASE}/application/${applicationId}/spec-versions/${versionId}/heal`).then((r) => r.data.data);
