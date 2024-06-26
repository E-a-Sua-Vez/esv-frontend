<script>
import Popper from "vue3-popper";
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import { attend, cancelAttention, attentionPaymentConfirm, transferAttention, getPendingCommerceAttentions } from '../../../application/services/attention';
import { getActiveFeature } from '../../../shared/features';
import { getPaymentMethods, getPaymentTypes } from '../../../shared/utils/data';
import { getDate } from '../../../shared/utils/date';
import { getQueueById } from '../../../application/services/queue';
import Warning from '../../common/Warning.vue';
import AreYouSure from '../../common/AreYouSure.vue';
import PaymentForm from '../../payments/PaymentForm.vue';
import Message from '../../common/Message.vue';
import { globalStore } from '../../../stores';

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
    const store = globalStore();
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
      queueToTransfer: {},
      queue: {},
      store
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
      this.extendedTransferEntity = false;
      this.newConfirmationData = {
        processPaymentNow: true
      }
    },
    async showTransferDetails() {
      this.extendedTransferEntity = !this.extendedTransferEntity;
      this.extendedPaymentEntity = false;
      if (this.extendedTransferEntity === true) {
        await this.toTransfer();
      }
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
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
      if (data.processPaymentNow === true && getActiveFeature(this.commerce, 'attention-confirm-payment', 'PRODUCT')) {
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
      this.loading = true;
      if (this.attention && this.attention.queueId) {
        this.queue = await getQueueById(this.attention.queueId);
      }
      const queuesToTransfer = this.queues; //this.queues.filter(queue => queue.type === 'COLLABORATOR');
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
          let limit = 1; //queuesToTransfer.length;
          if (this.queue.serviceInfo !== undefined && this.queue.serviceInfo.blockLimit !== undefined && this.queue.serviceInfo.blockLimit > 0) {
            limit = this.queue.serviceInfo.blockLimit;
          }
          queuesToTransfer.forEach(queue => {
            const attentionsByQueue = groupedAttentions[queue.id];
            if (attentionsByQueue && attentionsByQueue.length > 0) {
              const attentionsReserved = attentionsByQueue.map(attention => {
                if (attention.block) {
                  if (attention.block.blockNumbers && attention.block.blockNumbers.length > 0) {
                    return [...attention.block.blockNumbers];
                  } else {
                    return attention.block.number
                  }
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
              let blocksToCheck = [];
              if (this.attention.block) {
                blocksToCheck = this.attention.block.blockNumbers || [this.attention.block.number];
              }
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
        if (data.procedureNumber !== undefined && data.procedureNumber >= 0) {
          this.newPaymentConfirmationData.procedureNumber = data.procedureNumber;
        }
        if (data.proceduresTotalNumber !== undefined && data.procedureNumber >= 0) {
          this.newPaymentConfirmationData.proceduresTotalNumber = data.proceduresTotalNumber;
        }
        if (data.paymentFiscalNote) {
          this.newPaymentConfirmationData.paymentFiscalNote = data.paymentFiscalNote;
        }
        if (data.paymentType) {
          this.newPaymentConfirmationData.paymentType = data.paymentType;
        }
        if (data.paymentMethod) {
          this.newPaymentConfirmationData.paymentMethod = data.paymentMethod;
        }
        if (data.paymentAmount !== undefined && data.paymentAmount >= 0) {
          this.newPaymentConfirmationData.paymentAmount = data.paymentAmount;
        }
        if (data.totalAmount !== undefined && data.totalAmount >= 0) {
          this.newPaymentConfirmationData.totalAmount = data.totalAmount;
        }
        if (data.installments !== undefined && data.installments >= 0) {
          this.newPaymentConfirmationData.installments = data.installments;
        }
        if (data.paymentCommission !== undefined && data.paymentCommission >= 0) {
          this.newPaymentConfirmationData.paymentCommission = data.paymentCommission;
        }
        if (data.paymentComment) {
          this.newPaymentConfirmationData.paymentComment = data.paymentComment;
        }
        if (data.packageId) {
          this.newPaymentConfirmationData.packageId = data.packageId;
        }
        if (data.pendingPaymentId) {
          this.newPaymentConfirmationData.pendingPaymentId = data.pendingPaymentId;
        }
        if (data.processPaymentNow !== undefined) {
          this.newPaymentConfirmationData.processPaymentNow = data.processPaymentNow;
        }
        if (data.packagePaid !== undefined) {
          this.newPaymentConfirmationData.packagePaid = data.packagePaid;
        }
        if (data.packagePaid !== undefined) {
          this.newPaymentConfirmationData.confirmInstallments = data.confirmInstallments;
        }
        if (data.processPaymentNow === false) {
          this.errorsAdd = [];
        }
      };
    },
    async goToAttention() {
      try {
        this.loading = true;
        this.alertError = '';
        const currentUser = await this.store.getCurrentUser;
        const currentUserType = await this.store.getCurrentUserType;
        if (currentUserType === 'collaborator' && currentUser.id) {
          const body = { queueId: this.attention.queueId, collaboratorId: currentUser.id , commerceLanguage: this.commerce.localeInfo ? this.commerce.localeInfo.language : 'sp'};
          await attend(this.attention.number, body);
          this.$emit('updatedAttentions');
          let url = `/interno/colaborador/atencion/${this.attention.id}/validar`;
          let resolvedRoute = this.$router.resolve({ path: url });
          window.open(resolvedRoute.href, '_blank');
        }

        this.alertError = '';
        this.loading = false;
      } catch (error) {
        this.alertError = error.response.status || 500;
        this.loading = false;
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
  <div v-if="show && attention">
    <div class="row metric-card attention-link"
      :href="`#data-attention-${attention.number}`"
      @click.prevent="showDetails()"
    >
      <div v-if="attention.servicesDetails" class="idNumber-title lefted">
        <span v-for="serv in attention.servicesDetails" :key="serv.id" class="badge service-badge bg-primary p-1"> {{ serv.name }} </span>
        <span v-if="attention.packageId" class="badge bg-secondary service-badge"> <i class="bi bi-box-fill"></i> <span> {{ attention.packageProcedureNumber }} </span> </span>
      </div>
      <div class="col-1 lefted">
        <span class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> {{ attention.number }}</span>
      </div>
      <div class="col lefted fw-bold" v-if="attention.user && attention.user.name">
        {{ attention.user.name.split(' ')[0].toUpperCase() || 'N/I' }}
        <i v-if="attention.status === 'PENDING' && (!attention.paid || attention.paid === false)" class="bi bi-clock-fill icon yellow-icon"> </i>
        <i v-if="attention.status === 'PENDING' && (attention.paid || attention.paid === true)" class="bi bi-check-circle-fill icon green-icon"> </i>
        <i v-if="attention.paymentConfirmationData !== undefined && attention.paymentConfirmationData.paid === true" class="bi bi-coin icon blue-icon"> </i>
        <i v-if="attention.productCounter > 0" class="bi bi-eyedropper"> </i>
        <i v-if="attention.termsConditionsAcceptedCode" class="bi bi-person-fill-check mx-1"></i>
      </div>
      <div class="col centered hour-title" v-if="attention.block && attention.block.hourFrom">
        <span> {{ attention.block.hourFrom }} - {{ attention.block.hourTo }} </span>
      </div>
      <div class="col-1 centered date-title">
        <div class="centered">
          <span
            href="#"
            @click.prevent="showDetails()">
            <span class="details-title"></span>
            <i class="dark" :class="`bi ${extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
          </span>
        </div>
      </div>
    </div>
    <div class="details-arrow">
      <div class="centered mb-2">
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
                <i class="bi bi-whatsapp mx-1 whatsapp-icon"></i> {{ attention.user.phone || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto:'+attention.user.email"
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
                <i class="bi bi-whatsapp mx-1 whatsapp-icon"></i> {{ attention.user.phone || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto:'+attention.user.email"
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
        <div class="row mx-1 centered" v-if="attention.paid === true && attention.paymentConfirmationData">
          <div class="">
            <i class="bi bi-check-circle-fill mx-1"> </i> <span class="mb-1">{{ $t("collaboratorBookingsView.paymentData") }}</span>
          </div>
          <div v-if="attention.paymentConfirmationData">
            <span v-if="attention.paymentConfirmationData.proceduresTotalNumber && attention.paymentConfirmationData.procedureNumber" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ attention.paymentConfirmationData.procedureNumber }} {{ $t('collaboratorBookingsView.procedureNumber')}} {{ attention.paymentConfirmationData.proceduresTotalNumber }}</span>
            <span v-if="attention.paymentConfirmationData.paymentFiscalNote" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ $t(`paymentFiscalNotes.${attention.paymentConfirmationData.paymentFiscalNote}`) }}</span>
            <span v-if="attention.paymentConfirmationData.paymentType" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ $t(`paymentTypes.${attention.paymentConfirmationData.paymentType}`) }}</span>
            <span v-if="attention.paymentConfirmationData.paymentMethod" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ $t(`paymentClientMethods.${attention.paymentConfirmationData.paymentMethod}`) }}</span>
            <span v-if="attention.paymentConfirmationData.paymentAmount" class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> <i class="bi bi-coin mx-1"> </i> {{ attention.paymentConfirmationData.paymentAmount }}</span>
            <span v-if="attention.paymentConfirmationData.paymentCommission" class="badge rounded-pill yellow-5-area metric-keyword-tag mx-1 fw-bold"> <i class="bi bi-coin mx-1"> </i> {{ attention.paymentConfirmationData.paymentCommission }}</span>
            <span v-if="attention.paymentConfirmationData.paymentDate" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ getDate(attention.paymentConfirmationData.paymentDate) }}</span>
          </div>
          <hr>
        </div>
        <div class="row mx-1 centered">
          <!-- PAYMENT -->
          <div  class="col-6" v-if="getActiveFeature(commerce, 'attention-confirm-payment', 'PRODUCT')">
            <div>
              <h5>
                <span class="centered confirm-payment"
                  href="#"
                  @click.prevent="showPaymentDetails()">
                  <i class="bi bi-cash-coin icon"></i> <span class="step-title fw-bold">{{ $t("collaboratorBookingsView.paymentConfirm") }}</span>
                  <i class="dark" :class="`bi ${extendedPaymentEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                </span>
                <div v-if="extendedPaymentEntity" class="index"></div>
              </h5>
            </div>
          </div>
          <!-- TRANSFER -->
          <div class="col-6" v-if="getActiveFeature(commerce, 'attention-transfer-queue', 'PRODUCT')">
            <div>
              <h5>
                <span class="centered confirm-payment"
                  href="#"
                  @click.prevent="showTransferDetails()">
                  <i class="bi bi-arrow-left-right icon"></i> <span class="step-title fw-bold">{{ $t("collaboratorBookingsView.transferQueue") }}</span>
                  <i class="dark" :class="`bi ${extendedTransferEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                </span>
                <div v-if="extendedTransferEntity" class="index"></div>
              </h5>
            </div>
          </div>
        </div>
        <!-- PAYMENT -->
        <div class="row centered">
          <div>
            <div
            :class="{ show: extendedPaymentEntity }"
            class="detailed-data transition-slow">
              <div
                v-if="!attention.paid"
                :class="{ show: extendedPaymentEntity }"
                class="detailed-data transition-slow">
                <PaymentForm
                  :id="attention.id"
                  :commerce="commerce"
                  :clientId="attention.clientId"
                  :confirmPayment="getActiveFeature(commerce, 'attention-confirm-payment', 'PRODUCT')"
                  :errorsAdd="errorsAdd"
                  :receiveData="receiveData"
                >
                </PaymentForm>
                <button class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 mt-2 card-action"
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
              <div v-else>
                <Message
                    :title="$t('collaboratorBookingsView.message.8.title')"
                    :content="$t('collaboratorBookingsView.message.8.content')" />
              </div>
            </div>
          </div>
        </div>
        <!-- TRANSFER -->
        <div class="row centered mt-1" v-if="getActiveFeature(commerce, 'attention-transfer-queue', 'PRODUCT')">
          <div
            :class="{ show: extendedTransferEntity }"
            class="detailed-data transition-slow">
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
                <select class="btn btn-sm btn-light fw-bold text-dark select" aria-label=".form-select-sm" v-model="queueToTransfer">
                  <option v-for="queue in queuesToTransfer" :key="queue.id" :value="queue.id" id="select-block">{{ queue.name }}</option>
                </select>
              </div>
              <button class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 mt-2 card-action"
                @click="goTransfer()"
                :disabled="!queueToTransfer || !toggles['collaborator.attention.transfer']">
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
        <div class="row mt-2" v-if="!loading">
          <div class="col-6">
            <button class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2 card-action"
              @click="goToAttention()"
              :disabled="attention.status === 'USER_CANCELED' || attention.cancelled || !toggles['collaborator.attention.attend']"
              >
              <i class="bi bi-qr-code"> </i> {{ $t("collaboratorBookingsView.attend") }}
            </button>
          </div>
          <div class="col-6">
            <button class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-2 card-action"
              @click="goCancel()"
              :disabled="attention.status === 'USER_CANCELED' || attention.cancelled || !toggles['collaborator.attention.cancel']"
              >
              <i class="bi bi-person-x-fill"> </i> {{ $t("collaboratorBookingsView.cancel") }}
            </button>
          </div>
          <AreYouSure
            :show="goToCancel"
            :yesDisabled="toggles['collaborator.attention.cancel']"
            :noDisabled="toggles['collaborator.attention.cancel']"
            @actionYes="cancel()"
            @actionNo="cancelCancel()"
          >
          </AreYouSure>
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
  margin: .5rem;
  margin-bottom: 0;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: 0;
  line-height: 1.2rem;
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
  padding: 1px;
  max-height: 600px !important;
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
}
.step-title {
  font-size: .7rem;
  line-height: .7rem;
  color: var(--color-text);
  cursor: pointer;
}
.hour-title {
  font-size: .8rem;
  font-weight: 500;
  line-height: .9rem;
  letter-spacing: .01px;
}
.icon {
  margin-left: .1rem;
  margin-right: .15rem;
}
.index {
  background-color: var(--azul-qr);
  padding: .05rem;
  margin-top: .25rem;
  border-radius: .5rem !important;
  margin-left: 5rem;
  margin-right: 5rem;
}
.attention-link {
  cursor: pointer;
}
</style>