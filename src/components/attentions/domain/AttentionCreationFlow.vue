<script>
import { ref, reactive, computed, watch, onBeforeMount } from 'vue';
import { useAttentionCreation } from '../composables/useAttentionCreation';
import ClientForm from '../../domain/ClientForm.vue';
import QueueForm from '../../domain/QueueForm.vue';
import ServiceForm from '../../domain/ServiceForm.vue';
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import Message from '../../common/Message.vue';
import ClinicalAlertsBanner from '../../clinical-alerts/domain/ClinicalAlertsBanner.vue';
import { getActiveFeature, isTelemedicineEnabled } from '../../../shared/features';
import { getAlertsByClient } from '../../../application/services/clinical-alerts';
import { DateModel } from '../../../shared/utils/date.model';
import {
  getQueueBlockDetailsByDay,
  getQueueBlockDetailsBySpecificDayByCommerceId,
} from '../../../application/services/block';
import { getPendingBookingsBetweenDates } from '../../../application/services/booking';
import { bookingCollection, attentionCollection } from '../../../application/firebase';
import { query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

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
    initialStep: { type: Number, default: 1 },
    mode: { type: String, default: 'full-page' }, // 'modal' | 'full-page'
    toggles: { type: Object, default: () => {} },
    sessionId: { type: String, default: null },
  },
  emits: ['attention-created', 'cancel', 'step-change', 'error'],
  setup(props, { emit }) {
    const loading = ref(false);
    const loadingHours = ref(false);
    const alertError = ref('');
    // Generate unique ID for checkbox
    const checkboxId = ref(`accept-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

    const {
      errors,
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
      date: null,
      block: null,
      blocksByDay: {},
      blocks: [],
      availableBookingBlocks: [],
      availableAttentionBlocks: [],
      bookings: [],
      attentions: [],
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
      if (props.preselectedQueue) {
        state.queue = props.preselectedQueue;
        // Auto-advance if queue is preselected
        if (!props.preselectedClient) {
          state.currentStep = Math.max(state.currentStep, 2);
        }
      }
      if (props.preselectedClient) {
        state.newUser = { ...props.preselectedClient };
        state.currentStep = Math.max(state.currentStep, 2);
      }
      if (props.preselectedDate) {
        state.date = props.preselectedDate;
        // Load blocks if we have both queue and date
        if (props.preselectedQueue && props.preselectedQueue.id) {
          await loadBlocksForDate(props.preselectedDate);
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
      if (showConditions()) {
        state.accept = false;
      } else {
        state.accept = true; // Default to true if conditions not required
      }

      // If all critical data is preselected, start at appropriate step
      // IMPORTANT: Always show client form (step 1) if needed, even if other data is preselected
      if (needsClientForm.value) {
        // User data is required but not provided - must show client form first
        state.currentStep = 1;
      } else if (props.preselectedQueue && props.preselectedDate && props.preselectedBlock) {
        // If we have queue, date, and block, and client is not needed
        if (!needsServiceSelection()) {
          state.currentStep = 4;
        } else {
          // Still need to select services first
          state.currentStep = 3;
        }
      } else if (props.preselectedQueue && props.preselectedDate) {
        // Have queue and date, but no block yet
        if (!needsServiceSelection()) {
          state.currentStep = Math.max(state.currentStep, 4);
        } else {
          state.currentStep = Math.max(state.currentStep, 3);
        }
      }
    });

    const needsClientForm = computed(() => !props.preselectedClient && isDataActive());

    const needsQueueSelection = computed(() => !props.preselectedQueue);

    const needsServiceSelection = () => {
      if (!state.queue) return false;
      return (
        ['COLLABORATOR', 'SELECT_SERVICE', 'MULTI_SERVICE'].includes(state.queue.type) &&
        state.queue.services &&
        state.queue.services.length > 0
      );
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
        case 1:
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
            showConditions
          );
        case 2:
          return !!state.queue;
        case 3:
          return needsServiceSelection() ? state.selectedServices.length > 0 : true;
        case 4:
          // For step 4, check date, block, user data (if required), and accept if conditions are required
          const hasDate = !!state.date || !!props.preselectedDate;
          const hasBlock = !!state.block || !!props.preselectedBlock || state.date === 'TODAY';
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
        default:
          return false;
      }
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
      if (props.preselectedQueue) {
        state.queue = props.preselectedQueue;
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
      } else if (props.preselectedQueue && props.preselectedDate && props.preselectedBlock) {
        if (!needsServiceSelection()) {
          state.currentStep = 4;
        } else {
          state.currentStep = 3;
        }
      } else if (props.preselectedQueue && props.preselectedDate) {
        if (!needsServiceSelection()) {
          state.currentStep = Math.max(state.currentStep, 4);
        } else {
          state.currentStep = Math.max(state.currentStep, 3);
        }
      } else {
        state.currentStep = props.initialStep;
      }
      // Initialize accept based on conditions
      if (showConditions()) {
        state.accept = false;
      } else {
        state.accept = true;
      }

      // Reload blocks if we have a preselected date and queue - AWAIT this to ensure blocks are loaded
      if (props.preselectedDate && props.preselectedQueue && props.preselectedQueue.id) {
        await loadBlocksForDate(props.preselectedDate);
      }
    };

    const handleClientData = data => {
      if (data) {
        // Store the data in a separate ref, don't update the reactive state
        // This prevents interference with user input in the form
        // We'll use this data when submitting the form
        clientFormData.value = { ...data };

        // Extract phoneCode and phone from the data to update state for validation
        if (data.phoneCode) {
          state.phoneCode = data.phoneCode;
        }
        if (data.phone) {
          state.phone = data.phone;
        }
        if (data.accept !== undefined) {
          state.accept = data.accept;
        }

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

    const handleQueueSelection = queue => {
      state.queue = queue;
      state.selectedServices = [];
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

    const handleDateSelection = date => {
      state.date = date;
      state.block = null;
      if (date) {
        loadBlocksForDate(date);
      }
    };

    const handleBlockSelection = block => {
      state.block = block;
      // If telemedicine is enabled, update scheduledAt with the new block time
      if (
        state.isTelemedicine &&
        state.telemedicineConfig &&
        state.date &&
        block &&
        block.hourFrom
      ) {
        const dateStr =
          typeof state.date === 'string' ? state.date : new DateModel(state.date).toString();
        const scheduledDateTime = new Date(dateStr + 'T' + block.hourFrom + ':00');
        state.telemedicineConfig.scheduledAt = scheduledDateTime.toISOString().slice(0, 16);
      }
    };

    const loadBlocksForDate = async date => {
      if (!state.queue || !date) return;

      try {
        loadingHours.value = true;
        const dateStr = typeof date === 'string' ? date : new DateModel(date).toString();

        if (date === 'TODAY' || dateStr === new DateModel().toString()) {
          // Load today's blocks
          state.blocksByDay = await getQueueBlockDetailsByDay(state.queue.id);
          const today = new DateModel().toString();
          state.blocks = state.blocksByDay[today] || [];
          // Load attentions for today
          loadAttentionsForToday();
        } else {
          // Load blocks for specific date
          // Note: This function returns blocks for all dates for this queue, keyed by date
          state.blocksByDay = await getQueueBlockDetailsBySpecificDayByCommerceId(
            props.commerce.id,
            state.queue.id
          );
          // Extract blocks for the specific date from the returned object
          state.blocks = state.blocksByDay[dateStr] || [];
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

        loadingHours.value = false;
      } catch (error) {
        loadingHours.value = false;
      }
    };

    const loadAttentionsForToday = () => {
      // This would subscribe to attentions for today
      // For now, simplified version
    };

    const loadBookingsForDate = async dateStr => {
      try {
        const bookings = await getPendingBookingsBetweenDates(
          props.commerce.id,
          dateStr,
          dateStr,
          state.queue.id
        );
        state.bookings = bookings || [];
        calculateAvailableBlocks();
      } catch (error) {
        // Error loading bookings - continue without them
      }
    };

    const calculateAvailableBlocks = () => {
      // Simplified block calculation
      if (state.blocks && state.blocks.length > 0) {
        const reservedBlockNumbers = state.bookings.map(b => b.block?.number).filter(Boolean);
        state.availableBookingBlocks = state.blocks.filter(
          block => !reservedBlockNumbers.includes(block.number)
        );
      }
    };

    const nextStep = () => {
      if (canProceedFromStep.value) {
        if (state.currentStep === 2 && state.queue && !needsServiceSelection()) {
          // Skip service selection if not needed
          state.currentStep = 4;
        } else {
          state.currentStep = Math.min(state.currentStep + 1, 4);
        }
        emit('step-change', state.currentStep);
      }
    };

    const previousStep = () => {
      if (state.currentStep === 4 && state.queue && !needsServiceSelection()) {
        state.currentStep = 2;
      } else {
        state.currentStep = Math.max(state.currentStep - 1, 1);
      }
      emit('step-change', state.currentStep);
    };

    const submitAttention = async event => {
      // Prevent any default behavior
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (!canProceedFromStep.value) {
        alertError.value = 'Por favor, complete todos los campos requeridos';
        return;
      }

      if (creatingAttention.value) {
        return;
      }

      try {
        // Use preselected block if available, otherwise use state.block
        const blockToUse = props.preselectedBlock || state.block;
        // Use preselected date if available, otherwise use state.date
        const dateToUse = props.preselectedDate || state.date;

        // Use clientFormData if available (from form), otherwise use state.newUser
        const userData =
          clientFormData.value && Object.keys(clientFormData.value).length > 0
            ? clientFormData.value
            : state.newUser;

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
          alertError.value = 'Por favor, seleccione una fila/serviço';
          return;
        }

        const result = await createAttentionRequest({
          queue: state.queue,
          user: userData,
          phoneCode: state.phoneCode,
          phone: state.phone,
          accept: state.accept,
          block: blockToUse,
          selectedServices: state.selectedServices,
          clientId: userData.clientId,
          showConditionsFn: showConditions,
          sessionId: props.sessionId,
          date: dateToUse === 'TODAY' ? null : dateToUse,
          type: state.isTelemedicine ? 'TELEMEDICINE' : undefined,
          telemedicineConfig,
        });

        if (result.success) {
          emit('attention-created', result.attention);
        } else {
          // Extract error message from various possible formats
          let errorMessage = 'Error al crear la atención';
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
                'Por favor, complete los siguientes campos requeridos:\n' +
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
        alertError.value = error.message || 'Error al crear la atención';
        state.errorsAdd = [error.message || 'Error desconocido'];
        emit('error', [error.message || 'Error desconocido']);
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
      if (!state.date || !state.block) return '';
      try {
        const dateStr =
          typeof state.date === 'string' ? state.date : new DateModel(state.date).toString();
        const [year, month, day] = dateStr.split('-');
        const hourFrom = state.block.hourFrom || '';
        const hourTo = state.block.hourTo || '';

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

    // Get all available blocks, including preselected if not already in the list
    // Always show ALL blocks from state.blocks (not just availableBookingBlocks)
    // so users can see all time slots and change their selection
    const getAllAvailableBlocks = computed(() => {
      const blockMap = new Map();

      // Always use state.blocks (all blocks) as the base, not availableBookingBlocks
      // This ensures all time slots are visible, not just the unreserved ones
      if (state.blocks && state.blocks.length > 0) {
        state.blocks.forEach(block => {
          blockMap.set(block.number, block);
        });
      }

      // Also include availableBookingBlocks if they exist and aren't already in the map
      // This ensures we don't miss any blocks
      if (state.availableBookingBlocks && state.availableBookingBlocks.length > 0) {
        state.availableBookingBlocks.forEach(block => {
          if (!blockMap.has(block.number)) {
            blockMap.set(block.number, block);
          }
        });
      }

      // Add preselected block if it's not already in the list
      if (props.preselectedBlock && !blockMap.has(props.preselectedBlock.number)) {
        blockMap.set(props.preselectedBlock.number, props.preselectedBlock);
      }

      // Convert map to array and sort by hourFrom
      return Array.from(blockMap.values()).sort((a, b) => {
        const timeA = a.hourFrom || '';
        const timeB = b.hourFrom || '';
        return timeA.localeCompare(timeB);
      });
    });

    // Track the selected block number for reactivity
    const selectedBlockNumber = computed(() => {
      const currentBlock = state.block || props.preselectedBlock;
      return currentBlock?.number || null;
    });

    // Check if a block is currently selected
    const isBlockSelected = block => {
      if (!block || !block.number) return false;
      return selectedBlockNumber.value === block.number;
    };

    return {
      loading,
      loadingHours,
      alertError,
      checkboxId,
      state,
      needsClientForm,
      needsQueueSelection,
      needsServiceSelection,
      canProceedFromStep,
      isLastStep,
      creatingAttention,
      clientFormData,
      handleClientData,
      handleQueueSelection,
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
      getAllAvailableBlocks,
      isBlockSelected,
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

    <!-- Step 2: Queue Form -->
    <div v-if="state.currentStep === 2 && needsQueueSelection" class="step-container">
      <QueueForm
        :commerce="commerce"
        :queues="queues"
        :grouped-queues="groupedQueues"
        :collaborators="collaborators"
        :receive-queue="handleQueueSelection"
      />
    </div>

    <!-- Step 2b: Queue Display (if preselected) -->
    <div v-else-if="state.currentStep === 2 && !needsQueueSelection" class="step-container">
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

    <!-- Step 3: Service Form -->
    <div v-if="state.currentStep === 3 && needsServiceSelection()" class="step-container">
      <ServiceForm
        :commerce="commerce"
        :queue="state.queue"
        :selected-services="state.selectedServices"
        :receive-selected-services="handleServiceSelection"
      />
    </div>

    <!-- Step 4: Date/Block Selection -->
    <div v-if="state.currentStep === 4" class="step-container">
      <!-- Telemedicine Option (if applicable and enabled for commerce and queue) -->
      <div
        v-if="
          state.queue &&
          state.queue.type !== 'NODEVICE' &&
          isTelemedicineEnabled(commerce, state.queue)
        "
        class="telemedicine-option mb-4"
      >
        <div class="form-check form-switch">
          <input
            class="form-check-input"
            type="checkbox"
            :id="`telemedicine-${Date.now()}`"
            v-model="state.isTelemedicine"
            @change="handleTelemedicineToggle"
          />
          <label class="form-check-label" :for="`telemedicine-${Date.now()}`">
            <i class="bi bi-camera-video me-2"></i>
            <strong>Consulta por Telemedicina</strong>
          </label>
        </div>

        <!-- Telemedicine Configuration (shown when enabled) -->
        <div
          v-if="state.isTelemedicine && state.telemedicineConfig"
          class="telemedicine-config mt-3 p-3 border rounded"
        >
          <div class="mb-3" v-if="!state.date || !state.block">
            <label class="form-label fw-bold">
              <i class="bi bi-calendar-event me-2"></i>
              Fecha y Hora Programada
            </label>
            <input
              type="datetime-local"
              class="form-control"
              v-model="state.telemedicineConfig.scheduledAt"
              :min="new Date().toISOString().slice(0, 16)"
              required
            />
          </div>
          <div v-else-if="state.date && state.block && state.block.hourFrom" class="mb-3">
            <label class="form-label fw-bold">
              <i class="bi bi-calendar-event me-2"></i>
              Fecha y Hora Programada
            </label>
            <div class="telemedicine-scheduled-info p-3 bg-light rounded border">
              <div class="d-flex align-items-center">
                <i class="bi bi-check-circle-fill text-success me-2" style="font-size: 1.25rem"></i>
                <div>
                  <strong>{{ formatSelectedBlockDateTime }}</strong>
                  <div class="text-muted small">Usando la fecha y hora del bloque seleccionado</div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="mb-3">
            <label class="form-label fw-bold">
              <i class="bi bi-calendar-event me-2"></i>
              Fecha y Hora Programada
            </label>
            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              Por favor, seleccione primero la fecha y hora del bloque
            </div>
          </div>
        </div>
      </div>

      <!-- Simplified date/block selector - will be enhanced -->
      <div class="date-block-selector">
        <div v-if="!state.date || (!preselectedDate && !state.date)" class="date-selection">
          <div class="choose-attention py-2 mb-3">
            <i class="bi bi-3-circle-fill h5 m-1"></i>
            <span class="fw-bold h6">{{ $t('commerceQueuesView.selectDay') }}</span>
          </div>
          <input
            type="date"
            :value="state.date || ''"
            @input="handleDateSelection($event.target.value)"
            :min="new DateModel().addDays(1).toString()"
            :max="new DateModel().addDays(90).toString()"
            class="form-control"
          />
        </div>
        <div v-else class="block-selection">
          <div class="choose-attention py-2 mb-3">
            <i class="bi bi-clock-fill h5 m-1"></i>
            <span class="fw-bold h6">{{
              $t('commerceQueuesView.selectBlock') || 'Selecione o Horário'
            }}</span>
          </div>
          <div v-if="loadingHours && !preselectedBlock">
            <Spinner :show="true"></Spinner>
          </div>
          <!-- Show all available blocks, including preselected one -->
          <div
            v-else-if="
              preselectedBlock ||
              state.availableBookingBlocks?.length > 0 ||
              state.blocks?.length > 0
            "
            class="time-slot-grid"
          >
            <!-- Get all blocks: combine available blocks with preselected if not already included -->
            <button
              v-for="block in getAllAvailableBlocks"
              :key="block.number"
              type="button"
              class="time-slot-button"
              :class="{ 'time-slot-selected': isBlockSelected(block) }"
              @click="handleBlockSelection(block)"
            >
              <div class="time-start">{{ block.hourFrom }}</div>
              <div class="time-end">{{ block.hourTo }}</div>
            </button>
          </div>
          <div v-else>
            <Message
              :title="$t('commerceQueuesView.message3.title')"
              :content="$t('commerceQueuesView.message3.content')"
            />
          </div>
        </div>
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
      <!-- Telemedicine Selection Display -->
      <div
        v-if="isLastStep && state.isTelemedicine && state.telemedicineConfig"
        class="telemedicine-selection-display"
      >
        <div class="telemedicine-badge">
          <i class="bi bi-camera-video me-2"></i>
          <span class="telemedicine-label">Consulta por Telemedicina</span>
          <span class="telemedicine-type-badge">
            <i class="bi bi-camera-video me-1"></i>
            Video
          </span>
          <span v-if="formatSelectedBlockDateTime" class="telemedicine-datetime ms-2">
            <i class="bi bi-calendar-event me-1"></i>
            {{ formatSelectedBlockDateTime }}
          </span>
        </div>
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
          :title="!canProceedFromStep ? 'Complete todos los campos requeridos' : ''"
        >
          {{ $t('continue') }}
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
              ? 'Complete todos los campos requeridos'
              : creatingAttention
              ? 'Creando atención...'
              : 'Confirmar creación de atención'
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

.telemedicine-selection-display {
  width: 100%;
  margin-bottom: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.05) 0%, rgba(0, 194, 203, 0.05) 100%);
  border: 1.5px solid var(--azul-turno, #004aad);
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.1);
}

.telemedicine-badge {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--azul-turno, #004aad);
  font-weight: 600;
}

.telemedicine-badge i {
  font-size: 1rem;
  color: var(--verde-tu, #00c2cb);
}

.telemedicine-label {
  font-weight: 700;
  color: var(--azul-turno, #004aad);
  white-space: nowrap;
}

.telemedicine-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.6rem;
  background: linear-gradient(135deg, var(--azul-turno, #004aad) 0%, var(--verde-tu, #00c2cb) 100%);
  color: white;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 74, 173, 0.2);
  white-space: nowrap;
}

.telemedicine-type-badge i {
  color: white;
  font-size: 0.85rem;
}

.telemedicine-datetime {
  display: inline-flex;
  align-items: center;
  color: #495057;
  font-size: 0.85rem;
  font-weight: 500;
  margin-left: auto;
  white-space: nowrap;
}

.telemedicine-datetime i {
  color: var(--azul-turno, #004aad);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .telemedicine-badge {
    font-size: 0.8rem;
    gap: 0.4rem;
  }

  .telemedicine-label {
    font-size: 0.85rem;
  }

  .telemedicine-type-badge {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
  }

  .telemedicine-datetime {
    font-size: 0.75rem;
    margin-left: 0;
    width: 100%;
    margin-top: 0.25rem;
  }
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
  border-color: var(--azul-turno, #004aad);
  box-shadow: 0 3px 10px rgba(0, 74, 173, 0.2);
  background: linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%);
}

.time-start {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--azul-turno, #004aad);
  line-height: 1;
}

.time-end {
  font-size: 0.7rem;
  font-weight: 500;
  color: #6c757d;
  line-height: 1;
}

.time-slot-selected {
  background: linear-gradient(
    135deg,
    var(--azul-turno, #004aad) 0%,
    var(--verde-tu, #00c2cb) 100%
  ) !important;
  border-color: var(--azul-turno, #004aad) !important;
  color: white !important;
  box-shadow: 0 4px 20px rgba(0, 74, 173, 0.4) !important;
  animation: timeSlotPulse 1.5s ease-in-out infinite;
}

@keyframes timeSlotPulse {
  0%,
  100% {
    box-shadow: 0 4px 20px rgba(0, 74, 173, 0.4);
  }
  50% {
    box-shadow: 0 4px 25px rgba(0, 74, 173, 0.6), 0 0 15px rgba(0, 194, 203, 0.4);
  }
}

.time-slot-selected .time-start,
.time-slot-selected .time-end {
  color: white !important;
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
</style>
