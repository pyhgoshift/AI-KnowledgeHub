import { ref } from 'vue'
import { defineStore } from 'pinia'
import { theme } from 'ant-design-vue'

export const useThemeStore = defineStore('theme', () => {
  // 从 localStorage 读取保存的主题，默认为浅色
  const isDark = ref(localStorage.getItem('theme') === 'dark')

  // 公共主题配置
  const commonTheme = {
    token: {
      fontFamily:
        "'Inter Tight', 'Pretendard', 'Noto Sans KR', 'Segoe UI', sans-serif",
      colorPrimary: '#010120',
      colorInfo: '#7775a8',
      colorLink: 'var(--main-color)',
      colorLinkHover: '#545285',
      colorLinkActive: '#302f63',
      colorBorder: '#d6d6d6',
      borderRadius: 4,
      boxShadow: 'none',
      boxShadowSecondary: 'none',
      wireframe: false
    }
  }

  // 浅色主题配置
  const lightTheme = {
    ...commonTheme
  }

  // 深色主题配置
  const darkTheme = {
    ...commonTheme,
    algorithm: theme.darkAlgorithm
  }

  // 当前主题配置
  const currentTheme = ref(isDark.value ? darkTheme : lightTheme)

  // 切换主题
  function toggleTheme() {
    setTheme(!isDark.value)
  }

  // 设置主题
  function setTheme(dark) {
    isDark.value = dark
    currentTheme.value = dark ? darkTheme : lightTheme
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    updateDocumentTheme()
  }

  // 更新 document 的主题类
  function updateDocumentTheme() {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // 初始化时设置主题
  updateDocumentTheme()

  return {
    isDark,
    currentTheme,
    toggleTheme,
    setTheme
  }
})
