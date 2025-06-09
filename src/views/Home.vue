<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore, useUserStore } from '../stores'
import { ElMessage } from 'element-plus'
import api from '../services/api'

const router = useRouter()
const productStore = useProductStore()
const userStore = useUserStore()

// 判断当前用户是否为管理员
const isAdmin = computed(() => userStore.isAdmin)

// 商品数据状态
const products = ref([])
const categories = ref([])
const loading = ref(false)
const error = ref('')

// 搜索功能
const searchKeyword = ref('')

// 分类筛选
const selectedCategory = ref('')

// 综合筛选：搜索 + 分类
const filteredProducts = computed(() => {
  let filtered = products.value
  
  // 按搜索关键词筛选
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(keyword) ||
      p.description?.toLowerCase().includes(keyword) ||
      p.category?.toLowerCase().includes(keyword)
    )
  }
  
  // 按分类筛选
  if (selectedCategory.value) {
    filtered = filtered.filter(p => p.category === selectedCategory.value)
  }
  
  return filtered
})

/**
 * 从后端API获取商品列表
 * 接口地址: GET /api/products
 * 请求参数: 无
 * 返回数据格式: {
 *   code: 200,
 *   data: [
 *     {
 *       id: number,
 *       name: string,
 *       price: number,
 *       image: string,
 *       description: string,
 *       category: string,
 *       stock: number,
 *       rating: number
 *     }
 *   ],
 *   message: string
 * }
 * 主要处理逻辑:
 * 1. 发送HTTP GET请求到后端Java服务
 * 2. 后端从MySQL数据库查询商品表(products)
 * 3. 前端接收数据并更新本地状态
 * 4. 处理加载状态和错误状态
 */
const fetchProducts = async () => {
  try {
    loading.value = true
    error.value = ''
    
    // 调用后端API获取商品列表
    console.log('正在调用API: GET /products')
    const response = await api.get('/products')
    console.log('API响应数据:', response)
    
    // 由于api.js响应拦截器已经处理了{code, data, message}格式，
    // 直接使用response获取商品数组数据
    const productsData = Array.isArray(response) ? response : (response.data || [])
    console.log('处理后的商品数据:', productsData)
    
    // 更新本地商品数据
    products.value = productsData
    
    // 提取商品分类（去重），过滤掉null值
    const categorySet = new Set(products.value.map(p => p.category).filter(cat => cat !== null && cat !== undefined))
    categories.value = Array.from(categorySet)
    
    console.log('商品数据加载成功:', products.value.length, '个商品')
    console.log('商品分类:', categories.value)
  } catch (err) {
    console.error('获取商品列表失败:', err)
    error.value = '获取商品列表失败，请稍后重试'
    
    // 如果API调用失败，使用本地存储的商品数据作为备用
    products.value = productStore.products
    categories.value = productStore.categories
  } finally {
    loading.value = false
  }
}

/**
 * 从后端API获取商品分类列表
 * 接口地址: GET /api/products/categories
 * 请求参数: 无
 * 返回数据格式: {
 *   code: 200,
 *   data: [string], // 分类名称数组
 *   message: string
 * }
 * 主要处理逻辑:
 * 1. 发送HTTP GET请求到后端Java服务
 * 2. 后端从MySQL数据库查询商品分类表(categories)或从商品表聚合分类
 * 3. 前端接收分类数据并更新本地状态
 */
const fetchCategories = async () => {
  try {
    console.log('正在获取商品分类...')
    const response = await api.get('/products/categories')
    console.log('分类API原始响应:', response)
    
    // 根据api.js响应拦截器的处理，直接使用response
    // 如果response是数组，直接使用；否则尝试获取data字段
    const categoriesData = Array.isArray(response) ? response : (response.data || response || [])
    categories.value = categoriesData.filter(cat => cat !== null && cat !== undefined && cat !== '')
    
    console.log('商品分类加载成功:', categories.value)
  } catch (err) {
    console.error('获取商品分类失败:', err)
    console.error('错误详情:', err.message, err.response?.status)
    
    // 如果分类API失败，从商品数据中提取分类
    if (products.value && products.value.length > 0) {
      const categorySet = new Set(products.value.map(p => p.category).filter(cat => cat !== null && cat !== undefined && cat !== ''))
      categories.value = Array.from(categorySet)
      console.log('从商品数据中提取的分类:', categories.value)
    } else {
      categories.value = []
      console.log('无法获取分类数据，设置为空数组')
    }
  }
}

