<script>
import { globalStore } from '../../stores/index';
import LogoSkeleton from '../../components/skeletons/LogoSkeleton.vue';

export default {
  name: 'CommerceLogo',
  components: { LogoSkeleton },
  props: {
    src: { type: String, default: undefined },
    loading: { type: Boolean, default: false },
  },
  data() {
    const store = globalStore();
    return {
      store,
    };
  },
};
</script>
<template>
  <div id="commerce-logo">
    <LogoSkeleton v-if="loading && src === undefined"></LogoSkeleton>
    <img
      v-else
      class="rounded img-fluid mx-auto logo"
      :alt="this.$t('logoAlt')"
      :src="src === undefined ? this.$t('hubLogoBlanco') : src"
      loading="lazy"
      width="250"
      height="230"
    />
  </div>
</template>
<style scoped>
.logo {
  display: flex;
  max-width: 250px;
  max-height: 230px;
  background-repeat: no-repeat;
  background-size: 100%;
  margin-bottom: 0.3rem;
  cursor: pointer;
}
@media (min-width: 1024px) {
  .logo {
    width: 600px;
    background-position: center;
  }
}
</style>
