<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, ArrowUp, Search, RefreshRight, Plus } from '@element-plus/icons-vue'
import api from '@/services/api'

// 用户状态枚举
const userStatusOptions = [
  { label: '正常', value: 'ACTIVE', type: 'success' },
  { label: '禁用', value: 'DISABLED', type: 'danger' },
  { label: '账户锁定', value: 'LOCKED', type: 'warning' },
  { label: '过期', value: 'EXPIRED', type: 'info' },
  { label: '凭证过期', value: 'CREDENTIALS_EXPIRED', type: 'info' }
]

// 用户角色枚举
const userRoleOptions = [
  { label: '管理员', value: 'ADMIN' },
  { label: '超级管理员', value: 'SUPER_ADMIN' },
  { label: '普通用户', value: 'USER' },
  { label: '商家', value: 'MERCHANT' },
  { label: '客服', value: 'CUSTOMER_SERVICE' }
]

// 表格数据
const tableData = ref([])
const loading = ref(false)
const total = ref(0)

// 分页参数
const pagination = reactive({
  currentPage: 1,
  pageSize: 10
})

// 搜索参数
const searchForm = reactive({
  id: '',
  username: '',
  email: '',
  status: '',
  role: ''
})

// 是否显示高级搜索
const showAdvancedSearch = ref(false)

// 表单对话框
const dialogVisible = ref(false)
const dialogTitle = ref('添加用户')
const formLoading = ref(false)

// 表单数据
const formData = reactive({
  id: '',
  username: '',
  password: '',
  email: '',
  role: '',
  status: 'ACTIVE',
  registerTime: '',
  updateTime: ''
})

// 表单验证规则
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: dialogTitle.value === '添加用户' ? [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ] : [],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择用户角色', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择账户状态', trigger: 'change' }
  ]
}

// 表单引用
const formRef = ref(null)

// 获取用户列表
const getUserList = async () => {
  loading.value = true
  try {
    // 调用后端API获取用户列表
    // API: GET /api/users
    // 参数: page, size, username, email, status, role, id
    const response = await api.get('/admin/users', {
      params: {
        page: pagination.currentPage, // 修改为从1开始的分页参数，与后端API保持一致
        size: pagination.pageSize,
        ...searchForm
      }
    })
    
    // 使用后端返回的数据 - Result<T>格式: {code, message, data}
    // data为PageInfo<User>格式: {list, total, ...}
    console.log('API响应数据:', response.data) // 调试日志
    
    // 检查响应状态码
    if (response.data.code === 200) {
      // 从Result.data中获取PageInfo对象
      const pageInfo = response.data.data
      // 从PageInfo中获取用户列表和总数
      tableData.value = pageInfo?.list || []
      total.value = pageInfo?.total || 0
      console.log('处理后表格数据:', tableData.value) // 调试日志
    } else {
      // 处理业务逻辑错误
      ElMessage.error(response.data.message || '获取用户列表失败')
      tableData.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('获取用户列表失败', error)
    ElMessage.error('获取用户列表失败：' + (error.message || '未知错误'))
    // 如果API调用失败，保持表格为空
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 搜索用户
const handleSearch = () => {
  pagination.currentPage = 1
  getUserList()
}

// 重置搜索
const resetSearch = () => {
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = ''
  })
  pagination.currentPage = 1
  getUserList()
}

// 处理分页变化
const handleCurrentChange = (val) => {
  pagination.currentPage = val
  getUserList()
}

// 处理每页条数变化
const handleSizeChange = (val) => {
  pagination.pageSize = val
  pagination.currentPage = 1
  getUserList()
}

// 打开添加用户对话框
const handleAdd = () => {
  dialogTitle.value = '添加用户'
  resetForm()
  dialogVisible.value = true
}

// 打开编辑用户对话框
const handleEdit = async (row) => {
  dialogTitle.value = '编辑用户'
  resetForm()
  formLoading.value = true
  
  try {
    // 调用后端API获取用户详情
    const response = await api.get(`/admin/users/${row.id}`)
    
    // 检查响应状态码
    if (response.data.code === 200) {
      // 从Result.data中获取用户数据
      const userData = response.data.data
      // 填充表单数据
      Object.assign(formData, { ...userData, password: '' })
      dialogVisible.value = true
    } else {
      // 处理业务逻辑错误
      ElMessage.error(response.data.message || '获取用户详情失败')
    }
  } catch (error) {
    console.error('获取用户详情失败', error)
    ElMessage.error('获取用户详情失败：' + (error.message || '未知错误'))
  } finally {
    formLoading.value = false
  }
}

// 提交表单 - 仅处理用户基本信息的更新
const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      formLoading.value = true
      try {
        let response
        const { status, ...userData } = formData // 从表单数据中分离出状态字段
        
        if (formData.id) {
          // 更新用户基本信息
          response = await api.put(`/admin/users/${formData.id}`, userData)
        } else {
          // 创建用户
          response = await api.post('/admin/users', userData)
        }
        
        // 检查响应状态码
        if (response.data.code === 200) {
          // 如果是编辑用户且状态发生变化，则调用状态更新接口
          if (formData.id && formData.status) {
            await handleStatusChange({ id: formData.id, status: formData.status })
          }
          ElMessage.success(response.data.message || (formData.id ? '更新用户成功' : '创建用户成功'))
          dialogVisible.value = false
          getUserList()
        } else {
          // 处理业务逻辑错误
          ElMessage.error(response.data.message || '保存用户失败')
        }
      } catch (error) {
        console.error('保存用户失败', error)
        ElMessage.error('保存用户失败：' + (error.message || '未知错误'))
      } finally {
        formLoading.value = false
      }
    }
  })
}

