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

// 组件挂载时获取商品详情和评论列表
onMounted(async () => {
  await fetchProductDetail()
  await fetchProductReviews()
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
const addToCart = async () => {
  if (!product.value) return
  
  // 检查用户登录状态，未登录时跳转到登录页面
  if (!userStore.isAuthenticated) {
    router.push(`/login?redirect=/product/${productId.value}`)
    return
  }
  
  try {
    await cartStore.addToCart(product.value, quantity.value)
    ElMessage.success(`已将 ${quantity.value} 件 ${product.value.name} 添加到购物车`)
    
    // 重置数量
    quantity.value = 1
  } catch (error) {
    console.error('添加到购物车失败:', error)
    
    // 检查是否是原始的401未授权错误
    const originalError = error.originalError || error
    
    if (originalError.response?.status === 401 || originalError.code === 401) {
      ElMessage.warning('请先登录后再添加商品到购物车')
      router.push(`/login?redirect=/product/${productId.value}`)
    } else if (error.message && error.message.includes('已暂存到本地')) {
      // 如果是暂存到本地的情况，显示成功信息
      ElMessage.success(`已将 ${quantity.value} 件 ${product.value.name} 暂存到本地购物车`)
      // 重置数量
      quantity.value = 1
    } else {
      // 其他错误情况
      ElMessage.error(error.message || '添加到购物车失败，请稍后重试')
    }
  }
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
const reviews = ref([])
const reviewsLoading = ref(false)
const reviewsError = ref('')

// 获取商品评论列表
// 接口地址: GET /api/products/{productId}/reviews
const fetchProductReviews = async () => {
  try {
    reviewsLoading.value = true
    reviewsError.value = ''
    
    console.log('正在获取商品评论:', productId.value)
    const response = await api.get(`/products/${productId.value}/reviews`)
    console.log('评论列表响应:', response)
    
    reviews.value = response.data || response || []
    console.log('评论列表加载成功:', reviews.value)
  } catch (err) {
    console.error('获取评论列表失败:', err)
    reviewsError.value = '获取评论失败'
    reviews.value = []
  } finally {
    reviewsLoading.value = false
  }
}

// 提交评论
// 接口地址: POST /api/products/{productId}/reviews
// 参数: { rating: number, comment: string }
const submitReview = async () => {
  // 检查用户是否已登录，如果未登录则跳转到登录页面
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录后再提交评论')
    router.push(`/login?redirect=/product/${productId.value}`)
    return
  }
  
  // 检查用户信息是否完整，确保用户ID存在
  if (!userStore.user || !userStore.user.id) {
    ElMessage.warning('用户信息不完整，请重新登录')
    userStore.logout() // 登出当前可能已损坏的会话
    router.push(`/login?redirect=/product/${productId.value}`)
    return
  }
  
  // 检查评论内容是否为空
  if (!commentForm.value.comment.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }
  
  try {
    isSubmitting.value = true
    
    // 调用后端API提交评论
    // 确保评分值是一个有效的数字，并且在0-5的范围内
    const rating = Number(commentForm.value.rating);
    if (isNaN(rating) || rating < 0 || rating > 5) {
      throw new Error('评分必须是0-5之间的数字');
    }
    
    const reviewData = {
      userId: userStore.user?.id, // 添加用户ID，从用户存储中获取
      productId: productId.value, // 添加商品ID，因为后端API可能需要
      rating: rating, // 使用转换后的数字类型评分值
      content: commentForm.value.comment.trim() // 确保评论内容不含首尾空格，字段名改为content以匹配后端期望
    }
    
    // 确保必要字段存在
    if (!reviewData.userId) {
      throw new Error('用户ID不能为空，请确保已登录')
    }
    
    console.log('提交评论:', reviewData)
    // 直接发送评论数据，不进行额外封装
    console.log('请求体:', reviewData)
    // 使用原始API路径，保持与后端接口一致
    const response = await api.post(`/products/${productId.value}/reviews`, reviewData)
    console.log('评论提交响应:', response)
    
    // 重置表单
    commentForm.value.rating = 5
    commentForm.value.comment = ''
    
    ElMessage.success('评论提交成功')
    
    // 重新获取评论列表
    await fetchProductReviews()
    
  } catch (error) {
    console.error('提交评论失败:', error)
    if (error.response?.status === 401) {
      ElMessage.warning('登录已过期，请重新登录')
      router.push(`/login?redirect=/product/${productId.value}`)
    } else {
      ElMessage.error('提交评论失败，请稍后重试')
    }
  } finally {
    isSubmitting.value = false
  }
}

// 格式化日期 - 处理数组格式的时间数据 [year, month, day, hour, minute]
const formatDate = (dateInput) => {
  let date
  
  // 如果是数组格式 [2024, 1, 16, 14, 20]，需要转换为Date对象
  if (Array.isArray(dateInput) && dateInput.length >= 3) {
    // 注意：JavaScript的月份是从0开始的，所以需要减1
    const [year, month, day, hour = 0, minute = 0] = dateInput
    date = new Date(year, month - 1, day, hour, minute)
  } else {
    // 如果是字符串格式，直接创建Date对象
    date = new Date(dateInput)
  }
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    return '无效日期'
  }
  
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
            <span class="review-count">{{ reviews.length }} 条评价</span>
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
      
      <!-- 评论加载状态 -->
      <div v-if="reviewsLoading" class="reviews-loading">
        <el-skeleton :rows="3" animated />
        <div class="loading-text">
          <el-icon class="is-loading"><Loading /></el-icon>
          正在加载评论...
        </div>
      </div>
      
      <!-- 评论错误状态 -->
      <div v-else-if="reviewsError" class="reviews-error">
        <el-alert
          :title="reviewsError"
          type="warning"
          show-icon
          :closable="false"
        >
          <template #default>
            <el-button type="primary" size="small" @click="fetchProductReviews" style="margin-top: 10px;">
              重新加载
            </el-button>
          </template>
        </el-alert>
      </div>
      
      <!-- 评论列表 -->
      <div v-else-if="reviews.length > 0" class="reviews-list">
        <div v-for="review in reviews" :key="review.id" class="review-item">
          <div class="review-header">
            <div class="reviewer-info">
              <el-avatar :size="40" icon="UserFilled"></el-avatar>
              <div class="reviewer-meta">
                <div class="reviewer-name">{{ review.username || review.userName || '匿名用户' }}</div>
                <div class="review-date">{{ formatDate(review.createTime || review.date) }}</div>
              </div>
            </div>
            <div class="review-rating">
              <el-rate 
                :model-value="review.rating" 
                disabled 
                :colors="['#ff9900', '#ff9900', '#ff9900']"
              ></el-rate>
            </div>
          </div>
          <div class="review-content">
            <p>{{ review.content || review.comment }}</p>
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
  width: 100%;
  box-sizing: border-box;
  max-width: 100%;
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
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
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
  width: 100%;
  box-sizing: border-box;
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
    word-wrap: break-word;
    overflow-wrap: break-word;
    width: 100%;
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
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
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
    padding: 0 15px;
  }
  
  .product-gallery {
    padding: 20px 15px;
  }
  
  .product-info {
    padding: 30px 20px;
  }
  
  .product-name {
    font-size: 2rem;
    line-height: 1.3;
  }
  
  .product-price {
    font-size: 1.8rem;
  }
  
  .product-reviews {
    padding: 20px 15px;
  }
}

