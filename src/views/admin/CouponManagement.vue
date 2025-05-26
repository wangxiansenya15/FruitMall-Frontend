 <script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useStoreManagementStore } from '../../stores'
import { ElMessage, ElMessageBox } from 'element-plus'

const storeManagementStore = useStoreManagementStore()

// 优惠券列表
const coupons = computed(() => storeManagementStore.coupons)

// 表单数据
const couponForm = reactive({
  id: null,
  code: '',
  type: 'percentage', // 'percentage' 或 'fixed'
  value: 0,
  minPurchase: 0,
  startDate: '',
  endDate: '',
  isActive: true,
  usageLimit: 100
})

// 表单验证规则
const rules = {
  code: [
    { required: true, message: '请输入优惠券代码', trigger: 'blur' },
    { min: 3, max: 20, message: '长度应为3-20个字符', trigger: 'blur' }
  ],
  value: [
    { required: true, message: '请输入优惠券面值', trigger: 'blur' },
    { type: 'number', min: 0, message: '面值必须大于0', trigger: 'blur' }
  ],
  minPurchase: [
    { required: true, message: '请输入最低消费金额', trigger: 'blur' },
    { type: 'number', min: 0, message: '金额必须大于等于0', trigger: 'blur' }
  ],
  startDate: [
    { required: true, message: '请选择开始日期', trigger: 'change' }
  ],
  endDate: [
    { required: true, message: '请选择结束日期', trigger: 'change' }
  ],
  usageLimit: [
    { required: true, message: '请输入使用次数限制', trigger: 'blur' },
    { type: 'number', min: 1, message: '使用次数必须大于0', trigger: 'blur' }
  ]
}

// 表单引用
const couponFormRef = ref(null)

// 对话框可见性
const dialogVisible = ref(false)

// 对话框标题
const dialogTitle = ref('添加优惠券')

// 加载状态
const loading = ref(false)

// 表格加载状态
const tableLoading = ref(false)

// 打开添加对话框
const openAddDialog = () => {
  resetForm()
  dialogTitle.value = '添加优惠券'
  dialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = (row) => {
  resetForm()
  dialogTitle.value = '编辑优惠券'
  
  // 填充表单数据
  Object.keys(couponForm).forEach(key => {
    if (key in row) {
      couponForm[key] = row[key]
    }
  })
  
  dialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  if (couponFormRef.value) {
    couponFormRef.value.resetFields()
  }
  
  couponForm.id = null
  couponForm.code = ''
  couponForm.type = 'percentage'
  couponForm.value = 0
  couponForm.minPurchase = 0
  couponForm.startDate = ''
  couponForm.endDate = ''
  couponForm.isActive = true
  couponForm.usageLimit = 100
}

// 提交表单
const submitForm = () => {
  if (!couponFormRef.value) return
  
  couponFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      
      try {
        // 模拟请求延迟
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const couponData = { ...couponForm }
        
        if (couponForm.id) {
          // 更新优惠券
          storeManagementStore.updateCoupon(couponForm.id, couponData)
          ElMessage.success('优惠券更新成功')
        } else {
          // 添加优惠券
          storeManagementStore.addCoupon(couponData)
          ElMessage.success('优惠券添加成功')
        }
        
        dialogVisible.value = false
      } catch (error) {
        ElMessage.error('操作失败，请稍后再试')
        console.error('优惠券操作失败:', error)
      } finally {
        loading.value = false
      }
    }
  })
}

// 删除优惠券
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除优惠券 "${row.code}" 吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    storeManagementStore.removeCoupon(row.id)
    ElMessage.success('优惠券删除成功')
  }).catch(() => {
    // 取消删除
  })
}

// 切换优惠券状态
const toggleStatus = (row) => {
  storeManagementStore.updateCoupon(row.id, { isActive: !row.isActive })
  ElMessage.success(`优惠券已${row.isActive ? '禁用' : '启用'}`)
}

// 格式化优惠券类型
const formatCouponType = (type) => {
  return type === 'percentage' ? '百分比折扣' : '固定金额'
}

