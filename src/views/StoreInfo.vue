<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/services/api'

// 店铺信息数据
const storeInfo = ref({
  id: null,
  name: '水果商城',
  address: '暂无地址信息',
  phone: '暂无联系电话',
  email: '暂无邮箱信息',
  openingHours: '暂无营业时间',
  description: '暂无店铺描述',
  status: 'closed',
  openTime: null,
  closeTime: null
})

// 加载状态
const loading = ref(false)

// 状态映射 - 将后端状态映射为前端显示文本
const statusMapping = {
  '营业中': { key: 'open', text: '营业中' },
  '休息中': { key: 'closed', text: '休息中' },
  '节假日休息': { key: 'holiday', text: '节假日休息' },
  '系统维护中': { key: 'maintenance', text: '系统维护中' }
}

// 计算属性 - 获取当前状态的key值
const storeStatus = computed(() => {
  const mapping = statusMapping[storeInfo.value.status]
  return mapping ? mapping.key : 'closed'
})

// 计算属性 - 获取状态显示文本
const storeStatusText = computed(() => {
  const mapping = statusMapping[storeInfo.value.status]
  return mapping ? mapping.text : storeInfo.value.status || '休息中'
})

// 获取状态颜色
const getStatusColor = (status) => {
  const statusColors = {
    'open': '#4cd964',
    'closed': '#ff6b6b',
    'holiday': '#f7ba2a',
    'maintenance': '#909399'
  }
  return statusColors[status] || '#909399'
}

// 获取所有店铺信息
const fetchStoreList = async () => {
  try {
    loading.value = true
    const response = await api.get('/store/list')
    
    if (response && Array.isArray(response) && response.length > 0) {
      // 使用第一个店铺的信息
      const firstStore = response[0]
      storeInfo.value = {
        id: firstStore.id,
        name: firstStore.name || '水果商城',
        address: firstStore.address || '暂无地址信息',
        phone: firstStore.phone || '暂无联系电话',
        email: firstStore.email || '暂无邮箱信息',
        openingHours: firstStore.openingHours || 
          (firstStore.openTime && firstStore.closeTime ? 
            `${firstStore.openTime} - ${firstStore.closeTime}` : '暂无营业时间'),
        description: firstStore.description || '专业的水果零售商城，为您提供新鲜优质的水果产品',
        status: firstStore.status || '休息中',
        openTime: firstStore.openTime,
        closeTime: firstStore.closeTime
      }
    }
  } catch (error) {
    console.error('获取店铺信息失败:', error)
    ElMessage.error('获取店铺信息失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 获取当前店铺状态
const fetchCurrentStatus = async () => {
  try {
    const response = await api.get('/store/current-status')
    
    if (response && response.status) {
      storeInfo.value.status = response.status
      storeInfo.value.id = response.id
      storeInfo.value.name = response.name || storeInfo.value.name
      
      // 更新营业时间
      if (response.openTime && response.closeTime) {
        storeInfo.value.openingHours = `${response.openTime} - ${response.closeTime}`
        storeInfo.value.openTime = response.openTime
        storeInfo.value.closeTime = response.closeTime
      }
    }
  } catch (error) {
    console.error('获取店铺状态失败:', error)
    // 不显示错误消息，因为这是辅助信息
  }
}

// 页面加载时获取数据
onMounted(async () => {
  await fetchStoreList()
  await fetchCurrentStatus()
})
</script>

<template>
  <div class="store-info-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>店铺信息</h1>
      <p class="subtitle">了解我们的店铺详情和营业状态</p>
    </div>

    <!-- 当前营业状态 -->
    <div class="status-section">
      <div class="status-card">
        <div class="status-header">
          <el-icon class="status-icon"><Shop /></el-icon>
          <h2>当前营业状态</h2>
        </div>
        <div class="status-indicator" :style="{ backgroundColor: getStatusColor(storeStatus) }">
          <el-icon v-if="storeStatus === 'open'"><CircleCheckFilled /></el-icon>
          <el-icon v-else><CircleCloseFilled /></el-icon>
          <span class="status-text">{{ storeStatusText }}</span>
        </div>
        <div class="status-description">
          <p v-if="storeStatus === 'open'">🎉 欢迎光临，我们正在营业中！</p>
          <p v-else-if="storeStatus === 'closed'">😴 很抱歉，我们已经打烊了，明天再来吧！</p>
          <p v-else-if="storeStatus === 'holiday'">🏖️ 节假日期间暂停营业，感谢理解！</p>
          <p v-else-if="storeStatus === 'maintenance'">🔧 系统维护中，请稍后再试！</p>
        </div>
      </div>
    </div>

    <!-- 店铺基本信息 -->
    <div class="info-section">
      <div class="section-header">
        <el-icon><InfoFilled /></el-icon>
        <h2>店铺基本信息</h2>
      </div>
      
      <div class="info-grid">
        <div class="info-card">
          <div class="info-item">
            <div class="info-icon">
              <el-icon><Shop /></el-icon>
            </div>
            <div class="info-content">
              <span class="label">店铺名称</span>
              <span class="value">{{ storeInfo.name }}</span>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-item">
            <div class="info-icon">
              <el-icon><Location /></el-icon>
            </div>
            <div class="info-content">
              <span class="label">店铺地址</span>
              <span class="value">{{ storeInfo.address }}</span>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-item">
            <div class="info-icon">
              <el-icon><Phone /></el-icon>
            </div>
            <div class="info-content">
              <span class="label">联系电话</span>
              <span class="value">{{ storeInfo.phone }}</span>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-item">
            <div class="info-icon">
              <el-icon><Message /></el-icon>
            </div>
            <div class="info-content">
              <span class="label">电子邮箱</span>
              <span class="value">{{ storeInfo.email }}</span>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-item">
            <div class="info-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="info-content">
              <span class="label">营业时间</span>
              <span class="value">{{ storeInfo.openingHours }}</span>
            </div>
          </div>
        </div>

        <div class="info-card full-width">
          <div class="info-item">
            <div class="info-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="info-content">
              <span class="label">店铺描述</span>
              <span class="value description">{{ storeInfo.description }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 服务特色 -->
    <div class="features-section">
      <div class="section-header">
        <el-icon><Star /></el-icon>
        <h2>服务特色</h2>
      </div>
      
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">
            <el-icon><Checked /></el-icon>
          </div>
          <h3>新鲜保证</h3>
          <p>所有水果均为当日新鲜采购，保证品质</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">
            <el-icon><Van /></el-icon>
          </div>
          <h3>快速配送</h3>
          <p>市内2小时送达，让您享受便捷购物体验</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">
            <el-icon><Medal /></el-icon>
          </div>
          <h3>品质承诺</h3>
          <p>严格筛选，只为给您提供最优质的水果</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">
            <el-icon><Service /></el-icon>
          </div>
          <h3>贴心服务</h3>
          <p>专业客服团队，为您提供全程贴心服务</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.store-info-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
  
  h1 {
    font-size: 2.5rem;
    color: #333;
    margin-bottom: 10px;
    font-weight: 600;
  }
  
  .subtitle {
    font-size: 1.1rem;
    color: #666;
    margin: 0;
  }
}

.status-section {
  margin-bottom: 40px;
  
  .status-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    padding: 30px;
    color: white;
    text-align: center;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    
    .status-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 20px;
      
      .status-icon {
        font-size: 1.5rem;
      }
      
      h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
      }
    }
    
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 15px 30px;
      border-radius: 50px;
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 15px;
      
      .el-icon {
        font-size: 1.3rem;
      }
    }
    
    .status-description {
      font-size: 1.1rem;
      opacity: 0.9;
      
      p {
        margin: 0;
      }
    }
  }
}

