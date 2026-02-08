<script>
import { ref, computed, watch, onMounted } from 'vue';
import { getDate } from '../../../../shared/utils/date';
import { getIncomesDetails } from '../../../../application/services/query-stack';
import { downloadCommissionPaymentPdf } from '../../../../application/services/professional-commission-payment';

export default {
  name: 'CommissionPaymentCard',
  props: {
    payment: { type: Object, required: true },
    professionals: { type: Array, default: () => [] },
    commerce: { type: Object, required: false },
    business: { type: Object, required: false },
    autoExpand: { type: Boolean, default: false }, // Auto-expand details when true
  },
  emits: ['edit', 'confirm', 'cancel', 'downloadPdf', 'view-outcome'],
  setup(props, { emit }) {
    const showDetails = ref(false);
    const loadingIncomes = ref(false);
    const incomeDetails = ref([]);
    const downloadingPdf = ref(false);

    const professional = computed(() =>
      props.professionals.find(p => p.id === props.payment.professionalId)
    );

    const statusColor = computed(() => {
      switch (props.payment.status) {
        case 'CREATED':
          return 'warning';
        case 'PAID':
          return 'success';
        case 'CANCELLED':
          return 'danger';
        default:
          return 'secondary';
      }
    });

    const formatDate = date => getDate(date);

    const formatCurrency = amount =>
      Number(parseFloat(amount || 0).toFixed(2)).toLocaleString('de-DE');

    const loadIncomeDetails = async () => {
      if (!props.commerce || !props.business || !props.payment.incomeIds?.length) {
        return;
      }

      try {
        loadingIncomes.value = true;

        // Convert period dates to YYYY-MM-DD format
        const periodFrom = props.payment.periodFrom
          ? new Date(props.payment.periodFrom).toISOString().split('T')[0]
          : null;
        const periodTo = props.payment.periodTo
          ? new Date(props.payment.periodTo).toISOString().split('T')[0]
          : null;

        // Fetch all incomes for the period and professional
        const allIncomes = await getIncomesDetails(
          props.business.id, // businessId
          props.commerce.id, // commerceId
          periodFrom || '2020-01-01', // from
          periodTo || new Date().toISOString().split('T')[0], // to
          [props.commerce.id], // commerceIds
          1, // page
          10000, // limit (large limit to get all incomes)
          undefined, // searchText
          true, // asc
          undefined, // incomeStatus
          undefined, // fiscalNote
          undefined, // automatic
          undefined, // commissionPaid
          undefined, // minAmount
          undefined, // maxAmount
          undefined, // incomeTypeFilter
          undefined, // paymentMethodFilter
          props.payment.professionalId // professionalFilter
        );

        // Filter to only include incomes that are in the payment's incomeIds
        if (Array.isArray(allIncomes)) {
          incomeDetails.value = allIncomes.filter(income =>
            props.payment.incomeIds.includes(income.id)
          );
        } else {
          console.warn('[CommissionPaymentCard] allIncomes is not an array:', allIncomes);
          incomeDetails.value = [];
        }
      } catch (error) {
        console.error('[CommissionPaymentCard] Error loading income details:', error);
        incomeDetails.value = [];
      } finally {
        loadingIncomes.value = false;
      }
    };

    const toggleDetails = () => {
      const wasExpanded = showDetails.value;
      showDetails.value = !showDetails.value;

      // Always reload income details when expanding (to get fresh data)
      if (showDetails.value) {
        // Clear previous data and reload
        incomeDetails.value = [];
        loadIncomeDetails();
      }
    };

    // Method to reset details (called from parent when refreshing)
    const resetDetails = () => {
      showDetails.value = false;
      incomeDetails.value = [];
    };

    // Watch payment prop to reset when payment changes (e.g., after refresh)
    watch(
      () => props.payment.id,
      () => {
        resetDetails();
      },
      { immediate: false }
    );

    // Watch autoExpand prop to auto-load details when component is shown in expanded row
    watch(
      () => props.autoExpand,
      newVal => {
        if (newVal) {
          showDetails.value = true;
          // Small delay to ensure component is fully mounted
          setTimeout(() => {
            loadIncomeDetails();
          }, 100);
        }
      },
      { immediate: true }
    );

    // Watch showDetails to load when it becomes true
    watch(
      () => showDetails.value,
      newVal => {
        if (newVal && incomeDetails.value.length === 0 && !loadingIncomes.value) {
          loadIncomeDetails();
        }
      }
    );

    // Auto-load details on mount if autoExpand is true
    onMounted(() => {
      if (props.autoExpand) {
        showDetails.value = true;
        // Use nextTick to ensure DOM is ready
        setTimeout(() => {
          loadIncomeDetails();
        }, 200);
      }
    });

    // Handle PDF download
    const handleDownloadPdf = async () => {
      if (!props.payment?.id || !props.commerce?.id) {
        console.error('[CommissionPaymentCard] Cannot download PDF - missing payment or commerce');
        return;
      }

      try {
        downloadingPdf.value = true;
        const blob = await downloadCommissionPaymentPdf(props.payment.id, props.commerce.id);

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `commission-payment-${props.payment.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('[CommissionPaymentCard] Error downloading PDF:', error);
        alert('Error al descargar el PDF. Por favor, intente nuevamente.');
      } finally {
        downloadingPdf.value = false;
      }
    };

    return {
      showDetails,
      professional,
      statusColor,
      formatDate,
      formatCurrency,
      toggleDetails,
      resetDetails,
      loadingIncomes,
      incomeDetails,
      loadIncomeDetails, // Expose for manual retry
      downloadingPdf,
      handleDownloadPdf,
    };
  },
};
</script>

<template>
  <div class="modern-card p-3" :class="{ 'commission-paid-card': payment.status === 'PAID' }">
    <!-- Header -->
    <div class="row align-items-center mb-3">
      <div class="col-md-6">
        <div class="d-flex align-items-center gap-2 mb-2">
          <div
            class="commission-icon-container"
            :class="{ 'commission-paid-icon': payment.status === 'PAID' }"
          >
            <i
              class="bi"
              :class="payment.status === 'PAID' ? 'bi-check-circle-fill' : 'bi-person-badge'"
            ></i>
          </div>
          <div>
            <h5 class="mb-0 commission-professional-name">
              {{ professional?.personalInfo?.name || professional?.name || payment.professionalId }}
            </h5>
            <div class="d-flex align-items-center gap-2 mt-1">
              <span class="badge commission-status-badge" :class="`bg-${statusColor}`">
                {{ $t(`commissionPayments.status.${payment.status}`) }}
              </span>
              <span v-if="payment.status === 'PAID'" class="badge bg-success commission-paid-badge">
                <i class="bi bi-check-circle"></i>
                {{ $t('commissionPayments.commissionPaid') || 'Comissão Paga' }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-6 text-end">
        <h3 class="text-success mb-0 commission-total">
          ${{ formatCurrency(payment.totalCommission) }}
        </h3>
        <small class="text-muted commission-label">{{
          $t('commissionPayments.totalCommission')
        }}</small>
      </div>
    </div>

    <!-- Info Grid -->
    <div class="row g-3 mb-3">
      <div class="col-md-3">
        <div class="commission-info-item">
          <small class="commission-info-label">{{ $t('commissionPayments.period') }}</small>
          <p class="mb-0 commission-info-value">
            {{ formatDate(payment.periodFrom) }}<br />
            {{ formatDate(payment.periodTo) }}
          </p>
        </div>
      </div>
      <div class="col-md-3">
        <div class="commission-info-item">
          <small class="commission-info-label">{{ $t('commissionPayments.incomes') }}</small>
          <p class="mb-0 commission-info-value fw-bold">{{ payment.totalIncomes }}</p>
        </div>
      </div>
      <div class="col-md-3">
        <div class="commission-info-item">
          <small class="commission-info-label">{{ $t('commissionPayments.totalAmount') }}</small>
          <p class="mb-0 commission-info-value fw-bold">
            ${{ formatCurrency(payment.totalAmount) }}
          </p>
        </div>
      </div>
      <div class="col-md-3">
        <div class="commission-info-item">
          <small class="commission-info-label">{{ $t('commissionPayments.createdAt') }}</small>
          <p class="mb-0 commission-info-value">{{ formatDate(payment.createdAt) }}</p>
        </div>
      </div>
    </div>

    <!-- Notas -->
    <div v-if="payment.notes" class="row mb-3">
      <div class="col-12">
        <div class="commission-notes-card">
          <strong class="commission-notes-label">{{ $t('commissionPayments.notes') }}:</strong>
          <span class="commission-notes-text">{{ payment.notes }}</span>
        </div>
      </div>
    </div>

    <!-- Info de Pago (si está pagado) -->
    <div v-if="payment.status === 'PAID'" class="row mb-3">
      <div class="col-12">
        <div class="commission-payment-info-card">
          <div class="row g-3">
            <div class="col-md-3">
              <div class="commission-info-item">
                <strong class="commission-info-label"
                  >{{ $t('commissionPayments.paidAt') }}:</strong
                >
                <span class="commission-info-value">{{ formatDate(payment.paidAt) }}</span>
              </div>
            </div>
            <div class="col-md-3">
              <div class="commission-info-item">
                <strong class="commission-info-label"
                  >{{ $t('commissionPayments.paymentMethod') }}:</strong
                >
                <span class="commission-info-value">{{
                  $t(`paymentClientMethods.${payment.paymentMethod}`)
                }}</span>
              </div>
            </div>
            <div v-if="payment.paymentNotes" class="col-md-3">
              <div class="commission-info-item">
                <strong class="commission-info-label"
                  >{{ $t('commissionPayments.paymentNotes') }}:</strong
                >
                <span class="commission-info-value">{{ payment.paymentNotes }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Info de Cancelación -->
    <div v-if="payment.status === 'CANCELLED'" class="row mb-3">
      <div class="col-12">
        <div class="commission-cancellation-info-card">
          <div class="row g-3">
            <div class="col-md-6">
              <div class="commission-info-item">
                <strong class="commission-info-label"
                  >{{ $t('commissionPayments.cancelledAt') }}:</strong
                >
                <span class="commission-info-value">{{ formatDate(payment.cancelledAt) }}</span>
              </div>
            </div>
            <div class="col-md-6">
              <div class="commission-info-item">
                <strong class="commission-info-label"
                  >{{ $t('commissionPayments.cancellationReason') }}:</strong
                >
                <span class="commission-info-value">{{ payment.cancellationReason }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Acciones -->
    <div class="row mt-3">
      <div class="col-12">
        <div class="commission-actions-group">
          <button
            @click="toggleDetails"
            class="btn btn-sm btn-size fw-bold btn-outline-primary rounded-pill px-3"
          >
            <i class="bi" :class="showDetails ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
            {{
              showDetails
                ? $t('commissionPayments.hideDetails')
                : $t('commissionPayments.showDetails')
            }}
          </button>

          <button
            v-if="payment.status === 'CREATED'"
            @click="$emit('edit', payment)"
            class="btn btn-sm btn-size fw-bold btn-outline-warning rounded-pill px-3"
          >
            <i class="bi bi-pencil"></i> {{ $t('commissionPayments.editPayment') }}
          </button>

          <button
            v-if="payment.status === 'CREATED'"
            @click="$emit('confirm', payment)"
            class="btn btn-sm btn-size fw-bold btn-success rounded-pill px-3"
          >
            <i class="bi bi-check-circle"></i> {{ $t('commissionPayments.confirmPayment') }}
          </button>

          <button
            v-if="payment.status === 'CREATED'"
            @click="$emit('cancel', payment)"
            class="btn btn-sm btn-size fw-bold btn-outline-danger rounded-pill px-3"
          >
            <i class="bi bi-x-circle"></i> {{ $t('commissionPayments.cancelPayment') }}
          </button>

          <button
            @click="handleDownloadPdf"
            class="btn btn-sm btn-size fw-bold btn-outline-primary rounded-pill px-3"
            :disabled="downloadingPdf"
          >
            <span
              v-if="downloadingPdf"
              class="spinner-border spinner-border-sm me-1"
              role="status"
              aria-hidden="true"
            ></span>
            <i v-else class="bi bi-file-earmark-pdf-fill"></i>
            {{
              downloadingPdf
                ? $t('commissionPayments.downloading')
                : $t('commissionPayments.downloadPdf')
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Detalles Expandibles -->
    <div v-if="showDetails" class="row mt-3">
      <div class="col-12">
        <div class="commission-details-card">
          <div class="commission-details-header">
            <h6 class="mb-0">
              <i class="bi bi-list-ul"></i> {{ $t('commissionPayments.includedIncomes') }}
            </h6>
          </div>
          <div class="commission-details-body">
            <p class="text-muted mb-3">
              {{ $t('commissionPayments.incomeIdsCount', { count: payment.incomeIds.length }) }}
            </p>

            <!-- Loading State -->
            <div v-if="loadingIncomes" class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Carregando...</span>
              </div>
              <small class="d-block mt-2 text-muted">{{
                $t('commissionPayments.loading') || 'Carregando receitas...'
              }}</small>
            </div>

            <!-- Income Details Table -->
            <div v-else-if="incomeDetails && incomeDetails.length > 0" class="table-responsive">
              <table class="table table-sm table-hover">
                <thead>
                  <tr>
                    <th style="width: 80px">#</th>
                    <th>{{ $t('commissionPayments.date') }}</th>
                    <th>{{ $t('commissionPayments.type') }}</th>
                    <th>{{ $t('client') || $t('commissionPayments.client') || 'Cliente' }}</th>
                    <th class="text-end">{{ $t('commissionPayments.amount') }}</th>
                    <th class="text-end">{{ $t('commissionPayments.commission') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(income, index) in incomeDetails" :key="income.id">
                    <td class="text-muted">{{ index + 1 }}</td>
                    <td>
                      <small>{{
                        formatDate(income.paidAt || income.createdDate || income.paymentDate)
                      }}</small>
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
                      <i
                        v-if="
                          income?.commissionPaid === true ||
                          income?.commissionPaid === 'true' ||
                          income?.commissionPaid === 1
                        "
                        class="bi bi-check-circle-fill text-success ms-2"
                        :title="$t('commissionPayments.commissionPaid')"
                      ></i>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="table-light">
                    <td colspan="4" class="text-end fw-bold">
                      {{ $t('commissionPayments.totalAmount') }}:
                    </td>
                    <td class="text-end fw-bold">
                      ${{
                        formatCurrency(
                          incomeDetails.reduce(
                            (sum, inc) => sum + parseFloat(inc.totalAmount || inc.amount || 0),
                            0
                          )
                        )
                      }}
                    </td>
                    <td class="text-end text-success fw-bold">
                      ${{
                        formatCurrency(
                          incomeDetails.reduce(
                            (sum, inc) => sum + parseFloat(inc.professionalCommission || 0),
                            0
                          )
                        )
                      }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Fallback: Show IDs if details not available -->
            <div v-else class="income-ids-container">
              <div class="alert alert-warning mb-2">
                <small>
                  <i class="bi bi-exclamation-triangle"></i>
                  {{
                    $t('commissionPayments.incomeDetailsNotAvailable') ||
                    'Detalhes das receitas não disponíveis. Tentando carregar...'
                  }}
                </small>
              </div>
              <span
                v-for="(incomeId, index) in payment.incomeIds"
                :key="incomeId"
                class="badge bg-secondary me-1 mb-1"
              >
                {{ index + 1 }}. {{ incomeId.substring(0, 8) }}...
              </span>
              <div class="mt-2">
                <button
                  @click="loadIncomeDetails"
                  class="btn btn-sm btn-outline-primary"
                  :disabled="loadingIncomes"
                >
                  <i class="bi bi-arrow-clockwise"></i>
                  {{ $t('commissionPayments.retry') || 'Tentar Novamente' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modern Card - matching product style */
.modern-card {
  border-left: 4px solid #004aad;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

/* Paid status - green border */
.commission-paid-card {
  border-left: 4px solid #00c2cb !important;
}

.modern-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #00c2cb 0%, #00c4cc 50%, #00c2cb 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.modern-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(169, 169, 169, 0.3);
}

.modern-card:hover::before {
  opacity: 0.6;
}

/* Commission Icon Container */
.commission-icon-container {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(0, 74, 173, 0.12);
  color: #004aad;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.commission-icon-container i {
  font-size: 1.25rem;
}

.commission-paid-icon {
  background: rgba(0, 194, 203, 0.2) !important;
  color: #00c2cb !important;
}

.commission-paid-badge {
  font-size: 0.75rem;
  padding: 4px 10px;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.commission-paid-badge i {
  font-size: 0.875rem;
}

.commission-outcome-link {
  color: #004aad;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s ease;
}

.commission-outcome-link:hover {
  color: #00c2cb;
  text-decoration: underline;
}

.commission-outcome-link i {
  font-size: 1rem;
}

/* Professional Name */
.commission-professional-name {
  font-size: 1rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

/* Status Badge */
.commission-status-badge {
  border-radius: 10px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Commission Total */
.commission-total {
  font-size: 1.75rem;
  font-weight: 700;
  color: #00c2cb;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.commission-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Info Items */
.commission-info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.commission-info-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: block;
}

.commission-info-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #000000;
  line-height: 1.4;
}

/* Notes Card */
.commission-notes-card {
  background: rgba(0, 74, 173, 0.05);
  border-left: 3px solid #004aad;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.commission-notes-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  margin-right: 0.5rem;
}

.commission-notes-text {
  font-size: 0.875rem;
  color: #000000;
}

/* Payment Info Card */
.commission-payment-info-card {
  background: rgba(0, 194, 203, 0.05);
  border-left: 3px solid #00c2cb;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

/* Cancellation Info Card */
.commission-cancellation-info-card {
  background: rgba(165, 42, 42, 0.05);
  border-left: 3px solid #a52a2a;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

/* Actions Group */
.commission-actions-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

/* Details Card */
.commission-details-card {
  background: rgba(250, 251, 252, 0.98);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 8px;
  overflow: hidden;
}

.commission-details-header {
  background: rgba(0, 74, 173, 0.05);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.2);
}

.commission-details-header h6 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.commission-details-body {
  padding: 1rem;
}

.income-ids-container {
  max-height: 200px;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.income-ids-container .badge {
  font-size: 0.75rem;
  padding: 0.375rem 0.625rem;
  border-radius: 6px;
}

/* Income Details Table */
.commission-details-body .table {
  margin-bottom: 0;
  font-size: 0.875rem;
}

.commission-details-body .table thead th {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-bottom: 2px solid rgba(169, 169, 169, 0.2);
  padding: 0.75rem 0.5rem;
}

.commission-details-body .table tbody td {
  padding: 0.75rem 0.5rem;
  vertical-align: middle;
}

.commission-details-body .table tfoot td {
  padding: 0.75rem 0.5rem;
  border-top: 2px solid rgba(169, 169, 169, 0.2);
}

.commission-details-body .table tbody tr:hover {
  background-color: rgba(0, 74, 173, 0.03);
}

/* Button Size */
.btn-size {
  font-size: 0.8125rem;
}

@media (max-width: 768px) {
  .commission-actions-group {
    flex-direction: column;
    align-items: stretch;
  }

  .commission-actions-group .btn {
    width: 100%;
  }
}
</style>
