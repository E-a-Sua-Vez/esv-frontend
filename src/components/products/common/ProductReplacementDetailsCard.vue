<script>
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { getDate } from '../../../shared/utils/date';
import Spinner from '../../common/Spinner.vue';

export default {
  name: 'ProductReplacementDetailsCard',
  components: { Popper, Spinner },
  props: {
    show: { type: Boolean, default: true },
    product: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
  },
  data() {
    return {
      loading: false,
      extendedEntity: false,
    };
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyReplacement() {
      const textToCopy = jsonToCsv([this.product]);
      navigator.clipboard.writeText(textToCopy);
    },
    clasifyReplacementStatus(score) {
      if (score === undefined || score === null) {
        return 'bi-battery-full blue-icon';
      } else if (score > 0) {
        return 'bi-battery-full green-icon';
      } else {
        return 'bi-battery red-icon';
      }
    },
    clasifyExpired(score) {
      if (!score && score !== 0) {
        return 'bi-heart-pulse-fill blue-icon';
      } else if (score < -30) {
        return 'bi-heart-pulse-fill red-icon';
      }
    },
    scorePercentage(total, score) {
      return parseFloat(((score * 100) / total).toFixed(2), 2) || 0;
    },
    replacementScoreBarStyle(product) {
      const level = this.scorePercentage(
        product.replacementAmount,
        product.replacementActualLevel ? product.replacementActualLevel : 0
      );
      if (level <= 0) {
        return 'red-area';
      } else if (level < 100) {
        return 'yellow-area';
      } else {
        return 'green-area';
      }
    },
    getCardTypeClass() {
      if (!this.product || !this.product.replacementAmount) {
        return 'product-card-success';
      }
      const level = this.scorePercentage(
        this.product.replacementAmount,
        this.product.replacementActualLevel ? this.product.replacementActualLevel : 0
      );
      if (level <= 0) {
        return 'product-card-error';
      } else if (level < 100) {
        return 'product-card-warning';
      } else {
        return 'product-card-success';
      }
    },
    getStatusIconClass() {
      if (!this.product || !this.product.replacementAmount) {
        return 'icon-success';
      }
      const level = this.scorePercentage(
        this.product.replacementAmount,
        this.product.replacementActualLevel ? this.product.replacementActualLevel : 0
      );
      if (level <= 0) {
        return 'icon-error';
      } else if (level < 100) {
        return 'icon-warning';
      } else {
        return 'icon-success';
      }
    },
    getStockIconClass() {
      if (!this.product || !this.product.replacementAmount) {
        return 'bi-battery-full green-icon';
      }
      const level = this.scorePercentage(
        this.product.replacementAmount,
        this.product.replacementActualLevel ? this.product.replacementActualLevel : 0
      );
      if (level <= 0) {
        return 'bi-battery red-icon';
      } else if (level < 100) {
        return 'bi-battery-half yellow-icon';
      } else {
        return 'bi-battery-full green-icon';
      }
    },
  },
  watch: {
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.detailsOpened;
      },
    },
  },
};
</script>

