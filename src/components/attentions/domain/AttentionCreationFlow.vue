<script>
import { ref, reactive, computed, watch, onBeforeMount, onBeforeUnmount, toRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAttentionCreation } from '../composables/useAttentionCreation';
import ClientForm from '../../domain/ClientForm.vue';
import QueueForm from '../../domain/QueueForm.vue';
import ServiceForm from '../../domain/ServiceForm.vue';
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import Message from '../../common/Message.vue';
import ClinicalAlertsBanner from '../../clinical-alerts/domain/ClinicalAlertsBanner.vue';
import PackageReminderBanner from '../../common/PackageReminderBanner.vue';
import { getActiveFeature, isTelemedicineEnabled } from '../../../shared/features';
import { getAlertsByClient } from '../../../application/services/clinical-alerts';
import { globalStore } from '../../../stores';
import { DateModel } from '../../../shared/utils/date.model';
import {
  getQueueBlockDetailsByDay,
  getQueueBlockDetailsBySpecificDayByCommerceId,
} from '../../../application/services/block';
import { getCollaboratorDetailsById } from '../../../application/services/collaborator';
import {
  getPendingBookingsBetweenDates,
  createBooking,
} from '../../../application/services/booking';
import { createAttention } from '../../../application/services/attention';
import { getPackageById } from '../../../application/services/package';
import { getAttentionsDetails } from '../../../application/services/query-stack';
import { getBookingsDetails } from '../../../application/services/query-stack';
import NextAvailableSlot from '../../bookings/common/NextAvailableSlot.vue';

