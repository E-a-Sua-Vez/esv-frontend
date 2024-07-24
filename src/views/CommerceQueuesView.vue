<script>
import { ref, reactive, onBeforeMount, computed, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getCommerceByKeyName } from '../application/services/commerce';
import { getQueueById, getGroupedQueueByCommerceId } from '../application/services/queue';
import { getClientById } from '../application/services/client';
import { createAttention } from '../application/services/attention';
import { createBooking, getPendingBookingsBetweenDates } from '../application/services/booking';
import { getQueueBlockDetailsByDay, getQueueBlockDetailsBySpecificDayByCommerceId } from '../application/services/block';
import { createWaitlist } from '../application/services/waitlist';
import { globalStore } from '../stores';
import { validateEmail } from '../shared/utils/email';
import { getActiveFeature } from '../shared/features';
import { bookingCollection, attentionCollection, bookingBlockNumberUsedCollection } from '../application/firebase';
import { getDetailsCollaboratorsByCommerceId, getCollaboratorDetailsById } from '../application/services/collaborator';
import Message from '../components/common/Message.vue';
import PoweredBy from '../components/common/PoweredBy.vue';
import CommerceLogo from '../components/common/CommerceLogo.vue';
import Spinner from '../components/common/Spinner.vue';
import Alert from '../components/common/Alert.vue';
import Warning from '../components/common/Warning.vue';
import NotificationConditions from '../components/conditions/NotificationConditions.vue';
import firebase from 'firebase/app';
import ClientForm from '../components/domain/ClientForm.vue';
import QueueForm from '../components/domain/QueueForm.vue';
import ServiceForm from '../components/domain/ServiceForm.vue';
import { v4 as uuidv4 } from 'uuid';
import { validateIdNumber } from '../shared/utils/idNumber';
import { DateModel } from '../shared/utils/date.model';

