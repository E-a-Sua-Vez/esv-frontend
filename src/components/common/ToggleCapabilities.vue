<script>
import Popper from 'vue3-popper';
import { useRouter } from 'vue-router';

export default {
  name: 'ToggleCapabilities',
  components: { Popper },
  props: {
    toggles: { type: Object, default: {} },
    componentName: { type: String, default: '' },
    amountUsed: { type: Number, default: 0 },
    showUpgrade: { type: Boolean, default: true },
  },
  data() {
    const router = useRouter();
    return {
      upgrade: false,
      router,
    };
  },
  methods: {
    getCapacities() {
      const list = [];
      Object.entries(this.toggles).forEach(toggle => {
        // Skip capabilities for client portal
        if (this.componentName && this.componentName.includes('clientPortal')) {
          return;
        }

        // If toggle key already starts with componentName, strip it to avoid duplication
        let toggleKey = toggle[0];
        if (this.componentName && toggleKey.startsWith(`${this.componentName}.`)) {
          toggleKey = toggleKey.substring(this.componentName.length + 1);
        }

        const translationKey = `${this.componentName}.capacitiesList.${toggleKey}`;
        list.push(
          `${toggle[1] === true ? '✅ ' : toggle[1] === false ? '❌ ' : toggle[1] + ': '} ${this.$t(
            translationKey
          )}`,
        );
        if ((toggle[1] === false || this.amountUsed >= toggle[1]) && this.upgrade === false) {
          this.upgrade = true;
        }
      });
      return list;
    },
    goToAdmin() {
      this.router.push({ path: '/interno/negocio/your-plan' });
    },
  },
};
</script>

<template>
  <div class="toggle-capabilities-wrapper">
    <Popper class="dark" arrow disable-click-away>
      <span class="what-do-title">{{ $t('capacities') }}</span>
      <template #content>
        <div>
          <div v-for="cap in getCapacities()" :key="cap.id">
            <span class="centered d-flex justify-content-start">{{ cap }}</span>
          </div>
          <div v-if="upgrade && showUpgrade" class="mt-2">
            <div class="centered fw-bold">
              <span>{{ $t('enableAll') }}</span>
            </div>
            <div><span class="upgrade fw-bold" @click="goToAdmin()">UPGRADE</span></div>
          </div>
        </div>
      </template>
    </Popper>
  </div>
</template>

<style scoped>
.toggle-capabilities-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.what-do-title {
  text-decoration: underline;
  cursor: pointer;
}
</style>
