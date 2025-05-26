<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()

// 模拟订单数据
const orders = ref([
  {
    id: 10001,
    date: '2023-09-15',
    status: 'completed',
    total: 156.7,
    items: [
      { id: 1, name: '红富士苹果', price: 12.9, quantity: 5, image: '/images/apple.jpg' },
      { id: 3, name: '泰国山竹', price: 35.8, quantity: 2, image: '/images/mangosteen.jpg' }
    ],
    address: '北京市朝阳区建国路88号',
    payment: '微信支付'
  },
  {
    id: 10002,
    date: '2023-10-02',
    status: 'shipping',
    total: 89.9,
    items: [
      { id: 4, name: '智利车厘子', price: 89.9, quantity: 1, image: '/images/cherry.jpg' }
    ],
    address: '北京市朝阳区建国路88号',
    payment: '支付宝'
  },
  {
    id: 10003,
    date: '2023-10-10',
    status: 'pending',
    total: 76.6,
    items: [
      { id: 2, name: '海南香蕉', price: 8.5, quantity: 3, image: '/images/banana.jpg' },
      { id: 5, name: '新疆哈密瓜', price: 29.9, quantity: 1, image: '/images/hami-melon.jpg' },
      { id: 6, name: '泰国椰青', price: 15.9, quantity: 1, image: '/images/coconut.jpg' }
    ],
    address: '北京市朝阳区建国路88号',
    payment: '银行卡'
  }
])

// 订单状态映射
const statusMap = {
  'pending': { label: '待发货', color: '#E6A23C', icon: 'Clock' },
  'shipping': { label: '配送中', color: '#409EFF', icon: 'Van' },
  'completed': { label: '已完成', color: '#67C23A', icon: 'CircleCheck' },
  'cancelled': { label: '已取消', color: '#909399', icon: 'CircleClose' }
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

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

// 加载中状态
const loading = ref(true)

// 模拟加载数据
onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 800)
})

// 再次购买
const buyAgain = (order) => {
  ElMessage.success('已将商品添加到购物车')
}

// 取消订单
const cancelOrder = (order) => {
  ElMessage.success('订单已取消')
  // 更新订单状态
  const index = orders.value.findIndex(o => o.id === order.id)
  if (index !== -1) {
    orders.value[index].status = 'cancelled'
  }
}
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
              <span class="value">{{ order.id }}</span>
            </div>
            <div class="order-date">
              <span class="label">下单时间:</span>
              <span class="value">{{ formatDate(order.date) }}</span>
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
          <div class="order-items">
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
            <div class="detail-row">
              <span class="label">收货地址:</span>
              <span class="value">{{ order.address }}</span>
            </div>
            <div class="detail-row">
              <span class="label">支付方式:</span>
              <span class="value">{{ order.payment }}</span>
            </div>
            <div class="detail-row total">
              <span class="label">订单总价:</span>
              <span class="value">¥{{ order.total.toFixed(2) }}</span>
            </div>
          </div>
          
          <div class="order-actions">
            <el-button 
              v-if="order.status === 'pending'" 
              type="danger" 
              plain 
              size="small"
              @click="cancelOrder(order)"
            >
              取消订单
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
}
</style>