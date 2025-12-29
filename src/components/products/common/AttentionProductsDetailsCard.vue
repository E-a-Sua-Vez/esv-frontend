<script>
import { getContactResultTypes } from '../../../shared/utils/data';
import { getDate } from '../../../shared/utils/date';
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import ProductAttentionManagement from '../domain/ProductAttentionManagement.vue';
import { getProductsConsumptionsDetails } from '../../../application/services/query-stack';

export default {
  name: 'AttentionProductsDetailsCard',
  components: { Popper, Spinner, SimpleDownloadCard, ProductAttentionManagement },
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
        <div v-if="attention?.servicesDetails && attention.servicesDetails.length > 0" class="services-inline">
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
                    {{ $t('businessProductStockAdmin.attentionProducts') || 'Ver stock de atención' }}
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
              <span class="info-section-title-compact">{{ $t('dashboard.attData') || 'Datos Atención' }}</span>
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
              <div v-if="attention?.servicesDetails && attention.servicesDetails.length > 0" class="data-item-compact">
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
                  <i class="bi bi-eyedropper"></i>
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
              <ProductAttentionManagement
                ref="attentionManagementRef"
                :show-product-attention-management="true"
                :toggles="toggles"
                :attention="attention"
                :commerce="commerce"
                :product-attentions-in="productConsumptions"
                @getProductConsuptions="getAttentionProducts"
              >
              </ProductAttentionManagement>
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
                    @download="handleExportAttentionCSV"
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
  </div>
</template>

<style scoped>
/* Ultra Compact Attention Row Card */
.attention-row-card {
  background: #ffffff;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  margin: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
}

.attention-row-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
  border-color: rgba(0, 0, 0, 0.12);
}

.attention-card-success {
  border-left: 4px solid var(--verde-tu);
}

.attention-card-warning {
  border-left: 4px solid var(--amarillo-star);
}

.attention-card-error {
  border-left: 4px solid var(--rojo-warning);
}

.attention-row-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  flex-wrap: wrap;
}

/* Status Icon */
.attention-icon-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.icon-success {
  background: rgba(40, 167, 69, 0.1);
  color: var(--verde-tu);
}

.icon-warning {
  background: rgba(255, 193, 7, 0.1);
  color: var(--amarillo-star);
}

.icon-error {
  background: rgba(220, 53, 69, 0.1);
  color: var(--rojo-warning);
}

.attention-icon-mini i {
  font-size: 1rem;
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
  gap: 0.375rem;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.service-badge-mini {
  font-size: 0.6875rem;
  padding: 0.1875rem 0.5rem;
  background: var(--azul-turno);
  color: white;
  border-radius: 9999px;
  font-weight: 600;
}

.service-badge-more {
  font-size: 0.6875rem;
  padding: 0.1875rem 0.5rem;
  background: rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.7);
  border-radius: 9999px;
  font-weight: 600;
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
  transform: scale(1.1);
}

/* Expandable Details Section */
.details-expandable-section {
  margin: 0 0.5rem 0.5rem 0.5rem;
  border-radius: 0 0 0.5rem 0.5rem;
  background: rgba(245, 246, 247, 0.4);
  border: 1px solid rgba(169, 169, 169, 0.1);
  border-top: none;
  overflow: visible;
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
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.02) 0%, rgba(0, 194, 203, 0.01) 100%);
  overflow-y: auto;
  overflow-x: visible;
  max-height: none;
}

/* Info Sections */
.info-section {
  margin-bottom: 1.5rem;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: #000000;
}

.info-section-header i {
  font-size: 1rem;
  color: var(--azul-turno);
}

.info-section-title {
  font-size: 0.875rem;
  font-weight: 700;
}

.info-section-header-compact {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000000;
}

.info-section-header-compact i {
  font-size: 0.875rem;
  color: var(--azul-turno);
}

.info-section-title-compact {
  font-size: 0.8125rem;
  font-weight: 700;
}

/* Client Info Grid */
.client-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--azul-turno);
  text-decoration: none;
  transition: all 0.2s ease;
}

.contact-link:hover {
  color: var(--azul-turno);
  text-decoration: underline;
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.data-item-compact {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.data-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.data-value {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #000000;
}

.data-value i {
  font-size: 0.875rem;
  color: var(--azul-turno);
  flex-shrink: 0;
}

/* Metadata Section */
.metadata-section {
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.metadata-item-compact {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.75rem;
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
}

/* Compact Section */
.compact-section {
  background: rgba(0, 0, 0, 0.02);
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
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
}
</style>
