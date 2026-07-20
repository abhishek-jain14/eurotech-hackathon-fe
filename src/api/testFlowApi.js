import axiosClient from './axiosClient';

const BASE = '/api/v1/test-flows';

export const createTestFlow = (payload) => axiosClient.post(BASE, payload).then((r) => r.data.data);
export const updateTestFlow = (id, payload) => axiosClient.put(`${BASE}/${id}`, payload).then((r) => r.data.data);
export const getTestFlow = (id) => axiosClient.get(`${BASE}/${id}`).then((r) => r.data.data);
export const listTestFlowsByApplication = (applicationId) => axiosClient.get(`${BASE}/application/${applicationId}`).then((r) => r.data.data);
export const deleteTestFlow = (id) => axiosClient.delete(`${BASE}/${id}`).then((r) => r.data.data);
