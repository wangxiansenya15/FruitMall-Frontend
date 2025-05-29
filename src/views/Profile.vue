<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores'
import { ElMessage } from 'element-plus'
import api from '../services/api' // 导入API服务用于后端接口调用

const router = useRouter()
const userStore = useUserStore()

// 用户信息
const user = computed(() => userStore.user)

// 加载用户信息状态
const loadingUserInfo = ref(false)

// 获取用户详细信息
const fetchUserInfo = async () => {
  if (!userStore.isAuthenticated) return
  
  loadingUserInfo.value = true
  try {
    // 调用后端API获取最新的用户详细信息
    // 由于api.js响应拦截器已经处理了响应格式，直接获取data层数据
    const userData = await api.get('/user/profile')
    
    // 验证响应数据格式
    if (!userData || typeof userData !== 'object') {
      throw new Error('服务器响应数据格式错误')
    }
    
    // 提取details对象中的数据
    const userDetails = userData.details || {}
    
    // 构建完整的用户信息对象
    const completeUserData = {
      username: userData.username,
      nickname: userData.nickname,
      email: userData.email,
      phone: userData.phone,
      // 从details中提取字段并添加到用户对象根级别
      description: userDetails.description || '',
      avatar: userDetails.avatar || '',
      age: userDetails.age || '',
      gender: userDetails.gender || '保密',
      // 将单个地址转换为数组格式
      addresses: userDetails.address ? [userDetails.address] : []
    }
    
    // 更新用户信息到store
    userStore.updateProfile(completeUserData)
    
    // 更新表单数据
    initFormWithUserData(completeUserData)
  } catch (error) {
    console.error('获取用户信息失败:', error)
    // 使用已有的用户信息初始化表单
    initFormWithUserData()
  } finally {
    loadingUserInfo.value = false
  }
}

// 使用已有的用户信息初始化表单
const initFormWithUserData = (userData = null) => {
  const data = userData || user.value || {}
  
  profileForm.username = data.username || ''
  profileForm.nickname = data.nickname || ''
  profileForm.email = data.email || ''
  profileForm.phone = data.phone || ''
  profileForm.addresses = Array.isArray(data.addresses) ? [...data.addresses] : []
  profileForm.avatar = data.avatar || ''
  profileForm.gender = data.gender || '保密'
  profileForm.age = data.age || ''
  profileForm.description = data.description || ''
  
  avatarUrl.value = data.avatar || ''
}

// 组件挂载时获取用户信息和收藏列表
onMounted(() => {
  fetchUserInfo()
  fetchFavorites()
})

// 性别选项
const genderOptions = [
  { label: '男', value: '男' },
  { label: '女', value: '女' },
  { label: '保密', value: '保密' }
]

// 表单数据
const profileForm = reactive({
  username: '',
  nickname: '', // 新增昵称字段
  email: '',
  phone: '',
  addresses: [], // 改为数组，支持多个地址
  avatar: '',
  gender: '保密', // 新增性别字段，默认为保密
  age: '', // 新增年龄字段
  description: '' // 新增用户描述字段
})

// 新增地址
const newAddress = ref('')

// 添加新地址
const addAddress = () => {
  if (newAddress.value.trim()) {
    profileForm.addresses.push(newAddress.value.trim())
    newAddress.value = ''
  }
}

// 删除地址
const removeAddress = (index) => {
  profileForm.addresses.splice(index, 1)
}

