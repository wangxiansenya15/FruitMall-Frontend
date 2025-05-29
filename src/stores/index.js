import { defineStore } from 'pinia'
import { useStoreManagementStore } from './storeManagement'
import api from '../services/api'

// 用户状态管理
export const useUserStore = defineStore('user', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    isAuthenticated: localStorage.getItem('user') !== null
  }),
  getters: {
    // 判断是否为管理员
    isAdmin: (state) => {
      return state.user?.roles?.some(role => ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'].includes(role)) || false
    }
  },
  actions: {
    /**
     * 用户登录
     * 接口地址: POST /api/auth/login
     * 请求参数: { username: string, password: string }
     * 返回数据: { code: 200, data: { user: UserInfo, token: string }, message: string }
     * 主要处理逻辑: 后端Java验证用户凭据，MySQL存储用户信息
     */
    login(userData) {
      this.user = userData
      this.isAuthenticated = true
      localStorage.setItem('user', JSON.stringify(userData))
    },
    
    /**
     * 用户登出
     * 接口地址: POST /api/auth/logout
     * 主要处理逻辑: 清除本地存储，后端Java清除session/token
     */
    logout() {
      this.user = null
      this.isAuthenticated = false
      localStorage.removeItem('user')
      localStorage.removeItem('token')
    },
    
    /**
     * 更新用户资料
     * 接口地址: PUT /api/users/profile
     * 请求参数: { username: string, email: string, phone: string, address: string }
     * 返回数据: { code: 200, data: UserInfo, message: string }
     * 主要处理逻辑: 后端Java更新MySQL用户表(users)中的用户信息
     */
    updateProfile(userData) {
      this.user = { ...this.user, ...userData }
      localStorage.setItem('user', JSON.stringify(this.user))
    }
  }
})

// 购物车状态管理
export { useStoreManagementStore }

/**
 * 购物车状态管理
 * 注意: 以下购物车逻辑将完全交给后端Java和MySQL处理
 * 前端仅保留基本的状态管理，实际数据操作通过API调用完成
 */
export const useCartStore = defineStore('cart', {
  state: () => ({
    // 本地购物车项目（仅用于未登录用户的临时存储）
    items: JSON.parse(localStorage.getItem('cart')) || [],
    // 购物车加载状态
    loading: false,
    // 购物车总数量（从后端获取）
    totalCount: 0
  }),
  getters: {
    totalItems: (state) => state.items.reduce((total, item) => total + item.quantity, 0),
    totalPrice: (state) => state.items.reduce((total, item) => total + (item.price * item.quantity), 0),
  },
  actions: {
    /**
     * 添加商品到购物车
     * 接口地址: POST /api/cart/items
     * 请求参数: { productId: number, quantity: number }
     * 返回数据: { code: 200, data: CartItem, message: string }
     * 主要处理逻辑:
     * 1. 后端Java接收请求
     * 2. 验证用户登录状态和商品信息
     * 3. 将购物车数据存储到MySQL的cart_items表
     * 4. 返回更新后的购物车信息
     */
    async addToCart(product, quantity = 1) {
      try {
        const response = await api.post('/cart/items', {
          productId: product.id,
          quantity
        })
        
        // 更新本地购物车总数量
        this.totalCount = response.data.totalCount || 0
        
        return response.data
      } catch (error) {
        // 如果用户未登录，暂存到本地
        const existingItem = this.items.find(item => item.id === product.id)
        
        if (existingItem) {
          existingItem.quantity += quantity
        } else {
          this.items.push({ ...product, quantity })
        }
        
        this.saveCart()
        throw error
      }
    },
    
    /**
     * 从购物车移除商品
     * 接口地址: DELETE /api/cart/items/{itemId}
     * 主要处理逻辑: 后端Java从MySQL的cart_items表删除对应记录
     */
    async removeFromCart(productId) {
      try {
        await api.delete(`/cart/items/${productId}`)
        this.totalCount = Math.max(0, this.totalCount - 1)
      } catch (error) {
        // 本地备用逻辑
        this.items = this.items.filter(item => item.id !== productId)
        this.saveCart()
        throw error
      }
    },
    
    /**
     * 更新购物车商品数量
     * 接口地址: PUT /api/cart/items/{itemId}
     * 请求参数: { quantity: number }
     * 主要处理逻辑: 后端Java更新MySQL的cart_items表中的数量字段
     */
    async updateQuantity(productId, quantity) {
      try {
        await api.put(`/cart/items/${productId}`, { quantity })
      } catch (error) {
        // 本地备用逻辑
        const item = this.items.find(item => item.id === productId)
        if (item) {
          item.quantity = quantity
          this.saveCart()
        }
        throw error
      }
    },
    
    /**
     * 获取购物车列表
     * 接口地址: GET /api/cart/items
     * 返回数据: { code: 200, data: CartItem[], message: string }
     * 主要处理逻辑: 后端Java从MySQL查询用户的购物车数据
     */
    async fetchCart() {
      try {
        this.loading = true
        const response = await api.get('/cart/items')
        console.log('购物车API响应:', response)
        console.log('响应数据类型:', typeof response)
        
        // 处理不同的API响应格式
        if (Array.isArray(response)) {
          // 如果直接返回数组
          this.items = response
        } else if (response && response.data && Array.isArray(response.data)) {
          // 如果返回{data: CartItem[]}格式
          this.items = response.data
        } else {
          // 其他情况，设为空数组
          this.items = []
        }
        
        this.totalCount = this.items.reduce((sum, item) => sum + item.quantity, 0)
        console.log('购物车数据已设置:', this.items)
      } catch (error) {
        console.error('获取购物车失败:', error)
        this.items = []
        this.totalCount = 0
      } finally {
        this.loading = false
      }
    },
    
    /**
     * 清空购物车
     * 接口地址: DELETE /api/cart/items
     * 主要处理逻辑: 后端Java清空MySQL中用户的所有购物车记录
     */
    async clearCart() {
      try {
        await api.delete('/cart/items')
        this.items = []
        this.totalCount = 0
      } catch (error) {
        // 本地备用逻辑
        this.items = []
        this.totalCount = 0
        this.saveCart()
        throw error
      }
    },
    
    // 本地存储备用方法（仅用于未登录用户）
    saveCart() {
      localStorage.setItem('cart', JSON.stringify(this.items))
    }
  }
})