// 轮播图数据
const carouselItems = [
  {
    id: 1,
    title: '新鲜水果直达',
    description: '从农场到餐桌，保证新鲜',
    image: 'https://picsum.photos/id/292/1200/400',
    link: '/'
  },
  {
    id: 2,
    title: '限时特惠',
    description: '精选水果，限时折扣',
    image: 'https://picsum.photos/id/429/1200/400',
    link: '/'
  },
  {
    id: 3,
    title: '会员专享',
    description: '会员享受更多优惠和服务',
    image: 'https://picsum.photos/id/450/1200/400',
    link: '/profile'
  }
]

// 跳转到商品详情
const goToProductDetail = (productId) => {
  router.push(`/product/${productId}`)
}

// 添加到收藏的动画效果
const showAddAnimation = ref(false)
const animatingProductId = ref(null)

// 用户收藏列表（用于检查商品是否已收藏）
const userFavorites = ref([])

/**
 * 获取用户收藏列表
 * 用于检查商品是否已被收藏
 */
const fetchUserFavorites = async () => {
  if (!userStore.isAuthenticated) {
    userFavorites.value = []
    return
  }
  
  try {
    const response = await api.get('/user/favorites')
    // 处理不同的响应结构：可能是数组，也可能包装在data或result中
    let favoritesData = []
    if (Array.isArray(response)) {
      favoritesData = response
    } else if (Array.isArray(response.data)) {
      favoritesData = response.data
    } else if (Array.isArray(response.result)) {
      favoritesData = response.result
    } else {
      console.warn('收藏列表响应格式异常:', response)
      favoritesData = []
    }
    
    userFavorites.value = favoritesData
    console.log('用户收藏列表:', userFavorites.value.length, '个商品')
  } catch (error) {
    console.error('获取用户收藏列表失败:', error)
    userFavorites.value = []
  }
}

/**
 * 检查商品是否已收藏
 */
const isProductFavorited = (productId) => {
  // 确保响应式更新：通过访问userFavorites.value来触发响应式依赖
  const favorites = userFavorites.value
  const isFavorited = favorites.some(fav => {
    // 支持多种数据结构：直接的productId或嵌套的product.id
    const favProductId = fav.productId || fav.product?.id
    return favProductId === productId
  })
  
  // 添加调试日志
  console.log(`检查商品${productId}收藏状态:`, isFavorited, '收藏列表:', favorites.map(f => ({id: f.id, productId: f.productId || f.product?.id})))
  
  return isFavorited
}

/**
 * 添加商品到收藏
 * 接口地址: POST /api/favorites
 * 请求参数: {
 *   productId: number // 商品ID
 * }
 * 返回数据格式: {
 *   code: 200,
 *   data: {
 *     id: number,        // 收藏项ID
 *     productId: number, // 商品ID
 *     addTime: string    // 添加时间
 *   },
 *   message: string
 * }
 * 主要处理逻辑:
 * 1. 检查用户登录状态
 * 2. 发送HTTP POST请求到后端Java服务
 * 3. 后端将收藏数据存储到MySQL数据库的favorites表
 * 4. 前端显示添加成功的动画效果
 */
/**
 * 切换收藏状态（添加或取消收藏）
 */
const toggleFavorite = async (product, event) => {
  // 阻止事件冒泡，避免触发卡片点击事件
  event.stopPropagation()
  
  // 检查用户是否已登录
  if (!userStore.isAuthenticated) {
    // 未登录用户跳转到登录页面
    ElMessage.warning('请先登录后再操作')
    router.push('/login')
    return
  }
  
  const isFavorited = isProductFavorited(product.id)
  
  try {
    // 设置动画效果
    animatingProductId.value = product.id
    showAddAnimation.value = true
    
    if (isFavorited) {
      // 取消收藏 - 直接使用商品ID
      await api.delete(`/user/favorites/${product.id}`)
      
      // 从本地收藏列表中移除
      userFavorites.value = userFavorites.value.filter(fav => 
        !((fav.productId === product.id) || (fav.product?.id === product.id))
      )
      
      // 确保响应式更新
      await nextTick()
      
      ElMessage.success(`${product.name} 已取消收藏`)
    } else {
      // 添加到收藏
      const response = await api.post('/user/favorites', {
        productId: product.id
      })
      
      console.log('商品已添加到收藏:', response)
      
      // 更新本地收藏列表
      // 处理不同的响应结构：可能是直接的对象，也可能包装在result中
      const favoriteData = response?.id ? response : (response?.result || response || {})
      
      // 确保有有效的ID，否则使用时间戳作为临时ID
      const favoriteId = favoriteData?.id || Date.now()
      const newFavorite = {
        id: favoriteId,
        productId: product.id,
        addTime: favoriteData?.addTime || new Date().toISOString(),
        product: product
      }
      userFavorites.value.push(newFavorite)
      
      // 确保响应式更新
      await nextTick()
      
      ElMessage.success(`${product.name} 已添加到收藏`)
    }
    
  } catch (err) {
    console.error('收藏操作失败:', err)
    
    // 根据错误类型显示不同的提示信息
    if (err.code === 409 || err.message?.includes('已收藏')) {
      ElMessage.error(`${product.name} 已在收藏列表中`)
    } else if (err.code === 404) {
      ElMessage.error('商品不存在或已下架')
    } else if (err.code === 401) {
      ElMessage.warning('登录已过期，请重新登录')
      router.push('/login')
    } else {
      // 对于其他错误，显示具体错误信息或通用提示
      const errorMessage = err.message || '操作失败，请稍后重试'
      ElMessage.error(errorMessage)
    }
  } finally {
    // 动画结束后重置
    setTimeout(() => {
      showAddAnimation.value = false
      animatingProductId.value = null
    }, 500)
  }
}

