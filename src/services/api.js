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
api.interceptors.response.use(response => {
  // 检查响应数据结构
  if (response.data && typeof response.data === 'object') {
    const { code, data, message } = response.data;
    
    // 如果有业务状态码，检查是否成功
    if (code !== undefined && code !== 200) {
      console.error('API业务逻辑错误:', {
        url: response.config?.url,
        method: response.config?.method,
        code,
        message,
        data
      });
      const error = new Error(message || '操作失败');
      error.code = code;
      error.response = response;
      return Promise.reject(error);
    }
    
    // 对于成功的响应，返回data字段的值
    // 但需要确保data是有意义的数据，如果data是简单值（如数字1）且不是预期的对象，则返回整个响应
    if (data !== undefined) {
      // 如果data是对象或数组，直接返回
      if (typeof data === 'object' || Array.isArray(data)) {
        return data;
      }
      // 如果data是简单值但看起来像是操作结果（如1表示成功），返回包含更多信息的对象
      if (typeof data === 'number' || typeof data === 'boolean' || typeof data === 'string') {
        return {
          result: data,
          message: message || '操作成功',
          code: code
        };
      }
      return data;
    }
    
    // 如果没有data字段，返回整个response.data
    return response.data;
  }
  
  // 如果没有标准的业务响应格式，直接返回response.data
  return response.data;
}, error => {
  // HTTP错误处理
  if (error.response) {
    const { status, data } = error.response;
    console.error('HTTP请求错误:', error.config?.url, status);
    
    // 处理常见的HTTP错误状态码
    switch (status) {
      case 401:
        // 未授权，可能需要重新登录
        localStorage.removeItem('token');
        break;
      case 403:
        // 禁止访问
        break;
      case 404:
        // 资源不存在
        break;
      case 500:
        // 服务器内部错误
        break;
    }
    
    // 如果响应体中有错误信息，使用它
    if (data && data.message) {
      error.message = data.message;
    }
  } else if (error.request) {
    // 网络错误
    console.error('网络请求失败:', error.message);
    error.message = '网络连接失败，请检查网络设置';
  }
  
  return Promise.reject(error);
});

// 禁用自动重定向以解决302循环问题
axios.defaults.withCredentials = true;
axios.defaults.maxRedirects = 0;

export default api