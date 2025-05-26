<script setup>
import { ref, computed } from 'vue'
import { useStoreManagementStore } from '../../stores'
import { ElMessage, ElMessageBox } from 'element-plus'

const storeManagementStore = useStoreManagementStore()

// 商店信息
const storeInfo = computed(() => storeManagementStore.storeInfo)

// 优惠券列表
const coupons = computed(() => storeManagementStore.coupons)

// 对话框可见性
const couponDialogVisible = ref(false)
const dialogType = ref('add') // 'add' 或 'edit'

// 优惠券表单
const couponForm = ref({
  id: null,
  code: '',
  type: 'percentage', // 'percentage' 或 'fixed'
  value: 0,
  minPurchase: 0,
  startDate: '',
  endDate: '',
  isActive: true,
  usageLimit: 100,
  usageCount: 0
})

// 表单验证规则
const rules = {
  code: [
    { required: true, message: '请输入优惠券代码', trigger: 'blur' },
    { min: 3, max: 20, message: '长度应为3-20个字符', trigger: 'blur' }
  ],
  value: [
    { required: true, message: '请输入优惠券面值', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '面值必须大于0', trigger: 'blur' }
  ],
  minPurchase: [
    { required: true, message: '请输入最低消费金额', trigger: 'blur' },
    { type: 'number', min: 0, message: '金额不能为负数', trigger: 'blur' }
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

// 打开添加优惠券对话框
const openAddCouponDialog = () => {
  dialogType.value = 'add'
  resetCouponForm()
  couponDialogVisible.value = true
}

// 打开编辑优惠券对话框
const openEditCouponDialog = (coupon) => {
  dialogType.value = 'edit'
  couponForm.value = { ...coupon }
  couponDialogVisible.value = true
}

// 重置优惠券表单
const resetCouponForm = () => {
  couponForm.value = {
    id: null,
    code: '',
    type: 'percentage',
    value: 0,
    minPurchase: 0,
    startDate: '',
    endDate: '',
    isActive: true,
    usageLimit: 100,
    usageCount: 0
  }
}

// 提交优惠券表单
const submitCouponForm = () => {
  if (!couponFormRef.value) return
  
  couponFormRef.value.validate((valid) => {
    if (valid) {
      if (dialogType.value === 'add') {
        // 添加新优惠券
        storeManagementStore.addCoupon(couponForm.value)
        ElMessage.success('优惠券添加成功')
      } else {
        // 更新现有优惠券
        storeManagementStore.updateCoupon(couponForm.value.id, couponForm.value)
        ElMessage.success('优惠券更新成功')
      }
      couponDialogVisible.value = false
    } else {
      return false
    }
  })
}

// 删除优惠券
const deleteCoupon = (coupon) => {
  ElMessageBox.confirm(
    `确定要删除优惠券 "${coupon.code}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      storeManagementStore.removeCoupon(coupon.id)
      ElMessage.success('优惠券已删除')
    })
    .catch(() => {
      // 取消删除
    })
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

// 获取优惠券类型文本
const getCouponTypeText = (type) => {
  return type === 'percentage' ? '折扣' : '满减'
}

// 格式化优惠券值
const formatCouponValue = (coupon) => {
  if (coupon.type === 'percentage') {
    return `${coupon.value}%`
  } else {
    return `¥${coupon.value.toFixed(2)}`
  }
}

// 获取优惠券状态
const getCouponStatus = (coupon) => {
  const now = new Date()
  const startDate = new Date(coupon.startDate)
  const endDate = new Date(coupon.endDate)
  
  if (!coupon.isActive) return '已禁用'
  if (now < startDate) return '未开始'
  if (now > endDate) return '已过期'
  if (coupon.usageCount >= coupon.usageLimit) return '已用完'
  return '有效'
}

// 获取优惠券状态类型
const getCouponStatusType = (status) => {
  switch (status) {
    case '有效': return 'success'
    case '未开始': return 'info'
    case '已过期': return 'danger'
    case '已用完': return 'warning'
    case '已禁用': return 'info'
    default: return 'info'
  }
}
</script>

<template>
  <div class="store-management">
    <div class="page-header">
      <h1>店铺管理</h1>
    </div>
    
    <!-- 优惠券管理 -->
    <div class="coupon-section">
      <div class="section-header">
        <h2>优惠券管理</h2>
        <el-button type="primary" @click="openAddCouponDialog">
          <el-icon><Plus /></el-icon> 添加优惠券
        </el-button>
      </div>
      
      <el-table :data="coupons" style="width: 100%" border>
        <el-table-column label="ID" prop="id" width="80" />
        
        <el-table-column label="优惠券代码" prop="code" width="120" />
        
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            {{ getCouponTypeText(row.type) }}
          </template>
        </el-table-column>
        
        <el-table-column label="面值" width="100">
          <template #default="{ row }">
            {{ formatCouponValue(row) }}
          </template>
        </el-table-column>
        
        <el-table-column label="最低消费" width="120">
          <template #default="{ row }">
            ¥{{ row.minPurchase.toFixed(2) }}
          </template>
        </el-table-column>
        
        <el-table-column label="有效期" width="200">
          <template #default="{ row }">
            {{ formatDate(row.startDate) }} 至 {{ formatDate(row.endDate) }}
          </template>
        </el-table-column>
        
        <el-table-column label="使用情况" width="120">
          <template #default="{ row }">
            {{ row.usageCount }}/{{ row.usageLimit }}
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getCouponStatusType(getCouponStatus(row))">
              {{ getCouponStatus(row) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button-group>
              <el-button type="primary" size="small" @click="openEditCouponDialog(row)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button type="danger" size="small" @click="deleteCoupon(row)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- 优惠券表单对话框 -->
    <el-dialog
      v-model="couponDialogVisible"
      :title="dialogType === 'add' ? '添加优惠券' : '编辑优惠券'"
      width="50%"
    >
      <el-form
        ref="couponFormRef"
        :model="couponForm"
        :rules="rules"
        label-width="120px"
      >
        <el-form-item label="优惠券代码" prop="code">
          <el-input v-model="couponForm.code" />
        </el-form-item>
        
        <el-form-item label="优惠券类型" prop="type">
          <el-radio-group v-model="couponForm.type">
            <el-radio label="percentage">折扣（百分比）</el-radio>
            <el-radio label="fixed">满减（固定金额）</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="优惠券面值" prop="value">
          <el-input-number 
            v-model="couponForm.value" 
            :precision="couponForm.type === 'percentage' ? 0 : 2" 
            :min="0.01" 
            :max="couponForm.type === 'percentage' ? 100 : 1000"
          />
          <span class="form-hint">
            {{ couponForm.type === 'percentage' ? '折扣百分比，如：10表示9折' : '优惠金额，单位：元' }}
          </span>
        </el-form-item>
        
        <el-form-item label="最低消费金额" prop="minPurchase">
          <el-input-number v-model="couponForm.minPurchase" :precision="2" :min="0" />
          <span class="form-hint">设置为0表示无最低消费限制</span>
        </el-form-item>
        
        <el-form-item label="有效期" required>
          <el-col :span="11">
            <el-form-item prop="startDate">
              <el-date-picker
                v-model="couponForm.startDate"
                type="date"
                placeholder="开始日期"
                style="width: 100%"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="2" class="text-center">
            <span class="el-icon-minus">至</span>
          </el-col>
          <el-col :span="11">
            <el-form-item prop="endDate">
              <el-date-picker
                v-model="couponForm.endDate"
                type="date"
                placeholder="结束日期"
                style="width: 100%"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-form-item>
        
        <el-form-item label="使用次数限制" prop="usageLimit">
          <el-input-number v-model="couponForm.usageLimit" :min="1" :step="1" />
        </el-form-item>
        
        <el-form-item label="是否启用">
          <el-switch v-model="couponForm.isActive" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="couponDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitCouponForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.store-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
  
  h1 {
    font-size: 1.8rem;
    color: #333;
    margin: 0;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h2 {
    font-size: 1.4rem;
    color: #333;
    margin: 0;
  }
}

.coupon-section {
  margin-bottom: 40px;
}

.form-hint {
  margin-left: 10px;
  color: #909399;
  font-size: 0.9rem;
}

.text-center {
  text-align: center;
  line-height: 32px;
}
</style>