.info-section, .features-section {
  margin-bottom: 40px;
  
  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 25px;
    
    .el-icon {
      font-size: 1.5rem;
      color: #3498db;
    }
    
    h2 {
      margin: 0;
      font-size: 1.8rem;
      color: #333;
      font-weight: 600;
    }
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
  
  .full-width {
    grid-column: 1 / -1;
  }
}

.info-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  }
  
  .info-item {
    display: flex;
    align-items: flex-start;
    gap: 15px;
    
    .info-icon {
      width: 45px;
      height: 45px;
      background: linear-gradient(135deg, #3498db, #2980b9);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      .el-icon {
        color: white;
        font-size: 1.2rem;
      }
    }
    
    .info-content {
      flex: 1;
      
      .label {
        display: block;
        font-size: 0.9rem;
        color: #666;
        margin-bottom: 5px;
        font-weight: 500;
      }
      
      .value {
        display: block;
        font-size: 1.1rem;
        color: #333;
        font-weight: 600;
        line-height: 1.4;
        
        &.description {
          font-weight: 400;
          line-height: 1.6;
        }
      }
    }
  }
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 25px;
}

.feature-card {
  background: white;
  border-radius: 15px;
  padding: 30px 25px;
  text-align: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  }
  
  .feature-icon {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    
    .el-icon {
      color: white;
      font-size: 1.5rem;
    }
  }
  
  h3 {
    font-size: 1.3rem;
    color: #333;
    margin: 0 0 15px;
    font-weight: 600;
  }
  
  p {
    font-size: 1rem;
    color: #666;
    line-height: 1.6;
    margin: 0;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .store-info-page {
    padding: 15px;
  }
  
  .page-header h1 {
    font-size: 2rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .status-card {
    padding: 20px;
  }
  
  .info-card, .feature-card {
    padding: 20px;
  }
}
</style>