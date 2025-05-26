# Nginx 反向代理配置指南

## 概述

本文档提供了如何使用 Nginx 作为反向代理服务器来解决前端应用与后端 API 之间的跨域问题的详细说明。通过 Nginx 反向代理，我们可以：

1. 解决跨域资源共享 (CORS) 问题
2. 简化前端请求路径
3. 提高应用安全性
4. 实现负载均衡（如有多个后端服务器）

## 当前项目配置

目前，FruitMall 前端项目使用 Vite 的开发服务器代理功能来处理跨域请求：

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',      // 目标服务器地址
      changeOrigin: true,                   // 允许跨域
      rewrite: (path) => path.replace(/^/api/, '')    // 移除请求路径中的/api前缀
    }
  }
}
```

这种方式仅适用于开发环境。在生产环境中，我们需要使用 Nginx 来处理这些请求。

## Nginx 配置说明

已创建的 `nginx.conf` 文件包含了完整的 Nginx 配置，主要包括：

1. **静态资源服务**：提供前端构建后的静态文件
2. **API 反向代理**：将 `/api` 路径的请求转发到后端服务器
3. **CORS 配置**：添加必要的跨域头信息
4. **SPA 支持**：支持 Vue Router 的 history 模式

### 关键配置解析

```nginx
# 前端静态资源
location / {
    root   /usr/share/nginx/html; # 前端构建文件的存放路径
    index  index.html;
    try_files $uri $uri/ /index.html; # 支持Vue Router的history模式
}

# 后端API代理
location /api/ {
    proxy_pass http://backend-server:8080/; # 替换为实际的后端服务地址
    # ... 其他代理设置 ...
    
    # 解决CORS问题的关键配置
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH';
    # ... 其他CORS头 ...
}
```

## 部署步骤

### 1. 构建前端应用

```bash
npm run build
```

这将在 `dist` 目录中生成生产就绪的静态文件。

### 2. 配置 Nginx

1. 将 `nginx.conf` 文件复制到 Nginx 配置目录（通常是 `/etc/nginx/`）
2. 修改配置中的以下内容：
   - `server_name`：设置为你的实际域名
   - `root`：指向前端构建文件的实际路径
   - `proxy_pass`：设置为实际的后端服务器地址

### 3. 启动 Nginx

```bash
# 测试配置文件语法
nginx -t

# 启动 Nginx
sudo systemctl start nginx  # 对于使用 systemd 的系统
# 或
sudo service nginx start    # 对于使用 service 的系统
```

### 4. 验证配置

访问你的网站，确保：
- 前端页面正常加载
- API 请求正常工作，没有跨域错误

## Docker 部署（可选）

如果你使用 Docker 部署，可以创建以下 Dockerfile：

```dockerfile
FROM nginx:alpine

# 复制前端构建文件
COPY dist/ /usr/share/nginx/html/

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

然后构建并运行 Docker 容器：

```bash
docker build -t fruitmall-frontend .
docker run -p 80:80 fruitmall-frontend
```

## 注意事项

1. **安全性考虑**：生产环境中，应该限制 CORS 头中的 `Access-Control-Allow-Origin` 为特定域名，而不是使用 `*`
2. **HTTPS**：生产环境强烈建议配置 HTTPS，可以使用 Let's Encrypt 获取免费证书
3. **缓存策略**：可以在 Nginx 中配置适当的缓存策略，提高静态资源加载速度

## 故障排除

如果遇到问题，请检查：

1. Nginx 错误日志：`/var/log/nginx/error.log`
2. 浏览器开发者工具中的网络请求和控制台错误
3. 确保后端服务器正常运行并可访问
4. 检查防火墙设置，确保 Nginx 可以访问后端服务器

## 结论

通过使用 Nginx 作为反向代理，我们可以有效解决前端与后端 API 之间的跨域问题，同时提供更好的性能和安全性。在生产环境中，这是处理前后端分离应用的推荐方式。