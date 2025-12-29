<script>
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import {
  attend,
  cancelAttention,
  attentionPaymentConfirm,
  transferAttention,
  getPendingCommerceAttentions,
  advanceStage,
} from '../../../application/services/attention';
import { getActiveFeature } from '../../../shared/features';
import { getPaymentMethods, getPaymentTypes } from '../../../shared/utils/data';
import { getDate } from '../../../shared/utils/date';
import { getQueueById } from '../../../application/services/queue';
import { ATTENTION_STATUS } from '../../../shared/constants';
import Warning from '../../common/Warning.vue';
import AreYouSure from '../../common/AreYouSure.vue';
import PaymentForm from '../../payments/PaymentForm.vue';
import Message from '../../common/Message.vue';
import TelemedicineSessionStarter from '../../telemedicine/domain/TelemedicineSessionStarter.vue';
import TelemedicineVideoCall from '../../telemedicine/domain/TelemedicineVideoCall.vue';
import TelemedicineChat from '../../telemedicine/domain/TelemedicineChat.vue';
import TelemedicineFloatingWindow from '../../telemedicine/domain/TelemedicineFloatingWindow.vue';
import {
  getTelemedicineSession,
  getTelemedicineSessionById,
} from '../../../application/services/telemedicine';
import { globalStore } from '../../../stores';

