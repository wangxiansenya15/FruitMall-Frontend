<script setup>
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'

// 销售统计数据
const salesData = ref({
  daily: {
    total: 2580.50,
    count: 15,
    chart: null
  },
  weekly: {
    total: 15680.30,
    count: 86,
    chart: null
  },
  monthly: {
    total: 68920.80,
    count: 352,
    chart: null
  }
})

// 商品销量排行
const topProducts = ref([
  { name: '红富士苹果', sales: 156, revenue: 2012.40 },
  { name: '海南香蕉', sales: 142, revenue: 1207.00 },
  { name: '泰国山竹', sales: 98, revenue: 3508.40 },
  { name: '智利车厘子', sales: 76, revenue: 6832.40 },
  { name: '新疆哈密瓜', sales: 65, revenue: 1943.50 }
])

// 初始化销售趋势图表
const initSalesChart = () => {
  const chartDom = document.getElementById('salesChart')
  const myChart = echarts.init(chartDom)
  
  const option = {
    title: {
      text: '近7天销售趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: {
      type: 'value',
      name: '销售额（元）'
    },
    series: [{
      data: [2300, 1890, 2580, 3120, 2860, 2990, 1980],
      type: 'line',
      smooth: true
    }]
  }
  
  myChart.setOption(option)
  window.addEventListener('resize', () => myChart.resize())
}

// 初始化商品分类占比图表
const initCategoryChart = () => {
  const chartDom = document.getElementById('categoryChart')
  const myChart = echarts.init(chartDom)
  
  const option = {
    title: {
      text: '商品分类销售占比',
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [{
      name: '销售占比',
      type: 'pie',
      radius: '50%',
      data: [
        { value: 35, name: '苹果' },
        { value: 25, name: '香蕉' },
        { value: 20, name: '热带水果' },
        { value: 15, name: '浆果' },
        { value: 5, name: '瓜类' }
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
  
  myChart.setOption(option)
  window.addEventListener('resize', () => myChart.resize())
}

onMounted(() => {
  initSalesChart()
  initCategoryChart()
})
</script>

<template>
  <div class="statistics-page">
    <h1>统计数据</h1>
    
    <!-- 数据概览 -->
    <div class="data-overview">
      <el-card class="stat-card">
        <template #header>
          <div class="card-header">
            <span>今日销售</span>
          </div>
        </template>
        <div class="stat-value">¥{{ salesData.daily.total.toFixed(2) }}</div>
        <div class="stat-subtitle">订单数：{{ salesData.daily.count }}</div>
      </el-card>
      
      <el-card class="stat-card">
        <template #header>
          <div class="card-header">
            <span>本周销售</span>
          </div>
        </template>
        <div class="stat-value">¥{{ salesData.weekly.total.toFixed(2) }}</div>
        <div class="stat-subtitle">订单数：{{ salesData.weekly.count }}</div>
      </el-card>
      
      <el-card class="stat-card">
        <template #header>
          <div class="card-header">
            <span>本月销售</span>
          </div>
        </template>
        <div class="stat-value">¥{{ salesData.monthly.total.toFixed(2) }}</div>
        <div class="stat-subtitle">订单数：{{ salesData.monthly.count }}</div>
      </el-card>
    </div>
    
    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <el-col :span="16">
          <el-card>
            <div id="salesChart" style="height: 400px;"></div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card>
            <div id="categoryChart" style="height: 400px;"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>
    
    <!-- 商品销量排行 -->
    <div class="ranking-section">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>商品销量排行</span>
          </div>
        </template>
        <el-table :data="topProducts" style="width: 100%">
          <el-table-column prop="name" label="商品名称" />
          <el-table-column prop="sales" label="销量" width="120" />
          <el-table-column prop="revenue" label="销售额" width="150">
            <template #default="{ row }">
              ¥{{ row.revenue.toFixed(2) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.statistics-page {
  padding: 20px;
}

.data-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin: 10px 0;
}

.stat-subtitle {
  color: #909399;
  font-size: 14px;
}

.charts-section {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ranking-section {
  margin-top: 20px;
}
</style>