// 表单验证规则
const rules = {
  nickname: [
    { max: 20, message: '昵称长度不应超过20个字符', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  age: [
    { pattern: /^(?:[1-9]\d?|1[0-4]\d|150)$/, message: '请输入1-150之间的有效年龄', trigger: 'blur' }
  ],
  description: [
    { max: 500, message: '描述长度不应超过500个字符', trigger: 'blur' }
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
        // 验证表单数据完整性
        console.log('当前表单数据:', profileForm)
        
        // 确保必填字段不为空
        if (!profileForm.nickname || !profileForm.email) {
          ElMessage.error('昵称和邮箱不能为空')
          loading.value = false
          return
        }
        
        // 构建符合后端API格式的请求数据
        const requestData = {
          nickname: profileForm.nickname || '',
          email: profileForm.email || '',
          phone: profileForm.phone || '',
          // 将用户详细信息放入details对象中
          details: {
            description: profileForm.description || '',
            avatar: profileForm.avatar || '',
            gender: profileForm.gender || '保密',
            age: profileForm.age ? parseInt(profileForm.age) : null, // 确保age是数字类型
            // 如果有多个地址，只使用第一个地址
            address: profileForm.addresses.length > 0 ? profileForm.addresses[0] : ''
          }
        }
        
        // 调试日志：输出发送给后端的数据
        console.log('发送给后端的数据:', JSON.stringify(requestData, null, 2))
        
        // 调用后端API: PUT /api/users/profile
        // 由于api.js响应拦截器已经处理了响应格式，直接获取data层数据
        console.log('正在调用API: PUT /user/profile')
        const response = await api.put('/user/profile', requestData)
        console.log('原始响应对象:', response)
        
        // 获取响应数据
        const responseData = response
        console.log('处理后的响应数据:', responseData)
        console.log('响应数据类型:', typeof responseData)
        
        // 如果响应数据为null、undefined或空对象，但后端已经成功处理（根据用户反馈），
        // 这可能是后端返回了空响应体，我们应该将其视为成功操作
        if (!responseData || (typeof responseData === 'object' && Object.keys(responseData).length === 0)) {
          console.log('收到空响应，但后端已成功处理，重新获取用户信息')
          await fetchUserInfo()
          ElMessage.success('个人信息更新成功')
          return
        }
        
        // 检查是否是简单操作结果（api.js拦截器包装后的格式：{result, message, code}）
        if (responseData.result !== undefined && responseData.message) {
          // 这是一个操作结果响应，更新成功但没有返回完整用户数据
          // 需要重新获取用户信息
          await fetchUserInfo()
          ElMessage.success(responseData.message || '个人信息更新成功')
        } else if (typeof responseData === 'object' && responseData.username) {
          // 检查是否是完整的用户数据对象
          // 这是包含完整用户数据的响应
          const userData = responseData
          
          // 提取details对象中的数据
          const userDetails = userData.details || {}
          
          // 构建完整的用户信息对象
          const completeUserData = {
            username: userData.username,
            nickname: userData.nickname,
            email: userData.email,
            phone: userData.phone,
            description: userDetails.description || '',
            avatar: userDetails.avatar || '',
            age: userDetails.age || '',
            gender: userDetails.gender || '保密',
            addresses: userDetails.address ? [userDetails.address] : []
          }
          
          // 更新用户信息到本地存储
          userStore.updateProfile(completeUserData)
          
          ElMessage.success('个人信息更新成功')
        } else {
          // 处理其他响应格式
          console.warn('收到未预期的响应格式:', responseData)
          // 如果响应中包含message，显示它；否则重新获取用户信息确保数据同步
          if (responseData.message) {
            ElMessage.success(responseData.message)
          } else {
            ElMessage.success('个人信息更新成功')
          }
          // 重新获取用户信息以确保数据同步
          await fetchUserInfo()
        }
      } catch (error) {
        ElMessage.error(error.message || '更新失败，请稍后再试')
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
const avatarUrl = ref('')

// 头像上传状态
const avatarUploading = ref(false)

// 上传头像到服务器
const uploadAvatar = async (file) => {
  try {
    // 创建FormData对象用于文件上传
    const formData = new FormData()
    formData.append('file', file)
    
    // 调用后端API上传头像
    // 由于api.js响应拦截器已经处理了响应格式，直接获取data层数据
    const responseData = await api.post('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    // 验证响应数据格式并获取头像URL
    if (!responseData || !responseData.url) {
      throw new Error('服务器未返回有效的头像URL')
    }
    
    return responseData.url
  } catch (error) {
    console.error('头像上传失败:', error)
    throw error
  }
}

// 头像上传成功处理
const handleAvatarSuccess = async (response, uploadFile) => {
  try {
    avatarUploading.value = true
    
    // 上传头像到服务器
    const newAvatarUrl = await uploadAvatar(uploadFile.raw)
    
    // 更新头像URL
    avatarUrl.value = newAvatarUrl
    profileForm.avatar = newAvatarUrl
    
    // 更新用户信息
    const updatedUserData = {
      ...user.value,
      details: {
        ...user.value.details,
        avatar: newAvatarUrl
      }
    }
    userStore.updateProfile(updatedUserData)
    
    ElMessage.success('头像上传成功')
  } catch (error) {
    // 上传失败时使用本地预览
    avatarUrl.value = URL.createObjectURL(uploadFile.raw)
    profileForm.avatar = avatarUrl.value
    
    ElMessage.warning('头像已预览，但上传到服务器失败')
    console.error('头像上传失败:', error)
  } finally {
    avatarUploading.value = false
  }
}

const beforeAvatarUpload = (file) => {
  const isJPG = file.type === 'image/jpeg'
  const isPNG = file.type === 'image/png'
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isJPG && !isPNG) {
    ElMessage.error('头像只能是JPG或PNG格式!')
  }
  if (!isLt10M) {
    ElMessage.error('头像大小不能超过10MB!')
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
        // 调用后端API: PUT /api/user/password
        // 请求参数: { oldPassword: string, newPassword: string }
        // 返回值: { code: 200, message: string, data: any }
        const response = await api.put('/user/password', {
          oldPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
        
        // 密码修改成功
        ElMessage.success('密码修改成功')
        
        // 重置表单
        passwordForm.currentPassword = ''
        passwordForm.newPassword = ''
        passwordForm.confirmPassword = ''
        
        // 可选：重置表单验证状态
        passwordFormRef.value.resetFields()
        
      } catch (error) {
        console.error('密码修改失败:', error)
        
        // 处理业务逻辑错误（通过api拦截器处理的错误）
        if (error.code) {
          switch (error.code) {
            case 401:
              ElMessage.error('当前密码不正确，请重新输入')
              break
            case 403:
              ElMessage.error('权限不足或登录已过期，请重新登录')
              // 可选：跳转到登录页
              // router.push('/login')
              break
            case 400:
              ElMessage.error('请求参数错误，请检查输入信息')
              break
            default:
              ElMessage.error(error.message || '密码修改失败，请稍后重试')
          }
        }
        // 处理HTTP错误
        else if (error.response) {
          const { status } = error.response
          switch (status) {
            case 401:
              ElMessage.error('当前密码不正确')
              break
            case 403:
              ElMessage.error('权限不足，请重新登录')
              break
            case 422:
              ElMessage.error('密码格式不符合要求')
              break
            case 500:
              ElMessage.error('服务器内部错误，请稍后重试')
              break
            default:
              ElMessage.error(error.message || '密码修改失败，请稍后重试')
          }
        }
        // 处理网络错误
        else {
          ElMessage.error(error.message || '网络连接失败，请检查网络设置')
        }
      } finally {
        passwordLoading.value = false
      }
    } else {
      ElMessage.warning('请正确填写所有必填项')
      return false
    }
  })
}

// 活跃标签
const activeTab = ref('profile')

// 收藏相关状态
const favorites = ref([])
const favoritesLoading = ref(false)
const favoritesError = ref('')

/**
 * 获取用户收藏列表
 * 接口地址: GET /api/user/favorites
 * 请求参数: 无
 * 返回数据格式: {
 *   code: 200,
 *   data: [
 *     {
 *       id: number,        // 收藏项ID
 *       productId: number, // 商品ID
 *       addTime: string,   // 添加时间
 *       product: {         // 商品详细信息
 *         id: number,
 *         name: string,
 *         price: number,
 *         imageUrl: string,
 *         description: string,
 *         category: string,
 *         stock: number,
 *         rating: number
 *       }
 *     }
 *   ],
 *   message: string
 * }
 */
const fetchFavorites = async () => {
  if (!userStore.isAuthenticated) return
  
  favoritesLoading.value = true
  favoritesError.value = ''
  
  try {
    console.log('正在获取收藏列表...')
    const response = await api.get('/user/favorites')
    console.log('收藏列表响应:', response)
    
    // 处理响应数据
    const favoritesData = Array.isArray(response) ? response : (response.data || [])
    favorites.value = favoritesData
    
    console.log('收藏列表加载成功:', favorites.value.length, '个商品')
  } catch (error) {
    console.error('获取收藏列表失败:', error)
    favoritesError.value = '获取收藏列表失败，请稍后重试'
    favorites.value = []
  } finally {
    favoritesLoading.value = false
  }
}

/**
 * 取消收藏商品
 * 接口地址: DELETE /api/user/favorites/{favoriteId}
 * 请求参数: favoriteId (路径参数)
 * 返回数据格式: {
 *   code: 200,
 *   message: string
 * }
 */
const removeFavorite = async (productName, productId) => {
  try {
    console.log('正在取消收藏:', { productName, productId })
    
    // 检查productId是否有效
    if (!productId) {
      console.error('productId为空或undefined')
      ElMessage.error('商品ID无效，无法取消收藏')
      return
    }
    await api.delete(`/user/favorites/${productId}`)
    
    // 从本地列表中移除 - 根据productId过滤
    favorites.value = favorites.value.filter(fav => 
      (fav.product?.id || fav.productId) !== productId
    )
    
    ElMessage.success(`已取消收藏 ${productName}`)
    console.log('取消收藏成功')
  } catch (error) {
    console.error('取消收藏失败:', error)
    ElMessage.error('取消收藏失败，请稍后重试')
  }
}

/**
 * 跳转到商品详情页
 */
const goToProductDetail = (productId) => {
  router.push(`/product/${productId}`)
}

/**
 * 格式化收藏时间
 */
const formatFavoriteTime = (timeStr) => {
  if (!timeStr) return '未知时间'
  
  try {
    const date = new Date(timeStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('时间格式化失败:', error)
    return '时间格式错误'
  }
}
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
            <!-- 加载状态 -->
            <el-skeleton :loading="loadingUserInfo" animated>
              <template #template>
                <div class="user-info-summary">
                  <div class="avatar-section">
                    <el-skeleton-item variant="circle" style="width: 140px; height: 140px" />
                  </div>
                  <div class="user-info-details">
                    <el-skeleton-item variant="p" style="width: 100%; height: 50px" />
                    <el-skeleton-item variant="p" style="width: 100%; height: 50px" />
                    <el-skeleton-item variant="p" style="width: 100%; height: 50px" />
                    <el-skeleton-item variant="p" style="width: 100%; height: 50px" />
                    <el-skeleton-item variant="p" style="width: 100%; height: 50px" />
                    <el-skeleton-item variant="p" style="width: 100%; height: 50px" />
                  </div>
                </div>
              </template>
              
              <!-- 用户信息展示栏 -->
              <template #default>
                <div class="user-info-summary">
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
                  
                  <div class="user-info-details">
                    <div class="user-info-item">
                      <span class="info-label">用户名:</span>
                      <span class="info-value">{{ user?.username || '未设置' }}</span>
                    </div>
                    <div class="user-info-item">
                      <span class="info-label">昵称:</span>
                      <span class="info-value">{{ user?.nickname || '未设置' }}</span>
                    </div>
                    <div class="user-info-item">
                      <span class="info-label">性别:</span>
                      <span class="info-value">{{ user?.gender || '保密' }}</span>
                    </div>
                    <div class="user-info-item">
                      <span class="info-label">年龄:</span>
                      <span class="info-value">{{ user?.age ? `${user.age}岁` : '未设置' }}</span>
                    </div>
                    <div class="user-info-item">
                      <span class="info-label">邮箱:</span>
                      <span class="info-value">{{ user?.email || '未设置' }}</span>
                    </div>
                    <div class="user-info-item">
                      <span class="info-label">手机:</span>
                      <span class="info-value">{{ user?.phone || '未设置' }}</span>
                    </div>
                    <div class="user-info-item" v-if="user?.description">
                      <span class="info-label">个人描述:</span>
                      <span class="info-value">{{ user.description }}</span>
                    </div>
                    <div class="user-info-item" v-else>
                      <span class="info-label">个人描述:</span>
                      <span class="info-value">暂无描述</span>
                    </div>
                    <div class="user-info-item" v-if="user?.addresses && user.addresses.length > 0">
                      <span class="info-label">收货地址:</span>
                      <div class="info-value addresses-list">
                        <div v-for="(address, index) in user.addresses" :key="index" class="address-item-display">
                          {{ index + 1 }}. {{ address }}
                        </div>
                      </div>
                    </div>
                    <div class="user-info-item" v-else>
                      <span class="info-label">收货地址:</span>
                      <span class="info-value">暂无收货地址</span>
                    </div>
                  </div>
                  
                  <div class="edit-profile-button">
                    <el-button type="primary" size="large" @click="activeTab = 'edit-profile'">
                      修改资料
                    </el-button>
                  </div>
                </div>
              </template>
            </el-skeleton>
          </div>
        </el-tab-pane>
        
        <!-- 编辑个人信息标签 -->
        <el-tab-pane label="编辑资料" name="edit-profile">
          <div class="profile-card">
            <div class="form-section">
              <el-form
                ref="profileFormRef"
                :model="profileForm"
                :rules="rules"
                label-position="left"
                label-width="100px"
                size="large"
              >
                <el-form-item prop="nickname" label="昵称">
                  <el-input 
                    v-model="profileForm.nickname"
                    placeholder="请输入昵称"
                  />
                </el-form-item>
                
                <el-form-item prop="gender" label="性别">
                  <el-radio-group v-model="profileForm.gender">
                    <el-radio 
                      v-for="option in genderOptions" 
                      :key="option.value" 
                      :label="option.value"
                    >
                      {{ option.label }}
                    </el-radio>
                  </el-radio-group>
                </el-form-item>
                
                <el-form-item prop="age" label="年龄">
                  <el-input 
                    v-model="profileForm.age"
                    placeholder="请输入年龄"
                    type="number"
                    min="1"
                    max="150"
                  />
                </el-form-item>
                
                <el-form-item prop="description" label="个人描述">
                  <el-input 
                    v-model="profileForm.description"
                    type="textarea"
                    :rows="4"
                    placeholder="请输入个人描述（最多500字）"
                    maxlength="500"
                    show-word-limit
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
                
                <el-form-item label="收货地址">
                  <div class="addresses-container">
                    <div v-if="profileForm.addresses.length === 0" class="no-address">
                      暂无收货地址
                    </div>
                    <div v-for="(address, index) in profileForm.addresses" :key="index" class="address-item">
                      <el-input 
                        v-model="profileForm.addresses[index]" 
                        type="textarea" 
                        :rows="2"
                      />
                      <el-button 
                        type="danger" 
                        circle 
                        @click="removeAddress(index)"
                        class="remove-address-btn"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                    
                    <div class="add-address-form">
                      <el-input 
                        v-model="newAddress" 
                        type="textarea" 
                        :rows="2"
                        placeholder="请输入新的收货地址"
                      />
                      <el-button 
                        type="primary" 
                        @click="addAddress"
                        class="add-address-btn"
                      >
                        添加地址
                      </el-button>
                    </div>
                  </div>
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
              label-position="left"
              label-width="120px"
              class="password-form"
              size="large"
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
          <div class="profile-card">
            <!-- 加载状态 -->
            <div v-if="favoritesLoading" class="loading-container">
              <el-skeleton :rows="3" animated />
              <div class="loading-text">
                <el-icon class="is-loading"><Loading /></el-icon>
                正在加载收藏商品...
              </div>
            </div>
            
            <!-- 错误状态 -->
            <div v-else-if="favoritesError" class="error-container">
              <el-alert
                :title="favoritesError"
                type="error"
                show-icon
                :closable="false"
              >
                <template #default>
                  <p>{{ favoritesError }}</p>
                  <el-button type="primary" size="small" @click="fetchFavorites" style="margin-top: 10px;">
                    重新加载
                  </el-button>
                </template>
              </el-alert>
            </div>
            
            <!-- 收藏商品列表 -->
            <div v-else-if="favorites.length > 0" class="favorites-list">
              <div class="favorites-header">
                <h3>我的收藏 ({{ favorites.length }})</h3>
                <el-button type="primary" size="small" @click="fetchFavorites" :loading="favoritesLoading">
                  刷新列表
                </el-button>
              </div>
              
              <div class="favorites-grid">
                <div 
                  v-for="favorite in favorites" 
                  :key="favorite.id" 
                  class="favorite-item"
                >
                  <div class="favorite-image" @click="goToProductDetail(favorite.product?.id || favorite.productId)">
                    <img 
                      :src="favorite.product?.imageUrl || `https://picsum.photos/id/${(favorite.productId || favorite.id) + 100}/300/200`" 
                      :alt="favorite.product?.name || '商品图片'"
                    >
                  </div>
                  
                  <div class="favorite-info">
                    <h4 class="favorite-name" @click="goToProductDetail(favorite.product?.id || favorite.productId)">
                      {{ favorite.product?.name || '商品名称' }}
                    </h4>
                    
                    <div class="favorite-meta">
                      <span class="favorite-price">
                        ¥{{ (favorite.product?.price || 0).toFixed(2) }}
                      </span>
                      
                      <div class="favorite-rating" v-if="favorite.product?.rating">
                        <el-rate 
                          :model-value="favorite.product.rating" 
                          disabled 
                          size="small"
                          text-color="#ff9900"
                          :colors="['#ff9900', '#ff9900', '#ff9900']"
                        ></el-rate>
                      </div>
                    </div>
                    
                    <div class="favorite-time">
                      收藏时间: {{ formatFavoriteTime(favorite.addTime) }}
                    </div>
                    
                    <div class="favorite-actions">
                      <el-button 
                        type="primary" 
                        size="small" 
                        @click="goToProductDetail(favorite.product?.id || favorite.productId)"
                      >
                        查看详情
                      </el-button>
                      <el-button 
                        type="danger" 
                        size="small" 
                        plain
                        @click="removeFavorite(favorite.product?.name || '该商品', favorite.product?.id || favorite.productId)"
                      >
                        取消收藏
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 无收藏商品状态 -->
            <div v-else class="empty-container">
              <el-empty description="暂无收藏商品">
                <el-button type="primary" @click="$router.push('/')">
                  去首页逛逛
                </el-button>
              </el-empty>
            </div>
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
    font-size: 2rem;
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
  padding: 30px;
  position: relative;
  max-width: 800px;
  margin: 0 auto;
}

/* 用户信息展示栏样式 */
.user-info-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  background-color: #f9f9f9;
  border-radius: 10px;
  margin-bottom: 30px;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

.user-info-details {
  width: 90%;
  margin-top: 25px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.user-info-item {
  display: flex;
  align-items: center;
  padding: 15px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.info-label {
  font-weight: 500;
  color: #666;
  margin-right: 15px;
  min-width: 70px;
  font-size: 1.1rem;
}

.info-value {
  color: #333;
  flex: 1;
  font-size: 1.1rem;
}

.edit-profile-button {
  margin-top: 20px;
  align-self: flex-end;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.avatar-uploader {
  width: 140px;
  height: 140px;
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
  font-size: 32px;
  color: #8c939d;
  width: 140px;
  height: 140px;
  line-height: 140px;
  text-align: center;
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-hint {
  margin-top: 10px;
  font-size: 1rem;
  color: #666;
}

.form-section {
  max-width: 650px;
  margin: 0 auto;
  padding: 20px 0;
}

.password-form {
  max-width: 550px;
  margin: 0 auto;
  padding: 20px 0;
}

.section-title {
  font-size: 1.7rem;
  font-weight: 600;
  margin-bottom: 30px;
  color: #333;
  text-align: center;
}

.update-button {
  width: 100%;
  padding: 14px;
  font-size: 1.1rem;
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

/* 多地址样式 */
.addresses-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
}

.address-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
}

.remove-address-btn {
  flex-shrink: 0;
  margin-top: 5px;
}

.add-address-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.add-address-btn {
  align-self: flex-end;
}

.no-address {
  color: #999;
  font-style: italic;
  padding: 10px 0;
}

/* 表单元素样式 */
:deep(.el-form-item__label) {
  font-size: 1.1rem !important;
  font-weight: 500;
}

:deep(.el-input__inner) {
  font-size: 1.1rem !important;
  padding: 12px !important;
  height: auto !important;
}

:deep(.el-textarea__inner) {
  font-size: 1.1rem !important;
  padding: 12px !important;
}

:deep(.el-tabs__item) {
  font-size: 1.1rem !important;
  padding: 0 25px !important;
  height: 50px !important;
  line-height: 50px !important;
}

/* 收藏列表样式 */
.favorites-list {
  .favorites-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #ebeef5;
    
    h3 {
      font-size: 1.3rem;
      font-weight: 600;
      color: #333;
      margin: 0;
    }
  }
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.favorite-item {
  background: white;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
}

.favorite-image {
  height: 200px;
  overflow: hidden;
  cursor: pointer;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;
  }
  
  &:hover img {
    transform: scale(1.05);
  }
}

.favorite-info {
  padding: 16px;
}

.favorite-name {
  font-size: 1.1rem;
  font-weight: 500;
  color: #333;
  margin: 0 0 12px 0;
  cursor: pointer;
  transition: color 0.3s;
  
  &:hover {
    color: #409eff;
  }
}

.favorite-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.favorite-price {
  font-size: 1.2rem;
  font-weight: 600;
  color: #ff6b6b;
}

.favorite-rating {
  display: flex;
  align-items: center;
}

.favorite-time {
  font-size: 0.9rem;
  color: #999;
  margin-bottom: 16px;
}

.favorite-actions {
  display: flex;
  gap: 8px;
  
  .el-button {
    flex: 1;
    border-radius: 8px;
  }
}

/* 加载和错误状态样式 */
.loading-container {
  text-align: center;
  padding: 40px 20px;
  
  .loading-text {
    margin-top: 20px;
    font-size: 1.1rem;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    
    .el-icon {
      font-size: 1.2rem;
      color: #409eff;
    }
  }
}

.error-container {
  margin: 40px 0;
  
  .el-alert {
    border-radius: 12px;
    padding: 20px;
    
    .el-button {
      border-radius: 8px;
    }
  }
}

.empty-container {
  margin: 60px 0;
  
  .el-empty {
    padding: 40px 20px;
    
    .el-button {
      border-radius: 8px;
      padding: 10px 20px;
    }
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .profile-card {
    padding: 20px 10px;
  }
  
  .user-info-details {
    grid-template-columns: 1fr;
  }
  
  .favorites-grid {
    grid-template-columns: 1fr;
  }
  
  .favorite-actions {
    flex-direction: column;
    
    .el-button {
      width: 100%;
    }
  }
}
</style>