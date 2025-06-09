<script setup>
import { ref, reactive, computed } from 'vue'
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

// 登录错误次数记录
const loginAttempts = ref(0)
const maxAttempts = 5 // 最大尝试次数
const lockoutDuration = 30 * 60 * 1000 // 锁定时间30分钟（毫秒）
const lastFailedAttempt = ref(null)

// 检查是否处于锁定状态
const isLockedOut = computed(() => {
  if (!lastFailedAttempt.value || loginAttempts.value < maxAttempts) {
    return false
  }
  const timeSinceLastAttempt = Date.now() - lastFailedAttempt.value
  return timeSinceLastAttempt < lockoutDuration
})

// 剩余锁定时间（分钟）
const remainingLockoutTime = computed(() => {
  if (!isLockedOut.value) return 0
  const timeSinceLastAttempt = Date.now() - lastFailedAttempt.value
  const remainingTime = lockoutDuration - timeSinceLastAttempt
  return Math.ceil(remainingTime / (60 * 1000))
})

// 记录登录失败
const recordLoginFailure = async (username, errorType = 'INVALID_CREDENTIALS') => {
  try {
    // 增加本地错误计数
    loginAttempts.value++
    lastFailedAttempt.value = Date.now()
    
    // 向后端发送登录失败记录
    await api.post('/auth/login-failure', {
      username: username,
      errorType: errorType, // INVALID_CREDENTIALS, ACCOUNT_LOCKED, ACCOUNT_DISABLED等
      attemptCount: loginAttempts.value,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ipAddress: 'client' // 实际IP由后端获取
    })
    
    console.log(`登录失败记录已发送，当前尝试次数: ${loginAttempts.value}`);
  } catch (error) {
    console.error('记录登录失败时出错:', error);
  }
}

// 重置登录尝试计数
const resetLoginAttempts = () => {
  loginAttempts.value = 0
  lastFailedAttempt.value = null
}

