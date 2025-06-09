<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore, useUserStore } from '../stores'
import { ElMessageBox, ElMessage } from 'element-plus'
import api from '../services/api' // 导入API服务用于后端交互

const router = useRouter()
const cartStore = useCartStore()
const userStore = useUserStore()

// 购物车商品
const cartItems = computed(() => cartStore.items)

// 计算总价和总数
const totalPrice = computed(() => cartStore.totalPrice)
const totalItems = computed(() => cartStore.totalItems)

// 是否全选
const allSelected = ref(true)
const selectedItems = ref([])

// 订单信息弹窗相关
const showOrderDialog = ref(false)
const orderForm = ref({
  shippingAddress: '',
  consigneeName: '',
  consigneePhone: '',
  remark: ''
})

// 用户地址列表（从个人资料获取）
const userAddresses = ref([])

// 从后端获取购物车数据
// 调用后端API: GET /api/cart/items
// 参数: 无
// 返回值: CartItem数组 - 用户的购物车商品列表
const fetchCartItems = async () => {
  if (!userStore.isAuthenticated) {
    return // 用户未登录时不获取购物车数据
  }
  
  try {
    console.log('正在获取购物车数据...')
    // 直接使用cartStore的fetchCart方法，它会正确处理API响应
    await cartStore.fetchCart()
    console.log('购物车数据已更新:', cartStore.items)
    
    // 为每个购物车项补充完整的商品信息
    for (let item of cartStore.items) {
      if (!item.name || !item.price) {
        try {
          const productResponse = await api.get(`/products/${item.productId || item.id}`)
          const product = productResponse.data || productResponse
          
          // 补充商品信息
          item.name = item.name || product.name || '未知商品'
          item.price = item.price || product.price || 0
          item.image = item.image || product.imageUrl || product.image
          item.description = item.description || product.description
          
          console.log('已补充商品信息:', item)
        } catch (error) {
          console.error('获取商品详情失败:', error)
          // 设置默认值
          item.name = item.name || '未知商品'
          item.price = item.price || 0
        }
      }
    }
  } catch (error) {
    console.error('获取购物车数据失败:', error)
    // 如果获取失败，使用本地store的数据
    console.log('使用本地购物车数据')
  }
}

// 初始化选中所有商品
onMounted(async () => {
  // 先从后端获取购物车数据
  await fetchCartItems()
  
  // 然后选中所有商品
  selectedItems.value = cartItems.value.map(item => item.id)
})

// 监听全选状态
const handleSelectAll = (val) => {
  if (val) {
    selectedItems.value = cartItems.value.map(item => item.id)
  } else {
    selectedItems.value = []
  }
}

// 计算选中商品的总价
const selectedTotalPrice = computed(() => {
  return cartItems.value
    .filter(item => selectedItems.value.includes(item.id))
    .reduce((total, item) => total + (item.price * item.quantity), 0)
})

// 更新商品数量
// 调用后端API: PUT /api/cart/items/{id}
// 参数:
//   - id: 购物车项ID
//   - quantity: 新数量
// 返回值: CartItem对象 - 更新后的购物车项信息
const updateQuantity = async (item, quantity) => {
  if (quantity < 1) return
  
  try {
    // 调用后端API更新购物车项数量
    const response = await api.put(`/cart/items/${item.id}`, {
      quantity: quantity
    })
    
    console.log('更新购物车数量响应:', response)
    
    // 直接更新本地购物车项的数量，避免重复调用store方法
    const cartItem = cartStore.items.find(cartItem => cartItem.id === item.id)
    if (cartItem) {
      cartItem.quantity = quantity
      // 重新计算总数量
      cartStore.totalCount = cartStore.items.reduce((sum, item) => sum + item.quantity, 0)
    }
    
    ElMessage.success('数量已更新')
  } catch (error) {
    console.error('更新购物车数量失败:', error)
    ElMessage.error('更新数量失败，请稍后重试')
    
    // 如果API调用失败，仍然更新本地状态作为备用方案
    const cartItem = cartStore.items.find(cartItem => cartItem.id === item.id)
    if (cartItem) {
      cartItem.quantity = quantity
      cartStore.totalCount = cartStore.items.reduce((sum, item) => sum + item.quantity, 0)
    }
  }
}

