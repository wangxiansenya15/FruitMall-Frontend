<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from './stores'
import { useStoreManagementStore } from './stores'
import api from '@/services/api'

const router = useRouter()
const userStore = useUserStore()
const storeManagementStore = useStoreManagementStore()

const isAuthenticated = computed(() => userStore.isAuthenticated)
const isAdmin = computed(() => userStore.isAdmin)

// 店铺状态数据
const currentStoreStatus = ref('')
const currentStatusText = ref('加载中...')

// 获取店铺状态
const storeStatus = computed(() => {
  // 状态映射：后端状态 -> 前端状态
  const statusMap = {
    '营业中': 'open',
    '休息中': 'closed',
    '节假日休息': 'holiday',
    '系统维护': 'maintenance'
  }
  return statusMap[currentStoreStatus.value] || 'closed'
})

const storeStatusText = computed(() => currentStatusText.value)

// 获取状态颜色
const getStatusColor = (status) => {
  const statusColors = {
    'open': '#4cd964',
    'closed': '#ff6b6b', 
    'holiday': '#f7ba2a',
    'maintenance': '#909399'
  }
  return statusColors[status] || '#909399'
}

// 控制移动端菜单显示
const isMobileMenuOpen = ref(false)

// 头像加载状态
const avatarLoading = ref(false)

// 导航菜单项
const navItems = [
  { name: '首页', path: '/' },
  { name: '购物车', path: '/cart', requiresAuth: true },
  { name: '订单', path: '/orders', requiresAuth: true },
  { name: '个人信息', path: '/profile', requiresAuth: true },
  { name: '店铺信息', path: '/store-info' },
  { name: '联系我们', path: '/contact-us' }
]

// 过滤导航项
const filteredNavItems = computed(() => {
  return navItems.filter(item => !item.requiresAuth || isAuthenticated.value)
})

// 获取店铺状态
const fetchStoreStatus = async () => {
  try {
    const response = await api.get('/store/current-status')
    if (response && response.status) {
      currentStoreStatus.value = response.status
      currentStatusText.value = response.status
    }
  } catch (error) {
    console.error('获取店铺状态失败:', error)
    // 使用默认状态
    currentStoreStatus.value = '营业中'
    currentStatusText.value = '营业中'
  }
}

// 登出
const logout = () => {
  userStore.logout()
  router.push('/login')
}

// 监听用户头像变化，设置加载状态
watch(
  () => userStore.user?.avatar,
  (newAvatar, oldAvatar) => {
    // 当头像URL发生变化时，显示加载状态
    if (newAvatar && newAvatar !== oldAvatar) {
      avatarLoading.value = true
      
      // 创建一个新的Image对象来预加载头像
      const img = new Image()
      img.onload = () => {
        // 头像加载完成，隐藏加载状态
        avatarLoading.value = false
      }
      img.onerror = () => {
        // 头像加载失败，也隐藏加载状态
        avatarLoading.value = false
      }
      img.src = newAvatar
    } else if (!newAvatar) {
      // 如果没有头像URL，直接隐藏加载状态
      avatarLoading.value = false
    }
  },
  { immediate: true } // 立即执行一次，处理初始状态
)

// 组件挂载时获取店铺状态
onMounted(() => {
  fetchStoreStatus()
})
</script>

