<script>
import { getContactResultTypes } from '../../../shared/utils/data.ts';
import { getDate } from '../../../shared/utils/date';
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import ProductAttentionManagement from '../domain/ProductAttentionManagement.vue';
import { getProductsConsumptionsDetails } from '../../../application/services/query-stack';

export default {
  name: 'AttentionProductsDetailsCard',
  components: { Popper, Spinner, ProductAttentionManagement },
  props: {
    show: { type: Boolean, default: true },
    toggles: { type: Object, default: undefined },
    attention: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    commerce: { type: Object, default: undefined },
  },
  data() {
    return {
      loading: false,
      extendedEntity: false,
      contactResultTypes: [],
      productConsumptions: [],
      page: 1,
      limit: 10,
    };
  },
  beforeMount() {
    this.contactResultTypes = getContactResultTypes();
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyAttention() {
      const textToCopy = jsonToCsv([this.attention]);
      navigator.clipboard.writeText(textToCopy);
    },
    handleExportAttentionCSV() {
      if (this.$refs.attentionManagementRef && this.$refs.attentionManagementRef.exportToCSV) {
        this.$refs.attentionManagementRef.exportToCSV();
      }
    },
    clasifyDaysSinceComment(score) {
      if (score === undefined) {
        return 'bi-qr-code blue-icon';
      } else if (score <= 90) {
        return 'bi-qr-code green-icon';
      } else if (score <= 180) {
        return 'bi-qr-code yellow-icon';
      } else {
        return 'bi-qr-code red-icon';
      }
    },
    getCardTypeClass() {
      const days = this.attention?.daysSinceAttention || 0;
      if (days <= 90) {
        return 'attention-card-success';
      } else if (days <= 180) {
        return 'attention-card-warning';
      } else {
        return 'attention-card-error';
      }
    },
    getStatusIconClass() {
      const days = this.attention?.daysSinceAttention || 0;
      if (days <= 90) {
        return 'icon-success';
      } else if (days <= 180) {
        return 'icon-warning';
      } else {
        return 'icon-error';
      }
    },
    async getAttentionProducts() {
      try {
        this.loading = true;
        this.productConsumptions = await getProductsConsumptionsDetails(
          undefined,
          undefined,
          this.page,
          this.limit,
          this.asc,
          undefined,
          undefined,
          this.attention.attentionId
        );
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    getFullName() {
      if (!this.attention) return 'N/I';
      const name = this.attention.userName?.trim() || '';
      const lastName = this.attention.userLastName?.trim() || '';
      return `${name} ${lastName}`.trim().toUpperCase() || 'N/I';
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
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.extendedEntity;
      },
    },
  },
};
</script>

<template>
  <div v-if="show">
    <!-- Ultra Compact Attention Row - Clickable -->
    <div class="attention-row-card" :class="getCardTypeClass()" @click="showDetails()">
      <div class="attention-row-content">
        <!-- Status Icon -->
        <Popper :class="'dark'" arrow disable-click-away hover>
          <template #content>
            <div>
              {{ $t('dashboard.attData') || 'Días desde atención' }}
            </div>
          </template>
          <div class="attention-icon-mini" :class="getStatusIconClass()" @click.stop>
            <i :class="`bi ${clasifyDaysSinceComment(attention?.daysSinceAttention || 0)}`"></i>
          </div>
        </Popper>

        <!-- Attention Info - Horizontal -->
        <div class="attention-info-inline">
          <div class="attention-name-inline">
            <span class="attention-name-text">{{ getFullName() }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>
                  {{ $t('dashboard.details') || 'Copiar datos de la atención' }}
                </div>
              </template>
              <button class="btn-copy-mini" @click.stop="copyAttention()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
            </Popper>
          </div>
          <div class="attention-meta-inline">
            <span class="attention-date-inline">{{ getDate(attention?.createdDate) }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>
                  {{ $t('dashboard.attData') || 'Días desde atención' }}
                </div>
              </template>
              <div class="days-badge-inline" @click.stop>
                <i :class="`bi ${clasifyDaysSinceComment(attention?.daysSinceAttention || 0)}`"></i>
                <span>{{ attention?.daysSinceAttention || 0 }}</span>
              </div>
            </Popper>
            <i
              v-if="attention?.productCounter > 0"
              class="bi bi-eyedropper icon-mini-separated"
              @click.stop
            ></i>
          </div>
        </div>

        <!-- Services Badges - Inline -->
        <div
          v-if="attention?.servicesDetails && attention.servicesDetails.length > 0"
          class="services-inline"
        >
          <span
            v-for="serv in attention.servicesDetails.slice(0, 2)"
            :key="serv.id"
            class="service-badge-mini"
          >
            {{ serv.name }}
          </span>
          <span v-if="attention.servicesDetails.length > 2" class="service-badge-more">
            +{{ attention.servicesDetails.length - 2 }}
          </span>
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
          <!-- Client Info Section -->
          <div class="info-section">
            <div class="info-section-header">
              <i class="bi bi-person-circle"></i>
              <span class="info-section-title">{{ $t('dashboard.client') || 'Cliente' }}</span>
            </div>
            <div class="client-info-grid">
              <div class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.name') || 'Nombre' }}:</span>
                <div class="data-value">
                  <i class="bi bi-person-fill"></i>
                  <span>{{ getFullName() }}</span>
                </div>
              </div>
              <div v-if="attention?.userPhone" class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.phone') || 'Teléfono' }}:</span>
                <div class="data-value">
                  <a
                    class="contact-link"
                    :href="'https://wa.me/' + attention.userPhone"
                    target="_blank"
                    @click.stop
                  >
                    <i class="bi bi-whatsapp whatsapp-icon"></i>
                    <span>{{ attention.userPhone }}</span>
                  </a>
                </div>
              </div>
              <div v-if="attention?.userEmail" class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.email') || 'Email' }}:</span>
                <div class="data-value">
                  <a
                    class="contact-link"
                    :href="'mailto:' + attention.userEmail"
                    target="_blank"
                    @click.stop
                  >
                    <i class="bi bi-envelope"></i>
                    <span>{{ attention.userEmail }}</span>
                  </a>
                </div>
              </div>
              <div v-if="attention?.userIdNumber" class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.idNumber') || 'ID' }}:</span>
                <div class="data-value">
                  <i class="bi bi-person-vcard"></i>
                  <span>{{ attention.userIdNumber }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons Section -->
          <div v-if="!loading" class="info-section">
            <div class="action-buttons-grid">
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>
                    {{
                      $t('businessProductStockAdmin.attentionProducts') || 'Ver stock de atención'
                    }}
                  </div>
                </template>
                <button
                  @click="getAttentionProducts()"
                  class="action-btn"
                  data-bs-toggle="modal"
                  :data-bs-target="`#attentionsProductsModal-${attention.attentionId}`"
                >
                  <i class="bi bi-eyedropper"></i>
                  <span>{{ $t('businessProductStockAdmin.stock') }}</span>
                </button>
              </Popper>
            </div>
          </div>

          <!-- Attention Details Section -->
          <div class="info-section compact-section">
            <div class="info-section-header-compact">
              <i class="bi bi-qr-code"></i>
              <span class="info-section-title-compact">{{
                $t('dashboard.attData') || 'Datos Atención'
              }}</span>
            </div>
            <div class="attention-details-grid">
              <div v-if="attention?.queueName" class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.queueData') || 'Cola' }}:</span>
                <div class="data-value">
                  <i class="bi bi-list-ul"></i>
                  <span>{{ attention.queueName }}</span>
                </div>
              </div>
              <div v-if="attention?.collaboratorName" class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.userData') || 'Usuario' }}:</span>
                <div class="data-value">
                  <i class="bi bi-person-fill"></i>
                  <span>{{ attention.collaboratorName }}</span>
                </div>
              </div>
              <div
                v-if="attention?.commerceName && attention.commerceTag"
                class="data-item-compact"
              >
                <span class="data-label">{{ $t('dashboard.commerceData') || 'Comercio' }}:</span>
                <div class="data-value">
                  <i class="bi bi-shop"></i>
                  <span>{{ attention.commerceName }} - {{ attention.commerceTag }}</span>
                </div>
              </div>
              <div v-if="attention?.packageId && attention.packageName" class="data-item-compact">
                <span class="data-label">{{ $t('paymentData.package') || 'Paquete' }}:</span>
                <div class="data-value">
                  <i class="bi bi-box-fill"></i>
                  <span>{{ attention.packageName }}</span>
                  <span class="badge bg-secondary ms-1"
                    >{{ attention.packageProcedureNumber }} /
                    {{ attention.packageProceduresTotalNumber }}</span
                  >
                  <i
                    v-if="attention.packagePaid"
                    class="bi bi-check-circle-fill green-icon ms-1"
                  ></i>
                </div>
              </div>
              <div
                v-if="attention?.servicesDetails && attention.servicesDetails.length > 0"
                class="data-item-compact"
              >
                <span class="data-label">{{ $t('paymentData.service') || 'Servicios' }}:</span>
                <div class="data-value">
                  <span
                    v-for="serv in attention.servicesDetails"
                    :key="serv.id"
                    class="badge bg-primary me-1"
                  >
                    {{ serv.name }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Metadata Section -->
          <div class="info-section metadata-section">
            <div class="metadata-item-compact">
              <span class="metadata-label">ID:</span>
              <span class="metadata-value">{{ attention?.attentionId || 'N/I' }}</span>
              <span class="metadata-separator">•</span>
              <span class="metadata-label">{{ $t('dashboard.date') || 'Fecha' }}:</span>
              <span class="metadata-value">{{ getDate(attention?.createdDate) }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Modal Products - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
      <div
        class="modal fade"
        :id="`attentionsProductsModal-${attention.attentionId}`"
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
                    {{ $t('businessProductStockAdmin.attentionProducts') }}
                  </h5>
                  <p class="modern-modal-client-name">
                    {{ attention.attentionId }}
                  </p>
                </div>
              </div>
              <button
                class="modern-modal-close-btn"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <Spinner :show="loading"></Spinner>
            <div class="modal-body modern-modal-body-content">
              <ProductAttentionManagement
                ref="attentionManagementRef"
                :show-product-attention-management="true"
                :toggles="toggles"
                :attention="attention"
                :commerce="commerce"
                :product-attentions-in="productConsumptions"
                :show-search-filters="false"
                @getProductConsuptions="getAttentionProducts"
              >
              </ProductAttentionManagement>
            </div>
            <div class="modal-footer border-0 modern-modal-footer">
              <div class="d-flex align-items-center justify-content-end w-100">
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
/* Ultra Compact Attention Row Card */
.attention-row-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem 0.625rem;
  margin: 0.25rem 0.375rem;
  margin-bottom: 0.5rem;
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

.attention-row-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

.attention-card-success {
  border-left: 2px solid #00c2cb;
}

.attention-card-success:hover {
  background: rgba(0, 194, 203, 0.03);
}

.attention-card-warning {
  border-left: 2px solid #f9c322;
}

.attention-card-warning:hover {
  background: rgba(249, 195, 34, 0.03);
}

.attention-card-error {
  border-left: 2px solid #a52a2a;
}

.attention-card-error:hover {
  background: rgba(165, 42, 42, 0.03);
}

.attention-row-content {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

/* Status Icon */
.attention-icon-mini {
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

.attention-row-card:hover .attention-icon-mini {
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

.attention-icon-mini i {
  font-size: 0.9375rem;
}

/* Attention Info - Inline */
.attention-info-inline {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.attention-name-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.attention-name-text {
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

.attention-meta-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.attention-date-inline {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}

.days-badge-inline {
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

.days-badge-inline:hover {
  background: rgba(169, 169, 169, 0.15);
  border-color: rgba(169, 169, 169, 0.2);
}

.days-badge-inline i {
  font-size: 0.75rem;
}

.days-badge-inline span {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #000000;
  line-height: 1;
}

.icon-mini-separated {
  font-size: 0.6875rem;
  cursor: help;
  line-height: 1;
  margin-left: 0.25rem;
}

/* Services Inline */
.services-inline {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.service-badge-mini {
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.1875rem;
  line-height: 1.2;
}

.service-badge-mini i {
  font-size: 0.625rem;
}

.service-badge-more {
  background: rgba(0, 0, 0, 0.08);
  color: rgba(0, 0, 0, 0.6);
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  line-height: 1.2;
}

/* Collapse Icon */
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

.attention-row-card:hover .collapse-icon {
  color: rgba(0, 0, 0, 0.7);
}

.attention-row-card[class*='extended'] .collapse-icon,
.attention-row-card:hover .collapse-icon {
  transform: scale(1.1);
}

/* Expandable Details Section */
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
  max-height: 5000px;
  opacity: 1;
}

.detailed-data {
  padding: 0.625rem;
  max-height: 800px;
  overflow-y: auto;
  overflow-x: visible;
  background: rgba(250, 251, 252, 0.4);
  position: relative;
}

/* Info Sections */
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

/* Client Info Grid */
.client-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: inherit;
  text-decoration: none;
  transition: all 0.2s ease;
}

.contact-link:hover {
  text-decoration: none;
}

.whatsapp-icon {
  color: #25d366;
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

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

/* Attention Details Grid */
.attention-details-grid {
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
  text-decoration: none;
  color: inherit;
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

.contact-link.data-item-compact:hover {
  border-color: rgba(0, 74, 173, 0.3);
}

.contact-link.data-item-compact:hover .data-value {
  color: #004aad;
}

.contact-link.data-item-compact:hover .data-value i {
  color: #004aad;
}

.contact-link.data-item-compact:hover .whatsapp-icon {
  color: #25d366;
}

/* Metadata Section */
.metadata-section {
  padding-top: 0.5rem;
  border-top: 1px solid rgba(169, 169, 169, 0.12);
  margin-top: 0.5rem;
}

.metadata-item-compact {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.6);
}

.metadata-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
}

.metadata-value {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.8);
}

.metadata-separator {
  color: rgba(0, 0, 0, 0.3);
  font-weight: 300;
  margin: 0 0.125rem;
}

/* Modern Modal Styles */
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

/* Responsive */
@media (max-width: 768px) {
  .attention-row-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .collapse-icon-wrapper {
    margin-left: 0;
    align-self: flex-end;
  }

  .client-info-grid,
  .attention-details-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons-grid {
    grid-template-columns: 1fr;
  }

  :deep(.modern-modal-wrapper) {
    max-width: 100vw;
  }

  :deep(.modern-modal-header) {
    padding: 0.625rem 0.75rem;
  }

  :deep(.modern-modal-icon-wrapper) {
    width: 2rem;
    height: 2rem;
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
    padding: 0.625rem 0.75rem;
  }
}
</style>