export default {
  name: 'AttentionCreationFlow',
  components: {
    ClientForm,
    QueueForm,
    ServiceForm,
    Spinner,
    Alert,
    Message,
    ClinicalAlertsBanner,
    PackageReminderBanner,
    NextAvailableSlot,
  },
  props: {
    commerce: { type: Object, required: true },
    queues: { type: Array, default: () => [] },
    groupedQueues: { type: Object, default: () => {} },
    collaborators: { type: Array, default: () => [] },
    preselectedQueue: { type: Object, default: null },
    preselectedDate: { type: [String, Object], default: null },
    preselectedBlock: { type: Object, default: null },
    preselectedClient: { type: Object, default: null },
    clientData: { type: Object, default: null }, // Enhanced client data prop
    initialStep: { type: Number, default: 1 },
    mode: { type: String, default: 'full-page' }, // 'modal' | 'full-page'
    toggles: { type: Object, default: () => {} },
    sessionId: { type: String, default: null },
    creationType: { type: String, default: 'attention' }, // 'attention' | 'booking'
    preselectedPackageId: { type: String, default: null }, // Package ID to associate with attention/booking
    preselectedServiceId: { type: String, default: null }, // Service ID to filter services/collaborators
  },
  emits: ['attention-created', 'cancel', 'step-change', 'error'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const loading = ref(false);
    const loadingHours = ref(false);
    const alertError = ref('');
    // Generate unique ID for checkbox
    const checkboxId = ref(`accept-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

    // Props refs for template access (keep props object for JS code)
    const preselectedQueueRef = toRef(props, 'preselectedQueue');
    const preselectedDateRef = toRef(props, 'preselectedDate');
    const preselectedBlockRef = toRef(props, 'preselectedBlock');
    const preselectedClientRef = toRef(props, 'preselectedClient');
    const clientDataRef = toRef(props, 'clientData');
    const preselectedServiceIdRef = toRef(props, 'preselectedServiceId');

    const {
      loading: creatingAttention,
      createAttentionRequest,
      validateUser,
      isDataActive,
    } = useAttentionCreation(props.commerce);

    // Initial state values
    const getInitialState = () => ({
      currentStep: props.initialStep,
      newUser: {},
      phone: '',
      phoneCode: '',
      accept: false,
      queue: null,
      selectedServices: [],
      selectedProcedureAmount: null, // Selected procedure amount from proceduresList
      date: null,
      block: null,
      attentionBlock: null,
      blocksByDay: {},
      blocks: [],
      availableBookingBlocks: [],
      availableAttentionBlocks: [],
      bookings: [],
      attentions: [],
      services: [],
      selectedServices: [],
      totalDurationRequested: 0,
      totalServicesRequested: 0,
      amountofBlocksNeeded: 0,
      canBook: false,
      canBook: false,
      amountofBlocksNeeded: 0,
      errorsAdd: [],
      clinicalAlerts: [],
      loadingAlerts: false,
      isTelemedicine: false,
      telemedicineConfig: {
        type: 'VIDEO',
        scheduledAt: null,
        recordingEnabled: false,
        notes: '',
      },
    });

    const state = reactive(getInitialState());

    // Initialize preselected data
    onBeforeMount(async () => {
      if (props.preselectedQueue && props.preselectedQueue.id) {
        console.log('🏢 Preselected queue provided:', props.preselectedQueue);
        console.log('🏢 Queue ID:', props.preselectedQueue?.id);
        console.log('🏢 Queue name:', props.preselectedQueue?.name);
        console.log('🏢 Queue type:', props.preselectedQueue?.type);

        // Only set the queue if it's valid for preselection
        if (isPreselectedQueueValid()) {
          state.queue = props.preselectedQueue;
          console.log('🏢 ✅ Valid preselected queue set:', props.preselectedQueue);

          // For SERVICE and STANDARD queues with one service, auto-select that service
          if (
            props.preselectedQueue.type === 'SERVICE' ||
            props.preselectedQueue.type === 'STANDARD'
          ) {
            if (props.preselectedQueue.services && props.preselectedQueue.services.length === 1) {
              state.selectedServices = [...props.preselectedQueue.services];
              console.log(
                '🔧 ✅ Auto-selected single service for SERVICE/STANDARD queue:',
                state.selectedServices,
              );
            } else if (
              props.preselectedQueue.servicesId &&
              props.preselectedQueue.servicesId.length === 1
            ) {
              // Create a service object from servicesId for SERVICE queues
              const serviceFromId = {
                id: props.preselectedQueue.servicesId[0],
                name: props.preselectedQueue.name, // Use queue name as service name
                serviceInfo: {
                  estimatedTime: props.preselectedQueue.estimatedTime || 30,
                  blockTime: props.preselectedQueue.blockTime || 30,
                },
              };
              state.selectedServices = [serviceFromId];
              console.log(
                '🔧 ✅ Auto-selected service from servicesId for preselected SERVICE/STANDARD queue:',
                state.selectedServices,
              );
            }
          }

          // For MULTI_SERVICE queues, auto-select all services
          if (props.preselectedQueue.type === 'MULTI_SERVICE') {
            if (props.preselectedQueue.services && props.preselectedQueue.services.length > 0) {
              state.selectedServices = [...props.preselectedQueue.services];
              console.log(
                '🔧 ✅ Auto-selected all services for MULTI_SERVICE queue:',
                state.selectedServices,
              );
            } else if (
              props.preselectedQueue.servicesId &&
              props.preselectedQueue.servicesId.length > 0
            ) {
              // If services array is empty but servicesId exists, we'll let the ServiceForm handle the selection
              console.log(
                '🔧 ℹ️ MULTI_SERVICE queue has servicesId but no services array - will be handled by ServiceForm',
              );
            }
          }

          // Set services available for selection (for UI display)
          if (props.preselectedQueue.services && props.preselectedQueue.services.length > 0) {
            // If preselectedServiceId is provided, filter to show only that service
            if (props.preselectedServiceId) {
              const filteredServices = props.preselectedQueue.services.filter(
                service => service.id === props.preselectedServiceId
              );
              if (filteredServices.length > 0) {
                state.services = filteredServices;
                // Auto-select the preselected service
                state.selectedServices = [...filteredServices];
                console.log(
                  '🔧 ✅ Filtered services to preselected service only:',
                  filteredServices,
                );
              } else {
                state.services = props.preselectedQueue.services;
                console.log('🔧 ⚠️ Preselected service not found in queue services, showing all');
              }
            } else {
              state.services = props.preselectedQueue.services;
              console.log(
                '🔧 Preselected queue services available:',
                props.preselectedQueue.services,
              );
            }
          } else if (props.preselectedServiceId && props.preselectedQueue.servicesId) {
            // If queue has servicesId array, filter by preselectedServiceId
            const hasServiceId = Array.isArray(props.preselectedQueue.servicesId)
              ? props.preselectedQueue.servicesId.includes(props.preselectedServiceId)
              : props.preselectedQueue.servicesId === props.preselectedServiceId;

            if (hasServiceId) {
              // Create a service object from the preselectedServiceId
              const serviceFromId = {
                id: props.preselectedServiceId,
                name: props.preselectedQueue.name,
                serviceInfo: {
                  estimatedTime: props.preselectedQueue.estimatedTime || 30,
                  blockTime: props.preselectedQueue.blockTime || 30,
                },
              };
              state.services = [serviceFromId];
              state.selectedServices = [serviceFromId];
              console.log('🔧 ✅ Created service object from preselectedServiceId:', serviceFromId);
            }
          }

          // Auto-advance if queue is preselected and valid
          if (!props.preselectedClient) {
            // For valid preselected queues, start at step 2 to show preselected card
            state.currentStep = Math.max(state.currentStep, 2);
          }

          // Update canBook status AFTER setting services
          setCanBook();
        } else {
          console.log(
            '🏢 ⚠️ Preselected queue is invalid or requires manual selection:',
            props.preselectedQueue,
          );
          // Don't set the queue, force user to select a valid one
          state.queue = null;
        }
      } else if (props.preselectedQueue) {
        console.log('🏢 ⚠️ Preselected queue provided but missing ID:', props.preselectedQueue);
      }
      if (props.preselectedClient) {
        // ✅ Map client data fields using helper function
        const mappedPreselectedClient = mapClientDataFields(props.preselectedClient);
        state.newUser = mappedPreselectedClient;
        // When client is preselected, always start at step 2 (queue/service selection)
        state.currentStep = 2;
      }

      // Handle new clientData prop (enhanced client data)
      if (props.clientData) {
        console.log('👤 Pre-populating with clientData:', props.clientData);

        // ✅ Map client data fields using helper function
        const mappedClientData = mapClientDataFields(props.clientData);

        // Store client data for form submission
        clientFormData.value = mappedClientData;

        // Also set in state for display and validation
        state.newUser = mappedClientData;
        state.user = mappedClientData;

        // Skip client form step since we have client data, start at step 2
        state.currentStep = 2;
      }
      if (props.preselectedDate) {
        state.date = props.preselectedDate;
        // Always load blocks for preselected date to show ALL available options
        if (props.preselectedQueue && props.preselectedQueue.id) {
          console.log('🔄 Loading ALL blocks for preselected date:', props.preselectedDate);
          console.log('🔄 Preselected queue:', props.preselectedQueue.id);

          await loadBlocksForDate(props.preselectedDate);

          console.log('🔄 After loading - state.blocks length:', state.blocks?.length || 0);
          console.log(
            '🔄 After loading - state.blocksByDay keys:',
            Object.keys(state.blocksByDay || {}),
          );

          // Force a recalculation of available blocks
          calculateAvailableBlocks();
        }
      }
      if (props.preselectedBlock) {
        state.block = props.preselectedBlock;
        // Also set the date if not already set
        if (!state.date && props.preselectedDate) {
          state.date = props.preselectedDate;
        }
      }

      // Initialize accept if conditions are required
      // For modal mode, always accept terms by default to streamline the flow
      state.accept = true;

      // If all critical data is preselected, start at appropriate step
      // IMPORTANT: Always show client form (step 1) if needed, even if other data is preselected
      if (needsClientForm.value) {
        // User data is required but not provided - must show client form first
        state.currentStep = 1;
      } else if (isPreselectedQueueValid()) {
        // If we have valid preselected queue, start at step 2 to show preselected card
        // User can verify the selection and proceed
        state.currentStep = 2;
      } else {
        // If preselected queue is invalid or no queue preselected, start at step 2 for queue selection
        // unless we need client form first
        if (!needsClientForm.value) {
          state.currentStep = 2;
        }
      }
    });

    const needsClientForm = computed(
      () => !props.preselectedClient && !props.clientData && isDataActive()
    );

    // Always show queue selection in step 2 (even if preselected, to allow changes)
    const needsQueueSelection = computed(() => true);

    const needsServiceSelection = () => {
      if (!state.queue) return false;
      return (
        ['COLLABORATOR', 'SELECT_SERVICE', 'MULTI_SERVICE'].includes(state.queue.type) &&
        state.queue.services &&
        state.queue.services.length > 0
      );
    };

    // Helper function to validate if preselected queue is valid for continuing the flow
    const isPreselectedQueueValid = () => {
      if (!props.preselectedQueue || !props.preselectedQueue.id) return false;

      const queue = props.preselectedQueue;
      console.log('🔍 Validating preselected queue:', queue.name, 'Type:', queue.type);
      console.log('🔍 ServicesId:', queue.servicesId?.length || 0);
      console.log('🔍 Services:', queue.services?.length || 0);

      // For queues that have exactly one service attached, they can be preselected
      if (queue.type === 'SERVICE' || queue.type === 'STANDARD') {
        const hasOneService =
          (queue.servicesId && queue.servicesId.length === 1) ||
          (queue.services && queue.services.length === 1);
        console.log('🔍 SERVICE/STANDARD queue - hasOneService:', hasOneService);
        return hasOneService;
      }

      // For MULTI_SERVICE queues with services, they can be preselected (all services are included)
      if (queue.type === 'MULTI_SERVICE') {
        const hasServices =
          (queue.services && queue.services.length > 0) ||
          (queue.servicesId && queue.servicesId.length > 0);
        console.log('🔍 MULTI_SERVICE queue - hasServices:', hasServices);
        return hasServices;
      }

      // For COLLABORATOR queues, they need to be loaded dynamically, so we can't preselect them
      // They need service selection after loading collaborator details
      if (queue.type === 'COLLABORATOR') {
        console.log('🔍 COLLABORATOR queue - cannot preselect (needs dynamic loading)');
        return false;
      }

      // For SELECT_SERVICE queues, user must select services, so cannot be preselected
      if (queue.type === 'SELECT_SERVICE') {
        console.log('🔍 SELECT_SERVICE queue - cannot preselect (user must select)');
        return false;
      }

      console.log('🔍 Unknown queue type or invalid queue');
      return false;
    };

    const showConditions = () => {
      // Don't show conditions for internal modal mode
      if (props.mode === 'modal') {
        return false;
      }
      return (
        getActiveFeature(props.commerce, 'attention-user-name', 'USER') ||
        getActiveFeature(props.commerce, 'attention-user-lastName', 'USER') ||
        getActiveFeature(props.commerce, 'attention-user-idNumber', 'USER') ||
        getActiveFeature(props.commerce, 'attention-user-phone', 'USER') ||
        getActiveFeature(props.commerce, 'attention-user-email', 'USER') ||
        getActiveFeature(props.commerce, 'attention-user-birthday', 'USER') ||
        getActiveFeature(props.commerce, 'attention-user-address', 'USER') ||
        getActiveFeature(props.commerce, 'attention-user-origin', 'USER') ||
        getActiveFeature(props.commerce, 'attention-user-code1', 'USER') ||
        getActiveFeature(props.commerce, 'attention-user-code2', 'USER') ||
        getActiveFeature(props.commerce, 'attention-user-code3', 'USER') ||
        getActiveFeature(props.commerce, 'attention-user-health-agreement', 'USER')
      );
    };

    const canProceedFromStep = computed(() => {
      switch (state.currentStep) {
        case 1: {
          if (!needsClientForm.value) return true;
          // Use clientFormData if available, otherwise use state.newUser
          const userDataForValidation =
            clientFormData.value && Object.keys(clientFormData.value).length > 0
              ? clientFormData.value
              : state.newUser;
          return validateUser(
            userDataForValidation,
            state.phoneCode,
            state.phone,
            state.accept,
            showConditions,
          );
        }
        case 2: {
          // For step 2, check if queue is selected and valid
          const hasQueue = !!state.queue && !!state.queue.id;

          // If queue requires service selection, ensure services are selected
          if (hasQueue && needsServiceSelection()) {
            const hasSelectedServices = state.selectedServices && state.selectedServices.length > 0;
            console.log(
              '🔧 canProceedFromStep (step 2): hasQueue =',
              hasQueue,
              'needsServices =',
              true,
              'hasSelectedServices =',
              hasSelectedServices,
            );
            return hasSelectedServices;
          }

          console.log(
            '🔧 canProceedFromStep (step 2): hasQueue =',
            hasQueue,
            'queueId =',
            state.queue?.id,
          );
          return hasQueue;
        }
        case 3: {
          // Step 3: Procedure amount selection (if needed)
          if (needsProcedureAmountSelection.value) {
            return !!state.selectedProcedureAmount;
          }
          // If not needed, allow proceeding
          return true;
        }
        case 4: {
          // For step 4, check date, block, user data (if required), and accept if conditions are required
          const hasDate = !!state.date || !!props.preselectedDate;

          // Check the correct block based on date (same logic as CommerceQueuesView)
          const currentDate = state.date || props.preselectedDate;
          const isToday =
            currentDate === 'TODAY' || currentDate === new Date().toISOString().slice(0, 10);

          const hasBlock = isToday
            ? !!state.attentionBlock || !!props.preselectedBlock
            : !!state.block || !!props.preselectedBlock;

          const hasDateAndBlock = hasDate && hasBlock;

          // If telemedicine is enabled, validate telemedicine config
          if (state.isTelemedicine) {
            // Only require scheduledAt if no block is selected (block selection auto-fills scheduledAt)
            if (!state.block && !props.preselectedBlock && !state.telemedicineConfig.scheduledAt) {
              return false;
            }
          }

          // If user data is required, validate it
          let hasValidUserData = true;
          if (needsClientForm.value) {
            // Use clientFormData if available, otherwise use state.newUser
            const userDataForValidation =
              clientFormData.value && Object.keys(clientFormData.value).length > 0
                ? clientFormData.value
                : state.newUser;
            hasValidUserData = validateUser(
              userDataForValidation,
              state.phoneCode,
              state.phone,
              state.accept,
              showConditions
            );
          }

          if (showConditions()) {
            return hasDateAndBlock && hasValidUserData && !!state.accept;
          }

          return hasDateAndBlock && hasValidUserData;
        }
        default:
          return false;
      }
    });

    // Check if procedure amount selection is needed
    const needsProcedureAmountSelection = computed(() => {
      // Only check if we have selected services
      if (!state.selectedServices || state.selectedServices.length === 0) {
        console.log('🔍 needsProcedureAmountSelection: No selected services');
        return false;
      }

      // Check if any selected service has proceduresList
      const serviceWithProceduresList = state.selectedServices.find(service => {
        const proceduresList = service.serviceInfo?.proceduresList;
        const hasProceduresList =
          proceduresList && proceduresList.trim() && proceduresList.trim().length > 0;
        console.log(
          '🔍 Checking service:',
          service.name,
          'proceduresList:',
          proceduresList,
          'hasProceduresList:',
          hasProceduresList,
        );
        return hasProceduresList;
      });

      if (!serviceWithProceduresList) {
        console.log('🔍 needsProcedureAmountSelection: No service with proceduresList found');
        return false;
      }

      // Check if client has active package (if step2PackageInfo exists, they have an active package)
      // Only skip procedure selection if we have a client ID and an active package
      const hasClientId =
        clientFormData.value?.clientId ||
        clientFormData.value?.id ||
        state.newUser?.clientId ||
        state.newUser?.id ||
        props.clientData?.clientId ||
        props.clientData?.id ||
        props.preselectedClient?.clientId ||
        props.preselectedClient?.id;

      console.log(
        '🔍 needsProcedureAmountSelection: hasClientId:',
        hasClientId,
        'step2PackageInfo:',
        !!step2PackageInfo.value,
      );

      if (hasClientId && step2PackageInfo.value) {
        console.log(
          '🔍 needsProcedureAmountSelection: Client has active package, skipping selection',
        );
        return false; // Client has active package, no need to select amount
      }

      // If service has proceduresList and no active package, show selection
      console.log(
        '🔍 needsProcedureAmountSelection: TRUE - Service has proceduresList and no active package',
      );
      return true;
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

    const isLastStep = computed(() => {
      if (!needsServiceSelection() && state.currentStep === 3) {
        return true;
      }
      return state.currentStep === 4;
    });

    const handleTelemedicineToggle = () => {
      if (state.isTelemedicine) {
        // Ensure telemedicineConfig is always an object
        if (!state.telemedicineConfig) {
          state.telemedicineConfig = {
            type: 'VIDEO',
            scheduledAt: null,
            recordingEnabled: false,
            notes: '',
          };
        }
        // Use the selected date and block time if available
        if (state.date && state.block && state.block.hourFrom) {
          // Use the selected date and hourFrom from the block
          const dateStr =
            typeof state.date === 'string' ? state.date : new DateModel(state.date).toString();
          const scheduledDateTime = new Date(dateStr + 'T' + state.block.hourFrom + ':00');
          state.telemedicineConfig.scheduledAt = scheduledDateTime.toISOString().slice(0, 16);
        } else if (state.date) {
          // Use selected date with default time
          const dateStr =
            typeof state.date === 'string' ? state.date : new DateModel(state.date).toString();
          state.telemedicineConfig.scheduledAt = new Date(dateStr + 'T10:00:00')
            .toISOString()
            .slice(0, 16);
        } else if (!state.telemedicineConfig.scheduledAt) {
          // Fallback to tomorrow if no date selected
          state.telemedicineConfig.scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 16);
        }
        // Ensure type is set
        if (!state.telemedicineConfig.type) {
          state.telemedicineConfig.type = 'VIDEO';
        }
      } else {
        // Reset config when disabled but keep it as an object
        if (!state.telemedicineConfig) {
          state.telemedicineConfig = {
            type: 'VIDEO',
            scheduledAt: null,
            recordingEnabled: false,
            notes: '',
          };
        } else {
          state.telemedicineConfig.scheduledAt = null;
          state.telemedicineConfig.recordingEnabled = false;
          state.telemedicineConfig.notes = '';
        }
      }
    };

    // Store client data separately to avoid interfering with form input
    const clientFormData = ref({});

    // Summary card state
    const summaryExpanded = ref(true);

    // Package info for summary
    const packageInfo = ref(null);
    const loadingPackageInfo = ref(false);

    // Package info for step 2 banner
    const step2PackageInfo = ref(null);
    const loadingStep2PackageInfo = ref(false);

    // Mounted flag to prevent updates after component unmount (HMR safety)
    const isMounted = ref(true);

    // Function to load package info and calculate current session
    const loadPackageInfo = async () => {
      if (loadingPackageInfo.value || !isMounted.value) return;

      // Only load if we have a preselected package or if we can detect one from the service
      const packageIdToLoad = props.preselectedPackageId;
      if (!packageIdToLoad || !props.commerce?.id) {
        packageInfo.value = null;
        return;
      }

      try {
        loadingPackageInfo.value = true;
        console.log('📦 Loading package info for summary:', packageIdToLoad);

        // Load package details
        const pkg = await getPackageById(packageIdToLoad);
        if (!pkg) {
          packageInfo.value = null;
          return;
        }

        // Get clientId from various sources (same logic as loadStep2PackageInfo)
        const clientId =
          clientFormData.value?.clientId ||
          clientFormData.value?.id ||
          state.newUser?.clientId ||
          state.newUser?.id ||
          props.clientData?.clientId ||
          props.clientData?.id ||
          props.preselectedClient?.clientId ||
          props.preselectedClient?.id;

        if (!clientId || !props.commerce?.id) {
          packageInfo.value = null;
          return;
        }

        // Load pending attentions and bookings for this package
        let pendingAttentions = [];
        let pendingBookings = [];

        try {
          // Load attentions
          const allAttentions = await getAttentionsDetails(
            props.commerce.id,
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
            const pkgId = String(pkg.id || '').trim();
            return (
              attPackageId === pkgId &&
              attPackageId !== '' &&
              (att.status === 'PENDING' || att.status === 'TERMINATED')
            );
          });

          // Load bookings
          const allBookings = await getBookingsDetails(
            props.commerce.id,
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
            const pkgId = String(pkg.id || '').trim();
            return (
              bookingPackageId === pkgId && bookingPackageId !== '' && booking.status === 'PENDING'
            );
          });
        } catch (error) {
          console.error('Error loading package attentions/bookings:', error);
        }

        // Calculate current session number
        // Current session = proceduresUsed + pendingAttentions + pendingBookings + 1 (this one being created)
        const proceduresUsed = pkg.proceduresUsed || 0;
        const currentSessionNumber =
          proceduresUsed + pendingAttentions.length + pendingBookings.length + 1;
        const totalSessions = pkg.proceduresAmount || 0;

        if (isMounted.value) {
          packageInfo.value = {
            id: pkg.id,
            name: pkg.name,
            currentSession: currentSessionNumber,
            totalSessions,
            sessionsRemaining: pkg.proceduresLeft || 0,
          };

          console.log('📦 Package info loaded:', packageInfo.value);
        }
      } catch (error) {
        console.error('Error loading package info:', error);
        if (isMounted.value) {
          packageInfo.value = null;
        }
      } finally {
        if (isMounted.value) {
          loadingPackageInfo.value = false;
        }
      }
    };

    // Function to load package info for step 2 banner
    const loadStep2PackageInfo = async () => {
      if (loadingStep2PackageInfo.value || !isMounted.value) return;

      // Get clientId from various sources
      const clientId =
        clientFormData.value?.clientId ||
        clientFormData.value?.id ||
        state.newUser?.clientId ||
        state.newUser?.id ||
        props.clientData?.clientId ||
        props.clientData?.id ||
        props.preselectedClient?.clientId ||
        props.preselectedClient?.id;

      if (!clientId || !props.commerce?.id) {
        step2PackageInfo.value = null;
        return;
      }

      // Get serviceId from preselectedServiceId or selectedServices
      const serviceId =
        props.preselectedServiceId ||
        (state.selectedServices && state.selectedServices.length > 0
          ? state.selectedServices[0].id
          : null);

      if (!serviceId) {
        step2PackageInfo.value = null;
        return;
      }

      try {
        loadingStep2PackageInfo.value = true;
        console.log('📦 Loading step 2 package info:', { serviceId, clientId });

        // Get available packages for this service
        const { getAvailablePackagesForService } = await import(
          '../../../application/services/package'
        );
        const availablePackages = await getAvailablePackagesForService(
          props.commerce.id,
          serviceId,
          clientId
        );

        if (availablePackages && availablePackages.length > 0) {
          // Find active package with pending sessions
          const activePackage = availablePackages.find(pkg => {
            const isActive = ['ACTIVE', 'CONFIRMED', 'REQUESTED'].includes(pkg.status);
            const hasPendingSessions = (pkg.proceduresLeft || 0) > 0;
            return isActive && hasPendingSessions;
          });

          if (activePackage) {
            // Load pending attentions and bookings to calculate current session
            let pendingAttentions = [];
            let pendingBookings = [];

            try {
              const allAttentions = await getAttentionsDetails(
                props.commerce.id,
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
                props.commerce.id,
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
              console.error('Error loading package attentions/bookings for step 2:', error);
            }

            // Calculate current session number
            const proceduresUsed = activePackage.proceduresUsed || 0;
            const currentSessionNumber =
              proceduresUsed + pendingAttentions.length + pendingBookings.length + 1;
            const totalSessions = activePackage.proceduresAmount || 0;

            // Get service name
            const serviceName =
              state.selectedServices && state.selectedServices.length > 0
                ? state.selectedServices[0].name
                : props.preselectedServiceId
                ? 'Servicio'
                : '';

            if (isMounted.value) {
              step2PackageInfo.value = {
                id: activePackage.id,
                name: activePackage.name,
                serviceName,
                currentSession: currentSessionNumber,
                totalSessions,
                sessionsRemaining: activePackage.proceduresLeft || 0,
              };

              console.log('📦 Step 2 package info loaded:', step2PackageInfo.value);
            }
          } else {
            if (isMounted.value) {
              step2PackageInfo.value = null;
            }
          }
        } else {
          if (isMounted.value) {
            step2PackageInfo.value = null;
          }
        }
      } catch (error) {
        console.error('Error loading step 2 package info:', error);
        if (isMounted.value) {
          step2PackageInfo.value = null;
        }
      } finally {
        if (isMounted.value) {
          loadingStep2PackageInfo.value = false;
        }
      }
    };

    // Watch for changes that should trigger package info loading
    watch(
      () => {
        // Get clientId from various sources (same logic as loadStep2PackageInfo)
        const clientId =
          clientFormData.value?.clientId ||
          clientFormData.value?.id ||
          state.newUser?.clientId ||
          state.newUser?.id ||
          props.clientData?.clientId ||
          props.clientData?.id ||
          props.preselectedClient?.clientId ||
          props.preselectedClient?.id;

        return [
          props.preselectedPackageId,
          state.currentStep,
          state.selectedServices,
          clientId,
          props.preselectedServiceId,
        ];
      },
      async () => {
        if (!isMounted.value) return;
        // Load for step 2 banner
        if (state.currentStep === 2) {
          await loadStep2PackageInfo();
        }
        // Load for step 4 summary
        if (state.currentStep === 4 && props.preselectedPackageId) {
          await loadPackageInfo();
        }
      },
      { immediate: false }
    );

    // Cleanup on unmount to prevent updates after component is destroyed
    onBeforeUnmount(() => {
      isMounted.value = false;
    });

    // ✅ Helper function to map client data from "user" prefix to standard fields
    // This handles both formats: {name, phone, email} and {userName, userPhone, userEmail}
    const mapClientDataFields = data => {
      if (!data || Object.keys(data).length === 0) {
        return {};
      }

      const mapped = {
        ...data,
        // Map user-prefixed fields to standard fields (use existing if available, otherwise map from user prefix)
        name: data.name || data.userName,
        lastName: data.lastName || data.userLastName,
        phone: data.phone || data.userPhone,
        email: data.email || data.userEmail,
        idNumber: data.idNumber || data.userIdNumber,
        // ✅ For existing clients, use clientId (not id) to tell backend this is an existing client
        // If clientId is provided, use it and don't include id
        // If only id is provided, treat it as clientId for existing clients
        ...(data.clientId ? { clientId: data.clientId } : data.id ? { clientId: data.id } : {}),
      };

      // Handle phone code extraction if phone has + prefix
      if (mapped.phone && mapped.phone.startsWith('+') && !mapped.phoneCode) {
        const phoneMatch = mapped.phone.match(/^\+(\d{1,3})(.+)$/);
        if (phoneMatch) {
          mapped.phoneCode = phoneMatch[1];
          mapped.phone = phoneMatch[2];
        }
      }

      // Map personal info fields if they exist with user prefix
      if (data.userBirthday && !mapped.birthday) {
        mapped.birthday = data.userBirthday;
      }
      if (data.userAddressCode && !mapped.addressCode) {
        mapped.addressCode = data.userAddressCode;
      }
      if (data.userAddressText && !mapped.addressText) {
        mapped.addressText = data.userAddressText;
      }
      if (data.userOrigin && !mapped.origin) {
        mapped.origin = data.userOrigin;
      }
      if (data.userCode1 && !mapped.code1) {
        mapped.code1 = data.userCode1;
      }
      if (data.userCode2 && !mapped.code2) {
        mapped.code2 = data.userCode2;
      }
      if (data.userCode3 && !mapped.code3) {
        mapped.code3 = data.userCode3;
      }

      return mapped;
    };

    const loadClinicalAlerts = async clientId => {
      if (!clientId || !props.commerce?.id) {
        state.clinicalAlerts = [];
        return;
      }
      try {
        state.loadingAlerts = true;
        const alerts = await getAlertsByClient(props.commerce.id, clientId, true);
        state.clinicalAlerts = alerts || [];
      } catch (error) {
        state.clinicalAlerts = [];
      } finally {
        state.loadingAlerts = false;
      }
    };

    // Function to reset state to initial values
    const resetState = async () => {
      const initialState = getInitialState();
      // Reset all state properties
      Object.keys(initialState).forEach(key => {
        if (Array.isArray(initialState[key])) {
          state[key] = [];
        } else if (typeof initialState[key] === 'object' && initialState[key] !== null) {
          state[key] = { ...initialState[key] };
        } else {
          state[key] = initialState[key];
        }
      });
      // Ensure telemedicineConfig is always a valid object
      if (!state.telemedicineConfig || typeof state.telemedicineConfig !== 'object') {
        state.telemedicineConfig = {
          type: 'VIDEO',
          scheduledAt: null,
          recordingEnabled: false,
          notes: '',
        };
      }
      // Reset client form data
      clientFormData.value = {};
      // Reset alert error
      alertError.value = '';
      // Reset step based on preselected data
      if (props.preselectedQueue && isPreselectedQueueValid()) {
        state.queue = props.preselectedQueue;

        // Auto-select services for valid preselected queues
        if (
          props.preselectedQueue.type === 'SERVICE' ||
          props.preselectedQueue.type === 'STANDARD'
        ) {
          if (props.preselectedQueue.services && props.preselectedQueue.services.length === 1) {
            state.selectedServices = [...props.preselectedQueue.services];
          } else if (
            props.preselectedQueue.servicesId &&
            props.preselectedQueue.servicesId.length === 1
          ) {
            // Create a service object from servicesId
            const serviceFromId = {
              id: props.preselectedQueue.servicesId[0],
              name: props.preselectedQueue.name,
              serviceInfo: {
                estimatedTime: props.preselectedQueue.estimatedTime || 30,
                blockTime: props.preselectedQueue.blockTime || 30,
              },
            };
            state.selectedServices = [serviceFromId];
          }
        } else if (props.preselectedQueue.type === 'MULTI_SERVICE') {
          if (props.preselectedQueue.services && props.preselectedQueue.services.length > 0) {
            state.selectedServices = [...props.preselectedQueue.services];
          }
        }

        if (props.preselectedQueue.services) {
          state.services = props.preselectedQueue.services;
        }
      } else {
        state.queue = null; // Force queue selection if invalid
        state.selectedServices = [];
        state.services = [];
      }
      if (props.preselectedClient) {
        state.newUser = { ...props.preselectedClient };
      }
      if (props.preselectedDate) {
        state.date = props.preselectedDate;
      }
      if (props.preselectedBlock) {
        state.block = props.preselectedBlock;
      }
      // Set initial step
      if (needsClientForm.value) {
        state.currentStep = 1;
      } else if (isPreselectedQueueValid()) {
        // Valid preselected queue - start at step 2 to show preselected card
        state.currentStep = 2;
      } else {
        // Start at step 2 for queue selection if no valid preselected queue
        state.currentStep = needsClientForm.value ? 1 : 2;
      }
      // Initialize accept based on conditions
      // For modal mode, always accept terms by default to streamline the flow
      state.accept = true;

      // Always reload blocks if we have a preselected date and queue - AWAIT this to ensure blocks are loaded
      if (props.preselectedDate && props.preselectedQueue && props.preselectedQueue.id) {
        console.log('🔄 Reset: Loading blocks for preselected date:', props.preselectedDate);
        await loadBlocksForDate(props.preselectedDate);
      }
    };

    const handleClientData = data => {
      if (data) {
        // ✅ Map client data fields using helper function
        const mappedData = {
          ...mapClientDataFields(data),
          accept: true,
        };

        // Store the mapped data
        clientFormData.value = mappedData;

        console.log('📋 Client data received in AttentionCreationFlow (MAPPED):', {
          originalData: data, // Show original data
          mappedData: clientFormData.value, // Show mapped data
          hasName: !!clientFormData.value.name,
          hasLastName: !!clientFormData.value.lastName,
          hasPhone: !!clientFormData.value.phone,
          hasEmail: !!clientFormData.value.email,
          hasIdNumber: !!clientFormData.value.idNumber,
          hasClientId: !!clientFormData.value.clientId,
          hasPhoneCode: !!clientFormData.value.phoneCode,
          allKeys: Object.keys(clientFormData.value),
          // Show field mapping verification
          nameSource: data.name ? 'name' : data.userName ? 'userName (mapped)' : 'missing',
          phoneSource: data.phone ? 'phone' : data.userPhone ? 'userPhone (mapped)' : 'missing',
        });

        // Extract phoneCode and phone from the data to update state for validation
        if (data.phoneCode) {
          state.phoneCode = data.phoneCode;
        }
        if (data.phone) {
          state.phone = data.phone;
        }
        // Always set accept to true for modal flow
        state.accept = true;

        // Load clinical alerts if client has an ID
        if (data.id) {
          loadClinicalAlerts(data.id);
        }
      }
    };

    // Load alerts for preselected client
    watch(
      () => props.preselectedClient,
      async newClient => {
        if (newClient?.id) {
          await loadClinicalAlerts(newClient.id);
        }
      },
      { immediate: true }
    );

    // Queue selection methods (same as CommerceQueuesView)
    const receiveQueue = async queue => {
      alertError.value = '';
      state.errorsAdd = [];

      // Toggle queue selection - if clicking the same queue, deselect it
      if (state.queue && state.queue.id === queue.id) {
        state.queue = {};
        state.selectedServices = [];
        state.totalDurationRequested = 0;
        state.totalServicesRequested = 0;
        state.amountofBlocksNeeded = 0;
        state.canBook = false;
        return;
      }

      state.queue = queue;
      console.log('🏢 Queue selected:', queue);
      console.log('🏢 Queue type:', queue.type);
      console.log('🏢 Queue services:', queue.services);
      console.log('🏢 Queue collaborator:', queue.collaborator);

      // For COLLABORATOR queues, load collaborator details to get services (same as CommerceQueuesView)
      if (queue.type === 'COLLABORATOR' && queue.collaboratorId) {
        try {
          console.log('🔧 Loading collaborator details for ID:', queue.collaboratorId);
          const collaborator = await getCollaboratorDetailsById(queue.collaboratorId);
          if (collaborator && collaborator.id) {
            state.queue.collaborator = collaborator;
            state.queue.services = collaborator.services || [];
            state.queue.servicesName =
              collaborator.services && collaborator.services.length > 0
                ? collaborator.services.map(serv => serv.name)
                : [];
            console.log('🔧 ✅ Collaborator services loaded:', state.queue.services);
          }
        } catch (error) {
          console.error('🔧 ❌ Error loading collaborator details:', error);
        }
      }

      // Auto-select services for SERVICE and MULTI_SERVICE queues (same logic as preselection)
      if (queue.type === 'SERVICE' || queue.type === 'STANDARD') {
        if (queue.services && queue.services.length === 1) {
          state.selectedServices = [...queue.services];
          console.log(
            '🔧 ✅ Auto-selected single service for SERVICE/STANDARD queue:',
            state.selectedServices,
          );
        } else if (queue.servicesId && queue.servicesId.length === 1) {
          // Create a service object from servicesId for SERVICE queues
          const serviceFromId = {
            id: queue.servicesId[0],
            name: queue.name, // Use queue name as service name
            serviceInfo: {
              estimatedTime: queue.estimatedTime || 30,
              blockTime: queue.blockTime || 30,
            },
          };
          state.selectedServices = [serviceFromId];
          console.log(
            '🔧 ✅ Auto-selected service from servicesId for SERVICE/STANDARD queue:',
            state.selectedServices,
          );
        }
      } else if (queue.type === 'MULTI_SERVICE') {
        if (queue.services && queue.services.length > 0) {
          state.selectedServices = [...queue.services];
          console.log(
            '🔧 ✅ Auto-selected all services for MULTI_SERVICE queue:',
            state.selectedServices,
          );
        } else {
          // For MULTI_SERVICE, we need the full services array, can't create from IDs alone
          state.selectedServices = [];
          console.log('🔧 ⚠️ MULTI_SERVICE queue needs full services array - cleared selection');
        }
      } else {
        // Clear selected services for queues that require manual selection
        state.selectedServices = [];
        console.log('🔧 ℹ️ Cleared selected services - manual selection required');
      }

      // Calculate blocks needed after auto-selecting services
      if (state.selectedServices.length > 0) {
        state.totalDurationRequested = state.selectedServices.reduce(
          (acc, service) =>
            acc + (service.serviceInfo?.blockTime || service.serviceInfo?.estimatedTime || 0),
          0
        );
        state.amountofBlocksNeeded = Math.ceil(
          state.totalDurationRequested / (queue.blockTime || 30),
        );

        console.log('🔧 Calculated blocks needed:', {
          totalDuration: state.totalDurationRequested,
          queueBlockTime: queue.blockTime || 30,
          blocksNeeded: state.amountofBlocksNeeded,
        });
      }

      // Set available services for UI display
      if (queue.services && queue.services.length > 0) {
        state.services = queue.services;
        console.log('🔧 Available services set:', queue.services);
      }

      // Recalculate available blocks if date is already selected
      if (state.date) {
        console.log('🔧 Recalculating blocks after queue selection');
        calculateAvailableBlocks();
      }

      setCanBook();
    };

    const receiveServices = async services => {
      alertError.value = '';
      state.errorsAdd = [];
      state.services = services;
      console.log('🔧 receiveServices called with:', services);
      console.log('🔧 Current queue:', state.queue);
      setCanBook();
    };

    const receiveSelectedServices = async services => {
      state.selectedServices = services;

      // Clear selectedProcedureAmount when services change (user might select different service)
      state.selectedProcedureAmount = null;

      state.totalDurationRequested = state.selectedServices.reduce(
        (acc, service) =>
          acc + (service.serviceInfo.blockTime || service.serviceInfo.estimatedTime),
        0
      );
      state.amountofBlocksNeeded = Math.ceil(
        state.totalDurationRequested / (state.queue.blockTime || 30),
      );

      console.log('🔧 Service selection updated:', {
        servicesCount: services?.length || 0,
        totalDuration: state.totalDurationRequested,
        queueBlockTime: state.queue.blockTime || 30,
        blocksNeeded: state.amountofBlocksNeeded,
        services: services?.map(s => ({
          name: s.name,
          id: s.id,
          proceduresList: s.serviceInfo?.proceduresList,
          procedures: s.serviceInfo?.procedures,
        })),
      });

      // Log if any service has proceduresList
      const hasProceduresList = services?.some(s => {
        const pl = s.serviceInfo?.proceduresList;
        return pl && pl.trim() && pl.trim().length > 0;
      });
      console.log('🔧 Service has proceduresList:', hasProceduresList);

      // Clear date and block when services change
      state.date = null;
      state.block = null;
      state.attentionBlock = null;

      // Recalculate available blocks with new service requirements
      if (state.date) {
        calculateAvailableBlocks();
      }

      // Trigger step2PackageInfo reload when services change
      if (state.currentStep === 2) {
        await loadStep2PackageInfo();
      }

      setCanBook();
    };

    const setCanBook = () => {
      // Always set to true if we have a queue with ID - simplify the logic
      if (state.queue && state.queue.id) {
        state.canBook = true;
        console.log(
          '🔧 ✅ setCanBook: TRUE - Queue exists with ID:',
          state.queue.id,
          'Type:',
          state.queue.type,
        );
      } else {
        state.canBook = false;
        console.log('🔧 ❌ setCanBook: FALSE - No queue or no queue ID');
      }
    };

    // Legacy method for backward compatibility
    const handleQueueSelection = queue => {
      receiveQueue(queue);
    };

    const handleServiceSelection = services => {
      state.selectedServices = services || [];
      if (services && services.length > 0) {
        state.amountofBlocksNeeded = services.reduce(
          (acc, service) =>
            acc + (service.serviceInfo?.blockTime || service.serviceInfo?.estimatedTime || 0),
          0
        );
      } else {
        state.amountofBlocksNeeded = 1;
      }
    };

    const handleDateSelection = async date => {
      console.log('📅 AttentionCreationFlow - Date selection changed:', {
        oldDate: state.date,
        newDate: date,
        preselectedDate: props.preselectedDate,
        preselectedBlock: props.preselectedBlock,
      });

      state.date = date;

      // Only clear the selected block if we're changing to a different date
      // Keep preselected block if we're going back to the preselected date
      if (date !== props.preselectedDate) {
        state.block = null;
        state.attentionBlock = null; // Also clear attentionBlock
        console.log('📅 Cleared selected blocks (different date)');
      } else if (props.preselectedBlock) {
        // Determine which block to restore based on date
        const isToday = date === 'TODAY' || date === new Date().toISOString().slice(0, 10);
        if (isToday) {
          state.attentionBlock = props.preselectedBlock;
          state.block = null;
        } else {
          state.block = props.preselectedBlock;
          state.attentionBlock = null;
        }
        console.log('📅 Restored preselected block (same date)');
      }

      if (date) {
        console.log('📅 Loading blocks for date:', date);
        await loadBlocksForDate(date);
        console.log('📅 Blocks loaded, state.blocks length:', state.blocks?.length || 0);
      }
    };

    const handleBlockSelection = block => {
      console.log('🟨 AttentionCreationFlow - Block selection:', block);

      // Determine if we're selecting for TODAY (attention) or future (booking)
      const currentDate = state.date || props.preselectedDate;
      const isToday =
        currentDate === 'TODAY' || currentDate === new Date().toISOString().slice(0, 10);

      if (isToday) {
        // For TODAY - use attentionBlock (same as CommerceQueuesView.selectAttentionBlock)
        state.attentionBlock = {
          number: block.number,
          hourFrom: block.hourFrom,
          hourTo: block.hourTo,
          ...(block.blocks && { blocks: block.blocks }),
          ...(block.blockNumbers && { blockNumbers: block.blockNumbers }),
        };
        console.log('🟨 Set attentionBlock for TODAY:', state.attentionBlock);
      } else {
        // For future dates - use block (same as CommerceQueuesView)
        state.block = {
          number: block.number,
          hourFrom: block.hourFrom,
          hourTo: block.hourTo,
          ...(block.blocks && { blocks: block.blocks }),
          ...(block.blockNumbers && { blockNumbers: block.blockNumbers }),
        };
        console.log('🟨 Set block for future date:', state.block);
      }

      // Update telemedicine config if enabled (same logic as CommerceQueuesView)
      if (state.isTelemedicine && state.telemedicineConfig && block && block.hourFrom) {
        const selectedDate = state.date || props.preselectedDate;
        let dateStr;

        if (selectedDate === 'TODAY') {
          dateStr = new DateModel().toString();
        } else {
          dateStr =
            typeof selectedDate === 'string'
              ? selectedDate
              : new DateModel(selectedDate).toString();
        }

        const scheduledDateTime = new Date(dateStr + 'T' + block.hourFrom + ':00');
        state.telemedicineConfig.scheduledAt = scheduledDateTime.toISOString().slice(0, 16);
        console.log('🟨 Updated telemedicine scheduledAt:', state.telemedicineConfig.scheduledAt);
      }
    };

    // Get blocks for a specific day (same logic as NextAvailableSlot)
    const getBlocksByDay = (date = null) => {
      const targetDate = date || state.date || props.preselectedDate;
      console.log('🔷 getBlocksByDay() called for date:', targetDate);
      console.log('🔷 state.blocksByDay:', state.blocksByDay);
      console.log('🔷 queue.specificCalendar:', state.queue?.serviceInfo?.specificCalendar);

      if (!targetDate || targetDate === 'TODAY') {
        const day = new Date().getDay();
        console.log('🔷 Today is day:', day);
        const blocks = state.blocksByDay[day];
        console.log('🔷 Blocks for today:', blocks?.length || 0, blocks);
        return blocks || [];
      } else {
        // Check if using specific calendar or regular calendar
        if (state.queue?.serviceInfo?.specificCalendar === true) {
          // For specific calendar, use date string as key
          const dateStr =
            typeof targetDate === 'string' ? targetDate : new DateModel(targetDate).toString();
          console.log('🔷 Getting blocks for specific date:', dateStr);
          const blocks = state.blocksByDay[dateStr];
          console.log('🔷 Blocks for specific date:', blocks?.length || 0, blocks);
          return blocks || [];
        } else {
          // For regular calendar, convert date to day of week (same as NextAvailableSlot)
          const dateStr =
            typeof targetDate === 'string' ? targetDate : new DateModel(targetDate).toString();
          const searchDateObj = new Date(dateStr + 'T00:00:00');
          let dayOfWeek = searchDateObj.getDay();
          if (dayOfWeek === 0) dayOfWeek = 7; // Sunday becomes 7

          console.log('🔷 Converting date to day of week:', dateStr, '→', dayOfWeek);
          const blocks = state.blocksByDay[dayOfWeek];
          console.log('🔷 Blocks for day of week', dayOfWeek + ':', blocks?.length || 0, blocks);
          return blocks || [];
        }
      }
    };

    const loadBlocksForDate = async date => {
      if (!state.queue || !date) return;

      try {
        loadingHours.value = true;
        const dateStr = typeof date === 'string' ? date : new DateModel(date).toString();

        if (date === 'TODAY' || dateStr === new DateModel().toString()) {
          // Load today's blocks (same as CommerceQueuesView)
          console.log('🔵 Loading blocks for TODAY');
          state.blocksByDay = await getQueueBlockDetailsByDay(state.queue.id);
          console.log(
            '🔵 blocksByDay loaded:',
            Object.keys(state.blocksByDay || {}).length,
            'days',
          );

          // Use getBlocksByDay to get the actual blocks for today
          state.blocks = getBlocksByDay(date);
          console.log('🔵 Blocks loaded for TODAY:', state.blocks?.length || 0);

          // Load attentions for today
          loadAttentionsForToday();
        } else {
          // Load blocks for specific date (same logic as NextAvailableSlot)
          console.log('🟣 Loading blocks for specific date:', dateStr);

          // Check if queue uses specific calendar or regular calendar
          if (state.queue.serviceInfo && state.queue.serviceInfo.specificCalendar === true) {
            console.log('🟣 Using specific calendar API');
            state.blocksByDay = await getQueueBlockDetailsBySpecificDayByCommerceId(
              props.commerce.id,
              state.queue.id
            );
            console.log(
              '🟣 blocksByDay loaded (specific):',
              Object.keys(state.blocksByDay || {}).length,
              'dates',
            );
          } else {
            console.log('🟣 Using regular calendar API (by day of week)');
            state.blocksByDay = await getQueueBlockDetailsByDay(state.queue.id);
            console.log(
              '🟣 blocksByDay loaded (regular):',
              Object.keys(state.blocksByDay || {}).length,
              'days',
            );
          }

          // Use getBlocksByDay to get the actual blocks for the date
          state.blocks = getBlocksByDay(date);
          console.log('🟣 Blocks loaded for date:', state.blocks?.length || 0);

          // Load bookings for date
          loadBookingsForDate(dateStr);
        }

        // If we have a preselected block, make sure it's in the available blocks
        if (props.preselectedBlock && state.blocks.length > 0) {
          const blockExists = state.blocks.some(b => b.number === props.preselectedBlock.number);
          if (!blockExists) {
            // Add preselected block to the list if it's not there
            state.blocks.push(props.preselectedBlock);
          }
          // Ensure preselected block is set in state
          if (!state.block || state.block.number !== props.preselectedBlock.number) {
            state.block = props.preselectedBlock;
          }
        }

        // Always calculate available blocks after loading
        calculateAvailableBlocks();
        loadingHours.value = false;
      } catch (error) {
        console.error('📅 Error loading blocks:', error);
        loadingHours.value = false;
        // Still try to calculate with what we have
        calculateAvailableBlocks();
      }
    };

    const loadAttentionsForToday = async () => {
      try {
        console.log('🎯 Loading attentions for today');
        // For today, we need to get attentions to calculate availability
        // This is a simplified version - in a real implementation you'd subscribe to Firebase
        // For now, we'll set empty attentions and let the parent component handle it
        state.attentions = [];
        calculateAvailableBlocks();
      } catch (error) {
        console.error('🎯 Error loading attentions:', error);
        state.attentions = [];
        calculateAvailableBlocks();
      }
    };

    const loadBookingsForDate = async dateStr => {
      try {
        console.log('📅 Loading bookings for date:', dateStr);
        const bookings = await getPendingBookingsBetweenDates(
          props.commerce.id,
          dateStr,
          dateStr,
          state.queue.id
        );
        state.bookings = bookings || [];
        console.log('📅 Loaded bookings:', state.bookings.length);
        calculateAvailableBlocks();
      } catch (error) {
        console.error('📅 Error loading bookings:', error);
        state.bookings = [];
        calculateAvailableBlocks();
      }
    };

    const calculateAvailableBlocks = () => {
      console.log('📊 AttentionCreationFlow - calculateAvailableBlocks() called');
      console.log('📊 state.blocks:', state.blocks?.length || 0);
      console.log('📊 state.bookings:', state.bookings?.length || 0);
      console.log('📊 state.attentions:', state.attentions?.length || 0);
      console.log('📊 creationType:', props.creationType);

      // Determine availability calculation based on date (same logic as CommerceQueuesView)
      const currentDate = state.date || props.preselectedDate;
      const isToday =
        currentDate === 'TODAY' || currentDate === new Date().toISOString().slice(0, 10);

      console.log('📊 calculateAvailableBlocks - Date logic:', {
        currentDate,
        isToday,
        willCreateBooking: !isToday,
      });

      if (isToday) {
        // TODAY = attention blocks
        getAvailableAttentionBlocks();
      } else {
        // Future date = booking blocks
        getAvailableBookingBlocks();
      }
    };

    // Same logic as CommerceQueuesView for booking blocks
    const getAvailableBookingBlocks = () => {
      console.log('📊 AttentionCreationFlow - getAvailableBookingBlocks() called');
      state.availableBookingBlocks = [];
      let availableBlocks = [];
      let queueBlocks = [];

      if (state.blocks) {
        queueBlocks = state.blocks;
        console.log('📊 Queue blocks:', queueBlocks?.length || 0);

        if (queueBlocks && queueBlocks.length > 0) {
          let bookingsReserved = [];

          if (state.bookings && state.bookings.length > 0) {
            bookingsReserved = state.bookings
              .map(booking => {
                if (
                  booking.block &&
                  booking.block.blockNumbers &&
                  booking.block.blockNumbers.length > 0
                ) {
                  return booking.block.blockNumbers;
                } else if (booking.block && booking.block.number) {
                  return [booking.block.number];
                }
                return [];
              })
              .flat();
          }

          console.log('📊 Reserved blocks from bookings:', bookingsReserved);
          availableBlocks = queueBlocks.filter(block => !bookingsReserved.includes(block.number));
        } else {
          availableBlocks = queueBlocks;
        }
      }

      state.availableBookingBlocks = availableBlocks;
      console.log('📊 Final availableBookingBlocks:', state.availableBookingBlocks?.length || 0);
    };

    // Same logic as CommerceQueuesView for attention blocks
    const getAvailableAttentionBlocks = () => {
      console.log('🟣 AttentionCreationFlow - getAvailableAttentionBlocks() called');
      state.availableAttentionBlocks = [];
      let availableBlocks = [];
      let queueBlocks = [];

      if (state.blocks) {
        queueBlocks = state.blocks;
        console.log('🟣 Queue blocks:', queueBlocks?.length || 0);

        if (queueBlocks && queueBlocks.length > 0) {
          let attentionsReserved = [];

          if (state.attentions && state.attentions.length > 0) {
            // Filter attentions for today only
            const today = new Date().toDateString();
            const todayAttentions = state.attentions.filter(attention => {
              if (attention.createdAt) {
                const attentionDate = new Date(attention.createdAt.seconds * 1000);
                return attentionDate.toDateString() === today;
              }
              return false;
            });

            attentionsReserved = todayAttentions
              .map(attention => {
                if (
                  attention.block &&
                  attention.block.blockNumbers &&
                  attention.block.blockNumbers.length > 0
                ) {
                  return attention.block.blockNumbers;
                } else if (attention.block && attention.block.number) {
                  return [attention.block.number];
                }
                return [];
              })
              .flat();
          }

          console.log('🟣 Reserved blocks from attentions:', attentionsReserved);
          availableBlocks = queueBlocks.filter(block => !attentionsReserved.includes(block.number));
        } else {
          availableBlocks = queueBlocks;
        }
      }

      state.availableAttentionBlocks = availableBlocks;
      console.log(
        '🟣 Final availableAttentionBlocks:',
        state.availableAttentionBlocks?.length || 0,
      );
    };

    // Create super blocks for services that need multiple consecutive blocks
    const getAvailableSuperBlocks = (availableBlocks, blocksNeeded) => {
      if (!availableBlocks || availableBlocks.length === 0 || blocksNeeded <= 1) {
        return availableBlocks;
      }

      console.log('🔧 Creating super blocks:', {
        availableCount: availableBlocks.length,
        blocksNeeded,
      });

      const superBlocks = [];
      const availableNumbers = availableBlocks.map(block => block.number);

      for (let i = 0; i < availableBlocks.length; i++) {
        const startBlock = availableBlocks[i];
        const consecutiveNumbers = [];

        // Check if we can get consecutive blocks starting from this block
        for (let j = 0; j < blocksNeeded; j++) {
          const neededNumber = startBlock.number + j;
          if (availableNumbers.includes(neededNumber)) {
            consecutiveNumbers.push(neededNumber);
          } else {
            break; // Not consecutive, stop checking
          }
        }

        // If we found enough consecutive blocks, create a super block
        if (consecutiveNumbers.length === blocksNeeded) {
          const blocks = consecutiveNumbers
            .map(num => availableBlocks.find(block => block.number === num))
            .filter(Boolean);

          if (blocks.length === blocksNeeded) {
            const superBlock = {
              number: blocks[0].number,
              hourFrom: blocks[0].hourFrom,
              hourTo: blocks[blocks.length - 1].hourTo,
              blocks,
              blockNumbers: consecutiveNumbers,
              isSuperBlock: true,
            };
            superBlocks.push(superBlock);
          }
        }
      }

      console.log('🔧 Created super blocks:', superBlocks.length);
      return superBlocks;
    };

    const nextStep = async () => {
      if (canProceedFromStep.value) {
        let targetStep;

        // Determine next step based on current step and conditions
        if (state.currentStep === 2) {
          // From step 2, check if we need procedure amount selection
          console.log(
            '🔍 nextStep from step 2: needsProcedureAmountSelection =',
            needsProcedureAmountSelection.value,
          );
          console.log('🔍 Selected services:', state.selectedServices);
          if (needsProcedureAmountSelection.value) {
            targetStep = 3; // Go to procedure amount selection
            console.log('🔍 Navigating to step 3 (procedure amount selection)');
          } else {
            targetStep = 4; // Skip to date/block selection
            console.log('🔍 Skipping to step 4 (date/block selection)');
          }
        } else if (state.currentStep === 3) {
          // From step 3 (procedure selection), always go to step 4
          targetStep = 4;
        } else {
          targetStep = Math.min(state.currentStep + 1, 4);
        }

        state.currentStep = targetStep;

        // If we're going to step 4 (time selection), ensure blocks are loaded
        if (targetStep === 4) {
          const currentDate = state.date || props.preselectedDate;
          if (currentDate && state.queue) {
            console.log('📅 Navigating to step 4, ensuring blocks are loaded for:', currentDate);
            await loadBlocksForDate(currentDate);
          }
        }

        emit('step-change', state.currentStep);
      }
    };

    const previousStep = () => {
      if (state.currentStep === 4) {
        // From step 4, go back to step 3 if procedure selection is needed, otherwise step 2
        if (needsProcedureAmountSelection.value) {
          state.currentStep = 3;
        } else if (state.queue && !needsServiceSelection()) {
          state.currentStep = 2;
        } else {
          state.currentStep = Math.max(state.currentStep - 1, 1);
        }
      } else if (state.currentStep === 3) {
        // From step 3, go back to step 2
        state.currentStep = 2;
      } else {
        state.currentStep = Math.max(state.currentStep - 1, 1);
      }
      emit('step-change', state.currentStep);
    };

    // Handle procedure amount selection
    const handleProcedureAmountSelection = amount => {
      state.selectedProcedureAmount = amount;
      console.log('🔧 Procedure amount selected:', amount);
    };

    const submitAttention = async event => {
      // Prevent any default behavior
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (!canProceedFromStep.value) {
        alertError.value =
          t('attentionCreation.completeRequiredFields') ||
          'Por favor, complete todos los campos requeridos';
        return;
      }

      if (creatingAttention.value) {
        return;
      }

      // Set loading states to true to show spinner and disable button
      creatingAttention.value = true;
      loading.value = true;
      alertError.value = '';

      try {
        // Use preselected date if available, otherwise use state.date
        const dateToUse = props.preselectedDate || state.date;

        // Determine if we should create attention or booking based on date
        // TODAY = attention, future dates = booking (same logic as CommerceQueuesView)
        const todayStr = new Date().toISOString().slice(0, 10);
        const isTodaySubmission =
          dateToUse === 'TODAY' ||
          (dateToUse && typeof dateToUse === 'string' && dateToUse.slice(0, 10) === todayStr);

        // Determine which block to use based on date (same logic as CommerceQueuesView)
        const blockToUse = isTodaySubmission
          ? props.preselectedBlock || state.attentionBlock // TODAY uses attentionBlock
          : props.preselectedBlock || state.block; // Future uses block

        // Use clientFormData if available (from form), otherwise use state.newUser
        // ✅ Prioritize clientFormData as it contains the most up-to-date client data
        let rawUserData = {};
        if (clientFormData.value && Object.keys(clientFormData.value).length > 0) {
          rawUserData = { ...clientFormData.value };
        } else if (state.newUser && Object.keys(state.newUser).length > 0) {
          rawUserData = { ...state.newUser };
        } else if (props.clientData && Object.keys(props.clientData).length > 0) {
          // ✅ Map client data fields using helper function
          rawUserData = mapClientDataFields(props.clientData);
        } else if (props.preselectedClient && Object.keys(props.preselectedClient).length > 0) {
          // ✅ Map client data fields using helper function
          rawUserData = mapClientDataFields(props.preselectedClient);
        }

        console.log('📋 rawUserData before buildUserBody:', {
          source:
            clientFormData.value && Object.keys(clientFormData.value).length > 0
              ? 'clientFormData'
              : state.newUser && Object.keys(state.newUser).length > 0
              ? 'state.newUser'
              : props.clientData && Object.keys(props.clientData).length > 0
              ? 'props.clientData'
              : 'props.preselectedClient',
          hasName: !!rawUserData.name,
          hasLastName: !!rawUserData.lastName,
          hasPhone: !!rawUserData.phone,
          hasEmail: !!rawUserData.email,
          hasIdNumber: !!rawUserData.idNumber,
          hasClientId: !!rawUserData.clientId,
          hasId: !!rawUserData.id,
          rawUserDataObject: rawUserData, // ✅ Log full object to see what we have
          allKeys: Object.keys(rawUserData),
        });

        // ✅ If rawUserData is empty or missing critical fields, log warning
        if (!rawUserData || Object.keys(rawUserData).length === 0) {
          console.warn('⚠️ rawUserData is EMPTY! No client data available.');
        } else if (!rawUserData.name && !rawUserData.clientId && !rawUserData.id) {
          console.warn('⚠️ rawUserData missing critical fields (name, clientId, id)');
        }

        // Build user body exactly like CommerceQueuesView.buildUserBody
        // This function moves certain fields to personalInfo but preserves ALL other fields
        const buildUserBody = user => {
          // ✅ Early return if user is empty
          if (!user || Object.keys(user).length === 0) {
            console.warn('⚠️ buildUserBody received empty user object');
            return {};
          }

          const personalInfo = {};
          // ✅ Create a deep copy to preserve all fields (name, lastName, phone, email, idNumber, clientId, id, phoneCode, etc.)
          const userCopy = { ...user };
          if (userCopy.birthday) {
            personalInfo.birthday = userCopy.birthday;
            delete userCopy.birthday;
          }
          if (userCopy.addressText) {
            personalInfo.addressText = userCopy.addressText;
            delete userCopy.addressText;
          }
          if (userCopy.addressCode) {
            personalInfo.addressCode = userCopy.addressCode;
            delete userCopy.addressCode;
          }
          if (userCopy.addressComplement) {
            personalInfo.addressComplement = userCopy.addressComplement;
            delete userCopy.addressComplement;
          }
          if (userCopy.origin) {
            personalInfo.origin = userCopy.origin;
            delete userCopy.origin;
          }
          if (userCopy.code1) {
            personalInfo.code1 = userCopy.code1;
            delete userCopy.code1;
          }
          if (userCopy.code2) {
            personalInfo.code2 = userCopy.code2;
            delete userCopy.code2;
          }
          if (userCopy.code3) {
            personalInfo.code3 = userCopy.code3;
            delete userCopy.code3;
          }
          if (userCopy.healthAgreementId) {
            personalInfo.healthAgreementId = userCopy.healthAgreementId;
            delete userCopy.healthAgreementId;
          }
          if (Object.keys(personalInfo).length > 0) {
            userCopy.personalInfo = personalInfo;
          }
          return userCopy;
        };

        const bodyUser = buildUserBody(rawUserData);

        // ✅ CRITICAL: Preserve clientId explicitly (buildUserBody doesn't remove it, but ensure it's there)
        // The clientId is critical for the backend to identify existing clients
        // If we have id but no clientId, treat id as clientId (for existing clients from query-stack)
        if (rawUserData.clientId && !bodyUser.clientId) {
          bodyUser.clientId = rawUserData.clientId;
        } else if (rawUserData.id && !bodyUser.clientId && !rawUserData.clientId) {
          // If we have id but no clientId, use id as clientId (this handles cases where the client comes from query-stack)
          bodyUser.clientId = rawUserData.id;
        }

        console.log('📋 bodyUser after buildUserBody:', {
          hasName: !!bodyUser.name,
          hasLastName: !!bodyUser.lastName,
          hasPhone: !!bodyUser.phone,
          hasEmail: !!bodyUser.email,
          hasIdNumber: !!bodyUser.idNumber,
          hasClientId: !!bodyUser.clientId,
          clientIdValue: bodyUser.clientId,
          hasId: !!bodyUser.id,
          idValue: bodyUser.id,
          hasPersonalInfo: !!bodyUser.personalInfo,
          rawUserDataClientId: rawUserData.clientId,
          rawUserDataId: rawUserData.id,
          clientIdSource: rawUserData.clientId
            ? 'rawUserData.clientId'
            : rawUserData.id
            ? 'rawUserData.id (mapped)'
            : 'none',
          allKeys: Object.keys(bodyUser),
        });

        // Create newUser exactly like CommerceQueuesView
        // ✅ Only create userData if isDataActive (user data collection is required)
        // ✅ Spread bodyUser FIRST to preserve all client data, then add commerce-specific fields
        let userData = undefined;
        if (isDataActive(props.commerce)) {
          // ✅ CRITICAL: Preserve clientId explicitly before destructuring
          // The clientId must be in userData for the backend to identify existing clients
          const clientIdToPreserve = bodyUser.clientId || bodyUser.id;

          // ✅ If we have clientId, remove id to avoid backend trying to create new user
          // BUT preserve clientId explicitly
          const { id, clientId, ...bodyUserWithoutIdAndClientId } = bodyUser;

          userData = {
            ...bodyUserWithoutIdAndClientId, // ✅ This includes: name, lastName, phone, email, idNumber, personalInfo, etc. (but NOT id or clientId)
            // ✅ CRITICAL: Explicitly set clientId - this is required for the backend to find existing clients
            ...(clientIdToPreserve && { clientId: clientIdToPreserve }),
            commerceId: props.commerce.id,
            notificationOn: state.accept,
            notificationEmailOn: state.accept,
            acceptTermsAndConditions: state.accept,
          };

          console.log('📋 userData constructed:', {
            hasClientId: !!userData.clientId,
            clientId: userData.clientId,
            bodyUserClientId: bodyUser.clientId,
            bodyUserId: bodyUser.id,
            clientIdToPreserve,
            preservedExplicitly: !!clientIdToPreserve,
            allKeys: Object.keys(userData),
            userDataClientIdValue: userData.clientId,
          });
        } else {
          // If data is not active, userData should be undefined (not an empty object)
          userData = undefined;
        }

        console.log('📋 userData being sent (exact CommerceQueuesView format):', {
          hasClientFormData: !!(
            clientFormData.value && Object.keys(clientFormData.value).length > 0
          ),
          acceptTermsAndConditions: userData.acceptTermsAndConditions,
          notificationOn: userData.notificationOn,
          notificationEmailOn: userData.notificationEmailOn,
          commerceId: userData.commerceId,
          // ✅ VERIFICATION: Check if name/lastName are present
          name: userData.name,
          lastName: userData.lastName,
          phone: userData.phone,
          email: userData.email,
          idNumber: userData.idNumber,
          clientId: userData.clientId || userData.id,
          userDataKeys: Object.keys(userData),
        });

        // Prepare telemedicine config if enabled
        let telemedicineConfig = null;
        if (state.isTelemedicine && state.telemedicineConfig) {
          telemedicineConfig = {
            type: 'VIDEO', // Always VIDEO for telemedicine
            scheduledAt: state.telemedicineConfig.scheduledAt
              ? new Date(state.telemedicineConfig.scheduledAt).toISOString()
              : new Date().toISOString(),
            recordingEnabled: props.commerce?.telemedicineRecordingEnabled || false,
            notes: state.telemedicineConfig.notes || '',
          };
        }

        // Validate queue exists
        if (!state.queue || !state.queue.id) {
          alertError.value =
            t('attentionCreation.selectQueueService') || 'Por favor, seleccione una fila/serviço';
          return;
        }

        const shouldCreateBooking = !isTodaySubmission;

        console.log('📋 AttentionCreationFlow - Creation logic:', {
          dateToUse,
          isTodaySubmission,
          shouldCreateBooking,
          creationType: props.creationType,
        });

        let result;

        if (shouldCreateBooking) {
          // Create booking (same logic as CommerceQueuesView.getBooking)
          console.log('📋 Creating BOOKING for future date');
          console.log(
            '📋 Booking data - Queue ID:',
            state.queue.id,
            'Selected Services:',
            state.selectedServices?.length || 0,
          );

          // Format date for booking (same as CommerceQueuesView.formattedDate)
          const formattedDate =
            dateToUse && dateToUse !== 'TODAY'
              ? new Date(dateToUse).toISOString().slice(0, 10)
              : undefined;

          // Convert block to plain object (same as CommerceQueuesView.convertBlockToPlainObject)
          const convertedBlock = blockToUse
            ? {
                number: blockToUse.number,
                hourFrom: blockToUse.hourFrom,
                hourTo: blockToUse.hourTo,
                ...(blockToUse.blockNumbers && { blockNumbers: blockToUse.blockNumbers }),
                ...(blockToUse.blocks && { blocks: blockToUse.blocks }),
              }
            : undefined;

          // Get current channel exactly like CommerceQueuesView
          const store = globalStore();
          const currentChannel = store.getCurrentAttentionChannel;

          // ✅ Get clientId from userData or rawUserData (in case userData is undefined)
          // Priority: userData.clientId > rawUserData.clientId > userData.id > rawUserData.id
          // Note: For bookings with existing clients, clientId should be in userData.clientId
          let clientIdValue =
            userData?.clientId || rawUserData?.clientId || userData?.id || rawUserData?.id;

          // ✅ CRITICAL FIX: Query-stack IDs don't match Firebase client IDs
          // If clientId comes from query-stack (not from props.clientData), we need to find the correct Firebase ID
          // Solution: Don't send clientId, let backend find/create client by idNumber/email
          // The backend will search for existing client by idNumber/email and use the correct Firebase ID
          if (clientIdValue && !props.clientData?.clientId && !props.clientData?.id) {
            // Client data came from state.newUser (query-stack), not from props.clientData
            // Query-stack IDs (e.g., 'C3EZW0TwfptTPG7g4VOH') don't match Firebase IDs (e.g., '3AbBN5PkZqKEvGP6v7bP')
            // Don't send clientId - backend will search by idNumber/email and find/create with correct Firebase ID
            console.log(
              '⚠️ Not sending clientId - client from query-stack, ID may not match Firebase. Backend will find/create by idNumber/email',
            );
            clientIdValue = undefined;
          }

          console.log('📋 bookingData.user before sending:', {
            isUndefined: userData === undefined,
            isNull: userData === null,
            hasName: !!userData?.name,
            hasLastName: !!userData?.lastName,
            hasPhone: !!userData?.phone,
            hasEmail: !!userData?.email,
            hasIdNumber: !!userData?.idNumber,
            hasClientId: !!userData?.clientId,
            hasId: !!userData?.id,
            rawUserDataClientId: rawUserData?.clientId,
            rawUserDataId: rawUserData?.id,
            clientIdValue,
            hasClientData: !!props.clientData,
            clientDataClientId: props.clientData?.clientId,
            sendingClientId: !!clientIdValue,
            userDataKeys: userData ? Object.keys(userData) : [],
            rawUserDataKeys: rawUserData ? Object.keys(rawUserData) : [],
          });

          // ✅ Final validation: Log exactly what we're sending
          console.log('📋 FINAL bookingData.clientId being sent to backend:', {
            clientIdValue,
            sendingClientId: !!clientIdValue,
            clientIdType: typeof clientIdValue,
            clientIdLength: clientIdValue?.length,
            userDataClientId: userData?.clientId,
            userDataId: userData?.id,
            rawUserDataClientId: rawUserData?.clientId,
            rawUserDataId: rawUserData?.id,
            hasClientData: !!props.clientData,
            clientDataClientId: props.clientData?.clientId,
            reason: clientIdValue
              ? 'Sending clientId from props.clientData'
              : 'Not sending clientId - letting backend find/create by idNumber/email',
          });

          const bookingData = {
            queueId: state.queue.id,
            channel: currentChannel,
            user: userData, // Can be undefined if isDataActive is false
            date: formattedDate,
            block: convertedBlock,
            ...(clientIdValue && { clientId: clientIdValue }), // Only include clientId if we have it and are confident it's correct
            sessionId: props.sessionId,
          };

          console.log('📋 COMPLETE bookingData object being sent:', {
            queueId: bookingData.queueId,
            clientId: bookingData.clientId,
            hasClientId: !!bookingData.clientId,
            date: bookingData.date,
            hasUser: !!bookingData.user,
            userKeys: bookingData.user ? Object.keys(bookingData.user) : [],
            userClientId: bookingData.user?.clientId,
            userId: bookingData.user?.id,
            userEmail: bookingData.user?.email,
            userIdNumber: bookingData.user?.idNumber,
            strategy: bookingData.clientId
              ? 'Using clientId to find existing client'
              : 'Backend will find/create client by idNumber/email',
          });

          // Add services if selected (same format as CommerceQueuesView)
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
                  '📋 Using selectedProcedureAmount for booking (flow):',
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
              console.log('📋 servicesDetails item (flow booking):', {
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
            console.log('📋 Final servicesDetails for booking (flow):', servicesDetails);
            bookingData.servicesId = servicesId;
            bookingData.servicesDetails = servicesDetails;

            // Add selectedProcedureAmount as a separate field for backend processing
            if (state.selectedProcedureAmount) {
              bookingData.selectedProcedureAmount = state.selectedProcedureAmount;
            }
          }

          // Only send packageId if it was preselected (from package button)
          // Backend will handle validation and assignment of existing packages
          if (props.preselectedPackageId) {
            bookingData.packageId = props.preselectedPackageId;
            console.log('📦 Using preselected packageId for booking:', props.preselectedPackageId);
          }

          // Add telemedicine config if enabled (same logic as CommerceQueuesView)
          if (state.isTelemedicine && telemedicineConfig) {
            bookingData.type = 'TELEMEDICINE';
            bookingData.telemedicineConfig = telemedicineConfig;
          }

          result = await createBooking(bookingData);

          if (result && result.id) {
            emit('attention-created', result); // Keep same event name for compatibility
          } else {
            result = {
              success: false,
              error: t('attentionCreation.errorCreatingBooking') || 'Error al crear la reserva',
            };
          }
        } else {
          // Create attention for TODAY (same logic as CommerceQueuesView.getAttention)
          console.log('📋 Creating ATTENTION for TODAY');
          console.log(
            '📋 Attention data - Queue ID:',
            state.queue.id,
            'Selected Services:',
            state.selectedServices?.length || 0,
          );
          console.log('📋 blockToUse:', blockToUse);

          // Convert block to plain object (same as CommerceQueuesView.convertBlockToPlainObject)
          const convertedBlock = blockToUse
            ? {
                number: blockToUse.number,
                hourFrom: blockToUse.hourFrom,
                hourTo: blockToUse.hourTo,
                ...(blockToUse.blockNumbers && { blockNumbers: blockToUse.blockNumbers }),
                ...(blockToUse.blocks && { blocks: blockToUse.blocks }),
              }
            : undefined;

          console.log('📋 convertedBlock:', convertedBlock);

          // Get current channel exactly like CommerceQueuesView
          const store = globalStore();
          const currentChannel = store.getCurrentAttentionChannel;

          // ✅ Get clientId from userData or rawUserData (in case userData is undefined)
          const clientIdValue =
            userData?.clientId || userData?.id || rawUserData?.clientId || rawUserData?.id;

          console.log('📋 userData details before creating attentionData:', {
            isUndefined: userData === undefined,
            isNull: userData === null,
            hasClientId: !!userData?.clientId,
            hasId: !!userData?.id,
            hasName: !!userData?.name,
            hasLastName: !!userData?.lastName,
            hasPhone: !!userData?.phone,
            hasEmail: !!userData?.email,
            clientId: userData?.clientId,
            id: userData?.id,
            userKeys: userData ? Object.keys(userData) : [],
            fullUserData: userData, // ✅ Log full object
            rawUserDataKeys: Object.keys(rawUserData),
            clientIdValue,
          });

          let attentionData;
          try {
            // ✅ Get clientId from userData or rawUserData (in case userData is undefined)
            const clientIdValue =
              userData?.clientId || userData?.id || rawUserData?.clientId || rawUserData?.id;

            attentionData = {
              queueId: state.queue.id,
              channel: currentChannel,
              user: userData, // Can be undefined if isDataActive is false
              clientId: clientIdValue, // Use userData.id as fallback, or rawUserData
              block: convertedBlock,
              ...(props.preselectedPackageId && { packageId: props.preselectedPackageId }), // Add packageId if provided
            };

            console.log('📋 attentionData.user before sending:', {
              isUndefined: userData === undefined,
              isNull: userData === null,
              hasName: !!userData?.name,
              hasLastName: !!userData?.lastName,
              hasPhone: !!userData?.phone,
              hasEmail: !!userData?.email,
              hasIdNumber: !!userData?.idNumber,
              hasClientId: !!userData?.clientId,
              userDataKeys: userData ? Object.keys(userData) : [],
              fullUserData: userData, // ✅ Log full object
            });

            console.log('📋 Basic attentionData created:', attentionData);
          } catch (error) {
            console.error('📋 ❌ Error creating basic attentionData:', error);
            console.log('📋 Debug values:', {
              queueId: state.queue?.id,
              currentChannel,
              userData: userData ? 'exists' : 'null',
              clientId: userData?.clientId,
              convertedBlock,
            });
            throw error;
          }

          // Add services if selected (same format as CommerceQueuesView)
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
                  '📋 Using selectedProcedureAmount for attention (flow):',
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
              console.log('📋 servicesDetails item (flow attention):', {
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
            console.log('📋 Final servicesDetails for attention (flow):', servicesDetails);
            attentionData.servicesId = servicesId;
            attentionData.servicesDetails = servicesDetails;

            // Add selectedProcedureAmount as a separate field for backend processing
            if (state.selectedProcedureAmount) {
              attentionData.selectedProcedureAmount = state.selectedProcedureAmount;
            }

            console.log('📋 Services added to attention:', {
              servicesId,
              servicesDetails,
              selectedProcedureAmount: state.selectedProcedureAmount,
            });
          } else {
            console.log('📋 ⚠️ No services selected for attention');
          }

          // Only send packageId if it was preselected (from package button)
          // Backend will handle validation and assignment of existing packages
          if (props.preselectedPackageId) {
            attentionData.packageId = props.preselectedPackageId;
            console.log(
              '📦 Using preselected packageId for attention:',
              props.preselectedPackageId,
            );
          }

          // Add telemedicine config if enabled (same logic as CommerceQueuesView)
          if (state.isTelemedicine && telemedicineConfig) {
            attentionData.type = 'TELEMEDICINE';
            attentionData.telemedicineConfig = telemedicineConfig;
            console.log('📋 Added telemedicine config to attention');
          }

          // Use the createAttention service directly (same as CommerceQueuesView)
          console.log('📋 About to call createAttention with data:', attentionData);
          try {
            const attention = await createAttention(attentionData);
            console.log('📋 ✅ createAttention returned:', attention);
            result = { success: true, attention };
          } catch (error) {
            console.error('📋 ❌ createAttention failed:', error);
            result = { success: false, error: error.message || 'Error creating attention' };
          }
        }

        console.log('📋 Final result:', result);

        if (result.success || result.id || result.attention) {
          // Emit the created attention or booking
          const createdItem = result.attention || result;
          console.log(
            '✅ AttentionCreationFlow - Successfully created:',
            shouldCreateBooking ? 'booking' : 'attention',
            createdItem,
          );
          emit('attention-created', createdItem);
        } else {
          // Extract error message from various possible formats
          console.log('📋 ❌ Creation failed, result:', result);
          let errorMessage =
            t('attentionCreation.errorCreatingAttention') || 'Error al crear la atención';
          const errorKeys = [];

          // Use errorMessage from result if available
          if (result.errorMessage) {
            errorMessage = result.errorMessage;
          } else if (result.error) {
            // Try to get error message from response
            if (result.error.response?.data?.message) {
              errorMessage = result.error.response.data.message;
            } else if (result.error.message) {
              errorMessage = result.error.message;
            } else if (typeof result.error === 'string') {
              errorMessage = result.error;
            }
          }

          if (Array.isArray(result.errors) && result.errors.length > 0) {
            // Check if errors are translation keys (contain dots)
            const translationKeys = result.errors.filter(
              err => typeof err === 'string' && err.includes('.')
            );

            if (translationKeys.length > 0) {
              // These are validation errors - show them as a list
              errorKeys.push(...translationKeys);
              errorMessage =
                (t('attentionCreation.completeFollowingRequiredFields') ||
                  'Por favor, complete los siguientes campos requeridos') +
                ':\n' +
                translationKeys
                  .map(key => {
                    // Try to get a readable field name from the key
                    const fieldName = key.split('.').pop() || key;
                    return `• ${fieldName}`;
                  })
                  .join('\n');
            } else {
              // Regular error messages
              const errorTexts = result.errors.map(err => {
                if (typeof err === 'string') {
                  return err;
                } else if (typeof err === 'number') {
                  return `Error ${err}`;
                }
                return String(err);
              });
              if (errorTexts.length > 0) {
                errorMessage = errorTexts.join(', ');
              }
            }
          }

          alertError.value = errorMessage;
          state.errorsAdd = result.errors || [];
          emit('error', result.errors || []);
        }
      } catch (error) {
        alertError.value =
          error.message ||
          t('attentionCreation.errorCreatingAttention') ||
          'Error al crear la atención';
        state.errorsAdd = [
          error.message || t('attentionCreation.unknownError') || 'Error desconocido',
        ];
        emit('error', [
          error.message || t('attentionCreation.unknownError') || 'Error desconocido',
        ]);
      } finally {
        // Always disable loading when done
        creatingAttention.value = false;
        loading.value = false;
      }
    };

    const cancel = () => {
      emit('cancel');
    };

    // Watch for date changes to auto-load blocks
    watch(
      () => state.date,
      newDate => {
        if (newDate && state.queue) {
          loadBlocksForDate(newDate);
        }
      }
    );

    // Watch for step changes to ensure blocks are loaded when reaching step 4
    watch(
      () => state.currentStep,
      async newStep => {
        if (newStep === 4) {
          const currentDate = state.date || props.preselectedDate;
          if (currentDate && state.queue) {
            console.log('📅 Reached step 4, ensuring ALL blocks are loaded for:', currentDate);
            console.log('📅 Current state.blocks length:', state.blocks?.length || 0);
            console.log('📅 Current state.blocksByDay:', Object.keys(state.blocksByDay || {}));

            // ALWAYS reload blocks when reaching step 4 to ensure we have ALL blocks
            await loadBlocksForDate(currentDate);

            console.log('📅 After reload - state.blocks length:', state.blocks?.length || 0);
            console.log(
              '📅 After reload - state.blocksByDay:',
              Object.keys(state.blocksByDay || {}),
            );
          }
        }
      }
    );

    // Watch for preselected block and ensure it's set in state
    watch(
      () => props.preselectedBlock,
      newBlock => {
        if (newBlock) {
          state.block = newBlock;
        }
      },
      { immediate: true }
    );

    // Watch for block changes to update telemedicine scheduledAt
    watch(
      () => state.block,
      newBlock => {
        if (
          state.isTelemedicine &&
          state.telemedicineConfig &&
          state.date &&
          newBlock &&
          newBlock.hourFrom
        ) {
          const dateStr =
            typeof state.date === 'string' ? state.date : new DateModel(state.date).toString();
          const scheduledDateTime = new Date(dateStr + 'T' + newBlock.hourFrom + ':00');
          state.telemedicineConfig.scheduledAt = scheduledDateTime.toISOString().slice(0, 16);
        }
      }
    );

    // Temporary watcher for debugging canBook changes
    watch(
      () => state.canBook,
      (newValue, oldValue) => {
        console.log('🔧 WATCH: canBook changed from', oldValue, 'to', newValue, {
          queueId: state.queue?.id,
          queueType: state.queue?.type,
          servicesCount: state.selectedServices?.length || 0,
          availableServicesCount: state.queue?.services?.length || 0,
          currentStep: state.currentStep,
        });
      }
    );

    const formatTelemedicineDate = dateTimeString => {
      if (!dateTimeString) return '';
      try {
        const date = new Date(dateTimeString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year}, ${hours}:${minutes}`;
      } catch (error) {
        return dateTimeString;
      }
    };

    const formatSelectedBlockDateTime = computed(() => {
      if (!state.date) return '';

      // Determine which block to use based on date type (same logic as selectedBlockNumber)
      const currentDate = state.date || props.preselectedDate;
      const isToday =
        currentDate === 'TODAY' || currentDate === new Date().toISOString().slice(0, 10);

      const currentBlock = isToday
        ? state.attentionBlock || props.preselectedBlock
        : state.block || props.preselectedBlock;

      if (!currentBlock) return '';

      try {
        const dateStr = isToday
          ? new Date().toISOString().slice(0, 10)
          : typeof state.date === 'string'
          ? state.date
          : new DateModel(state.date).toString();

        const [year, month, day] = dateStr.split('-');
        const hourFrom = currentBlock.hourFrom || '';
        const hourTo = currentBlock.hourTo || '';

        if (hourFrom && hourTo) {
          return `${day}/${month}/${year}, ${hourFrom} - ${hourTo}`;
        } else if (hourFrom) {
          return `${day}/${month}/${year}, ${hourFrom}`;
        } else {
          return `${day}/${month}/${year}`;
        }
      } catch (error) {
        return '';
      }
    });

    // Handle quick slot selection from NextAvailableSlot component
    const handleQuickSlotSelection = async slotData => {
      console.log('🚀 AttentionCreationFlow - Quick slot selection:', {
        date: slotData.date,
        block: slotData.block,
        blockNumber: slotData.block?.number,
        hourFrom: slotData.block?.hourFrom,
        hourTo: slotData.block?.hourTo,
      });

      // Set the selected date
      state.date = slotData.date;

      // Determine if we're selecting for TODAY (attention) or future (booking)
      const isToday =
        slotData.date === 'TODAY' || slotData.date === new Date().toISOString().slice(0, 10);

      if (isToday) {
        // For TODAY - use attentionBlock (same as manual selection)
        state.attentionBlock = {
          number: slotData.block.number,
          hourFrom: slotData.block.hourFrom,
          hourTo: slotData.block.hourTo,
          ...(slotData.block.blocks && { blocks: slotData.block.blocks }),
          ...(slotData.block.blockNumbers && { blockNumbers: slotData.block.blockNumbers }),
        };
        state.block = null; // Clear future block
        console.log('🚀 Set attentionBlock for TODAY quick slot:', state.attentionBlock);
      } else {
        // For future dates - use block (same as manual selection)
        state.block = {
          number: slotData.block.number,
          hourFrom: slotData.block.hourFrom,
          hourTo: slotData.block.hourTo,
          ...(slotData.block.blocks && { blocks: slotData.block.blocks }),
          ...(slotData.block.blockNumbers && { blockNumbers: slotData.block.blockNumbers }),
        };
        state.attentionBlock = null; // Clear attention block
        console.log('🚀 Set block for future date quick slot:', state.block);
      }

      // Load blocks for the selected date to ensure proper state
      await loadBlocksForDate(slotData.date);

      // If telemedicine is enabled, update scheduledAt with the new block time
      if (
        state.isTelemedicine &&
        state.telemedicineConfig &&
        slotData.date &&
        slotData.block &&
        slotData.block.hourFrom
      ) {
        const dateStr =
          typeof slotData.date === 'string'
            ? slotData.date
            : new DateModel(slotData.date).toString();
        const scheduledDateTime = new Date(dateStr + 'T' + slotData.block.hourFrom + ':00');
        state.telemedicineConfig.scheduledAt = scheduledDateTime.toISOString().slice(0, 16);
      }

      console.log('✅ AttentionCreationFlow - Quick slot applied successfully');
    };

    // Handle show manual selection
    const handleShowManualSelection = () => {
      // Just focus on the manual selection area - no specific scrolling needed
      // The user can see the manual date/time selection interface
      console.log('📅 AttentionCreationFlow - Showing manual selection');
    };

    // Get all available blocks - show ALL blocks but mark availability status
    const getAllAvailableBlocks = computed(() => {
      console.log('🔍 getAllAvailableBlocks computed called');
      console.log('🔍 Current date:', state.date || props.preselectedDate);
      console.log('🔍 state.blocks:', state.blocks?.length || 0, state.blocks);
      console.log('🔍 availableBookingBlocks:', state.availableBookingBlocks?.length || 0);
      console.log('🔍 availableAttentionBlocks:', state.availableAttentionBlocks?.length || 0);

      const blockMap = new Map();
      const currentDate = state.date || props.preselectedDate;
      const isToday =
        currentDate === 'TODAY' || currentDate === new Date().toISOString().slice(0, 10);

      // Get ALL blocks for the current date (same logic as CommerceQueuesView)
      let allBlocks = [];

      // First try to use state.blocks (already loaded)
      if (state.blocks && state.blocks.length > 0) {
        console.log('🔍 Using state.blocks as base:', state.blocks.length);
        allBlocks = [...state.blocks];
      }
      // If no state.blocks, try to get blocks using getBlocksByDay
      else if (state.blocksByDay && currentDate) {
        console.log('🔍 No state.blocks, getting blocks using getBlocksByDay');
        allBlocks = getBlocksByDay(currentDate) || [];
        console.log('🔍 Got blocks from getBlocksByDay:', allBlocks.length);
      }
      // Last resort - use available blocks (this might be incomplete)
      else {
        console.log('🔍 No blocks available, using available blocks as fallback');
        const availableBlocks = isToday
          ? state.availableAttentionBlocks
          : state.availableBookingBlocks;
        allBlocks = availableBlocks || [];
        console.log('🔍 Using available blocks as fallback:', allBlocks.length);
      }

      // Add all blocks to the map
      allBlocks.forEach(block => {
        blockMap.set(block.number, {
          ...block,
          isAvailable: true, // Will be updated below based on availability
        });
      });

      // Mark blocks as available/unavailable based on date (same logic as CommerceQueuesView)
      // (currentDate and isToday already declared above)

      const availableBlocks = isToday
        ? state.availableAttentionBlocks // TODAY = attention blocks
        : state.availableBookingBlocks; // Future = booking blocks

      if (availableBlocks && availableBlocks.length > 0) {
        const availableNumbers = availableBlocks.map(b => b.number);

        // Update availability status for all blocks
        blockMap.forEach((block, number) => {
          blockMap.set(number, {
            ...block,
            isAvailable: availableNumbers.includes(number),
          });
        });
      } else {
        // If no available blocks calculated yet, mark all as unavailable except preselected
        blockMap.forEach((block, number) => {
          blockMap.set(number, {
            ...block,
            isAvailable: props.preselectedBlock?.number === number,
          });
        });
      }

      // Always include preselected block if it's not already in the list
      if (props.preselectedBlock && !blockMap.has(props.preselectedBlock.number)) {
        blockMap.set(props.preselectedBlock.number, {
          ...props.preselectedBlock,
          isAvailable: true,
        });
      }

      // Convert map to array and sort by hourFrom
      let sortedBlocks = Array.from(blockMap.values()).sort((a, b) => {
        const timeA = a.hourFrom || '';
        const timeB = b.hourFrom || '';
        return timeA.localeCompare(timeB);
      });

      // Apply super block logic if multiple blocks are needed
      if (state.amountofBlocksNeeded > 1) {
        console.log('🔍 Applying super block logic - blocks needed:', state.amountofBlocksNeeded);
        const availableBlocks = sortedBlocks.filter(b => b.isAvailable);
        const superBlocks = getAvailableSuperBlocks(availableBlocks, state.amountofBlocksNeeded);

        // Mark super blocks as available and regular blocks as unavailable if they don't meet requirements
        sortedBlocks = sortedBlocks.map(block => ({
          ...block,
          isAvailable: superBlocks.some(sb =>
            sb.isSuperBlock ? sb.blockNumbers.includes(block.number) : sb.number === block.number
          ),
        }));

        // Replace individual blocks with super blocks where applicable
        const finalBlocks = [];
        const processedNumbers = new Set();

        superBlocks.forEach(superBlock => {
          finalBlocks.push(superBlock);
          superBlock.blockNumbers.forEach(num => processedNumbers.add(num));
        });

        // Add remaining individual blocks that weren't part of super blocks
        sortedBlocks.forEach(block => {
          if (!processedNumbers.has(block.number)) {
            finalBlocks.push({ ...block, isAvailable: false }); // Mark as unavailable since they don't meet requirements
          }
        });

        sortedBlocks = finalBlocks.sort((a, b) => a.number - b.number);
      }

      console.log('🔍 Final sorted blocks:', sortedBlocks.length);
      console.log('🔍 Available blocks:', sortedBlocks.filter(b => b.isAvailable).length);

      return sortedBlocks;
    });

    // Force refresh blocks - useful for debugging and ensuring data is current
    const refreshBlocks = async () => {
      const currentDate = state.date || props.preselectedDate;
      if (currentDate && state.queue) {
        console.log('🔄 Force refreshing blocks for:', currentDate);
        await loadBlocksForDate(currentDate);
      }
    };

    // Summary card methods and computed properties (using inline toggle like CommerceQueuesView)

    const totalDuration = computed(() => {
      if (state.selectedServices && state.selectedServices.length > 0) {
        return state.selectedServices.reduce(
          (acc, service) =>
            acc + (service.serviceInfo?.blockTime || service.serviceInfo?.estimatedTime || 0),
          0
        );
      }
      return 0;
    });

    // Helper function to convert duration from minutes to readable format (same as CommerceQueuesView)
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

    // Track the selected block number for reactivity (same logic as CommerceQueuesView)
    const selectedBlockNumber = computed(() => {
      const currentDate = state.date || props.preselectedDate;
      const isToday =
        currentDate === 'TODAY' || currentDate === new Date().toISOString().slice(0, 10);

      // For TODAY, check attentionBlock; for future dates, check block
      const currentBlock = isToday
        ? state.attentionBlock || props.preselectedBlock
        : state.block || props.preselectedBlock;

      return currentBlock?.number || null;
    });

    // Check if a block is currently selected (same logic as CommerceQueuesView template)
    const isBlockSelected = block => {
      if (!block || !block.number) return false;

      const currentDate = state.date || props.preselectedDate;
      const isToday =
        currentDate === 'TODAY' || currentDate === new Date().toISOString().slice(0, 10);

      if (isToday) {
        // Check against attentionBlock for TODAY
        return (
          (state.attentionBlock && state.attentionBlock.number === block.number) ||
          (state.block && state.block.number === block.number)
        );
      } else {
        // Check against block for future dates
        return (
          (state.block && state.block.number === block.number) ||
          (state.attentionBlock && state.attentionBlock.number === block.number)
        );
      }
    };

    // Check if a block is the preselected one
    const isBlockPreselected = block => {
      if (!block || !block.number || !props.preselectedBlock) return false;
      return props.preselectedBlock.number === block.number;
    };

    // Check if a block is reserved (unavailable)
    const isBlockReserved = block => {
      if (!block) return false;
      // Use the availability status from getAllAvailableBlocks
      return !block.isAvailable;
    };

    // Get tooltip for block button
    const getBlockTooltip = block => {
      if (!block) return '';

      let tooltip = `${block.hourFrom} - ${block.hourTo}`;

      if (isBlockPreselected(block)) {
        tooltip += ` (${t('attentionCreation.preselected') || 'Pré-selecionado'})`;
      }

      if (isBlockReserved(block)) {
        tooltip += ` - ${t('attentionCreation.reserved') || 'Reservado'}`;
      } else {
        tooltip += ` - ${t('attentionCreation.available') || 'Disponível'}`;
      }

      return tooltip;
    };

    // Format date for display
    const formatDateForDisplay = dateStr => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const isToday = date.toDateString() === today.toDateString();
        const isTomorrow = date.toDateString() === tomorrow.toDateString();

        if (isToday) return t('attentionCreation.today') || 'Hoje';
        if (isTomorrow) return t('attentionCreation.tomorrow') || 'Amanhã';

        return date.toLocaleDateString('pt-BR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch (error) {
        return dateStr;
      }
    };

    // Computed properties for date input min/max values
    const minDate = computed(() => new DateModel().toString());
    const maxDate = computed(() => new DateModel().addDays(90).toString());

    // Computed property to check if telemedicine option should be shown
    // Only shows when: commerce has telemedicine-active feature enabled AND queue has telemedicineEnabled = true
    const showTelemedicineOption = computed(() => {
      if (!state.queue || !props.commerce) {
        return false;
      }
      // Don't show for NODEVICE queues
      if (state.queue.type === 'NODEVICE') {
        return false;
      }
      // Check both conditions: commerce feature active AND queue telemedicineEnabled
      return isTelemedicineEnabled(props.commerce, state.queue);
    });

    return {
      // Props (for template access)
      preselectedQueue: preselectedQueueRef,
      preselectedDate: preselectedDateRef,
      preselectedBlock: preselectedBlockRef,
      preselectedClient: preselectedClientRef,
      clientData: clientDataRef,
      preselectedServiceId: preselectedServiceIdRef,
      // Reactive data
      loading,
      loadingHours,
      alertError,
      checkboxId,
      state,
      needsClientForm,
      needsQueueSelection,
      needsServiceSelection,
      isPreselectedQueueValid,
      canProceedFromStep,
      isLastStep,
      creatingAttention,
      clientFormData,
      handleClientData,
      handleQueueSelection,
      receiveQueue,
      receiveServices,
      receiveSelectedServices,
      setCanBook,
      handleServiceSelection,
      handleDateSelection,
      handleBlockSelection,
      nextStep,
      previousStep,
      submitAttention,
      cancel,
      showConditions,
      isDataActive,
      resetState,
      formatTelemedicineDate,
      formatSelectedBlockDateTime,
      selectedBlockNumber,
      getAllAvailableBlocks,
      getAvailableSuperBlocks,
      isBlockSelected,
      isTelemedicineEnabled,
      handleQuickSlotSelection,
      handleShowManualSelection,
      refreshBlocks,
      getBlocksByDay,
      summaryExpanded,
      totalDuration,
      convertDuration,
      isBlockPreselected,
      isBlockReserved,
      getBlockTooltip,
      formatDateForDisplay,
      minDate,
      maxDate,
      showTelemedicineOption,
      packageInfo,
      loadingPackageInfo,
      step2PackageInfo,
      loadingStep2PackageInfo,
      t,
      handleAcknowledgeAlert: async alertId => {
        try {
          // TODO: Call acknowledge API
          state.clinicalAlerts = state.clinicalAlerts.filter(a => a.id !== alertId);
        } catch (error) {
          // Error acknowledging alert
        }
      },
    };
  },
};
</script>

