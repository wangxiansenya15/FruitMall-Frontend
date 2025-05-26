<script setup>
import { ref, reactive, computed } from 'vue'
import { useUserStore } from '../stores'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()

// 用户信息
const user = computed(() => userStore.user)

// 表单数据
const profileForm = reactive({
  username: user.value?.username || '',
  email: user.value?.email || '',
  phone: user.value?.phone || '',
  address: user.value?.address || '',
  avatar: user.value?.avatar || ''
})

// 表单验证规则
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度应为3-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
}

// 表单引用
const profileFormRef = ref(null)

// 加载状态
const loading = ref(false)

// 更新个人信息
const updateProfile = () => {
  if (!profileFormRef.value) return
  
  profileFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      
      try {
        // 调用后端API: PATCH /api/user/profile
        // 参数:
        //   - username: 用户名
        //   - email: 邮箱
        //   - phone: 手机号
        //   - address: 地址
        //   - avatar: 头像URL
        // 返回值: 更新后的完整User对象
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // 更新用户信息
        userStore.updateProfile({
          ...profileForm
        })
        
        ElMessage.success('个人信息更新成功')
      } catch (error) {
        ElMessage.error('更新失败，请稍后再试')
        console.error('更新失败:', error)
      } finally {
        loading.value = false
      }
    } else {
      return false
    }
  })
}

// 头像上传相关
const avatarUrl = ref(user.value?.avatar || '')

const handleAvatarSuccess = (response, uploadFile) => {
  // 模拟上传成功后获取URL
  avatarUrl.value = URL.createObjectURL(uploadFile.raw)
  profileForm.avatar = avatarUrl.value
  ElMessage.success('头像上传成功')
}

const beforeAvatarUpload = (file) => {
  const isJPG = file.type === 'image/jpeg'
  const isPNG = file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG && !isPNG) {
    ElMessage.error('头像只能是JPG或PNG格式!')
  }
  if (!isLt2M) {
    ElMessage.error('头像大小不能超过2MB!')
  }
  return (isJPG || isPNG) && isLt2M
}

// 安全设置相关
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 密码验证规则
const validatePass = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请输入新密码'))
  } else {
    if (passwordForm.confirmPassword !== '') {
      passwordFormRef.value.validateField('confirmPassword')
    }
    callback()
  }
}

const validatePass2 = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入新密码'))
  } else if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入密码不一致'))
  } else {
    callback()
  }
}

const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, validator: validatePass, trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度应为6-20个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validatePass2, trigger: 'blur' }
  ]
}

// 密码表单引用
const passwordFormRef = ref(null)

// 密码更新加载状态
const passwordLoading = ref(false)

// 更新密码
const updatePassword = () => {
  if (!passwordFormRef.value) return
  
  passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      passwordLoading.value = true
      
      try {
        // 模拟更新请求
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // 重置表单
        passwordForm.currentPassword = ''
        passwordForm.newPassword = ''
        passwordForm.confirmPassword = ''
        
        ElMessage.success('密码更新成功')
      } catch (error) {
        ElMessage.error('更新失败，请稍后再试')
        console.error('更新失败:', error)
      } finally {
        passwordLoading.value = false
      }
    } else {
      return false
    }
  })
}

// 活跃标签
const activeTab = ref('profile')
</script>

<template>
  <div class="profile-container">
    <div class="profile-header">
      <h1>个人中心</h1>
    </div>
    
    <div class="profile-content">
      <el-tabs v-model="activeTab" class="profile-tabs">
        <!-- 个人信息标签 -->
        <el-tab-pane label="个人信息" name="profile">
          <div class="profile-card">
            <div class="avatar-section">
              <el-upload
                class="avatar-uploader"
                action="#"
                :show-file-list="false"
                :on-success="handleAvatarSuccess"
                :before-upload="beforeAvatarUpload"
                :auto-upload="false"
              >
                <img v-if="avatarUrl" :src="avatarUrl" class="avatar" />
                <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
              </el-upload>
              <div class="avatar-hint">点击上传头像</div>
            </div>
            
            <div class="form-section">
              <el-form
                ref="profileFormRef"
                :model="profileForm"
                :rules="rules"
                label-position="top"
              >
                <el-form-item prop="username" label="用户名">
                  <el-input 
                    v-model="profileForm.username"
                    placeholder="请输入用户名"
                  />
                </el-form-item>
                
                <el-form-item prop="email" label="邮箱">
                  <el-input 
                    v-model="profileForm.email"
                    placeholder="请输入邮箱地址"
                  />
                </el-form-item>
                
                <el-form-item prop="phone" label="手机号码">
                  <el-input 
                    v-model="profileForm.phone"
                    placeholder="请输入手机号码"
                  />
                </el-form-item>
                
                <el-form-item prop="address" label="收货地址">
                  <el-input 
                    v-model="profileForm.address"
                    type="textarea"
                    :rows="2"
                    placeholder="请输入收货地址"
                  />
                </el-form-item>
                
                <el-form-item>
                  <el-button 
                    type="primary" 
                    class="update-button" 
                    :loading="loading"
                    @click="updateProfile"
                  >
                    保存修改
                  </el-button>
                </el-form-item>
              </el-form>
            </div>
          </div>
        </el-tab-pane>
        
        <!-- 安全设置标签 -->
        <el-tab-pane label="安全设置" name="security">
          <div class="profile-card">
            <h2 class="section-title">修改密码</h2>
            
            <el-form
              ref="passwordFormRef"
              :model="passwordForm"
              :rules="passwordRules"
              label-position="top"
            >
              <el-form-item prop="currentPassword" label="当前密码">
                <el-input 
                  v-model="passwordForm.currentPassword"
                  type="password"
                  placeholder="请输入当前密码"
                  show-password
                />
              </el-form-item>
              
              <el-form-item prop="newPassword" label="新密码">
                <el-input 
                  v-model="passwordForm.newPassword"
                  type="password"
                  placeholder="请输入新密码"
                  show-password
                />
              </el-form-item>
              
              <el-form-item prop="confirmPassword" label="确认新密码">
                <el-input 
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  placeholder="请再次输入新密码"
                  show-password
                />
              </el-form-item>
              
              <el-form-item>
                <el-button 
                  type="primary" 
                  class="update-button" 
                  :loading="passwordLoading"
                  @click="updatePassword"
                >
                  更新密码
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
        
        <!-- 我的收藏标签 -->
        <el-tab-pane label="我的收藏" name="favorites">
          <div class="profile-card empty-section">
            <el-empty description="暂无收藏商品" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "sass:color";
.profile-container {
  padding-bottom: 40px;
}

.profile-header {
  margin-bottom: 24px;
  
  h1 {
    font-size: 1.8rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: #333;
  }
}

.profile-content {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.profile-tabs {
  padding: 0 20px;
}

.profile-card {
  padding: 20px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
}

.avatar-uploader {
  width: 120px;
  height: 120px;
  border: 1px dashed #d9d9d9;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
  
  &:hover {
    border-color: #ff6b6b;
  }
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 120px;
  height: 120px;
  line-height: 120px;
  text-align: center;
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-hint {
  margin-top: 8px;
  font-size: 0.9rem;
  color: #666;
}

.form-section {
  max-width: 500px;
  margin: 0 auto;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: #333;
}

.update-button {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  background-color: #ff6b6b;
  border-color: #ff6b6b;
  
  &:hover {
    background-color: color.adjust(#ff6b6b, $lightness: -5%);
    border-color: color.adjust(#ff6b6b, $lightness: -5%);
  }
}

.empty-section {
  padding: 40px 20px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .profile-card {
    padding: 20px 10px;
  }
}
</style>