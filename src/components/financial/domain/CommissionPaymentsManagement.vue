<script>
import { ref, reactive, computed, onMounted, watch } from 'vue';
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
  downloadCommissionPaymentPdf,
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
  setup(props, { emit }) {
    const loading = ref(false);
    const alertError = ref(null);
    const activeTab = ref('create'); // create, created, paid, cancelled
    const professionals = ref([]);
    const allPayments = ref([]);

    // Vista y paginación
    const viewMode = ref('table'); // 'table' o 'cards'
    const currentPage = ref(1);
    const itemsPerPage = ref(10);
    const searchProfessionalId = ref(null); // Filtro por profesional

    // Inicializar fechas con inicio y fin del mes actual
    const getCurrentMonthDates = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();

      // Primer día del mes
      const firstDay = new Date(year, month, 1);
      const dateFrom = firstDay.toISOString().split('T')[0];

      // Último día del mes
      const lastDay = new Date(year, month + 1, 0);
      const dateTo = lastDay.toISOString().split('T')[0];

      return { dateFrom, dateTo };
    };

    const { dateFrom, dateTo } = getCurrentMonthDates();
    const filterDateFrom = ref(dateFrom); // Filtro fecha desde (inicio del mes actual)
    const filterDateTo = ref(dateTo); // Filtro fecha hasta (fin del mes actual)

    const sortBy = ref('createdAt'); // createdAt, totalCommission, professionalName
    const sortOrder = ref('desc'); // 'asc' o 'desc'
    const expandedRows = ref(new Set()); // IDs de filas expandidas

    // Filtros para crear nuevo pago
    const selectedProfessionalId = ref(null);
    const periodFrom = ref(null);
    const periodTo = ref(null);
    const unpaidIncomes = ref([]);
    const selectedIncomeIds = ref([]);
    const notes = ref('');

    // Filtros para tipo de servicios
    const includeExecutedServices = ref(true); // Incluir servicios ya ejecutados (con atención)
    const includePendingServices = ref(true);  // Incluir servicios pendientes (solo reserva)

    // Modales
    const showEditModal = ref(false);
    const showConfirmModal = ref(false);
    const showCancelModal = ref(false);
    const selectedPayment = ref(null);

    const createdPayments = computed(() => allPayments.value.filter(p => p.status === 'CREATED'));

    const paidPayments = computed(() => allPayments.value.filter(p => p.status === 'PAID'));

    const cancelledPayments = computed(() =>
      allPayments.value.filter(p => p.status === 'CANCELLED')
    );

    // Función para obtener pagos filtrados y ordenados según el tab activo
    const getFilteredPayments = computed(() => {
      let payments = [];
      if (activeTab.value === 'created') {
        payments = createdPayments.value;
      } else if (activeTab.value === 'paid') {
        payments = paidPayments.value;
      } else if (activeTab.value === 'cancelled') {
        payments = cancelledPayments.value;
      }

      // Filtrar por profesional seleccionado
      if (searchProfessionalId.value) {
        payments = payments.filter(payment => payment.professionalId === searchProfessionalId.value);
      }

      // Filtrar por fecha desde
      if (filterDateFrom.value) {
        const fromDate = new Date(filterDateFrom.value);
        fromDate.setHours(0, 0, 0, 0);
        payments = payments.filter(payment => {
          const paymentDate = new Date(payment.createdAt);
          paymentDate.setHours(0, 0, 0, 0);
          return paymentDate >= fromDate;
        });
      }

      // Filtrar por fecha hasta
      if (filterDateTo.value) {
        const toDate = new Date(filterDateTo.value);
        toDate.setHours(23, 59, 59, 999);
        payments = payments.filter(payment => {
          const paymentDate = new Date(payment.createdAt);
          paymentDate.setHours(0, 0, 0, 0);
          return paymentDate <= toDate;
        });
      }

      // Ordenar
      payments = [...payments].sort((a, b) => {
        let aVal, bVal;
        if (sortBy.value === 'professionalName') {
          const profA = professionals.value.find(p => p.id === a.professionalId);
          const profB = professionals.value.find(p => p.id === b.professionalId);
          aVal = (profA?.personalInfo?.name || profA?.name || '').toLowerCase();
          bVal = (profB?.personalInfo?.name || profB?.name || '').toLowerCase();
        } else if (sortBy.value === 'totalCommission') {
          aVal = a.totalCommission || 0;
          bVal = b.totalCommission || 0;
        } else {
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
        }

        if (sortOrder.value === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });

      return payments;
    });

    // Paginación
    const paginatedPayments = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value;
      const end = start + itemsPerPage.value;
      return getFilteredPayments.value.slice(start, end);
    });

    const totalPages = computed(() => {
      return Math.ceil(getFilteredPayments.value.length / itemsPerPage.value);
    });

    const toggleRowExpansion = (paymentId) => {
      if (expandedRows.value.has(paymentId)) {
        expandedRows.value.delete(paymentId);
      } else {
        expandedRows.value.add(paymentId);
      }
    };

    const isRowExpanded = (paymentId) => {
      return expandedRows.value.has(paymentId);
    };

    const changeSort = (field) => {
      if (sortBy.value === field) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortBy.value = field;
        sortOrder.value = 'desc';
      }
      currentPage.value = 1; // Reset a primera página al cambiar orden
    };

    // Reset paginación y filtros al cambiar de tab
    watch(activeTab, () => {
      currentPage.value = 1;
      searchProfessionalId.value = null;
      // Resetear a fechas del mes actual
      const { dateFrom, dateTo } = getCurrentMonthDates();
      filterDateFrom.value = dateFrom;
      filterDateTo.value = dateTo;
      expandedRows.value.clear();
    });

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

    const paymentCardRefs = ref({});

    const loadPayments = async () => {
      try {
        loading.value = true;

        // Reset all payment card details before reloading
        if (paymentCardRefs.value && typeof paymentCardRefs.value === 'object') {
          Object.values(paymentCardRefs.value).forEach(ref => {
            if (ref && typeof ref.resetDetails === 'function') {
              ref.resetDetails();
            }
          });
        }

        // Add timestamp to prevent caching
        const timestamp = Date.now();
        const payments = await getCommissionPaymentsByCommerce(props.commerce.id, timestamp);
        allPayments.value = Array.isArray(payments) ? payments : [];
        loading.value = false;
      } catch (error) {
        console.error('[loadPayments] Error loading payments:', error);
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
        alertError.value = null; // Clear previous errors

        // Asegurar que las fechas incluyan todo el día (inicio y fin del día)
        // Crear fechas en UTC para evitar problemas de zona horaria
        let from = null;
        let to = null;

        if (periodFrom.value) {
          // Crear fecha UTC para el inicio del día (00:00:00 UTC)
          const [year, month, day] = periodFrom.value.split('-').map(Number);
          const fromDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
          from = fromDate.toISOString();
        }

        if (periodTo.value) {
          // Crear fecha UTC para el fin del día (23:59:59.999 UTC)
          const [year, month, day] = periodTo.value.split('-').map(Number);
          const toDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
          to = toDate.toISOString();
        }

        const result = await getUnpaidIncomesByProfessional(
          selectedProfessionalId.value,
          props.commerce.id,
          from,
          to
        );

        // Asegurar que siempre sea un array
        unpaidIncomes.value = Array.isArray(result) ? result : [];
        selectedIncomeIds.value = [];
        loading.value = false;

        // Si no hay resultados, no es un error, solo información
        if (unpaidIncomes.value.length === 0) {
        }
      } catch (error) {
        console.error('[searchUnpaidIncomes] Error:', error);
        console.error('[searchUnpaidIncomes] Error details:', {
          message: error.message,
          response: error.response,
          status: error.response?.status,
          data: error.response?.data,
        });

        // Solo mostrar error si realmente hay un error HTTP (no 200)
        // Si la respuesta es 200 con array vacío, no es un error
        if (error.response) {
          if (error.response.status === 200 && Array.isArray(error.response.data)) {
            // Respuesta exitosa con array vacío - no es un error
            unpaidIncomes.value = error.response.data || [];
            alertError.value = null;
          } else if (error.response.status !== 200) {
            // Error HTTP real
            alertError.value = error.response.status;
          } else {
            // Respuesta 200 pero formato inesperado
            unpaidIncomes.value = [];
            alertError.value = null;
          }
        } else {
          // Error de red u otro error sin response
          alertError.value = 500;
        }
        loading.value = false;
      }
    };

    const selectAll = event => {
      if (event.target.checked) {
        selectedIncomeIds.value = getFilteredIncomes.value.map(inc => inc.id);
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
        alertError.value = null;

        // Convert dates to ISO strings if they are date strings
        let periodFromISO = periodFrom.value;
        let periodToISO = periodTo.value;

        if (periodFrom.value && !periodFrom.value.includes('T')) {
          const [year, month, day] = periodFrom.value.split('-').map(Number);
          periodFromISO = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
        }

        if (periodTo.value && !periodTo.value.includes('T')) {
          const [year, month, day] = periodTo.value.split('-').map(Number);
          periodToISO = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)).toISOString();
        }

        const createdPayment = await createCommissionPayment(
          props.commerce.id,
          props.business.id,
          selectedProfessionalId.value,
          selectedIncomeIds.value,
          periodFromISO || new Date().toISOString(),
          periodToISO || new Date().toISOString(),
          notes.value
        );

        // Reset form
        selectedIncomeIds.value = [];
        unpaidIncomes.value = [];
        notes.value = '';

        // Small delay to ensure backend has processed the payment
        await new Promise(resolve => setTimeout(resolve, 500));

        // Force reload payments with fresh data (no cache)
        await loadPayments();

        // Switch to created tab to show the new payment
        activeTab.value = 'created';
        loading.value = false;

      } catch (error) {
        console.error('[createPayment] Error creating payment:', error);
        console.error('[createPayment] Error details:', {
          message: error.message,
          response: error.response,
          status: error.response?.status,
          data: error.response?.data,
        });
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const openEditModal = payment => {
      selectedPayment.value = payment;
      showEditModal.value = true;
    };

    const openConfirmModal = payment => {
      selectedPayment.value = payment;
      showConfirmModal.value = true;
    };

    const openCancelModal = payment => {
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

    const handleViewOutcome = outcomeId => {
      // Emit event to parent to switch to outcomes tab and highlight the outcome
      // The parent component (BusinessFinancial) should handle navigation
      emit('view-outcome', outcomeId);
    };

    const downloadingPdf = ref(false);
    const handleDownloadPdf = async (payment) => {
      if (downloadingPdf.value) return;

      try {
        downloadingPdf.value = true;
        const blob = await downloadCommissionPaymentPdf(payment.id, props.commerce.id);

        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `commission-payment-${payment.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading PDF:', error);
        alertError.value = error.response?.status || 500;
      } finally {
        downloadingPdf.value = false;
      }
    };

    const formatDate = date => getDate(date);

    const formatCurrency = amount =>
      Number(parseFloat(amount || 0).toFixed(2)).toLocaleString('de-DE');

    // Función para determinar el estado de la reserva/atención
    const getIncomeStatus = (income) => {
      if (income.attentionId) {
        // Si tiene attentionId, es un servicio ya ejecutado
        return {
          type: 'executed',
          status: 'completed',
          icon: 'bi bi-check-circle-fill',
          class: 'service-status-badge executed',
          text: 'Ejecutado'
        };
      } else if (income.bookingId) {
        // Si solo tiene bookingId sin attentionId, es un servicio pendiente de ejecución
        return {
          type: 'pending',
          status: 'pending',
          icon: 'bi bi-clock-fill',
          class: 'service-status-badge pending',
          text: 'Pendiente'
        };
      } else {
        // Otros casos (paquetes, pagos directos, etc.)
        return {
          type: 'other',
          status: 'other',
          icon: 'bi bi-cash-coin',
          class: 'service-status-badge direct',
          text: 'Directo'
        };
      }
    };

    // Función para filtrar incomes según el estado de ejecución
    const getFilteredIncomes = computed(() => {
      return unpaidIncomes.value.filter(income => {
        const status = getIncomeStatus(income);

        // Aplicar filtros
        if (status.type === 'executed' && !includeExecutedServices.value) {
          return false; // Excluir servicios ejecutados si el filtro está desactivado
        }

        if (status.type === 'pending' && !includePendingServices.value) {
          return false; // Excluir servicios pendientes si el filtro está desactivado
        }

        return true; // Incluir otros tipos y los que pasan los filtros
      });
    });
    const getFirstDayOfMonth = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1);
      return firstDay.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    };

    // Función para obtener el último día del mes actual
    const getLastDayOfMonth = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0); // Día 0 del siguiente mes = último día del mes actual
      return lastDay.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    };

    onMounted(async () => {
      // Establecer fechas por defecto: inicio y fin del mes actual
      periodFrom.value = getFirstDayOfMonth();
      periodTo.value = getLastDayOfMonth();

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
      includeExecutedServices,
      includePendingServices,
      getFilteredIncomes,
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
      getIncomeStatus,
      loadPayments,
      paymentCardRefs,
      handleViewOutcome,
      handleDownloadPdf,
      downloadingPdf,
      viewMode,
      currentPage,
      itemsPerPage,
      searchProfessionalId,
      filterDateFrom,
      filterDateTo,
      sortBy,
      sortOrder,
      expandedRows,
      getFilteredPayments,
      paginatedPayments,
      totalPages,
      toggleRowExpansion,
      isRowExpanded,
      changeSort,
    };
  },
};
</script>

<!-- eslint-disable vue/no-v-for-template-key -->
<template>
  <div>
    <Spinner :show="loading" />

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
              <input type="date" v-model="periodFrom" class="form-control metric-controls" />
            </div>

            <div class="col-12 col-md-3 mb-3">
              <label class="form-label metric-card-subtitle fw-bold">
                {{ $t('commissionPayments.dateTo') }}
              </label>
              <input type="date" v-model="periodTo" class="form-control metric-controls" />
            </div>

            <div class="col-12 col-md-2 mb-3 d-flex align-items-end">
              <button
                @click="searchUnpaidIncomes"
                class="btn btn-md btn-dark fw-bold rounded-pill w-100"
                :disabled="!selectedProfessionalId"
              >
                <i class="bi bi-search"></i>
              </button>
            </div>
          </div>

          <!-- Filtros de Estado de Servicios -->
          <!-- Filtros de Servicio - Siempre visibles cuando hay unpaidIncomes -->
          <div v-if="unpaidIncomes.length > 0" class="row mt-2 mb-3">
            <div class="col-12">
              <div class="filter-section-compact">
                <div class="d-flex align-items-center gap-3 flex-wrap">
                  <span class="fw-bold text-muted">
                    <i class="bi bi-funnel"></i> {{ $t('commissionPayments.serviceFilters') }}:
                  </span>
                  <div class="d-flex gap-3 flex-wrap">
                    <div class="form-check form-switch">
                      <input
                        v-model="includeExecutedServices"
                        class="form-check-input"
                        type="checkbox"
                        id="includeExecuted"
                      />
                      <label class="form-check-label" for="includeExecuted">
                        <span class="service-status-badge executed">
                          <i class="bi bi-check-circle-fill"></i>
                          {{ $t('commissionPayments.serviceStatus.executed') }}
                        </span>
                        <span class="ms-2">{{ $t('commissionPayments.includeExecuted') }}</span>
                      </label>
                    </div>
                    <div class="form-check form-switch">
                      <input
                        v-model="includePendingServices"
                        class="form-check-input"
                        type="checkbox"
                        id="includePending"
                      />
                      <label class="form-check-label" for="includePending">
                        <span class="service-status-badge pending">
                          <i class="bi bi-clock-fill"></i>
                          {{ $t('commissionPayments.serviceStatus.pending') }}
                        </span>
                        <span class="ms-2">{{ $t('commissionPayments.includePending') }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Contenido cuando hay unpaidIncomes -->
          <div v-if="unpaidIncomes.length > 0" class="mt-4">
            <!-- Título con contador -->
            <h5 class="metric-card-title">
              <i class="bi bi-list-check"></i> {{ $t('commissionPayments.selectedIncomes') }}
              <span class="badge bg-secondary ms-2">{{ getFilteredIncomes.length }}/{{ unpaidIncomes.length }}</span>
            </h5>

            <!-- Tabla cuando hay resultados filtrados -->
            <div v-if="getFilteredIncomes.length > 0">
              <div class="table-responsive">
                <table class="table table-hover table-sm commission-payments-table">
                  <thead class="table-light">
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          @change="selectAll"
                          :checked="
                            selectedIncomeIds.length === getFilteredIncomes.length &&
                          getFilteredIncomes.length > 0
                        "
                      />
                    </th>
                    <th>{{ $t('commissionPayments.date') }}</th>
                    <th>{{ $t('commissionPayments.type') }}</th>
                    <th>{{ $t('commissionPayments.statuss') }}</th>
                    <th>{{ $t('commissionPayments.amount') }}</th>
                    <th>{{ $t('commissionPayments.commission') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="income in getFilteredIncomes" :key="income.id">
                    <td>
                      <input type="checkbox" v-model="selectedIncomeIds" :value="income.id" />
                    </td>
                    <td>{{ formatDate(income.createdAt) }}</td>
                    <td>
                      <span class="badge bg-info">
                        {{ $t(`incomeTypes.${income.type}`) }}
                      </span>
                    </td>
                    <td>
                      <span
                        :class="`${getIncomeStatus(income).class}`"
                        :title="getIncomeStatus(income).type === 'executed' ? $t('commissionPayments.filterHelp.executed') : getIncomeStatus(income).type === 'pending' ? $t('commissionPayments.filterHelp.pending') : $t('commissionPayments.filterHelp.direct')"
                      >
                        <i :class="getIncomeStatus(income).icon"></i>
                        {{ $t(`commissionPayments.serviceStatus.${getIncomeStatus(income).type}`) }}
                      </span>
                    </td>
                    <td class="fw-bold">${{ formatCurrency(income.amount) }}</td>
                    <td class="text-success fw-bold">
                      ${{ formatCurrency(income.professionalCommission) }}
                      <i v-if="income?.commissionPaid === true || income?.commissionPaid === 'true' || income?.commissionPaid === 1" class="bi bi-check-circle-fill text-success ms-2" :title="$t('commissionPayments.commissionPaid')"></i>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Resumen -->
            <div class="row mt-3">
              <div class="col-12">
                <div class="commission-summary-card">
                  <div class="row g-3">
                    <div class="col-12 col-md-4">
                      <div class="summary-item">
                        <div class="summary-label">{{ $t('commissionPayments.selectedCount') }}</div>
                        <div class="summary-value">{{ selectedIncomeIds.length }}</div>
                      </div>
                    </div>
                    <div class="col-12 col-md-4">
                      <div class="summary-item">
                        <div class="summary-label">{{ $t('commissionPayments.totalAmount') }}</div>
                        <div class="summary-value">${{ formatCurrency(totalAmount) }}</div>
                      </div>
                    </div>
                    <div class="col-12 col-md-4">
                      <div class="summary-item">
                        <div class="summary-label">{{ $t('commissionPayments.totalCommission') }}</div>
                        <div class="summary-value text-success">${{ formatCurrency(totalCommission) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            <!-- Mensaje cuando no hay resultados filtrados -->
            <div v-else class="text-center py-4">
              <div class="text-muted">
                <i class="bi bi-funnel" style="font-size: 2rem; color: #6c757d"></i>
                <p class="mt-2 mb-0">{{ $t('commissionPayments.noFilteredResults.title') }}</p>
                <small>{{ $t('commissionPayments.noFilteredResults.subtitle') }}</small>
              </div>
            </div>

            <!-- Notas - Siempre visibles -->
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

            <!-- Botón Crear - Deshabilitado cuando no hay selecciones -->
            <div class="row mt-3">
              <div class="col-12 text-end">
                <button
                  @click="createPayment"
                  class="btn btn-sm btn-size fw-bold btn-success rounded-pill px-4"
                  :disabled="selectedIncomeIds.length === 0"
                >
                  <i class="bi bi-check-circle"></i> {{ $t('commissionPayments.createPayment') }}
                </button>
              </div>
            </div>
          </div>

          <div
            v-else-if="selectedProfessionalId && unpaidIncomes.length === 0 && !loading"
            class="mt-4"
          >
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
      <!-- Barra de herramientas: Filtros, Vista y Refresh -->
      <div class="row mb-3">
        <div class="col-12 col-md-3 mb-2 mb-md-0">
          <label class="form-label metric-card-subtitle fw-bold mb-2">{{ $t('commissionPayments.professional') || 'Profesional' }}</label>
          <div class="select-wrapper">
            <select
              class="form-control metric-controls"
              v-model="searchProfessionalId"
              @change="currentPage = 1"
            >
              <option :value="null">{{ $t('commissionPayments.allProfessionals') || 'Todos los Profesionales' }}</option>
              <option
                v-for="prof in professionals"
                :key="prof.id"
                :value="prof.id"
              >
                {{ prof.personalInfo?.name || prof.name || prof.id }}
              </option>
            </select>
          </div>
        </div>
        <div class="col-12 col-md-3 mb-2 mb-md-0">
          <label class="form-label metric-card-subtitle fw-bold mb-2">
            {{ $t('commissionPayments.dateFrom') || 'Data Desde' }}
          </label>
          <input
            type="date"
            v-model="filterDateFrom"
            class="form-control metric-controls"
            @change="currentPage = 1"
          />
        </div>
        <div class="col-12 col-md-3 mb-2 mb-md-0">
          <label class="form-label metric-card-subtitle fw-bold mb-2">
            {{ $t('commissionPayments.dateTo') || 'Data Até' }}
          </label>
          <input
            type="date"
            v-model="filterDateTo"
            class="form-control metric-controls"
            @change="currentPage = 1"
          />
        </div>
        <div class="col-12 col-md-3 d-flex justify-content-end gap-2 align-items-end">
          <div class="btn-group" role="group">
            <button
              type="button"
              class="btn btn-sm"
              :class="viewMode === 'table' ? 'btn-dark' : 'btn-outline-dark'"
              @click="viewMode = 'table'"
              title="Vista de tabla"
            >
              <i class="bi bi-table"></i>
            </button>
            <button
              type="button"
              class="btn btn-sm"
              :class="viewMode === 'cards' ? 'btn-dark' : 'btn-outline-dark'"
              @click="viewMode = 'cards'"
              title="Vista de cards"
            >
              <i class="bi bi-grid-3x3-gap"></i>
            </button>
          </div>
          <button
            @click="loadPayments"
            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
            :disabled="loading"
          >
            <i class="bi bi-arrow-clockwise"></i> {{ $t('commissionPayments.refresh') || 'Atualizar' }}
          </button>
        </div>
      </div>

      <!-- Vista de Tabla Compacta -->
      <div v-if="viewMode === 'table' && getFilteredPayments.length > 0" class="row">
        <div class="col-12">
          <div class="table-responsive">
            <table class="table table-hover table-sm commission-payments-table">
              <thead class="table-light">
                <tr>
                  <th @click="changeSort('professionalName')" class="sortable-header">
                    {{ $t('commissionPayments.professional') || 'Profesional' }}
                    <i
                      class="bi"
                      :class="
                        sortBy === 'professionalName'
                          ? sortOrder === 'asc'
                            ? 'bi-arrow-up'
                            : 'bi-arrow-down'
                          : 'bi-arrow-down-up'
                      "
                    ></i>
                  </th>
                  <th @click="changeSort('createdAt')" class="sortable-header">
                    {{ $t('commissionPayments.createdAt') || 'Fecha Creación' }}
                    <i
                      class="bi"
                      :class="
                        sortBy === 'createdAt'
                          ? sortOrder === 'asc'
                            ? 'bi-arrow-up'
                            : 'bi-arrow-down'
                          : 'bi-arrow-down-up'
                      "
                    ></i>
                  </th>
                  <th>{{ $t('commissionPayments.period') || 'Período' }}</th>
                  <th class="text-end">{{ $t('commissionPayments.receitas') || 'Receitas' }}</th>
                  <th @click="changeSort('totalCommission')" class="text-end sortable-header">
                    {{ $t('commissionPayments.totalCommission') || 'Comisión Total' }}
                    <i
                      class="bi"
                      :class="
                        sortBy === 'totalCommission'
                          ? sortOrder === 'asc'
                          ? 'bi-arrow-up'
                          : 'bi-arrow-down'
                        : 'bi-arrow-down-up'
                      "
                    ></i>
                  </th>
                  <th class="text-center" style="width: 120px;">{{ $t('commissionPayments.actions') || 'Acciones' }}</th>
                  <th style="width: 40px;"></th>
                </tr>
              </thead>
              <tbody>
                <!-- eslint-disable vue/no-v-for-template-key -->
                <template v-for="payment in paginatedPayments" :key="`payment-${payment.id}`">
                  <tr
                    class="commission-payment-row"
                    :class="{ 'table-active': isRowExpanded(payment.id) }"
                    @click="toggleRowExpansion(payment.id)"
                    style="cursor: pointer;"
                  >
                    <td>
                      <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-person-badge text-primary"></i>
                        <strong>
                          {{
                            professionals.find(p => p.id === payment.professionalId)?.personalInfo?.name ||
                            professionals.find(p => p.id === payment.professionalId)?.name ||
                            payment.professionalId
                          }}
                        </strong>
                      </div>
                    </td>
                    <td>
                      <small>{{ formatDate(payment.createdAt) }}</small>
                    </td>
                    <td>
                      <small>
                        {{ formatDate(payment.periodFrom) }}<br />
                        {{ formatDate(payment.periodTo) }}
                      </small>
                    </td>
                    <td class="text-end">
                      <span class="badge bg-info">{{ payment.totalIncomes || 0 }}</span>
                    </td>
                    <td class="text-end">
                      <strong class="text-success">${{ formatCurrency(payment.totalCommission) }}</strong>
                    </td>
                    <td class="text-center" @click.stop>
                      <div class="btn-group btn-group-sm" role="group">
                        <button
                          v-if="payment.status === 'CREATED'"
                          class="btn btn-outline-primary btn-sm"
                          @click="openEditModal(payment)"
                          :title="$t('commissionPayments.edit') || 'Editar'"
                        >
                          <i class="bi bi-pencil"></i>
                        </button>
                        <button
                          v-if="payment.status === 'CREATED'"
                          class="btn btn-outline-success btn-sm"
                          @click="openConfirmModal(payment)"
                          :title="$t('commissionPayments.confirmPaymentAction') || 'Confirmar Pago'"
                        >
                          <i class="bi bi-check-circle"></i>
                        </button>
                        <button
                          v-if="payment.status === 'CREATED'"
                          class="btn btn-outline-danger btn-sm"
                          @click="openCancelModal(payment)"
                          :title="$t('commissionPayments.cancel') || 'Cancelar'"
                        >
                          <i class="bi bi-x-circle"></i>
                        </button>
                        <button
                          v-if="payment.status === 'PAID'"
                          class="btn btn-outline-danger btn-sm"
                          @click="handleDownloadPdf(payment)"
                          :title="$t('commissionPayments.downloadPdf') || 'Descargar PDF'"
                          :disabled="downloadingPdf"
                        >
                          <span v-if="downloadingPdf" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          <i v-else class="bi bi-file-earmark-pdf-fill"></i>
                        </button>
                      </div>
                    </td>
                    <td @click.stop>
                      <button
                        class="btn btn-sm btn-link p-0"
                        @click="toggleRowExpansion(payment.id)"
                        :title="isRowExpanded(payment.id) ? $t('commissionPayments.hideDetails') : $t('commissionPayments.showDetails')"
                      >
                        <i
                          class="bi"
                          :class="isRowExpanded(payment.id) ? 'bi-chevron-up' : 'bi-chevron-down'"
                        ></i>
                      </button>
                    </td>
                  </tr>
                  <!-- Fila expandida con detalles -->
                  <tr v-if="isRowExpanded(payment.id)" :key="`expanded-${payment.id}`">
                    <td colspan="7" class="p-0">
                      <div class="commission-payment-details p-3 bg-light">
                        <CommissionPaymentCard
                          :ref="el => {
                            if (!paymentCardRefs.value) paymentCardRefs.value = {};
                            if (el) {
                              paymentCardRefs.value[payment.id] = el;
                            } else if (paymentCardRefs.value) {
                              delete paymentCardRefs.value[payment.id];
                            }
                          }"
                          :key="`payment-${payment.id}-${payment.updatedAt || payment.createdAt}`"
                          :payment="payment"
                          :professionals="professionals"
                          :commerce="commerce"
                          :business="business"
                          :auto-expand="true"
                          @edit="openEditModal"
                          @confirm="openConfirmModal"
                          @cancel="openCancelModal"
                          @view-outcome="handleViewOutcome"
                        />
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          <div v-if="totalPages > 1" class="row mt-3">
            <div class="col-12 d-flex justify-content-between align-items-center">
              <div>
                <small class="text-muted">
                  Mostrando {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, getFilteredPayments.length) }} de {{ getFilteredPayments.length }}
                </small>
              </div>
              <nav>
                <ul class="pagination pagination-sm mb-0">
                  <li class="page-item" :class="{ disabled: currentPage === 1 }">
                    <button class="page-link" @click="currentPage = Math.max(1, currentPage - 1)">
                      <i class="bi bi-chevron-left"></i>
                    </button>
                  </li>
                  <li
                    v-for="page in Math.min(5, totalPages)"
                    :key="page"
                    class="page-item"
                    :class="{ active: currentPage === page }"
                  >
                    <button class="page-link" @click="currentPage = page">{{ page }}</button>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                    <button
                      class="page-link"
                      @click="currentPage = Math.min(totalPages, currentPage + 1)"
                    >
                      <i class="bi bi-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista de Cards (fallback) -->
      <div v-else-if="viewMode === 'cards' && getFilteredPayments.length > 0" class="row">
        <div v-for="payment in paginatedPayments" :key="payment.id" class="col-12 mb-3">
          <CommissionPaymentCard
            :ref="el => {
              if (!paymentCardRefs.value) paymentCardRefs.value = {};
              if (el) {
                paymentCardRefs.value[payment.id] = el;
              } else if (paymentCardRefs.value) {
                delete paymentCardRefs.value[payment.id];
              }
            }"
            :key="`payment-${payment.id}-${payment.updatedAt || payment.createdAt}`"
            :payment="payment"
            :professionals="professionals"
            :commerce="commerce"
            :business="business"
            @edit="openEditModal"
            @confirm="openConfirmModal"
            @cancel="openCancelModal"
          />
        </div>
      </div>

      <Message
        v-else-if="getFilteredPayments.length === 0"
        :icon="'bi-clock'"
        :title="$t('commissionPayments.messages.noCreatedPayments')"
        :content="$t('commissionPayments.messages.noCreatedPaymentsContent')"
      />
    </div>

    <!-- Tab: Pagos Confirmados -->
    <div v-if="activeTab === 'paid'">
      <!-- Barra de herramientas: Filtros, Vista y Refresh -->
      <div class="row mb-3">
        <div class="col-12 col-md-3 mb-2 mb-md-0">
          <label class="form-label metric-card-subtitle fw-bold mb-2">{{ $t('commissionPayments.professional') || 'Profesional' }}</label>
          <div class="select-wrapper">
            <select
              class="form-control metric-controls"
              v-model="searchProfessionalId"
              @change="currentPage = 1"
            >
              <option :value="null">{{ $t('commissionPayments.allProfessionals') || 'Todos los Profesionales' }}</option>
              <option
                v-for="prof in professionals"
                :key="prof.id"
                :value="prof.id"
              >
                {{ prof.personalInfo?.name || prof.name || prof.id }}
              </option>
            </select>
          </div>
        </div>
        <div class="col-12 col-md-3 mb-2 mb-md-0">
          <label class="form-label metric-card-subtitle fw-bold mb-2">
            {{ $t('commissionPayments.dateFrom') || 'Data Desde' }}
          </label>
          <input
            type="date"
            v-model="filterDateFrom"
            class="form-control metric-controls"
            @change="currentPage = 1"
          />
        </div>
        <div class="col-12 col-md-3 mb-2 mb-md-0">
          <label class="form-label metric-card-subtitle fw-bold mb-2">
            {{ $t('commissionPayments.dateTo') || 'Data Até' }}
          </label>
          <input
            type="date"
            v-model="filterDateTo"
            class="form-control metric-controls"
            @change="currentPage = 1"
          />
        </div>
        <div class="col-12 col-md-3 d-flex justify-content-end gap-2 align-items-end">
          <div class="btn-group" role="group">
            <button
              type="button"
              class="btn btn-sm"
              :class="viewMode === 'table' ? 'btn-dark' : 'btn-outline-dark'"
              @click="viewMode = 'table'"
              title="Vista de tabla"
            >
              <i class="bi bi-table"></i>
            </button>
            <button
              type="button"
              class="btn btn-sm"
              :class="viewMode === 'cards' ? 'btn-dark' : 'btn-outline-dark'"
              @click="viewMode = 'cards'"
              title="Vista de cards"
            >
              <i class="bi bi-grid-3x3-gap"></i>
            </button>
          </div>
          <button
            @click="loadPayments"
            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
            :disabled="loading"
          >
            <i class="bi bi-arrow-clockwise"></i> {{ $t('commissionPayments.refresh') || 'Atualizar' }}
          </button>
        </div>
      </div>

      <!-- Vista de Tabla Compacta -->
      <div v-if="viewMode === 'table' && getFilteredPayments.length > 0" class="row">
        <div class="col-12">
          <div class="table-responsive">
            <table class="table table-hover table-sm commission-payments-table">
              <thead class="table-light">
                <tr>
                  <th @click="changeSort('professionalName')" class="sortable-header">
                    {{ $t('commissionPayments.professional') || 'Profesional' }}
                    <i
                      class="bi"
                      :class="
                        sortBy === 'professionalName'
                          ? sortOrder === 'asc'
                            ? 'bi-arrow-up'
                            : 'bi-arrow-down'
                          : 'bi-arrow-down-up'
                      "
                    ></i>
                  </th>
                  <th @click="changeSort('createdAt')" class="sortable-header">
                    {{ $t('commissionPayments.createdAt') || 'Fecha Creación' }}
                    <i
                      class="bi"
                      :class="
                        sortBy === 'createdAt'
                          ? sortOrder === 'asc'
                            ? 'bi-arrow-up'
                            : 'bi-arrow-down'
                          : 'bi-arrow-down-up'
                      "
                    ></i>
                  </th>
                  <th>{{ $t('commissionPayments.period') || 'Período' }}</th>
                  <th class="text-end">{{ $t('commissionPayments.receitas') || 'Receitas' }}</th>
                  <th @click="changeSort('totalCommission')" class="text-end sortable-header">
                    {{ $t('commissionPayments.totalCommission') || 'Comisión Total' }}
                    <i
                      class="bi"
                      :class="
                        sortBy === 'totalCommission'
                          ? sortOrder === 'asc'
                            ? 'bi-arrow-up'
                            : 'bi-arrow-down'
                          : 'bi-arrow-down-up'
                      "
                    ></i>
                  </th>
                  <th>{{ $t('commissionPayments.paidAt') || 'Data de Pagamento' }}</th>
                  <th class="text-center" style="width: 80px;">{{ $t('commissionPayments.actions') || 'Ações' }}</th>
                  <th style="width: 40px;"></th>
                </tr>
              </thead>
              <tbody>
                <!-- eslint-disable vue/no-v-for-template-key -->
                <template v-for="payment in paginatedPayments" :key="`payment-${payment.id}`">
                  <tr
                    class="commission-payment-row"
                    :class="{ 'table-active': isRowExpanded(payment.id) }"
                    @click="toggleRowExpansion(payment.id)"
                    style="cursor: pointer;"
                  >
                    <td>
                      <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-person-badge text-success"></i>
                        <strong>
                          {{
                            professionals.find(p => p.id === payment.professionalId)?.personalInfo?.name ||
                            professionals.find(p => p.id === payment.professionalId)?.name ||
                            payment.professionalId
                          }}
                        </strong>
                      </div>
                    </td>
                    <td>
                      <small>{{ formatDate(payment.createdAt) }}</small>
                    </td>
                    <td>
                      <small>
                        {{ formatDate(payment.periodFrom) }}<br />
                        {{ formatDate(payment.periodTo) }}
                      </small>
                    </td>
                    <td class="text-end">
                      <span class="badge bg-info">{{ payment.totalIncomes || 0 }}</span>
                    </td>
                    <td class="text-end">
                      <strong class="text-success">${{ formatCurrency(payment.totalCommission) }}</strong>
                    </td>
                    <td>
                      <small class="text-success">
                        <i class="bi bi-check-circle"></i> {{ formatDate(payment.paidAt) }}
                      </small>
                    </td>
                    <td class="text-center">
                      <button
                        v-if="payment.status === 'PAID'"
                        class="btn btn-outline-danger btn-sm"
                        @click.stop="handleDownloadPdf(payment)"
                        :title="$t('commissionPayments.downloadPdf') || 'Descargar PDF'"
                        :disabled="downloadingPdf"
                      >
                        <i class="bi bi-file-earmark-pdf-fill"></i>
                      </button>
                    </td>
                    <td @click.stop>
                      <button
                        class="btn btn-sm btn-link p-0"
                        @click="toggleRowExpansion(payment.id)"
                        :title="isRowExpanded(payment.id) ? $t('commissionPayments.hideDetails') : $t('commissionPayments.showDetails')"
                      >
                        <i
                          class="bi"
                          :class="isRowExpanded(payment.id) ? 'bi-chevron-up' : 'bi-chevron-down'"
                        ></i>
                      </button>
                    </td>
                  </tr>
                  <!-- Fila expandida con detalles -->
                  <tr v-if="isRowExpanded(payment.id)">
                    <td colspan="8" class="p-0">
                      <div class="commission-payment-details p-3 bg-light">
                        <CommissionPaymentCard
                          :payment="payment"
                          :professionals="professionals"
                          :commerce="commerce"
                          :business="business"
                          :auto-expand="true"
                          @view-outcome="handleViewOutcome"
                        />
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          <div v-if="totalPages > 1" class="row mt-3">
            <div class="col-12 d-flex justify-content-between align-items-center">
              <div>
                <small class="text-muted">
                  Mostrando {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, getFilteredPayments.length) }} de {{ getFilteredPayments.length }}
                </small>
              </div>
              <nav>
                <ul class="pagination pagination-sm mb-0">
                  <li class="page-item" :class="{ disabled: currentPage === 1 }">
                    <button class="page-link" @click="currentPage = Math.max(1, currentPage - 1)">
                      <i class="bi bi-chevron-left"></i>
                    </button>
                  </li>
                  <li
                    v-for="page in Math.min(5, totalPages)"
                    :key="page"
                    class="page-item"
                    :class="{ active: currentPage === page }"
                  >
                    <button class="page-link" @click="currentPage = page">{{ page }}</button>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                    <button
                      class="page-link"
                      @click="currentPage = Math.min(totalPages, currentPage + 1)"
                    >
                      <i class="bi bi-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista de Cards (fallback) -->
      <div v-else-if="viewMode === 'cards' && getFilteredPayments.length > 0" class="row">
        <div v-for="payment in paginatedPayments" :key="payment.id" class="col-12 mb-3">
          <CommissionPaymentCard
            :payment="payment"
            :professionals="professionals"
            :commerce="commerce"
            :business="business"
            @view-outcome="handleViewOutcome"
          />
        </div>
      </div>

      <Message
        v-else-if="getFilteredPayments.length === 0"
        :icon="'bi-check-circle'"
        :title="$t('commissionPayments.messages.noPaidPayments')"
        :content="$t('commissionPayments.messages.noPaidPaymentsContent')"
      />
    </div>

    <!-- Tab: Pagos Cancelados -->
    <div v-if="activeTab === 'cancelled'">
      <!-- Barra de herramientas: Filtros, Vista y Refresh -->
      <div class="row mb-3">
        <div class="col-12 col-md-3 mb-2 mb-md-0">
          <label class="form-label metric-card-subtitle fw-bold mb-2">{{ $t('commissionPayments.professional') || 'Profesional' }}</label>
          <div class="select-wrapper">
            <select
              class="form-control metric-controls"
              v-model="searchProfessionalId"
              @change="currentPage = 1"
            >
              <option :value="null">{{ $t('commissionPayments.allProfessionals') || 'Todos los Profesionales' }}</option>
              <option
                v-for="prof in professionals"
                :key="prof.id"
                :value="prof.id"
              >
                {{ prof.personalInfo?.name || prof.name || prof.id }}
              </option>
            </select>
          </div>
        </div>
        <div class="col-12 col-md-3 mb-2 mb-md-0">
          <label class="form-label metric-card-subtitle fw-bold mb-2">
            {{ $t('commissionPayments.dateFrom') || 'Data Desde' }}
          </label>
          <input
            type="date"
            v-model="filterDateFrom"
            class="form-control metric-controls"
            @change="currentPage = 1"
          />
        </div>
        <div class="col-12 col-md-3 mb-2 mb-md-0">
          <label class="form-label metric-card-subtitle fw-bold mb-2">
            {{ $t('commissionPayments.dateTo') || 'Data Até' }}
          </label>
          <input
            type="date"
            v-model="filterDateTo"
            class="form-control metric-controls"
            @change="currentPage = 1"
          />
        </div>
        <div class="col-12 col-md-3 d-flex justify-content-end gap-2 align-items-end">
          <div class="btn-group" role="group">
            <button
              type="button"
              class="btn btn-sm"
              :class="viewMode === 'table' ? 'btn-dark' : 'btn-outline-dark'"
              @click="viewMode = 'table'"
              title="Vista de tabla"
            >
              <i class="bi bi-table"></i>
            </button>
            <button
              type="button"
              class="btn btn-sm"
              :class="viewMode === 'cards' ? 'btn-dark' : 'btn-outline-dark'"
              @click="viewMode = 'cards'"
              title="Vista de cards"
            >
              <i class="bi bi-grid-3x3-gap"></i>
            </button>
          </div>
          <button
            @click="loadPayments"
            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
            :disabled="loading"
          >
            <i class="bi bi-arrow-clockwise"></i> {{ $t('commissionPayments.refresh') || 'Atualizar' }}
          </button>
        </div>
      </div>

      <!-- Vista de Tabla Compacta -->
      <div v-if="viewMode === 'table' && getFilteredPayments.length > 0" class="row">
        <div class="col-12">
          <div class="table-responsive">
            <table class="table table-hover table-sm commission-payments-table">
              <thead class="table-light">
                <tr>
                  <th @click="changeSort('professionalName')" class="sortable-header">
                    {{ $t('commissionPayments.professional') || 'Profesional' }}
                    <i
                      class="bi"
                      :class="
                        sortBy === 'professionalName'
                          ? sortOrder === 'asc'
                            ? 'bi-arrow-up'
                            : 'bi-arrow-down'
                          : 'bi-arrow-down-up'
                      "
                    ></i>
                  </th>
                  <th @click="changeSort('createdAt')" class="sortable-header">
                    {{ $t('commissionPayments.createdAt') || 'Fecha Creación' }}
                    <i
                      class="bi"
                      :class="
                        sortBy === 'createdAt'
                          ? sortOrder === 'asc'
                            ? 'bi-arrow-up'
                            : 'bi-arrow-down'
                          : 'bi-arrow-down-up'
                      "
                    ></i>
                  </th>
                  <th>{{ $t('commissionPayments.period') || 'Período' }}</th>
                  <th class="text-end">{{ $t('commissionPayments.receitas') || 'Receitas' }}</th>
                  <th @click="changeSort('totalCommission')" class="text-end sortable-header">
                    {{ $t('commissionPayments.totalCommission') || 'Comisión Total' }}
                    <i
                      class="bi"
                      :class="
                        sortBy === 'totalCommission'
                          ? sortOrder === 'asc'
                            ? 'bi-arrow-up'
                            : 'bi-arrow-down'
                          : 'bi-arrow-down-up'
                      "
                    ></i>
                  </th>
                  <th>{{ $t('commissionPayments.cancelledAt') || 'Fecha Cancelación' }}</th>
                  <th style="width: 40px;"></th>
                </tr>
              </thead>
              <tbody>
                <!-- eslint-disable vue/no-v-for-template-key -->
                <template v-for="payment in paginatedPayments" :key="`payment-${payment.id}`">
                  <tr
                    class="commission-payment-row"
                    :class="{ 'table-active': isRowExpanded(payment.id) }"
                    @click="toggleRowExpansion(payment.id)"
                    style="cursor: pointer;"
                  >
                    <td>
                      <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-person-badge text-danger"></i>
                        <strong>
                          {{
                            professionals.find(p => p.id === payment.professionalId)?.personalInfo?.name ||
                            professionals.find(p => p.id === payment.professionalId)?.name ||
                            payment.professionalId
                          }}
                        </strong>
                      </div>
                    </td>
                    <td>
                      <small>{{ formatDate(payment.createdAt) }}</small>
                    </td>
                    <td>
                      <small>
                        {{ formatDate(payment.periodFrom) }}<br />
                        {{ formatDate(payment.periodTo) }}
                      </small>
                    </td>
                    <td class="text-end">
                      <span class="badge bg-info">{{ payment.totalIncomes || 0 }}</span>
                    </td>
                    <td class="text-end">
                      <strong class="text-danger">${{ formatCurrency(payment.totalCommission) }}</strong>
                    </td>
                    <td>
                      <small class="text-danger">
                        <i class="bi bi-x-circle"></i> {{ formatDate(payment.cancelledAt) }}
                      </small>
                    </td>
                    <td @click.stop>
                      <button
                        class="btn btn-sm btn-link p-0"
                        @click="toggleRowExpansion(payment.id)"
                        :title="isRowExpanded(payment.id) ? $t('commissionPayments.hideDetails') : $t('commissionPayments.showDetails')"
                      >
                        <i
                          class="bi"
                          :class="isRowExpanded(payment.id) ? 'bi-chevron-up' : 'bi-chevron-down'"
                        ></i>
                      </button>
                    </td>
                  </tr>
                  <!-- Fila expandida con detalles -->
                  <tr v-if="isRowExpanded(payment.id)">
                    <td colspan="7" class="p-0">
                      <div class="commission-payment-details p-3 bg-light">
                        <CommissionPaymentCard
                          :payment="payment"
                          :professionals="professionals"
                          :commerce="commerce"
                          :business="business"
                          :auto-expand="true"
                          @view-outcome="handleViewOutcome"
                        />
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          <div v-if="totalPages > 1" class="row mt-3">
            <div class="col-12 d-flex justify-content-between align-items-center">
              <div>
                <small class="text-muted">
                  Mostrando {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, getFilteredPayments.length) }} de {{ getFilteredPayments.length }}
                </small>
              </div>
              <nav>
                <ul class="pagination pagination-sm mb-0">
                  <li class="page-item" :class="{ disabled: currentPage === 1 }">
                    <button class="page-link" @click="currentPage = Math.max(1, currentPage - 1)">
                      <i class="bi bi-chevron-left"></i>
                    </button>
                  </li>
                  <li
                    v-for="page in Math.min(5, totalPages)"
                    :key="page"
                    class="page-item"
                    :class="{ active: currentPage === page }"
                  >
                    <button class="page-link" @click="currentPage = page">{{ page }}</button>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                    <button
                      class="page-link"
                      @click="currentPage = Math.min(totalPages, currentPage + 1)"
                    >
                      <i class="bi bi-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <!-- Vista de Cards (fallback) -->
      <div v-else-if="viewMode === 'cards' && getFilteredPayments.length > 0" class="row">
        <div v-for="payment in paginatedPayments" :key="payment.id" class="col-12 mb-3">
          <CommissionPaymentCard
            :payment="payment"
            :professionals="professionals"
            :commerce="commerce"
            :business="business"
            @view-outcome="handleViewOutcome"
          />
        </div>
      </div>

      <Message
        v-else-if="getFilteredPayments.length === 0"
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
      :business="business"
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

/* Estilos para la sección de filtros */
.filter-section-compact {
  background: rgba(248, 249, 250, 0.8);
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
}

.filter-section-compact .form-check {
  margin-bottom: 0;
}

.filter-section-compact .form-check-label {
  display: flex;
  align-items: center;
  font-weight: 500;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.filter-section-compact .form-check-label:hover {
  color: #212529;
}

.service-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 5px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.filter-section-compact .service-status-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
}

.service-status-badge.executed {
  background-color: rgba(40, 167, 69, 0.15);
  color: #155724;
}

.service-status-badge.pending {
  background-color: rgba(255, 193, 7, 0.15);
  color: #856404;
}

.service-status-badge.direct {
  background-color: rgba(23, 162, 184, 0.15);
  color: #0c5460;
}

.form-check-input:checked {
  background-color: #00c2cb;
  border-color: #00c2cb;
}

.form-check-input:focus {
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 0.2rem rgba(0, 194, 203, 0.25);
}

/* Estilos para tabla compacta de pagos de comisiones */
.commission-payments-table {
  font-size: 0.875rem;
}

.commission-payments-table thead th {
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #dee2e6;
  padding: 0.5rem 0.75rem;
  white-space: nowrap;
  vertical-align: middle;
  line-height: 1.5;
}

.commission-payments-table tbody td {
  padding: 0.5rem 0.75rem;
  vertical-align: middle;
  line-height: 1.5;
}

.commission-payment-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.commission-payment-row:hover {
  background-color: #f8f9fa;
}

.commission-payment-row.table-active {
  background-color: #e7f3ff;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-right: 1.5rem !important;
}

.sortable-header:hover {
  background-color: #e9ecef;
}

.sortable-header i {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  opacity: 0.6;
}

.sortable-header:hover i {
  opacity: 1;
}

.commission-payment-details {
  border-top: 2px solid #dee2e6;
  animation: slideDown 0.3s ease;
}

/* Estilos para select con flecha */
.select-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.select-wrapper::after {
  content: '\f282';
  font-family: 'bootstrap-icons';
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #6c757d;
  font-size: 0.875rem;
  z-index: 1;
}

.select-wrapper select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 2.5rem;
  background-image: none;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 1000px;
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .commission-payments-table {
    font-size: 0.75rem;
  }

  .commission-payments-table thead th,
  .commission-payments-table tbody td {
    padding: 0.375rem 0.5rem;
  }

  .sortable-header {
    font-size: 0.7rem;
  }
}

.metric-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.table-hover tbody tr:hover {
  background-color: #f8f9fa;
}

/* Commission Summary Card - matching modern-card style */
.commission-summary-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-left: 4px solid #004aad;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 1.25rem 1.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.commission-summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(169, 169, 169, 0.3);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: .8rem;
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.summary-value.text-success {
  color: #00c2cb;
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
  padding: 1px;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.25rem .5rem;
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
  font-size: 10px;
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
