<template>
  <div
    v-if="show"
    class="modal fade show"
    id="refundModal"
    tabindex="-1"
    aria-labelledby="refundModalLabel"
    aria-hidden="false"
    style="display: block; z-index: 1055;"
  >
    <div class="modal-backdrop fade show" style="z-index: 1054;"></div>
    <div class="modal-dialog modal-lg" style="z-index: 1056;">
      <div class="modal-content financial-modal">
        <div class="modal-header border-0 active-name modern-modal-header">
          <div class="modern-modal-header-inner">
            <div class="modern-modal-icon-wrapper">
              <i class="bi bi-arrow-counterclockwise"></i>
            </div>
            <div class="modern-modal-title-wrapper">
              <h5 class="modal-title fw-bold modern-modal-title" id="refundModalLabel">
                {{ $t('financial.refunds.processRefund') }}
              </h5>
              <p v-if="transaction" class="modern-modal-subtitle">
                ID: {{ transaction.id }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="modern-modal-close-btn"
            @click="$emit('close')"
            aria-label="Close"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body">
          <div v-if="loading" class="text-center py-4">
            <Spinner />
            <p class="mt-3">{{ $t('financial.refunds.processing') }}</p>
          </div>

          <form v-else @submit.prevent="processRefund">
            <!-- Información de la transacción original -->
            <div class="card mb-3">
              <div class="card-header">
                <h6 class="mb-0">{{ $t('financial.refunds.originalTransaction') }}</h6>
              </div>
              <div class="card-body py-2">
                <div class="row g-2">
                  <div class="col-md-6">
                    <strong>{{ $t('financial.refunds.transactionId') }}:</strong>
                    <span class="text-muted ms-1">{{ transaction.id }}</span>
                  </div>
                  <div class="col-md-6">
                    <strong>{{ $t('financial.refunds.originalAmount') }}:</strong>
                    <span class="text-success fw-bold ms-1">{{ formatCurrency(transaction.amount) }}</span>
                  </div>
                  <div class="col-md-6">
                    <strong>{{ $t('financial.refunds.date') }}:</strong>
                    <span class="text-muted ms-1">{{ formatDate(transaction.date || transaction.createdAt || transaction.updatedAt) }}</span>
                  </div>
                  <div class="col-md-6">
                    <strong>{{ $t('financial.refunds.type') }}:</strong>
                    <span class="text-muted ms-1">{{ getTransactionType(transaction) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Formulario de refund -->
            <div class="row">
              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">{{ $t('financial.refunds.refundAmount') }} *</label>
                  <div class="input-group">
                    <span class="input-group-text">$</span>
                    <input
                      v-model.number="formData.amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      :max="maxRefundAmount"
                      :value="maxRefundAmount"
                      class="form-control"
                      :class="{ 'is-invalid': errors.amount }"
                      required
                    />
                  </div>
                  <div class="form-text">
                    {{ $t('financial.refunds.maxAmount') }}: {{ formatCurrency(maxRefundAmount) }}
                  </div>
                  <div v-if="errors.amount" class="invalid-feedback">{{ errors.amount }}</div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="mb-3">
                  <label class="form-label">{{ $t('financial.refunds.refundType') }} *</label>
                  <select
                    v-model="formData.type"
                    class="form-select"
                    :class="{ 'is-invalid': errors.type }"
                    required
                  >
                    <option value="">{{ $t('financial.refunds.selectType') }}</option>
                    <option value="payment-refund">{{ $t('financial.refunds.types.paymentRefund') }}</option>
                    <option value="commission-reversal">{{ $t('financial.refunds.types.commissionReversal') }}</option>
                    <option value="service-refund">{{ $t('financial.refunds.types.serviceRefund') }}</option>
                    <option value="cancellation-refund">{{ $t('financial.refunds.types.cancellationRefund') }}</option>
                  </select>
                  <div v-if="errors.type" class="invalid-feedback">{{ errors.type }}</div>
                </div>
              </div>

              <div class="col-12">
                <div class="mb-3">
                  <label class="form-label">{{ $t('financial.refunds.reason') }} *</label>
                  <select
                    v-model="formData.reason"
                    class="form-select"
                    :class="{ 'is-invalid': errors.reason }"
                    required
                  >
                    <option value="">{{ $t('financial.refunds.selectReason') }}</option>
                    <option value="customer-request">{{ $t('financial.refunds.reasons.customerRequest') }}</option>
                    <option value="service-issue">{{ $t('financial.refunds.reasons.serviceIssue') }}</option>
                    <option value="technical-error">{{ $t('financial.refunds.reasons.technicalError') }}</option>
                    <option value="duplicate-payment">{{ $t('financial.refunds.reasons.duplicatePayment') }}</option>
                    <option value="policy-violation">{{ $t('financial.refunds.reasons.policyViolation') }}</option>
                    <option value="other">{{ $t('financial.refunds.reasons.other') }}</option>
                  </select>
                  <div v-if="errors.reason" class="invalid-feedback">{{ errors.reason }}</div>
                </div>
              </div>

              <div class="col-12">
                <div class="mb-3">
                  <label class="form-label">{{ $t('financial.refunds.description') }}</label>
                  <textarea
                    v-model="formData.description"
                    class="form-control"
                    rows="3"
                    :placeholder="$t('financial.refunds.descriptionPlaceholder')"
                    maxlength="500"
                  ></textarea>
                  <div class="form-text">
                    {{ formData.description?.length || 0 }}/500 caracteres
                  </div>
                </div>
              </div>
            </div>

            <!-- Alert de error -->
            <div v-if="errorMessage" class="alert alert-danger d-flex align-items-center mb-3" role="alert">
              <i class="bi bi-exclamation-circle-fill me-2"></i>
              <div>{{ errorMessage }}</div>
            </div>

            <!-- Alert de confirmación -->
            <div class="alert alert-warning d-flex align-items-center">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              <div>
                <strong>{{ $t('financial.refunds.confirmationTitle') }}:</strong>
                {{ $t('financial.refunds.confirmationMessage', { amount: formatCurrency(formData.amount || 0) }) }}
              </div>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
            @click="$emit('close')"
            :disabled="loading"
          >
            {{ $t('cancel') }}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-4"
            :disabled="loading || !isFormValid"
            @click="processRefund"
          >
            <div v-if="loading" class="d-flex align-items-center">
              <div class="spinner-border spinner-border-sm me-2" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              {{ $t('financial.refunds.processing') }}
            </div>
            <div v-else class="d-flex align-items-center">
              <i class="bi bi-arrow-counterclockwise me-2"></i>
              {{ $t('financial.refunds.processRefund') }}
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Spinner from '../common/Spinner.vue';
import { financialService } from '../../application/services/query-stack.js';

export default {
  name: 'RefundModal',
  components: {
    Spinner
  },
  props: {
    transaction: {
      type: Object,
      required: true
    },
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['refund-processed', 'close'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const loading = ref(false);
    const errorMessage = ref('');
    const errors = reactive({});

    const formData = reactive({
      amount: computed(() => maxRefundAmount.value),
      type: '',
      reason: '',
      description: ''
    });

    // Calcular el máximo monto de refund disponible
    const maxRefundAmount = computed(() => {
      return props.transaction?.amount || 0;
    });

    const isFormValid = computed(() => {
      return formData.amount > 0 &&
             formData.amount <= maxRefundAmount.value &&
             formData.type &&
             formData.reason;
    });

    // Resetear formulario cuando cambie la transacción
    watch(() => props.transaction, (newTransaction) => {
      if (newTransaction) {
        formData.amount = 0;
        formData.type = '';
        formData.reason = '';
        formData.description = '';
        errorMessage.value = '';
        clearErrors();
      }
    });

    const clearErrors = () => {
      Object.keys(errors).forEach(key => delete errors[key]);
      errorMessage.value = '';
    };

    const validateForm = () => {
      clearErrors();
      let isValid = true;

      if (!formData.amount || formData.amount <= 0) {
        errors.amount = t('financial.refunds.errors.invalidAmount');
        isValid = false;
      }

      if (formData.amount > maxRefundAmount.value) {
        errors.amount = t('financial.refunds.errors.amountExceedsLimit');
        isValid = false;
      }

      if (!formData.type) {
        errors.type = t('financial.refunds.errors.typeRequired');
        isValid = false;
      }

      if (!formData.reason) {
        errors.reason = t('financial.refunds.errors.reasonRequired');
        isValid = false;
      }

      return isValid;
    };

    const processRefund = async () => {
      if (!validateForm()) {
        return;
      }

      loading.value = true;
      errorMessage.value = ''; // Limpiar mensaje de error previo

      try {
        const refundData = {
          originalTransactionId: props.transaction.id,
          amount: Number(formData.amount),
          type: formData.type,
          reason: formData.reason,
          description: formData.description || undefined,
          clientId: props.transaction.clientId,
          professionalId: props.transaction.professionalId
        };

        const result = await financialService.createRefund(refundData);

        if (result && result.success) {
          emit('refund-processed', {
            success: true,
            ...result,
            originalTransaction: props.transaction,
            refundData
          });
          // No cerrar el modal aquí - dejar que el parent lo haga después de refresh
        } else {
          throw new Error(result?.errorMessage || t('financial.refunds.errors.processError'));
        }
      } catch (error) {
        console.error('Error processing refund:', error);

        // Extraer el mensaje de error correcto
        let extractedErrorMessage = t('financial.refunds.errors.processError');

        if (error.response?.data?.message) {
          // Si el mensaje es un array, tomar el primer elemento
          if (Array.isArray(error.response.data.message)) {
            extractedErrorMessage = error.response.data.message[0];
          } else {
            extractedErrorMessage = error.response.data.message;
          }
        } else if (error.message) {
          extractedErrorMessage = error.message;
        }

        errorMessage.value = extractedErrorMessage;
      } finally {
        loading.value = false;
      }
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
      }).format(amount || 0);
    };

    const formatDate = (date) => {
      if (!date) return '-';

      // Manejar Firebase Timestamp
      let dateObj;
      if (date.toDate && typeof date.toDate === 'function') {
        dateObj = date.toDate();
      } else if (date.seconds) {
        dateObj = new Date(date.seconds * 1000);
      } else {
        dateObj = new Date(date);
      }

      // Verificar si la fecha es válida
      if (isNaN(dateObj.getTime())) return '-';

      return dateObj.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getTransactionType = (transaction) => {
      if (!transaction) return '-';

      // Intentar obtener el tipo de diferentes campos posibles
      const type = transaction.conceptType || transaction.type || transaction.incomeType;

      if (!type) return '-';

      // Traducir tipos conocidos
      const typeTranslations = {
        'STANDARD': t('incomeTypes.STANDARD') || 'Recibimiento Normal',
        'FUND_INCREASE': t('incomeTypes.FUND_INCREASE') || 'Aumento de Fondo',
        'UNIQUE': t('incomeTypes.UNIQUE') || 'Pago Único',
        'FIRST_PAYMENT': t('incomeTypes.FIRST_PAYMENT') || 'Primer Pago',
        'INSTALLMENT': t('incomeTypes.INSTALLMENT') || 'Cuotas',
        'income': 'Ingreso',
        'outcome': 'Egreso'
      };

      return typeTranslations[type] || type;
    };

    return {
      loading,
      errorMessage,
      errors,
      formData,
      maxRefundAmount,
      isFormValid,
      processRefund,
      formatCurrency,
      formatDate,
      getTransactionType
    };
  }
};
</script>

<style scoped>
/* Financial Modal Styling */
.financial-modal {
  background: #ffffff;
  border-radius: 12px;
  border: none;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1);
}

.modal-header {
  background-color: var(--azul-turno, #004aad);
  color: white !important;
  border-radius: 12px 12px 0 0;
  border-bottom: none !important;
  padding: 1rem 1.25rem !important;
}

.modal-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: white !important;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-title i {
  font-size: 1.125rem;
  color: white;
}

.btn-close {
  filter: invert(1) grayscale(100%) brightness(200%) !important;
  opacity: 0.8;
}

.btn-close:hover {
  opacity: 1;
}

.modal-body {
  padding: 1rem;
  font-size: 0.8125rem;
  background: #ffffff;
}

.modal-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
  display: flex;
  gap: 0.5rem;
  background: #f8f9fa;
  border-radius: 0 0 12px 12px;
  justify-content: flex-end;
}

.card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: none;
}

.card-header {
  background: #e9ecef;
  border-bottom: 1px solid #dee2e6;
  font-weight: 600;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
}

.form-label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.form-control,
.form-select {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus,
.form-select:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 0 0.2rem rgba(245, 158, 11, 0.25);
}

.input-group-text {
  background-color: #e9ecef;
  border-color: #d1d5db;
  color: #6c757d;
  font-weight: 500;
}

.btn-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: none;
  color: white;
  font-weight: 600;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.btn-warning:hover:not(:disabled) {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.btn-warning:disabled {
  background: #9ca3af;
  opacity: 0.6;
}

.btn-secondary {
  background: #6b7280;
  border-color: #6b7280;
  color: white;
  font-weight: 500;
  border-radius: 6px;
}

.btn-secondary:hover {
  background: #4b5563;
  border-color: #4b5563;
}

.alert-warning {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: #92400e;
  border-radius: 8px;
}

.text-muted {
  color: #6b7280 !important;
  font-size: 0.875rem;
}

.form-text {
  color: #6b7280;
  font-size: 0.75rem;
}

.card-body {
  font-size: 0.875rem;
}

.card-body.py-2 {
  padding-top: 0.5rem !important;
  padding-bottom: 0.5rem !important;
}

.card-body .row.g-2 {
  --bs-gutter-x: 0.5rem;
  --bs-gutter-y: 0.25rem;
}

.card-body .row > div {
  margin-bottom: 0.5rem;
}

.card-body strong {
  font-size: 0.8125rem;
  font-weight: 600;
}

.alert {
  font-size: 0.875rem;
}

.btn {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  transition: all 0.15s ease-in-out;
}

.btn-outline-secondary {
  border-color: #6c757d;
  color: #6c757d;
}

.btn-outline-secondary:hover {
  background-color: #6c757d;
  border-color: #6c757d;
  color: white;
}

.btn-primary {
  background-color: var(--azul-turno, #004aad);
  border-color: var(--azul-turno, #004aad);
}

.btn-primary:hover {
  background-color: #003d91;
  border-color: #003d91;
}

/* Z-index fixes */
.modal {
  z-index: 1055;
}

.modal-backdrop {
  z-index: 1054;
}

.modal-dialog {
  z-index: 1056;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-dialog {
    margin: 1rem;
    max-width: calc(100% - 2rem);
  }

  .modal-body {
    padding: 1rem;
  }

  .modal-header,
  .modal-footer {
    padding: 0.75rem 1rem;
  }
}

/* Modern Modal Styles */
.modern-modal-header {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 0;
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

.modern-modal-subtitle {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modern-modal-close-btn {
  position: relative;
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #ffffff;
  flex-shrink: 0;
  padding: 0;
}

.modern-modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.modern-modal-close-btn i {
  font-size: 0.875rem;
  color: #ffffff;
}
</style>