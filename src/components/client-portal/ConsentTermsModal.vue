<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h5>{{ $t('clientPortal.consents.terms.title') }}</h5>
        <button type="button" class="btn-close" @click="$emit('close')"></button>
      </div>
      <div class="modal-body">
        <div v-if="terms" class="terms-content" v-html="terms"></div>
        <div v-else class="text-center py-4">
          <p class="text-muted">{{ $t('clientPortal.consents.terms.noTerms') }}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="$emit('close')">
          {{ $t('clientPortal.consents.terms.close') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'ConsentTermsModal',
  props: {
    consent: {
      type: Object,
      required: true,
    },
  },
  emits: ['close'],
  setup(props) {
    const terms = computed(
      () => props.consent.terms || props.consent.legalText || props.consent.description || null
    );

    return {
      terms,
    };
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid var(--gris-default);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h5 {
  margin: 0;
}

.modal-body {
  padding: 1.5rem;
}

.terms-content {
  line-height: 1.6;
  color: var(--gris-elite-1);
}

.terms-content :deep(h1),
.terms-content :deep(h2),
.terms-content :deep(h3) {
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  color: var(--gris-elite-1);
}

.terms-content :deep(p) {
  margin-bottom: 1rem;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid var(--gris-default);
  display: flex;
  justify-content: flex-end;
}
</style>

