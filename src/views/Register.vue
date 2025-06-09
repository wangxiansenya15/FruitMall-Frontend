<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores'
import { ElMessage } from 'element-plus'

// 在组件中导入 Axios 实例
import api from '@/services/api'

const router = useRouter()
const userStore = useUserStore()

// 表单数据
const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  verificationCode: '',
  agreement: false
})

// 表单验证规则
const validatePass = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请输入密码'))
  } else {
    if (registerForm.confirmPassword !== '') {
      // 如果确认密码已填写，则验证两次输入是否一致
      registerFormRef.value.validateField('confirmPassword')
    }
    callback()
  }
}

const validatePass2 = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const validateAgreement = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请阅读并同意用户协议'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度应为3-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: true, validator: validatePass, trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度应为6-20个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validatePass2, trigger: 'blur' }
  ],
  verificationCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码长度应为6位', trigger: 'blur' }
  ],
  agreement: [
    { validator: validateAgreement, trigger: 'change' }
  ]
}

// 表单引用
const registerFormRef = ref(null)

// 加载状态
const loading = ref(false)

// 验证码倒计时
const countdown = ref(0)
let countdownTimer = null

// 获取验证码
const getVerificationCode = async () => {
  if (!registerForm.email) {
    ElMessage.warning('请先输入邮箱地址')
    return
  }
  
  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(registerForm.email)) {
    ElMessage.error('请输入正确的邮箱格式')
    return
  }
  
  try {    // 调用验证码接口 - 使用相对路径，通过Vite代理转发请求
    await api.post('/auth/code', {
      email: registerForm.email
    })
    
    // 设置60秒倒计时
    countdown.value = 60
    countdownTimer = setInterval(() => {
      if (countdown.value <= 0) {
        clearInterval(countdownTimer)
        return
      }
      countdown.value--
    }, 1000)
    
    ElMessage.success('验证码已发送至您的邮箱，请查收')
  } catch (error) {
    // 错误处理 - 注意：api.js中的响应拦截器已经处理了error.response.data.message
    if (typeof error === 'string') {
      // 如果error是字符串，说明是从api.js的拦截器中抛出的
      ElMessage.error(`验证码发送失败: ${error}`)
    } else if (error && error.message && (error.message.includes('CORS') || error.message.includes('cross-origin'))) {
      // 处理CORS错误
      ElMessage.error('跨域请求失败，请联系后端开发人员检查CORS配置')
      console.error('CORS错误详情:', {
        time: new Date().toISOString(),
        requestUrl: '/api/auth/code',
        error: error.message
      })
    } else if (error && error.request) {
      // 请求已发出但没有收到响应
      ElMessage.error('网络连接异常，请检查网络后重试')
    } else {
      // 其他错误情况
      ElMessage.error(`验证码发送失败: ${error?.message || '未知错误，请稍后再试'}`)
    }
    
    // 添加更详细的错误日志记录
    console.error('验证码发送失败详情:', {
      time: new Date().toISOString(),
      email: registerForm.email,
      error: typeof error === 'object' ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      } : error
    })
  }
}

// 验证验证码
const verifyCode = async () => {
  if (!registerForm.verificationCode) {
    ElMessage.warning('请输入验证码')
    return false
  }
  
  try {
    loading.value = true
    
    // 调用后端API验证验证码
    await api.post('/auth/verify', {
      email: registerForm.email,
      verificationCode: registerForm.verificationCode
    })
    
    return true
  } catch (error) {
    if (typeof error === 'string') {
      ElMessage.error(`验证码验证失败: ${error}`)
    } else {
      ElMessage.error(`验证码验证失败: ${error?.message || '验证码错误或已过期'}`)
    }
    console.error('验证码验证失败:', error)
    return false
  } finally {
    loading.value = false
  }
}

// 注册处理
const handleRegister = () => {
  if (!registerFormRef.value) return
  
  registerFormRef.value.validate(async (valid) => {
    if (valid) {
      // 先验证验证码
      const isCodeVerified = await verifyCode()
      if (!isCodeVerified) return
      
      loading.value = true
      
      try {
        // 调用后端API: POST /api/auth/register
        // 参数:
        //   - username: 用户名
        //   - email: 邮箱
        //   - password: 密码
        //   - verificationCode: 验证码
        // 返回值: User对象 - 包含用户ID和基本信息
        const userData = await api.post('/auth/register', {
          username: registerForm.username,
          email: registerForm.email,
          password: registerForm.password,
          verificationCode: registerForm.verificationCode
        })
        
        // 注册成功，存储用户信息
        userStore.login(userData)
        
        ElMessage.success('注册成功')
        router.push('/')
      } catch (error) {
        // 错误处理 - 与getVerificationCode保持一致的错误处理模式
        if (typeof error === 'string') {
          // 如果error是字符串，说明是从api.js的拦截器中抛出的
          ElMessage.error(`注册失败: ${error}`)
        } else if (error && error.message && (error.message.includes('CORS') || error.message.includes('cross-origin'))) {
          // 处理CORS错误
          ElMessage.error('跨域请求失败，请联系后端开发人员检查CORS配置')
        } else if (error && error.request) {
          // 请求已发出但没有收到响应
          ElMessage.error('网络连接异常，请检查网络后重试')
        } else {
          // 其他错误情况
          ElMessage.error(`注册失败: ${error?.message || '未知错误，请稍后再试'}`)
        }
        
        // 添加详细错误日志记录
        console.error('注册失败详情:', {
          time: new Date().toISOString(),
          formData: {
            username: registerForm.username,
            email: registerForm.email
          },
          error: typeof error === 'object' ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            response: error.response?.data
          } : error
        })
      } finally {
        loading.value = false
      }
    } else {
      return false
    }
  })
}

