import axiosClient from './axiosClient';

const BASE = '/api/v1/scenarios';

export const createScenario = (payload) => axiosClient.post(BASE, payload).then((r) => r.data.data);
export const updateScenario = (id, payload) => axiosClient.put(`${BASE}/${id}`, payload).then((r) => r.data.data);
export const getScenario = (id) => axiosClient.get(`${BASE}/${id}`).then((r) => r.data.data);
export const listScenariosByApplication = (applicationId, params) => axiosClient.get(`${BASE}/application/${applicationId}`, { params }).then((r) => r.data.data);
export const deleteScenario = (id) => axiosClient.delete(`${BASE}/${id}`).then((r) => r.data.data);
