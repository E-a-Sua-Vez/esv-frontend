<script>
import { computed } from 'vue';
import { globalStore } from '../../stores';
import ToggleCapabilities from './ToggleCapabilities.vue';

export default {
  name: 'WelcomeMenu',
  components: { ToggleCapabilities },
  props: {
    name: { type: String, default: undefined },
    toggles: { type: Object, default: undefined },
    componentName: { type: String, default: undefined },
  },
  setup() {
    const store = globalStore();
    const currentCommerce = computed(() => store.getCurrentCommerce);
    const currentModule = computed(() => store.getCurrentModule);
    const currentUserType = computed(() => store.getCurrentUserType);
    const currentBusiness = computed(() => store.getCurrentBusiness);

    // Show commerce info for business users, master users with a business selected, or collaborators
    const shouldShowCommerce = computed(() => {
      if (!currentCommerce.value) return false;
      const userType = currentUserType.value;
      return (
        userType === 'business' ||
        (userType === 'master' && currentBusiness.value) ||
        userType === 'collaborator'
      );
    });

    // Show module info for collaborators
    const shouldShowModule = computed(() => {
      if (!currentModule.value || !currentModule.value.id) return false;
      return currentUserType.value === 'collaborator';
    });

    return {
      currentCommerce,
      currentModule,
      shouldShowCommerce,
      shouldShowModule,
    };
  },
};
</script>

<template>
  <div>
    <div class="row title-content mb-2 mx-2">
      <div class="col-12">
        <div class="centered">
          <div class="welcome">
            <div id="welcome">
              <span v-if="!name" class="welcome-title">{{ $t('collaboratorMenu.welcome') }}</span>
              <span v-else class="welcome-title"
                >{{ $t('collaboratorMenu.welcome-user') }}, {{ name }}!</span
              >
            </div>
            <div v-if="shouldShowCommerce && currentCommerce" class="commerce-info">
              <span class="commerce-info-text">
                {{ $t('welcomeMenu.youAreIn') || 'You are in:' }}
                <span class="commerce-name-bold">{{ currentCommerce.tag }}</span>
                <span v-if="shouldShowModule && currentModule" class="module-name-bold">
                  - {{ currentModule.tag || currentModule.name }}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div class="toggle-title centered" v-if="toggles && componentName">
          <ToggleCapabilities
            :toggles="toggles"
            :component-name="componentName"
          ></ToggleCapabilities>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.title-content {
  border-radius: 10rem;
  border: 0.5px solid var(--gris-clear);
  background-color: var(--gris-clear);
}
.welcome-title {
  font-size: 1.2rem;
  font-weight: 700;
}
.welcome {
  padding: 0.5rem;
  line-height: 1rem;
  text-align: center;
}
.toggle-title {
  line-height: 1rem;
  padding-bottom: 0.5rem;
  padding-top: 0rem !important;
  display: flex;
  justify-content: center;
  align-items: center;
}
.commerce-info {
  padding-top: 0.25rem;
  line-height: 1.2rem;
  text-align: center;
}
.commerce-info-text {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--gris-dark, #666);
}
.commerce-name-bold {
  font-weight: 700;
  color: var(--azul-hub, #1f3f92);
}
.module-name-bold {
  font-weight: 700;
  color: var(--azul-hub, #1f3f92);
}
</style>
