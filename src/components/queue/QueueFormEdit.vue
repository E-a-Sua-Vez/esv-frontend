<script>
import QueueFormBasicFields from './QueueFormBasicFields.vue';
import Warning from '../common/Warning.vue';
import Popper from 'vue3-popper';

export default {
  name: 'QueueFormEdit',
  components: {
    QueueFormBasicFields,
    Warning,
    Popper,
  },
  props: {
    queue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    commerce: { type: Object, default: null },
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
  <div class="detailed-data transition-slow">
    <QueueFormBasicFields
      :model-value="queue"
      :types="types"
      :toggles="toggles"
      :errors="errors"
      :is-add="false"
      :commerce="commerce"
      prefix="update-"
    />
    <div id="queue-id-form" class="row -2 mb-g3" v-if="queue && queue.id">
      <div class="row queue-details-container">
        <div class="col">
          <span><strong>Id:</strong> {{ queue.id }}</span>
          <button
            type="button"
            class="btn btn-link btn-copy-id p-0 ms-2 align-baseline"
            @click="copyIdToClipboard(queue.id)"
            :title="$t('copy') || 'Copiar Id'"
          >
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      </div>
    </div>
    <div
      class="row g-1 errors"
      id="feedback"
      v-if="errors.errorsUpdate && errors.errorsUpdate.length > 0"
    >
      <Warning>
        <template v-slot:message>
          <li v-for="(error, index) in errors.errorsUpdate" :key="index">
            {{ $t(error) }}
          </li>
        </template>
      </Warning>
    </div>
  </div>
</template>

<style scoped>
.errors {
  font-size: small;
  color: var(--rojo-warning);
}

.queue-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
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

.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
  background-color: var(--color-background);
  transition: max-height 0.3s ease;
}

.detailed-data.show {
  padding: 10px;
  max-height: 2000px !important;
  overflow-y: visible;
}
</style>
