<script>
import ToggleCapabilities from './ToggleCapabilities.vue';

export default {
  name: 'WelcomeMenu',
  components: { ToggleCapabilities },
  props: {
    name: { type: String, default: undefined },
    toggles: { type: Object, default: undefined },
    componentName: { type: String, default: undefined },
  },
  data() {
    return {}
  },
  methods: {}
}
</script>

<template>
  <div>
    <div class="row title-content mb-2">
      <div class="col-12">
        <div class="centered">
          <div class="welcome">
            <div id="welcome">
              <span v-if="!name" class="welcome">{{ $t("collaboratorMenu.welcome") }}</span>
              <span v-else class="welcome-user">{{ $t("collaboratorMenu.welcome-user") }}, {{ name }}!</span>
            </div>
          </div>
        </div>
        <div class="toggle-title" v-if="toggles && componentName">
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
  font-size: 1.2rem;
  line-height: 1.2rem;
  font-weight: 700;
}
.toggle-title {
  line-height: 1rem;
  padding-bottom: .5rem;
  padding-top: 0rem !important;
}
</style>