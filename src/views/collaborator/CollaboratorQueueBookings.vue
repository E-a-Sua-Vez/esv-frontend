<script>
import { ref, reactive, onBeforeMount, watch, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { getCommerceById } from '../../application/services/commerce';
import { getCollaboratorById } from '../../application/services/collaborator';
import { getGroupedQueueByCommerceId, getQueueByCommerce } from '../../application/services/queue';
import { VueRecaptcha } from 'vue-recaptcha';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { getQueueBlockDetailsByDay } from '../../application/services/block';
import { getActiveFeature } from '../../shared/features';
import { getPendingBookingsBetweenDates } from '../../application/services/booking';
import { dateYYYYMMDD } from '../../shared/utils/date';
import { bookingCollection, waitlistCollection } from '../../application/firebase';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import BookingDetailsCard from '../../components/bookings/BookingDetailsCard.vue';
import WaitlistDetailsCard from '../../components/waitlist/WaitlistDetailsCard.vue';


export default {
  name: 'CollaboratorQueueBookings',
  components: { CommerceLogo, Message, PoweredBy, VueRecaptcha, Spinner, Alert, ToggleCapabilities, BookingDetailsCard, WaitlistDetailsCard },
  async setup() {
    const router = useRouter();

    const siteKey = import.meta.env.VITE_RECAPTCHA_INVISIBLE;
    const captchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED || false;

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
    let calendarAttributes = ref([
      {
        key: 'Available',
        highlight: {
          color: 'green',
          fillMode: 'light',
        },
        dates: []
      },
      {
        key: 'Unavailable',
        highlight: {
          color: 'red',
          fillMode: 'light',
        },
        dates: []
      },
      {
        key: 'Reserves',
        highlight: {
          color: 'blue',
          fillMode: 'light',
        },
        dates: []
      }
    ])
    let unsubscribeBookings = () => {};
    let unsubscribeWaitlists = () => {};

    const store = globalStore();

    const state = reactive({
      currentUser: {},
      commerces: ref([]),
      queue: {},
      queues: [],
      groupedQueues: [],
      commerce: {},
      collaborator: {},
      module: {},
      activeCommerce: false,
      captcha: false,
      locale: 'es',
      date: (new Date()).setDate(new Date().getDate() + 1),
      bookings: ref([]),
      waitlists: ref([]),
      availableBlocks: [],
      blocksByDay: [],
      blocks: [],
      availableAttentionBlocks: [],
      minDate: (new Date()).setDate(new Date().getDate() + 1),
      maxDate: (new Date()).setDate(new Date().getDate() + 90),
      showBooking: true,
      showWaitlist: false,
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.collaborator = state.currentUser;
        if (!state.currentUser) {
          state.collaborator = await getCollaboratorById(state.currentUser.id);
        }
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        const commerceById = await getCommerceById(state.commerce.id);
        state.queues = commerceById.queues;
        await initQueues();
        store.setCurrentCommerce(state.commerce);
        store.setCurrentQueue(undefined);
        state.locale = state.commerce.localeInfo.language;
        state.toggles = await getPermissions('collaborator');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status;
        loading.value = false;
      }
    })

    onUnmounted(() => {
      if (unsubscribeBookings) {
        unsubscribeBookings();
      }
      getBookings();
      if (unsubscribeWaitlists) {
        unsubscribeWaitlists();
      }
    })

    const isActiveCommerce = () => {
      return state.commerce && state.commerce.active === true;
    };

    const formattedDate = (date) => {
      if (date && date !== 'TODAY') {
        return new Date(date).toISOString().slice(0,10);
      }
    }

    const initQueues = async () => {
      if (getActiveFeature(state.commerce, 'attention-queue-typegrouped', 'PRODUCT')) {
        state.groupedQueues = await getGroupedQueueByCommerceId(state.commerce.id);
        if (Object.keys(state.groupedQueues).length > 0 && state.collaborator.type === 'STANDARD') {
          const collaboratorQueues = state.groupedQueues['COLLABORATOR'].filter(queue => queue.collaboratorId === state.collaborator.id);
          const otherQueues = state.queues.filter(queue => queue.type !== 'COLLABORATOR');
          const queues = [...collaboratorQueues, ...otherQueues];
          state.queues = queues;
        }
        if (Object.keys(state.groupedQueues).length > 0 && state.collaborator.type === 'ASSISTANT') {
          const collaboratorQueues = state.groupedQueues['COLLABORATOR'].filter(queue => queue.collaboratorId === state.collaborator.id);
          const queues = [...collaboratorQueues];
          state.queues = queues;
        }
      }
    }

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
        state.date = (new Date()).setDate(new Date().getDate() + 1);
        getDisabledDates();
        state.date = undefined;
        state.blocksByDay = await getQueueBlockDetailsByDay(state.queue.id);
        state.blocks = getBlocksByDay();
      }
    }

    const goBack = () => {
      router.push({ path: `/interno/colaborador/menu` });
    }

    const getBooking = (number) => {
      if (state.bookings && state.bookings.length > 0) {
        const result = state.bookings.filter(bk => bk.number === number)[0];
        if (result) {
          return result;
        }
      }
    }

    const getDisabledDates = () => {
      let disabled = [1, 2, 3, 4, 5, 6, 7];
      if (state.queue.serviceInfo && state.queue.serviceInfo.attentionDays) {
        const availableDays = state.queue.serviceInfo.attentionDays;
        if (availableDays.length < 7) {
          const forDeletion = [];
          availableDays.forEach(day => {
            if (day === 7) {
              forDeletion.push(1);
            } else {
              forDeletion.push(day + 1);
            }
          })
          disabled = disabled.filter(item => !forDeletion.includes(item));
          disabledDates.value[0].repeat.weekdays = [];
          disabledDates.value[0].repeat.weekdays.push(...disabled);
        }
      }
    }

    const getBlocksByDay = () => {
      if (!state.date || state.date === 'TODAY') {
        const day = new Date().getDay();
        return state.blocksByDay[day];
      } else {
        const [year, month, day] = new Date(state.date).toISOString().slice(0,10).split('-');
        const dayNumber = new Date(+year, +month - 1, +day).getDay();
        return state.blocksByDay[dayNumber];
      }
    }

    const getBookings = () => {
      loading.value = true;
      if (state.queue && state.queue.id) {
        const { unsubscribe } = updatedBookings(state.queue.id, dateYYYYMMDD(state.date));
        unsubscribeBookings = unsubscribe;
      }
      loading.value = false;
    }

    const updatedBookings = (queueId, date) => {
      let values = ref([]);
      let unsubscribe;
      if (date !== undefined && queueId) {
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

    const getAvailableBlocks = () => {
      let queueBlocks = [];
      if (state.blocks) {
        queueBlocks = state.blocks;
        if (queueBlocks && queueBlocks.length > 0) {
          state.availableBlocks = queueBlocks;
        }
      }
    }

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

    const selectCommerce = async (commerce) => {
      try {
        loading.value = true;
        state.commerce = commerce;
        const selectedCommerce = await getQueueByCommerce(state.commerce.id);
        state.queues = selectedCommerce.queues;
        await initQueues()
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status;
        loading.value = false;
      }
    }

    const getWaitlists = () => {
      loading.value = true;
      if (state.queue && state.queue.id) {
        const { unsubscribe } = updatedWaitlists(state.queue.id, dateYYYYMMDD(state.date));
        unsubscribeWaitlists = unsubscribe;
      }
      loading.value = false;
    }

    const updatedWaitlists = (queueId, date) => {
      let values = ref([]);
      let unsubscribe;
      if (date !== undefined && queueId) {
        const waitlistQuery = waitlistCollection
          .where('queueId', "==", queueId)
          .where('status', "==", 'PENDING')
          .where('date', '==', date)
          .orderBy('createdAt', 'asc');
        unsubscribe = waitlistQuery.onSnapshot(snapshot => {
          values.value = snapshot.docs
            .map(doc => {
              return { id: doc.id, ...doc.data() }
            })
        })
      }
      state.waitlists = values;
      return { unsubscribe };
    }

    const showBookings = () => {
      state.showBooking = true;
      state.showWaitlist = false;
    }

    const showWaitlists = () => {
      state.showBooking = false;
      state.showWaitlist = true;
    }

    const getAvailableDatesByCalendarMonth = async (pages) => {
      if (pages && pages.length > 0) {
        const page = pages[0].id;
        await getAvailableDatesByMonth(`${page}-01`);
      }
    }

    const getAvailableDatesByMonth = async (date) => {
      let availableDates = [];
      const [year, month] = date.split('-');
      const thisMonth = +month - 1;
      const nextMonth = +month;
      const dateFrom = new Date(+year, thisMonth, 1);
      const dateTo = new Date(+year, nextMonth, 0);
      const monthBookings = await getPendingBookingsBetweenDates(state.queue.id, dateFrom, dateTo);
      const bookingsGroupedByDate = monthBookings.reduce((acc, booking) => {
        const date = booking.date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(booking);
        return acc;
      }, {});
      const dates = Object.keys(bookingsGroupedByDate);
      for(let i = 1; i <= dateTo.getDate(); i ++) {
        const key = new Date(dateFrom.setDate(i)).toISOString().slice(0, 10);
        if (new Date(key) > new Date()) {
          availableDates.push(key);
        }
      }
      const forDeletion = [];
      const forReserves = [];
      if (dates && dates.length > 0) {
        dates.forEach(date => {
          const bookings = bookingsGroupedByDate[date];
          const [year, month, day] = date.split('-');
          const dayNumber = new Date(+year, +month - 1, +day).getDay();
          const blocks = state.blocksByDay[dayNumber] || [];
          if (bookings.length >= blocks.length) {
            forDeletion.push(date);
          } else if (bookings.length >= 1) {
            forReserves.push(date);
          }
        })
        availableDates = availableDates.filter(item => !forDeletion.includes(item));
      }
      const avaliableToCalendar = availableDates.map(date => {
        const [year,month,day] = date.split('-');
        return new Date(+year, +month - 1, +day);
      });
      calendarAttributes.value[0].dates = [];
      calendarAttributes.value[0].dates.push(...avaliableToCalendar);
      const forDeletionToCalendar = forDeletion.map(date => {
        const [year,month,day] = date.split('-');
        return new Date(+year, +month - 1, +day);
      });
      calendarAttributes.value[1].dates = [];
      calendarAttributes.value[1].dates.push(...forDeletionToCalendar);
      const avaliableToReserve = forReserves.map(date => {
        const [year,month,day] = date.split('-');
        return new Date(+year, +month - 1, +day);
      });
      calendarAttributes.value[2].dates = [];
      calendarAttributes.value[2].dates.push(...avaliableToReserve);
    }

    const changeDate = computed(() => {
      const { date, queue } = state;
      return {
        date,
        queue
      }
    })

    watch(
      changeDate,
      async (newData, oldData) => {
        if (state.date === 'TODAY') {
          await getAttention();
        } else if (newData.date !== oldData.date || newData.queue !== oldData.queue) {
          state.blocks = getBlocksByDay();
          if (unsubscribeBookings) {
            unsubscribeBookings();
          }
          getBookings();
          if (unsubscribeWaitlists) {
            unsubscribeWaitlists();
          }
          getWaitlists();
        }
        getAvailableBlocks();
        let currentDate;
        if (state.date === undefined || state.date === 'TODAY') {
          currentDate = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().slice(0, 10);
        } else {
          currentDate = new Date(new Date(state.date || new Date()).setDate(new Date().getDate() + 1)).toISOString().slice(0, 10);
        }
        await getAvailableDatesByMonth(currentDate);
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
      calendarAttributes,
      getAvailableDatesByCalendarMonth,
      copyLink,
      getQueueLink,
      getQueue,
      isActiveCommerce,
      getLineAttentions,
      goBack,
      getBooking,
      showBookings,
      showWaitlists,
      formattedDate,
      selectCommerce
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
        <div id="businessQueuesAdmin-controls" class="control-box">
          <div class="row">
            <div class="col" v-if="state.commerces.length > 0">
              <span>{{ $t("collaboratorBookingsView.commerce") }} </span>
              <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="commerces">
                <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
              </select>
            </div>
            <div v-else>
              <Message
                :title="$t('businessQueuesAdmin.message.4.title')"
                :content="$t('businessQueuesAdmin.message.4.content')" />
            </div>
          </div>
        </div>
        <div id="queue-selector" class="mb-1 mt-2">
          <div class="choose-attention"><span>{{ $t("collaboratorBookingsView.queue") }} </span></div>
          <select
            class="btn btn-md btn-light fw-bold text-dark m-1 select"
            v-model="state.queue"
            @change="getQueue(state.queue)"
            id="queues">
            <option v-for="queue in state.queues" :key="queue.name" :value="queue">
              <span v-if="queue.type === 'COLLABORATOR'" class="bi bi-person-fill">👤</span> {{ queue.name }}
            </option>
          </select>
        </div>
      </div>
      <div id="queue-link-form" class="row g-1">
        <div class="col" v-if="state.queue && state.queue.id">
          <button class="btn copy-icon"
            @click="copyLink(state.queue)">
            <i class="bi bi-file-earmark-spreadsheet"></i>
          </button>
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
              :locale="state.locale"
              v-model.string="state.date"
              :mask="dateMask"
              :min-date="state.minDate"
              :max-date="state.maxDate"
              :disabled-dates="disabledDates"
              :attributes='calendarAttributes'
              @did-move="getAvailableDatesByCalendarMonth"
            />
            <div v-if="state.date">
              <div class="badge rounded-pill bg-secondary py-2 px-4 m-1"><span> {{ formattedDate(state.date) }} </span></div>
            </div>
          </div>
          <div v-if="state.queue && state.queue.id">
            <div id="subMenu" class="my-1 mt-4">
              <h5 class="mb-0">
                <button
                  class="btn btn-md btn-block btn-size fw-bold btn-dark rounded-pill"
                  :class="state.showBooking ? 'btn-selected' : ''"
                  @click="showBookings()"
                  :disabled="!state.queue || !state.date"
                  >
                  {{ $t('collaboratorBookingsView.bookings') }}
                </button>
                <button
                  class="btn btn-md btn-block btn-size fw-bold btn-dark rounded-pill"
                  :class="state.showWaitlist ? 'btn-selected' : ''"
                  @click="showWaitlists()"
                  :disabled="!state.queue.id || !state.date"
                  >
                  {{ $t('collaboratorBookingsView.waitlists') }}
              </button>
              </h5>
            </div>
            <hr>
            <div v-if="state.showBooking && state.queue && state.date">
              <div v-if="state.queue && state.date && state.bookings && state.bookings.length > 0">
                <div class="my-1">
                  <span class="badge bg-secondary px-3 py-2 m-1">{{ $t("collaboratorBookingsView.listResult") }} {{ state.bookings.length }} </span>
                </div>
                <div>
                  <div v-for="block in state.availableBlocks" :key="block.number">
                    <div class="metric-card">
                      <span
                        class="lefted badge rounded-pill bg-primary m-0"
                        :class="getBooking(block.number) ? 'bg-primary' : 'bg-success'"> {{ block.hourFrom }} - {{ block.hourTo }}</span>
                      <div>
                        <BookingDetailsCard
                          :booking="getBooking(block.number)"
                          :show="true"
                          :detailsOpened="false"
                          :toggles="state.toggles"
                        >
                        </BookingDetailsCard>
                    </div>
                  </div>
                </div>
                </div>
              </div>
              <div v-if="state.queue && state.date && (!state.bookings || state.bookings.length === 0)">
                <Message
                  :title="$t('collaboratorBookingsView.message.2.title')"
                  :content="$t('collaboratorBookingsView.message.2.content')" />
              </div>
            </div>
            <div v-if="state.showWaitlist && state.queue && state.date">
              <div v-if="state.queue && state.date && state.waitlists && state.waitlists.length > 0">
                <div class="my-1">
                  <span class="badge bg-secondary px-3 py-2 m-1">{{ $t("collaboratorBookingsView.listResult") }} {{ state.waitlists.length }} </span>
                </div>
                <div>
                  <div v-for="waitlist in state.waitlists" :key="waitlist.id">
                    <div>
                      <WaitlistDetailsCard
                        :waitlist="waitlist"
                        :show="true"
                        :detailsOpened="false"
                        :availableBlocks="state.availableBlocks"
                        :toggles="state.toggles"
                      >
                      </WaitlistDetailsCard>
                    </div>
                </div>
                </div>
              </div>
              <div v-if="state.queue && state.date && (!state.waitlists || state.waitlists.length === 0)">
                <Message
                  :title="$t('collaboratorBookingsView.message.3.title')"
                  :content="$t('collaboratorBookingsView.message.3.content')" />
              </div>
            </div>
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
  border: 1.5px solid var(--gris-clear);
}
.indicator {
  font-size: .7rem;
}
.metric-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .2rem;
  margin-bottom: .2rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: 0;
}
.control-box {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .1rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
</style>