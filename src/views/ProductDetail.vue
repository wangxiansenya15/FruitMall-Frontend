<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore, useCartStore, useUserStore } from '../stores'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../services/api'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const cartStore = useCartStore()
const userStore = useUserStore()

// 获取商品ID
const productId = computed(() => parseInt(route.params.id))

// 商品详情数据
const product = ref(null)
const loading = ref(false)
const error = ref('')

// 获取商品详情
const fetchProductDetail = async () => {
  try {
    loading.value = true
    error.value = ''
    
    console.log('正在获取商品详情:', productId.value)
    const response = await api.get(`/products/${productId.value}`)
    console.log('商品详情响应:', response)
    console.log('响应数据类型:', typeof response)
    console.log('响应数据结构:', Object.keys(response || {}))
    
    // 直接使用API返回的数据，不进行额外处理
    if (response) {
      product.value = response
      console.log('商品数据已设置:', product.value)
      console.log('库存值:', product.value.stock)
      console.log('描述值:', product.value.description)
    } else {
      throw new Error('商品不存在')
    }
  } catch (err) {
    console.error('获取商品详情失败:', err)
    error.value = '获取商品详情失败'
    
    // 如果API调用失败，尝试从store获取
    const storeProduct = productStore.getProductById(productId.value)
    if (storeProduct) {
      product.value = storeProduct
      console.log('使用store中的商品数据:', product.value)
    } else {
      ElMessage.error('商品不存在')
      router.push('/')
    }
  } finally {
    loading.value = false
  }
}

