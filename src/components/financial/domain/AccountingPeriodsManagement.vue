<template>
  <div>
    <!-- Desktop Filters Slot - outside main v-if for filters panel -->
    <slot
      v-if="filtersLocation === 'slot' && !showAccountingPeriodsManagement"
      name="filters-exposed"
      :searchText="searchText"
      :statusFilter="statusFilter"
      :yearFilter="yearFilter"
      :startDateFilter="startDateFilter"
      :endDateFilter="endDateFilter"
      :clearFilters="clearFilters"
      :searchPeriods="searchPeriods"
    ></slot>

    <div v-if="showAccountingPeriodsManagement">
      <div class="row g-3">
        <!-- Header with Create Button -->
        <div class="col-12 d-flex justify-content-between align-items-center mb-2">
          <h5 class="mb-0 fw-bold">
            <i class="bi bi-calendar-check me-2"></i>
            {{ $t('financial.periods.title') }}
          </h5>
          <button
            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
            @click="showCreateModal = true"
          >
            <i class="bi bi-plus-lg me-1"></i>
            {{ $t('financial.periods.newPeriod') }}
          </button>
        </div>

        <!-- Desktop Filters Slot (when shown inline with content) -->
        <slot
          v-if="filtersLocation === 'slot' && showAccountingPeriodsManagement"
          name="filters-exposed"
          :searchText="searchText"
          :statusFilter="statusFilter"
          :yearFilter="yearFilter"
          :startDateFilter="startDateFilter"
          :endDateFilter="endDateFilter"
          :clearFilters="clearFilters"
          :searchPeriods="searchPeriods"
        ></slot>

      <!-- Mobile Filters (Hidden on Desktop) -->
      <div v-if="filtersLocation !== 'slot'" class="my-2 row metric-card d-lg-none">
        <div class="col-12">
          <span class="metric-card-subtitle">
            <span
              class="form-check-label metric-keyword-subtitle mx-1"
              @click="showFilterOptions = !showFilterOptions"
            >
              <i class="bi bi-search"></i> {{ $t('dashboard.aditionalFilters') }}
              <i :class="`bi ${showFilterOptions ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
            </span>
          </span>
          <button
            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-1 mx-1"
            @click="clearFilters()"
          >
            <span><i class="bi bi-eraser-fill"></i></span>
          </button>
        </div>
        <div v-if="showFilterOptions" class="col-12 mt-3">
          <div class="m-1">
            <div class="row g-2">
              <div class="col-12">
                <input
                  type="text"
                  class="form-control metric-controls"
                  v-model="searchText"
                  :placeholder="$t('dashboard.search')"
                />
              </div>
              <div class="col-6">
                <select v-model="statusFilter" class="form-select metric-controls">
                  <option value="">{{ $t('dashboard.all') || 'Todos' }}</option>
                  <option value="OPEN">Aberto</option>
                  <option value="CLOSED">Fechado</option>
                  <option value="LOCKED">Bloqueado</option>
                </select>
              </div>
              <div class="col-6">
                <input
                  v-model="yearFilter"
                  type="number"
                  class="form-control metric-controls"
                  placeholder="Año"
                  min="2020"
                  max="2030"
                />
              </div>
              <div class="col-6">
                <input
                  v-model="startDateFilter"
                  type="date"
                  class="form-control metric-controls"
                />
              </div>
              <div class="col-6">
                <input
                  v-model="endDateFilter"
                  type="date"
                  class="form-control metric-controls"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination Info -->
      <div v-if="!loading && totalPeriods > 0" class="col-12">
        <div class="mt-3 d-flex justify-content-center align-items-center flex-wrap gap-2">
          <span class="badge bg-secondary px-3 py-2 m-1">Registros: {{ totalPeriods }}</span>
          <span class="badge bg-secondary px-3 py-2 m-1">Página {{ page }} de {{ totalPages }}</span>
          <select v-model.number="limit" class="btn btn-sm btn-light fw-bold text-dark select mx-1">
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      <!-- Pagination Controls -->
      <div v-if="!loading && totalPeriods > 0" class="col-12">
        <div class="centered">
          <nav>
            <ul class="pagination">
              <li class="page-item">
                <button
                  class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                  aria-label="First"
                  :disabled="page === 1"
                  @click="changePage(1)"
                >
                  <span aria-hidden="true"><i class="bi bi-arrow-bar-left"></i></span>
                </button>
              </li>
              <li class="page-item">
                <button
                  class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                  aria-label="Previous"
                  :disabled="page === 1"
                  @click="changePage(page - 1)"
                >
                  <span aria-hidden="true">«</span>
                </button>
              </li>
              <li>
                <select
                  v-model.number="page"
                  class="btn btn-md btn-light fw-bold text-dark select mx-1"
                >
                  <option v-for="p in totalPages" :key="p" :value="p">{{ p }}</option>
                </select>
              </li>
              <li class="page-item">
                <button
                  class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                  aria-label="Next"
                  :disabled="page === totalPages"
                  @click="changePage(page + 1)"
                >
                  <span aria-hidden="true">»</span>
                </button>
              </li>
              <li class="page-item">
                <button
                  class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                  aria-label="Last"
                  :disabled="page === totalPages"
                  @click="changePage(totalPages)"
                >
                  <span aria-hidden="true"><i class="bi bi-arrow-bar-right"></i></span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="col-12 text-center py-5">
        <Spinner />
      </div>

      <!-- Error -->
      <Alert v-if="alertError" :show="alertError.length > 0" :message="alertError" />

      <!-- Periods List with PeriodDetailsCard -->
      <div v-if="!loading && paginatedPeriods.length > 0" class="col-12">
        <PeriodDetailsCard
          v-for="period in paginatedPeriods"
          :key="period.id"
          :period="period"
          @close-period="openClosePeriodModal"
          @reopen-period="openReopenModal"
          @lock-period="openLockModal"
          @view-details="viewPeriodDetails"
        />
      </div>

      <!-- Empty State -->
      <div v-if="!loading && paginatedPeriods.length === 0 && totalPeriods === 0" class="col-12">
        <div class="text-center py-5">
          <i class="bi bi-calendar-x" style="font-size: 2.5rem; color: #6c757d; opacity: 0.5;"></i>
          <h6 class="mt-3 fw-bold">No hay períodos contables</h6>
          <p class="text-muted" style="font-size: 0.9rem;">Crea tu primer período para comenzar el control contable</p>
          <button class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 mt-2" @click="showCreateModal = true">
            <i class="bi bi-plus-lg me-1"></i>
            {{ $t('financial.periods.newPeriod') }}
          </button>
        </div>
      </div>

      <!-- No Results from Filters -->
      <div v-if="!loading && paginatedPeriods.length === 0 && totalPeriods > 0" class="col-12">
        <div class="text-center py-5">
          <i class="bi bi-funnel" style="font-size: 2.5rem; color: #6c757d; opacity: 0.5;"></i>
          <h6 class="mt-3 fw-bold">No se encontraron períodos con los filtros aplicados</h6>
          <button class="btn btn-sm btn-outline-secondary rounded-pill px-4 mt-2" @click="clearFilters">
            <i class="bi bi-x-lg me-1"></i>
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>

    <!-- Create Period Modal -->
    <div
      v-if="showCreateModal"
      class="modal fade show"
      tabindex="-1"
      style="display: block; z-index: 1055;"
    >
      <div class="modal-backdrop fade show" style="z-index: 1054;"></div>
      <div class="modal-dialog" style="z-index: 1056;">
        <div class="modal-content">
          <div class="modal-header border-0 active-name modern-modal-header">
            <div class="modern-modal-header-inner">
              <div class="modern-modal-icon-wrapper">
                <i class="bi bi-plus-lg"></i>
              </div>
              <div class="modern-modal-title-wrapper">
                <h5 class="modal-title fw-bold modern-modal-title">
                  {{ $t('financial.periods.create.title') }}
                </h5>
              </div>
            </div>
            <button
              type="button"
              class="modern-modal-close-btn"
              @click="closeCreateModal"
              aria-label="Close"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="createPeriod">
              <div class="mb-3">
                <label class="form-label">{{ $t('financial.periods.periodName') }} *</label>
                <input
                  v-model="newPeriod.name"
                  type="text"
                  class="form-control"
                  :placeholder="$t('financial.periods.create.namePlaceholder')"
                  required
                />
              </div>
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">{{ $t('financial.periods.startDate') }} *</label>
                    <input
                      v-model="newPeriod.startDate"
                      type="date"
                      class="form-control"
                      required
                    />
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">{{ $t('financial.periods.endDate') }} *</label>
                    <input
                      v-model="newPeriod.endDate"
                      type="date"
                      class="form-control"
                      required
                    />
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">{{ $t('financial.periods.close.notes') }}</label>
                <textarea
                  v-model="newPeriod.notes"
                  class="form-control"
                  rows="3"
                  :placeholder="$t('financial.periods.close.notesPlaceholder')"
                ></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer border-0">
            <button type="button" class="btn btn-sm btn-secondary rounded-pill px-4" @click="closeCreateModal">
              {{ $t('common.cancel') }}
            </button>
            <button
              type="button"
              class="btn btn-sm btn-dark rounded-pill px-4"
              @click="createPeriod"
              :disabled="creatingPeriod"
            >
              <span v-if="creatingPeriod">
                <span class="spinner-border spinner-border-sm me-2"></span>
                {{ $t('financial.periods.create.creating') }}
              </span>
              <span v-else>
                <i class="bi bi-check-lg me-2"></i>
                {{ $t('common.create') }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Close Period Modal -->
    <ClosePeriodModal
      v-if="showCloseModal"
      :show="showCloseModal"
      :period="selectedPeriod"
      @close="showCloseModal = false"
      @period-closed="onPeriodClosed"
    />

    <!-- Reopen Modal -->
    <div
      v-if="showReopenModal"
      class="modal fade show"
      tabindex="-1"
      style="display: block; z-index: 1055;"
    >
      <div class="modal-backdrop fade show" style="z-index: 1054;"></div>
      <div class="modal-dialog" style="z-index: 1056;">
        <div class="modal-content">
          <div class="modal-header border-0 active-name modern-modal-header">
            <div class="modern-modal-header-inner">
              <div class="modern-modal-icon-wrapper">
                <i class="bi bi-unlock"></i>
              </div>
              <div class="modern-modal-title-wrapper">
                <h5 class="modal-title fw-bold modern-modal-title">
                  {{ $t('financial.periods.reopen.title') }}
                </h5>
                <p v-if="selectedPeriod" class="modern-modal-subtitle">
                  {{ selectedPeriod.name }}
                </p>
              </div>
            </div>
            <button
              type="button"
              class="modern-modal-close-btn"
              @click="showReopenModal = false"
              aria-label="Close"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body">
            <p>{{ $t('financial.periods.reopen.confirmMessage', { name: selectedPeriod?.name }) }}</p>
            <div class="mb-3">
              <label class="form-label">{{ $t('financial.periods.reopen.reason') }} *</label>
              <textarea
                v-model="reopenReason"
                class="form-control"
                rows="3"
                :placeholder="$t('financial.periods.reopen.reasonPlaceholder')"
                required
              ></textarea>
            </div>
          </div>
          <div class="modal-footer border-0">
            <button type="button" class="btn btn-sm btn-secondary rounded-pill px-4" @click="showReopenModal = false">
              {{ $t('common.cancel') }}
            </button>
            <button
              type="button"
              class="btn btn-sm btn-dark rounded-pill px-4"
              @click="reopenPeriod"
              :disabled="reopeningPeriod || !reopenReason"
            >
              <span v-if="reopeningPeriod">
                <span class="spinner-border spinner-border-sm me-2"></span>
                {{ $t('financial.periods.reopen.reopening') }}
              </span>
              <span v-else>
                <i class="bi bi-unlock me-2"></i>
                {{ $t('financial.periods.actions.reopen') }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Lock Modal -->
    <div
      v-if="showLockModal"
      class="modal fade show"
      tabindex="-1"
      style="display: block; z-index: 1055;"
    >
      <div class="modal-backdrop fade show" style="z-index: 1054;"></div>
      <div class="modal-dialog" style="z-index: 1056;">
        <div class="modal-content">
          <div class="modal-header border-0 active-name modern-modal-header">
            <div class="modern-modal-header-inner">
              <div class="modern-modal-icon-wrapper">
                <i class="bi bi-shield-lock"></i>
              </div>
              <div class="modern-modal-title-wrapper">
                <h5 class="modal-title fw-bold modern-modal-title">
                  {{ $t('financial.periods.lock.title') }}
                </h5>
                <p v-if="selectedPeriod" class="modern-modal-subtitle">
                  {{ selectedPeriod.name }}
                </p>
              </div>
            </div>
            <button
              type="button"
              class="modern-modal-close-btn"
              @click="showLockModal = false"
              aria-label="Close"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="alert alert-warning">
              <i class="bi bi-exclamation-triangle me-2"></i>
              {{ $t('financial.periods.lock.confirmMessage', { name: selectedPeriod?.name }) }}
            </div>
            <div class="mb-3">
              <label class="form-label">{{ $t('financial.periods.lock.reason') }} *</label>
              <textarea
                v-model="lockReason"
                class="form-control"
                rows="3"
                :placeholder="$t('financial.periods.lock.reasonPlaceholder')"
                required
              ></textarea>
            </div>
          </div>
          <div class="modal-footer border-0">
            <button type="button" class="btn btn-sm btn-secondary rounded-pill px-4" @click="showLockModal = false">
              {{ $t('common.cancel') }}
            </button>
            <button
              type="button"
              class="btn btn-sm btn-danger rounded-pill px-4"
              @click="lockPeriod"
              :disabled="lockingPeriod || !lockReason"
            >
              <span v-if="lockingPeriod">
                <span class="spinner-border spinner-border-sm me-2"></span>
                {{ $t('financial.periods.lock.locking') }}
              </span>
              <span v-else>
                <i class="bi bi-shield-lock me-2"></i>
                {{ $t('financial.periods.actions.lock') }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Period Report Modal -->
    <PeriodReportModal
      v-if="selectedPeriod"
      :show="showReportModal"
      :period="selectedPeriod"
      @close="showReportModal = false"
    />
    </div>
  </div>
</template>

<script>
import { ref, onBeforeMount, computed, watch } from 'vue';
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import PeriodStatusBadge from '../common/PeriodStatusBadge.vue';
import PeriodDetailsCard from './common/PeriodDetailsCard.vue';
import ClosePeriodModal from './ClosePeriodModal.vue';
import PeriodReportModal from './PeriodReportModal.vue';
import {
  getPeriodsByCommerce,
  createPeriod as createPeriodService,
  reopenPeriod as reopenPeriodService,
  lockPeriod as lockPeriodService,
} from '../../../application/services/accountingPeriod';
import { globalStore } from '../../../stores';

export default {
  name: 'AccountingPeriodsManagement',
  components: {
    Spinner,
    Alert,
    PeriodStatusBadge,
    PeriodDetailsCard,
    ClosePeriodModal,
    PeriodReportModal,
  },
  props: {
    showAccountingPeriodsManagement: { type: Boolean, default: false },
    commerce: { type: Object, required: true },
    filtersLocation: { type: String, default: 'inline' }, // 'inline' or 'slot'
    toggles: { type: Object, default: () => ({}) },
    business: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const store = globalStore();
    const loading = ref(false);
    const alertError = ref('');
    const periods = ref([]);

    // Pagination
    const page = ref(1);
    const limit = ref(10);
    const totalPeriods = ref(0);

    // Filters
    const searchText = ref('');
    const statusFilter = ref('');
    const yearFilter = ref('');
    const startDateFilter = ref('');
    const endDateFilter = ref('');

    // Mobile filters toggle
    const showFilterOptions = ref(false);

    // Create modal
    const showCreateModal = ref(false);
    const creatingPeriod = ref(false);
    const newPeriod = ref({
      name: '',
      startDate: '',
      endDate: '',
      notes: '',
    });

    // Close modal
    const showCloseModal = ref(false);
    const selectedPeriod = ref(null);

    // Report modal
    const showReportModal = ref(false);

    // Reopen modal
    const showReopenModal = ref(false);
    const reopeningPeriod = ref(false);
    const reopenReason = ref('');

    // Lock modal
    const showLockModal = ref(false);
    const lockingPeriod = ref(false);
    const lockReason = ref('');

    const loadPeriods = async () => {
      try {
        loading.value = true;
        alertError.value = '';

        // Get paginated results
        const filters = {
          limit: limit.value,
          offset: (page.value - 1) * limit.value,
        };

        periods.value = await getPeriodsByCommerce(props.commerce.id, filters);

        // Get total count without pagination (separate call)
        const allPeriods = await getPeriodsByCommerce(props.commerce.id, {});
        totalPeriods.value = allPeriods.length;
      } catch (error) {
        console.error('Error loading periods:', error);
        alertError.value = error.response?.data?.message || 'Error al cargar períodos';
      } finally {
        loading.value = false;
      }
    };

    const searchPeriods = async (directFilters = null) => {
      try {
        loading.value = true;
        alertError.value = '';

        const filters = directFilters || {
          searchText: searchText.value || undefined,
          status: statusFilter.value || undefined,
          year: yearFilter.value || undefined,
          startDate: startDateFilter.value || undefined,
          endDate: endDateFilter.value || undefined,
        };

        console.log('🔍 Searching periods with filters:', filters);

        // Get paginated results with filters
        const paginatedFilters = {
          ...filters,
          limit: limit.value,
          offset: (page.value - 1) * limit.value,
        };

        periods.value = await getPeriodsByCommerce(props.commerce.id, paginatedFilters);

        // Get total count with filters but without pagination
        const allPeriods = await getPeriodsByCommerce(props.commerce.id, filters);
        totalPeriods.value = allPeriods.length;

        console.log('✅ Periods found:', periods.value.length, 'of', totalPeriods.value);
      } catch (error) {
        console.error('❌ Error searching periods:', error);
        alertError.value = error.response?.data?.message || 'Error al buscar períodos';
      } finally {
        loading.value = false;
      }
    };

    const createPeriod = async () => {
      try {
        creatingPeriod.value = true;
        alertError.value = '';

        const periodData = {
          ...newPeriod.value,
          commerceId: props.commerce.id,
          createdBy: store.currentUser?.email || store.currentUser?.id || 'system',
        };

        await createPeriodService(periodData);

        // Reset form and close modal
        newPeriod.value = { name: '', startDate: '', endDate: '', notes: '' };
        showCreateModal.value = false;

        // Reload periods
        await loadPeriods();
      } catch (error) {
        console.error('Error creating period:', error);
        alertError.value = error.response?.data?.message || 'Error al crear período';
      } finally {
        creatingPeriod.value = false;
      }
    };

    const closeCreateModal = () => {
      showCreateModal.value = false;
      newPeriod.value = { name: '', startDate: '', endDate: '', notes: '' };
    };

    const openClosePeriodModal = (period) => {
      selectedPeriod.value = period;
      showCloseModal.value = true;
    };

    const onPeriodClosed = async () => {
      showCloseModal.value = false;
      await loadPeriods();
    };

    const openReopenModal = (period) => {
      selectedPeriod.value = period;
      reopenReason.value = '';
      showReopenModal.value = true;
    };

    const reopenPeriod = async () => {
      try {
        reopeningPeriod.value = true;
        alertError.value = '';

        await reopenPeriodService(selectedPeriod.value.id, {
          reason: reopenReason.value,
        });

        showReopenModal.value = false;
        await loadPeriods();
      } catch (error) {
        console.error('Error reopening period:', error);
        alertError.value = error.response?.data?.message || 'Error al reabrir período';
      } finally {
        reopeningPeriod.value = false;
      }
    };

    const openLockModal = (period) => {
      selectedPeriod.value = period;
      lockReason.value = '';
      showLockModal.value = true;
    };

    const lockPeriod = async () => {
      try {
        lockingPeriod.value = true;
        alertError.value = '';

        await lockPeriodService(selectedPeriod.value.id, {
          reason: lockReason.value,
        });

        showLockModal.value = false;
        await loadPeriods();
      } catch (error) {
        console.error('Error locking period:', error);
        alertError.value = error.response?.data?.message || 'Error al bloquear período';
      } finally {
        lockingPeriod.value = false;
      }
    };

    const viewPeriodDetails = (period) => {
      console.log('View period details:', period);
      selectedPeriod.value = period;
      showReportModal.value = true;
    };

    const formatDate = (date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatDateTime = (date) => {
      if (!date) return '';
      return new Date(date).toLocaleString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    // Filtered and paginated periods (now handled by backend)
    const filteredPeriods = computed(() => {
      // Backend ya maneja filtros y paginación
      return periods.value;
    });

    const paginatedPeriods = computed(() => {
      // Backend ya maneja la paginación, solo devolvemos lo que tenemos
      return filteredPeriods.value;
    });

    const totalPages = computed(() => {
      return Math.ceil(totalPeriods.value / limit.value);
    });

    const clearFilters = () => {
      searchText.value = '';
      statusFilter.value = '';
      yearFilter.value = '';
      startDateFilter.value = '';
      endDateFilter.value = '';
      page.value = 1;
      loadPeriods(); // Recargar sin filtros
    };

    const changePage = (newPage) => {
      if (newPage >= 1 && newPage <= totalPages.value) {
        page.value = newPage;
      }
    };

    // Watch filters for auto-search (debounced)
    let searchTimeout = null;
    watch([searchText, statusFilter, yearFilter, startDateFilter, endDateFilter], () => {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        page.value = 1; // Reset to first page when filters change
        searchPeriods();
      }, 500); // 500ms para dar tiempo a escribir
    });

    // Watch limit changes
    watch(limit, () => {
      page.value = 1; // Reset to first page when changing limit
      if (hasActiveFilters()) {
        searchPeriods();
      } else {
        loadPeriods();
      }
    });

    // Watch page changes
    watch(page, () => {
      if (hasActiveFilters()) {
        searchPeriods();
      } else {
        loadPeriods();
      }
    });

    // Helper to check if any filter is active
    const hasActiveFilters = () => {
      return searchText.value || statusFilter.value || yearFilter.value ||
             startDateFilter.value || endDateFilter.value;
    };

    onBeforeMount(async () => {
      if (props.commerce?.id) {
        await loadPeriods();
      }
    });

    return {
      loading,
      alertError,
      paginatedPeriods,
      page,
      limit,
      totalPeriods,
      totalPages,
      searchText,
      statusFilter,
      yearFilter,
      startDateFilter,
      endDateFilter,
      showFilterOptions,
      clearFilters,
      changePage,
      searchPeriods,
      showCreateModal,
      creatingPeriod,
      newPeriod,
      showCloseModal,
      selectedPeriod,
      showReopenModal,
      reopeningPeriod,
      reopenReason,
      showLockModal,
      lockingPeriod,
      lockReason,
      createPeriod,
      closeCreateModal,
      openClosePeriodModal,
      onPeriodClosed,
      openReopenModal,
      reopenPeriod,
      openLockModal,
      lockPeriod,
      viewPeriodDetails,
      formatDate,
      formatDateTime,
      formatCurrency,
      showReportModal,
    };
  },
};
</script>

<style scoped>
/* Removed old period-card styles - now using PeriodDetailsCard component */

.metric-card {
  background-color: var(--color-background);
  padding: 0.75rem;
  margin: 0.5rem 0;
  border-radius: 0.5rem;
  border: 1px solid #e0e0e0;
}

.pagination .page-link {
  color: var(--azul-turno);
  border-color: #dee2e6;
}

.pagination .page-item.active .page-link {
  background-color: var(--azul-turno);
  border-color: var(--azul-turno);
}

.pagination .page-link:hover {
  background-color: rgba(0, 74, 173, 0.1);
}

.modal-backdrop {
  background-color: rgba(0, 0, 0, 0.5);
}

/* Pagination Styles */
.centered {
  display: flex;
  justify-content: center;
  align-items: center;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.select {
  min-width: 60px;
  text-align: center;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  padding: 0.375rem 0.75rem;
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
