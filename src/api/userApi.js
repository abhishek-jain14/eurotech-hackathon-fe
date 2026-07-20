import axiosClient from './axiosClient';

const BASE = '/api/v1/users';

export const createUser = (payload) => axiosClient.post(BASE, payload).then((r) => r.data.data);
export const updateUser = (id, payload) => axiosClient.put(`${BASE}/${id}`, payload).then((r) => r.data.data);
export const listUsers = (params) => axiosClient.get(BASE, { params }).then((r) => r.data.data);
export const deactivateUser = (id) => axiosClient.patch(`${BASE}/${id}/deactivate`).then((r) => r.data.data);
export const deleteUser = (id) => axiosClient.delete(`${BASE}/${id}`).then((r) => r.data.data);
