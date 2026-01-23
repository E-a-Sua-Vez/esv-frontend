<script>
import { ref, reactive, computed, onMounted } from 'vue';
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import Message from '../../common/Message.vue';
import CommissionPaymentCard from './common/CommissionPaymentCard.vue';
import EditCommissionPaymentModal from './common/EditCommissionPaymentModal.vue';
import ConfirmCommissionPaymentModal from './common/ConfirmCommissionPaymentModal.vue';
import CancelCommissionPaymentModal from './common/CancelCommissionPaymentModal.vue';
import { getProfessionalsByCommerce } from '../../../application/services/professional';
import {
  getCommissionPaymentsByCommerce,
  getUnpaidIncomesByProfessional,
  createCommissionPayment,
} from '../../../application/services/professional-commission-payment';
import { getDate } from '../../../shared/utils/date';

export default {
  name: 'CommissionPaymentsManagement',
  components: {
    Spinner,
    Alert,
    Message,
    CommissionPaymentCard,
    EditCommissionPaymentModal,
    ConfirmCommissionPaymentModal,
    CancelCommissionPaymentModal,
  },
  props: {
    commerce: { type: Object, required: true },
    business: { type: Object, required: true },
    toggles: { type: Object, default: undefined },
  },
  setup(props) {
    const loading = ref(false);
    const alertError = ref(null);
    const activeTab = ref('create'); // create, created, paid, cancelled
    const professionals = ref([]);
    const allPayments = ref([]);

    // Filtros para crear nuevo pago
    const selectedProfessionalId = ref(null);
    const periodFrom = ref(null);
    const periodTo = ref(null);
    const unpaidIncomes = ref([]);
    const selectedIncomeIds = ref([]);
    const notes = ref('');

    // Modales
    const showEditModal = ref(false);
    const showConfirmModal = ref(false);
    const showCancelModal = ref(false);
    const selectedPayment = ref(null);

    const createdPayments = computed(() =>
      allPayments.value.filter(p => p.status === 'CREATED')
    );

    const paidPayments = computed(() =>
      allPayments.value.filter(p => p.status === 'PAID')
    );

    const cancelledPayments = computed(() =>
      allPayments.value.filter(p => p.status === 'CANCELLED')
    );

    const selectedProfessional = computed(() =>
      professionals.value.find(p => p.id === selectedProfessionalId.value)
    );

    const totalAmount = computed(() => {
      const selected = unpaidIncomes.value.filter(inc => selectedIncomeIds.value.includes(inc.id));
      return selected.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    });

    const totalCommission = computed(() => {
      const selected = unpaidIncomes.value.filter(inc => selectedIncomeIds.value.includes(inc.id));
      return selected.reduce((sum, inc) => sum + (inc.professionalCommission || 0), 0);
    });

    const loadProfessionals = async () => {
      try {
        professionals.value = await getProfessionalsByCommerce(props.commerce.id);
      } catch (error) {
        console.error('Error loading professionals:', error);
      }
    };

    const loadPayments = async () => {
      try {
        loading.value = true;
        allPayments.value = await getCommissionPaymentsByCommerce(props.commerce.id);
        loading.value = false;
      } catch (error) {
        console.error('Error loading payments:', error);
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const searchUnpaidIncomes = async () => {
      if (!selectedProfessionalId.value) {
        alertError.value = 'SELECT_PROFESSIONAL';
        return;
      }

      try {
        loading.value = true;
        const from = periodFrom.value ? new Date(periodFrom.value).toISOString() : null;
        const to = periodTo.value ? new Date(periodTo.value).toISOString() : null;

        unpaidIncomes.value = await getUnpaidIncomesByProfessional(
          selectedProfessionalId.value,
          props.commerce.id,
          from,
          to
        );

        selectedIncomeIds.value = [];
        loading.value = false;
      } catch (error) {
        console.error('Error searching unpaid incomes:', error);
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const selectAll = (event) => {
      if (event.target.checked) {
        selectedIncomeIds.value = unpaidIncomes.value.map(inc => inc.id);
      } else {
        selectedIncomeIds.value = [];
      }
    };

    const createPayment = async () => {
      if (selectedIncomeIds.value.length === 0) {
        alertError.value = 'SELECT_AT_LEAST_ONE';
        return;
      }

      try {
        loading.value = true;

        await createCommissionPayment(
          props.commerce.id,
          props.business.id,
          selectedProfessionalId.value,
          selectedIncomeIds.value,
          periodFrom.value || new Date().toISOString(),
          periodTo.value || new Date().toISOString(),
          notes.value
        );

        // Reset form
        selectedIncomeIds.value = [];
        unpaidIncomes.value = [];
        notes.value = '';

        await loadPayments();
        activeTab.value = 'created';
        loading.value = false;
      } catch (error) {
        console.error('Error creating payment:', error);
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const openEditModal = (payment) => {
      selectedPayment.value = payment;
      showEditModal.value = true;
    };

    const openConfirmModal = (payment) => {
      selectedPayment.value = payment;
      showConfirmModal.value = true;
    };

    const openCancelModal = (payment) => {
      selectedPayment.value = payment;
      showCancelModal.value = true;
    };

    const handleModalClose = async () => {
      showEditModal.value = false;
      showConfirmModal.value = false;
      showCancelModal.value = false;
      selectedPayment.value = null;
      await loadPayments();
    };

    const formatDate = (date) => {
      return getDate(date);
    };

    const formatCurrency = (amount) => {
      return Number(parseFloat(amount || 0).toFixed(2)).toLocaleString('de-DE');
    };

    onMounted(async () => {
      await loadProfessionals();
      await loadPayments();
    });

    return {
      loading,
      alertError,
      activeTab,
      professionals,
      selectedProfessionalId,
      periodFrom,
      periodTo,
      unpaidIncomes,
      selectedIncomeIds,
      notes,
      createdPayments,
      paidPayments,
      cancelledPayments,
      selectedProfessional,
      totalAmount,
      totalCommission,
      showEditModal,
      showConfirmModal,
      showCancelModal,
      selectedPayment,
      searchUnpaidIncomes,
      selectAll,
      createPayment,
      openEditModal,
      openConfirmModal,
      openCancelModal,
      handleModalClose,
      formatDate,
      formatCurrency,
    };
  },
};
</script>

<template>
  <div>
    <Spinner :show="loading" />
    <Alert :show="alertError !== null && alertError !== ''" :message="alertError" />

    <!-- Tabs con estilo moderno -->
    <div class="row mb-3">
      <div class="col-12">
        <div class="modern-tabs">
          <button
            class="tab-button"
            :class="{ active: activeTab === 'create' }"
            @click="activeTab = 'create'"
          >
            <i class="bi bi-plus-circle"></i>
            <span>{{ $t('commissionPayments.createNew') }}</span>
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'created' }"
            @click="activeTab = 'created'"
          >
            <i class="bi bi-clock"></i>
            <span>{{ $t('commissionPayments.created') }}</span>
            <span v-if="createdPayments.length > 0" class="badge bg-warning ms-1">
              {{ createdPayments.length }}
            </span>
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'paid' }"
            @click="activeTab = 'paid'"
          >
            <i class="bi bi-check-circle"></i>
            <span>{{ $t('commissionPayments.paid') }}</span>
            <span v-if="paidPayments.length > 0" class="badge bg-success ms-1">
              {{ paidPayments.length }}
            </span>
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'cancelled' }"
            @click="activeTab = 'cancelled'"
          >
            <i class="bi bi-x-circle"></i>
            <span>{{ $t('commissionPayments.cancelled') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Tab: Crear Nuevo Pago -->
    <div v-if="activeTab === 'create'" class="row">
      <div class="col-12">
        <div class="metric-card">
          <div class="row">
            <div class="col-12 col-md-4 mb-3">
              <label class="form-label metric-card-subtitle fw-bold">
                {{ $t('commissionPayments.selectProfessional') }}
              </label>
              <select v-model="selectedProfessionalId" class="form-control metric-controls">
                <option :value="null">{{ $t('commissionPayments.selectProfessional') }}</option>
                <option v-for="prof in professionals" :key="prof.id" :value="prof.id">
                  {{ prof.personalInfo?.name || prof.name || 'Sin nombre' }}
                </option>
              </select>
            </div>

            <div class="col-12 col-md-3 mb-3">
              <label class="form-label metric-card-subtitle fw-bold">
                {{ $t('commissionPayments.dateFrom') }}
              </label>
              <input
                type="date"
                v-model="periodFrom"
                class="form-control metric-controls"
              />
            </div>

            <div class="col-12 col-md-3 mb-3">
              <label class="form-label metric-card-subtitle fw-bold">
                {{ $t('commissionPayments.dateTo') }}
              </label>
              <input
                type="date"
                v-model="periodTo"
                class="form-control metric-controls"
              />
            </div>

            <div class="col-12 col-md-2 mb-3 d-flex align-items-end">
              <button
                @click="searchUnpaidIncomes"
                class="btn btn-md btn-dark fw-bold rounded-pill w-100"
                :disabled="!selectedProfessionalId"
              >
                <i class="bi bi-search"></i> {{ $t('commissionPayments.search') }}
              </button>
            </div>
          </div>

          <!-- Tabla de Incomes Pendientes -->
          <div v-if="unpaidIncomes.length > 0" class="mt-4">
            <h5 class="metric-card-title">
              <i class="bi bi-list-check"></i> {{ $t('commissionPayments.selectedIncomes') }}
            </h5>

            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        @change="selectAll"
                        :checked="selectedIncomeIds.length === unpaidIncomes.length && unpaidIncomes.length > 0"
                      />
                    </th>
                    <th>{{ $t('commissionPayments.date') }}</th>
                    <th>{{ $t('commissionPayments.type') }}</th>
                    <th>{{ $t('commissionPayments.amount') }}</th>
                    <th>{{ $t('commissionPayments.commission') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="income in unpaidIncomes" :key="income.id">
                    <td>
                      <input
                        type="checkbox"
                        v-model="selectedIncomeIds"
                        :value="income.id"
                      />
                    </td>
                    <td>{{ formatDate(income.createdAt) }}</td>
                    <td>
                      <span class="badge bg-info">
                        {{ $t(`incomeTypes.${income.type}`) }}
                      </span>
                    </td>
                    <td class="fw-bold">${{ formatCurrency(income.amount) }}</td>
                    <td class="text-success fw-bold">${{ formatCurrency(income.professionalCommission) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Resumen -->
            <div class="row mt-3">
              <div class="col-12">
                <div class="alert alert-info">
                  <div class="row">
                    <div class="col-md-4">
                      <strong>{{ $t('commissionPayments.selectedCount') }}:</strong>
                      <span class="ms-2 fs-5">{{ selectedIncomeIds.length }}</span>
                    </div>
                    <div class="col-md-4">
                      <strong>{{ $t('commissionPayments.totalAmount') }}:</strong>
                      <span class="ms-2 fs-5">${{ formatCurrency(totalAmount) }}</span>
                    </div>
                    <div class="col-md-4">
                      <strong>{{ $t('commissionPayments.totalCommission') }}:</strong>
                      <span class="ms-2 fs-5 text-success">${{ formatCurrency(totalCommission) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notas -->
            <div class="row mt-3">
              <div class="col-12">
                <label class="form-label metric-card-subtitle fw-bold">
                  {{ $t('commissionPayments.notes') }}
                </label>
                <textarea
                  v-model="notes"
                  class="form-control metric-controls"
                  rows="3"
                  :placeholder="$t('commissionPayments.notesPlaceholder')"
                ></textarea>
              </div>
            </div>

            <!-- Botón Crear -->
            <div class="row mt-3">
              <div class="col-12 text-end">
                <button
                  @click="createPayment"
                  class="btn btn-lg btn-success"
                  :disabled="selectedIncomeIds.length === 0"
                >
                  <i class="bi bi-check-circle"></i> {{ $t('commissionPayments.createPayment') }}
                </button>
              </div>
            </div>
          </div>

          <div v-else-if="selectedProfessionalId && unpaidIncomes.length === 0 && !loading" class="mt-4">
            <Message
              :icon="'bi-info-circle'"
              :title="$t('commissionPayments.messages.noUnpaidIncomes')"
              :content="$t('commissionPayments.messages.noUnpaidIncomesContent')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Pagos Creados -->
    <div v-if="activeTab === 'created'">
      <div v-if="createdPayments.length > 0" class="row">
        <div
          v-for="payment in createdPayments"
          :key="payment.id"
          class="col-12 mb-3"
        >
          <CommissionPaymentCard
            :payment="payment"
            :professionals="professionals"
            @edit="openEditModal"
            @confirm="openConfirmModal"
            @cancel="openCancelModal"
          />
        </div>
      </div>
      <Message
        v-else
        :icon="'bi-clock'"
        :title="$t('commissionPayments.messages.noCreatedPayments')"
        :content="$t('commissionPayments.messages.noCreatedPaymentsContent')"
      />
    </div>

    <!-- Tab: Pagos Confirmados -->
    <div v-if="activeTab === 'paid'">
      <div v-if="paidPayments.length > 0" class="row">
        <div
          v-for="payment in paidPayments"
          :key="payment.id"
          class="col-12 mb-3"
        >
          <CommissionPaymentCard
            :payment="payment"
            :professionals="professionals"
          />
        </div>
      </div>
      <Message
        v-else
        :icon="'bi-check-circle'"
        :title="$t('commissionPayments.messages.noPaidPayments')"
        :content="$t('commissionPayments.messages.noPaidPaymentsContent')"
      />
    </div>

    <!-- Tab: Pagos Cancelados -->
    <div v-if="activeTab === 'cancelled'">
      <div v-if="cancelledPayments.length > 0" class="row">
        <div
          v-for="payment in cancelledPayments"
          :key="payment.id"
          class="col-12 mb-3"
        >
          <CommissionPaymentCard
            :payment="payment"
            :professionals="professionals"
          />
        </div>
      </div>
      <Message
        v-else
        :icon="'bi-x-circle'"
        :title="$t('commissionPayments.messages.noCancelledPayments')"
        :content="$t('commissionPayments.messages.noCancelledPaymentsContent')"
      />
    </div>

    <!-- Modales -->
    <EditCommissionPaymentModal
      v-if="showEditModal"
      :show="showEditModal"
      :payment="selectedPayment"
      :commerce="commerce"
      @close="handleModalClose"
    />

    <ConfirmCommissionPaymentModal
      v-if="showConfirmModal"
      :show="showConfirmModal"
      :payment="selectedPayment"
      @close="handleModalClose"
    />

    <CancelCommissionPaymentModal
      v-if="showCancelModal"
      :show="showCancelModal"
      :payment="selectedPayment"
      @close="handleModalClose"
    />
  </div>
</template>

<style scoped>
.nav-tabs .nav-link {
  color: var(--primary-color);
}

.nav-tabs .nav-link.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.metric-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.table-hover tbody tr:hover {
  background-color: #f8f9fa;
}

/* Tabs modernos */
.modern-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background-color: #f8f9fa;
  padding: 4px;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.5rem 1rem;
  background-color: transparent;
  border: none;
  border-radius: 6px;
  color: #6c757d;
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: pointer;
  white-space: nowrap;
}

.tab-button:hover {
  background-color: rgba(0, 74, 173, 0.1);
  color: #004aad;
}

.tab-button.active {
  background: linear-gradient(135deg, #004aad 0%, #00c2cb 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.3);
  transform: translateY(-1px);
}

.tab-button i {
  font-size: 16px;
}

.badge {
  border-radius: 10px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .modern-tabs {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .tab-button {
    text-align: left;
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
