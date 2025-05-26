<script setup>
import { ref, computed, reactive } from 'vue'
import { useStoreManagementStore } from '../../stores'
import { ElMessage, ElMessageBox } from 'element-plus'

const storeManagementStore = useStoreManagementStore()

// 员工列表
const employees = computed(() => storeManagementStore.employees)

// 对话框可见性
const dialogVisible = ref(false)
const dialogType = ref('add') // 'add' 或 'edit'

// 表单数据
const employeeForm = reactive({
  id: null,
  name: '',
  position: '',
  email: '',
  phone: '',
  hireDate: ''
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入员工姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度应为2-20个字符', trigger: 'blur' }
  ],
  position: [
    { required: true, message: '请输入职位', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  hireDate: [
    { required: true, message: '请选择入职日期', trigger: 'change' }
  ]
}

// 表单引用
const employeeFormRef = ref(null)

// 搜索关键词
const searchQuery = ref('')

// 筛选后的员工列表
const filteredEmployees = computed(() => {
  if (!searchQuery.value) return employees.value
  
  const query = searchQuery.value.toLowerCase()
  return employees.value.filter(employee => 
    employee.name.toLowerCase().includes(query) ||
    employee.position.toLowerCase().includes(query) ||
    employee.email.toLowerCase().includes(query)
  )
})

// 打开添加员工对话框
const openAddDialog = () => {
  dialogType.value = 'add'
  resetForm()
  dialogVisible.value = true
}

// 打开编辑员工对话框
const openEditDialog = (employee) => {
  dialogType.value = 'edit'
  Object.assign(employeeForm, employee)
  dialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  employeeForm.id = null
  employeeForm.name = ''
  employeeForm.position = ''
  employeeForm.email = ''
  employeeForm.phone = ''
  employeeForm.hireDate = ''
}

// 提交表单
const submitForm = () => {
  if (!employeeFormRef.value) return
  
  employeeFormRef.value.validate((valid) => {
    if (valid) {
      if (dialogType.value === 'add') {
        // 添加新员工
        storeManagementStore.addEmployee({
          name: employeeForm.name,
          position: employeeForm.position,
          email: employeeForm.email,
          phone: employeeForm.phone,
          hireDate: employeeForm.hireDate
        })
        ElMessage.success('员工添加成功')
      } else {
        // 更新现有员工
        storeManagementStore.updateEmployee(employeeForm.id, {
          name: employeeForm.name,
          position: employeeForm.position,
          email: employeeForm.email,
          phone: employeeForm.phone,
          hireDate: employeeForm.hireDate
        })
        ElMessage.success('员工信息更新成功')
      }
      dialogVisible.value = false
    } else {
      return false
    }
  })
}

// 删除员工
const deleteEmployee = (employee) => {
  ElMessageBox.confirm(
    `确定要删除员工 "${employee.name}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      storeManagementStore.removeEmployee(employee.id)
      ElMessage.success('员工已删除')
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
</script>

<template>
  <div class="employee-management">
    <div class="page-header">
      <h1>员工管理</h1>
      <el-button type="primary" @click="openAddDialog">
        <el-icon><Plus /></el-icon> 添加员工
      </el-button>
    </div>
    
    <!-- 搜索 -->
    <div class="search-section">
      <el-input
        v-model="searchQuery"
        placeholder="搜索员工姓名、职位或邮箱"
        clearable
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>
    
    <!-- 员工列表 -->
    <el-table :data="filteredEmployees" style="width: 100%" border>
      <el-table-column label="ID" prop="id" width="80" />
      
      <el-table-column label="姓名" prop="name" width="120" />
      
      <el-table-column label="职位" prop="position" width="120" />
      
      <el-table-column label="邮箱" prop="email" />
      
      <el-table-column label="电话" prop="phone" width="150" />
      
      <el-table-column label="入职日期" width="120">
        <template #default="{ row }">
          {{ formatDate(row.hireDate) }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button-group>
            <el-button type="primary" size="small" @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button type="danger" size="small" @click="deleteEmployee(row)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 员工表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加员工' : '编辑员工'"
      width="50%"
    >
      <el-form
        ref="employeeFormRef"
        :model="employeeForm"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="employeeForm.name" />
        </el-form-item>
        
        <el-form-item label="职位" prop="position">
          <el-input v-model="employeeForm.position" />
        </el-form-item>
        
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="employeeForm.email" type="email" />
        </el-form-item>
        
        <el-form-item label="电话" prop="phone">
          <el-input v-model="employeeForm.phone" />
        </el-form-item>
        
        <el-form-item label="入职日期" prop="hireDate">
          <el-date-picker
            v-model="employeeForm.hireDate"
            type="date"
            placeholder="选择入职日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
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
  </div>
</template>

<style lang="scss" scoped>
.employee-management {
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

.search-section {
  margin-bottom: 20px;
  
  .search-input {
    width: 300px;
  }
}

.el-table {
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;
}
</style>