/**
 * 订单状态管理
 * 注意: 订单逻辑完全交给后端Java和MySQL处理
 * 前端仅负责展示和状态管理
 */
export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    currentOrder: null,
    loading: false
  }),
  actions: {
    /**
     * 创建订单
     * 接口地址: POST /api/orders
     * 请求参数: { cartItems: CartItem[], shippingAddress: Address, paymentMethod: string }
     * 返回数据: { code: 200, data: Order, message: string }
     * 主要处理逻辑:
     * 1. 后端Java验证购物车商品和库存
     * 2. 计算订单总金额和优惠
     * 3. 在MySQL中创建订单记录(orders表)
     * 4. 创建订单明细记录(order_items表)
     * 5. 更新商品库存
     * 6. 清空用户购物车
     */
    async createOrder(orderData) {
      try {
        this.loading = true
        const response = await api.post('/orders', orderData)
        this.currentOrder = response.data
        return response.data
      } catch (error) {
        console.error('创建订单失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    /**
     * 获取用户订单列表
     * 接口地址: GET /api/orders
     * 请求参数: { page: number, size: number, status?: string }
     * 返回数据: { code: 200, data: { orders: Order[], total: number }, message: string }
     * 主要处理逻辑: 后端Java从MySQL查询用户的订单数据，支持分页和状态筛选
     */
    async fetchOrders(params = {}) {
      try {
        this.loading = true
        const response = await api.get('/orders', { params })
        this.orders = response.data.orders || []
        return response.data
      } catch (error) {
        console.error('获取订单列表失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    /**
     * 获取订单详情
     * 接口地址: GET /api/orders/{orderId}
     * 返回数据: { code: 200, data: OrderDetail, message: string }
     * 主要处理逻辑: 后端Java从MySQL查询订单详细信息，包括订单项和物流信息
     */
    async fetchOrderDetail(orderId) {
      try {
        const response = await api.get(`/orders/${orderId}`)
        this.currentOrder = response.data
        return response.data
      } catch (error) {
        console.error('获取订单详情失败:', error)
        throw error
      }
    },
    
    /**
     * 取消订单
     * 接口地址: PUT /api/orders/{orderId}/cancel
     * 主要处理逻辑:
     * 1. 后端Java验证订单状态是否可取消
     * 2. 更新MySQL中订单状态为已取消
     * 3. 恢复商品库存
     * 4. 处理退款逻辑（如已支付）
     */
    async cancelOrder(orderId) {
      try {
        const response = await api.put(`/orders/${orderId}/cancel`)
        // 更新本地订单状态
        const order = this.orders.find(o => o.id === orderId)
        if (order) {
          order.status = 'CANCELLED'
        }
        return response.data
      } catch (error) {
        console.error('取消订单失败:', error)
        throw error
      }
    }
  }
})

// 商品状态管理（完全依赖API数据）
export const useProductStore = defineStore('product', {
  state: () => ({
    // 移除本地商品数据，完全依赖API
    products: [],
    categories: []
  }),
  getters: {
    getProductById: (state) => (id) => {
      return state.products.find(product => product.id === parseInt(id))
    },
    getProductsByCategory: (state) => (category) => {
      return category ? state.products.filter(product => product.category === category) : state.products
    }
  },
  actions: {
    /**
     * 添加商品评论
     * 接口地址: POST /api/products/{productId}/reviews
     * 请求参数: { rating: number, comment: string }
     * 返回数据: { code: 200, data: Review, message: string }
     * 主要处理逻辑:
     * 1. 后端Java验证用户是否已购买该商品
     * 2. 将评论数据存储到MySQL的product_reviews表
     * 3. 重新计算商品平均评分
     * 4. 更新商品表中的rating字段
     */
    async addReview(productId, review) {
      try {
        const response = await api.post(`/products/${productId}/reviews`, review)
        
        // 更新本地商品评论（用于即时显示）
        const product = this.products.find(p => p.id === productId)
        if (product) {
          const newReviewId = Math.max(0, ...product.reviews.map(r => r.id)) + 1
          const newReview = {
            id: newReviewId,
            ...review,
            date: new Date().toISOString().split('T')[0]
          }
          product.reviews.push(newReview)
          
          // 重新计算平均评分
          const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0)
          product.rating = totalRating / product.reviews.length
        }
        
        return response.data
      } catch (error) {
        console.error('添加评论失败:', error)
        throw error
      }
    }
  }
})