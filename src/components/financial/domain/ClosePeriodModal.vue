<template>
  <div
    v-if="show"
    class="modal fade show"
    tabindex="-1"
    style="display: block; z-index: 1055;"
  >
    <div class="modal-backdrop fade show" style="z-index: 1054;"></div>
    <div class="modal-dialog modal-lg" style="z-index: 1056;">
      <div class="modal-content">
        <div class="modal-header border-0 active-name modern-modal-header">
          <div class="modern-modal-header-inner">
            <div class="modern-modal-icon-wrapper">
              <i class="bi bi-lock"></i>
            </div>
            <div class="modern-modal-title-wrapper">
              <h5 class="modal-title fw-bold modern-modal-title">
                {{ $t('financial.periods.close.title') }}
              </h5>
              <p v-if="period" class="modern-modal-subtitle">
                {{ period.name }}
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
          <!-- Progress Steps -->
          <div class="mb-4">
            <div class="d-flex justify-content-between">
              <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
                <div class="step-number">1</div>
                <div class="step-label">{{ $t('financial.periods.close.step1') }}</div>
              </div>
              <div class="step" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
                <div class="step-number">2</div>
                <div class="step-label">{{ $t('financial.periods.close.step2') }}</div>
              </div>
              <div class="step" :class="{ active: currentStep === 3 }">
                <div class="step-number">3</div>
                <div class="step-label">{{ $t('financial.periods.close.step3') }}</div>
              </div>
            </div>
          </div>

          <!-- Step 1: Pre-validation -->
          <div v-if="currentStep === 1">
            <div v-if="validating" class="text-center py-4">
              <Spinner />
              <p class="mt-3">{{ $t('financial.periods.close.validating') }}</p>
            </div>

            <div v-else>
              <div class="validation-checks">
                <div
                  class="validation-item"
                  :class="{ success: validation.allConfirmed, error: !validation.allConfirmed }"
                >
                  <i :class="validation.allConfirmed ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'"></i>
                  <span>{{ $t('financial.periods.close.allConfirmed') }}</span>
                </div>

                <div
                  v-if="validation.pendingCount > 0"
                  class="validation-item error"
                >
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <span>{{ $t('financial.periods.close.pendingTransactions', { count: validation.pendingCount }) }}</span>
                </div>

                <div
                  class="validation-item"
                  :class="{ success: validation.noRefundsPending, error: !validation.noRefundsPending }"
                >
                  <i :class="validation.noRefundsPending ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'"></i>
                  <span>{{ $t('financial.periods.close.noRefundsPending') }}</span>
                </div>

                <div
                  class="validation-item"
                  :class="{ success: validation.commissionsCalculated, error: !validation.commissionsCalculated }"
                >
                  <i :class="validation.commissionsCalculated ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'"></i>
                  <span>{{ $t('financial.periods.close.commissionsCalculated') }}</span>
                </div>
              </div>

              <div v-if="!canProceed" class="alert alert-danger mt-3">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Hay problemas que deben resolverse antes de cerrar el período.
              </div>
            </div>
          </div>

          <!-- Step 2: Period Summary -->
          <div v-if="currentStep === 2">
            <h6 class="mb-3">{{ $t('financial.periods.close.periodSummary', { name: period.name }) }}</h6>
            <p class="text-muted">
              {{ $t('financial.periods.close.dateRange', {
                startDate: formatDate(period.startDate),
                endDate: formatDate(period.endDate)
              }) }}
            </p>

            <div class="card">
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-md-6">
                    <div class="summary-item">
                      <label>{{ $t('financial.periods.totals.incomes') }}</label>
                      <div class="value text-success">{{ formatCurrency(periodSummary.totalIncomes) }}</div>
                      <small class="text-muted">{{ periodSummary.incomesCount }} transacciones</small>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="summary-item">
                      <label>{{ $t('financial.periods.totals.outcomes') }}</label>
                      <div class="value text-danger">{{ formatCurrency(periodSummary.totalOutcomes) }}</div>
                      <small class="text-muted">{{ periodSummary.outcomesCount }} transacciones</small>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="summary-item">
                      <label>{{ $t('financial.periods.totals.commissions') }}</label>
                      <div class="value text-info">{{ formatCurrency(periodSummary.totalCommissions) }}</div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="summary-item">
                      <label>{{ $t('financial.periods.totals.refunds') }}</label>
                      <div class="value text-warning">{{ formatCurrency(periodSummary.totalRefunds) }}</div>
                    </div>
                  </div>
                  <div class="col-12">
                    <hr>
                    <div class="summary-item">
                      <label class="fw-bold">{{ $t('financial.periods.totals.netAmount') }}</label>
                      <div class="value text-primary fs-4 fw-bold">{{ formatCurrency(periodSummary.netAmount) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Reconciliation Data -->
            <div class="mt-3">
              <h6>Conciliación Bancaria (Opcional)</h6>
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">{{ $t('financial.periods.close.bankBalance') }}</label>
                  <input
                    v-model.number="reconciliation.bankBalance"
                    type="number"
                    step="0.01"
                    class="form-control"
                  />
                </div>
                <div class="col-md-4">
                  <label class="form-label">{{ $t('financial.periods.close.systemBalance') }}</label>
                  <input
                    type="number"
                    step="0.01"
                    class="form-control"
                    :value="periodSummary.netAmount"
                    readonly
                  />
                </div>
                <div class="col-md-4">
                  <label class="form-label">{{ $t('financial.periods.close.difference') }}</label>
                  <input
                    v-model.number="reconciliationDifference"
                    type="number"
                    class="form-control"
                    readonly
                  />
                </div>
              </div>
              <div class="mt-3">
                <label class="form-label">{{ $t('financial.periods.close.notes') }}</label>
                <textarea
                  v-model="notes"
                  class="form-control"
                  rows="3"
                  :placeholder="$t('financial.periods.close.notesPlaceholder')"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Step 3: Confirmation -->
          <div v-if="currentStep === 3">
            <div class="alert alert-warning">
              <i class="bi bi-exclamation-triangle me-2"></i>
              {{ $t('financial.periods.close.confirmMessage', { name: period.name }) }}
            </div>

            <div class="form-check form-switch mb-3">
              <input
                v-model="confirmations.reviewedNumbers"
                class="form-check-input"
                type="checkbox"
                id="confirm1"
              />
              <label class="form-check-label" for="confirm1">
                {{ $t('financial.periods.close.confirmCheckbox') }}
              </label>
            </div>

            <div class="form-check form-switch mb-3">
              <input
                v-model="confirmations.bankReconciliation"
                class="form-check-input"
                type="checkbox"
                id="confirm2"
              />
              <label class="form-check-label" for="confirm2">
                {{ $t('financial.periods.close.confirmBankReconciliation') }}
              </label>
            </div>

            <div class="form-check form-switch mb-3">
              <input
                v-model="confirmations.periodClose"
                class="form-check-input"
                type="checkbox"
                id="confirm3"
              />
              <label class="form-check-label" for="confirm3">
                {{ $t('financial.periods.close.confirmPeriodClose') }}
              </label>
            </div>

            <div v-if="!allConfirmationsChecked" class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              Debes marcar todas las confirmaciones para continuar
            </div>
          </div>

          <!-- Loading -->
          <div v-if="closing" class="text-center py-4">
            <Spinner />
            <p class="mt-3">{{ $t('financial.periods.close.closing') }}</p>
          </div>

          <!-- Error -->
          <Alert v-if="alertError" :show="alertError.length > 0" :message="alertError" />
        </div>

        <div class="modal-footer">
          <button
            v-if="currentStep > 1 && !closing"
            type="button"
            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
            @click="previousStep"
          >
            <i class="bi bi-arrow-left me-1"></i>
            {{ $t('common.previous') }}
          </button>

          <button
            type="button"
            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
            @click="$emit('close')"
            :disabled="closing"
          >
            {{ $t('common.cancel') }}
          </button>

          <button
            v-if="currentStep < 3"
            type="button"
            class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-4"
            @click="nextStep"
            :disabled="!canProceed || closing"
          >
            {{ $t('common.next') }}
            <i class="bi bi-arrow-right ms-1"></i>
          </button>

          <button
            v-if="currentStep === 3"
            type="button"
            class="btn btn-sm btn-size fw-bold btn-warning rounded-pill px-4"
            @click="closePeriod"
            :disabled="!allConfirmationsChecked || closing"
          >
            <span v-if="closing">
              <span class="spinner-border spinner-border-sm me-2"></span>
              {{ $t('financial.periods.close.closing') }}
            </span>
            <span v-else>
              <i class="bi bi-lock me-2"></i>
              {{ $t('financial.periods.actions.close') }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import { closePeriod as closePeriodService, getPeriodSummary } from '../../../application/services/accountingPeriod';

export default {
  name: 'ClosePeriodModal',
  components: {
    Spinner,
    Alert,
  },
  props: {
    show: { type: Boolean, default: false },
    period: { type: Object, required: true },
  },
  emits: ['close', 'period-closed'],
  setup(props, { emit }) {
    const currentStep = ref(1);
    const validating = ref(false);
    const closing = ref(false);
    const alertError = ref('');

    const validation = ref({
      allConfirmed: true,
      pendingCount: 0,
      noRefundsPending: true,
      commissionsCalculated: true,
    });

    const periodSummary = ref({
      totalIncomes: 0,
      totalOutcomes: 0,
      totalCommissions: 0,
      totalRefunds: 0,
      totalCommissionReversals: 0,
      netAmount: 0,
      incomesCount: 0,
      outcomesCount: 0,
    });

    const reconciliation = ref({
      bankBalance: null,
      systemBalance: null,
      notes: '',
    });

    const notes = ref('');

    const confirmations = ref({
      reviewedNumbers: false,
      bankReconciliation: false,
      periodClose: false,
    });

    const canProceed = computed(() => {
      return validation.value.allConfirmed &&
             validation.value.noRefundsPending &&
             validation.value.commissionsCalculated &&
             validation.value.pendingCount === 0;
    });

    const reconciliationDifference = computed(() => {
      if (!reconciliation.value.bankBalance) return 0;
      return (reconciliation.value.bankBalance || 0) - (periodSummary.value.netAmount || 0);
    });

    const allConfirmationsChecked = computed(() => {
      return confirmations.value.reviewedNumbers &&
             confirmations.value.bankReconciliation &&
             confirmations.value.periodClose;
    });

    const loadPeriodSummary = async () => {
      try {
        console.log('📊 Loading period summary for:', props.period.id);
        const summary = await getPeriodSummary(props.period.id);
        console.log('✅ Period summary received:', summary);
        periodSummary.value = summary;

        // Set system balance
        reconciliation.value.systemBalance = summary.netAmount;
      } catch (error) {
        console.error('Error loading period summary:', error);
        alertError.value = error.response?.data?.message || 'Error al cargar el resumen del período';
      }
    };

    const validatePeriod = async () => {
      validating.value = true;
      alertError.value = '';

      try {
        // Mock validation - in real scenario, this should come from backend
        validation.value = {
          allConfirmed: true,
          pendingCount: 0,
          noRefundsPending: true,
          commissionsCalculated: true,
        };
      } catch (error) {
        console.error('Error validating period:', error);
        alertError.value = error.response?.data?.message || 'Error al validar el período';
        validation.value = {
          allConfirmed: false,
          pendingCount: 0,
          noRefundsPending: false,
          commissionsCalculated: false,
        };
      } finally {
        validating.value = false;
      }
    };

    const nextStep = async () => {
      if (currentStep.value < 3) {
        currentStep.value++;
        // Cargar resumen cuando se avanza al step 2
        if (currentStep.value === 2 && !periodSummary.value.totalIncomes) {
          await loadPeriodSummary();
        }
      }
    };

    const previousStep = () => {
      if (currentStep.value > 1) {
        currentStep.value--;
      }
    };

    const closePeriod = async () => {
      try {
        closing.value = true;
        alertError.value = '';

        const closeData = {
          notes: notes.value,
          reconciliationData: {
            bankBalance: reconciliation.value.bankBalance,
            systemBalance: reconciliation.value.systemBalance,
            difference: reconciliationDifference.value,
            notes: reconciliation.value.notes,
          },
        };

        await closePeriodService(props.period.id, closeData);

        emit('period-closed');
        emit('close');
      } catch (error) {
        console.error('Error closing period:', error);
        alertError.value = error.response?.data?.message || 'Error al cerrar el período';
      } finally {
        closing.value = false;
      }
    };

    const formatDate = (date) => {
      if (!date) return '';
      // Parsear la fecha como fecha local sin conversión de timezone
      if (date.toDate) {
        return date.toDate().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
      // Si es string ISO, extraer año/mes/día directamente para evitar conversión UTC
      if (typeof date === 'string' && date.includes('-')) {
        const [year, month, day] = date.split('T')[0].split('-');
        const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return localDate.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
      return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(amount || 0);
    };

    // Validate when modal opens
    watch(() => props.show, (newVal) => {
      if (newVal) {
        currentStep.value = 1;
        validatePeriod();
        confirmations.value = {
          reviewedNumbers: false,
          bankReconciliation: false,
          periodClose: false,
        };
        notes.value = '';
      }
    });

    return {
      currentStep,
      validating,
      closing,
      alertError,
      validation,
      periodSummary,
      reconciliation,
      reconciliationDifference,
      notes,
      confirmations,
      canProceed,
      allConfirmationsChecked,
      nextStep,
      previousStep,
      closePeriod,
      validatePeriod,
      loadPeriodSummary,
      formatDate,
      formatCurrency,
    };
  },
};
</script>

<style scoped>
/* Modal Body Compact */
.modal-body {
  padding: 1rem;
  font-size: 0.8125rem;
}

.modal-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
  display: flex;
  gap: 0.5rem;
}

/* Steps - Compact */
.step {
  flex: 1;
  text-align: center;
  position: relative;
}

.step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 0.875rem;
  left: 50%;
  width: 100%;
  height: 2px;
  background-color: rgba(169, 169, 169, 0.2);
  z-index: -1;
}

.step.completed:not(:last-child)::after {
  background-color: #00c2cb;
}

.step-number {
  width: 1.75rem;
  height: 1.75rem;
  margin: 0 auto;
  border-radius: 50%;
  background-color: rgba(169, 169, 169, 0.15);
  color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
  margin-bottom: 0.375rem;
  transition: all 0.2s ease;
}

.step.active .step-number {
  background-color: #00c2cb;
  color: white;
  transform: scale(1.1);
}

.step.completed .step-number {
  background-color: #00c2cb;
  color: white;
}

.step-label {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 500;
}

.step.active .step-label {
  color: #00c2cb;
  font-weight: 700;
}

/* Validation Checks - Compact */
.validation-checks {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.validation-item {
  padding: 0.625rem 0.75rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.validation-item.success {
  background-color: rgba(0, 194, 203, 0.1);
  color: rgba(0, 0, 0, 0.8);
  border-color: rgba(0, 194, 203, 0.2);
}

.validation-item.error {
  background-color: rgba(165, 42, 42, 0.1);
  color: rgba(0, 0, 0, 0.8);
  border-color: rgba(165, 42, 42, 0.2);
}

.validation-item i {
  font-size: 1rem;
  flex-shrink: 0;
}

.validation-item.success i {
  color: #00c2cb;
}

.validation-item.error i {
  color: #a52a2a;
}

/* Summary Items - Compact */
.summary-item {
  padding: 0.625rem 0.75rem;
  background-color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.15);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.summary-item:hover {
  background-color: rgba(255, 255, 255, 1);
  border-color: rgba(169, 169, 169, 0.25);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.summary-item label {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 0.25rem;
  display: block;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.summary-item .value {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.summary-item small {
  font-size: 0.6875rem;
  margin-top: 0.125rem;
  display: block;
}

.modal-backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}

/* Modern Modal Styles - Compact */
.modern-modal-header {
  padding: 0.625rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 0;
  min-height: auto;
  position: relative;
}

.modern-modal-header-inner {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex: 1;
}

.modern-modal-icon-wrapper {
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modern-modal-icon-wrapper i {
  font-size: 1rem;
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
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-background);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.modern-modal-subtitle {
  font-size: 0.6875rem;
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
  width: 1.75rem;
  height: 1.75rem;
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
  font-size: 0.75rem;
}

/* Content Compact Styles */
h6 {
  font-size: 0.8125rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: rgba(0, 0, 0, 0.85);
}

.card {
  border: 1px solid rgba(169, 169, 169, 0.15);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.5);
}

.card-body {
  padding: 0.75rem;
}

.row.g-3 {
  --bs-gutter-x: 0.5rem;
  --bs-gutter-y: 0.5rem;
}

.form-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.form-control {
  font-size: 0.75rem;
  padding: 0.375rem 0.625rem;
  border: 1px solid rgba(169, 169, 169, 0.25);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.form-control:focus {
  border-color: #00c2cb;
  box-shadow: 0 0 0 0.15rem rgba(0, 194, 203, 0.15);
}

textarea.form-control {
  resize: vertical;
  min-height: 3.5rem;
}

.text-muted {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.5) !important;
}

hr {
  margin: 0.625rem 0;
  opacity: 0.15;
}

.fs-4 {
  font-size: 1rem !important;
}

.mt-3 {
  margin-top: 0.75rem !important;
}

.mb-3 {
  margin-bottom: 0.75rem !important;
}

.mb-4 {
  margin-bottom: 1rem !important;
}

/* Import btn-size from system */
.btn-size {
  font-size: small !important;
}
</style>