<template>
  <div :class="['attention-creation-flow', `mode-${mode}`]">
    <Spinner :show="loading || creatingAttention"></Spinner>
    <Alert :show="!!alertError" :stack="alertError"></Alert>

    <!-- Clinical Alerts Banner -->
    <ClinicalAlertsBanner
      v-if="state.clinicalAlerts && state.clinicalAlerts.length > 0"
      :alerts="state.clinicalAlerts"
      @acknowledge="handleAcknowledgeAlert"
      class="mb-3"
    />

    <!-- Step 1: Client Form -->
    <div v-if="state.currentStep === 1 && needsClientForm" class="step-container">
      <ClientForm
        :show="true"
        :commerce="commerce"
        :receive-data="handleClientData"
        :client="undefined"
        :errors-add="state.errorsAdd"
        :client-front="true"
      />
    </div>

    <!-- Step 2: Queue and Service Selection -->
    <div v-if="state.currentStep === 2" class="step-container">
      <!-- Show preselected queue info if exists and is valid -->
      <div
        v-if="preselectedQueue && isPreselectedQueueValid()"
        class="preselected-queue-display mb-4"
      >
        <div class="preselected-queue-card">
          <div class="preselected-header">
            <i class="bi bi-check-circle-fill me-2"></i>
            <span class="preselected-title">{{
              $t('attentionCreation.preselectedQueue') || 'Fila Pré-selecionada'
            }}</span>
          </div>
          <div class="preselected-content">
            <div class="queue-name">{{ preselectedQueue.name }}</div>
            <small class="change-hint">
              {{
                $t('attentionCreation.canChangeBelow') ||
                'Você pode alterar a seleção abaixo se necessário'
              }}
            </small>
          </div>
        </div>
      </div>

      <!-- QUEUES SELECTOR (always show to allow changes) -->
      <QueueForm
        :commerce="commerce"
        :queues="queues"
        :grouped-queues="groupedQueues"
        :queue-id="undefined"
        :accept="state.accept"
        :collaborators="collaborators"
        :receive-queue="receiveQueue"
        :receive-services="receiveServices"
        :preselected-service-id="preselectedServiceId"
      />

      <!-- SERVICES SELECTOR (show when queue is selected) -->
      <div v-if="state.queue?.id">
        <ServiceForm
          :key="state.queue?.id"
          :commerce="commerce"
          :queue="state.queue"
          :selected-services="state.selectedServices"
          :receive-selected-services="receiveSelectedServices"
          :preselected-service-id="preselectedServiceId"
        />
      </div>
    </div>

    <!-- Step 2b: Queue Display (if preselected) -->
    <div v-else-if="false" class="step-container">
      <div class="selected-queue-display">
        <div class="queue-card">
          <div class="queue-card-header">
            <div class="queue-icon-wrapper">
              <i class="bi bi-person-lines-fill"></i>
            </div>
            <div class="queue-card-content">
              <h5 class="queue-card-label">
                {{ $t('commerceQueuesView.queue') || 'Fila' }}
              </h5>
              <p class="queue-card-name">{{ state.queue?.name }}</p>
            </div>
          </div>
          <div
            v-if="state.selectedServices && state.selectedServices.length > 0"
            class="queue-card-services"
          >
            <div class="queue-card-services-label">
              <i class="bi bi-list-check me-2"></i>
              {{ $t('commerceQueuesView.services') || 'Serviços' }}
            </div>
            <div class="queue-card-services-list">
              <span
                v-for="service in state.selectedServices"
                :key="service.id"
                class="service-badge"
              >
                {{ service.name }}
              </span>
            </div>
          </div>
          <div v-if="state.queue?.description" class="queue-card-description">
            <i class="bi bi-info-circle me-2"></i>
            <span>{{ state.queue.description }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: Procedure Amount Selection (if needed) -->
    <div v-if="state.currentStep === 3 && needsProcedureAmountSelection" class="step-container">
      <div class="procedure-selection-container">
        <div class="choose-attention py-2 mb-3">
          <i class="bi bi-list-check h5 m-1"></i>
          <span class="fw-bold h6">{{
            $t('attentionCreation.selectProcedureAmount') || 'Selecciona la cantidad de sesiones'
          }}</span>
        </div>

        <div
          v-if="state.selectedServices && state.selectedServices.length > 0"
          class="selected-service-info mb-3"
        >
          <div class="service-info-card">
            <i class="bi bi-tags-fill me-2"></i>
            <span class="fw-bold">{{ state.selectedServices[0].name }}</span>
          </div>
        </div>

        <div class="procedure-amount-grid">
          <button
            v-for="amount in availableProcedureAmounts"
            :key="amount"
            type="button"
            class="procedure-amount-button"
            :class="{ 'procedure-amount-selected': state.selectedProcedureAmount === amount }"
            @click="handleProcedureAmountSelection(amount)"
          >
            <div class="procedure-amount-value">{{ amount }}</div>
            <div class="procedure-amount-label">
              {{ $t('attentionCreation.sessions') || 'sesiones' }}
            </div>
          </button>
        </div>

        <div v-if="state.selectedProcedureAmount" class="selected-procedure-info mt-3">
          <div class="alert alert-info d-flex align-items-center">
            <i class="bi bi-check-circle-fill me-2"></i>
            <div>
              <strong
                >{{ $t('attentionCreation.selectedAmount') || 'Cantidad seleccionada' }}:</strong
              >
              {{ state.selectedProcedureAmount }}
              {{ $t('attentionCreation.sessions') || 'sesiones' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 4: Date/Block Selection -->
    <div v-if="state.currentStep === 4" class="step-container">
      <!-- Next Available Slot Component -->
      <div v-if="state.queue && state.queue.id && commerce && commerce.id" class="row g-1 m-2">
        <div class="col">
          <NextAvailableSlot
            :commerce="commerce"
            :queue="state.queue"
            :selected-services="state.selectedServices"
            @slot-selected="handleQuickSlotSelection"
            @show-manual-selection="handleShowManualSelection"
          />
        </div>
      </div>

      <!-- Manual date/block selector -->
      <div class="date-block-selector">
        <!-- Always show date selection -->
        <div class="date-selection mb-4">
          <div class="choose-attention py-2 mb-3">
            <i class="bi bi-calendar3 h5 m-1"></i>
            <span class="fw-bold h6">{{
              $t('commerceQueuesView.selectDay') || 'Selecionar Data'
            }}</span>
          </div>
          <input
            type="date"
            :value="state.date || preselectedDate || ''"
            @input="handleDateSelection($event.target.value)"
            :min="minDate"
            :max="maxDate"
            class="form-control date-input"
          />
          <div v-if="state.date || preselectedDate" class="selected-date-info mt-2">
            <small class="text-muted">
              <i class="bi bi-calendar-check me-1"></i>
              {{ t('attentionCreation.selectedDate') || 'Data selecionada' }}:
              <strong>{{ formatDateForDisplay(state.date || preselectedDate) }}</strong>
            </small>
          </div>
        </div>

        <!-- Always show block selection when we have a date -->
        <div v-if="state.date || preselectedDate" class="block-selection">
          <div class="choose-attention py-2 mb-3">
            <i class="bi bi-clock-fill h5 m-1"></i>
            <span class="fw-bold h6">{{
              $t('commerceQueuesView.selectBlock') || 'Selecione o Horário'
            }}</span>
          </div>

          <div v-if="loadingHours">
            <Spinner :show="true"></Spinner>
            <p class="text-center text-muted mt-2">
              {{
                t('attentionCreation.loadingAvailableHours') || 'Carregando horários disponíveis...'
              }}
            </p>
          </div>

          <!-- Show all available blocks - exact template structure as CommerceQueuesView -->
          <div v-else-if="getAllAvailableBlocks.length > 0" class="mb-2">
            <div class="time-slot-grid">
              <button
                v-for="block in getAllAvailableBlocks"
                :key="block.number"
                type="button"
                class="time-slot-button"
                :class="{
                  'time-slot-selected': isBlockSelected(block),
                  'time-slot-preselected': isBlockPreselected(block),
                }"
                @click="handleBlockSelection(block)"
              >
                <div class="time-start">{{ block.hourFrom }}</div>
                <div class="time-end">{{ block.hourTo }}</div>
              </button>
            </div>
          </div>

          <div v-else class="no-blocks-available">
            <div class="alert alert-warning d-flex align-items-center">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <div>
                <strong>{{
                  t('commerceQueuesView.noAvailableHours') || 'Nenhum horário disponível'
                }}</strong
                ><br />
                <small>{{
                  t('commerceQueuesView.tryAnotherDate') || 'Tente selecionar outra data'
                }}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Telemedicine Option (only if commerce feature is active AND queue has telemedicineEnabled) -->
      <div v-if="showTelemedicineOption" class="telemedicine-option mb-4">
        <!-- Debug info -->
        <div class="form-check form-switch mt-2">
          <input
            class="form-check-input"
            type="checkbox"
            :id="`telemedicine-${Date.now()}`"
            v-model="state.isTelemedicine"
            @change="handleTelemedicineToggle"
          />
          <label class="form-check-label" :for="`telemedicine-${Date.now()}`">
            <i class="bi bi-camera-video me-2"></i>
            <strong>{{
              $t('attentionCreation.telemedicineConsultation') || 'Consulta por Telemedicina'
            }}</strong>
          </label>
        </div>

        <!-- Telemedicine Configuration removed - not needed in modal -->
      </div>
    </div>

    <!-- NotificationConditions Checkbox - if required (before buttons) -->
    <div v-if="isLastStep && showConditions()" class="conditions-container">
      <div class="form-check">
        <input class="form-check-input" type="checkbox" :id="checkboxId" v-model="state.accept" />
        <label class="form-check-label" :for="checkboxId">
          {{ $t('notificationConditions.content') || 'Aceito os termos e condições' }}
          <a class="nav-link d-inline" data-bs-toggle="modal" data-bs-target="#conditionsModal">
            {{ $t('notificationConditions.action') || 'Ver condições' }}
          </a>
        </label>
      </div>
    </div>

    <!-- Navigation -->
    <div class="button-navigation-container">
      <!-- Booking Summary Card (exact copy from CommerceQueuesView) -->
      <div v-if="state.currentStep === 4 && state.queue?.id" class="booking-summary-card m-1">
        <!-- Toggle Button Header -->
        <div class="summary-header">
          <button
            class="summary-toggle-btn"
            @click="summaryExpanded = !summaryExpanded"
            type="button"
          >
            <i :class="summaryExpanded ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
          </button>
        </div>

        <!-- Collapsible Content -->
        <Transition name="expand">
          <div v-show="summaryExpanded" class="summary-content">
            <!-- Professional/Queue Info -->
            <div class="summary-item" v-if="state.queue.name">
              <i class="bi bi-person-circle summary-icon"></i>
              <div class="summary-details">
                <span class="summary-label">{{ $t('commerceQueuesView.queue') || 'Fila' }}:</span>
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
                  >{{ $t('commerceQueuesView.services') || 'Servicios' }}:</span
                >
                <span class="summary-value">{{
                  state.selectedServices.map(s => s.name).join(', ')
                }}</span>
              </div>
            </div>

            <!-- Duration Info -->
            <div class="summary-item" v-if="state.totalDurationRequested > 0">
              <i class="bi bi-stopwatch-fill summary-icon"></i>
              <div class="summary-details">
                <span class="summary-label">{{
                  $t('commerceQueuesView.totalDuration') || 'Duración total'
                }}</span>
                <span class="summary-value">{{
                  convertDuration(state.totalDurationRequested)
                }}</span>
              </div>
            </div>

            <!-- Package Info -->
            <div class="summary-item package-info-item" v-if="packageInfo">
              <i class="bi bi-box-seam summary-icon package-icon"></i>
              <div class="summary-details">
                <span class="summary-label">{{ $t('package.package') || 'Paquete' }}:</span>
                <span class="summary-value package-value">
                  {{ packageInfo.currentSession }}/{{ packageInfo.totalSessions }}
                  <span class="package-name" v-if="packageInfo.name">({{ packageInfo.name }})</span>
                </span>
              </div>
            </div>

            <!-- Date & Time Group (only when date/block selected) -->
            <div class="summary-datetime-group" v-if="state.date || preselectedDate">
              <!-- Date Info -->
              <div class="summary-item">
                <i class="bi bi-calendar-event summary-icon"></i>
                <div class="summary-details">
                  <span class="summary-label">{{ $t('commerceQueuesView.date') || 'Data' }}:</span>
                  <span class="summary-value">{{
                    formatDateForDisplay(state.date || preselectedDate)
                  }}</span>
                </div>
              </div>

              <!-- Time Info -->
              <div class="summary-item" v-if="selectedBlockNumber">
                <i class="bi bi-clock-fill summary-icon"></i>
                <div class="summary-details">
                  <span class="summary-label">{{ $t('commerceQueuesView.time') || 'Hora' }}:</span>
                  <span class="summary-value">{{ formatSelectedBlockDateTime }}</span>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Buttons Row -->
      <div class="buttons-row">
        <!-- Back Button -->
        <button
          v-if="state.currentStep > 1"
          class="btn btn-md btn-size fw-bold btn-back-sticky rounded-pill px-4"
          @click="previousStep"
        >
          <i class="bi bi-arrow-left-circle me-2"></i>
          {{ $t('collaboratorBookingsView.return') || 'Voltar' }}
        </button>

        <!-- Next/Continue Button -->
        <button
          v-if="!isLastStep"
          type="button"
          class="btn btn-lg flex-grow-1 btn-size fw-bold btn-next-sticky rounded-pill px-5 py-3"
          @click="nextStep"
          :disabled="!canProceedFromStep"
          :title="
            !canProceedFromStep
              ? $t('attentionCreation.completeRequiredFields') ||
                'Complete todos los campos requeridos'
              : ''
          "
        >
          {{ $t('continue') || 'Continuar' }}
          <i class="bi bi-arrow-right-circle-fill ms-2"></i>
        </button>

        <!-- Confirm Button -->
        <button
          v-if="isLastStep"
          type="button"
          class="btn btn-lg flex-grow-1 btn-size fw-bold btn-confirm-sticky rounded-pill px-5 py-3"
          @click="submitAttention"
          :disabled="!canProceedFromStep || creatingAttention"
          :title="
            !canProceedFromStep
              ? $t('attentionCreation.completeRequiredFields') ||
                'Complete todos los campos requeridos'
              : creatingAttention
              ? $t('attentionCreation.creatingAttention') || 'Creando atención...'
              : $t('attentionCreation.confirmCreation') || 'Confirmar creación de atención'
          "
        >
          <span v-if="creatingAttention">
            <span
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            ></span>
            {{ $t('commerceQueuesView.creating') || 'Creando...' }}
          </span>
          <span v-else>
            {{ $t('commerceQueuesView.confirm') || 'Confirmar' }}
            <i class="bi bi-check-circle-fill ms-2"></i>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.attention-creation-flow {
  width: 100%;
}

.step-container {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.step-container > * {
  width: 100%;
  max-width: 100%;
}

/* Override ClientForm offset in modal context */
.step-container .data-card {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.step-container .col.offset-md-1 {
  margin-left: 0 !important;
}

/* Center all form elements in step 1 */
.step-container .choose-attention {
  text-align: center;
}

.step-container .data-card .row {
  justify-content: center;
}

.step-container .form-group,
.step-container .mb-3,
.step-container .col-6,
.step-container .col-12 {
  text-align: center;
}

.step-container .form-control,
.step-container .form-select {
  text-align: left; /* Keep input text left-aligned for readability */
}

/* Center specific ClientForm elements */
.step-container .data-card h6,
.step-container .data-card .fw-bold,
.step-container .data-card p,
.step-container .data-card .text-muted,
.step-container .data-card .btn {
  text-align: center !important;
  display: block;
  margin: 0 auto;
}

.step-container .data-card .btn {
  width: auto;
  display: inline-block;
}

/* Center form labels and help text */
.step-container .form-label,
.step-container .small,
.step-container .text-muted {
  text-align: center !important;
  display: block;
}

/* Center greeting text */
.step-container .alert,
.step-container .alert-success {
  text-align: center !important;
}

/* Center NextAvailableSlot component in step 4 */
.step-container .next-available-slot {
  justify-content: center;
  width: 100%;
}

.step-container .next-slot-card {
  margin: 0 auto;
  max-width: 500px;
  width: 100%;
}

.step-container .next-slot-header,
.step-container .next-slot-content,
.step-container .next-slot-info,
.step-container .next-slot-actions {
  text-align: center;
}

.step-container .next-slot-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.step-container .next-slot-actions .btn {
  width: auto;
  min-width: 200px;
}

/* Hide "Ver mais horários" button in modal context */
.step-container .next-slot-actions .btn-manual {
  display: none !important;
}

.button-navigation-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem 0;
  margin-top: 1rem;
  border-top: 1px solid rgba(169, 169, 169, 0.2);
}

.buttons-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  width: 100%;
}

/* Back Button Styles */
.btn-back-sticky {
  background: transparent !important;
  border: 1.5px solid rgba(169, 169, 169, 0.3) !important;
  color: #000000 !important;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-back-sticky:hover:not(:disabled) {
  background: rgba(169, 169, 169, 0.1) !important;
  border-color: rgba(169, 169, 169, 0.5) !important;
  transform: translateX(-3px);
}

/* Next Button Styles */
.btn-next-sticky {
  background: linear-gradient(
    135deg,
    var(--azul-turno, #004aad) 0%,
    var(--verde-tu, #00c2cb) 100%
  ) !important;
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

.conditions-container {
  width: 100%;
  margin-bottom: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 0.5rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.conditions-container .form-check {
  margin: 0;
}

.conditions-container .form-check-label {
  font-size: 0.9rem;
  color: #495057;
  cursor: pointer;
  line-height: 1.5;
}

.conditions-container .form-check-input {
  margin-top: 0.25rem;
  cursor: pointer;
}

.conditions-container .nav-link {
  color: var(--azul-turno, #004aad);
  text-decoration: underline;
  font-weight: 600;
}

.conditions-container .nav-link:hover {
  color: var(--verde-tu, #00c2cb);
}

.selected-queue-display {
  padding: 1rem;
}

.queue-card {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.05) 0%, rgba(0, 194, 203, 0.05) 100%);
  border: 2px solid var(--azul-turno, #004aad);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.1);
  transition: all 0.3s ease;
}

.queue-card:hover {
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.15);
  transform: translateY(-1px);
}

.queue-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.queue-icon-wrapper {
  width: 45px;
  height: 45px;
  background: linear-gradient(135deg, var(--azul-turno, #004aad) 0%, var(--verde-tu, #00c2cb) 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 74, 173, 0.2);
}

.queue-icon-wrapper i {
  font-size: 1.25rem;
  color: white;
}

.queue-card-content {
  flex: 1;
  min-width: 0;
}

.queue-card-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--azul-turno, #004aad);
  margin: 0 0 0.25rem 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.queue-card-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
  line-height: 1.3;
  word-wrap: break-word;
}

.queue-card-services {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 74, 173, 0.1);
}

.queue-card-services-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--azul-turno, #004aad);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
}

.queue-card-services-label i {
  font-size: 0.875rem;
}

.queue-card-services-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.queue-card-services-list .service-badge {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  background: linear-gradient(135deg, var(--azul-turno, #004aad) 0%, var(--verde-tu, #00c2cb) 100%);
  color: white;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 74, 173, 0.2);
}

.queue-card-description {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 74, 173, 0.1);
  font-size: 0.85rem;
  color: #666;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.queue-card-description i {
  color: var(--azul-turno, #004aad);
  font-size: 0.875rem;
  margin-top: 0.1rem;
}

.date-block-selector {
  padding: 0;
}

.date-selection {
  margin-bottom: 1.5rem;
}

.date-selection label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #000000;
  margin-bottom: 0.5rem;
}

.date-selection .form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.date-selection .form-control:focus {
  outline: none;
  border-color: #00c2cb;
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
}

/* Time Slot Grid Styles - Exact copy from CommerceQueuesView */
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
  min-height: 60px;
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

/* Disabled state */
.time-slot-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.time-slot-button:disabled:hover {
  transform: none !important;
  box-shadow: none !important;
}

/* Date input styling */
.date-input {
  font-size: 1rem;
  padding: 0.75rem;
  border: 2px solid rgba(169, 169, 169, 0.25);
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}

.date-input:focus {
  outline: none;
  border-color: var(--azul-turno, #004aad);
  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);
}

.selected-date-info {
  padding: 0.5rem 0.75rem;
  background: rgba(0, 74, 173, 0.05);
  border-radius: 0.375rem;
  border-left: 3px solid var(--azul-turno, #004aad);
}

.no-blocks-available {
  margin-top: 1rem;
}

/* Badge styling */
.badge {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
}

/* Mobile Responsive - same as CommerceQueuesView */
@media (max-width: 768px) {
  .time-slot-grid {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 0.3rem;
  }

  .time-slot-button {
    padding: 0.4rem 0.5rem;
    font-size: 0.85rem;
  }

  .time-start {
    font-size: 0.95rem;
  }

  .time-end {
    font-size: 0.65rem;
  }
}

/* Booking Summary Card Styles - Exact copy from CommerceQueuesView */
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

/* Package Info Styles */
.package-info-item {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.08) 0%, rgba(0, 74, 173, 0.08) 100%);
  border: 1px solid rgba(0, 194, 203, 0.2);
}

.package-icon {
  color: #00c2cb !important;
}

.package-value {
  color: #00c2cb !important;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.package-name {
  font-size: 0.65rem;
  color: #6c757d;
  font-weight: 500;
  font-style: italic;
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

/* Preselected Queue Card Styles - Similar to other components */
.preselected-queue-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border: 1px solid rgba(0, 74, 173, 0.15);
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.08);
  transition: all 0.2s ease;
}

.preselected-queue-card:hover {
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.12);
  transform: translateY(-1px);
}

.preselected-header {
  background: linear-gradient(135deg, rgba(40, 167, 69, 0.08) 0%, rgba(32, 201, 151, 0.08) 100%);
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(40, 167, 69, 0.1);
}

.preselected-header i {
  color: #28a745;
  font-size: 1.1rem;
}

.preselected-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #28a745;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preselected-content {
  padding: 1rem;
}

.queue-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--azul-turno, #004aad);
  margin-bottom: 0.5rem;
}

