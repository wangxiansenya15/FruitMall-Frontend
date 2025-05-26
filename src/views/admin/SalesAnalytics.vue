<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStoreManagementStore } from '../../stores'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent
} from 'echarts/components'
import { LabelLayout, UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'

// 注册必需的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart
])

const storeManagementStore = useStoreManagementStore()

// 销售统计数据
const salesStatistics = computed(() => storeManagementStore.salesStatistics)

// 图表实例
const revenueChartRef = ref(null)
const categoryChartRef = ref(null)
const trendChartRef = ref(null)
let revenueChart = null
let categoryChart = null
let trendChart = null

// 时间范围
const timeRange = ref('month') // 'today', 'week', 'month', 'year'

// 根据时间范围获取数据
const currentStats = computed(() => {
  switch (timeRange.value) {
    case 'week':
      return salesStatistics.value.thisWeek
    case 'month':
      return salesStatistics.value.thisMonth
    case 'year':
      return salesStatistics.value.thisYear || { totalSales: 0, orderCount: 0 }
    case 'today':
    default:
      return salesStatistics.value.today
  }
})

// 模拟数据 - 实际项目中应该从API获取
const mockData = {
  // 月度营业额
  monthlyRevenue: [
    { month: '1月', revenue: 12500 },
    { month: '2月', revenue: 14200 },
    { month: '3月', revenue: 15800 },
    { month: '4月', revenue: 16500 },
    { month: '5月', revenue: 18200 },
    { month: '6月', revenue: 22500 },
    { month: '7月', revenue: 25800 },
    { month: '8月', revenue: 23500 },
    { month: '9月', revenue: 21200 },
    { month: '10月', revenue: 19800 },
    { month: '11月', revenue: 24500 },
    { month: '12月', revenue: 28500 }
  ],
  // 商品类别销售占比
  categorySales: [
    { name: '新鲜水果', value: 45 },
    { name: '进口水果', value: 25 },
    { name: '有机水果', value: 15 },
    { name: '礼盒装', value: 10 },
    { name: '其他', value: 5 }
  ],
  // 每周销售趋势
  weeklyTrend: [
    { day: '周一', sales: 1250, orders: 25 },
    { day: '周二', sales: 1420, orders: 28 },
    { day: '周三', sales: 1580, orders: 32 },
    { day: '周四', sales: 1650, orders: 33 },
    { day: '周五', sales: 1820, orders: 36 },
    { day: '周六', sales: 2250, orders: 45 },
    { day: '周日', sales: 1980, orders: 40 }
  ]
}

// 初始化营业额图表
const initRevenueChart = () => {
  if (revenueChart) {
    revenueChart.dispose()
  }
  
  revenueChart = echarts.init(revenueChartRef.value)
  
  const option = {
    title: {
      text: '月度营业额统计',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: ¥{c}'
    },
    xAxis: {
      type: 'category',
      data: mockData.monthlyRevenue.map(item => item.month)
    },
    yAxis: {
      type: 'value',
      name: '营业额 (元)'
    },
    series: [
      {
        data: mockData.monthlyRevenue.map(item => item.revenue),
        type: 'bar',
        barWidth: '40%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: '#83bff6'
              },
              {
                offset: 1,
                color: '#188df0'
              }
            ]
          }
        }
      }
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    }
  }
  
  revenueChart.setOption(option)
}

// 初始化类别销售图表
const initCategoryChart = () => {
  if (categoryChart) {
    categoryChart.dispose()
  }
  
  categoryChart = echarts.init(categoryChartRef.value)
  
  const option = {
    title: {
      text: '商品类别销售占比',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle'
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: mockData.categorySales
      }
    ]
  }
  
  categoryChart.setOption(option)
}

// 初始化销售趋势图表
const initTrendChart = () => {
  if (trendChart) {
    trendChart.dispose()
  }
  
  trendChart = echarts.init(trendChartRef.value)
  
  const option = {
    title: {
      text: '每周销售趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['销售额', '订单数'],
      top: 'bottom'
    },
    xAxis: {
      type: 'category',
      data: mockData.weeklyTrend.map(item => item.day)
    },
    yAxis: [
      {
        type: 'value',
        name: '销售额',
        position: 'left',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#ff6b6b'
          }
        },
        axisLabel: {
          formatter: '{value} 元'
        }
      },
      {
        type: 'value',
        name: '订单数',
        position: 'right',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#5470c6'
          }
        },
        axisLabel: {
          formatter: '{value} 单'
        }
      }
    ],
    series: [
      {
        name: '销售额',
        type: 'line',
        smooth: true,
        data: mockData.weeklyTrend.map(item => item.sales),
        itemStyle: {
          color: '#ff6b6b'
        }
      },
      {
        name: '订单数',
        type: 'bar',
        yAxisIndex: 1,
        data: mockData.weeklyTrend.map(item => item.orders),
        itemStyle: {
          color: '#5470c6'
        }
      }
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    }
  }
  
  trendChart.setOption(option)
}

