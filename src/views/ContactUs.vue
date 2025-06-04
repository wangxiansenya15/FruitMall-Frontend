<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/services/api'

// 联系表单数据
const contactForm = ref({
  username: '',
  email: '',
  subject: '',
  message: ''
})

// 表单验证规则
const rules = {
  username: [
    { required: true, message: '请输入您的用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度应为2-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  subject: [
    { required: true, message: '请输入问题反馈', trigger: 'blur' }
  ],
  message: [
    { required: true, message: '请输入留言内容', trigger: 'blur' },
    { min: 3, message: '留言内容至少10个字符', trigger: 'blur' }
  ]
}

// 表单引用
const formRef = ref(null)
const isSubmitting = ref(false)

// 提交表单
const submitForm = () => {
  if (!formRef.value) return
  
  formRef.value.validate(async (valid) => {
    if (valid) {
      isSubmitting.value = true
      
      try {
        // 调用后端API提交留言
        await api.post('/msg/contact', {
          username: contactForm.value.username,
          email: contactForm.value.email,
          subject: contactForm.value.subject,
          message: contactForm.value.message,
          submitTime: new Date().toISOString()
        })
        
        ElMessage.success('留言提交成功！我们会尽快回复您。')
        resetForm()
      } catch (error) {
        console.error('提交留言失败:', error)
        ElMessage.error(error.message || '提交失败，请稍后重试')
      } finally {
        isSubmitting.value = false
      }
    }
  })
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 复制联系方式
const copyToClipboard = async (text, type) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${type}已复制到剪贴板`)
  } catch (err) {
    ElMessage.error('复制失败，请手动复制')
  }
}
</script>

<template>
  <div class="contact-us-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>联系我们</h1>
      <p class="subtitle">有任何问题或建议，欢迎与我们联系</p>
    </div>

    <div class="contact-container">
      <!-- 左侧：联系信息 -->
      <div class="contact-info">
        <div class="info-section">
          <div class="section-header">
            <el-icon><User /></el-icon>
            <h2>项目作者</h2>
          </div>
          
          <div class="author-card">
            <div class="author-avatar">
              <el-avatar :size="80" icon="UserFilled" />
            </div>
            <div class="author-info">
              <h3>ArthurWang</h3>
              <p class="title">全栈开发工程师</p>
              <p class="description">专注于现代Web技术栈，热爱开源项目</p>
            </div>
          </div>
        </div>

        <!-- 微信二维码 -->
        <div class="info-section">
          <div class="section-header">
            <el-icon><ChatDotRound /></el-icon>
            <h2>微信联系</h2>
          </div>
          
          <div class="qr-code-card">
            <div class="qr-code">
              <!-- 这里放置微信二维码图片 -->
              <div class="qr-placeholder">
                <el-icon><QrCode /></el-icon>
                <p>微信二维码</p>
                <small>扫码添加微信好友</small>
              </div>
            </div>
            <div class="qr-info">
              <p><strong>微信号：</strong> wjbazj2021</p>
              <el-button 
                size="small" 
                type="primary" 
                @click="copyToClipboard('wjbazj2021', '微信号')"
              >
                复制微信号
              </el-button>
            </div>
          </div>
        </div>

        <!-- 其他联系方式 -->
        <div class="info-section">
          <div class="section-header">
            <el-icon><Message /></el-icon>
            <h2>其他联系方式</h2>
          </div>
          
          <div class="contact-methods">
            <div class="contact-item" @click="copyToClipboard('arthur.wang@example.com', '邮箱地址')">
              <div class="contact-icon">
                <el-icon><Message /></el-icon>
              </div>
              <div class="contact-content">
                <span class="label">邮箱</span>
                <span class="value">2958367950@qq.com</span>
              </div>
              <el-icon class="copy-icon"><CopyDocument /></el-icon>
            </div>
            
            <div class="contact-item">
              <div class="contact-icon">
                <el-icon><Link /></el-icon>
              </div>
              <div class="contact-content">
                <span class="label">GitHub</span>
                <span class="value">github.com/wangxiansenya15/FruitMall-Frontend</span>
              </div>
              <el-icon class="external-icon"><TopRight /></el-icon>
            </div>
            
            <div class="contact-item">
              <div class="contact-icon">
                <el-icon><Location /></el-icon>
              </div>
              <div class="contact-content">
                <span class="label">位置</span>
                <span class="value">广东·肇庆</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- 右侧：留言表单 -->
      <div class="contact-form">
        <div class="form-section">
          <div class="section-header">
            <el-icon><EditPen /></el-icon>
            <h2>在线留言</h2>
          </div>
          
          <el-form 
            ref="formRef"
            :model="contactForm" 
            :rules="rules" 
            label-width="80px"
            class="message-form"
          >
            <el-form-item label="用户名" prop="username">
              <el-input 
                v-model="contactForm.username" 
                placeholder="请输入您的用户名"
                size="large"
              />
            </el-form-item>
            
            <el-form-item label="邮箱" prop="email">
              <el-input 
                v-model="contactForm.email" 
                placeholder="请输入您的邮箱地址"
                size="large"
              />
            </el-form-item>
            
            <el-form-item label="问题反馈" prop="subject">
              <el-input 
                v-model="contactForm.subject" 
                placeholder="请输入问题反馈内容"
                size="large"
              />
            </el-form-item>
            
            <el-form-item label="留言" prop="message">
              <el-input 
                v-model="contactForm.message" 
                type="textarea" 
                :rows="6"
                placeholder="请输入您的留言内容..."
                size="large"
              />
            </el-form-item>
            
            <el-form-item>
              <el-button 
                type="primary" 
                size="large" 
                @click="submitForm"
                :loading="isSubmitting"
                style="width: 100%;"
              >
                {{ isSubmitting ? '提交中...' : '发送留言' }}
              </el-button>
              <el-button 
                size="large" 
                @click="resetForm"
                style="width: 100%; margin-top: 10px;"
              >
                重置表单
              </el-button>
            </el-form-item>
          </el-form>
        </div>
        
        <!-- 项目说明 -->
        <div class="form-section">
          <div class="section-header">
            <el-icon><InfoFilled /></el-icon>
            <h2>项目说明</h2>
          </div>
          
          <div class="project-info">
            <div class="tech-stack">
              <h4>技术栈</h4>
              <div class="tech-tags">
                <el-tag type="success">Vue 3</el-tag>
                <el-tag type="primary">Element Plus</el-tag>
                <el-tag type="warning">Spring Boot</el-tag>
                <el-tag type="info">Spring Security</el-tag>
                <el-tag type="danger">MyBatis-Plus</el-tag>
                <el-tag type="info">MySQL</el-tag>
                <el-tag type="danger">Redis</el-tag>
              </div>
            </div>
            
            <div class="project-features">
              <h4>主要功能</h4>
              <ul>
                <li>用户注册登录系统</li>
                <li>商品浏览与搜索</li>
                <li>购物车管理</li>
                <li>订单处理流程</li>
                <li>管理员后台系统</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.contact-us-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
  
  h1 {
    font-size: 2.5rem;
    color: #333;
    margin-bottom: 10px;
    font-weight: 600;
  }
  
  .subtitle {
    font-size: 1.1rem;
    color: #666;
    margin: 0;
  }
}

.contact-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: start;
}

.info-section, .form-section {
  margin-bottom: 30px;
  
  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    
    .el-icon {
      font-size: 1.3rem;
      color: #3498db;
    }
    
    h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #333;
      font-weight: 600;
    }
  }
}

.author-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
  
  .author-avatar {
    text-align: center;
    margin-bottom: 20px;
  }
  
  .author-info {
    text-align: center;
    
    h3 {
      font-size: 1.5rem;
      color: #333;
      margin: 0 0 8px;
      font-weight: 600;
    }
    
    .title {
      font-size: 1rem;
      color: #3498db;
      margin: 0 0 10px;
      font-weight: 500;
    }
    
    .description {
      font-size: 0.9rem;
      color: #666;
      margin: 0;
      line-height: 1.5;
    }
  }
}

.qr-code-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
  text-align: center;
  
  .qr-code {
    margin-bottom: 20px;
    
    .qr-placeholder {
      width: 150px;
      height: 150px;
      background: #f8f9fa;
      border: 2px dashed #ddd;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      
      .el-icon {
        font-size: 3rem;
        color: #ccc;
        margin-bottom: 10px;
      }
      
      p {
        margin: 0 0 5px;
        font-weight: 600;
        color: #666;
      }
      
      small {
        color: #999;
        font-size: 0.8rem;
      }
    }
  }
  
  .qr-info {
    p {
      margin: 0 0 15px;
      color: #333;
    }
  }
}

.contact-methods {
  .contact-item {
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 15px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
    border: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    gap: 15px;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }
    
    .contact-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #3498db, #2980b9);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .el-icon {
        color: white;
        font-size: 1.1rem;
      }
    }
    
    .contact-content {
      flex: 1;
      
      .label {
        display: block;
        font-size: 0.85rem;
        color: #666;
        margin-bottom: 3px;
      }
      
      .value {
        display: block;
        font-size: 1rem;
        color: #333;
        font-weight: 500;
      }
    }
    
    .copy-icon, .external-icon {
      color: #999;
      font-size: 1rem;
    }
  }
}

.project-info {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
  
  .tech-stack, .project-features {
    margin-bottom: 25px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    h4 {
      font-size: 1.1rem;
      color: #333;
      margin: 0 0 15px;
      font-weight: 600;
    }
  }
  
  .tech-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .project-features ul {
    margin: 0;
    padding-left: 20px;
    
    li {
      color: #666;
      line-height: 1.8;
      font-size: 0.95rem;
    }
  }
}

.message-form {
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
}

/* 响应式设计 */
@media (max-width: 992px) {
  .contact-container {
    grid-template-columns: 1fr;
    gap: 30px;
  }
}

@media (max-width: 768px) {
  .contact-us-page {
    padding: 15px;
  }
  
  .page-header h1 {
    font-size: 2rem;
  }
  
  .author-card, .qr-code-card, .project-info, .message-form {
    padding: 20px;
  }
  
  .contact-item {
    padding: 15px;
  }
}
</style>