export default {
  name: 'AttentionDetailsCard',
  components: {
    Popper,
    Spinner,
    Warning,
    AreYouSure,
    PaymentForm,
    Message,
    TelemedicineSessionStarter,
    TelemedicineVideoCall,
    TelemedicineChat,
    TelemedicineFloatingWindow,
  },
  props: {
    show: { type: Boolean, default: true },
    attention: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    queues: { type: Array, default: undefined },
    disableClick: { type: Boolean, default: false },
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
      goToAdvanceStage: false,
      selectedNextStage: '',
      stageNotes: '',
      checked: false,
      queuesToTransfer: [],
      queueToTransfer: null,
      queue: {},
      store,
      ATTENTION_STATUS, // Expose ATTENTION_STATUS to template
      showTelemedicineVideo: false,
      showTelemedicineChat: false,
      telemedicineSessionType: null,
      clientConnected: false,
      telemedicineSession: null,
      connectionStatusInterval: null,
    };
  },
  beforeMount() {
    this.paymentTypes = getPaymentTypes();
    this.paymentMethods = getPaymentMethods();
    if (this.attention?.telemedicineSessionId) {
      this.loadTelemedicineSessionDetails();
    }
  },
  watch: {
    'attention.telemedicineSessionId': {
      handler(newVal) {
        if (newVal) {
          this.loadTelemedicineSessionDetails();
        } else {
          this.telemedicineSession = null;
        }
      },
      immediate: false,
    },
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
  beforeUnmount() {
    // Clean up polling interval
    this.stopConnectionStatusPolling();
  },
  emits: ['open-modal', 'updatedAttentions'],
  methods: {
    showDetails() {
      // Emit event to parent to open modal instead of expanding inline
      this.$emit('open-modal', this.attention);
    },
    showPaymentDetails() {
      this.extendedPaymentEntity = !this.extendedPaymentEntity;
      this.extendedTransferEntity = false;
      this.newConfirmationData = {
        processPaymentNow: true,
      };
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
      if (
        data.processPaymentNow === true &&
        getActiveFeature(this.commerce, 'attention-confirm-payment', 'PRODUCT')
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
        if (this.attention && this.attention.id) {
          if (this.validateConfirm(this.newPaymentConfirmationData)) {
            const body = {
              paymentConfirmationData: {
                paid: true,
                paymentDate: new Date(),
                ...this.newPaymentConfirmationData,
              },
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
      try {
        this.loading = true;
        // Reset queuesToTransfer
        this.queuesToTransfer = [];
        this.queueToTransfer = null;

        if (this.attention && this.attention.queueId) {
          try {
            this.queue = await getQueueById(this.attention.queueId);
          } catch (error) {
            console.error('Error loading queue:', error);
            this.queue = {};
          }
        }

        const queuesToTransfer = this.queues; //this.queues.filter(queue => queue.type === 'COLLABORATOR');
        if (!queuesToTransfer || queuesToTransfer.length === 0) {
          this.loading = false;
          return;
        }

        if (!this.commerce || !this.commerce.id) {
          console.error('Commerce or commerce.id is not available');
          // If commerce is not available, just add all queues
          this.queuesToTransfer = [...queuesToTransfer];
          this.loading = false;
          return;
        }

        try {
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
            if (
              this.queue.serviceInfo !== undefined &&
              this.queue.serviceInfo.blockLimit !== undefined &&
              this.queue.serviceInfo.blockLimit > 0
            ) {
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
                      return attention.block.number;
                    }
                  }
                });
                const totalBlocksReserved = attentionsReserved.flat(Infinity).sort();
                const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
                const blockedBlocks = [];
                uniqueBlocksReserved.forEach(block => {
                  const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                  if (times >= limit - 1) {
                    blockedBlocks.push(block);
                  }
                });
                let blocksToCheck = [];
                if (this.attention.block) {
                  blocksToCheck = this.attention.block.blockNumbers || [
                    this.attention.block.number,
                  ];
                }
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
          } else {
            // If no attentions, add all queues
            this.queuesToTransfer = [...queuesToTransfer];
          }
        } catch (error) {
          console.error('Error loading pending attentions:', error);
          // On error, add all queues as fallback
          this.queuesToTransfer = [...queuesToTransfer];
        }
      } catch (error) {
        console.error('Error in toTransfer:', error);
        this.alertError = error.message || 'Error al cargar las filas para transferir';
      } finally {
        this.loading = false;
      }
    },
    async transfer() {
      try {
        this.loading = true;
        if (!this.attention || !this.attention.id) {
          throw new Error('Atención no disponible');
        }
        if (!this.queueToTransfer) {
          throw new Error('Por favor seleccione una fila para transferir');
        }
        const body = {
          queueId: this.queueToTransfer,
        };
        await transferAttention(this.attention.id, body);
        this.$emit('updatedAttentions');
        this.goToTransfer = false;
        this.queueToTransfer = null;
        this.queuesToTransfer = [];
      } catch (error) {
        console.error('Error transferring attention:', error);
        this.alertError = error.message || 'Error al transferir la atención';
      } finally {
        this.loading = false;
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
    goAdvanceStage() {
      this.goToAdvanceStage = !this.goToAdvanceStage;
      if (this.goToAdvanceStage) {
        this.selectedNextStage = '';
        this.stageNotes = '';
      }
    },
    cancelAdvanceStage() {
      this.goToAdvanceStage = false;
      this.selectedNextStage = '';
      this.stageNotes = '';
    },
    async confirmAdvanceStage() {
      if (!this.selectedNextStage) {
        this.alertError =
          this.$t('attention.advanceStage.selectStage') || 'Por favor selecciona una etapa';
        return;
      }
      try {
        this.loading = true;
        this.alertError = '';
        if (this.attention && this.attention.id) {
          const body = {
            stage: this.selectedNextStage,
            notes: this.stageNotes || undefined,
          };
          await advanceStage(this.attention.id, body);
          this.$emit('updatedAttentions');
          this.goToAdvanceStage = false;
          this.selectedNextStage = '';
          this.stageNotes = '';
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.alertError =
          error.response?.data?.message || error.message || 'Error al avanzar etapa';
      }
    },
    getNextStages(currentStage) {
      // Define transiciones válidas (puede ser más estricto en el futuro)
      const stageFlow = {
        PENDING: ['CHECK_IN'],
        CHECK_IN: ['PRE_CONSULTATION'],
        PRE_CONSULTATION: ['CONSULTATION'],
        CONSULTATION: ['POST_CONSULTATION'],
        POST_CONSULTATION: ['CHECKOUT'],
        CHECKOUT: ['TERMINATED'],
      };
      return stageFlow[currentStage] || [];
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
      }
    },
    async goToAttention() {
      try {
        this.loading = true;
        this.alertError = '';
        const currentUser = await this.store.getCurrentUser;
        const currentUserType = await this.store.getCurrentUserType;
        if (currentUserType === 'collaborator' && currentUser.id) {
          const body = {
            queueId: this.attention.queueId,
            collaboratorId: currentUser.id,
            commerceLanguage: this.commerce.localeInfo ? this.commerce.localeInfo.language : 'sp',
          };
          await attend(this.attention.number, body);
          this.$emit('updatedAttentions');
          const url = `/interno/colaborador/atencion/${this.attention.id}/validar`;
          const resolvedRoute = this.$router.resolve({ path: url });
          window.open(resolvedRoute.href, '_blank');
        }

        this.alertError = '';
        this.loading = false;
      } catch (error) {
        this.alertError = error.response.status || 500;
        this.loading = false;
      }
    },
    async handleTelemedicineSessionStarted(data) {
      // Abrir componente de video o chat según el tipo
      this.telemedicineSessionType = data.type;

      // Load session details to get recording status and connection info
      try {
        if (this.attention.telemedicineSessionId) {
          this.telemedicineSession = await getTelemedicineSession(
            this.attention.telemedicineSessionId
          );
          // Start polling for connection status
          this.startConnectionStatusPolling();
        }
      } catch (err) {
        console.error('Error loading telemedicine session:', err);
      }

      if (data.type === 'video' || data.type === 'both') {
        this.showTelemedicineVideo = true;
      }
      if (data.type === 'chat' || data.type === 'both') {
        this.showTelemedicineChat = true;
      }
      this.$emit('updatedAttentions');
    },
    startConnectionStatusPolling() {
      // Poll every 3 seconds for connection status
      if (this.connectionStatusInterval) {
        clearInterval(this.connectionStatusInterval);
      }
      this.connectionStatusInterval = setInterval(async () => {
        if (this.attention?.telemedicineSessionId) {
          try {
            const session = await getTelemedicineSession(this.attention.telemedicineSessionId);
            this.telemedicineSession = session;
            // Check if client has validated access key (indicates they're likely connected)
            this.clientConnected = session.accessKeyValidated || false;
          } catch (err) {
            console.error('Error polling connection status:', err);
          }
        }
      }, 3000);
    },
    stopConnectionStatusPolling() {
      if (this.connectionStatusInterval) {
        clearInterval(this.connectionStatusInterval);
        this.connectionStatusInterval = null;
      }
    },
    handleTelemedicineError(error) {
      console.error('Telemedicine error:', error);
      this.alertError = error.message || 'Error en telemedicina';
    },
    closeTelemedicineVideo() {
      this.showTelemedicineVideo = false;
      this.telemedicineSessionType = null;
      this.stopConnectionStatusPolling();
    },
    closeTelemedicineChat() {
      this.showTelemedicineChat = false;
      this.telemedicineSessionType = null;
      this.stopConnectionStatusPolling();
    },
    formatTelemedicineDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        dateStyle: 'long',
        timeStyle: 'short',
      });
    },
    getTelemedicineStatusText(status) {
      const statusMap = {
        scheduled: this.$t('telemedicineSession.statusScheduled'),
        active: this.$t('telemedicineSession.statusActive'),
        completed: this.$t('telemedicineSession.statusCompleted'),
        cancelled: this.$t('telemedicineSession.statusCancelled'),
      };
      return statusMap[status] || status;
    },
    getTelemedicineStatusClass(status) {
      const classMap = {
        scheduled: 'text-info',
        active: 'text-success',
        completed: 'text-secondary',
        cancelled: 'text-danger',
      };
      return classMap[status] || '';
    },
    formatTelemedicineTime(date) {
      if (!date) return 'N/A';
      return new Date(date).toLocaleString('es-ES');
    },
    getAccessKeyActivationTime() {
      if (!this.telemedicineSession?.scheduledAt) return null;
      const scheduledTime = new Date(this.telemedicineSession.scheduledAt);
      const activationTime = new Date(scheduledTime.getTime() - 10 * 60 * 1000); // 10 minutes before
      return activationTime;
    },
    isAccessKeyActivated() {
      const activationTime = this.getAccessKeyActivationTime();
      if (!activationTime) return false;
      return new Date() >= activationTime;
    },
    getTimeUntilActivation() {
      const activationTime = this.getAccessKeyActivationTime();
      if (!activationTime) return null;
      const now = new Date();
      const diff = activationTime.getTime() - now.getTime();
      if (diff <= 0) return null;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return `${days} día${days > 1 ? 's' : ''}`;
      if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''}`;
      return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    },
    getClientAccessLink() {
      if (!this.attention || !this.attention.telemedicineSessionId) return '';
      const baseUrl = window.location.origin;
      return `${baseUrl}/publico/telemedicina/${this.attention.telemedicineSessionId}`;
    },
    copyClientAccessLink(attentionId) {
      const input = document.getElementById(`telemedicine-link-${attentionId}`);
      if (input) {
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices
        navigator.clipboard
          .writeText(input.value)
          .then(() => {
            // Show success message (you can use a toast library here)
            alert('Enlace copiado al portapapeles');
          })
          .catch(err => {
            console.error('Error copying link:', err);
          });
      }
    },
  },
};
</script>

<template>
  <div v-if="show && attention">
    <div
      class="row metric-card"
      :class="disableClick ? '' : 'attention-link'"
      :href="disableClick ? undefined : `#data-attention-${attention.number}`"
      @click.prevent="disableClick ? null : showDetails()"
    >
      <div v-if="attention.servicesDetails" class="idNumber-title lefted">
        <span
          v-for="serv in attention.servicesDetails"
          :key="serv.id"
          class="badge service-badge bg-primary p-1"
        >
          {{ serv.name }}
        </span>
        <span v-if="attention.packageId" class="badge bg-secondary service-badge">
          <i class="bi bi-box-fill"></i> <span> {{ attention.packageProcedureNumber }} </span>
        </span>
      </div>
      <div class="col-1 lefted">
        <span class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold">
          {{ attention.number }}</span
        >
        <span
          v-if="
            getActiveFeature(commerce, 'attention-stages-enabled', 'PRODUCT') &&
            attention.currentStage
          "
          class="badge rounded-pill bg-info stage-badge mx-1 fw-bold"
          :title="$t(`attention.stage.${attention.currentStage}`)"
        >
          {{ $t(`attention.stage.${attention.currentStage}`) }}
        </span>
      </div>
      <div class="col lefted fw-bold" v-if="attention.user && attention.user.name">
        {{ attention.user.name.split(' ')[0].toUpperCase() || 'N/I' }}
        <i
          v-if="
            attention.status === ATTENTION_STATUS.PENDING &&
            (!attention.paid || attention.paid === false)
          "
          class="bi bi-clock-fill icon yellow-icon"
        >
        </i>
        <i
          v-if="
            attention.status === ATTENTION_STATUS.PENDING &&
            (attention.paid || attention.paid === true)
          "
          class="bi bi-check-circle-fill icon green-icon"
        >
        </i>
        <i
          v-if="
            attention.paymentConfirmationData !== undefined &&
            attention.paymentConfirmationData.paid === true
          "
          class="bi bi-coin icon blue-icon"
        >
        </i>
        <i v-if="attention.productCounter > 0" class="bi bi-eyedropper"> </i>
        <i v-if="attention.termsConditionsAcceptedCode" class="bi bi-person-fill-check mx-1"></i>
      </div>
      <div class="col centered hour-title" v-if="attention.block && attention.block.hourFrom">
        <span> {{ attention.block.hourFrom }} - {{ attention.block.hourTo }} </span>
      </div>
      <div class="col-1 centered date-title">
        <div class="centered">
          <span href="#" @click.prevent="showDetails()">
            <span class="details-title"></span>
            <i
              class="dark"
              :class="`bi ${extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"
            ></i>
          </span>
        </div>
      </div>
    </div>
    <!-- Inline details removed - now using modal for details display -->

    <!-- Floating Telemedicine Windows (for doctor to work while video is active) -->
    <TelemedicineFloatingWindow
      v-if="showTelemedicineVideo && attention.telemedicineSessionId"
      :show="showTelemedicineVideo"
      title="Consulta Virtual - Video"
      icon-class="bi-camera-video"
      :is-connected="true"
      :is-connecting="false"
      :client-connected="clientConnected"
      @close="closeTelemedicineVideo"
    >
      <TelemedicineVideoCall
        :session-id="attention.telemedicineSessionId"
        :current-user-id="store.getCurrentUser?.id || ''"
        :user-type="'doctor'"
        :show-close="false"
        :recording-enabled="
          telemedicineSession?.recordingEnabled ||
          attention.telemedicineConfig?.recordingEnabled ||
          false
        "
        :client-connected="clientConnected"
        @close="closeTelemedicineVideo"
        @call-ended="closeTelemedicineVideo"
      />
    </TelemedicineFloatingWindow>

    <TelemedicineFloatingWindow
      v-if="showTelemedicineChat && attention.telemedicineSessionId"
      :show="showTelemedicineChat"
      title="Consulta Virtual - Chat"
      icon-class="bi-chat-dots"
      :is-connected="true"
      :is-connecting="false"
      :client-connected="clientConnected"
      :initial-position="{ x: 520, y: 20 }"
      @close="closeTelemedicineChat"
    >
      <TelemedicineChat
        :session-id="attention.telemedicineSessionId"
        :current-user-id="store.getCurrentUser?.id || ''"
        :user-type="'doctor'"
        :show-close="false"
        @close="closeTelemedicineChat"
      />
    </TelemedicineFloatingWindow>
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  margin: 0.5rem;
  margin-bottom: 0;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: 0;
  line-height: 1.2rem;
}
.details-arrow {
  margin: 0.5rem;
  margin-top: 0;
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  line-height: 1.1rem;
  border: 0.5px solid var(--gris-default);
  border-top: 0;
}
.show {
  padding: 1px;
  max-height: 600px !important;
  overflow-y: auto;
}
.details-title {
  text-decoration: underline;
  font-size: 0.8rem;
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
.stage-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
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
}
.step-title {
  font-size: 0.7rem;
  line-height: 0.7rem;
  color: var(--color-text);
  cursor: pointer;
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
.index {
  background-color: var(--azul-qr);
  padding: 0.05rem;
  margin-top: 0.25rem;
  border-radius: 0.5rem !important;
  margin-left: 5rem;
  margin-right: 5rem;
}
.attention-link {
  cursor: pointer;
}
</style>
