<script>
import ToggleCapabilities from './ToggleCapabilities.vue';
import { globalStore } from '../../stores';

export default {
  name: 'ComponentMenu',
  components: { ToggleCapabilities },
  props: {
    title: { type: String, default: '' },
    toggles: { type: Object, default: {} },
    componentName: { type: String, default: '' },
  },
  data() {
    const store = globalStore();
    return {
      store
    }
  },
  methods: {
    returnBack() {
      this.$emit('goBack');
    },
    async goInit() {
      const userType = await this.store.getCurrentUserType;
      if (userType) {
        if (userType === 'collaborator') {
          this.$router.push({ path: '/interno/colaborador/menu' })
        } else if (userType === 'business') {
          this.$router.push({ path: '/interno/negocio/menu' })
        } else if (userType === 'master') {
          this.$router.push({ path: '/interno/master/menu' })
        }
      }
    }
  }
}
</script>

<template>
  <div>
    <div class="row title-content mb-2">
      <div class="col-5 lefted">
        <button class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2"
          @click="goInit()">
           <i class="bi bi-house"></i>
        </button>
        <button class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2"
          @click="returnBack()">
          {{ $t("dashboard.return") }} <i class="bi bi-arrow-left"></i>
        </button>
      </div>
      <div class="col-7">
        <div class="centered">
          <span class="welcome-title">{{ title }}</span>
        </div>
        <div class="toggle-title">
          <ToggleCapabilities
            :toggles="toggles"
            :componentName="componentName"
          ></ToggleCapabilities>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.title-content {
  border-radius: 10rem;
  border: .5px solid var(--gris-clear);
  background-color:var(--gris-clear);
}
.welcome-title {
  padding: .5rem;
  font-size: 1.15rem;
  line-height: 1.2rem;
  font-weight: 700;
}
.toggle-title {
  line-height: 1rem;
  padding-bottom: .5rem;
  padding-top: 0rem !important;
}
</style>