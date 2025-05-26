import { defineStore } from 'pinia'

// 定义商店管理状态存储
export const useStoreManagementStore = defineStore('storeManagement', {
  state: () => ({
    // 商店基本信息
    storeInfo: {
      name: '水果商城',
      address: '北京市朝阳区xx路xx号',
      phone: '010-12345678',
      email: 'contact@fruitmall.com',
      openingHours: '09:00-21:00',
      description: '专业的水果零售商城，提供新鲜、优质的水果。'
    },
    
    // 商店状态
    storeStatus: 'open', // 'open' | 'closed' | 'holiday' | 'maintenance'
    
    // 员工列表
    employees: [],
    
    // 优惠券列表
    coupons: [],
    
    // 秒杀活动列表
    flashSales: [],
    
    // 销售统计数据
    salesStatistics: {
      daily: [],
      weekly: [],
      monthly: []
    }
  }),

  getters: {
    // 获取商店状态文本
    storeStatusText: (state) => {
      const statusMap = {
        open: '营业中',
        closed: '已打烊',
        holiday: '节假日休息',
        maintenance: '系统维护中'
      }
      return statusMap[state.storeStatus] || '未知状态'
    },

    // 根据商品ID获取秒杀信息
    getFlashSaleByProductId: (state) => (productId) => {
      return state.flashSales.find(sale => sale.productId === productId)
    }
  },

  actions: {
    // 更新商店状态
    updateStoreStatus(status) {
      this.storeStatus = status
    },

    // 更新商店信息
    updateStoreInfo(info) {
      this.storeInfo = { ...this.storeInfo, ...info }
    },

    // 添加员工
    addEmployee(employee) {
      this.employees.push({
        id: Date.now(),
        ...employee
      })
    },

    // 更新员工信息
    updateEmployee(id, data) {
      const index = this.employees.findIndex(emp => emp.id === id)
      if (index !== -1) {
        this.employees[index] = { ...this.employees[index], ...data }
      }
    },

    // 删除员工
    removeEmployee(id) {
      this.employees = this.employees.filter(emp => emp.id !== id)
    },

    // 添加优惠券
    addCoupon(coupon) {
      this.coupons.push({
        id: Date.now(),
        ...coupon
      })
    },

    // 更新优惠券
    updateCoupon(id, data) {
      const index = this.coupons.findIndex(c => c.id === id)
      if (index !== -1) {
        this.coupons[index] = { ...this.coupons[index], ...data }
      }
    },

    // 删除优惠券
    removeCoupon(id) {
      this.coupons = this.coupons.filter(c => c.id !== id)
    },

    // 添加秒杀活动
    addFlashSale(flashSale) {
      this.flashSales.push({
        id: Date.now(),
        ...flashSale
      })
    },

    // 更新秒杀活动
    updateFlashSale(id, data) {
      const index = this.flashSales.findIndex(f => f.id === id)
      if (index !== -1) {
        this.flashSales[index] = { ...this.flashSales[index], ...data }
      }
    },

    // 删除秒杀活动
    removeFlashSale(id) {
      this.flashSales = this.flashSales.filter(f => f.id !== id)
    },

    // 更新销售统计数据
    updateSalesStatistics(data) {
      this.salesStatistics = { ...this.salesStatistics, ...data }
    }
  }
})