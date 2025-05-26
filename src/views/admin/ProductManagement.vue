<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useProductStore, useStoreManagementStore } from '../../stores'
import { ElMessage, ElMessageBox } from 'element-plus'

const productStore = useProductStore()
const storeManagementStore = useStoreManagementStore()

// 商品列表
const products = computed(() => productStore.products)

// 分类列表
const categories = computed(() => productStore.categories)

// 对话框可见性
const dialogVisible = ref(false)
const dialogType = ref('add') // 'add' 或 'edit'

// 表单数据
const productForm = reactive({
  id: null,
  name: '',
  price: 0,
  image: '',
  description: '',
  category: '',
  stock: 0,
  rating: 5.0,
  reviews: []
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度应为2-50个字符', trigger: 'blur' }
  ],
  price: [
    { required: true, message: '请输入商品价格', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '价格必须大于0', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择商品分类', trigger: 'change' }
  ],
  stock: [
    { required: true, message: '请输入库存数量', trigger: 'blur' },
    { type: 'number', min: 0, message: '库存不能为负数', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入商品描述', trigger: 'blur' },
    { min: 10, max: 500, message: '长度应为10-500个字符', trigger: 'blur' }
  ]
}

// 表单引用
const productFormRef = ref(null)

// 新分类输入
const newCategory = ref('')
const showNewCategoryInput = ref(false)

// 秒杀活动设置
const flashSaleForm = reactive({
  productId: null,
  originalPrice: 0,
  salePrice: 0,
  startTime: '',
  endTime: '',
  totalStock: 0,
  isActive: true
})

const flashSaleDialogVisible = ref(false)

// 搜索和筛选
const searchQuery = ref('')
const categoryFilter = ref('')

// 筛选后的商品列表
const filteredProducts = computed(() => {
  let result = products.value
  
  // 分类筛选
  if (categoryFilter.value) {
    result = result.filter(p => p.category === categoryFilter.value)
  }
  
  // 搜索筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.description.toLowerCase().includes(query)
    )
  }
  
  return result
})

// 打开添加商品对话框
const openAddDialog = () => {
  dialogType.value = 'add'
  resetForm()
  dialogVisible.value = true
}

// 打开编辑商品对话框
const openEditDialog = (product) => {
  dialogType.value = 'edit'
  Object.assign(productForm, product)
  dialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  productForm.id = null
  productForm.name = ''
  productForm.price = 0
  productForm.image = ''
  productForm.description = ''
  productForm.category = ''
  productForm.stock = 0
  productForm.rating = 5.0
  productForm.reviews = []
}

// 提交表单
const submitForm = () => {
  if (!productFormRef.value) return
  
  productFormRef.value.validate((valid) => {
    if (valid) {
      if (dialogType.value === 'add') {
        // 添加新商品
        const newProduct = { ...productForm }
        // 生成新ID
        newProduct.id = Math.max(0, ...products.value.map(p => p.id)) + 1
        // 如果没有设置图片，使用默认图片
        if (!newProduct.image) {
          newProduct.image = `/images/default-product.jpg`
        }
        // 添加到商品列表
        productStore.products.push(newProduct)
        ElMessage.success('商品添加成功')
      } else {
        // 更新现有商品
        const index = productStore.products.findIndex(p => p.id === productForm.id)
        if (index !== -1) {
          productStore.products[index] = { ...productForm }
          ElMessage.success('商品更新成功')
        }
      }
      dialogVisible.value = false
    } else {
      return false
    }
  })
}

