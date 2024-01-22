import Vue from 'vue';
import VueI18n from 'vue-i18n';

Vue.useAttrs(VueI18n);

let locale = 'sp';

const i18n = new VueI18n({
    locale,
    fallbackLocale: locale,
    messages: {}
});
export default i18n;