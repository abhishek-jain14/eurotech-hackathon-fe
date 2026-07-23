import axiosClient from './axiosClient';

const BASE = '/api/v1/coverage';

export const getCoverageOverview = () => axiosClient.get(`${BASE}/overview`).then((r) => r.data.data);
export const getApplicationCoverage = (applicationId) => axiosClient.get(`${BASE}/applications/${applicationId}`).then((r) => r.data.data);
