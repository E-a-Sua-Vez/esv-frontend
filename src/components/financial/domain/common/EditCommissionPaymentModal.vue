<script>
import { ref, computed, onMounted } from 'vue';
import Spinner from '../../../common/Spinner.vue';
import Alert from '../../../common/Alert.vue';
import {
  updateCommissionPayment,
  getUnpaidIncomesByProfessional,
} from '../../../../application/services/professional-commission-payment';
import { getIncomesDetails } from '../../../../application/services/query-stack';
import { getDate } from '../../../../shared/utils/date';

export default {
  name: 'EditCommissionPaymentModal',
  components: { Spinner, Alert },
  props: {
    show: { type: Boolean, default: false },
    payment: { type: Object, required: true },
    commerce: { type: Object, required: true },
    business: { type: Object, required: false },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const loading = ref(false);
    const alertError = ref('');
    const currentIncomeIds = ref([]);
    const currentIncomeDetails = ref([]);
    const loadingCurrentIncomes = ref(false);
    const availableIncomes = ref([]);
    const incomeIdsToAdd = ref([]);
    const incomeIdsToRemove = ref([]);
    const notes = ref('');

    const totalToAdd = computed(() => incomeIdsToAdd.value.length);
    const totalToRemove = computed(() => incomeIdsToRemove.value.length);
    const finalTotal = computed(
      () => currentIncomeIds.value.length - totalToRemove.value + totalToAdd.value
    );

    const loadCurrentIncomeDetails = async () => {
      if (!props.commerce || !props.payment.incomeIds?.length) {
        console.log('[EditCommissionPaymentModal] Missing required data for loading income details');
        return;
      }

      try {
        loadingCurrentIncomes.value = true;

        console.log('[EditCommissionPaymentModal] Loading income details for payment:', props.payment.id);
        console.log('[EditCommissionPaymentModal] IncomeIds to load:', props.payment.incomeIds);

        // Convert period dates to YYYY-MM-DD format
        const periodFrom = props.payment.periodFrom
          ? new Date(props.payment.periodFrom).toISOString().split('T')[0]
          : '2020-01-01';
        const periodTo = props.payment.periodTo
          ? new Date(props.payment.periodTo).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        console.log('[EditCommissionPaymentModal] Period:', periodFrom, 'to', periodTo);

        // Use businessId if available, otherwise use commerceId
        const businessId = props.business?.id || props.commerce.id;

        // Fetch all incomes for the period and professional
        const allIncomes = await getIncomesDetails(
          businessId,                           // businessId
          props.commerce.id,                    // commerceId
          periodFrom,                           // from
          periodTo,                             // to
          [props.commerce.id],                  // commerceIds
          1,                                    // page
          10000,                                // limit
          undefined,                            // searchText
          true,                                 // asc
          undefined,                            // incomeStatus
          undefined,                            // fiscalNote
          undefined,                            // automatic
          undefined,                            // minAmount
          undefined,                            // maxAmount
          undefined,                            // incomeTypeFilter
          undefined,                            // paymentMethodFilter
          props.payment.professionalId          // professionalFilter
        );

        console.log('[EditCommissionPaymentModal] All incomes returned:', allIncomes?.length || 0);

        // Filter to only include incomes that are in the payment's incomeIds
        if (Array.isArray(allIncomes)) {
          currentIncomeDetails.value = allIncomes.filter(income => {
            const isIncluded = props.payment.incomeIds.includes(income.id);
            if (isIncluded) {
              console.log('[EditCommissionPaymentModal] Including income:', income.id, 'with commission:', income.professionalCommission);
            }
            return isIncluded;
          });
          console.log('[EditCommissionPaymentModal] Filtered income details:', currentIncomeDetails.value.length);
        } else {
          console.warn('[EditCommissionPaymentModal] No incomes returned or invalid format');
          currentIncomeDetails.value = [];
        }

        // If we couldn't get details, try alternative approach
        if (currentIncomeDetails.value.length === 0 && props.payment.incomeIds.length > 0) {
          console.log('[EditCommissionPaymentModal] Trying alternative approach to load income details');

          // Try without professional filter
          const allIncomesAlt = await getIncomesDetails(
            businessId,
            props.commerce.id,
            periodFrom,
            periodTo,
            [props.commerce.id],
            1,
            10000,
            undefined,
            true,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined  // No professional filter
          );

          if (Array.isArray(allIncomesAlt)) {
            currentIncomeDetails.value = allIncomesAlt.filter(income =>
              props.payment.incomeIds.includes(income.id)
            );
            console.log('[EditCommissionPaymentModal] Alternative approach found:', currentIncomeDetails.value.length, 'incomes');
          }
        }
      } catch (error) {
        console.error('[EditCommissionPaymentModal] Error loading current income details:', error);
        currentIncomeDetails.value = [];
      } finally {
        loadingCurrentIncomes.value = false;
      }
    };

    const loadAvailableIncomes = async () => {
      try {
        loading.value = true;
        availableIncomes.value = await getUnpaidIncomesByProfessional(
          props.payment.professionalId,
          props.commerce.id,
          null,
          null
        );
        loading.value = false;
      } catch (error) {
        console.error('Error loading available incomes:', error);
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const saveChanges = async () => {
      try {
        loading.value = true;

        await updateCommissionPayment(
          props.payment.id,
          incomeIdsToAdd.value.length > 0 ? incomeIdsToAdd.value : undefined,
          incomeIdsToRemove.value.length > 0 ? incomeIdsToRemove.value : undefined,
          notes.value || undefined
        );

        loading.value = false;
        emit('close');
      } catch (error) {
        console.error('Error updating payment:', error);
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const formatDate = date => getDate(date);
    const formatCurrency = amount =>
      Number(parseFloat(amount || 0).toFixed(2)).toLocaleString('de-DE');

    onMounted(async () => {
      console.log('[EditCommissionPaymentModal] onMounted - payment data:', props.payment);
      console.log('[EditCommissionPaymentModal] onMounted - commerce data:', props.commerce?.id);
      console.log('[EditCommissionPaymentModal] onMounted - business data:', props.business?.id);

      currentIncomeIds.value = [...props.payment.incomeIds];
      notes.value = props.payment.notes || '';

      console.log('[EditCommissionPaymentModal] onMounted - currentIncomeIds set to:', currentIncomeIds.value);

      await Promise.all([
        loadCurrentIncomeDetails(),
        loadAvailableIncomes()
      ]);
    });

    return {
      loading,
      alertError,
      currentIncomeIds,
      currentIncomeDetails,
      loadingCurrentIncomes,
      availableIncomes,
      incomeIdsToAdd,
      incomeIdsToRemove,
      notes,
      totalToAdd,
      totalToRemove,
      finalTotal,
      saveChanges,
      formatDate,
      formatCurrency,
    };
  },
};
</script>

<style scoped>
/* Modern Modal Content */
.edit-payment-modal {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Modern Header - matching product style */
.modal-header.border-0.centered.active-name {
  background-color: var(--azul-turno, #004aad);
  color: white !important;
  border-bottom: none !important;
  padding: 1rem 1.25rem !important;
  border-radius: 12px 12px 0 0 !important;
}

.modal-header.border-0.centered.active-name .modal-title {
  color: white !important;
  font-weight: 700 !important;
  font-size: 1rem;
  margin: 0 !important;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-header.border-0.centered.active-name .modal-title i {
  font-size: 1.125rem;
  color: white;
}

.modal-header.border-0.centered.active-name .btn-close {
  filter: invert(1) grayscale(100%) brightness(200%) !important;
  opacity: 0.9 !important;
  transition: opacity 0.2s ease;
}

.modal-header.border-0.centered.active-name .btn-close:hover {
  opacity: 1 !important;
}

/* Modal Body */
.edit-payment-modal-body {
  background: #f8f9fa !important;
  padding: 1.25rem !important;
}

/* Section Titles */
.edit-payment-section-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #000000;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-payment-section-title i {
  font-size: 1rem;
}

/* Tables */
.edit-payment-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.edit-payment-table thead th {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-bottom: 2px solid rgba(169, 169, 169, 0.2);
  padding: 0.75rem 0.5rem;
  background: rgba(0, 74, 173, 0.05);
}

.edit-payment-table tbody td {
  padding: 0.75rem 0.5rem;
  vertical-align: middle;
  font-size: 0.875rem;
}

.edit-payment-table tbody tr:hover {
  background-color: rgba(0, 74, 173, 0.03);
}

.income-id-code {
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.05);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #004aad;
}

/* Summary Card */
.edit-payment-summary-card {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%);
  border-left: 4px solid #f9c322;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.edit-payment-summary-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #000000;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.edit-payment-summary-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.edit-payment-summary-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #000000;
}

.edit-payment-summary-item i {
  font-size: 1rem;
  flex-shrink: 0;
}

.edit-payment-summary-item strong {
  font-weight: 700;
  margin-left: 0.25rem;
}

/* Form Elements */
.edit-payment-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 0.5rem;
}

.edit-payment-textarea {
  border-radius: 8px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.edit-payment-textarea:focus {
  border-color: #004aad;
  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);
}

/* Modal Footer */
.edit-payment-modal-footer {
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
  .edit-payment-modal-footer {
    flex-direction: column;
  }

  .edit-payment-modal-footer .btn {
    width: 100%;
  }
}
</style>

<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5)">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content edit-payment-modal">
        <!-- Modern Header -->
        <div class="modal-header border-0 centered active-name">
          <h5 class="modal-title fw-bold">
            <i class="bi bi-pencil"></i> {{ $t('commissionPayments.editPayment') }}
          </h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>

        <div class="modal-body edit-payment-modal-body">
          <Spinner :show="loading" />

          <!-- Incomes Actuales -->
          <div class="mb-4">
            <h6 class="edit-payment-section-title">
              <i class="bi bi-list-check text-primary"></i>
              {{ $t('commissionPayments.currentIncomes') }}
            </h6>

            <!-- Loading State -->
            <div v-if="loadingCurrentIncomes" class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Carregando...</span>
              </div>
            </div>

            <!-- Table with Details -->
            <div v-if="!loadingCurrentIncomes && currentIncomeDetails.length > 0" class="table-responsive">
              <table class="table table-sm edit-payment-table">
                <thead>
                  <tr>
                    <th style="width: 50px;">
                      <i class="bi bi-trash text-danger"></i>
                    </th>
                    <th>{{ $t('commissionPayments.date') }}</th>
                    <th>{{ $t('commissionPayments.type') }}</th>
                    <th>{{ $t('client') || $t('commissionPayments.client') || 'Cliente' }}</th>
                    <th class="text-end">{{ $t('commissionPayments.amount') }}</th>
                    <th class="text-end">{{ $t('commissionPayments.commission') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="income in currentIncomeDetails" :key="income.id">
                    <td>
                      <input type="checkbox" v-model="incomeIdsToRemove" :value="income.id" />
                    </td>
                    <td>
                      <small>{{ formatDate(income.paidAt || income.createdDate || income.paymentDate) }}</small>
                    </td>
                    <td>
                      <span class="badge bg-info">
                        {{ $t(`incomeTypes.${income.type}`) }}
                      </span>
                    </td>
                    <td>
                      <small class="fw-bold">
                        {{ income.userName || income.userIdNumber || '-' }}
                      </small>
                    </td>
                    <td class="text-end fw-bold">
                      ${{ formatCurrency(income.totalAmount || income.amount) }}
                    </td>
                    <td class="text-end text-success fw-bold">
                      ${{ formatCurrency(income.professionalCommission) }}
                      <i v-if="income?.commissionPaid === true || income?.commissionPaid === 'true' || income?.commissionPaid === 1" class="bi bi-check-circle-fill text-success ms-2" :title="$t('commissionPayments.commissionPaid')"></i>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Fallback: Show IDs if details not available -->
            <div v-if="!loadingCurrentIncomes && currentIncomeDetails.length === 0 && currentIncomeIds.length > 0" class="table-responsive">
              <table class="table table-sm edit-payment-table">
                <thead>
                  <tr>
                    <th style="width: 50px;">
                      <i class="bi bi-trash text-danger"></i>
                    </th>
                    <th>{{ $t('commissionPayments.incomeId') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="incomeId in currentIncomeIds" :key="incomeId">
                    <td>
                      <input type="checkbox" v-model="incomeIdsToRemove" :value="incomeId" />
                    </td>
                    <td>
                      <code class="income-id-code">{{ incomeId }}</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Incomes Disponibles para Agregar -->
          <div v-if="availableIncomes.length > 0" class="mb-4">
            <h6 class="edit-payment-section-title">
              <i class="bi bi-plus-circle text-success"></i>
              {{ $t('commissionPayments.availableIncomes') }}
            </h6>
            <div class="table-responsive">
              <table class="table table-sm table-hover edit-payment-table">
                <thead>
                  <tr>
                    <th style="width: 50px;">
                      <i class="bi bi-plus-circle text-success"></i>
                    </th>
                    <th>{{ $t('commissionPayments.date') }}</th>
                    <th>{{ $t('commissionPayments.type') }}</th>
                    <th class="text-end">{{ $t('commissionPayments.amount') }}</th>
                    <th class="text-end">{{ $t('commissionPayments.commission') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="income in availableIncomes" :key="income.id">
                    <td>
                      <input type="checkbox" v-model="incomeIdsToAdd" :value="income.id" />
                    </td>
                    <td>
                      <small>{{ formatDate(income.createdAt) }}</small>
                    </td>
                    <td>
                      <span class="badge bg-info">
                        {{ $t(`incomeTypes.${income.type}`) }}
                      </span>
                    </td>
                    <td class="text-end fw-bold">
                      ${{ formatCurrency(income.amount) }}
                    </td>
                    <td class="text-end text-success fw-bold">
                      ${{ formatCurrency(income.professionalCommission) }}
                      <i v-if="income?.commissionPaid === true || income?.commissionPaid === 'true' || income?.commissionPaid === 1" class="bi bi-check-circle-fill text-success ms-2" :title="$t('commissionPayments.commissionPaid')"></i>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Resumen de Cambios -->
          <div class="edit-payment-summary-card">
            <h6 class="edit-payment-summary-title">
              <i class="bi bi-info-circle text-primary"></i>
              {{ $t('commissionPayments.changesSummary') }}
            </h6>
            <div class="edit-payment-summary-items">
              <div v-if="totalToRemove > 0" class="edit-payment-summary-item">
                <i class="bi bi-dash-circle text-danger"></i>
                <span>{{ $t('commissionPayments.toRemove') }}:</span>
                <strong>{{ totalToRemove }}</strong>
              </div>
              <div v-if="totalToAdd > 0" class="edit-payment-summary-item">
                <i class="bi bi-plus-circle text-success"></i>
                <span>{{ $t('commissionPayments.toAdd') }}:</span>
                <strong>{{ totalToAdd }}</strong>
              </div>
              <div class="edit-payment-summary-item">
                <i class="bi bi-info-circle text-primary"></i>
                <span>{{ $t('commissionPayments.finalTotal') }}:</span>
                <strong>{{ finalTotal }}</strong>
              </div>
            </div>
          </div>

          <!-- Notas -->
          <div class="mb-3">
            <label class="form-label edit-payment-label fw-bold">
              {{ $t('commissionPayments.notes') }}
            </label>
            <textarea
              v-model="notes"
              class="form-control edit-payment-textarea"
              rows="3"
              :placeholder="$t('commissionPayments.notesPlaceholder')"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer edit-payment-modal-footer">
          <button
            type="button"
            class="btn btn-sm btn-size fw-bold btn-outline-secondary rounded-pill px-4"
            @click="$emit('close')"
          >
            {{ $t('commissionPayments.cancel') }}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-4"
            @click="saveChanges"
            :disabled="
              loading || (totalToAdd === 0 && totalToRemove === 0 && notes === payment.notes)
            "
          >
            <i class="bi bi-save"></i> {{ $t('commissionPayments.saveChanges') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
