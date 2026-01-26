<script>
import { ref } from 'vue';
import Spinner from '../../../common/Spinner.vue';
import Alert from '../../../common/Alert.vue';
import { cancelCommissionPayment } from '../../../../application/services/professional-commission-payment';

export default {
  name: 'CancelCommissionPaymentModal',
  components: { Spinner, Alert },
  props: {
    show: { type: Boolean, default: false },
    payment: { type: Object, required: true },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const loading = ref(false);
    const alertError = ref('');
    const cancellationReason = ref('');

    const cancel = async () => {
      if (!cancellationReason.value.trim()) {
        alertError.value = 'REASON_REQUIRED';
        return;
      }

      try {
        loading.value = true;

        await cancelCommissionPayment(props.payment.id, cancellationReason.value);

        loading.value = false;
        emit('close');
      } catch (error) {
        console.error('Error cancelling payment:', error);
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    return {
      loading,
      alertError,
      cancellationReason,
      cancel,
    };
  },
};
</script>

<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5)">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content cancel-payment-modal">
        <!-- Modern Header -->
        <div class="modal-header border-0 centered active-name cancel-payment-modal-header">
          <h5 class="modal-title fw-bold">
            <i class="bi bi-x-circle"></i> {{ $t('commissionPayments.cancelPayment') }}
          </h5>
          <button type="button" class="btn-close cancel-payment-close-btn" @click="$emit('close')"></button>
        </div>

        <div class="modal-body cancel-payment-modal-body">
          <Spinner :show="loading" />
          <Alert :show="alertError !== ''" :message="alertError" />

          <!-- Advertencia -->
          <div class="cancel-payment-warning-card">
            <i class="bi bi-exclamation-triangle"></i>
            <span>{{ $t('commissionPayments.messages.cancelWarning') }}</span>
          </div>

          <!-- Razón de Cancelación -->
          <div class="mb-3">
            <label class="form-label cancel-payment-label fw-bold">
              {{ $t('commissionPayments.cancellationReason') }} *
            </label>
            <textarea
              v-model="cancellationReason"
              class="form-control cancel-payment-textarea"
              rows="4"
              :placeholder="$t('commissionPayments.cancellationReasonPlaceholder')"
              required
            ></textarea>
          </div>
        </div>

        <div class="modal-footer cancel-payment-modal-footer">
          <button
            type="button"
            class="btn btn-sm btn-size fw-bold btn-outline-secondary rounded-pill px-4"
            @click="$emit('close')"
          >
            {{ $t('commissionPayments.back') }}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-4"
            @click="cancel"
            :disabled="loading || !cancellationReason.trim()"
          >
            <i class="bi bi-x-circle"></i> {{ $t('commissionPayments.confirmCancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modern Modal Content */
.cancel-payment-modal {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Modern Header - matching product style with danger gradient */
.cancel-payment-modal-header {
  background: linear-gradient(
    135deg,
    #a52a2a 0%,
    #dc3545 100%
  ) !important;
  color: white !important;
  border-bottom: none !important;
  padding: 1rem 1.25rem !important;
  border-radius: 12px 12px 0 0 !important;
}

.cancel-payment-modal-header .modal-title {
  color: white !important;
  font-weight: 700 !important;
  font-size: 1rem;
  margin: 0 !important;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cancel-payment-modal-header .modal-title i {
  font-size: 1.125rem;
  color: white;
}

.cancel-payment-close-btn {
  filter: invert(1) grayscale(100%) brightness(200%) !important;
  opacity: 0.9 !important;
  transition: opacity 0.2s ease;
}

.cancel-payment-close-btn:hover {
  opacity: 1 !important;
}

/* Modal Body */
.cancel-payment-modal-body {
  background: #f8f9fa !important;
  padding: 1.25rem !important;
}

/* Warning Card */
.cancel-payment-warning-card {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%);
  border-left: 4px solid #f9c322;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.cancel-payment-warning-card i {
  font-size: 1.25rem;
  color: #f9c322;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.cancel-payment-warning-card span {
  font-size: 0.875rem;
  color: #000000;
  line-height: 1.5;
  flex: 1;
}

/* Form Elements */
.cancel-payment-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 0.5rem;
}

.cancel-payment-textarea {
  border-radius: 8px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.cancel-payment-textarea:focus {
  border-color: #dc3545;
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
}

/* Modal Footer */
.cancel-payment-modal-footer {
  background: #f8f9fa !important;
  border-top: 1px solid rgba(169, 169, 169, 0.2) !important;
  padding: 1rem 1.25rem !important;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-size {
  font-size: 0.8125rem;
}

@media (max-width: 768px) {
  .cancel-payment-modal-footer {
    flex-direction: column;
  }

  .cancel-payment-modal-footer .btn {
    width: 100%;
  }
}
</style>
