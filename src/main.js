import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'
import { useThemeStore } from './stores/theme.js'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// 初始化主题
const theme = useThemeStore(pinia)
theme.init()

app.mount('#app')