.change-hint {
  font-size: 0.8rem;
  color: #6c757d;
  font-style: italic;
  display: block;
  margin-top: 0.25rem;
}

/* Package Reminder Banner Styles - Moved to PackageReminderBanner.vue component */

/* Mobile responsive styles */
@media (max-width: 768px) {
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
}

.mode-modal {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.choose-attention {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1rem;
}

.choose-attention i {
  color: #00c2cb;
}

.choose-attention .h6 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #000000;
}

/* Procedure Amount Selection Styles */
.procedure-selection-container {
  padding: 1rem;
}

.selected-service-info {
  margin-bottom: 1rem;
}

.service-info-card {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.1) 0%, rgba(0, 74, 173, 0.1) 100%);
  border: 1px solid rgba(0, 194, 203, 0.3);
  border-radius: 0.5rem;
  font-size: 0.9rem;
}

.service-info-card i {
  color: #00c2cb;
  font-size: 1.1rem;
}

.procedure-amount-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.procedure-amount-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1rem;
  background: white;
  border: 2px solid rgba(0, 194, 203, 0.3);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.procedure-amount-button:hover {
  border-color: rgba(0, 194, 203, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 194, 203, 0.2);
}

.procedure-amount-button.procedure-amount-selected {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.15) 0%, rgba(0, 74, 173, 0.15) 100%);
  border-color: #00c2cb;
  box-shadow: 0 4px 12px rgba(0, 194, 203, 0.3);
}

.procedure-amount-value {
  font-size: 2rem;
  font-weight: 700;
  color: #00c2cb;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.procedure-amount-button.procedure-amount-selected .procedure-amount-value {
  color: #004aad;
}

.procedure-amount-label {
  font-size: 0.85rem;
  color: #6c757d;
  font-weight: 500;
  text-transform: lowercase;
}

.procedure-amount-button.procedure-amount-selected .procedure-amount-label {
  color: #004aad;
  font-weight: 600;
}

.selected-procedure-info {
  margin-top: 1.5rem;
}

.selected-procedure-info .alert {
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 194, 203, 0.3);
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.1) 0%, rgba(0, 74, 173, 0.1) 100%);
}

.selected-procedure-info .alert i {
  color: #00c2cb;
  font-size: 1.2rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .procedure-amount-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.75rem;
  }

  .procedure-amount-button {
    padding: 1.25rem 0.75rem;
  }

  .procedure-amount-value {
    font-size: 1.75rem;
  }
}
</style>
