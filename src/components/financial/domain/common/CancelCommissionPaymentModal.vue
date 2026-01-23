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
      <div class="modal-content">
        <div class="modal-header bg-danger text-white">
          <h5 class="modal-title">
            <i class="bi bi-x-circle"></i> {{ $t('commissionPayments.cancelPayment') }}
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="$emit('close')"></button>
        </div>

        <div class="modal-body">
          <Spinner :show="loading" />
          <Alert :show="alertError !== ''" :message="alertError" />

          <!-- Advertencia -->
          <div class="alert alert-warning">
            <i class="bi bi-exclamation-triangle"></i>
            {{ $t('commissionPayments.messages.cancelWarning') }}
          </div>

          <!-- Razón de Cancelación -->
          <div class="mb-3">
            <label class="form-label fw-bold">
              {{ $t('commissionPayments.cancellationReason') }} *
            </label>
            <textarea
              v-model="cancellationReason"
              class="form-control"
              rows="4"
              :placeholder="$t('commissionPayments.cancellationReasonPlaceholder')"
              required
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            {{ $t('commissionPayments.back') }}
          </button>
          <button
            type="button"
            class="btn btn-danger"
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