// 修改用户状态 - 专门处理状态更新
const handleStatusChange = async (row) => {
  try {
    // 根据不同状态设置对应的标志位
    const statusData = {
      // 只有状态为ACTIVE时账户才是启用的
      enabled: row.status === 'ACTIVE',
      // 状态为EXPIRED时账户已过期
      accountNonExpired: row.status !== 'EXPIRED',
      // 状态为LOCKED时账户被锁定
      accountNonLocked: row.status !== 'LOCKED',
      // 状态为CREDENTIALS_EXPIRED时凭证已过期
      credentialsNonExpired: row.status !== 'CREDENTIALS_EXPIRED',
      // 添加当前状态，方便后端记录
      status: row.status
    }

    const response = await api.patch(`/admin/users/${row.id}/status`, statusData)

    // 检查响应状态码
    if (response.data.code === 200) {
      ElMessage.success(response.data.message || '更新用户状态成功')
      getUserList() // 成功时刷新数据，确保前后端一致
    } else {
      // 处理业务逻辑错误
      ElMessage.error(response.data.message || '更新用户状态失败')
      getUserList() // 刷新数据，恢复原状态
    }
  } catch (error) {
    console.error('更新用户状态失败', error)
    ElMessage.error('更新用户状态失败：' + (error.message || '未知错误'))
    getUserList() // 刷新数据，恢复原状态
  }
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(formData, {
    id: '',
    username: '',
    password: '',
    email: '',
    role: '',
    status: 'ACTIVE',
    registerTime: '',
    updateTime: ''
  })
}

// 删除用户
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除用户 ${row.username} 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      // 调用后端API删除用户
      const response = await api.delete(`/admin/users/${row.id}`)
      
      // 检查响应状态码
      if (response.data.code === 200) {
        ElMessage.success(response.data.message || '删除用户成功')
        getUserList()
      } else {
        // 处理业务逻辑错误
        ElMessage.error(response.data.message || '删除用户失败')
      }
    } catch (error) {
      console.error('删除用户失败', error)
      ElMessage.error('删除用户失败：' + (error.message || '未知错误'))
    }
  }).catch(() => {
    // 取消删除
  })
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 获取状态标签类型
const getStatusType = (status) => {
  const option = userStatusOptions.find(opt => opt.value === status)
  return option ? option.type : ''
}

// 获取状态标签文本
const getStatusLabel = (status) => {
  const option = userStatusOptions.find(opt => opt.value === status)
  return option ? option.label : status
}

// 获取角色标签文本
const getRoleLabel = (role) => {
  const option = userRoleOptions.find(opt => opt.value === role)
  return option ? option.label : role
}

// 页面加载时获取用户列表
onMounted(() => {
  getUserList()
})
</script>

