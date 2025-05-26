<script setup>
import { ref, computed } from 'vue'
import { useStoreManagementStore } from '../../stores'
import { ElMessage } from 'element-plus'

const storeManagementStore = useStoreManagementStore()

// 商店状态
const storeStatus = computed(() => storeManagementStore.storeStatus)
const storeStatusText = computed(() => storeManagementStore.storeStatusText)

// 商店信息
const storeInfo = computed(() => storeManagementStore.storeInfo)

// 编辑模式
const isEditing = ref(false)

// 编辑表单
const editForm = ref({
  name: storeInfo.value.name,
  address: storeInfo.value.address,
  phone: storeInfo.value.phone,
  email: storeInfo.value.email,
  openingHours: storeInfo.value.openingHours,
  description: storeInfo.value.description
})

// 状态选项
const statusOptions = [
  { value: 'open', label: '营业中', color: '#4cd964' },
  { value: 'closed', label: '已打烊', color: '#ff6b6b' },
  { value: 'holiday', label: '节假日休息', color: '#f7ba2a' },
  { value: 'maintenance', label: '系统维护中', color: '#909399' }
]

// 更新商店状态
const updateStatus = (status) => {
  storeManagementStore.updateStoreStatus(status)
  ElMessage.success(`商城状态已更新为：${getStatusLabel(status)}`)
}

// 获取状态标签
const getStatusLabel = (status) => {
  const option = statusOptions.find(opt => opt.value === status)
  return option ? option.label : '未知状态'
}

// 获取状态颜色
const getStatusColor = (status) => {
  const option = statusOptions.find(opt => opt.value === status)
  return option ? option.color : '#909399'
}

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
const saveEditing = () => {
  // 简单验证
  if (!editForm.value.name || !editForm.value.address || !editForm.value.phone) {
    ElMessage.error('店铺名称、地址和电话不能为空')
    return
  }
  
  storeManagementStore.updateStoreInfo(editForm.value)
  isEditing.value = false
  ElMessage.success('店铺信息已更新')
}

// 取消编辑
const cancelEditing = () => {
  isEditing.value = false
}
</script>

<template>
  <div class="store-status-page">
    <div class="page-header">
      <h1>商城状态管理</h1>
    </div>
    
    <!-- 状态卡片 -->
    <div class="status-section">
      <h2>当前商城状态</h2>
      <div class="status-card">
        <div class="status-indicator" :style="{ backgroundColor: getStatusColor(storeStatus) }">
          {{ storeStatusText }}
        </div>
        <div class="status-actions">
          <el-button-group>
            <el-button 
              v-for="option in statusOptions" 
              :key="option.value"
              :type="storeStatus === option.value ? 'primary' : 'default'"
              @click="updateStatus(option.value)"
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
        <div class="notice-card" :class="{ 'status-open': storeStatus === 'open' }">
          <el-icon v-if="storeStatus === 'open'"><CircleCheckFilled /></el-icon>
          <el-icon v-else><CircleCloseFilled /></el-icon>
          <span>{{ storeStatusText }}</span>
          <p v-if="storeStatus === 'open'">欢迎光临，我们正在营业中！</p>
          <p v-else-if="storeStatus === 'closed'">很抱歉，我们已经打烊了，明天再来吧！</p>
          <p v-else-if="storeStatus === 'holiday'">节假日休息中，祝您假期愉快！</p>
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