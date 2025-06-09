<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores'
import { ElMessage } from 'element-plus'
import api from '../services/api'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 订单详情数据
const order = ref(null)
const loading = ref(false)
const error = ref('')

// 支付相关状态
const paymentDialogVisible = ref(false)
const selectedPaymentMethod = ref(1) // 默认支付宝

// 支付方式选项
const paymentMethods = [
  { value: 1, label: '支付宝', icon: 'CreditCard', color: '#1677ff' },
  { value: 2, label: '微信支付', icon: 'ChatDotRound', color: '#07c160' },
  { value: 3, label: '银联支付', icon: 'Wallet', color: '#e60012' },
  { value: 4, label: '其他', icon: 'Money', color: '#909399' }
]

// 订单状态映射
const statusMap = {
  1: { label: '待支付', color: '#E6A23C', icon: 'Clock' },
  2: { label: '待发货', color: '#F56C6C', icon: 'Box' },
  3: { label: '配送中', color: '#409EFF', icon: 'Van' },
  4: { label: '已完成', color: '#67C23A', icon: 'CircleCheck' },
  5: { label: '已取消', color: '#909399', icon: 'CircleClose' }
}

/**
 * 获取订单详情
 * 接口地址: GET /api/orders/{orderId}
 */
const fetchOrderDetail = async () => {
  if (!userStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  try {
    loading.value = true
    error.value = ''
    
    const orderId = route.params.id
    console.log('正在获取订单详情:', orderId)
    
    const response = await api.get(`/orders/${orderId}`)
    console.log('订单详情响应:', response)
    console.log('响应数据类型:', typeof response)
    console.log('响应数据结构:', response)
    
    // 处理响应数据 - 兼容多种后端返回格式
    let orderData = null
    
    if (response && typeof response === 'object') {
      if (response.data && typeof response.data === 'object') {
        // data字段包含订单对象
        orderData = response.data
        console.log('检测到data对象格式')
      } else if (response.id || response.orderNumber) {
        // 直接返回订单对象格式
        orderData = response
        console.log('检测到直接对象格式')
      } else {
        console.log('未知的响应格式:', response)
        orderData = response
      }
    }
    
    order.value = orderData
    console.log('订单详情加载成功:', order.value)
  } catch (err) {
    console.error('获取订单详情失败:', err)
    error.value = '获取订单详情失败，请稍后重试'
    
    if (err.response?.status === 401) {
      ElMessage.warning('登录已过期，请重新登录')
      router.push('/login')
    } else if (err.response?.status === 404) {
      ElMessage.error('订单不存在')
      router.push('/orders')
    } else {
      ElMessage.error('获取订单详情失败')
    }
  } finally {
    loading.value = false
  }
}

/**
 * 取消订单
 */
const cancelOrder = async () => {
  try {
    await api.put(`/orders/${order.value.id}/cancel`)
    ElMessage.success('订单已取消')
    order.value.status = 5 // 已取消状态
  } catch (err) {
    console.error('取消订单失败:', err)
    ElMessage.error('取消订单失败，请稍后重试')
  }
}

/**
 * 打开支付弹窗
 */
const openPaymentDialog = () => {
  selectedPaymentMethod.value = 1 // 重置为默认支付方式
  paymentDialogVisible.value = true
}

/**
 * 确认支付订单
 */
const confirmPayment = async () => {
  try {
    // 发送支付请求，包含支付方式
    await api.put(`/orders/${order.value.id}/pay`, {
      paymentMethod: selectedPaymentMethod.value
    })
    
    ElMessage.success('支付成功')
    order.value.status = 2 // 待发货状态
    order.value.payTime = new Date().toISOString()
    order.value.paymentMethod = selectedPaymentMethod.value
    
    // 关闭弹窗
    paymentDialogVisible.value = false
  } catch (err) {
    console.error('支付失败:', err)
    ElMessage.error('支付失败，请稍后重试')
  }
}

/**
 * 取消支付
 */
const cancelPayment = () => {
  paymentDialogVisible.value = false
}

/**
 * 获取支付方式标签
 */
const getPaymentMethodLabel = (paymentMethod) => {
  const method = paymentMethods.find(m => m.value === paymentMethod)
  return method ? method.label : '未知支付方式'
}

/**
 * 格式化日期
 */
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 返回订单列表
 */
const goBack = () => {
  router.push('/orders')
}

// 组件挂载时获取订单详情
onMounted(() => {
  fetchOrderDetail()
})
</script>

<template>
  <div class="order-detail-container">
    <!-- 返回按钮 -->
    <div class="back-button">
      <el-button type="primary" plain @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回订单列表
      </el-button>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
      <div class="loading-text">
        <el-icon class="is-loading"><Loading /></el-icon>
        正在加载订单详情...
      </div>
    </div>
    
    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <el-alert
        :title="error"
        type="error"
        show-icon
        :closable="false"
      >
        <template #default>
          <p>{{ error }}</p>
          <el-button type="primary" size="small" @click="fetchOrderDetail" style="margin-top: 10px;">
            重新加载
          </el-button>
        </template>
      </el-alert>
    </div>
    
    <!-- 订单详情内容 -->
    <div v-else-if="order" class="order-detail-content">
      <!-- 订单基本信息 -->
      <el-card class="order-info-card">
        <template #header>
          <div class="card-header">
            <h2>订单详情</h2>
            <el-tag :type="statusMap[order.status]?.color" effect="light" size="large">
              <el-icon v-if="statusMap[order.status]?.icon">
                <component :is="statusMap[order.status].icon" />
              </el-icon>
              {{ statusMap[order.status]?.label }}
            </el-tag>
          </div>
        </template>
        
        <div class="order-basic-info">
          <div class="info-row">
            <span class="label">订单号:</span>
            <span class="value">{{ order.orderNumber || order.id }}</span>
          </div>
          <div class="info-row">
            <span class="label">下单时间:</span>
            <span class="value">{{ formatDate(order.createTime) }}</span>
          </div>
          <div class="info-row" v-if="order.payTime">
            <span class="label">支付时间:</span>
            <span class="value">{{ formatDate(order.payTime) }}</span>
          </div>
          <div class="info-row" v-if="order.paymentMethod && order.status !== 1">
            <span class="label">支付方式:</span>
            <span class="value">{{ getPaymentMethodLabel(order.paymentMethod) }}</span>
          </div>
          <div class="info-row">
            <span class="label">订单金额:</span>
            <span class="value amount">¥{{ (order.totalAmount || 0).toFixed(2) }}</span>
          </div>
        </div>
      </el-card>
      
      <!-- 收货信息 -->
      <el-card class="shipping-info-card" v-if="order.shippingAddress || order.consigneeName">
        <template #header>
          <h3>收货信息</h3>
        </template>
        
        <div class="shipping-info">
          <div class="info-row" v-if="order.consigneeName">
            <span class="label">收货人:</span>
            <span class="value">{{ order.consigneeName }}</span>
          </div>
          <div class="info-row" v-if="order.consigneePhone">
            <span class="label">联系电话:</span>
            <span class="value">{{ order.consigneePhone }}</span>
          </div>
          <div class="info-row" v-if="order.shippingAddress">
            <span class="label">收货地址:</span>
            <span class="value">{{ order.shippingAddress }}</span>
          </div>
        </div>
      </el-card>
      
      <!-- 订单备注 -->
      <el-card class="remark-card" v-if="order.remark">
        <template #header>
          <h3>订单备注</h3>
        </template>
        
        <div class="remark-content">
          <p>{{ order.remark }}</p>
        </div>
      </el-card>
      
      <!-- 操作按钮 -->
      <div class="order-actions">
        <el-button 
          v-if="order.status === 1" 
          type="primary" 
          size="large"
          @click="openPaymentDialog"
        >
          立即支付
        </el-button>
        <el-button 
          v-if="order.status === 1 || order.status === 2" 
          type="danger" 
          plain 
          size="large"
          @click="cancelOrder"
        >
          取消订单
        </el-button>
      </div>
    </div>
    
    <!-- 无订单数据状态 -->
    <div v-else class="empty-container">
      <el-empty description="订单不存在">
        <el-button type="primary" @click="goBack">返回订单列表</el-button>
      </el-empty>
    </div>
    
    <!-- 支付方式选择弹窗 -->
    <el-dialog
      v-model="paymentDialogVisible"
      title="选择支付方式"
      width="400px"
      :before-close="cancelPayment"
    >
      <div class="payment-dialog">
        <div class="order-summary">
          <h4>订单信息</h4>
          <div class="summary-item">
            <span>订单号：</span>
            <span>{{ order?.orderNumber || order?.id }}</span>
          </div>
          <div class="summary-item total">
            <span>支付金额：</span>
            <span class="amount">¥{{ (order?.totalAmount || 0).toFixed(2) }}</span>
          </div>
        </div>
        
        <div class="payment-methods">
          <h4>支付方式</h4>
          <el-radio-group v-model="selectedPaymentMethod" class="payment-options">
            <el-radio 
              v-for="method in paymentMethods" 
              :key="method.value" 
              :label="method.value"
              class="payment-option"
            >
              <div class="payment-item">
                <el-icon :style="{ color: method.color }">
                  <component :is="method.icon" />
                </el-icon>
                <span class="payment-label">{{ method.label }}</span>
              </div>
            </el-radio>
          </el-radio-group>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelPayment">取消</el-button>
          <el-button type="primary" @click="confirmPayment">
            确认支付 ¥{{ (order?.totalAmount || 0).toFixed(2) }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.order-detail-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.back-button {
  margin-bottom: 20px;
  
  .el-button {
    .el-icon {
      margin-right: 4px;
    }
  }
}

.loading-container {
  text-align: center;
  padding: 60px 20px;
  
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
  }
}

.empty-container {
  margin: 60px 0;
  text-align: center;
}

.order-detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.order-info-card,
.shipping-info-card,
.remark-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    h2, h3 {
      margin: 0;
      color: #333;
    }
    
    .el-tag {
      display: flex;
      align-items: center;
      
      .el-icon {
        margin-right: 4px;
      }
    }
  }
}

