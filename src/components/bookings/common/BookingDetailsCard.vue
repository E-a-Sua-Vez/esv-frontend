<script>
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import { cancelBooking, confirmBooking } from '../../../application/services/booking';
import { getActiveFeature } from '../../../shared/features';
import { getPaymentMethods, getPaymentTypes } from '../../../shared/utils/data';
import {
  getPendingCommerceBookingsByDate,
  transferBooking,
  editBooking,
} from '../../../application/services/booking';
import { getQueueById } from '../../../application/services/queue';
import { getDate } from '../../../shared/utils/date';
import { formatIdNumber } from '../../../shared/utils/idNumber';
import Warning from '../../common/Warning.vue';
import AreYouSure from '../../common/AreYouSure.vue';
import PaymentForm from '../../payments/PaymentForm.vue';
import Message from '../../common/Message.vue';
import BookingDatePicker from './BookingDatePicker.vue';

export default {
  name: 'BookingDetailsCard',
  components: { Popper, Spinner, Warning, AreYouSure, PaymentForm, Message, BookingDatePicker },
  props: {
    show: { type: Boolean, default: true },
    booking: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    queues: { type: Array, default: undefined },
    disabledDates: { type: Object, default: undefined },
    groupedQueues: { type: Object, default: undefined },
    calendarAttributes: { type: Object, default: undefined },
    drawerMode: { type: Boolean, default: false },
    selectedQueue: { type: Object, default: undefined },
    selectedDate: { type: String, default: undefined },
  },
  emits: ['getAvailableDatesByCalendarMonth', 'open-drawer'],
  data() {
    return {
      loading: false,
      extendedEntity: false,
      extendedPaymentEntity: false,
      extendedTransferEntity: false,
      extendedEditEntity: false,
      newConfirmationData: {},
      paymentTypes: [],
      paymentMethods: [],
      paymentAmountError: false,
      paymentTypeError: false,
      paymentMethodError: false,
      errorsAdd: [],
      goToTransfer: false,
      goToEdit: false,
      goToCancel: false,
      goToConfirm1: false,
      goToConfirm2: false,
      checked: false,
      queue: {},
      queuesToTransfer: [],
      queueToTransfer: {},
      dateMask: { modelValue: 'YYYY-MM-DD' },
      locale: 'es',
      internalSelectedDate: new Date().setDate(new Date().getDate() + 1),
      minDate: new Date().setDate(new Date().getDate()),
      maxDate: new Date().setDate(new Date().getDate() + 90),
      amountofBlocksNeeded: 1,
      availableBookingSuperBlocks: [],
      showBookingDataPicker: false,
      dateToEdit: undefined,
      blockToEdit: undefined,
    };
  },
  beforeMount() {
    this.paymentTypes = getPaymentTypes();
    this.paymentMethods = getPaymentMethods();
    this.locale = this.commerce.localeInfo.language;
  },
  methods: {
    showDetails() {
      if (this.drawerMode) {
        this.$emit('open-drawer', this.booking);
      } else {
        this.extendedEntity = !this.extendedEntity;
      }
    },
    showPaymentDetails() {
      this.extendedPaymentEntity = !this.extendedPaymentEntity;
      this.extendedEditEntity = false;
      this.extendedTransferEntity = false;
      this.newConfirmationData = {
        processPaymentNow: false,
      };
    },
    async showEditDetails() {
      this.extendedEditEntity = !this.extendedEditEntity;
      this.extendedPaymentEntity = false;
      this.extendedTransferEntity = false;
      if (this.extendedEditEntity === true) {
        await this.toEdit();
      }
    },
    async showTransferDetails() {
      this.extendedTransferEntity = !this.extendedTransferEntity;
      this.extendedEditEntity = false;
      this.extendedPaymentEntity = false;
      if (this.extendedTransferEntity === true) {
        await this.toTransfer();
      }
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyBooking() {
      const textToCopy = jsonToCsv([this.booking]);
      navigator.clipboard.writeText(textToCopy);
    },
    async cancel() {
      try {
        this.loading = true;
        if (this.booking && this.booking.id) {
          await cancelBooking(this.booking.id);
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    },
    validateConfirm(data) {
      this.errorsAdd = [];
      if (
        data.processPaymentNow === true &&
        getActiveFeature(this.commerce, 'booking-confirm-payment', 'PRODUCT')
      ) {
        if (!data.paymentType || data.paymentType.length === 0) {
          this.paymentTypeError = true;
          this.errorsAdd.push('collaboratorBookingsView.validate.paymentType');
        } else {
          this.paymentTypeError = false;
        }
        if (!data.paymentMethod || data.paymentMethod.length === 0) {
          this.paymentMethodError = true;
          this.errorsAdd.push('collaboratorBookingsView.validate.paymentMethod');
        } else {
          this.paymentMethodError = false;
        }
        if (
          data.paymentAmount === undefined ||
          data.paymentAmount.length === 0 ||
          data.paymentAmount < 0
        ) {
          this.paymentAmountError = true;
          this.errorsAdd.push('collaboratorBookingsView.validate.paymentAmount');
        } else {
          this.paymentAmountError = false;
        }
      }
      if (this.errorsAdd.length === 0) {
        return true;
      }
      return false;
    },
    async confirm() {
      try {
        this.loading = true;
        if (this.booking && this.booking.id) {
          if (this.validateConfirm(this.newConfirmationData)) {
            const body = {
              confirmationData: {
                paid: true,
                paymentDate: new Date(),
                ...this.newConfirmationData,
              },
            };
            await confirmBooking(this.booking.id, body);
          }
        }
        this.loading = false;
        this.goToConfirm1 = false;
        this.goToConfirm2 = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    },
    async toTransfer() {
      this.loading = true;
      if (this.booking && this.booking.queueId) {
        this.queue = await getQueueById(this.booking.queueId);
      }
      const queuesToTransfer = this.queues; //this.queues.filter(queue => queue.type === 'COLLABORATOR');
      if (queuesToTransfer && queuesToTransfer.length > 0) {
        const date = this.booking.date;
        const bookings = await getPendingCommerceBookingsByDate(this.commerce.id, date);
        if (bookings && bookings.length > 0) {
          const groupedBookings = bookings.reduce((acc, book) => {
            const type = book.queueId;
            if (!acc[type]) {
              acc[type] = [];
            }
            acc[type].push(book);
            return acc;
          }, {});
          let limit = 1; //queuesToTransfer.length;
          if (
            this.queue.serviceInfo !== undefined &&
            this.queue.serviceInfo.blockLimit !== undefined &&
            this.queue.serviceInfo.blockLimit > 0
          ) {
            limit = this.queue.serviceInfo.blockLimit;
          }
          queuesToTransfer.forEach(queue => {
            const bookingsByQueue = groupedBookings[queue.id];
            if (bookingsByQueue && bookingsByQueue.length > 0) {
              const bookingsReserved = bookingsByQueue.map(booking => {
                if (
                  booking.block &&
                  booking.block.blockNumbers &&
                  booking.block.blockNumbers.length > 0
                ) {
                  return [...booking.block.blockNumbers];
                } else {
                  return booking.block.number;
                }
              });
              const totalBlocksReserved = bookingsReserved.flat(Infinity).sort();
              const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
              const blockedBlocks = [];
              uniqueBlocksReserved.forEach(block => {
                const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                if (times >= limit - 1) {
                  blockedBlocks.push(block);
                }
              });
              const blocksToCheck = this.booking.block.blockNumbers || [this.booking.block.number];
              const availableBlocks = blocksToCheck
                .flat()
                .filter(block => blockedBlocks.includes(block));
              if (availableBlocks.length === 0) {
                this.queuesToTransfer.push(queue);
              }
            } else {
              this.queuesToTransfer.push(queue);
            }
          });
        }
      }
      this.loading = false;
    },
    async transfer() {
      try {
        this.loading = true;
        if (this.booking && this.booking.id) {
          const body = {
            queueId: this.queueToTransfer,
          };
          await transferBooking(this.booking.id, body);
        }
        this.loading = false;
        this.goToTransfer = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    },
    goTransfer() {
      this.goToTransfer = !this.goToTransfer;
    },
    cancelTransfer() {
      this.goToTransfer = false;
    },
    async toEdit() {
      if (this.booking && this.booking.queueId) {
        this.queue = await getQueueById(this.booking.queueId);
      }
      if (this.booking.block) {
        this.showBookingDataPicker = true;
        if (this.booking.block.blockNumbers && this.booking.block.blockNumbers.length > 0) {
          this.amountofBlocksNeeded = this.booking.block.blockNumbers.length;
        }
      }
    },
    async edit() {
      try {
        this.loading = true;
        if (this.booking && this.booking.id) {
          const body = {
            date: this.dateToEdit,
            block: this.blockToEdit,
          };
          await editBooking(this.booking.id, body);
        }
        this.loading = false;
        this.goToEdit = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    },
    async getAvailableDatesByMonth(pages) {
      await this.$emit('getAvailableDatesByCalendarMonth', pages);
    },
    goEdit() {
      this.goToEdit = !this.goToEdit;
    },
    getQueueName(id) {
      if (id && this.queues && this.queues.length > 0) {
        const queuesFiltered = this.queues.filter(queue => queue.id === id);
        if (queuesFiltered && queuesFiltered.length > 0) {
          if (queuesFiltered[0] && queuesFiltered[0].id && queuesFiltered[0].name) {
            return queuesFiltered[0].name;
          }
        }
      }
    },
    cancelEdit() {
      this.goToEdit = false;
    },
    getActiveFeature(commerce, name, type) {
      return getActiveFeature(commerce, name, type);
    },
    goCancel() {
      this.goToCancel = !this.goToCancel;
    },
    cancelCancel() {
      this.goToCancel = false;
    },
    goConfirm1() {
      this.goToConfirm1 = !this.goToConfirm1;
    },
    confirmCancel1() {
      this.goToConfirm1 = false;
    },
    goConfirm2() {
      this.goToConfirm2 = !this.goToConfirm2;
    },
    confirmCancel2() {
      this.goToConfirm2 = false;
    },
    receiveData(data) {
      if (data) {
        if (data.procedureNumber !== undefined && data.procedureNumber >= 0) {
          this.newConfirmationData.procedureNumber = data.procedureNumber;
        }
        if (data.proceduresTotalNumber !== undefined && data.proceduresTotalNumber >= 0) {
          this.newConfirmationData.proceduresTotalNumber = data.proceduresTotalNumber;
        }
        if (data.paymentFiscalNote) {
          this.newConfirmationData.paymentFiscalNote = data.paymentFiscalNote;
        }
        if (data.paymentType) {
          this.newConfirmationData.paymentType = data.paymentType;
        }
        if (data.paymentMethod) {
          this.newConfirmationData.paymentMethod = data.paymentMethod;
        }
        if (data.paymentAmount !== undefined && data.paymentAmount >= 0) {
          this.newConfirmationData.paymentAmount = data.paymentAmount;
        }
        if (data.totalAmount !== undefined && data.totalAmount >= 0) {
          this.newConfirmationData.totalAmount = data.totalAmount;
        }
        if (data.installments !== undefined && data.installments >= 0) {
          this.newConfirmationData.installments = data.installments;
        }
        if (data.paymentCommission !== undefined && data.paymentCommission >= 0) {
          this.newConfirmationData.paymentCommission = data.paymentCommission;
        }
        if (data.paymentComment) {
          this.newConfirmationData.paymentComment = data.paymentComment;
        }
        if (data.packageId) {
          this.newConfirmationData.packageId = data.packageId;
        }
        if (data.pendingPaymentId) {
          this.newConfirmationData.pendingPaymentId = data.pendingPaymentId;
        }
        if (data.processPaymentNow !== undefined) {
          this.newConfirmationData.processPaymentNow = data.processPaymentNow;
        }
        if (data.packagePaid !== undefined) {
          this.newConfirmationData.packagePaid = data.packagePaid;
        }
        if (data.packagePaid !== undefined) {
          this.newConfirmationData.confirmInstallments = data.confirmInstallments;
        }
        if (data.processPaymentNow === false) {
          this.errorsAdd = [];
        }
      }
    },
    receiveBookingEdit(data) {
      if (data) {
        if (data.date) {
          this.dateToEdit = data.date;
        }
        if (data.block) {
          this.blockToEdit = data.block;
        }
      }
    },
    formatIdNumber(commerce, idNumber) {
      return formatIdNumber(commerce, idNumber);
    },
    getStatusIcon() {
      if (this.booking.status === 'PENDING') return 'bi bi-clock-fill';
      if (this.booking.status === 'CONFIRMED') return 'bi bi-check-circle-fill';
      if (this.booking.status === 'CANCELLED') return 'bi bi-x-circle-fill';
      return 'bi bi-calendar-check-fill';
    },
    getStatusIconClass() {
      if (this.booking.status === 'CONFIRMED') return 'icon-success';
      if (this.booking.status === 'PENDING') return 'icon-warning';
      if (this.booking.status === 'CANCELLED') return 'icon-error';
      return 'icon-info';
    },
    getStatusTooltip() {
      if (this.booking.status === 'PENDING') return 'Reserva pendente';
      if (this.booking.status === 'CONFIRMED') return 'Reserva confirmada';
      if (this.booking.status === 'CANCELLED') return 'Reserva cancelada';
      return 'Estado da reserva';
    },
    getCardTypeClass() {
      if (this.booking.status === 'CONFIRMED') return 'booking-card-success';
      if (this.booking.status === 'PENDING') return 'booking-card-warning';
      if (this.booking.status === 'CANCELLED') return 'booking-card-error';
      return 'booking-card-info';
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
  <div v-if="show && booking">
    <div class="booking-row-card" :class="getCardTypeClass()" @click.prevent="showDetails()">
      <div class="booking-row-content">
        <!-- Status Icon -->
        <Popper :class="'dark'" arrow disable-click-away hover>
          <template #content>
            <div>{{ getStatusTooltip() }}</div>
          </template>
          <div class="booking-icon-mini" :class="getStatusIconClass()" @click.stop>
            <i :class="getStatusIcon()"></i>
          </div>
        </Popper>

        <!-- Service Badges -->
        <div v-if="booking.servicesDetails || booking.packageId" class="service-badges-inline">
          <span
            v-for="serv in booking.servicesDetails"
            :key="serv.id"
            class="badge-mini service-tag-mini"
          >
            {{ serv.name }}
          </span>
          <span v-if="booking.packageId" class="badge-mini service-tag-mini bg-secondary">
            <i class="bi bi-box-fill"></i> {{ booking.packageProcedureNumber }}
          </span>
        </div>

        <!-- Client Info - Horizontal -->
        <div class="booking-info-inline">
          <div class="booking-name-inline">
            <span class="booking-name-text">{{
              booking.user?.name?.split(' ')[0].toUpperCase() || 'N/I'
            }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>Copiar dados da reserva</div>
              </template>
              <button class="btn-copy-mini" @click.stop="copyBooking()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
            </Popper>
          </div>
          <div class="booking-meta-inline">
            <span class="booking-time-inline" v-if="booking.block && booking.block.hourFrom">
              {{ booking.block.hourFrom }} - {{ booking.block.hourTo }}
            </span>
            <Popper
              v-if="booking.termsConditionsAcceptedCode"
              :class="'dark'"
              arrow
              disable-click-away
              hover
            >
              <template #content>
                <div>Termos e condições aceitos</div>
              </template>
              <i class="bi bi-person-fill-check icon-mini-separated" @click.stop></i>
            </Popper>
            <i
              v-if="booking.confirmationData?.paid"
              class="bi bi-coin icon-mini-separated blue-icon"
              @click.stop
            ></i>
            <i
              v-if="booking.transfered"
              class="bi bi-arrow-left-right icon-mini-separated blue-icon"
              @click.stop
            ></i>
            <i v-if="booking.edited" class="bi bi-pencil-fill icon-mini-separated" @click.stop></i>
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
    <div v-if="extendedEntity" class="booking-details-expanded">
      <div :class="{ show: extendedEntity }" class="detailed-data transition-slow">
        <!-- Client Info - Modernized -->
        <div class="booking-client-info">
          <div class="booking-client-header">
            <div class="booking-client-name-section">
              <div class="booking-client-avatar">
                <i class="bi bi-person-circle"></i>
              </div>
              <div class="booking-client-details">
                <span class="booking-client-name"
                  >{{ booking.user.name || 'N/I' }} {{ booking.user.lastName || '' }}</span
                >
                <button class="btn-copy-mini" @click="copyBooking()" title="Copiar dados">
                  <i class="bi bi-file-earmark-spreadsheet"></i>
                </button>
              </div>
            </div>
            <Spinner :show="loading"></Spinner>
          </div>
          <div class="booking-client-contact">
            <a
              class="booking-contact-item whatsapp-item"
              :href="'https://wa.me/' + booking.user.phone"
              target="_blank"
            >
              <div class="contact-icon-wrapper whatsapp-bg">
                <i class="bi bi-whatsapp"></i>
              </div>
              <span class="contact-text">{{ booking.user.phone || 'N/I' }}</span>
            </a>
            <a
              class="booking-contact-item email-item"
              :href="'mailto:' + booking.user.email"
              target="_blank"
            >
              <div class="contact-icon-wrapper email-bg">
                <i class="bi bi-envelope"></i>
              </div>
              <span class="contact-text">{{ booking.user.email || 'N/I' }}</span>
            </a>
            <div class="booking-contact-item id-item">
              <div class="contact-icon-wrapper id-bg">
                <i class="bi bi-person-vcard"></i>
              </div>
              <span class="contact-text">{{
                formatIdNumber(commerce, booking.user.idNumber) || 'N/I'
              }}</span>
            </div>
          </div>
        </div>
        <!-- Booking Context Info - Reservation Details (Compact Horizontal) -->
        <div
          v-if="
            selectedQueue ||
            booking.block ||
            (booking.services && booking.services.length > 0) ||
            booking.date
          "
          class="booking-context-info-compact"
        >
          <div v-if="selectedQueue" class="booking-context-item-inline">
            <i class="bi bi-person-lines-fill"></i>
            <span class="booking-context-label-inline">Fila</span>
            <span class="booking-context-value-inline">{{ selectedQueue.name || 'N/I' }}</span>
          </div>
          <div v-if="booking.block" class="booking-context-item-inline">
            <i class="bi bi-clock-fill"></i>
            <span class="booking-context-label-inline">Horário</span>
            <span class="booking-context-value-inline">
              {{ booking.block.hourFrom || 'N/I' }}
              <span v-if="booking.block.hourTo"> - {{ booking.block.hourTo }}</span>
            </span>
          </div>
          <div v-if="booking.date" class="booking-context-item-inline">
            <i class="bi bi-calendar-event"></i>
            <span class="booking-context-label-inline">Data</span>
            <span class="booking-context-value-inline">{{ getDate(booking.date) }}</span>
          </div>
          <div
            v-if="booking.services && booking.services.length > 0"
            class="booking-context-item-inline"
          >
            <i class="bi bi-scissors"></i>
            <span class="booking-context-label-inline">Serviço(s)</span>
            <span class="booking-context-value-inline">
              {{ booking.services.map(s => s.name).join(', ') }}
            </span>
          </div>
        </div>
        <div class="booking-divider"></div>
        <!-- CONFIRMATION DETAILS -->
        <div
          class="booking-confirmation-badges"
          v-if="booking.confirmed === true && booking.confirmationData"
        >
          <div class="booking-confirmation-header">
            <i class="bi bi-check-circle-fill"></i>
            <span>{{ $t('collaboratorBookingsView.confirmData') }}</span>
          </div>
          <div class="booking-confirmation-tags" v-if="booking.confirmationData">
            <span
              v-if="
                booking.confirmationData.proceduresTotalNumber &&
                booking.confirmationData.procedureNumber
              "
              class="badge-mini confirmation-tag"
            >
              {{ booking.confirmationData.procedureNumber }}
              {{ $t('collaboratorBookingsView.procedureNumber') }}
              {{ booking.confirmationData.proceduresTotalNumber }}
            </span>
            <span
              v-if="booking.confirmationData.paymentFiscalNote"
              class="badge-mini confirmation-tag"
            >
              {{ $t(`paymentFiscalNotes.${booking.confirmationData.paymentFiscalNote}`) }}
            </span>
            <span v-if="booking.confirmationData.paymentType" class="badge-mini confirmation-tag">
              {{ $t(`paymentTypes.${booking.confirmationData.paymentType}`) }}
            </span>
            <span v-if="booking.confirmationData.paymentMethod" class="badge-mini confirmation-tag">
              {{ $t(`paymentClientMethods.${booking.confirmationData.paymentMethod}`) }}
            </span>
            <span
              v-if="booking.confirmationData.paymentAmount"
              class="badge-mini confirmation-tag payment-amount"
            >
              <i class="bi bi-coin"></i>
              {{ booking.confirmationData.paymentAmount }}
            </span>
            <span
              v-if="booking.confirmationData.paymentCommission"
              class="badge-mini confirmation-tag payment-commission"
            >
              <i class="bi bi-coin"></i>
              {{ booking.confirmationData.paymentCommission }}
            </span>
            <span v-if="booking.confirmationData.paymentDate" class="badge-mini confirmation-tag">
              {{ getDate(booking.confirmationData.paymentDate) }}
            </span>
          </div>
        </div>
        <div
          v-if="booking.confirmed === true && booking.confirmationData"
          class="booking-divider"
        ></div>

        <!-- Action Buttons -->
        <div class="booking-actions-tabs">
          <button
            v-if="getActiveFeature(commerce, 'booking-confirm', 'PRODUCT')"
            class="booking-action-tab"
            :class="{ 'booking-action-tab-active': extendedPaymentEntity }"
            @click.prevent="showPaymentDetails()"
          >
            <i class="bi bi-cash-coin"></i>
            <span>{{ $t('collaboratorBookingsView.paymentConfirm') }}</span>
            <i :class="`bi ${extendedPaymentEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
          </button>
          <button
            v-if="getActiveFeature(commerce, 'booking-transfer-queue', 'PRODUCT')"
            class="booking-action-tab"
            :class="{ 'booking-action-tab-active': extendedTransferEntity }"
            @click.prevent="showTransferDetails()"
          >
            <i class="bi bi-arrow-left-right"></i>
            <span>{{ $t('collaboratorBookingsView.transferQueue') }}</span>
            <i :class="`bi ${extendedTransferEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
          </button>
          <button
            v-if="getActiveFeature(commerce, 'booking-edit', 'PRODUCT')"
            class="booking-action-tab"
            :class="{ 'booking-action-tab-active': extendedEditEntity }"
            @click.prevent="showEditDetails()"
          >
            <i class="bi bi-pencil-fill"></i>
            <span>{{ $t('collaboratorBookingsView.edit') }}</span>
            <i :class="`bi ${extendedEditEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
          </button>
        </div>
        <!-- PAYMENT -->
        <Transition name="slide-fade">
          <div
            v-if="extendedPaymentEntity && getActiveFeature(commerce, 'booking-confirm', 'PRODUCT')"
            class="booking-action-section"
          >
            <div class="booking-action-content">
              <div v-if="!booking.confirmed" class="booking-action-form">
                <div class="booking-action-header">
                  <i class="bi bi-cash-coin"></i>
                  <span>{{ $t('collaboratorBookingsView.paymentConfirm') }}</span>
                </div>
                <PaymentForm
                  :id="booking.id"
                  :commerce="commerce"
                  :client-id="booking.clientId"
                  :confirm-payment="
                    getActiveFeature(commerce, 'booking-confirm-payment', 'PRODUCT')
                  "
                  :errors-add="errorsAdd"
                  :receive-data="receiveData"
                >
                </PaymentForm>
                <div class="booking-action-buttons">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 card-action"
                    @click="goConfirm2()"
                    :disabled="
                      booking.status === 'CONFIRMED' ||
                      booking.confirmed ||
                      !toggles['collaborator.bookings.confirm']
                    "
                  >
                    <i class="bi bi-person-check-fill"></i>
                    {{ $t('collaboratorBookingsView.confirm') }}
                  </button>
                </div>
                <AreYouSure
                  :show="goToConfirm2"
                  :yes-disabled="toggles['collaborator.bookings.confirm']"
                  :no-disabled="toggles['collaborator.bookings.confirm']"
                  @actionYes="confirm()"
                  @actionNo="confirmCancel2()"
                >
                </AreYouSure>
              </div>
              <div v-else class="booking-action-message">
                <Message
                  :title="$t('collaboratorBookingsView.message.7.title')"
                  :content="$t('collaboratorBookingsView.message.7.content')"
                />
              </div>
            </div>
          </div>
        </Transition>
        <!-- TRANSFER -->
        <Transition name="slide-fade">
          <div
            v-if="
              extendedTransferEntity &&
              getActiveFeature(commerce, 'booking-transfer-queue', 'PRODUCT')
            "
            class="booking-action-section"
          >
            <div class="booking-action-content">
              <div v-if="booking.transfered" class="booking-transfer-history">
                <div class="booking-action-header">
                  <i class="bi bi-arrow-left-right"></i>
                  <span>{{ $t('collaboratorBookingsView.transferData') }}</span>
                </div>
                <div class="booking-transfer-badges">
                  <span v-if="booking.transferedOrigin" class="booking-badge-modern">
                    {{ getQueueName(booking.transferedOrigin || undefined) }}
                  </span>
                  <span v-if="booking.transferedCount" class="booking-badge-modern">
                    {{ booking.transferedCount }}
                  </span>
                  <span
                    v-if="booking.transferedAt"
                    class="booking-badge-modern booking-badge-secondary"
                  >
                    {{ getDate(booking.transferedAt) }}
                  </span>
                </div>
              </div>
              <div
                v-if="queuesToTransfer && queuesToTransfer.length > 0"
                class="booking-action-form"
              >
                <div class="booking-action-header">
                  <i class="bi bi-arrow-left-right"></i>
                  <span>{{ $t('collaboratorBookingsView.transferQueue') }}</span>
                </div>
                <div class="booking-transfer-selector">
                  <div class="booking-queue-info">
                    <span class="booking-queue-label">{{
                      $t('collaboratorBookingsView.selectQueueToTransfer')
                    }}</span>
                    <div class="booking-queue-current">
                      <i class="bi bi-arrow-right"></i>
                      <span class="fw-bold">{{ queue.name }}</span>
                    </div>
                  </div>
                  <select
                    class="booking-select-modern"
                    aria-label="form-select-sm"
                    v-model="queueToTransfer"
                  >
                    <option v-for="queue in queuesToTransfer" :key="queue.id" :value="queue.id">
                      {{ queue.name }}
                    </option>
                  </select>
                </div>
                <div class="booking-action-buttons">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 card-action"
                    @click="goTransfer()"
                    :disabled="!queueToTransfer || !toggles['collaborator.bookings.transfer']"
                  >
                    <i class="bi bi-person-check-fill"></i>
                    {{ $t('collaboratorBookingsView.transfer') }}
                  </button>
                </div>
                <AreYouSure
                  :show="goToTransfer"
                  :yes-disabled="toggles['collaborator.bookings.transfer']"
                  :no-disabled="toggles['collaborator.bookings.transfer']"
                  @actionYes="transfer()"
                  @actionNo="cancelTransfer()"
                >
                </AreYouSure>
              </div>
              <div v-else class="booking-action-message">
                <Message
                  :title="$t('collaboratorBookingsView.message.6.title')"
                  :content="$t('collaboratorBookingsView.message.6.content')"
                />
              </div>
            </div>
          </div>
        </Transition>
        <!-- EDIT -->
        <Transition name="slide-fade">
          <div
            v-if="extendedEditEntity && getActiveFeature(commerce, 'booking-edit', 'PRODUCT')"
            class="booking-action-section"
          >
            <div class="booking-action-content">
              <div v-if="booking.edited" class="booking-edit-history">
                <div class="booking-action-header">
                  <i class="bi bi-pencil-fill"></i>
                  <span>{{ $t('collaboratorBookingsView.editData') }}</span>
                </div>
                <div class="booking-edit-badges">
                  <span v-if="booking.editedDateOrigin" class="booking-badge-modern">
                    {{ getDate(booking.editedDateOrigin) }}
                  </span>
                  <span v-if="booking.editedBlockOrigin" class="booking-badge-modern">
                    {{ booking.editedBlockOrigin.hourFrom }} -
                    {{ booking.editedBlockOrigin.hourTo }}
                  </span>
                  <span v-if="booking.editedCount" class="booking-badge-modern">
                    {{ booking.editedCount }}
                  </span>
                  <span
                    v-if="booking.editedAt"
                    class="booking-badge-modern booking-badge-secondary"
                  >
                    {{ getDate(booking.editedAt) }}
                  </span>
                </div>
              </div>
              <div class="booking-action-form">
                <div class="booking-action-header">
                  <i class="bi bi-pencil-fill"></i>
                  <span>{{ $t('collaboratorBookingsView.selectDataToEdit') }}</span>
                </div>
                <div class="booking-edit-picker">
                  <div class="booking-edit-picker-wrapper">
                    <BookingDatePicker
                      :show="showBookingDataPicker"
                      :booking="booking"
                      :queue="queue"
                      :commerce="commerce"
                      :view="`monthly`"
                      :amountof-blocks-needed="amountofBlocksNeeded"
                      :grouped-queues="groupedQueues"
                      :receive-booking-edit="receiveBookingEdit"
                    >
                    </BookingDatePicker>
                  </div>
                </div>
                <div class="booking-action-buttons">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 card-action"
                    @click="goEdit()"
                    :disabled="!toggles['collaborator.bookings.edit']"
                  >
                    <i class="bi bi-person-check-fill"></i>
                    {{ $t('collaboratorBookingsView.edit') }}
                  </button>
                </div>
                <AreYouSure
                  :show="goToEdit"
                  :yes-disabled="toggles['collaborator.bookings.edit']"
                  :no-disabled="toggles['collaborator.bookings.edit']"
                  @actionYes="edit()"
                  @actionNo="cancelEdit()"
                >
                </AreYouSure>
              </div>
            </div>
          </div>
        </Transition>
        <div class="booking-actions-footer" v-if="!loading">
          <button
            class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-3 card-action"
            @click="goCancel()"
            :disabled="
              booking.status === 'USER_CANCELED' ||
              booking.cancelled ||
              !toggles['collaborator.bookings.cancel']
            "
          >
            <i class="bi bi-person-x-fill"> </i> {{ $t('collaboratorBookingsView.cancel') }}
          </button>
          <button
            v-if="
              getActiveFeature(commerce, 'booking-confirm', 'PRODUCT') &&
              !getActiveFeature(commerce, 'booking-confirm-payment', 'PRODUCT')
            "
            class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 card-action"
            @click="goConfirm1()"
            :disabled="
              booking.status === 'CONFIRMED' ||
              booking.confirmed ||
              !toggles['collaborator.bookings.confirm']
            "
          >
            <i class="bi bi-person-check-fill"> </i> {{ $t('collaboratorBookingsView.confirm') }}
          </button>
          <AreYouSure
            :show="goToCancel"
            :yes-disabled="toggles['collaborator.bookings.cancel']"
            :no-disabled="toggles['collaborator.bookings.cancel']"
            @actionYes="cancel()"
            @actionNo="cancelCancel()"
          >
          </AreYouSure>
          <AreYouSure
            :show="goToConfirm1"
            :yes-disabled="toggles['collaborator.bookings.confirm']"
            :no-disabled="toggles['collaborator.bookings.confirm']"
            @actionYes="confirm()"
            @actionNo="confirmCancel1()"
          >
          </AreYouSure>
        </div>
        <div class="booking-metadata-footer">
          <span class="metric-card-details"><strong>Id:</strong> {{ booking.id }}</span>
          <span class="metric-card-details"
            ><strong>Date:</strong> {{ getDate(booking.createdAt) }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modernized Booking Row Card */
.booking-row-card {
  background-color: #ffffff;
  padding: 0.15rem 0.35rem;
  margin: 0.25rem 0;
  border-radius: 0.4rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  cursor: pointer;
}

.booking-row-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  border-color: rgba(0, 194, 203, 0.2);
}

.booking-card-success {
  border-left: 3px solid #10b981;
}

.booking-card-warning {
  border-left: 3px solid #f59e0b;
}

.booking-card-error {
  border-left: 3px solid #ef4444;
}

.booking-card-info {
  border-left: 3px solid var(--azul-turno);
}

.booking-row-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.booking-icon-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  flex-shrink: 0;
  font-size: 0.75rem;
}

.booking-icon-mini.icon-success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.booking-icon-mini.icon-warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.booking-icon-mini.icon-error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.booking-icon-mini.icon-info {
  background: rgba(0, 194, 203, 0.1);
  color: var(--azul-turno);
}

.service-badges-inline {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  align-items: center;
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

.badge-mini.bg-secondary {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
}

.service-tag-mini {
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%);
}

.booking-info-inline {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.booking-name-inline {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.booking-name-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.btn-copy-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6c757d;
  flex-shrink: 0;
  font-size: 0.7rem;
}

.btn-copy-mini:hover {
  background: rgba(0, 194, 203, 0.08);
  border-color: var(--azul-turno);
  color: var(--azul-turno);
}

.booking-meta-inline {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.booking-time-inline {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--azul-turno);
  padding: 0.15rem 0.4rem;
  background: rgba(0, 194, 203, 0.08);
  border-radius: 0.3rem;
  line-height: 1.2;
}

.icon-mini-separated {
  font-size: 0.75rem;
  color: #6c757d;
  opacity: 0.8;
}

.icon-mini-separated.blue-icon {
  color: var(--azul-turno);
}

.collapse-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.collapse-icon {
  font-size: 0.75rem;
  color: #6c757d;
  transition: transform 0.2s ease;
}

.booking-details-expanded {
  background-color: transparent;
  border-radius: 0;
  border: none;
  margin: 0;
  padding: 0;
}

.show {
  padding: 0;
  max-height: none !important;
  overflow-y: visible;
}

.detailed-data {
  padding: 0.75rem 0;
  margin-bottom: 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(169, 169, 169, 0.15);
  border-radius: 8px;
  padding: 0.875rem;
}

.detailed-data .row {
  margin: 0.5rem 0;
}

.detailed-data .row:first-child {
  margin-top: 0;
}

.detailed-data .row:last-child {
  margin-bottom: 0;
}

.card-action {
  padding: 0.5rem 1rem !important;
  font-size: 0.75rem !important;
  margin-top: 0.5rem !important;
  margin-bottom: 0.5rem !important;
  border-radius: 6px !important;
  border: 1px solid rgba(169, 169, 169, 0.2) !important;
  transition: all 0.2s ease !important;
}

.card-action:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.card-action i {
  font-size: 0.75rem;
}

/* Client Info Section - Standardized */
.booking-client-info {
  margin-bottom: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.booking-client-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.2);
}

.booking-client-name-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.booking-client-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(0, 194, 203, 0.12);
  border-radius: 6px;
  flex-shrink: 0;
}

.booking-client-avatar i {
  font-size: 1.125rem;
  color: #00c2cb;
}

.booking-client-details {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 1;
  min-width: 0;
}

.booking-client-name {
  font-size: 0.875rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.3;
  letter-spacing: -0.01em;
  flex: 1;
  min-width: 0;
}

.booking-client-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.25rem;
}

.booking-contact-item {
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

.booking-contact-item:hover {
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

.booking-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(169, 169, 169, 0.2), transparent);
  margin: 0.5rem 0;
}

/* Confirmation Badges */
.booking-confirmation-badges {
  margin-bottom: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.booking-confirmation-header {
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

.booking-confirmation-header i {
  color: #00c2cb;
  font-size: 1rem;
}

.booking-confirmation-tags {
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

/* Action Tabs - Compact and Modern */
.booking-actions-tabs {
  display: flex;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
  padding: 0.375rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(169, 169, 169, 0.15);
  border-radius: 8px;
  flex-wrap: wrap;
}

.booking-action-tab {
  flex: 1;
  min-width: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.2;
  color: #004aad;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.15) 0%, rgba(0, 194, 203, 0.08) 100%);
  border: 1px solid rgba(0, 74, 173, 0.25);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: -0.01em;
}

.booking-action-tab:hover {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.2) 0%, rgba(0, 194, 203, 0.1) 100%);
  border-color: rgba(0, 74, 173, 0.4);
  color: #004aad;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.15);
}

.booking-action-tab-active {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.25) 0%, rgba(0, 194, 203, 0.15) 100%);
  color: #004aad;
  border-color: rgba(0, 74, 173, 0.4);
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.2);
}

.booking-action-tab span {
  line-height: 1.2;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.booking-action-tab i:first-child {
  font-size: 0.75rem;
  flex-shrink: 0;
}

.booking-action-tab i:last-child {
  font-size: 0.625rem;
  margin-left: auto;
  flex-shrink: 0;
}

/* Footer Info */
.booking-footer-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  padding-top: 0.4rem;
  margin-top: 0.4rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 0.65rem;
  color: #6c757d;
}

.booking-footer-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.booking-footer-item strong {
  font-weight: 600;
  color: #495057;
}
.details-title {
  text-decoration: underline;
  font-size: 0.8rem;
  color: var(--color-text);
  cursor: pointer;
}
.step-title {
  font-size: 0.7rem;
  line-height: 0.7rem;
  color: var(--color-text);
  cursor: pointer;
}
.metric-card-title {
  margin: 0.2rem;
  font-size: 0.8rem;
  font-weight: 500;
}
.metric-card-detail-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 0.7rem;
}
.copy-icon {
  color: var(--gris-default);
  cursor: pointer;
  margin: 0.2rem;
}
.checked-icon {
  color: var(--azul-turno);
}
.metric-card-details {
  font-size: 0.7rem;
  font-weight: 400;
}
.select {
  border-radius: 0.5rem !important;
  border: 1.5px solid var(--gris-clear) !important;
}
.text-label {
  line-height: 0.9rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.confirm-payment {
  cursor: pointer;
  line-height: 0.8rem;
}
.index {
  background-color: var(--azul-qr);
  padding: 0.05rem;
  margin-top: 0.25rem;
  border-radius: 0.5rem !important;
}
.hour-title {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 0.9rem;
  letter-spacing: 0.01px;
}
.icon {
  margin-left: 0.1rem;
  margin-right: 0.15rem;
}
.booking-link {
  cursor: pointer;
}

/* Details Expandable Section */
.details-expandable-section {
  margin: 0.25rem 0.375rem;
  margin-top: 0;
  border-radius: 0 0 8px 8px;
  overflow: visible;
  background: transparent;
}

.details-expand-enter-active,
.details-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.details-expand-enter-from,
.details-expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.details-expand-enter-to,
.details-expand-leave-from {
  opacity: 1;
  max-height: 2000px;
  transform: translateY(0);
}

.detailed-data {
  padding: 0.5rem 0;
}

/* Info Section */
.info-section {
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.info-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.compact-section {
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
}

/* Action Buttons Grid */
.action-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.625rem 0.75rem;
  background: #ffffff;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.75rem;
  font-weight: 600;
  color: #495057;
  min-height: 60px;
}

.action-btn:hover {
  background: rgba(0, 194, 203, 0.08);
  border-color: rgba(0, 194, 203, 0.3);
  color: var(--azul-turno);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 194, 203, 0.15);
}

.action-btn-active {
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%);
  color: #ffffff;
  border-color: var(--azul-turno);
  box-shadow: 0 2px 4px rgba(0, 194, 203, 0.25);
}

.action-btn i {
  font-size: 1.125rem;
}

.action-btn span {
  font-size: 0.6875rem;
  line-height: 1.2;
}

/* Info Section Header Compact */
.info-section-header-compact {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.info-section-header-compact i {
  font-size: 0.875rem;
  color: var(--azul-turno);
}

.info-section-title-compact {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000000;
  letter-spacing: -0.01em;
}

/* Contact Data Grid */
.contact-data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
}

.data-item-compact {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.625rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  transition: all 0.2s ease;
  text-decoration: none;
  color: inherit;
}

.data-item-compact:hover {
  background: rgba(0, 194, 203, 0.08);
  border-color: rgba(0, 194, 203, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 194, 203, 0.1);
}

.data-item-compact.whatsapp:hover {
  background: rgba(37, 211, 102, 0.1);
  border-color: rgba(37, 211, 102, 0.3);
}

.data-item-compact.email:hover {
  background: rgba(0, 122, 255, 0.1);
  border-color: rgba(0, 122, 255, 0.3);
}

.data-label {
  font-size: 0.625rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-value {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #000000;
}

.data-value i {
  font-size: 0.875rem;
  color: var(--azul-turno);
}

.data-item-compact.whatsapp .data-value i {
  color: #25d366;
}

.data-item-compact.email .data-value i {
  color: #007aff;
}

/* Info Badges */
.info-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.info-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: rgba(0, 194, 203, 0.08);
  border: 1px solid rgba(0, 194, 203, 0.15);
  border-radius: 6px;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.info-badge:hover {
  background: rgba(0, 194, 203, 0.12);
  border-color: rgba(0, 194, 203, 0.25);
}

.info-badge i {
  font-size: 0.875rem;
  color: var(--azul-turno);
}

.badge-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.badge-value {
  font-weight: 700;
  color: #000000;
}

/* Metadata Section */
.metadata-section {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.metadata-item-compact {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.5);
  flex-wrap: wrap;
}

.metadata-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
}

.metadata-value {
  font-weight: 700;
  color: #000000;
}

.metadata-separator {
  color: rgba(0, 0, 0, 0.3);
  margin: 0 0.125rem;
}

/* Actions Footer */
.booking-actions-footer {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(169, 169, 169, 0.2);
  flex-wrap: wrap;
}

.booking-actions-footer .card-action {
  flex: 1;
  min-width: 120px;
}

/* Metadata Footer */
.booking-metadata-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(169, 169, 169, 0.2);
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.5);
}

.booking-metadata-footer .metric-card-details {
  font-size: 0.6875rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.5);
}

