<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore, useCartStore, useUserStore } from '../stores'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const cartStore = useCartStore()
const userStore = useUserStore()

// 获取商品ID
const productId = computed(() => parseInt(route.params.id))

// 获取商品详情
// 调用后端API: GET /api/products/{id}
// 参数: productId - 商品ID
// 返回值: Product对象 - 包含商品详情信息
const product = computed(() => productStore.getProductById(productId.value))

// 如果商品不存在，重定向到首页
onMounted(() => {
  if (!product.value) {
    ElMessage.error('商品不存在')
    router.push('/')
  }
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
const submitReview = () => {
  if (!userStore.isAuthenticated) {
    router.push(`/login?redirect=/product/${productId.value}`)
    return
  }
  
  if (!commentForm.value.comment.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }
  
  isSubmitting.value = true
  
  // 模拟提交评论
  setTimeout(() => {
    const review = {
      userId: userStore.user.id,
      username: userStore.user.username,
      rating: commentForm.value.rating,
      comment: commentForm.value.comment,
    }
    
    productStore.addReview(productId.value, review)
    
    // 重置表单
    commentForm.value.rating = 5
    commentForm.value.comment = ''
    
    isSubmitting.value = false
    
    ElMessage.success('评论提交成功')
  }, 500)
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<template>
  <div v-if="product" class="product-detail-container">
    <!-- 商品详情 -->
    <div class="product-detail-content">
      <div class="product-gallery">
        <div class="main-image">
          <img :src="product.image || 'https://picsum.photos/id/' + (product.id + 100) + '/600/400'" :alt="product.name">
        </div>
      </div>
      
      <div class="product-info">
        <h1 class="product-name">{{ product.name }}</h1>
        
        <div class="product-rating">
          <el-rate 
            v-model="product.rating" 
            disabled 
            text-color="#ff9900"
            score-template="{value}"
            :show-score="true"
            :colors="['#ff9900', '#ff9900', '#ff9900']"
          ></el-rate>
          <span class="review-count">{{ product.reviews.length }} 条评价</span>
        </div>
        
        <div class="product-price">
          <span class="price">¥{{ product.price.toFixed(2) }}</span>
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
              :icon="Minus" 
              circle 
              :disabled="quantity <= 1"
              @click="decreaseQuantity"
            >
              <el-icon><Minus /></el-icon>
            </el-button>
            <span class="quantity">{{ quantity }}</span>
            <el-button 
              :icon="Plus" 
              circle 
              :disabled="quantity >= product.stock"
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
            :disabled="product.stock <= 0"
            @click="buyNow"
          >
            立即购买
          </el-button>
          
          <el-button 
            type="default" 
            class="cart-button" 
            :disabled="product.stock <= 0"
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
      <div v-if="product.reviews.length > 0" class="reviews-list">
        <div v-for="review in product.reviews" :key="review.id" class="review-item">
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
</template>

<style lang="scss" scoped>
@use "sass:color";

.product-detail-container {
  padding: 30px 20px;
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
  border: 1px solid #ddd;
  border-radius: 10px;
  overflow: hidden;
  
  button {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f5f7fa;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    
    &:hover {
      background-color: #e4e7ed;
    }
  }
  
  input {
    width: 60px;
    height: 44px;
    border: none;
    text-align: center;
    font-size: 1.2rem;
    font-weight: 500;
    
    &:focus {
      outline: none;
    }
  }
}
  
  .add-to-cart-section {
  margin-top: 30px;
  display: flex;
  align-items: center;
  gap: 20px;
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