/**
 * 添加商品到购物车
 */
const addToCart = async (product, event) => {
  // 阻止事件冒泡，避免触发卡片点击事件
  event.stopPropagation()
  
  // 检查用户是否已登录
  if (!userStore.isAuthenticated) {
    ElMessage.warning('请先登录后再添加到购物车')
    router.push('/login')
    return
  }
  
  try {
    // 调用后端API添加到购物车
    const response = await api.post('/cart/items', {
      productId: product.id,
      quantity: 1
    })
    
    console.log('商品已添加到购物车:', response)
    
    ElMessage.success(`${product.name} 已添加到购物车`)
    
  } catch (err) {
    console.error('添加到购物车失败:', err)
    ElMessage.error('添加到购物车失败，请稍后重试')
  }
}

/**
 * 组件挂载时的初始化逻辑
 * 主要处理逻辑:
 * 1. 页面加载时自动获取商品列表
 * 2. 获取商品分类列表
 * 3. 为后续的购物车、订单等功能预留接口调用位置
 */
onMounted(async () => {
  try {
    console.log('开始初始化首页数据...')
    
    // 先获取商品数据，确保有数据可用于分类提取
    await fetchProducts()
    
    // 然后获取分类数据，如果失败会自动从商品数据中提取
    await fetchCategories()
    
    // 最后获取用户收藏列表
    await fetchUserFavorites()
    
    console.log('首页数据初始化完成')
  } catch (error) {
    console.error('首页数据初始化失败:', error)
  }
})
</script>

