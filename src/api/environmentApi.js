import axiosClient from './axiosClient';

const BASE = '/api/v1/environments';

export const createEnvironment = (payload) => axiosClient.post(BASE, payload).then((r) => r.data.data);
export const updateEnvironment = (id, payload) => axiosClient.put(`${BASE}/${id}`, payload).then((r) => r.data.data);
export const getEnvironment = (id) => axiosClient.get(`${BASE}/${id}`).then((r) => r.data.data);
export const listEnvironmentsByProject = (projectId) => axiosClient.get(`${BASE}/project/${projectId}`).then((r) => r.data.data);
export const deleteEnvironment = (id) => axiosClient.delete(`${BASE}/${id}`).then((r) => r.data.data);