export default {
  name: 'CommerceQueuesView',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, Warning, NotificationConditions, ClientForm, QueueForm, ServiceForm },
  async setup() {
    const router = useRouter();
    const route = useRoute();
    const store = globalStore();
    let {
      keyName,
      queueId,
      name,
      lastName,
      idNumber,
      phone,
      email,
      addressText,
      addressComplement,
      birthday,
      code1,
      code2,
      code3,
      healthAgreementId,
      addressCode,
      origin
    } = route.params;

    const { client, queue } = route.query;

    const siteKey = import.meta.env.VITE_RECAPTCHA_INVISIBLE;
    const captchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED || false;
    let captcha = false;

    let loading = ref(false);
    let loadingCalendar = ref(false);
    let loadingHours = ref(false);
    let loadingService = ref(false);
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
    let specificCalendarAttributes = ref([
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
      }
    ])
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
      }
    ])
    let unsubscribeBookings = () => {};
    let unsubscribeAttentions = () => {};

    const state = reactive({
      commerce: {},
      queues: [],
      groupedQueues: [],
      collaborators: [],
      queue: {},
      services: [],
      selectedServices: [],
      currentChannel: 'QR',
      newUser: {},
      errorsAdd: [],
      phone: '',
      phoneCode: '',
      accept: false,
      date: undefined,
      blocksByDay: {},
      blocks: [],
      block: {},
      attentionBlock: {},
      availableBookingBlocks: [],
      availableAttentionBlocks: [],
      availableBookingSuperBlocks: [],
      availableAttentionSuperBlocks: [],
      locale: 'es',
      minDate: (new Date()).setDate(new Date().getDate() + 1),
      maxDate: (new Date()).setDate(new Date().getDate() + 90),
      hourBlocks: [],
      bookings: ref([]),
      attentions: ref([]),
      bookingAvailable: true,
      attentionAvailable: true,
      allBookings: ref([]),
      allAttentions: ref([]),
      groupedBookingsByQueue: {},
      groupedAttentionsByQueue: {},
      showToday: false,
      showReserve: false,
      waitlistCreated: false,
      canBook: false,
      totalServicesResquested: 0,
      totalDurationRequested: 0,
      amountofBlocksNeeded: 0,
      sessionId: undefined,
      specificCalendar: false,
      specificCalendarDays: {},
      specificCalendarDates: [],
      specificCalendarDate: undefined,
      blocksBySpecificCalendarDate: {},
      showFillForm: true,
      showPickQueue: false,
      showPickHours: false
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.sessionId = uuidv4().toString();
        if (keyName) {
          state.commerce = await getCommerceByKeyName(keyName);
          state.locale = state.commerce.localeInfo.language || 'es';
          store.setCurrentCommerce(state.commerce);
          if (client && client !== undefined) {
            const clientById = await getClientById(client);
            if (clientById && clientById.id) {
              if (clientById.name) {
                const personalInfo = clientById.personalInfo;
                const user = { ...clientById, ...personalInfo };
                receiveData(user);
              }
            }
          }
          const [collaborators, groupedQueues] = await Promise.all([
            getDetailsCollaboratorsByCommerceId(state.commerce.id),
            getGroupedQueueByCommerceId(state.commerce.id)
          ]);
          if ((queueId && queueId !== 'undefined') || (queue && queue !== undefined)) {
            state.queue = await getQueueById(queue || queueId);
            const queueType = state.queue.type;
            state.groupedQueues = {};
            if (queueType === 'COLLABORATOR') {
              const collaborator = await getCollaboratorDetailsById(state.queue.collaboratorId);
              if (collaborator && collaborator.id) {
                state.queue.collaborator = collaborator;
                state.queue.services = collaborator.services;
                state.queue.servicesName = state.queue.services.map(serv => serv.name);
                state.queues = [state.queue];
                state.groupedQueues[queueType] = [state.queue];
                state.queueId = state.queue.id;
                getQueue(state.queue);
              }
            } else if (queueType === 'SELECT_SERVICE') {
              state.queues = [state.queue];
              state.groupedQueues = groupedQueues;
              state.queueId = state.queue.id;
              getQueue(state.queue);
            } else {
              state.queues = [state.queue];
              state.groupedQueues[queueType] = state.queues;
              state.queueId = state.queue.id;
              getQueue(state.queue);
              await getAttention(undefined);
            }
          } else {
            const queues = Object.values(groupedQueues).flat();
            state.queues = queues;
            if (queues.length === 1) {
              state.queue = queues[0];
              await getAttention(undefined);
            }
            state.collaborators = collaborators;
            if (getActiveFeature(state.commerce, 'attention-queue-typegrouped', 'PRODUCT')) {
              state.groupedQueues = groupedQueues;
              const queues = state.groupedQueues['COLLABORATOR'];
              const queueAux = [];
              queues.forEach(queue => {
                if (queue.type === 'COLLABORATOR') {
                  const collaboratorsAux = state.collaborators.filter(collaborator => collaborator.id === queue.collaboratorId);
                  if (collaboratorsAux && collaboratorsAux.length > 0) {
                    queue.services = collaboratorsAux[0].services;
                    queue.servicesName = queue.services.map(serv => serv.name);
                  }
                  queueAux.push(queue);
                }
              })
              state.groupedQueues['COLLABORATOR'] = queueAux;
            }
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

    const receiveData = (data) => {
      if (data) {
        if (data.clientId && data.neededToInclude.length >= 0) {
          state.newUser.clientId = data.clientId;
        }
        if (!state.newUser.clientId) {
          state.newUser.clientId = client;
        }
        if (data.name) {
          state.newUser.name = data.name;
        }
        if (data.lastName) {
          state.newUser.lastName = data.lastName;
        }
        if (data.idNumber) {
          state.newUser.idNumber = data.idNumber;
        }
        if (data.email) {
          state.newUser.email = data.email;
        }
        if (data.birthday) {
          state.newUser.birthday = data.birthday;
        }
        if (data.addressCode) {
          state.newUser.addressCode = data.addressCode;
        }
        if (data.addressText) {
          state.newUser.addressText = data.addressText;
        }
        if (data.addressComplement) {
          state.newUser.addressComplement = data.addressComplement;
        }
        if (data.origin) {
          state.newUser.origin = data.origin;
        }
        if (data.code1) {
          state.newUser.code1 = data.code1;
        }
        if (data.code2) {
          state.newUser.code2 = data.code2;
        }
        if (data.code3) {
          state.newUser.code3 = data.code3;
        }
        if (data.healthAgreementId) {
          state.newUser.healthAgreementId = data.healthAgreementId;
        }
        if (data.phoneCode && data.phone) {
          state.phone = data.phone.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '');
          state.phoneCode = data.phoneCode.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '');
          state.newUser.phone = `${state.phoneCode}${state.phone}`;
        } else if (data.phone) {
          state.phoneCode = data.phone.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').slice(0,2);
          state.phone = data.phone.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '').slice(2,data.phone.length);
          state.newUser.phone = `${state.phoneCode}${state.phone}`;
        }
        if (data.accept !== undefined) {
          state.accept = data.accept;
        }
      };
    }

    const receiveQueue = (queue) => {
      alertError.value = '';
      state.errorsAdd = [];
      getQueue(queue);
      state.totalDurationRequested = 0;
      state.amountofBlocksNeeded = 0;
      setCanBook();
    }

    const receiveServices = async (services) => {
      alertError.value = '';
      state.errorsAdd = [];
      state.services = services;
      setCanBook();
    }

    const receiveSelectedServices = async (services) => {
      state.selectedServices = services;
      state.totalDurationRequested = state.selectedServices.reduce((acc, service) => acc + (service.serviceInfo.blockTime || service.serviceInfo.estimatedTime), 0);
      state.amountofBlocksNeeded = Math.ceil(state.totalDurationRequested/state.queue.blockTime);
      if (state.specificCalendar === true) {
        state.specificCalendarDate = undefined;
        if (state.specificCalendarDate && state.specificCalendarDate !== 'TODAY') {
          getAvailableBookingSuperBlocks();
        } else {
          getAvailableAttentionSuperBlocks();
        }
      } else {
        state.date = undefined;
        if (state.date && state.date !== 'TODAY') {
          getAvailableBookingSuperBlocks();
        } else {
          getAvailableAttentionSuperBlocks();
        }
      }
      setCanBook();
    }

    const setCanBook = () => {
      state.canBook = false;
      if (state.queue && state.queue.id) {
        if (['STANDARD', 'SERVICE'].includes(state.queue.type)) {
          state.canBook = true;
        } else {
          if (state.selectedServices && state.selectedServices.length > 0) {
            state.canBook = true;
          } else {
            state.canBook = false;
          }
        }
      }
      if (state.canBook === false) {
        state.showToday = false;
        state.showReserve = false;
        state.date = undefined;
        state.specificCalendarDate = undefined;
        state.block = {};
      }
    }

    const formattedDate = (date) => {
      if (date && date !== 'TODAY') {
        return new Date(date).toISOString().slice(0,10);
      }
    }

    const getBookings = async () => {
      const { unsubscribe } = await updatedBookings(formattedDate(state.date || state.specificCalendarDate));
      unsubscribeBookings = unsubscribe;
    }

    const updatedBookings = (date) => {
      let unsubscribe;
      if (date !== undefined) {
        const bookingsQuery = bookingCollection
          .where('commerceId', '==', state.commerce.id)
          .where('status', "in", ['PENDING', 'CONFIRMED'])
          .where('date', '==', date);
        unsubscribe = bookingsQuery.onSnapshot(snapshot => {
          state.allBookings = snapshot.docs.map(doc => {
            const booking = { id: doc.id, ...doc.data() };
            return booking;
          })
        })
      }
      return { unsubscribe };
    }

    const getAttentions = () => {
      const { unsubscribe } = updatedAttentions();
      unsubscribeAttentions = unsubscribe;
    }

    const isActiveCommerce = (commerce) => {
      return commerce.active === true;
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
        getActiveFeature(state.commerce, 'attention-user-email', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-birthday', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-address', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-origin', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-code1', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-code2', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-code3', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-health-agreement', 'USER')
      ) {
        return true;
      }
      state.accept = false;
      return false;
    }

    const validate = (user) => {
      alertError.value = '';
      state.errorsAdd = [];
      if (!user.clientId || user.clientId.length === 0) {
        if (!getActiveFeature(state.commerce, 'attention-user-not-required', 'USER')) {
          if (getActiveFeature(state.commerce, 'attention-user-name', 'USER')) {
            if (!user.name || user.name.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.name');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-lastName', 'USER')) {
            if (!user.lastName || user.lastName.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.lastName');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-idNumber', 'USER')) {
            if (!user.idNumber || user.idNumber.length === 0 || !validateIdNumber(state.commerce, user.idNumber)) {
              state.errorsAdd.push('commerceQueuesView.validate.idNumber');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-phone', 'USER')) {
            if (!state.phoneCode || state.phoneCode.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.phoneCode');
            } else {
              if (state.phoneCode === 'xx') {
                state.phoneCode = '';
              }
              user.phone = state.phoneCode + state.phone.replace(/^0+/, '');
            }
            if(!state.phone || state.phone.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.phone');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-email', 'USER')) {
            if (!user.email || user.email.length === 0 || !validateEmail(user.email)) {
              state.errorsAdd.push('commerceQueuesView.validate.email');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-address', 'USER')) {
            if (!user.addressText || user.addressText.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.addressText');
            }
            if (!user.addressCode || user.addressCode.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.addressCode');
            }
            if (!user.addressComplement || user.addressComplement.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.addressComplement');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-birthday', 'USER')) {
            if (!user.birthday || user.birthday.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.birthday');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-origin', 'USER')) {
            if (!user.origin || user.origin.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.origin');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-code1', 'USER')) {
            if (!user.code1 || user.code1.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.code1');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-code2', 'USER')) {
            if (!user.code2 || user.code2.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.code2');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-code3', 'USER')) {
            if (!user.code3 || user.code3.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.code3');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-health-agreement', 'USER')) {
            if (!user.healthAgreementId || user.healthAgreementId.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.healthAgreementId');
            }
          }
        } else {
          if (getActiveFeature(state.commerce, 'attention-user-email', 'USER')) {
            if (!validateEmail(user.email)) {
              state.errorsAdd.push('commerceQueuesView.validate.email');
            }
          }
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

    const buildUserBody = (user) => {
      const personalInfo = {};
      if (user.birthday) {
        personalInfo.birthday = user.birthday;
        delete user.birthday;
      }
      if (user.addressText) {
        personalInfo.addressText = user.addressText;
        delete user.addressText;
      }
      if (user.addressCode) {
        personalInfo.addressCode = user.addressCode;
        delete user.addressCode;
      }
      if (user.addressComplement) {
        personalInfo.addressComplement = user.addressComplement;
        delete user.addressComplement;
      }
      if (user.origin) {
        personalInfo.origin = user.origin;
        delete user.origin;
      }
      if (user.code1) {
        personalInfo.code1 = user.code1;
        delete user.code1;
      }
      if (user.code2) {
        personalInfo.code2 = user.code2;
        delete user.code2;
      }
      if (user.code3) {
        personalInfo.code3 = user.code3;
        delete user.code3;
      }
      if (user.healthAgreementId) {
        personalInfo.healthAgreementId = user.healthAgreementId;
        delete user.healthAgreementId;
      }
      user.personalInfo = personalInfo;
      return user;
    }

    const getAttention = async (block) => {
      try {
        loadingService.value = true;
        alertError.value = '';
        if (validate(state.newUser)) {
          state.currentChannel = await store.getCurrentAttentionChannel;
          const bodyUser = buildUserBody(state.newUser);
          let newUser = undefined;
          if (isDataActive(state.commerce)) {
            newUser = { ...bodyUser, commerceId: state.commerce.id, notificationOn: state.accept, notificationEmailOn: state.accept, acceptTermsAndConditions: state.accept };
          }
          let body = { queueId: state.queue.id, channel: state.currentChannel, user: newUser, clientId: state.newUser.clientId }
          if (block && block.number) {
            body = { ...body, block };
          }
          if (state.selectedServices && state.selectedServices.length > 0) {
            const servicesId = state.selectedServices.map(serv => serv.id);
            const servicesDetails = state.selectedServices.map(serv => {
              return {
                id: serv.id,
                name: serv.name,
                tag: serv.tag,
                procedures: serv.serviceInfo.procedures || 1
              }
            });
            body = {
              ...body,
              servicesId,
              servicesDetails
            };
          }
          state.date = undefined;
          state.specificCalendarDate = undefined;
          const attention = await createAttention(body);
          const user = await store.getCurrentUserType;
          if (user && user === 'collaborator') {
            router.push({
              name: 'collaborator-queue-attention',
              params: { queueId: state.queue.id, id: attention.id }
            })
          } else {
            router.push({
              name: 'commerce-queue-attention',
              params: { queueId: state.queue.id, id: attention.id }
            })
          }
        }
        loadingService.value = false;
      } catch (error) {
        loadingService.value = false;
        alertError.value = error.response.status || 500;
      }
    };

    const getBooking = async () => {
      const timeout = (Math.random() * 1000) + 1000;
      try {
        loadingService.value = true;
        alertError.value = '';
        if (validate(state.newUser)) {
          state.currentChannel = await store.getCurrentAttentionChannel;
          const bodyUser = buildUserBody(state.newUser);
          let newUser = undefined;
          if (isDataActive(state.commerce)) {
            newUser = {
              ...bodyUser,
              commerceId: state.commerce.id,
              notificationOn: state.accept,
              notificationEmailOn: state.accept,
              acceptTermsAndConditions: state.accept
            };
          }
          let body = {
            queueId: state.queue.id,
            channel: state.currentChannel,
            user: newUser,
            date: formattedDate(state.date || state.specificCalendarDate),
            block: state.block,
            clientId: state.newUser.clientId,
            sessionId: state.sessionId
          };
          if (state.selectedServices && state.selectedServices.length > 0) {
            const servicesId = state.selectedServices.map(serv => serv.id);
            const servicesDetails = state.selectedServices.map(serv => {
              return {
                id: serv.id,
                name: serv.name,
                tag: serv.tag,
                procedures: serv.serviceInfo.procedures || 1
              }
            });
            body = { ...body, servicesId, servicesDetails };
          }
          await addBookingNumberUsed(state.sessionId, state.queue.id, formattedDate(state.date || state.specificCalendarDate));
          setTimeout(async () => {
            try {
              const booking = await createBooking(body);
              const user = await store.getCurrentUserType;
              if (user && user === 'collaborator') {
                router.push({
                  name: 'collaborator-queue-booking',
                  params: { id: booking.id }
                })
              } else {
                router.push({
                  name: 'commerce-queue-booking',
                  params: { id: booking.id }
                })
              }
              loadingService.value = false;
            } catch (error) {
              loadingService.value = false;
              alertError.value = error.response.status || 500;
            }
          }, timeout);
        } else {
          loadingService.value = false;
        }
      } catch (error) {
        loadingService.value = false;
        alertError.value = error.response.status || 500;
      }
    };

    const addBookingNumberUsed = async (sessionId, queueId, date) => {
      try {
        // caso bloque varios horarios
        if (state.block && state.block.blockNumbers) {
          for(let i = 0; i < state.block.blocks.length; i++) {
            const block = state.block.blocks[i];
            const number = block.number;
            const hourFrom = block.hourFrom;
            const hourTo = block.hourTo;
            const body = {
              sessionId: sessionId,
              blockNumber: number,
              hourFrom: hourFrom,
              hourTo: hourTo,
              queueId: queueId,
              date: date,
              dateRequested: new Date(),
              time: new Date().getTime()
            };
            await bookingBlockNumberUsedCollection.add(body);
          }
          // caso bloque 1 horario
        } else if (state.block && state.block.number) {
          const number = state.block.number;
          const hourFrom = state.block.hourFrom;
          const hourTo = state.block.hourTo;
          const body = {
            sessionId: sessionId,
            blockNumber: number,
            hourFrom: hourFrom,
            hourTo: hourTo,
            queueId: queueId,
            date: date,
            dateRequested: new Date(),
            time: new Date().getTime()
          };
          await bookingBlockNumberUsedCollection.add(body);
        }
      } catch (error) { }
    }

    const getWaitList = async () => {
      try {
        loadingService.value = true;
        alertError.value = '';
        if (validate(state.newUser)) {
          state.currentChannel = await store.getCurrentAttentionChannel;
          const bodyUser = buildUserBody(state.newUser);
          let newUser = undefined;
          if (isDataActive(state.commerce)) {
            newUser = { ...bodyUser, commerceId: state.commerce.id, notificationOn: state.accept, notificationEmailOn: state.accept, acceptTermsAndConditions: state.accept };
          }
          const body = { queueId: state.queue.id, channel: state.currentChannel, user: newUser, date: formattedDate(state.date || state.specificCalendarDate), clientId: state.newUser.clientId  }
          const waitlist = await createWaitlist(body);
          if (waitlist && waitlist.id) {
            state.waitlistCreated = true;
          }
        }
        loadingService.value = false;
      } catch (error) {
        loadingService.value = false;
        alertError.value = error.response.status || 500;
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
        const [year, month, day] = state.date.slice(0,10).split('-');
        let dayNumber = new Date(+year, +month - 1, +day).getDay();
        if (dayNumber === 0) {
          dayNumber = 7;
        }
        return state.blocksByDay[dayNumber];
      }
    }

    const getBlocksBySpecificDay = () => {
      if (!state.specificCalendarDate || state.specificCalendarDate === 'TODAY') {
        const date = formattedDate(new Date());
        return state.blocksBySpecificCalendarDate[date];
      } else {
        const date = formattedDate(state.specificCalendarDate);
        return state.blocksBySpecificCalendarDate[date];
      }
    }

    const getQueue = async (queueIn) => {
      state.queue = queueIn;
      if (state.queue.id) {
        if (getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')) {
          getDisabledDates();
          state.date = undefined;
          state.specificCalendarDate = undefined;
          state.block = {};
          state.attentionBlock = {};
        }
      }
      if (captchaEnabled) {
       await validateCaptchaOk(true);
      }
    }

    const attentionsAvailables = () => {
      getAvailableAttentionBlocks(state.attentions);
      const blockAvailable = state.availableAttentionBlocks.filter(block => block.number === state.attentionBlock.number);
      if (!blockAvailable || blockAvailable.length === 0) {
        state.attentionAvailable = false;
      } else {
        state.attentionAvailable = true;
      }
    }

    const bookingsAvailables = () => {
      const blockAvailable = state.availableBookingBlocks.filter(block => block.number === state.block.number)
      if (!blockAvailable || blockAvailable.length === 0) {
        state.bookingAvailable = false;
        alertError.value = '';
      } else {
        state.bookingAvailable = true;
      }
    }

    const isQueueWalkin = () => {
      if (state.queue && state.queue.serviceInfo) {
        if (state.queue.serviceInfo.walkin) {
          return state.queue.serviceInfo.walkin;
        }
        return false;
      }
      return false;
    }

    const getActualDay = (day, timeZoneIn) => {
      const dateCorrected = new Date(
      new Date(day).toLocaleString('en-US', {
        timeZone: timeZoneIn,
      }));
      return dateCorrected;
    }

    const setDate = (date) => {
      if (state.queue.id) {
        state.date = date;
        state.specificCalendarDate = date;
        state.block = {};
      }
    }

    const goBack = () => {
      router.back()
    }

    const showToday = () => {
      state.attentionBlock = {},
      state.block = {};
      state.date = 'TODAY';
      state.specificCalendarDate = 'TODAY';
      state.showToday = true;
      state.showReserve = false;
    }

    const showReserve = () => {
      state.block = {};
      state.attentionBlock = {},
      state.date = undefined;
      state.specificCalendarDate = undefined;
      state.showToday = false;
      state.showReserve = true;
    }

    const validateCaptchaOk = async (response) => {
      if(response) {
        captcha = true;
        if (!getActiveFeature(state.commerce, 'booking-active', 'PRODUCT') || isQueueWalkin()) {
          await getAttention(undefined);
        }
      }
    };

    const validateCaptchaError = () => {
      captcha = false;
    };

    const getAvailableBookingBlocks = (bookings) => {
      state.availableBookingBlocks = [];
      let availableBlocks = [];
      let queueBlocks = [];
      if (state.queue.type !== 'SELECT_SERVICE') {
        if (state.blocks) {
          queueBlocks = state.blocks;
          if (queueBlocks && queueBlocks.length > 0) {
            let bookingsReserved = [];
            if (bookings && bookings.length > 0) {
              bookingsReserved = bookings.map(booking => {
                if (booking.block && booking.block.blockNumbers && booking.block.blockNumbers.length > 0) {
                  return [...booking.block.blockNumbers];
                } else {
                  return booking.block.number;
                }
              });
              let limit = 0;
              if (state.queue.serviceInfo !== undefined && state.queue.serviceInfo.blockLimit !== undefined && state.queue.serviceInfo.blockLimit > 0) {
                limit = state.queue.serviceInfo.blockLimit;
              }
              const totalBlocksReserved = bookingsReserved.flat(Infinity).sort();
              const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
              const blockedBlocks = []
              uniqueBlocksReserved.forEach(block => {
                const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                if (times >= limit) {
                  blockedBlocks.push(block);
                }
              })
              availableBlocks = queueBlocks.filter(block => !blockedBlocks.includes(block.number));
            } else {
              availableBlocks = queueBlocks;
            }
          }
        }
      } else {
        if (state.selectedServices && state.selectedServices.length > 0) {
          const candidateQueues = [];
          if (state.groupedQueues && state.groupedQueues['COLLABORATOR'] && state.groupedQueues['COLLABORATOR'].length > 0) {
            const services = state.selectedServices.map(serv => serv.id);
            state.groupedQueues['COLLABORATOR'].forEach(queue => {
              if (queue.services && queue.services.length > 0) {
                const availableServices = queue.services.map(serv => serv.id);
                if (services.every(serv => availableServices.includes(serv))){
                  candidateQueues.push(queue);
                }
              } else {
                candidateQueues.push(queue);
              }
            })
          }
          if (state.blocks) {
            queueBlocks = state.blocks;
            if (queueBlocks && queueBlocks.length > 0) {
              let bookingsReserved = [];
              candidateQueues.push(state.queue);
              if (candidateQueues && candidateQueues.length > 0) {
                candidateQueues.forEach(queue => {
                  const bookings = state.groupedBookingsByQueue[queue.id];
                  if (bookings && bookings.length > 0) {
                    const reserved = bookings.map(booking => {
                      if (booking.block && booking.block.blockNumbers && booking.block.blockNumbers.length > 0) {
                        return [...booking.block.blockNumbers];
                      } else {
                        return booking.block.number;
                      }
                    });
                    bookingsReserved.push(reserved);
                  }
                })
                let limit = candidateQueues.length === 1 ? 1 : candidateQueues.length - 1;
                if (state.queue.serviceInfo !== undefined && state.queue.serviceInfo.blockLimit !== undefined && state.queue.serviceInfo.blockLimit > 0) {
                  limit = state.queue.serviceInfo.blockLimit;
                }
                if (limit > 0) {
                  const totalBlocksReserved = bookingsReserved.flat(Infinity).sort();
                  const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
                  const blockedBlocks = []
                  uniqueBlocksReserved.forEach(block => {
                    const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                    if (times >= limit) {
                      blockedBlocks.push(block);
                    }
                  })
                  availableBlocks = queueBlocks.filter(block => !blockedBlocks.includes(block.number));
                }
              } else {
                return [];
              }
            }
          }
        }
      }
      state.availableBookingBlocks = availableBlocks;
    }

    const getAvailableAttentionBlocks = (attentions) => {
      let availableBlocks = [];
      let queueBlocks = [];
      if (state.queue.type !== 'SELECT_SERVICE') {
        if (state.blocks) {
          queueBlocks = state.blocks;
          const timeZone = state.commerce && state.commerce.localeInfo ? state.commerce.localeInfo.timezone : 'America/Sao_Paulo;'
          if (queueBlocks && queueBlocks.length > 0) {
            let attentionsReserved = [];
            queueBlocks = queueBlocks.filter(block => {
              const hourBlock = parseInt(block.hourFrom.split(':')[0]);
              const minBlock = parseInt(block.hourFrom.split(':')[1]);
              const day = new Date(getActualDay(new Date(), timeZone)).getTime();
              const dayBlock = new Date(day).setHours(hourBlock, minBlock, 0);
              return (dayBlock > day);
            });
            if (attentions && attentions.length > 0) {
              attentionsReserved = attentions.map(attention => {
                if (attention.block && attention.block.blockNumbers && attention.block.blockNumbers.length > 0) {
                  return [...attention.block.blockNumbers];
                } else {
                  return attention.number;
                }
              }
              );
              let limit = 0;
              if (state.queue.serviceInfo !== undefined && state.queue.serviceInfo.blockLimit !== undefined && state.queue.serviceInfo.blockLimit > 0) {
                limit = state.queue.serviceInfo.blockLimit;
              }
              const totalBlocksReserved = attentionsReserved.flat(Infinity).sort();
              const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
              const blockedBlocks = []
              uniqueBlocksReserved.forEach(block => {
                const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                if (times >= limit) {
                  blockedBlocks.push(block);
                }
              })
              availableBlocks = queueBlocks.filter(block => !attentionsReserved.flat(Infinity).includes(block.number));
            } else {
              availableBlocks = queueBlocks;
            }
          }
        }
      } else {
        if (state.selectedServices && state.selectedServices.length > 0) {
          const candidateQueues = [];
          if (state.groupedQueues && state.groupedQueues['COLLABORATOR'] && state.groupedQueues['COLLABORATOR'].length > 0) {
            const services = state.selectedServices.map(serv => serv.id);
            state.groupedQueues['COLLABORATOR'].forEach(queue => {
              if (queue.services && queue.services.length > 0) {
                const availableServices = queue.services.map(serv => serv.id);
                if (services.every(serv => availableServices.includes(serv))){
                  candidateQueues.push(queue);
                }
              } else {
                candidateQueues.push(queue);
              }
            });
          }
          if (state.blocks) {
            queueBlocks = state.blocks;
            const timeZone = state.commerce && state.commerce.localeInfo ? state.commerce.localeInfo.timezone : 'America/Sao_Paulo;'
            if (queueBlocks && queueBlocks.length > 0) {
              let attentionsReserved = [];
              queueBlocks = queueBlocks.filter(block => {
                const hourBlock = parseInt(block.hourFrom.split(':')[0]);
                const minBlock = parseInt(block.hourFrom.split(':')[1]);
                const day = new Date(getActualDay(new Date(), timeZone)).getTime();
                const dayBlock = new Date(day).setHours(hourBlock, minBlock, 0);
                return (dayBlock > day);
              });
              candidateQueues.push(state.queue);
              if (candidateQueues && candidateQueues.length > 0) {
                candidateQueues.forEach(queue => {
                  const attentions = state.groupedAttentionsByQueue[queue.id];
                  if (attentions && attentions.length > 0) {
                    const reserved = attentions.map(attention => {
                      if (attention.block && attention.block.blockNumbers && attention.block.blockNumbers.length > 0) {
                        return [...attention.block.blockNumbers];
                      } else {
                        return attention.block?.number;
                      }
                    });
                    attentionsReserved.push(reserved);
                  }
                })
                let limit = candidateQueues.length === 1 ? 1 :candidateQueues.length - 1;
                if (state.queue.serviceInfo !== undefined && state.queue.serviceInfo.blockLimit !== undefined && state.queue.serviceInfo.blockLimit > 0) {
                  limit = state.queue.serviceInfo.blockLimit;
                }
                if (limit > 0) {
                  const totalBlocksReserved = attentionsReserved.flat(Infinity).sort();
                  const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
                  const blockedBlocks = []
                  uniqueBlocksReserved.forEach(block => {
                    const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                    if (times >= limit) {
                      blockedBlocks.push(block);
                    }
                  })
                  availableBlocks = queueBlocks.filter(block => !blockedBlocks.includes(block.number));
                }
              } else {
                return [];
              }
            }
          }
        }
      }
      state.availableAttentionBlocks = availableBlocks;
    }

    const updatedAttentions = () => {
      let values = ref([]);
      let unsubscribe;
      const date = new Date(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0,10));
      const dateToRequest = firebase.firestore.Timestamp.fromDate(date);
      const attentionsQuery = attentionCollection
        .where('commerceId', '==', state.commerce.id)
        .where('status', "in", ['PENDING', 'TERMINATED', 'RATED'])
        .orderBy('createdAt', 'asc')
        .orderBy('number', 'asc')
        .where('createdAt', '>', dateToRequest);
      unsubscribe = attentionsQuery.onSnapshot(snapshot => {
        values.value = snapshot.docs
          .map(doc => {
            const attention = { id: doc.id, ...doc.data() };
            return attention;
          })
      })
      if (values && values.value && values.value.length > 0) {
        state.attentions = values.value.filter(attention => attention.queueId === state.queue.id);
      }
      state.allAttentions = values;
      return { unsubscribe };
    }

    const getAvailableDatesByCalendarMonth = async (pages) => {
      if (pages && pages.length > 0) {
        const page = pages[0].id;
        if (state.specificCalendar === true) {
          await getAvailableSpecificDatesByMonth(`${page}-01`);
        } else {
          await getAvailableDatesByMonth(`${page}-01`);
        }
      }
    }

    const getAvailableDatesByMonth = async (date) => {
      loadingHours.value = true;
      let availableDates = [];
      const [year, month] = date.split('-');
      const thisMonth = +month - 1;
      const nextMonth = +month;
      const dateFrom = new Date(+year, thisMonth, 1);
      const dateTo = new Date(+year, nextMonth, 0);
      const monthBookings = await getPendingBookingsBetweenDates(state.queue.id, dateFrom, dateTo) || [];
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
      if (dates && dates.length > 0) {
        dates.forEach(date => {
          const bookings = bookingsGroupedByDate[date];
          const [year, month, day] = date.split('-');
          let dayNumber = new Date(+year, +month - 1, +day).getDay();
          if (dayNumber === 0) {
            dayNumber = 7;
          }
          const blocks = state.blocksByDay[dayNumber] || [];
          if (bookings.length === blocks.length) {
            forDeletion.push(date);
          }
        })
      }
      const availability = await availableDates.filter(item => !forDeletion.includes(item));
      const avaliableToCalendar = await availability.map(date => {
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
      loadingHours.value = false;
    }

    const getAvailableBookingSuperBlocks = () => {
      state.availableBookingSuperBlocks = [];
      if (state.selectedServices && state.selectedServices.length > 0) {
        const superBlocks = [];
        if (state.amountofBlocksNeeded > 1) {
          const toBuild = [];
          const availables = state.availableBookingBlocks.map(block => block.number);
          for (let i = 0; i < state.availableBookingBlocks.length; i++) {
            const block = state.availableBookingBlocks[i];
            const number = block.number;
            if (number) {
              const toCheck = [];
              for (let j = 0; j < state.amountofBlocksNeeded; j++) {
                toCheck.push(block.number + j);
              }
              if (availables.join(',').includes(toCheck.join(','))) {
                toBuild.push(toCheck);
              }
            }
          }
          if (toBuild.length > 0) {
            toBuild.forEach(build => {
              const blocks = [];
              build.forEach(pos => {
                blocks.push(state.availableBookingBlocks.filter(block => block.number === pos)[0]);
              })
              if (blocks && blocks.length > 0 && blocks[state.amountofBlocksNeeded-1] && blocks[state.amountofBlocksNeeded-1] !== undefined) {
                const number = blocks[0].number;
                const hourFrom = blocks[0].hourFrom;
                const hourTo = blocks[state.amountofBlocksNeeded-1].hourTo;
                superBlocks.push({
                  number,
                  hourFrom,
                  hourTo,
                  blocks,
                  blockNumbers: build
                })
              }
            })
            state.availableBookingSuperBlocks = superBlocks;
          } else {
            state.availableBookingSuperBlocks = [];
          }
        } else {
          state.availableBookingSuperBlocks = [];
        }
      }
    }

    const getAvailableAttentionSuperBlocks = () => {
      loadingHours.value = true;
      if (state.selectedServices && state.selectedServices.length > 0) {
        const superBlocks = [];
        if (state.amountofBlocksNeeded > 1) {
          const toBuild = [];
          const availables = state.availableAttentionBlocks.map(block => block.number);
          for (let i = 0; i < state.availableAttentionBlocks.length; i++) {
            const block = state.availableAttentionBlocks[i];
            const number = block.number;
            if (number) {
              const toCheck = [];
              for (let j = 0; j < state.amountofBlocksNeeded; j++) {
                toCheck.push(block.number + j);
              }
              if (availables.join(',').includes(toCheck.join(','))) {
                toBuild.push(toCheck);
              }
            }
          }
          if (toBuild.length > 0) {
            toBuild.forEach(build => {
              const blocks = [];
              build.forEach(pos => {
                blocks.push(state.availableAttentionBlocks.filter(block => block.number === pos)[0]);
              })
              const number = blocks[0].number;
              const hourFrom = blocks[0].hourFrom;
              const hourTo = blocks[state.amountofBlocksNeeded-1].hourTo;
              superBlocks.push({
                number,
                hourFrom,
                hourTo,
                blocks,
                blockNumbers: build
              })
            })
            state.availableAttentionSuperBlocks = superBlocks;
          } else {
            state.availableAttentionSuperBlocks = [];
          }
        } else {
          state.availableAttentionSuperBlocks = [];
        }
      }
      loadingHours.value = false;
    }

    const getAvailableSpecificDatesByMonth = async (date) => {
      loadingHours.value = true;
      let availableDates = [];
      const [year, month] = date.split('-');
      const thisMonth = +month - 1;
      const nextMonth = +month;
      const dateFrom = new Date(+year, thisMonth, 1);
      const dateTo = new Date(+year, nextMonth, 0);
      const monthBookings = await getPendingBookingsBetweenDates(state.queue.id, dateFrom, dateTo) || [];
      const bookingsGroupedByDate = monthBookings.reduce((acc, booking) => {
        const date = booking.date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(booking);
        return acc;
      }, {});
      await state.specificCalendarDates.map(dat => {
        const [year, month, day] = dat.split('-');
        const date = new Date(year, +month - 1, day);
        if (date >= dateFrom && date <= dateTo) {
          availableDates.push(new DateModel(date).toString());
        }
      });
      const forDeletion = [];
      if (availableDates && availableDates.length > 0) {
        let limit = 1;
        if (state.queue.serviceInfo !== undefined && state.queue.serviceInfo.blockLimit !== undefined && state.queue.serviceInfo.blockLimit > 0) {
          limit = state.queue.serviceInfo.blockLimit;
        }
        availableDates.forEach(date => {
          const bookings = bookingsGroupedByDate[date] || [];
          const blocks = state.blocksBySpecificCalendarDate[date] || [];
          const blocksNumbers = blocks.map(block => block.number);
          const bookingsReserved = bookings.map(booking => booking.block.blockNumbers || booking.block.number);
          const totalBlocksReserved = bookingsReserved.flat(Infinity).sort();
          const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
          uniqueBlocksReserved.forEach(block => {
            const times = totalBlocksReserved.filter(reserved => reserved === block).length;
            if (times >= limit && blocksNumbers.every(block => totalBlocksReserved.includes(block)) && !forDeletion.includes(date)) {
              if (uniqueBlocksReserved.length === blocks.length) {
                forDeletion.push(date);
              }
            }
          })
          if (!forDeletion.includes(date) && date === formattedDate(state.specificCalendarDate)) {
            if (state.amountofBlocksNeeded > 1 && state.availableBookingSuperBlocks.length === 0) {
              forDeletion.push(date);
            } else if (state.amountofBlocksNeeded === 1 && state.availableBookingBlocks.length === 0) {
              forDeletion.push(date);
            }
          }
        })
      }
      const availability = await availableDates.filter(item => !forDeletion.includes(item));
      const avaliableToCalendar = await availability.map(date => {
        const [year,month,day] = date.split('-');
        return new Date(+year, +month - 1, +day);
      });
      specificCalendarAttributes.value[0].dates = [];
      specificCalendarAttributes.value[0].dates.push(...avaliableToCalendar);
      const forDeletionToCalendar = forDeletion.map(date => {
        const [year,month,day] = date.split('-');
        return new Date(+year, +month - 1, +day);
      });
      specificCalendarAttributes.value[1].dates = [];
      specificCalendarAttributes.value[1].dates.push(...forDeletionToCalendar);
      loadingHours.value = false;
    }

    const showFillForm = () => {
      state.showFillForm = true;
      state.showPickQueue = false;
      state.showPickHours = false;
    }

    const showPickQueue = () => {
      state.showFillForm = false;
      state.showPickQueue = true;
      state.showPickHours = false;
    }

    const showPickHours = () => {
      state.showFillForm = false;
      state.showPickQueue = false;
      state.showPickHours = true;
    }

    const showFormStep = () => {
      if (state.showFillForm) {
        return 30;
      }
      if (state.showPickQueue) {
        return 60;
      }
      if (state.showPickHours) {
        return 90;
      }
      return 0;
    }

    const changeDate = computed(() => {
      const {
        date
      } = state;
      return {
        date
      }
    })

    const changeQueue = computed(() => {
      const {
        queue
      } = state;
      return {
       queue
      }
    })

    const changeAttention = computed(() => {
      const {
        allAttentions
      } = state;
      return {
        allAttentions
      }
    })

    const changeBooking = computed(() => {
      const {
        allBookings
      } = state;
      return {
        allBookings
      }
    })

    const changeAttentionBlock = computed(() => {
      const {
        attentionBlock
      } = state;
      return {
        attentionBlock
      }
    })

    const changeBlock = computed(() => {
      const {
        block
      } = state;
      return {
        block
      }
    })

    const changeSpecificCalendarDate = computed(() => {
      const {
        specificCalendarDate
      } = state;
      return {
        specificCalendarDate
      }
    })

    watch (
      changeQueue,
      async () => {
        if (state.queue && state.queue.id) {
          if (state.queue.serviceInfo && state.queue.serviceInfo.specificCalendar) {
            state.specificCalendar = true;
          } else if (state.commerce.serviceInfo && state.commerce.serviceInfo.specificCalendar) {
            state.specificCalendar = true;
          } else {
            state.specificCalendar = false;
          }
          if (state.specificCalendar === true) {
            if (state.queue.serviceInfo && state.queue.serviceInfo.specificCalendarDays) {
              state.specificCalendarDates = Object.keys(state.queue.serviceInfo.specificCalendarDays) || [];
              state.specificCalendarDays = state.commerce.serviceInfo.specificCalendarDays;
              state.specificCalendarDates = Object.keys(state.queue.serviceInfo.specificCalendarDays) || [];
            } else if (state.commerce.serviceInfo && state.commerce.serviceInfo.specificCalendarDays) {
              state.specificCalendarDates = Object.keys(state.commerce.serviceInfo.specificCalendarDays) || [];
              state.specificCalendarDays = state.commerce.serviceInfo.specificCalendarDays;
              state.specificCalendarDates = Object.keys(state.commerce.serviceInfo.specificCalendarDays) || [];
            }
            state.blocksBySpecificCalendarDate = await getQueueBlockDetailsBySpecificDayByCommerceId(state.commerce.id, state.queue.id);
            state.blocks = getBlocksBySpecificDay();
          } else {
            state.blocksByDay = await getQueueBlockDetailsByDay(state.queue.id);
            state.blocks = getBlocksByDay();
          }
        }
        state.block = {};
        let currentDate;
        if ((state.date === undefined || state.date === 'TODAY') || (state.specificCalendarDate === undefined || state.specificCalendarDate === 'TODAY')) {
          currentDate = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().slice(0, 10);
        } else {
          currentDate = new Date(new Date(state.date || new Date()).setDate(new Date().getDate() + 1)).toISOString().slice(0, 10);
        }
        getAvailableBookingBlocks(state.bookings);
        getAvailableBookingSuperBlocks();
        bookingsAvailables();
        if (state.specificCalendar === true) {
          await getAvailableSpecificDatesByMonth(currentDate);
        } else {
          await getAvailableDatesByMonth(currentDate);
        }
      }
    )

    watch (
      changeAttention,
      async (newData, oldData) => {
        alertError.value = '';
        if (newData.allAttentions !== oldData.allAttentions) {
          const newIds = newData.allAttentions.map(att => att.id);
          const oldIds = oldData.allAttentions.map(att => att.id);
          if (!newIds.every(id => oldIds.includes(id))) {
            if (state.allAttentions && state.allAttentions.length > 0) {
              state.groupedAttentionsByQueue = state.allAttentions.reduce((acc, att) => {
                const queueId = att.queueId;
                if (!acc[queueId]) {
                  acc[queueId] = [];
                }
                acc[queueId].push(att);
                return acc;
              }, {});
              state.attentions = state.groupedAttentionsByQueue[state.queue.id];
            }
          }
          getAvailableAttentionSuperBlocks();
          attentionsAvailables();
        }
      }
    )

    watch (
      changeAttentionBlock,
      async () => {
        if (state.attentionBlock) {
          attentionsAvailables();
          getAvailableAttentionSuperBlocks();
        }
      }
    )

    watch (
      changeBlock,
      async () => {
        if (state.attentionBlock) {
          getAvailableBookingBlocks(state.bookings);
          getAvailableBookingSuperBlocks();
          bookingsAvailables();
        }
      }
    )

    watch (
      changeBooking,
      async (newData, oldData) => {
        loadingHours.value = true;
        if (newData.allBookings !== oldData.allBookings &&
          ((state.date && state.date !== 'TODAY') || (state.specificCalendarDate && state.specificCalendarDate !== 'TODAY'))) {
          const newIds = newData.allBookings.map(booking => booking.id);
          const oldIds = oldData.allBookings.map(booking => booking.id);
          if (!newIds.every(id => oldIds.includes(id))) {
            if (state.allBookings && state.allBookings.length > 0) {
              state.groupedBookingsByQueue = state.allBookings.reduce((acc, book) => {
                const queueId = book.queueId;
                if (!acc[queueId]) {
                  acc[queueId] = [];
                }
                acc[queueId].push(book);
                return acc;
              }, {});
              state.bookings = state.groupedBookingsByQueue[state.queue.id];
            } else {
              state.groupedBookingsByQueue = {};
              state.groupedBookingsByQueue[state.queue.id] = [];
              state.bookings = [];
            }
          } else {
            state.groupedBookingsByQueue = {};
            state.groupedBookingsByQueue[state.queue.id] = [];
            state.bookings = [];
          }
          getAvailableBookingBlocks(state.bookings);
          getAvailableBookingSuperBlocks();
          bookingsAvailables();
          let currentDate;
          currentDate = new Date(new Date(state.date || new Date()).setDate(new Date().getDate() + 1)).toISOString().slice(0, 10);
          if (newData.allBookings.length > 0) {
            if (state.specificCalendar === true) {
              if (!state.specificCalendarDate || state.specificCalendarDates.includes(formattedDate(state.specificCalendarDate))) {
                await getAvailableSpecificDatesByMonth(currentDate);
              }
            } else {
              await getAvailableDatesByMonth(currentDate);
            }
          }
        }
        loadingHours.value = false;
      }
    )

    watch (
      changeDate,
      async (newData, oldData) => {
        if (state.date && state.date === 'TODAY') {
          if (getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')) {
            state.blocks = getBlocksByDay();
            state.block = {};
            if (unsubscribeAttentions) {
              unsubscribeAttentions();
            }
            getAttentions();
          } else {
            await getAttention(undefined);
          }
        } else if (newData.date && newData.date !== oldData.date) {
          state.blocks = getBlocksByDay();
          state.block = {};
          if (unsubscribeBookings) {
            unsubscribeBookings();
          }
          await getBookings();
        };
        getAvailableBookingBlocks(state.bookings);
        getAvailableBookingSuperBlocks();
        getAvailableAttentionSuperBlocks();
        bookingsAvailables();
        attentionsAvailables();
      }
    )

    watch (
      changeSpecificCalendarDate,
      async (newData, oldData) => {
        if (state.specificCalendarDate && state.specificCalendarDate === 'TODAY') {
          if (getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')) {
            state.blocks = getBlocksBySpecificDay();
            state.block = {};
            if (unsubscribeAttentions) {
              unsubscribeAttentions();
            }
            getAttentions();
          } else {
            await getAttention(undefined);
          }
        } else if (newData.specificCalendarDate && newData.specificCalendarDate !== oldData.specificCalendarDate) {
          state.blocks = getBlocksBySpecificDay();
          state.block = {};
          if (unsubscribeBookings) {
            unsubscribeBookings();
          }
          await getBookings();
        };
        getAvailableBookingBlocks(state.bookings);
        getAvailableBookingSuperBlocks();
        getAvailableAttentionSuperBlocks();
        bookingsAvailables();
        attentionsAvailables();
      }
    )

    return {
      state,
      siteKey,
      captchaEnabled,
      keyName,
      loading,
      loadingHours,
      loadingService,
      alertError,
      dateMask,
      disabledDates,
      calendarAttributes,
      calendar,
      loadingCalendar,
      queueId,
      name,
      lastName,
      idNumber,
      phone,
      email,
      addressText,
      addressComplement,
      birthday,
      code1,
      code2,
      code3,
      healthAgreementId,
      addressCode,
      origin,
      client,
      specificCalendarAttributes,
      formattedDate,
      isDataActive,
      getActiveFeature,
      isActiveCommerce,
      isAvailableCommerce,
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
      getAvailableDatesByCalendarMonth,
      isQueueWalkin,
      receiveData,
      receiveQueue,
      receiveServices,
      receiveSelectedServices,
      showFillForm,
      showPickQueue,
      showPickHours,
      showFormStep
    }
  }
}
</script>
<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
      <div id="page-header" class="text-center mt-2">
        <div class="welcome mb-2">
          <span>{{ $t("commerceQueuesView.welcome") }}</span>
        </div>
      </div>
      <div v-if="isActiveCommerce(state.commerce) && !loading">
        <div v-if="isAvailableCommerce(state.commerce)">
          <div class="centered mb-2">
            <div class="progress col-10 mx-4" style="height: 10px;">
              <div class="progress-bar bg-dark" role="progressbar" :style="`width: ${showFormStep()}%; height: 10px`" aria-valuemin="0" aria-valuemax="100"> </div>
            </div>
          </div>
          <!-- FORM -->
          <Transition name="flip">
            <div v-if="state.showFillForm">
              <ClientForm
                :show="true"
                :commerce="state.commerce"
                :name="state.newUser.name || name"
                :lastName="state.newUser.lastName || lastName"
                :idNumber="state.newUser.idNumber || idNumber"
                :email="state.newUser.email || email"
                :phone="state.newUser.phone || phone"
                :birthday="state.newUser.birthday || birthday"
                :addressText="state.newUser.addressText || addressText"
                :addressCode="state.newUser.addressCode || addressCode"
                :addressComplement="state.newUser.addressComplement || addressComplement"
                :origin="state.newUser.origin || origin"
                :code1="state.newUser.code1 || code1"
                :code2="state.newUser.code2 || code2"
                :code3="state.newUser.code3 || code3"
                :healthAgreementId="state.newUser.healthAgreementId || healthAgreementId"
                :client="client"
                :errorsAdd="state.errorsAdd"
                :receiveData="receiveData"
              >
              </ClientForm>
              <button
                class="btn btn-md col btn-size fw-bold btn-dark rounded-pill px-4"
                @click="showPickQueue()"
                :disabled="!state.accept">
                {{ $t("continue") }}
                <i class="bi bi-arrow-right-short"></i>
              </button>
            </div>
          </Transition>
          <Transition name="flip">
            <div v-if="state.showPickQueue">
               <!-- QUEUES -->
              <QueueForm
                :commerce="state.commerce"
                :queues="state.queues"
                :groupedQueues="state.groupedQueues"
                :queueId="state.queueId"
                :accept="state.accept"
                :collaborators="state.collaborators"
                :receiveQueue="receiveQueue"
                :receiveServices="receiveServices"
              >
              </QueueForm>
              <!-- SERVICE -->
              <ServiceForm
                :commerce="state.commerce"
                :queue="state.queue"
                :selectedServices="state.selectedServices"
                :receiveSelectedServices="receiveSelectedServices"
              >
              </ServiceForm>
              <button
                class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4"
                @click="showFillForm()">
                <i class="bi bi-arrow-left-short"></i>
              </button>
              <button
                class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4"
                @click="showPickHours()"
                :disabled="!state.queue.id || !state.canBook">
                {{ $t("continue") }}
                <i class="bi bi-arrow-right-short"></i>
              </button>
            </div>
          </Transition>
          <Transition name="flip">
            <div v-if="state.showPickHours">
              <!-- BOOKING / ATTENTION -->
              <div id="booking" v-if="getActiveFeature(state.commerce, 'booking-active', 'PRODUCT') && state.canBook">
                <div v-if="isActiveCommerce(state.commerce) && !isQueueWalkin()" class="choose-attention py-2 pt-3">
                  <i class="bi bi-3-circle-fill h5"></i> <span class="fw-bold h6"> {{ $t("commerceQueuesView.when") }} </span>
                </div>
                <div class="row g-1">
                  <div class="col col-md-10 offset-md-1 data-card">
                    <div class="row">
                      <!-- ATTENTION TODAY HOUR -->
                      <div v-if="
                        !getActiveFeature(state.commerce, 'attention-today-desactivated', 'PRODUCT') &&
                        getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT') &&
                        state.queue.id &&
                        !isQueueWalkin()" class="col" id="booking-today-hour">
                        <button
                          class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-2"
                          data-bs-toggle="collapse"
                          href="#booking-hour"
                          :class="state.showToday ? 'btn-selected' : ''"
                          @click="setDate('TODAY');showToday()"
                          :disabled="!state.accept || !state.queue.id">
                          {{ $t("commerceQueuesView.today") }} <i class="bi bi-chevron-down"></i>
                        </button>
                      </div>
                      <!-- ATTENTION TODAY -->
                      <div v-else-if="!getActiveFeature(state.commerce, 'attention-today-desactivated', 'PRODUCT')" class="col" id="booking-today">
                        <button
                          type="button"
                          v-if="!isQueueWalkin()"
                          class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-2"
                          @click="setDate('TODAY')"
                          :class="state.date === 'TODAY' ? 'btn-selected' : ''"
                          :disabled="!state.accept || !state.queue.id">
                          {{ $t("commerceQueuesView.today") }}
                        </button>
                      </div>
                      <!-- BOOKING -->
                      <div class="col">
                        <button
                          class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-2"
                          v-if="!isQueueWalkin()"
                          data-bs-toggle="collapse"
                          href="#booking-date"
                          @click="showReserve()"
                          :class="state.showReserve ? 'btn-selected' : ''"
                          :disabled="!state.accept || !state.queue.id">
                          {{ $t("commerceQueuesView.booking") }} <i class="bi bi-chevron-down"></i>
                        </button>
                      </div>
                    </div>
                    <div :class="state.showToday ? 'collapse mx-2 show' : 'collapse mx-2 hide'" id="booking-hour">
                      <div class="centered">
                        <div class="col col-md-9">
                          <div class="choose-attention py-1 pt-2">
                            <i class="bi bi-hourglass-split"></i> <span> {{ $t("commerceQueuesView.selectBlock") }} </span>
                          </div>
                          <Spinner :show="loadingHours"></Spinner>
                          <div v-if="!loadingHours">
                            <div v-if="state.amountofBlocksNeeded > 1">
                              <div v-if="state.availableAttentionSuperBlocks &&
                                state.availableAttentionSuperBlocks.length > 0 &&
                                state.date" class="mb-2">
                                <select class="btn btn-md btn-light fw-bold text-dark select" aria-label=".form-select-sm" v-model="state.attentionBlock">
                                  <option v-for="block in state.availableAttentionSuperBlocks" :key="block.number" :value="block" id="select-block">{{ block.hourFrom }} - {{ block.hourTo }}</option>
                                </select>
                              </div>
                              <div v-else>
                                <Message
                                  :title="$t('commerceQueuesView.message3.title')"
                                  :content="$t('commerceQueuesView.message3.content')">
                                </Message>
                                <div v-if="getActiveFeature(state.commerce, 'booking-block-walkin', 'PRODUCT') && state.queue.id">
                                  <div class="choose-attention py-1 pt-2">
                                    <span> {{ $t("commerceQueuesView.walkin") }} </span>
                                  </div>
                                  <button
                                    type="button"
                                    class="btn-size btn btn-lg btn-block col-9 fw-bold btn-dark rounded-pill mb-2 mt-2"
                                    @click="getAttention(undefined)"
                                    :disabled="!state.accept || !state.queue.id"
                                    >
                                    {{ $t("commerceQueuesView.confirm") }} <i class="bi bi-check-lg"></i>
                                </button>
                                </div>
                              </div>
                            </div>
                            <div v-else>
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
                                <div v-if="getActiveFeature(state.commerce, 'booking-block-walkin', 'PRODUCT') && state.queue.id">
                                  <div class="choose-attention py-1 pt-2">
                                    <span> {{ $t("commerceQueuesView.walkin") }} </span>
                                  </div>
                                  <button
                                    type="button"
                                    class="btn-size btn btn-lg btn-block col-9 fw-bold btn-dark rounded-pill mb-2 mt-2"
                                    @click="getAttention(undefined)"
                                    :disabled="!state.accept || !state.queue.id"
                                    >
                                    {{ $t("commerceQueuesView.confirm") }} <i class="bi bi-check-lg"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div v-if="getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT') && state.attentionBlock && state.attentionBlock.number" class="py-1 mt-2">
                              <hr>
                              {{ $t("commerceQueuesView.blockSelected") }}
                              <div class="badge rounded-pill bg-secondary py-2 px-4 m-1"><span> {{ state.attentionBlock.hourFrom }} - {{ state.attentionBlock.hourTo }} </span></div>
                            </div>
                            <div v-if="state.attentionBlock.number && state.attentionAvailable === false">
                            <Alert :show="!!state.attentionAvailable" :stack="990"></Alert>
                            </div>
                            <button
                              type="button"
                              v-if="state.attentionBlock && state.attentionBlock.number"
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
                    <div :class="state.showReserve ? 'collapse mx-2 show' : 'collapse mx-2 hide'" id="booking-date">
                      <!-- SPECIFIC CALENDAR-->
                      <div v-if="state.specificCalendar" class="centered">
                        <div class="col col-md-9">
                          <!-- ESCOGER FECHA -->
                          <div class="choose-attention py-1 pt-2">
                            <i class="bi bi-calendar-check"></i> <span> {{ $t("commerceQueuesView.selectDay") }} </span>
                          </div>
                          <div v-if="!loadingCalendar">
                            <VDatePicker
                              :locale="state.locale"
                              v-model.string="state.specificCalendarDate"
                              :mask="dateMask"
                              :min-date="state.minDate"
                              :max-date="state.maxDate"
                              :disabled-dates="disabledDates"
                              :attributes='specificCalendarAttributes'
                              @did-move="getAvailableDatesByCalendarMonth"
                            />
                            <div v-if="state.specificCalendarDate">
                              <div class="badge rounded-pill bg-secondary py-2 px-5 m-2"><span> {{ formattedDate(state.specificCalendarDate) }} </span></div>
                            </div>
                          </div>
                          <div v-if="loadingCalendar">
                            <Spinner :show="loadingCalendar"></Spinner>
                          </div>
                          <!-- ESCOGER HORARIO -->
                          <div v-if="getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')">
                            <Spinner :show="loadingHours"></Spinner>
                            <div v-if="!loadingHours">
                              <!-- NECESITA MAS DE UN BLOQUE -->
                              <div v-if="state.amountofBlocksNeeded > 1">
                                <!-- HAY BLOQUES DISPONIBLES -->
                                <div v-if="state.availableBookingSuperBlocks &&
                                  state.availableBookingSuperBlocks.length > 0 &&
                                  state.specificCalendarDate" class="mb-2">
                                  <div class="choose-attention py-1 pt-2">
                                    <i class="bi bi-hourglass-split"></i> <span> {{ $t("commerceQueuesView.selectBlock") }} </span>
                                  </div>
                                  <select class="btn btn-md btn-light fw-bold text-dark select" aria-label="form-select-sm" v-model="state.block">
                                    <option v-for="block in state.availableBookingSuperBlocks" :key="block.number" :value="block" id="select-block">{{ block.hourFrom }} - {{ block.hourTo }}</option>
                                  </select>
                                </div>
                                <!-- LISTA DE ESPERA -->
                                <div v-if="state.availableBookingSuperBlocks &&
                                  state.availableBookingSuperBlocks.length === 0 &&
                                  state.specificCalendarDate" class="mb-2">
                                  <div id="waitlist" class="d-grid gap-2 mb-2 waitlist-box mt-3"
                                    v-if="getActiveFeature(state.commerce, 'booking-waitlist-active', 'PRODUCT') &&
                                      state.specificCalendarDates.includes(formattedDate(state.specificCalendarDate))">
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
                              </div>
                              <!-- NECESITA UN SOLO BLOQUE -->
                              <div v-else>
                                <hr>
                                  <!-- HAY BLOQUES DISPONIBLES -->
                                  <div v-if="state.availableBookingBlocks &&
                                    state.availableBookingBlocks.length > 0 &&
                                    state.specificCalendarDate" class="mb-2">
                                    <div class="choose-attention py-1 pt-1">
                                      <i class="bi bi-hourglass-split"></i> <span> {{ $t("commerceQueuesView.selectBlock") }} </span>
                                    </div>
                                    <select class="btn btn-md btn-light fw-bold text-dark select" aria-label=".form-select-sm" v-model="state.block">
                                      <option v-for="block in state.availableBookingBlocks" :key="block.number" :value="block" id="select-block">{{ block.hourFrom }} - {{ block.hourTo }}</option>
                                    </select>
                                  </div>
                                  <!-- LISTA DE ESPERA -->
                                  <div v-if="state.availableBookingBlocks &&
                                    state.availableBookingBlocks.length === 0 &&
                                    state.specificCalendarDate" class="mb-1">
                                    <div id="waitlist" class="d-grid gap-2 mb-1 waitlist-box mt-3"
                                      v-if="getActiveFeature(state.commerce, 'booking-waitlist-active', 'PRODUCT') &&
                                      state.specificCalendarDates.includes(formattedDate(state.specificCalendarDate))">
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
                              </div>
                              <!-- RESUMEN -->
                              <div v-if="(state.specificCalendarDate && !getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')) || (state.specificCalendarDate && getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT') && state.block && state.block.hourFrom)" class="py-1 mt-4">
                                <div class="choose-attention fw-bold mt-2">
                                  <i class="bi bi-clipboard-check-fill"></i> <span> {{ $t("commerceQueuesView.daySelected") }} </span>
                                </div>
                                <div>
                                  <div class="subtitle-info mb-1">{{ $t("commerceQueuesView.queueSelected") }}</div>
                                  <div class="badge rounded-pill bg-primary py-2 px-4 mx-1">{{ state.queue.name }} </div>
                                  <span v-for="serv in state.selectedServices" :key="serv.id">
                                    <span class="badge rounded-pill bg-secondary py-2 px-2 mx-1"> {{ serv.name }}</span>
                                  </span>
                                </div>
                                <div class="row my-2">
                                  <div class="col-6">
                                    <div class="subtitle-info mb-1">{{ $t("commerceQueuesView.dataSelected") }}</div>
                                    <div class="badge rounded-pill bg-secondary py-2 px-3"><span> {{ formattedDate(state.specificCalendarDate) }} </span></div>
                                  </div>
                                  <div v-if="getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT') && state.block" class="col-6">
                                    <div class="subtitle-info mb-1">{{ $t("commerceQueuesView.blockSelected") }}</div>
                                    <div class="badge rounded-pill bg-secondary py-2 px-3"><span> {{ state.block.hourFrom }} - {{ state.block.hourTo }} </span></div>
                                  </div>
                                </div>
                              </div>
                              <!-- BOTON CONFIRMAR -->
                              <div v-if="getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT') && state.block.number">
                                <div v-if="state.block.number && state.bookingAvailable === false">
                                  <Alert :show="!!state.bookingAvailable" :stack="990"></Alert>
                                </div>
                                <button
                                  type="button"
                                  class="btn-size btn btn-lg btn-block col-9 fw-bold btn-dark rounded-pill mb-2 mt-2"
                                  @click="getBooking()"
                                  :disabled="!state.accept || !state.queue.id || !state.specificCalendarDate || loadingService"
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
                                :disabled="!state.accept || !state.queue.id || !state.specificCalendarDate || loadingService"
                                >
                                {{ $t("commerceQueuesView.confirm") }} <i class="bi bi-check-lg"></i>
                              </button>
                            </div>
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
                      <!-- NORMAL CALENDAR-->
                      <div v-else class="centered">
                        <div class="col col-md-9">
                          <!-- ESCOGER FECHA -->
                          <div class="choose-attention py-1 pt-2">
                            <i class="bi bi-calendar-check"></i> <span> {{ $t("commerceQueuesView.selectDay") }} </span>
                          </div>
                          <div v-if="!loadingCalendar">
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
                              <div class="badge rounded-pill bg-secondary py-2 px-5 m-2"><span> {{ formattedDate(state.date) }} </span></div>
                            </div>
                          </div>
                          <div v-if="loadingCalendar">
                            <Spinner :show="loadingCalendar"></Spinner>
                          </div>
                          <!-- ESCOGER HORARIO -->
                          <div v-if="getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')">
                            <Spinner :show="loadingHours"></Spinner>
                            <div v-if="!loadingHours">
                              <!-- NECESITA MAS DE UN BLOQUE -->
                              <div v-if="state.amountofBlocksNeeded > 1">
                                <div v-if="state.availableBookingSuperBlocks &&
                                  state.availableBookingSuperBlocks.length > 0 &&
                                  state.date" class="mb-2">
                                  <div class="choose-attention py-1 pt-2">
                                    <i class="bi bi-hourglass-split"></i> <span> {{ $t("commerceQueuesView.selectBlock") }} </span>
                                  </div>
                                  <select class="btn btn-md btn-light fw-bold text-dark select" aria-label="form-select-sm" v-model="state.block">
                                    <option v-for="block in state.availableBookingSuperBlocks" :key="block.number" :value="block" id="select-block">{{ block.hourFrom }} - {{ block.hourTo }}</option>
                                  </select>
                                </div>
                                <div v-if="state.availableBookingSuperBlocks &&
                                  state.availableBookingSuperBlocks.length === 0 &&
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
                              </div>
                              <!-- NECESITA SOLO UN BLOQUE -->
                              <div v-else>
                                <hr>
                                <div v-if="state.availableBookingBlocks &&
                                  state.availableBookingBlocks.length > 0 &&
                                  state.date" class="mb-2">
                                  <div class="choose-attention py-1 pt-1">
                                    <i class="bi bi-hourglass-split"></i> <span> {{ $t("commerceQueuesView.selectBlock") }} </span>
                                  </div>
                                  <select class="btn btn-md btn-light fw-bold text-dark select" aria-label=".form-select-sm" v-model="state.block">
                                    <option v-for="block in state.availableBookingBlocks" :key="block.number" :value="block" id="select-block">{{ block.hourFrom }} - {{ block.hourTo }}</option>
                                  </select>
                                </div>
                                <div v-if="state.availableBookingBlocks &&
                                  state.availableBookingBlocks.length === 0 &&
                                  state.date" class="mb-1">
                                  <div id="waitlist" class="d-grid gap-2 mb-1 waitlist-box mt-3" v-if="getActiveFeature(state.commerce, 'booking-waitlist-active', 'PRODUCT')">
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
                              </div>
                              <!-- RESUMEN -->
                              <div v-if="(state.date && !getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')) || (state.date && getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT') && state.block && state.block.hourFrom)" class="py-1 mt-4">
                                <div class="choose-attention fw-bold mt-2">
                                  <i class="bi bi-clipboard-check-fill"></i> <span> {{ $t("commerceQueuesView.daySelected") }} </span>
                                </div>
                                <div>
                                  <div class="subtitle-info mb-1">{{ $t("commerceQueuesView.queueSelected") }}</div>
                                  <div class="badge rounded-pill bg-primary py-2 px-4 mx-1">{{ state.queue.name }} </div>
                                  <span v-for="serv in state.selectedServices" :key="serv.id">
                                    <span class="badge rounded-pill bg-secondary py-2 px-2 mx-1"> {{ serv.name }}</span>
                                  </span>
                                </div>
                                <div class="row my-2">
                                  <div class="col-6">
                                    <div class="subtitle-info mb-1">{{ $t("commerceQueuesView.dataSelected") }}</div>
                                    <div class="badge rounded-pill bg-secondary py-2 px-3"><span> {{ formattedDate(state.date) }} </span></div>
                                  </div>
                                  <div v-if="getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT') && state.block" class="col-6">
                                    <div class="subtitle-info mb-1">{{ $t("commerceQueuesView.blockSelected") }}</div>
                                    <div class="badge rounded-pill bg-secondary py-2 px-3"><span> {{ state.block.hourFrom }} - {{ state.block.hourTo }} </span></div>
                                  </div>
                                </div>
                              </div>
                              <!-- BOTON CONFIRMAR -->
                              <div v-if="getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT') && state.block.number">
                                <div v-if="state.block.number && state.bookingAvailable === false">
                                  <Alert :show="!!state.bookingAvailable" :stack="990"></Alert>
                                </div>
                                <button
                                  type="button"
                                  class="btn-size btn btn-lg btn-block col-9 fw-bold btn-dark rounded-pill mb-2 mt-2"
                                  @click="getBooking()"
                                  :disabled="!state.accept || !state.queue.id || !state.date || loadingService"
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
                                :disabled="!state.accept || !state.queue.id || !state.date || loadingService"
                                >
                                {{ $t("commerceQueuesView.confirm") }} <i class="bi bi-check-lg"></i>
                              </button>
                            </div>
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
                  </div>
                </div>
              </div>
              <button
                class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4"
                @click="showPickQueue()">
                <i class="bi bi-arrow-left-short"></i>
              </button>
            </div>
          </Transition>
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
      <Spinner :show="loading"></Spinner>
      <Spinner :show="loadingService"></Spinner>
      <Alert :show="loading" :stack="alertError"></Alert>
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
.waitlist-box {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .3rem;
  border-radius: 1rem;
  border: .5px solid var(--gris-default);
  margin-bottom: .5rem;
}
.select {
  border-radius: .5rem;
  border: 1px solid var(--gris-clear);
}
.subtitle-info {
  font-size: .9rem;
  line-height: 1rem;
}
</style>