<template>
  <div class="app-container">
    <!-- 顶部声明横幅 -->
    <div class="announcement-banner">
      <div class="banner-content">
        <el-icon class="announcement-icon"><Bell /></el-icon>
        <span class="announcement-text">作者声明：本项目仅供个人参考和学习，切勿用于商业用途 | 手机打开后导航栏在右上角⬛展开，注册时需要用到能接收验证码的邮箱📮，新增在线留言功能（位于 联系我们——> 在线留言），欢迎大家积极参与反馈！</span>
      </div>
    </div>
    
    <!-- 顶部导航栏 - macOS风格 -->
    <header class="app-header">
      <div class="header-content">
        <div class="logo-container">
          <router-link to="/" class="logo">
            <img src="/images/logo.png" alt="水果商城" class="logo-image" />
            <span>水果商城</span>
          </router-link>
          <!-- 店铺状态显示 -->
          <div class="store-status-indicator">
            <div class="status-dot" :style="{ backgroundColor: getStatusColor(storeStatus) }"></div>
            <span class="status-text">{{ storeStatusText }}</span>
          </div>
        </div>
        
        <!-- 桌面端导航 -->
        <nav class="desktop-nav">
          <ul>
            <li v-for="item in filteredNavItems" :key="item.path">
              <router-link :to="item.path">{{ item.name }}</router-link>
            </li>
            <!-- 管理员面板按钮 -->
            <li v-if="isAdmin">
              <router-link to="/admin/dashboard" class="admin-link">
                <el-icon><Setting /></el-icon>
                管理员面板
              </router-link>
            </li>
          </ul>
        </nav>
        
        <!-- 用户操作区 -->
        <div class="user-actions">
          <template v-if="isAuthenticated">
            <!-- 桌面端下拉菜单 -->
            <el-dropdown class="desktop-dropdown" trigger="click" :hide-on-click="true">
              <span class="user-dropdown">
                <el-avatar 
                  :size="32" 
                  :src="userStore.user?.avatar" 
                  icon="UserFilled"
                  :loading="avatarLoading"
                />
                <span>{{ userStore.user?.username }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="router.push('/profile')">
                    <el-icon><User /></el-icon> 个人信息
                  </el-dropdown-item>
                  <el-dropdown-item @click="router.push('/orders')">
                    <el-icon><List /></el-icon> 我的订单
                  </el-dropdown-item>
                  <!-- 管理员面板选项 -->
                  <el-dropdown-item v-if="isAdmin" @click="router.push('/admin/dashboard')">
                    <el-icon><Setting /></el-icon> 管理员面板
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="logout">
                    <el-icon><SwitchButton /></el-icon> 退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <!-- 移动端用户头像按钮 -->
            <div class="mobile-user-avatar" @click="isMobileMenuOpen = !isMobileMenuOpen">
              <el-avatar 
                :size="32" 
                :src="userStore.user?.avatar" 
                icon="UserFilled"
                :loading="avatarLoading"
              />
            </div>
          </template>
          <template v-else>
            <router-link to="/login" class="login-btn">
              <el-button type="primary" plain size="small">登录</el-button>
            </router-link>
            <router-link to="/register" class="register-btn">
              <el-button size="small">注册</el-button>
            </router-link>
          </template>
        </div>
        
        <!-- 移动端菜单按钮 -->
        <div class="mobile-menu-toggle" @click="isMobileMenuOpen = !isMobileMenuOpen">
          <el-icon v-if="isMobileMenuOpen"><Close /></el-icon>
          <el-icon v-else><Menu /></el-icon>
        </div>
      </div>
      
      <!-- 移动端导航菜单 -->
      <transition name="slide-fade">
        <nav class="mobile-nav" v-show="isMobileMenuOpen">
          <ul>
            <li v-for="item in filteredNavItems" :key="item.path">
              <router-link :to="item.path" @click="isMobileMenuOpen = false">
                {{ item.name }}
              </router-link>
            </li>
            <!-- 移动端管理员面板选项 -->
            <li v-if="isAdmin">
              <router-link to="/admin/dashboard" @click="isMobileMenuOpen = false">
                <el-icon><Setting /></el-icon> 管理员面板
              </router-link>
            </li>
            <template v-if="isAuthenticated">
              <li>
                <a @click="logout(); isMobileMenuOpen = false">退出登录</a>
              </li>
            </template>
            <template v-else>
              <li>
                <router-link to="/login" @click="isMobileMenuOpen = false">登录</router-link>
              </li>
              <li>
                <router-link to="/register" @click="isMobileMenuOpen = false">注册</router-link>
              </li>
            </template>
          </ul>
        </nav>
      </transition>
    </header>
    
    <!-- 主内容区域 -->
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    
    <!-- 页脚 -->
    <footer class="app-footer">
      <div class="footer-content">
        <p>© {{ new Date().getFullYear() }} 该网站仅供个人参考和学习，切勿用于商业用途 </p>
      </div>
    </footer>
  </div>
</template>

<style lang="scss">
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #333;
  background-color: #f5f7fa;
}

a {
  text-decoration: none;
  color: inherit;
}

ul {
  list-style: none;
}

/* 应用容器 */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
}

/* 顶部声明横幅 */
.announcement-banner {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
  padding: 8px 0;
  text-align: center;
  font-size: 0.9rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  .banner-content {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    
    .announcement-icon {
      font-size: 1rem;
      animation: ring 2s infinite;
    }
    
    .announcement-text {
      font-weight: 500;
    }
  }
}

/* 喇叭摇摆动画 */
@keyframes ring {
  0%, 20%, 50%, 80%, 100% {
    transform: rotate(0deg);
  }
  10% {
    transform: rotate(-10deg);
  }
  30% {
    transform: rotate(10deg);
  }
  60% {
    transform: rotate(-5deg);
  }
  90% {
    transform: rotate(5deg);
  }
}

/* 顶部导航栏 - macOS风格 */
.app-header {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  width: 90%;
  margin: 0 auto;
  padding: 0 15px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo {
  display: flex;
  align-items: center;
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
  
  .logo-image {
    width: 32px;
    height: 32px;
    margin-right: 10px;
    object-fit: contain;
  }
}

/* 店铺状态指示器 */
.store-status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  
  .status-text {
    font-size: 0.85rem;
    font-weight: 500;
    color: #333;
  }
}

/* 状态点脉冲动画 */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(76, 217, 100, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(76, 217, 100, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 217, 100, 0);
  }
}

