<script>
import { ref, reactive, onBeforeMount, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getCommerceById } from '../../application/services/commerce';
import { getCollaboratorById } from '../../application/services/collaborator';
import { VueRecaptcha } from 'vue-recaptcha';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import { dateYYYYMMDD } from '../../shared/utils/date';
import { bookingCollection } from '../../application/firebase';
import BookingDetailsCard from '../../components/bookings/BookingDetailsCard.vue';

export default {
  name: 'CollaboratorQueueBookings',
  components: { CommerceLogo, Message, PoweredBy, VueRecaptcha, Spinner, Alert, ToggleCapabilities, BookingDetailsCard },
  async setup() {
    const router = useRouter();
    const route = useRoute();

    const siteKey = import.meta.env.VITE_RECAPTCHA_INVISIBLE;
    const captchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED || false;

    const { id } = route.params;

    let loading = ref(false);
    let alertError = ref('');
    let dateMask = ref({
      modelValue: 'YYYY-MM-DD',
    });
    let disabledDates = ref([
      {
        repeat: {
          weekdays: [],
        }
      }
    ]);
    let unsubscribeBookings = () => {};

    const store = globalStore();

    const state = reactive({
      currentUser: {},
      queue: {},
      queues: [],
      commerce: {},
      collaborator: {},
      module: {},
      activeCommerce: false,
      captcha: false,
      locale: 'es',
      date: (new Date()).setDate(new Date().getDate() + 1),
      bookings: ref([]),
      bookingAvailable: true,
      availableBlocks: [],
      minDate: (new Date()).setDate(new Date().getDate() - 30),
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.commerce = await store.getCurrentCommerce;
        if (!state.commerce) {
          state.commerce = await getCommerceById(state.currentUser.commerceId);
        }
        state.locale = state.commerce.localeInfo.language;
        state.queues = state.commerce.queues;
        state.collaborator = await getCollaboratorById(state.currentUser.id);
        store.setCurrentCommerce(state.commerce);
        store.setCurrentQueue(undefined);
        state.toggles = await getPermissions('collaborator');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status;
        loading.value = false;
      }
    })

    const isActiveCommerce = () => {
      return state.commerce && state.commerce.active === true && state.commerce.queues.length > 0;
    };

    const getLineAttentions = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        store.setCurrentQueue(state.queue);
        router.push({ path: `/interno/colaborador/fila/${state.queue.id}/atenciones` });
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };

    const getQueue = async (queueIn) => {
      state.queue = queueIn;
      store.setCurrentQueue(state.queue);
      if (state.queue.id) {
        let disabled = [1, 2, 3, 4, 5, 6, 7];
        if (state.queue.serviceInfo && state.queue.serviceInfo.attentionDays) {
          const availableDays = state.queue.serviceInfo.attentionDays;
          if (availableDays.length < 7) {
            const forDeletion = [];
            availableDays.forEach(day => {
              if (day === 7) {
                forDeletion.push(1);
              } else {
                forDeletion.push(7 - day);
              }
            })
            disabled = disabled.filter(item => !forDeletion.includes(item));
            disabledDates.value[0].repeat.weekdays.push(...disabled);
          }
        }
      }
    }

    const beforeCurrentQueue = (queue) => {
      if(queue.currentNumber === 0){
        return 0;
      }
      return queue.currentNumber - queue.currentAttentionNumber + 1;
    }

    const goBack = () => {
      router.push({ path: `/interno/colaborador/menu` });
    }

    const getBookings = () => {
      loading.value = true;
      const { unsubscribe } = updatedBookings(state.queue.id, dateYYYYMMDD(state.date));
      unsubscribeBookings = unsubscribe;
      loading.value = false;
    }

    const updatedBookings = (queueId, date) => {
      let values = ref([]);
      let unsubscribe;
      if (date !== undefined) {
        const bookingsQuery = bookingCollection
          .where('queueId', "==", queueId)
          .where('status', "==", 'PENDING')
          .where('date', '==', date)
          .orderBy('number', 'asc');
        unsubscribe = bookingsQuery.onSnapshot(snapshot => {
          values.value = snapshot.docs
            .map(doc => {
              return { id: doc.id, ...doc.data() }
            })
        })
      }
      state.bookings = values;
      return { unsubscribe };
    }

    const changeDate = computed(() => {
      const { date } = state;
      return {
        date
      }
    })

    const getQueueLink = (queue) => {
      const commerceKeyName = state.commerce.keyName;
      const queueId = queue.id;
      if (queueId) {
        return `${import.meta.env.VITE_URL}/publico/comercio/${commerceKeyName}/filas/${queueId}`;
      }
      return `${import.meta.env.VITE_URL}/publico/comercio/${commerceKeyName}/filas`;
    }

    const copyLink = (queue) => {
      const textToCopy = getQueueLink(queue);
      navigator.clipboard.writeText(textToCopy);
    }

    watch(
      changeDate,
      async (newData, oldData) => {
        if (state.date === 'TODAY') {
          await getAttention();
        } else if (newData.date !== oldData.date) {
          if (unsubscribeBookings) {
            unsubscribeBookings();
          }
          getBookings();
        } else if (newData.bookings !== oldData.bookings) {
          state.availableBlocks = getAvailableBlocks(state.bookings);
        }
        const blockAvailable = state.availableBlocks.filter(block => block.number === state.block.number)
        if (!blockAvailable || blockAvailable.length === 0) {
          state.bookingAvailable = false;
        } else {
          state.bookingAvailable = true;
        }
      }
    )

    return {
      siteKey,
      state,
      captchaEnabled,
      loading,
      alertError,
      disabledDates,
      dateMask,
      copyLink,
      getQueueLink,
      getQueue,
      beforeCurrentQueue,
      isActiveCommerce,
      getLineAttentions,
      goBack
    }
  }
}
</script>
<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
      <div class="col">
        <a class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4" @click="goBack()"> {{ $t("collaboratorBookingsView.return") }} <i class="bi bi-arrow-left"></i></a>
      </div>
      <div id="page-header" class="text-center mt-4">
        <div class="welcome">
          <div id="welcome">
            <span class="welcome-user">{{ $t("collaboratorBookingsView.welcome") }} </span>
          </div>
        </div>
        <ToggleCapabilities
          :toggles="state.toggles"
          componentName="collaboratorBookingsView"
        ></ToggleCapabilities>
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
        <div id="queue-selector" class="mb-1 mt-2">
          <div class="choose-attention"><span>{{ $t("collaboratorBookingsView.queue") }} </span></div>
          <select
            class="btn btn-md btn-light fw-bold text-dark m-2 select"
            v-model="state.queue"
            id="queues">
            <option v-for="queue in state.queues" :key="queue.name" :value="queue">{{ queue.name }}</option>
          </select>
        </div>
      </div>
      <div id="queue-link-form" class="row g-1">
        <div class="col" v-if="state.queue && state.queue.id">
          <a class="btn copy-icon"
            @click="copyLink(state.queue)">
            <i class="bi bi-file-earmark-spreadsheet"></i>
          </a>
          <a class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2"
              :href="`${getQueueLink(state.queue)}`"
              target="_blank">
            <i class="bi bi-box-arrow-up-right"></i> {{ $t("collaboratorBookingsView.create") }}
          </a>
        </div>
      </div>
      <div id="bookings">
        <div class="row" v-if="isActiveCommerce()">
          <div v-if="state.queue && state.queue.id !== undefined">
            <div class="choose-attention"><span>{{ $t("collaboratorBookingsView.date") }} </span></div>
            <VDatePicker
              view="weekly"
              :locale="state.locale"
              v-model.string="state.date"
              :mask="dateMask"
              :min-date="state.minDate"
              :disabled-dates="disabledDates"
            />
          </div>
          <div v-if="state.queue && state.date && state.bookings && state.bookings.length > 0">
            <div class="my-1">
              <span class="badge bg-secondary px-3 py-2 m-1">{{ $t("collaboratorBookingsView.listResult") }} {{ state.bookings.length }} </span>
            </div>
            <div v-for="booking in state.bookings" :key="booking.id">
              <BookingDetailsCard
                :booking="booking"
                :show="true"
                :detailsOpened="false"
              >
              </BookingDetailsCard>
            </div>
          </div>
          <div v-if="state.queue && state.date && (!state.bookings || state.bookings.length === 0)">
            <Message
              :title="$t('collaboratorBookingsView.message.2.title')"
              :content="$t('collaboratorBookingsView.message.2.content')" />
          </div>
        </div>
        <div v-if="!isActiveCommerce() && !loading">
          <Message
            :title="$t('collaboratorBookingsView.message.1.title')"
            :content="$t('collaboratorBookingsView.message.1.content')" />
        </div>
      </div>
    </div>
    <PoweredBy :name="state.commerce.name" />
  </div>
</template>
<style scoped>
.choose-attention {
  font-size: 1rem;
  font-weight: 700;
}
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.indicator {
  font-size: .7rem;
}
</style>