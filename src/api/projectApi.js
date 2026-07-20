import axiosClient from './axiosClient';

const BASE = '/api/v1/projects';

export const createProject = (payload) => axiosClient.post(BASE, payload).then((r) => r.data.data);
export const updateProject = (id, payload) => axiosClient.put(`${BASE}/${id}`, payload).then((r) => r.data.data);
export const getProject = (id) => axiosClient.get(`${BASE}/${id}`).then((r) => r.data.data);
export const listProjects = (params) => axiosClient.get(BASE, { params }).then((r) => r.data.data);
export const deleteProject = (id) => axiosClient.delete(`${BASE}/${id}`).then((r) => r.data.data);

export const configureProjectTlsAuth = (id, formData) =>
  axiosClient.post(`${BASE}/${id}/tls-config`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data);
