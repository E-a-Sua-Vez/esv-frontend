<script>
import Spinner from '../common/Spinner.vue';
import Message from '../common/Message.vue';
import DateRangeFilters from '../common/desktop/DateRangeFilters.vue';
import { getProductsKpis } from '../../application/services/query-stack';
import { getProductAlerts } from '../../application/services/product';
import { globalStore } from '../../stores';
import { DateModel } from '../../shared/utils/date.model';

export default {
  name: 'InventoryDashboard',
  components: {
    Spinner,
    Message,
    DateRangeFilters,
  },
  props: {
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: [] },
    show: { type: Boolean, default: true },
    filtersLocation: { type: String, default: 'component' }, // 'component' or 'slot'
  },
  data() {
    const store = globalStore();
    // Default: últimos 30 días
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new DateModel(today).substractMonths(1).toString();
    return {
      loading: false,
      kpis: null,
      alerts: [],
      store,
      refreshInterval: null,
      startDate: thirtyDaysAgo,
      endDate: today,
    };
  },
  computed: {
    commerceIds() {
      if (this.commerces && this.commerces.length > 0) {
        return this.commerces.map(c => c.id);
      }
      if (this.commerce && this.commerce.id) {
        return [this.commerce.id];
      }
      return [];
    },
  },
  methods: {
    async loadKpis() {
      if (!this.commerceIds || this.commerceIds.length === 0) {
        return;
      }
      try {
        this.loading = true;
        this.kpis = await getProductsKpis(
          undefined,
          this.commerceIds,
          this.startDate,
          this.endDate
        );

        // Cargar alertas si hay un commerce específico
        if (this.commerce && this.commerce.id) {
          try {
            this.alerts = await getProductAlerts(this.commerce.id);
          } catch (error) {
            console.error('Error loading alerts:', error);
            this.alerts = [];
          }
        }

        this.loading = false;
      } catch (error) {
        console.error('Error loading inventory KPIs:', error);
        this.loading = false;
      }
    },
    handleDateRangeChange({ startDate, endDate }) {
      this.startDate = startDate;
      this.endDate = endDate;
      this.loadKpis();
    },
    handleQuickSelect({ startDate, endDate }) {
      this.startDate = startDate;
      this.endDate = endDate;
      this.loadKpis();
    },
    handleSearch() {
      this.loadKpis();
    },
    getToday() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = date;
      this.endDate = date;
      this.loadKpis();
    },
    getCurrentMonth() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).startOfMonth().toString();
      this.endDate = new DateModel(date).endOfMonth().toString();
      this.loadKpis();
    },
    getLastMonth() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(1).startOfMonth().toString();
      this.endDate = new DateModel(date).substractMonths(1).endOfMonth().toString();
      this.loadKpis();
    },
    getLastThreeMonths() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(3).startOfMonth().toString();
      this.endDate = new DateModel(date).substractMonths(1).endOfMonth().toString();
      this.loadKpis();
    },
    formatCurrency(value) {
      if (!value) return '$0.00';
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(value);
    },
    formatPercentage(value) {
      if (value === null || value === undefined) return '0%';
      return `${Math.round(value)}%`;
    },
    formatNumber(value, decimals = 0) {
      if (value === null || value === undefined) return '0';
      return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    },
    formatDateString(dateStr) {
      if (!dateStr) return '';
      // Format YYYY-MM-DD to DD/MM/YYYY without timezone issues
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    },
    formatDateShort(dateStr) {
      if (!dateStr) return '';
      // Format YYYY-MM-DD to DD/MM without timezone issues
      const parts = dateStr.split('T')[0].split('-'); // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss"
      const day = parts[2];
      const month = parts[1];
      return `${day}/${month}`;
    },
    getDisplayTrends() {
      if (!this.kpis || !this.kpis.trends) return [];

      // Asegurar que trends están ordenados por fecha ascendente
      const sortedTrends = [...this.kpis.trends].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });

      // Si hay 30 o menos puntos, mostrar todos
      if (sortedTrends.length <= 30) {
        return sortedTrends;
      }

      // Si hay más de 30, filtrar pero siempre incluir el último
      const step = Math.ceil(sortedTrends.length / 30);
      const filtered = sortedTrends.filter((_, index) => index % step === 0);

      // Asegurar que el último día siempre está incluido
      const lastTrend = sortedTrends[sortedTrends.length - 1];
      if (filtered[filtered.length - 1].date !== lastTrend.date) {
        filtered.push(lastTrend);
      }

      return filtered;
    },
    getMaxValue(type = 'both') {
      if (!this.kpis || !this.kpis.trends) return 1;
      const trends = this.getDisplayTrends();
      if (type === 'consumption') {
        return Math.max(...trends.map(t => t.consumption || 0), 1);
      } else if (type === 'replacement') {
        return Math.max(...trends.map(t => t.replacement || 0), 1);
      }
      return Math.max(...trends.map(t => Math.max(t.consumption || 0, t.replacement || 0)), 1);
    },
    getBarHeight(value, type) {
      const maxValue = this.getMaxValue(type);
      const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
      return {
        height: `${Math.max(2, height)}%`,
      };
    },
    getLineChartViewBox() {
      const trends = this.getDisplayTrends();
      const width = trends.length > 0 ? trends.length * 40 : 400;
      const height = 200;
      return `0 0 ${width} ${height}`;
    },
    getConsumptionLinePoints() {
      const trends = this.getDisplayTrends();
      const maxValue = this.getMaxValue('consumption');
      const padding = 20;
      const chartHeight = 200 - padding * 2;
      const chartWidth = trends.length > 0 ? trends.length * 40 - padding * 2 : 400 - padding * 2;
      const stepX = trends.length > 1 ? chartWidth / (trends.length - 1) : 0;

      return trends
        .map((trend, index) => {
          const x = padding + index * stepX;
          const y = padding + chartHeight - (trend.consumption / maxValue) * chartHeight;
          return `${x},${y}`;
        })
        .join(' ');
    },
    getConsumptionAreaPoints() {
      const trends = this.getDisplayTrends();
      const maxValue = this.getMaxValue('consumption');
      const padding = 20;
      const chartHeight = 200 - padding * 2;
      const chartWidth = trends.length > 0 ? trends.length * 40 - padding * 2 : 400 - padding * 2;
      const stepX = trends.length > 1 ? chartWidth / (trends.length - 1) : 0;
      const bottomY = padding + chartHeight;

      const linePoints = trends
        .map((trend, index) => {
          const x = padding + index * stepX;
          const y = padding + chartHeight - (trend.consumption / maxValue) * chartHeight;
          return `${x},${y}`;
        })
        .join(' ');

      const firstX = padding;
      const lastX = padding + (trends.length - 1) * stepX;

      return `${firstX},${bottomY} ${linePoints} ${lastX},${bottomY}`;
    },
    getConsumptionPoints() {
      const trends = this.getDisplayTrends();
      const maxValue = this.getMaxValue('consumption');
      const padding = 20;
      const chartHeight = 200 - padding * 2;
      const chartWidth = trends.length > 0 ? trends.length * 40 - padding * 2 : 400 - padding * 2;
      const stepX = trends.length > 1 ? chartWidth / (trends.length - 1) : 0;

      return trends.map((trend, index) => ({
        x: padding + index * stepX,
        y: padding + chartHeight - (trend.consumption / maxValue) * chartHeight,
        value: trend.consumption,
        date: trend.date,
      }));
    },
    getReplacementLinePoints() {
      const trends = this.getDisplayTrends();
      const maxValue = this.getMaxValue('replacement');
      const padding = 20;
      const chartHeight = 200 - padding * 2;
      const chartWidth = trends.length > 0 ? trends.length * 40 - padding * 2 : 400 - padding * 2;
      const stepX = trends.length > 1 ? chartWidth / (trends.length - 1) : 0;

      return trends
        .map((trend, index) => {
          const x = padding + index * stepX;
          const y = padding + chartHeight - (trend.replacement / maxValue) * chartHeight;
          return `${x},${y}`;
        })
        .join(' ');
    },
    getReplacementAreaPoints() {
      const trends = this.getDisplayTrends();
      const maxValue = this.getMaxValue('replacement');
      const padding = 20;
      const chartHeight = 200 - padding * 2;
      const chartWidth = trends.length > 0 ? trends.length * 40 - padding * 2 : 400 - padding * 2;
      const stepX = trends.length > 1 ? chartWidth / (trends.length - 1) : 0;
      const bottomY = padding + chartHeight;

      const linePoints = trends
        .map((trend, index) => {
          const x = padding + index * stepX;
          const y = padding + chartHeight - (trend.replacement / maxValue) * chartHeight;
          return `${x},${y}`;
        })
        .join(' ');

      const firstX = padding;
      const lastX = padding + (trends.length - 1) * stepX;

      return `${firstX},${bottomY} ${linePoints} ${lastX},${bottomY}`;
    },
    getReplacementPoints() {
      const trends = this.getDisplayTrends();
      const maxValue = this.getMaxValue('replacement');
      const padding = 20;
      const chartHeight = 200 - padding * 2;
      const chartWidth = trends.length > 0 ? trends.length * 40 - padding * 2 : 400 - padding * 2;
      const stepX = trends.length > 1 ? chartWidth / (trends.length - 1) : 0;

      return trends.map((trend, index) => ({
        x: padding + index * stepX,
        y: padding + chartHeight - (trend.replacement / maxValue) * chartHeight,
        value: trend.replacement,
        date: trend.date,
      }));
    },
    getDaysUntilStockoutText(days) {
      if (days === null || days === undefined) return 'N/A';
      if (days <= 0) return 'Agotado';
      if (days <= 7) return `⚠️ ${days} días`;
      if (days <= 15) return `🟡 ${days} días`;
      return `${days} días`;
    },
    getExpirationText(days) {
      if (days < 0) return 'Expirado';
      if (days === 0) return 'Expira hoy';
      if (days <= 7) return `⚠️ ${days} días`;
      if (days <= 15) return `🟡 ${days} días`;
      return `${days} días`;
    },
    async quickRecharge(productId) {
      // Emitir evento para que el componente padre maneje la recarga
      this.$emit('quick-recharge', productId);
    },
  },
  watch: {
    commerceIds: {
      immediate: true,
      handler() {
        this.loadKpis();
      },
    },
    startDate: {
      handler(newVal, oldVal) {
        // Only reload if component is visible, not just a filter instance, and value actually changed
        if (
          this.show &&
          this.filtersLocation !== 'slot' &&
          newVal !== oldVal &&
          oldVal !== undefined
        ) {
          this.loadKpis();
        }
      },
    },
    endDate: {
      handler(newVal, oldVal) {
        // Only reload if component is visible, not just a filter instance, and value actually changed
        if (
          this.show &&
          this.filtersLocation !== 'slot' &&
          newVal !== oldVal &&
          oldVal !== undefined
        ) {
          this.loadKpis();
        }
      },
    },
  },
  mounted() {
    this.loadKpis();
    // Auto-refresh cada 5 minutos
    this.refreshInterval = setInterval(() => {
      this.loadKpis();
    }, 5 * 60 * 1000);
  },
  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },
};
</script>

