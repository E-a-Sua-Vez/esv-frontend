<script>
import Popper from "vue3-popper";
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import { cancelAttention, attentionPaymentConfirm, transferAttention, getPendingCommerceAttentions } from '../../../application/services/attention';
import { getActiveFeature } from '../../../shared/features';
import { getPaymentMethods, getPaymentTypes } from '../../../shared/utils/data';
import Warning from '../../common/Warning.vue';
import AreYouSure from '../../common/AreYouSure.vue';
import PaymentForm from '../../payments/PaymentForm.vue';
import Message from '../../common/Message.vue';

export default {
  name: 'AttentionDetailsCard',
  components: { Popper, Spinner, Warning, AreYouSure, PaymentForm, Message },
  props: {
    show: { type: Boolean, default: true },
    attention: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    queues: { type: Array, default: undefined },
  },
  data() {
    return {
      loading: false,
      extendedEntity: false,
      extendedPaymentEntity: false,
      newPaymentConfirmationData: {},
      extendedTransferEntity: false,
      paymentTypes: [],
      paymentMethods: [],
      paymentAmountError: false,
      paymentTypeError: false,
      paymentMethodError: false,
      errorsAdd: [],
      goToTransfer: false,
      goToCancel: false,
      goToConfirm: false,
      checked: false,
      queuesToTransfer: [],
      queueToTransfer: {}
    }
  },
  beforeMount() {
    this.paymentTypes = getPaymentTypes();
    this.paymentMethods = getPaymentMethods();
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    showPaymentDetails() {
      this.extendedPaymentEntity = !this.extendedPaymentEntity;
    },
    async showTransferDetails() {
      this.extendedTransferEntity = !this.extendedTransferEntity;
      if (this.extendedTransferEntity === true) {
        await this.toTransfer();
      }
    },
    getDate(dateIn, timeZoneIn) {
      const date = dateIn;
      const dateCorrected = new Date(
      new Date(date).toLocaleString('en-US', {
        timeZone: timeZoneIn,
      }));
      return dateCorrected.toISOString().slice(0,10);
    },
    copyBooking() {
      const textToCopy = jsonToCsv([this.attention]);
      navigator.clipboard.writeText(textToCopy);
    },
    async cancel() {
      try {
        this.loading = true;
        if (this.attention && this.attention.id) {
          await cancelAttention(this.attention.id);
          this.$emit('updatedAttentions');
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    },
    validateConfirm(data) {
      this.errorsAdd = [];
      if (getActiveFeature(this.commerce, 'attention-confirm-payment', 'PRODUCT')) {
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
        if (this.attention && this.attention.id) {
          if (this.validateConfirm(this.newPaymentConfirmationData)) {
            const body = {
              paymentConfirmationData: {
                paid: true,
                paymentDate: new Date(),
                ... this.newPaymentConfirmationData
              }
            };
            await attentionPaymentConfirm(this.attention.id, body);
            this.$emit('updatedAttentions');
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
      const queuesToTransfer = this.queues.filter(queue => queue.type === 'COLLABORATOR');
      if (queuesToTransfer && queuesToTransfer.length > 0) {
        const attentions = await getPendingCommerceAttentions(this.commerce.id);
        if (attentions && attentions.length > 0) {
          const groupedAttentions = attentions.reduce((acc, book) => {
            const type = book.queueId;
            if (!acc[type]) {
              acc[type] = [];
            }
            acc[type].push(book);
            return acc;
          }, {});
          const limit = queuesToTransfer.length;
          queuesToTransfer.forEach(queue => {
            const attentionsByQueue = groupedAttentions[queue.id];
            if (attentionsByQueue && attentionsByQueue.length > 0) {
              const attentionsReserved = attentionsByQueue.map(attention => {
                if (attention.block && attention.block.blockNumbers && attention.block.blockNumbers.length > 0) {
                  return [...attention.block.blockNumbers];
                } else {
                  return attention.block.number;
                }
              });
              const totalBlocksReserved = attentionsReserved.flat(Infinity).sort();
              const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
              const blockedBlocks = []
              uniqueBlocksReserved.forEach(block => {
                const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                if (times >= limit - 1) {
                  blockedBlocks.push(block);
                }
              })
              const blocksToCheck = this.attention.block.blockNumbers || [this.attention.block.number];
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
    },
    async transfer() {
      try {
        this.loading = true;
        if (this.attention && this.attention.id) {
          const body = {
            queueId: this.queueToTransfer
          };
          await transferAttention(this.attention.id, body);
          this.$emit('updatedAttentions');
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
    getActiveFeature(commerce, name, type) {
      return getActiveFeature(commerce, name, type);
    },
    goCancel() {
      this.goToCancel = !this.goToCancel;
    },
    cancelCancel() {
      this.goToCancel = false;
    },
    goConfirm() {
      this.goToConfirm = !this.goToConfirm;
    },
    confirmCancel() {
      this.goToConfirm = false;
    },
    receiveData(data) {
      if (data) {
        if (data.procedureNumber) {
          this.newConfirmationData.procedureNumber = data.procedureNumber;
        }
        if (data.proceduresTotalNumber) {
          this.newConfirmationData.proceduresTotalNumber = data.proceduresTotalNumber;
        }
        if (data.paymentType) {
          this.newPaymentConfirmationData.paymentType = data.paymentType;
        }
        if (data.paymentMethod) {
          this.newPaymentConfirmationData.paymentMethod = data.paymentMethod;
        }
        if (data.paymentAmount) {
          this.newPaymentConfirmationData.paymentAmount = data.paymentAmount;
        }
        if (data.paymentCommission) {
          this.newPaymentConfirmationData.paymentCommission = data.paymentCommission;
        }
        if (data.paymentComment) {
          this.newPaymentConfirmationData.paymentComment = data.paymentComment;
        }
      };
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
  <div v-if="show && attention">
    <div class="row metric-card fw-bold">
      <div class="col-2 centered">
        <span class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> {{ attention.number }}</span>
      </div>
      <div class="col-4 centered" v-if="attention.user && attention.user.name">
        <i class="bi bi-person-circle mx-1"></i> {{ attention.user.name.split(' ')[0] || 'N/I' }}
        <i v-if="attention.status === 'PENDING' && (!attention.paid || attention.paid === false)" class="bi bi-clock-fill mx-1 yellow-icon"> </i>
        <i v-if="attention.status === 'PENDING' && (attention.paid || attention.paid === true)" class="bi bi-check-circle-fill mx-1 green-icon"> </i>
        <i v-if="attention.paymentConfirmationData !== undefined && attention.paymentConfirmationData.paid === true" class="bi bi-coin mx-1 blue-icon"> </i>
      </div>
      <div class="col-6 centered" v-if="attention.block && attention.block.hourFrom">
        <span> {{ attention.block.hourFrom }} - {{ attention.block.hourTo }} </span>
      </div>
    </div>
    <div class="details-arrow">
      <div class="centered">
        <span
          :href="`#data-attention-${attention.number}`"
          @click.prevent="showDetails()">
          <span class="details-title">{{ $t("dashboard.details") }}</span>
          <i class="dark" :class="`bi ${extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
        </span>
      </div>
      <div
        :id="`#data-attention-${attention.number}`"
        :class="{ show: extendedEntity }"
        class="detailed-data transition-slow">
        <div class="row m-0 centered">
          <div class="d-block col-12 col-md-4">
            <div class="col-12 fw-bold">
              <i class="bi bi-person-circle mx-1"></i> {{ attention.user.name || 'N/I' }} {{ attention.user.lastName || '' }}
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
                :href="'https://wa.me/'+attention.user.phone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 "></i> {{ attention.user.phone || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto'+attention.user.email"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ attention.user.email || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <i class="bi bi-person-vcard mx-1"></i> {{ attention.user.idNumber || 'N/I' }}
            </div>
          </div>
          <div class="d-none d-md-block col-12 col-md-8">
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/'+attention.user.phone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 "></i> {{ attention.user.phone || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto'+attention.user.email"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ attention.user.email || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <i class="bi bi-person-vcard mx-1"></i> {{ attention.user.idNumber || 'N/I' }}
            </div>
          </div>
        </div>
        <hr>
        <!-- PAYMENT -->
        <div class="row centered mt-2">
          <div v-if="getActiveFeature(commerce, 'attention-confirm-payment', 'PRODUCT')">
            <div class="" v-if="attention.paid === true && attention.paymentConfirmationData">
              <div class="">
                <i class="bi bi-check-circle-fill mx-1"> </i> <span class="mb-1">{{ $t("collaboratorBookingsView.paymentData") }}</span>
              </div>
              <div v-if="attention.paymentConfirmationData">
                <span v-if="attention.paymentConfirmationData.paymentType" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ $t(`paymentTypes.${attention.paymentConfirmationData.paymentType}`) }}</span>
                <span v-if="attention.paymentConfirmationData.paymentMethod" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ $t(`paymentClientMethods.${attention.paymentConfirmationData.paymentMethod}`) }}</span>
                <span v-if="attention.paymentConfirmationData.paymentAmount" class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> <i class="bi bi-coin mx-1"> </i> {{ attention.paymentConfirmationData.paymentAmount }}</span>
                <span v-if="attention.paymentConfirmationData.paymentCommission" class="badge rounded-pill yellow-5-area metric-keyword-tag mx-1 fw-bold"> <i class="bi bi-coin mx-1"> </i> {{ attention.paymentConfirmationData.paymentCommission }}</span>
                <span v-if="attention.paymentConfirmationData.paymentDate" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ getDate(attention.paymentConfirmationData.paymentDate) }}</span>
              </div>
              <hr>
            </div>
            <div v-else>
              <h5>
                <span class="centered confirm-payment"
                  href="#"
                  @click.prevent="showPaymentDetails()">
                  <i class="bi bi-cash-coin mx-1"></i> <span class="details-title fw-bold">{{ $t("collaboratorBookingsView.paymentConfirm") }}</span>
                  <i class="dark" :class="`bi ${extendedPaymentEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                </span>
              </h5>
            </div>
            <div
              v-if="!attention.paid"
              :class="{ show: extendedPaymentEntity }"
              class="detailed-data transition-slow">
              <PaymentForm
                :errorsAdd="errorsAdd"
                :receiveData="receiveData"
              >
              </PaymentForm>
              <button class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 mt-2"
                @click="goConfirm()"
                :disabled="attention.paid || !toggles['collaborator.attention.payment-confirm']">
                <i class="bi bi-person-check-fill"> </i> {{ $t("collaboratorBookingsView.confirm") }}
              </button>
              <AreYouSure
                :show="goToConfirm"
                :yesDisabled="toggles['collaborator.attention.payment-confirm']"
                :noDisabled="toggles['collaborator.attention.payment-confirm']"
                @actionYes="confirm()"
                @actionNo="confirmCancel()"
              >
              </AreYouSure>
            </div>
          </div>
        </div>
        <!-- TRANSFER -->
        <div class="row centered mt-1" v-if="getActiveFeature(commerce, 'booking-transfer-queue', 'PRODUCT')">
          <div>
            <h5>
              <span class="centered confirm-payment"
                href="#"
                @click.prevent="showTransferDetails()">
                <i class="bi bi-arrow-left-right mx-1"></i> <span class="step-title fw-bold">{{ $t("collaboratorBookingsView.transferQueue") }}</span>
                <i class="dark" :class="`bi ${extendedTransferEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
              </span>
            </h5>
          </div>
          <div
            :class="{ show: extendedTransferEntity }"
            class="detailed-data transition-slow">
            <div v-if="queuesToTransfer && queuesToTransfer.length > 0">
              <div>
                <div class="text-label my-1">
                  {{ $t("collaboratorBookingsView.selectQueueToTransfer") }}
                </div>
                <select class="btn btn-md btn-light fw-bold text-dark select" aria-label=".form-select-sm" v-model="queueToTransfer">
                  <option v-for="queue in queuesToTransfer" :key="queue.id" :value="queue.id" id="select-block">{{ queue.name }}</option>
                </select>
              </div>
              <button class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 mt-2"
                @click="goTransfer()"
                :disabled="!queueToTransfer || !toggles['collaborator.attention.confirm']">
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
              :yesDisabled="toggles['collaborator.attention.transfer']"
              :noDisabled="toggles['collaborator.attention.transfer']"
              @actionYes="transfer()"
              @actionNo="cancelTransfer()"
            >
            </AreYouSure>
            <hr>
          </div>
        </div>
        <div class="row centered mt-2" v-if="!loading">
          <div class="col-6">
            <button class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-3"
              @click="goCancel()"
              :disabled="attention.status === 'USER_CANCELED' || attention.cancelled || !toggles['collaborator.bookings.cancel']"
              >
              <i class="bi bi-person-x-fill"> </i> {{ $t("collaboratorBookingsView.cancel") }}
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
        </div>
        <div class="row m-0 mt-2 centered" v-if="attention.servicesDetails">
          <span v-for="serv in attention.servicesDetails" :key="serv.id" class="badge rounded-pill bg-primary col-4 fw-bold"> {{ serv.name }}</span>
        </div>
        <div class="row m-0 mt-1 centered">
          <div class="col">
            <span class="metric-card-details mx-1"><strong>Id:</strong> {{ attention.id }}</span>
            <span class="metric-card-details"><strong>Date:</strong> {{ getDate(attention.createdAt) }}</span>
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
  border: 1.5px solid var(--gris-default);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: 0;
  line-height: 1.6rem;
}
.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
  font-size: .8rem;
}
.details-arrow {
  margin: .5rem;
  margin-top: 0;
  border-bottom-left-radius: .5rem;
  border-bottom-right-radius: .5rem;
  line-height: 1.1rem;
  border: 1.5px solid var(--gris-default);
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
.metric-card-title {
  margin: .2rem;
  font-size: .8rem;
  font-weight: 500;
}
.metric-card-subtitle {
  font-size: .8rem;
  font-weight: 500;
}
.metric-card-detail-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: .7rem;
}
.metric-card-detail-subtitle {
  font-size: .72rem;
  font-weight: 400;
  line-height: .7rem;
}
.copy-icon {
  color: var(--gris-default);
  cursor: pointer;
  margin: .2rem;
}
.act-icon {
  color: var(--azul-es);
  cursor: pointer;
  margin: .5rem;
}
.whatsapp-link {
  color: var(--color-text);
  cursor: pointer;
  text-decoration: underline;
}
.whatsapp-link:hover {
  color: var(--gris-default);
  cursor: pointer;
  text-decoration: underline;
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
  line-height: 1rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.confirm-payment {
  cursor: pointer;
}
.step-title {
  text-decoration: underline;
  font-size: .8rem;
  color: var(--color-text);
  cursor: pointer;
}
</style>