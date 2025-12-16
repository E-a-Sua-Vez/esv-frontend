<script>
import Spinner from '../common/Spinner.vue';
import Message from '../common/Message.vue';
import { getProductsKpis } from '../../application/services/query-stack';
import { getProductAlerts } from '../../application/services/product';
import { globalStore } from '../../stores';

export default {
  name: 'InventoryDashboard',
  components: {
    Spinner,
    Message,
  },
  props: {
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: [] },
    show: { type: Boolean, default: true },
  },
  data() {
    const store = globalStore();
    return {
      loading: false,
      kpis: null,
      alerts: [],
      store,
      refreshInterval: null,
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
        this.kpis = await getProductsKpis(undefined, this.commerceIds);

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

          <!-- KPI: Valor Total -->
          <div class="kpi-card kpi-value-card">
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
                <i class="bi bi-lightning-charge"></i>
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
                  {{ $t('inventoryDashboard.productsMonitor') || 'productos requieren monitoreo' }}
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
                <i class="bi bi-lightning-charge"></i>
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

      <!-- Gráfico de Tendencias -->
      <div v-if="kpis.trends && kpis.trends.length > 0" class="trends-section">
        <h4 class="section-title">
          <i class="bi bi-graph-up"></i>
          {{ $t('inventoryDashboard.trends') || 'Tendencias (Últimos 30 días)' }}
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
              v-for="(trend, index) in kpis.trends.slice(-14)"
              :key="index"
              class="trend-bar-group"
            >
              <div class="trend-date">
                {{
                  new Date(trend.date).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                  })
                }}
              </div>
              <div class="trend-bars-container">
                <div
                  class="trend-bar consumption-bar"
                  :style="{
                    height: `${Math.max(
                      5,
                      (trend.consumption /
                        Math.max(...kpis.trends.map(t => Math.max(t.consumption, t.replacement)))) *
                        100
                    )}%`,
                  }"
                  :title="`Consumo: ${trend.consumption}`"
                ></div>
                <div
                  class="trend-bar replacement-bar"
                  :style="{
                    height: `${Math.max(
                      5,
                      (trend.replacement /
                        Math.max(...kpis.trends.map(t => Math.max(t.consumption, t.replacement)))) *
                        100
                    )}%`,
                  }"
                  :title="`Recarga: ${trend.replacement}`"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && !kpis" class="no-data">
      <Message
        :icon="'bi-inbox'"
        :title="$t('inventoryDashboard.noData') || 'Sin datos'"
        :content="$t('inventoryDashboard.noDataDesc') || 'No hay datos de inventario disponibles'"
      />
    </div>
  </div>
</template>

<style scoped>
.inventory-dashboard {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 0.75rem;
}

.dashboard-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #000;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dashboard-title i {
  color: var(--azul-turno);
}

/* KPIs Grid */
.kpis-section {
  margin-bottom: 2rem;
}

.kpis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.kpi-card {
  background: #ffffff;
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border-left: 4px solid;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
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
  font-size: 2.5rem;
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
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.kpi-value {
  font-size: 2rem;
  font-weight: 700;
  color: #000;
  line-height: 1.2;
  margin-bottom: 0.25rem;
}

.kpi-description {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
}

/* Sections */
.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #000;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Critical Products */
.critical-products-section {
  margin-bottom: 2rem;
}

.critical-products-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.critical-product-card {
  background: #ffffff;
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #dc3545;
  transition: all 0.2s ease;
}

.critical-product-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateX(4px);
}

.product-info {
  flex: 1;
}

.product-name {
  font-size: 1rem;
  font-weight: 700;
  color: #000;
  margin-bottom: 0.5rem;
}

.product-stock {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 0.25rem;
}

.stock-level {
  margin-right: 0.5rem;
}

.stock-percentage {
  font-weight: 600;
}

.product-prediction {
  font-size: 0.8125rem;
  color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.product-actions {
  margin-left: 1rem;
}

/* Expiring Products */
.expiring-section {
  margin-bottom: 2rem;
}

.expiring-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.expiring-product-card {
  background: #ffffff;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #ffc107;
}

.expiration-info {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.expiration-date {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
  margin-left: 0.5rem;
}

/* Trends Chart */
.trends-section {
  margin-bottom: 2rem;
}

.trends-chart {
  background: #ffffff;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.trends-legend {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.7);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
}

.legend-color.consumption {
  background: #dc3545;
}

.legend-color.replacement {
  background: #28a745;
}

.trends-bars {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
  height: 200px;
  padding: 1rem 0;
}

.trend-bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.trend-date {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.5);
  margin-bottom: 0.5rem;
  writing-mode: horizontal-tb;
}

.trend-bars-container {
  flex: 1;
  display: flex;
  gap: 2px;
  align-items: flex-end;
  width: 100%;
  max-width: 40px;
}

.trend-bar {
  flex: 1;
  border-radius: 3px 3px 0 0;
  min-height: 5px;
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

/* Alerts Section */
.alerts-section {
  margin-bottom: 2rem;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.alert-item {
  background: #ffffff;
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border-left: 4px solid;
  transition: all 0.2s ease;
}

.alert-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateX(4px);
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
  font-size: 1.5rem;
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
  font-size: 0.9375rem;
  font-weight: 700;
  color: #000;
  margin-bottom: 0.25rem;
}

.alert-description {
  font-size: 0.8125rem;
  color: rgba(0, 0, 0, 0.6);
}

.alert-count {
  font-size: 1.5rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 0.5rem;
  min-width: 50px;
  text-align: center;
}

.alert-detail {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.alert-action {
  margin-left: 1rem;
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .kpis-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .critical-product-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .product-actions {
    margin-left: 0;
    width: 100%;
  }

  .product-actions .btn {
    width: 100%;
  }

  .trends-bars {
    height: 150px;
  }

  .alert-item {
    flex-wrap: wrap;
  }

  .alert-count {
    width: 100%;
    margin-top: 0.5rem;
  }
}
</style>
