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

    const formatCurrency = (amount) => Number(parseFloat(amount || 0).toFixed(2)).toLocaleString('de-DE');

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
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-success text-white">
          <h5 class="modal-title">
            <i class="bi bi-check-circle"></i> {{ $t('commissionPayments.confirmPayment') }}
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="$emit('close')"></button>
        </div>
        
        <div class="modal-body">
          <Spinner :show="loading" />
          <Alert :show="alertError !== ''" :message="alertError" />

          <!-- Resumen del Pago -->
          <div class="alert alert-info">
            <h6 class="fw-bold mb-3">{{ $t('commissionPayments.paymentSummary') }}</h6>
            <div class="row">
              <div class="col-6">
                <small class="text-muted d-block">{{ $t('commissionPayments.incomes') }}</small>
                <p class="mb-2 fw-bold">{{ payment.totalIncomes }}</p>
              </div>
              <div class="col-6">
                <small class="text-muted d-block">{{ $t('commissionPayments.totalAmount') }}</small>
                <p class="mb-2 fw-bold">${{ formatCurrency(payment.totalAmount) }}</p>
              </div>
              <div class="col-12 mt-2">
                <small class="text-muted d-block">{{ $t('commissionPayments.totalCommission') }}</small>
                <h4 class="text-success mb-0">${{ formatCurrency(payment.totalCommission) }}</h4>
              </div>
            </div>
          </div>

          <!-- Advertencia -->
          <div class="alert alert-warning">
            <i class="bi bi-exclamation-triangle"></i>
            {{ $t('commissionPayments.messages.confirmPaymentWarning') }}
          </div>

          <!-- Método de Pago -->
          <div class="mb-3">
            <label class="form-label fw-bold">
              {{ $t('commissionPayments.paymentMethod') }} *
            </label>
            <select v-model="paymentMethod" class="form-control" required>
              <option v-for="method in paymentMethods" :key="method.value" :value="method.value">
                {{ $t(method.label) }}
              </option>
            </select>
          </div>

          <!-- Notas del Pago -->
          <div class="mb-3">
            <label class="form-label fw-bold">{{ $t('commissionPayments.paymentNotes') }}</label>
            <textarea 
              v-model="paymentNotes"
              class="form-control"
              rows="3"
              :placeholder="$t('commissionPayments.paymentNotesPlaceholder')"
            ></textarea>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            {{ $t('commissionPayments.cancel') }}
          </button>
          <button 
            type="button" 
            class="btn btn-success" 
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