// 处理窗口大小变化
const handleResize = () => {
  revenueChart && revenueChart.resize()
  categoryChart && categoryChart.resize()
  trendChart && trendChart.resize()
}

// 切换时间范围
const changeTimeRange = (range) => {
  timeRange.value = range
  // 实际项目中应该重新加载数据
}

// 加载数据并初始化图表
onMounted(() => {
  // 初始化图表
  initRevenueChart()
  initCategoryChart()
  initTrendChart()
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})
</script>

<template>
  <div class="sales-analytics-container">
    <div class="page-header">
      <h1>营业额统计</h1>
      <div class="time-filter">
        <el-radio-group v-model="timeRange" size="small" @change="changeTimeRange">
          <el-radio-button label="today">今日</el-radio-button>
          <el-radio-button label="week">本周</el-radio-button>
          <el-radio-button label="month">本月</el-radio-button>
          <el-radio-button label="year">全年</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    
    <!-- 数据概览卡片 -->
    <div class="overview-cards">
      <el-card class="overview-card">
        <template #header>
          <div class="card-header">
            <span>总营业额</span>
            <el-tag type="success" effect="plain" size="small">+15%</el-tag>
          </div>
        </template>
        <div class="card-value">¥{{ currentStats.totalSales.toLocaleString() }}</div>
        <div class="card-footer">较上期增长 15%</div>
      </el-card>
      
      <el-card class="overview-card">
        <template #header>
          <div class="card-header">
            <span>订单总数</span>
            <el-tag type="success" effect="plain" size="small">+8%</el-tag>
          </div>
        </template>
        <div class="card-value">{{ currentStats.orderCount.toLocaleString() }}</div>
        <div class="card-footer">较上期增长 8%</div>
      </el-card>
      
      <el-card class="overview-card">
        <template #header>
          <div class="card-header">
            <span>客单价</span>
            <el-tag type="success" effect="plain" size="small">+5%</el-tag>
          </div>
        </template>
        <div class="card-value">¥{{ (currentStats.totalSales / (currentStats.orderCount || 1)).toFixed(2) }}</div>
        <div class="card-footer">较上期增长 5%</div>
      </el-card>
      
      <el-card class="overview-card">
        <template #header>
          <div class="card-header">
            <span>客户数</span>
            <el-tag type="success" effect="plain" size="small">+12%</el-tag>
          </div>
        </template>
        <div class="card-value">{{ currentStats.customerCount || 0 }}</div>
        <div class="card-footer">较上期增长 12%</div>
      </el-card>
    </div>
    
    <!-- 图表区域 -->
    <div class="charts-container">
      <el-row :gutter="20">
        <el-col :span="24">
          <el-card class="chart-card">
            <div ref="revenueChartRef" class="chart"></div>
          </el-card>
        </el-col>
      </el-row>
      
      <el-row :gutter="20" class="chart-row">
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <el-card class="chart-card">
            <div ref="categoryChartRef" class="chart"></div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <el-card class="chart-card">
            <div ref="trendChartRef" class="chart"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>
    
    <!-- 热销商品表格 -->
    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>热销商品排行</span>
          <el-button type="primary" size="small" text>查看更多</el-button>
        </div>
      </template>
      
      <el-table :data="[
        { rank: 1, name: '红富士苹果', category: '新鲜水果', sales: 12500, count: 250 },
        { rank: 2, name: '泰国山竹', category: '进口水果', sales: 9800, count: 196 },
        { rank: 3, name: '智利车厘子', category: '进口水果', sales: 8500, count: 170 },
        { rank: 4, name: '海南香蕉', category: '新鲜水果', sales: 7200, count: 360 },
        { rank: 5, name: '新疆哈密瓜', category: '新鲜水果', sales: 6800, count: 136 }
      ]" style="width: 100%">
        <el-table-column prop="rank" label="排名" width="80">
          <template #default="{ row }">
            <el-tag 
              :type="row.rank <= 3 ? ['', 'danger', 'warning', 'success'][row.rank] : 'info'"
              effect="plain"
            >
              {{ row.rank }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" />
        <el-table-column prop="category" label="分类" />
        <el-table-column prop="sales" label="销售额" sortable>
          <template #default="{ row }">
            ¥{{ row.sales.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="count" label="销售量" sortable>
          <template #default="{ row }">
            {{ row.count }} 件
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.sales-analytics-container {
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

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.overview-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1rem;
    color: #606266;
  }
  
  .card-value {
    font-size: 2rem;
    font-weight: 600;
    color: #303133;
    margin: 15px 0;
  }
  
  .card-footer {
    font-size: 0.9rem;
    color: #67c23a;
  }
}

.charts-container {
  margin-bottom: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.chart {
  height: 400px;
}

.chart-row {
  margin-top: 20px;
}

.table-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

@media (max-width: 768px) {
  .overview-cards {
    grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
  }
  
  .chart {
    height: 300px;
  }
}
</style>