@media (max-width: 768px) {
  .product-detail-page {
    padding: 15px 10px;
  }
  
  .product-detail-content {
    grid-template-columns: 1fr;
    gap: 15px;
    padding: 0 10px;
  }
  
  .main-image {
    height: 350px;
    border-radius: 8px;
  }
  
  .product-info {
    padding: 20px 15px;
  }
  
  .product-name {
    font-size: 1.8rem;
    margin-bottom: 12px;
  }
  
  .product-description {
    font-size: 0.95rem;
    line-height: 1.5;
  }
  
  .product-meta {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 12px;
    
    .el-button {
      width: 100%;
      height: 44px;
      font-size: 1rem;
    }
  }
  
  .product-reviews {
    padding: 20px 10px;
    margin: 15px 0;
  }
  
  .section-title {
    font-size: 1.3rem;
    margin-bottom: 20px;
  }
  
  .review-form {
    .el-form-item {
      margin-bottom: 16px;
    }
    
    .el-button {
      width: 100%;
      height: 44px;
    }
  }
}

@media (max-width: 768px) {
  .product-detail-container {
    padding: 20px 15px;
  }
  
  .product-detail-content {
    grid-template-columns: 1fr; /* 改为单列布局 */
    gap: 20px;
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
  }
  
  .product-gallery {
    padding: 15px;
  }
  
  .main-image {
    height: 300px;
    border-radius: 10px;
  }
  
  .product-info {
    padding: 20px 15px;
    width: 100%;
    box-sizing: border-box;
  }
}

