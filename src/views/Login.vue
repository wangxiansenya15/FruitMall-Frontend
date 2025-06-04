<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores'
import { ElMessage } from 'element-plus'
import api from '@/services/api'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 表单数据
const loginForm = reactive({
  username: '',
  password: '',
  remember: false
})

// 表单验证规则
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度应为3-20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度应为6-20个字符', trigger: 'blur' }
  ]
}

// 表单引用
const loginFormRef = ref(null)

// 加载状态
const loading = ref(false)

// 登录处理
// 调用后端API: POST /api/auth/login
// 参数:
//   - username: 用户名
//   - password: 密码
// 返回值: User对象 - 包含用户信息和认证token
const handleLogin = () => {
  if (!loginFormRef.value) return
  
  loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      
      try {
        // 调用后端API: POST /api/auth/login
        // 由于api.js响应拦截器已经处理了响应格式，直接获取data层数据
        const data = await api.post('/auth/login', {
          username: loginForm.username,
          password: loginForm.password
        });
        
        // 验证响应数据格式
        if (!data || typeof data !== 'object') {
          throw new Error('服务器响应数据格式错误');
        }
        
        // 获取token
        const token = data.token;
        if (!token) {
          throw new Error('无法获取认证令牌');
        }
        
        // 提取用户信息
        const user = {
          id: data.id,
          username: data.username,
          email: data.email || '',
          avatar: data.avatar || '',
          role: data.roles?.[0] || 'user',
          roles: data.roles || []  // 确保保存完整的roles数组
        };
        
        // 存储token到localStorage
        localStorage.setItem('token', token);
        
        // 存储用户信息和token
        userStore.login({
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          roles: user.roles  // 使用从data中提取的roles数组
        }, token)
        
        ElMessage.success('登录成功')
        
        // 根据用户角色进行路由跳转
        // 如果是超级管理员，跳转到管理员仪表盘
        if (user.role === 'ROLE_SUPER_ADMIN' || user.role === 'ROLE_ADMIN') {
          router.push('/admin/dashboard')
        } else {
          // 普通用户跳转到重定向页面或首页
          const redirectPath = route.query.redirect || '/'
          router.push(redirectPath)
        }
      } catch (error) {
        let errorMessage = '登录失败，请检查用户名和密码';
        if (error.response) {
          // 处理HTTP错误响应
          console.error('登录失败 - HTTP状态:', error.response.status, '响应数据:', error.response.data);
          
          // 根据不同的错误状态码提供更具体的错误信息
          if (error.response.status === 401) {
            errorMessage = '用户名或密码错误';
          } else if (error.response.status === 500) {
            errorMessage = '服务器内部出现故障，请稍后再试';
          }
        } else if (error.request) {
          // 请求已发出但没有收到响应
          console.error('登录失败 - 请求未收到响应:', error.request);
          errorMessage = '网络连接异常，请检查网络设置';
        } else {
          // 其他错误
          console.error('登录失败 - 错误详情:', error.message, '完整错误对象:', error);
        }
        
        ElMessage.error(errorMessage)
      } finally {
        loading.value = false
      }
    } else {
      return false
    }
  })
}

// 跳转到注册页
const goToRegister = () => {
  router.push('/register')
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="logo">
          <el-icon><Apple /></el-icon>
        </div>
        <h1>欢迎回来</h1>
        <p>登录您的水果商城账户</p>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        label-position="left"
        label-width="100px"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username" label="用户名">
          <el-input 
            v-model="loginForm.username"
            placeholder="请输入用户名"
            prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="password" label="密码">
          <el-input 
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <div class="form-actions">
          <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
          <a href="#" class="forgot-password">忘记密码?</a>
        </div>
        
        <el-button 
          type="primary" 
          class="login-button" 
          :loading="loading"
          @click="handleLogin"
        >
          登录
        </el-button>
        
        <div class="register-link">
          还没有账户? <a @click="goToRegister">立即注册</a>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "sass:color";
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 40px 20px;
  /* 添加背景图片设置 - 调整为显示完整图片 */
  background-image: url('/images/goods/login_background.avif');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  /* 添加渐变背景色作为图片周围的填充 */
  background-color: #f5f5f7;
}

.login-card {
  /* 使用半透明白色背景，让背景图片透过来 */
  background-color: rgba(255, 255, 255, 0.95);
  /* 添加毛玻璃效果 */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  /* 增强阴影效果 */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 580px;
  padding: 40px;
  animation: fadeIn 0.5s ease-out;
  /* 添加边框增强视觉效果 */
  border: 1px solid rgba(255, 255, 255, 0.2);

  :deep(.el-form-item) {
    margin-bottom: 24px;
    
    .el-form-item__label {
      color: #666;
      font-weight: 500;
      padding-right: 12px;
    }
    
    .el-input {
      width: 100%;
      max-width: 100%;
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
  
  .logo {
    width: 60px;
    height: 60px;
    margin: 0 auto 16px;
    background-color: #f5f5f7;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .el-icon {
      font-size: 30px;
      color: #ff6b6b;
    }
  }
  
  h1 {
    font-size: 2.2rem;
    margin-bottom: 10px;
    color: #333;
  }
  
  p {
    color: #666;
    font-size: 1.1rem;
  }
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.forgot-password {
  color: #666;
  font-size: 0.9rem;
  text-decoration: none;
  transition: color 0.3s;
  
  &:hover {
    color: #ff6b6b;
  }
}

.login-actions {
  margin-top: 30px;
  
  .el-button {
    width: 100%;
    height: 48px;
    font-size: 1.1rem;
  }
}

.login-button {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  border-radius: 8px;
  background-color: #ff6b6b;
  border-color: #ff6b6b;
  transition: background-color 0.3s, transform 0.2s;
  
  &:hover {
    background-color: color.adjust(#ff6b6b, $lightness: -5%);
    border-color: color.adjust(#ff6b6b, $lightness: -5%);
  }
  
  &:active {
    transform: scale(0.98);
  }
}

.register-link {
  margin-top: 24px;
  text-align: center;
  font-size: 1rem;
  color: #666;
  
  a {
    color: #ff6b6b;
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.3s;
    
    &:hover {
      color: color.adjust(#ff6b6b, $lightness: -10%);
      text-decoration: underline;
    }
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-card {
    padding: 30px 25px;
  }
  
  .login-header {
    .logo {
      font-size: 2.5rem;
    }
    
    h1 {
      font-size: 1.8rem;
    }
  }
}

@media (max-width: 480px) {
  .login-card {
    padding: 25px 20px;
  }
  
  .login-actions .el-button {
    height: 44px;
  }
}
</style>