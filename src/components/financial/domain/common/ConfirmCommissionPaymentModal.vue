<script>
import { ref } from 'vue';
import Spinner from '../../../common/Spinner.vue';
import Alert from '../../../common/Alert.vue';
import { confirmCommissionPayment } from '../../../../application/services/professional-commission-payment';

export default {
  name: 'ConfirmCommissionPaymentModal',
  components: { Spinner, Alert },
  props: {
    show: { type: Boolean, default: false },
    payment: { type: Object, required: true },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const loading = ref(false);
    const alertError = ref('');
    const paymentMethod = ref('CASH');
    const paymentNotes = ref('');

    const paymentMethods = [
      { value: 'CASH', label: 'paymentClientMethods.CASH' },
      { value: 'CARD', label: 'paymentClientMethods.CARD' },
      { value: 'TRANSFER', label: 'paymentClientMethods.TRANSFER' },
      { value: 'CHECK', label: 'paymentClientMethods.CHECK' },
      { value: 'OTHER', label: 'paymentClientMethods.OTHER' },
    ];

    const confirm = async () => {
      try {
        loading.value = true;

        await confirmCommissionPayment(
          props.payment.id,
          paymentMethod.value,
          paymentNotes.value || undefined
        );

        loading.value = false;
        emit('close');
      } catch (error) {
        console.error('Error confirming payment:', error);
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const formatCurrency = amount =>
      Number(parseFloat(amount || 0).toFixed(2)).toLocaleString('de-DE');

    return {
      loading,
      alertError,
      paymentMethod,
      paymentNotes,
      paymentMethods,
      confirm,
      formatCurrency,
    };
  },
};
</script>

<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5)">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content confirm-payment-modal">
        <!-- Modern Header -->
        <div class="modal-header border-0 centered active-name confirm-payment-modal-header">
          <h5 class="modal-title fw-bold">
            <i class="bi bi-check-circle"></i> {{ $t('commissionPayments.confirmPayment') }}
          </h5>
          <button type="button" class="btn-close confirm-payment-close-btn" @click="$emit('close')"></button>
        </div>

        <div class="modal-body confirm-payment-modal-body">
          <Spinner :show="loading" />
          <Alert :show="alertError !== ''" :message="alertError" />

          <!-- Resumen del Pago -->
          <div class="confirm-payment-summary-card">
            <h6 class="confirm-payment-summary-title">
              <i class="bi bi-info-circle text-primary"></i>
              {{ $t('commissionPayments.paymentSummary') }}
            </h6>
            <div class="row g-3">
              <div class="col-6">
                <div class="confirm-payment-summary-item">
                  <small class="confirm-payment-summary-label">{{ $t('commissionPayments.incomes') }}</small>
                  <p class="mb-0 confirm-payment-summary-value fw-bold">{{ payment.totalIncomes }}</p>
                </div>
              </div>
              <div class="col-6">
                <div class="confirm-payment-summary-item">
                  <small class="confirm-payment-summary-label">{{ $t('commissionPayments.totalAmount') }}</small>
                  <p class="mb-0 confirm-payment-summary-value fw-bold">${{ formatCurrency(payment.totalAmount) }}</p>
                </div>
              </div>
              <div class="col-12 mt-2">
                <div class="confirm-payment-summary-item">
                  <small class="confirm-payment-summary-label">{{
                    $t('commissionPayments.totalCommission')
                  }}</small>
                  <h4 class="text-success mb-0 confirm-payment-commission-total">
                    ${{ formatCurrency(payment.totalCommission) }}
                  </h4>
                </div>
              </div>
            </div>
          </div>

          <!-- Advertencia -->
          <div class="confirm-payment-warning-card">
            <i class="bi bi-exclamation-triangle"></i>
            <span>{{ $t('commissionPayments.messages.confirmPaymentWarning') }}</span>
          </div>

          <!-- Método de Pago -->
          <div class="mb-3">
            <label class="form-label confirm-payment-label fw-bold">
              {{ $t('commissionPayments.paymentMethod') }} *
            </label>
            <select v-model="paymentMethod" class="form-select confirm-payment-select" required>
              <option v-for="method in paymentMethods" :key="method.value" :value="method.value">
                {{ $t(method.label) }}
              </option>
            </select>
          </div>

          <!-- Notas del Pago -->
          <div class="mb-3">
            <label class="form-label confirm-payment-label fw-bold">
              {{ $t('commissionPayments.paymentNotes') }}
            </label>
            <textarea
              v-model="paymentNotes"
              class="form-control confirm-payment-textarea"
              rows="3"
              :placeholder="$t('commissionPayments.paymentNotesPlaceholder')"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer confirm-payment-modal-footer">
          <button
            type="button"
            class="btn btn-sm btn-size fw-bold btn-outline-secondary rounded-pill px-4"
            @click="$emit('close')"
          >
            {{ $t('commissionPayments.cancel') }}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-size fw-bold btn-success rounded-pill px-4"
            @click="confirm"
            :disabled="loading || !paymentMethod"
          >
            <i class="bi bi-check-circle"></i> {{ $t('commissionPayments.confirmPaymentAction') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modern Modal Content */
.confirm-payment-modal {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Modern Header - matching product style with success gradient */
.confirm-payment-modal-header {
  background: linear-gradient(
    135deg,
    #00c2cb 0%,
    #00a8b0 100%
  ) !important;
  color: white !important;
  border-bottom: none !important;
  padding: 1rem 1.25rem !important;
  border-radius: 12px 12px 0 0 !important;
}

.confirm-payment-modal-header .modal-title {
  color: white !important;
  font-weight: 700 !important;
  font-size: 1rem;
  margin: 0 !important;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.confirm-payment-modal-header .modal-title i {
  font-size: 1.125rem;
  color: white;
}

.confirm-payment-close-btn {
  filter: invert(1) grayscale(100%) brightness(200%) !important;
  opacity: 0.9 !important;
  transition: opacity 0.2s ease;
}

.confirm-payment-close-btn:hover {
  opacity: 1 !important;
}

/* Modal Body */
.confirm-payment-modal-body {
  background: #f8f9fa !important;
  padding: 1.25rem !important;
}

/* Summary Card */
.confirm-payment-summary-card {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 74, 173, 0.05) 100%);
  border-left: 4px solid #004aad;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.confirm-payment-summary-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #000000;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.confirm-payment-summary-title i {
  font-size: 1rem;
}

.confirm-payment-summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.confirm-payment-summary-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.confirm-payment-summary-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #000000;
  line-height: 1.4;
}

.confirm-payment-commission-total {
  font-size: 1.5rem;
  font-weight: 700;
  color: #00c2cb;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

/* Warning Card */
.confirm-payment-warning-card {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%);
  border-left: 4px solid #f9c322;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.confirm-payment-warning-card i {
  font-size: 1.25rem;
  color: #f9c322;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.confirm-payment-warning-card span {
  font-size: 0.875rem;
  color: #000000;
  line-height: 1.5;
  flex: 1;
}

/* Form Elements */
.confirm-payment-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 0.5rem;
}

.confirm-payment-select {
  border-radius: 8px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.confirm-payment-select:focus {
  border-color: #00c2cb;
  box-shadow: 0 0 0 3px rgba(0, 194, 203, 0.1);
}

.confirm-payment-textarea {
  border-radius: 8px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.confirm-payment-textarea:focus {
  border-color: #00c2cb;
  box-shadow: 0 0 0 3px rgba(0, 194, 203, 0.1);
}

/* Modal Footer */
.confirm-payment-modal-footer {
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
  .confirm-payment-modal-footer {
    flex-direction: column;
  }

  .confirm-payment-modal-footer .btn {
    width: 100%;
  }
}
</style>
