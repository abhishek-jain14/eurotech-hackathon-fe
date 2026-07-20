import axiosClient from './axiosClient';

export const login = (username, password) =>
  axiosClient.post('/api/v1/auth/login', { username, password }).then((r) => r.data.data);
