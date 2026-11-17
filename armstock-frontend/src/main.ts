import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import App from './App.vue';
import router from './router';
import i18n from './i18n';
import { useAuthStore } from './stores/auth';
import 'element-plus/dist/index.css';
import './index.css';

const app = createApp(App);

app.use(createPinia());
app.use(i18n);

// The session must be restored before the router's first guard runs.
useAuthStore().init().finally(() => {
  app.use(router);
  app.use(ElementPlus);
  app.mount('#root');

  // Hides the loading overlay.
  document.body.classList.remove('loading');
});
