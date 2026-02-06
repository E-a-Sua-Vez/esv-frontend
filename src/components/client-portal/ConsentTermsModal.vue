<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header border-0 active-name modern-modal-header">
        <div class="modern-modal-header-inner">
          <div class="modern-modal-icon-wrapper">
            <i class="bi bi-file-text"></i>
          </div>
          <div class="modern-modal-title-wrapper">
            <h5 class="modal-title fw-bold modern-modal-title">{{ $t('clientPortal.consents.terms.title') }}</h5>
          </div>
          <button class="modern-modal-close-btn" type="button" @click="$emit('close')"><i class="bi bi-x-lg"></i></button>
        </div>
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

/* Modern Modal Header Styles */
.modern-modal-header {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 1rem 1rem 0 0;
  min-height: auto;
  position: relative;
}

.modern-modal-header-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.modern-modal-icon-wrapper {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modern-modal-icon-wrapper i {
  font-size: 1.125rem;
  color: #ffffff;
}

.modern-modal-title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.modern-modal-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-background);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.modern-modal-client-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.2;
}

.modern-modal-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.85;
  width: 1.75rem;
  height: 1.75rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  padding: 0;
}

.modern-modal-close-btn i {
  font-size: 1rem;
  color: #ffffff;
  line-height: 1;
}

.modern-modal-close-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.25);
}
</style>
