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
        list.push(
          `${toggle[1] === true ? '✅ ' : toggle[1] === false ? '❌ ' : toggle[1] + ': '} ${this.$t(
            `${this.componentName}.capacitiesList.${toggle[0]}`
          )}`
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
  <div>
    <Popper class="dark" arrow>
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
.what-do-title {
  text-decoration: underline;
}
</style>
