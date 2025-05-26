// src/services/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器（如添加 Token）
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 响应拦截器（统一错误处理）
axios.interceptors.response.use(response => {
  const { code, data } = response.data;
  if (code !== 200) {
    return Promise.reject(new Error(data?.message || '业务逻辑错误'));
  }
  return data; // 直接返回data层
}, error => {
  if (error.response) {
    console.error('请求错误', error.config.url, error.response.status);
  }
  return Promise.reject(error);
});

// 禁用自动重定向以解决302循环问题
axios.defaults.withCredentials = true;
axios.defaults.maxRedirects = 0;

export default api