// 用户状态验证函数 - 基于后端返回的userStatus枚举值
const validateUserStatus = (userData) => {
  // 检查userStatus字段是否存在
  if (!userData.userStatus) {
    return {
      isValid: false,
      message: '无法获取用户状态信息'
    };
  }
  
  // 根据后端返回的用户状态枚举值进行验证
  switch (userData.userStatus) {
    case 'ACTIVE':
      return {
        isValid: true,
        message: '用户状态正常'
      };
    case 'DISABLED':
      return {
        isValid: false,
        message: '账户已被禁用，请联系管理员'
      };
    case 'EXPIRED':
      return {
        isValid: false,
        message: '账户已过期，请联系管理员'
      };
    case 'LOCKED':
      return {
        isValid: false,
        message: '账户已被锁定，请联系管理员'
      };
    case 'CREDENTIALS_EXPIRED':
      return {
        isValid: false,
        message: '用户凭证已过期，请重新设置密码'
      };
    default:
      return {
        isValid: false,
        message: '账户状态异常，无法登录'
      };
  }
}

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
      // 检查是否处于锁定状态
      if (isLockedOut.value) {
        ElMessage.error(`账户已被临时锁定，请在 ${remainingLockoutTime.value} 分钟后重试`);
        return;
      }
      
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
        
        // 检查用户账户状态 - 只有状态正常的用户才能登录
        const userStatusCheck = validateUserStatus(data);
        if (!userStatusCheck.isValid) {
          // 用户状态异常时，直接显示状态信息，不记录为登录失败
          ElMessage.warning(userStatusCheck.message);
          loading.value = false;
          return;
        }
        
        // 提取用户信息 - 简化用户状态处理，只保留userStatus字段
        const user = {
          id: data.id,
          username: data.username,
          email: data.email || '',
          avatar: data.avatar || '',
          role: data.roles?.[0] || 'user',
          roles: data.roles || [],  // 确保保存完整的roles数组
          // 保存用户状态信息用于后续验证
          userStatus: data.userStatus || 'ACTIVE'
        };
        
        // 存储token到localStorage
        localStorage.setItem('token', token);
        
        // 存储用户信息和token（包含完整的用户状态信息）
        userStore.login(user, token)
        
        // 登录成功，重置错误计数
        resetLoginAttempts()
        
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
        let errorType = 'UNKNOWN_ERROR';
        
        if (error.response) {
          // 处理HTTP错误响应
          console.error('登录失败 - HTTP状态:', error.response.status, '响应数据:', error.response.data);
          
          // 根据不同的错误状态码提供更具体的错误信息
          if (error.response.status === 401) {
            errorMessage = '用户名或密码错误';
            errorType = 'INVALID_CREDENTIALS';
          } else if (error.response.status === 423) {
            errorMessage = '账户已被锁定';
            errorType = 'ACCOUNT_LOCKED';
          } else if (error.response.status === 403) {
            errorMessage = '账户已被禁用';
            errorType = 'ACCOUNT_DISABLED';
          } else if (error.response.status === 500) {
            errorMessage = '服务器内部出现故障，请稍后再试';
            errorType = 'SERVER_ERROR';
          }
        } else if (error.request) {
          // 请求已发出但没有收到响应
          console.error('登录失败 - 请求未收到响应:', error.request);
          errorMessage = '网络连接异常，请检查网络设置';
          errorType = 'NETWORK_ERROR';
        } else {
          // 其他错误（网络错误、服务器错误等）
          console.error('登录失败 - 错误详情:', error.message, '完整错误对象:', error);
          errorMessage = error.message || '登录过程中发生未知错误';
        }
        
        // 显示错误消息
        ElMessage.error(errorMessage);
        
        // 只有在真正的登录失败时才记录失败次数（排除网络错误、服务器错误）
        if (errorType !== 'NETWORK_ERROR' && errorType !== 'SERVER_ERROR') {
          await recordLoginFailure(loginForm.username, errorType);
          
          // 如果达到最大尝试次数，显示锁定警告
          if (loginAttempts.value >= maxAttempts) {
            ElMessage.warning(`登录失败次数过多，账户已被临时锁定 ${lockoutDuration / (60 * 1000)} 分钟`);
          } else {
            const remainingAttempts = maxAttempts - loginAttempts.value;
            ElMessage.warning(`还有 ${remainingAttempts} 次尝试机会`);
          }
        }
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

