<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStoreManagementStore } from '../stores/storeManagement'

const props = defineProps({
  // 商品信息
  product: {
    type: Object,
    required: true
  }
})

const router = useRouter()
const storeManagementStore = useStoreManagementStore()

// 获取商品的秒杀信息
const flashSale = computed(() => {
  return storeManagementStore.getFlashSaleByProductId(props.product.id)
})

// 计算折扣百分比
const discountPercentage = computed(() => {
  if (!flashSale.value) return 0
  return Math.round((1 - flashSale.value.salePrice / flashSale.value.originalPrice) * 100)
})

// 计算剩余时间
const remainingTime = computed(() => {
  if (!flashSale.value) return { hours: 0, minutes: 0, seconds: 0 }
  
  const now = new Date()
  const endTime = new Date(flashSale.value.endTime)
  const diff = Math.max(0, endTime - now) / 1000 // 转换为秒
  
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = Math.floor(diff % 60)
  
  return { hours, minutes, seconds }
})

// 计算库存百分比
const stockPercentage = computed(() => {
  if (!flashSale.value) return 0
  return Math.round((flashSale.value.remainingStock / flashSale.value.totalStock) * 100)
})

// 跳转到商品详情
const goToProductDetail = () => {
  router.push(`/product/${props.product.id}`)
}
</script>

<template>
  <div class="flash-sale-item" v-if="flashSale" @click="goToProductDetail">
    <div class="flash-sale-badge">
      <span class="flash-icon">⚡</span> 秒杀
    </div>
    
    <div class="product-image">
      <img :src="product.image || 'https://picsum.photos/id/' + (product.id + 100) + '/400/300'" :alt="product.name">
      <div class="discount-badge">-{{ discountPercentage }}%</div>
    </div>
    
    <div class="product-info">
      <h3 class="product-name">{{ product.name }}</h3>
      
      <div class="price-container">
        <span class="sale-price">¥{{ flashSale.salePrice.toFixed(2) }}</span>
        <span class="original-price">¥{{ flashSale.originalPrice.toFixed(2) }}</span>
      </div>
      
      <div class="stock-info">
        <div class="stock-progress">
          <div class="stock-bar" :style="{ width: `${stockPercentage}%` }"></div>
        </div>
        <span class="stock-text">剩余 {{ flashSale.remainingStock }}/{{ flashSale.totalStock }}</span>
      </div>
      
      <div class="time-info">
        <span class="time-label">剩余时间:</span>
        <div class="time-counter">
          <span class="time-unit">{{ remainingTime.hours.toString().padStart(2, '0') }}</span>
          <span class="time-separator">:</span>
          <span class="time-unit">{{ remainingTime.minutes.toString().padStart(2, '0') }}</span>
          <span class="time-separator">:</span>
          <span class="time-unit">{{ remainingTime.seconds.toString().padStart(2, '0') }}</span>
        </div>
      </div>
      
      <el-button type="danger" class="buy-now-button" size="small" @click.stop="goToProductDetail">
        <el-icon><ShoppingCart /></el-icon> 立即抢购
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.flash-sale-item {
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }
}

.product-image {
  position: relative;
  height: 180px;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;
  }
  
  .discount-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: #ff6b6b;
    color: white;
    font-weight: 600;
    padding: 5px 10px;
    border-radius: 20px;
    font-size: 0.9rem;
  }
}

.product-info {
  padding: 15px;
}

.product-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 10px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.price-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  
  .sale-price {
    font-size: 1.3rem;
    font-weight: 700;
    color: #ff6b6b;
  }
  
  .original-price {
    font-size: 0.9rem;
    color: #999;
    text-decoration: line-through;
  }
}

.stock-info {
  margin-bottom: 10px;
  
  .stock-progress {
    height: 6px;
    background-color: #f0f0f0;
    border-radius: 3px;
    margin-bottom: 5px;
    overflow: hidden;
    
    .stock-bar {
      height: 100%;
      background-color: #ff6b6b;
      border-radius: 3px;
    }
  }
  
  .stock-text {
    font-size: 0.8rem;
    color: #666;
  }
}

.time-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  
  .time-label {
    font-size: 0.9rem;
    color: #666;
  }
  
  .time-counter {
    display: flex;
    align-items: center;
    
    .time-unit {
      background-color: #333;
      color: white;
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      min-width: 24px;
      text-align: center;
    }
    
    .time-separator {
      margin: 0 2px;
      color: #333;
      font-weight: 600;
    }
  }
}
.flash-sale-badge {
  position: absolute;
  top: 0;
  left: 0;
  background-color: #ff6b6b;
  color: white;
  padding: 4px 10px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 0 0 12px 0;
  z-index: 2;
  
  .flash-icon {
    margin-right: 4px;
  }
}

.buy-now-button {
  width: 100%;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s;
  
  &:hover {
    transform: scale(1.03);
  }
}
</style>