.booking-metadata-footer .metric-card-details strong {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

/* Booking Context Info - Reservation Details (Compact Horizontal) */
.booking-context-info-compact {
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

.booking-context-item-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

.booking-context-item-inline i {
  color: #00c2cb;
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.booking-context-label-inline {
  font-size: 0.625rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.booking-context-value-inline {
  font-size: 0.75rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

/* Action Section Container - Completely Hidden Until Activated */
.booking-action-section {
  margin-bottom: 0.5rem;
  min-height: 180px;
  display: flex;
  flex-direction: column;
}

.booking-action-section:last-child {
  margin-bottom: 0;
}

.booking-action-content {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 8px;
  padding: 0.625rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  min-height: 180px;
  display: flex;
  flex-direction: column;
}

.booking-action-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.2);
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000000;
  letter-spacing: -0.01em;
}

.booking-action-header i {
  color: #00c2cb;
  font-size: 0.9375rem;
}

.booking-action-form {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  flex: 1;
}

.booking-action-message {
  padding: 1rem 0;
}

.booking-action-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.625rem;
  border-top: 1px solid rgba(169, 169, 169, 0.2);
  justify-content: center;
  align-items: center;
}

/* Transfer Section */
.booking-transfer-history {
  margin-bottom: 0.625rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.2);
}

.booking-transfer-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.375rem;
}

