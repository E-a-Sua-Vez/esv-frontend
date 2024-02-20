<script>
import { ref, reactive, onBeforeMount, computed, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getCommerceByKeyName } from '../application/services/commerce';
import { getQueueById } from '../application/services/queue';
import { createAttention } from '../application/services/attention';
import { createBooking, getPendingBookingsBetweenDates } from '../application/services/booking';
import { getQueueBlockDetailsByDay } from '../application/services/block';
import { createWaitlist } from '../application/services/waitlist';
import { VueRecaptcha } from 'vue-recaptcha';
import { globalStore } from '../stores';
import { validateEmail } from '../shared/utils/email';
import Message from '../components/common/Message.vue';
import PoweredBy from '../components/common/PoweredBy.vue';
import CommerceLogo from '../components/common/CommerceLogo.vue';
import Spinner from '../components/common/Spinner.vue';
import Alert from '../components/common/Alert.vue';
import Warning from '../components/common/Warning.vue';
import NotificationConditions from '../components/domain/NotificationConditions.vue';
import { getActiveFeature } from '../shared/features';
import { bookingCollection, attentionCollection } from '../application/firebase';
import firebase from 'firebase/app';

export default {
  name: 'CommerceQueuesView',
  components: { CommerceLogo, Message, PoweredBy, VueRecaptcha, Spinner, Alert, Warning, NotificationConditions },
  async setup() {
    const router = useRouter();
    const route = useRoute();
    const store = globalStore();
    const { keyName, queueId } = route.params;
    const siteKey = import.meta.env.VITE_RECAPTCHA_INVISIBLE;
    const captchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED || false;
    let captcha = false;

    let loading = ref(false);
    let alertError = ref('');
    let calendar = ref(null);
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
        bar: 'green',
        dates: []
      },
      {
        key: 'Unavailable',
        bar: 'red',
        dates: []
      },
      {
        key: 'Disabled',
        bar: 'gray',
        dates: []
      }
    ])
    let unsubscribeBookings = () => {};
    let unsubscribeAttentions = () => {};

    const state = reactive({
      commerce: {},
      queues: [],
      queue: {},
      currentChannel: 'QR',
      newUser: {},
      errorsAdd: [],
      phone: '',
      phoneCode: '',
      nameError: false,
      lastNameError: false,
      phoneError: false,
      phoneCodeError: false,
      emailError: false,
      idNumberError: false,
      accept: false,
      date: undefined,
      blocksByDay: {},
      blocks: [],
      block: {},
      attentionBlock: {},
      availableBlocks: [],
      availableAttentionBlocks: [],
      locale: 'es',
      minDate: (new Date()).setDate(new Date().getDate() + 1),
      hourBlocks: [],
      bookings: ref([]),
      attentions: ref([]),
      bookingAvailable: true,
      attentionAvailable: true,
      showToday: false,
      showReserve: false,
      waitlistCreated: false,
      phoneCodes: [
        { id: 've', label: '🇻🇪', code: '58' },
        { id: 'br', label: '🇧🇷', code: '55' },
        { id: 'cl', label: '🇨🇱', code: '56' },
        { id: 'us', label: '🇺🇸', code: '1' },
        { id: 'xx', label: '🏴', code: 'xx' }
      ],
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        if (keyName) {
          state.commerce = await getCommerceByKeyName(keyName);
          state.locale = state.commerce.localeInfo.language;
          store.setCurrentCommerce(state.commerce);
          if (queueId) {
            state.queue = await getQueueById(queueId);
            state.queues = [state.queue];
            await getAttention(undefined);
          } else {
            const queues = state.commerce.queues;
            state.queues = queues;
            if (queues.length === 1) {
              state.queue = queues[0];
              await getAttention(undefined);
            }
          }
          if (state.commerce.localeInfo && state.commerce.localeInfo.country) {
            state.phoneCode = findPhoneCode(state.commerce.localeInfo.country);
          }
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    onUnmounted(() => {
      if (unsubscribeBookings) {
        unsubscribeBookings();
      }
      if (unsubscribeAttentions) {
        unsubscribeAttentions();
      }
    })

    const formattedDate = (date) => {
      if (date && date !== 'TODAY') {
        return new Date(date).toISOString().slice(0,10);
      }
    }

    const getBookings = () => {
      const { unsubscribe } = updatedBookings(state.queue.id, formattedDate(state.date));
      unsubscribeBookings = unsubscribe;
    }

    const getAttentions = () => {
      const { unsubscribe } = updatedAttentions(state.queue.id);
      unsubscribeAttentions = unsubscribe;
    }

    const isActiveCommerce = (commerce) => {
      return commerce.active === true &&
        commerce.queues.length > 0
    };

    const isActiveQueues = (commerce) => {
      return commerce !== undefined && commerce.queues.length > 0;
    };

    const getFeature = (commerce, name) => {
      const features = commerce.features;
      const feature = features.find(feat => { return feat.name === name });
      return feature || {};
    }

    const isAvailableCommerce = (commerce) => {
      const feature = getFeature(state.commerce, 'close-commerce-by-service-hours');
      if (feature.active === undefined || feature.active === false) {
        return true;
      }
      const timeZone = commerce.localeInfo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const clientCurrentDate = new Date().toLocaleString("en-US", { timeZone });
      let clientDayOfweek = new Date(clientCurrentDate).getDay();
      const clientHour = new Date(clientCurrentDate).getHours();
      let isInDays = false;
      let isInHours = false;
      if (clientDayOfweek === 0) {
        clientDayOfweek = 7;
      }
      if (commerce.serviceInfo.attentionDays.includes(clientDayOfweek)) {
        isInDays = true;
      }
      if (commerce.serviceInfo.attentionHourFrom ===
        commerce.serviceInfo.attentionHourTo) {
          isInHours = true;
      } else if (commerce.serviceInfo.attentionHourTo <
        commerce.serviceInfo.attentionHourFrom) {
          if (clientHour >= commerce.serviceInfo.attentionHourFrom ||
          clientHour <= commerce.serviceInfo.attentionHourTo) {
            isInHours = true;
          }
      } else {
        if (clientHour >= commerce.serviceInfo.attentionHourFrom
          && clientHour <= commerce.serviceInfo.attentionHourTo) {
          isInHours = true;
        }
      }
      if (isInDays && isInHours) {
        return true;
      }
    }

    const isDataActive = (commerce) => {
      let active = false;
      let features = [];
      if (commerce !== undefined && commerce.features.length > 0) {
        features = commerce.features.filter(feature => feature.type === 'USER' && feature.active === true);
        if (features.length > 0) {
          active = true;
        }
      }
      if (!active) {
        state.accept = true;
      }
      return active;
    };

    const showConditions = () => {
      if (
        getActiveFeature(state.commerce, 'attention-user-name', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-lastName', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-idNumber', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-phone', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-email', 'USER')
      ) {
        return true;
      }
      state.accept = false;
      return false;
    }

    const validate = (user) => {
      state.errorsAdd = [];
      if (getActiveFeature(state.commerce, 'attention-user-name', 'USER')) {
        if(!user.name || user.name.length === 0) {
          state.nameError = true;
          state.errorsAdd.push('commerceQueuesView.validate.name');
        } else {
          state.nameError = false;
        }
      }
      if (getActiveFeature(state.commerce, 'attention-user-lastName', 'USER')) {
        if(!user.lastName || user.lastName.length === 0) {
          state.lastNameError = true;
          state.errorsAdd.push('commerceQueuesView.validate.lastName');
        } else {
          state.lastNameError = false;
        }
      }
      if (getActiveFeature(state.commerce, 'attention-user-idNumber', 'USER')) {
        if(!user.idNumber || user.idNumber.length === 0) {
          state.idNumberError = true;
          state.errorsAdd.push('commerceQueuesView.validate.idNumber');
        } else {
          state.idNumberError = false;
        }
      }
      if (getActiveFeature(state.commerce, 'attention-user-phone', 'USER')) {
        if(!state.phoneCode || state.phoneCode.length === 0) {
          state.phoneCodeError = true;
          state.errorsAdd.push('commerceQueuesView.validate.phoneCode');
        } else {
          if (state.phoneCode === 'xx') {
            state.phoneCode = '';
          }
          user.phone = state.phoneCode + state.phone.replace(/^0+/, '');
          state.phoneCodeError = false;
        }
        if(!state.phone || state.phone.length === 0) {
          state.phoneError = true;
          state.errorsAdd.push('commerceQueuesView.validate.phone');
        } else {
          state.phoneError = false;
        }
      }
      if (getActiveFeature(state.commerce, 'attention-user-email', 'USER')) {
        if(!user.email || user.email.length === 0 || !validateEmail(user.email)) {
          state.emailError = true;
          state.errorsAdd.push('commerceQueuesView.validate.email');
        } else {
          state.emailError = false;
        }
      }
      if (showConditions()) {
        if (!state.accept) {
          state.errorsAdd.push('commerceQueuesView.validate.accept');
        }
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const getAttention = async (block) => {
      try {
        loading.value = true;
        alertError.value = '';
        if (validate(state.newUser)) {
          state.currentChannel = await store.getCurrentAttentionChannel;
          let newUser = undefined;
          if (isDataActive(state.commerce)) {
            newUser = { ...state.newUser, commerceId: state.commerce.id, notificationOn: state.accept, notificationEmailOn: state.accept };
          }
          let body = { queueId: state.queue.id, channel: state.currentChannel, user: newUser }
          if (block && block.number) {
            body = { ...body, block };
          }
          state.date = undefined;
          const attention = await createAttention(body);
          router.push({ path: `/interno/fila/${state.queue.id}/atencion/${attention.id}` });
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };

    const getBooking = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        if (validate(state.newUser)) {
          state.currentChannel = await store.getCurrentAttentionChannel;
          let newUser = undefined;
          if (isDataActive(state.commerce)) {
            newUser = { ...state.newUser, commerceId: state.commerce.id, notificationOn: state.accept, notificationEmailOn: state.accept };
          }
          const body = { queueId: state.queue.id, channel: state.currentChannel, user: newUser, date: formattedDate(state.date), block: state.block }
          const booking = await createBooking(body);
          router.push({ path: `/interno/booking/${booking.id}` });
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };

    const getWaitList = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        if (validate(state.newUser)) {
          state.currentChannel = await store.getCurrentAttentionChannel;
          let newUser = undefined;
          if (isDataActive(state.commerce)) {
            newUser = { ...state.newUser, commerceId: state.commerce.id, notificationOn: state.accept, notificationEmailOn: state.accept };
          }
          const body = { queueId: state.queue.id, channel: state.currentChannel, user: newUser, date: formattedDate(state.date) }
          const waitlist = await createWaitlist(body);
          if (waitlist && waitlist.id) {
            state.waitlistCreated = true;
          }
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };

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
          disabledDates.value[0].repeat.weekdays.push(...disabled);
        }
      }
    }

    const getBlocksByDay = () => {
      if (!state.date || state.date === 'TODAY') {
        const day = new Date().getDay();
        return state.blocksByDay[day];
      } else {
        const [year, month, day] = state.date.slice(0,10).split('-');
        const dayNumber = new Date(+year, +month - 1, +day).getDay();
        return state.blocksByDay[dayNumber];
      }
    }

    const getQueue = async (queueIn) => {
      state.queue = queueIn;
      if (state.queue.id) {
        if (getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')) {
          getDisabledDates();
          state.blocksByDay = await getQueueBlockDetailsByDay(state.queue.id);
          state.blocks = getBlocksByDay();
          state.date = undefined;
          state.block = {};
          state.attentionBlock = {};
          getAttentions();
          const currentDate = new Date().toISOString().slice(0, 10);
          getAvailableDatesByMonth(currentDate);
          attentionsAvailables();
        }
      }
      if (captchaEnabled) {
       await validateCaptchaOk(true);
      }
    }

    const attentionsAvailables = () => {
      state.availableAttentionBlocks = getAvailableAttentionBlocks(state.attentions);
      const blockAvailable = state.availableAttentionBlocks.filter(block => block.number === state.attentionBlock.number)
      if (!blockAvailable || blockAvailable.length === 0) {
        state.attentionAvailable = false;
      } else {
        state.attentionAvailable = true;
      }
    }

    const bookingsAvailables = () => {
      const blockAvailable = state.availableBlocks.filter(block => block.number === state.block.number)
      if (!blockAvailable || blockAvailable.length === 0) {
        state.bookingAvailable = false;
      } else {
        state.bookingAvailable = true;
      }
    }

    const findPhoneCode = (codeIn) => {
      const search = state.phoneCodes.find(code => code.id === codeIn);
      if (search) {
        return search.code;
      }
      return '';
    }

    const getActualDay = (day, timeZoneIn) => {
      const dateCorrected = new Date(
      new Date(day).toLocaleString('en-US', {
        timeZone: timeZoneIn,
      }));
      return dateCorrected;
    }

    const validateCaptchaOk = async (response) => {
      if(response) {
        captcha = true;
        if (!getActiveFeature(state.commerce, 'booking-active', 'PRODUCT')) {
          await getAttention(undefined);
        }
      }
    };

    const setDate = (date) => {
      if (state.queue.id) {
        state.date = date;
        state.block = {};
      }
    }

    const validateCaptchaError = () => {
      captcha = false;
    };

    const goBack = () => {
      router.back()
    }

    const showToday = () => {
      state.block = {};
      state.date = undefined;
      state.showToday = true;
      state.showReserve = false;
    }

    const showReserve = () => {
      state.attentionBlock = {},
      state.showToday = false;
      state.showReserve = true;
    }

    const getAvailableBlocks = (bookings) => {
      let queueBlocks = [];
      let availableBlocks = [];
      if (state.blocks) {
        queueBlocks = state.blocks;
        if (queueBlocks && queueBlocks.length > 0) {
          let bookingsReserved = 0;
          if (bookings && bookings.length > 0) {
            bookingsReserved = bookings.map(booking => booking.number);
            availableBlocks = queueBlocks.filter(block => !bookingsReserved.includes(block.number))
          } else {
            availableBlocks = queueBlocks;
          }
        }
      }
      return availableBlocks;
    }



    const getAvailableAttentionBlocks = (attentions) => {
      let queueBlocks = [];
      let availableBlocks = [];
      if (state.blocks) {
        queueBlocks = state.blocks;
        const timeZone = state.commerce && state.commerce.localeInfo ? state.commerce.localeInfo.timezone : 'America/Sao_Paulo;'
        if (queueBlocks && queueBlocks.length > 0) {
          let attentionsReserved = 0;
          queueBlocks = queueBlocks.filter(block => {
            const hourBlock = parseInt(block.hourFrom.split(':')[0]);
            const minBlock = parseInt(block.hourFrom.split(':')[1]);
            const day = new Date(getActualDay(new Date(), timeZone)).getTime();
            const dayBlock = new Date(day).setHours(hourBlock, minBlock, 0);
            return (dayBlock > day);
          });
          if (attentions && attentions.length > 0) {
            attentionsReserved = attentions.map(attention => attention.number);
            availableBlocks = queueBlocks.filter(block => !attentionsReserved.includes(block.number));
          } else {
            availableBlocks = queueBlocks;
          }
        }
      }
      return availableBlocks;
    }

    const updatedBookings = (queueId, date) => {
      let values = ref([]);
      let unsubscribe;
      if (date !== undefined) {
        const bookingsQuery = bookingCollection
          .where('queueId', "==", queueId)
          .where('status', "==", 'PENDING')
          .where('date', '==', date);
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

    const updatedAttentions = (queueId) => {
      let values = ref([]);
      let unsubscribe;
      const date = new Date(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0,10));
      const dateToRequest = firebase.firestore.Timestamp.fromDate(date);
      const attentionsQuery = attentionCollection
        .where('queueId', "==", queueId)
        .where('status', "in", ['PENDING', 'TERMINATED', 'RATED'])
        .orderBy('createdAt', 'asc')
        .orderBy('number', 'asc')
        .where('createdAt', '>', dateToRequest);
      unsubscribe = attentionsQuery.onSnapshot(snapshot => {
        values.value = snapshot.docs
          .map(doc => {
            return { id: doc.id, ...doc.data() }
          })
      })
      state.attentions = values;
      return { unsubscribe };
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
      const bookingsGroupedByDate = Object.groupBy(monthBookings, ({date}) => date);
      const dates = Object.keys(bookingsGroupedByDate);
      for(let i = 1; i <= dateTo.getDate(); i ++) {
        const key = new Date(dateFrom.setDate(i)).toISOString().slice(0, 10);
        if (new Date(key) > new Date()) {
          availableDates.push(key);
        }
      }
      const forDeletion = [];
      if (dates && dates.length > 0) {
        dates.forEach(date => {
          const bookings = bookingsGroupedByDate[date];
          const [year, month, day] = date.split('-');
          const dayNumber = new Date(+year, +month - 1, +day).getDay();
          const blocks = state.blocksByDay[dayNumber] || [];
          if (bookings.length >= blocks.length) {
            forDeletion.push(date);
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
      return availableDates;
    }

    const changeDate = computed(() => {
      const {
        date,
        bookings,
        attentions,
        block,
        attentionBlock,
        availableBlocks
      } = state;
      return {
        date,
        bookings,
        block,
        attentionBlock,
        availableBlocks,
        attentions
      }
    })

    watch (
      changeDate,
      async (newData, oldData) => {
        if (state.date === 'TODAY') {
          if (getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')) {
            if (newData.attentions && oldData.attentions) {
              const newIds = newData.attentions.map(att => att.id);
              const oldIds = oldData.attentions.map(att => att.id);
              if (newIds.includes(oldIds) && newIds.length !== oldIds.length) {
                getAttentions();
              }
            }
          } else {
            await getAttention(undefined);
          }
        } else if (newData.date !== oldData.date) {
          state.blocks = getBlocksByDay();
          state.block = {};
          if (unsubscribeBookings) {
            unsubscribeBookings();
          }
          getBookings();
        } else if (newData.bookings !== oldData.bookings) {
          state.availableBlocks = getAvailableBlocks(state.bookings);
        }
        attentionsAvailables();
        bookingsAvailables();
        const currentDate = new Date().toISOString().slice(0, 10);
        getAvailableDatesByMonth(currentDate);
      }
    )

    return {
      state,
      siteKey,
      captchaEnabled,
      keyName,
      loading,
      alertError,
      dateMask,
      disabledDates,
      calendarAttributes,
      calendar,
      formattedDate,
      isDataActive,
      getActiveFeature,
      isActiveCommerce,
      isAvailableCommerce,
      isActiveQueues,
      goBack,
      getQueue,
      getAttention,
      validateCaptchaOk,
      validateCaptchaError,
      showConditions,
      setDate,
      getBooking,
      showToday,
      showReserve,
      getWaitList,
      getAvailableDatesByCalendarMonth
    }
  }
}
</script>
<template>
  <div>
    <div  class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
      <div id="page-header" class="text-center mt-4">
        <div class="welcome">
          <span>{{ $t("commerceQueuesView.welcome") }}</span>
        </div>
      </div>
      <Spinner :show="loading"></Spinner>
      <Alert :show="loading" :stack="alertError"></Alert>
      <div v-if="isActiveCommerce(state.commerce) && !loading">
        <div v-if="isAvailableCommerce(state.commerce)">
          <!-- FORM -->
          <div id="data" v-if="isDataActive(state.commerce)">
            <div v-if="isActiveCommerce(state.commerce)" class="choose-attention py-1 pt-4">
              <span>{{ $t("commerceQueuesView.data") }}</span>
            </div>
            <div class="row g-1">
              <div class="col col-md-10 offset-md-1 data-card">
                <div id="attention-name-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(state.commerce, 'attention-user-name', 'USER')">
                  <div class="col form-floating">
                    <input
                      id="attention-name-input-add"
                      maxlength="30"
                      type="text"
                      class="form-control form-control-solid"
                      v-model="state.newUser.name"
                      placeholder="Ex. Jhon">
                      <label for="attention-name-input-add" class="label-form">{{ $t("commerceQueuesView.name") }} <i class="bi bi-person"></i></label>
                  </div>
                </div>
                <div id="attention-lastname-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(state.commerce, 'attention-user-lastName', 'USER')">
                  <div class="col form-floating">
                    <input
                      id="attention-lastname-input-add"
                      maxlength="20"
                      type="text"
                      class="form-control form-control-solid"
                      v-model="state.newUser.lastName"
                      placeholder="Ex. Pérez">
                      <label for="attention-lastname-input-add">{{ $t("commerceQueuesView.lastName") }} <i class="bi bi-person"></i></label>
                  </div>
                </div>
                <div id="attention-idnumber-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(state.commerce, 'attention-user-idNumber', 'USER')">
                  <div class="col form-floating">
                    <input
                      id="attention-idnumber-input-add"
                      maxlength="20"
                      type="text"
                      class="form-control"
                      v-model="state.newUser.idNumber"
                      v-bind:class="{ 'is-invalid': state.idNumberError }"
                      placeholder="Ex. 112223334">
                      <label for="attention-lastname-input-add">{{ $t("commerceQueuesView.idNumber") }} <i class="bi bi-person-vcard"></i></label>
                  </div>
                </div>
                <div id="attention-email-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(state.commerce, 'attention-user-email', 'USER')">
                  <div class="col form-floating">
                    <input
                      id="attention-email-input-add"
                      maxlength="50"
                      type="email"
                      class="form-control"
                      v-model="state.newUser.email"
                      placeholder="Ex. jhon@user.com">
                      <label for="attention-lastname-input-add">{{ $t("commerceQueuesView.email") }} <i class="bi bi-envelope"></i></label>
                  </div>
                </div>
                <div id="attention-phone-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(state.commerce, 'attention-user-phone', 'USER')">
                  <div class="col-3 form-floating">
                    <select
                      class="form-control form-select btn btn-lg btn-light fw-bold text-dark select"
                      v-model="state.phoneCode"
                      id="attention-phoneCode-input-add">
                      <option v-for="code in state.phoneCodes" :key="code.id" :value="code.code">{{ code.label }}</option>
                    </select>
                    <label for="attention-phoneCode-input-add"> {{ $t("commerceQueuesView.phoneCode") }}</label>
                  </div>
                  <div class="col-9 form-floating">
                    <input
                      id="attention-phone-input-add"
                      maxlength="15"
                      type="tel"
                      class="form-control"
                      v-model="state.phone"
                      placeholder="Ex.: 56233445533">
                      <label for="attention-phone-input-add">{{ $t("commerceQueuesView.phone") }} <i class="bi bi-phone-vibrate"></i> </label>
                  </div>
                  <label v-if="!state.phoneCode" class="examples mt-2"> {{ $t('clientNotifyData.validate.cellphone.example') }} </label>
                  <label v-else class="examples mt-2"> {{ $t(`clientNotifyData.validate.cellphone.examples.${state.phoneCode}`) }} </label>
                </div>
                <div class="recaptcha-area form-check form-check-inline" v-if="showConditions()">
                  <input type="checkbox" class="form-check-input" id="conditions" v-model="state.accept">
                  <label class="form-check-label label-conditions text-left" for="conditions"> {{ $t("clientNotifyData.accept.1") }} <a href="#conditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal"> {{ $t("clientNotifyData.accept.2") }}</a></label>
                </div>
                <div class="row g-1 errors" id="feedback" v-if="(state.errorsAdd.length > 0)">
                  <Warning>
                    <template v-slot:message>
                      <li v-for="(error, index) in state.errorsAdd" :key="index">
                        {{ $t(error) }}
                      </li>
                    </template>
                  </Warning>
                </div>
              </div>
            </div>
          </div>
          <!-- QUEUES -->
          <div id="queues" v-if="isActiveCommerce(state.commerce) && !loading">
            <div v-if="isActiveCommerce(state.commerce)" class="choose-attention py-1 pt-2">
              <span>{{ $t("commerceQueuesView.choose") }}</span>
            </div>
            <div class="row g-1" v-if="isActiveQueues(state.commerce)">
              <div
                v-for="queue in state.queues"
                :key="queue.id"
                class="d-grid btn-group btn-group-justified">
                <div v-if="captchaEnabled === true">
                  <VueRecaptcha
                    :sitekey="siteKey"
                    @verify="validateCaptchaOk"
                    @error="validateCaptchaError">
                    <button
                      v-if="queue.active"
                      type="button"
                      class="btn-size btn btn-lg btn-block col-9 fw-bold rounded-pill mt-1 mb-2"
                      :class="queue.id === state.queue.id ? 'btn-primary': 'btn-dark'"
                      @click="getQueue(queue)"
                      :disabled="!state.accept">
                      {{ queue.name }}
                    </button>
                  </VueRecaptcha>
                </div>
                <div v-else>
                  <button
                    v-if="queue.active"
                    type="button"
                    class=" btn-size btn btn-lg btn-block col-9 fw-bold rounded-pill mt-1 mb-2"
                    :class="queue.id === state.queue.id ? 'btn-primary': 'btn-dark'"
                    @click="getQueue(queue)"
                    :disabled="!state.accept">
                    {{ queue.name }}
                  </button>
                </div>
              </div>
            </div>
            <div v-else>
              <Message
                :title="$t('commerceQueuesView.message.title')"
                :content="$t('commerceQueuesView.message.content')">
              </Message>
              <div class="col">
                <a class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4" @click="goBack()">{{ $t("businessSectionAtWorkView.return") }} <i class="bi bi-arrow-left"></i></a>
              </div>
            </div>
          </div>
          <!-- BOOKING / ATTENTION -->
          <div id="booking" v-if="getActiveFeature(state.commerce, 'booking-active', 'PRODUCT') && state.queue.id">
            <div v-if="isActiveCommerce(state.commerce)" class="choose-attention py-1 pt-2">
              <span> {{ $t("commerceQueuesView.when") }} </span>
            </div>
            <div class="row g-1" v-if="isActiveQueues(state.commerce)">
              <div>
                <!-- ATTENTION TODAY HOUR -->
                <div id="booking-today-hour" v-if="getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT') && state.queue.id">
                  <button
                    class="btn-size btn btn-lg btn-block col-9 fw-bold btn-dark rounded-pill mt-1 mb-2"
                    data-bs-toggle="collapse"
                    href="#booking-hour"
                    @click="setDate('TODAY');showToday()"
                    :disabled="!state.accept || !state.queue.id">
                    {{ $t("commerceQueuesView.today") }} <i class="bi bi-chevron-down"></i>
                  </button>
                  <div :class="state.showToday ? 'collapse mx-2 show' : 'collapse mx-2 hide'" id="booking-hour">
                    <div class="centered">
                      <div class="col col-md-9 data-card">
                        <div class="choose-attention py-1 pt-2">
                          <i class="bi bi-hourglass-split"></i> <span> {{ $t("commerceQueuesView.selectBlock") }} </span>
                        </div>
                        <div v-if="state.availableAttentionBlocks &&
                          state.availableAttentionBlocks.length > 0" class="mb-2">
                          <select class="btn btn-md btn-light fw-bold text-dark select" aria-label=".form-select-sm" v-model="state.attentionBlock">
                            <option v-for="block in state.availableAttentionBlocks" :key="block.number" :value="block" id="select-block"> {{ block.hourFrom }} - {{ block.hourTo }} </option>
                          </select>
                        </div>
                        <div v-else>
                          <Message
                            :title="$t('commerceQueuesView.message3.title')"
                            :content="$t('commerceQueuesView.message3.content')">
                          </Message>
                        </div>
                        <div v-if="getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT') && state.attentionBlock && state.attentionBlock.number" class="py-1 mt-2">
                          <hr>
                          {{ $t("commerceQueuesView.blockSelected") }}
                          <div class="badge rounded-pill bg-dark py-2 px-4 m-1"><span> {{ state.attentionBlock.hourFrom }} - {{ state.attentionBlock.hourTo }} </span></div>
                        </div>
                        <div v-if="state.attentionBlock.number && state.attentionAvailable === false">
                          <Alert :show="!!state.attentionAvailable" :stack="990"></Alert>
                        </div>
                        <button
                          type="button"
                          v-if="state.attentionBlock"
                          class="btn-size btn btn-lg btn-block col-9 fw-bold btn-dark rounded-pill mb-2 mt-2"
                          @click="getAttention(state.attentionBlock)"
                          :disabled="!state.accept || !state.queue.id || !state.attentionAvailable"
                          >
                          {{ $t("commerceQueuesView.confirm") }} <i class="bi bi-check-lg"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- ATTENTION TODAY -->
                <div id="booking-today" v-else>
                  <button
                    type="button"
                    class="btn-size btn btn-lg btn-block col-9 fw-bold btn-dark rounded-pill mt-1 mb-2"
                    @click="setDate('TODAY')"
                    :disabled="!state.accept || !state.queue.id"
                    >
                    {{ $t("commerceQueuesView.today") }}
                  </button>
                </div>
                <!-- BOOKING -->
                <button
                  class="btn-size btn btn-lg btn-block col-9 fw-bold btn-dark rounded-pill mt-1 mb-2"
                  data-bs-toggle="collapse"
                  href="#booking-date"
                  @click="showReserve()"
                  :disabled="!state.accept || !state.queue.id">
                  {{ $t("commerceQueuesView.booking") }} <i class="bi bi-chevron-down"></i>
                </button>
                <div :class="state.showReserve ? 'collapse mx-2 show' : 'collapse mx-2 hide'" id="booking-date">
                  <div class="centered">
                    <div class="col col-md-9 data-card">
                      <div class="choose-attention py-1 pt-2">
                        <i class="bi bi-calendar-check"></i> <span> {{ $t("commerceQueuesView.selectDay") }} </span>
                      </div>
                      <VDatePicker
                        :locale="state.locale"
                        v-model.string="state.date"
                        :mask="dateMask"
                        :min-date="state.minDate"
                        :disabled-dates="disabledDates"
                        :attributes='calendarAttributes'
                        @did-move="getAvailableDatesByCalendarMonth"
                      />
                      <div v-if="getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')">
                        <div v-if="state.availableBlocks &&
                          state.availableBlocks.length > 0 &&
                          state.date" class="mb-2">
                          <div class="choose-attention py-1 pt-2">
                            <i class="bi bi-hourglass-split"></i> <span> {{ $t("commerceQueuesView.selectBlock") }} </span>
                          </div>
                          <select class="btn btn-md btn-light fw-bold text-dark select" aria-label=".form-select-sm" v-model="state.block">
                            <option v-for="block in state.availableBlocks" :key="block.number" :value="block" id="select-block">{{ block.hourFrom }} - {{ block.hourTo }}</option>
                          </select>
                        </div>
                        <div v-else-if="state.availableBlocks &&
                            state.availableBlocks.length === 0 &&
                            state.date" class="mb-2">
                          <div id="waitlist" class="d-grid gap-2 mb-2 waitlist-box mt-3" v-if="getActiveFeature(state.commerce, 'booking-waitlist-active', 'PRODUCT')">
                            <div class="choose-attention">
                              <i class="bi bi-bell-fill"></i> <span class="fw-bold"> {{ $t("commerceQueuesView.waitlist.title") }} </span> <span> {{ $t("commerceQueuesView.waitlist.content") }} </span>
                            </div>
                            <button v-if="state.queue.active && !state.waitlistCreated"
                              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                              @click="getWaitList()">
                              {{ $t("commerceQueuesView.waitlist.action") }} <i class="bi bi-check-lg"></i>
                            </button>
                            <div v-else>
                              <Message
                                :title="$t('commerceQueuesView.message4.title')"
                                :content="$t('commerceQueuesView.message4.content')">
                              </Message>
                            </div>
                          </div>
                          <div v-else>
                            <Message
                              :title="$t('commerceQueuesView.message3.title')"
                              :content="$t('commerceQueuesView.message3.content')">
                            </Message>
                          </div>
                        </div>
                        <div v-if="(state.date && !getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')) || (state.date && getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT') && state.block && state.block.hourFrom)" class="py-1 mt-2">
                          <hr>
                          <div class="choose-attention"><i class="bi bi-clipboard-check-fill"></i> <span> {{ $t("commerceQueuesView.daySelected") }} </span></div>
                          <div>
                            <div>{{ $t("commerceQueuesView.queueSelected") }}</div>
                            <div class="badge rounded-pill bg-primary py-2 px-4 mx-1">{{ state.queue.name }} </div>
                          </div>
                          <div>
                            <div>{{ $t("commerceQueuesView.dataSelected") }}</div>
                            <div class="badge rounded-pill bg-secondary py-2 px-4 mx-1"><span> {{ formattedDate(state.date) }} </span></div>
                          </div>
                          <div v-if="getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT') && state.block">
                            <div>{{ $t("commerceQueuesView.blockSelected") }}</div>
                            <div class="badge rounded-pill bg-light text-dark py-2 px-4 mx-1"><span> {{ state.block.hourFrom }} - {{ state.block.hourTo }} </span></div>
                          </div>
                        </div>
                        <div v-if="getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT') && state.block.number">
                          <div v-if="state.block.number && state.bookingAvailable === false">
                            <Alert :show="!!state.bookingAvailable" :stack="990"></Alert>
                          </div>
                          <button
                            type="button"
                            class="btn-size btn btn-lg btn-block col-9 fw-bold btn-dark rounded-pill mb-2 mt-2"
                            @click="getBooking()"
                            :disabled="!state.accept || !state.queue.id || !state.date"
                            >
                            {{ $t("commerceQueuesView.confirm") }} <i class="bi bi-check-lg"></i>
                          </button>
                        </div>
                      </div>
                      <div v-else-if="getActiveFeature(state.commerce, 'booking-active', 'PRODUCT')">
                        <button
                          type="button"
                          class="btn-size btn btn-lg btn-block col-9 fw-bold btn-dark rounded-pill mb-2 mt-2"
                          @click="getBooking()"
                          :disabled="!state.accept || !state.queue.id || !state.date"
                          >
                          {{ $t("commerceQueuesView.confirm") }} <i class="bi bi-check-lg"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <Message
            :title="$t('commerceQueuesView.message2.title')"
            :content="$t('commerceQueuesView.message2.content')"
            :icon="'bi bi-emoji-frown'">
          </Message>
        </div>
      </div>
      <div v-if="!isActiveCommerce(state.commerce) && !loading">
        <Message
          :title="$t('commerceQRSetup.message3.title')"
          :content="$t('commerceQRSetup.message3.content')"
          :icon="'bi bi-emoji-smile'">
        </Message>
      </div>
    </div>
    <PoweredBy :name="state.commerce.name" />
    <!-- Modal Conditions -->
    <div class="modal fade" id="conditionsModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0"><button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button></div>
            <div class="modal-body text-center pb-5">
              <NotificationConditions></NotificationConditions>
              <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4" data-bs-toggle="modal" data-bs-target="#conditionsModal">{{ $t("notificationConditions.action") }} <i class="bi bi-check-lg"></i></a>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.choose-attention {
  padding-bottom: 1rem;
  font-size: .9rem;
  font-weight: 500;
  line-height: 1rem;
}
.data-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.booking-data-card {
  --margin-top: .2rem;
  margin-bottom: .5rem;
  background-color: var(--color-background);
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  font-weight: 400;
}
.form-floating > label {
  text-align: center !important;
  transform-origin: center center !important;
  font-weight: 700;
  font-size: .9rem;
}
.form-control {
  border: 1.75px solid #ced4da !important;
  border-radius: 1rem !important;
  text-align: center;
  line-height: 1.5rem;
}
.examples {
  font-size: .8rem;
  line-height: 1rem;
  color: .5px solid var(--gris-default);
}
.waitlist-box {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .3rem;
  border-radius: 1rem;
  border: .5px solid var(--gris-default);
  margin-bottom: .5rem;
}
</style>