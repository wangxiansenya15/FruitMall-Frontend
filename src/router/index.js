import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { title: '注册' }
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('../views/Orders.vue'),
    meta: { title: '订单', requiresAuth: true }
  },
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('../views/Cart.vue'),
    meta: { title: '购物车', requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { title: '个人信息', requiresAuth: true }
  },
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: () => import('../views/ProductDetail.vue'),
    meta: { title: '商品详情' }
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: () => import('../views/admin/Dashboard.vue'),
    meta: { 
        requiresAuth: true,
        requiresAdmin: true,
        allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'],
        title: '管理员仪表盘'
    }
  },
  {
    path: '/admin/products',
    name: 'AdminProducts',
    component: () => import('../views/admin/ProductManagement.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'],
      title: '商品管理'
    }
  },
  {
    path: '/admin/statistics',
    name: 'AdminStatistics',
    component: () => import('../views/admin/Statistics.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'],
      title: '统计数据'
    }
  },
  {
    path: '/admin/employees',
    name: 'AdminEmployees',
    component: () => import('../views/admin/EmployeeManagement.vue'),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
      allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'],
      title: '员工管理'
    }
  },
  {    path: '/admin/store-status',    name: 'AdminStoreStatus',    component: () => import('../views/admin/StoreStatus.vue'),    meta: {      requiresAuth: true,      requiresAdmin: true,      allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'],      title: '商店状态'    }  },  {    path: '/admin/coupons',    name: 'AdminCoupons',    component: () => import('../views/admin/CouponManagement.vue'),    meta: {      requiresAuth: true,      requiresAdmin: true,      allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'],      title: '优惠券管理'    }  },  {    path: '/admin/sales',    name: 'AdminSales',    component: () => import('../views/admin/SalesAnalytics.vue'),    meta: {      requiresAuth: true,      requiresAdmin: true,      allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'],      title: '销售分析'    }  },  {    path: '/admin/store',    name: 'AdminStore',    component: () => import('../views/admin/StoreManagement.vue'),    meta: {      requiresAuth: true,      requiresAdmin: true,      allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'],      title: '商店管理'    }  },
  {    path: '/admin/users',    name: 'AdminUsers',    component: () => import('../views/admin/UserManagement.vue'),    meta: {      requiresAuth: true,      requiresAdmin: true,      allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'],      title: '用户管理'    }
  },
  {
    path: '/store-info',
    name: 'StoreInfo',
    component: () => import('../views/StoreInfo.vue'),
    meta: { title: '店铺信息' }
  },
  {
    path: '/contact-us',
    name: 'ContactUs',
    component: () => import('../views/ContactUs.vue'),
    meta: { title: '联系我们' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫，处理页面标题和身份验证
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 水果商城` : '水果商城'
  
  // 检查是否需要身份验证
  const isAuthenticated = localStorage.getItem('user') !== null
  const userData = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
  const userRoles = userData?.roles || []
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    // 需要登录但未登录，重定向到登录页
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.meta.requiresAdmin && !userRoles.some(role => 
      ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN'].includes(role))) {
      next('/')
      ElMessage.error('权限不足，请使用管理员账户登录')
  } else {
    next()
  }
})

export default router