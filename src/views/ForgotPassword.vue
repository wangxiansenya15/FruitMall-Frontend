<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/services/api'

const router = useRouter()

// 当前步骤：1-输入邮箱，2-验证码验证，3-重置密码
const currentStep = ref(1)

// 表单数据
const forgotForm = reactive({
  email: '',
  verificationCode: '',
  newPassword: '',
  confirmPassword: ''
})

// 表单验证规则
const validateNewPass = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请输入新密码'))
  } else {
    if (forgotForm.confirmPassword !== '') {
      // 如果确认密码已填写，则验证两次输入是否一致
      forgotFormRef.value.validateField('confirmPassword')
    }
    callback()
  }
}

const validateConfirmPass = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入新密码'))
  } else if (value !== forgotForm.newPassword) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  verificationCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码长度应为6位', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, validator: validateNewPass, trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度应为6-20个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPass, trigger: 'blur' }
  ]
}

// 表单引用
const forgotFormRef = ref(null)

// 加载状态
const loading = ref(false)

// 验证码倒计时
const countdown = ref(0)
let countdownTimer = null

// 发送验证码
const sendVerificationCode = async () => {
  if (!forgotForm.email) {
    ElMessage.warning('请先输入邮箱地址')
    return
  }
  
  try {
    loading.value = true
    
    // 调用后端API发送找回密码验证码
    await api.post('/auth/code', {
      email: forgotForm.email
    })
    
    // 开始倒计时
    countdown.value = 60
    countdownTimer = setInterval(() => {
      if (countdown.value <= 0) {
        clearInterval(countdownTimer)
        return
      }
      countdown.value--
    }, 1000)
    
    ElMessage.success('验证码已发送至您的邮箱，请查收')
    currentStep.value = 2
  } catch (error) {
    if (typeof error === 'string') {
      ElMessage.error(`验证码发送失败: ${error}`)
    } else {
      ElMessage.error(`验证码发送失败: ${error?.message || '未知错误，请稍后再试'}`)
    }
    console.error('验证码发送失败:', error)
  } finally {
    loading.value = false
  }
}

// 验证验证码
const verifyCode = async () => {
  if (!forgotForm.verificationCode) {
    ElMessage.warning('请输入验证码')
    return
  }
  
  try {
    loading.value = true
    
    // 调用后端API验证验证码
    await api.post('/auth/verify', {
      email: forgotForm.email,
      verificationCode: forgotForm.verificationCode
    })
    
    ElMessage.success('验证码验证成功')
    currentStep.value = 3
  } catch (error) {
    if (typeof error === 'string') {
      ElMessage.error(`验证码验证失败: ${error}`)
    } else {
      ElMessage.error(`验证码验证失败: ${error?.message || '验证码错误或已过期'}`)
    }
    console.error('验证码验证失败:', error)
  } finally {
    loading.value = false
  }
}

// 重置密码
const resetPassword = () => {
  if (!forgotFormRef.value) return
  
  forgotFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      
      try {
        // 调用后端API重置密码
        await api.post('/auth/reset', {
          email: forgotForm.email,
          verificationCode: forgotForm.verificationCode,
          newPassword: forgotForm.newPassword
        })
        
        ElMessage.success('密码重置成功，请使用新密码登录')
        router.push('/login')
      } catch (error) {
        if (typeof error === 'string') {
          ElMessage.error(`密码重置失败: ${error}`)
        } else {
          ElMessage.error(`密码重置失败: ${error?.message || '未知错误，请稍后再试'}`)
        }
        console.error('密码重置失败:', error)
      } finally {
        loading.value = false
      }
    }
  })
}

// 返回上一步
const goBack = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// 返回登录页
const goToLogin = () => {
  router.push('/login')
}

