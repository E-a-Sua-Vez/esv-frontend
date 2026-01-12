<script>
import ModuleFormBasicFields from './ModuleFormBasicFields.vue';
import Warning from '../common/Warning.vue';
import Popper from 'vue3-popper';

export default {
  name: 'ModuleFormEdit',
  components: {
    ModuleFormBasicFields,
    Warning,
    Popper,
  },
  props: {
    module: { type: Object, required: true },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
  },
  methods: {
    async copyIdToClipboard(id) {
      if (!id) return;
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(id);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = id;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      } catch (e) {
        // silent fallback
      }
    },
  },
};
</script>

<template>
  <div class="detailed-data" :class="{ show: true }">
    <ModuleFormBasicFields
      :model-value="module"
      :toggles="toggles"
      :errors="errors"
      :is-add="false"
    />
    <div class="module-details-container">
      <span><strong>Id:</strong> {{ module.id }}</span>
      <button
        type="button"
        class="btn btn-link btn-copy-id p-0 ms-2 align-baseline"
        @click="copyIdToClipboard(module.id)"
        :title="$t('copy') || 'Copiar Id'"
      >
        <i class="bi bi-clipboard"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.detailed-data {
  max-height: 0px;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
  padding: 0;
}

.detailed-data.show {
  max-height: 1500px;
  padding: 0.625rem;
  overflow-y: auto;
}

.module-details-container {
  font-size: 0.8rem;
  margin-top: 0.5rem;
  color: #6c757d;
}

.btn-copy-id {
  font-size: 0.8rem;
  color: var(--gris-default);
  text-decoration: none;
}

.btn-copy-id:hover {
  color: var(--primary-color, #000);
  text-decoration: none;
}
</style>
