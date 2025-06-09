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
          message: contactForm.value.message,
          problem: contactForm.value.subject
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

// 复制联系方式 - 兼容HTTP和HTTPS环境
const copyToClipboard = async (text, type) => {
  try {
    // 优先使用现代 Clipboard API（需要HTTPS或localhost环境）
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      ElMessage.success(`${type}已复制到剪贴板`)
    } else {
      // 降级方案：使用传统的 document.execCommand（兼容HTTP环境）
      const textArea = document.createElement('textarea')
      textArea.value = text
      // 设置样式使其不可见但仍可操作
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      textArea.style.top = '-9999px'
      textArea.style.opacity = '0'
      textArea.style.pointerEvents = 'none'
      textArea.style.tabIndex = '-1'
      
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        if (successful) {
          ElMessage.success(`${type}已复制到剪贴板`)
        } else {
          throw new Error('复制命令执行失败')
        }
      } catch (execErr) {
        console.warn('execCommand复制失败:', execErr)
        ElMessage.error('复制失败，请手动复制')
      } finally {
        // 清理临时元素
        document.body.removeChild(textArea)
      }
    }
  } catch (err) {
    console.error('复制功能异常:', err)
    ElMessage.error('复制失败，请手动复制')
  }
}

// 打开GitHub链接
const openGitHub = () => {
  window.open('https://github.com/wangxiansenya15/FruitMall-Frontend', '_blank')
}
</script>

<template>
  <div class="contact-us-page">
    <div class="container">
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
              <img src="/images/16c863604a4bd6fed468918a65a6fec.jpg" alt="作者头像" class="author-image" />
            </div>
            <div class="author-info">
              <h3>ArthurWang</h3>
              <p class="title">全栈开发工程师 Java开发者</p>
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
              <!-- 使用真实的微信二维码图片 -->
              <img 
                src="/images/Wechat_QR_Code.jpg" 
                alt="微信二维码" 
                class="qr-image"
              />
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
            
            <div class="contact-item" @click="openGitHub">
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
  </div>
</template>

