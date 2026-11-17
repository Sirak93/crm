import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import App from './App.vue';
import router from './router';
import i18n from './i18n';
import 'element-plus/dist/index.css';
import './index.css';

const app = createApp(App);

app.use(createPinia());
app.use(i18n);
app.use(router);
app.use(ElementPlus);
app.mount('#root');

// Hides the loading overlay.
document.body.classList.remove('loading');
