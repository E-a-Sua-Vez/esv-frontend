<script>
import { ref } from 'vue';
import LoadingState from '../../components/common/LoadingState.vue';
import Warning from '../../components/common/Warning.vue';
import NoDeviceAttentionNumber from '../../components/common/NoDeviceAttentionNumber.vue';
import QueueName from '../../components/common/QueueName.vue';
import Message from '../../components/common/Message.vue';
import { createAttention } from '../../application/services/attention';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getActiveFeature } from '../../shared/features';
import { USER_TYPES } from '../../shared/constants';

export default {
  name: 'NoDeviceAttention',
  components: { LoadingState, Warning, NoDeviceAttentionNumber, QueueName, Message },
  data() {
    const store = globalStore();
    const router = useRouter();
    return {
      userName: undefined,
      userType: '',
      currentUser: undefined,
      currentChannel: 'QR',
      loading: false,
      attention: undefined,
      alertError: '',
      errors: [],
      store,
      queue: undefined,
      commerce: undefined,
      router,
      attentions: ref([]),
      newAttentions: [],
      bookingHourActive: false,
      attentionBlock: {},
      availableAttentionBlocks: [],
      date: undefined,
      attentionAvailable: true,
    };
  },
  methods: {
    closeModal() {
      this.$emit('close-modal');
      this.attention = undefined;
      this.userName = undefined;
      this.attentionBlock = {};
    },
    async getAttention(block) {
      try {
        this.loading = true;
        this.alertError = '';
        this.errors = [];
        if (this.userName !== undefined && this.userName.length > 0) {
          const currentUser = await this.store.getCurrentUser;
          const user = {
            name: this.userName,
            assistingCollaboratorId: currentUser.id,
            queueId: this.queue.id,
            commerceId: this.commerce.id,
          };
          let body = {
            queueId: this.queue.id,
            channel: this.currentChannel,
            user,
            type: 'NODEVICE',
          };
          if (block && block.number) {
            body = { ...body, block };
          }
          this.attention = await createAttention(body);
        } else {
          this.errors.push('noDeviceAttention.validate.name');
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    },
    getUserType() {
      this.userType = this.store.getCurrentUserType;
    },
    getQueue() {
      this.queue = this.store.getCurrentQueue;
      if (getActiveFeature(this.commerce, 'booking-block-active', 'PRODUCT')) {
        if (this.queue && this.queue.id) {
          this.date = undefined;
          this.getAttentions();
          this.availableAttentionBlocks = this.getAvailableAttentionBlocks(this.attentions);
          const blockAvailable = this.availableAttentionBlocks.filter(
            block => block.number === this.attentionBlock.number
          );
          if (!blockAvailable || blockAvailable.length === 0) {
            this.attentionAvailable = false;
          } else {
            this.attentionAvailable = true;
          }
        }
      }
    },
    getActiveFeature() {
      this.bookingHourActive = getActiveFeature(this.commerce, 'booking-block-active', 'PRODUCT');
    },
    getActualDay(day, timeZoneIn) {
      const dateCorrected = new Date(
        new Date(day).toLocaleString('en-US', {
          timeZone: timeZoneIn,
        })
      );
      return dateCorrected;
    },
    getAvailableAttentionBlocks(attentions) {
      let queueBlocks = [];
      let availableBlocks = [];
      if (this.queue && this.queue.serviceInfo && this.queue.serviceInfo.blocks) {
        const timeZone =
          this.commerce && this.commerce.localeInfo
            ? this.commerce.localeInfo.timezone
            : 'America/Sao_Paulo';
        queueBlocks = this.queue.serviceInfo.blocks;
        queueBlocks = queueBlocks.filter(block => {
          const hourBlock = parseInt(block.hourFrom.split(':')[0]);
          const minBlock = parseInt(block.hourFrom.split(':')[1]);
          const day = new Date(this.getActualDay(new Date(), timeZone)).getTime();
          const dayBlock = new Date(day).setHours(hourBlock, minBlock, 0);
          return dayBlock > day;
        });
        if (queueBlocks && queueBlocks.length > 0) {
          let attentionsReserved = 0;
          if (attentions && attentions.length > 0) {
            attentionsReserved = attentions.map(attention => attention.number);
            availableBlocks = queueBlocks.filter(
              block => !attentionsReserved.includes(block.number)
            );
          } else {
            availableBlocks = queueBlocks;
          }
        }
      }
      return availableBlocks;
    },
    getAttentions() {
      this.attentions = this.store.getCurrentActiveAttentions;
    },
    getCommerce() {
      this.commerce = this.store.getCurrentCommerce;
    },
    getCurrentUser() {
      this.currentUser = this.store.getCurrentUser;
    },
    getCurrentAttentionChannel() {
      this.currentChannel = this.store.getCurrentAttentionChannel;
    },
    isCollabotator() {
      return this.userType === USER_TYPES.COLLABORATOR;
    },
    isQueueSelected() {
      return this.store.currentQueue !== undefined;
    },
  },
  beforeMount() {
    this.getUserType();
    this.getQueue();
    this.getCurrentUser();
    this.getCommerce();
    this.getAttentions();
    this.getActiveFeature();
  },
  computed: {
    changeData() {
      const { store, queue, attentionBlock } = this;
      return {
        store,
        queue,
        attentionBlock,
      };
    },
  },
  watch: {
    changeData: {
      immediate: true,
      deep: true,
      handler() {
        this.getAttentions();
        this.getUserType();
        this.getQueue();
        this.getCommerce();
        this.getActiveFeature();
      },
    },
  },
};
</script>

<template>
  <div v-if="isCollabotator() && isQueueSelected()" id="noDeviceAttention" class="card mb-4">
    <p class="mb-2 details">
      <span class="fw-bold">{{ $t('noDeviceAttention.subtitle.1.1') }}</span>
    </p>
    <QueueName :queue="queue"></QueueName>
    <span v-if="!attention" class="details-subtitle my-1 mt-2">{{
      $t('noDeviceAttention.subtitle.1.2')
    }}</span>
    <div class="mb-2">
      <div v-if="!attention" class="col-12">
        <input
          type="text"
          class="form-control mb-1"
          id="attention-number-nodevice"
          placeholder="Ej: José López"
          v-model="userName"
        />
        <div id="attention-hour" v-if="this.bookingHourActive" class="my-2 mb-3">
          <div v-if="availableAttentionBlocks.length > 0">
            <div class="details-subtitle my-1">
              <span> {{ $t('noDeviceAttention.subtitle.1.3') }} </span>
            </div>
            <div>
              <select
                class="btn btn-md btn-light fw-bold text-dark select"
                aria-label=".form-select-sm"
                v-model="this.attentionBlock"
              >
                <option
                  v-for="block in availableAttentionBlocks"
                  :key="block.number"
                  :value="block"
                  id="select-block"
                >
                  {{ block.hourFrom }} - {{ block.hourTo }}
                </option>
              </select>
            </div>
          </div>
          <div v-else>
            <Message
              :title="$t('noDeviceAttention.message.2.title')"
              :content="$t('noDeviceAttention.message.2.content')"
              :icon="'bi bi-exclamation-triangle-fill'"
            >
            </Message>
          </div>
        </div>
        <div v-if="this.bookingHourActive">
          <button
            class="btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4"
            @click="getAttention(this.attentionBlock)"
            :disabled="!userName || !attentionAvailable || !attentionBlock.number"
          >
            {{ $t('noDeviceAttention.actions.1') }}
            <i class="bi bi-ticket-detailed"></i>
          </button>
        </div>
        <div v-else>
          <button
            class="btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-2"
            @click="getAttention(undefined)"
            :disabled="!userName"
          >
            {{ $t('noDeviceAttention.actions.1') }} <i class="bi bi-ticket-detailed"></i>
          </button>
        </div>
        <LoadingState :loading="loading" :error="alertError">
          <div class="errors" id="feedback" v-if="errors.length > 0">
            <Warning>
              <template v-slot:message>
                <li v-for="(error, index) in errors" :key="index">
                  {{ $t(error) }}
                </li>
              </template>
            </Warning>
          </div>
        </LoadingState>
      </div>
      <div v-else>
        <div id="attention" class="my-2">
          <NoDeviceAttentionNumber
            :number="attention.number"
            :name="attention.userName || userName"
          ></NoDeviceAttentionNumber>
        </div>
        <Message
          :title="$t('noDeviceAttention.message.1.title')"
          :content="$t('noDeviceAttention.message.1.content')"
          :icon="'bi bi-exclamation-triangle-fill'"
        >
        </Message>
        <a
          class="btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4"
          @click="closeModal()"
          >{{ $t('noDeviceAttention.actions.2') }} <i class="bi bi-check-all"></i
        ></a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.details {
  font-size: 1.2rem;
  line-height: 1rem;
}
.details-subtitle {
  font-size: 0.9rem;
  line-height: 1rem;
}
.card {
  background-color: var(--color-background);
  margin-top: 1rem;
  margin-bottom: 1rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  padding: 1rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
}
</style>
