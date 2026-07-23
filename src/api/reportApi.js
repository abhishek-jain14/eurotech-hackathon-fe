import axiosClient from './axiosClient';

const BASE = '/api/v1/reports';

export const getApplicationReportSummary = (applicationId) =>
  axiosClient.get(`${BASE}/application/${applicationId}/summary`).then((r) => r.data.data);

export const getApplicationReportDetail = (applicationId) =>
  axiosClient.get(`${BASE}/application/${applicationId}/detail`).then((r) => r.data.data);

export const listReportSignoffs = () => axiosClient.get(`${BASE}/signoff`).then((r) => r.data.data);

export const submitSignoff = (applicationId, payload) =>
  axiosClient.post(`${BASE}/application/${applicationId}/signoff`, payload).then((r) => r.data.data);
