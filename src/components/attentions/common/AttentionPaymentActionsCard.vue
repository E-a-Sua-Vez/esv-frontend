<template>
  <div class="requirement-card requirement-card-compact">
    <div class="requirement-card-header">
      <div class="requirement-icon payment-icon">
        <i class="bi bi-cash-coin"></i>
      </div>
      <div class="requirement-info">
        <div class="requirement-title">
          {{
            $t('collaboratorAttentionValidate.paymentActions') ||
              'Acciones de Atención'
          }}
        </div>
        <div class="requirement-status">
          <i class="bi bi-info-circle-fill"></i>
          <span>
            {{
              $t('collaboratorAttentionValidate.paymentActionsSubtitle') ||
                'Confirmar pago, transferir o cancelar'
            }}
          </span>
        </div>
      </div>
    </div>
    <button
      class="requirement-action-btn-compact payment-btn"
      :disabled="loading || disabled"
      @click="$emit('open')"
    >
      <i class="bi bi-arrow-right-circle"></i>
      <span>
        {{
          $t('collaboratorAttentionValidate.manage') || 'Gestionar'
        }}
      </span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'AttentionPaymentActionsCard',
  props: {
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ['open'],
};
</script>

<style scoped>
.requirement-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(169, 169, 169, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.requirement-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.requirement-card-compact {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
}

.requirement-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0;
  flex: 1;
  min-width: 0;
}

.requirement-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.1rem;
}

.payment-icon {
  background: rgba(14, 165, 233, 0.1);
  color: #0ea5e9;
}

.requirement-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.requirement-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.requirement-status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #6c757d;
}

.requirement-status i {
  font-size: 0.875rem;
}

.requirement-action-btn-compact {
  width: auto;
  padding: 0.4rem 0.875rem;
  border: none;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin-top: 0;
  flex-shrink: 0;
  white-space: nowrap;
}

.payment-btn {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: white;
}

.payment-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}

.payment-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
}
</style>
