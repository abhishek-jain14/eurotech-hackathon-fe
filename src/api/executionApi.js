import axiosClient from './axiosClient';

const BASE = '/api/v1/executions';

export const triggerExecution = (payload) => axiosClient.post(BASE, payload).then((r) => r.data.data);
export const getExecutionRun = (runId) => axiosClient.get(`${BASE}/${runId}`).then((r) => r.data.data);
export const listExecutionsByApplication = (applicationId, params) => axiosClient.get(`${BASE}/application/${applicationId}`, { params }).then((r) => r.data.data);
