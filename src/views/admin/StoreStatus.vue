<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/services/api'

// 响应式数据
const loading = ref(false)
const storeList = ref([])
const selectedStoreId = ref(null)
const currentStoreStatus = ref('')

// 状态选项 - 从后端获取
const statusOptions = ref([])

// 默认状态选项（备用）
const defaultStatusOptions = [
  { value: '营业中', label: '营业中', color: '#4cd964' },
  { value: '休息中', label: '休息中', color: '#ff6b6b' },
  { value: '节假日休息', label: '节假日休息', color: '#f7ba2a' },
  { value: '系统维护中', label: '系统维护中', color: '#909399' }
]

// 计算属性
const currentStatus = computed({
  get: () => currentStoreStatus.value,
  set: (value) => {
    updateStoreStatus(value)
  }
})

const currentStatusText = computed(() => {
  return currentStoreStatus.value || '未知状态'
})

const selectedStore = computed(() => {
  return storeList.value.find(store => store.id === selectedStoreId.value)
})

const storeInfo = computed(() => {
  if (selectedStore.value) {
    return {
      name: selectedStore.value.name,
      address: selectedStore.value.address,
      phone: selectedStore.value.phone,
      openingHours: selectedStore.value.openTime && selectedStore.value.closeTime 
        ? `${selectedStore.value.openTime} - ${selectedStore.value.closeTime}` 
        : '暂无营业时间'
    }
  }
  return {
    name: '暂无店铺信息',
    address: '暂无地址',
    phone: '暂无电话',
    openingHours: '暂无营业时间'
  }
})

// 编辑模式
const isEditing = ref(false)
const tempStatus = ref('')

// 编辑表单
const editForm = ref({
  name: storeInfo.value.name,
  address: storeInfo.value.address,
  phone: storeInfo.value.phone,
  email: storeInfo.value.email,
  openingHours: storeInfo.value.openingHours,
  description: storeInfo.value.description
})

// 获取状态颜色
const getStatusColor = (status) => {
  const option = statusOptions.value.find(opt => opt.value === status) || 
                defaultStatusOptions.find(opt => opt.value === status)
  return option ? option.color : '#909399'
}

// 获取状态文本
const getStatusText = (status) => {
  const option = statusOptions.value.find(opt => opt.value === status) || 
                defaultStatusOptions.find(opt => opt.value === status)
  return option ? option.label : status || '未知状态'
}