// 从购物车移除商品
// 调用后端API: DELETE /api/cart/items/{id}
// 参数: id - 购物车项ID
// 返回值: 无
const removeFromCart = (item) => {
  ElMessageBox.confirm(
    `确定要从购物车中移除 ${item.name} 吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      // 使用store方法统一处理API调用和本地状态更新
      await cartStore.removeFromCart(item.id)
      
      console.log('删除购物车项成功:', item.id)
      
      // 同时从选中列表中移除
      selectedItems.value = selectedItems.value.filter(id => id !== item.id)
      
      ElMessage.success('商品已从购物车移除')
    } catch (error) {
      console.error('删除购物车项失败:', error)
      
      // 即使删除失败，也从选中列表中移除，避免界面状态不一致
      selectedItems.value = selectedItems.value.filter(id => id !== item.id)
      
      // 显示友好的错误信息
      ElMessage.error(error.message || '删除失败，请稍后重试')
    }
  }).catch(() => {})
}

// 清空购物车
// 调用后端API: DELETE /api/cart/items
// 参数: 无
// 返回值: 无
const clearCart = () => {
  if (cartItems.value.length === 0) return
  
  ElMessageBox.confirm(
    '确定要清空购物车吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      // 调用后端API清空购物车
      await api.delete('/cart/items')
      
      console.log('清空购物车成功')
      
      // 更新本地store状态
      cartStore.clearCart()
      selectedItems.value = []
      
      ElMessage.success('购物车已清空')
    } catch (error) {
      console.error('清空购物车失败:', error)
      ElMessage.error('清空失败，请稍后重试')
      
      // 如果API调用失败，仍然更新本地状态作为备用方案
      cartStore.clearCart()
      selectedItems.value = []
      ElMessage.success('购物车已清空')
    }
  }).catch(() => {})
}

// 获取用户地址列表
const fetchUserAddresses = async () => {
  try {
    // 从用户个人资料获取地址信息
    const response = await api.get('/user/profile')
    const profile = response.data || response
    userAddresses.value = profile.addresses || []
    
    // 如果有地址，默认选择第一个
    if (userAddresses.value.length > 0) {
      orderForm.value.shippingAddress = userAddresses.value[0]
    }
  } catch (error) {
    console.error('获取用户地址失败:', error)
  }
}

// 打开订单信息设置弹窗
const openOrderDialog = async () => {
  if (selectedItems.value.length === 0) {
    ElMessage.warning('请至少选择一件商品')
    return
  }
  
  if (!userStore.isAuthenticated) {
    router.push('/login?redirect=/cart')
    return
  }
  
  // 获取用户地址列表
  await fetchUserAddresses()
  
  // 重置表单
  orderForm.value = {
    shippingAddress: userAddresses.value.length > 0 ? userAddresses.value[0] : '',
    consigneeName: userStore.user?.nickname || '',
    consigneePhone: userStore.user?.phone || '',
    remark: ''
  }
  
  showOrderDialog.value = true
}

// 确认提交订单
// 调用后端API: POST /api/orders
// 参数:
//   - items: 选中的商品列表 [{productId, quantity}]
//   - totalAmount: 订单总金额
//   - shippingAddress: 收货地址
//   - consigneeName: 收货人姓名
//   - consigneePhone: 收货人电话
//   - remark: 订单备注
// 返回值: Order对象 - 包含创建的订单信息
const confirmOrder = async () => {
  // 验证必填字段
  if (!orderForm.value.shippingAddress.trim()) {
    ElMessage.warning('请填写收货地址')
    return
  }
  
  if (!orderForm.value.consigneeName.trim()) {
    ElMessage.warning('请填写收货人姓名')
    return
  }
  
  if (!orderForm.value.consigneePhone.trim()) {
    ElMessage.warning('请填写收货人电话')
    return
  }
  
  // 验证手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(orderForm.value.consigneePhone)) {
    ElMessage.warning('请输入正确的手机号码')
    return
  }
  
  try {
    // 准备订单数据
    const selectedCartItems = cartItems.value.filter(item => 
      selectedItems.value.includes(item.id)
    )
    
    const orderData = {
      items: selectedCartItems.map(item => ({
        productId: item.productId || item.id,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: selectedTotalPrice.value,
      shippingAddress: orderForm.value.shippingAddress.trim(),
      consigneeName: orderForm.value.consigneeName.trim(),
      consigneePhone: orderForm.value.consigneePhone.trim(),
      remark: orderForm.value.remark.trim(),
      paymentMethod: 'online' // 默认在线支付
    }
    
    console.log('提交订单数据:', orderData)
    
    // 调用后端API创建订单
    const response = await api.post('/orders', orderData)
    
    console.log('订单创建响应:', response)
    console.log('响应数据类型:', typeof response)
    console.log('响应数据结构:', response)
    
    // 处理订单创建响应
    let createdOrder = null
    if (response && typeof response === 'object') {
      if (response.data && typeof response.data === 'object') {
        createdOrder = response.data
        console.log('订单创建成功，订单信息:', createdOrder)
      } else if (response.id || response.orderNumber) {
        createdOrder = response
        console.log('订单创建成功，订单信息:', createdOrder)
      } else {
        console.log('订单创建响应格式异常:', response)
      }
    }
    
    // 订单创建成功后，从购物车中移除已结算的商品
    for (const itemId of selectedItems.value) {
      try {
        // 只调用store方法，它内部会处理API调用和本地状态更新
        await cartStore.removeFromCart(itemId)
        console.log('成功移除购物车商品:', itemId)
      } catch (error) {
        console.error('移除购物车项失败:', error)
        // 即使移除失败也继续处理，不影响订单创建
        // 显示友好的错误提示，但不阻断流程
        ElMessage.warning(`移除商品 ${itemId} 失败，请手动刷新购物车`)
      }
    }
    
    selectedItems.value = []
    showOrderDialog.value = false
    
    ElMessage.success('订单已提交，即将跳转到订单页面')
    
    // 跳转到订单页面
    setTimeout(() => {
      router.push('/orders')
    }, 1500)
    
  } catch (error) {
    console.error('订单提交失败:', error)
    ElMessage.error('订单提交失败，请稍后重试')
  }
}

// 兼容原有的checkout函数名
const checkout = openOrderDialog

// 继续购物
const continueShopping = () => {
  router.push('/')
}
</script>

<template>
  <div class="cart-container">
    <div class="cart-header">
      <h1>我的购物车</h1>
      <p v-if="cartItems.length > 0">共 {{ totalItems }} 件商品</p>
    </div>
    
    <div v-if="cartItems.length > 0" class="cart-content">
      <div class="cart-items">
        <el-table
          :data="cartItems"
          style="width: 100%"
          @selection-change="(val) => selectedItems = val.map(item => item.id)"
        >
          <el-table-column type="selection" width="55" />
          
          <el-table-column label="商品信息" min-width="300">
            <template #default="{ row }">
              <div class="product-info">
                <div class="product-image">
                  <img :src="row.image || 'https://picsum.photos/id/' + (row.id + 100) + '/300/200'" :alt="row.name">
                </div>
                <div class="product-details">
                  <h3 class="product-name">{{ row.name }}</h3>
                  <p class="product-price">¥{{ row.price.toFixed(2) }}</p>
                </div>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="数量" width="180">
            <template #default="{ row }">
              <div class="quantity-control">
                <el-button 
                  :icon="Minus" 
                  circle 
                  size="small"
                  :disabled="row.quantity <= 1"
                  @click="updateQuantity(row, row.quantity - 1)"
                >
                  <el-icon><Minus /></el-icon>
                </el-button>
                <span class="quantity">{{ row.quantity }}</span>
                <el-button 
                  :icon="Plus" 
                  circle 
                  size="small"
                  @click="updateQuantity(row, row.quantity + 1)"
                >
                  <el-icon><Plus /></el-icon>
                </el-button>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="小计" width="120" align="right">
            <template #default="{ row }">
              <span class="subtotal">¥{{ (row.price * row.quantity).toFixed(2) }}</span>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ row }">
              <el-button 
                type="danger" 
                :icon="Delete" 
                circle 
                size="small"
                @click="removeFromCart(row)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div class="cart-summary">
        <div class="summary-card">
          <h2>订单摘要</h2>
          
          <div class="summary-row">
            <span>商品总价</span>
            <span>¥{{ totalPrice.toFixed(2) }}</span>
          </div>
          
          <div class="summary-row">
            <span>已选商品</span>
            <span>{{ selectedItems.length }} 件</span>
          </div>
          
          <div class="summary-row">
            <span>运费</span>
            <span>免运费</span>
          </div>
          
          <div class="summary-row total">
            <span>应付总额</span>
            <span>¥{{ selectedTotalPrice.toFixed(2) }}</span>
          </div>
          
          <div class="summary-actions">
            <el-button type="primary" class="checkout-button" @click="openOrderDialog">
              结算 ({{ selectedItems.length }})
            </el-button>
            
            <el-button class="continue-button" @click="continueShopping">
              继续购物
            </el-button>
            
            <el-button type="danger" plain class="clear-button" @click="clearCart">
              清空购物车
            </el-button>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="empty-cart">
      <el-empty description="购物车是空的">
        <el-button type="primary" @click="continueShopping">去购物</el-button>
      </el-empty>
    </div>
    
    <!-- 订单信息设置弹窗 -->
    <el-dialog
      v-model="showOrderDialog"
      title="确认订单信息"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="orderForm" label-width="100px" label-position="left">
        <el-form-item label="收货地址" required>
          <el-select
            v-if="userAddresses.length > 0"
            v-model="orderForm.shippingAddress"
            placeholder="请选择收货地址"
            style="width: 100%"
            filterable
            allow-create
          >
            <el-option
              v-for="(address, index) in userAddresses"
              :key="index"
              :label="address"
              :value="address"
            />
          </el-select>
          <el-input
            v-else
            v-model="orderForm.shippingAddress"
            type="textarea"
            :rows="2"
            placeholder="请输入收货地址"
          />
        </el-form-item>
        
        <el-form-item label="收货人" required>
          <el-input
            v-model="orderForm.consigneeName"
            placeholder="请输入收货人姓名"
          />
        </el-form-item>
        
        <el-form-item label="联系电话" required>
          <el-input
            v-model="orderForm.consigneePhone"
            placeholder="请输入收货人电话"
            maxlength="11"
          />
        </el-form-item>
        
        <el-form-item label="订单备注">
          <el-input
            v-model="orderForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入订单备注（选填）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        
        <!-- 订单摘要 -->
        <el-divider>订单摘要</el-divider>
        <div class="order-summary">
          <div class="summary-item">
            <span>商品数量：</span>
            <span>{{ selectedItems.length }} 件</span>
          </div>
          <div class="summary-item">
            <span>商品总价：</span>
            <span>¥{{ selectedTotalPrice.toFixed(2) }}</span>
          </div>
          <div class="summary-item">
            <span>运费：</span>
            <span>免运费</span>
          </div>
          <div class="summary-item total">
            <span>应付总额：</span>
            <span>¥{{ selectedTotalPrice.toFixed(2) }}</span>
          </div>
        </div>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showOrderDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmOrder">
            确认提交订单
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
@use "sass:color";

.cart-container {
  padding-bottom: 40px;
  margin: 0 auto;
  max-width: 1200px;
  padding: 20px;
  min-height: 100vh;
  background-image: url('/images/background1.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}

.cart-header {
  margin-bottom: 24px;
  
  h1 {
    font-size: 1.8rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: #333;
  }
  
  p {
    color: #666;
    font-size: 1rem;
  }
}

.cart-content {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
}

.cart-items {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.product-info {
  display: flex;
  align-items: center;
}

.product-image {
  width: 80px;
  height: 80px;
  margin-right: 16px;
  border-radius: 8px;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.product-details {
  flex: 1;
}

.product-name {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}

.product-price {
  font-size: 1rem;
  color: #ff6b6b;
  font-weight: 500;
}

.quantity-control {
  display: flex;
  align-items: center;
  justify-content: center;
  
  .quantity {
    width: 40px;
    text-align: center;
    font-size: 1rem;
    margin: 0 8px;
  }
}

.subtotal {
  font-size: 1.1rem;
  font-weight: 600;
  color: #ff6b6b;
}

.cart-summary {
  position: sticky;
  top: 80px;
}

.summary-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 24px;
  
  h2 {
    font-size: 1.3rem;
    font-weight: 600;
    margin-bottom: 20px;
    color: #333;
  }
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 1rem;
  color: #666;
  
  &.total {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #eee;
    font-size: 1.2rem;
    font-weight: 600;
    color: #333;
  }
}

.summary-actions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkout-button {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  background-color: #ff6b6b;
  border-color: #ff6b6b;
  
  &:hover {
    background-color: color.adjust(#ff6b6b, $lightness: -5%);
    border-color: color.adjust(#ff6b6b, $lightness: -5%);
  }
}

.continue-button, .clear-button {
  width: 100%;
}

.empty-cart {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 60px 20px;
  text-align: center;
}

// 订单信息弹窗样式
.order-summary {
  .summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    &.total {
      font-weight: 600;
      font-size: 1.1rem;
      color: #ff6b6b;
      border-top: 2px solid #f0f0f0;
      padding-top: 12px;
      margin-top: 8px;
    }
  }
}

// Element Plus 弹窗样式覆盖
:deep(.el-dialog) {
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  
  .el-dialog__header {
    padding: 24px 24px 16px;
    border-bottom: 1px solid #f0f0f0;
    
    .el-dialog__title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #333;
    }
  }
  
  .el-dialog__body {
    padding: 24px;
  }
  
  .el-dialog__footer {
    padding: 16px 24px 24px;
    border-top: 1px solid #f0f0f0;
    
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
  }
}

:deep(.el-form) {
  .el-form-item {
    margin-bottom: 20px;
    
    .el-form-item__label {
      font-weight: 500;
      color: #333;
    }
    
    .el-input__wrapper {
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      
      &:hover {
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }
      
      &.is-focus {
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
      }
    }
    
    .el-textarea__inner {
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      
      &:hover {
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }
      
      &:focus {
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
      }
    }
    
    .el-select {
      .el-input__wrapper {
        border-radius: 8px;
      }
    }
  }
}

:deep(.el-divider) {
  margin: 20px 0 16px;
  
  .el-divider__text {
    font-weight: 500;
    color: #666;
  }
}

:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &.el-button--primary {
    background: linear-gradient(135deg, #409eff 0%, #5a9cff 100%);
    border: none;
    
    &:hover {
      background: linear-gradient(135deg, #337ecc 0%, #4a8cff 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
    }
  }
  
  &:not(.el-button--primary) {
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cart-container {
    padding: 10px;
  }
  
  .cart-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .cart-summary {
    position: static;
    order: -1;
  }
  
  .product-info {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .product-image {
    margin-right: 0;
    margin-bottom: 12px;
  }
  
  // 移动端弹窗适配
  :deep(.el-dialog) {
    width: 90% !important;
    margin: 5vh auto;
    
    .el-dialog__body {
      padding: 16px;
    }
    
    .el-dialog__header {
      padding: 16px 16px 12px;
    }
    
    .el-dialog__footer {
      padding: 12px 16px 16px;
    }
  }
  
  .order-summary {
    .summary-item {
      font-size: 0.9rem;
    }
  }
}
</style>