// 组件销毁时清理定时器
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<template>
  <div class="forgot-password-container">
    <div class="forgot-password-card">
      <div class="forgot-password-header">
        <div class="logo">
          <el-icon><Lock /></el-icon>
        </div>
        <h1>找回密码</h1>
        <p>{{ currentStep === 1 ? '请输入您的邮箱地址' : currentStep === 2 ? '请输入验证码' : '设置新密码' }}</p>
      </div>
      
      <!-- 步骤指示器 -->
      <div class="steps">
        <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
          <div class="step-number">1</div>
          <div class="step-title">输入邮箱</div>
        </div>
        <div class="step-line" :class="{ active: currentStep > 1 }"></div>
        <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
          <div class="step-number">2</div>
          <div class="step-title">验证邮箱</div>
        </div>
        <div class="step-line" :class="{ active: currentStep > 2 }"></div>
        <div class="step" :class="{ active: currentStep >= 3 }">
          <div class="step-number">3</div>
          <div class="step-title">重置密码</div>
        </div>
      </div>
      
      <el-form
        ref="forgotFormRef"
        :model="forgotForm"
        :rules="rules"
        label-position="left"
        label-width="100px"
      >
        <!-- 步骤1：输入邮箱 -->
        <div v-if="currentStep === 1">
          <el-form-item prop="email" label="邮箱地址">
            <el-input 
              v-model="forgotForm.email"
              placeholder="请输入您的邮箱地址"
              prefix-icon="Message"
            />
          </el-form-item>
          
          <el-button 
            type="primary" 
            class="action-button" 
            :loading="loading"
            @click="sendVerificationCode"
          >
            发送验证码
          </el-button>
        </div>
        
        <!-- 步骤2：验证验证码 -->
        <div v-if="currentStep === 2">
          <el-form-item prop="verificationCode" label="验证码">
            <div class="verification-input">
              <el-input 
                v-model="forgotForm.verificationCode"
                placeholder="请输入6位验证码"
                prefix-icon="Key"
                maxlength="6"
              />
              <el-button 
                :disabled="countdown > 0"
                @click="sendVerificationCode"
                class="resend-button"
              >
                {{ countdown > 0 ? `${countdown}s后重发` : '重新发送' }}
              </el-button>
            </div>
          </el-form-item>
          
          <div class="button-group">
            <el-button @click="goBack">上一步</el-button>
            <el-button 
              type="primary" 
              :loading="loading"
              @click="verifyCode"
            >
              验证
            </el-button>
          </div>
        </div>
        
        <!-- 步骤3：重置密码 -->
        <div v-if="currentStep === 3">
          <el-form-item prop="newPassword" label="新密码">
            <el-input 
              v-model="forgotForm.newPassword"
              type="password"
              placeholder="请输入新密码"
              prefix-icon="Lock"
              show-password
            />
          </el-form-item>
          
          <el-form-item prop="confirmPassword" label="确认密码">
            <el-input 
              v-model="forgotForm.confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              prefix-icon="Lock"
              show-password
            />
          </el-form-item>
          
          <div class="button-group">
            <el-button @click="goBack">上一步</el-button>
            <el-button 
              type="primary" 
              :loading="loading"
              @click="resetPassword"
            >
              重置密码
            </el-button>
          </div>
        </div>
      </el-form>
      
      <div class="login-link">
        想起密码了? <a @click="goToLogin">返回登录</a>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "sass:color";

.forgot-password-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
  padding: 40px 20px;
}

.forgot-password-card {
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  width: 100%;
  max-width: 580px;
  padding: 40px;
  animation: fadeIn 0.5s ease-out;

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

.forgot-password-header {
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

.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
  
  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #e0e0e0;
      color: #999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      margin-bottom: 8px;
      transition: all 0.3s;
    }
    
    .step-title {
      font-size: 0.9rem;
      color: #999;
      transition: color 0.3s;
    }
    
    &.active {
      .step-number {
        background-color: #ff6b6b;
        color: white;
      }
      
      .step-title {
        color: #ff6b6b;
      }
    }
    
    &.completed {
      .step-number {
        background-color: #67c23a;
        color: white;
      }
      
      .step-title {
        color: #67c23a;
      }
    }
  }
  
  .step-line {
    width: 60px;
    height: 2px;
    background-color: #e0e0e0;
    margin: 0 20px;
    transition: background-color 0.3s;
    
    &.active {
      background-color: #67c23a;
    }
  }
}

.verification-input {
  display: flex;
  gap: 12px;
  
  .el-input {
    flex: 1;
  }
  
  .resend-button {
    white-space: nowrap;
  }
}

.action-button {
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

.button-group {
  display: flex;
  gap: 12px;
  
  .el-button {
    flex: 1;
    padding: 12px;
    font-size: 1rem;
    border-radius: 8px;
    
    &[type="primary"] {
      background-color: #ff6b6b;
      border-color: #ff6b6b;
      
      &:hover {
        background-color: color.adjust(#ff6b6b, $lightness: -5%);
        border-color: color.adjust(#ff6b6b, $lightness: -5%);
      }
    }
  }
}

.login-link {
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
  .forgot-password-card {
    padding: 30px 25px;
  }
  
  .steps {
    .step-line {
      width: 40px;
      margin: 0 10px;
    }
  }
}

@media (max-width: 480px) {
  .forgot-password-card {
    padding: 25px 20px;
  }
  
  .verification-input {
    flex-direction: column;
    
    .resend-button {
      width: 100%;
    }
  }
  
  .button-group {
    flex-direction: column;
  }
}
</style>