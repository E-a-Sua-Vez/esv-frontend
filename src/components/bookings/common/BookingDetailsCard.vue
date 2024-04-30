<script>
import Popper from "vue3-popper";
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import { cancelBooking, confirmBooking } from '../../../application/services/booking';
import { getActiveFeature } from '../../../shared/features';
import { getPaymentMethods, getPaymentTypes } from '../../../shared/utils/data';
import { getPendingCommerceBookingsByDate, transferBooking, editBooking } from '../../../application/services/booking';
import { getQueueById } from '../../../application/services/queue';
import { getDate } from '../../../shared/utils/date';
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
  },
  emits: ['getAvailableDatesByCalendarMonth'],
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
      selectedDate: (new Date()).setDate(new Date().getDate() + 1),
      minDate: (new Date()).setDate(new Date().getDate()),
      maxDate: (new Date()).setDate(new Date().getDate() + 90),
      amountofBlocksNeeded: 1,
      availableBookingSuperBlocks: [],
      showBookingDataPicker: false,
      dateToEdit: undefined,
      blockToEdit: undefined
    }
  },
  beforeMount() {
    this.paymentTypes = getPaymentTypes();
    this.paymentMethods = getPaymentMethods();
    this.locale = this.commerce.localeInfo.language;
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    showPaymentDetails() {
      this.extendedPaymentEntity = !this.extendedPaymentEntity;
      this.extendedEditEntity = false;
      this.extendedTransferEntity = false
    },
    async showEditDetails() {
      this.extendedEditEntity = !this.extendedEditEntity;
      this.extendedPaymentEntity = false;
      this.extendedTransferEntity = false
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
      if (data.packagePaid === false && getActiveFeature(this.commerce, 'booking-confirm-payment', 'PRODUCT')) {
        if(!data.paymentType || data.paymentType.length === 0) {
          this.paymentTypeError = true;
          this.errorsAdd.push('collaboratorBookingsView.validate.paymentType');
        } else {
          this.paymentTypeError = false;
        }
        if(!data.paymentMethod || data.paymentMethod.length === 0) {
          this.paymentMethodError = true;
          this.errorsAdd.push('collaboratorBookingsView.validate.paymentMethod');
        } else {
          this.paymentMethodError = false;
        }
        if(data.paymentAmount === undefined || data.paymentAmount.length === 0 || data.paymentAmount < 0) {
          this.paymentAmountError = true;
          this.errorsAdd.push('collaboratorBookingsView.validate.paymentAmount');
        } else {
          this.paymentAmountError = false;
        }
      }
      if(this.errorsAdd.length === 0) {
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
                ... this.newConfirmationData
              }
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
          if (this.queue.serviceInfo !== undefined && this.queue.serviceInfo.blockLimit !== undefined && this.queue.serviceInfo.blockLimit > 0) {
            limit = this.queue.serviceInfo.blockLimit;
          }
          queuesToTransfer.forEach(queue => {
            const bookingsByQueue = groupedBookings[queue.id];
            if (bookingsByQueue && bookingsByQueue.length > 0) {
              const bookingsReserved = bookingsByQueue.map(booking => {
                if (booking.block && booking.block.blockNumbers && booking.block.blockNumbers.length > 0) {
                  return [...booking.block.blockNumbers];
                } else {
                  return booking.block.number;
                }
              });
              const totalBlocksReserved = bookingsReserved.flat(Infinity).sort();
              const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
              const blockedBlocks = []
              uniqueBlocksReserved.forEach(block => {
                const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                if (times >= limit - 1) {
                  blockedBlocks.push(block);
                }
              })
              const blocksToCheck = this.booking.block.blockNumbers || [this.booking.block.number];
              const availableBlocks = blocksToCheck.flat().filter(block => blockedBlocks.includes(block));
              if (availableBlocks.length === 0) {
                this.queuesToTransfer.push(queue);
              }
            } else {
              this.queuesToTransfer.push(queue);
            }
          })
        }
      }
      this.loading = false;
    },
    async transfer() {
      try {
        this.loading = true;
        if (this.booking && this.booking.id) {
          const body = {
            queueId: this.queueToTransfer
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
            block: this.blockToEdit
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
        if (data.skipPayment) {
          this.newConfirmationData.skipPayment = !data.skipPayment;
        }
        if (data.packagePaid) {
          this.newConfirmationData.packagePaid = data.packagePaid;
        }
        if (data.packagePaid) {
          this.newConfirmationData.confirmInstallments = data.confirmInstallments;
        }
      };
    },
    receiveBookingEdit(data) {
      if (data) {
        if (data.date) {
          this.dateToEdit = data.date
        }
        if (data.block) {
          this.blockToEdit = data.block
        }
      }
    }
  },
  watch: {
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.detailsOpened;
      }
    },
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.extendedEntity;
      }
    }
  },
}
</script>

