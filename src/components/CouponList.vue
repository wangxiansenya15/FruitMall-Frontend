<script setup>
import { ref, computed } from 'vue'
import { useStoreManagementStore } from '../stores/storeManagement'
import { ElMessage } from 'element-plus'

const props = defineProps({
  // 是否在结算页面使用
  isCheckout: {
    type: Boolean,
    default: false
  },
  // 订单总金额，用于判断优惠券是否可用
  orderTotal: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['select-coupon'])

const storeManagementStore = useStoreManagementStore()

// 获取有效的优惠券列表
const activeCoupons = computed(() => storeManagementStore.activeCoupons)

// 选中的优惠券
const selectedCoupon = ref(null)

// 根据订单金额筛选可用的优惠券
const availableCoupons = computed(() => {
  if (!props.isCheckout) return activeCoupons.value
  
  return activeCoupons.value.filter(coupon => {
    return props.orderTotal >= coupon.minPurchase
  })
})

// 格式化优惠券面值
const formatCouponValue = (coupon) => {
  if (coupon.type === 'percentage') {
    return `${coupon.value}% 折扣`
  } else {
    return `¥${coupon.value.toFixed(2)} 元`
  }
}

// 计算优惠券折扣金额
const calculateDiscount = (coupon) => {
  if (!coupon) return 0
  
  if (coupon.type === 'percentage') {
    return props.orderTotal * (coupon.value / 100)
  } else {
    return coupon.value
  }
}

// 选择优惠券
const selectCoupon = (coupon) => {
  if (!props.isCheckout) return
  
  if (props.orderTotal < coupon.minPurchase) {
    ElMessage.warning(`订单金额不满${coupon.minPurchase}元，无法使用此优惠券`)
    return
  }
  
  selectedCoupon.value = coupon
  const discount = calculateDiscount(coupon)
  emit('select-coupon', { coupon, discount })
  ElMessage.success(`已选择优惠券：${formatCouponValue(coupon)}`)
}

// 取消选择优惠券
const cancelCoupon = () => {
  selectedCoupon.value = null
  emit('select-coupon', { coupon: null, discount: 0 })
  ElMessage.info('已取消使用优惠券')
}
</script>

<template>
  <div class="coupon-list">
    <div class="coupon-header">
      <h3>{{ props.isCheckout ? '可用优惠券' : '我的优惠券' }}</h3>
      <span v-if="availableCoupons.length === 0" class="no-coupons">暂无可用优惠券</span>
    </div>
    
    <div class="coupons-container">
      <div 
        v-for="coupon in availableCoupons" 
        :key="coupon.id"
        class="coupon-card"
        :class="{
          'selected': selectedCoupon && selectedCoupon.id === coupon.id,
          'selectable': props.isCheckout
        }"
        @click="selectCoupon(coupon)"
      >
        <div class="coupon-value">
          <span v-if="coupon.type === 'percentage'">
            <strong>{{ coupon.value }}%</strong>
            <small>折扣</small>
          </span>
          <span v-else>
            <small>¥</small>
            <strong>{{ coupon.value.toFixed(2) }}</strong>
          </span>
        </div>
        
        <div class="coupon-info">
          <div class="coupon-name">{{ coupon.code }}</div>
          <div class="coupon-condition" v-if="coupon.minPurchase > 0">
            满{{ coupon.minPurchase }}元可用
          </div>
          <div class="coupon-date">
            {{ new Date(coupon.startDate).toLocaleDateString() }} 至 
            {{ new Date(coupon.endDate).toLocaleDateString() }}
          </div>
        </div>
        
        <div class="coupon-status" v-if="props.isCheckout && selectedCoupon && selectedCoupon.id === coupon.id">
          <el-icon><Check /></el-icon>
        </div>
      </div>
    </div>
    
    <div class="coupon-actions" v-if="props.isCheckout && selectedCoupon">
      <el-button type="text" @click="cancelCoupon">取消使用优惠券</el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.coupon-list {
  margin-bottom: 20px;
}

.coupon-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  
  h3 {
    font-size: 1.2rem;
    color: #333;
    margin: 0;
  }
  
  .no-coupons {
    color: #999;
    font-size: 0.9rem;
  }
}

.coupons-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.coupon-card {
  width: 100%;
  max-width: 320px;
  height: 100px;
  background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  position: relative;
  overflow: hidden;
  border: 1px solid #eee;
  
  &::before {
    content: '';
    position: absolute;
    left: -5px;
    top: 50%;
    width: 10px;
    height: 10px;
    background-color: #f8f9fa;
    border-radius: 50%;
    transform: translateY(-50%);
    box-shadow: 0 0 0 1px #eee;
  }
  
  &::after {
    content: '';
    position: absolute;
    right: -5px;
    top: 50%;
    width: 10px;
    height: 10px;
    background-color: #f8f9fa;
    border-radius: 50%;
    transform: translateY(-50%);
    box-shadow: 0 0 0 1px #eee;
  }
  
  &.selectable {
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }
  
  &.selected {
    border: 1px solid #ff6b6b;
    background: linear-gradient(135deg, #fff0f0 0%, #fff 100%);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.2);
  }
}

.coupon-value {
  width: 100px;
  background-color: #ff6b6b;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 0 15px;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 8px;
    background: radial-gradient(circle at left, transparent 0, transparent 4px, #ff6b6b 4px, #ff6b6b 100%) repeat-y;
    background-size: 8px 15px;
  }
  
  strong {
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1;
  }
  
  small {
    font-size: 0.9rem;
  }
}

.coupon-info {
  flex: 1;
  padding: 15px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.coupon-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.coupon-condition {
  font-size: 0.9rem;
  color: #ff6b6b;
  margin-bottom: 5px;
}

.coupon-date {
  font-size: 0.8rem;
  color: #999;
}

.coupon-status {
  position: absolute;
  right: 10px;
  top: 10px;
  color: #ff6b6b;
  font-size: 1.2rem;
}

.coupon-actions {
  margin-top: 10px;
  text-align: right;
}

@media (max-width: 768px) {
  .coupons-container {
    flex-direction: column;
  }
  
  .coupon-card {
    max-width: 100%;
  }
}
</style>