// 跳转到登录页
const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <div class="logo">
          <img src="/images/login_background.avif" alt="水果商城" class="logo-image" />
        </div>
        <h1>创建账户</h1>
        <p>加入水果商城，享受新鲜水果配送服务</p>
      </div>
      
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="rules"
        label-position="left"
        label-width="100px"
        @keyup.enter="handleRegister"
      >
        <el-form-item prop="username" label="用户名">
          <el-input 
            v-model="registerForm.username"
            placeholder="请输入用户名"
            prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="email" label="邮箱">
          <el-input 
            v-model="registerForm.email"
            placeholder="请输入邮箱地址"
            prefix-icon="Message"
          />
        </el-form-item>
        
        <el-form-item prop="password" label="密码">
          <el-input 
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item prop="confirmPassword" label="确认密码">
          <el-input 
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item prop="verificationCode" label="验证码">
          <div class="verification-code-container">
            <el-input
              v-model="registerForm.verificationCode"
              placeholder="请输入验证码"
              prefix-icon="Key"
              style="width: 60%"
            />
            <el-button 
              type="primary" 
              :disabled="!registerForm.email || countdown > 0"
              @click="getVerificationCode"
              style="width: 38%; margin-left: 2%"
            >
              {{ countdown > 0 ? `${countdown}秒后重试` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>
        
        <el-form-item prop="agreement">
          <el-checkbox v-model="registerForm.agreement">我已阅读并同意<a href="#">用户协议</a>和<a href="#">隐私政策</a></el-checkbox>
        </el-form-item>
        
        <el-button 
          type="primary" 
          class="register-button" 
          :loading="loading"
          @click="handleRegister"
        >
          注册
        </el-button>
        
        <div class="login-link">
          已有账户? <a @click="goToLogin">立即登录</a>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.register-container {
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

.register-card {
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

.register-header {
  text-align: center;
  margin-bottom: 30px;
  
  .logo {
    width: 60px;
    height: 60px;
    margin: 0 auto 20px;
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

.register-actions {
  margin-top: 30px;
  
  .el-button {
    width: 100%;
    height: 48px;
    font-size: 1.1rem;
  }
}

.login-link {
  margin-top: 24px;
  text-align: center;
  font-size: 1rem;
  color: #666;
  
  a {
    color: #ff6b6b;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
}

/* 响应式设计 */
@media (max-width: 992px) {
  .register-page {
    padding: 20px 15px;
  }
  
  .register-card {
    max-width: 450px;
    padding: 35px 30px;
  }
}

@media (max-width: 768px) {
  .register-page {
    padding: 15px 10px;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .register-card {
    width: 100%;
    max-width: 420px;
    padding: 30px 25px;
    margin: 0;
  }
  
  .register-header {
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
    
    .verification-group {
      .el-input-group {
        .el-input {
          .el-input__inner {
            height: 44px;
          }
        }
        
        .el-input-group__append {
          .el-button {
            height: 44px;
            font-size: 0.9rem;
            padding: 0 12px;
          }
        }
      }
    }
    
    .el-checkbox {
      .el-checkbox__label {
        font-size: 0.9rem;
        line-height: 1.4;
      }
    }
  }
  
  .register-actions {
    margin-top: 25px;
    
    .el-button {
      height: 46px;
      font-size: 1rem;
    }
  }
  
  .login-link {
    margin-top: 20px;
    font-size: 0.95rem;
  }
}

@media (max-width: 480px) {
  .register-page {
    padding: 10px 8px;
  }
  
  .register-card {
    padding: 25px 20px;
    border-radius: 12px;
    /* 增加手机版容器宽度 */
    width: 90%;
    min-width: 300px;
  }
  
  .register-header {
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
    
    .verification-group {
      .el-input-group {
        .el-input {
          .el-input__inner {
            height: 42px;
            font-size: 0.95rem;
          }
        }
        
        .el-input-group__append {
          .el-button {
            height: 42px;
            font-size: 0.85rem;
            padding: 0 10px;
          }
        }
      }
    }
    
    .el-checkbox {
      .el-checkbox__label {
        font-size: 0.85rem;
        line-height: 1.3;
      }
    }
  }
  
  .register-actions {
    margin-top: 20px;
    
    .el-button {
      height: 44px;
      font-size: 0.95rem;
      border-radius: 6px;
    }
  }
  
  .login-link {
    margin-top: 18px;
    font-size: 0.9rem;
  }
}

/* 超小屏幕适配 (iPhone SE等) */
@media (max-width: 375px) {
  .register-page {
    padding: 8px 5px;
  }
  
  .register-card {
    padding: 20px 15px;
    /* 调整超小屏幕的容器宽度 */
    width: 95%;
    min-width: 280px;
  }
  
  .register-header {
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
    
    .verification-group {
      .el-input-group {
        .el-input {
          .el-input__inner {
            height: 40px;
          }
        }
        
        .el-input-group__append {
          .el-button {
            height: 40px;
            font-size: 0.8rem;
            padding: 0 8px;
          }
        }
      }
    }
  }
  
  .register-actions {
    .el-button {
      height: 42px;
      font-size: 0.9rem;
    }
  }
}

/* 横屏模式适配 */
@media (max-height: 650px) and (orientation: landscape) {
  .register-page {
    padding: 10px;
  }
  
  .register-card {
    padding: 20px 25px;
  }
  
  .register-header {
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
  
  .register-actions {
    margin-top: 15px;
  }
  
  .login-link {
    margin-top: 12px;
  }
}
</style>