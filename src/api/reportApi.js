import axiosClient from './axiosClient';

export const getApplicationReportSummary = (applicationId) =>
  axiosClient.get(`/api/v1/reports/application/${applicationId}/summary`).then((r) => r.data.data);
