import axiosClient from './axiosClient';

const BASE = '/api/v1/test-data';

export const createTestData = (payload) => axiosClient.post(BASE, payload).then((r) => r.data.data);
export const bulkUploadTestData = (applicationId, file) => {
  const form = new FormData();
  form.append('file', file);
  return axiosClient.post(`${BASE}/application/${applicationId}/bulk-upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data);
};
export const updateTestData = (id, payload) => axiosClient.put(`${BASE}/${id}`, payload).then((r) => r.data.data);
export const listTestDataByApplication = (applicationId, params) => axiosClient.get(`${BASE}/application/${applicationId}`, { params }).then((r) => r.data.data);
export const deleteTestData = (id) => axiosClient.delete(`${BASE}/${id}`).then((r) => r.data.data);
