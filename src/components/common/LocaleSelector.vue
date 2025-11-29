<script>
export default {
  name: 'LocaleSelector',
  data() {
    return {
      countries: [
        { name: 'es', logo: '🇪🇸' },
        { name: 'en', logo: '🇺🇸' },
        { name: 'pt', logo: '🇧🇷' },
      ],
      locale: 'es',
      userLocale: typeof window !== 'undefined' ? window.navigator.language : 'es',
    };
  },
  watch: {
    '$i18n.locale'(newLocale) {
      if (newLocale && newLocale !== this.locale) {
        this.locale = newLocale;
      }
    },
  },
  methods: {
    selectCountry(locale) {
      if (locale) {
        this.locale = locale;
        this.$i18n.locale = locale;
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('preferredLocale', locale);
        }
        this.defaultTitle();
      }
    },
    defaultLocale() {
      // Check if user has a saved preference
      if (typeof window !== 'undefined') {
        const savedLocale = localStorage.getItem('preferredLocale');
        if (savedLocale && this.$i18n.availableLocales.includes(savedLocale)) {
          this.$i18n.locale = savedLocale;
          this.locale = savedLocale;
          return;
        }
      }

      // Otherwise, use browser locale or default
      const availibleLocales = this.$i18n.availableLocales;
      let userLocaleByDefault = 'es';
      if (this.userLocale !== undefined) {
        [userLocaleByDefault] = this.userLocale.split('-');
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
    },
  },
  mounted() {
    // Sync with current i18n locale
    if (this.$i18n.locale) {
      this.locale = this.$i18n.locale;
    }
    this.defaultLocale();
    this.defaultTitle();
  },
  async beforeMount() {
    // Initialize locale from localStorage if available
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('preferredLocale');
      if (savedLocale && this.$i18n.availableLocales.includes(savedLocale)) {
        this.locale = savedLocale;
        this.$i18n.locale = savedLocale;
      } else if (this.$i18n.locale) {
        // If no saved locale, use current i18n locale
        this.locale = this.$i18n.locale;
      }
    }
  },
};
</script>

<template>
  <div>
    <select
      class="btn-md btn-light text-dark px-1"
      v-model="locale"
      id="locale"
      @change="selectCountry(locale)"
    >
      <option v-for="locale in countries" :key="locale.name" :value="locale.name">
        {{ locale.logo }}
      </option>
    </select>
  </div>
</template>

<style scoped>
label,
select {
  color: var(--color-text);
}
select {
  height: 2.5rem;
  min-width: 70px;
  border-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
}
</style>