<template>
  <div class="user-management-page">
    <h1 class="page-title">用户管理</h1>
    
    <!-- 搜索表单 -->
    <el-card class="search-card" shadow="hover">
      <div class="search-form-header">
        <h3>搜索条件</h3>
        <el-button 
          type="link" 
          @click="showAdvancedSearch = !showAdvancedSearch"
        >
          {{ showAdvancedSearch ? '收起' : '展开' }}高级搜索
          <el-icon>
            <component :is="showAdvancedSearch ? 'ArrowUp' : 'ArrowDown'" />
          </el-icon>
        </el-button>
      </div>
      
      <el-form :model="searchForm" class="search-form">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="用户ID">
              <el-input 
                v-model="searchForm.id" 
                placeholder="请输入用户ID" 
                clearable 
                size="large"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="用户名">
              <el-input 
                v-model="searchForm.username" 
                placeholder="请输入用户名" 
                clearable 
                size="large"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="邮箱">
              <el-input 
                v-model="searchForm.email" 
                placeholder="请输入邮箱" 
                clearable 
                size="large"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-collapse-transition>
          <div v-show="showAdvancedSearch">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="状态">
                  <el-select 
                    v-model="searchForm.status" 
                    placeholder="请选择状态" 
                    clearable 
                    size="large" 
                    style="width: 100%"
                  >
                    <el-option 
                      v-for="item in userStatusOptions" 
                      :key="item.value" 
                      :label="item.label" 
                      :value="item.value" 
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="角色">
                  <el-select 
                    v-model="searchForm.role" 
                    placeholder="请选择角色" 
                    clearable 
                    size="large" 
                    style="width: 100%"
                  >
                    <el-option 
                      v-for="item in userRoleOptions" 
                      :key="item.value" 
                      :label="item.label" 
                      :value="item.value" 
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </el-collapse-transition>
        
        <div class="search-buttons">
          <el-button type="primary" size="large" @click="handleSearch" icon="Search">搜索</el-button>
          <el-button size="large" @click="resetSearch" icon="RefreshRight">重置</el-button>
          <el-button type="success" size="large" @click="handleAdd" icon="Plus">添加用户</el-button>
        </div>
      </el-form>
    </el-card>
    
    <!-- 用户表格 -->
    <el-card class="table-card" shadow="hover">
      <el-table 
        :data="tableData" 
        style="width: 100%" 
        border 
        v-loading="loading"
        stripe
        :header-cell-style="{fontSize: '16px', fontWeight: 'bold', background: '#f5f7fa'}"
        :cell-style="{fontSize: '15px'}"
      >
        <el-table-column prop="id" label="用户ID" min-width="120" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="role" label="角色" min-width="120" align="center">
          <template #default="{ row }">
            <el-tag size="large" effect="plain">{{ getRoleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" min-width="120" align="center">
          <template #default="{ row }">
            <el-tag 
              :type="getStatusType(row.status)" 
              size="large" 
              effect="light"
            >
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="registerTime" label="注册时间" min-width="200">
          <template #default="{ row }">
            {{ formatDate(row.registerTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" min-width="200">
          <template #default="{ row }">
            {{ formatDate(row.updateTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" min-width="200" align="center">
          <template #default="{ row }">
            <el-button size="default" type="primary" plain @click="handleEdit(row)">编辑</el-button>
            <el-button 
              size="default" 
              type="danger" 
              plain
              @click="handleDelete(row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          background
          :small="false"
        />
      </div>
    </el-card>
    
    <!-- 用户表单对话框 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="dialogTitle"
      width="600px"
      destroy-on-close
      top="5vh"
    >
      <el-form 
        ref="formRef"
        :model="formData" 
        :rules="rules" 
        label-width="120px"
        v-loading="formLoading"
        class="user-form"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="formData.username" size="large" />
        </el-form-item>
        <el-form-item v-if="dialogTitle === '添加用户'" label="密码" prop="password">
            <el-input 
              v-model="formData.password" 
              type="password" 
              placeholder="请输入密码" 
              :required="!formData.id" 
              size="large" 
              show-password
            />
          </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" size="large" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="formData.role" placeholder="请选择角色" style="width: 100%" size="large">
            <el-option 
              v-for="item in userRoleOptions" 
              :key="item.value" 
              :label="item.label" 
              :value="item.value" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%" size="large">
            <el-option 
              v-for="item in userStatusOptions" 
              :key="item.value" 
              :label="item.label" 
              :value="item.value" 
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button size="large" @click="dialogVisible = false">取消</el-button>
          <el-button size="large" type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.user-management-page {
  padding: 20px;
  height: 100%;
  box-sizing: border-box;
}

.page-title {
  font-size: 28px;
  margin-bottom: 24px;
  color: #303133;
  font-weight: 600;
}

.search-card {
  margin-bottom: 24px;
}

.search-form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.search-form-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.search-form {
  margin-top: 16px;
}

.search-buttons {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  gap: 12px;
}

.table-card {
  margin-bottom: 40px;
}

.pagination-container {
  margin-top: 30px;
  margin-bottom: 30px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.user-form :deep(.el-form-item__label) {
  font-size: 16px;
}

.user-form :deep(.el-input__inner) {
  font-size: 16px;
}

/* 适配不同屏幕尺寸 */
@media (max-width: 1200px) {
  .el-col {
    width: 100%;
  }
}
</style>