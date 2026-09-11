import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { loadNames, refresh } from './store/board'

loadNames()
void refresh()

createApp(App).mount('#app')