.order-basic-info,
.shipping-info {
  .info-row {
    display: flex;
    margin-bottom: 16px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .label {
      width: 120px;
      color: #666;
      font-weight: 500;
    }
    
    .value {
      flex: 1;
      color: #333;
      
      &.amount {
        color: #ff6b6b;
        font-weight: 600;
        font-size: 1.2rem;
      }
    }
  }
}

.remark-content {
  p {
    margin: 0;
    line-height: 1.6;
    color: #333;
  }
}

.order-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 30px;
  
  .el-button {
    min-width: 120px;
  }
}

/* 支付弹窗样式 */
.payment-dialog {
  .order-summary {
    background-color: #f9f9f9;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    
    h4 {
      margin: 0 0 12px 0;
      color: #333;
      font-size: 1rem;
    }
    
    .summary-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      &.total {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px dashed #ddd;
        font-weight: 600;
        
        .amount {
          color: #ff6b6b;
          font-size: 1.2rem;
        }
      }
    }
  }
  
  .payment-methods {
    h4 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 1rem;
    }
    
    .payment-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      
      .payment-option {
        margin: 0;
        
        .el-radio__input {
          margin-right: 12px;
        }
        
        .payment-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid #e4e7ed;
          border-radius: 8px;
          transition: all 0.3s;
          cursor: pointer;
          
          &:hover {
            border-color: #409eff;
            background-color: #f0f9ff;
          }
          
          .el-icon {
            font-size: 1.5rem;
          }
          
          .payment-label {
            font-weight: 500;
          }
        }
        
        &.is-checked .payment-item {
          border-color: #409eff;
          background-color: #f0f9ff;
        }
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .order-detail-container {
    padding: 15px;
  }
  
  .order-basic-info,
  .shipping-info {
    .info-row {
      flex-direction: column;
      
      .label {
        width: auto;
        margin-bottom: 4px;
      }
    }
  }
  
  .order-actions {
    flex-direction: column;
    
    .el-button {
      width: 100%;
    }
  }
  
  .payment-dialog {
    .payment-methods .payment-options .payment-option .payment-item {
      padding: 10px;
      
      .el-icon {
        font-size: 1.3rem;
      }
    }
  }
}
</style>