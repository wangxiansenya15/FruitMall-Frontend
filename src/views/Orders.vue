<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import api from '../services/api'
// 导入图标组件
import { 
  DocumentCopy, 
  CreditCard, 
  Check, 
  Wallet 
} from '@element-plus/icons-vue'

const userStore = useUserStore()
const router = useRouter()

// 订单数据
const orders = ref([])
const error = ref('')

// 订单状态映射（根据后端数据库字段定义）
// 后端状态：0-待支付，1-已支付，2-已发货，3-已完成，4-已取消
const statusMap = {
  0: { label: '待支付', color: '#E6A23C', icon: 'Clock' },
  1: { label: '已支付', color: '#409EFF', icon: 'Check' },
  2: { label: '已发货', color: '#F56C6C', icon: 'Van' },
  3: { label: '已完成', color: '#67C23A', icon: 'CircleCheck' },
  4: { label: '已取消', color: '#909399', icon: 'CircleClose' }
}

/**
 * 获取用户订单列表
 * 接口地址: GET /api/orders
 * 返回数据格式: {
 *   code: 200,
 *   data: [Order],
 *   message: string
 * }
 */
const fetchOrders = async () => {
  if (!userStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  try {
    loading.value = true
    error.value = ''
    
    console.log('正在获取订单列表...')
    const response = await api.get('/orders')
    console.log('订单列表响应:', response)
    console.log('响应数据类型:', typeof response)
    console.log('响应数据结构:', response)
    
    // 处理响应数据 - 兼容多种后端返回格式
    let ordersData = []
    
    if (Array.isArray(response)) {
      // 直接返回数组格式
      ordersData = response
      console.log('检测到直接数组格式')
    } else if (response && response.data) {
      if (Array.isArray(response.data)) {
        // data字段是数组格式
        ordersData = response.data
        console.log('检测到data数组格式')
      } else if (response.data.orders && Array.isArray(response.data.orders)) {
        // data.orders字段是数组格式
        ordersData = response.data.orders
        console.log('检测到data.orders数组格式')
      } else {
        console.log('未知的data格式:', response.data)
      }
    } else {
      console.log('未知的响应格式:', response)
    }
    
    orders.value = ordersData
    console.log('订单数据加载成功:', orders.value.length, '个订单')
    console.log('订单数据详情:', orders.value)
  } catch (err) {
    console.error('获取订单列表失败:', err)
    error.value = '获取订单列表失败，请稍后重试'
    
    if (err.response?.status === 401) {
      ElMessage.warning('登录已过期，请重新登录')
      router.push('/login')
    } else {
      ElMessage.error('获取订单列表失败')
    }
  } finally {
    loading.value = false
  }
}

/**
 * 查看订单详情
 */
const viewOrderDetail = (orderId) => {
  router.push(`/orders/${orderId}`)
}

// 当前展开的订单
const expandedOrder = ref(null)

// 切换订单展开状态
const toggleOrder = (orderId) => {
  expandedOrder.value = expandedOrder.value === orderId ? null : orderId
}

// 检查订单是否展开
const isExpanded = (orderId) => {
  return expandedOrder.value === orderId
}

/**
 * 获取支付方式标签
 */
const getPaymentMethodLabel = (paymentMethod) => {
  const method = paymentMethods.find(m => m.value === paymentMethod)
  return method ? method.label : '未知支付方式'
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

// 加载中状态
const loading = ref(true)

// 支付相关状态
const paymentDialogVisible = ref(false)
const selectedOrder = ref(null)
const selectedPaymentMethod = ref(1) // 默认支付宝

// 支付方式选项
const paymentMethods = [
  { value: 1, label: '支付宝 | AliPay', icon: 'CreditCard', color: '#1677ff' },
  { value: 2, label: '微信支付 | WeChatPay', icon: 'ChatDotRound', color: '#07c160' },
  { value: 3, label: '银联支付 | UnionPay', icon: 'Wallet', color: '#e60012' },
  { value: 4, label: '其他', icon: 'Money', color: '#909399' }
]

/**
 * 取消订单
 * 接口地址: PUT /api/orders/{orderId}/cancel
 */
const cancelOrder = async (order) => {
  try {
    await api.put(`/orders/${order.id}/cancel`)
    ElMessage.success('订单已取消')
    
    // 更新本地订单状态
    const index = orders.value.findIndex(o => o.id === order.id)
    if (index !== -1) {
      orders.value[index].status = 4 // 已取消状态（后端状态码4）
    }
  } catch (err) {
    console.error('取消订单失败:', err)
    ElMessage.error('取消订单失败，请稍后重试')
  }
}

/**
 * 打开支付弹窗
 */
const openPaymentDialog = (order) => {
  selectedOrder.value = order
  selectedPaymentMethod.value = 1 // 重置为默认支付方式
  paymentDialogVisible.value = true
}

/**
 * 确认支付订单
 * 接口地址: PUT /api/orders/{orderId}/pay
 */
const confirmPayment = async () => {
  try {
    // 发送支付请求，包含支付方式
    await api.put(`/orders/${selectedOrder.value.id}/pay`, {
      paymentMethod: selectedPaymentMethod.value
    })
    
    ElMessage.success('支付成功')
    
    // 更新本地订单状态
    const index = orders.value.findIndex(o => o.id === selectedOrder.value.id)
    if (index !== -1) {
      orders.value[index].status = 1 // 已支付状态（后端状态码1）
      orders.value[index].payTime = new Date().toISOString()
      orders.value[index].paymentMethod = selectedPaymentMethod.value
    }
    
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
  selectedOrder.value = null
}

/**
 * 再次购买
 */
const buyAgain = (order) => {
  // 将订单中的商品添加到购物车
  ElMessage.success('已将商品添加到购物车')
  router.push('/cart')
}

// 组件挂载时获取订单数据
onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <div class="orders-container">
    <div class="orders-header">
      <h1>我的订单</h1>
    </div>
    
    <el-card v-if="loading" class="loading-card">
      <div class="loading-content">
        <el-skeleton :rows="3" animated />
      </div>
    </el-card>
    
    <div v-else-if="orders.length > 0" class="orders-list">
      <div v-for="order in orders" :key="order.id" class="order-card">
        <div class="order-header" @click="toggleOrder(order.id)">
          <div class="order-info">
            <div class="order-id">
              <span class="label">订单号:</span>
              <span class="value">{{ order.orderNumber || order.id }}</span>
            </div>
            <div class="order-date">
              <span class="label">下单时间:</span>
              <span class="value">{{ formatDate(order.createTime) }}</span>
            </div>
          </div>
          
          <div class="order-status">
            <el-tag :type="statusMap[order.status]?.color" effect="light">
              <el-icon v-if="statusMap[order.status]?.icon">
                <component :is="statusMap[order.status].icon" />
              </el-icon>
              {{ statusMap[order.status]?.label }}
            </el-tag>
          </div>
          
          <div class="order-toggle">
            <el-icon v-if="isExpanded(order.id)"><ArrowUp /></el-icon>
            <el-icon v-else><ArrowDown /></el-icon>
          </div>
        </div>
        
        <div class="order-content" v-show="isExpanded(order.id)">
          <!-- 订单商品信息（如果有的话） -->
          <div v-if="order.items && order.items.length > 0" class="order-items">
            <div v-for="item in order.items" :key="item.id" class="order-item">
              <div class="item-image">
                <img :src="item.image || 'https://picsum.photos/id/' + (item.id + 100) + '/300/200'" :alt="item.name">
              </div>
              <div class="item-info">
                <div class="item-name">{{ item.name }}</div>
                <div class="item-price">¥{{ item.price.toFixed(2) }} × {{ item.quantity }}</div>
              </div>
              <div class="item-total">¥{{ (item.price * item.quantity).toFixed(2) }}</div>
            </div>
          </div>
          
          <div class="order-details">
            <div class="detail-row" v-if="order.shippingAddress">
              <span class="label">收货地址:</span>
              <span class="value">{{ order.shippingAddress }}</span>
            </div>
            <div class="detail-row" v-if="order.consigneeName">
              <span class="label">收货人:</span>
              <span class="value">{{ order.consigneeName }}</span>
            </div>
            <div class="detail-row" v-if="order.consigneePhone">
              <span class="label">联系电话:</span>
              <span class="value">{{ order.consigneePhone }}</span>
            </div>
            <div class="detail-row" v-if="order.remark">
              <span class="label">订单备注:</span>
              <span class="value">{{ order.remark }}</span>
            </div>
            <div class="detail-row" v-if="order.payTime">
              <span class="label">支付时间:</span>
              <span class="value">{{ formatDate(order.payTime) }}</span>
            </div>
            <div class="detail-row" v-if="order.paymentMethod && order.status !== 0">
              <span class="label">支付方式:</span>
              <span class="value">{{ getPaymentMethodLabel(order.paymentMethod) }}</span>
            </div>
            <div class="detail-row total">
              <span class="label">订单总价:</span>
              <span class="value">¥{{ (order.totalAmount || 0).toFixed(2) }}</span>
            </div>
          </div>
          
          <div class="order-actions">
            <el-button 
              v-if="order.status === 0" 
              type="primary" 
              size="small"
              @click="openPaymentDialog(order)"
            >
              立即支付
            </el-button>
            <el-button 
              v-if="order.status === 0 || order.status === 1" 
              type="danger" 
              plain 
              size="small"
              @click="cancelOrder(order)"
            >
              取消订单
            </el-button>
            <el-button 
              type="info" 
              plain 
              size="small"
              @click="viewOrderDetail(order.id)"
            >
              查看详情
            </el-button>
            <el-button 
              type="primary" 
              plain 
              size="small"
              @click="buyAgain(order)"
            >
              再次购买
            </el-button>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="empty-orders">
      <el-empty description="暂无订单">
        <el-button type="primary" @click="$router.push('/')">去购物</el-button>
      </el-empty>
    </div>
    
    <!-- 支付方式选择弹窗 -->
    <el-dialog
      v-model="paymentDialogVisible"
      title="选择支付方式"
      width="420px"
      :before-close="cancelPayment"
      class="payment-dialog-wrapper"
      align-center
    >
      <div class="payment-dialog">
        <div class="order-summary">
          <div class="summary-header">
            <el-icon class="summary-icon"><DocumentCopy /></el-icon>
            <h4>订单信息</h4>
          </div>
          <div class="summary-content">
            <div class="summary-item">
              <span class="label">订单号</span>
              <span class="value">{{ selectedOrder?.orderNumber || selectedOrder?.id }}</span>
            </div>
            <div class="summary-item total">
              <span class="label">支付金额</span>
              <span class="amount">¥{{ (selectedOrder?.totalAmount || 0).toFixed(2) }}</span>
            </div>
          </div>
        </div>
        
        <div class="payment-methods">
          <div class="methods-header">
            <el-icon class="methods-icon"><CreditCard /></el-icon>
            <h4>支付方式</h4>
          </div>
          <el-radio-group v-model="selectedPaymentMethod" class="payment-options">
            <el-radio 
              v-for="method in paymentMethods" 
              :key="method.value" 
              :label="method.value"
              class="payment-option"
            >
              <div class="payment-item">
                <div class="payment-icon">
                  <el-icon :style="{ color: method.color }">
                    <component :is="method.icon" />
                  </el-icon>
                </div>
                <div class="payment-content">
                  <span class="payment-label">{{ method.label.split(' | ')[0] }}</span>
                  <span class="payment-sublabel">{{ method.label.split(' | ')[1] || '' }}</span>
                </div>
                <div class="payment-check">
                  <el-icon v-if="selectedPaymentMethod === method.value" class="check-icon">
                    <Check />
                  </el-icon>
                </div>
              </div>
            </el-radio>
          </el-radio-group>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button size="large" @click="cancelPayment">取消</el-button>
          <el-button 
            type="primary" 
            size="large" 
            @click="confirmPayment"
            :disabled="!selectedPaymentMethod"
            class="confirm-btn"
          >
            <el-icon><Wallet /></el-icon>
            确认支付 ¥{{ (selectedOrder?.totalAmount || 0).toFixed(2) }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.orders-container {
  padding-bottom: 40px;
}

.orders-header {
  margin-bottom: 24px;
  
  h1 {
    font-size: 1.8rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: #333;
  }
}

.loading-card {
  padding: 20px;
  margin-bottom: 20px;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.order-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: #f9f9f9;
  }
}

.order-info {
  display: flex;
  gap: 24px;
  
  .order-id, .order-date {
    display: flex;
    align-items: center;
    
    .label {
      color: #666;
      margin-right: 8px;
    }
    
    .value {
      font-weight: 500;
    }
  }
}

.order-status {
  .el-tag {
    display: flex;
    align-items: center;
    
    .el-icon {
      margin-right: 4px;
    }
  }
}

.order-toggle {
  color: #999;
  transition: transform 0.3s;
}

.order-content {
  padding: 20px;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.order-items {
  margin-bottom: 24px;
}

.order-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
}

.item-image {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  margin-right: 16px;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.item-info {
  flex: 1;
}

.item-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.item-price {
  font-size: 0.9rem;
  color: #666;
}

.item-total {
  font-weight: 600;
  color: #ff6b6b;
}

.order-details {
  background-color: #f9f9f9;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.total {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #ddd;
    font-size: 1.1rem;
    
    .value {
      color: #ff6b6b;
      font-weight: 600;
    }
  }
  
  .label {
    width: 80px;
    color: #666;
  }
  
  .value {
    flex: 1;
  }
}

.order-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.empty-orders {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 60px 20px;
  text-align: center;
}

/* 支付弹窗样式 */
/* 支付弹窗样式优化 */
.payment-dialog-wrapper {
  .el-dialog {
    border-radius: 16px;
    overflow: hidden;
  }
  
  .el-dialog__header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px 24px;
    
    .el-dialog__title {
      font-size: 1.1rem;
      font-weight: 600;
    }
    
    .el-dialog__headerbtn {
      .el-dialog__close {
        color: white;
        font-size: 1.2rem;
        
        &:hover {
          color: rgba(255, 255, 255, 0.8);
        }
      }
    }
  }
  
  .el-dialog__body {
    padding: 24px;
  }
  
  .el-dialog__footer {
    padding: 16px 24px 24px;
    background-color: #fafafa;
  }
}

.payment-dialog {
  .order-summary {
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 24px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    
    .summary-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      
      .summary-icon {
        color: #667eea;
        font-size: 1.2rem;
      }
      
      h4 {
        margin: 0;
        color: #333;
        font-size: 1rem;
        font-weight: 600;
      }
    }
    
    .summary-content {
      .summary-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        .label {
          color: #666;
          font-size: 0.9rem;
        }
        
        .value {
          color: #333;
          font-weight: 500;
        }
        
        &.total {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.5);
          
          .label {
            font-weight: 600;
            color: #333;
            font-size: 1rem;
          }
          
          .amount {
            color: #ff6b6b;
            font-size: 1.3rem;
            font-weight: 700;
          }
        }
      }
    }
  }
  
  .payment-methods {
    .methods-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      
      .methods-icon {
        color: #667eea;
        font-size: 1.2rem;
      }
      
      h4 {
        margin: 0;
        color: #333;
        font-size: 1rem;
        font-weight: 600;
      }
    }
    
    .payment-options {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr; /* 修改为1x4布局 */
      gap: 10px; /* 减小间距以适应单行布局 */
      margin-bottom: 10px;
      
      .payment-option {
        margin: 0;
        position: relative;
        z-index: 1;
        
        .el-radio__input {
          display: none; /* 隐藏默认的radio按钮 */
        }
        
        .el-radio__label {
          padding: 0;
          width: 100%;
          display: block;
        }
        
        .payment-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 6px 4px; /* 进一步减小内边距适应单行布局 */
            border: 1px solid #e4e7ed;
            border-radius: 6px; /* 减小圆角 */
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            background: white;
            position: relative;
            min-height: 50px; /* 减小最小高度 */
            text-align: center;
            box-sizing: border-box;
            width: 100%;
            margin: 0;
          
          &:hover {
              border-color: #667eea;
              background-color: #f8f9ff;
              transform: translateY(-1px);
              box-shadow: 0 2px 6px rgba(102, 126, 234, 0.1);
              z-index: 2;
            }
          
          .payment-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px; /* 减小图标容器宽度 */
            height: 20px; /* 减小图标容器高度 */
            border-radius: 4px; /* 减小圆角 */
            background-color: #f5f7fa;
            margin-bottom: 4px; /* 减小底部间距 */
            
            .el-icon {
              font-size: 0.8rem; /* 减小图标大小 */
            }
          }
          
          .payment-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0px; /* 移除间距 */
            margin-bottom: 2px; /* 减小底部间距 */
            
            .payment-label {
              font-weight: 600;
              color: #333;
              font-size: 0.7rem; /* 减小字体大小 */
              line-height: 1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 100%;
            }
            
            .payment-sublabel {
              display: none; /* 隐藏副标签，节省空间 */
            }
          }
          
          .payment-check {
            position: absolute;
            top: 4px; /* 调整位置 */
            right: 4px; /* 调整位置 */
            width: 16px; /* 减小尺寸 */
            height: 16px; /* 减小尺寸 */
            display: flex;
            align-items: center;
            justify-content: center;
            background: #67c23a;
            border-radius: 50%;
            opacity: 0;
            transform: scale(0);
            transition: all 0.3s ease;
            
            .check-icon {
              color: white;
              font-size: 0.7rem; /* 减小图标大小 */
            }
          }
        }
        
        &.is-checked .payment-item {
          border-color: #667eea;
          background: linear-gradient(135deg, #f8f9ff 0%, #e8f0ff 100%);
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
          transform: translateY(-1px);
          
          .payment-icon {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            
            .el-icon {
              color: white;
            }
          }
          
          .payment-check {
            opacity: 1;
            transform: scale(1);
          }
        }
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  
  .el-button {
    flex: 1;
    border-radius: 10px;
    font-weight: 500;
    
    &:first-child {
      background-color: #f5f7fa;
      border-color: #e4e7ed;
      color: #666;
      
      &:hover {
        background-color: #e4e7ed;
        border-color: #d3d4d6;
      }
    }
  }
  
  .confirm-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
    }
    
    &:disabled {
      background: #c0c4cc;
      cursor: not-allowed;
    }
    
    .el-icon {
      margin-right: 6px;
    }
  }
}

/* 动画效果 */
@keyframes checkIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .order-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .order-info {
    flex-direction: column;
    gap: 8px;
  }
  
  .order-status {
    align-self: flex-start;
  }
  
  .order-toggle {
    position: absolute;
    top: 16px;
    right: 16px;
  }
  
  .payment-dialog {
    .payment-methods .payment-options {
      grid-template-columns: 1fr;
      gap: 8px;
      
      .payment-option .payment-item {
        flex-direction: row;
        padding: 12px;
        min-height: auto;
        text-align: left;
        
        .payment-icon {
          width: 36px;
          height: 36px;
          margin-bottom: 0;
          margin-right: 12px;
          
          .el-icon {
            font-size: 1.4rem;
          }
        }
        
        .payment-content {
          flex: 1;
          align-items: flex-start;
          margin-bottom: 0;
          
          .payment-label {
            font-size: 0.85rem;
          }
          
          .payment-sublabel {
            font-size: 0.7rem;
          }
        }
        
        .payment-check {
          position: static;
          margin-left: 8px;
        }
      }
    }
  }
}
</style>