.booking-transfer-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.booking-queue-info {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.booking-queue-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.booking-queue-current {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: rgba(0, 194, 203, 0.08);
  border: 1px solid rgba(0, 194, 203, 0.2);
  border-radius: 6px;
  font-size: 0.75rem;
  color: #00c2cb;
}

.booking-queue-current i {
  font-size: 0.875rem;
}

.booking-select-modern {
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  transition: all 0.2s ease;
  cursor: pointer;
}

.booking-select-modern:hover {
  border-color: rgba(0, 194, 203, 0.3);
  background: rgba(255, 255, 255, 1);
}

.booking-select-modern:focus {
  outline: none;
  border-color: #00c2cb;
  box-shadow: 0 0 0 3px rgba(0, 194, 203, 0.1);
}

/* Edit Section */
.booking-edit-history {
  margin-bottom: 0.625rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.2);
}

.booking-edit-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.375rem;
}

.booking-edit-picker {
  margin: 0.375rem 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.booking-edit-picker-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 100%;
}

.booking-edit-picker-wrapper > div {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.booking-edit-picker-wrapper .centered {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.booking-edit-picker-wrapper .col {
  display: flex;
  justify-content: center;
  align-items: center;
}

.booking-edit-picker-wrapper .col-md-9 {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 100%;
}

/* Modern Badges */
.booking-badge-modern {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.625rem;
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
  border: 1px solid rgba(0, 194, 203, 0.25);
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.2;
}

.booking-badge-modern.booking-badge-secondary {
  background: rgba(169, 169, 169, 0.15);
  color: rgba(0, 0, 0, 0.7);
  border-color: rgba(169, 169, 169, 0.2);
}

/* Slide Fade Transition */
.slide-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
  margin-bottom: 0;
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
  margin-bottom: 0;
}

.slide-fade-enter-to,
.slide-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 1000px;
}
</style>
