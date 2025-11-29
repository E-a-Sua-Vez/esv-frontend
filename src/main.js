import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import { createPinia } from 'pinia';
import vue3StarRatings from 'vue3-star-ratings';
import VCalendar from 'v-calendar';
import VueGtag from 'vue-gtag';
import App from './App.vue';
import router from './router';
import es from './locales/es.json';
import en from './locales/en.json';
import pt from './locales/pt.json';

import 'v-calendar/style.css';

import './assets/main.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';

// Get saved locale preference or use default
const savedLocale = localStorage.getItem('preferredLocale');
const defaultLocale = savedLocale && ['es', 'en', 'pt'].includes(savedLocale) ? savedLocale : 'es';

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: defaultLocale,
  fallbackLocale: 'es',
  availableLocales: ['es', 'en', 'pt'],
  messages: {
    es,
    en,
    pt,
  },
});

const app = createApp(App);

// Google Analytics configuration
const vueGtagId = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-00G9EWMVN3';

app.use(VCalendar, {});
app.component('vue3-star-ratings', vue3StarRatings);
app.use(createPinia());
app.use(router);
app.use(i18n);
app.use(VueGtag, {
  config: {
    id: vueGtagId,
  },
  router,
});
app.mount('#app');
