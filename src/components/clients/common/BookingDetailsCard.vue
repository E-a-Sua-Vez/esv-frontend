<script>
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { getDate } from '../../../shared/utils/date';
import Spinner from '../../common/Spinner.vue';
import { formatIdNumber } from '../../../shared/utils/idNumber';
import { Modal } from 'bootstrap';

export default {
  name: 'BookingDetailsCard',
  components: { Popper, Spinner },
  props: {
    show: { type: Boolean, default: true },
    booking: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    commerce: { type: Object, default: undefined },
    disableClick: { type: Boolean, default: false },
    packageColor: { type: Object, default: null },
    showBookingModal: { type: Boolean, default: false },
  },
  emits: ['open-modal'],
  data() {
    return {
      loading: false,
      extendedEntity: false,
    };
  },
  errorCaptured(err, instance, info) {
    console.error('BookingDetailsCard error captured:', err, info);
    // Prevent error from propagating and crashing the app
    return false;
  },
  computed: {
    bookingFullName() {
      try {
        if (!this.booking) return 'N/I';
        const name = this.booking.userName?.trim() || this.booking.user?.name?.trim() || '';
        const lastName =
          this.booking.userLastName?.trim() || this.booking.user?.lastName?.trim() || '';
        return `${name} ${lastName}`.trim().toUpperCase() || 'N/I';
      } catch (error) {
        console.error('Error computing bookingFullName:', error);
        return 'N/I';
      }
    },
    timeSlot() {
      try {
        if (!this.booking) return '';
        if (this.booking?.hourFrom && this.booking?.hourTo) {
          return `${this.booking.hourFrom} - ${this.booking.hourTo}`;
        }
        if (this.booking?.block?.hourFrom && this.booking?.block?.hourTo) {
          return `${this.booking.block.hourFrom} - ${this.booking.block.hourTo}`;
        }
        return '';
      } catch (error) {
        console.error('Error computing timeSlot:', error);
        return '';
      }
    },
    bookingId() {
      try {
        if (!this.booking) return null;
        return this.booking.bookingId || this.booking.id || null;
      } catch (error) {
        console.error('Error computing bookingId:', error);
        return null;
      }
    },
  },
  methods: {
    handleCardClick(event) {
      try {
        if (!event) {
          console.warn('BookingDetailsCard: No event object');
          return;
        }
        if (this.disableClick) {
          if (event.preventDefault) event.preventDefault();
          if (event.stopPropagation) event.stopPropagation();
          return;
        }
        if (!this.booking) {
          console.warn('BookingDetailsCard: No booking data available');
          return;
        }
        this.showDetails(event);
      } catch (error) {
        console.error('Error in handleCardClick:', error);
        // Prevent error from propagating
        if (event && event.stopPropagation) {
          event.stopPropagation();
        }
      }
    },
    showDetails(event) {
      try {
        if (!this.booking) {
          console.warn('BookingDetailsCard: Cannot show details, booking is null');
          return;
        }
        // If in modal context, emit event to parent to open modal
        if (this.showBookingModal) {
          try {
            this.$emit('open-modal', this.booking);
          } catch (emitError) {
            console.error('Error emitting open-modal event:', emitError);
          }
        } else {
          this.extendedEntity = !this.extendedEntity;
        }
      } catch (error) {
        console.error('Error showing booking details:', error);
        // Prevent error from propagating
        if (event && event.stopPropagation) {
          event.stopPropagation();
        }
      }
    },
    openBookingDetailsModal() {
      if (!this.booking || !this.bookingId) return;
      try {
        const modalId = `bookingDetailsModal-${this.bookingId}`;
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
          const modal = new Modal(modalElement);
          modal.show();
        }
      } catch (error) {
        console.error('Error opening booking details modal:', error);
      }
    },
    getDate(dateIn, timeZoneIn) {
      if (!dateIn) return 'N/I';
      try {
        return getDate(dateIn, timeZoneIn);
      } catch (error) {
        console.error('Error formatting date:', error);
        return 'N/I';
      }
    },
    copyBooking(event) {
      try {
        if (event) {
          if (event.stopPropagation) event.stopPropagation();
          if (event.preventDefault) event.preventDefault();
        }
        if (!this.booking) {
          console.warn('BookingDetailsCard: Cannot copy, booking is null');
          return;
        }
        // Validate booking has properties before converting
        if (
          !this.booking ||
          typeof this.booking !== 'object' ||
          Object.keys(this.booking).length === 0
        ) {
          console.warn('BookingDetailsCard: Booking is empty or invalid');
          return;
        }
        let textToCopy = '';
        try {
          // Ensure booking is a valid object with properties
          const bookingArray = [this.booking];
          if (bookingArray[0] && Object.keys(bookingArray[0]).length > 0) {
            textToCopy = jsonToCsv(bookingArray);
          } else {
            throw new Error('Booking has no properties');
          }
        } catch (csvError) {
          console.error('Error converting booking to CSV:', csvError);
          // Fallback: create a simple text representation
          try {
            textToCopy = JSON.stringify(this.booking, null, 2);
          } catch (jsonError) {
            console.error('Error stringifying booking:', jsonError);
            textToCopy = 'Error: Could not copy booking data';
          }
        }
        if (textToCopy && navigator && navigator.clipboard) {
          navigator.clipboard.writeText(textToCopy).catch(err => {
            console.error('Error writing to clipboard:', err);
          });
        } else {
          console.warn('BookingDetailsCard: Clipboard API not available');
        }
      } catch (error) {
        console.error('Error copying booking data:', error);
        // Prevent error from propagating
        if (event && event.stopPropagation) {
          event.stopPropagation();
        }
      }
    },
    clasifyStatus(status) {
      try {
        if (status === undefined || status === null) {
          return 'bi-calendar-fill blue-icon';
        } else if (status === 'PENDING') {
          return 'bi-clock-fill yellow-icon';
        } else if (status === 'CONFIRMED') {
          return 'bi-check-circle-fill green-icon';
        } else if (status === 'PROCESSED') {
          return 'bi-qr-code green-icon';
        } else if (status === 'USER_CANCELED' || status === 'RESERVE_CANCELLED') {
          return 'bi-x-circle-fill red-icon';
        } else {
          return 'bi-calendar-fill blue-icon';
        }
      } catch (error) {
        console.error('Error classifying status:', error);
        return 'bi-calendar-fill blue-icon';
      }
    },
    getCardTypeClass() {
      try {
        if (!this.booking) return 'client-card-error';
        const status = this.booking?.status;
        if (status === 'CONFIRMED' || status === 'PROCESSED') return 'client-card-success';
        if (status === 'USER_CANCELED' || status === 'RESERVE_CANCELLED') return 'client-card-error';
        if (status === 'PENDING') return 'client-card-warning';
        return 'client-card-error';
      } catch (error) {
        console.error('Error getting card type class:', error);
        return 'client-card-error';
      }
    },
    getStatusIconClass() {
      try {
        if (!this.booking) return 'icon-error';
        const status = this.booking?.status;
        if (status === 'CONFIRMED' || status === 'PROCESSED') return 'icon-success';
        if (status === 'USER_CANCELED' || status === 'RESERVE_CANCELLED') return 'icon-error';
        if (status === 'PENDING') return 'icon-warning';
        return 'icon-error';
      } catch (error) {
        console.error('Error getting status icon class:', error);
        return 'icon-error';
      }
    },
    formatIdNumber(idNumber) {
      if (!idNumber || !this.commerce) return idNumber || 'N/I';
      try {
        return formatIdNumber(this.commerce, idNumber);
      } catch (error) {
        console.error('Error formatting ID number:', error);
        return idNumber || 'N/I';
      }
    },
    getStatusText(status) {
      try {
        if (status === 'PENDING') {
          return this.$t('dashboard.status.pending') || 'Pendente';
        } else if (status === 'CONFIRMED') {
          return this.$t('dashboard.status.confirmed') || 'Confirmado';
        } else if (status === 'PROCESSED') {
          return this.$t('dashboard.status.processed') || 'Atendido';
        } else if (status === 'USER_CANCELED' || status === 'RESERVE_CANCELLED') {
          return this.$t('dashboard.status.cancelled') || 'Cancelado';
        }
        return this.$t('dashboard.status.unknown') || 'Indefinido';
      } catch (error) {
        console.error('Error getting status text:', error);
        return 'N/I';
      }
    },
    getStatusBadgeClass(status) {
      try {
        if (status === 'PENDING') {
          return 'badge-warning';
        } else if (status === 'CONFIRMED') {
          return 'badge-info';
        } else if (status === 'PROCESSED') {
          return 'badge-success';
        } else if (status === 'USER_CANCELED' || status === 'RESERVE_CANCELLED') {
          return 'badge-danger';
        }
        return 'badge-secondary';
      } catch (error) {
        console.error('Error getting status badge class:', error);
        return 'badge-secondary';
      }
    },
    // Check if booking is processed and cannot be modified
    isBookingProcessed() {
      return this.booking && (this.booking.processed || this.booking.status === 'PROCESSED');
    },
  },
  watch: {
    detailsOpened: {
      immediate: true,
      handler(newVal) {
        try {
          if (newVal !== undefined && newVal !== null) {
            this.extendedEntity = Boolean(newVal);
          }
        } catch (error) {
          console.error('Error in detailsOpened watcher:', error);
        }
      },
    },
  },
};
</script>