<template>
  <div class="home-container">
    <!-- 轮播图 -->
    <div class="carousel-section">
      <el-carousel :interval="5000" type="card" height="300px">
        <el-carousel-item v-for="item in carouselItems" :key="item.id">
          <div class="carousel-content" :style="{ backgroundImage: `url(${item.image})` }">
            <div class="carousel-overlay">
              <h2>{{ item.title }}</h2>
              <p>{{ item.description }}</p>
            </div>
          </div>
        </el-carousel-item>
      </el-carousel>
    </div>
    
    <!-- 分类筛选和搜索 -->
    <div class="category-section">
      <h2 class="section-title">商品分类</h2>
      <div class="category-search-row">
        <div class="category-tabs-container">
          <el-radio-group v-model="selectedCategory" size="large" :disabled="loading" class="category-tabs">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </el-radio-button>
          </el-radio-group>
        </div>
        <div class="search-container">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索水果..."
            size="large"
            clearable
            class="search-input"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </div>
    </div>
    
    <!-- 商品列表 -->
    <div class="products-section">
      <h2 class="section-title">{{ selectedCategory || '全部' }}商品</h2>
      
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="3" animated />
        <div class="loading-text">
          <el-icon class="is-loading"><Loading /></el-icon>
          正在加载商品数据...
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
            <el-button type="primary" size="small" @click="fetchProducts" style="margin-top: 10px;">
              重新加载
            </el-button>
          </template>
        </el-alert>
      </div>
      
      <!-- 商品网格 -->
      <div v-else-if="filteredProducts.length > 0" class="products-grid">
        <div 
          v-for="product in filteredProducts" 
          :key="product.id" 
          class="product-card"
          @click="goToProductDetail(product.id)"
        >
          <div class="product-image">
            <img :src="product.imageUrl || 'https://picsum.photos/id/' + (product.id + 100) + '/300/200'" :alt="product.name">
            <!-- 添加到购物车按钮 -->
            <div 
              class="add-to-cart-button" 
              @click="addToCart(product, $event)"
              title="添加到购物车"
            >
              <el-icon>
                <Plus />
              </el-icon>
            </div>
            <!-- 收藏按钮 -->
            <div 
              class="favorite-button" 
              @click="toggleFavorite(product, $event)"
              :class="{ 
                'animate-add': showAddAnimation && animatingProductId === product.id,
                'favorited': isProductFavorited(product.id)
              }"
              :title="isProductFavorited(product.id) ? '取消收藏' : '添加到收藏'"
            >
              <el-icon>
                <StarFilled v-if="isProductFavorited(product.id)" />
                <Star v-else />
              </el-icon>
            </div>
          </div>
          <div class="product-info">
            <h3 class="product-name">{{ product.name }}</h3>
            <div class="product-meta">
              <span class="product-price">¥{{ product.price.toFixed(2) }}</span>
              <div class="product-rating">
                <el-rate 
                  v-model="product.rating" 
                  disabled 
                  text-color="#ff9900"
                  score-template="{value}"
                  :show-score="true"
                  :colors="['#ff9900', '#ff9900', '#ff9900']"
                ></el-rate>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 无商品状态 -->
      <div v-else class="empty-container">
        <el-empty description="暂无商品数据">
          <el-button type="primary" @click="fetchProducts">刷新数据</el-button>
        </el-empty>
      </div>
    </div>
    
    <!-- 促销信息 -->
    <div class="promo-section">
      <div class="promo-card">
        <el-icon><Van /></el-icon>
        <div class="promo-content">
          <h3>免费配送</h3>
          <p>订单满99元免费配送</p>
        </div>
      </div>
      <div class="promo-card">
        <el-icon><GoodsFilled /></el-icon>
        <div class="promo-content">
          <h3>品质保证</h3>
          <p>100%新鲜保证</p>
        </div>
      </div>
      <div class="promo-card">
        <el-icon><Service /></el-icon>
        <div class="promo-content">
          <h3>7x24客服</h3>
          <p>随时为您服务</p>
        </div>
      </div>
      <div class="promo-card">
        <el-icon><RefreshRight /></el-icon>
        <div class="promo-content">
          <h3>无忧退换</h3>
          <p>7天无理由退换</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "sass:color";

.home-container {
  position: relative;
  /* 添加背景图片 - 使用高质量的background2.jpg */
  background-image: url('/images/background2.jpg');
  background-size: cover; /* 覆盖整个容器 */
  background-position: center; /* 居中显示 */
  background-repeat: no-repeat; /* 不重复 */
  background-attachment: fixed; /* 固定背景，创造视差效果 */
  min-height: 100vh; /* 确保至少占满视窗高度 */
  padding-bottom: 40px;
}

/* 添加半透明遮罩层，确保内容可读性 */
.home-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.3); /* 降低透明度，让背景图片更清晰可见 */
  backdrop-filter: blur(5px); /* 减少模糊效果，保持背景清晰度 */
  z-index: 1;
}

/* 确保所有内容在遮罩层之上 */
.home-container > * {
  position: relative;
  z-index: 2;
}

/* 轮播图样式 */
.carousel-section {
  margin-bottom: 40px;
}

.carousel-content {
  height: 100%;
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.carousel-overlay {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 40px;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.7), transparent);
  color: white;
  
  h2 {
    font-size: 2rem;
    margin-bottom: 12px;
    font-weight: 600;
  }
  
  p {
    font-size: 1.2rem;
    max-width: 60%;
  }
}

/* 分类筛选和搜索样式 */
.category-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 1.5rem;
  margin-bottom: 16px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.category-search-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 20px;
}

.category-tabs-container {
  flex: 1;
  display: flex;
  justify-content: center;
}

.category-tabs {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.search-container {
  flex: 0 0 250px;
  max-width: 250px;
}

.search-input {
  .el-input__wrapper {
    border-radius: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: all 0.3s;
    
    &:hover {
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12);
    }
    
    &.is-focus {
      box-shadow: 0 3px 12px rgba(255, 107, 107, 0.15);
    }
  }
  
  .el-input__inner {
    font-size: 0.95rem;
    padding: 0 15px;
  }
  
  .el-input__prefix {
    color: #999;
  }
}

/* 商品列表样式 */
.products-section {
  margin-top: 20px;
  margin-bottom: 50px;
}

/* 加载状态样式 */
.loading-container {
  text-align: center;
  padding: 40px 20px;
  
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

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 30px;
}

.product-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
  position: relative;
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    
    .add-to-cart-button {
      opacity: 1;
      transform: translateY(0);
    }
    
    .favorite-button {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

.product-image {
  height: 240px;
  overflow: hidden;
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s;
  }
  
  &:hover img {
    transform: scale(1.05);
  }
}