<style lang="scss" scoped>
.contact-us-page {
  min-height: 100vh;
  height: 100%; /* 确保高度覆盖整个容器 */
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  background-size: cover; /* 使用cover确保背景覆盖整个元素，不留空白 */
  background-position: center center; /* 背景居中显示 */
  background-repeat: no-repeat; /* 防止背景重复 */
  background-attachment: fixed; /* 固定背景，在滚动时保持不动 */
  padding: 40px 20px;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden; /* 防止水平溢出 */
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
  
  h1 {
    font-size: 2.5rem;
    color: #2c3e50;
    margin-bottom: 10px;
    font-weight: 700;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .subtitle {
    font-size: 1.1rem;
    color: #5a6c7d;
    margin: 0;
    font-weight: 500;
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
    
    .author-image {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #f0f0f0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
      
      &:hover {
        transform: scale(1.05);
      }
    }
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
    
    .qr-image {
      width: 150px;
      height: 150px;
      border-radius: 10px;
      object-fit: cover;
      border: 2px solid #f0f0f0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
      
      &:hover {
        transform: scale(1.05);
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
  .contact-us-page {
    padding: 20px 20px;
    max-width: 100%;
  }
  
  .contact-container {
    grid-template-columns: 1fr;
    gap: 25px;
    max-width: 100%;
  }
  
  .page-header {
    margin-bottom: 30px;
    
    h1 {
      font-size: 2.2rem;
    }
    
    .subtitle {
      font-size: 1.1rem;
    }
  }
}

@media (max-width: 768px) {
  .contact-us-page {
    padding: 20px 16px;
    max-width: 100%;
    min-height: 100vh;
    height: auto;
    background-attachment: scroll; /* 在移动设备上使用滚动背景 */
  }
  
  .container {
    padding: 16px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .page-header {
    margin-bottom: 25px;
    text-align: center;
    
    h1 {
      font-size: 2rem;
      margin-bottom: 8px;
    }
    
    .subtitle {
      font-size: 1rem;
    }
  }
  
  .contact-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 100%;
    width: 100%;
    box-sizing: border-box;
  }
  
  .contact-info, .contact-form {
    width: 100%;
    box-sizing: border-box;
  }

  .author-card, .qr-code-card, .project-info, .message-form {
    padding: 20px 16px;
    border-radius: 12px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    margin: 0 auto 15px;
  }
  
  .author-card {
    .author-header {
      flex-direction: column;
      text-align: center;
      gap: 15px;
      
      .author-avatar {
        margin: 0 auto;
      }
      
      .author-info {
        text-align: center;
        
        .author-name {
          font-size: 1.3rem;
        }
        
        .author-title {
          font-size: 1rem;
        }
        
        .author-description {
          font-size: 0.95rem;
          margin-top: 8px;
        }
      }
    }
  }
  
  .contact-methods {
    gap: 12px;
  }
  
  .contact-item {
    padding: 15px 12px;
    
    .contact-icon {
      width: 35px;
      height: 35px;
      
      .el-icon {
        font-size: 1rem;
      }
    }
    
    .contact-content {
      .label {
        font-size: 0.8rem;
      }
      
      .value {
        font-size: 0.95rem;
      }
    }
  }
  
  .qr-code-card {
    .qr-code {
      width: 140px;
      height: 140px;
    }
    
    .qr-description {
      font-size: 0.9rem;
    }
  }
  
  .project-info {
    .tech-stack, .project-features {
      margin-bottom: 20px;
      
      h4 {
        font-size: 1rem;
        margin-bottom: 12px;
      }
    }
    
    .tech-tags {
      gap: 6px;
      
      .el-tag {
        font-size: 0.8rem;
        padding: 4px 8px;
      }
    }
    
    .project-features ul {
      li {
        font-size: 0.9rem;
        line-height: 1.6;
      }
    }
  }
  
  .message-form {
    .el-form {
      .el-form-item {
        margin-bottom: 16px;
        
        .el-form-item__label {
          font-size: 0.95rem;
          padding-bottom: 6px;
        }
      }
      
      .el-input, .el-textarea {
        .el-input__inner, .el-textarea__inner {
          font-size: 0.95rem;
        }
      }
      
      .el-textarea {
        .el-textarea__inner {
          min-height: 100px;
        }
      }
      
      .form-actions {
        .el-button {
          width: 100%;
          height: 44px;
          font-size: 1rem;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .contact-us-page {
    padding: 16px 12px;
    max-width: 100%;
    min-height: 100vh;
    height: auto;
    overflow-x: hidden; /* 防止水平溢出 */
  }
  
  .container {
    padding: 12px;
    width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
  }
  
  .contact-container {
    width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .page-header {
    margin-bottom: 20px;
    
    h1 {
      font-size: 1.8rem;
      margin-bottom: 6px;
    }
    
    .subtitle {
      font-size: 0.95rem;
    }
  }
  
  .contact-container {
    gap: 15px;
    max-width: 100%;
  }
  
  .contact-info, .contact-form {
    width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
  }
  
  .author-card, .qr-code-card, .project-info, .message-form {
    padding: 16px 14px;
    border-radius: 10px;
    max-width: 100%;
    box-sizing: border-box;
    margin: 0 auto;
  }
  
  .author-card {
    .author-header {
      gap: 12px;
    }
    
    .author-avatar {
      margin-bottom: 15px;
      
      .author-image {
        width: 60px;
        height: 60px;
      }
      
      .author-info {
        .author-name {
          font-size: 1.2rem;
        }
        
        .author-title {
          font-size: 0.95rem;
        }
        
        .author-description {
          font-size: 0.9rem;
        }
      }
    }
  }
  
  .contact-methods {
    gap: 10px;
  }
  
  .contact-item {
    padding: 12px 10px;
    
    .contact-icon {
      width: 32px;
      height: 32px;
      
      .el-icon {
        font-size: 0.95rem;
      }
    }
    
    .contact-content {
      .label {
        font-size: 0.75rem;
      }
      
      .value {
        font-size: 0.9rem;
      }
    }
  }
  
  .qr-code-card {
    .qr-code {
      width: 120px;
      height: 120px;
    }
    
    .qr-description {
      font-size: 0.85rem;
    }
  }
  
  .project-info {
    .tech-stack, .project-features {
      margin-bottom: 15px;
      
      h4 {
        font-size: 0.95rem;
        margin-bottom: 10px;
      }
    }
    
    .tech-tags {
      gap: 5px;
      
      .el-tag {
        font-size: 0.75rem;
        padding: 3px 6px;
      }
    }
    
    .project-features ul {
      li {
        font-size: 0.85rem;
        line-height: 1.5;
      }
    }
  }
  
  .message-form {
    .el-form {
      .el-form-item {
        margin-bottom: 14px;
        
        .el-form-item__label {
          font-size: 0.9rem;
        }
      }
      
      .el-input, .el-textarea {
        .el-input__inner, .el-textarea__inner {
          font-size: 0.9rem;
          padding: 10px 12px;
        }
      }
      
      .el-input {
        .el-input__inner {
          height: 42px;
        }
      }
      
      .el-textarea {
        .el-textarea__inner {
          min-height: 90px;
        }
      }
      
      .form-actions {
        .el-button {
          height: 42px;
          font-size: 0.95rem;
          border-radius: 6px;
        }
      }
    }
  }
}

/* 超小屏幕适配 (iPhone SE等) */
@media (max-width: 375px) {
  .contact-us-page {
    padding: 14px 10px;
    max-width: 100%;
    min-height: 100vh;
    height: auto;
    background-size: cover;
    background-position: center top; /* 在小屏幕上从顶部开始显示背景 */
    overflow-x: hidden; /* 防止水平溢出 */
  }
  
  .container {
    padding: 10px;
    width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
  }
  
  .contact-container {
    width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
  }
  
  .page-header {
    h1 {
      font-size: 1.6rem;
    }
    
    .subtitle {
      font-size: 0.9rem;
    }
  }
  
  .contact-info, .contact-form {
    width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .author-card, .qr-code-card, .project-info, .message-form {
    padding: 14px 12px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    margin: 0 auto 12px;
    overflow: hidden;
  }
  
  .author-card {

    
    .author-avatar {
      margin-bottom: 12px;
      
      .author-image {
        width: 55px;
        height: 55px;
      }
      
      .author-info {
        .author-name {
          font-size: 1.1rem;
        }
        
        .author-title {
          font-size: 0.9rem;
        }
      }
    }
  }
  
  .contact-item {
    padding: 10px 8px;
    
    .contact-icon {
      width: 30px;
      height: 30px;
    }
    
    .contact-content {
      .value {
        font-size: 0.85rem;
      }
    }
  }
  
  .qr-code-card {
    .qr-code {
      width: 100px;
      height: 100px;
    }
  }
  
  .message-form {
    .el-form {
      .el-input {
        .el-input__inner {
          height: 40px;
          font-size: 0.85rem;
        }
      }
      
      .el-textarea {
        .el-textarea__inner {
          min-height: 80px;
          font-size: 0.85rem;
        }
      }
      
      .form-actions {
        .el-button {
          height: 40px;
          font-size: 0.9rem;
        }
      }
    }
  }
}
</style>