// 获取所有店铺信息
const fetchStoreList = async () => {
  try {
    loading.value = true
    const response = await api.get('/store/list')
    
    if (response && Array.isArray(response)) {
      storeList.value = response
      // 默认选择第一个店铺
      if (response.length > 0) {
        selectedStoreId.value = response[0].id
        currentStoreStatus.value = response[0].status
      }
    }
  } catch (error) {
    console.error('获取店铺列表失败:', error)
    ElMessage.error('获取店铺列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 获取状态选项
const fetchStatusOptions = async () => {
  try {
    const response = await api.get('/store/status-options')
    
    if (response && Array.isArray(response)) {
      statusOptions.value = response.map(status => ({
        value: status,
        label: status,
        color: getStatusColorByText(status)
      }))
    } else {
      // 使用默认选项
      statusOptions.value = defaultStatusOptions
    }
  } catch (error) {
    console.error('获取状态选项失败:', error)
    // 使用默认选项
    statusOptions.value = defaultStatusOptions
  }
}

// 根据状态文本获取颜色
const getStatusColorByText = (statusText) => {
  const colorMap = {
    '营业中': '#4cd964',
    '休息中': '#ff6b6b',
    '节假日休息': '#f7ba2a',
    '系统维护中': '#909399'
  }
  return colorMap[statusText] || '#909399'
}

// 获取指定店铺信息
const fetchStoreById = async (storeId) => {
  try {
    const response = await api.get(`/store/${storeId}`)
    
    if (response) {
      // 更新选中店铺的状态
      currentStoreStatus.value = response.status
      
      // 更新店铺列表中对应的店铺信息
      const index = storeList.value.findIndex(store => store.id === storeId)
      if (index !== -1) {
        storeList.value[index] = response
      }
    }
  } catch (error) {
    console.error('获取店铺信息失败:', error)
    ElMessage.error('获取店铺信息失败')
  }
}

// 更新店铺状态
const updateStoreStatus = async (newStatus) => {
  if (!selectedStoreId.value) {
    ElMessage.warning('请先选择店铺')
    return
  }

  try {
    loading.value = true
    await api.put(`/store/${selectedStoreId.value}/status`, {
      status: newStatus
    })
    
    currentStoreStatus.value = newStatus
    
    // 更新本地店铺列表中的状态
    const store = storeList.value.find(s => s.id === selectedStoreId.value)
    if (store) {
      store.status = newStatus
    }
    
    ElMessage.success('店铺状态更新成功')
  } catch (error) {
    console.error('更新店铺状态失败:', error)
    ElMessage.error('更新店铺状态失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 更新商店状态（兼容性函数）
const updateStatus = (status) => {
  updateStoreStatus(status)
}

// 获取状态标签（兼容性函数）
const getStatusLabel = (status) => {
  return getStatusText(status)
}

// 店铺选择变化
const onStoreChange = async (storeId) => {
  selectedStoreId.value = storeId
  await fetchStoreById(storeId)
}

// 页面加载时获取数据
onMounted(async () => {
  await fetchStatusOptions()
  await fetchStoreList()
})

// 开始编辑
const startEditing = () => {
  editForm.value = {
    name: storeInfo.value.name,
    address: storeInfo.value.address,
    phone: storeInfo.value.phone,
    email: storeInfo.value.email,
    openingHours: storeInfo.value.openingHours,
    description: storeInfo.value.description
  }
  isEditing.value = true
}

// 保存编辑
const saveEditing = async () => {
  // 简单验证
  if (!editForm.value.name || !editForm.value.address || !editForm.value.phone) {
    ElMessage.error('店铺名称、地址和电话不能为空')
    return
  }
  
  if (!selectedStoreId.value) {
    ElMessage.warning('请先选择店铺')
    return
  }
  
  try {
    loading.value = true
    // 调用后端API更新店铺信息
    await api.put(`/store/${selectedStoreId.value}`, {
      name: editForm.value.name,
      address: editForm.value.address,
      phone: editForm.value.phone,
      email: editForm.value.email,
      openingHours: editForm.value.openingHours,
      description: editForm.value.description
    })
    
    // 更新本地店铺列表中的信息
    const store = storeList.value.find(s => s.id === selectedStoreId.value)
    if (store) {
      Object.assign(store, editForm.value)
    }
    
    isEditing.value = false
    ElMessage.success('店铺信息已更新')
  } catch (error) {
    console.error('更新店铺信息失败:', error)
    ElMessage.error('更新店铺信息失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 取消编辑
const cancelEditing = () => {
  isEditing.value = false
}
</script>

<template>
  <div class="store-status-page" v-loading="loading">
    <div class="page-header">
      <h1>商城状态管理</h1>
    </div>
    
    <!-- 店铺选择 -->
    <div class="store-selection" v-if="storeList.length > 1">
      <h2>选择店铺</h2>
      <el-select 
        v-model="selectedStoreId" 
        placeholder="请选择店铺"
        @change="onStoreChange"
        style="width: 300px;"
      >
        <el-option
          v-for="store in storeList"
          :key="store.id"
          :label="store.name"
          :value="store.id"
        />
      </el-select>
    </div>
    
    <!-- 状态卡片 -->
    <div class="status-section">
      <h2>当前商城状态</h2>
      <div class="status-card">
        <div class="status-indicator" :style="{ backgroundColor: getStatusColor(currentStoreStatus) }">
          {{ currentStatusText }}
        </div>
        <div class="status-actions">
          <el-button-group>
            <el-button 
              v-for="option in statusOptions" 
              :key="option.value"
              :type="currentStoreStatus === option.value ? 'primary' : 'default'"
              @click="updateStatus(option.value)"
              :loading="loading"
            >
              {{ option.label }}
            </el-button>
          </el-button-group>
        </div>
      </div>
    </div>
    
    <!-- 店铺信息 -->
    <div class="store-info-section">
      <div class="section-header">
        <h2>店铺基本信息</h2>
        <el-button v-if="!isEditing" type="primary" @click="startEditing">
          <el-icon><Edit /></el-icon> 编辑信息
        </el-button>
      </div>
      
      <!-- 查看模式 -->
      <div class="info-card" v-if="!isEditing">
        <div class="info-item">
          <span class="label">店铺名称</span>
          <span class="value">{{ storeInfo.name }}</span>
        </div>
        <div class="info-item">
          <span class="label">店铺地址</span>
          <span class="value">{{ storeInfo.address }}</span>
        </div>
        <div class="info-item">
          <span class="label">联系电话</span>
          <span class="value">{{ storeInfo.phone }}</span>
        </div>
        <div class="info-item">
          <span class="label">电子邮箱</span>
          <span class="value">{{ storeInfo.email }}</span>
        </div>
        <div class="info-item">
          <span class="label">营业时间</span>
          <span class="value">{{ storeInfo.openingHours }}</span>
        </div>
        <div class="info-item">
          <span class="label">店铺描述</span>
          <span class="value description">{{ storeInfo.description }}</span>
        </div>
      </div>
      
      <!-- 编辑模式 -->
      <div class="edit-form" v-else>
        <el-form label-width="100px">
          <el-form-item label="店铺名称">
            <el-input v-model="editForm.name" placeholder="请输入店铺名称" />
          </el-form-item>
          
          <el-form-item label="店铺地址">
            <el-input v-model="editForm.address" placeholder="请输入店铺地址" />
          </el-form-item>
          
          <el-form-item label="联系电话">
            <el-input v-model="editForm.phone" placeholder="请输入联系电话" />
          </el-form-item>
          
          <el-form-item label="电子邮箱">
            <el-input v-model="editForm.email" placeholder="请输入电子邮箱" />
          </el-form-item>
          
          <el-form-item label="营业时间">
            <el-input v-model="editForm.openingHours" placeholder="请输入营业时间" />
          </el-form-item>
          
          <el-form-item label="店铺描述">
            <el-input 
              v-model="editForm.description" 
              type="textarea" 
              :rows="4"
              placeholder="请输入店铺描述"
            />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="saveEditing">保存</el-button>
            <el-button @click="cancelEditing">取消</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
    
    <!-- 营业提示设置 -->
    <div class="notice-section">
      <h2>营业提示设置</h2>
      <div class="notice-preview">
        <div class="notice-card" :class="{ 'status-open': currentStoreStatus === '营业中' }">
          <el-icon v-if="currentStoreStatus === '营业中'"><CircleCheckFilled /></el-icon>
          <el-icon v-else><CircleCloseFilled /></el-icon>
          <span>{{ currentStatusText }}</span>
          <p v-if="currentStoreStatus === '营业中'">欢迎光临，我们正在营业中！</p>
          <p v-else-if="currentStoreStatus === '休息中'">很抱歉，我们已经打烊了，明天再来吧！</p>
          <p v-else-if="currentStoreStatus === '节假日休息'">节假日休息中，祝您假期愉快！</p>
          <p v-else>系统正在维护中，给您带来不便，敬请谅解。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.store-status-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
  
  h1 {
    font-size: 1.8rem;
    color: #333;
    margin: 0;
  }
}

.store-selection,
.status-section,
.store-info-section,
.notice-section {
  margin-bottom: 40px;
  
  h2 {
    font-size: 1.4rem;
    color: #333;
    margin-bottom: 20px;
  }
}

.store-selection {
  background-color: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  
  .el-select {
    margin-top: 10px;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h2 {
    margin: 0;
  }
}

.status-card {
  background-color: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  
  .status-indicator {
    font-size: 1.8rem;
    font-weight: 600;
    color: white;
    padding: 15px 40px;
    border-radius: 30px;
    text-align: center;
  }
  
  .status-actions {
    margin-top: 10px;
  }
}

.info-card {
  background-color: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  
  .info-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    &:last-child {
      grid-column: 1 / -1;
    }
    
    .label {
      font-size: 0.9rem;
      color: #666;
    }
    
    .value {
      font-size: 1.1rem;
      color: #333;
      font-weight: 500;
      
      &.description {
        font-weight: normal;
        line-height: 1.6;
      }
    }
  }
}

.edit-form {
  background-color: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.notice-preview {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.notice-card {
  background-color: #ff6b6b;
  color: white;
  border-radius: 12px;
  padding: 25px;
  width: 100%;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  
  &.status-open {
    background-color: #4cd964;
    box-shadow: 0 4px 12px rgba(76, 217, 100, 0.3);
  }
  
  .el-icon {
    font-size: 2.5rem;
    margin-bottom: 15px;
  }
  
  span {
    font-size: 1.8rem;
    font-weight: 600;
    display: block;
    margin-bottom: 10px;
  }
  
  p {
    font-size: 1.1rem;
    margin: 0;
    opacity: 0.9;
  }
}

@media (max-width: 768px) {
  .info-card {
    grid-template-columns: 1fr;
  }
}
</style>