import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://eurotech-hackathon-fe-968849916863.europe-west3.run.app/';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('qagenie_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('qagenie_token');
      localStorage.removeItem('qagenie_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