<template>
  <div v-if="show">
    <!-- Ultra Compact Replacement Row - Clickable -->
    <div class="product-row-card" :class="getCardTypeClass()" @click="showDetails()">
      <div class="product-row-content">
        <!-- Status Icon -->
        <Popper :class="'dark'" arrow disable-click-away hover>
          <template #content>
            <div>Estado do recarregamento baseado em nível de estoque</div>
          </template>
          <div class="product-icon-mini" :class="getStatusIconClass()" @click.stop>
            <i :class="`bi ${clasifyReplacementStatus(product?.replacementActualLevel)}`"></i>
          </div>
        </Popper>

        <!-- Product Info - Horizontal -->
        <div class="product-info-inline">
          <div class="product-name-inline">
            <span class="product-name-text">{{ product.productName || 'N/I' }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>Copiar dados do recarregamento</div>
              </template>
              <button class="btn-copy-mini" @click.stop="copyReplacement()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
            </Popper>
          </div>
          <div class="product-meta-inline">
            <span class="product-code-inline">{{ product?.replacementCode || 'N/I' }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>Dias desde expiração. Verde: &gt;30 dias, Amarelo: 0-30 dias, Vermelho: expirado</div>
              </template>
              <i
                :class="`bi ${clasifyExpired(product?.daysSinceExpired)} icon-mini-separated`"
                @click.stop
              ></i>
            </Popper>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>Data do recarregamento</div>
              </template>
              <i class="bi bi-calendar-fill blue-icon icon-mini-separated" @click.stop></i>
            </Popper>
          </div>
        </div>

        <!-- Status Indicators - Inline -->
        <div class="status-inline">
          <Popper :class="'dark'" arrow disable-click-away hover>
            <template #content>
              <div>Nível de estoque atual como porcentagem do recarregamento</div>
            </template>
            <div class="status-badge-inline" @click.stop>
              <i :class="`bi ${getStockIconClass()}`"></i>
              <span>{{
                product?.replacementAmount
                  ? scorePercentage(
                      product.replacementAmount,
                      product.replacementActualLevel ? product.replacementActualLevel : 0
                    ).toFixed(0)
                  : '0'
              }}%</span>
            </div>
          </Popper>
        </div>

        <!-- Progress Bar - Inline -->
        <div class="progress-inline" @click.stop>
          <div class="progress progress-mini">
            <div
              :class="`progress-bar ${replacementScoreBarStyle(product)}`"
              role="progressbar"
              :style="`width: ${scorePercentage(
                product.replacementAmount,
                product.replacementActualLevel ? product.replacementActualLevel : 0
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
          <!-- Stock Progress Section -->
          <div class="info-section compact-section">
            <div class="info-section-header-compact">
              <i class="bi bi-bar-chart-fill"></i>
              <span class="info-section-title-compact">Nível de Estoque</span>
            </div>
            <div class="stock-progress-container">
              <div class="stock-progress-labels">
                <span class="stock-label-min">
                  <i class="bi bi-caret-down-fill"></i>
                  {{ product.minimumLevel || 0 }}
                </span>
                <span class="badge bg-dark stock-label-current">
                  {{ product.replacementActualLevel || 0 }}
                </span>
                <span class="stock-label-max">
                  {{ product.replacementAmount }}
                  <i class="bi bi-caret-down-fill"></i>
                </span>
              </div>
              <div class="progress progress-detail">
                <div
                  :class="`progress-bar ${replacementScoreBarStyle(product)}`"
                  role="progressbar"
                  :style="`width: ${scorePercentage(
                    product.replacementAmount,
                    product.replacementActualLevel ? product.replacementActualLevel : 0
                  )}%`"
                  aria-valuemin="0"
                  aria-valuemax="100"
                ></div>
              </div>
              <div class="stock-percentage">
                <strong>
                  {{
                    scorePercentage(
                      product.replacementAmount,
                      product.replacementActualLevel ? product.replacementActualLevel : 0
                    ).toFixed(2)
                  }}%
                </strong>
              </div>
            </div>
          </div>

          <!-- Stock Levels Grid -->
          <div class="info-section compact-section">
            <div class="info-section-header-compact">
              <i class="bi bi-info-circle"></i>
              <span class="info-section-title-compact">Informação do Recarregamento</span>
            </div>
            <div class="stock-levels-grid">
              <div class="data-item-compact">
                <span class="data-label">Nivel Atual</span>
                <div class="data-value">
                  <i class="bi bi-battery-half"></i>
                  <span>
                    {{ product.replacementActualLevel }}
                    {{ $t(`productMeasuresTypesShort.${product.productMeasureType}`) }}
                  </span>
                </div>
              </div>
              <div class="data-item-compact">
                <span class="data-label">Nível Recarga</span>
                <div class="data-value">
                  <i class="bi bi-arrow-down-circle-fill"></i>
                  <span>
                    {{ product.replacementAmount }}
                    {{ $t(`productMeasuresTypesShort.${product.productMeasureType}`) }}
                  </span>
                </div>
              </div>
              <div class="data-item-compact">
                <span class="data-label">Valor Pagado</span>
                <div class="data-value">
                  <i class="bi bi-coin"></i>
                  <span>{{ product.price || 0 }}</span>
                </div>
              </div>
              <div class="data-item-compact">
                <span class="data-label">Días para Expiração</span>
                <div class="data-value">
                  <i class="bi bi-calendar-x"></i>
                  <span>{{ +product.daysSinceExpired * -1 }}</span>
                </div>
              </div>
              <div class="data-item-compact">
                <span class="data-label">Data Expiração</span>
                <div class="data-value">
                  <i class="bi bi-calendar-event"></i>
                  <span>{{ getDate(product.replacementExpirationDate) }}</span>
                </div>
              </div>
              <div class="data-item-compact">
                <span class="data-label">Data Recarregamento</span>
                <div class="data-value">
                  <i class="bi bi-calendar-check"></i>
                  <span>{{ getDate(product.replacementDate) }}</span>
                </div>
              </div>
              <div class="data-item-compact">
                <span class="data-label">Próximo Recarga</span>
                <div class="data-value">
                  <i class="bi bi-calendar-plus"></i>
                  <span>{{ getDate(product.nextReplacementDate) }}</span>
                </div>
              </div>
              <div class="data-item-compact">
                <span class="data-label">Usuário</span>
                <div class="data-value">
                  <i class="bi bi-person-fill"></i>
                  <span>{{ product.replacedBy || 'N/I' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Additional Info -->
          <div class="info-section compact-section" style="margin-bottom: 0">
            <div class="info-section-header-compact">
              <i class="bi bi-tag"></i>
              <span class="info-section-title-compact">Metadados</span>
            </div>
            <div class="metadata-grid">
              <span class="metadata-item">
                <strong>ID:</strong> {{ product.productId }}
              </span>
              <span class="metadata-item">
                <strong>Código:</strong> {{ product.replacementCode }}
              </span>
              <span class="metadata-item">
                <strong>Data Criação:</strong> {{ getDate(product.createdDate || product.createdAt) }}
              </span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* Ultra Compact Product Row - Clickable */
.product-row-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 8px 8px 0 0;
  border: 1px solid rgba(169, 169, 169, 0.15);
  border-bottom: none;
  margin: 0.375rem;
  margin-bottom: 0;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.product-row-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  transition: background-color 0.2s ease;
}

.product-card-success::before {
  background: linear-gradient(180deg, #00c2cb 0%, #00a8b0 100%);
}

.product-card-warning::before {
  background: linear-gradient(180deg, #f9c322 0%, #e0a800 100%);
}

.product-card-error::before {
  background: linear-gradient(180deg, #a52a2a 0%, #8b0000 100%);
}

.product-row-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: rgba(169, 169, 169, 0.25);
}

.product-row-content {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.625rem;
  position: relative;
}

/* Status Icon Mini */
.product-icon-mini {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
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

.product-row-card:hover .product-icon-mini {
  transform: scale(1.1);
}

.product-icon-mini i {
  font-size: 0.9375rem;
}

/* Product Info Inline */
.product-info-inline {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.product-name-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.product-name-text {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.btn-copy-mini {
  background: transparent;
  border: none;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
}

.btn-copy-mini:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.7);
  transform: scale(1.1);
}

.btn-copy-mini i {
  font-size: 0.75rem;
}

.product-meta-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.6);
}

.product-code-inline {
  font-weight: 600;
}

.icon-mini-separated {
  font-size: 0.8125rem;
  margin-left: 0.125rem;
}

/* Status Indicators Inline */
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
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  transition: all 0.2s ease;
}

.status-badge-inline:hover {
  background: rgba(0, 0, 0, 0.08);
  transform: scale(1.05);
}

.status-badge-inline i {
  font-size: 0.875rem;
}

/* Collapse Icon */
.collapse-icon-wrapper {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collapse-icon {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.5);
  transition: transform 0.2s ease;
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

.red-area {
  background: linear-gradient(90deg, #a52a2a 0%, #8b0000 100%);
}

.yellow-area {
  background: linear-gradient(90deg, #f9c322 0%, #e0a800 100%);
}

.green-area {
  background: linear-gradient(90deg, #00c2cb 0%, #00a8b0 100%);
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
  max-height: 800px;
  opacity: 1;
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

/* Metadata Grid */
.metadata-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.metadata-item {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.6);
}

.metadata-item strong {
  color: rgba(0, 0, 0, 0.8);
  font-weight: 700;
}

/* Responsive */
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

  .stock-levels-grid {
    grid-template-columns: 1fr;
  }
}
</style>

