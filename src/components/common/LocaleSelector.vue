<script>

export default {
  name: 'LocaleSelector',
  data() {
    return {
      countries: [
        { name: 'es', logo: '🇪🇸' },
        { name: 'en', logo: '🇺🇸' },
        { name: 'pt', logo: '🇧🇷' }
      ],
      locale: this.$i18n.locale,
      userLocale: window.navigator.language
    }
  },
  methods: {
    selectCountry(locale) {
      if (locale) {
        this.locale = locale;
        this.$i18n.locale = locale;
        this.defaultTitle();
      }
    },
    defaultLocale() {
      const availibleLocales = this.$i18n.availableLocales;
      let userLocaleByDefault = 'es';
      if (this.userLocale !== undefined) {
        [ userLocaleByDefault ] = this.userLocale.split('-');
      }
      if (availibleLocales.includes(userLocaleByDefault)) {
        this.$i18n.locale = userLocaleByDefault;
        this.locale = userLocaleByDefault;
      } else {
        this.locale = 'es';
        this.$i18n.locale = 'es';
      }
    },
    defaultTitle() {
      if (this.locale) {
        document.title = this.$t('homeTitle');
      }
    }
  },
  async beforeMount() {
    this.defaultLocale();
    this.defaultTitle();
  }
}
</script>

<template>
  <div>
    <select class="btn-md btn-light text-dark px-1" v-model="locale" id="locale" @change="selectCountry(locale)">
      <option v-for="locale in countries" :key="locale.name" :value="locale.name">{{ locale.logo }}</option>
    </select>
  </div>
</template>

<style scoped>
  label, select {
    color: var(--color-text);
    width: 100%;
    cursor: pointer;
  }
  select {
    height: 2.5rem;
    border-color: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
  }
</style>