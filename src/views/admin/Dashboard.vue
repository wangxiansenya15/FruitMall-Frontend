<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, useProductStore } from '../../stores'

const router = useRouter()
const userStore = useUserStore()
const productStore = useProductStore()

// 确保用户是管理员
const isAdmin = computed(() => userStore.isAdmin)

// 商店状态
const storeStatus = ref('营业中') // 这里应该从实际的商店状态存储中获取

// 统计数据
const statistics = ref({
  dailySales: 2580.50,
  orderCount: 15,
  customerCount: 8,
  productCount: productStore.products.length
})

// 导航到管理页面
const navigateTo = (route) => {
  router.push(route)
}
</script>

<template>
  <div class="admin-dashboard" v-if="isAdmin">
    <h1 class="dashboard-title">管理员仪表盘</h1>
    
    <!-- 状态概览 -->
    <div class="status-overview">
      <div class="status-card">
        <h3>商城状态</h3>
        <div class="status-indicator" :class="{ 'status-open': storeStatus === '营业中' }">
          {{ storeStatus }}
        </div>
        <el-button type="primary" size="small" @click="navigateTo('/admin/store-status')">
          管理状态
        </el-button>
      </div>
      
      <div class="status-card">
        <h3>今日销售额</h3>
        <div class="status-value">¥{{ statistics.dailySales.toFixed(2) }}</div>
        <el-button type="primary" size="small" @click="navigateTo('/admin/statistics')">
          查看详情
        </el-button>
      </div>
      
      <div class="status-card">
        <h3>今日订单数</h3>
        <div class="status-value">{{ statistics.orderCount }}</div>
        <el-button type="primary" size="small" @click="navigateTo('/admin/statistics')">
          查看详情
        </el-button>
      </div>
      
      <div class="status-card">
        <h3>商品总数</h3>
        <div class="status-value">{{ statistics.productCount }}</div>
        <el-button type="primary" size="small" @click="navigateTo('/admin/products')">
          管理商品
        </el-button>
      </div>
    </div>
    
    <!-- 管理功能导航 -->
    <div class="admin-nav">
      <div class="nav-card" @click="navigateTo('/admin/products')">
        <el-icon><Goods /></el-icon>
        <h3>商品管理</h3>
        <p>上架、编辑和管理商品</p>
      </div>
      
      <div class="nav-card" @click="navigateTo('/admin/store')">
        <el-icon><Shop /></el-icon>
        <h3>店铺管理</h3>
        <p>管理店铺信息和设置</p>
      </div>
      
      <div class="nav-card" @click="navigateTo('/admin/employees')">
        <el-icon><User /></el-icon>
        <h3>员工管理</h3>
        <p>管理员工信息和权限</p>
      </div>
      
      <div class="nav-card" @click="navigateTo('/admin/statistics')">
        <el-icon><DataLine /></el-icon>
        <h3>销售统计</h3>
        <p>查看销售数据和分析</p>
      </div>
      
      <div class="nav-card" @click="navigateTo('/admin/store-status')">
        <el-icon><SetUp /></el-icon>
        <h3>商城状态</h3>
        <p>设置商城营业状态</p>
      </div>

      <div class="nav-card" @click="navigateTo('/admin/users')">
        <el-icon><UserFilled /></el-icon>
        <h3>用户管理</h3>
        <p>管理用户账户和权限</p>
      </div>
    </div>
  </div>
  <div v-else class="unauthorized">
    <h2>无权访问</h2>
    <p>您没有管理员权限，无法访问此页面</p>
    <el-button type="primary" @click="router.push('/')">返回首页</el-button>
  </div>
</template>

<style lang="scss" scoped>
.admin-dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-title {
  font-size: 2rem;
  margin-bottom: 30px;
  color: #333;
  font-weight: 600;
}

.status-overview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.status-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
  
  h3 {
    font-size: 1rem;
    color: #666;
    margin-bottom: 10px;
  }
  
  .status-indicator {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 15px 0;
    color: #ff6b6b;
    
    &.status-open {
      color: #4cd964;
    }
  }
  
  .status-value {
    font-size: 1.8rem;
    font-weight: 600;
    margin: 15px 0;
    color: #333;
  }
}

.admin-nav {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.nav-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 25px 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }
  
  .el-icon {
    font-size: 2.5rem;
    color: #ff6b6b;
    margin-bottom: 15px;
  }
  
  h3 {
    font-size: 1.3rem;
    margin-bottom: 10px;
    color: #333;
  }
  
  p {
    color: #666;
    font-size: 0.9rem;
  }
}

.unauthorized {
  text-align: center;
  padding: 60px 20px;
  
  h2 {
    font-size: 1.8rem;
    color: #ff6b6b;
    margin-bottom: 15px;
  }
  
  p {
    color: #666;
    margin-bottom: 30px;
  }
}

@media (max-width: 768px) {
  .status-overview,
  .admin-nav {
    grid-template-columns: 1fr;
  }
}
</style>