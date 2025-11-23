import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import { createPinia } from 'pinia';
import vue3StarRatings from 'vue3-star-ratings';
import VCalendar from 'v-calendar';
import App from './App.vue';
import router from './router';
import es from './locales/es.json';
import en from './locales/en.json';
import pt from './locales/pt.json';

import 'v-calendar/style.css';

import './assets/main.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'es',
  fallbackLocale: 'es',
  availableLocales: ['es', 'en', 'pt'],
  messages: {
    es,
    en,
    pt,
  },
});

const app = createApp(App);

app.use(VCalendar, {});
app.component('vue3-star-ratings', vue3StarRatings);
app.use(createPinia());
app.use(router);
app.use(i18n);
app.mount('#app');
