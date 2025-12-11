<script>
import CommerceLogo from '../CommerceLogo.vue';
import ComponentMenu from '../ComponentMenu.vue';

export default {
  name: 'DesktopPageHeader',
  components: {
    CommerceLogo,
    ComponentMenu,
  },
  props: {
    logo: { type: String, default: undefined },
    loading: { type: Boolean, default: false },
    title: { type: String, default: '' },
    toggles: { type: Object, default: {} },
    componentName: { type: String, default: '' },
    showBack: { type: Boolean, default: true },
  },
  methods: {
    goBack() {
      this.$emit('go-back');
    },
  },
};
</script>

<template>
  <div class="desktop-page-header">
    <div class="row align-items-center mb-1 desktop-header-row">
      <div class="col-auto desktop-logo-wrapper">
        <CommerceLogo :src="logo" :loading="loading"></CommerceLogo>
      </div>
      <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
        <ComponentMenu
          :title="title"
          :toggles="toggles"
          :component-name="componentName"
          @go-back="goBack"
        ></ComponentMenu>
      </div>
    </div>
  </div>
</template>

<style scoped>
.desktop-page-header {
  margin-bottom: 1rem;
}

.desktop-header-row {
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0.5rem 0;
  justify-content: flex-start;
}

.desktop-logo-wrapper {
  padding-right: 1rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.desktop-logo-wrapper :deep(#commerce-logo) {
  max-width: 150px;
}

.desktop-logo-wrapper :deep(.logo) {
  max-width: 120px;
  max-height: 100px;
  width: auto;
  height: auto;
  margin-bottom: 0;
}

.desktop-menu-wrapper {
  flex: 1 1 0%;
  min-width: 0;
  width: auto;
}
</style>
