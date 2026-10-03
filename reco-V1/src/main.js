import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import ui from '@nuxt/ui/vue-plugin'
import './assets/main.css'
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ui)

document.documentElement.classList.add('dark')
localStorage.setItem('vueuse-color-scheme', 'dark')
app.mount('#app')