// 组件挂载时获取商品详情
onMounted(() => {
  fetchProductDetail()
  // 确保页面滚动到顶部，避免从首页点击进入时停留在页面底部
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

// 购买数量
const quantity = ref(1)

// 增减数量
const decreaseQuantity = () => {
  if (quantity.value > 1) {
    quantity.value--
  }
}

const increaseQuantity = () => {
  if (quantity.value < product.value?.stock) {
    quantity.value++
  }
}

// 添加到购物车
// 调用后端API: POST /api/cart/items
// 参数: 
//   - productId: 商品ID
//   - quantity: 购买数量
// 返回值: CartItem对象 - 包含添加的购物车项信息
const addToCart = () => {
  if (!product.value) return
  
  cartStore.addToCart(product.value, quantity.value)
  
  ElMessage.success(`已将 ${quantity.value} 件 ${product.value.name} 添加到购物车`)
  
  // 重置数量
  quantity.value = 1
}

// 立即购买
// 调用后端API: POST /api/orders/checkout
// 参数:
//   - items: 商品列表 [{productId, quantity}]
// 返回值: Order对象 - 包含创建的订单信息
const buyNow = () => {
  if (!product.value) return
  
  if (!userStore.isAuthenticated) {
    router.push(`/login?redirect=/product/${productId.value}`)
    return
  }
  
  // 添加到购物车
  cartStore.addToCart(product.value, quantity.value)
  
  // 跳转到购物车页面
  router.push('/cart')
}

// 评论相关
const commentForm = ref({
  rating: 5,
  comment: ''
})

const isSubmitting = ref(false)

// 提交评论
const submitReview = async () => {
  if (!userStore.isAuthenticated) {
    router.push(`/login?redirect=/product/${productId.value}`)
    return
  }
  
  if (!commentForm.value.comment.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }
  
  try {
    isSubmitting.value = true
    
    // 调用后端API提交评论
    const reviewData = {
      rating: commentForm.value.rating,
      comment: commentForm.value.comment
    }
    
    console.log('提交评论:', reviewData)
    const response = await api.post(`/products/${productId.value}/reviews`, reviewData)
    console.log('评论提交响应:', response)
    
    // 重置表单
    commentForm.value.rating = 5
    commentForm.value.comment = ''
    
    ElMessage.success('评论提交成功')
    
    // 重新获取商品详情以更新评论列表
    await fetchProductDetail()
    
  } catch (error) {
    console.error('提交评论失败:', error)
    ElMessage.error('提交评论失败，请稍后重试')
  } finally {
    isSubmitting.value = false
  }
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<template>
  <div class="product-detail-container">
    <!-- 返回首页按钮 -->
    <div class="back-to-home">
      <el-button type="primary" plain @click="() => router.push('/')">
        <el-icon><ArrowLeft /></el-icon>
        返回首页
      </el-button>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
      <div class="loading-text">
        <el-icon class="is-loading"><Loading /></el-icon>
        正在加载商品详情...
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
          <el-button type="primary" size="small" @click="fetchProductDetail" style="margin-top: 10px;">
            重新加载
          </el-button>
        </template>
      </el-alert>
    </div>
    
    <!-- 商品详情内容 -->
    <div v-else-if="product" class="product-detail-content-wrapper">
      <!-- 商品详情 -->
      <div class="product-detail-content">
      <div class="product-gallery">
        <div class="main-image">
          <img :src="product.imageUrl || 'https://picsum.photos/id/' + (product.id + 100) + '/600/400'" :alt="product.name">
        </div>
      </div>
      
      <div class="product-info">
          <h1 class="product-name">{{ product.name }}</h1>
          
          <div class="product-rating">
            <el-rate 
              :model-value="product.rating || 0" 
              disabled 
              text-color="#ff9900"
              score-template="{value}"
              :show-score="true"
              :colors="['#ff9900', '#ff9900', '#ff9900']"
            ></el-rate>
            <span class="review-count">{{ (product.reviews || []).length }} 条评价</span>
          </div>
          
          <div class="product-price">
            <span class="price">¥{{ (product.price || 0).toFixed(2) }}</span>
          </div>
          
          <div class="product-description">
            <p>{{ product.description }}</p>
          </div>
          
          <div class="product-meta">
            <div class="meta-item">
              <span class="label">分类:</span>
              <span class="value">{{ product.category }}</span>
            </div>
            <div class="meta-item">
              <span class="label">库存:</span>
              <span class="value">{{ product.stock }} 件</span>
            </div>
          </div>
          
          <div class="quantity-control">
            <span class="label">数量:</span>
            <div class="quantity-buttons">
              <el-button 
                size="small"
                :disabled="quantity <= 1"
                @click="decreaseQuantity"
              >
                <el-icon><Minus /></el-icon>
              </el-button>
              <el-input-number 
                v-model="quantity" 
                :min="1" 
                :max="product?.stock || 999"
                controls-position=""
                class="quantity-input"
              />
              <el-button 
                size="small"
                :disabled="!product || quantity >= product.stock"
                @click="increaseQuantity"
              >
                <el-icon><Plus /></el-icon>
              </el-button>
            </div>
          </div>
        
        <div class="product-actions">
          <el-button 
            type="primary" 
            class="buy-button" 
            size="large"
            :disabled="!product || product.stock <= 0"
            @click="buyNow"
          >
            立即购买
          </el-button>
          
          <el-button 
            type="default" 
            class="cart-button" 
            size="large"
            :disabled="!product || product.stock <= 0"
            @click="addToCart"
          >
            <el-icon><ShoppingCart /></el-icon>
            加入购物车
          </el-button>
        </div>
      </div>
    </div>
    
    <!-- 评论区 -->
    <div class="product-reviews">
      <h2 class="section-title">商品评价</h2>
      
      <!-- 评论列表 -->
      <div v-if="(product.reviews || []).length > 0" class="reviews-list">
        <div v-for="review in (product.reviews || [])" :key="review.id" class="review-item">
          <div class="review-header">
            <div class="reviewer-info">
              <el-avatar :size="40" icon="UserFilled"></el-avatar>
              <div class="reviewer-meta">
                <div class="reviewer-name">{{ review.username }}</div>
                <div class="review-date">{{ formatDate(review.date) }}</div>
              </div>
            </div>
            <div class="review-rating">
              <el-rate 
                v-model="review.rating" 
                disabled 
                :colors="['#ff9900', '#ff9900', '#ff9900']"
              ></el-rate>
            </div>
          </div>
          <div class="review-content">
            <p>{{ review.comment }}</p>
          </div>
        </div>
      </div>
      
      <div v-else class="no-reviews">
        <el-empty description="暂无评价" />
      </div>
      
      <!-- 评论表单 -->
      <div class="review-form">
        <h3>发表评价</h3>
        
        <div class="form-group">
          <label>评分</label>
          <el-rate 
            v-model="commentForm.rating" 
            :colors="['#ff9900', '#ff9900', '#ff9900']"
          ></el-rate>
        </div>
        
        <div class="form-group">
          <label>评论</label>
          <el-input 
            v-model="commentForm.comment" 
            type="textarea" 
            :rows="4" 
            placeholder="分享您对这个商品的看法..."
          ></el-input>
        </div>
        
        <el-button 
          type="primary" 
          class="submit-button" 
          :loading="isSubmitting"
          @click="submitReview"
        >
          提交评价
        </el-button>
      </div>
    </div>
    </div>
    
    <!-- 无商品数据状态 -->
    <div v-else class="empty-container">
      <el-empty description="商品不存在">
        <el-button type="primary" @click="() => router.push('/')">返回首页</el-button>
      </el-empty>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "sass:color";

.product-detail-container {
  padding: 30px 20px;
}

/* 返回首页按钮样式 */
.back-to-home {
  margin-bottom: 20px;
  text-align: left; /* 左上显示按钮 */
  
  .el-button {
    border-radius: 8px;
    padding: 8px 16px;
    
    .el-icon {
      margin-right: 4px;
    }
  }
}

/* 加载状态样式 */
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

/* 错误状态样式 */
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

/* 空数据状态样式 */
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

.product-detail-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 50px;
  background-color: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.08);
}

.product-gallery {
  padding: 30px;
}

.main-image {
  width: 100%;
  height: 450px;
  border-radius: 12px;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.product-info {
  padding: 40px 30px;
  display: flex;
  flex-direction: column;
}

.product-name {
  font-size: 2.4rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: #333;
}
  
  .product-rating {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    
    .review-count {
      margin-left: 8px;
      color: #666;
    }
  }
  
  .product-price {
    font-size: 2.2rem;
    font-weight: 600;
    color: #ff6b6b;
    margin-bottom: 20px;
  }
  
  .product-description {
    margin-bottom: 20px;
    line-height: 1.6;
    color: #555;
  }
  
  .product-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 24px;
    
    .meta-item {
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
  
  .quantity-control {
    display: flex;
    align-items: center;
    gap: 16px; /* 增加间距避免重叠 */
    margin-bottom: 24px;
    padding: 12px 0; /* 增加垂直内边距 */
    
    .label {
      font-weight: 500;
      color: #333;
      min-width: 50px; /* 增加标签宽度 */
      flex-shrink: 0; /* 防止标签被压缩 */
    }
    
    .quantity-buttons {
      display: flex;
      align-items: center;
      gap: 12px; /* 增加按钮间距 */
      
      .el-button {
        width: 40px; /* 增加按钮宽度 */
        height: 40px; /* 增加按钮高度 */
        border-radius: 8px;
        flex-shrink: 0; /* 防止按钮被压缩 */
        
        .el-icon {
          font-size: 16px; /* 增加图标大小 */
        }
      }
      
      .quantity-input {
        width: 100px; /* 增加输入框宽度 */
        flex-shrink: 0; /* 防止输入框被压缩 */
        
        :deep(.el-input__inner) {
          text-align: center;
          font-weight: 500;
          height: 40px; /* 确保与按钮高度一致 */
        }
        
        :deep(.el-input-number__decrease),
        :deep(.el-input-number__increase) {
          display: none; /* 隐藏默认的增减按钮，使用自定义按钮 */
        }
      }
    }
  }
  
  .product-actions {
    margin-top: 30px;
    display: flex;
    gap: 16px;
    
    .el-button {
      flex: 1;
      border-radius: 8px;
      font-weight: 500;
      
      &.buy-button {
        background-color: #ff6b6b;
        border-color: #ff6b6b;
        
        &:hover {
          background-color: color.adjust(#ff6b6b, $lightness: -5%);
          border-color: color.adjust(#ff6b6b, $lightness: -5%);
        }
      }
      
      &.cart-button {
        border-color: #ff6b6b;
        color: #ff6b6b;
        
        &:hover {
          background-color: #ff6b6b;
          color: white;
        }
        
        .el-icon {
          margin-right: 4px;
        }
      }
    }
  }

.product-reviews {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 24px;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 24px;
  color: #333;
}

.reviews-list {
  margin-bottom: 40px;
}

.review-item {
  padding: 20px 0;
  border-bottom: 1px solid #eee;
  
  &:last-child {
    border-bottom: none;
  }
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.reviewer-info {
  display: flex;
  align-items: center;
}

.reviewer-meta {
  margin-left: 12px;
}

.reviewer-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.review-date {
  font-size: 0.9rem;
  color: #666;
}

.review-content {
  line-height: 1.6;
  color: #333;
}

.no-reviews {
  padding: 40px 0;
  text-align: center;
}

.review-form {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #eee;
  
  h3 {
    font-size: 1.3rem;
    font-weight: 600;
    margin-bottom: 20px;
    color: #333;
  }
  
  .form-group {
    margin-bottom: 20px;
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }
  }
  
  .submit-button {
    background-color: #ff6b6b;
    border-color: #ff6b6b;
    padding: 10px 24px;
    
    &:hover {
      background-color: color.adjust(#ff6b6b, $lightness: -5%);
      border-color: color.adjust(#ff6b6b, $lightness: -5%);
    }
  }
}

/* 响应式设计 */
@media (max-width: 992px) {
  .product-detail-content {
    gap: 20px;
  }
  
  .product-gallery {
    padding: 20px;
  }
  
  .product-info {
    padding: 30px 20px;
  }
  
  .product-name {
    font-size: 2rem;
  }
  
  .product-price {
    font-size: 1.8rem;
  }
}

@media (max-width: 768px) {
  .product-detail-content {
    grid-template-columns: 1fr;
  }
  
  .main-image {
    height: 350px;
  }
  
  .product-info {
    padding: 25px 20px;
  }
}

@media (max-width: 480px) {
  .main-image {
    height: 280px;
  }
  
  .product-name {
    font-size: 1.8rem;
  }
  
  .product-price {
    font-size: 1.6rem;
  }
  
  .quantity-control button {
    width: 40px;
    height: 40px;
  }
  
  .quantity-control input {
    width: 50px;
    height: 40px;
  }
}
</style>