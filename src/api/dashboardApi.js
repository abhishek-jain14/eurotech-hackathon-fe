import axiosClient from './axiosClient';

export const getDashboardStats = () => axiosClient.get('/api/v1/dashboard/stats').then((r) => r.data.data);