// 格式化优惠券值
const formatCouponValue = (row) => {
  return row.type === 'percentage' ? `${row.value}%` : `¥${row.value.toFixed(2)}`
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

// 加载数据
onMounted(async () => {
  tableLoading.value = true
  try {
    // 模拟加载数据
    await new Promise(resolve => setTimeout(resolve, 500))
  } catch (error) {
    ElMessage.error('加载数据失败')
    console.error('加载数据失败:', error)
  } finally {
    tableLoading.value = false
  }
})
</script>

<template>
  <div class="coupon-management-container">
    <div class="page-header">
      <h1>优惠券管理</h1>
      <el-button type="primary" @click="openAddDialog">
        <el-icon><Plus /></el-icon> 添加优惠券
      </el-button>
    </div>
    
    <el-card class="coupon-table-card">
      <el-table 
        :data="coupons" 
        style="width: 100%"
        v-loading="tableLoading"
        border
      >
        <el-table-column prop="code" label="优惠券代码" min-width="120" />
        
        <el-table-column label="优惠券类型" min-width="120">
          <template #default="{ row }">
            <el-tag :type="row.type === 'percentage' ? 'success' : 'primary'">
              {{ formatCouponType(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="优惠券面值" min-width="120">
          <template #default="{ row }">
            <span class="coupon-value">{{ formatCouponValue(row) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="minPurchase" label="最低消费" min-width="120">
          <template #default="{ row }">
            <span>¥{{ row.minPurchase.toFixed(2) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="有效期" min-width="200">
          <template #default="{ row }">
            <span>{{ formatDate(row.startDate) }} 至 {{ formatDate(row.endDate) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="使用限制" min-width="120">
          <template #default="{ row }">
            <span>{{ row.usageCount }}/{{ row.usageLimit }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" min-width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.isActive"
              @change="() => toggleStatus(row)"
              active-text="启用"
              inactive-text="禁用"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="操作" fixed="right" width="150">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              size="small" 
              @click="openEditDialog(row)"
              text
            >
              编辑
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              @click="handleDelete(row)"
              text
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 添加/编辑优惠券对话框 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="dialogTitle"
      width="600px"
    >
      <el-form 
        ref="couponFormRef"
        :model="couponForm"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item label="优惠券代码" prop="code">
          <el-input v-model="couponForm.code" placeholder="请输入优惠券代码" />
        </el-form-item>
        
        <el-form-item label="优惠券类型" prop="type">
          <el-radio-group v-model="couponForm.type">
            <el-radio label="percentage">百分比折扣</el-radio>
            <el-radio label="fixed">固定金额</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="优惠券面值" prop="value">
          <el-input-number 
            v-model="couponForm.value" 
            :min="0" 
            :precision="couponForm.type === 'percentage' ? 0 : 2"
            :step="couponForm.type === 'percentage' ? 5 : 10"
            :max="couponForm.type === 'percentage' ? 100 : 1000"
          />
          <span class="unit-label">{{ couponForm.type === 'percentage' ? '%' : '元' }}</span>
        </el-form-item>
        
        <el-form-item label="最低消费" prop="minPurchase">
          <el-input-number 
            v-model="couponForm.minPurchase" 
            :min="0" 
            :precision="2"
            :step="10"
          />
          <span class="unit-label">元</span>
        </el-form-item>
        
        <el-form-item label="有效期" required>
          <div class="date-range">
            <el-form-item prop="startDate" class="date-item">
              <el-date-picker
                v-model="couponForm.startDate"
                type="date"
                placeholder="开始日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <span class="date-separator">至</span>
            <el-form-item prop="endDate" class="date-item">
              <el-date-picker
                v-model="couponForm.endDate"
                type="date"
                placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                :disabled-date="date => new Date(couponForm.startDate) > date"
              />
            </el-form-item>
          </div>
        </el-form-item>
        
        <el-form-item label="使用次数限制" prop="usageLimit">
          <el-input-number 
            v-model="couponForm.usageLimit" 
            :min="1" 
            :precision="0"
            :step="10"
          />
          <span class="unit-label">次</span>
        </el-form-item>
        
        <el-form-item label="状态">
          <el-switch
            v-model="couponForm.isActive"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="loading">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.coupon-management-container {
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

.coupon-table-card {
  margin-bottom: 20px;
}

.coupon-value {
  font-weight: 600;
  color: #ff6b6b;
}

.unit-label {
  margin-left: 8px;
  color: #666;
}

.date-range {
  display: flex;
  align-items: center;
  
  .date-item {
    margin-bottom: 0;
  }
  
  .date-separator {
    margin: 0 10px;
    color: #666;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>