/* 桌面端导航 */
.desktop-nav {
  display: flex;
  
  ul {
    display: flex;
    gap: 30px;
    
    li a {
      color: #333;
      font-weight: 500;
      font-size: 1.1rem;
      padding: 10px 0;
      position: relative;
      transition: all 0.3s ease;
      
      &:hover, &.router-link-active {
        color: #3498db; /* 蓝色主题 */
      }
      
      &:hover:not(.admin-link) {
        background-color: rgba(52, 152, 219, 0.1); /* 淡蓝色背景 */
        padding: 10px 15px;
        border-radius: 6px;
        margin: 0 -15px;
        box-shadow: 0 2px 4px rgba(52, 152, 219, 0.2);
        transform: translateY(-2px);
      }
      
      &.router-link-active::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 100%;
        height: 3px;
        background-color: #3498db; /* 蓝色主题 */
        border-radius: 2px;
      }
    }
    
    /* 管理员面板链接样式 */
    .admin-link {
      display: flex;
      align-items: center;
      background-color: #ff6b6b;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      transition: all 0.3s ease;
      
      .el-icon {
        margin-right: 6px;
      }
      
      &:hover {
        background-color: #ff5252;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(255, 107, 107, 0.3);
      }
      
      &.router-link-active {
        background-color: #ff5252;
        color: white;
      }
      
      &.router-link-active::after {
        display: none;
      }
    }
  }
}

/* 用户操作区 */
.user-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 20px;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  span {
    margin: 0 8px;
  }
}

/* 移动端用户头像按钮 */
.mobile-user-avatar {
  display: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  &:active {
    background-color: rgba(0, 0, 0, 0.1);
    transform: scale(0.95);
  }
}

/* 移动端菜单 */
.mobile-menu-toggle {
  display: none;
  cursor: pointer;
  font-size: 1.5rem;
}

.mobile-nav {
  display: none;
  background-color: white;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  
  ul {
    display: flex;
    flex-direction: column;
    gap: 20px;
    
    li a {
      display: flex;
      align-items: center;
      padding: 12px 10px;
      font-weight: 500;
      font-size: 1.2rem;
      transition: all 0.3s ease;
      border-radius: 6px;
      
      &:hover:not([to="/admin/dashboard"]) {
        background-color: rgba(52, 152, 219, 0.1);
        color: #3498db;
        transform: translateX(5px);
        box-shadow: 0 2px 4px rgba(52, 152, 219, 0.2);
      }
      
      &.router-link-active {
        color: #3498db;
      }
      
      .el-icon {
        margin-right: 8px;
      }
    }
    
    /* 移动端用户信息区域样式 */
    .mobile-user-section {
      border-bottom: 1px solid #eee;
      padding-bottom: 15px;
      margin-bottom: 15px;
      
      .mobile-user-info {
        display: flex;
        align-items: center;
        padding: 12px 10px;
        background-color: rgba(52, 152, 219, 0.05);
        border-radius: 8px;
        
        .username {
          margin-left: 12px;
          font-weight: 600;
          font-size: 1.1rem;
          color: #2c3e50;
        }
      }
    }
  }
}

/* 主内容区域 */
.app-main {
  flex: 1;
  padding: 30px 20px;
  max-width: 1400px;
  width: 95%;
  margin: 0 auto;
}

/* 页脚 */
.app-footer {
  background-color: #f8f9fa;
  padding: 24px 0;
  margin-top: auto;
  border-top: 1px solid #eaeaea;
}

.footer-content {
  max-width: 1400px;
  width: 95%;
  margin: 0 auto;
  padding: 0 20px;
  text-align: center;
  color: #666;
  font-size: 1rem;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 992px) {
  .desktop-nav {
    display: none;
  }
  
  .mobile-menu-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    font-size: 1.8rem;
    border-radius: 8px;
    transition: background-color 0.3s;
    
    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
    
    &:active {
      background-color: rgba(0, 0, 0, 0.1);
    }
  }
  
  .mobile-nav {
    display: block;
  }
  
  .user-actions {
    .login-btn, .register-btn {
      display: none;
    }
  }
  
  .user-dropdown span {
    display: none;
  }
  
  .logo-container {
    gap: 10px;
  }
  
  .store-status-indicator {
    .status-text {
      display: none;
    }
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .app-main {
    width: 90%;
  }
}

@media (max-width: 768px) {
  .app-main {
    width: 100%;
    padding: var(--mobile-padding);
  }
  
  .header-content {
    height: 60px;
    padding: 0 var(--mobile-padding);
  }
  
  .announcement-banner {
    padding: 6px 0;
    font-size: 0.8rem;
    
    .banner-content {
      padding: 0 var(--mobile-padding);
      gap: 6px;
    }
  }
  
  .logo {
    font-size: 1.5rem;
    
    .el-icon {
      font-size: 1.8rem;
    }
  }
  
  .store-status-indicator {
    padding: 4px 8px;
    
    .status-dot {
      width: 6px;
      height: 6px;
    }
  }
  
  .mobile-nav {
    padding: var(--mobile-padding);
    
    ul {
      gap: var(--mobile-margin);
      
      li a {
        padding: var(--mobile-margin) 10px;
        font-size: var(--mobile-font-size);
        min-height: var(--touch-target-size);
        display: flex;
        align-items: center;
      }
    }
  }
}
</style>
