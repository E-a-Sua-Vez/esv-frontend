<script>
import { ref, reactive, onBeforeMount, computed, watch, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getCommerceByKeyName } from '../application/services/commerce';
import { getQueueById, getGroupedQueueByCommerceId } from '../application/services/queue';
import { getClientById } from '../application/services/client';
import { createAttention } from '../application/services/attention';
import { createBooking, getPendingBookingsBetweenDates } from '../application/services/booking';
import {
  getQueueBlockDetailsByDay,
  getQueueBlockDetailsBySpecificDayByCommerceId,
} from '../application/services/block';
import { createWaitlist } from '../application/services/waitlist';
import { globalStore } from '../stores';
import { validateEmail } from '../shared/utils/email';
import { getActiveFeature, isTelemedicineEnabled } from '../shared/features';
import {
  bookingCollection,
  attentionCollection,
  bookingBlockNumberUsedCollection,
} from '../application/firebase';
import { ATTENTION_STATUS, BOOKING_STATUS } from '../shared/constants';
import {
  getDetailsCollaboratorsByCommerceId,
  getCollaboratorDetailsById,
} from '../application/services/collaborator';
import Message from '../components/common/Message.vue';
import CommerceLogo from '../components/common/CommerceLogo.vue';
import Spinner from '../components/common/Spinner.vue';
import Alert from '../components/common/Alert.vue';
import Warning from '../components/common/Warning.vue';
import NotificationConditions from '../components/conditions/NotificationConditions.vue';
import { Timestamp, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import ClientForm from '../components/domain/ClientForm.vue';
import QueueForm from '../components/domain/QueueForm.vue';
import ServiceForm from '../components/domain/ServiceForm.vue';
import NextAvailableSlot from '../components/bookings/common/NextAvailableSlot.vue';
import PackageReminderBanner from '../components/common/PackageReminderBanner.vue';
import { v4 as uuidv4 } from 'uuid';
import { validateIdNumber } from '../shared/utils/idNumber';
import { DateModel } from '../shared/utils/date.model';

export default {
  name: 'CommerceQueuesView',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    Warning,
    NotificationConditions,
    ClientForm,
    QueueForm,
    ServiceForm,
    NextAvailableSlot,
    PackageReminderBanner,
  },
  async setup() {
    const { t } = useI18n();
    const router = useRouter();
    const route = useRoute();
    const store = globalStore();
    const {
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
      origin,
    } = route.params;

    const { client, queue } = route.query;

    const siteKey = import.meta.env.VITE_RECAPTCHA_INVISIBLE;
    const captchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED || false;
    let captcha = false;

    const loading = ref(false);
    const loadingCalendar = ref(false);
    const loadingHours = ref(false);
    const loadingService = ref(false);
    const alertError = ref('');
    const alertErrorMessage = ref('');
    const packageReminderInfo = ref(null);
    const loadingPackageReminder = ref(false);

    // Helper function to clear both error states
    const clearError = () => {
      alertError.value = '';
      alertErrorMessage.value = '';
    };
    const bookingTimeoutId = ref(null);
    const isMounted = ref(true);
    const calendar = ref(null);
    const dateMask = ref({
      modelValue: 'YYYY-MM-DD',
    });
    const disabledDates = ref([
      {
        repeat: {
          weekdays: [],
        },
      },
    ]);
    const specificCalendarAttributes = ref([
      {
        key: 'Available',
        highlight: {
          color: 'green',
          fillMode: 'light',
        },
        dates: [],
      },
      {
        key: 'Unavailable',
        highlight: {
          color: 'red',
          fillMode: 'light',
        },
        dates: [],
      },
    ]);
    const calendarAttributes = ref([
      {
        key: 'Available',
        highlight: {
          color: 'green',
          fillMode: 'light',
        },
        dates: [],
      },
      {
        key: 'Unavailable',
        highlight: {
          color: 'red',
          fillMode: 'light',
        },
        dates: [],
      },
    ]);
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
      selectedProcedureAmount: null, // Selected procedure amount from proceduresList
      activePackagesForService: [], // Active packages for the selected service
      loadingActivePackages: false, // Loading state for active packages check
      currentChannel: 'QR',
      newUser: {},
      errorsAdd: [],
      birthdayError: false,
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
      minDate: new Date().setDate(new Date().getDate() + 1),
      maxDate: new Date().setDate(new Date().getDate() + 90),
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
      isQuickSlotSelection: false,
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
      showPickHours: false,
      summaryExpanded: true,
      isTelemedicine: false,
      telemedicineConfig: {
        type: 'VIDEO',
        scheduledAt: null,
        notes: '',
      },
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.sessionId = uuidv4().toString();
        if (keyName) {
          state.commerce = await getCommerceByKeyName(keyName);
          if (state.commerce && state.commerce.localeInfo) {
            state.locale = state.commerce.localeInfo.language || 'es';
          }
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
            getGroupedQueueByCommerceId(state.commerce.id),
          ]);
          if ((queueId && queueId !== 'undefined') || (queue && queue !== undefined)) {
            state.queue = await getQueueById(queue || queueId);
            const queueType = state.queue.type;
            state.groupedQueues = {};
            if (queueType === 'COLLABORATOR') {
              const collaborator = await getCollaboratorDetailsById(state.queue.collaboratorId);
              if (collaborator && collaborator.id) {
                state.queue.collaborator = collaborator;
                state.queue.services = collaborator.services || [];
                state.queue.servicesName =
                  collaborator.services && collaborator.services.length > 0
                    ? collaborator.services.map(serv => serv.name)
                    : [];
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
                  const collaboratorsAux = state.collaborators.filter(
                    collaborator => collaborator.id === queue.collaboratorId
                  );
                  if (collaboratorsAux && collaboratorsAux.length > 0) {
                    queue.services = collaboratorsAux[0].services || [];
                    queue.servicesName =
                      collaboratorsAux[0].services && collaboratorsAux[0].services.length > 0
                        ? collaboratorsAux[0].services.map(serv => serv.name)
                        : [];
                  }
                  queueAux.push(queue);
                }
              });
              state.groupedQueues['COLLABORATOR'] = queueAux;
            }
          }
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    onUnmounted(() => {
      isMounted.value = false;
      if (bookingTimeoutId.value) {
        clearTimeout(bookingTimeoutId.value);
        bookingTimeoutId.value = null;
      }
      if (unsubscribeBookings) {
        unsubscribeBookings();
      }
      if (unsubscribeAttentions) {
        unsubscribeAttentions();
      }
    });

    const receiveData = data => {
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
          const cleanedPhone = data.phone.replace(/[\s~`!@#$%^&*(){}[\];:"'<,.>?/\\|_+=-]/g, '');
          const cleanedPhoneCode = data.phoneCode.replace(
            /[\s~`!@#$%^&*(){}[\];:"'<,.>?/\\|_+=-]/g,
            '',
          );

          // Verificar si el teléfono ya comienza con el código de área
          if (cleanedPhone.startsWith(cleanedPhoneCode)) {
            // El teléfono ya tiene el código de área, usarlo directamente
            state.phone = cleanedPhone.slice(cleanedPhoneCode.length);
            state.phoneCode = cleanedPhoneCode;
            state.newUser.phone = cleanedPhone;
          } else {
            // El teléfono no tiene el código de área, concatenarlo
            state.phone = cleanedPhone;
            state.phoneCode = cleanedPhoneCode;
            state.newUser.phone = `${cleanedPhoneCode}${cleanedPhone}`;
          }
        } else if (data.phone) {
          const cleanedPhone = data.phone.replace(/[\s~`!@#$%^&*(){}[\];:"'<,.>?/\\|_+=-]/g, '');
          // Extraer código de área (primeros 2 dígitos) y el resto del número
          state.phoneCode = cleanedPhone.slice(0, 2);
          state.phone = cleanedPhone.slice(2);
          state.newUser.phone = cleanedPhone;
        }
        if (data.accept !== undefined) {
          state.accept = data.accept;
        }
        // Handle validation error states
        if (data.birthdayError !== undefined) {
          state.birthdayError = data.birthdayError;
        }
      }
    };

    const receiveQueue = queue => {
      alertError.value = '';
      state.errorsAdd = [];

      // Toggle queue selection - if clicking the same queue, deselect it
      if (state.queue && state.queue.id === queue.id) {
        state.queue = {};
        state.selectedServices = [];
        state.totalDurationRequested = 0;
        state.totalServicesResquested = 0;
        state.amountofBlocksNeeded = 0;
        state.canBook = false;
        return;
      }

      getQueue(queue);
      state.totalDurationRequested = 0;
      state.amountofBlocksNeeded = 0;
      setCanBook();

      // Removed scroll behavior - it was causing weird delays
    };

    const receiveServices = async services => {
      alertError.value = '';
      state.errorsAdd = [];
      state.services = services;
      setCanBook();
    };

    const receiveSelectedServices = async services => {
      state.selectedServices = services;

      // Clear selectedProcedureAmount when services change (user might select different service)
      state.selectedProcedureAmount = null;

      // Check for active packages when service is selected
      await checkActivePackagesForService();

      state.totalDurationRequested = state.selectedServices.reduce(
        (acc, service) =>
          acc + (service.serviceInfo.blockTime || service.serviceInfo.estimatedTime),
        0
      );
      state.amountofBlocksNeeded = Math.ceil(state.totalDurationRequested / state.queue.blockTime);
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
    };

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
    };

    const formattedDate = date => {
      if (date && date !== 'TODAY') {
        return new Date(date).toISOString().slice(0, 10);
      }
    };

    const getBookings = async () => {
      const { unsubscribe } = await updatedBookings(
        formattedDate(state.date || state.specificCalendarDate)
      );
      unsubscribeBookings = unsubscribe;
    };

    const updatedBookings = date => {
      let unsubscribe;
      if (date !== undefined) {
        const bookingsQuery = query(
          bookingCollection,
          where('commerceId', '==', state.commerce.id),
          where('status', 'in', [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED]),
          where('date', '==', date)
        );
        unsubscribe = onSnapshot(bookingsQuery, snapshot => {
          state.allBookings = snapshot.docs.map(doc => {
            const booking = { id: doc.id, ...doc.data() };
            return booking;
          });
        });
      }
      return { unsubscribe };
    };

    const getAttentions = () => {
      console.log('🟢 getAttentions() called');
      const { unsubscribe } = updatedAttentions();
      unsubscribeAttentions = unsubscribe;
      console.log('🟢 getAttentions() completed, listener set up');
    };

    const isActiveCommerce = commerce => commerce.active === true;

    const getFeature = (commerce, name) => {
      if (!commerce || !commerce.features) {
        return {};
      }
      const features = commerce.features;
      const feature = features.find(feat => feat.name === name);
      return feature || {};
    };

    const isAvailableCommerce = commerce => {
      const feature = getFeature(state.commerce, 'close-commerce-by-service-hours');
      if (feature.active === undefined || feature.active === false) {
        return true;
      }
      const timeZone =
        commerce.localeInfo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const clientCurrentDate = new Date().toLocaleString('en-US', { timeZone });
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
      if (commerce.serviceInfo.attentionHourFrom === commerce.serviceInfo.attentionHourTo) {
        isInHours = true;
      } else if (commerce.serviceInfo.attentionHourTo < commerce.serviceInfo.attentionHourFrom) {
        if (
          clientHour >= commerce.serviceInfo.attentionHourFrom ||
          clientHour <= commerce.serviceInfo.attentionHourTo
        ) {
          isInHours = true;
        }
      } else {
        if (
          clientHour >= commerce.serviceInfo.attentionHourFrom &&
          clientHour <= commerce.serviceInfo.attentionHourTo
        ) {
          isInHours = true;
        }
      }
      if (isInDays && isInHours) {
        return true;
      }
    };

    const isDataActive = commerce => {
      let active = false;
      let features = [];
      if (
        commerce !== undefined &&
        commerce !== null &&
        commerce.features &&
        commerce.features.length > 0
      ) {
        features = commerce.features.filter(
          feature => feature.type === 'USER' && feature.active === true
        );
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
    };

    const validate = user => {
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
            if (
              !user.idNumber ||
              user.idNumber.length === 0 ||
              !validateIdNumber(state.commerce, user.idNumber)
            ) {
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
              // Si state.newUser.phone ya tiene el teléfono completo, usarlo directamente
              // De lo contrario, concatenar phoneCode + phone
              if (state.newUser.phone && state.newUser.phone.length > 0) {
                user.phone = state.newUser.phone;
              } else {
                user.phone = state.phoneCode + state.phone.replace(/^0+/, '');
              }
            }
            if (!state.phone || state.phone.length === 0) {
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
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const buildUserBody = user => {
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
    };

    const convertBlockToPlainObject = block => {
      if (!block) {
        return undefined;
      }
      // Convert block to plain object to avoid Firestore serialization issues
      // Backend validation rejects nested arrays, so we only send blockNumbers for multiple blocks
      if (block.blockNumbers && block.blockNumbers.length > 0) {
        // Multiple blocks case - only send blockNumbers, not blocks array
        return {
          blockNumbers: block.blockNumbers,
          number: block.number || block.blockNumbers[0],
          hourFrom: block.hourFrom,
          hourTo: block.hourTo,
        };
      } else if (block.number) {
        // Single block case
        return {
          number: block.number,
          hourFrom: block.hourFrom,
          hourTo: block.hourTo,
        };
      }
      return block;
    };

    const getAttention = async block => {
      try {
        loadingService.value = true;
        alertError.value = '';
        if (validate(state.newUser)) {
          state.currentChannel = store.getCurrentAttentionChannel;
          const bodyUser = buildUserBody(state.newUser);
          let newUser = undefined;
          if (isDataActive(state.commerce)) {
            newUser = {
              ...bodyUser,
              commerceId: state.commerce.id,
              notificationOn: state.accept,
              notificationEmailOn: state.accept,
              acceptTermsAndConditions: state.accept,
            };
          }
          // Validate queueId before making the request
          if (!state.queue || !state.queue.id || typeof state.queue.id !== 'string') {
            throw new Error(t('commerceQueuesView.validate.queueRequiredAttention'));
          }

          let body = {
            queueId: state.queue.id,
            channel: state.currentChannel,
            user: newUser,
            clientId: state.newUser.clientId,
          };
          // Use state.attentionBlock if block parameter is not provided (for TODAY bookings)
          const selectedBlock = state.attentionBlock || block;
          if (selectedBlock && selectedBlock.number) {
            body = { ...body, block: convertBlockToPlainObject(selectedBlock) };
          }
          if (state.selectedServices && state.selectedServices.length > 0) {
            const servicesId = state.selectedServices.map(serv => serv.id);
            const servicesDetails = state.selectedServices.map(serv => {
              // Use selectedProcedureAmount if available, otherwise fallback to procedures or proceduresList
              let proceduresValue = serv.serviceInfo?.procedures || 1;
              if (state.selectedProcedureAmount) {
                proceduresValue = state.selectedProcedureAmount;
              } else if (
                serv.serviceInfo?.proceduresList &&
                serv.serviceInfo.proceduresList.trim()
              ) {
                // If proceduresList exists but no amount selected, use first value from list
                const proceduresList = serv.serviceInfo.proceduresList
                  .trim()
                  .split(',')
                  .map(p => parseInt(p.trim(), 10))
                  .filter(p => !isNaN(p) && p > 0);
                if (proceduresList.length > 0) {
                  proceduresValue = proceduresList[0];
                }
              }
              return {
                id: serv.id,
                name: serv.name,
                tag: serv.tag,
                procedures: proceduresValue,
              };
            });
            body = {
              ...body,
              servicesId,
              servicesDetails,
            };

            // Add selectedProcedureAmount as a separate field for backend processing
            if (state.selectedProcedureAmount) {
              body.selectedProcedureAmount = state.selectedProcedureAmount;
            }
          }
          // Add telemedicine config if enabled for walkin queues
          if (state.isTelemedicine && state.telemedicineConfig) {
            const selectedDate = state.date || state.specificCalendarDate || 'TODAY';
            const selectedBlock = state.attentionBlock || block;

            // Compute scheduledAt from the selected block's date and time
            let scheduledAt = new Date().toISOString(); // fallback
            if (selectedDate && selectedBlock && selectedBlock.hourFrom) {
              try {
                let dateStr;
                if (selectedDate === 'TODAY') {
                  dateStr = new DateModel().toString();
                } else {
                  dateStr =
                    typeof selectedDate === 'string'
                      ? selectedDate
                      : new DateModel(selectedDate).toString();
                }
                scheduledAt = new Date(
                  dateStr + 'T' + selectedBlock.hourFrom + ':00'
                ).toISOString();
              } catch (error) {
                console.error('Error computing scheduledAt from block:', error);
              }
            } else {
              // For walkin without block, schedule for now or next available time
              scheduledAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes from now
            }

            body.type = 'TELEMEDICINE';
            body.telemedicineConfig = {
              type: 'VIDEO', // Always VIDEO for telemedicine
              scheduledAt,
              recordingEnabled: state.commerce?.telemedicineRecordingEnabled || false,
            };
          }
          state.date = undefined;
          state.specificCalendarDate = undefined;
          const attention = await createAttention(body);
          const user = store.getCurrentUserType;
          if (user && user === 'collaborator') {
            router.push({
              name: 'collaborator-queue-attention',
              params: { queueId: state.queue.id, id: attention.id },
            });
          } else {
            router.push({
              name: 'commerce-queue-attention',
              params: { queueId: state.queue.id, id: attention.id },
            });
          }
        }
        loadingService.value = false;
      } catch (error) {
        loadingService.value = false;
        const status = error.response?.status || 500;
        alertError.value = status;
        // Extract detailed error message from backend
        const errorMessage = error.response?.data?.message;
        if (errorMessage) {
          // Handle array of messages (NestJS validation format)
          if (Array.isArray(errorMessage)) {
            alertErrorMessage.value = errorMessage.join('. ');
          } else {
            alertErrorMessage.value = errorMessage;
          }
        } else {
          alertErrorMessage.value = '';
        }
      }
    };

    const getBooking = async () => {
      const timeout = Math.random() * 1000 + 1000;
      try {
        loadingService.value = true;
        clearError();
        if (validate(state.newUser)) {
          state.currentChannel = store.getCurrentAttentionChannel;
          const bodyUser = buildUserBody(state.newUser);
          let newUser = undefined;
          if (isDataActive(state.commerce)) {
            newUser = {
              ...bodyUser,
              commerceId: state.commerce.id,
              notificationOn: state.accept,
              notificationEmailOn: state.accept,
              acceptTermsAndConditions: state.accept,
            };
          }
          // Validate queueId before making the request
          if (!state.queue || !state.queue.id || typeof state.queue.id !== 'string') {
            throw new Error(t('commerceQueuesView.validate.queueRequired'));
          }

          let body = {
            queueId: state.queue.id,
            channel: state.currentChannel,
            user: newUser,
            date: formattedDate(state.date || state.specificCalendarDate),
            block: convertBlockToPlainObject(state.block),
            clientId: state.newUser.clientId,
            sessionId: state.sessionId,
          };
          if (state.selectedServices && state.selectedServices.length > 0) {
            const servicesId = state.selectedServices.map(serv => serv.id);
            const servicesDetails = state.selectedServices.map(serv => {
              // Use selectedProcedureAmount if available, otherwise fallback to procedures or proceduresList
              let proceduresValue = serv.serviceInfo?.procedures || 1;
              if (state.selectedProcedureAmount) {
                // Ensure it's a number
                proceduresValue =
                  parseInt(state.selectedProcedureAmount, 10) || state.selectedProcedureAmount;
                console.log(
                  '📋 Using selectedProcedureAmount for booking:',
                  proceduresValue,
                  'from state:',
                  state.selectedProcedureAmount,
                );
              } else if (
                serv.serviceInfo?.proceduresList &&
                serv.serviceInfo.proceduresList.trim()
              ) {
                // If proceduresList exists but no amount selected, use first value from list
                const proceduresList = serv.serviceInfo.proceduresList
                  .trim()
                  .split(',')
                  .map(p => parseInt(p.trim(), 10))
                  .filter(p => !isNaN(p) && p > 0);
                if (proceduresList.length > 0) {
                  proceduresValue = proceduresList[0];
                }
              }
              console.log('📋 servicesDetails item:', {
                id: serv.id,
                name: serv.name,
                procedures: proceduresValue,
              });
              return {
                id: serv.id,
                name: serv.name,
                tag: serv.tag,
                procedures: proceduresValue,
              };
            });
            console.log('📋 Final servicesDetails for booking:', servicesDetails);
            body = { ...body, servicesId, servicesDetails };

            // Add selectedProcedureAmount as a separate field for backend processing
            if (state.selectedProcedureAmount) {
              body.selectedProcedureAmount = state.selectedProcedureAmount;
            }
          }
          // Add telemedicine config if enabled - use the booking/attention block date and time
          if (state.isTelemedicine && state.telemedicineConfig) {
            const selectedDate = state.date || state.specificCalendarDate;
            const selectedBlock = state.attentionBlock || state.block;

            // Compute scheduledAt from the selected block's date and time
            let scheduledAt = new Date().toISOString(); // fallback
            if (selectedDate && selectedBlock && selectedBlock.hourFrom) {
              try {
                let dateStr;
                if (selectedDate === 'TODAY') {
                  dateStr = new DateModel().toString();
                } else {
                  dateStr =
                    typeof selectedDate === 'string'
                      ? selectedDate
                      : new DateModel(selectedDate).toString();
                }
                scheduledAt = new Date(
                  dateStr + 'T' + selectedBlock.hourFrom + ':00'
                ).toISOString();
              } catch (error) {
                console.error('Error computing scheduledAt from block:', error);
              }
            }

            body.type = 'TELEMEDICINE';
            body.telemedicineConfig = {
              type: 'VIDEO', // Always VIDEO for telemedicine
              scheduledAt,
              recordingEnabled: state.commerce?.telemedicineRecordingEnabled || false,
            };
          }
          await addBookingNumberUsed(
            state.sessionId,
            state.queue.id,
            formattedDate(state.date || state.specificCalendarDate)
          );
          bookingTimeoutId.value = setTimeout(async () => {
            // Check if component is still mounted before updating state
            if (!isMounted.value) {
              return;
            }
            try {
              const booking = await createBooking(body);
              console.log('✅ Booking created successfully:', booking);

              // Check again after async operation
              if (!isMounted.value) {
                console.warn('⚠️ Component unmounted, skipping redirect');
                return;
              }

              // Validate booking was created successfully
              if (!booking || !booking.id) {
                console.error('❌ Booking created but missing ID:', booking);
                loadingService.value = false;
                alertError.value = 500;
                alertErrorMessage.value =
                  'La reserva se creó pero no se pudo obtener la información. Por favor, verifica tus reservas.';
                return;
              }

              const user = store.getCurrentUserType;
              const currentRoute = route.name;
              console.log('📍 Current route:', currentRoute);
              console.log('👤 User type:', user);
              console.log('🎫 Booking ID:', booking.id);

              // Determine which route to use based on current route and user type
              let targetRoute;
              const routeParams = { id: booking.id };

              if (user && user === 'collaborator') {
                targetRoute = 'collaborator-queue-booking';
              } else {
                targetRoute = 'commerce-queue-booking';
              }

              console.log('🚀 Attempting to navigate to:', targetRoute, routeParams);

              try {
                const result = await router.push({
                  name: targetRoute,
                  params: routeParams,
                });
                console.log('✅ Navigation successful:', result);
                loadingService.value = false;
              } catch (routerError) {
                console.error('❌ Error redirecting to booking page:', routerError);
                console.error('Router error details:', {
                  message: routerError.message,
                  name: routerError.name,
                  stack: routerError.stack,
                });

                // If router push fails, show success message and clear form
                loadingService.value = false;
                clearError();

                // Show success message - the booking was created even if redirect failed
                const bookingNumber = booking.number || booking.id;
                alertError.value = '';
                alertErrorMessage.value = `¡Reserva creada exitosamente! Número de reserva: ${bookingNumber}. Puedes acceder a ella desde el menú de reservas.`;

                // Clear the form state
                state.block = {};
                state.date = undefined;
                state.specificCalendarDate = undefined;

                // Try alternative: reload the page with booking info in query
                // This might work better for public routes
                setTimeout(() => {
                  if (isMounted.value) {
                    console.log('🔄 Attempting page reload with booking info');
                    window.location.href = `${window.location.pathname}?bookingCreated=${booking.id}`;
                  }
                }, 2000);
              }
            } catch (error) {
              // Check again after error
              if (!isMounted.value) {
                return;
              }
              loadingService.value = false;
              const status = error.response?.status || 500;
              alertError.value = status;
              // Extract detailed error message from backend
              const errorMessage = error.response?.data?.message;
              if (errorMessage) {
                // Handle array of messages (NestJS validation format)
                if (Array.isArray(errorMessage)) {
                  alertErrorMessage.value = errorMessage.join('. ');
                } else {
                  alertErrorMessage.value = errorMessage;
                }
              } else {
                alertErrorMessage.value = '';
              }
            }
          }, timeout);
        } else {
          loadingService.value = false;
        }
      } catch (error) {
        // Only update state if component is still mounted
        if (isMounted.value) {
          loadingService.value = false;
          const status = error.response?.status || 500;
          alertError.value = status;
          // Extract detailed error message from backend
          const errorMessage = error.response?.data?.message;
          if (errorMessage) {
            // Handle array of messages (NestJS validation format)
            if (Array.isArray(errorMessage)) {
              alertErrorMessage.value = errorMessage.join('. ');
            } else {
              alertErrorMessage.value = errorMessage;
            }
          } else {
            alertErrorMessage.value = '';
          }
        }
      }
    };

    const addBookingNumberUsed = async (sessionId, queueId, date) => {
      try {
        // caso bloque varios horarios
        if (state.block && state.block.blockNumbers) {
          for (let i = 0; i < state.block.blocks.length; i++) {
            const block = state.block.blocks[i];
            const number = block.number;
            const hourFrom = block.hourFrom;
            const hourTo = block.hourTo;
            const body = {
              sessionId,
              blockNumber: number,
              hourFrom,
              hourTo,
              queueId,
              date,
              dateRequested: new Date(),
              time: new Date().getTime(),
            };
            await bookingBlockNumberUsedCollection.add(body);
          }
          // caso bloque 1 horario
        } else if (state.block && state.block.number) {
          const number = state.block.number;
          const hourFrom = state.block.hourFrom;
          const hourTo = state.block.hourTo;
          const body = {
            sessionId,
            blockNumber: number,
            hourFrom,
            hourTo,
            queueId,
            date,
            dateRequested: new Date(),
            time: new Date().getTime(),
          };
          await bookingBlockNumberUsedCollection.add(body);
        }
      } catch (error) {
        // Error handled silently
      }
    };

    const getWaitList = async () => {
      try {
        loadingService.value = true;
        clearError();
        if (validate(state.newUser)) {
          state.currentChannel = store.getCurrentAttentionChannel;
          const bodyUser = buildUserBody(state.newUser);
          let newUser = undefined;
          if (isDataActive(state.commerce)) {
            newUser = {
              ...bodyUser,
              commerceId: state.commerce.id,
              notificationOn: state.accept,
              notificationEmailOn: state.accept,
              acceptTermsAndConditions: state.accept,
            };
          }
          const body = {
            queueId: state.queue.id,
            channel: state.currentChannel,
            user: newUser,
            date: formattedDate(state.date || state.specificCalendarDate),
            clientId: state.newUser.clientId,
          };
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
          });
          disabled = disabled.filter(item => !forDeletion.includes(item));
          disabledDates.value[0].repeat.weekdays = [];
          disabledDates.value[0].repeat.weekdays.push(...disabled);
        }
      }
    };

    // Helper function to check if today is available
    const isTodayAvailable = () => {
      const attentionDays = state.queue.serviceInfo?.attentionDays || [];
      if (attentionDays.length === 0) return true; // No restriction
      const today = new Date();
      let todayDayOfWeek = today.getDay();
      if (todayDayOfWeek === 0) todayDayOfWeek = 7; // Sunday becomes 7
      return attentionDays.includes(todayDayOfWeek);
    };

    const getBlocksByDay = () => {
      console.log('🔷 getBlocksByDay() called');
      console.log('🔷 Current date:', state.date);
      console.log('🔷 state.blocksByDay:', state.blocksByDay);
      if (!state.date || state.date === 'TODAY') {
        // Check if today is available before returning blocks
        if (!isTodayAvailable()) {
          console.log('❌ getBlocksByDay - Today is not available, returning empty array');
          return [];
        }
        const day = new Date().getDay();
        console.log('🔷 Today is day:', day);
        const blocks = state.blocksByDay[day];
        console.log('🔷 Blocks for today:', blocks?.length || 0, blocks);
        return blocks || [];
      } else {
        // Ensure state.date is a string (handle Date objects)
        const dateString =
          typeof state.date === 'string'
            ? state.date
            : new Date(state.date).toISOString().slice(0, 10);
        const [year, month, day] = dateString.split('-');
        let dayNumber = new Date(+year, +month - 1, +day).getDay();
        if (dayNumber === 0) {
          dayNumber = 7;
        }
        const blocks = state.blocksByDay[dayNumber];
        console.log('🔷 Blocks for day', dayNumber, ':', blocks?.length || 0);
        return blocks || [];
      }
    };

    const getBlocksBySpecificDay = () => {
      if (!state.specificCalendarDate || state.specificCalendarDate === 'TODAY') {
        const date = formattedDate(new Date());
        return state.blocksBySpecificCalendarDate[date];
      } else {
        const date = formattedDate(state.specificCalendarDate);
        return state.blocksBySpecificCalendarDate[date];
      }
    };

    const getQueue = async queueIn => {
      state.queue = queueIn;
      if (state.queue && state.queue.id) {
        if (state.commerce && getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')) {
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
    };

    const attentionsAvailables = async () => {
      await getAvailableAttentionBlocks(state.attentions);
      const blockAvailable = state.availableAttentionBlocks.filter(
        block => block.number === state.attentionBlock.number
      );
      if (!blockAvailable || blockAvailable.length === 0) {
        state.attentionAvailable = false;
      } else {
        state.attentionAvailable = true;
      }
    };

    const bookingsAvailables = () => {
      console.log('🔍 bookingsAvailables() called');
      console.log('🔍 state.block:', state.block);
      console.log(
        '🔍 state.availableBookingBlocks:',
        state.availableBookingBlocks?.length || 0,
        'blocks',
      );
      console.log(
        '🔍 Available block numbers:',
        state.availableBookingBlocks?.map(b => b.number) || [],
      );

      const blockAvailable = state.availableBookingBlocks.filter(
        block => block.number === state.block.number
      );

      console.log('🔍 Looking for block number:', state.block.number);
      console.log('🔍 Found matching blocks:', blockAvailable.length);

      if (!blockAvailable || blockAvailable.length === 0) {
        console.log('❌ Block NOT available - setting bookingAvailable = false');
        state.bookingAvailable = false;
        alertError.value = '';
      } else {
        console.log('✅ Block IS available - setting bookingAvailable = true');
        state.bookingAvailable = true;
      }
    };

    const isQueueWalkin = () => {
      if (state.queue && state.queue.serviceInfo) {
        if (state.queue.serviceInfo.walkin) {
          return state.queue.serviceInfo.walkin;
        }
        return false;
      }
      return false;
    };

    const getActualDay = (day, timeZoneIn) => {
      const dateCorrected = new Date(
        new Date(day).toLocaleString('en-US', {
          timeZone: timeZoneIn,
        })
      );
      return dateCorrected;
    };

    const setDate = date => {
      if (state.queue.id) {
        state.date = date;
        state.specificCalendarDate = date;
        state.block = {};
      }
    };

    const goBack = () => {
      router.back();
    };

    const showToday = async () => {
      console.log('🔵 showToday() called');
      (state.attentionBlock = {}), (state.block = {});
      state.date = 'TODAY';
      state.specificCalendarDate = 'TODAY';
      state.showToday = true;
      state.showReserve = false;
      state.showPickHours = true; // Ensure showPickHours is true so Confirm button appears

      // Check if today is available
      if (!isTodayAvailable()) {
        console.log('❌ showToday() - Today is not available');
        state.availableAttentionBlocks = [];
        state.availableAttentionSuperBlocks = [];
        state.availableBookingBlocks = [];
        state.blocks = [];
        loadingHours.value = false;
        return;
      }

      // Ensure hours are loaded when switching to "Hoje"
      const hasBookingBlock = getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT');
      console.log('🔵 booking-block-active feature:', hasBookingBlock);
      if (hasBookingBlock) {
        console.log('🔵 Starting to load hours for TODAY');
        loadingHours.value = true;

        // Ensure blocksByDay is loaded
        if (!state.blocksByDay || Object.keys(state.blocksByDay).length === 0) {
          console.log('🔵 blocksByDay is empty, loading...');
          state.blocksByDay = await getQueueBlockDetailsByDay(state.queue.id);
          console.log(
            '🔵 blocksByDay loaded:',
            Object.keys(state.blocksByDay || {}).length,
            'days'
          );
        }

        state.blocks = getBlocksByDay();
        console.log('🔵 Blocks loaded:', state.blocks?.length || 0);
        if (unsubscribeAttentions) {
          unsubscribeAttentions();
        }
        getAttentions();
        // Load blocks immediately if attentions are already available
        console.log('🔵 Current attentions:', state.attentions?.length || 0);
        if (state.attentions && state.attentions.length >= 0) {
          console.log(
            '🔵 Calling getAvailableAttentionBlocks with attentions:',
            state.attentions.length
          );
          await getAvailableAttentionBlocks(state.attentions);
          console.log(
            '🔵 Available attention blocks:',
            state.availableAttentionBlocks?.length || 0
          );
          getAvailableAttentionSuperBlocks();
          console.log(
            '🔵 Available super blocks:',
            state.availableAttentionSuperBlocks?.length || 0
          );
          loadingHours.value = false;
          console.log('🔵 Loading hours set to false');
        } else {
          console.log('⚠️ No attentions available yet, waiting for watcher...');
        }
      } else {
        console.log('⚠️ booking-block-active feature is not active');
      }
    };

    const selectAttentionBlock = block => {
      console.log('🟨 selectAttentionBlock called with:', block);
      // Ensure reactivity by creating a new object
      state.attentionBlock = {
        number: block.number,
        hourFrom: block.hourFrom,
        hourTo: block.hourTo,
        ...(block.blocks && { blocks: block.blocks }),
        ...(block.blockNumbers && { blockNumbers: block.blockNumbers }),
      };
      console.log('🟨 state.attentionBlock after assignment:', state.attentionBlock);

      // Update telemedicine scheduledAt if telemedicine is enabled and we have date and block
      if (
        state.isTelemedicine &&
        state.telemedicineConfig &&
        state.attentionBlock &&
        state.attentionBlock.hourFrom
      ) {
        const selectedDate = state.date || state.specificCalendarDate;
        if (selectedDate && selectedDate !== 'TODAY') {
          const dateStr =
            typeof selectedDate === 'string'
              ? selectedDate
              : new DateModel(selectedDate).toString();
          const scheduledDateTime = new Date(dateStr + 'T' + state.attentionBlock.hourFrom + ':00');
          state.telemedicineConfig.scheduledAt = scheduledDateTime.toISOString().slice(0, 16);
        } else if (selectedDate === 'TODAY') {
          const today = new DateModel().toString();
          const scheduledDateTime = new Date(today + 'T' + state.attentionBlock.hourFrom + ':00');
          state.telemedicineConfig.scheduledAt = scheduledDateTime.toISOString().slice(0, 16);
        }
      }
    };

    const showReserve = () => {
      state.block = {};
      (state.attentionBlock = {}), (state.date = undefined);
      state.specificCalendarDate = undefined;
      state.showToday = false;
      state.showReserve = true;
    };

    const validateCaptchaOk = async response => {
      if (response) {
        captcha = true;
        // For COLLABORATOR queues, check if they have services that need to be selected
        const isCollaboratorWithServices =
          state.queue &&
          state.queue.type === 'COLLABORATOR' &&
          ((state.queue.services && state.queue.services.length > 0) ||
            (state.queue.servicesId && state.queue.servicesId.length > 0) ||
            (state.queue.collaborator &&
              state.queue.collaborator.services &&
              state.queue.collaborator.services.length > 0));

        // Don't auto-create attention for COLLABORATOR queues that have services - user must select services first
        // Only auto-create if it's not a COLLABORATOR queue with services, and booking is disabled or it's a walkin queue
        if (
          !isCollaboratorWithServices &&
          (!getActiveFeature(state.commerce, 'booking-active', 'PRODUCT') || isQueueWalkin())
        ) {
          await getAttention(undefined);
        }
      }
    };

    const validateCaptchaError = () => {
      captcha = false;
    };

    const getAvailableBookingBlocks = bookings => {
      console.log('📊 getAvailableBookingBlocks() called');
      console.log('📊 Received bookings:', bookings?.length || 0);
      console.log('📊 state.blocks:', state.blocks?.length || 0);
      console.log('📊 Queue type:', state.queue.type);
      console.log('📊 Current date:', state.date);

      state.availableBookingBlocks = [];
      let availableBlocks = [];
      let queueBlocks = [];
      if (state.queue.type !== 'SELECT_SERVICE') {
        if (state.blocks) {
          queueBlocks = state.blocks;
          console.log('📊 Queue blocks:', queueBlocks?.length || 0);
          if (queueBlocks && queueBlocks.length > 0) {
            let bookingsReserved = [];
            if (bookings && bookings.length > 0) {
              bookingsReserved = bookings
                .map(booking => {
                  if (
                    booking.block &&
                    booking.block.blockNumbers &&
                    booking.block.blockNumbers.length > 0
                  ) {
                    return [...booking.block.blockNumbers];
                  } else if (
                    booking.block &&
                    booking.block.number !== undefined &&
                    booking.block.number !== null
                  ) {
                    return booking.block.number;
                  }
                  return null;
                })
                .filter(item => item !== null);
              let limit = 0;
              if (
                state.queue.serviceInfo !== undefined &&
                state.queue.serviceInfo.blockLimit !== undefined &&
                state.queue.serviceInfo.blockLimit > 0
              ) {
                limit = state.queue.serviceInfo.blockLimit;
              }
              const totalBlocksReserved = bookingsReserved.flat(Infinity).sort();
              const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
              const blockedBlocks = [];
              uniqueBlocksReserved.forEach(block => {
                const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                // Use >= to match backend validation: alreadyBooked.length >= blockLimit
                if (times >= limit) {
                  blockedBlocks.push(block);
                }
              });
              availableBlocks = queueBlocks.filter(block => !blockedBlocks.includes(block.number));
              console.log('📊 Blocked blocks:', blockedBlocks);
              console.log('📊 Available blocks after filtering:', availableBlocks?.length || 0);
            } else {
              availableBlocks = queueBlocks;
              console.log('📊 No bookings - all blocks available:', availableBlocks?.length || 0);
            }

            // Filter out past hours if the selected date is today
            const isToday =
              state.date === 'TODAY' ||
              (state.date && state.date === new Date().toISOString().slice(0, 10));

            if (isToday) {
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinute = now.getMinutes();
              const currentTimeInMinutes = currentHour * 60 + currentMinute;

              const beforeFiltering = availableBlocks.length;
              availableBlocks = availableBlocks.filter(block => {
                if (!block.hourFrom) return false;

                const [blockHour, blockMinute] = block.hourFrom.split(':').map(Number);
                const blockTimeInMinutes = blockHour * 60 + (blockMinute || 0);

                // Only include blocks that start at least 30 minutes from now
                return blockTimeInMinutes > currentTimeInMinutes + 30;
              });

              console.log(
                '📊 Filtered past hours for today:',
                beforeFiltering,
                '→',
                availableBlocks.length,
              );
            }
          }
        }
      } else {
        if (state.selectedServices && state.selectedServices.length > 0) {
          const candidateQueues = [];
          if (
            state.groupedQueues &&
            state.groupedQueues['COLLABORATOR'] &&
            state.groupedQueues['COLLABORATOR'].length > 0
          ) {
            const services = state.selectedServices.map(serv => serv.id);
            state.groupedQueues['COLLABORATOR'].forEach(queue => {
              if (queue.services && queue.services.length > 0) {
                const availableServices = queue.services.map(serv => serv.id);
                if (services.every(serv => availableServices.includes(serv))) {
                  candidateQueues.push(queue);
                }
              } else {
                candidateQueues.push(queue);
              }
            });
          }
          if (state.blocks) {
            queueBlocks = state.blocks;
            if (queueBlocks && queueBlocks.length > 0) {
              const bookingsReserved = [];
              candidateQueues.push(state.queue);
              if (candidateQueues && candidateQueues.length > 0) {
                candidateQueues.forEach(queue => {
                  const bookings = state.groupedBookingsByQueue[queue.id];
                  if (bookings && bookings.length > 0) {
                    const reserved = bookings
                      .map(booking => {
                        if (
                          booking.block &&
                          booking.block.blockNumbers &&
                          booking.block.blockNumbers.length > 0
                        ) {
                          return [...booking.block.blockNumbers];
                        } else if (
                          booking.block &&
                          booking.block.number !== undefined &&
                          booking.block.number !== null
                        ) {
                          return booking.block.number;
                        }
                        return null;
                      })
                      .filter(item => item !== null);
                    bookingsReserved.push(reserved);
                  }
                });
                let limit = candidateQueues.length === 1 ? 1 : candidateQueues.length - 1;
                if (
                  state.queue.serviceInfo !== undefined &&
                  state.queue.serviceInfo.blockLimit !== undefined &&
                  state.queue.serviceInfo.blockLimit > 0
                ) {
                  limit = state.queue.serviceInfo.blockLimit;
                }
                if (limit > 0) {
                  const totalBlocksReserved = bookingsReserved.flat(Infinity).sort();
                  const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
                  const blockedBlocks = [];
                  uniqueBlocksReserved.forEach(block => {
                    const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                    // Use >= to match backend validation: alreadyBooked.length >= blockLimit
                    if (times >= limit) {
                      blockedBlocks.push(block);
                    }
                  });
                  availableBlocks = queueBlocks.filter(
                    block => !blockedBlocks.includes(block.number)
                  );
                }
              } else {
                return [];
              }
            }
          }
        }
      }
      state.availableBookingBlocks = availableBlocks;
      console.log('📊 Final availableBookingBlocks:', state.availableBookingBlocks?.length || 0);
      console.log('📊 Block numbers:', state.availableBookingBlocks?.map(b => b.number) || []);
    };

    const getAvailableAttentionBlocks = async attentions => {
      console.log('🟣 getAvailableAttentionBlocks() called');
      console.log('🟣 Received attentions:', attentions?.length || 0);
      console.log('🟣 Queue type:', state.queue.type);
      console.log('🟣 State blocks:', state.blocks?.length || 0);
      console.log('🟣 State date:', state.date);

      // If blocks are missing and date is TODAY, reload them (but only if today is available)
      if ((!state.blocks || state.blocks.length === 0) && state.date === 'TODAY') {
        if (!isTodayAvailable()) {
          console.log(
            '❌ getAvailableAttentionBlocks - Today is not available, NOT reloading blocks',
          );
          state.availableAttentionBlocks = [];
          return;
        }

        console.log('🟣 Blocks missing for TODAY, reloading...');
        if (!state.blocksByDay || Object.keys(state.blocksByDay).length === 0) {
          console.log('🟣 blocksByDay is empty, loading...');
          state.blocksByDay = await getQueueBlockDetailsByDay(state.queue.id);
          console.log(
            '🟣 blocksByDay loaded:',
            Object.keys(state.blocksByDay || {}).length,
            'days'
          );
        }
        state.blocks = getBlocksByDay();
        console.log('🟣 Blocks reloaded:', state.blocks?.length || 0);
      }

      let availableBlocks = [];
      let queueBlocks = [];
      if (state.queue.type !== 'SELECT_SERVICE') {
        if (state.blocks) {
          queueBlocks = state.blocks;
          const timeZone =
            state.commerce && state.commerce.localeInfo
              ? state.commerce.localeInfo.timezone
              : 'America/Sao_Paulo;';
          if (queueBlocks && queueBlocks.length > 0) {
            let attentionsReserved = [];
            queueBlocks = queueBlocks.filter(block => {
              const hourBlock = parseInt(block.hourFrom.split(':')[0]);
              const minBlock = parseInt(block.hourFrom.split(':')[1]);
              const day = new Date(getActualDay(new Date(), timeZone)).getTime();
              const dayBlock = new Date(day).setHours(hourBlock, minBlock, 0);
              return dayBlock > day;
            });
            if (attentions && attentions.length > 0) {
              attentionsReserved = attentions.map(attention => {
                if (
                  attention.block &&
                  attention.block.blockNumbers &&
                  attention.block.blockNumbers.length > 0
                ) {
                  return [...attention.block.blockNumbers];
                } else {
                  return attention.number;
                }
              });
              let limit = 0;
              if (
                state.queue.serviceInfo !== undefined &&
                state.queue.serviceInfo.blockLimit !== undefined &&
                state.queue.serviceInfo.blockLimit > 0
              ) {
                limit = state.queue.serviceInfo.blockLimit;
              }
              const totalBlocksReserved = attentionsReserved.flat(Infinity).sort();
              const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
              const blockedBlocks = [];
              uniqueBlocksReserved.forEach(block => {
                const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                if (times > limit) {
                  blockedBlocks.push(block);
                }
              });
              availableBlocks = queueBlocks.filter(
                block => !attentionsReserved.flat(Infinity).includes(block.number)
              );
            } else {
              availableBlocks = queueBlocks;
            }
          }
        }
      } else {
        if (state.selectedServices && state.selectedServices.length > 0) {
          const candidateQueues = [];
          if (
            state.groupedQueues &&
            state.groupedQueues['COLLABORATOR'] &&
            state.groupedQueues['COLLABORATOR'].length > 0
          ) {
            const services = state.selectedServices.map(serv => serv.id);
            state.groupedQueues['COLLABORATOR'].forEach(queue => {
              if (queue.services && queue.services.length > 0) {
                const availableServices = queue.services.map(serv => serv.id);
                if (services.every(serv => availableServices.includes(serv))) {
                  candidateQueues.push(queue);
                }
              } else {
                candidateQueues.push(queue);
              }
            });
          }
          if (state.blocks) {
            queueBlocks = state.blocks;
            const timeZone =
              state.commerce && state.commerce.localeInfo
                ? state.commerce.localeInfo.timezone
                : 'America/Sao_Paulo;';
            if (queueBlocks && queueBlocks.length > 0) {
              const attentionsReserved = [];
              queueBlocks = queueBlocks.filter(block => {
                const hourBlock = parseInt(block.hourFrom.split(':')[0]);
                const minBlock = parseInt(block.hourFrom.split(':')[1]);
                const day = new Date(getActualDay(new Date(), timeZone)).getTime();
                const dayBlock = new Date(day).setHours(hourBlock, minBlock, 0);
                return dayBlock > day;
              });
              candidateQueues.push(state.queue);
              if (candidateQueues && candidateQueues.length > 0) {
                candidateQueues.forEach(queue => {
                  const attentions = state.groupedAttentionsByQueue[queue.id];
                  if (attentions && attentions.length > 0) {
                    const reserved = attentions.map(attention => {
                      if (
                        attention.block &&
                        attention.block.blockNumbers &&
                        attention.block.blockNumbers.length > 0
                      ) {
                        return [...attention.block.blockNumbers];
                      } else {
                        return attention.block?.number;
                      }
                    });
                    attentionsReserved.push(reserved);
                  }
                });
                let limit = candidateQueues.length === 1 ? 1 : candidateQueues.length - 1;
                if (
                  state.queue.serviceInfo !== undefined &&
                  state.queue.serviceInfo.blockLimit !== undefined &&
                  state.queue.serviceInfo.blockLimit > 0
                ) {
                  limit = state.queue.serviceInfo.blockLimit;
                }
                if (limit > 0) {
                  const totalBlocksReserved = attentionsReserved.flat(Infinity).sort();
                  const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
                  const blockedBlocks = [];
                  uniqueBlocksReserved.forEach(block => {
                    const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                    // Use >= to match backend validation: alreadyBooked.length >= blockLimit
                    if (times >= limit) {
                      blockedBlocks.push(block);
                    }
                  });
                  availableBlocks = queueBlocks.filter(
                    block => !blockedBlocks.includes(block.number)
                  );
                }
              } else {
                return [];
              }
            }
          }
        }
      }
      state.availableAttentionBlocks = availableBlocks;
      console.log(
        '🟣 getAvailableAttentionBlocks() completed. Available blocks:',
        availableBlocks.length
      );
      console.log('🟣 Available blocks details:', availableBlocks);
    };

    const updatedAttentions = () => {
      const values = ref([]);
      let unsubscribe;
      const date = new Date(
        new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10)
      );
      const dateToRequest = Timestamp.fromDate(date);
      const attentionsQuery = query(
        attentionCollection,
        where('commerceId', '==', state.commerce.id),
        where('status', 'in', [
          ATTENTION_STATUS.PENDING,
          ATTENTION_STATUS.TERMINATED,
          ATTENTION_STATUS.RATED,
        ]),
        where('createdAt', '>', dateToRequest),
        orderBy('createdAt', 'asc'),
        orderBy('number', 'asc')
      );
      unsubscribe = onSnapshot(attentionsQuery, snapshot => {
        values.value = snapshot.docs.map(doc => {
          const attention = { id: doc.id, ...doc.data() };
          return attention;
        });
      });
      if (values.value && values.value && values.value.length > 0) {
        state.attentions = values.value.filter(attention => attention.queueId === state.queue.id);
      }
      state.allAttentions = values;
      return { unsubscribe };
    };

    const getAvailableDatesByCalendarMonth = async pages => {
      if (pages && pages.length > 0) {
        const page = pages[0].id;
        if (state.specificCalendar === true) {
          await getAvailableSpecificDatesByMonth(`${page}-01`);
        } else {
          await getAvailableDatesByMonth(`${page}-01`);
        }
      }
    };

    const getAvailableDatesByMonth = async date => {
      loadingHours.value = true;
      const availableDates = [];
      const [year, month] = date.split('-');
      const thisMonth = +month - 1;
      const nextMonth = +month;
      const dateFrom = new Date(+year, thisMonth, 1);
      const dateTo = new Date(+year, nextMonth, 0);
      const monthBookings =
        (await getPendingBookingsBetweenDates(state.queue.id, dateFrom, dateTo)) || [];
      const bookingsGroupedByDate = monthBookings.reduce((acc, booking) => {
        const date = booking.date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(booking);
        return acc;
      }, {});
      const dates = Object.keys(bookingsGroupedByDate);
      for (let i = 1; i <= dateTo.getDate(); i++) {
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
        });
      }
      const availability = await availableDates.filter(item => !forDeletion.includes(item));
      const avaliableToCalendar = await availability.map(date => {
        const [year, month, day] = date.split('-');
        return new Date(+year, +month - 1, +day);
      });
      calendarAttributes.value[0].dates = [];
      calendarAttributes.value[0].dates.push(...avaliableToCalendar);
      const forDeletionToCalendar = forDeletion.map(date => {
        const [year, month, day] = date.split('-');
        return new Date(+year, +month - 1, +day);
      });
      calendarAttributes.value[1].dates = [];
      calendarAttributes.value[1].dates.push(...forDeletionToCalendar);
      loadingHours.value = false;
    };

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
              });
              if (
                blocks &&
                blocks.length > 0 &&
                blocks[state.amountofBlocksNeeded - 1] &&
                blocks[state.amountofBlocksNeeded - 1] !== undefined
              ) {
                const number = blocks[0].number;
                const hourFrom = blocks[0].hourFrom;
                const hourTo = blocks[state.amountofBlocksNeeded - 1].hourTo;
                superBlocks.push({
                  number,
                  hourFrom,
                  hourTo,
                  blocks,
                  blockNumbers: build,
                });
              }
            });
            state.availableBookingSuperBlocks = superBlocks;
          } else {
            state.availableBookingSuperBlocks = [];
          }
        } else {
          state.availableBookingSuperBlocks = [];
        }
      }
    };

    const getAvailableAttentionSuperBlocks = () => {
      console.log('🟪 getAvailableAttentionSuperBlocks() called');
      console.log('🟪 Selected services:', state.selectedServices?.length || 0);
      console.log('🟪 Available attention blocks:', state.availableAttentionBlocks?.length || 0);
      console.log('🟪 Amount of blocks needed:', state.amountofBlocksNeeded);
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
                blocks.push(
                  state.availableAttentionBlocks.filter(block => block.number === pos)[0]
                );
              });
              const number = blocks[0].number;
              const hourFrom = blocks[0].hourFrom;
              const hourTo = blocks[state.amountofBlocksNeeded - 1].hourTo;
              superBlocks.push({
                number,
                hourFrom,
                hourTo,
                blocks,
                blockNumbers: build,
              });
            });
            state.availableAttentionSuperBlocks = superBlocks;
          } else {
            state.availableAttentionSuperBlocks = [];
          }
        } else {
          state.availableAttentionSuperBlocks = [];
        }
      }
      loadingHours.value = false;
      console.log(
        '🟪 getAvailableAttentionSuperBlocks() completed. Super blocks:',
        state.availableAttentionSuperBlocks?.length || 0
      );
    };

    const getAvailableSpecificDatesByMonth = async date => {
      loadingHours.value = true;
      const availableDates = [];
      const [year, month] = date.split('-');
      const thisMonth = +month - 1;
      const nextMonth = +month;
      const dateFrom = new Date(+year, thisMonth, 1);
      const dateTo = new Date(+year, nextMonth, 0);
      const monthBookings =
        (await getPendingBookingsBetweenDates(state.queue.id, dateFrom, dateTo)) || [];
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
        if (
          state.queue.serviceInfo !== undefined &&
          state.queue.serviceInfo.blockLimit !== undefined &&
          state.queue.serviceInfo.blockLimit > 0
        ) {
          limit = state.queue.serviceInfo.blockLimit;
        }
        availableDates.forEach(date => {
          const bookings = bookingsGroupedByDate[date] || [];
          const blocks = state.blocksBySpecificCalendarDate[date] || [];
          const blocksNumbers = blocks.map(block => block.number);
          const bookingsReserved = bookings
            .map(booking => {
              if (booking.block) {
                if (booking.block.blockNumbers && booking.block.blockNumbers.length > 0) {
                  return booking.block.blockNumbers;
                } else if (booking.block.number !== undefined && booking.block.number !== null) {
                  return booking.block.number;
                }
              }
              return null;
            })
            .filter(item => item !== null);
          const totalBlocksReserved = bookingsReserved.flat(Infinity).sort();
          const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
          uniqueBlocksReserved.forEach(block => {
            const times = totalBlocksReserved.filter(reserved => reserved === block).length;
            if (
              times > limit &&
              blocksNumbers.every(block => totalBlocksReserved.includes(block)) &&
              !forDeletion.includes(date)
            ) {
              if (uniqueBlocksReserved.length === blocks.length) {
                forDeletion.push(date);
              }
            }
          });
          if (!forDeletion.includes(date) && date === formattedDate(state.specificCalendarDate)) {
            if (state.amountofBlocksNeeded > 1 && state.availableBookingSuperBlocks.length === 0) {
              forDeletion.push(date);
            } else if (
              state.amountofBlocksNeeded === 1 &&
              state.availableBookingBlocks.length === 0
            ) {
              forDeletion.push(date);
            }
          }
        });
      }
      const availability = await availableDates.filter(item => !forDeletion.includes(item));
      const avaliableToCalendar = await availability.map(date => {
        const [year, month, day] = date.split('-');
        return new Date(+year, +month - 1, +day);
      });
      specificCalendarAttributes.value[0].dates = [];
      specificCalendarAttributes.value[0].dates.push(...avaliableToCalendar);
      const forDeletionToCalendar = forDeletion.map(date => {
        const [year, month, day] = date.split('-');
        return new Date(+year, +month - 1, +day);
      });
      specificCalendarAttributes.value[1].dates = [];
      specificCalendarAttributes.value[1].dates.push(...forDeletionToCalendar);
      loadingHours.value = false;
    };

    const showFillForm = () => {
      state.showFillForm = true;
      state.showPickQueue = false;
      state.showPickHours = false;
      // Reset accept state when going back to ensure checkbox is properly validated
      // The checkbox binding will control the actual state
      if (!state.newUser.accept) {
        state.accept = false;
      }
      // Scroll to top smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const showPickQueue = () => {
      state.showFillForm = false;
      state.showPickQueue = true;
      state.showPickHours = false;
      // Clear queue and services selection when returning to step 2
      state.queue = {};
      state.selectedServices = [];
      state.totalDurationRequested = 0;
      state.canBook = false;
      // Scroll to top smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const showPickHours = () => {
      state.showFillForm = false;
      state.showPickQueue = false;
      state.showPickHours = true;
      // Scroll to top smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handle quick slot selection from NextAvailableSlot component
    const handleQuickSlotSelection = async slotData => {
      console.log('🚀 Quick slot selection started:', {
        date: slotData.date,
        block: slotData.block,
        blockNumber: slotData.block?.number,
        hourFrom: slotData.block?.hourFrom,
        hourTo: slotData.block?.hourTo,
      });

      // Check if the selected date is today
      const today = new Date().toISOString().slice(0, 10);
      const isToday = slotData.date === today;

      console.log('🚀 Is today?', isToday, 'Selected:', slotData.date, 'Today:', today);

      // Set flag to protect state during quick selection
      state.isQuickSlotSelection = true;

      if (isToday) {
        // For today: Set attention mode
        console.log('🚀 Setting up for ATTENTION (today)');
        state.date = 'TODAY';
        state.specificCalendarDate = 'TODAY';
        state.attentionBlock = slotData.block;
        state.showToday = true;
        state.showReserve = false;
      } else {
        // For future dates: Set booking mode
        console.log('🚀 Setting up for BOOKING (future date)');
        state.date = slotData.date;
        state.specificCalendarDate = slotData.date;
        state.block = slotData.block;
        state.showToday = false;
        state.showReserve = true;
      }

      // Load blocks and bookings for the selected date to ensure proper availability calculation
      try {
        if (isToday) {
          // For today: Load blocks for attention mode
          console.log('🔄 Loading blocks for TODAY (attention mode)');
          if (!state.blocksByDay || Object.keys(state.blocksByDay).length === 0) {
            state.blocksByDay = await getQueueBlockDetailsByDay(state.queue.id);
          }
          state.blocks = getBlocksByDay(); // This will get today's blocks
          console.log('🔄 Today blocks loaded:', state.blocks?.length || 0);
        } else {
          // For future dates: Load blocks for booking mode
          if (state.specificCalendar) {
            // For specific calendar, ensure we have the blocks loaded
            if (!state.blocksBySpecificCalendarDate[slotData.date]) {
              console.log('🔄 Loading specific calendar blocks for date:', slotData.date);
              state.blocksBySpecificCalendarDate =
                await getQueueBlockDetailsBySpecificDayByCommerceId(
                  state.commerce.id,
                  state.queue.id
                );
            }
            const loadedBlocks = state.blocksBySpecificCalendarDate[slotData.date] || [];
            console.log('🔄 Specific calendar blocks loaded:', loadedBlocks.length);
            state.blocks = loadedBlocks;
          } else {
            // For regular calendar, ensure we have the blocks loaded
            if (!state.blocksByDay || Object.keys(state.blocksByDay).length === 0) {
              console.log('🔄 Loading regular calendar blocks');
              state.blocksByDay = await getQueueBlockDetailsByDay(state.queue.id);
            }
            // Convert date to day of week for regular calendar
            const selectedDate = new Date(slotData.date + 'T00:00:00');
            let dayOfWeek = selectedDate.getDay();
            if (dayOfWeek === 0) dayOfWeek = 7; // Sunday becomes 7
            const loadedBlocks = state.blocksByDay[dayOfWeek] || [];
            console.log('🔄 Regular calendar blocks for day', dayOfWeek, ':', loadedBlocks.length);
            state.blocks = loadedBlocks;
          }
        }

        console.log('🔄 Final state.blocks after loading:', state.blocks?.length || 0);

        if (isToday) {
          // For today: Trigger attention availability calculations
          console.log('📅 Processing for TODAY (attention mode)');

          // Wait a bit for other watchers to settle, then trigger availability calculations
          setTimeout(() => {
            console.log(
              '🔄 Triggering attentionsAvailables() after quick slot selection (debounced)',
            );
            attentionsAvailables();
            // Clear the protection flag after a longer delay to ensure stability
            setTimeout(() => {
              console.log('🔄 Clearing protection flag');
              state.isQuickSlotSelection = false;
            }, 500);
          }, 200);
        } else {
          // For future dates: Load bookings
          console.log('📅 Loading bookings for date:', formattedDate(slotData.date));
          const { unsubscribe } = await updatedBookings(formattedDate(slotData.date));
          if (unsubscribeBookings) {
            unsubscribeBookings();
          }
          unsubscribeBookings = unsubscribe;

          // Wait a bit for other watchers to settle, then trigger availability calculations
          setTimeout(() => {
            console.log(
              '🔄 Triggering bookingsAvailables() after quick slot selection (debounced)',
            );
            bookingsAvailables();
            // Clear the protection flag after a longer delay to ensure stability
            setTimeout(() => {
              console.log('🔄 Clearing protection flag');
              state.isQuickSlotSelection = false;
            }, 500);
          }, 200);
        }
      } catch (error) {
        console.error('Error loading data for quick slot selection:', error);
      }

      // Scroll to confirmation area
      setTimeout(() => {
        const confirmButton = document.querySelector('.btn-confirm-sticky');
        if (confirmButton) {
          confirmButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    };

    // Handle show manual selection
    const handleShowManualSelection = () => {
      // Just scroll to the manual selection area
      setTimeout(() => {
        const manualSelection = document.querySelector('#booking .data-card');
        if (manualSelection) {
          manualSelection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    };

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
    };

    const changeDate = computed(() => {
      const { date } = state;
      return {
        date,
      };
    });

    const changeQueue = computed(() => {
      const { queue } = state;
      return {
        queue,
      };
    });

    // Check for active packages for the selected service
    const checkActivePackagesForService = async () => {
      // Reset state
      state.activePackagesForService = [];
      state.loadingActivePackages = true;

      // Only check if we have selected services and a client
      if (!state.selectedServices || state.selectedServices.length === 0) {
        state.loadingActivePackages = false;
        return;
      }

      const clientId = state.newUser?.clientId || state.newUser?.id;
      if (!clientId || !state.commerce?.id) {
        state.loadingActivePackages = false;
        return;
      }

      const serviceId = state.selectedServices[0]?.id;
      if (!serviceId) {
        state.loadingActivePackages = false;
        return;
      }

      try {
        const { getAvailablePackagesForService } = await import('../application/services/package');
        const availablePackages = await getAvailablePackagesForService(
          state.commerce.id,
          serviceId,
          clientId
        );

        if (availablePackages && availablePackages.length > 0) {
          // Filter for active packages with pending sessions
          const activePackages = availablePackages.filter(pkg => {
            const isActive = ['ACTIVE', 'CONFIRMED', 'REQUESTED'].includes(pkg.status);
            const hasPendingSessions = (pkg.proceduresLeft || 0) > 0;
            return isActive && hasPendingSessions;
          });

          state.activePackagesForService = activePackages || [];
        } else {
          state.activePackagesForService = [];
        }
      } catch (error) {
        console.error('[CommerceQueuesView] Error checking active packages:', error);
        state.activePackagesForService = [];
      } finally {
        state.loadingActivePackages = false;
      }
    };

    // Check if procedure amount selection is needed
    const needsProcedureAmountSelection = computed(() => {
      // Only check if we have selected services
      if (!state.selectedServices || state.selectedServices.length === 0) {
        return false;
      }

      // If client has active packages for this service, don't show selector
      // (the attention/booking will be associated to the existing package)
      if (state.activePackagesForService && state.activePackagesForService.length > 0) {
        return false;
      }

      // Check if any selected service has proceduresList
      const serviceWithProceduresList = state.selectedServices.find(service => {
        const proceduresList = service.serviceInfo?.proceduresList;
        return proceduresList && proceduresList.trim() && proceduresList.trim().length > 0;
      });

      return !!serviceWithProceduresList;
    });

    // Get available procedure amounts from proceduresList
    const availableProcedureAmounts = computed(() => {
      if (!state.selectedServices || state.selectedServices.length === 0) {
        return [];
      }

      // Get the first service with proceduresList (assuming single service selection for packages)
      const serviceWithProceduresList = state.selectedServices.find(service => {
        const proceduresList = service.serviceInfo?.proceduresList;
        return proceduresList && proceduresList.trim() && proceduresList.trim().length > 0;
      });

      if (!serviceWithProceduresList) {
        return [];
      }

      const proceduresList = serviceWithProceduresList.serviceInfo.proceduresList.trim();
      // Parse comma-separated values and convert to numbers
      return proceduresList
        .split(',')
        .map(item => parseInt(item.trim(), 10))
        .filter(num => !isNaN(num) && num > 0)
        .sort((a, b) => a - b);
    });

    // Check if procedure amount selection is required and completed
    const isProcedureAmountSelectionValid = computed(() => {
      // If no procedure selection is needed, it's valid
      if (!needsProcedureAmountSelection.value) {
        return true;
      }
      // If procedure selection is needed, check if it's selected
      return !!state.selectedProcedureAmount;
    });

    const changeAttention = computed(() => {
      const { allAttentions } = state;
      return {
        allAttentions,
      };
    });

    const changeBooking = computed(() => {
      const { allBookings } = state;
      return {
        allBookings,
      };
    });

    // Load package reminder info when services and client are selected
    const loadPackageReminderInfo = async () => {
      if (loadingPackageReminder.value || !isMounted.value) return;

      const clientId = state.newUser?.clientId || state.newUser?.id;
      if (!clientId || !state.commerce?.id) {
        packageReminderInfo.value = null;
        return;
      }

      if (!state.selectedServices || state.selectedServices.length === 0) {
        packageReminderInfo.value = null;
        return;
      }

      const serviceId = state.selectedServices[0]?.id;
      if (!serviceId) {
        packageReminderInfo.value = null;
        return;
      }

      try {
        loadingPackageReminder.value = true;
        const { getAvailablePackagesForService } = await import('../application/services/package');
        const { getAttentionsDetails } = await import('../application/services/query-stack');
        const { getBookingsDetails } = await import('../application/services/query-stack');

        const availablePackages = await getAvailablePackagesForService(
          state.commerce.id,
          serviceId,
          clientId
        );

        if (availablePackages && availablePackages.length > 0) {
          const activePackage = availablePackages.find(pkg => {
            const isActive = ['ACTIVE', 'CONFIRMED', 'REQUESTED'].includes(pkg.status);
            const hasPendingSessions = (pkg.proceduresLeft || 0) > 0;
            return isActive && hasPendingSessions;
          });

          if (activePackage) {
            let pendingAttentions = [];
            let pendingBookings = [];

            try {
              const allAttentions = await getAttentionsDetails(
                state.commerce.id,
                undefined,
                undefined,
                undefined,
                1,
                100,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                clientId
              );

              pendingAttentions = (allAttentions || []).filter(att => {
                const attPackageId = String(att.packageId || '').trim();
                const pkgId = String(activePackage.id || '').trim();
                return (
                  attPackageId === pkgId &&
                  attPackageId !== '' &&
                  (att.status === 'PENDING' || att.status === 'TERMINATED')
                );
              });

              const allBookings = await getBookingsDetails(
                state.commerce.id,
                null,
                null,
                null,
                1,
                100,
                null,
                null,
                false,
                null,
                null,
                null,
                clientId
              );

              pendingBookings = (allBookings || []).filter(booking => {
                const bookingPackageId = String(booking.packageId || '').trim();
                const pkgId = String(activePackage.id || '').trim();
                return (
                  bookingPackageId === pkgId &&
                  bookingPackageId !== '' &&
                  booking.status === 'PENDING'
                );
              });
            } catch (error) {
              console.error('Error loading package attentions/bookings:', error);
            }

            const proceduresUsed = activePackage.proceduresUsed || 0;
            const currentSessionNumber =
              proceduresUsed + pendingAttentions.length + pendingBookings.length + 1;
            const totalSessions = activePackage.proceduresAmount || 0;
            const serviceName = state.selectedServices[0]?.name || '';

            if (isMounted.value) {
              packageReminderInfo.value = {
                id: activePackage.id,
                name: activePackage.name,
                serviceName,
                currentSession: currentSessionNumber,
                totalSessions,
                sessionsRemaining: activePackage.proceduresLeft || 0,
              };
            }
          } else {
            if (isMounted.value) {
              packageReminderInfo.value = null;
            }
          }
        } else {
          if (isMounted.value) {
            packageReminderInfo.value = null;
          }
        }
      } catch (error) {
        console.error('Error loading package reminder info:', error);
        if (isMounted.value) {
          packageReminderInfo.value = null;
        }
      } finally {
        if (isMounted.value) {
          loadingPackageReminder.value = false;
        }
      }
    };

    // Watch for changes in selected services or client ID to load package reminder and check active packages
    watch(
      () => [
        state.selectedServices,
        state.newUser?.clientId,
        state.newUser?.id,
        state.showPickQueue,
      ],
      () => {
        if (isMounted.value && state.showPickQueue) {
          loadPackageReminderInfo();
          checkActivePackagesForService();
        }
      },
      { deep: true }
    );

    const changeAttentionBlock = computed(() => {
      const { attentionBlock } = state;
      return {
        attentionBlock,
      };
    });

    const changeBlock = computed(() => {
      const { block } = state;
      return {
        block,
      };
    });

    const changeSpecificCalendarDate = computed(() => {
      const { specificCalendarDate } = state;
      return {
        specificCalendarDate,
      };
    });

    watch(changeQueue, async () => {
      if (state.queue && state.queue.id) {
        // Clear selected services when queue changes
        state.selectedServices = [];
        state.totalDurationRequested = 0;
        state.totalServicesResquested = 0;
        state.canBook = false;

        if (state.queue.serviceInfo && state.queue.serviceInfo.specificCalendar) {
          state.specificCalendar = true;
        } else if (state.commerce.serviceInfo && state.commerce.serviceInfo.specificCalendar) {
          state.specificCalendar = true;
        } else {
          state.specificCalendar = false;
        }
        if (state.specificCalendar === true) {
          if (state.queue.serviceInfo && state.queue.serviceInfo.specificCalendarDays) {
            state.specificCalendarDates =
              Object.keys(state.queue.serviceInfo.specificCalendarDays) || [];
            state.specificCalendarDays = state.commerce.serviceInfo.specificCalendarDays;
            state.specificCalendarDates =
              Object.keys(state.queue.serviceInfo.specificCalendarDays) || [];
          } else if (
            state.commerce.serviceInfo &&
            state.commerce.serviceInfo.specificCalendarDays
          ) {
            state.specificCalendarDates =
              Object.keys(state.commerce.serviceInfo.specificCalendarDays) || [];
            state.specificCalendarDays = state.commerce.serviceInfo.specificCalendarDays;
            state.specificCalendarDates =
              Object.keys(state.commerce.serviceInfo.specificCalendarDays) || [];
          }
          state.blocksBySpecificCalendarDate = await getQueueBlockDetailsBySpecificDayByCommerceId(
            state.commerce.id,
            state.queue.id
          );
          state.blocks = getBlocksBySpecificDay();
        } else {
          console.log('🟦 Loading blocksByDay for queue:', state.queue.id);
          state.blocksByDay = await getQueueBlockDetailsByDay(state.queue.id);
          console.log(
            '🟦 blocksByDay loaded:',
            Object.keys(state.blocksByDay || {}).length,
            'days'
          );
          console.log('🟦 blocksByDay content:', state.blocksByDay);
          state.blocks = getBlocksByDay();
          console.log('🟦 Initial blocks:', state.blocks?.length || 0);
        }

        // Removed scroll behavior - it was causing weird delays
      }

      // Don't reset block if we're in quick slot selection
      if (!state.isQuickSlotSelection) {
        state.block = {};
      } else {
        console.log('🛡️ Protected state.block from reset during quick selection');
      }

      let currentDate;
      if (
        state.date === undefined ||
        state.date === 'TODAY' ||
        state.specificCalendarDate === undefined ||
        state.specificCalendarDate === 'TODAY'
      ) {
        currentDate = new Date(new Date().setDate(new Date().getDate() + 1))
          .toISOString()
          .slice(0, 10);
      } else {
        currentDate = new Date(new Date(state.date || new Date()).setDate(new Date().getDate() + 1))
          .toISOString()
          .slice(0, 10);
      }
      getAvailableBookingBlocks(state.bookings);
      getAvailableBookingSuperBlocks();
      bookingsAvailables();
      if (state.specificCalendar === true) {
        await getAvailableSpecificDatesByMonth(currentDate);
      } else {
        await getAvailableDatesByMonth(currentDate);
      }
    });

    watch(changeAttention, async (newData, oldData) => {
      console.log('🟡 changeAttention watcher triggered');
      console.log('🟡 New attentions:', newData.allAttentions?.value?.length || 0);
      console.log('🟡 Old attentions:', oldData.allAttentions?.value?.length || 0);
      alertError.value = '';
      if (newData.allAttentions !== oldData.allAttentions) {
        const newIds = newData.allAttentions.map(att => att.id);
        const oldIds = oldData.allAttentions.map(att => att.id);
        if (!newIds.every(id => oldIds.includes(id))) {
          console.log('🟡 Attentions changed, processing...');
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
            console.log('🟡 Filtered attentions for queue:', state.attentions?.length || 0);
          }
        }
        console.log(
          '🟡 Calling getAvailableAttentionBlocks with:',
          state.attentions?.length || 0,
          'attentions'
        );
        await getAvailableAttentionBlocks(state.attentions);
        console.log(
          '🟡 Available attention blocks after calculation:',
          state.availableAttentionBlocks?.length || 0
        );
        getAvailableAttentionSuperBlocks();
        console.log(
          '🟡 Available super blocks after calculation:',
          state.availableAttentionSuperBlocks?.length || 0
        );
        attentionsAvailables();
        loadingHours.value = false;
        console.log('🟡 Loading hours set to false in watcher');
      } else {
        console.log('🟡 Attentions reference unchanged, skipping...');
      }
    });

    watch(changeAttentionBlock, async newData => {
      // Update telemedicine scheduledAt when block is selected
      if (
        state.isTelemedicine &&
        state.telemedicineConfig &&
        newData.attentionBlock &&
        newData.attentionBlock.hourFrom
      ) {
        const selectedDate = state.date || state.specificCalendarDate;
        if (selectedDate) {
          if (selectedDate === 'TODAY') {
            const today = new DateModel().toString();
            const scheduledDateTime = new Date(
              today + 'T' + newData.attentionBlock.hourFrom + ':00'
            );
            state.telemedicineConfig.scheduledAt = scheduledDateTime.toISOString().slice(0, 16);
          } else {
            const dateStr =
              typeof selectedDate === 'string'
                ? selectedDate
                : new DateModel(selectedDate).toString();
            const scheduledDateTime = new Date(
              dateStr + 'T' + newData.attentionBlock.hourFrom + ':00'
            );
            state.telemedicineConfig.scheduledAt = scheduledDateTime.toISOString().slice(0, 16);
          }
        }
      }
      if (state.attentionBlock) {
        console.log('🟦 changeAttentionBlock watcher triggered');
        console.log('🟦 attentionBlock:', state.attentionBlock);
        console.log('🟦 attentionBlock.hourFrom:', state.attentionBlock.hourFrom);
        console.log('🟦 attentionBlock.hourTo:', state.attentionBlock.hourTo);
        attentionsAvailables();
        getAvailableAttentionSuperBlocks();
      }
    });

    watch(changeBlock, async newData => {
      // Update telemedicine scheduledAt when block is selected
      if (
        state.isTelemedicine &&
        state.telemedicineConfig &&
        newData.block &&
        newData.block.hourFrom
      ) {
        const selectedDate = state.date || state.specificCalendarDate;
        if (selectedDate) {
          if (selectedDate === 'TODAY') {
            const today = new DateModel().toString();
            const scheduledDateTime = new Date(today + 'T' + newData.block.hourFrom + ':00');
            state.telemedicineConfig.scheduledAt = scheduledDateTime.toISOString().slice(0, 16);
          } else {
            const dateStr =
              typeof selectedDate === 'string'
                ? selectedDate
                : new DateModel(selectedDate).toString();
            const scheduledDateTime = new Date(dateStr + 'T' + newData.block.hourFrom + ':00');
            state.telemedicineConfig.scheduledAt = scheduledDateTime.toISOString().slice(0, 16);
          }
        }
      }
      if (state.attentionBlock) {
        getAvailableBookingBlocks(state.bookings);
        getAvailableBookingSuperBlocks();
        bookingsAvailables();
      }
    });

    watch(changeBooking, async (newData, oldData) => {
      loadingHours.value = true;
      if (
        newData.allBookings !== oldData.allBookings &&
        ((state.date && state.date !== 'TODAY') ||
          (state.specificCalendarDate && state.specificCalendarDate !== 'TODAY'))
      ) {
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
        currentDate = new Date(new Date(state.date || new Date()).setDate(new Date().getDate() + 1))
          .toISOString()
          .slice(0, 10);
        if (newData.allBookings.length > 0) {
          if (state.specificCalendar === true) {
            if (
              !state.specificCalendarDate ||
              state.specificCalendarDates.includes(formattedDate(state.specificCalendarDate))
            ) {
              await getAvailableSpecificDatesByMonth(currentDate);
            }
          } else {
            await getAvailableDatesByMonth(currentDate);
          }
        }
      }
      loadingHours.value = false;
    });

    watch(changeDate, async (newData, oldData) => {
      console.log('🟠 changeDate watcher triggered');
      console.log('🟠 New date:', newData.date);
      console.log('🟠 Old date:', oldData.date);
      console.log('🟠 State date:', state.date);
      if (state.date && state.date === 'TODAY') {
        console.log('🟠 Date is TODAY, processing...');

        // Check if today is available
        if (!isTodayAvailable()) {
          console.log('❌ changeDate watcher - Today is not available');
          state.availableAttentionBlocks = [];
          state.availableAttentionSuperBlocks = [];
          state.availableBookingBlocks = [];
          state.blocks = [];
          loadingHours.value = false;
          return;
        }

        if (getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')) {
          console.log('🟠 booking-block-active is enabled');

          // Ensure blocksByDay is loaded
          if (!state.blocksByDay || Object.keys(state.blocksByDay).length === 0) {
            console.log('🟠 blocksByDay is empty in watcher, loading...');
            state.blocksByDay = await getQueueBlockDetailsByDay(state.queue.id);
            console.log(
              '🟠 blocksByDay loaded in watcher:',
              Object.keys(state.blocksByDay || {}).length,
              'days'
            );
          }

          // Don't reset blocks/block if we're in quick slot selection
          if (!state.isQuickSlotSelection) {
            state.blocks = getBlocksByDay();
            console.log('🟠 Blocks loaded:', state.blocks?.length || 0);
            state.block = {};
          } else {
            console.log('🛡️ Protected state.blocks/block from reset during quick selection');
          }
          if (unsubscribeAttentions) {
            unsubscribeAttentions();
          }
          getAttentions();
          // Ensure blocks are loaded if attentions are already available
          console.log('🟠 Checking attentions:', state.attentions?.length || 0);
          if (state.attentions && state.attentions.length >= 0) {
            console.log('🟠 Attentions available, loading blocks immediately');
            await getAvailableAttentionBlocks(state.attentions);
            getAvailableAttentionSuperBlocks();
            loadingHours.value = false;
            console.log('🟠 Loading hours set to false in changeDate watcher');
          } else {
            console.log('🟠 No attentions yet, waiting for changeAttention watcher...');
          }
        } else {
          console.log('🟠 booking-block-active is NOT enabled');
          await getAttention(undefined);
        }
      } else if (newData.date && newData.date !== oldData.date && newData.date !== 'TODAY') {
        console.log('🟠 Date changed to non-TODAY, updating blocks');
        console.log('🟠 Current state.block:', state.block);
        console.log('🟠 isQuickSlotSelection:', state.isQuickSlotSelection);

        // Don't interfere if we're in the middle of a quick slot selection
        if (state.isQuickSlotSelection) {
          console.log('🟠 Quick slot selection in progress, skipping block reset');
          return;
        }

        // Only reset blocks if we don't have a valid block already selected
        if (!state.block || !state.block.number) {
          console.log('🟠 No valid block selected, getting blocks for day');
          state.blocks = getBlocksByDay();
          state.block = {};
        } else {
          console.log('🟠 Valid block already selected, keeping current blocks');
          // Still update blocks but don't reset the selected block
          const newBlocks = getBlocksByDay();
          if (newBlocks && newBlocks.length > 0) {
            state.blocks = newBlocks;
          }
        }

        if (unsubscribeBookings) {
          unsubscribeBookings();
        }
        await getBookings();
      }
      // Always update blocks when date changes (including when switching to TODAY)
      if (state.date && state.date !== 'TODAY') {
        getAvailableBookingBlocks(state.bookings);
        getAvailableBookingSuperBlocks();
      }
      // If showToday is active, ensure blocks are loaded
      if (
        state.showToday &&
        state.date === 'TODAY' &&
        (!state.blocks || state.blocks.length === 0)
      ) {
        console.log('🟠 showToday is active but blocks are missing, reloading...');
        if (!state.blocksByDay || Object.keys(state.blocksByDay).length === 0) {
          state.blocksByDay = await getQueueBlockDetailsByDay(state.queue.id);
        }
        state.blocks = getBlocksByDay();
        console.log('🟠 Blocks reloaded for showToday:', state.blocks?.length || 0);
      }
      getAvailableAttentionSuperBlocks();
      bookingsAvailables();
      await attentionsAvailables();

      // Scroll to time selection card after date is selected
      if (newData.date && newData.date !== oldData.date) {
        nextTick(() => {
          setTimeout(() => {
            const timeCard = document.querySelector('.time-slot-grid');
            if (timeCard) {
              timeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 600);
        });
      }
    });

    watch(changeSpecificCalendarDate, async (newData, oldData) => {
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
      } else if (
        newData.specificCalendarDate &&
        newData.specificCalendarDate !== oldData.specificCalendarDate
      ) {
        // Don't reset blocks/block if we're in quick slot selection
        if (!state.isQuickSlotSelection) {
          state.blocks = getBlocksBySpecificDay();
          state.block = {};
        } else {
          console.log('🛡️ Protected state.blocks/block from reset in specificCalendarDate watcher');
        }

        if (unsubscribeBookings) {
          unsubscribeBookings();
        }
        await getBookings();
      }
      getAvailableBookingBlocks(state.bookings);
      getAvailableBookingSuperBlocks();
      getAvailableAttentionSuperBlocks();
      bookingsAvailables();
      attentionsAvailables();

      // Scroll to time selection card after date is selected
      if (
        newData.specificCalendarDate &&
        newData.specificCalendarDate !== oldData.specificCalendarDate
      ) {
        nextTick(() => {
          setTimeout(() => {
            const timeCard = document.querySelector('.time-slot-grid');
            if (timeCard) {
              timeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 600);
        });
      }
    });

    // Helper function to convert duration from minutes to readable format
    const convertDuration = duration => {
      if (duration) {
        if (duration > 0 && duration < 60) {
          return `${duration}m`;
        } else {
          const hours = Math.trunc(duration / 60);
          const minutes = duration % 60;
          if (minutes === 0) {
            return `${hours}h`;
          } else {
            return `${hours}h ${minutes}m`;
          }
        }
      }
      return '';
    };

    // Telemedicine toggle handler
    const handleTelemedicineToggle = () => {
      if (state.isTelemedicine) {
        // Initialize telemedicine config with default values
        if (!state.telemedicineConfig) {
          state.telemedicineConfig = {
            type: 'VIDEO', // Always VIDEO for telemedicine
            scheduledAt: null,
            notes: '',
          };
        } else {
          // Ensure type is always VIDEO
          state.telemedicineConfig.type = 'VIDEO';
        }

        // Use selected block's date and time if available
        const selectedDate = state.date || state.specificCalendarDate;
        const selectedBlock = state.attentionBlock || state.block;

        if (selectedDate && selectedBlock && selectedBlock.hourFrom) {
          if (selectedDate === 'TODAY') {
            const today = new DateModel().toString();
            const scheduledDateTime = new Date(today + 'T' + selectedBlock.hourFrom + ':00');
            state.telemedicineConfig.scheduledAt = scheduledDateTime.toISOString().slice(0, 16);
          } else {
            const dateStr =
              typeof selectedDate === 'string'
                ? selectedDate
                : new DateModel(selectedDate).toString();
            const scheduledDateTime = new Date(dateStr + 'T' + selectedBlock.hourFrom + ':00');
            state.telemedicineConfig.scheduledAt = scheduledDateTime.toISOString().slice(0, 16);
          }
        } else if (selectedDate && selectedDate !== 'TODAY') {
          // Use selected date with default time if no block selected yet
          const dateStr =
            typeof selectedDate === 'string'
              ? selectedDate
              : new DateModel(selectedDate).toString();
          state.telemedicineConfig.scheduledAt = new Date(dateStr + 'T10:00:00')
            .toISOString()
            .slice(0, 16);
        } else if (!state.telemedicineConfig.scheduledAt) {
          // Fallback to tomorrow if no date selected
          state.telemedicineConfig.scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 16);
        }
      } else {
        // Reset config when disabled but keep it as an object
        if (!state.telemedicineConfig) {
          state.telemedicineConfig = {
            type: 'VIDEO',
            scheduledAt: null,
          };
        } else {
          state.telemedicineConfig.scheduledAt = null;
        }
      }
    };

    // Format selected block date/time for telemedicine display - uses the booking/attention block directly
    const formatSelectedBlockDateTime = computed(() => {
      const selectedDate = state.date || state.specificCalendarDate;
      const selectedBlock = state.attentionBlock || state.block;

      // Check if we have the required data
      if (!selectedDate || !selectedBlock) {
        return '';
      }

      // Handle both single block and multiple blocks cases
      let hourFrom = '';
      let hourTo = '';

      if (selectedBlock.blocks && selectedBlock.blocks.length > 0) {
        // Multiple blocks case - use first and last block for time range
        const firstBlock = selectedBlock.blocks[0];
        const lastBlock = selectedBlock.blocks[selectedBlock.blocks.length - 1];
        hourFrom = firstBlock?.hourFrom || '';
        hourTo = lastBlock?.hourTo || '';
      } else if (selectedBlock.hourFrom) {
        // Single block case
        hourFrom = selectedBlock.hourFrom;
        hourTo = selectedBlock.hourTo || '';
      }

      if (!hourFrom) {
        return '';
      }

      try {
        let dateStr;
        if (selectedDate === 'TODAY') {
          dateStr = new DateModel().toString();
        } else {
          dateStr =
            typeof selectedDate === 'string'
              ? selectedDate
              : new DateModel(selectedDate).toString();
        }

        const [year, month, day] = dateStr.split('-');

        if (hourFrom && hourTo) {
          return `${day}/${month}/${year}, ${hourFrom} - ${hourTo}`;
        } else if (hourFrom) {
          return `${day}/${month}/${year}, ${hourFrom}`;
        } else {
          return `${day}/${month}/${year}`;
        }
      } catch (error) {
        console.error('Error formatting block date/time:', error, { selectedDate, selectedBlock });
        return '';
      }
    });

    // Computed property to check if there are available queues
    const hasAvailableQueues = computed(() => {
      if (!state.commerce || !state.commerce.id) {
        return true; // Don't show message until commerce is loaded
      }
      // Check if there are any queues in state.queues or any type in groupedQueues
      if (state.queues && state.queues.length > 0) {
        return true;
      }
      if (state.groupedQueues && Object.keys(state.groupedQueues).length > 0) {
        const totalQueues = Object.values(state.groupedQueues).flat();
        return totalQueues.length > 0;
      }
      return false;
    });

    // Computed property to validate if form fields are complete
    const isFormValid = computed(() => {
      try {
        // Safety check: ensure commerce is loaded
        if (!state.commerce || !state.commerce.id) {
          return false;
        }

        const user = state.newUser || {};

        // If user is not required, only check terms acceptance
        if (getActiveFeature(state.commerce, 'attention-user-not-required', 'USER')) {
          return state.accept === true;
        }

        // If user already exists (has clientId), only check terms acceptance
        if (user.clientId && user.clientId.length > 0) {
          return state.accept === true;
        }

        // Check all required fields based on commerce features
        let isValid = true;

        // Name validation
        if (isValid && getActiveFeature(state.commerce, 'attention-user-name', 'USER')) {
          if (!user.name || (typeof user.name === 'string' && user.name.trim().length === 0)) {
            isValid = false;
          }
        }

        // Last Name validation
        if (isValid && getActiveFeature(state.commerce, 'attention-user-lastName', 'USER')) {
          if (
            !user.lastName ||
            (typeof user.lastName === 'string' && user.lastName.trim().length === 0)
          ) {
            isValid = false;
          }
        }

        // ID Number validation (skip expensive validation if basic checks fail)
        if (isValid && getActiveFeature(state.commerce, 'attention-user-idNumber', 'USER')) {
          if (!user.idNumber || user.idNumber.length === 0) {
            isValid = false;
          } else if (isValid) {
            // Only run expensive validation if basic check passed
            isValid = validateIdNumber(state.commerce, user.idNumber);
          }
        }

        // Phone validation
        if (isValid && getActiveFeature(state.commerce, 'attention-user-phone', 'USER')) {
          if (
            !state.phoneCode ||
            state.phoneCode.length === 0 ||
            !state.phone ||
            state.phone.length === 0
          ) {
            isValid = false;
          }
        }

        // Email validation
        if (isValid && getActiveFeature(state.commerce, 'attention-user-email', 'USER')) {
          if (!user.email || user.email.length === 0) {
            isValid = false;
          } else if (isValid) {
            // Only run expensive validation if basic check passed
            isValid = validateEmail(user.email);
          }
        }

        // Address validation
        if (isValid && getActiveFeature(state.commerce, 'attention-user-address', 'USER')) {
          if (
            !user.addressText ||
            user.addressText.length === 0 ||
            !user.addressCode ||
            user.addressCode.length === 0 ||
            !user.addressComplement ||
            user.addressComplement.length === 0
          ) {
            isValid = false;
          }
        }

        // Birthday validation
        if (isValid && getActiveFeature(state.commerce, 'attention-user-birthday', 'USER')) {
          // Birthday is required: must have a value AND no validation errors
          if (!user.birthday || user.birthday.length === 0 || state.birthdayError === true) {
            isValid = false;
          }
        }

        // Origin validation
        if (isValid && getActiveFeature(state.commerce, 'attention-user-origin', 'USER')) {
          if (!user.origin || user.origin.length === 0) {
            isValid = false;
          }
        }

        // Code1 validation
        if (isValid && getActiveFeature(state.commerce, 'attention-user-code1', 'USER')) {
          if (!user.code1 || user.code1.length === 0) {
            isValid = false;
          }
        }

        // Code2 validation
        if (isValid && getActiveFeature(state.commerce, 'attention-user-code2', 'USER')) {
          if (!user.code2 || user.code2.length === 0) {
            isValid = false;
          }
        }

        // Code3 validation
        if (isValid && getActiveFeature(state.commerce, 'attention-user-code3', 'USER')) {
          if (!user.code3 || user.code3.length === 0) {
            isValid = false;
          }
        }

        // Health Agreement validation
        if (
          isValid &&
          getActiveFeature(state.commerce, 'attention-user-health-agreement', 'USER')
        ) {
          if (!user.healthAgreementId || user.healthAgreementId.length === 0) {
            isValid = false;
          }
        }

        // Check if terms are accepted
        // Use both state.accept and state.newUser.accept to ensure consistency
        if (!state.accept || (user.accept !== undefined && !user.accept)) {
          isValid = false;
        }

        return isValid;
      } catch (error) {
        console.error('Error in isFormValid:', error);
        return false;
      }
    });

    return {
      state,
      siteKey,
      captchaEnabled,
      keyName,
      loading,
      loadingHours,
      loadingService,
      alertError,
      alertErrorMessage,
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
      isTelemedicineEnabled,
      isActiveCommerce,
      isAvailableCommerce,
      hasAvailableQueues,
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
      handleQuickSlotSelection,
      handleShowManualSelection,
      showFormStep,
      isFormValid,
      convertDuration,
      selectAttentionBlock,
      formatSelectedBlockDateTime,
      needsProcedureAmountSelection,
      availableProcedureAmounts,
      isProcedureAmountSelectionValid,
      packageReminderInfo,
      loadingPackageReminder,
      checkActivePackagesForService,
    };
  },
};
</script>
<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :business-id="state.commerce.businessId" :loading="loading" :large-size="true"></CommerceLogo>
      <div id="page-header" class="text-center mt-2">
        <div class="welcome mb-2">
          <span>{{ $t('commerceQueuesView.welcome') }}</span>
        </div>
      </div>
      <div v-if="isActiveCommerce(state.commerce) && !loading">
        <div v-if="isAvailableCommerce(state.commerce)">
          <!-- No queues available message -->
          <div v-if="!hasAvailableQueues" class="mt-3">
            <Message
              :title="$t('commerceQueuesView.message.title')"
              :content="$t('commerceQueuesView.message.content')"
              :icon="'bi bi-emoji-frown'"
            />
          </div>
          <!-- Normal flow when queues are available -->
          <div v-else>
            <div class="centered mb-2">
              <div class="progress-container col-10 mx-4">
                <div class="modern-progress">
                  <div
                    class="progress-segment progress-primary"
                    role="progressbar"
                    :style="`width: ${showFormStep()}%`"
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
              </div>
            </div>
            <!-- FORM -->
            <Transition name="slide-fade" mode="out-in">
              <div v-if="state.showFillForm">
                <ClientForm
                  :show="true"
                  :commerce="state.commerce"
                  :name="state.newUser.name || name"
                  :last-name="state.newUser.lastName || lastName"
                  :id-number="state.newUser.idNumber || idNumber"
                  :email="state.newUser.email || email"
                  :phone="state.newUser.phone || phone"
                  :birthday="state.newUser.birthday || birthday"
                  :address-text="state.newUser.addressText || addressText"
                  :address-code="state.newUser.addressCode || addressCode"
                  :address-complement="state.newUser.addressComplement || addressComplement"
                  :origin="state.newUser.origin || origin"
                  :code1="state.newUser.code1 || code1"
                  :code2="state.newUser.code2 || code2"
                  :code3="state.newUser.code3 || code3"
                  :health-agreement-id="state.newUser.healthAgreementId || healthAgreementId"
                  :client="client"
                  :errors-add="state.errorsAdd"
                  :receive-data="receiveData"
                >
                </ClientForm>
              </div>
            </Transition>
          <Transition name="slide-fade" mode="out-in">
            <div v-if="state.showPickQueue">
              <!-- QUEUES -->
              <QueueForm
                id="queue-form-container"
                :commerce="state.commerce"
                :queues="state.queues"
                :grouped-queues="state.groupedQueues"
                :queue-id="state.queueId"
                :accept="state.accept"
                :collaborators="state.collaborators"
                :receive-queue="receiveQueue"
                :receive-services="receiveServices"
              >
              </QueueForm>
              <!-- SERVICE -->
              <ServiceForm
                :key="state.queue.id"
                :commerce="state.commerce"
                :queue="state.queue"
                :selected-services="state.selectedServices"
                :receive-selected-services="receiveSelectedServices"
              >
              </ServiceForm>

              <!-- Procedure Amount Selection (if service has proceduresList) -->
              <div
                v-if="
                  state.queue &&
                  state.queue.id &&
                  state.selectedServices &&
                  state.selectedServices.length > 0 &&
                  needsProcedureAmountSelection
                "
                class="row g-1 mt-3"
              >
                <div class="col col-md-10 offset-md-1 data-card">
                  <div class="choose-attention py-2 mb-2">
                    <i class="bi bi-list-check h5 m-1"></i>
                    <span class="fw-bold h6">{{
                      $t('attentionCreation.selectProcedureAmount') ||
                      'Selecciona la cantidad de sesiones'
                    }}</span>
                  </div>
                  <div class="time-slot-grid">
                    <button
                      v-for="amount in availableProcedureAmounts"
                      :key="amount"
                      type="button"
                      class="time-slot-button"
                      :class="{ 'time-slot-selected': state.selectedProcedureAmount === amount }"
                      @click="state.selectedProcedureAmount = amount"
                    >
                      <div class="time-start">{{ amount }}</div>
                      <div class="time-end">
                        {{ $t('attentionCreation.sessions') || 'sesiones' }}
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Telemedicine Option for Walkin Queues (shown when queue is selected and telemedicine is enabled) -->
              <div
                v-if="
                  state.queue &&
                  state.queue.id &&
                  state.queue.type !== 'NODEVICE' &&
                  isQueueWalkin() &&
                  isTelemedicineEnabled(state.commerce, state.queue)
                "
                class="row g-1 mt-3"
              >
                <div class="col col-md-10 offset-md-1 data-card">
                  <div class="telemedicine-option mb-3">
                    <div class="form-check form-switch">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        :id="`telemedicine-walkin-${state.queue.id}`"
                        v-model="state.isTelemedicine"
                        @change="handleTelemedicineToggle"
                      />
                      <label
                        class="form-check-label"
                        :for="`telemedicine-walkin-${state.queue.id}`"
                      >
                        <i class="bi bi-camera-video me-2"></i>
                        <strong>Consulta por Telemedicina</strong>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
          <Transition name="slide-fade" mode="out-in">
            <div v-if="state.showPickHours">
              <!-- BOOKING / ATTENTION -->
              <div
                id="booking"
                v-if="
                  getActiveFeature(state.commerce, 'booking-active', 'PRODUCT') && state.canBook
                "
              >
                <div
                  v-if="isActiveCommerce(state.commerce) && !isQueueWalkin()"
                  class="choose-attention py-2 pt-3"
                >
                  <i class="bi bi-3-circle-fill h5"></i>
                  <span class="fw-bold h6"> {{ $t('commerceQueuesView.when') }} </span>
                </div>

                <!-- Next Available Slot Component -->
                <div
                  v-if="
                    isActiveCommerce(state.commerce) &&
                    !isQueueWalkin() &&
                    state.queue &&
                    state.queue.id
                  "
                  class="row g-1"
                >
                  <div class="col col-md-10 offset-md-1">
                    <NextAvailableSlot
                      :commerce="state.commerce"
                      :queue="state.queue"
                      :selected-services="state.selectedServices"
                      @slot-selected="handleQuickSlotSelection"
                      @show-manual-selection="handleShowManualSelection"
                    />
                  </div>
                </div>

                <!-- Connector between NextAvailableSlot and manual options -->
                <div
                  v-if="
                    isActiveCommerce(state.commerce) &&
                    !isQueueWalkin() &&
                    state.queue &&
                    state.queue.id
                  "
                  class="row g-1 mt-3"
                >
                  <div class="col col-md-10 offset-md-1">
                    <div class="options-connector">
                      <div class="connector-line"></div>
                      <span class="connector-text">{{
                        $t('nextAvailableSlot.orSelectMoreOptions')
                      }}</span>
                      <div class="connector-line"></div>
                    </div>
                  </div>
                </div>

                <div class="row g-1">
                  <div class="col col-md-10 offset-md-1 data-card">
                    <div>
                      <div class="row">
                        <!-- ATTENTION TODAY HOUR -->
                        <div
                          v-if="
                            !getActiveFeature(
                              state.commerce,
                              'attention-today-desactivated',
                              'PRODUCT'
                            ) &&
                            getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT') &&
                            state.queue.id &&
                            !isQueueWalkin()
                          "
                          class="col"
                          id="booking-today-hour"
                        >
                          <button
                            class="btn-size btn btn-md btn-block col-12 fw-bold btn-step-action rounded-pill mt-1 mb-1 px-3 py-2"
                            :class="state.showToday ? 'btn-selected' : ''"
                            @click="
                              setDate('TODAY');
                              showToday();
                            "
                            :disabled="!state.accept || !state.queue.id"
                          >
                            <i class="bi bi-calendar-check-fill me-2"></i>
                            {{ $t('commerceQueuesView.today') }}
                          </button>
                        </div>
                        <!-- ATTENTION TODAY -->
                        <div
                          v-else-if="
                            !getActiveFeature(
                              state.commerce,
                              'attention-today-desactivated',
                              'PRODUCT'
                            )
                          "
                          class="col"
                          id="booking-today"
                        >
                          <button
                            type="button"
                            v-if="!isQueueWalkin()"
                            class="btn-size btn btn-md btn-block col-12 fw-bold btn-step-action rounded-pill mt-1 mb-1 px-3 py-2"
                            @click="setDate('TODAY')"
                            :class="state.date === 'TODAY' ? 'btn-selected' : ''"
                            :disabled="!state.accept || !state.queue.id"
                          >
                            <i class="bi bi-calendar-check-fill me-2"></i>
                            {{ $t('commerceQueuesView.today') }}
                          </button>
                        </div>
                        <!-- BOOKING -->
                        <div class="col">
                          <button
                            class="btn-size btn btn-md btn-block col-12 fw-bold btn-step-action rounded-pill mt-1 mb-1 px-3 py-2"
                            v-if="!isQueueWalkin()"
                            @click="showReserve()"
                            :class="state.showReserve ? 'btn-selected' : ''"
                            :disabled="!state.accept || !state.queue.id"
                          >
                            <i class="bi bi-calendar-event-fill me-2"></i>
                            {{ $t('commerceQueuesView.booking') }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-show="state.showToday" class="mx-2" id="booking-hour">
                    <!-- TIME SELECTION CARD FOR TODAY -->
                    <div class="row g-1">
                      <div class="col col-md-10 offset-md-1 data-card">
                        <div class="choose-attention py-2">
                          <i class="bi bi-clock-fill h5 m-1"></i>
                          <span class="fw-bold h6">{{ $t('commerceQueuesView.selectBlock') }}</span>
                        </div>
                        <Spinner :show="loadingHours"></Spinner>
                        <div v-if="!loadingHours">
                          <div v-if="state.amountofBlocksNeeded > 1">
                            <div
                              v-if="
                                state.availableAttentionSuperBlocks &&
                                state.availableAttentionSuperBlocks.length > 0 &&
                                state.date
                              "
                              class="mb-2"
                            >
                              <div class="time-slot-grid">
                                <button
                                  v-for="block in state.availableAttentionSuperBlocks"
                                  :key="block.number"
                                  type="button"
                                  class="time-slot-button"
                                  :class="{
                                    'time-slot-selected':
                                      (state.attentionBlock &&
                                        state.attentionBlock.number === block.number) ||
                                      (state.block && state.block.number === block.number),
                                  }"
                                  @click="selectAttentionBlock(block)"
                                >
                                  <div class="time-start">{{ block.hourFrom }}</div>
                                  <div class="time-end">{{ block.hourTo }}</div>
                                </button>
                              </div>
                            </div>
                            <!-- Fallback to individual blocks if no super blocks available but individual blocks exist -->
                            <div
                              v-else-if="
                                state.availableAttentionBlocks &&
                                state.availableAttentionBlocks.length > 0 &&
                                state.date
                              "
                              class="mb-2"
                            >
                              <div class="time-slot-grid">
                                <button
                                  v-for="block in state.availableAttentionBlocks"
                                  :key="block.number"
                                  type="button"
                                  class="time-slot-button"
                                  :class="{
                                    'time-slot-selected':
                                      (state.attentionBlock &&
                                        state.attentionBlock.number === block.number) ||
                                      (state.block && state.block.number === block.number),
                                  }"
                                  @click="selectAttentionBlock(block)"
                                >
                                  <div class="time-start">{{ block.hourFrom }}</div>
                                  <div class="time-end">{{ block.hourTo }}</div>
                                </button>
                              </div>
                            </div>
                            <div v-else>
                              <Message
                                :title="$t('commerceQueuesView.message3.title')"
                                :content="$t('commerceQueuesView.message3.content')"
                              >
                              </Message>
                              <div
                                v-if="
                                  getActiveFeature(
                                    state.commerce,
                                    'booking-block-walkin',
                                    'PRODUCT'
                                  ) && state.queue.id
                                "
                              >
                                <div class="choose-attention py-1 pt-2">
                                  <span> {{ $t('commerceQueuesView.walkin') }} </span>
                                </div>
                                <button
                                  type="button"
                                  class="btn-size btn btn-lg btn-block col-9 fw-bold btn-dark rounded-pill mb-2 mt-2"
                                  @click="getAttention(undefined)"
                                  :disabled="
                                    !state.accept ||
                                    !state.queue.id ||
                                    !isProcedureAmountSelectionValid ||
                                    loadingService
                                  "
                                >
                                  {{ $t('commerceQueuesView.confirm') }}
                                  <i class="bi bi-check-lg"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                          <div v-else>
                            <div
                              v-if="
                                state.availableAttentionBlocks &&
                                state.availableAttentionBlocks.length > 0
                              "
                              class="mb-2"
                            >
                              <div class="time-slot-grid">
                                <button
                                  v-for="block in state.availableAttentionBlocks"
                                  :key="block.number"
                                  type="button"
                                  class="time-slot-button"
                                  :class="{
                                    'time-slot-selected':
                                      (state.attentionBlock &&
                                        state.attentionBlock.number === block.number) ||
                                      (state.block && state.block.number === block.number),
                                  }"
                                  @click="selectAttentionBlock(block)"
                                >
                                  <div class="time-start">{{ block.hourFrom }}</div>
                                  <div class="time-end">{{ block.hourTo }}</div>
                                </button>
                              </div>
                            </div>
                            <div v-else>
                              <Message
                                :title="$t('commerceQueuesView.message3.title')"
                                :content="$t('commerceQueuesView.message3.content')"
                              >
                              </Message>
                              <div
                                v-if="
                                  getActiveFeature(
                                    state.commerce,
                                    'booking-block-walkin',
                                    'PRODUCT'
                                  ) && state.queue.id
                                "
                              >
                                <div class="choose-attention py-1 pt-2">
                                  <span> {{ $t('commerceQueuesView.walkin') }} </span>
                                </div>
                                <button
                                  type="button"
                                  class="btn-size btn btn-lg btn-block col-9 fw-bold btn-dark rounded-pill mb-2 mt-2"
                                  @click="getAttention(undefined)"
                                  :disabled="
                                    !state.accept ||
                                    !state.queue.id ||
                                    !isProcedureAmountSelectionValid ||
                                    loadingService
                                  "
                                >
                                  {{ $t('commerceQueuesView.confirm') }}
                                  <i class="bi bi-check-lg"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Telemedicine Option for TODAY booking (shown when block is selected) -->
                    <div
                      v-if="
                        state.queue &&
                        state.queue.type !== 'NODEVICE' &&
                        isTelemedicineEnabled(state.commerce, state.queue) &&
                        (state.block?.number || state.attentionBlock?.number)
                      "
                      class="row g-1 mt-3"
                    >
                      <div class="col col-md-10 offset-md-1 data-card">
                        <div class="telemedicine-option mb-3">
                          <div class="form-check form-switch">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              :id="`telemedicine-today-${Date.now()}`"
                              v-model="state.isTelemedicine"
                              @change="handleTelemedicineToggle"
                            />
                            <label
                              class="form-check-label"
                              :for="`telemedicine-today-${Date.now()}`"
                            >
                              <i class="bi bi-camera-video me-2"></i>
                              <strong>Consulta por Telemedicina</strong>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-show="state.showReserve" class="mx-2" id="booking-date">
                    <!-- SPECIFIC CALENDAR-->
                    <div v-if="state.specificCalendar">
                      <!-- DATE SELECTION CARD -->
                      <div class="row g-1">
                        <div class="col col-md-10 offset-md-1 data-card">
                          <div class="choose-attention py-2">
                            <i class="bi bi-3-circle-fill h5 m-1"></i>
                            <span class="fw-bold h6">{{ $t('commerceQueuesView.selectDay') }}</span>
                          </div>
                          <div v-if="!loadingCalendar">
                            <VDatePicker
                              :locale="state.locale"
                              v-model="state.specificCalendarDate"
                              :mask="dateMask"
                              :min-date="state.minDate"
                              :max-date="state.maxDate"
                              :disabled-dates="disabledDates"
                              :attributes="specificCalendarAttributes"
                              @did-move="getAvailableDatesByCalendarMonth"
                            />
                          </div>
                          <div v-if="loadingCalendar">
                            <Spinner :show="loadingCalendar"></Spinner>
                          </div>
                        </div>
                      </div>

                      <!-- TIME SELECTION CARD -->
                      <div
                        v-if="
                          state.specificCalendarDate &&
                          getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')
                        "
                        class="row g-1 mt-2"
                      >
                        <div class="col col-md-10 offset-md-1 data-card">
                          <div class="choose-attention py-2">
                            <i class="bi bi-clock-fill h5 m-1"></i>
                            <span class="fw-bold h6">{{
                              $t('commerceQueuesView.selectBlock')
                            }}</span>
                          </div>
                          <Spinner :show="loadingHours"></Spinner>
                          <div v-if="!loadingHours">
                            <!-- ATTENTION BLOCKS FOR TODAY -->
                            <template v-if="state.specificCalendarDate === 'TODAY'">
                              <!-- NECESITA MAS DE UN BLOQUE -->
                              <div v-if="state.amountofBlocksNeeded > 1">
                                <!-- HAY BLOQUES DISPONIBLES -->
                                <div
                                  v-if="
                                    state.availableAttentionSuperBlocks &&
                                    state.availableAttentionSuperBlocks.length > 0 &&
                                    state.specificCalendarDate
                                  "
                                  class="mb-2"
                                >
                                  <div class="time-slot-grid">
                                    <button
                                      v-for="block in state.availableAttentionSuperBlocks"
                                      :key="block.number"
                                      type="button"
                                      class="time-slot-button"
                                      :class="{
                                        'time-slot-selected':
                                          (state.attentionBlock &&
                                            state.attentionBlock.number === block.number) ||
                                          (state.block && state.block.number === block.number),
                                      }"
                                      @click="selectAttentionBlock(block)"
                                    >
                                      <div class="time-start">{{ block.hourFrom }}</div>
                                      <div class="time-end">{{ block.hourTo }}</div>
                                    </button>
                                  </div>
                                </div>
                                <!-- Fallback to individual blocks if no super blocks available but individual blocks exist -->
                                <div
                                  v-else-if="
                                    state.availableAttentionBlocks &&
                                    state.availableAttentionBlocks.length > 0 &&
                                    state.specificCalendarDate
                                  "
                                  class="mb-2"
                                >
                                  <div class="time-slot-grid">
                                    <button
                                      v-for="block in state.availableAttentionBlocks"
                                      :key="block.number"
                                      type="button"
                                      class="time-slot-button"
                                      :class="{
                                        'time-slot-selected':
                                          (state.attentionBlock &&
                                            state.attentionBlock.number === block.number) ||
                                          (state.block && state.block.number === block.number),
                                      }"
                                      @click="selectAttentionBlock(block)"
                                    >
                                      <div class="time-start">{{ block.hourFrom }}</div>
                                      <div class="time-end">{{ block.hourTo }}</div>
                                    </button>
                                  </div>
                                </div>
                                <div v-else>
                                  <Message
                                    :title="$t('commerceQueuesView.message3.title')"
                                    :content="$t('commerceQueuesView.message3.content')"
                                  >
                                  </Message>
                                </div>
                              </div>
                              <!-- NECESITA UN SOLO BLOQUE -->
                              <div v-else>
                                <!-- HAY BLOQUES DISPONIBLES -->
                                <div
                                  v-if="
                                    state.availableAttentionBlocks &&
                                    state.availableAttentionBlocks.length > 0
                                  "
                                  class="mb-2"
                                >
                                  <div class="time-slot-grid">
                                    <button
                                      v-for="block in state.availableAttentionBlocks"
                                      :key="block.number"
                                      type="button"
                                      class="time-slot-button"
                                      :class="{
                                        'time-slot-selected':
                                          (state.attentionBlock &&
                                            state.attentionBlock.number === block.number) ||
                                          (state.block && state.block.number === block.number),
                                      }"
                                      @click="selectAttentionBlock(block)"
                                    >
                                      <div class="time-start">{{ block.hourFrom }}</div>
                                      <div class="time-end">{{ block.hourTo }}</div>
                                    </button>
                                  </div>
                                </div>
                                <div v-else>
                                  <Message
                                    :title="$t('commerceQueuesView.message3.title')"
                                    :content="$t('commerceQueuesView.message3.content')"
                                  >
                                  </Message>
                                </div>
                              </div>
                            </template>
                            <!-- BOOKING BLOCKS FOR FUTURE DATES -->
                            <template v-else>
                              <!-- NECESITA MAS DE UN BLOQUE -->
                              <div v-if="state.amountofBlocksNeeded > 1">
                                <!-- HAY BLOQUES DISPONIBLES -->
                                <div
                                  v-if="
                                    state.availableBookingSuperBlocks &&
                                    state.availableBookingSuperBlocks.length > 0 &&
                                    state.specificCalendarDate
                                  "
                                  class="mb-2"
                                >
                                  <div class="time-slot-grid">
                                    <button
                                      v-for="block in state.availableBookingSuperBlocks"
                                      :key="block.number"
                                      type="button"
                                      class="time-slot-button"
                                      :class="{
                                        'time-slot-selected':
                                          (state.attentionBlock &&
                                            state.attentionBlock.number === block.number) ||
                                          (state.block && state.block.number === block.number),
                                      }"
                                      @click="state.block = block"
                                    >
                                      <div class="time-start">{{ block.hourFrom }}</div>
                                      <div class="time-end">{{ block.hourTo }}</div>
                                    </button>
                                  </div>
                                </div>
                                <!-- LISTA DE ESPERA -->
                                <div
                                  v-if="
                                    state.availableBookingSuperBlocks &&
                                    state.availableBookingSuperBlocks.length === 0 &&
                                    state.specificCalendarDate
                                  "
                                  class="mb-2"
                                >
                                  <div
                                    id="waitlist"
                                    class="d-grid gap-2 mb-2 waitlist-box mt-3"
                                    v-if="
                                      getActiveFeature(
                                        state.commerce,
                                        'booking-waitlist-active',
                                        'PRODUCT'
                                      ) &&
                                      state.specificCalendarDates.includes(
                                        formattedDate(state.specificCalendarDate)
                                      )
                                    "
                                  >
                                    <div class="choose-attention">
                                      <i class="bi bi-bell-fill"></i>
                                      <span class="fw-bold">
                                        {{ $t('commerceQueuesView.waitlist.title') }}
                                      </span>
                                      <span> {{ $t('commerceQueuesView.waitlist.content') }} </span>
                                    </div>
                                    <button
                                      v-if="state.queue.active && !state.waitlistCreated"
                                      class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                                      @click="getWaitList()"
                                    >
                                      {{ $t('commerceQueuesView.waitlist.action') }}
                                      <i class="bi bi-check-lg"></i>
                                    </button>
                                    <div v-else>
                                      <Message
                                        :title="$t('commerceQueuesView.message4.title')"
                                        :content="$t('commerceQueuesView.message4.content')"
                                      >
                                      </Message>
                                    </div>
                                  </div>
                                  <div v-else>
                                    <Message
                                      :title="$t('commerceQueuesView.message3.title')"
                                      :content="$t('commerceQueuesView.message3.content')"
                                    >
                                    </Message>
                                  </div>
                                </div>
                              </div>
                              <!-- NECESITA UN SOLO BLOQUE -->
                              <div v-else>
                                <!-- HAY BLOQUES DISPONIBLES -->
                                <div
                                  v-if="
                                    state.availableBookingBlocks &&
                                    state.availableBookingBlocks.length > 0 &&
                                    state.specificCalendarDate
                                  "
                                  class="mb-2"
                                >
                                  <div class="time-slot-grid">
                                    <button
                                      v-for="block in state.availableBookingBlocks"
                                      :key="block.number"
                                      type="button"
                                      class="time-slot-button"
                                      :class="{
                                        'time-slot-selected':
                                          (state.attentionBlock &&
                                            state.attentionBlock.number === block.number) ||
                                          (state.block && state.block.number === block.number),
                                      }"
                                      @click="state.block = block"
                                    >
                                      <div class="time-start">{{ block.hourFrom }}</div>
                                      <div class="time-end">{{ block.hourTo }}</div>
                                    </button>
                                  </div>
                                </div>
                                <!-- LISTA DE ESPERA -->
                                <div
                                  v-if="
                                    state.availableBookingBlocks &&
                                    state.availableBookingBlocks.length === 0 &&
                                    state.specificCalendarDate
                                  "
                                  class="mb-1"
                                >
                                  <div
                                    id="waitlist"
                                    class="d-grid gap-2 mb-1 waitlist-box mt-3"
                                    v-if="
                                      getActiveFeature(
                                        state.commerce,
                                        'booking-waitlist-active',
                                        'PRODUCT'
                                      ) &&
                                      state.specificCalendarDates.includes(
                                        formattedDate(state.specificCalendarDate)
                                      )
                                    "
                                  >
                                    <div class="choose-attention">
                                      <i class="bi bi-bell-fill"></i>
                                      <span class="fw-bold">
                                        {{ $t('commerceQueuesView.waitlist.title') }}
                                      </span>
                                      <span> {{ $t('commerceQueuesView.waitlist.content') }} </span>
                                    </div>
                                    <button
                                      v-if="state.queue.active && !state.waitlistCreated"
                                      class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                                      @click="getWaitList()"
                                    >
                                      {{ $t('commerceQueuesView.waitlist.action') }}
                                      <i class="bi bi-check-lg"></i>
                                    </button>
                                    <div v-else>
                                      <Message
                                        :title="$t('commerceQueuesView.message4.title')"
                                        :content="$t('commerceQueuesView.message4.content')"
                                      >
                                      </Message>
                                    </div>
                                  </div>
                                  <div v-else>
                                    <Message
                                      :title="$t('commerceQueuesView.message3.title')"
                                      :content="$t('commerceQueuesView.message3.content')"
                                    >
                                    </Message>
                                  </div>
                                </div>
                              </div>
                            </template>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- NORMAL CALENDAR-->
                    <div v-else>
                      <!-- DATE SELECTION CARD -->
                      <div class="row g-1">
                        <div class="col col-md-10 offset-md-1 data-card">
                          <div class="choose-attention py-2">
                            <i class="bi bi-3-circle-fill h5 m-1"></i>
                            <span class="fw-bold h6">{{ $t('commerceQueuesView.selectDay') }}</span>
                          </div>
                          <div v-if="!loadingCalendar">
                            <VDatePicker
                              :locale="state.locale"
                              v-model="state.date"
                              :mask="dateMask"
                              :min-date="state.minDate"
                              :max-date="state.maxDate"
                              :disabled-dates="disabledDates"
                              :attributes="calendarAttributes"
                              @did-move="getAvailableDatesByCalendarMonth"
                            />
                          </div>
                          <div v-if="loadingCalendar">
                            <Spinner :show="loadingCalendar"></Spinner>
                          </div>
                        </div>
                      </div>

                      <!-- TIME SELECTION CARD -->
                      <div
                        v-if="
                          state.date &&
                          getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')
                        "
                        class="row g-1 mt-2"
                      >
                        <div class="col col-md-10 offset-md-1 data-card">
                          <div class="choose-attention py-2">
                            <i class="bi bi-clock-fill h5 m-1"></i>
                            <span class="fw-bold h6">{{
                              $t('commerceQueuesView.selectBlock')
                            }}</span>
                          </div>
                          <Spinner :show="loadingHours"></Spinner>
                          <div v-if="!loadingHours">
                            <!-- NECESITA MAS DE UN BLOQUE -->
                            <div v-if="state.amountofBlocksNeeded > 1">
                              <div
                                v-if="
                                  state.availableBookingSuperBlocks &&
                                  state.availableBookingSuperBlocks.length > 0 &&
                                  state.date
                                "
                                class="mb-2"
                              >
                                <div class="time-slot-grid">
                                  <button
                                    v-for="block in state.availableBookingSuperBlocks"
                                    :key="block.number"
                                    type="button"
                                    class="time-slot-button"
                                    :class="{
                                      'time-slot-selected':
                                        (state.attentionBlock &&
                                          state.attentionBlock.number === block.number) ||
                                        (state.block && state.block.number === block.number),
                                    }"
                                    @click="state.block = block"
                                  >
                                    <div class="time-start">{{ block.hourFrom }}</div>
                                    <div class="time-end">{{ block.hourTo }}</div>
                                  </button>
                                </div>
                              </div>
                              <div
                                v-if="
                                  state.availableBookingSuperBlocks &&
                                  state.availableBookingSuperBlocks.length === 0 &&
                                  state.date
                                "
                                class="mb-2"
                              >
                                <div
                                  id="waitlist"
                                  class="d-grid gap-2 mb-2 waitlist-box mt-3"
                                  v-if="
                                    getActiveFeature(
                                      state.commerce,
                                      'booking-waitlist-active',
                                      'PRODUCT'
                                    )
                                  "
                                >
                                  <div class="choose-attention">
                                    <i class="bi bi-bell-fill"></i>
                                    <span class="fw-bold">
                                      {{ $t('commerceQueuesView.waitlist.title') }}
                                    </span>
                                    <span> {{ $t('commerceQueuesView.waitlist.content') }} </span>
                                  </div>
                                  <button
                                    v-if="state.queue.active && !state.waitlistCreated"
                                    class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                                    @click="getWaitList()"
                                  >
                                    {{ $t('commerceQueuesView.waitlist.action') }}
                                    <i class="bi bi-check-lg"></i>
                                  </button>
                                  <div v-else>
                                    <Message
                                      :title="$t('commerceQueuesView.message4.title')"
                                      :content="$t('commerceQueuesView.message4.content')"
                                    >
                                    </Message>
                                  </div>
                                </div>
                                <div v-else>
                                  <Message
                                    :title="$t('commerceQueuesView.message3.title')"
                                    :content="$t('commerceQueuesView.message3.content')"
                                  >
                                  </Message>
                                </div>
                              </div>
                            </div>
                            <!-- NECESITA SOLO UN BLOQUE -->
                            <div v-else>
                              <div
                                v-if="
                                  state.availableBookingBlocks &&
                                  state.availableBookingBlocks.length > 0 &&
                                  state.date
                                "
                                class="mb-2"
                              >
                                <div class="time-slot-grid">
                                  <button
                                    v-for="block in state.availableBookingBlocks"
                                    :key="block.number"
                                    type="button"
                                    class="time-slot-button"
                                    :class="{
                                      'time-slot-selected':
                                        (state.attentionBlock &&
                                          state.attentionBlock.number === block.number) ||
                                        (state.block && state.block.number === block.number),
                                    }"
                                    @click="state.block = block"
                                  >
                                    <div class="time-start">{{ block.hourFrom }}</div>
                                    <div class="time-end">{{ block.hourTo }}</div>
                                  </button>
                                </div>
                              </div>
                              <div
                                v-if="
                                  state.availableBookingBlocks &&
                                  state.availableBookingBlocks.length === 0 &&
                                  state.date
                                "
                                class="mb-1"
                              >
                                <div
                                  id="waitlist"
                                  class="d-grid gap-2 mb-1 waitlist-box mt-3"
                                  v-if="
                                    getActiveFeature(
                                      state.commerce,
                                      'booking-waitlist-active',
                                      'PRODUCT'
                                    )
                                  "
                                >
                                  <div class="choose-attention">
                                    <i class="bi bi-bell-fill"></i>
                                    <span class="fw-bold">
                                      {{ $t('commerceQueuesView.waitlist.title') }}
                                    </span>
                                    <span> {{ $t('commerceQueuesView.waitlist.content') }} </span>
                                  </div>
                                  <button
                                    v-if="state.queue.active && !state.waitlistCreated"
                                    class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                                    @click="getWaitList()"
                                  >
                                    {{ $t('commerceQueuesView.waitlist.action') }}
                                    <i class="bi bi-check-lg"></i>
                                  </button>
                                  <div v-else>
                                    <Message
                                      :title="$t('commerceQueuesView.message4.title')"
                                      :content="$t('commerceQueuesView.message4.content')"
                                    >
                                    </Message>
                                  </div>
                                </div>
                                <div v-else>
                                  <Message
                                    :title="$t('commerceQueuesView.message3.title')"
                                    :content="$t('commerceQueuesView.message3.content')"
                                  >
                                  </Message>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Telemedicine Option (shown when date and block are selected, and telemedicine is enabled for commerce and queue) -->
                        <div
                          v-if="
                            state.queue &&
                            state.queue.type !== 'NODEVICE' &&
                            isTelemedicineEnabled(state.commerce, state.queue) &&
                            state.date &&
                            (state.block?.number || state.attentionBlock?.number)
                          "
                          class="row g-1 mt-2"
                        >
                          <div class="col col-md-10 offset-md-1 data-card">
                            <div class="telemedicine-option mb-3">
                              <div class="form-check form-switch">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  :id="`telemedicine-booking-${Date.now()}`"
                                  v-model="state.isTelemedicine"
                                  @change="handleTelemedicineToggle"
                                />
                                <label
                                  class="form-check-label"
                                  :for="`telemedicine-booking-${Date.now()}`"
                                >
                                  <i class="bi bi-camera-video me-2"></i>
                                  <strong>Consulta por Telemedicina</strong>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
          </div>
        </div>
      </div>
      <div v-if="!isActiveCommerce(state.commerce) && !loading">
        <Message
          :title="$t('commerceQRSetup.message3.title')"
          :content="$t('commerceQRSetup.message3.content')"
          :icon="'bi bi-emoji-smile'"
        >
        </Message>
      </div>
      <Spinner :show="loading"></Spinner>
      <Spinner :show="loadingService"></Spinner>
      <Alert :show="false" :stack="alertError" :error-message="alertErrorMessage"></Alert>

      <!-- Sticky Bottom Navigation Bar -->
      <Transition name="slide-up">
        <div
          v-if="isActiveCommerce(state.commerce) && isAvailableCommerce(state.commerce) && !loading"
          class="sticky-bottom-bar"
        >
          <div class="container-fluid">
            <div class="row justify-content-center">
              <div class="col-12 col-md-10 col-lg-8">
                <!-- Booking Summary Card (show when queue is selected) -->
                <div
                  v-if="state.queue.id && (state.showPickQueue || state.showPickHours)"
                  class="booking-summary-card mb-3"
                >
                  <!-- Toggle Button Header -->
                  <div class="summary-header">
                    <button
                      class="summary-toggle-btn"
                      @click="state.summaryExpanded = !state.summaryExpanded"
                      type="button"
                    >
                      <i
                        :class="state.summaryExpanded ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"
                      ></i>
                    </button>
                  </div>

                  <!-- Collapsible Content -->
                  <Transition name="expand">
                    <div v-show="state.summaryExpanded" class="summary-content">
                      <!-- Professional/Queue Info -->
                      <div class="summary-item" v-if="state.queue.name">
                        <i class="bi bi-person-circle summary-icon"></i>
                        <div class="summary-details">
                          <span class="summary-label">{{ $t('commerceQueuesView.queue') }}:</span>
                          <span class="summary-value">{{ state.queue.name }}</span>
                        </div>
                      </div>

                      <!-- Services Info -->
                      <div
                        class="summary-item"
                        v-if="state.selectedServices && state.selectedServices.length > 0"
                      >
                        <i class="bi bi-tags-fill summary-icon"></i>
                        <div class="summary-details">
                          <span class="summary-label"
                            >{{ $t('commerceQueuesView.services') }}:</span
                          >
                          <span class="summary-value">{{
                            state.selectedServices.map(s => s.name).join(', ')
                          }}</span>
                        </div>
                      </div>

                      <!-- Sessions Info (if procedure amount is selected) -->
                      <div class="summary-item" v-if="state.selectedProcedureAmount">
                        <i class="bi bi-box-seam summary-icon"></i>
                        <div class="summary-details">
                          <span class="summary-label"
                            >{{ $t('package.sessions') || 'Sesiones' }}:</span
                          >
                          <span class="summary-value">{{ state.selectedProcedureAmount }}</span>
                        </div>
                      </div>

                      <!-- Duration Info -->
                      <div class="summary-item" v-if="state.totalDurationRequested > 0">
                        <i class="bi bi-stopwatch-fill summary-icon"></i>
                        <div class="summary-details">
                          <span class="summary-label">{{
                            $t('commerceQueuesView.totalDuration')
                          }}</span>
                          <span class="summary-value">{{
                            convertDuration(state.totalDurationRequested)
                          }}</span>
                        </div>
                      </div>

                      <!-- Telemedicine Info (show whenever selected) -->
                      <div class="summary-item" v-if="state.isTelemedicine">
                        <i class="bi bi-camera-video summary-icon"></i>
                        <div class="summary-details">
                          <span class="summary-label">{{
                            $t('telemedicineSession.sessionType')
                          }}</span>
                          <span class="summary-value">{{
                            $t('commerceQueuesView.telemedicineValue')
                          }}</span>
                        </div>
                      </div>

                      <!-- Date & Time Group (only in step 3) -->
                      <div
                        class="summary-datetime-group"
                        v-if="state.showPickHours && (state.date || state.specificCalendarDate)"
                      >
                        <!-- Date Info -->
                        <div
                          class="summary-item"
                          v-if="
                            formattedDate(state.date || state.specificCalendarDate) ||
                            state.date === 'TODAY' ||
                            state.specificCalendarDate === 'TODAY'
                          "
                        >
                          <i class="bi bi-calendar-event summary-icon"></i>
                          <div class="summary-details">
                            <span class="summary-label">{{ $t('commerceQueuesView.date') }}:</span>
                            <span class="summary-value">
                              <template
                                v-if="
                                  state.date === 'TODAY' || state.specificCalendarDate === 'TODAY'
                                "
                              >
                                {{ $t('commerceQueuesView.today') }}
                              </template>
                              <template v-else>
                                {{ formattedDate(state.date || state.specificCalendarDate) }}
                              </template>
                            </span>
                          </div>
                        </div>

                        <!-- Time Info -->
                        <div
                          class="summary-item"
                          v-if="
                            (state.block && state.block.hourFrom) ||
                            (state.attentionBlock &&
                              state.attentionBlock.hourFrom &&
                              state.attentionBlock.hourTo)
                          "
                        >
                          <i class="bi bi-clock-fill summary-icon"></i>
                          <div class="summary-details">
                            <span class="summary-label">{{ $t('commerceQueuesView.time') }}:</span>
                            <span class="summary-value">
                              <template v-if="state.block && state.block.hourFrom">
                                {{ state.block.hourFrom }} - {{ state.block.hourTo }}
                              </template>
                              <template
                                v-else-if="
                                  state.attentionBlock &&
                                  state.attentionBlock.hourFrom &&
                                  state.attentionBlock.hourTo
                                "
                              >
                                {{ state.attentionBlock.hourFrom }} -
                                {{ state.attentionBlock.hourTo }}
                              </template>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>

                <div class="button-navigation-container">
                  <!-- Back Button (only show if not on first step) -->
                  <button
                    v-if="!state.showFillForm"
                    class="btn btn-md btn-size fw-bold btn-back-sticky rounded-pill px-4"
                    @click="state.showPickQueue ? showFillForm() : showPickQueue()"
                  >
                    <i class="bi bi-arrow-left-circle me-2"></i>
                    Voltar
                  </button>

                  <!-- Next/Continue Button -->
                  <button
                    v-if="state.showFillForm"
                    class="btn btn-lg flex-grow-1 btn-size fw-bold btn-next-sticky rounded-pill px-5 py-3"
                    @click="showPickQueue()"
                    :disabled="!isFormValid"
                  >
                    {{ $t('continue') }}
                    <i class="bi bi-arrow-right-circle-fill ms-2"></i>
                  </button>

                  <!-- For walkin COLLABORATOR queues with services selected, show Confirm button -->
                  <button
                    v-else-if="
                      state.showPickQueue &&
                      state.queue.type === 'COLLABORATOR' &&
                      isQueueWalkin() &&
                      state.canBook
                    "
                    class="btn btn-lg flex-grow-1 btn-size fw-bold btn-confirm-sticky rounded-pill px-5 py-3"
                    @click="getAttention(undefined)"
                    :disabled="
                      !state.accept ||
                      !state.queue.id ||
                      !isProcedureAmountSelectionValid ||
                      loadingService
                    "
                  >
                    {{ $t('commerceQueuesView.confirm') }}
                    <i class="bi bi-check-circle-fill ms-2"></i>
                  </button>

                  <!-- For non-walkin queues or walkin queues without services, show Continue button -->
                  <button
                    v-else-if="state.showPickQueue"
                    class="btn btn-lg flex-grow-1 btn-size fw-bold btn-next-sticky rounded-pill px-5 py-3"
                    @click="showPickHours()"
                    :disabled="!state.queue.id || !state.canBook"
                  >
                    {{ $t('continue') }}
                    <i class="bi bi-arrow-right-circle-fill ms-2"></i>
                  </button>

                  <!-- Confirm Button (only in step 3 when everything is selected) -->
                  <button
                    v-else-if="
                      state.showPickHours &&
                      ((state.block &&
                        state.block.hourFrom &&
                        (state.date || state.specificCalendarDate)) ||
                        (state.attentionBlock &&
                          (state.attentionBlock.number || state.attentionBlock.hourFrom) &&
                          (state.date === 'TODAY' || state.specificCalendarDate === 'TODAY')))
                    "
                    class="btn btn-lg flex-grow-1 btn-size fw-bold btn-confirm-sticky rounded-pill px-5 py-3"
                    @click="
                      state.date === 'TODAY' || state.specificCalendarDate === 'TODAY'
                        ? getAttention(state.attentionBlock)
                        : getBooking()
                    "
                    :disabled="
                      !state.accept ||
                      !state.queue.id ||
                      !isProcedureAmountSelectionValid ||
                      loadingService ||
                      ((state.date === 'TODAY' || state.specificCalendarDate === 'TODAY') &&
                        !state.attentionBlock) ||
                      (state.isTelemedicine &&
                        (!state.telemedicineConfig || !state.telemedicineConfig.scheduledAt))
                    "
                  >
                    {{ $t('commerceQueuesView.confirm') }}
                    <i class="bi bi-check-circle-fill ms-2"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
    <!-- Modal Conditions - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
      <div
        class="modal fade"
        id="conditionsModal"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-1"
        aria-labelledby="staticBackdropLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header border-0">
              <button
                class="btn-close"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div class="modal-body text-center pb-5">
              <NotificationConditions></NotificationConditions>
              <a
                class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4"
                data-bs-toggle="modal"
                data-bs-target="#conditionsModal"
                >{{ $t('notificationConditions.action') }} <i class="bi bi-check-lg"></i
              ></a>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
<style scoped>
.choose-attention {
  padding-bottom: 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1rem;
}
.data-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 2rem 1.5rem;
  margin-bottom: 1.5rem;
  border-radius: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  align-items: left;
}

.data-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.booking-data-card {
  --margin-top: 0.2rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  font-weight: 400;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.booking-data-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.waitlist-box {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 1.5rem;
  margin: 0.75rem;
  border-radius: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 1rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.waitlist-box:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.select {
  border-radius: 0.5rem;
  border: 1px solid var(--gris-clear);
  transition: all 0.2s ease;
}

.select:hover {
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 0.15rem rgba(0, 74, 173, 0.1);
}

.subtitle-info {
  font-size: 0.9rem;
  line-height: 1rem;
}

/* Modern badge styles */
.badge {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.badge:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.badge.bg-secondary {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%) !important;
  color: white;
  font-weight: 600;
  border: none;
}

.badge.bg-primary {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%) !important;
  color: white;
  font-weight: 600;
  border: none;
}

/* Modern button improvements */
.btn-dark.rounded-pill {
  transition: all 0.3s ease;
}

.btn-dark.rounded-pill:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.3);
}

.btn-selected {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%) !important;
  border-color: var(--azul-turno) !important;
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.35) !important;
  color: white !important;
  transform: scale(1.02);
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
}

.btn-selected::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50rem;
  border: 2px solid var(--azul-turno);
  opacity: 0.5;
  animation: pulseRing 2s infinite;
  pointer-events: none;
}

@keyframes pulseRing {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.2;
  }
}

/* Non-selected button style - make it clearly different */
.btn-dark.rounded-pill:not(.btn-selected) {
  background: #f8f9fa !important;
  border: 2px solid #dee2e6 !important;
  color: #6c757d !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
  opacity: 0.75;
  transition: all 0.3s ease;
}

.btn-dark.rounded-pill:not(.btn-selected):hover {
  opacity: 1;
  border-color: var(--azul-turno) !important;
  color: var(--azul-turno) !important;
  background: #ffffff !important;
  box-shadow: 0 4px 8px rgba(0, 74, 173, 0.15) !important;
  transform: translateY(-2px);
}

.btn-dark.rounded-pill:not(.btn-selected) i {
  color: inherit;
  opacity: 0.7;
}

.btn-selected i {
  color: white !important;
  opacity: 1;
}

/* Client type selection buttons - ensure equal height on mobile */
.btn-dark.rounded-pill {
  height: 48px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
  padding: 0.5rem 0.75rem;
}

/* Ensure icons don't break layout */
.btn-dark.rounded-pill i {
  margin-left: 0.3rem;
  flex-shrink: 0;
  font-size: 0.9em;
}

/* Mobile specific adjustments */
@media (max-width: 576px) {
  .btn-dark.rounded-pill {
    height: 60px !important;
    font-size: 0.85rem;
    padding: 0.5rem;
    white-space: normal;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .btn-dark.rounded-pill i {
    font-size: 0.85em;
    margin-left: 0.2rem;
  }
}

@media (max-width: 400px) {
  .btn-dark.rounded-pill {
    height: 70px !important;
    font-size: 0.8rem;
  }
}

/* Modern Progress Bar */
.progress-container {
  margin-top: 0.5rem;
}

.modern-progress {
  display: flex;
  height: 24px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.05);
}

.progress-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.4s ease;
  position: relative;
}

.progress-primary {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  box-shadow: 0 2px 6px rgba(0, 74, 173, 0.3);
}

.progress-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .modern-progress {
    height: 20px;
    border-radius: 10px;
  }

  .progress-label {
    font-size: 0.65rem;
  }
}

/* Modern Next Button Styles */
.next-button-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

.btn-next {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%) !important;
  border: none !important;
  color: white !important;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 15px rgba(0, 74, 173, 0.4);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.btn-next::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.btn-next:hover:not(:disabled)::before {
  left: 100%;
}

.btn-next:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 74, 173, 0.5);
}

.btn-next:active:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0, 74, 173, 0.4);
}

.btn-next:disabled {
  background: linear-gradient(135deg, #a9a9a9 0%, #808080 100%) !important;
  box-shadow: none;
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-next i {
  font-size: 1.2rem;
  vertical-align: middle;
}

/* Button Group Container */
.button-group-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

.btn-back {
  background: #ffffff !important;
  border: 2px solid var(--azul-turno) !important;
  color: var(--azul-turno) !important;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-back:hover {
  background: var(--azul-turno) !important;
  color: white !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.3);
}

.btn-back i {
  font-size: 1rem;
}

/* Responsive adjustments for buttons */
@media (max-width: 768px) {
  .btn-next {
    font-size: 1rem;
    padding: 0.75rem 2rem !important;
  }

  .button-group-container {
    flex-direction: column;
    width: 100%;
  }

  .button-group-container .btn-back {
    width: 100%;
    order: 2;
  }

  .button-group-container .btn-next {
    width: 100%;
    order: 1;
    margin-bottom: 0.5rem;
  }

  .next-button-container .btn-next {
    width: 100%;
  }
}

/* Sticky Bottom Bar */
.sticky-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.95));
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  padding: 1rem 0;
  z-index: 1000;
  animation: slideUpBounce 0.4s ease-out;
}

@keyframes slideUpBounce {
  0% {
    transform: translateY(100%);
    opacity: 0;
  }
  70% {
    transform: translateY(-5px);
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

.button-navigation-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0 1rem;
}

.duration-badge-container {
  margin-bottom: 0.5rem;
  animation: fadeIn 0.3s ease-in;
}

.duration-badge-container .badge {
  font-size: 0.95rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Booking Summary Card in Sticky Bar */
.booking-summary-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 0.5rem;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 74, 173, 0.1);
  animation: slideInUp 0.4s ease-out;
  overflow: hidden;
}

.summary-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.15rem;
  background: rgba(0, 74, 173, 0.03);
  border-bottom: 1px solid rgba(0, 74, 173, 0.08);
}

.summary-toggle-btn {
  background: transparent;
  color: #6c757d;
  border: none;
  border-radius: 50%;
  padding: 0.1rem 0.4rem;
  font-size: 0.6rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  opacity: 0.6;
  line-height: 1;
}

.summary-toggle-btn:hover {
  opacity: 1;
  color: var(--azul-turno);
  transform: scale(1.15);
}

.summary-toggle-btn i {
  font-size: 0.95rem;
  font-weight: 900;
}

.summary-content {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  justify-content: flex-start;
  padding: 0.5rem 0.75rem;
}

/* Expand/Collapse Transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.summary-datetime-group {
  display: flex;
  gap: 0.4rem;
  flex-wrap: nowrap;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: white;
  padding: 0.25rem 0.6rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease;
}

.summary-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.summary-icon {
  font-size: 0.95rem;
  color: var(--azul-turno);
  min-width: 18px;
}

.summary-details {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.summary-label {
  font-size: 0.6rem;
  color: #6c757d;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.summary-value {
  font-size: 0.75rem;
  color: #212529;
  font-weight: 600;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.btn-next-sticky {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%) !important;
  border: none !important;
  color: white !important;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 15px rgba(0, 74, 173, 0.4);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.btn-next-sticky::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.btn-next-sticky:hover:not(:disabled)::before {
  left: 100%;
}

.btn-next-sticky:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 74, 173, 0.5);
}

.btn-next-sticky:active:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0, 74, 173, 0.4);
}

.btn-next-sticky:disabled {
  background: linear-gradient(135deg, #a9a9a9 0%, #808080 100%) !important;
  box-shadow: none;
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-next-sticky:not(:disabled) {
  animation: pulseGlow 2s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%,
  100% {
    box-shadow: 0 4px 15px rgba(0, 74, 173, 0.4);
  }
  50% {
    box-shadow: 0 4px 25px rgba(0, 74, 173, 0.6), 0 0 20px rgba(0, 194, 203, 0.3);
  }
}

.btn-next-sticky i {
  font-size: 1.2rem;
  vertical-align: middle;
  transition: transform 0.3s ease;
}

.btn-next-sticky:hover:not(:disabled) i {
  transform: translateX(5px);
  animation: arrowBounce 0.6s ease-in-out infinite;
}

@keyframes arrowBounce {
  0%,
  100% {
    transform: translateX(5px);
  }
  50% {
    transform: translateX(10px);
  }
}

/* Confirm Button Styles */
.btn-confirm-sticky {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important;
  border: none !important;
  color: white !important;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.btn-confirm-sticky::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.btn-confirm-sticky:hover:not(:disabled)::before {
  left: 100%;
}

.btn-confirm-sticky:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(40, 167, 69, 0.5);
}

.btn-confirm-sticky:active:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(40, 167, 69, 0.4);
}

.btn-confirm-sticky:disabled {
  background: linear-gradient(135deg, #a9a9a9 0%, #808080 100%) !important;
  box-shadow: none;
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-confirm-sticky:not(:disabled) {
  animation: pulseGlowGreen 2s ease-in-out infinite;
}

@keyframes pulseGlowGreen {
  0%,
  100% {
    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);
  }
  50% {
    box-shadow: 0 4px 25px rgba(40, 167, 69, 0.6), 0 0 20px rgba(32, 201, 151, 0.3);
  }
}

.btn-confirm-sticky i {
  font-size: 1.2rem;
  vertical-align: middle;
  transition: transform 0.3s ease;
}

.btn-confirm-sticky:hover:not(:disabled) i {
  animation: checkBounce 0.6s ease-in-out infinite;
}

@keyframes checkBounce {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

/* Time Slot Grid Styles */
.time-slot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.4rem;
  padding: 0.5rem 0;
  max-width: 100%;
}

.time-slot-button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.1rem;
  padding: 0.5rem 0.6rem;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1.5px solid #dee2e6;
  border-radius: 0.5rem;
  color: #495057;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
}

.time-slot-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 74, 173, 0.1), transparent);
  transition: left 0.5s ease;
}

.time-slot-button:hover::before {
  left: 100%;
}

.time-slot-button:hover {
  transform: translateY(-2px);
  border-color: var(--azul-turno);
  box-shadow: 0 3px 10px rgba(0, 74, 173, 0.2);
  background: linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%);
}

.time-start {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--azul-turno);
  line-height: 1;
}

.time-end {
  font-size: 0.7rem;
  font-weight: 500;
  color: #6c757d;
  line-height: 1;
}

.time-slot-selected {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%) !important;
  border-color: var(--azul-turno) !important;
  color: white !important;
  box-shadow: 0 4px 20px rgba(0, 74, 173, 0.4) !important;
  animation: timeSlotPulse 1.5s ease-in-out infinite;
}

.time-slot-selected .time-start {
  color: white !important;
  font-weight: 700;
}

.time-slot-selected .time-end {
  color: rgba(255, 255, 255, 0.9) !important;
  font-weight: 600;
}

@keyframes timeSlotPulse {
  0%,
  100% {
    box-shadow: 0 4px 20px rgba(0, 74, 173, 0.4);
  }
  50% {
    box-shadow: 0 4px 30px rgba(0, 74, 173, 0.6), 0 0 20px rgba(0, 194, 203, 0.3);
  }
}

.time-slot-button:active {
  transform: translateY(-1px);
}

/* Telemedicine Styles */
.telemedicine-option {
  padding: 1rem;
  background: rgba(68, 111, 252, 0.05);
  border-radius: 0.5rem;
  border: 1px solid rgba(68, 111, 252, 0.2);
}

.telemedicine-option .form-check {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.telemedicine-option .form-check-input {
  margin-top: 0 !important;
  margin-left: 0 !important;
  flex-shrink: 0;
}

.telemedicine-option .form-check-label {
  font-size: 1rem;
  color: var(--azul-turno);
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-bottom: 0;
}

.telemedicine-option .form-check-label i {
  font-size: 1.2rem;
}

.telemedicine-config {
  background: white;
  border: 1px solid rgba(68, 111, 252, 0.3) !important;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(68, 111, 252, 0.1);
}

.telemedicine-config .form-label {
  color: var(--azul-turno);
  margin-bottom: 0.75rem;
}

.telemedicine-config .btn-group .btn-outline-primary {
  border-color: var(--azul-turno);
  color: var(--azul-turno);
  transition: all 0.2s ease;
}

.telemedicine-config .btn-group .btn-check:checked + .btn-outline-primary {
  background: var(--azul-turno);
  color: white;
  border-color: var(--azul-turno);
}

.telemedicine-config .form-control {
  border-color: rgba(68, 111, 252, 0.3);
  transition: border-color 0.2s ease;
}

.telemedicine-config .form-control:focus {
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 0.2rem rgba(68, 111, 252, 0.25);
}

.telemedicine-config .form-check-label {
  color: var(--color-text);
  cursor: pointer;
}

.telemedicine-scheduled-info {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.05) 0%, rgba(0, 194, 203, 0.05) 100%);
  border: 1.5px solid var(--azul-turno, #004aad) !important;
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.1);
}

.telemedicine-scheduled-info strong {
  color: var(--azul-turno, #004aad);
  font-size: 1rem;
}

.btn-back-sticky {
  background: #ffffff !important;
  border: 2px solid var(--azul-turno) !important;
  color: var(--azul-turno) !important;
  font-weight: 600;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-back-sticky:hover {
  background: var(--azul-turno) !important;
  color: white !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.3);
}

.btn-back-sticky i {
  font-size: 1rem;
}

/* Step Action Buttons (Today/Booking) */
.btn-step-action {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%) !important;
  border: none !important;
  color: white !important;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.3px;
  box-shadow: 0 4px 15px rgba(0, 74, 173, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-step-action::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.btn-step-action:hover:not(:disabled)::before {
  left: 100%;
}

.btn-step-action:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 74, 173, 0.5);
}

.btn-step-action:active:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0, 74, 173, 0.4);
}

.btn-step-action:disabled {
  background: linear-gradient(135deg, #a9a9a9 0%, #808080 100%) !important;
  box-shadow: none;
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-step-action.btn-selected {
  background: linear-gradient(135deg, var(--verde-tu) 0%, var(--azul-turno) 100%) !important;
  box-shadow: 0 4px 20px rgba(0, 194, 203, 0.5);
  animation: selectedPulse 1.5s ease-in-out infinite;
}

@keyframes selectedPulse {
  0%,
  100% {
    box-shadow: 0 4px 20px rgba(0, 194, 203, 0.5);
  }
  50% {
    box-shadow: 0 4px 30px rgba(0, 194, 203, 0.7), 0 0 20px rgba(0, 194, 203, 0.4);
  }
}

.btn-step-action i {
  font-size: 1.1rem;
  vertical-align: middle;
  transition: transform 0.3s ease;
}

.btn-step-action:hover:not(:disabled) .bi-chevron-down {
  animation: chevronBounce 0.6s ease-in-out infinite;
}

@keyframes chevronBounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(4px);
  }
}

/* Transition: Slide Up */
.slide-up-enter-active {
  animation: slideUpBounce 0.4s ease-out;
}

.slide-up-leave-active {
  animation: slideDown 0.3s ease-in;
}

@keyframes slideDown {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(100%);
    opacity: 0;
  }
}

/* Transition: Slide Fade (for content transitions) - More natural effect */
.slide-fade-enter-active {
  transition: all 0.4s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
  position: absolute;
  width: 100%;
}

.slide-fade-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* Improved flip transition for backwards compatibility */
.flip-enter-active {
  transition: all 0.4s ease-out;
}

.flip-leave-active {
  transition: all 0.3s ease-in;
  position: absolute;
  width: 100%;
}

.flip-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.flip-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* Add padding to content to avoid being covered by sticky bar */
.content {
  padding-bottom: 100px;
}

/* Responsive adjustments for sticky bar */
@media (max-width: 768px) {
  .sticky-bottom-bar {
    padding: 0.75rem 0;
  }

  .button-navigation-container {
    flex-direction: row;
    padding: 0 0.5rem;
  }

  .btn-next-sticky {
    font-size: 1rem;
    padding: 0.75rem 2rem !important;
  }

  .btn-confirm-sticky {
    font-size: 1rem;
    padding: 0.75rem 2rem !important;
  }

  .booking-summary-card {
    padding: 0.4rem 0.6rem;
  }

  .summary-content {
    flex-direction: column;
    gap: 0.3rem;
  }

  .summary-item {
    width: 100%;
    justify-content: flex-start;
    padding: 0.2rem 0.5rem;
  }

  .summary-datetime-group {
    width: 100%;
  }

  .summary-details {
    flex: 1;
  }

  .time-slot-grid {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 0.3rem;
  }

  .time-slot-button {
    padding: 0.4rem 0.5rem;
  }

  .time-start {
    font-size: 0.95rem;
  }

  .time-end {
    font-size: 0.65rem;
  }

  .btn-back-sticky {
    font-size: 0.9rem;
    padding: 0.5rem 1rem !important;
  }
}

/* Options Connector Styles */
.options-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1.5rem 0;
  gap: 1rem;
}

.connector-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(169, 169, 169, 0.3) 50%,
    transparent 100%
  );
}

.connector-text {
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1rem;
  color: var(--azul-turno, #004aad);
  white-space: nowrap;
  padding: 0 0.75rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 1rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .options-connector {
    margin: 1rem 0;
    gap: 0.75rem;
  }

  .connector-text {
    font-size: 0.85rem;
    padding: 0 0.5rem;
  }
}
</style>