<template>
  <div>
    <!-- Expose filters slot for desktop - rendered outside main content conditional -->
    <slot
      v-if="filtersLocation === 'slot'"
      name="filters-exposed"
      :start-date="startDate"
      :end-date="endDate"
      :loading="loading"
      :get-today="getToday"
      :get-current-month="getCurrentMonth"
      :get-last-month="getLastMonth"
      :get-last-three-months="getLastThreeMonths"
      :refresh="loadKpis"
    ></slot>
    <div v-if="show" class="inventory-dashboard">
      <Spinner :show="loading"></Spinner>

      <div v-if="!loading && kpis" class="dashboard-content">
        <!-- KPIs Principales -->
        <div class="kpis-section">
          <h3 class="dashboard-title">
            <i class="bi bi-bar-chart-fill"></i>
            {{ $t('inventoryDashboard.title') || 'Dashboard de Inventario' }}
          </h3>
          <div class="kpis-grid">
            <!-- KPI: Productos Críticos -->
            <div class="kpi-card kpi-critical">
              <div class="kpi-icon">
                <i class="bi bi-exclamation-triangle-fill"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">
                  {{ $t('inventoryDashboard.critical') || 'Críticos' }}
                </div>
                <div class="kpi-value">{{ kpis.critical || 0 }}</div>
                <div class="kpi-description">
                  {{ $t('inventoryDashboard.criticalDesc') || 'Requieren acción inmediata' }}
                </div>
              </div>
            </div>

            <!-- KPI: Productos en Atención -->
            <div class="kpi-card kpi-warning">
              <div class="kpi-icon">
                <i class="bi bi-exclamation-circle-fill"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">
                  {{ $t('inventoryDashboard.attention') || 'En Atención' }}
                </div>
                <div class="kpi-value">{{ kpis.attention || 0 }}</div>
                <div class="kpi-description">
                  {{ $t('inventoryDashboard.attentionDesc') || 'Monitorear de cerca' }}
                </div>
              </div>
            </div>

            <!-- KPI: Productos Óptimos -->
            <div class="kpi-card kpi-success">
              <div class="kpi-icon">
                <i class="bi bi-check-circle-fill"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">
                  {{ $t('inventoryDashboard.optimal') || 'Óptimos' }}
                </div>
                <div class="kpi-value">{{ kpis.optimal || 0 }}</div>
                <div class="kpi-description">
                  {{ $t('inventoryDashboard.optimalDesc') || 'Stock en nivel adecuado' }}
                </div>
              </div>
            </div>

            <!-- KPI: Total de Productos -->
            <div class="kpi-card kpi-info">
              <div class="kpi-icon">
                <i class="bi bi-box-seam-fill"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">
                  {{ $t('inventoryDashboard.total') || 'Total' }}
                </div>
                <div class="kpi-value">{{ kpis.total || 0 }}</div>
                <div class="kpi-description">
                  {{ $t('inventoryDashboard.totalDesc') || 'Productos en inventario' }}
                </div>
              </div>
            </div>

            <!-- KPI: Valor Total - Oculto temporalmente -->
            <!-- <div class="kpi-card kpi-value-card">
              <div class="kpi-icon">
                <i class="bi bi-currency-dollar"></i>
              </div>
              <div class="kpi-content">
                <div class="kpi-label">
                  {{ $t('inventoryDashboard.totalValue') || 'Valor Total' }}
                </div>
                <div class="kpi-value">{{ formatCurrency(kpis.totalValue) }}</div>
                <div class="kpi-description">
                  {{ $t('inventoryDashboard.totalValueDesc') || 'Valor del inventario' }}
                </div>
              </div>
            </div> -->
          </div>
        </div>

        <!-- Métricas Temporales -->
        <div v-if="kpis.periodMetrics" class="period-metrics-section">
          <h4 class="section-title">
            <i class="bi bi-calendar-check"></i>
            {{ $t('inventoryDashboard.periodMetrics') || 'Métricas del Período' }}
          </h4>
          <div class="period-metrics-grid">
            <!-- Consumo Total -->
            <div class="period-metric-card">
              <div class="period-metric-header">
                <div class="period-metric-icon consumption">
                  <i class="bi bi-arrow-down-circle-fill"></i>
                </div>
                <div class="period-metric-title">
                  {{ $t('inventoryDashboard.consumption') || 'Consumo Total' }}
                </div>
              </div>
              <div class="period-metric-value">
                {{ formatNumber(kpis.periodMetrics.consumption.total) }}
              </div>
              <div class="period-metric-details">
                <div class="period-metric-detail">
                  <span class="detail-label"
                    >{{ $t('inventoryDashboard.dailyAverage') || 'Promedio Diario' }}:</span
                  >
                  <span class="detail-value">{{
                    formatNumber(kpis.periodMetrics.consumption.avgDaily)
                  }}</span>
                </div>
                <div class="period-metric-detail">
                  <span class="detail-label"
                    >{{ $t('inventoryDashboard.transactions') || 'Transacciones' }}:</span
                  >
                  <span class="detail-value">{{ kpis.periodMetrics.consumption.count }}</span>
                </div>
                <div
                  v-if="kpis.periodMetrics.consumption.vsPreviousPeriod !== null"
                  class="period-metric-comparison"
                  :class="{
                    'trend-up': kpis.periodMetrics.consumption.trend === 'up',
                    'trend-down': kpis.periodMetrics.consumption.trend === 'down',
                    'trend-stable': kpis.periodMetrics.consumption.trend === 'stable',
                  }"
                >
                  <i
                    :class="{
                      'bi bi-arrow-up-circle-fill': kpis.periodMetrics.consumption.trend === 'up',
                      'bi bi-arrow-down-circle-fill':
                        kpis.periodMetrics.consumption.trend === 'down',
                      'bi bi-dash-circle': kpis.periodMetrics.consumption.trend === 'stable',
                    }"
                  ></i>
                  <span>
                    {{
                      formatPercentage(Math.abs(kpis.periodMetrics.consumption.vsPreviousPeriod))
                    }}
                    {{ $t('inventoryDashboard.vsPreviousPeriod') || 'vs período anterior' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Recargas Total -->
            <div class="period-metric-card">
              <div class="period-metric-header">
                <div class="period-metric-icon replacement">
                  <i class="bi bi-arrow-up-circle-fill"></i>
                </div>
                <div class="period-metric-title">
                  {{ $t('inventoryDashboard.replacement') || 'Recargas Total' }}
                </div>
              </div>
              <div class="period-metric-value">
                {{ formatNumber(kpis.periodMetrics.replacement.total) }}
              </div>
              <div class="period-metric-details">
                <div class="period-metric-detail">
                  <span class="detail-label"
                    >{{ $t('inventoryDashboard.dailyAverage') || 'Promedio Diario' }}:</span
                  >
                  <span class="detail-value">{{
                    formatNumber(kpis.periodMetrics.replacement.avgDaily)
                  }}</span>
                </div>
                <div class="period-metric-detail">
                  <span class="detail-label"
                    >{{ $t('inventoryDashboard.transactions') || 'Transacciones' }}:</span
                  >
                  <span class="detail-value">{{ kpis.periodMetrics.replacement.count }}</span>
                </div>
                <div
                  v-if="kpis.periodMetrics.replacement.vsPreviousPeriod !== null"
                  class="period-metric-comparison"
                  :class="{
                    'trend-up': kpis.periodMetrics.replacement.trend === 'up',
                    'trend-down': kpis.periodMetrics.replacement.trend === 'down',
                    'trend-stable': kpis.periodMetrics.replacement.trend === 'stable',
                  }"
                >
                  <i
                    :class="{
                      'bi bi-arrow-up-circle-fill': kpis.periodMetrics.replacement.trend === 'up',
                      'bi bi-arrow-down-circle-fill':
                        kpis.periodMetrics.replacement.trend === 'down',
                      'bi bi-dash-circle': kpis.periodMetrics.replacement.trend === 'stable',
                    }"
                  ></i>
                  <span>
                    {{
                      formatPercentage(Math.abs(kpis.periodMetrics.replacement.vsPreviousPeriod))
                    }}
                    {{ $t('inventoryDashboard.vsPreviousPeriod') || 'vs período anterior' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Balance Neto -->
            <div class="period-metric-card">
              <div class="period-metric-header">
                <div
                  class="period-metric-icon balance"
                  :class="{
                    'balance-positive': kpis.periodMetrics.balance.net > 0,
                    'balance-negative': kpis.periodMetrics.balance.net < 0,
                    'balance-neutral': kpis.periodMetrics.balance.net === 0,
                  }"
                >
                  <i class="bi bi-scale"></i>
                </div>
                <div class="period-metric-title">
                  {{ $t('inventoryDashboard.netBalance') || 'Balance Neto' }}
                </div>
              </div>
              <div
                class="period-metric-value"
                :class="{
                  'text-success': kpis.periodMetrics.balance.net > 0,
                  'text-danger': kpis.periodMetrics.balance.net < 0,
                  'text-muted': kpis.periodMetrics.balance.net === 0,
                }"
              >
                {{ formatNumber(kpis.periodMetrics.balance.net) }}
              </div>
              <div class="period-metric-details">
                <div class="period-metric-detail">
                  <span class="detail-label"
                    >{{ $t('inventoryDashboard.ratio') || 'Ratio Recarga/Consumo' }}:</span
                  >
                  <span class="detail-value">
                    {{
                      kpis.periodMetrics.balance.ratio !== null
                        ? formatNumber(kpis.periodMetrics.balance.ratio, 2)
                        : 'N/A'
                    }}
                  </span>
                </div>
                <div class="period-metric-detail">
                  <span class="detail-label"
                    >{{ $t('inventoryDashboard.periodDays') || 'Días del Período' }}:</span
                  >
                  <span class="detail-value">{{ kpis.periodMetrics.days }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel de Alertas Activas -->
        <div class="alerts-section">
          <h4 class="section-title">
            <i class="bi bi-bell-fill text-warning"></i>
            {{ $t('inventoryDashboard.activeAlerts') || 'Alertas Activas' }}
          </h4>
          <div class="alerts-list">
            <!-- Alertas desde backend (más detalladas) -->
            <div
              v-for="(alert, index) in alerts"
              :key="`alert-${index}`"
              class="alert-item"
              :class="{
                'alert-critical': alert.level === 'CRITICAL',
                'alert-warning': alert.level === 'ATTENTION' || alert.level === 'EXPIRATION',
                'alert-info': alert.level === 'PREVENTIVE',
              }"
            >
              <i
                :class="{
                  'bi bi-exclamation-triangle-fill': alert.level === 'CRITICAL',
                  'bi bi-heart-pulse-fill': alert.level === 'EXPIRATION',
                  'bi bi-exclamation-circle-fill': alert.level === 'ATTENTION',
                  'bi bi-info-circle-fill': alert.level === 'PREVENTIVE',
                }"
              ></i>
              <div class="alert-content">
                <div class="alert-title">{{ alert.productName }}</div>
                <div class="alert-description">{{ alert.message }}</div>
                <div v-if="alert.daysUntilStockout" class="alert-detail">
                  <i class="bi bi-clock"></i>
                  {{ $t('inventoryDashboard.daysUntilStockout') || 'Días hasta agotarse' }}:
                  <strong>{{ alert.daysUntilStockout }}</strong>
                </div>
                <div v-if="alert.daysUntilExpiration" class="alert-detail">
                  <i class="bi bi-calendar-x"></i>
                  {{ $t('inventoryDashboard.daysUntilExpiration') || 'Días hasta expiración' }}:
                  <strong>{{ alert.daysUntilExpiration }}</strong>
                </div>
              </div>
              <div class="alert-action">
                <button
                  class="btn btn-sm btn-danger rounded-pill px-3"
                  @click="quickRecharge(alert.productId)"
                  v-if="alert.level === 'CRITICAL'"
                >
                  <i class="bi bi-lightning-charge text-white"></i>
                  {{ $t('inventoryDashboard.recharge') || 'Recargar' }}
                </button>
              </div>
            </div>

            <!-- Resumen de KPIs (si no hay alertas detalladas) -->
            <template v-if="alerts.length === 0">
              <div v-if="kpis.critical > 0" class="alert-item alert-critical">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <div class="alert-content">
                  <div class="alert-title">
                    {{ $t('inventoryDashboard.alertCritical') || 'Productos Críticos' }}
                  </div>
                  <div class="alert-description">
                    {{ kpis.critical }}
                    {{
                      $t('inventoryDashboard.productsNeedAction') ||
                      'productos requieren acción inmediata'
                    }}
                  </div>
                </div>
                <div class="alert-count">{{ kpis.critical }}</div>
              </div>
              <div
                v-if="kpis.expiringSoon && kpis.expiringSoon.length > 0"
                class="alert-item alert-warning"
              >
                <i class="bi bi-heart-pulse-fill"></i>
                <div class="alert-content">
                  <div class="alert-title">
                    {{ $t('inventoryDashboard.alertExpiring') || 'Productos Próximos a Expirar' }}
                  </div>
                  <div class="alert-description">
                    {{ kpis.expiringSoon.length }}
                    {{
                      $t('inventoryDashboard.productsExpiring') ||
                      'productos expiran en los próximos 30 días'
                    }}
                  </div>
                </div>
                <div class="alert-count">{{ kpis.expiringSoon.length }}</div>
              </div>
              <div v-if="kpis.attention > 0" class="alert-item alert-info">
                <i class="bi bi-exclamation-circle-fill"></i>
                <div class="alert-content">
                  <div class="alert-title">
                    {{ $t('inventoryDashboard.alertAttention') || 'Productos en Atención' }}
                  </div>
                  <div class="alert-description">
                    {{ kpis.attention }}
                    {{
                      $t('inventoryDashboard.productsMonitor') || 'productos requieren monitoreo'
                    }}
                  </div>
                </div>
                <div class="alert-count">{{ kpis.attention }}</div>
              </div>
              <div
                v-if="
                  (!kpis.critical || kpis.critical === 0) &&
                  (!kpis.expiringSoon || kpis.expiringSoon.length === 0) &&
                  (!kpis.attention || kpis.attention === 0)
                "
                class="alert-item alert-success"
              >
                <i class="bi bi-check-circle-fill"></i>
                <div class="alert-content">
                  <div class="alert-title">
                    {{ $t('inventoryDashboard.allGood') || 'Todo en Orden' }}
                  </div>
                  <div class="alert-description">
                    {{
                      $t('inventoryDashboard.noAlerts') || 'No hay alertas activas en este momento'
                    }}
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Productos Críticos -->
        <div
          v-if="kpis.criticalProducts && kpis.criticalProducts.length > 0"
          class="critical-products-section"
        >
          <h4 class="section-title">
            <i class="bi bi-exclamation-triangle-fill text-danger"></i>
            {{ $t('inventoryDashboard.criticalProducts') || 'Productos Críticos' }}
          </h4>
          <div class="critical-products-list">
            <div
              v-for="product in kpis.criticalProducts"
              :key="product.productId"
              class="critical-product-card"
            >
              <div class="product-info">
                <div class="product-name">{{ product.productName }}</div>
                <div class="product-stock">
                  <span class="stock-level">
                    Stock: <strong>{{ product.actualLevel }}</strong> /
                    {{ product.maximumLevel }}
                  </span>
                  <span
                    class="stock-percentage"
                    :class="{
                      'text-danger': product.percentage <= 10,
                      'text-warning': product.percentage > 10 && product.percentage <= 25,
                    }"
                  >
                    ({{ formatPercentage(product.percentage) }})
                  </span>
                </div>
                <div v-if="product.daysUntilStockout !== null" class="product-prediction">
                  <i class="bi bi-clock"></i>
                  {{ $t('inventoryDashboard.stockoutIn') || 'Se agotará en' }}:
                  <strong>{{ getDaysUntilStockoutText(product.daysUntilStockout) }}</strong>
                </div>
              </div>
              <div class="product-actions">
                <button
                  class="btn btn-sm btn-danger rounded-pill px-3"
                  @click="quickRecharge(product.productId)"
                >
                  <i class="bi bi-lightning-charge text-white"></i>
                  {{ $t('inventoryDashboard.recharge') || 'Recargar' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Productos Próximos a Expirar -->
        <div v-if="kpis.expiringSoon && kpis.expiringSoon.length > 0" class="expiring-section">
          <h4 class="section-title">
            <i class="bi bi-heart-pulse-fill text-warning"></i>
            {{ $t('inventoryDashboard.expiringSoon') || 'Próximos a Expirar' }}
          </h4>
          <div class="expiring-list">
            <div
              v-for="product in kpis.expiringSoon"
              :key="product.productId"
              class="expiring-product-card"
            >
              <div class="product-info">
                <div class="product-name">{{ product.productName }}</div>
                <div class="expiration-info">
                  <i class="bi bi-calendar-x"></i>
                  {{ $t('inventoryDashboard.expires') || 'Expira' }}:
                  <strong>{{ getExpirationText(product.daysUntilExpiration) }}</strong>
                  <span class="expiration-date">
                    ({{ new Date(product.expirationDate).toLocaleDateString() }})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Gráficos de Evolución -->
        <div v-if="kpis.trends && kpis.trends.length > 0" class="charts-section">
          <!-- Gráfico Comparativo Consumo vs Recarga (Barras Agrupadas) -->
          <div class="chart-section">
            <h4 class="section-title">
              <i class="bi bi-bar-chart"></i>
              {{ $t('inventoryDashboard.comparativeChart') || 'Comparativo Consumo vs Recarga' }}
              <span v-if="startDate && endDate" class="trends-period">
                ({{ formatDateString(startDate) }} - {{ formatDateString(endDate) }})
              </span>
            </h4>
            <div class="trends-chart">
              <div class="trends-legend">
                <span class="legend-item">
                  <span class="legend-color consumption"></span>
                  {{ $t('inventoryDashboard.consumption') || 'Consumo' }}
                </span>
                <span class="legend-item">
                  <span class="legend-color replacement"></span>
                  {{ $t('inventoryDashboard.replacement') || 'Recargas' }}
                </span>
              </div>
              <div class="trends-bars">
                <div
                  v-for="(trend, index) in getDisplayTrends()"
                  :key="index"
                  class="trend-bar-group"
                >
                  <div class="trend-date">
                    {{ formatDateShort(trend.date) }}
                  </div>
                  <div class="trend-bars-container">
                    <div
                      class="trend-bar consumption-bar"
                      :style="getBarHeight(trend.consumption, 'both')"
                      :title="`${$t('inventoryDashboard.consumption') || 'Consumo'}: ${formatNumber(
                        trend.consumption
                      )}`"
                    ></div>
                    <div
                      class="trend-bar replacement-bar"
                      :style="getBarHeight(trend.replacement, 'both')"
                      :title="`${
                        $t('inventoryDashboard.replacement') || 'Recargas'
                      }: ${formatNumber(trend.replacement)}`"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Gráfico de Evolución de Consumo (Línea) -->
          <div class="chart-section">
            <h4 class="section-title">
              <i class="bi bi-graph-up-arrow"></i>
              {{ $t('inventoryDashboard.consumptionEvolution') || 'Evolución de Consumo' }}
            </h4>
            <div class="line-chart-container">
              <div class="line-chart">
                <svg class="line-chart-svg" :viewBox="getLineChartViewBox()">
                  <defs>
                    <linearGradient id="consumptionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color: #dc3545; stop-opacity: 0.3" />
                      <stop offset="100%" style="stop-color: #dc3545; stop-opacity: 0" />
                    </linearGradient>
                  </defs>
                  <polyline
                    :points="getConsumptionLinePoints()"
                    fill="none"
                    stroke="#dc3545"
                    stroke-width="2"
                    class="line-chart-line"
                  />
                  <polygon
                    :points="getConsumptionAreaPoints()"
                    fill="url(#consumptionGradient)"
                    class="line-chart-area"
                  />
                  <g v-for="(point, index) in getConsumptionPoints()" :key="index">
                    <circle
                      :cx="point.x"
                      :cy="point.y"
                      r="4"
                      fill="#dc3545"
                      class="line-chart-point"
                      :title="`${formatNumber(point.value)} - ${formatDateString(point.date)}`"
                    />
                  </g>
                </svg>
                <div class="line-chart-labels">
                  <div
                    v-for="(trend, index) in getDisplayTrends()"
                    :key="index"
                    class="line-chart-label"
                  >
                    {{ formatDateShort(trend.date) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Gráfico de Evolución de Recargas (Línea) -->
          <div class="chart-section">
            <h4 class="section-title">
              <i class="bi bi-graph-up-arrow"></i>
              {{ $t('inventoryDashboard.replacementEvolution') || 'Evolución de Recargas' }}
            </h4>
            <div class="line-chart-container">
              <div class="line-chart">
                <svg class="line-chart-svg" :viewBox="getLineChartViewBox()">
                  <defs>
                    <linearGradient id="replacementGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color: #28a745; stop-opacity: 0.3" />
                      <stop offset="100%" style="stop-color: #28a745; stop-opacity: 0" />
                    </linearGradient>
                  </defs>
                  <polyline
                    :points="getReplacementLinePoints()"
                    fill="none"
                    stroke="#28a745"
                    stroke-width="2"
                    class="line-chart-line"
                  />
                  <polygon
                    :points="getReplacementAreaPoints()"
                    fill="url(#replacementGradient)"
                    class="line-chart-area"
                  />
                  <g v-for="(point, index) in getReplacementPoints()" :key="index">
                    <circle
                      :cx="point.x"
                      :cy="point.y"
                      r="4"
                      fill="#28a745"
                      class="line-chart-point"
                      :title="`${formatNumber(point.value)} - ${formatDateString(point.date)}`"
                    />
                  </g>
                </svg>
                <div class="line-chart-labels">
                  <div
                    v-for="(trend, index) in getDisplayTrends()"
                    :key="index"
                    class="line-chart-label"
                  >
                    {{ formatDateShort(trend.date) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!loading && !kpis" class="no-data">
        <Message
          :icon="'inbox'"
          :title="$t('inventoryDashboard.noData') || 'Sin datos'"
          :content="$t('inventoryDashboard.noDataDesc') || 'No hay datos de inventario disponibles'"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.inventory-dashboard {
  padding: 0.5rem;
  border-radius: 0.5rem;
}

.dashboard-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #000;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.dashboard-title i {
  color: var(--azul-turno);
  font-size: 0.9rem;
}

/* KPIs Grid */
.kpis-section {
  margin-bottom: 1rem;
}

.kpis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.kpi-card {
  background: #ffffff;
  border-radius: 0.5rem;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border-left: 3px solid;
}

.kpi-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.kpi-critical {
  border-left-color: #dc3545;
}

.kpi-warning {
  border-left-color: #ffc107;
}

.kpi-success {
  border-left-color: #28a745;
}

.kpi-info {
  border-left-color: #17a2b8;
}

.kpi-value-card {
  border-left-color: #6f42c1;
}

.kpi-icon {
  font-size: 1.5rem;
  opacity: 0.8;
}

.kpi-critical .kpi-icon {
  color: #dc3545;
}

.kpi-warning .kpi-icon {
  color: #ffc107;
}

.kpi-success .kpi-icon {
  color: #28a745;
}

.kpi-info .kpi-icon {
  color: #17a2b8;
}

.kpi-value-card .kpi-icon {
  color: #6f42c1;
}

.kpi-content {
  flex: 1;
}

.kpi-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 0.125rem;
}

.kpi-value {
  font-size: 1.375rem;
  font-weight: 700;
  color: #000;
  line-height: 1.1;
  margin-bottom: 0.125rem;
}

.kpi-description {
  font-size: 0.625rem;
  color: rgba(0, 0, 0, 0.5);
  line-height: 1.2;
}

/* Sections */
.section-title {
  font-size: 0.9375rem;
  font-weight: 700;
  margin-bottom: 0.625rem;
  color: #000;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.section-title i {
  font-size: 0.875rem;
}

/* Critical Products */
.critical-products-section {
  margin-bottom: 1rem;
}

.critical-products-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.critical-product-card {
  background: #ffffff;
  border-radius: 0.375rem;
  padding: 0.625rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border-left: 3px solid #dc3545;
  transition: all 0.2s ease;
}

.critical-product-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateX(2px);
}

.product-info {
  flex: 1;
}

.product-name {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000;
  margin-bottom: 0.25rem;
}

.product-stock {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 0.125rem;
}

.stock-level {
  margin-right: 0.375rem;
}

.stock-percentage {
  font-weight: 600;
}

.product-prediction {
  font-size: 0.625rem;
  color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.product-actions {
  margin-left: 0.625rem;
}

/* Expiring Products */
.expiring-section {
  margin-bottom: 1rem;
}

.expiring-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.expiring-product-card {
  background: #ffffff;
  border-radius: 0.375rem;
  padding: 0.625rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border-left: 3px solid #ffc107;
}

.expiration-info {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.expiration-date {
  font-size: 0.625rem;
  color: rgba(0, 0, 0, 0.5);
  margin-left: 0.375rem;
}

/* Charts Section */
.charts-section {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chart-section {
  margin-bottom: 1rem;
}

.trends-chart {
  background: #ffffff;
  border-radius: 0.375rem;
  padding: 0.875rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.trends-legend {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.625rem;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.7);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-color.consumption {
  background: #dc3545;
}

.legend-color.replacement {
  background: #28a745;
}

.trends-bars {
  display: flex;
  gap: 0.375rem;
  align-items: flex-end;
  height: 140px;
  padding: 0.625rem 0;
}

.trend-bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.trend-date {
  font-size: 0.5625rem;
  color: rgba(0, 0, 0, 0.5);
  margin-bottom: 0.375rem;
  writing-mode: horizontal-tb;
}

.trend-bars-container {
  flex: 1;
  display: flex;
  gap: 1px;
  align-items: flex-end;
  width: 100%;
  max-width: 32px;
}

.trend-bar {
  flex: 1;
  border-radius: 2px 2px 0 0;
  min-height: 3px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.trend-bar:hover {
  opacity: 0.8;
}

.consumption-bar {
  background: #dc3545;
}

.replacement-bar {
  background: #28a745;
}

/* Line Charts */
.line-chart-container {
  background: #ffffff;
  border-radius: 0.375rem;
  padding: 0.875rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.line-chart {
  position: relative;
  width: 100%;
  min-height: 180px;
}

.line-chart-svg {
  width: 100%;
  height: 150px;
  overflow: visible;
}

.line-chart-line {
  transition: all 0.3s ease;
}

.line-chart-area {
  transition: all 0.3s ease;
}

.line-chart-point {
  cursor: pointer;
  transition: all 0.2s ease;
}

.line-chart-point:hover {
  transform: scale(1.5);
  opacity: 0.8;
}

.line-chart-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.375rem;
  padding: 0 0.5rem;
}

.line-chart-label {
  font-size: 0.5625rem;
  color: rgba(0, 0, 0, 0.5);
  text-align: center;
  flex: 1;
}

/* Alerts Section */
.alerts-section {
  margin-bottom: 1rem;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alert-item {
  background: #ffffff;
  border-radius: 0.375rem;
  padding: 0.625rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border-left: 3px solid;
  transition: all 0.2s ease;
}

.alert-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateX(2px);
}

.alert-critical {
  border-left-color: #dc3545;
}

.alert-warning {
  border-left-color: #ffc107;
}

.alert-info {
  border-left-color: #17a2b8;
}

.alert-success {
  border-left-color: #28a745;
}

.alert-item i {
  font-size: 1.125rem;
  flex-shrink: 0;
}

.alert-critical i {
  color: #dc3545;
}

.alert-warning i {
  color: #ffc107;
}

.alert-info i {
  color: #17a2b8;
}

.alert-success i {
  color: #28a745;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #000;
  margin-bottom: 0.125rem;
}

.alert-description {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.6);
}

.alert-count {
  font-size: 1.125rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  padding: 0.375rem 0.625rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 0.375rem;
  min-width: 40px;
  text-align: center;
}

.alert-detail {
  font-size: 0.625rem;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 0.125rem;
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.alert-action {
  margin-left: 0.625rem;
  flex-shrink: 0;
}

.trends-period {
  font-size: 0.6875rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.6);
  margin-left: 0.375rem;
}

/* Period Metrics Section */
.period-metrics-section {
  margin-bottom: 1rem;
}

.period-metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.period-metric-card {
  background: #ffffff;
  border-radius: 0.375rem;
  padding: 0.625rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border-left: 3px solid;
}

.period-metric-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.period-metric-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.period-metric-icon {
  font-size: 1.125rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.3rem;
}

.period-metric-icon.consumption {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.period-metric-icon.replacement {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.period-metric-icon.balance {
  background: rgba(23, 162, 184, 0.1);
  color: #17a2b8;
}

.period-metric-icon.balance-positive {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.period-metric-icon.balance-negative {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.period-metric-icon.balance-neutral {
  background: rgba(108, 117, 125, 0.1);
  color: #6c757d;
}

.period-metric-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  flex: 1;
}

.period-metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #000;
  margin-bottom: 0.5rem;
  line-height: 1.1;
}

.period-metric-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.period-metric-detail {
  display: flex;
  justify-content: space-between;
  font-size: 0.625rem;
  color: rgba(0, 0, 0, 0.6);
}

.detail-label {
  font-weight: 500;
}

.detail-value {
  font-weight: 700;
  color: #000;
}

.period-metric-comparison {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem;
  border-radius: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  margin-top: 0.375rem;
}

.period-metric-comparison.trend-up {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.period-metric-comparison.trend-down {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.period-metric-comparison.trend-stable {
  background: rgba(108, 117, 125, 0.1);
  color: #6c757d;
}

.period-metric-comparison i {
  font-size: 0.875rem;
}

/* Responsive */
@media (max-width: 768px) {
  .kpis-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .critical-product-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.625rem;
  }

  .product-actions {
    margin-left: 0;
    width: 100%;
  }

  .product-actions .btn {
    width: 100%;
  }

  .trends-bars {
    height: 120px;
  }

  .alert-item {
    flex-wrap: wrap;
  }

  .alert-count {
    width: 100%;
    margin-top: 0.375rem;
  }

  .period-metrics-grid {
    grid-template-columns: 1fr;
  }

  .line-chart {
    min-height: 150px;
  }

  .line-chart-svg {
    height: 120px;
  }
}
</style>
