<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import {
  getLogsByEntity,
  getLogsByUser,
  getLogsByAction,
  generateAuditReport,
} from '../../application/services/audit-log';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopContentLayout from '../../components/common/desktop/DesktopContentLayout.vue';
import DesktopFiltersPanel from '../../components/common/desktop/DesktopFiltersPanel.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import DateRangeFilters from '../../components/common/desktop/DateRangeFilters.vue';
import { DateModel } from '../../shared/utils/date.model';

export default {
  name: 'BusinessAuditLog',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ComponentMenu,
    DesktopContentLayout,
    DesktopFiltersPanel,
    DesktopPageHeader,
    DateRangeFilters,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      logs: [],
      filteredLogs: [],
      report: null,
      filters: {
        userId: '',
        entityType: '',
        entityId: '',
        action: '',
        startDate: null,
        endDate: null,
      },
      toggles: {},
      searchText: '',
      selectedAction: '',
      selectedEntityType: '',
      page: 1,
      limit: 50,
      totalPages: 1,
      actions: [
        { value: '', label: 'Todas las acciones' },
        { value: 'CREATE', label: 'Crear' },
        { value: 'READ', label: 'Leer' },
        { value: 'UPDATE', label: 'Actualizar' },
        { value: 'DELETE', label: 'Eliminar' },
        { value: 'SIGN', label: 'Assinar' },
        { value: 'EXPORT', label: 'Exportar' },
        { value: 'PRINT', label: 'Imprimir' },
        { value: 'ACCESS', label: 'Acceder' },
        { value: 'LOGIN', label: 'Iniciar Sesión' },
        { value: 'LOGOUT', label: 'Cerrar Sesión' },
      ],
      entityTypes: [
        { value: '', label: 'Todos los tipos' },
        { value: 'prescription', label: 'Prescripción' },
        { value: 'exam_order', label: 'Orden de Examen' },
        { value: 'reference', label: 'Referencia Médica' },
        { value: 'patient_history', label: 'Historial del Paciente' },
        { value: 'document', label: 'Documento' },
        { value: 'client', label: 'Cliente' },
        { value: 'attention', label: 'Atención' },
      ],
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Load audit logs when commerce changes
    const loadAuditLogs = async () => {
      if (!commerce.value || !commerce.value.id) {
        state.logs = [];
        state.filteredLogs = [];
        state.report = null;
        return;
      }

      try {
        loading.value = true;
        alertError.value = '';

        const filters = {
          ...state.filters,
          businessId: state.business?.id,
          commerceId: commerce.value.id,
          startDate: state.filters.startDate
            ? new Date(state.filters.startDate).toISOString()
            : undefined,
          endDate: state.filters.endDate
            ? new Date(state.filters.endDate).toISOString()
            : undefined,
        };

        const report = await generateAuditReport(filters);
        state.report = report;
        state.logs = report.logs || [];
        state.filteredLogs = state.logs;
        state.totalPages = Math.ceil((report.total || 0) / state.limit);
      } catch (error) {
        console.error('Error loading audit logs:', error);
        alertError.value = error.message || 'Error al cargar los logs de auditoría';
        state.logs = [];
        state.filteredLogs = [];
        state.report = null;
      } finally {
        loading.value = false;
      }
    };

    // Watch for commerce changes and reload audit logs
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            // Immediately clear data to prevent showing old results
            state.logs = [];
            state.filteredLogs = [];
            state.report = null;
            await loadAuditLogs();
          } catch (error) {
            state.logs = [];
            state.filteredLogs = [];
            state.report = null;
            loading.value = false;
          }
        } else if (!newCommerce || !newCommerce.id) {
          // Clear data if no commerce selected
          state.logs = [];
          state.filteredLogs = [];
          state.report = null;
        }
      },
      { immediate: false }
    );

    const applyFilters = () => {
      let filtered = [...state.logs];

      // Filter by search text
      if (state.searchText) {
        const searchLower = state.searchText.toLowerCase();
        filtered = filtered.filter(
          log =>
            log.userName?.toLowerCase().includes(searchLower) ||
            log.userEmail?.toLowerCase().includes(searchLower) ||
            log.entityName?.toLowerCase().includes(searchLower) ||
            log.entityId?.toLowerCase().includes(searchLower) ||
            log.ipAddress?.toLowerCase().includes(searchLower)
        );
      }

      // Filter by action
      if (state.selectedAction) {
        filtered = filtered.filter(log => log.action === state.selectedAction);
      }

      // Filter by entity type
      if (state.selectedEntityType) {
        filtered = filtered.filter(log => log.entityType === state.selectedEntityType);
      }

      state.filteredLogs = filtered;
    };

    const exportReport = async () => {
      if (!commerce.value || !commerce.value.id) {
        alertError.value = 'No hay comercio seleccionado';
        return;
      }

      try {
        loading.value = true;
        const filters = {
          ...state.filters,
          businessId: state.business?.id,
          commerceId: commerce.value.id,
          startDate: state.filters.startDate
            ? new Date(state.filters.startDate).toISOString()
            : undefined,
          endDate: state.filters.endDate
            ? new Date(state.filters.endDate).toISOString()
            : undefined,
        };

        const report = await generateAuditReport(filters);

        // Create CSV content
        const headers = [
          'Fecha',
          'Usuario',
          'Acción',
          'Tipo de Entidad',
          'ID de Entidad',
          'Resultado',
          'IP',
          'User Agent',
        ];
        const rows = report.logs.map(log => [
          new Date(log.timestamp).toLocaleString(),
          log.userName || log.userEmail || log.userId,
          log.action,
          log.entityType,
          log.entityId,
          log.result,
          log.ipAddress || '',
          log.userAgent || '',
        ]);

        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `audit-log-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error exporting report:', error);
        alertError.value = 'Error al exportar el reporte';
      } finally {
        loading.value = false;
      }
    };

    const getActionBadgeClass = action => {
      const classes = {
        CREATE: 'badge bg-success',
        READ: 'badge bg-info',
        UPDATE: 'badge bg-warning',
        DELETE: 'badge bg-danger',
        SIGN: 'badge bg-primary',
        EXPORT: 'badge bg-secondary',
        PRINT: 'badge bg-dark',
        ACCESS: 'badge bg-light text-dark',
        LOGIN: 'badge bg-success',
        LOGOUT: 'badge bg-secondary',
      };
      return classes[action] || 'badge bg-secondary';
    };

    const getResultBadgeClass = result => {
      const classes = {
        SUCCESS: 'badge bg-success',
        FAILURE: 'badge bg-danger',
        PARTIAL: 'badge bg-warning',
      };
      return classes[result] || 'badge bg-secondary';
    };

    const formatDate = date => {
      if (!date) return '';
      return new Date(date).toLocaleString();
    };

    const showLogDetails = log => {
      // Show log details in a modal or expandable row
      const details = {
        id: log.id,
        timestamp: formatDate(log.timestamp),
        user: {
          id: log.userId,
          name: log.userName,
          email: log.userEmail,
        },
        action: log.action,
        entity: {
          type: log.entityType,
          id: log.entityId,
          name: log.entityName,
        },
        result: log.result,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        sessionId: log.sessionId,
        changes: log.changes,
        errorMessage: log.errorMessage,
        metadata: log.metadata,
        complianceFlags: log.complianceFlags,
      };

      // Create a formatted message
      const message = `
        <div class="log-details">
          <h6>Detalles del Log</h6>
          <p><strong>ID:</strong> ${details.id}</p>
          <p><strong>Fecha:</strong> ${details.timestamp}</p>
          <p><strong>Usuario:</strong> ${
            details.user.name || details.user.email || details.user.id
          }</p>
          <p><strong>Acción:</strong> ${details.action}</p>
          <p><strong>Tipo de Entidad:</strong> ${details.entity.type}</p>
          <p><strong>ID de Entidad:</strong> ${details.entity.id}</p>
          <p><strong>Resultado:</strong> ${details.result}</p>
          ${details.ipAddress ? `<p><strong>IP:</strong> ${details.ipAddress}</p>` : ''}
          ${details.userAgent ? `<p><strong>User Agent:</strong> ${details.userAgent}</p>` : ''}
          ${
            details.changes
              ? `<p><strong>Cambios:</strong> ${JSON.stringify(details.changes, null, 2)}</p>`
              : ''
          }
          ${details.errorMessage ? `<p><strong>Error:</strong> ${details.errorMessage}</p>` : ''}
        </div>
      `;

      alert(message.replace(/<[^>]*>/g, '')); // Simple alert, could be replaced with a modal
    };

    const goBack = () => {
      router.back();
    };

    const handleQuickDateSelect = async ({ type, startDate, endDate }) => {
      state.filters.startDate = startDate;
      state.filters.endDate = endDate;
      await loadAuditLogs();
    };

    const handleDateRangeChange = async () => {
      await loadAuditLogs();
    };

    const getToday = async () => {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      state.filters.startDate = new Date(`${year}-${month}-${day}`);
      state.filters.endDate = new Date(`${year}-${month}-${day}`);
      await loadAuditLogs();
    };

    const getCurrentMonth = async () => {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      const startDate = new Date(`${year}-${month}-01`);
      const endDate = new Date(`${year}-${month}-${day}`);
      state.filters.startDate = startDate;
      state.filters.endDate = endDate;
      await loadAuditLogs();
    };

    const getLastMonth = async () => {
      const date = new Date().toISOString().slice(0, 10);
      const dateModel = new DateModel(date);
      state.filters.startDate = new Date(dateModel.substractMonths(1).startOfMonth().toString());
      state.filters.endDate = new Date(dateModel.substractMonths(1).endOfMonth().toString());
      await loadAuditLogs();
    };

    const getLastThreeMonths = async () => {
      const date = new Date().toISOString().slice(0, 10);
      const dateModel = new DateModel(date);
      state.filters.startDate = new Date(dateModel.substractMonths(3).startOfMonth().toString());
      state.filters.endDate = new Date(dateModel.substractMonths(1).endOfMonth().toString());
      await loadAuditLogs();
    };

    const isActiveBusiness = computed(() => state.business && state.business.active === true);

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('audit-log', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Set default date range to last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        state.filters.startDate = startDate;
        state.filters.endDate = endDate;

        // Load audit logs for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadAuditLogs();
        }

        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    });

    return {
      state,
      loading,
      alertError,
      commerce,
      goBack,
      loadAuditLogs,
      applyFilters,
      exportReport,
      getActionBadgeClass,
      getResultBadgeClass,
      formatDate,
      handleQuickDateSelect,
      handleDateRangeChange,
      showLogDetails,
      isActiveBusiness,
      getToday,
      getCurrentMonth,
      getLastMonth,
      getLastThreeMonths,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :business-id="state.business?.id" :loading="loading"></CommerceLogo>
        <ComponentMenu
          :title="$t('audit-log.title')"
          :toggles="state.toggles"
          component-name="audit-log"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="!!alertError" :stack="alertError"></Alert>
        </div>
        <div id="audit-log">
          <div v-if="isActiveBusiness && state.toggles['audit-log.admin.view']">
            <div v-if="!commerce || !commerce.id" class="control-box">
              <Message
                :title="$t('audit-log.message.noCommerce.title')"
                :content="$t('audit-log.message.noCommerce.content')"
              />
            </div>
            <div v-else-if="state.report" class="mt-4">
              <!-- Summary Cards Mobile -->
              <div class="row mb-3">
                <div class="col-6 mb-3">
                  <div class="modern-metric-card metric-type-info">
                    <div class="metric-card-header">
                      <div class="metric-icon-container icon-info">
                        <i class="bi bi-list-check"></i>
                      </div>
                      <div class="metric-title-section">
                        <span class="metric-label">{{ $t('audit-log.summary.total') }}</span>
                      </div>
                    </div>
                    <div class="metric-value-container">
                      <span class="metric-value">{{ state.report.total || 0 }}</span>
                    </div>
                  </div>
                </div>
                <div class="col-6 mb-3">
                  <div class="modern-metric-card metric-type-success">
                    <div class="metric-card-header">
                      <div class="metric-icon-container icon-success">
                        <i class="bi bi-people"></i>
                      </div>
                      <div class="metric-title-section">
                        <span class="metric-label">{{ $t('audit-log.summary.uniqueUsers') }}</span>
                      </div>
                    </div>
                    <div class="metric-value-container">
                      <span class="metric-value">{{
                        Object.keys(state.report.byUser || {}).length
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Logs Table Mobile -->
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0">
                    <i class="bi bi-list-ul me-2"></i>
                    {{ $t('audit-log.logs') }} ({{ state.filteredLogs.length }})
                  </h5>
                </div>
                <div class="card-body">
                  <div v-if="state.filteredLogs.length === 0" class="text-center py-5">
                    <i class="bi bi-inbox" style="font-size: 3rem; color: #ccc"></i>
                    <p class="text-muted mt-3">{{ $t('audit-log.noLogs') }}</p>
                  </div>
                  <div v-else>
                    <div v-for="log in state.filteredLogs" :key="log.id" class="result-card mb-3">
                      <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <strong>{{ log.userName || log.userEmail || log.userId }}</strong>
                          <br />
                          <small class="text-muted">{{ formatDate(log.timestamp) }}</small>
                        </div>
                        <span :class="getActionBadgeClass(log.action)">{{ log.action }}</span>
                      </div>
                      <div class="mb-2">
                        <small class="text-muted">{{ log.entityType }}</small>
                        <code class="ms-2">{{ log.entityId?.substring(0, 8) }}...</code>
                      </div>
                      <div class="d-flex justify-content-between align-items-center">
                        <span :class="getResultBadgeClass(log.result)">{{ log.result }}</span>
                        <button
                          class="btn btn-sm btn-outline-primary rounded-pill"
                          @click="showLogDetails(log)"
                        >
                          <i class="bi bi-eye"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness || !state.toggles['audit-log.admin.view']) && !loading">
            <Message
              :title="$t('audit-log.message.1.title')"
              :content="$t('audit-log.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content text-center">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="!!alertError" :stack="alertError"></Alert>
        </div>
        <DesktopPageHeader
          :logo="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('audit-log.title')"
          :toggles="state.toggles"
          component-name="audit-log"
          @go-back="goBack"
        />
        <div id="audit-log" v-if="isActiveBusiness && state.toggles['audit-log.admin.view']">
          <div v-if="!commerce || !commerce.id" class="control-box">
            <Message
              :title="$t('audit-log.message.noCommerce.title')"
              :content="$t('audit-log.message.noCommerce.content')"
            />
          </div>
          <div v-else>
            <DesktopContentLayout :show-filters="true" :filters-sticky="true">
              <template #filters="{ onToggle, collapsed }">
                <DesktopFiltersPanel
                  :model-value="{ commerce: commerce }"
                  :loading="loading"
                  :commerces="[]"
                  :show-commerce-selector="false"
                  :sticky="true"
                  :on-toggle="onToggle"
                  :collapsed="collapsed"
                >
                  <template #custom-filters>
                    <DateRangeFilters
                      :start-date="
                        state.filters.startDate
                          ? new Date(state.filters.startDate).toISOString().split('T')[0]
                          : ''
                      "
                      :end-date="
                        state.filters.endDate
                          ? new Date(state.filters.endDate).toISOString().split('T')[0]
                          : ''
                      "
                      :show-quick-buttons="true"
                      @quick-select="handleQuickDateSelect"
                      @update:startDate="val => (state.filters.startDate = new Date(val))"
                      @update:endDate="val => (state.filters.endDate = new Date(val))"
                      @search="handleDateRangeChange"
                    />

                    <div class="form-group-modern mb-3">
                      <label class="form-label-modern">{{
                        $t('audit-log.filters.action') || 'Acción'
                      }}</label>
                      <select
                        v-model="state.selectedAction"
                        @change="applyFilters"
                        class="form-control-modern"
                      >
                        <option
                          v-for="action in state.actions"
                          :key="action.value"
                          :value="action.value"
                        >
                          {{ action.label }}
                        </option>
                      </select>
                    </div>

                    <div class="form-group-modern mb-3">
                      <label class="form-label-modern">{{
                        $t('audit-log.filters.entityType') || 'Tipo de Entidad'
                      }}</label>
                      <select
                        v-model="state.selectedEntityType"
                        @change="applyFilters"
                        class="form-control-modern"
                      >
                        <option
                          v-for="type in state.entityTypes"
                          :key="type.value"
                          :value="type.value"
                        >
                          {{ type.label }}
                        </option>
                      </select>
                    </div>

                    <div class="form-group-modern mb-3">
                      <label class="form-label-modern">{{
                        $t('audit-log.filters.search') || 'Buscar'
                      }}</label>
                      <input
                        v-model="state.searchText"
                        @input="applyFilters"
                        type="text"
                        class="form-control-modern"
                        :placeholder="
                          $t('audit-log.filters.searchPlaceholder') ||
                          'Buscar por usuario, email, entidad, IP...'
                        "
                      />
                    </div>

                    <div class="d-grid gap-2">
                      <button
                        @click="loadAuditLogs"
                        class="btn btn-sm btn-dark rounded-pill w-100 text-nowrap"
                        :disabled="loading"
                      >
                        <i class="bi bi-arrow-clockwise me-2"></i>
                        {{ $t('audit-log.refresh') || 'Actualizar' }}
                      </button>
                      <button
                        @click="exportReport"
                        class="btn btn-sm btn-dark rounded-pill w-100 text-nowrap"
                        :disabled="loading"
                      >
                        <i class="bi bi-download me-2"></i>
                        {{ $t('audit-log.export') || 'Exportar' }}
                      </button>
                    </div>
                  </template>
                </DesktopFiltersPanel>
              </template>

              <template #content>
                <div class="audit-log-dashboard">
                  <!-- Summary Cards -->
                  <div v-if="state.report" class="row mb-3">
                    <div class="col-6 col-lg-3 mb-3 metric-card-column">
                      <div class="modern-metric-card metric-type-info h-100">
                        <div class="metric-card-header">
                          <div class="metric-icon-container icon-info">
                            <i class="bi bi-list-check"></i>
                          </div>
                          <div class="metric-title-section">
                            <span class="metric-label">{{
                              $t('audit-log.summary.total') || 'Total de Registros'
                            }}</span>
                          </div>
                        </div>
                        <div class="metric-value-container">
                          <span class="metric-value">{{ state.report.total || 0 }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-6 col-lg-3 mb-3 metric-card-column">
                      <div class="modern-metric-card metric-type-warning h-100">
                        <div class="metric-card-header">
                          <div class="metric-icon-container icon-warning">
                            <i class="bi bi-lightning-charge"></i>
                          </div>
                          <div class="metric-title-section">
                            <span class="metric-label">{{
                              $t('audit-log.summary.byAction') || 'Por Acción'
                            }}</span>
                          </div>
                        </div>
                        <div class="metric-value-container">
                          <span class="metric-value">{{
                            Object.keys(state.report.byAction || {}).length
                          }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-6 col-lg-3 mb-3 metric-card-column">
                      <div class="modern-metric-card metric-type-success h-100">
                        <div class="metric-card-header">
                          <div class="metric-icon-container icon-success">
                            <i class="bi bi-diagram-3"></i>
                          </div>
                          <div class="metric-title-section">
                            <span class="metric-label">{{
                              $t('audit-log.summary.byEntityType') || 'Por Tipo de Entidad'
                            }}</span>
                          </div>
                        </div>
                        <div class="metric-value-container">
                          <span class="metric-value">{{
                            Object.keys(state.report.byEntityType || {}).length
                          }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-6 col-lg-3 mb-3 metric-card-column">
                      <div class="modern-metric-card metric-type-success h-100">
                        <div class="metric-card-header">
                          <div class="metric-icon-container icon-success">
                            <i class="bi bi-people"></i>
                          </div>
                          <div class="metric-title-section">
                            <span class="metric-label">{{
                              $t('audit-log.summary.uniqueUsers') || 'Usuarios Únicos'
                            }}</span>
                          </div>
                        </div>
                        <div class="metric-value-container">
                          <span class="metric-value">{{
                            Object.keys(state.report.byUser || {}).length
                          }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Logs Table -->
                  <div class="card compact-card">
                    <div class="card-header compact-card-header">
                      <h6 class="mb-0 d-flex align-items-center gap-2">
                        <i class="bi bi-list-ul"></i>
                        <span
                          >{{ $t('audit-log.logs') || 'Registros' }} ({{
                            state.filteredLogs.length
                          }})</span
                        >
                      </h6>
                    </div>
                    <div class="card-body compact-card-body">
                      <div v-if="state.filteredLogs.length === 0" class="text-center empty-state">
                        <i class="bi bi-inbox empty-icon"></i>
                        <p class="text-muted mt-2 mb-0">
                          {{ $t('audit-log.noLogs') || 'No se encontraron registros de auditoría' }}
                        </p>
                      </div>

                      <div v-else class="table-responsive">
                        <table class="table table-hover">
                          <thead>
                            <tr>
                              <th>{{ $t('audit-log.table.timestamp') }}</th>
                              <th>{{ $t('audit-log.table.user') }}</th>
                              <th>{{ $t('audit-log.table.action') }}</th>
                              <th>{{ $t('audit-log.table.entityType') }}</th>
                              <th>{{ $t('audit-log.table.entityId') }}</th>
                              <th>{{ $t('audit-log.table.result') }}</th>
                              <th>{{ $t('audit-log.table.ipAddress') }}</th>
                              <th>{{ $t('audit-log.table.details') }}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="log in state.filteredLogs" :key="log.id">
                              <td>{{ formatDate(log.timestamp) }}</td>
                              <td>
                                <div>
                                  <strong>{{ log.userName || log.userEmail || log.userId }}</strong>
                                  <br />
                                  <small class="text-muted">{{ log.userEmail }}</small>
                                </div>
                              </td>
                              <td>
                                <span :class="getActionBadgeClass(log.action)">{{
                                  log.action
                                }}</span>
                              </td>
                              <td>{{ log.entityType }}</td>
                              <td>
                                <code>{{ log.entityId?.substring(0, 8) }}...</code>
                              </td>
                              <td>
                                <span :class="getResultBadgeClass(log.result)">{{
                                  log.result
                                }}</span>
                              </td>
                              <td>
                                <small>{{ log.ipAddress || '-' }}</small>
                              </td>
                              <td>
                                <button
                                  class="btn btn-sm btn-outline-primary rounded-pill"
                                  @click="showLogDetails(log)"
                                  :title="$t('audit-log.table.viewDetails')"
                                >
                                  <i class="bi bi-eye"></i>
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </DesktopContentLayout>
          </div>
        </div>
        <div v-if="(!isActiveBusiness || !state.toggles['audit-log.admin.view']) && !loading">
          <Message
            :title="$t('audit-log.message.1.title')"
            :content="$t('audit-log.message.1.content')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audit-log-dashboard {
  padding: 1rem;
}

.compact-card {
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.compact-card-header {
  padding: 0.55rem 0.85rem;
  background: #f7f9fb;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.compact-card-body {
  padding: 0.75rem 0.85rem 0.9rem;
}

.empty-state {
  padding: 1.5rem 0.5rem;
  line-height: 1.35;
}

.empty-icon {
  font-size: 2.1rem;
  color: #c6c6c6;
}

.metric-card-column {
  display: flex;
}

/* Modern Metric Card Styles (from dashboard) */
.modern-metric-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  padding: 0.9rem 0.85rem;
  margin: 0;
  border-radius: 10px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  min-height: 132px;
}

.modern-metric-card::before {
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

.modern-metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(169, 169, 169, 0.3);
}

.modern-metric-card:hover::before {
  opacity: 0.6;
}

.metric-type-success {
  border-left: 3px solid #00c2cb;
}

.metric-type-success:hover {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.05) 0%, rgba(0, 194, 203, 0.02) 100%);
}

.metric-type-warning {
  border-left: 3px solid #f9c322;
}

.metric-type-warning:hover {
  background: linear-gradient(135deg, rgba(249, 195, 34, 0.05) 0%, rgba(249, 195, 34, 0.02) 100%);
}

.metric-type-info {
  border-left: 3px solid #004aad;
}

.metric-type-info:hover {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.05) 0%, rgba(0, 74, 173, 0.02) 100%);
}

.metric-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.metric-icon-container {
  width: 34px;
  height: 34px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.modern-metric-card:hover .metric-icon-container {
  transform: scale(1.1) rotate(5deg);
}

.icon-success {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.icon-warning {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
}

.icon-info {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
}

.metric-icon-container i {
  font-size: 1.05rem;
}

.metric-title-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.metric-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  letter-spacing: 0.01em;
  line-height: 1.25;
}

.metric-value-container {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.metric-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

/* Result Card Styles */
.result-card {
  background-color: var(--color-background);
  padding: 1rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* Card Styles */
.card {
  margin-bottom: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.125);
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

.card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid rgba(0, 0, 0, 0.125);
  padding: 0.75rem 1.25rem;
}

.card-body {
  padding: 1.25rem;
}

.badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.table {
  font-size: 0.9rem;
}

.table thead th {
  border-bottom: 2px solid #dee2e6;
  font-weight: 600;
  color: #495057;
}

.table tbody tr:hover {
  background-color: #f8f9fa;
}

code {
  font-size: 0.85rem;
  background: #f8f9fa;
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  color: #d63384;
  font-family: 'Courier New', monospace;
}

.btn {
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0b5ed7;
  border-color: #0a58ca;
}

.btn-success {
  background-color: #198754;
  border-color: #198754;
}

.btn-success:hover:not(:disabled) {
  background-color: #157347;
  border-color: #146c43;
}

.btn-outline-primary {
  border-color: #0d6efd;
  color: #0d6efd;
}

.btn-outline-primary:hover:not(:disabled) {
  background-color: #0d6efd;
  border-color: #0d6efd;
  color: #fff;
}

/* Modern form styles */
.form-group-modern {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-label-modern {
  font-size: 0.875rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  margin-bottom: 0;
}

.form-control-modern {
  width: 100%;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  color: #000000;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.form-control-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:disabled {
  background-color: rgba(245, 246, 247, 0.8);
  cursor: not-allowed;
  opacity: 0.6;
}

/* Desktop Header Styles */
.desktop-header-row {
  margin-bottom: 1rem;
}

.desktop-logo-wrapper {
  padding-right: 1rem;
}

.desktop-commerce-logo {
  display: flex;
  align-items: center;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .audit-log-dashboard {
    padding: 0.5rem;
  }

  .card-body {
    padding: 1rem;
  }

  .table {
    font-size: 0.8rem;
  }

  .modern-metric-card {
    padding: 1rem 0.75rem;
  }

  .metric-value {
    font-size: 1.25rem;
  }

  .metric-icon-container {
    width: 32px;
    height: 32px;
  }

  .metric-icon-container i {
    font-size: 1.1rem;
  }
}

@media (max-width: 576px) {
  .modern-metric-card {
    padding: 0.75rem 0.5rem;
    margin: 0.25rem;
  }

  .metric-value {
    font-size: 1.125rem;
  }

  .metric-label {
    font-size: 0.75rem;
  }
}
</style>