<template>
  <div v-if="show && booking">
    <!-- Ultra Compact Booking Row - Clickable -->
    <div
      class="client-row-card"
      :class="getCardTypeClass()"
      :style="`${packageColor ? `border-left-color: ${packageColor.border} !important;` : ''}${
        disableClick ? 'cursor: default;' : 'cursor: pointer;'
      }`"
      @click="handleCardClick($event)"
    >
      <div class="client-row-content">
        <!-- Status Icon -->
        <Popper :class="'dark'" arrow disable-click-away hover>
          <template #content>
            <div>{{ $t('dashboard.clientCard.tooltip.status') || 'Estado do agendamento' }}</div>
          </template>
          <div class="client-icon-mini" :class="getStatusIconClass()" @click.stop>
            <i :class="`bi ${clasifyStatus(booking?.status)}`"></i>
          </div>
        </Popper>

        <!-- Service Badge -->
        <div
          v-if="
            (booking?.servicesDetails &&
              Array.isArray(booking.servicesDetails) &&
              booking.servicesDetails.length > 0) ||
            booking?.packageId
          "
          class="service-badges-inline"
        >
          <span
            v-for="serv in booking?.servicesDetails || []"
            :key="serv?.id || serv?.name || Math.random()"
            class="badge-mini service-tag-mini"
          >
            {{ serv?.name || 'N/I' }}
          </span>
          <span v-if="booking?.packageId" class="badge-mini service-tag-mini bg-secondary">
            <i class="bi bi-box-fill"></i> {{ booking?.packageProcedureNumber || '' }}
          </span>
        </div>

        <!-- Status Badge -->
        <div class="status-badge-wrapper">
          <Popper :class="'dark'" arrow disable-click-away hover>
            <template #content>
              <div>
                {{ $t('dashboard.clientCard.tooltip.status') || 'Estado do agendamento' }}:
                {{ getStatusText(booking?.status) }}
              </div>
            </template>
            <span class="badge-mini status-badge" :class="getStatusBadgeClass(booking?.status)">
              <i :class="`bi ${clasifyStatus(booking?.status)}`"></i>
              {{ getStatusText(booking?.status) }}
            </span>
          </Popper>
        </div>

        <!-- Client Info - Horizontal -->
        <div class="client-info-inline">
          <div class="client-name-inline">
            <span class="client-name-text">{{ bookingFullName }}</span>
            <!-- Paid Status Badge -->
            <div
              v-if="booking.paid || booking.confirmed || booking.confirmationData?.paid"
              class="attention-paid-badge"
              :title="$t('collaboratorBookingsView.paymentConfirmed') || 'Pagamento Confirmado'"
            >
              <i class="bi bi-check-circle-fill"></i>
              <span class="paid-text">Pago</span>
            </div>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>
                  {{ $t('dashboard.clientCard.tooltip.copy') || 'Copiar dados do agendamento' }}
                </div>
              </template>
              <button class="btn-copy-mini" @click.stop="copyBooking($event)">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
            </Popper>
          </div>
          <div class="client-meta-inline">
            <span class="client-id-inline">{{
              formatIdNumber(booking?.userIdNumber || booking?.user?.idNumber) || 'N/I'
            }}</span>
            <Popper
              v-if="booking?.termsConditionsAcceptedCode"
              :class="'dark'"
              arrow
              disable-click-away
              hover
            >
              <template #content>
                <div>
                  {{ $t('dashboard.clientCard.tooltip.terms') || 'Termos e condições aceitos' }}
                </div>
              </template>
              <i class="bi bi-person-fill-check icon-mini-separated" @click.stop></i>
            </Popper>
          </div>
        </div>

        <!-- Status Indicators - Inline -->
        <div class="status-inline">
          <div class="status-badge-inline time-badge" @click.stop>
            <i :class="`bi ${clasifyStatus(booking?.status)}`"></i>
            <span v-if="timeSlot">{{ timeSlot }}</span>
          </div>
          <div class="status-badge-inline date-badge" @click.stop>
            <i class="bi bi-calendar-fill"></i>
            <span>{{ getDate(booking?.date) }}</span>
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
          <!-- Contact Information Section - Standardized -->
          <div class="info-section compact-section">
            <div class="info-section-header-compact">
              <i class="bi bi-telephone-fill"></i>
              <span class="info-section-title-compact">{{
                $t('dashboard.clientCard.contactInfo') || $t('dashboard.contactInfo') || 'Contacto'
              }}</span>
            </div>
            <div class="contact-data-grid">
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.whatsapp') || 'WhatsApp' }}</div>
                </template>
                <a
                  class="data-item-compact whatsapp"
                  :href="'https://wa.me/' + (booking.userPhone || booking.user?.phone || '')"
                  target="_blank"
                  @click.stop
                >
                  <span class="data-label">{{
                    $t('dashboard.clientCard.label.whatsapp') || 'WhatsApp'
                  }}</span>
                  <div class="data-value">
                    <i class="bi bi-whatsapp"></i>
                    <span>{{ booking.userPhone || booking.user?.phone || 'N/I' }}</span>
                  </div>
                </a>
              </Popper>
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.email') || 'Email' }}</div>
                </template>
                <a
                  class="data-item-compact email"
                  :href="'mailto:' + (booking.userEmail || booking.user?.email || '')"
                  target="_blank"
                  @click.stop
                >
                  <span class="data-label">{{
                    $t('dashboard.clientCard.label.email') || 'Email'
                  }}</span>
                  <div class="data-value">
                    <i class="bi bi-envelope"></i>
                    <span>{{ booking.userEmail || booking.user?.email || 'N/I' }}</span>
                  </div>
                </a>
              </Popper>
              <Popper :class="'dark'" arrow disable-click-away hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.idNumber') || 'ID' }}</div>
                </template>
                <div class="data-item-compact" @click.stop>
                  <span class="data-label">{{ $t('dashboard.clientCard.label.id') || 'ID' }}</span>
                  <div class="data-value">
                    <i class="bi bi-person-vcard"></i>
                    <span>{{
                      formatIdNumber(booking.userIdNumber || booking.user?.idNumber) || 'N/I'
                    }}</span>
                  </div>
                </div>
              </Popper>
            </div>
          </div>

          <!-- Payment Data Section -->
          <div v-if="booking?.paid" class="info-section">
            <div class="info-section-header">
              <i class="bi bi-check-circle-fill"></i>
              <span class="info-section-title">{{
                $t('collaboratorBookingsView.paymentData') || 'Dados de Pagamento'
              }}</span>
            </div>
            <div class="info-badges">
              <span v-if="booking.paymentType" class="info-badge">
                <span class="badge-label">{{ $t('paymentData.paymentType') }}</span>
                <span class="badge-value">{{ $t(`paymentTypes.${booking.paymentType}`) }}</span>
              </span>
              <span v-if="booking.paymentMethod" class="info-badge">
                <span class="badge-label">{{ $t('paymentData.paymentMethod') }}</span>
                <span class="badge-value">{{
                  $t(`paymentClientMethods.${booking.paymentMethod}`)
                }}</span>
              </span>
              <span
                v-if="
                  booking.paymentMethod &&
                  booking.paymentMethod === 'HEALTH_AGREEMENT' &&
                  booking.healthAgreementId &&
                  booking.healthAgreementName
                "
                class="info-badge"
              >
                <span class="badge-label">{{ $t('commerceQueuesView.healthAgreementText') }}</span>
                <span class="badge-value">{{ booking.healthAgreementName }}</span>
              </span>
              <span v-if="booking.paymentAmount" class="info-badge">
                <i class="bi bi-coin"></i>
                <span class="badge-label">{{ $t('paymentData.paymentAmount') }}</span>
                <span class="badge-value">{{ booking.paymentAmount }}</span>
              </span>
              <span v-if="booking.paymentCommission" class="info-badge">
                <i class="bi bi-coin"></i>
                <span class="badge-label">{{ $t('paymentData.paymentCommission') }}</span>
                <span class="badge-value">{{ booking.paymentCommission }}</span>
              </span>
              <span v-if="booking?.packageId && booking?.packageName" class="info-badge">
                <span class="badge-label">{{ $t('paymentData.package') }}</span>
                <span class="badge-value">{{ booking.packageName }}</span>
                <span class="badge-subvalue"
                  >{{ booking.packageProcedureNumber }} /
                  {{ booking.packageProceduresTotalNumber }}</span
                >
                <i v-if="booking.packagePaid" class="bi bi-check-circle-fill green-icon"></i>
              </span>
            </div>
          </div>

          <!-- Booking Data Section -->
          <div
            v-if="
              booking?.queueName ||
              (booking?.commerceName && booking?.commerceTag) ||
              booking?.servicesDetails ||
              booking?.termsConditionsToAcceptedAt
            "
            class="info-section"
          >
            <div class="info-section-header">
              <i class="bi bi-calendar-fill"></i>
              <span class="info-section-title">{{
                $t('dashboard.attData') || 'Dados do Agendamento'
              }}</span>
            </div>
            <div class="info-badges">
              <span v-if="booking.queueName" class="info-badge">
                <span class="badge-label">{{ $t('dashboard.queueData') }}</span>
                <span class="badge-value">{{ booking.queueName }}</span>
              </span>
              <span v-if="booking.commerceName && booking.commerceTag" class="info-badge">
                <span class="badge-label">{{ $t('dashboard.commerceData') }}</span>
                <span class="badge-value"
                  >{{ booking.commerceName }} - {{ booking.commerceTag }}</span
                >
              </span>
              <span
                v-if="
                  booking?.servicesDetails &&
                  Array.isArray(booking.servicesDetails) &&
                  booking.servicesDetails.length > 0
                "
                class="info-badge services-badge"
              >
                <span class="badge-label">{{ $t('paymentData.service') }}</span>
                <span
                  v-for="serv in booking.servicesDetails"
                  :key="serv?.id || serv?.name || Math.random()"
                  class="service-tag"
                >
                  {{ serv?.name || 'N/I' }}
                </span>
              </span>
              <span v-if="booking?.termsConditionsToAcceptedAt" class="info-badge">
                <i class="bi bi-calendar-fill"></i>
                <span class="badge-label">{{ $t('paymentData.termsAccepted') }}</span>
                <span class="badge-value">{{ getDate(booking?.termsConditionsToAcceptedAt) }}</span>
              </span>
            </div>
          </div>

          <!-- Metadata Section - Compact, Same Line -->
          <div class="info-section metadata-section">
            <div class="metadata-item-compact">
              <span class="metadata-label">ID:</span>
              <span class="metadata-value">{{
                bookingId || booking.bookingId || booking.id || 'N/I'
              }}</span>
              <span class="metadata-separator">•</span>
              <span class="metadata-label"
                >{{ $t('dashboard.clientCard.date') || $t('dashboard.date') || 'Fecha' }}:</span
              >
              <span class="metadata-value">{{ getDate(booking.createdDate || booking.date) }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Booking Details Modal - Matching Attention Details Modal Style -->
    <Teleport to="body">
      <div
        v-if="booking && bookingId"
        class="modal fade"
        :id="`bookingDetailsModal-${bookingId}`"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-1"
        aria-labelledby="bookingDetailsModalLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-dialog-scrollable modal-lg attention-modal-dialog">
          <div class="modal-content attention-modal-content">
            <!-- Modal Header -->
            <div class="modal-header">
              <h5 class="modal-title" id="bookingDetailsModalLabel">
                <i class="bi bi-calendar-fill"></i>
                {{ $t('dashboard.bookingDetails') || 'Detalles de la Reserva' }}
              </h5>
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>

            <!-- Modal Body -->
            <div class="modal-body">
              <Spinner :show="loading"></Spinner>

              <!-- Client Info Section - Matching Attention Style -->
              <div class="attention-client-info">
                <div class="attention-client-header">
                  <div class="attention-client-name-section">
                    <div class="attention-client-avatar">
                      <i class="bi bi-person-circle"></i>
                    </div>
                    <div class="attention-client-details">
                      <span class="attention-client-name">{{ bookingFullName }}</span>
                      <button
                        class="btn-copy-mini"
                        @click="copyBooking($event)"
                        title="Copiar datos"
                      >
                        <i class="bi bi-file-earmark-spreadsheet"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div class="attention-client-contact">
                  <a
                    class="attention-contact-item whatsapp-item"
                    :href="'https://wa.me/' + (booking.userPhone || booking.user?.phone || '')"
                    target="_blank"
                  >
                    <div class="contact-icon-wrapper whatsapp-bg">
                      <i class="bi bi-whatsapp"></i>
                    </div>
                    <span class="contact-text">{{
                      booking?.userPhone || booking?.user?.phone || 'N/I'
                    }}</span>
                  </a>
                  <a
                    class="attention-contact-item email-item"
                    :href="'mailto:' + (booking?.userEmail || booking?.user?.email || '')"
                    target="_blank"
                  >
                    <div class="contact-icon-wrapper email-bg">
                      <i class="bi bi-envelope"></i>
                    </div>
                    <span class="contact-text">{{
                      booking?.userEmail || booking?.user?.email || 'N/I'
                    }}</span>
                  </a>
                  <div class="attention-contact-item id-item">
                    <div class="contact-icon-wrapper id-bg">
                      <i class="bi bi-person-vcard"></i>
                    </div>
                    <span class="contact-text">{{
                      formatIdNumber(booking?.userIdNumber || booking?.user?.idNumber) || 'N/I'
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- Booking Context Info -->
              <div
                v-if="
                  booking?.queueName ||
                  booking?.commerceName ||
                  (booking?.servicesDetails &&
                    Array.isArray(booking.servicesDetails) &&
                    booking.servicesDetails.length > 0) ||
                  booking?.date ||
                  booking?.createdDate ||
                  timeSlot
                "
                class="attention-context-info-compact"
              >
                <div v-if="booking?.queueName" class="attention-context-item-inline">
                  <i class="bi bi-person-lines-fill"></i>
                  <span class="attention-context-label-inline">Fila</span>
                  <span class="attention-context-value-inline">{{
                    booking?.queueName || 'N/I'
                  }}</span>
                </div>
                <div v-if="booking?.commerceName" class="attention-context-item-inline">
                  <i class="bi bi-building"></i>
                  <span class="attention-context-label-inline">Comercio</span>
                  <span class="attention-context-value-inline">{{
                    booking?.commerceName || 'N/I'
                  }}</span>
                </div>
                <div
                  v-if="booking?.date || booking?.createdDate"
                  class="attention-context-item-inline"
                >
                  <i class="bi bi-calendar-event"></i>
                  <span class="attention-context-label-inline">Fecha</span>
                  <span class="attention-context-value-inline">{{
                    getDate(booking?.date || booking?.createdDate)
                  }}</span>
                </div>
                <div v-if="timeSlot" class="attention-context-item-inline">
                  <i class="bi bi-clock-fill"></i>
                  <span class="attention-context-label-inline">Hora</span>
                  <span class="attention-context-value-inline">{{ timeSlot }}</span>
                </div>
                <div
                  v-if="
                    booking?.servicesDetails &&
                    Array.isArray(booking.servicesDetails) &&
                    booking.servicesDetails.length > 0
                  "
                  class="attention-context-item-inline"
                >
                  <i class="bi bi-scissors"></i>
                  <span class="attention-context-label-inline">Servicio(s)</span>
                  <span class="attention-context-value-inline">
                    {{
                      booking.servicesDetails
                        .map(s => s?.name || 'N/I')
                        .filter(Boolean)
                        .join(', ') || 'N/I'
                    }}
                  </span>
                </div>
                <div v-if="booking?.status" class="attention-context-item-inline">
                  <i :class="`bi ${clasifyStatus(booking?.status)}`"></i>
                  <span class="attention-context-label-inline">Estado</span>
                  <span class="attention-context-value-inline">{{ booking?.status || 'N/I' }}</span>
                </div>
              </div>

              <div class="attention-divider"></div>

              <!-- Payment Data Section -->
              <div
                v-if="booking?.paid !== undefined && booking?.paid === true"
                class="attention-confirmation-badges"
              >
                <div class="attention-confirmation-header">
                  <i class="bi bi-check-circle-fill"></i>
                  <span>{{
                    $t('collaboratorBookingsView.paymentData') || 'Dados de Pagamento'
                  }}</span>
                </div>
                <div class="attention-confirmation-tags">
                  <span v-if="booking?.paymentType" class="badge-mini confirmation-tag">
                    {{ $t(`paymentTypes.${booking.paymentType}`) }}
                  </span>
                  <span v-if="booking?.paymentMethod" class="badge-mini confirmation-tag">
                    {{ $t(`paymentClientMethods.${booking.paymentMethod}`) }}
                  </span>
                  <span
                    v-if="
                      booking?.paymentMethod &&
                      booking.paymentMethod === 'HEALTH_AGREEMENT' &&
                      booking?.healthAgreementId &&
                      booking?.healthAgreementName
                    "
                    class="badge-mini confirmation-tag"
                  >
                    {{ booking?.healthAgreementName }}
                  </span>
                  <span
                    v-if="booking?.paymentAmount"
                    class="badge-mini confirmation-tag payment-amount"
                  >
                    <i class="bi bi-coin"></i>
                    {{ booking?.paymentAmount }}
                  </span>
                  <span
                    v-if="booking?.paymentCommission"
                    class="badge-mini confirmation-tag payment-commission"
                  >
                    <i class="bi bi-coin"></i>
                    {{ booking?.paymentCommission }}
                  </span>
                  <span
                    v-if="booking?.packageId && booking?.packageName"
                    class="badge-mini confirmation-tag"
                  >
                    {{ booking?.packageName }}
                    <span class="badge-subvalue"
                      >{{ booking?.packageProcedureNumber }} /
                      {{ booking?.packageProceduresTotalNumber }}</span
                    >
                    <i v-if="booking?.packagePaid" class="bi bi-check-circle-fill green-icon"></i>
                  </span>
                </div>
              </div>

              <!-- Metadata Footer -->
              <div class="attention-metadata-footer">
                <span class="metric-card-details"
                  ><strong>Id:</strong>
                  {{ bookingId || booking.bookingId || booking.id || 'N/I' }}</span
                >
                <span class="metric-card-details"
                  ><strong>Date:</strong> {{ getDate(booking?.createdDate || booking?.date) }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Ultra Compact Booking Row */
.client-row-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem 0.625rem;
  margin: 0.25rem 0.375rem;
  margin-bottom: .5rem;
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

.client-row-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

/* Card Type Variations - Ultra Compact */
.client-row-card.client-card-success {
  border-left: 2px solid #00c2cb;
}

.client-row-card.client-card-success:hover {
  background: rgba(0, 194, 203, 0.03);
}

.client-row-card.client-card-warning {
  border-left: 2px solid #f9c322;
}

.client-row-card.client-card-warning:hover {
  background: rgba(249, 195, 34, 0.03);
}

.client-row-card.client-card-error {
  border-left: 2px solid #a52a2a;
}

.client-row-card.client-card-error:hover {
  background: rgba(165, 42, 42, 0.03);
}

/* Client Row Content - Ultra Compact Horizontal Layout */
.client-row-content {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.client-icon-mini {
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

.client-icon-mini i {
  font-size: 0.9375rem;
}

.client-row-card:hover .client-icon-mini {
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

.service-badges-inline {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.service-tag-mini {
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

.service-tag-mini i {
  font-size: 0.625rem;
}

.client-info-inline {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.client-name-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.client-name-text {
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

.client-meta-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.client-id-inline {
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

.client-row-card:hover .collapse-icon {
  color: rgba(0, 0, 0, 0.7);
}

.client-row-card[class*='extended'] .collapse-icon,
.client-row-card:hover .collapse-icon {
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

.time-badge,
.date-badge {
  cursor: default;
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

/* Standardized Data Items - Compact */
.contact-data-grid {
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

.data-item-compact.whatsapp:hover {
  border-color: rgba(37, 211, 102, 0.3);
}

.data-item-compact.whatsapp:hover .data-value {
  color: #25d366;
}

.data-item-compact.whatsapp:hover .data-value i {
  color: #25d366;
}

.data-item-compact.email:hover {
  border-color: rgba(0, 74, 173, 0.3);
}

.data-item-compact.email:hover .data-value {
  color: #004aad;
}

.data-item-compact.email:hover .data-value i {
  color: #004aad;
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

.badge-subvalue {
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.6);
  background: rgba(169, 169, 169, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  margin-left: 0.25rem;
}

.services-badge {
  align-items: flex-start;
  gap: 0.5rem;
}

.service-tag {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.25rem;
  margin-top: 0.25rem;
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
  .client-row-card {
    padding: 0.4375rem 0.5rem;
  }

  .client-icon-mini {
    width: 24px;
    height: 24px;
  }

  .client-icon-mini i {
    font-size: 0.8125rem;
  }

  .client-name-text {
    font-size: 0.75rem;
  }

  .status-inline {
    flex-wrap: wrap;
    gap: 0.375rem;
  }
}

@media (max-width: 576px) {
  .client-row-card {
    padding: 0.375rem 0.4375rem;
    margin: 0.1875rem 0.25rem;
    margin-bottom: 0;
  }

  .client-name-text {
    font-size: 0.6875rem;
  }

  .info-badges {
    flex-direction: column;
  }

  .info-badge {
    width: 100%;
  }

  .client-row-content {
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
.client-row-card {
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
.contact-data-grid {
  position: relative;
  overflow: visible;
}

/* Modal Dialog - Matching Attention Style */
.attention-modal-dialog {
  max-width: 1200px !important;
  width: 95vw !important;
}

.attention-modal-content {
  border-radius: 0.5rem !important;
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175) !important;
}

/* Modal Header - Matching Attention Style */
.modal-header {
  background-color: var(--azul-turno, #004aad);
  color: white !important;
  border-bottom: none !important;
  padding: 1rem 1.25rem !important;
  border-radius: 0.5rem 0.5rem 0 0 !important;
}

.modal-title {
  color: white !important;
  font-weight: 700 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
}

.modal-title i {
  color: white !important;
  font-size: 1.125rem !important;
}

.btn-close {
  filter: invert(1) grayscale(100%) brightness(200%) !important;
  opacity: 0.9 !important;
}

.btn-close:hover {
  opacity: 1 !important;
}

/* Modal Body */
.modal-body {
  background: #f8f9fa !important;
  padding: 1.25rem !important;
}

/* Client Info Section - Matching Attention Style */
.attention-client-info {
  margin-bottom: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.attention-client-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.2);
}

.attention-client-name-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.attention-client-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(0, 194, 203, 0.12);
  border-radius: 6px;
  flex-shrink: 0;
}

.attention-client-avatar i {
  font-size: 1.125rem;
  color: #00c2cb;
}

.attention-client-details {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 1;
  min-width: 0;
}

.attention-client-name {
  font-size: 0.875rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.3;
  letter-spacing: -0.01em;
  flex: 1;
  min-width: 0;
}

.attention-client-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.25rem;
}

.attention-contact-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  text-decoration: none;
  color: rgba(0, 0, 0, 0.7);
  transition: all 0.2s ease;
  cursor: pointer;
}

.attention-contact-item:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(0, 194, 203, 0.3);
  text-decoration: none;
  color: rgba(0, 0, 0, 0.85);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 194, 203, 0.1);
}

.contact-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
}

.whatsapp-bg {
  background: rgba(37, 211, 102, 0.12);
  color: #25d366;
}

.email-bg {
  background: rgba(0, 122, 255, 0.12);
  color: #007aff;
}

.id-bg {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.contact-icon-wrapper i {
  font-size: 0.7rem;
}

.contact-text {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.whatsapp-item:hover .whatsapp-bg {
  background: rgba(37, 211, 102, 0.25);
}

.email-item:hover .email-bg {
  background: rgba(0, 122, 255, 0.25);
}

.id-item:hover .id-bg {
  background: rgba(0, 194, 203, 0.2);
}

.attention-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(169, 169, 169, 0.2), transparent);
  margin: 0.5rem 0;
}

/* Context Info - Matching Attention Style */
.attention-context-info-compact {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.attention-context-item-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

.attention-context-item-inline i {
  color: #00c2cb;
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.attention-context-label-inline {
  font-size: 0.625rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.attention-context-value-inline {
  font-size: 0.75rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

/* Confirmation Badges - Matching Attention Style */
.attention-confirmation-badges {
  margin-bottom: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.attention-confirmation-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.2);
  font-size: 0.75rem;
  font-weight: 700;
  color: #000000;
  letter-spacing: -0.01em;
}

.attention-confirmation-header i {
  color: #00c2cb;
  font-size: 1rem;
}

.attention-confirmation-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.confirmation-tag {
  background: rgba(169, 169, 169, 0.15);
  color: rgba(0, 0, 0, 0.7);
  padding: 0.375rem 0.625rem;
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  border: 1px solid rgba(169, 169, 169, 0.2);
}

.confirmation-tag.payment-amount {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
  border-color: rgba(0, 194, 203, 0.25);
}

.confirmation-tag.payment-commission {
  background: rgba(249, 195, 34, 0.12);
  color: #f9c322;
  border-color: rgba(249, 195, 34, 0.25);
}

.badge-mini {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 600;
  border-radius: 0.35rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%);
  color: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.badge-subvalue {
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.6);
  background: rgba(169, 169, 169, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  margin-left: 0.25rem;
}

/* Metadata Footer */
.attention-metadata-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(169, 169, 169, 0.2);
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.5);
}

.metric-card-details {
  font-size: 0.6875rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.5);
}

.metric-card-details strong {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

/* Paid Badge - Matching Attention Style */
.attention-paid-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.2;
  margin-left: 0.375rem;
  white-space: nowrap;
}

.attention-paid-badge i {
  color: #059669;
  font-size: 0.75rem;
}

.attention-paid-badge .paid-text {
  color: #059669;
  font-weight: 600;
}

/* Status Badge Wrapper */
.status-badge-wrapper {
  margin-left: auto;
  margin-right: 0.5rem;
}

/* Status Badge Classes */
.status-badge {
  white-space: nowrap;
}

.status-badge.badge-warning {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.15) 100%);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.status-badge.badge-warning i {
  color: #d97706;
}

.status-badge.badge-info {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(29, 78, 216, 0.15) 100%);
  color: #1d4ed8;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.status-badge.badge-info i {
  color: #1d4ed8;
}

.status-badge.badge-success {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.status-badge.badge-success i {
  color: #059669;
}

.status-badge.badge-danger {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.status-badge.badge-danger i {
  color: #dc2626;
}

.status-badge.badge-secondary {
  background: rgba(169, 169, 169, 0.15);
  color: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(169, 169, 169, 0.25);
}

.status-badge.badge-secondary i {
  color: rgba(0, 0, 0, 0.7);
}
</style>