<template>
  <div v-if="show && booking">
    <div class="row metric-card fw-bold">
      <div class="col centered" v-if="booking.user && booking.user.name">
        <i class="bi bi-person-circle icon"></i> {{ booking.user.name.split(' ')[0] || 'N/I' }}
        <i v-if="booking.status === 'PENDING'" class="bi bi-clock-fill icon yellow-icon"> </i>
        <i v-if="booking.status === 'CONFIRMED'" class="bi bi-check-circle-fill icon green-icon"> </i>
        <i v-if="booking.confirmationData && booking.confirmationData.paid === true" class="bi bi-coin icon blue-icon"> </i>
        <i v-if="booking.transfered === true" class="bi bi-arrow-left-right icon blue-icon"> </i>
        <i v-if="booking.edited === true" class="bi bi-pencil-fill icon"> </i>
      </div>
      <div class="col centered hour-title" v-if="booking.block && booking.block.hourFrom">
        <span> {{ booking.block.hourFrom }} - {{ booking.block.hourTo }} </span>
      </div>
      <div class="col centered date-title">
        {{ getDate(booking.date) }}
      </div>
    </div>
    <div class="details-arrow">
      <div class="centered">
        <span
          href="#"
          @click.prevent="showDetails()">
          <span class="details-title">{{ $t("dashboard.details") }}</span>
          <i class="dark" :class="`bi ${extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
        </span>
      </div>
      <div
        :class="{ show: extendedEntity }"
        class="detailed-data transition-slow">
        <div class="row m-0 centered">
          <div class="d-block col-12 col-md-4">
            <div class="col-12 fw-bold">
              <i class="bi bi-person-circle mx-1"></i> {{ booking.user.name || 'N/I' }} {{ booking.user.lastName || '' }}
              <div class="row">
                <a class="copy-icon"
                  @click="copyBooking()">
                  <i class="bi bi-file-earmark-spreadsheet"></i>
                </a>
              </div>
            </div>
            <Spinner :show="loading"></Spinner>
          </div>
          <div class="d-block d-md-none col-12 col-md-8">
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/'+booking.user.phone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 whatsapp-icon"></i> {{ booking.user.phone || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto:'+booking.user.email"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ booking.user.email || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <i class="bi bi-person-vcard mx-1"></i> {{ booking.user.idNumber || 'N/I' }}
            </div>
          </div>
          <div class="d-none d-md-block col-12 col-md-8">
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/'+booking.user.phone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 whatsapp-icon"></i> {{ booking.user.phone || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto:'+booking.user.email"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ booking.user.email || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <i class="bi bi-person-vcard mx-1"></i> {{ booking.user.idNumber || 'N/I' }}
            </div>
          </div>
        </div>
        <hr>
        <!-- CONFIRMATION DETAILS -->
        <div class="row mx-1 centered" v-if="booking.confirmed === true && booking.confirmationData">
          <div class="">
            <i class="bi bi-check-circle-fill mx-1"> </i> <span class="mb-1">{{ $t("collaboratorBookingsView.confirmData") }}</span>
          </div>
          <div v-if="booking.confirmationData">
            <span v-if="booking.confirmationData.proceduresTotalNumber && booking.confirmationData.procedureNumber" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ booking.confirmationData.procedureNumber }} {{ $t('collaboratorBookingsView.procedureNumber')}} {{ booking.confirmationData.proceduresTotalNumber }}</span>
            <span v-if="booking.confirmationData.paymentFiscalNote" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ $t(`paymentFiscalNotes.${booking.confirmationData.paymentFiscalNote}`) }}</span>
            <span v-if="booking.confirmationData.paymentType" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ $t(`paymentTypes.${booking.confirmationData.paymentType}`) }}</span>
            <span v-if="booking.confirmationData.paymentMethod" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ $t(`paymentClientMethods.${booking.confirmationData.paymentMethod}`) }}</span>
            <span v-if="booking.confirmationData.paymentAmount" class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> <i class="bi bi-coin mx-1"> </i> {{ booking.confirmationData.paymentAmount }}</span>
            <span v-if="booking.confirmationData.paymentCommission" class="badge rounded-pill bg-warning metric-keyword-tag mx-1 fw-bold"> <i class="bi bi-coin mx-1"> </i> {{ booking.confirmationData.paymentCommission }}</span>
            <span v-if="booking.confirmationData.paymentDate" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ getDate(booking.confirmationData.paymentDate) }}</span>
          </div>
          <hr>
        </div>
        <div class="row mx-1 centered">
          <!-- PAYMENT -->
          <div class="col-4" v-if="getActiveFeature(commerce, 'booking-confirm', 'PRODUCT')">
            <h6>
              <span class="centered confirm-payment"
                href="#"
                @click.prevent="showPaymentDetails()">
                <i class="bi bi-cash-coin icon"></i> <span class="step-title fw-bold">{{ $t("collaboratorBookingsView.paymentConfirm") }}</span>
                <i class="dark" :class="`bi ${extendedPaymentEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
              </span>
              <div v-if="extendedPaymentEntity" class="index"></div>
            </h6>
          </div>
          <!-- TRANSFER -->
          <div class="col-4" v-if="getActiveFeature(commerce, 'booking-transfer-queue', 'PRODUCT')">
            <h6>
              <span class="centered confirm-payment"
                href="#"
                @click.prevent="showTransferDetails()">
                <i class="bi bi-arrow-left-right icon"></i> <span class="step-title fw-bold">{{ $t("collaboratorBookingsView.transferQueue") }}</span>
                <i class="dark" :class="`bi ${extendedTransferEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
              </span>
              <div v-if="extendedTransferEntity" class="index"></div>
            </h6>
          </div>
          <!-- EDIT -->
          <div class="col-4" v-if="getActiveFeature(commerce, 'booking-edit', 'PRODUCT')">
            <h6>
              <span class="centered confirm-payment"
                href="#"
                @click.prevent="showEditDetails()">
                <i class="bi bi-pencil-fill icon"></i> <span class="step-title fw-bold">{{ $t("collaboratorBookingsView.edit") }}</span>
                <i class="dark" :class="`bi ${extendedEditEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
              </span>
              <div v-if="extendedEditEntity" class="index"></div>
            </h6>
          </div>
        </div>
        <!-- PAYMENT -->
        <div class="row centered" v-if="getActiveFeature(commerce, 'booking-confirm', 'PRODUCT')">
          <div>
            <div
              :class="{ show: extendedPaymentEntity }"
              class="detailed-data transition-slow">
              <div v-if="!booking.confirmed">
                <PaymentForm
                  :id="booking.id"
                  :commerce="commerce"
                  :clientId="booking.clientId"
                  :confirmPayment="getActiveFeature(commerce, 'booking-confirm-payment', 'PRODUCT')"
                  :errorsAdd="errorsAdd"
                  :receiveData="receiveData"
                >
                </PaymentForm>
                <button class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 mt-2"
                  @click="goConfirm2()"
                  :disabled="booking.status === 'CONFIRMED' || booking.confirmed || !toggles['collaborator.bookings.confirm']">
                  <i class="bi bi-person-check-fill"> </i> {{ $t("collaboratorBookingsView.confirm") }}
                </button>
                <AreYouSure
                  :show="goToConfirm2"
                  :yesDisabled="toggles['collaborator.bookings.confirm']"
                  :noDisabled="toggles['collaborator.bookings.confirm']"
                  @actionYes="confirm()"
                  @actionNo="confirmCancel2()"
                >
                </AreYouSure>
                <hr>
              </div>
              <div v-else>
                <Message
                  :title="$t('collaboratorBookingsView.message.7.title')"
                  :content="$t('collaboratorBookingsView.message.7.content')" />
              </div>
            </div>
          </div>
        </div>
        <!-- TRANSFER -->
        <div class="row centered" v-if="getActiveFeature(commerce, 'booking-transfer-queue', 'PRODUCT')">
          <div
            :class="{ show: extendedTransferEntity }"
            class="detailed-data transition-slow">
            <div v-if="booking.transfered">
              <div class="">
                <i class="bi bi-pencil-fill mx-1"> </i> <span class="mb-1">{{ $t("collaboratorBookingsView.transferData") }}</span>
              </div>
              <div>
                <span v-if="booking.transferedOrigin" class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> {{ getQueueName(booking.transferedOrigin || undefined) }} </span>
                <span v-if="booking.transferedCount" class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> {{ booking.transferedCount }}</span>
                <span v-if="booking.transferedAt" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ getDate(booking.transferedAt) }}</span>
              </div>
              <hr>
            </div>
            <div v-if="queuesToTransfer && queuesToTransfer.length > 0">
              <div>
                <div class="text-label mb-2">
                  {{ $t("collaboratorBookingsView.selectQueueToTransfer") }}
                </div>
                <div class="text-label h6">
                  <span class="fw-bold"> {{ queue.name}}</span>
                </div>
                <div class="text-label">
                  <i class="bi bi-arrow-left-right h5"></i>
                </div>
                <div class="text-label mb-1">
                  <select class="btn btn-md btn-light fw-bold text-dark select" aria-label=".form-select-sm" v-model="queueToTransfer">
                    <option v-for="queue in queuesToTransfer" :key="queue.id" :value="queue.id" id="select-block">{{ queue.name }}</option>
                  </select>
                </div>
              </div>
              <button class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 mt-2"
                @click="goTransfer()"
                :disabled="!queueToTransfer || !toggles['collaborator.bookings.transfer']">
                <i class="bi bi-person-check-fill"> </i> {{ $t("collaboratorBookingsView.transfer") }}
              </button>
            </div>
            <div v-else>
              <Message
                :title="$t('collaboratorBookingsView.message.6.title')"
                :content="$t('collaboratorBookingsView.message.6.content')" />
            </div>
            <AreYouSure
              :show="goToTransfer"
              :yesDisabled="toggles['collaborator.bookings.transfer']"
              :noDisabled="toggles['collaborator.bookings.transfer']"
              @actionYes="transfer()"
              @actionNo="cancelTransfer()"
            >
            </AreYouSure>
            <hr>
          </div>
        </div>
         <!-- EDIT -->
        <div class="row centered" v-if="getActiveFeature(commerce, 'booking-edit', 'PRODUCT')">
          <div
            :class="{ show: extendedEditEntity }"
            class="detailed-data transition-slow">
            <div v-if="booking.edited">
              <div class="">
                <i class="bi bi-pencil-fill mx-1"> </i> <span class="mb-1">{{ $t("collaboratorBookingsView.editData") }}</span>
              </div>
              <div>
                <span v-if="booking.editedDateOrigin" class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> {{ getDate(booking.editedDateOrigin) }}</span>
                <span v-if="booking.editedBlockOrigin" class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> {{ booking.editedBlockOrigin.hourFrom }} - {{ booking.editedBlockOrigin.hourTo }}</span>
                <span v-if="booking.editedCount" class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> {{ booking.editedCount }}</span>
                <span v-if="booking.editedAt" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ getDate(booking.editedAt) }}</span>
              </div>
              <hr>
            </div>
            <div>
              <div>
                <div class="text-label my-1">
                  {{ $t("collaboratorBookingsView.selectDataToEdit") }}
                </div>
              </div>
              <div class="mt-2">
                <BookingDatePicker
                  :show="showBookingDataPicker"
                  :booking="booking"
                  :queue="queue"
                  :commerce="commerce"
                  :view="`weekly`"
                  :amountofBlocksNeeded="amountofBlocksNeeded"
                  :groupedQueues="groupedQueues"
                  :receiveBookingEdit="receiveBookingEdit"
                >
                </BookingDatePicker>
              </div>
              <button class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 mt-2"
                @click="goEdit()"
                :disabled="!toggles['collaborator.bookings.edit']">
                <i class="bi bi-person-check-fill"> </i> {{ $t("collaboratorBookingsView.edit") }}
              </button>
            </div>
            <AreYouSure
              :show="goToEdit"
              :yesDisabled="toggles['collaborator.bookings.edit']"
              :noDisabled="toggles['collaborator.bookings.edit']"
              @actionYes="edit()"
              @actionNo="cancelEdit()"
            >
            </AreYouSure>
            <hr>
          </div>
        </div>
        <div class="row centered mt-2" v-if="!loading">
          <div class="col-6">
            <button class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-3"
              @click="goCancel()"
              :disabled="booking.status === 'USER_CANCELED' || booking.cancelled || !toggles['collaborator.bookings.cancel']"
              >
              <i class="bi bi-person-x-fill"> </i> {{ $t("collaboratorBookingsView.cancel") }}
            </button>
          </div>
          <div class="col-6" v-if="getActiveFeature(commerce, 'booking-confirm', 'PRODUCT') && !getActiveFeature(commerce, 'booking-confirm-payment', 'PRODUCT')">
            <button class="btn btn-md btn-size fw-bold btn-primary rounded-pill px-3"
              @click="goConfirm1()"
              :disabled="booking.status === 'CONFIRMED' || booking.confirmed || !toggles['collaborator.bookings.confirm']"
              >
              <i class="bi bi-person-x-fill"> </i> {{ $t("collaboratorBookingsView.confirm") }}
            </button>
          </div>
          <AreYouSure
            :show="goToCancel"
            :yesDisabled="toggles['collaborator.bookings.cancel']"
            :noDisabled="toggles['collaborator.bookings.cancel']"
            @actionYes="cancel()"
            @actionNo="cancelCancel()"
          >
          </AreYouSure>
          <AreYouSure
            :show="goToConfirm1"
            :yesDisabled="toggles['collaborator.bookings.confirm']"
            :noDisabled="toggles['collaborator.bookings.confirm']"
            @actionYes="confirm()"
            @actionNo="confirmCancel1()"
          >
          </AreYouSure>
        </div>
        <div class="m-0 mt-2" v-if="booking.servicesDetails">
          <span v-for="serv in booking.servicesDetails" :key="serv.id" class="badge rounded-pill bg-primary col fw-bold"> {{ serv.name }}</span>
        </div>
        <div class="row m-0 mt-1 centered">
          <div class="col">
            <span class="metric-card-details mx-1"><strong>Id:</strong> {{ booking.id }}</span>
            <span class="metric-card-details"><strong>Date:</strong> {{ getDate(booking.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: .1rem;
  margin: .5rem;
  margin-bottom: 0;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: 0;
  line-height: 1.6rem;
}
.details-arrow {
  margin: .5rem;
  margin-top: 0;
  border-bottom-left-radius: .5rem;
  border-bottom-right-radius: .5rem;
  line-height: 1.1rem;
  border: .5px solid var(--gris-default);
  border-top: 0;
}
.show {
  padding: 10px;
  max-height: 400px !important;
  overflow-y: auto;
}
.details-title {
  text-decoration: underline;
  font-size: .8rem;
  color: var(--color-text);
  cursor: pointer;
}
.step-title {
  font-size: .7rem;
  line-height: .7rem;
  color: var(--color-text);
  cursor: pointer;
}
.metric-card-title {
  margin: .2rem;
  font-size: .8rem;
  font-weight: 500;
}
.metric-card-detail-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: .7rem;
}
.copy-icon {
  color: var(--gris-default);
  cursor: pointer;
  margin: .2rem;
}
.checked-icon {
  color: var(--azul-turno);
}
.metric-card-details {
  font-size: .7rem;
  font-weight: 400;
}
.select {
  border-radius: .5rem !important;
  border: 1.5px solid var(--gris-clear) !important;
}
.text-label {
  line-height: .9rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.confirm-payment {
  cursor: pointer;
  line-height: .8rem;
}
.index {
  background-color: var(--azul-qr);
  padding: .05rem;
  margin-top: .25rem;
  border-radius: .5rem !important;
}
.hour-title {
  font-size: .8rem;
  font-weight: 700;
  line-height: .9rem;
  letter-spacing: .01px;
}
.icon {
  margin-left: .1rem;
  margin-right: .15rem;
}
</style>