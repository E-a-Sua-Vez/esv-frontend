<script>
import { ref, reactive, onBeforeMount, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getQueueByCommerce,
  updateQueue,
  addQueue,
  getQueuesByCommerceId,
} from '../../application/services/queue';
import { getFeatureToggleByCommerceId } from '../../application/services/feature-toggle';
import {
  getActiveServicesByCommerceId,
  getServiceByCommerce,
} from '../../application/services/service';
import { getProfessionalsByCommerce } from '../../application/services/professional';
import { getPermissions } from '../../application/services/permissions';
import { getDate, dateYYYYMMDD } from '../../shared/utils/date';
import Popper from 'vue3-popper';
import QueueSimpleName from '../../components/common/QueueSimpleName.vue';
import QueueFormEdit from '../../components/queue/QueueFormEdit.vue';
import QueueFormAdd from '../../components/queue/QueueFormAdd.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import { getQueueTypes } from '../../shared/utils/data.ts';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import SpecificCalendarForm from '../../components/domain/SpecificCalendarForm.vue';

export default {
  name: 'BusinessQueuesAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    QueueSimpleName,
    QueueFormEdit,
    QueueFormAdd,
    Toggle,
    Warning,
    AreYouSure,
    Popper,
    ComponentMenu,
    DesktopPageHeader,
    SearchAdminItem,
    SpecificCalendarForm,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');
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
    const calendarAttributes = ref([
      {
        key: 'Available',
        highlight: {
          color: 'green',
          fillMode: 'light',
        },
        dates: [],
      },
    ]);

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      queues: ref([]),
      services: ref({}),
      professionals: ref([]),
      types: [],
      showAdd: false,
      goToUnavailable: false,
      newQueue: {
        order: 1,
        servicesId: [],
        estimatedTime: 0,
        blockTime: 0,
        active: true,
        online: true,
        tag: '',
        telemedicineEnabled: false,
        presentialEnabled: true,
        serviceInfo: {
          blockLimit: 0,
          sameCommeceHours: true,
          break: false,
          personalized: false,
          personalizedHours: {},
          holiday: false,
          holidays: {},
          walkin: false,
          specificCalendar: false,
          specificCalendarDays: {},
        },
      },
      selectedProfessional: {},
      selectedService: {},
      selectedDate: new Date().setDate(new Date().getDate()),
      selectedHourFrom: undefined,
      selectedHourTo: undefined,
      selectedDates: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsDateAdd: [],
      errorsUpdate: [],
      nameAddError: false,
      nameUpdateError: false,
      limitAddError: false,
      limitUpdateError: false,
      blockAddError: false,
      blockUpdateError: false,
      orderAddError: false,
      orderUpdateError: false,
      timeAddError: false,
      timeUpdateError: false,
      typeError: false,
      toggles: {},
      filtered: [],
    });

    // Use global commerce from store and ensure it has features loaded
    const commerce = computed(() => {
      const currentCommerce = store.getCurrentCommerce;
      return currentCommerce;
    });

    // Load features for commerce when it changes
    const loadCommerceFeatures = async commerceObj => {
      if (!commerceObj || !commerceObj.id) return;
      try {
        const features = await getFeatureToggleByCommerceId(commerceObj.id);
        if (features && Array.isArray(features)) {
          // Update commerce object with features
          commerceObj.features = features;
          // Update store to ensure reactivity - create new object to trigger reactivity
          const updatedCommerce = { ...commerceObj, features };
          await store.setCurrentCommerce(updatedCommerce);
        } else if (!features || features.length === 0) {
          // Ensure features is an empty array if no features exist
          commerceObj.features = [];
          const updatedCommerce = { ...commerceObj, features: [] };
          await store.setCurrentCommerce(updatedCommerce);
        }
      } catch (error) {
        console.error('Error loading commerce features:', error);
        // Set empty features array on error
        commerceObj.features = [];
      }
    };

    // Load queues, services, and professionals when commerce changes
    const loadCommerceData = async commerceId => {
      if (!commerceId) {
        state.queues = [];
        state.services = {};
        state.professionals = [];
        state.filtered = [];
        return;
      }
      try {
        console.log('[BusinessQueuesAdmin] Loading commerce data for commerceId:', commerceId);
        state.queues = await getQueuesByCommerceId(commerceId);
        console.log('[BusinessQueuesAdmin] Loaded queues:', state.queues);
        state.services = await getActiveServicesByCommerceId(commerceId);
        console.log('[BusinessQueuesAdmin] Loaded services:', state.services);
        state.professionals = await getProfessionalsByCommerce(commerceId);
        console.log('[BusinessQueuesAdmin] Loaded professionals:', state.professionals);
        state.filtered = state.queues;
      } catch (error) {
        console.error('[BusinessQueuesAdmin] Error loading commerce data:', error);
        state.queues = [];
        state.services = {};
        state.professionals = [];
        state.filtered = [];
      }
    };

    // Watch for commerce changes and reload data
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            // Immediately clear data to prevent showing old results
            state.queues = [];
            state.filtered = [];
            state.services = {};
            state.professionals = [];
            // Load features for commerce
            await loadCommerceFeatures(newCommerce);
            await loadCommerceData(newCommerce.id);
            loading.value = false;
          } catch (error) {
            loading.value = false;
          }
        }
      },
      { immediate: false }
    );

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.types = getQueueTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('queues', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Load data for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          // Load features for commerce
          await loadCommerceFeatures(commerceToUse);
          await loadCommerceData(commerceToUse.id);
        }

        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const goBack = () => {
      router.back();
    };

    const validateAdd = queue => {
      state.errorsAdd = [];
      if (!queue.name || queue.name.length === 0) {
        state.nameAddError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.name');
      } else {
        state.nameAddError = false;
      }
      if (!queue.type || queue.type.length === 0) {
        state.typeError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if (queue.type) {
        if (queue.type === 'PROFESSIONAL' && !queue.professionalId) {
          state.errorsAdd.push('businessQueuesAdmin.validate.professional');
        }
        if (queue.type === 'SERVICE' && (!queue.servicesId || queue.servicesId.length === 0)) {
          state.errorsAdd.push('businessQueuesAdmin.validate.service');
        }
        if (queue.type === 'STANDARD') {
          if (queue.tag === undefined) {
            queue.tag = queue.name;
          }
        }
        if (
          queue.type === 'MULTI_SERVICE' &&
          (!queue.servicesId || queue.servicesId.length === 0)
        ) {
          state.errorsAdd.push('businessQueuesAdmin.validate.service');
        }
      }
      if (
        !queue.limit ||
        queue.limit.length === 0 ||
        queue.limit > state.toggles['queues.admin.queue-limit']
      ) {
        state.limitAddError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.limit');
      } else {
        state.limitAddError = false;
      }
      if (!queue.blockTime || queue.blockTime.length === 0) {
        state.blockAddError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.blockTime');
      } else {
        state.blockAddError = false;
      }
      if (!queue.order || queue.order.length === 0) {
        state.orderAddError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.order');
      } else {
        state.orderAddError = false;
      }
      if (!queue.estimatedTime || queue.estimatedTime.length === 0) {
        state.timeAddError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.estimatedTime');
      } else {
        state.timeAddError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = queue => {
      state.errorsUpdate = [];
      if (!queue.name || queue.name.length === 0) {
        state.nameUpdateError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.name');
      } else {
        state.nameUpdateError = false;
      }
      if (
        !queue.limit ||
        queue.limit.length === 0 ||
        queue.limit > state.toggles['queues.admin.queue-limit']
      ) {
        state.limitUpdateError = true;
        state.errorsUpdate.push('businessQueuesAdmin.validate.limit');
      } else {
        state.limitUpdateError = false;
      }
      if (!queue.blockTime || queue.blockTime.length === 0) {
        state.blockUpdateError = true;
        state.errorsUpdate.push('businessQueuesAdmin.validate.blockTime');
      } else {
        state.blockUpdateError = false;
      }
      if (!queue.type || queue.type.length === 0) {
        state.typeError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if (!queue.order || queue.order.length === 0) {
        state.orderUpdateError = true;
        state.errorsUpdate.push('businessQueuesAdmin.validate.order');
      } else {
        state.orderUpdateError = false;
      }
      if (!queue.estimatedTime || queue.estimatedTime.length === 0) {
        state.timeUpdateError = true;
        state.errorsUpdate.push('businessQueuesAdmin.validate.estimatedTime');
      } else {
        state.timeUpdateError = false;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const showAdd = () => {
      const servicesId = [];
      state.showAdd = true;
      state.newQueue = {
        order: state.queues.length + 1,
        servicesId,
        estimatedTime: 0,
        blockTime: 0,
        active: true,
        online: true,
        telemedicineEnabled: false, // Default to false for backward compatibility
        presentialEnabled: true, // Default to true for backward compatibility
        serviceInfo: {
          sameCommeceHours: true,
          break: false,
          personalized: false,
          personalizedHours: {},
          holiday: false,
          holidays: {},
          walkin: false,
          specificCalendar: false,
          specificCalendarDays: {},
          ...state.business.serviceInfo,
        },
      };
    };

    const add = async () => {
      let created = false;
      try {
        loading.value = true;
        if (validateAdd(state.newQueue)) {
          state.newQueue.commerceId = commerce.value.id;
          await addQueue(state.newQueue);
          created = true;
          state.queues = await getQueuesByCommerceId(commerce.value.id);
          state.extendedEntity = undefined;
          console.log('Queue created successfully, closing modal');
        }
        alertError.value = '';
      } catch (error) {
        alertError.value = error.response.status || 500;
        console.error('Error adding queue:', error);
      } finally {
        loading.value = false;
        if (created) {
          state.showAdd = false;
          // Usar setTimeout para asegurar que el DOM se haya actualizado
          setTimeout(() => {
            closeAddModal();
          }, 100);
        }
        loading.value = false;
      }
    };

    const update = async queue => {
      try {
        loading.value = true;
        if (validateUpdate(queue)) {
          await updateQueue(queue.id, queue);
          state.queues = await getQueuesByCommerceId(commerce.value.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async queue => {
      try {
        loading.value = true;
        if (queue && queue.id) {
          queue.available = false;
          queue.active = false;
          await updateQueue(queue.id, queue);
          state.queues = await getQueuesByCommerceId(commerce.value.id);
          state.extendedEntity = undefined;
          state.goToUnavailable = false;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const goToUnavailable = () => {
      state.goToUnavailable = !state.goToUnavailable;
    };

    const unavailableCancel = () => {
      state.goToUnavailable = false;
    };

    const showUpdateForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    };

    const dayChecked = (serviceInfo, day) => {
      if (serviceInfo && serviceInfo.attentionDays) {
        return serviceInfo.attentionDays.includes(day);
      }
      return false;
    };

    const checkDay = (event, serviceInfo, day) => {
      if (serviceInfo) {
        if (!serviceInfo.attentionDays) {
          serviceInfo.attentionDays = [];
        }
        if (event.target.checked) {
          if (!serviceInfo.attentionDays.includes(day)) {
            serviceInfo.attentionDays.push(day);
          }
        } else {
          serviceInfo.attentionDays = serviceInfo.attentionDays.filter(el => el !== day);
        }
        serviceInfo.attentionDays.sort();
        if (serviceInfo.personalized === true) {
          serviceInfo.personalizedHours[day] = {
            attentionHourFrom: serviceInfo.attentionHourFrom,
            attentionHourTo: serviceInfo.attentionHourTo,
          };
        }
      }
    };

    const getQueueLink = queue => {
      const commerceKeyName = commerce.value?.keyName;
      const queueId = queue.id;
      if (queueId) {
        return `${import.meta.env.VITE_URL}/publico/comercio/${commerceKeyName}/filas/${queueId}`;
      }
      return `${import.meta.env.VITE_URL}/publico/comercio/${commerceKeyName}/filas`;
    };

    const copyLink = queue => {
      const textToCopy = getQueueLink(queue);
      navigator.clipboard.writeText(textToCopy);
    };

    const initializedParsonalizedHours = serviceInfo => {
      if (serviceInfo.personalized === true) {
        if (!serviceInfo.personalizedHours) {
          serviceInfo.personalizedHours = {};
        }
        if (serviceInfo.attentionDays && serviceInfo.attentionDays.length > 0) {
          serviceInfo.attentionDays.forEach(day => {
            serviceInfo.personalizedHours[day] = {
              attentionHourFrom: serviceInfo.attentionHourFrom,
              attentionHourTo: serviceInfo.attentionHourTo,
            };
          });
        }
      }
    };

    const initializedSpecificCalendar = serviceInfo => {
      if (serviceInfo.specificCalendar === true) {
        if (!serviceInfo.specificCalendarDays) {
          if (
            commerce.value &&
            commerce.value.serviceInfo &&
            commerce.value.serviceInfo.specificCalendar === true
          ) {
            serviceInfo.specificCalendarDays = commerce.value.serviceInfo.specificCalendarDays;
          } else {
            serviceInfo.specificCalendarDays = serviceInfo.specificCalendarDays || {};
          }
        }
      }
    };

    const initializedSameCommerceHours = serviceInfo => {
      if (serviceInfo.sameCommeceHours === true) {
        if (commerce.value?.serviceInfo) {
          serviceInfo.sameCommeceHours = true;
          serviceInfo.attentionDays = commerce.value.serviceInfo.attentionDays;
          serviceInfo.attentionHourFrom = commerce.value.serviceInfo.attentionHourFrom;
          serviceInfo.attentionHourTo = commerce.value.serviceInfo.attentionHourTo;
          serviceInfo.break = commerce.value.serviceInfo.break;
          serviceInfo.breakHourFrom = commerce.value.serviceInfo.breakHourFrom;
          serviceInfo.breakHourTo = commerce.value.serviceInfo.breakHourTo;
          serviceInfo.personalized = commerce.value.serviceInfo.personalized;
          serviceInfo.personalizedHours = commerce.value.serviceInfo.personalizedHours;
          serviceInfo.holiday = commerce.value.serviceInfo.holiday;
          serviceInfo.holidays = commerce.value.serviceInfo.holidays;
        }
      }
    };

    const selectProfessional = (queue, professional) => {
      if (queue !== undefined && professional !== undefined && professional.id !== undefined) {
        queue.professionalId = professional.id;
        queue.tag = `${professional.personalInfo?.email || professional.personalInfo?.name}`;
        state.selectedProfessional = professional;
      }
    };

    const selectService = (queue, service) => {
      if (queue !== undefined && service !== undefined && service.id !== undefined) {
        queue.servicesId = [service.id, ...queue.servicesId];
        queue.tag = `${service.name}`;
        state.selectedService = service;
        queue.estimatedTime = service.serviceInfo.estimatedTime;
        queue.blockTime = service.serviceInfo.blockTime;
      }
    };

    const selectType = (queue, type) => {
      if (queue) {
        console.log('[BusinessQueuesAdmin] selectType called with type:', type);
        const typeId = typeof type === 'string' ? type : type.id;
        console.log('[BusinessQueuesAdmin] typeId:', typeId);

        if (typeId === 'PROFESSIONAL') {
          queue.servicesId = undefined;
          queue.type = typeId;
        }
        if (typeId === 'SERVICE') {
          queue.professionalId = undefined;
          queue.type = typeId;
        }
        if (typeId === 'MULTI_SERVICE') {
          queue.professionalId = undefined;
          queue.type = typeId;
        }
        console.log('[BusinessQueuesAdmin] queue.type after selectType:', queue.type);
      }
    };

    const onAddQueueTypeChanged = event => {
      console.log('[BusinessQueuesAdmin] onAddQueueTypeChanged called with event:', event);
      if (event && event.queue) {
        selectType(event.queue, event.type);
      }
    };

    const selectServiceMultiple = async (queue, service) => {
      if (service) {
        if (!queue.servicesId) {
          queue.servicesId = [];
        }
        if (queue.servicesId && queue.servicesId.length >= 0) {
          if (!queue.servicesId.includes(service.id)) {
            queue.servicesId.push(service.id);
            queue.estimatedTime += +service.serviceInfo.estimatedTime;
            queue.blockTime += +service.serviceInfo.blockTime;
          }
        }
        state.service = null;
      }
    };

    const selectServiceIndex = async (index, service) => {
      if (service) {
        if (!state.queues[index].servicesId) {
          state.queues[index].servicesId = [];
        }
        if (state.queues[index].servicesId && state.queues[index].servicesId.length >= 0) {
          if (!state.queues[index].servicesId.includes(service.id)) {
            state.queues[index].servicesId.push(service.id);
            state.queues[index].estimatedTime += service.serviceInfo.estimatedTime;
            state.queues[index].blockTime += service.serviceInfo.blockTime;
          }
        }
        state.service = null;
      }
    };

    const deleteService = (queue, serviceId) => {
      if (queue && serviceId) {
        if (queue.servicesId && queue.servicesId.length >= 0) {
          if (queue.servicesId.includes(serviceId)) {
            const filtered = queue.servicesId.filter(com => com !== serviceId);
            queue.servicesId = filtered;
            const service = state.services.find(com => com.id === serviceId);
            queue.estimatedTime -=
              queue.estimatedTime - service.serviceInfo.estimatedTime < 0
                ? 0
                : service.serviceInfo.estimatedTime;
            queue.blockTime -=
              queue.blockTime - service.serviceInfo.blockTime < 0
                ? 0
                : service.serviceInfo.blockTime;
          }
        }
      }
    };

    const showService = serviceId => {
      if (state.services && state.services.length >= 1) {
        const service = state.services.find(com => com.id === serviceId);
        if (service) {
          return service.tag;
        }
      }
    };

    const addSpecificDate = index => {
      state.errorsDateAdd = [];
      let selectedDates = state.filtered[index].serviceInfo.specificCalendarDays;
      if (!selectedDates) {
        selectedDates = {};
      }
      if (selectedDates) {
        let date = dateYYYYMMDD(new Date());
        if (state.selectedDate) {
          date = dateYYYYMMDD(state.selectedDate);
        }
        if (date && state.selectedHourFrom && state.selectedHourTo) {
          if (state.selectedHourTo < state.selectedHourFrom) {
            state.errorsDateAdd.push('businessCommercesAdmin.validate.hours');
          } else if (Object.keys(selectedDates).length >= 0) {
            const [hourFrom, minuteFrom] = state.selectedHourFrom.split(':');
            const [hourTo, minuteTo] = state.selectedHourTo.split(':');
            const hourNumberFrom = +hourFrom + +minuteFrom / 60;
            const hourNumberTo = +hourTo + +minuteTo / 60;
            selectedDates[date] = {
              attentionHourFrom: hourNumberFrom,
              attentionHourTo: hourNumberTo,
            };
          }
        } else {
          state.errorsDateAdd.push('businessCommercesAdmin.validate.selectedDate');
        }
      }
      state.filtered[index].serviceInfo.specificCalendarDays = selectedDates;
    };

    const updateAddSpecificDate = () => {
      state.errorsDateAdd = [];
      let selectedDates = state.newCommerce.serviceInfo.specificCalendarDays;
      if (!selectedDates) {
        selectedDates = {};
      }
      if (selectedDates) {
        let date = dateYYYYMMDD(new Date());
        if (state.selectedDate) {
          date = dateYYYYMMDD(state.selectedDate);
        }
        if (date && state.selectedHourFrom && state.selectedHourTo) {
          if (state.selectedHourTo < state.selectedHourFrom) {
            state.errorsDateAdd.push('businessCommercesAdmin.validate.hours');
          } else if (Object.keys(selectedDates).length >= 0) {
            const [hourFrom, minuteFrom] = state.selectedHourFrom.split(':');
            const [hourTo, minuteTo] = state.selectedHourTo.split(':');
            const hourNumberFrom = +hourFrom + +minuteFrom / 60;
            const hourNumberTo = +hourTo + +minuteTo / 60;
            selectedDates[date] = {
              attentionHourFrom: hourNumberFrom,
              attentionHourTo: hourNumberTo,
            };
          }
        } else {
          state.errorsDateAdd.push('businessCommercesAdmin.validate.selectedDate');
        }
      }
      state.newCommerce.serviceInfo.specificCalendarDays = selectedDates;
    };

    const deleteSpecificDate = (index, date) => {
      const selectedDates = state.filtered[index].serviceInfo.specificCalendarDays;
      if (selectedDates) {
        if (Object.keys(selectedDates).length >= 0 && Object.keys(selectedDates).includes(date)) {
          delete selectedDates[date];
        }
      }
      state.filtered[index].serviceInfo.specificCalendarDays = selectedDates;
    };

    const updateDeleteSpecificDate = date => {
      const selectedDates = state.newCommerce.serviceInfo.specificCalendarDays;
      if (selectedDates) {
        if (Object.keys(selectedDates).length >= 0 && Object.keys(selectedDates).includes(date)) {
          delete selectedDates[date];
        }
      }
      state.newCommerce.serviceInfo.specificCalendarDays = selectedDates;
    };

    const timeConvert = num => {
      if (num) {
        const [hours, min = 0] = num.toString().split('.');
        let minutes = (num - hours) * 60;
        if (minutes === 0) {
          minutes = '00';
        }
        return `${hours}:${minutes}`;
      }
    };

    const receiveFilteredItems = items => {
      state.filtered = items;
    };

    const closeAddModal = () => {
      // Intentar múltiples métodos para cerrar el modal
      const modalCloseButton = document.getElementById('close-modal');
      if (modalCloseButton) {
        modalCloseButton.click();
        return;
      }

      // Si no hay botón de cierre, usar Bootstrap modal hide
      const modalElement = document.getElementById('addModal');
      if (modalElement) {
        const modal = window.bootstrap.Modal.getInstance(modalElement) || new window.bootstrap.Modal(modalElement);
        modal.hide();
        return;
      }

      // Como último recurso, buscar cualquier botón con data-bs-dismiss
      const dismissButton = document.querySelector('[data-bs-dismiss="modal"]');
      if (dismissButton) {
        dismissButton.click();
      }
    };

    const resetAddForm = () => {
      const servicesId = [];
      state.newQueue = {
        order: state.queues.length + 1,
        servicesId,
        estimatedTime: 0,
        blockTime: 0,
        active: true,
        online: true,
        tag: '',
        telemedicineEnabled: false, // Default to false for backward compatibility
        presentialEnabled: true, // Default to true for backward compatibility
        serviceInfo: {
          sameCommeceHours: true,
          break: false,
          personalized: false,
          personalizedHours: {},
          holiday: false,
          holidays: {},
          walkin: false,
          specificCalendar: false,
          specificCalendarDays: {},
          ...state.business.serviceInfo,
        },
      };
      state.errorsAdd = [];
      state.errorsDateAdd = [];
      state.nameAddError = false;
      state.limitAddError = false;
      state.blockAddError = false;
      state.orderAddError = false;
      state.timeAddError = false;
      state.typeError = false;
      state.selectedProfessional = {};
      state.selectedService = {};
      state.selectedDate = new Date().setDate(new Date().getDate());
      state.selectedHourFrom = undefined;
      state.selectedHourTo = undefined;
      state.selectedDates = {};
      state.showAdd = false;
    };

    const handleCloseButtonMousedown = e => {
      // Remove focus immediately on mousedown (before click) to avoid aria-hidden warning
      if (e.target && (e.target.id === 'close-modal' || e.target.closest('#close-modal'))) {
        const button = e.target.id === 'close-modal' ? e.target : e.target.closest('#close-modal');
        if (button) {
          button.blur();
          // Also blur any active element to ensure no focus remains
          if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
          }
        }
      }
    };

    const handleModalBackdropClick = e => {
      // Remove focus when clicking backdrop to close modal
      if (e.target === e.currentTarget && document.activeElement) {
        document.activeElement.blur();
      }
    };

    onMounted(() => {
      const addModal = document.getElementById('add-queue');
      const closeButton = document.getElementById('close-modal');

      if (addModal) {
        addModal.addEventListener('hidden.bs.modal', resetAddForm);
        // Remove focus when clicking backdrop
        addModal.addEventListener('click', handleModalBackdropClick);
      }

      // Use mousedown (fires before click) to remove focus early
      if (closeButton) {
        closeButton.addEventListener('mousedown', handleCloseButtonMousedown, true);
      }

      // Also listen on the document for any close button clicks
      document.addEventListener('mousedown', handleCloseButtonMousedown, true);
    });

    onUnmounted(() => {
      const addModal = document.getElementById('add-queue');
      const closeButton = document.getElementById('close-modal');

      if (addModal) {
        addModal.removeEventListener('hidden.bs.modal', resetAddForm);
        addModal.removeEventListener('click', handleModalBackdropClick);
      }

      if (closeButton) {
        closeButton.removeEventListener('mousedown', handleCloseButtonMousedown, true);
      }

      document.removeEventListener('mousedown', handleCloseButtonMousedown, true);
    });

    return {
      state,
      loading,
      alertError,
      dateMask,
      disabledDates,
      calendarAttributes,
      getDate,
      showUpdateForm,
      update,
      showAdd,
      add,
      goBack,
      isActiveBusiness,
      commerce,
      dayChecked,
      checkDay,
      getQueueLink,
      copyLink,
      initializedParsonalizedHours,
      initializedSameCommerceHours,
      selectProfessional,
      selectService,
      selectType,
      onAddQueueTypeChanged,
      unavailable,
      goToUnavailable,
      unavailableCancel,
      selectServiceMultiple,
      showService,
      deleteService,
      selectServiceIndex,
      receiveFilteredItems,
      initializedSpecificCalendar,
      addSpecificDate,
      updateAddSpecificDate,
      deleteSpecificDate,
      updateDeleteSpecificDate,
      timeConvert,
      closeAddModal,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo
          :commerce-id="commerce?.id"
          :business-id="state.business?.id"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessQueuesAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessQueuesAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessQueuesAdmin">
          <div v-if="isActiveBusiness() && state.toggles['queues.admin.view']">
            <div id="businessQueuesAdmin-controls" class="control-box my-4">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessQueuesAdmin.message.4.title')"
                    :content="$t('businessQueuesAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessQueuesAdmin-result" class="mt-4">
              <div>
                <div v-if="state.queues.length === 0">
                  <Message
                    :title="$t('businessQueuesAdmin.message.2.title')"
                    :content="$t('businessQueuesAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                      @click="showAdd(queue)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-queue`"
                      :disabled="!state.toggles['queues.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.queues"
                    :type="'queues'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(queue, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <QueueSimpleName
                          :queue="queue"
                          :commerce-key-name="commerce?.keyName || ''"
                        ></QueueSimpleName>
                      </div>
                      <div class="col-2">
                        <a href="#" @click.prevent="showUpdateForm(index)">
                          <i
                            :id="index"
                            :class="`bi ${
                              state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                            }`"
                          ></i>
                        </a>
                      </div>
                    </div>
                    <QueueFormEdit
                      v-if="state.toggles['queues.admin.read']"
                      :queue="queue"
                      :types="state.types"
                      :toggles="state.toggles"
                      :commerce="commerce"
                      :errors="{
                        nameError: state.nameUpdateError,
                        limitError: state.limitUpdateError,
                        blockError: state.blockUpdateError,
                        orderError: state.orderUpdateError,
                        timeError: state.timeUpdateError,
                        errorsUpdate: state.errorsUpdate,
                      }"
                      :class="{ show: state.extendedEntity === index }"
                    />
                    <div
                      v-if="state.toggles['queues.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      class="detailed-data transition-slow"
                    >
                      <div class="form-fields-container">
                        <div id="queue-services-form-update" class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessCollaboratorsAdmin.services') }}
                          </label>
                          <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem">
                            <select
                              class="form-control-modern form-select-modern"
                              v-model="state.service"
                              @change="selectServiceIndex(index, state.service)"
                              id="services"
                            >
                              <option :value="null">
                                {{
                                  $t('businessCollaboratorsAdmin.selectService') ||
                                  'Seleccionar servicio'
                                }}
                              </option>
                              <option v-for="com in state.services" :key="com.id" :value="com">
                                {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
                              </option>
                            </select>
                            <div
                              v-if="queue.servicesId && queue.servicesId.length > 0"
                              class="badges-container"
                            >
                              <span
                                class="badge-modern"
                                v-for="comId in queue.servicesId"
                                :key="comId"
                              >
                                {{ showService(comId) }}
                                <button
                                  type="button"
                                  class="badge-close"
                                  aria-label="Close"
                                  @click="deleteService(queue, comId)"
                                >
                                  <i class="bi bi-x"></i>
                                </button>
                              </span>
                            </div>
                          </div>
                        </div>
                        <!-- Datos de Servicio -->
                        <button
                          class="section-toggle-button"
                          type="button"
                          data-bs-toggle="collapse"
                          :aria-expanded="false"
                          aria-controls="update-service"
                          data-bs-target="#update-service"
                        >
                          <span class="section-toggle-text">{{
                            $t('businessCommercesAdmin.service')
                          }}</span>
                          <i class="bi bi-chevron-down section-toggle-icon"></i>
                        </button>
                        <div id="update-service" class="collapse row m-0">
                          <div id="queue-blockLimit-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.blockLimit') }}
                            </div>
                            <div class="col-8">
                              <input
                                :disabled="!state.toggles['queues.admin.edit']"
                                min="1"
                                type="number"
                                class="form-control"
                                v-model="queue.serviceInfo.blockLimit"
                                placeholder="100"
                              />
                            </div>
                          </div>
                          <div id="update-queue-samecommerce-active-form" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.walkin') }}
                            </div>
                            <div class="col-8">
                              <Toggle
                                v-model="queue.serviceInfo.walkin"
                                :disabled="!state.toggles['queues.admin.edit']"
                              />
                            </div>
                          </div>
                          <div id="update-queue-samecommerce-active-form" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.sameCommeceHours') }}
                            </div>
                            <div class="col-8">
                              <Toggle
                                v-model="queue.serviceInfo.sameCommeceHours"
                                :disabled="!state.toggles['queues.admin.edit']"
                                @click="initializedSameCommerceHours(queue.serviceInfo)"
                              />
                            </div>
                          </div>
                          <div id="queue-attentionHour-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.attentionHour') }}
                            </div>
                            <div class="col-3">
                              <input
                                min="0"
                                max="24"
                                minlength="1"
                                maxlength="2"
                                type="number"
                                class="form-control"
                                v-model="queue.serviceInfo.attentionHourFrom"
                                placeholder="Ex. 8"
                              />
                            </div>
                            <div class="col-2">-</div>
                            <div class="col-3">
                              <input
                                min="0"
                                max="24"
                                minlength="1"
                                maxlength="2"
                                type="number"
                                class="form-control"
                                v-model="queue.serviceInfo.attentionHourTo"
                                placeholder="Ex. 16"
                              />
                            </div>
                          </div>
                          <div id="update-queue-break-active-form" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.break') }}
                            </div>
                            <div class="col-8">
                              <Toggle
                                v-model="queue.serviceInfo.break"
                                :disabled="!state.toggles['queues.admin.edit']"
                              />
                            </div>
                          </div>
                          <div
                            id="queue-attentionBreak-form-update"
                            v-if="queue.serviceInfo.break"
                            class="row g-1"
                          >
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.breakHour') }}
                            </div>
                            <div class="col-3">
                              <input
                                min="0"
                                max="24"
                                minlength="1"
                                maxlength="5"
                                type="number"
                                class="form-control"
                                v-model="queue.serviceInfo.breakHourFrom"
                                placeholder="Ex. 8"
                              />
                            </div>
                            <div class="col-2">-</div>
                            <div class="col-3">
                              <input
                                min="0"
                                max="24"
                                minlength="1"
                                maxlength="5"
                                type="number"
                                class="form-control"
                                v-model="queue.serviceInfo.breakHourTo"
                                placeholder="Ex. 16"
                              />
                            </div>
                          </div>
                          <div id="queue-attentionDays-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.attentionDays') }}
                            </div>
                            <div class="col-8">
                              <div class="form-check form-switch text-label">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  id="monday"
                                  :checked="dayChecked(queue.serviceInfo, 1)"
                                  @click="checkDay($event, queue.serviceInfo, 1)"
                                />
                                <label class="form-check-label" for="monday">{{
                                  $t('days.1')
                                }}</label>
                              </div>
                              <div class="form-check form-switch text-label">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  id="tuesday"
                                  :checked="dayChecked(queue.serviceInfo, 2)"
                                  @click="checkDay($event, queue.serviceInfo, 2)"
                                />
                                <label class="form-check-label" for="tuesday">{{
                                  $t('days.2')
                                }}</label>
                              </div>
                              <div class="form-check form-switch text-label">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  id="wednesday"
                                  :checked="dayChecked(queue.serviceInfo, 3)"
                                  @click="checkDay($event, queue.serviceInfo, 3)"
                                />
                                <label class="form-check-label" for="wednesday">{{
                                  $t('days.3')
                                }}</label>
                              </div>
                              <div class="form-check form-switch text-label">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  id="thursday"
                                  :checked="dayChecked(queue.serviceInfo, 4)"
                                  @click="checkDay($event, queue.serviceInfo, 4)"
                                />
                                <label class="form-check-label" for="thursday">{{
                                  $t('days.4')
                                }}</label>
                              </div>
                              <div class="form-check form-switch text-label">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  id="friday"
                                  :checked="dayChecked(queue.serviceInfo, 5)"
                                  @click="checkDay($event, queue.serviceInfo, 5)"
                                />
                                <label class="form-check-label" for="friday">{{
                                  $t('days.5')
                                }}</label>
                              </div>
                              <div class="form-check form-switch text-label">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  id="sabado"
                                  :checked="dayChecked(queue.serviceInfo, 6)"
                                  @click="checkDay($event, queue.serviceInfo, 6)"
                                />
                                <label class="form-check-label" for="sabado">{{
                                  $t('days.6')
                                }}</label>
                              </div>
                              <div class="form-check form-switch text-label">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  id="domingo"
                                  :checked="dayChecked(queue.serviceInfo, 7)"
                                  @click="checkDay($event, queue.serviceInfo, 7)"
                                />
                                <label class="form-check-label" for="domingo">{{
                                  $t('days.7')
                                }}</label>
                              </div>
                            </div>
                          </div>
                          <div id="update-queue-personalized-active-form" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.personalized') }}
                            </div>
                            <div class="col-8">
                              <Toggle
                                v-model="queue.serviceInfo.personalized"
                                :disabled="!state.toggles['queues.admin.edit']"
                                @click="initializedParsonalizedHours(queue.serviceInfo)"
                              />
                            </div>
                          </div>
                          <div
                            id="queue-personalized-form-update"
                            v-if="queue.serviceInfo.personalized"
                            class="row g-1"
                          >
                            <div
                              class="row g-1"
                              v-for="day in queue.serviceInfo.attentionDays"
                              :key="day"
                            >
                              <div class="col-4 text-label">
                                {{ $t(`days.${day}`) }}
                              </div>
                              <div class="col-3">
                                <input
                                  min="0"
                                  max="24"
                                  minlength="1"
                                  maxlength="2"
                                  type="number"
                                  class="form-control form-control-sm"
                                  v-model="
                                    queue.serviceInfo.personalizedHours[day].attentionHourFrom
                                  "
                                  placeholder="Ex. 8"
                                />
                              </div>
                              <div class="col-2">-</div>
                              <div class="col-3">
                                <input
                                  min="0"
                                  max="24"
                                  minlength="1"
                                  maxlength="2"
                                  type="number"
                                  class="form-control form-control-sm"
                                  v-model="queue.serviceInfo.personalizedHours[day].attentionHourTo"
                                  placeholder="Ex. 16"
                                />
                              </div>
                            </div>
                          </div>
                          <div id="queue-specificCalendar-active-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.specificCalendar') }}
                            </div>
                            <div class="col-8">
                              <Toggle
                                v-model="queue.serviceInfo.specificCalendar"
                                :disabled="!state.toggles['queues.admin.edit']"
                                @click="initializedSpecificCalendar(queue.serviceInfo)"
                              />
                            </div>
                          </div>
                          <div
                            id="queue-specificCalendarDays-form-update"
                            v-if="queue.serviceInfo.specificCalendar"
                            class="g-1"
                          >
                            <hr />
                            <SpecificCalendarForm
                              :show="queue.serviceInfo.specificCalendar"
                              :locale="state.locale"
                              :structure="queue"
                            >
                            </SpecificCalendarForm>
                          </div>
                        </div>
                        <div class="col">
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="update(queue)"
                            v-if="state.toggles['queues.admin.update']"
                          >
                            {{ $t('businessQueuesAdmin.update') }} <i class="bi bi-save"></i>
                          </button>
                          <button
                            class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                            @click="goToUnavailable()"
                            v-if="state.toggles['queues.admin.unavailable']"
                          >
                            {{ $t('businessQueuesAdmin.unavailable') }}
                            <i class="bi bi-trash-fill"></i>
                          </button>
                          <AreYouSure
                            :show="state.goToUnavailable"
                            :yes-disabled="state.toggles['queues.admin.unavailable']"
                            :no-disabled="state.toggles['queues.admin.unavailable']"
                            @actionYes="unavailable(queue)"
                            @actionNo="unavailableCancel()"
                          >
                          </AreYouSure>
                        </div>
                        <div
                          class="row g-1 errors"
                          id="feedback"
                          v-if="state.errorsUpdate.length > 0"
                        >
                          <Warning>
                            <template v-slot:message>
                              <li v-for="(error, index) in state.errorsUpdate" :key="index">
                                {{ $t(error) }}
                              </li>
                            </template>
                          </Warning>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="
                        (!isActiveBusiness() || !state.toggles['queues.admin.read']) && !loading
                      "
                    >
                      <Message
                        :title="$t('businessQueuesAdmin.message.1.title')"
                        :content="$t('businessQueuesAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['queues.admin.view']) && !loading">
            <Message
              :title="$t('businessQueuesAdmin.message.1.title')"
              :content="$t('businessQueuesAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content text-center">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <DesktopPageHeader
          :commerce-id="commerce?.id"
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('businessQueuesAdmin.title')"
          :toggles="state.toggles"
          component-name="businessQueuesAdmin"
          @go-back="goBack"
        />
        <div id="businessQueuesAdmin">
          <div v-if="isActiveBusiness() && state.toggles['queues.admin.view']">
            <div id="businessQueuesAdmin-controls" class="control-box">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessQueuesAdmin.message.4.title')"
                    :content="$t('businessQueuesAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessQueuesAdmin-result" class="mt-4">
              <div>
                <div v-if="state.queues.length === 0">
                  <Message
                    :title="$t('businessQueuesAdmin.message.2.title')"
                    :content="$t('businessQueuesAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                      @click="showAdd(queue)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-queue`"
                      :disabled="!state.toggles['queues.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.queues"
                    :type="'queues'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(queue, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <QueueSimpleName
                          :queue="queue"
                          :commerce-key-name="commerce?.keyName || ''"
                        ></QueueSimpleName>
                      </div>
                      <div class="col-2">
                        <a href="#" @click.prevent="showUpdateForm(index)">
                          <i
                            :id="index"
                            :class="`bi ${
                              state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                            }`"
                          ></i>
                        </a>
                      </div>
                    </div>
                    <QueueFormEdit
                      v-if="state.toggles['queues.admin.read']"
                      :queue="queue"
                      :types="state.types"
                      :toggles="state.toggles"
                      :commerce="commerce"
                      :errors="{
                        nameError: state.nameUpdateError,
                        limitError: state.limitUpdateError,
                        orderError: state.orderUpdateError,
                        timeError: state.timeUpdateError,
                        errorsUpdate: state.errorsUpdate,
                      }"
                      :class="{ show: state.extendedEntity === index }"
                    />
                    <div
                      v-if="state.toggles['queues.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      class="detailed-data transition-slow"
                    >
                      <div class="form-fields-container">
                        <div id="queue-services-form-update" class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessCollaboratorsAdmin.services') }}
                          </label>
                          <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem">
                            <select
                              class="form-control-modern form-select-modern"
                              v-model="state.service"
                              @change="selectServiceIndex(index, state.service)"
                              id="services"
                            >
                              <option :value="null">
                                {{
                                  $t('businessCollaboratorsAdmin.selectService') ||
                                  'Seleccionar servicio'
                                }}
                              </option>
                              <option v-for="com in state.services" :key="com.id" :value="com">
                                {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
                              </option>
                            </select>
                            <div
                              v-if="queue.servicesId && queue.servicesId.length > 0"
                              class="badges-container"
                            >
                              <span
                                class="badge-modern"
                                v-for="comId in queue.servicesId"
                                :key="comId"
                              >
                                {{ showService(comId) }}
                                <button
                                  type="button"
                                  class="badge-close"
                                  aria-label="Close"
                                  @click="deleteService(queue, comId)"
                                >
                                  <i class="bi bi-x"></i>
                                </button>
                              </span>
                            </div>
                          </div>
                        </div>
                        <!-- Datos de Servicio -->
                        <button
                          class="section-toggle-button"
                          type="button"
                          data-bs-toggle="collapse"
                          :aria-expanded="false"
                          aria-controls="update-service"
                          data-bs-target="#update-service"
                        >
                          <span class="section-toggle-text">{{
                            $t('businessCommercesAdmin.service')
                          }}</span>
                          <i class="bi bi-chevron-down section-toggle-icon"></i>
                        </button>
                        <div id="update-service" class="collapse row m-0">
                          <div id="queue-blockLimit-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.blockLimit') }}
                            </div>
                            <div class="col-8">
                              <input
                                :disabled="!state.toggles['queues.admin.edit']"
                                min="1"
                                type="number"
                                class="form-control"
                                v-model="queue.serviceInfo.blockLimit"
                                placeholder="100"
                              />
                            </div>
                          </div>
                          <div id="update-queue-samecommerce-active-form" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.walkin') }}
                            </div>
                            <div class="col-8">
                              <Toggle
                                v-model="queue.serviceInfo.walkin"
                                :disabled="!state.toggles['queues.admin.edit']"
                              />
                            </div>
                          </div>
                          <div id="update-queue-samecommerce-active-form" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.sameCommeceHours') }}
                            </div>
                            <div class="col-8">
                              <Toggle
                                v-model="queue.serviceInfo.sameCommeceHours"
                                :disabled="!state.toggles['queues.admin.edit']"
                                @click="initializedSameCommerceHours(queue.serviceInfo)"
                              />
                            </div>
                          </div>
                          <div id="queue-attentionHour-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.attentionHour') }}
                            </div>
                            <div class="col-3">
                              <input
                                min="0"
                                max="24"
                                minlength="1"
                                maxlength="2"
                                type="number"
                                class="form-control"
                                v-model="queue.serviceInfo.attentionHourFrom"
                                placeholder="Ex. 8"
                              />
                            </div>
                            <div class="col-2">-</div>
                            <div class="col-3">
                              <input
                                min="0"
                                max="24"
                                minlength="1"
                                maxlength="2"
                                type="number"
                                class="form-control"
                                v-model="queue.serviceInfo.attentionHourTo"
                                placeholder="Ex. 16"
                              />
                            </div>
                          </div>
                          <div id="update-queue-break-active-form" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.break') }}
                            </div>
                            <div class="col-8">
                              <Toggle
                                v-model="queue.serviceInfo.break"
                                :disabled="!state.toggles['queues.admin.edit']"
                              />
                            </div>
                          </div>
                          <div
                            id="queue-attentionBreak-form-update"
                            v-if="queue.serviceInfo.break"
                            class="row g-1"
                          >
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.breakHour') }}
                            </div>
                            <div class="col-3">
                              <input
                                min="0"
                                max="24"
                                minlength="1"
                                maxlength="5"
                                type="number"
                                class="form-control"
                                v-model="queue.serviceInfo.breakHourFrom"
                                placeholder="Ex. 8"
                              />
                            </div>
                            <div class="col-2">-</div>
                            <div class="col-3">
                              <input
                                min="0"
                                max="24"
                                minlength="1"
                                maxlength="5"
                                type="number"
                                class="form-control"
                                v-model="queue.serviceInfo.breakHourTo"
                                placeholder="Ex. 16"
                              />
                            </div>
                          </div>
                          <div id="queue-attentionDays-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.attentionDays') }}
                            </div>
                            <div class="col-8">
                              <div class="form-check form-switch text-label">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  id="monday"
                                  :checked="dayChecked(queue.serviceInfo, 1)"
                                  @click="checkDay($event, queue.serviceInfo, 1)"
                                />
                                <label class="form-check-label" for="monday">{{
                                  $t('days.1')
                                }}</label>
                              </div>
                              <div class="form-check form-switch text-label">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  id="tuesday"
                                  :checked="dayChecked(queue.serviceInfo, 2)"
                                  @click="checkDay($event, queue.serviceInfo, 2)"
                                />
                                <label class="form-check-label" for="tuesday">{{
                                  $t('days.2')
                                }}</label>
                              </div>
                              <div class="form-check form-switch text-label">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  id="wednesday"
                                  :checked="dayChecked(queue.serviceInfo, 3)"
                                  @click="checkDay($event, queue.serviceInfo, 3)"
                                />
                                <label class="form-check-label" for="wednesday">{{
                                  $t('days.3')
                                }}</label>
                              </div>
                              <div class="form-check form-switch text-label">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  id="thursday"
                                  :checked="dayChecked(queue.serviceInfo, 4)"
                                  @click="checkDay($event, queue.serviceInfo, 4)"
                                />
                                <label class="form-check-label" for="thursday">{{
                                  $t('days.4')
                                }}</label>
                              </div>
                              <div class="form-check form-switch text-label">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  id="friday"
                                  :checked="dayChecked(queue.serviceInfo, 5)"
                                  @click="checkDay($event, queue.serviceInfo, 5)"
                                />
                                <label class="form-check-label" for="friday">{{
                                  $t('days.5')
                                }}</label>
                              </div>
                              <div class="form-check form-switch text-label">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  id="sabado"
                                  :checked="dayChecked(queue.serviceInfo, 6)"
                                  @click="checkDay($event, queue.serviceInfo, 6)"
                                />
                                <label class="form-check-label" for="sabado">{{
                                  $t('days.6')
                                }}</label>
                              </div>
                              <div class="form-check form-switch text-label">
                                <input
                                  class="form-check-input"
                                  type="checkbox"
                                  id="domingo"
                                  :checked="dayChecked(queue.serviceInfo, 7)"
                                  @click="checkDay($event, queue.serviceInfo, 7)"
                                />
                                <label class="form-check-label" for="domingo">{{
                                  $t('days.7')
                                }}</label>
                              </div>
                            </div>
                          </div>
                          <div id="update-queue-personalized-active-form" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.personalized') }}
                            </div>
                            <div class="col-8">
                              <Toggle
                                v-model="queue.serviceInfo.personalized"
                                :disabled="!state.toggles['queues.admin.edit']"
                                @click="initializedParsonalizedHours(queue.serviceInfo)"
                              />
                            </div>
                          </div>
                          <div
                            id="queue-personalized-form-update"
                            v-if="queue.serviceInfo.personalized"
                            class="row g-1"
                          >
                            <div
                              class="row g-1"
                              v-for="day in queue.serviceInfo.attentionDays"
                              :key="day"
                            >
                              <div class="col-4 text-label">
                                {{ $t(`days.${day}`) }}
                              </div>
                              <div class="col-3">
                                <input
                                  min="0"
                                  max="24"
                                  minlength="1"
                                  maxlength="2"
                                  type="number"
                                  class="form-control form-control-sm"
                                  v-model="
                                    queue.serviceInfo.personalizedHours[day].attentionHourFrom
                                  "
                                  placeholder="Ex. 8"
                                />
                              </div>
                              <div class="col-2">-</div>
                              <div class="col-3">
                                <input
                                  min="0"
                                  max="24"
                                  minlength="1"
                                  maxlength="2"
                                  type="number"
                                  class="form-control form-control-sm"
                                  v-model="queue.serviceInfo.personalizedHours[day].attentionHourTo"
                                  placeholder="Ex. 16"
                                />
                              </div>
                            </div>
                          </div>
                          <div id="queue-specificCalendar-active-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessQueuesAdmin.specificCalendar') }}
                            </div>
                            <div class="col-8">
                              <Toggle
                                v-model="queue.serviceInfo.specificCalendar"
                                :disabled="!state.toggles['queues.admin.edit']"
                                @click="initializedSpecificCalendar(queue.serviceInfo)"
                              />
                            </div>
                          </div>
                          <div
                            id="queue-specificCalendarDays-form-update"
                            v-if="queue.serviceInfo.specificCalendar"
                            class="g-1"
                          >
                            <hr />
                            <SpecificCalendarForm
                              :show="queue.serviceInfo.specificCalendar"
                              :locale="state.locale"
                              :structure="queue"
                            >
                            </SpecificCalendarForm>
                          </div>
                        </div>
                        <div class="col">
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="update(queue)"
                            v-if="state.toggles['queues.admin.update']"
                          >
                            {{ $t('businessQueuesAdmin.update') }} <i class="bi bi-save"></i>
                          </button>
                          <button
                            class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                            @click="goToUnavailable()"
                            v-if="state.toggles['queues.admin.unavailable']"
                          >
                            {{ $t('businessQueuesAdmin.unavailable') }}
                            <i class="bi bi-trash-fill"></i>
                          </button>
                          <AreYouSure
                            :show="state.goToUnavailable"
                            :yes-disabled="state.toggles['queues.admin.unavailable']"
                            :no-disabled="state.toggles['queues.admin.unavailable']"
                            @actionYes="unavailable(queue)"
                            @actionNo="unavailableCancel()"
                          >
                          </AreYouSure>
                        </div>
                        <div
                          class="row g-1 errors"
                          id="feedback"
                          v-if="state.errorsUpdate.length > 0"
                        >
                          <Warning>
                            <template v-slot:message>
                              <li v-for="(error, index) in state.errorsUpdate" :key="index">
                                {{ $t(error) }}
                              </li>
                            </template>
                          </Warning>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="
                        (!isActiveBusiness() || !state.toggles['queues.admin.read']) && !loading
                      "
                    >
                      <Message
                        :title="$t('businessQueuesAdmin.message.1.title')"
                        :content="$t('businessQueuesAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['queues.admin.view']) && !loading">
            <Message
              :title="$t('businessQueuesAdmin.message.1.title')"
              :content="$t('businessQueuesAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Add - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
      <div
        class="modal fade"
        :id="`add-queue`"
        data-bs-keyboard="false"
        tabindex="-1"
        aria-labelledby="staticBackdropLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header border-0 centered active-name">
              <h5 class="modal-title fw-bold"><i class="bi bi-plus-lg"></i> {{ $t('add') }}</h5>
              <button
                id="close-modal"
                class="btn-close"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div class="modal-body text-center mb-0" id="attentions-component">
              <Spinner :show="loading"></Spinner>
              <Alert :show="false" :stack="alertError"></Alert>
              <div
                id="add-queue-card"
                class="result-card mb-4"
                v-if="state.showAdd && state.toggles['queues.admin.add']"
              >
                <div v-if="state.queues.length < state.toggles['queues.admin.limit']">
                  <QueueFormAdd
                    v-model="state.newQueue"
                    :types="state.types"
                    :toggles="state.toggles"
                    :commerce="commerce"
                    :errors="{
                      nameError: state.nameAddError,
                      typeError: state.typeError,
                      limitError: state.limitAddError,
                      blockError: state.blockAddError,
                      orderError: state.orderAddError,
                      timeError: state.timeAddError,
                      errorsAdd: state.errorsAdd,
                    }"
                    @type-changed="onAddQueueTypeChanged"
                  />
                  <div class="form-fields-container">
                    <div v-if="state.newQueue.type === 'PROFESSIONAL'" class="form-group-modern">
                      <label class="form-label-modern">
                        {{ $t('businessQueuesAdmin.selectProfessional') }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          :disable-click-away="false"
                          :content="
                            $t('businessQueuesAdmin.professionalHelp') ||
                            $t('businessQueuesAdmin.collaboratorHelp')
                          "
                        >
                          <i class="bi bi-info-circle-fill h7"></i>
                        </Popper>
                      </label>
                      <div style="flex: 1">
                        <div class="dropdown">
                          <button
                            class="form-control-modern form-select-modern dropdown-toggle"
                            type="button"
                            id="select-professional-add"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                            style="text-align: left; cursor: pointer"
                          >
                            {{
                              state.selectedProfessional.personalInfo?.name ||
                              $t('businessQueuesAdmin.selectProfessional')
                            }}
                          </button>
                          <ul class="dropdown-menu" aria-labelledby="select-professional-add">
                            <li
                              v-for="prof in state.professionals"
                              :key="prof.id"
                              :value="prof"
                              class="list-item"
                            >
                              <div
                                class="row d-flex m-1 searcher"
                                @click="selectProfessional(state.newQueue, prof)"
                              >
                                <div class="col-12">
                                  <div>
                                    <span class="item-title fw-bold">
                                      {{ prof.personalInfo?.name }}
                                    </span>
                                  </div>
                                  <div v-if="prof !== undefined">
                                    <span class="item-subtitle text-break">
                                      {{ prof.personalInfo?.email }}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div v-if="state.newQueue.type === 'SERVICE'" class="form-group-modern">
                      <label class="form-label-modern">
                        {{ $t('businessQueuesAdmin.selectService') }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          :disable-click-away="false"
                          :content="$t('businessQueuesAdmin.serviceHelp')"
                        >
                          <i class="bi bi-info-circle-fill h7"></i>
                        </Popper>
                      </label>
                      <div style="flex: 1">
                        <div class="dropdown">
                          <button
                            class="form-control-modern form-select-modern dropdown-toggle"
                            type="button"
                            id="select-service-add"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                            style="text-align: left; cursor: pointer"
                          >
                            {{
                              state.selectedService.name || $t('businessQueuesAdmin.selectService')
                            }}
                          </button>
                          <ul class="dropdown-menu" aria-labelledby="select-service-add">
                            <li
                              v-for="serv in state.services"
                              :key="serv.id"
                              :value="serv"
                              class="list-item"
                            >
                              <div
                                class="row d-flex m-1 searcher"
                                @click="selectService(state.newQueue, serv)"
                              >
                                <div class="col-12">
                                  <div>
                                    <span class="item-title fw-bold"> {{ serv.name }} </span>
                                  </div>
                                  <div v-if="serv !== undefined">
                                    <span class="item-subtitle text-break"> {{ serv.tag }} </span>
                                  </div>
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div v-if="state.newQueue.type === 'MULTI_SERVICE'" class="form-group-modern">
                      <label class="form-label-modern">
                        {{ $t('businessQueuesAdmin.services') }}
                      </label>
                      <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem">
                        <select
                          class="form-control-modern form-select-modern"
                          v-model="state.service"
                          @change="selectServiceMultiple(state.newQueue, state.service)"
                          id="services"
                        >
                          <option :value="null">
                            {{
                              $t('businessCollaboratorsAdmin.selectService') ||
                              'Seleccionar servicio'
                            }}
                          </option>
                          <option v-for="com in state.services" :key="com.id" :value="com">
                            {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
                          </option>
                        </select>
                        <div
                          v-if="state.newQueue.servicesId && state.newQueue.servicesId.length > 0"
                          class="badges-container"
                        >
                          <span
                            class="badge-modern"
                            v-for="servId in state.newQueue.servicesId"
                            :key="servId"
                          >
                            {{ showService(servId) }}
                            <button
                              type="button"
                              class="badge-close"
                              aria-label="Close"
                              @click="deleteService(state.newQueue, servId)"
                            >
                              <i class="bi bi-x"></i>
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Datos de Servicio -->
                  <button
                    class="section-toggle-button"
                    type="button"
                    data-bs-toggle="collapse"
                    :aria-expanded="false"
                    aria-controls="add-service"
                    data-bs-target="#add-service"
                  >
                    <span class="section-toggle-text">{{
                      $t('businessCommercesAdmin.service')
                    }}</span>
                    <i class="bi bi-chevron-down section-toggle-icon"></i>
                  </button>
                  <div v-if="state.newQueue.serviceInfo" id="add-service" class="collapse row m-0">
                    <div id="add-queue-blockLimit-form" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t('businessQueuesAdmin.blockLimit') }}
                      </div>
                      <div class="col-8">
                        <input
                          :disabled="!state.toggles['queues.admin.edit']"
                          min="1"
                          type="number"
                          class="form-control"
                          v-model="state.newQueue.serviceInfo.blockLimit"
                          placeholder="100"
                        />
                      </div>
                    </div>
                    <div id="add-queue-walkin-active-form" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t('businessQueuesAdmin.walkin') }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          :disable-click-away="false"
                          :content="$t('businessQueuesAdmin.walkinHelp')"
                        >
                          <i class="bi bi-info-circle-fill h7"></i>
                        </Popper>
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="state.newQueue.serviceInfo.walkin"
                          :disabled="!state.toggles['queues.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="add-queue-samecommerce-active-form" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t('businessQueuesAdmin.sameCommeceHours') }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          :disable-click-away="false"
                          :content="$t('businessQueuesAdmin.sameCommeceHelp')"
                        >
                          <i class="bi bi-info-circle-fill h7"></i>
                        </Popper>
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="state.newQueue.serviceInfo.sameCommeceHours"
                          :disabled="!state.toggles['queues.admin.edit']"
                          @click="initializedSameCommerceHours(state.newQueue.serviceInfo)"
                        />
                      </div>
                    </div>
                    <div id="commerce-attentionHour-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t('businessQueuesAdmin.attentionHour') }}
                      </div>
                      <div class="col-3">
                        <input
                          min="0"
                          max="24"
                          minlength="1"
                          maxlength="2"
                          type="number"
                          class="form-control"
                          v-model="state.newQueue.serviceInfo.attentionHourFrom"
                          placeholder="Ex. 8"
                        />
                      </div>
                      <div class="col-2">-</div>
                      <div class="col-3">
                        <input
                          min="0"
                          max="24"
                          minlength="1"
                          maxlength="2"
                          type="number"
                          class="form-control"
                          v-model="state.newQueue.serviceInfo.attentionHourTo"
                          placeholder="Ex. 16"
                        />
                      </div>
                    </div>
                    <div id="add-queue-break-active-form" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t('businessQueuesAdmin.break') }}
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="state.newQueue.serviceInfo.break"
                          :disabled="!state.toggles['queues.admin.edit']"
                        />
                      </div>
                    </div>
                    <div
                      id="queue-attentionBreak-form-add"
                      v-if="state.newQueue.serviceInfo.break"
                      class="row g-1"
                    >
                      <div class="col-4 text-label">
                        {{ $t('businessQueuesAdmin.breakHour') }}
                      </div>
                      <div class="col-3">
                        <input
                          min="0"
                          max="24"
                          minlength="1"
                          maxlength="5"
                          type="number"
                          class="form-control"
                          v-model="state.newQueue.serviceInfo.breakHourFrom"
                          placeholder="Ex. 8"
                        />
                      </div>
                      <div class="col-2">-</div>
                      <div class="col-3">
                        <input
                          min="0"
                          max="24"
                          minlength="1"
                          maxlength="5"
                          type="number"
                          class="form-control"
                          v-model="state.newQueue.serviceInfo.breakHourTo"
                          placeholder="Ex. 16"
                        />
                      </div>
                    </div>
                    <div id="queue-attentionDays-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t('businessQueuesAdmin.attentionDays') }}
                      </div>
                      <div class="col-8">
                        <div class="form-check form-switch text-label">
                          <input
                            class="form-check-input"
                            type="checkbox"
                            id="monday"
                            :checked="dayChecked(state.newQueue.serviceInfo, 1)"
                            @click="checkDay($event, state.newQueue.serviceInfo, 1)"
                          />
                          <label class="form-check-label" for="monday">{{ $t('days.1') }}</label>
                        </div>
                        <div class="form-check form-switch text-label">
                          <input
                            class="form-check-input"
                            type="checkbox"
                            id="tuesday"
                            :checked="dayChecked(state.newQueue.serviceInfo, 2)"
                            @click="checkDay($event, state.newQueue.serviceInfo, 2)"
                          />
                          <label class="form-check-label" for="tuesday">{{ $t('days.2') }}</label>
                        </div>
                        <div class="form-check form-switch text-label">
                          <input
                            class="form-check-input"
                            type="checkbox"
                            id="wednesday"
                            :checked="dayChecked(state.newQueue.serviceInfo, 3)"
                            @click="checkDay($event, state.newQueue.serviceInfo, 3)"
                          />
                          <label class="form-check-label" for="wednesday">{{ $t('days.3') }}</label>
                        </div>
                        <div class="form-check form-switch text-label">
                          <input
                            class="form-check-input"
                            type="checkbox"
                            id="thursday"
                            :checked="dayChecked(state.newQueue.serviceInfo, 4)"
                            @click="checkDay($event, state.newQueue.serviceInfo, 4)"
                          />
                          <label class="form-check-label" for="thursday">{{ $t('days.4') }}</label>
                        </div>
                        <div class="form-check form-switch text-label">
                          <input
                            class="form-check-input"
                            type="checkbox"
                            id="friday"
                            :checked="dayChecked(state.newQueue.serviceInfo, 5)"
                            @click="checkDay($event, state.newQueue.serviceInfo, 5)"
                          />
                          <label class="form-check-label" for="friday">{{ $t('days.5') }}</label>
                        </div>
                        <div class="form-check form-switch text-label">
                          <input
                            class="form-check-input"
                            type="checkbox"
                            id="sabado"
                            :checked="dayChecked(state.newQueue.serviceInfo, 6)"
                            @click="checkDay($event, state.newQueue.serviceInfo, 6)"
                          />
                          <label class="form-check-label" for="sabado">{{ $t('days.6') }}</label>
                        </div>
                        <div class="form-check form-switch text-label">
                          <input
                            class="form-check-input"
                            type="checkbox"
                            id="domingo"
                            :checked="dayChecked(state.newQueue.serviceInfo, 7)"
                            @click="checkDay($event, state.newQueue.serviceInfo, 7)"
                          />
                          <label class="form-check-label" for="domingo">{{ $t('days.7') }}</label>
                        </div>
                      </div>
                    </div>
                    <div id="add-queue-personalized-active-form" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t('businessQueuesAdmin.personalized') }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          :disable-click-away="false"
                          :content="$t('businessQueuesAdmin.personalizedHelp')"
                        >
                          <i class="bi bi-info-circle-fill h7"></i>
                        </Popper>
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="state.newQueue.serviceInfo.personalized"
                          :disabled="!state.toggles['queues.admin.edit']"
                          @click="initializedParsonalizedHours(state.newQueue.serviceInfo)"
                        />
                      </div>
                    </div>
                    <div
                      id="queue-personalized-form-add"
                      v-if="state.newQueue.serviceInfo.personalized"
                      class="row g-1"
                    >
                      <div
                        class="row g-1"
                        v-for="day in state.newQueue.serviceInfo.attentionDays"
                        :key="day"
                      >
                        <div class="col-4 text-label">
                          {{ $t(`days.${day}`) }}
                        </div>
                        <div class="col-3">
                          <input
                            min="0"
                            max="24"
                            minlength="1"
                            maxlength="2"
                            type="number"
                            class="form-control form-control-sm"
                            v-model="
                              state.newQueue.serviceInfo.personalizedHours[day].attentionHourFrom
                            "
                            placeholder="Ex. 8"
                          />
                        </div>
                        <div class="col-2">-</div>
                        <div class="col-3">
                          <input
                            min="0"
                            max="24"
                            minlength="1"
                            maxlength="2"
                            type="number"
                            class="form-control form-control-sm"
                            v-model="
                              state.newQueue.serviceInfo.personalizedHours[day].attentionHourTo
                            "
                            placeholder="Ex. 16"
                          />
                        </div>
                      </div>
                    </div>
                    <div id="queue-specificCalendar-active-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t('businessQueuesAdmin.specificCalendar') }}
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="state.newQueue.serviceInfo.specificCalendar"
                          :disabled="!state.toggles['queues.admin.edit']"
                          @click="initializedSpecificCalendar(state.newQueue.serviceInfo)"
                        />
                      </div>
                    </div>
                    <div
                      id="queue-specificCalendarDays-form-add"
                      v-if="state.newQueue.serviceInfo.specificCalendar"
                      class="row"
                    >
                      <hr />
                      <SpecificCalendarForm
                        :show="state.newQueue.serviceInfo.specificCalendar"
                        :locale="state.locale"
                        :structure="state.newQueue"
                      >
                      </SpecificCalendarForm>
                    </div>
                  </div>
                  <div class="col">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="add(state.newQueue)"
                    >
                      {{ $t('businessQueuesAdmin.add') }} <i class="bi bi-save"></i>
                    </button>
                  </div>
                  <div class="row g-1 errors" id="feedback" v-if="state.errorsAdd.length > 0">
                    <Warning>
                      <template v-slot:message>
                        <li v-for="(error, index) in state.errorsAdd" :key="index">
                          {{ $t(error) }}
                        </li>
                      </template>
                    </Warning>
                  </div>
                </div>
                <div v-else>
                  <Message
                    :title="$t('businessQueuesAdmin.message.3.title')"
                    :content="$t('businessQueuesAdmin.message.3.content')"
                  />
                </div>
              </div>
            </div>
            <div class="modal-footer border-0 justify-content-center">
              <button
                type="button"
                class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                {{ $t('close') }} <i class="bi bi-check-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.is-disabled {
  opacity: 0.5;
}
.show {
  padding: 10px;
  max-height: 1500px !important;
  overflow-y: auto;
}
.list-item {
  cursor: pointer;
}
.item-title {
  display: flex;
  justify-content: left;
  align-items: left;
  margin: 0.1rem 0.3rem;
  font-size: 1rem;
  line-height: 0.9rem !important;
}
.item-subtitle {
  display: flex;
  justify-content: left;
  align-items: left;
  margin: 0.1rem 0.3rem;
  font-size: 0.6rem;
  line-height: 0.6rem !important;
}

/* Desktop Layout Styles - Only affects the header row */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
    text-align: left;
  }

  .desktop-header-row .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 100px;
    width: auto;
    height: auto;
    margin-bottom: 0;
  }

  .desktop-header-row #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-header-row .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
    text-align: left;
  }
}

/* Modern Form Styles for Services Fields */
.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
}

.form-group-modern {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.form-label-modern {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  margin-bottom: 0;
  min-width: 120px;
  flex-shrink: 0;
}

.form-control-modern,
.form-select-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  color: #000000;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.form-control-modern:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:hover:not(:disabled),
.form-select-modern:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:disabled,
.form-select-modern:disabled {
  background-color: rgba(245, 246, 247, 0.8);
  color: rgba(0, 0, 0, 0.5);
  cursor: not-allowed;
  opacity: 0.7;
}

.form-select-modern {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
}

/* Modern Section Toggle Button - Compact with Black Background */
.section-toggle-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.625rem;
  margin-bottom: 0.375rem;
  background: rgba(0, 0, 0, 0.85);
  border: none;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.section-toggle-button:hover {
  background: rgba(0, 0, 0, 0.95);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.section-toggle-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
}

.section-toggle-button[aria-expanded='true'] {
  background: rgba(0, 0, 0, 0.85);
}

.section-toggle-button[aria-expanded='true']:hover {
  background: rgba(0, 0, 0, 0.95);
}

.section-toggle-text {
  flex: 1;
  text-align: left;
}

.section-toggle-icon {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.section-toggle-button[aria-expanded='true'] .section-toggle-icon {
  transform: rotate(180deg);
}

/* Badges Container - Modern Style */
.badges-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.25rem;
}

.badge-modern {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: rgba(108, 117, 125, 0.15);
  color: #495057;
  border-radius: 9999px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-close {
  background: none;
  border: none;
  color: #495057;
  cursor: pointer;
  padding: 0;
  margin-left: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.badge-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #212529;
}

.badge-close i {
  font-size: 0.75rem;
}
</style>