// 跳转到忘记密码页面
const goToForgotPassword = () => {
  router.push('/forgot-password')
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <!-- 账户锁定警告 -->
      <el-alert
        v-if="isLockedOut"
        type="error"
        :title="`账户已被临时锁定`"
        :description="`连续登录失败次数过多，请在 ${remainingLockoutTime} 分钟后重试。`"
        show-icon
        :closable="false"
        class="lockout-alert"
      />
      <div class="login-header">
        <div class="logo">
          <img src="/images/login_background.avif" alt="水果商城" class="logo-image" />
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
          <a @click="goToForgotPassword" class="forgot-password">忘记密码?</a>
        </div>
        
        <el-button 
          type="primary" 
          class="login-button" 
          :loading="loading"
          :disabled="isLockedOut"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : isLockedOut ? `锁定中 (${remainingLockoutTime}分钟)` : '登录' }}
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
  background-image: url('/images/login_background.avif');
  background-size: cover;
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
  /* 确保在小屏幕上有足够的宽度 */
  min-width: 320px;
  animation: fadeIn 0.5s ease-out;
  /* 添加边框增强视觉效果 */
  border: 1px solid rgba(255, 255, 255, 0.2);

  .lockout-alert {
    margin-bottom: 20px;
    border-radius: 8px;
  }

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
    
    .logo-image {
      width: 40px;
      height: 40px;
      object-fit: contain;
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
@media (max-width: 992px) {
  .login-page {
    padding: 20px 15px;
  }
  
  .login-card {
    max-width: 420px;
    padding: 35px 30px;
  }
}

@media (max-width: 768px) {
  .login-page {
    padding: 15px 10px;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .login-card {
    width: 100%;
    max-width: 400px;
    padding: 30px 25px;
    margin: 0;
  }
  
  .login-header {
    margin-bottom: 25px;
    
    .logo {
      width: 55px;
      height: 55px;
      margin-bottom: 14px;
    }
    
    h1 {
      font-size: 1.8rem;
      margin-bottom: 8px;
    }
    
    p {
      font-size: 1rem;
    }
  }
  
  .el-form {
    .el-form-item {
      margin-bottom: 18px;
      
      .el-form-item__label {
        font-size: 0.95rem;
        padding-bottom: 6px;
      }
    }
    
    .el-input {
      .el-input__inner {
        height: 44px;
        font-size: 1rem;
        padding: 0 15px;
      }
    }
  }
  
  .form-actions {
    margin-bottom: 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    
    .el-checkbox {
      .el-checkbox__label {
        font-size: 0.9rem;
      }
    }
    
    .forgot-password {
      font-size: 0.9rem;
      align-self: flex-end;
    }
  }
  
  .login-actions {
    margin-top: 25px;
    
    .el-button {
      height: 46px;
      font-size: 1rem;
    }
  }
  
  .register-link {
    margin-top: 20px;
    font-size: 0.95rem;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 10px 8px;
  }
  
  .login-card {
    padding: 25px 20px;
    border-radius: 12px;
    /* 增加手机版容器宽度 */
    width: 90%;
    min-width: 300px;
  }
  
  .login-header {
    margin-bottom: 20px;
    
    .logo {
      width: 50px;
      height: 50px;
      margin-bottom: 12px;
    }
    
    h1 {
      font-size: 1.6rem;
      margin-bottom: 6px;
    }
    
    p {
      font-size: 0.95rem;
    }
  }
  
  .el-form {
    .el-form-item {
      margin-bottom: 16px;
      
      .el-form-item__label {
        font-size: 0.9rem;
      }
    }
    
    .el-input {
      .el-input__inner {
        height: 42px;
        font-size: 0.95rem;
        padding: 0 12px;
      }
    }
  }
  
  .form-actions {
    margin-bottom: 18px;
    gap: 10px;
    
    .el-checkbox {
      .el-checkbox__label {
        font-size: 0.85rem;
      }
    }
    
    .forgot-password {
      font-size: 0.85rem;
    }
  }
  
  .login-actions {
    margin-top: 20px;
    
    .el-button {
      height: 44px;
      font-size: 0.95rem;
      border-radius: 6px;
    }
  }
  
  .register-link {
    margin-top: 18px;
    font-size: 0.9rem;
  }
}

/* 超小屏幕适配 (iPhone SE等) */
@media (max-width: 375px) {
  .login-page {
    padding: 8px 5px;
  }
  
  .login-card {
    padding: 20px 15px;
    /* 调整超小屏幕的容器宽度 */
    width: 95%;
    min-width: 280px;
  }
  
  .login-header {
    .logo {
      width: 45px;
      height: 45px;
    }
    
    h1 {
      font-size: 1.5rem;
    }
    
    p {
      font-size: 0.9rem;
    }
  }
  
  .el-form {
    .el-input {
      .el-input__inner {
        height: 40px;
        font-size: 0.9rem;
        padding: 0 10px;
      }
    }
  }
  
  .login-actions {
    .el-button {
      height: 42px;
      font-size: 0.9rem;
    }
  }
}

/* 横屏模式适配 */
@media (max-height: 600px) and (orientation: landscape) {
  .login-page {
    padding: 10px;
  }
  
  .login-card {
    padding: 20px 25px;
  }
  
  .login-header {
    margin-bottom: 15px;
    
    .logo {
      width: 40px;
      height: 40px;
      margin-bottom: 8px;
    }
    
    h1 {
      font-size: 1.4rem;
      margin-bottom: 4px;
    }
    
    p {
      font-size: 0.9rem;
    }
  }
  
  .el-form {
    .el-form-item {
      margin-bottom: 12px;
    }
  }
  
  .form-actions {
    margin-bottom: 15px;
  }
  
  .login-actions {
    margin-top: 15px;
  }
  
  .register-link {
    margin-top: 12px;
  }
}
</style>