@media (max-width: 480px) {
  .product-detail-container {
    padding: 15px 10px;
  }
  
  .product-detail-content {
    padding: 0;
    gap: 15px;
    border-radius: 12px;
    overflow: hidden;
    width: 100%;
    box-sizing: border-box;
  }
  
  .product-gallery {
    padding: 10px;
  }
  
  .main-image {
    height: 280px;
    border-radius: 8px;
  }
  
  .product-info {
    padding: 20px 15px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .product-name {
    font-size: 1.6rem;
    line-height: 1.2;
    margin-bottom: 10px;
    word-break: break-word; /* 确保长文本会换行 */
  }
  
  .product-price {
    font-size: 1.5rem;
    margin-bottom: 12px;
  }
  
  .product-description {
    font-size: 0.9rem;
    margin-bottom: 15px;
    word-break: break-word; /* 确保长文本会换行 */
  }
  
  .quantity-control {
    justify-content: flex-start;
    margin: 15px 0;
    flex-wrap: wrap;
    
    button {
      width: 36px;
      height: 36px;
      font-size: 1.2rem;
    }
    
    input {
      width: 60px;
      height: 36px;
      font-size: 1rem;
      text-align: center;
    }
  }
  
  .action-buttons {
    gap: 10px;
    
    .el-button {
      height: 42px;
      font-size: 0.95rem;
      border-radius: 6px;
    }
  }
  
  .product-reviews {
    padding: 20px 15px;
    margin: 15px 0;
    border-radius: 10px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .section-title {
    font-size: 1.2rem;
    margin-bottom: 16px;
  }
  
  .review-item {
    padding: 15px 0;
  }
  
  .review-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .reviewer-info {
    width: 100%;
  }
  
  .review-content {
    font-size: 0.9rem;
    line-height: 1.5;
    word-break: break-word; /* 确保长文本会换行 */
  }
  
  .review-form {
    padding-top: 20px;
    
    h3 {
      font-size: 1.1rem;
      margin-bottom: 16px;
    }
    
    .el-form-item {
      margin-bottom: 14px;
    }
    
    .el-textarea {
      .el-textarea__inner {
        min-height: 80px;
        font-size: 0.9rem;
      }
    }
    
    .el-button {
      height: 40px;
      font-size: 0.9rem;
    }
  }
}

/* 超小屏幕适配 (iPhone SE等) */
@media (max-width: 375px) {
  .product-detail-page {
    padding: 8px 3px;
  }
  
  .main-image {
    height: 250px;
  }
  
  .product-name {
    font-size: 1.4rem;
  }
  
  .product-price {
    font-size: 1.3rem;
  }
  
  .quantity-control {
    button {
      width: 32px;
      height: 32px;
    }
    
    input {
      width: 50px;
      height: 32px;
      font-size: 0.9rem;
    }
  }
}
</style>