.add-to-cart-button {
  position: absolute;
  bottom: 15px;
  left: 15px;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background-color: #4cd964;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s, transform 0.3s, background-color 0.3s;
  z-index: 2;
  font-size: 1.2rem;
  
  &:hover {
    background-color: color.adjust(#4cd964, $lightness: -10%);
    transform: translateY(0) scale(1.1);
  }
}

.favorite-button {
  position: absolute;
  bottom: 15px;
  right: 15px;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background-color: #ff6b6b;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s, transform 0.3s, background-color 0.3s;
  z-index: 2;
  font-size: 1.2rem;
  
  &:hover {
    background-color: color.adjust(#ff6b6b, $lightness: -10%);
  }
  
  &.animate-add {
    animation: pulse 0.5s;
  }
  
  &.favorited {
    background-color: #f39c12;
    opacity: 1;
    transform: translateY(0);
    
    &:hover {
      background-color: color.adjust(#f39c12, $lightness: -10%);
    }
  }
}



@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.product-info {
  padding: 20px;
}

.product-name {
  font-size: 1.3rem;
  margin-bottom: 10px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-price {
  font-size: 1.4rem;
  font-weight: 600;
  color: #ff6b6b;
}

.product-rating {
  display: flex;
  align-items: center;
}

/* 促销信息样式 */
.promo-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 40px;
}

.promo-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s;
  
  &:hover {
    transform: translateY(-5px);
  }
  
  .el-icon {
    font-size: 2rem;
    color: #ff6b6b;
    margin-right: 16px;
  }
}

.promo-content {
  h3 {
    font-size: 1.1rem;
    margin-bottom: 4px;
    font-weight: 500;
  }
  
  p {
    font-size: 0.9rem;
    color: #666;
  }
}

/* 响应式设计 */
@media (max-width: 992px) {
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--mobile-padding);
    padding: 0 var(--mobile-padding);
  }
  
  .promo-section {
    grid-template-columns: 1fr;
    margin: 0 var(--mobile-padding);
  }
}

@media (max-width: 768px) {
  .carousel-overlay {
    h2 {
      font-size: 1.5rem;
    }
    
    p {
      font-size: 1rem;
      max-width: 100%;
    }
  }
  
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--mobile-margin);
    padding: 0 var(--mobile-padding);
  }
  
  .product-card {
    padding: var(--mobile-margin);
    border-radius: 12px;
    transition: transform 0.2s, box-shadow 0.2s;
    
    &:active {
      transform: scale(0.98);
    }
  }
  
  .product-image {
    height: 150px;
    border-radius: 8px;
  }
  
  .product-info {
    padding: 15px;
  }
  
  .product-name {
    font-size: 1.1rem;
  }
  
  .product-price {
    font-size: 1.2rem;
  }
  
  .category-search-row {
    flex-direction: column;
    gap: 15px;
    padding: 0 15px;
  }
  
  .category-tabs-container {
    width: 100%;
  }
  
  .category-tabs {
    overflow-x: auto;
    padding-bottom: 10px;
    justify-content: flex-start;
    
    .el-radio-group {
      white-space: nowrap;
      display: flex;
      min-width: 100%;
    }
  }
  
  .search-container {
    flex: none;
    max-width: 100%;
    width: 100%;
  }
  
  .promo-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .products-grid {
    grid-template-columns: 1fr;
    gap: var(--mobile-padding);
    padding: 0 var(--mobile-padding);
  }
  
  .product-card {
    padding: var(--mobile-padding);
  }
  
  .product-image {
    height: 200px;
  }
  
  .product-title {
    font-size: var(--mobile-font-size);
  }
  
  .product-price {
    font-size: 18px;
  }
  
  .add-to-cart-btn {
    min-height: var(--touch-target-size);
    font-size: 14px;
    border-radius: 8px;
    width: 100%;
  }
  
  .promo-section {
    grid-template-columns: 1fr;
    margin: 0 var(--mobile-padding);
  }
  
  .category-search-row {
    flex-direction: column;
    gap: 15px;
    padding: 0 var(--mobile-padding);
  }
  
  .category-tabs-container {
    width: 100%;
    justify-content: center;
  }
  
  .category-tabs {
    justify-content: center;
    
    .el-radio-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }
    
    .el-radio-button {
      margin: 0;
      flex: 0 0 auto;
    }
  }
  
  .search-container {
    width: 100%;
  }
  
  .search-input {
    .el-input__inner {
      font-size: 16px; /* 防止iOS缩放 */
    }
  }
}
</style>