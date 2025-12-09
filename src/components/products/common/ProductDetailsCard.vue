<script>
import { globalStore } from '../../../stores';
import { getDate } from '../../../shared/utils/date';
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import ProductReplacementManagement from '../domain/ProductReplacementManagement.vue';
import {
  getProductsReplacementDetails,
  getProductsConsumptionsDetails,
} from '../../../application/services/query-stack';
import ProductConsumptionManagement from '../domain/ProductConsumptionManagement.vue';

export default {
  name: 'ProductDetailsCard',
  components: {
    Popper,
    Spinner,
    SimpleDownloadCard,
    ProductReplacementManagement,
    ProductConsumptionManagement,
  },
  props: {
    show: { type: Boolean, default: true },
    product: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    toggles: { type: Object, default: undefined },
    queues: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    management: { type: Boolean, default: true },
  },
  data() {
    const store = globalStore();
    return {
      loading: false,
      extendedEntity: false,
      checked: false,
      asc: false,
      store,
      userType: undefined,
      user: undefined,
      limit: 10,
      page: 1,
      productReplacements: [],
      productConsumptions: [],
    };
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyAttention() {
      const textToCopy = jsonToCsv([this.product]);
      navigator.clipboard.writeText(textToCopy);
    },
    handleExportConsumptionCSV() {
      if (this.$refs.consumptionManagementRef && this.$refs.consumptionManagementRef.exportToCSV) {
        this.$refs.consumptionManagementRef.exportToCSV();
      }
    },
    handleExportReplacementCSV() {
      if (this.$refs.replacementManagementRef && this.$refs.replacementManagementRef.exportToCSV) {
        this.$refs.replacementManagementRef.exportToCSV();
      }
    },
    async getUserType() {
      this.userType = await this.store.getCurrentUserType;
    },
    async getUser() {
      this.user = await this.store.getCurrentUser;
    },
    clasifyProductStatus(score) {
      if (score === undefined) {
        return 'bi-battery-full blue-icon';
      } else if (score === 'GOOD') {
        return 'bi-battery-full green-icon';
      } else if (score === 'MEDIUM') {
        return 'bi-battery-half yellow-icon';
      } else {
        return 'bi-battery red-icon';
      }
    },
    clasifyReplacement(score) {
      if (!score) {
        return 'bi-battery-charging blue-icon';
      } else if (score < -30) {
        return 'bi-battery-charging green-icon';
      } else if (score > -30) {
        return 'bi-battery-charging yellow-icon';
      } else if (score >= 0) {
        return 'bi-battery-charging red-icon';
      }
    },
    clasifyExpired(score) {
      if (!score) {
        return 'bi-heart-pulse-fill blue-icon';
      } else if (score < -30) {
        return 'bi-heart-pulse-fill green-icon';
      } else if (score > -30) {
        return 'bi-heart-pulse-fill yellow-icon';
      } else if (score >= 0) {
        return 'bi-heart-pulse-fill red-icon';
      }
    },
    scorePercentage(total, score) {
      return parseFloat(((score * 100) / total).toFixed(2), 2) || 0;
    },
    productScoreBarStyle(product) {
      const level = this.scorePercentage(
        product.maximumLevel,
        product.actualLevel ? product.actualLevel : 0
      );
      const minimunLevel = this.scorePercentage(
        product.maximumLevel,
        product.replacementLevel ? product.replacementLevel : 0
      );
      const optimumLevel = this.scorePercentage(
        product.maximumLevel,
        product.optimumLevel ? product.optimumLevel : 0
      );
      if (level <= minimunLevel) {
        return 'red-area';
      } else if (level <= optimumLevel) {
        return 'yellow-area';
      } else {
        return 'green-area';
      }
    },
    getCardTypeClass() {
      if (!this.product || !this.product.maximumLevel) {
        return 'product-card-success';
      }
      const level = this.scorePercentage(
        this.product.maximumLevel,
        this.product.actualLevel ? this.product.actualLevel : 0
      );
      const minimunLevel = this.scorePercentage(
        this.product.maximumLevel,
        this.product.replacementLevel ? this.product.replacementLevel : 0
      );
      const optimumLevel = this.scorePercentage(
        this.product.maximumLevel,
        this.product.optimumLevel ? this.product.optimumLevel : 0
      );
      if (level <= minimunLevel) {
        return 'product-card-error';
      } else if (level <= optimumLevel) {
        return 'product-card-warning';
      } else {
        return 'product-card-success';
      }
    },
    getStatusIconClass() {
      if (!this.product || !this.product.maximumLevel) {
        return 'icon-success';
      }
      const level = this.scorePercentage(
        this.product.maximumLevel,
        this.product.actualLevel ? this.product.actualLevel : 0
      );
      const minimunLevel = this.scorePercentage(
        this.product.maximumLevel,
        this.product.replacementLevel ? this.product.replacementLevel : 0
      );
      const optimumLevel = this.scorePercentage(
        this.product.maximumLevel,
        this.product.optimumLevel ? this.product.optimumLevel : 0
      );
      if (level <= minimunLevel) {
        return 'icon-error';
      } else if (level <= optimumLevel) {
        return 'icon-warning';
      } else {
        return 'icon-success';
      }
    },
    getStockIconClass() {
      if (!this.product || !this.product.maximumLevel) {
        return 'bi-battery-full green-icon';
      }
      const level = this.scorePercentage(
        this.product.maximumLevel,
        this.product.actualLevel ? this.product.actualLevel : 0
      );
      const minimunLevel = this.scorePercentage(
        this.product.maximumLevel,
        this.product.replacementLevel ? this.product.replacementLevel : 0
      );
      const optimumLevel = this.scorePercentage(
        this.product.maximumLevel,
        this.product.optimumLevel ? this.product.optimumLevel : 0
      );
      if (level <= minimunLevel) {
        return 'bi-battery red-icon';
      } else if (level <= optimumLevel) {
        return 'bi-battery-half yellow-icon';
      } else {
        return 'bi-battery-full green-icon';
      }
    },
    async getAttentionConsuptions() {
      try {
        this.loading = true;
        this.attentions = [];
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        if (this.client && (this.client.userIdNumber || this.client.userEmail)) {
          this.searchText = this.client.userIdNumber || this.client.userEmail;
        }
        this.attentions = await getAttentionsDetails(
          this.commerce.id,
          undefined,
          undefined,
          commerceIds,
          this.page,
          this.limit,
          this.daysSinceType,
          undefined,
          undefined,
          undefined,
          this.searchText,
          this.queueId,
          this.survey,
          this.asc,
          undefined
        );
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async getProductReplacements() {
      try {
        this.loading = true;
        this.productReplacements = await getProductsReplacementDetails(
          this.product.productId,
          this.page,
          this.limit,
          this.asc,
          undefined,
          undefined
        );
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async getProductConsuptions() {
      try {
        this.loading = true;
        const commerceIds = [this.commerce.id];
        this.productConsumptions = await getProductsConsumptionsDetails(
          commerceIds,
          this.product.productId,
          this.page,
          this.limit,
          this.asc,
          undefined,
          undefined
        );
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
  },
  watch: {
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.extendedEntity;
      },
    },
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
        await this.getUser();
      },
    },
  },
};
</script>

<template>
  <div v-if="show">
    <!-- Ultra Compact Product Row - Clickable -->
    <div class="product-row-card" :class="getCardTypeClass()" @click="showDetails()">
      <div class="product-row-content">
        <!-- Status Icon -->
        <Popper :class="'dark'" arrow disable-click-away hover>
          <template #content>
            <div>{{ $t('dashboard.productCard.tooltip.status') || 'Estado del producto' }}</div>
          </template>
          <div class="product-icon-mini" :class="getStatusIconClass()" @click.stop>
            <i :class="`bi ${clasifyProductStatus(product?.productStatus)}`"></i>
          </div>
        </Popper>

        <!-- Product Info - Horizontal -->
        <div class="product-info-inline">
          <div class="product-name-inline">
            <span class="product-name-text">{{ product.productName || 'N/I' }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>
                  {{ $t('dashboard.productCard.tooltip.copy') || 'Copiar datos del producto' }}
                </div>
              </template>
              <button class="btn-copy-mini" @click.stop="copyAttention()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
            </Popper>
          </div>
          <div class="product-meta-inline">
            <span class="product-code-inline">{{ product?.productCode || 'N/I' }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>
                  {{ $t('dashboard.productCard.tooltip.expired') || 'Días desde expiración' }}
                </div>
              </template>
              <i
                :class="`bi ${clasifyExpired(product?.daysSinceExpired)} icon-mini-separated`"
                @click.stop
              ></i>
            </Popper>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>
                  {{
                    $t('dashboard.productCard.tooltip.replacement') ||
                    'Días hasta próxima reposición'
                  }}
                </div>
              </template>
              <i
                :class="`bi ${clasifyReplacement(
                  product?.daysSinceNextReplacement
                )} icon-mini-separated`"
                @click.stop
              ></i>
            </Popper>
          </div>
        </div>

        <!-- Status Indicators - Inline -->
        <div class="status-inline">
          <Popper :class="'dark'" arrow disable-click-away hover>
            <template #content>
              <div>
                {{ $t('dashboard.productCard.tooltip.stockLevel') || 'Nivel de stock actual' }}
              </div>
            </template>
            <div class="status-badge-inline" @click.stop>
              <i :class="`bi ${getStockIconClass()}`"></i>
              <span
                >{{
                  product?.maximumLevel
                    ? scorePercentage(
                        product.maximumLevel,
                        product.actualLevel ? product.actualLevel : 0
                      ).toFixed(0)
                    : '0'
                }}%</span
              >
            </div>
          </Popper>
        </div>

        <!-- Progress Bar - Inline -->
        <div class="progress-inline" @click.stop>
          <div class="progress progress-mini">
            <div
              :class="`progress-bar ${productScoreBarStyle(product)}`"
              role="progressbar"
              :style="`width: ${scorePercentage(
                product.maximumLevel,
                product.actualLevel ? product.actualLevel : 0
              )}%`"
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
        </div>

        <!-- Collapse Icon -->
        <div class="collapse-icon-wrapper">
          <i
            class="bi collapse-icon"
            :class="extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'"
          ></i>
        </div>
      </div>
    </div>

    <!-- Expandable Details Section -->
    <div class="details-expandable-section">
      <Spinner :show="loading"></Spinner>
      <Transition name="details-expand">
        <div v-if="extendedEntity" class="detailed-data">
          <!-- Action Buttons Section - First -->
          <div v-if="management && !loading" class="info-section">
            <div class="action-buttons-grid">
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>
                    {{ $t('dashboard.productCard.tooltip.viewConsumptions') || 'Ver consumos' }}
                  </div>
                </template>
                <button
                  @click="getProductConsuptions()"
                  class="action-btn"
                  data-bs-toggle="modal"
                  :data-bs-target="`#consumptionsModal-${this.product.productId}`"
                >
                  <i class="bi bi-arrow-up-circle-fill"></i>
                  <span>{{ $t('businessProductStockAdmin.consuptions') }}</span>
                </button>
              </Popper>
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>
                    {{ $t('dashboard.productCard.tooltip.viewReplacements') || 'Ver reposiciones' }}
                  </div>
                </template>
                <button
                  @click="getProductReplacements()"
                  class="action-btn"
                  data-bs-toggle="modal"
                  :data-bs-target="`#replacementModal-${this.product.productId}`"
                >
                  <i class="bi bi-arrow-down-circle-fill"></i>
                  <span>{{ $t('businessProductStockAdmin.replacements') }}</span>
                </button>
              </Popper>
            </div>
          </div>

          <!-- Stock Level Section -->
          <div class="info-section">
            <div class="info-section-header">
              <i class="bi bi-bar-chart-fill"></i>
              <span class="info-section-title">{{
                $t('dashboard.productCard.stockLevel') || 'Nivel de Stock'
              }}</span>
            </div>
            <div class="stock-progress-container">
              <div class="stock-progress-labels">
                <span class="stock-label-min">
                  <i class="bi bi-caret-down-fill"></i> {{ product?.minimumLevel || 0 }}
                </span>
                <span class="stock-label-current badge bg-dark">
                  {{ product?.actualLevel || 0 }}
                </span>
                <span class="stock-label-max">
                  {{ product?.maximumLevel || 0 }} <i class="bi bi-caret-down-fill"></i>
                </span>
              </div>
              <div class="progress progress-detail">
                <div
                  :class="`progress-bar ${productScoreBarStyle(product)}`"
                  role="progressbar"
                  :style="`width: ${
                    product?.maximumLevel
                      ? scorePercentage(
                          product.maximumLevel,
                          product.actualLevel ? product.actualLevel : 0
                        )
                      : 0
                  }%`"
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
              <div class="stock-percentage">
                <span class="fw-bold">
                  {{
                    product?.maximumLevel
                      ? scorePercentage(
                          product.maximumLevel,
                          product.actualLevel ? product.actualLevel : 0
                        )
                      : 0
                  }}%
                </span>
              </div>
            </div>
          </div>

          <!-- Stock Levels Info Section -->
          <div class="info-section compact-section">
            <div class="info-section-header-compact">
              <i class="bi bi-list-ul"></i>
              <span class="info-section-title-compact">{{
                $t('dashboard.productCard.levels') || 'Niveles'
              }}</span>
            </div>
            <div class="stock-levels-grid">
              <div class="data-item-compact">
                <span class="data-label">{{ $t('businessProductStockAdmin.actualLevel') }}</span>
                <div class="data-value">
                  <i class="bi bi-thermometer-half"></i>
                  <span
                    >{{ product?.actualLevel || 0 }}
                    {{
                      product?.productMeasureType
                        ? $t(`productMeasuresTypesShort.${product.productMeasureType}`)
                        : ''
                    }}</span
                  >
                </div>
              </div>
              <div class="data-item-compact">
                <span class="data-label">{{ $t('businessProductStockAdmin.optimumLevel') }}</span>
                <div class="data-value">
                  <i class="bi bi-check-circle-fill"></i>
                  <span
                    >{{ product?.optimumLevel || 0 }}
                    {{
                      product?.productMeasureType
                        ? $t(`productMeasuresTypesShort.${product.productMeasureType}`)
                        : ''
                    }}</span
                  >
                </div>
              </div>
              <div class="data-item-compact">
                <span class="data-label">{{
                  $t('businessProductStockAdmin.replacementLevel')
                }}</span>
                <div class="data-value">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <span
                    >{{ product?.replacementLevel || 0 }}
                    {{
                      product?.productMeasureType
                        ? $t(`productMeasuresTypesShort.${product.productMeasureType}`)
                        : ''
                    }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Last Replacement Section -->
          <div v-if="product.lastReplacementAmount" class="info-section">
            <div class="info-section-header">
              <i class="bi bi-arrow-down-circle-fill"></i>
              <span class="info-section-title">{{
                $t('businessProductStockAdmin.lastReplacement')
              }}</span>
            </div>
            <div class="info-badges">
              <span v-if="product.lastReplacementAmount" class="info-badge">
                <i class="bi bi-eyedropper"></i>
                <span class="badge-label">{{ $t('paymentData.productQuantity') }}</span>
                <span class="badge-value"
                  >{{ product.lastReplacementAmount }}
                  {{
                    product?.productMeasureType
                      ? $t(`productMeasuresTypesShort.${product.productMeasureType}`)
                      : ''
                  }}</span
                >
              </span>
              <span v-if="product.lastReplacementDate" class="info-badge">
                <i class="bi bi-calendar-fill"></i>
                <span class="badge-label">{{ $t('paymentData.lastReplacementDate') }}</span>
                <span class="badge-value">{{ getDate(product.lastReplacementDate) }}</span>
              </span>
              <span v-if="product.lastReplacementExpirationDate" class="info-badge">
                <i class="bi bi-heart-pulse-fill"></i>
                <span class="badge-label">{{ $t('paymentData.productExpiration') }}</span>
                <span class="badge-value">{{
                  getDate(product.lastReplacementExpirationDate)
                }}</span>
              </span>
              <span v-if="product.nextReplacementDate" class="info-badge">
                <i class="bi bi-calendar-check-fill"></i>
                <span class="badge-label">{{ $t('paymentData.productNext') }}</span>
                <span class="badge-value">{{ getDate(product.nextReplacementDate) }}</span>
              </span>
              <span v-if="product.lastReplacementBy" class="info-badge">
                <i class="bi bi-person-fill"></i>
                <span class="badge-label">{{ $t('paymentData.user') }}</span>
                <span class="badge-value">{{ product.lastReplacementBy }}</span>
              </span>
            </div>
          </div>

          <!-- Metadata Section -->
          <div class="info-section metadata-section">
            <div class="metadata-item-compact">
              <span class="metadata-label">ID:</span>
              <span class="metadata-value">{{ product?.productId || 'N/I' }}</span>
              <span class="metadata-separator">•</span>
              <span class="metadata-label"
                >{{ $t('dashboard.productCard.code') || 'Código' }}:</span
              >
              <span class="metadata-value">{{ product?.productCode || 'N/I' }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
    <!-- Modal Consumos - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
      <div
        class="modal fade"
        :id="`consumptionsModal-${this.product.productId}`"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-1"
        aria-labelledby="staticBackdropLabel"
      >
        <div class="modal-dialog modal-xl modern-modal-wrapper">
          <div class="modal-content modern-modal-container">
            <div class="modal-header border-0 active-name modern-modal-header">
              <div class="modern-modal-header-inner">
                <div class="modern-modal-icon-wrapper">
                  <i class="bi bi-arrow-up-circle-fill"></i>
                </div>
                <div class="modern-modal-title-wrapper">
                  <h5 class="modal-title fw-bold modern-modal-title">
                    {{ $t('businessProductStockAdmin.consuptionsOf') }}
                  </h5>
                  <p class="modern-modal-client-name">
                    {{ product.productName }}
                  </p>
                </div>
              </div>
              <button
                class="btn-close modern-modal-close-btn"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <Spinner :show="loading"></Spinner>
            <div class="modal-body modern-modal-body-content">
              <ProductConsumptionManagement
                ref="consumptionManagementRef"
                :show-product-consumption-management="true"
                :toggles="toggles"
                :product-consumptions-in="productConsumptions"
                :product="product"
                :commerce="commerce"
                :commerces="commerces"
                @getProductConsuptions="getProductConsuptions"
              >
              </ProductConsumptionManagement>
            </div>
            <div class="modal-footer border-0 modern-modal-footer">
              <div class="d-flex align-items-center justify-content-between w-100 gap-3">
                <div class="flex-grow-1">
                  <SimpleDownloadCard
                    :download="toggles['products-stock.reports.consumption-details']"
                    :title="$t('businessProductStockAdmin.reports.consumption-details.title')"
                    :show-tooltip="true"
                    :description="
                      $t('businessProductStockAdmin.reports.consumption-details.description')
                    "
                    :icon="'bi-file-earmark-spreadsheet'"
                    @download="handleExportConsumptionCSV"
                    :can-download="toggles['products-stock.reports.consumption-details'] === true"
                  ></SimpleDownloadCard>
                </div>
                <button
                  class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4 modern-modal-close-button"
                  type="button"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <i class="bi bi-check-lg"></i>
                  {{ $t('notificationConditions.action') || $t('close') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- Modal Reemplazos - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
      <div
        class="modal fade"
        :id="`replacementModal-${this.product.productId}`"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-1"
        aria-labelledby="staticBackdropLabel"
      >
        <div class="modal-dialog modal-xl modern-modal-wrapper">
          <div class="modal-content modern-modal-container">
            <div class="modal-header border-0 active-name modern-modal-header">
              <div class="modern-modal-header-inner">
                <div class="modern-modal-icon-wrapper">
                  <i class="bi bi-arrow-down-circle-fill"></i>
                </div>
                <div class="modern-modal-title-wrapper">
                  <h5 class="modal-title fw-bold modern-modal-title">
                    {{ $t('businessProductStockAdmin.replacementsOf') }}
                  </h5>
                  <p class="modern-modal-client-name">
                    {{ this.product.productName }}
                  </p>
                </div>
              </div>
              <button
                class="btn-close modern-modal-close-btn"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <Spinner :show="loading"></Spinner>
            <div class="modal-body modern-modal-body-content">
              <ProductReplacementManagement
                ref="replacementManagementRef"
                :show-product-replacement-management="true"
                :toggles="toggles"
                :product-replacements-in="productReplacements"
                :product="product"
                :commerce="commerce"
                :commerces="commerces"
                :queues="queues"
                @getProductReplacements="getProductReplacements"
              >
              </ProductReplacementManagement>
            </div>
            <div class="modal-footer border-0 modern-modal-footer">
              <div class="d-flex align-items-center justify-content-between w-100 gap-3">
                <div class="flex-grow-1">
                  <SimpleDownloadCard
                    :download="toggles['products-stock.reports.replacement-details']"
                    :title="$t('businessProductStockAdmin.reports.replacement-details.title')"
                    :show-tooltip="true"
                    :description="
                      $t('businessProductStockAdmin.reports.replacement-details.description')
                    "
                    :icon="'bi-file-earmark-spreadsheet'"
                    @download="handleExportReplacementCSV"
                    :can-download="toggles['products-stock.reports.replacement-details'] === true"
                  ></SimpleDownloadCard>
                </div>
                <button
                  class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4 modern-modal-close-button"
                  type="button"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                >
                  <i class="bi bi-check-lg"></i>
                  {{ $t('notificationConditions.action') || $t('close') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Ultra Compact Product Row */
.product-row-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem 0.625rem;
  margin: 0.25rem 0.375rem;
  margin-bottom: 0;
  border-radius: 8px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-bottom: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  position: relative;
  overflow: visible;
  cursor: pointer;
  z-index: 1;
}

.product-row-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

/* Card Type Variations - Ultra Compact */
.product-row-card.product-card-success {
  border-left: 2px solid #00c2cb;
}

.product-row-card.product-card-success:hover {
  background: rgba(0, 194, 203, 0.03);
}

.product-row-card.product-card-warning {
  border-left: 2px solid #f9c322;
}

.product-row-card.product-card-warning:hover {
  background: rgba(249, 195, 34, 0.03);
}

.product-row-card.product-card-error {
  border-left: 2px solid #a52a2a;
}

.product-row-card.product-card-error:hover {
  background: rgba(165, 42, 42, 0.03);
}

/* Product Row Content - Ultra Compact Horizontal Layout */
.product-row-content {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.product-icon-mini {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  cursor: help;
}

.product-icon-mini i {
  font-size: 0.9375rem;
}

.product-row-card:hover .product-icon-mini {
  transform: scale(1.05);
}

.icon-success {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.icon-warning {
  background: rgba(249, 195, 34, 0.12);
  color: #f9c322;
}

.icon-error {
  background: rgba(165, 42, 42, 0.12);
  color: #a52a2a;
}

.product-info-inline {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.product-name-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.product-name-text {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.btn-copy-mini {
  background: transparent;
  border: none;
  padding: 0.1875rem;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-copy-mini:hover {
  background: rgba(169, 169, 169, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

.btn-copy-mini i {
  font-size: 0.75rem;
}

.product-meta-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.product-code-inline {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}

.icon-mini-separated {
  font-size: 0.6875rem;
  cursor: help;
  line-height: 1;
  margin-left: 0.25rem;
}

.collapse-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: auto;
}

.collapse-icon {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.5);
  transition: transform 0.2s ease;
  cursor: pointer;
}

.product-row-card:hover .collapse-icon {
  color: rgba(0, 0, 0, 0.7);
}

.product-row-card:hover .collapse-icon {
  transform: scale(1.1);
}

/* Status Inline - Ultra Compact */
.status-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.status-badge-inline {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.4375rem;
  background: rgba(169, 169, 169, 0.08);
  border-radius: 9999px;
  cursor: help;
  transition: all 0.2s ease;
  border: 1px solid rgba(169, 169, 169, 0.1);
}

.status-badge-inline:hover {
  background: rgba(169, 169, 169, 0.15);
  border-color: rgba(169, 169, 169, 0.2);
}

.status-badge-inline i {
  font-size: 0.75rem;
}

.status-badge-inline span {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #000000;
  line-height: 1;
}

/* Progress Bar Inline */
.progress-inline {
  flex: 0 0 80px;
  min-width: 80px;
  max-width: 120px;
}

.progress-mini {
  height: 3px;
  border-radius: 9999px;
  background: rgba(169, 169, 169, 0.1);
  overflow: hidden;
}

.progress-mini .progress-bar {
  height: 100%;
  transition: width 0.3s ease;
}

/* Responsive adjustments for ultra compact */
@media (max-width: 768px) {
  .product-row-content {
    gap: 0.5rem;
  }

  .product-icon-mini {
    width: 24px;
    height: 24px;
  }

  .product-icon-mini i {
    font-size: 0.8125rem;
  }

  .product-name-text {
    font-size: 0.75rem;
  }

  .status-inline {
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .progress-inline {
    flex: 1 1 100%;
    max-width: 100%;
  }
}

/* Details Expandable Section */
.details-expandable-section {
  margin: 0.25rem 0.375rem;
  margin-top: 0;
  border-radius: 0 0 8px 8px;
  overflow: visible;
  background: rgba(245, 246, 247, 0.4);
  border: 1px solid rgba(169, 169, 169, 0.1);
  border-top: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 1;
}

.detailed-data {
  padding: 0.625rem;
  max-height: 800px;
  overflow-y: auto;
  overflow-x: visible;
  background: rgba(250, 251, 252, 0.4);
  position: relative;
}

/* Info Sections - Ultra Compact */
.info-section {
  margin-bottom: 0.75rem;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section-header {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.15);
}

.info-section-header i {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
}

.info-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* Compact Section Styles */
.compact-section {
  margin-bottom: 0.75rem;
}

.info-section-header-compact {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.12);
}

.info-section-header-compact i {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

.info-section-title-compact {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Stock Progress Container */
.stock-progress-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stock-progress-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

.stock-label-min,
.stock-label-max {
  display: flex;
  align-items: center;
  gap: 0.1875rem;
}

.stock-label-current {
  font-size: 0.75rem;
  padding: 0.1875rem 0.5rem;
}

.progress-detail {
  height: 20px;
  border-radius: 4px;
  background: rgba(169, 169, 169, 0.1);
  overflow: hidden;
}

.progress-detail .progress-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.stock-percentage {
  text-align: center;
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.8);
}

/* Stock Levels Grid */
.stock-levels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
}

.data-item-compact {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.4375rem 0.5rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 5px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
}

.data-item-compact:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(169, 169, 169, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.data-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: 1.1;
}

.data-value {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #000000;
  line-height: 1.2;
}

.data-value i {
  font-size: 0.8125rem;
  color: rgba(0, 0, 0, 0.6);
  flex-shrink: 0;
}

/* Action Buttons - Uniform Style */
.action-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1875rem;
  padding: 0.25rem 0.375rem;
  min-height: 40px;
  width: 100%;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 194, 203, 0.05) 100%);
  color: #004aad;
  border: 1.5px solid rgba(0, 74, 173, 0.2);
}

.action-btn:hover {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.2) 0%, rgba(0, 194, 203, 0.1) 100%);
  border-color: rgba(0, 74, 173, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.15);
}

.action-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 74, 173, 0.1);
}

.action-btn i {
  font-size: 0.9375rem;
}

.action-btn span {
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Info Badges */
.info-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.info-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  padding: 0.375rem 0.625rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.info-badge:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(169, 169, 169, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.info-badge i {
  font-size: 0.875rem;
}

.badge-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.badge-value {
  font-weight: 600;
  color: #000000;
}

/* Metadata Section */
.metadata-section {
  padding-top: 0.5rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
  margin-top: 0.5rem;
}

.metadata-item-compact {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0;
  font-size: 0.6875rem;
  flex-wrap: wrap;
}

.metadata-separator {
  color: rgba(0, 0, 0, 0.3);
  font-weight: 300;
  margin: 0 0.125rem;
}

.metadata-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.metadata-value {
  color: rgba(0, 0, 0, 0.8);
}

/* Icon Colors */
.green-icon {
  color: var(--verde-tu);
}

.yellow-icon {
  color: var(--amarillo-star);
}

.red-icon {
  color: var(--rojo-warning);
}

.blue-icon {
  color: var(--azul-turno);
}

.gray-icon {
  color: #a9a9a9;
}

/* Transition */
.details-expand-enter-active,
.details-expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.details-expand-enter-from,
.details-expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.details-expand-enter-to,
.details-expand-leave-from {
  max-height: 1000px;
  opacity: 1;
}

/* Responsive - Ultra Compact */
@media (max-width: 768px) {
  .product-row-card {
    padding: 0.4375rem 0.5rem;
  }

  .product-icon-mini {
    width: 24px;
    height: 24px;
  }

  .product-icon-mini i {
    font-size: 0.8125rem;
  }

  .product-name-text {
    font-size: 0.75rem;
  }

  .status-inline {
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .action-buttons-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .product-row-card {
    padding: 0.375rem 0.4375rem;
    margin: 0.1875rem 0.25rem;
    margin-bottom: 0;
  }

  .product-name-text {
    font-size: 0.6875rem;
  }

  .action-buttons-grid {
    grid-template-columns: 1fr;
  }

  .info-badges {
    flex-direction: column;
  }

  .info-badge {
    width: 100%;
  }

  .product-row-content {
    gap: 0.4375rem;
  }
}

/* Tooltip z-index improvements - Ensure tooltips appear above all content */
:deep(.popper),
:deep(.popper-dark),
:deep([data-popper-placement]),
:deep([data-popper-placement] > div) {
  z-index: 10000 !important;
}

:deep(.popper__arrow),
:deep(.popper__arrow::before) {
  z-index: 10001 !important;
}

/* Allow tooltips to overflow parent containers */
.product-row-card {
  overflow: visible;
}

.details-expandable-section {
  overflow: visible;
}

/* Keep scroll for content but allow tooltips to show */
.detailed-data {
  overflow-y: auto;
  overflow-x: visible;
}

/* Ensure tooltip containers don't clip */
.info-section,
.action-buttons-grid,
.stock-levels-grid {
  position: relative;
  overflow: visible;
}
/* Modern Modal Styles - Same as ClientDetailsCard */
:deep(.modern-modal-wrapper) {
  margin: 0;
  max-width: 90vw;
  height: 100vh;
  display: flex;
  align-items: stretch;
}

:deep(.modern-modal-container) {
  border: none;
  border-radius: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
}

:deep(.modern-modal-header) {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 0;
  min-height: auto;
  position: relative;
}

:deep(.modern-modal-header-inner) {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

:deep(.modern-modal-icon-wrapper) {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

:deep(.modern-modal-icon-wrapper i) {
  font-size: 1.125rem;
  color: #ffffff;
}

:deep(.modern-modal-title-wrapper) {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

:deep(.modern-modal-title) {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-background);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

:deep(.modern-modal-client-name) {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.modern-modal-close-btn) {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.85;
  width: 1.75rem;
  height: 1.75rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  padding: 0;
}

:deep(.modern-modal-close-btn i) {
  font-size: 1rem;
  color: #ffffff;
  line-height: 1;
}

:deep(.modern-modal-close-btn:hover) {
  opacity: 1;
  background: rgba(255, 255, 255, 0.25);
}

:deep(.modern-modal-close-btn:focus) {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

:deep(.modern-modal-body-content) {
  padding: 1rem;
  background: #ffffff;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

:deep(.modern-modal-footer) {
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-radius: 0;
}

:deep(.modern-modal-close-button) {
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

:deep(.modern-modal-close-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

:deep(.modern-modal-close-button:active) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  :deep(.modern-modal-wrapper) {
    margin: 0;
    max-width: 100vw;
    height: 100vh;
  }

  :deep(.modern-modal-header) {
    padding: 0.625rem 0.875rem;
  }

  :deep(.modern-modal-icon-wrapper) {
    width: 2rem;
    height: 2rem;
  }

  :deep(.modern-modal-icon-wrapper i) {
    font-size: 1rem;
  }

  :deep(.modern-modal-title) {
    font-size: 0.9375rem;
  }

  :deep(.modern-modal-client-name) {
    font-size: 0.6875rem;
  }

  :deep(.modern-modal-body-content) {
    padding: 0.75rem;
  }

  :deep(.modern-modal-footer) {
    padding: 0.625rem 0.875rem;
  }
}
</style>