// 删除商品
const deleteProduct = (product) => {
  ElMessageBox.confirm(
    `确定要删除商品 "${product.name}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      const index = productStore.products.findIndex(p => p.id === product.id)
      if (index !== -1) {
        productStore.products.splice(index, 1)
        ElMessage.success('商品已删除')
      }
    })
    .catch(() => {
      // 取消删除
    })
}

// 添加新分类
const addNewCategory = () => {
  if (newCategory.value && !categories.value.includes(newCategory.value)) {
    productStore.categories.push(newCategory.value)
    productForm.category = newCategory.value
    newCategory.value = ''
    showNewCategoryInput.value = false
    ElMessage.success('新分类添加成功')
  } else if (categories.value.includes(newCategory.value)) {
    ElMessage.warning('该分类已存在')
  }
}

// 打开秒杀活动设置对话框
const openFlashSaleDialog = (product) => {
  flashSaleForm.productId = product.id
  flashSaleForm.originalPrice = product.price
  flashSaleForm.salePrice = Math.round(product.price * 0.7 * 100) / 100 // 默认7折
  flashSaleForm.totalStock = Math.min(product.stock, 20) // 默认限制20件
  
  // 设置默认开始和结束时间
  const now = new Date()
  const start = new Date(now)
  start.setHours(now.getHours() + 1, 0, 0) // 从下一个整点开始
  
  const end = new Date(start)
  end.setHours(end.getHours() + 12) // 默认12小时
  
  flashSaleForm.startTime = start.toISOString().slice(0, 16)
  flashSaleForm.endTime = end.toISOString().slice(0, 16)
  flashSaleForm.isActive = true
  
  flashSaleDialogVisible.value = true
}

// 提交秒杀活动
const submitFlashSale = () => {
  // 验证表单
  if (flashSaleForm.salePrice >= flashSaleForm.originalPrice) {
    ElMessage.error('秒杀价格必须低于原价')
    return
  }
  
  if (new Date(flashSaleForm.startTime) >= new Date(flashSaleForm.endTime)) {
    ElMessage.error('结束时间必须晚于开始时间')
    return
  }
  
  if (flashSaleForm.totalStock <= 0) {
    ElMessage.error('秒杀库存必须大于0')
    return
  }
  
  // 检查是否已存在该商品的秒杀活动
  const existingIndex = storeManagementStore.flashSales.findIndex(
    f => f.productId === flashSaleForm.productId
  )
  
  if (existingIndex !== -1) {
    // 更新现有秒杀活动
    storeManagementStore.updateFlashSale(storeManagementStore.flashSales[existingIndex].id, {
      originalPrice: flashSaleForm.originalPrice,
      salePrice: flashSaleForm.salePrice,
      startTime: flashSaleForm.startTime,
      endTime: flashSaleForm.endTime,
      totalStock: flashSaleForm.totalStock,
      remainingStock: flashSaleForm.totalStock,
      isActive: flashSaleForm.isActive
    })
    ElMessage.success('秒杀活动已更新')
  } else {
    // 添加新秒杀活动
    storeManagementStore.addFlashSale({
      productId: flashSaleForm.productId,
      originalPrice: flashSaleForm.originalPrice,
      salePrice: flashSaleForm.salePrice,
      startTime: flashSaleForm.startTime,
      endTime: flashSaleForm.endTime,
      totalStock: flashSaleForm.totalStock,
      isActive: flashSaleForm.isActive
    })
    ElMessage.success('秒杀活动已创建')
  }
  
  flashSaleDialogVisible.value = false
}

// 检查商品是否有秒杀活动
const hasFlashSale = (productId) => {
  return storeManagementStore.flashSales.some(f => f.productId === productId)
}

// 获取商品的秒杀活动状态
const getFlashSaleStatus = (productId) => {
  const flashSale = storeManagementStore.flashSales.find(f => f.productId === productId)
  if (!flashSale) return '无秒杀'
  
  const now = new Date()
  const startTime = new Date(flashSale.startTime)
  const endTime = new Date(flashSale.endTime)
  
  if (now < startTime) return '未开始'
  if (now > endTime) return '已结束'
  if (flashSale.remainingStock <= 0) return '已售罄'
  if (!flashSale.isActive) return '已暂停'
  return '进行中'
}
</script>

<template>
  <div class="product-management">
    <div class="page-header">
      <h1>商品管理</h1>
      <el-button type="primary" @click="openAddDialog">
        <el-icon><Plus /></el-icon> 添加商品
      </el-button>
    </div>
    
    <!-- 搜索和筛选 -->
    <div class="filter-section">
      <el-input
        v-model="searchQuery"
        placeholder="搜索商品名称或描述"
        clearable
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      
      <el-select v-model="categoryFilter" placeholder="按分类筛选" clearable>
        <el-option
          v-for="category in categories"
          :key="category"
          :label="category"
          :value="category"
        />
      </el-select>
    </div>
    
    <!-- 商品列表 -->
    <el-table :data="filteredProducts" style="width: 100%" border>
      <el-table-column label="ID" prop="id" width="80" />
      
      <el-table-column label="商品信息" min-width="300">
        <template #default="{ row }">
          <div class="product-info-cell">
            <div class="product-image">
              <img :src="row.image" :alt="row.name">
            </div>
            <div class="product-details">
              <h3>{{ row.name }}</h3>
              <p class="product-description">{{ row.description }}</p>
            </div>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="分类" prop="category" width="120" />
      
      <el-table-column label="价格" width="120">
        <template #default="{ row }">
          <span class="price">¥{{ row.price.toFixed(2) }}</span>
        </template>
      </el-table-column>
      
      <el-table-column label="库存" prop="stock" width="100" />
      
      <el-table-column label="评分" width="120">
        <template #default="{ row }">
          <el-rate
            v-model="row.rating"
            disabled
            text-color="#ff9900"
            score-template="{value}"
            :show-score="true"
          />
        </template>
      </el-table-column>
      
      <el-table-column label="秒杀状态" width="120">
        <template #default="{ row }">
          <el-tag
            :type="hasFlashSale(row.id) ? 'danger' : 'info'"
            effect="plain"
          >
            {{ getFlashSaleStatus(row.id) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button-group>
            <el-button type="primary" size="small" @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button type="danger" size="small" @click="deleteProduct(row)">
              <el-icon><Delete /></el-icon>
            </el-button>
            <el-button type="warning" size="small" @click="openFlashSaleDialog(row)">
              <el-icon><Timer /></el-icon>
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 商品表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加商品' : '编辑商品'"
      width="50%"
    >
      <el-form
        ref="productFormRef"
        :model="productForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="productForm.name" />
        </el-form-item>
        
        <el-form-item label="商品价格" prop="price">
          <el-input-number v-model="productForm.price" :precision="2" :min="0.01" :step="0.1" />
        </el-form-item>
        
        <el-form-item label="商品分类" prop="category">
          <div class="category-select-group">
            <el-select
              v-model="productForm.category"
              placeholder="选择分类"
              v-if="!showNewCategoryInput"
              style="width: 100%"
            >
              <el-option
                v-for="category in categories"
                :key="category"
                :label="category"
                :value="category"
              />
              <el-option label="+ 添加新分类" value="new" />
            </el-select>
            
            <div v-else class="new-category-input">
              <el-input v-model="newCategory" placeholder="输入新分类名称" />
              <el-button type="primary" @click="addNewCategory">添加</el-button>
              <el-button @click="showNewCategoryInput = false">取消</el-button>
            </div>
          </div>
        </el-form-item>
        
        <el-form-item label="库存数量" prop="stock">
          <el-input-number v-model="productForm.stock" :min="0" :step="1" />
        </el-form-item>
        
        <el-form-item label="商品图片" prop="image">
          <el-input v-model="productForm.image" placeholder="输入图片URL" />
          <div class="image-preview" v-if="productForm.image">
            <img :src="productForm.image" alt="预览图">
          </div>
        </el-form-item>
        
        <el-form-item label="商品描述" prop="description">
          <el-input
            v-model="productForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入商品描述"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 秒杀活动设置对话框 -->
    <el-dialog
      v-model="flashSaleDialogVisible"
      title="设置秒杀活动"
      width="50%"
    >
      <el-form label-width="120px">
        <el-form-item label="原价">
          <el-input-number v-model="flashSaleForm.originalPrice" :precision="2" :min="0.01" disabled />
        </el-form-item>
        
        <el-form-item label="秒杀价格">
          <el-input-number v-model="flashSaleForm.salePrice" :precision="2" :min="0.01" :max="flashSaleForm.originalPrice - 0.01" :step="0.1" />
        </el-form-item>
        
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="flashSaleForm.startTime"
            type="datetime"
            placeholder="选择开始时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm"
          />
        </el-form-item>
        
        <el-form-item label="结束时间">
          <el-date-picker
            v-model="flashSaleForm.endTime"
            type="datetime"
            placeholder="选择结束时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DDTHH:mm"
          />
        </el-form-item>
        
        <el-form-item label="秒杀库存">
          <el-input-number v-model="flashSaleForm.totalStock" :min="1" :step="1" />
        </el-form-item>
        
        <el-form-item label="是否启用">
          <el-switch v-model="flashSaleForm.isActive" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="flashSaleDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitFlashSale">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.product-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h1 {
    font-size: 1.8rem;
    color: #333;
    margin: 0;
  }
}

.filter-section {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  
  .search-input {
    width: 300px;
  }
}

.product-info-cell {
  display: flex;
  align-items: center;
  gap: 15px;
  
  .product-image {
    width: 60px;
    height: 60px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  
  .product-details {
    h3 {
      margin: 0 0 5px;
      font-size: 1rem;
    }
    
    .product-description {
      margin: 0;
      font-size: 0.85rem;
      color: #666;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -moz-line-clamp: 2;
      -ms-line-clamp: 2;
      line-clamp: 2; /* 标准属性 */
      -webkit-box-orient: vertical;
      box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis; /* 确保文本溢出时显示省略号 */
      max-height: 2.6em; /* 备用方案：设置最大高度 */
    }
  }
}

.price {
  font-weight: 600;
  color: #ff6b6b;
}

.category-select-group {
  display: flex;
  width: 100%;
}

.new-category-input {
  display: flex;
  gap: 10px;
  width: 100%;
}

.image-preview {
  margin-top: 10px;
  width: 100px;
  height: 100px;
  border-radius: 6px;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>