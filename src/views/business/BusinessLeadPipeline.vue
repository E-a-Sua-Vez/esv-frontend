<script>
import { ref, reactive, onBeforeMount, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { globalStore } from '../../stores';
import { useServiceStore } from '../../stores/service';
import { getPhoneCodes, getUserOrigin } from '../../shared/utils/data.ts';
import { getAddressBR } from '../../application/services/address';
import {
  getBusinessLeadsByStage,
  getBusinessLeadsByStageFromBackend,
  updateBusinessLeadStage,
  updateBusinessLead,
  addBusinessLeadContact,
  getBusinessLeadContactsFromBackend,
  getBusinessLeadById,
  getBusinessLeadByIdFromBackend,
  createBusinessLead,
  getBusinessLeadTransitions,
  convertBusinessLeadToClient,
} from '../../application/services/business-lead';
import { getActiveServicesByCommerceId } from '../../application/services/service';
import { getPermissions } from '../../application/services/permissions';
import { USER_TYPES } from '../../shared/constants';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Message from '../../components/common/Message.vue';
import Warning from '../../components/common/Warning.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import SimpleCard from '../../components/dashboard/common/SimpleCard.vue';
import Popper from 'vue3-popper';
import { Modal } from 'bootstrap';

const PIPELINE_STAGES = {
  NEW: 'NEW',
  IN_CONTACT: 'IN_CONTACT',
  WAITLIST: 'WAITLIST',
  IN_DEAL: 'IN_DEAL',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
};

const LEAD_STATUS = {
  INTERESTED: 'INTERESTED',
  REJECTED: 'REJECTED',
  MAYBE_LATER: 'MAYBE_LATER',
  SUCCESS: 'SUCCESS', // Successful sale
};

const CONTACT_TYPES = {
  CALL: 'CALL',
  MESSAGE: 'MESSAGE',
  EMAIL: 'EMAIL',
  VISIT: 'VISIT',
  MEETING: 'MEETING',
};

const CONTACT_RESULTS = {
  INTERESTED: 'INTERESTED',
  CONTACT_LATER: 'CONTACT_LATER',
  REJECTED: 'REJECTED',
  NO_RESPONSE: 'NO_RESPONSE',
  WAITING_FOR_RESPONSE: 'WAITING_FOR_RESPONSE',
};

// Pipeline Rules Configuration - Extensible system for stage transitions
// This configuration defines:
// - Which stages can be dragged/dropped
// - Which transitions are allowed
// - Which stages are read-only
// - Special rules for specific stages
const PIPELINE_RULES = {
  // Stages that cannot be moved via drag and drop (must use other methods like contacts)
  noDragDrop: [PIPELINE_STAGES.NEW, PIPELINE_STAGES.ARCHIVED],

  // Stages that are read-only (cannot be moved or updated)
  readOnly: [PIPELINE_STAGES.CLOSED, PIPELINE_STAGES.ARCHIVED],

  // Allowed transitions from each stage (empty array means all transitions are allowed)
  // If a stage is not listed, all transitions are allowed (except those blocked by other rules)
  allowedTransitions: {
    [PIPELINE_STAGES.NEW]: [], // NEW can only move via contact creation
    [PIPELINE_STAGES.IN_CONTACT]: [], // All transitions allowed
    [PIPELINE_STAGES.WAITLIST]: [], // All transitions allowed
    [PIPELINE_STAGES.IN_DEAL]: [], // All transitions allowed
    [PIPELINE_STAGES.CLOSED]: [], // CLOSED is read-only, so this doesn't matter
    [PIPELINE_STAGES.ARCHIVED]: [], // ARCHIVED is read-only
  },

  // Stages order (for visual positioning and validation)
  stageOrder: [
    PIPELINE_STAGES.NEW,
    PIPELINE_STAGES.IN_CONTACT,
    PIPELINE_STAGES.WAITLIST,
    PIPELINE_STAGES.IN_DEAL,
    PIPELINE_STAGES.CLOSED,
  ],

  // Check if a transition is allowed
  canTransition: (fromStage, toStage, $t = null) => {
    // Read-only stages cannot be moved
    if (PIPELINE_RULES.readOnly.includes(fromStage)) {
      return { allowed: false, reason: $t ? $t('businessLeadPipeline.validationErrors.readOnlyStage') : 'Stage is read-only' };
    }

    // Cannot move to read-only stages (except via special methods)
    // CLOSED can only be reached via drag and drop from IN_DEAL (with SUCCESS status)
    // or via contact creation with REJECTED result in IN_CONTACT stage
    if (PIPELINE_RULES.readOnly.includes(toStage)) {
      // Only allow drag and drop to CLOSED from IN_DEAL
      if (toStage === PIPELINE_STAGES.CLOSED && fromStage !== PIPELINE_STAGES.IN_DEAL) {
        return {
          allowed: false,
          reason: $t ? $t('businessLeadPipeline.validationErrors.closedFromDealOnly') :
            'CLOSED stage can only be reached from IN_DEAL via drag and drop, or from IN_CONTACT via contact with REJECTED result',
        };
      }
      // For other read-only stages, block
      if (toStage !== PIPELINE_STAGES.CLOSED) {
        return { allowed: false, reason: $t ? $t('businessLeadPipeline.validationErrors.readOnlyTarget') : 'Target stage is read-only' };
      }
    }

    // NEW can only move FROM via contact creation, not drag and drop
    if (fromStage === PIPELINE_STAGES.NEW) {
      return { allowed: false, reason: $t ? $t('businessLeadPipeline.validationErrors.newStageContactOnly') : 'NEW stage can only be moved via contact creation' };
    }

    // CRITICAL: Once a lead leaves NEW, it can NEVER return to NEW
    // This is a one-way transition - NEW is only for new leads
    if (toStage === PIPELINE_STAGES.NEW && fromStage !== PIPELINE_STAGES.NEW) {
      return {
        allowed: false,
        reason: $t ? $t('businessLeadPipeline.validationErrors.cannotMoveToNewStage') : 'Leads cannot return to NEW stage once they have moved forward',
      };
    }

    // Check if drag and drop is allowed for this stage (only blocks FROM, not TO)
    if (PIPELINE_RULES.noDragDrop.includes(fromStage)) {
      return { allowed: false, reason: $t ? $t('businessLeadPipeline.validationErrors.noDragDrop') : 'This stage cannot be moved via drag and drop' };
    }

    // Check specific allowed transitions if defined
    const allowed = PIPELINE_RULES.allowedTransitions[fromStage];
    if (allowed && allowed.length > 0 && !allowed.includes(toStage)) {
      return { allowed: false, reason: $t ? $t('businessLeadPipeline.validationErrors.invalidStageTransition') : 'Transition not allowed' };
    }

    return { allowed: true };
  },

  // Check if a lead can be dragged
  canDrag: lead => {
    const stage = lead.pipelineStage || lead.stage;
    if (PIPELINE_RULES.readOnly.includes(stage)) {
      return false;
    }
    if (PIPELINE_RULES.noDragDrop.includes(stage)) {
      return false;
    }
    return true;
  },

  // Check if a lead can receive new contacts
  canAddContact: lead => {
    const stage = lead.pipelineStage || lead.stage;
    return !PIPELINE_RULES.readOnly.includes(stage);
  },
};

export default {
  name: 'BusinessLeadPipeline',
  components: {
    CommerceLogo,
    ComponentMenu,
    Spinner,
    Alert,
    Message,
    Warning,
    Popper,
    SimpleCard,
  },
  setup() {
    const router = useRouter();
    const { t: $t, locale } = useI18n();
    const store = globalStore();
    const serviceStore = useServiceStore();
    const loading = ref(false);
    const filtering = ref(false);
    const modalLoading = ref(false);
    const converting = ref(null); // ID of lead being converted to client
    const alertError = ref('');
    const selectedLead = ref(null);
    const showLeadDetails = ref(false);
    const showAddContact = ref(false);
    const showAddLead = ref(false);
    const toggles = ref({});
    const errorsAdd = ref([]);
    const nameError = ref(false);
    const emailError = ref(false);
    const leadTransitions = ref([]);
    const activeTab = ref('info'); // 'info', 'contacts', 'transitions'

    // Set default date filters: from one month ago to today
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    const dateFilterFrom = ref(oneMonthAgo.toISOString().split('T')[0]);
    const dateFilterTo = ref(today.toISOString().split('T')[0]);

    // Status filter - array of selected statuses (empty means show all)
    const statusFilter = ref([]);

    // Time indicator filter - array of selected indicators ('green', 'yellow', 'red') - empty means show all
    const timeIndicatorFilter = ref([]);

    // Temperature filter - array of selected temperatures ('QUENTE', 'MORNO', 'FRIO') - empty means show all
    const temperatureFilter = ref([]);

    // Product filter - selected product ID (empty string means show all)
    const serviceFilter = ref('');

    const showAnalytics = ref(false);
    const showMobileFilters = ref(false); // Control de filtros colapsables en móvil

    // Search filter - text to search in lead name and company
    const searchText = ref('');
    const selectedOrigin = ref('');
    const showConvertedOnly = ref('all'); // 'all', 'converted', 'not-converted'

    // Pagination settings
    const pageSize = ref(20);
    const showAll = ref(false);
    const currentPages = reactive({
      NEW: 1,
      IN_CONTACT: 1,
      WAITLIST: 1,
      IN_DEAL: 1,
      CLOSED: 1,
    });

    const isMaster = computed(() => {
      const userType = store.getCurrentUserType;
      return userType === USER_TYPES.MASTER || userType === 'master';
    });

    const newContact = reactive({
      type: CONTACT_TYPES.CALL,
      result: CONTACT_RESULTS.NO_RESPONSE,
      comment: '',
    });

    // Edit mode controls
    const showEditLead = ref(false);
    const editMode = ref(false);

    const newLead = reactive({
      name: '',
      lastName: '',
      email: '',
      phone: '',
      phoneCode: '+55',
      idNumber: '',
      company: '',
      message: '',
      source: 'manual',
      temperature: 'MORNO', // Default to warm (green)
      productId: '', // Product that the lead is interested in
      personalInfo: {
        birthday: '',
        addressText: '',
        addressCode: '',
        addressComplement: '',
        origin: '',
        code1: '',
        code2: '',
        code3: '',
        healthAgreementId: '',
      },
    });

    // Edit lead object for the edit modal
    const editLead = reactive({
      id: '',
      name: '',
      lastName: '',
      email: '',
      phone: '',
      phoneCode: '',
      idNumber: '',
      company: '',
      message: '',
      temperature: 'MORNO',
      productId: '', // Product that the lead is interested in
      personalInfo: {
        birthday: '',
        addressText: '',
        addressCode: '',
        addressComplement: '',
        phoneCode: '',
        origin: '',
        code1: '',
        code2: '',
        code3: '',
        healthAgreementId: '',
      },
    });

    // Form state for advanced functionality
    const formState = reactive({
      phoneCodes: [],
      originCodes: [],
      addressCodeError: false,
      loadingAddress: false,
      birthdayInput: '',
      showCalendar: false,
    });

    const leads = reactive({
      NEW: [],
      IN_CONTACT: [],
      WAITLIST: [],
      IN_DEAL: [],
      CLOSED: [],
    });

    const goBack = () => {
      router.back();
    };

    const loadLeads = async (useBackend = true) => {
      try {
        loading.value = true;
        alertError.value = '';
        const user = store.getCurrentUser;
        const commerce = store.getCurrentCommerce;
        const userType = store.getCurrentUserType;
        const isMasterUser = userType === USER_TYPES.MASTER || userType === 'master';
        const isBusinessUser = userType === USER_TYPES.BUSINESS || userType === 'business';
        // For master and business users, don't filter by userId - they see all leads for their business/commerce
        const userId = (isMasterUser || isBusinessUser) ? undefined : user?.id;

        // Use backend (Firebase) for immediate results, or query stack (PostgreSQL) for processed data
        const getLeadsFn = useBackend ? getBusinessLeadsByStageFromBackend : getBusinessLeadsByStage;

        const [newLeads, inContactLeads, waitlistLeads, inDealLeads, closedLeads] =
          await Promise.all([
            getLeadsFn(PIPELINE_STAGES.NEW, user?.businessId, commerce?.id, null, userId),
            getLeadsFn(PIPELINE_STAGES.IN_CONTACT, user?.businessId, commerce?.id, null, userId),
            getLeadsFn(PIPELINE_STAGES.WAITLIST, user?.businessId, commerce?.id, null, userId),
            getLeadsFn(PIPELINE_STAGES.IN_DEAL, user?.businessId, commerce?.id, null, userId),
            getLeadsFn(PIPELINE_STAGES.CLOSED, user?.businessId, commerce?.id, null, userId),
          ]);

        // Filter out archived leads and apply all filters
        // IMPORTANT: This function filters leads within their original stage, it does NOT move leads between stages
        // Note: The leads are already filtered by stage from the backend, so we don't need to verify the stage again
        const filterLeads = leadList => {
          // First, filter out archived leads
          // The leads are already in the correct stage from the backend query
          let filtered = (leadList || []).filter(lead => {
            const stage = lead.pipelineStage || lead.stage;
            // Only exclude archived leads - trust that backend returned leads in correct stage
            return stage !== PIPELINE_STAGES.ARCHIVED;
          });

          // Apply status filter if set
          if (statusFilter.value && statusFilter.value.length > 0) {
            filtered = filtered.filter(lead => {
              const leadStatus = lead.status;
              return leadStatus && statusFilter.value.includes(leadStatus);
            });
          }

          // Apply time indicator filter if set
          if (timeIndicatorFilter.value && timeIndicatorFilter.value.length > 0) {
            filtered = filtered.filter(lead => {
              const indicator = getTimeIndicator(lead);
              return indicator && timeIndicatorFilter.value.includes(indicator);
            });
          }

          // Apply temperature filter if set
          if (temperatureFilter.value && temperatureFilter.value.length > 0) {
            filtered = filtered.filter(lead => {
              const temperature = lead.temperature;
              return temperature && temperatureFilter.value.includes(temperature.toUpperCase());
            });
          }

          // Apply service filter if set
          if (serviceFilter.value) {
            filtered = filtered.filter(lead => {
              return lead.productId === serviceFilter.value;
            });
          }

          // Apply conversion filter if set
          if (showConvertedOnly.value !== 'all') {
            filtered = filtered.filter(lead => {
              const isConverted = lead.convertedToClientId != null;
              return showConvertedOnly.value === 'converted' ? isConverted : !isConverted;
            });
          }

          // Then apply date filter if set
          if (!dateFilterFrom.value && !dateFilterTo.value) {
            return filtered;
          }
          return filtered.filter(lead => {
            if (!lead.createdAt) return false;
            const leadDate = new Date(lead.createdAt);
            const fromDate = dateFilterFrom.value ? new Date(dateFilterFrom.value) : null;
            const toDate = dateFilterTo.value ? new Date(dateFilterTo.value + 'T23:59:59') : null;

            if (fromDate && leadDate < fromDate) return false;
            if (toDate && leadDate > toDate) return false;
            return true;
          });
        };

        // Filter each stage independently, ensuring leads stay in their original stage
        // The backend already returns leads filtered by stage, so we just apply additional filters
        leads.NEW = filterLeads(newLeads);
        leads.IN_CONTACT = filterLeads(inContactLeads);
        leads.WAITLIST = filterLeads(waitlistLeads);
        leads.IN_DEAL = filterLeads(inDealLeads);
        leads.CLOSED = filterLeads(closedLeads);
        loading.value = false;
      } catch (error) {
        loading.value = false;
        const errorMsg = error.response?.status || error.message || 500;
        alertError.value = Array.isArray(errorMsg) ? errorMsg[0] : errorMsg;
      }
    };

    // Setup watchers for filter changes to avoid recursive updates
    watch([dateFilterFrom, dateFilterTo, selectedOrigin, showConvertedOnly, serviceFilter], () => {
      // Use nextTick to avoid triggering during reactive setup
      nextTick(() => {
        loadLeads(true);
      });
    }, {
      // Don't trigger on initial setup
      flush: 'post'
    });

    // Refresh function
    const refreshLeads = async () => {
      await loadLeads(true);
    };

    // Drag and drop state
    const draggedLead = ref(null);
    const dragOverStage = ref(null);

    // Drag start handler
    const handleDragStart = (event, lead) => {
      // Track drag start time to distinguish from clicks
      window.lastDragStartTime = Date.now();

      // Check if lead can be dragged
      if (!PIPELINE_RULES.canDrag(lead)) {
        event.preventDefault();
        event.stopPropagation();
        // Don't show error - just silently prevent drag
        return false;
      }
      draggedLead.value = lead;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', lead.id);
      // Add visual feedback
      event.target.style.opacity = '0.5';
    };

    // Drag end handler
    const handleDragEnd = event => {
      event.target.style.opacity = '1';
      draggedLead.value = null;
      dragOverStage.value = null;
    };

    // Drag over handler for drop zones
    const handleDragOver = (event, stage) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';

      // Check if transition is allowed
      if (draggedLead.value) {
        const fromStage = draggedLead.value.pipelineStage || draggedLead.value.stage;
        const transition = PIPELINE_RULES.canTransition(fromStage, stage, $t);
        if (transition.allowed) {
          dragOverStage.value = stage;
          event.dataTransfer.dropEffect = 'move';
        } else {
          dragOverStage.value = null;
          event.dataTransfer.dropEffect = 'none';
        }
      }
    };

    // Drag leave handler
    const handleDragLeave = event => {
      // Only clear if we're actually leaving the drop zone (not just moving to a child element)
      if (!event.currentTarget.contains(event.relatedTarget)) {
        dragOverStage.value = null;
      }
    };

    // Drop handler
    const handleDrop = async (event, targetStage) => {
      event.preventDefault();
      dragOverStage.value = null;

      if (!draggedLead.value) {
        return;
      }

      const lead = draggedLead.value;
      const fromStage = lead.pipelineStage || lead.stage;

      // Validate transition
      const transition = PIPELINE_RULES.canTransition(fromStage, targetStage, $t);
      if (!transition.allowed) {
        alertError.value = transition.reason || 'This transition is not allowed';
        draggedLead.value = null;
        return;
      }

      // Move the lead
      try {
        await moveLead(lead, targetStage, undefined);
      } catch (error) {
        console.error('Error moving lead:', error);
      } finally {
        draggedLead.value = null;
      }
    };

    const moveLead = async (lead, newStage, status, skipValidation = false) => {
      try {
        loading.value = true;
        alertError.value = ''; // Clear any previous errors

        // Handle case where lead is just an ID string
        let leadId;
        let leadObj;
        if (typeof lead === 'string') {
          leadId = lead;
          // Find the lead object in the leads arrays
          for (const stage of Object.keys(leads)) {
            const found = leads[stage]?.find(l => l.id === leadId);
            if (found) {
              leadObj = found;
              break;
            }
          }
          if (!leadObj) {
            throw new Error('Lead not found in local state');
          }
        } else {
          leadObj = lead;
          leadId = lead.id;
        }

        const oldStage = leadObj.pipelineStage || leadObj.stage;

        // Special handling: If moving to CLOSED from IN_DEAL via drag and drop, set status to SUCCESS
        if (
          newStage === PIPELINE_STAGES.CLOSED &&
          oldStage === PIPELINE_STAGES.IN_DEAL &&
          !status
        ) {
          status = LEAD_STATUS.SUCCESS;
        }

        // Validate transition unless explicitly skipped (for contact-based moves)
        if (!skipValidation) {
          const transition = PIPELINE_RULES.canTransition(oldStage, newStage, $t);
          if (!transition.allowed) {
            throw new Error(transition.reason || 'This transition is not allowed');
          }
        }

        // Optimistic UI update - move lead immediately in local state
        if (oldStage && leads[oldStage]) {
          const leadIndex = leads[oldStage].findIndex(l => l.id === leadId);
          if (leadIndex !== -1) {
            leads[oldStage].splice(leadIndex, 1);
          }
        }

        // Update lead object
        const updatedLead = { ...leadObj, pipelineStage: newStage, stage: newStage };
        if (status) {
          updatedLead.status = status;
        }

        // Add to new stage array
        if (leads[newStage]) {
          leads[newStage].push(updatedLead);
        }

        // Update backend - only send status if it's defined
        const statusToSend = status || undefined;
        await updateBusinessLeadStage(leadId, newStage, statusToSend);

        // If this lead is currently selected in the modal, refresh its details and transitions
        if (selectedLead.value && selectedLead.value.id === leadId) {
          try {
            // Always get from Firebase (backend) - source of truth for immediate data
            let refreshedLead;
            try {
              refreshedLead = await getBusinessLeadByIdFromBackend(leadId);
            } catch (leadError) {
              console.warn('Failed to refresh lead from backend, trying query stack:', leadError);
              // Fallback to query stack only for lead details
              try {
                refreshedLead = await getBusinessLeadById(leadId);
              } catch (queryError) {
                console.warn('Failed to refresh lead from query stack:', queryError);
                refreshedLead = selectedLead.value;
              }
            }

            // Always get contacts from Firebase (backend) - never use query stack for contacts
            let refreshedContacts = [];
            try {
              refreshedContacts = await getBusinessLeadContactsFromBackend(leadId);
            } catch (contactsError) {
              console.warn('Failed to refresh contacts from Firebase:', contactsError);
              // Keep existing contacts if Firebase fails - don't use query stack (it's async)
              refreshedContacts = selectedLead.value.contacts || [];
            }

            // Refresh transitions to show the new stage change
            const transitions = await getBusinessLeadTransitions(leadId);
            const finalTransitions = [...transitions];

            // Add initial transition if not present
            const hasInitialTransition = finalTransitions.some(t => t.isInitial);
            if (
              !hasInitialTransition &&
              (refreshedLead?.createdAt || selectedLead.value?.createdAt)
            ) {
              finalTransitions.push({
                id: 'initial',
                oldStage: null,
                newStage: PIPELINE_STAGES.NEW,
                status: null,
                userId: null,
                occurredOn: refreshedLead?.createdAt || selectedLead.value.createdAt,
                createdAt: refreshedLead?.createdAt || selectedLead.value.createdAt,
                isInitial: true,
              });
            }

            // Sort transitions
            finalTransitions.sort((a, b) => {
              const dateA = new Date(a.occurredOn || a.createdAt);
              const dateB = new Date(b.occurredOn || b.createdAt);
              return dateA - dateB;
            });

            // Update selected lead with fresh data
            selectedLead.value = {
              ...(refreshedLead || selectedLead.value),
              contacts: refreshedContacts || selectedLead.value.contacts || [],
              pipelineStage: newStage,
              stage: newStage,
            };
            if (status) {
              selectedLead.value.status = status;
            }
            leadTransitions.value = finalTransitions;
          } catch (refreshError) {
            // If refresh fails, just update the stage locally
            console.warn('Failed to refresh lead details after move:', refreshError);
            if (selectedLead.value) {
              selectedLead.value.pipelineStage = newStage;
              selectedLead.value.stage = newStage;
              if (status) {
                selectedLead.value.status = status;
              }
            }
          }
        }

        // Reload from backend (Firebase) to ensure consistency
        await loadLeads(true);
        loading.value = false;
      } catch (error) {
        loading.value = false;
        // On error, reload to get correct state
        await loadLeads(true);
        // Handle validation errors and API errors properly
        const errorMsg = error.message || error.response?.data?.message || error.response?.status || 'Unknown error occurred';
        alertError.value = Array.isArray(errorMsg) ? errorMsg[0] : errorMsg;
      }
    };

    // Convert lead to client
    const convertLeadToClient = async (lead) => {
      try {
        if (!lead || !lead.id) {
          alertError.value = $t('businessLeadPipeline.errors.leadIdMissing') || 'Lead ID is missing';
          return;
        }

        // Check if lead can be converted (must be CLOSED with SUCCESS status)
        if (lead.pipelineStage !== PIPELINE_STAGES.CLOSED || lead.status !== LEAD_STATUS.SUCCESS) {
          alertError.value = $t('businessLeadPipeline.errors.leadNotConvertible') || 'Lead must be closed with success status to convert to client';
          return;
        }

        // Check if already converted
        if (lead.convertedToClientId) {
          alertError.value = $t('businessLeadPipeline.errors.leadAlreadyConverted') || 'Lead is already converted to client';
          return;
        }

        // Confirm conversion
        const confirmed = window.confirm(
          $t('businessLeadPipeline.convertConfirm') ||
            'Are you sure you want to convert this lead to a client? This action cannot be undone.'
        );

        if (!confirmed) return;

        converting.value = lead.id;
        alertError.value = '';

        const result = await convertBusinessLeadToClient(lead.id);

        // Update the lead with client reference
        if (result.lead) {
          const leadIndex = leads.CLOSED.findIndex(l => l.id === lead.id);
          if (leadIndex !== -1) {
            leads.CLOSED[leadIndex] = result.lead;
          }

          // Also update selectedLead if it's the same
          if (selectedLead.value && selectedLead.value.id === lead.id) {
            selectedLead.value = result.lead;
          }
        }

        converting.value = null;

        // Show success message
        const successMsg = $t('businessLeadPipeline.convertSuccess') || 'Lead successfully converted to client!';
        // Clear any error messages to show the success
        alertError.value = '';

        // Force reload of leads to ensure the client tag is displayed correctly
        await loadLeads(true);

      } catch (error) {
        converting.value = null;
        console.error('convertLeadToClient - Error:', error);
        const errorMsg = error.response?.data?.message || error.message || 'Failed to convert lead to client';
        alertError.value = errorMsg;
      }
    };

    const archiveLead = async lead => {
      try {
        if (!lead || !lead.id) {
          alertError.value = $t('businessLeadPipeline.errors.leadIdMissing') || 'Lead ID is missing';
          return;
        }

        loading.value = true;
        alertError.value = '';

        // Confirm action
        const confirmed = window.confirm(
          $t('businessLeadPipeline.archiveConfirm') ||
            'Are you sure you want to archive this lead? It will be removed from all lists.'
        );

        if (!confirmed) {
          loading.value = false;
          return;
        }

        // Update lead stage to ARCHIVED
        await updateBusinessLeadStage(lead.id, PIPELINE_STAGES.ARCHIVED, undefined);

        // Remove lead from all local lists
        for (const stage of Object.keys(leads)) {
          if (leads[stage] && Array.isArray(leads[stage])) {
            const index = leads[stage].findIndex(l => l.id === lead.id);
            if (index !== -1) {
              leads[stage].splice(index, 1);
            }
          }
        }

        // Close modal if this lead is selected
        if (selectedLead.value && selectedLead.value.id === lead.id) {
          closeLeadDetails();
        }

        // Reload leads to ensure consistency
        await loadLeads(true);
        loading.value = false;
      } catch (error) {
        loading.value = false;
        const errorMsg = error.response?.status || error.message || 500;
        alertError.value = Array.isArray(errorMsg) ? errorMsg[0] : errorMsg;
      }
    };

    const openLeadDetails = async (lead, event) => {
      // Prevent opening if already loading a modal
      if (modalLoading.value) {
        return;
      }

      // Prevent event propagation if event is provided
      // Also prevent if this was triggered by a drag operation
      if (event) {
        // If this is a click event and there was a recent drag, ignore it
        if (draggedLead.value && event.type === 'click') {
          // Check if mouse actually moved (real click vs drag end)
          const timeSinceDrag = Date.now() - (window.lastDragStartTime || 0);
          if (timeSinceDrag < 200) {
            // This was likely a drag operation, not a click
            return;
          }
        }
        event.preventDefault();
        event.stopPropagation();
      }

      // Clear any drag state to ensure clean modal opening
      if (draggedLead.value) {
        draggedLead.value = null;
      }

      try {
        modalLoading.value = true;

        // Ensure services are loaded for service display
        if (!serviceStore.services || serviceStore.services.length === 0) {
          await loadServices();
        }

        // Final check - ensure services array is initialized
        ensureServicesAvailable();

        // Always get from Firebase (backend) for immediate, consistent data
        let leadDetails = null;
        let contacts = [];

        try {
          // Try backend (Firebase) first - this is the source of truth
          [leadDetails, contacts] = await Promise.all([
            getBusinessLeadByIdFromBackend(lead.id),
            getBusinessLeadContactsFromBackend(lead.id),
          ]);
        } catch (backendError) {
          console.warn('Failed to get lead from backend, trying query stack:', backendError);
          // Fallback to query stack only if backend fails
          try {
            leadDetails = await getBusinessLeadById(lead.id);
            // Don't get contacts from query stack - it's async and may be stale
            contacts = [];
          } catch (queryError) {
            // If both fail, use the lead data we have
            console.warn('Failed to get lead from both sources, using local data');
            leadDetails = lead;
            contacts = [];
          }
        }

        selectedLead.value = { ...(leadDetails || lead), contacts: contacts || [] };

        // Initialize temp fields
        tempTemperature.value = selectedLead.value.temperature || '';
        tempMessage.value = selectedLead.value.message || '';

        // Fetch transitions/history for this lead
        try {
          const transitions = await getBusinessLeadTransitions(lead.id);
          const finalTransitions = [...transitions];

          // Check if we already have an initial transition from events
          const hasInitialTransition = finalTransitions.some(t => t.isInitial);

          // Add initial transition (lead creation) only if we don't have it from events
          if (!hasInitialTransition && selectedLead.value.createdAt) {
            finalTransitions.push({
              id: 'initial',
              oldStage: null,
              newStage: PIPELINE_STAGES.NEW,
              status: null,
              userId: null,
              occurredOn: selectedLead.value.createdAt,
              createdAt: selectedLead.value.createdAt,
              isInitial: true,
            });
          }

          // Sort by date (oldest first - chronological ascending order)
          leadTransitions.value = finalTransitions.sort((a, b) => {
            const dateA = new Date(a.occurredOn || a.createdAt);
            const dateB = new Date(b.occurredOn || b.createdAt);
            return dateA - dateB; // Oldest first (ascending chronological order)
          });
        } catch (transitionError) {
          // Fail silently - transitions are a nice-to-have feature
          // On error, still try to add initial transition from lead data
          if (selectedLead.value.createdAt) {
            leadTransitions.value = [
              {
                id: 'initial',
                oldStage: null,
                newStage: PIPELINE_STAGES.NEW,
                status: null,
                userId: null,
                occurredOn: selectedLead.value.createdAt,
                createdAt: selectedLead.value.createdAt,
                isInitial: true,
              },
            ];
          } else {
            leadTransitions.value = [];
          }
        }

        showLeadDetails.value = true;
        modalLoading.value = false;

        // Show Bootstrap modal - wait for Vue to update DOM
        await new Promise(resolve => setTimeout(resolve, 300));

        const modalElement = document.getElementById('lead-details-modal');

        if (modalElement) {
          // Remove any existing modal backdrop
          const existingBackdrop = document.querySelector('.modal-backdrop');
          if (existingBackdrop) {
            existingBackdrop.remove();
          }

          // Remove modal-open class if it exists
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';

          // Get or create modal instance
          let modal = Modal.getInstance(modalElement);
          if (!modal) {
            modal = new Modal(modalElement, {
              backdrop: true,
              keyboard: false,
            });
          }

          // Show the modal
          modal.show();

          // Force show if needed
          setTimeout(() => {
            if (!modalElement.classList.contains('show')) {
              modalElement.classList.add('show');
              modalElement.style.display = 'block';
              document.body.classList.add('modal-open');
              const backdrop = document.createElement('div');
              backdrop.className = 'modal-backdrop fade show';
              document.body.appendChild(backdrop);
            }
          }, 100);
        } else {
          console.error('Modal element not found');
        }
      } catch (error) {
        modalLoading.value = false;
        console.error('Error opening lead details:', error);
        const errorMsg = error.response?.status || error.message || 500;
        alertError.value = Array.isArray(errorMsg) ? errorMsg[0] : errorMsg;
      }
    };

    const closeLeadDetails = () => {
      // Hide Bootstrap modal
      const modalElement = document.getElementById('lead-details-modal');
      if (modalElement) {
        const modal = Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }

        // Clean up backdrop and body classes
        setTimeout(() => {
          const backdrop = document.querySelector('.modal-backdrop');
          if (backdrop) {
            backdrop.remove();
          }
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        }, 150);
      }

      showLeadDetails.value = false;
      selectedLead.value = null;
      editMode.value = false;
      showAddContact.value = false;
      newContact.comment = '';
      newContact.type = CONTACT_TYPES.CALL;
      newContact.result = CONTACT_RESULTS.NO_RESPONSE;
      newContact.scheduledAt = undefined;
      resetTemperatureField();
      resetMessageField();
    };

    // Edit lead functions
    const startEditMode = () => {
      if (!selectedLead.value) return;

      // Copy current lead data to edit object
      Object.assign(editLead, {
        id: selectedLead.value.id,
        name: selectedLead.value.name || '',
        lastName: selectedLead.value.lastName || '',
        email: selectedLead.value.email || '',
        phone: selectedLead.value.phone || '',
        phoneCode: selectedLead.value.phoneCode || '',
        idNumber: selectedLead.value.idNumber || '',
        company: selectedLead.value.company || '',
        message: selectedLead.value.message || '',
        temperature: selectedLead.value.temperature || 'MORNO',
        productId: selectedLead.value.productId || '',
        personalInfo: {
          birthday: selectedLead.value.personalInfo?.birthday || '',
          addressText: selectedLead.value.personalInfo?.addressText || '',
          addressCode: selectedLead.value.personalInfo?.addressCode || '',
          addressComplement: selectedLead.value.personalInfo?.addressComplement || '',
          phoneCode: selectedLead.value.personalInfo?.phoneCode || '',
          origin: selectedLead.value.personalInfo?.origin || '',
          code1: selectedLead.value.personalInfo?.code1 || '',
          code2: selectedLead.value.personalInfo?.code2 || '',
          code3: selectedLead.value.personalInfo?.code3 || '',
          healthAgreementId: selectedLead.value.personalInfo?.healthAgreementId || '',
        },
      });

      // Set birthday input for display
      if (editLead.personalInfo.birthday) {
        formState.birthdayInput = formatBirthdayDisplay(editLead.personalInfo.birthday);
      }

      editMode.value = true;
    };

    const cancelEditMode = () => {
      editMode.value = false;
      // Reset edit object
      Object.assign(editLead, {
        id: '',
        name: '',
        lastName: '',
        email: '',
        phone: '',
        phoneCode: '',
        idNumber: '',
        company: '',
        message: '',
        temperature: 'MORNO',
        personalInfo: {
          birthday: '',
          addressText: '',
          addressCode: '',
          addressComplement: '',
          phoneCode: '',
          origin: '',
          code1: '',
          code2: '',
          code3: '',
          healthAgreementId: '',
        },
      });
      formState.birthdayInput = '';
    };

    const saveEditLead = async () => {
      try {
        loading.value = true;
        alertError.value = '';

        // Validate edit data - similar to add validation but for edit object
        if (!editLead.name || editLead.name.trim().length === 0) {
          alertError.value = $t('businessLeadPipeline.errors.nameRequired') || 'Name is required';
          return;
        }

        if (editLead.email && editLead.email.trim().length > 0) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(editLead.email.trim())) {
            alertError.value = $t('businessLeadPipeline.errors.invalidEmail') || 'Please enter a valid email address';
            return;
          }
        }

        // Prepare update data
        const updateData = {
          name: editLead.name.trim(),
          lastName: editLead.lastName?.trim() || '',
          email: editLead.email?.trim() || '',
          phone: editLead.phone?.trim() || '',
          phoneCode: editLead.phoneCode?.trim() || '',
          idNumber: editLead.idNumber?.trim() || '',
          company: editLead.company?.trim() || '',
          message: editLead.message?.trim() || '',
          temperature: editLead.temperature || 'MORNO',
          productId: editLead.productId?.trim() || '',
          personalInfo: {
            birthday: editLead.personalInfo.birthday || '',
            addressText: editLead.personalInfo.addressText?.trim() || '',
            addressCode: editLead.personalInfo.addressCode?.trim() || '',
            addressComplement: editLead.personalInfo.addressComplement?.trim() || '',
            phoneCode: editLead.personalInfo.phoneCode?.trim() || '',
            origin: editLead.personalInfo.origin || '',
            code1: editLead.personalInfo.code1?.trim() || '',
            code2: editLead.personalInfo.code2?.trim() || '',
            code3: editLead.personalInfo.code3?.trim() || '',
            healthAgreementId: editLead.personalInfo.healthAgreementId?.trim() || '',
          },
        };

        // Update lead via API
        const updatedLead = await updateBusinessLead(editLead.id, updateData);

        // Update selectedLead with new data
        if (selectedLead.value && selectedLead.value.id === editLead.id) {
          Object.assign(selectedLead.value, updatedLead);
        }

        // Update lead in pipeline arrays
        for (const stage in leads) {
          const stageLeads = leads[stage];
          const leadIndex = stageLeads.findIndex(l => l.id === editLead.id);
          if (leadIndex !== -1) {
            Object.assign(stageLeads[leadIndex], updatedLead);
            break;
          }
        }

        // Exit edit mode
        editMode.value = false;

        loading.value = false;
      } catch (error) {
        console.error('Error updating lead:', error);
        alertError.value = error.response?.data?.message || error.message || $t('businessLeadPipeline.errors.updateLead') || 'Error updating lead';
        loading.value = false;
      }
    };

    const updateLeadTemperature = async (leadId, temperature) => {
      try {
        if (!leadId) {
          console.error('Lead ID is missing');
          return;
        }

        loading.value = true;
        alertError.value = '';

        // Update lead temperature in backend
        const updatedLead = await updateBusinessLead(leadId, { temperature });

        // Update local state if this lead is currently selected
        if (selectedLead.value && selectedLead.value.id === leadId) {
          selectedLead.value.temperature = temperature;
        }

        // Update in leads arrays
        for (const stage of Object.keys(leads)) {
          if (leads[stage] && Array.isArray(leads[stage])) {
            const leadIndex = leads[stage].findIndex(l => l.id === leadId);
            if (leadIndex !== -1) {
              leads[stage][leadIndex].temperature = temperature;
              break;
            }
          }
        }

        loading.value = false;
      } catch (error) {
        console.error('Error updating lead temperature:', error);
        alertError.value =
          error?.response?.data?.message || error?.message || $t('businessLeadPipeline.errors.updateTemperature') || 'Error updating temperature';
        loading.value = false;
      }
    };

    const tempTemperature = ref('');

    const tempMessage = ref('');

    const resetTemperatureField = () => {
      tempTemperature.value = '';
    };

    const resetMessageField = () => {
      tempMessage.value = '';
    };

    const handleTemperatureChange = event => {
      // Store the selected value in tempTemperature, but don't update yet
      tempTemperature.value = event.target.value || '';
    };

    const saveTemperature = async () => {
      if (selectedLead.value && selectedLead.value.id && tempTemperature.value !== undefined) {
        const newTemperature = tempTemperature.value || undefined;
        await updateLeadTemperature(selectedLead.value.id, newTemperature);
        // Update the selectedLead value to reflect the change
        if (selectedLead.value) {
          selectedLead.value.temperature = newTemperature;
        }
      }
    };

    const saveMessage = async () => {
      if (selectedLead.value && selectedLead.value.id && tempMessage.value !== undefined) {
        const newMessage = tempMessage.value || undefined;
        try {
          await updateBusinessLead(selectedLead.value.id, { message: newMessage });
          // Update the selectedLead value to reflect the change
          if (selectedLead.value) {
            selectedLead.value.message = newMessage;
          }
        } catch (error) {
          alertError.value =
            error?.response?.data?.message || error?.message || $t('businessLeadPipeline.errors.updateMessage') || 'Error updating message';
        }
      }
    };

    const saveContact = async event => {
      // Prevent event propagation
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Clear any previous errors
      alertError.value = '';

      if (!selectedLead.value) {
        alertError.value = $t('businessLeadPipeline.errors.noLeadSelected') || 'No lead selected';
        return;
      }

      if (!newContact.comment || newContact.comment.trim().length < 10) {
        alertError.value = $t('businessLeadPipeline.errors.commentTooShort') || 'Comment must be at least 10 characters';
        console.warn('Validation failed: Comment too short', {
          comment: newContact.comment,
          length: newContact.comment?.trim().length,
        });
        return;
      }

      if (!newContact.type) {
        alertError.value = $t('businessLeadPipeline.errors.contactTypeRequired') || 'Contact type is required';
        return;
      }

      if (!newContact.result) {
        alertError.value = $t('businessLeadPipeline.errors.contactResultRequired') || 'Contact result is required';
        return;
      }

      try {
        loading.value = true;
        alertError.value = '';

        // Validate data before sending
        if (!selectedLead.value.id) {
          throw new Error('Lead ID is missing');
        }

        // If lead is in WAITLIST, move it to IN_CONTACT first before saving the contact
        const leadCurrentStage = selectedLead.value.pipelineStage || selectedLead.value.stage;
        if (leadCurrentStage === PIPELINE_STAGES.WAITLIST) {
          try {
            await updateBusinessLeadStage(selectedLead.value.id, PIPELINE_STAGES.IN_CONTACT, undefined);
            // Update local state
            selectedLead.value.pipelineStage = PIPELINE_STAGES.IN_CONTACT;
            selectedLead.value.stage = PIPELINE_STAGES.IN_CONTACT;

            // Update in leads array
            if (leads.WAITLIST && Array.isArray(leads.WAITLIST)) {
              const waitlistIndex = leads.WAITLIST.findIndex(l => l.id === selectedLead.value.id);
              if (waitlistIndex !== -1) {
                const foundLead = leads.WAITLIST.splice(waitlistIndex, 1)[0];
                foundLead.pipelineStage = PIPELINE_STAGES.IN_CONTACT;
                foundLead.stage = PIPELINE_STAGES.IN_CONTACT;
                if (!leads.IN_CONTACT) {
                  leads.IN_CONTACT = [];
                }
                const alreadyInContact = leads.IN_CONTACT.some(l => l.id === foundLead.id);
                if (!alreadyInContact) {
                  leads.IN_CONTACT.unshift(foundLead);
                }
              }
            }
          } catch (stageError) {
            console.error('Error moving lead from WAITLIST to IN_CONTACT:', stageError);
            // Continue with contact save even if stage update fails
          }
        }

        const contactData = {
          type: newContact.type,
          result: newContact.result,
          comment: newContact.comment.trim(),
          scheduledAt: newContact.scheduledAt || undefined,
        };

        // Ensure we're actually calling the service
        const savedContact = await addBusinessLeadContact(selectedLead.value.id, contactData);

        if (!savedContact || !savedContact.id) {
          console.warn('Contact saved but response is missing ID:', savedContact);
          // Don't throw error - continue with refresh attempt
          // The contact might have been saved even if response is incomplete
        }

        // Refresh lead details and contacts from Firebase (backend) - source of truth
        // Firebase has immediate data, query stack is async and may be stale
        try {
          // Try to get lead from backend first
          let refreshedLead;
          try {
            refreshedLead = await getBusinessLeadByIdFromBackend(selectedLead.value.id);
          } catch (leadError) {
            console.warn('Failed to refresh lead from backend, trying query stack:', leadError);
            // Fallback to query stack only for lead details
            try {
              refreshedLead = await getBusinessLeadById(selectedLead.value.id);
            } catch (queryError) {
              console.warn('Failed to refresh lead from query stack:', queryError);
              refreshedLead = selectedLead.value;
            }
          }

          // Always get contacts from Firebase (backend) - never use query stack
          // Query stack is async and may not have the contact yet
          let refreshedContacts = [];
          try {
            refreshedContacts = await getBusinessLeadContactsFromBackend(selectedLead.value.id);
          } catch (contactsError) {
            console.warn('Failed to refresh contacts from Firebase:', contactsError);
            // If Firebase fails, use optimistic update - don't use query stack (it's async)
            if (savedContact) {
              refreshedContacts = selectedLead.value.contacts || [];
              // Only add if not already present
              if (!refreshedContacts.find(c => c.id === savedContact.id)) {
                refreshedContacts.unshift(savedContact);
              }
            } else {
              refreshedContacts = selectedLead.value.contacts || [];
            }
          }

          // Update selected lead with fresh data from Firebase
          selectedLead.value = {
            ...(refreshedLead || selectedLead.value),
            contacts: refreshedContacts || [],
          };
        } catch (refreshError) {
          console.warn('Failed to refresh lead details after contact save:', refreshError);
          // Fallback: optimistically add the contact to the list
          if (savedContact) {
            if (selectedLead.value.contacts) {
              // Only add if not already present
              const contactExists = selectedLead.value.contacts.some(c => c.id === savedContact.id);
              if (!contactExists) {
                selectedLead.value.contacts.unshift(savedContact);
              }
            } else {
              selectedLead.value.contacts = [savedContact];
            }
          }
        }

        // Refresh transitions to show any new events
        try {
          const transitions = await getBusinessLeadTransitions(selectedLead.value.id);
          const finalTransitions = [...transitions];

          // Add initial transition if not present
          const hasInitialTransition = finalTransitions.some(t => t.isInitial);
          if (!hasInitialTransition && selectedLead.value?.createdAt) {
            finalTransitions.push({
              id: 'initial',
              oldStage: null,
              newStage: PIPELINE_STAGES.NEW,
              status: null,
              userId: null,
              occurredOn: selectedLead.value.createdAt,
              createdAt: selectedLead.value.createdAt,
              isInitial: true,
            });
          }

          // Sort transitions
          finalTransitions.sort((a, b) => {
            const dateA = new Date(a.occurredOn || a.createdAt);
            const dateB = new Date(b.occurredOn || b.createdAt);
            return dateA - dateB;
          });

          leadTransitions.value = finalTransitions;
        } catch (transitionError) {
          // Fail silently - transitions are optional
          console.debug('Failed to refresh transitions:', transitionError);
        }

        // Check contact result and move lead accordingly
        const currentStage = selectedLead.value.pipelineStage || selectedLead.value.stage;

        // Only apply automatic stage transitions when lead is in NEW stage
        if (currentStage === PIPELINE_STAGES.NEW) {
          // If contact result is REJECTED, move lead to CLOSED stage with REJECTED status
          if (newContact.result === CONTACT_RESULTS.REJECTED) {
            // Update immediately but catch errors so contact save still succeeds
            (async () => {
              try {
                // updateBusinessLeadStage signature: (id, stage, status)
                const updatedLead = await updateBusinessLeadStage(
                  selectedLead.value.id,
                  PIPELINE_STAGES.CLOSED,
                  LEAD_STATUS.REJECTED
                );

                // Update local state
                if (updatedLead) {
                  selectedLead.value.pipelineStage = PIPELINE_STAGES.CLOSED;
                  selectedLead.value.stage = PIPELINE_STAGES.CLOSED;
                  selectedLead.value.status = LEAD_STATUS.REJECTED;
                }

                // Update the lead in the leads array - remove from current stage and add to CLOSED
                let foundLead = null;
                let sourceStage = null;

                // Check all stages to find the lead
                const stagesToCheck = [
                  PIPELINE_STAGES.NEW,
                  PIPELINE_STAGES.IN_CONTACT,
                  PIPELINE_STAGES.WAITLIST,
                  PIPELINE_STAGES.IN_DEAL,
                ];

                for (const stage of stagesToCheck) {
                  if (leads[stage] && Array.isArray(leads[stage])) {
                    const index = leads[stage].findIndex(l => l.id === selectedLead.value.id);
                    if (index !== -1) {
                      foundLead = leads[stage].splice(index, 1)[0];
                      sourceStage = stage;
                      break;
                    }
                  }
                }

                // Update the lead and move to CLOSED
                if (foundLead) {
                  foundLead.pipelineStage = PIPELINE_STAGES.CLOSED;
                  foundLead.stage = PIPELINE_STAGES.CLOSED;
                  foundLead.status = LEAD_STATUS.REJECTED;
                  if (!leads.CLOSED) {
                    leads.CLOSED = [];
                  }
                  // Only add if not already in CLOSED array
                  const alreadyClosed = leads.CLOSED.some(l => l.id === foundLead.id);
                  if (!alreadyClosed) {
                    leads.CLOSED.unshift(foundLead);
                  }
                }

                // Refresh lead details and transitions after stage change
                try {
                  const [refreshedLead, refreshedContacts] = await Promise.all([
                    getBusinessLeadByIdFromBackend(selectedLead.value.id),
                    getBusinessLeadContactsFromBackend(selectedLead.value.id),
                  ]);

                  const transitions = await getBusinessLeadTransitions(selectedLead.value.id);
                  const finalTransitions = [...transitions];

                  const hasInitialTransition = finalTransitions.some(t => t.isInitial);
                  if (!hasInitialTransition && refreshedLead?.createdAt) {
                    finalTransitions.push({
                      id: 'initial',
                      oldStage: null,
                      newStage: PIPELINE_STAGES.NEW,
                      status: null,
                      userId: null,
                      occurredOn: refreshedLead.createdAt,
                      createdAt: refreshedLead.createdAt,
                      isInitial: true,
                    });
                  }

                  finalTransitions.sort((a, b) => {
                    const dateA = new Date(a.occurredOn || a.createdAt);
                    const dateB = new Date(b.occurredOn || b.createdAt);
                    return dateA - dateB;
                  });

                  selectedLead.value = { ...refreshedLead, contacts: refreshedContacts || [] };
                  leadTransitions.value = finalTransitions;
                } catch (refreshError) {
                  console.warn('Failed to refresh lead details after stage change:', refreshError);
                }

                // Reload leads to ensure UI is in sync with database
                setTimeout(async () => {
                  try {
                    await loadLeads(true); // Use backend for immediate update
                  } catch (reloadError) {
                    // Silently ignore - UI was already updated optimistically
                  }
                }, 1500);
              } catch (stageError) {
                console.error(
                  'Error moving lead to CLOSED stage with REJECTED status:',
                  stageError
                );
                // Don't fail the whole operation if stage update fails
                // The contact was already saved successfully
              }
            })(); // Execute immediately but don't await (non-blocking)
          }
          // If contact result is CONTACT_LATER, move lead to WAITLIST stage
          else if (newContact.result === CONTACT_RESULTS.CONTACT_LATER) {
            // Update immediately but catch errors so contact save still succeeds
            (async () => {
              try {
                // updateBusinessLeadStage signature: (id, stage, status)
                const updatedLead = await updateBusinessLeadStage(
                  selectedLead.value.id,
                  PIPELINE_STAGES.WAITLIST,
                  undefined
                );

                // Update local state
                if (updatedLead) {
                  selectedLead.value.pipelineStage = PIPELINE_STAGES.WAITLIST;
                  selectedLead.value.stage = PIPELINE_STAGES.WAITLIST;
                }

                // Update the lead in the leads array - remove from current stage and add to WAITLIST
                let foundLead = null;
                let sourceStage = null;

                // Check all stages to find the lead (except CLOSED and WAITLIST)
                const stagesToCheck = [
                  PIPELINE_STAGES.NEW,
                  PIPELINE_STAGES.IN_CONTACT,
                  PIPELINE_STAGES.IN_DEAL,
                ];

                for (const stage of stagesToCheck) {
                  if (leads[stage] && Array.isArray(leads[stage])) {
                    const index = leads[stage].findIndex(l => l.id === selectedLead.value.id);
                    if (index !== -1) {
                      foundLead = leads[stage].splice(index, 1)[0];
                      sourceStage = stage;
                      break;
                    }
                  }
                }

                // Update the lead and move to WAITLIST
                if (foundLead && sourceStage !== PIPELINE_STAGES.WAITLIST) {
                  foundLead.pipelineStage = PIPELINE_STAGES.WAITLIST;
                  foundLead.stage = PIPELINE_STAGES.WAITLIST;
                  if (!leads.WAITLIST) {
                    leads.WAITLIST = [];
                  }
                  // Only add if not already in WAITLIST array
                  const alreadyInWaitlist = leads.WAITLIST.some(l => l.id === foundLead.id);
                  if (!alreadyInWaitlist) {
                    leads.WAITLIST.unshift(foundLead);
                  }
                }

                // Reload leads to ensure UI is in sync with database
                setTimeout(async () => {
                  try {
                    await loadLeads(true); // Use backend for immediate update
                  } catch (reloadError) {
                    // Silently ignore - UI was already updated optimistically
                  }
                }, 1500);
              } catch (stageError) {
                console.error('Error moving lead to WAITLIST stage:', stageError);
                // Don't fail the whole operation if stage update fails
                // The contact was already saved successfully
              }
            })(); // Execute immediately but don't await (non-blocking)
          }
          // If contact result is INTERESTED, move lead to IN_DEAL stage (negotiation)
          else if (newContact.result === CONTACT_RESULTS.INTERESTED) {
            // Update immediately but catch errors so contact save still succeeds
            (async () => {
              try {
                // updateBusinessLeadStage signature: (id, stage, status)
                const updatedLead = await updateBusinessLeadStage(
                  selectedLead.value.id,
                  PIPELINE_STAGES.IN_DEAL,
                  undefined
                );

                // Update local state
                if (updatedLead) {
                  selectedLead.value.pipelineStage = PIPELINE_STAGES.IN_DEAL;
                  selectedLead.value.stage = PIPELINE_STAGES.IN_DEAL;
                }

                // Update the lead in the leads array - remove from current stage and add to IN_DEAL
                let foundLead = null;
                let sourceStage = null;

                // Check all stages to find the lead (except CLOSED and IN_DEAL)
                const stagesToCheck = [
                  PIPELINE_STAGES.NEW,
                  PIPELINE_STAGES.IN_CONTACT,
                  PIPELINE_STAGES.WAITLIST,
                ];

                for (const stage of stagesToCheck) {
                  if (leads[stage] && Array.isArray(leads[stage])) {
                    const index = leads[stage].findIndex(l => l.id === selectedLead.value.id);
                    if (index !== -1) {
                      foundLead = leads[stage].splice(index, 1)[0];
                      sourceStage = stage;
                      break;
                    }
                  }
                }

                // Update the lead and move to IN_DEAL
                if (foundLead && sourceStage !== PIPELINE_STAGES.IN_DEAL) {
                  foundLead.pipelineStage = PIPELINE_STAGES.IN_DEAL;
                  foundLead.stage = PIPELINE_STAGES.IN_DEAL;
                  if (!leads.IN_DEAL) {
                    leads.IN_DEAL = [];
                  }
                  // Only add if not already in IN_DEAL array
                  const alreadyInDeal = leads.IN_DEAL.some(l => l.id === foundLead.id);
                  if (!alreadyInDeal) {
                    leads.IN_DEAL.unshift(foundLead);
                  }
                }

                // Reload leads to ensure UI is in sync with database
                setTimeout(async () => {
                  try {
                    await loadLeads(true); // Use backend for immediate update
                  } catch (reloadError) {
                    // Silently ignore - UI was already updated optimistically
                  }
                }, 1500);
              } catch (stageError) {
                console.error('Error moving lead to IN_DEAL stage:', stageError);
                // Don't fail the whole operation if stage update fails
                // The contact was already saved successfully
              }
            })(); // Execute immediately but don't await (non-blocking)
          }
          // If contact result is WAITING_FOR_RESPONSE, move lead to IN_CONTACT stage
          else if (newContact.result === CONTACT_RESULTS.WAITING_FOR_RESPONSE) {
            // Update immediately but catch errors so contact save still succeeds
            (async () => {
              try {
                // updateBusinessLeadStage signature: (id, stage, status)
                const updatedLead = await updateBusinessLeadStage(
                  selectedLead.value.id,
                  PIPELINE_STAGES.IN_CONTACT,
                  undefined
                );

                // Update local state
                if (updatedLead) {
                  selectedLead.value.pipelineStage = PIPELINE_STAGES.IN_CONTACT;
                  selectedLead.value.stage = PIPELINE_STAGES.IN_CONTACT;
                }

                // Update the lead in the leads array - remove from current stage and add to IN_CONTACT
                let foundLead = null;
                let sourceStage = null;

                // Check NEW stage
                if (leads.NEW && Array.isArray(leads.NEW)) {
                  const newIndex = leads.NEW.findIndex(l => l.id === selectedLead.value.id);
                  if (newIndex !== -1) {
                    foundLead = leads.NEW.splice(newIndex, 1)[0];
                    sourceStage = PIPELINE_STAGES.NEW;
                  }
                }

                // Update the lead and move to IN_CONTACT if it was in a different stage
                if (foundLead && sourceStage !== PIPELINE_STAGES.IN_CONTACT) {
                  foundLead.pipelineStage = PIPELINE_STAGES.IN_CONTACT;
                  foundLead.stage = PIPELINE_STAGES.IN_CONTACT;
                  if (!leads.IN_CONTACT) {
                    leads.IN_CONTACT = [];
                  }
                  // Only add if not already in IN_CONTACT array
                  const alreadyInContact = leads.IN_CONTACT.some(l => l.id === foundLead.id);
                  if (!alreadyInContact) {
                    leads.IN_CONTACT.unshift(foundLead);
                  }
                }

                // Reload leads to ensure UI is in sync with database
                setTimeout(async () => {
                  try {
                    await loadLeads(true); // Use backend for immediate update
                  } catch (reloadError) {
                    // Silently ignore - UI was already updated optimistically
                  }
                }, 1500);
              } catch (stageError) {
                console.error('Error moving lead to IN_CONTACT stage:', stageError);
                // Don't fail the whole operation if stage update fails
                // The contact was already saved successfully
              }
            })(); // Execute immediately but don't await (non-blocking)
          }
          // If contact result is NO_RESPONSE, move lead to WAITLIST stage
          else if (newContact.result === CONTACT_RESULTS.NO_RESPONSE) {
            // Update immediately but catch errors so contact save still succeeds
            (async () => {
              try {
                // updateBusinessLeadStage signature: (id, stage, status)
                const updatedLead = await updateBusinessLeadStage(
                  selectedLead.value.id,
                  PIPELINE_STAGES.WAITLIST,
                  undefined
                );

                // Update local state
                if (updatedLead) {
                  selectedLead.value.pipelineStage = PIPELINE_STAGES.WAITLIST;
                  selectedLead.value.stage = PIPELINE_STAGES.WAITLIST;
                }

                // Update the lead in the leads array - remove from current stage and add to WAITLIST
                let foundLead = null;
                let sourceStage = null;

                // Check all stages to find the lead (except CLOSED and WAITLIST)
                const stagesToCheck = [
                  PIPELINE_STAGES.NEW,
                  PIPELINE_STAGES.IN_CONTACT,
                  PIPELINE_STAGES.IN_DEAL,
                ];

                for (const stage of stagesToCheck) {
                  if (leads[stage] && Array.isArray(leads[stage])) {
                    const index = leads[stage].findIndex(l => l.id === selectedLead.value.id);
                    if (index !== -1) {
                      foundLead = leads[stage].splice(index, 1)[0];
                      sourceStage = stage;
                      break;
                    }
                  }
                }

                // Update the lead and move to WAITLIST
                if (foundLead && sourceStage !== PIPELINE_STAGES.WAITLIST) {
                  foundLead.pipelineStage = PIPELINE_STAGES.WAITLIST;
                  foundLead.stage = PIPELINE_STAGES.WAITLIST;
                  if (!leads.WAITLIST) {
                    leads.WAITLIST = [];
                  }
                  // Only add if not already in WAITLIST array
                  const alreadyInWaitlist = leads.WAITLIST.some(l => l.id === foundLead.id);
                  if (!alreadyInWaitlist) {
                    leads.WAITLIST.unshift(foundLead);
                  }
                }

                // Refresh lead details and transitions after stage change
                try {
                  const [refreshedLead, refreshedContacts] = await Promise.all([
                    getBusinessLeadByIdFromBackend(selectedLead.value.id),
                    getBusinessLeadContactsFromBackend(selectedLead.value.id),
                  ]);

                  const transitions = await getBusinessLeadTransitions(selectedLead.value.id);
                  const finalTransitions = [...transitions];

                  const hasInitialTransition = finalTransitions.some(t => t.isInitial);
                  if (!hasInitialTransition && refreshedLead?.createdAt) {
                    finalTransitions.push({
                      id: 'initial',
                      oldStage: null,
                      newStage: PIPELINE_STAGES.NEW,
                      status: null,
                      userId: null,
                      occurredOn: refreshedLead.createdAt,
                      createdAt: refreshedLead.createdAt,
                      isInitial: true,
                    });
                  }

                  finalTransitions.sort((a, b) => {
                    const dateA = new Date(a.occurredOn || a.createdAt);
                    const dateB = new Date(b.occurredOn || b.createdAt);
                    return dateA - dateB;
                  });

                  selectedLead.value = { ...refreshedLead, contacts: refreshedContacts || [] };
                  leadTransitions.value = finalTransitions;
                } catch (refreshError) {
                  console.warn('Failed to refresh lead details after stage change:', refreshError);
                }

                // Reload leads to ensure UI is in sync with database
                setTimeout(async () => {
                  try {
                    await loadLeads(true); // Use backend for immediate update
                  } catch (reloadError) {
                    // Silently ignore - UI was already updated optimistically
                  }
                }, 1500);
              } catch (stageError) {
                console.error('Error moving lead to WAITLIST stage:', stageError);
                // Don't fail the whole operation if stage update fails
                // The contact was already saved successfully
              }
            })(); // Execute immediately but don't await (non-blocking)
          }
          // For any other contact result, lead stays in NEW stage
          // No automatic transition - user must explicitly move the lead or create another contact
        }
        // Automatically move lead to IN_CONTACT stage when a contact is added (for non-NEW stages)
        // Only move if not already IN_CONTACT or CLOSED
        // Only move to IN_CONTACT if currently in WAITLIST
        // Don't move if already in IN_CONTACT, IN_DEAL, or CLOSED
        else if (currentStage === PIPELINE_STAGES.WAITLIST) {
          // Update immediately but catch errors so contact save still succeeds
          (async () => {
            try {
              // updateBusinessLeadStage signature: (id, stage, status)
              // Backend gets userId from auth token automatically
              const updatedLead = await updateBusinessLeadStage(
                selectedLead.value.id,
                PIPELINE_STAGES.IN_CONTACT,
                undefined
              );

              // Update local state
              if (updatedLead) {
                selectedLead.value.pipelineStage = PIPELINE_STAGES.IN_CONTACT;
                selectedLead.value.stage = PIPELINE_STAGES.IN_CONTACT;
              }

              // Update selectedLead
              selectedLead.value.pipelineStage = PIPELINE_STAGES.IN_CONTACT;
              selectedLead.value.stage = PIPELINE_STAGES.IN_CONTACT;

              // Update the lead in the leads array - check all stages
              // Note: leads is a reactive object, not a ref, so access directly
              let foundLead = null;
              let sourceStage = null;

              // Check NEW stage
              if (leads.NEW && Array.isArray(leads.NEW)) {
                const newIndex = leads.NEW.findIndex(l => l.id === selectedLead.value.id);
                if (newIndex !== -1) {
                  foundLead = leads.NEW.splice(newIndex, 1)[0];
                  sourceStage = PIPELINE_STAGES.NEW;
                }
              }

              // If not found in NEW, check IN_CONTACT (in case it was already there)
              if (!foundLead && leads.IN_CONTACT && Array.isArray(leads.IN_CONTACT)) {
                const inContactIndex = leads.IN_CONTACT.findIndex(
                  l => l.id === selectedLead.value.id
                );
                if (inContactIndex !== -1) {
                  foundLead = leads.IN_CONTACT[inContactIndex];
                  sourceStage = PIPELINE_STAGES.IN_CONTACT;
                }
              }

              // Update the lead and move to IN_CONTACT if it was in a different stage
              if (foundLead && sourceStage !== PIPELINE_STAGES.IN_CONTACT) {
                foundLead.pipelineStage = PIPELINE_STAGES.IN_CONTACT;
                foundLead.stage = PIPELINE_STAGES.IN_CONTACT;
                if (!leads.IN_CONTACT) {
                  leads.IN_CONTACT = [];
                }
                // Only add if not already in IN_CONTACT array
                const alreadyInContact = leads.IN_CONTACT.some(l => l.id === foundLead.id);
                if (!alreadyInContact) {
                  leads.IN_CONTACT.unshift(foundLead);
                }
              }

              // Reload leads to ensure UI is in sync with database
              // Use a longer delay to avoid race conditions
              setTimeout(async () => {
                try {
                  await loadLeads(true); // Use backend for immediate update
                } catch (reloadError) {
                  // Silently ignore - UI was already updated optimistically
                  // Don't log to avoid cluttering console with expected failures
                }
              }, 1500);
            } catch (stageError) {
              console.error('Error moving lead to IN_CONTACT stage in database:', stageError);
              // Don't fail the whole operation if stage update fails
              // The contact was already saved successfully
            }
          })(); // Execute immediately but don't await (non-blocking)
        }

        loading.value = false;
      } catch (error) {
        loading.value = false;
        console.error('Error saving contact:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response,
          request: error.request,
          stack: error.stack,
        });

        // Extract error message
        let errorMsg = 'Error saving contact';
        if (error.message) {
          errorMsg = error.message;
        } else if (error?.response?.data?.message) {
          errorMsg = error.response.data.message;
        } else if (error?.response?.data?.error) {
          errorMsg = error.response.data.error;
        } else if (error?.response?.status) {
          errorMsg = `Error ${error.response.status}`;
        }

        alertError.value = Array.isArray(errorMsg) ? errorMsg[0] : errorMsg;
      }
    };

    // Helper functions for contact result display
    const getContactResultIcon = result => {
      const icons = {
        INTERESTED: 'bi bi-check-circle-fill',
        REJECTED: 'bi bi-x-circle-fill',
        NO_RESPONSE: 'bi bi-question-circle-fill',
        CONTACT_LATER: 'bi bi-clock-fill',
        WAITING_FOR_RESPONSE: 'bi bi-hourglass-split',
      };
      return icons[result] || 'bi bi-circle';
    };

    const getContactResultClass = result => {
      const classes = {
        INTERESTED: 'contact-interested',
        REJECTED: 'contact-rejected',
        NO_RESPONSE: 'contact-no-response',
        CONTACT_LATER: 'contact-later',
        WAITING_FOR_RESPONSE: 'contact-waiting',
      };
      return classes[result] || 'contact-default';
    };

    const getContactResultBadgeClass = result => {
      const classes = {
        INTERESTED: 'bg-success',
        REJECTED: 'bg-danger',
        NO_RESPONSE: 'bg-secondary',
        CONTACT_LATER: 'bg-warning text-dark',
        WAITING_FOR_RESPONSE: 'bg-info text-dark',
      };
      return classes[result] || 'bg-secondary';
    };

    const getContactResultLabel = result => {
      const labels = {
        INTERESTED: $t('businessLeadPipeline.contactResults.interested') || 'Interested',
        REJECTED: $t('businessLeadPipeline.contactResults.rejected') || 'Rejected',
        NO_RESPONSE: $t('businessLeadPipeline.contactResults.noResponse') || 'No Response',
        CONTACT_LATER: $t('businessLeadPipeline.contactResults.contactLater') || 'Contact Later',
        WAITING_FOR_RESPONSE: $t('businessLeadPipeline.contactResults.waitingResponse') || 'Waiting for Response',
      };
      return labels[result] || result;
    };

    // Stage helper functions for transitions
    const getStageLabel = stage => {
      const labels = {
        [PIPELINE_STAGES.NEW]: $t('businessLeadPipeline.newLeads') || 'New',
        [PIPELINE_STAGES.IN_CONTACT]: $t('businessLeadPipeline.inContact') || 'In Contact',
        [PIPELINE_STAGES.WAITLIST]: $t('businessLeadPipeline.waitlist') || 'Waitlist',
        [PIPELINE_STAGES.IN_DEAL]: $t('businessLeadPipeline.inDeal') || 'In Deal',
        [PIPELINE_STAGES.CLOSED]: $t('businessLeadPipeline.closed') || 'Closed',
        [PIPELINE_STAGES.ARCHIVED]: $t('businessLeadPipeline.archived') || 'Archived',
      };
      return labels[stage] || stage;
    };

    const getStageIcon = stage => {
      const icons = {
        [PIPELINE_STAGES.NEW]: 'bi-inbox-fill',
        [PIPELINE_STAGES.IN_CONTACT]: 'bi-chat-dots-fill',
        [PIPELINE_STAGES.WAITLIST]: 'bi-pause-circle-fill',
        [PIPELINE_STAGES.IN_DEAL]: 'bi-handshake-fill',
        [PIPELINE_STAGES.CLOSED]: 'bi-check-circle-fill',
        [PIPELINE_STAGES.ARCHIVED]: 'bi-archive-fill',
      };
      return icons[stage] || 'bi-circle';
    };

    const getStageColor = stage => {
      const colors = {
        [PIPELINE_STAGES.NEW]: 'primary',
        [PIPELINE_STAGES.IN_CONTACT]: 'warning',
        [PIPELINE_STAGES.WAITLIST]: 'info',
        [PIPELINE_STAGES.IN_DEAL]: 'success',
        [PIPELINE_STAGES.CLOSED]: 'secondary',
        [PIPELINE_STAGES.ARCHIVED]: 'dark',
      };
      return colors[stage] || 'secondary';
    };

    const getStatusLabel = status => {
      if (!status) return '';
      const labels = {
        [LEAD_STATUS.INTERESTED]: $t('businessLeadPipeline.interested') || 'Interested',
        [LEAD_STATUS.REJECTED]: $t('businessLeadPipeline.rejected') || 'Rejected',
        [LEAD_STATUS.SUCCESS]: $t('businessLeadPipeline.success') || 'Success',
        [LEAD_STATUS.MAYBE_LATER]: $t('businessLeadPipeline.maybeLater') || 'Maybe Later',
        [LEAD_STATUS.NO_RESPONSE]: $t('businessLeadPipeline.noResponse') || 'No Response',
      };
      return labels[status] || status;
    };

    const getStatusIcon = status => {
      if (!status) return 'bi-question-circle';
      const icons = {
        [LEAD_STATUS.INTERESTED]: 'bi-heart-fill',
        [LEAD_STATUS.REJECTED]: 'bi-x-circle-fill',
        [LEAD_STATUS.SUCCESS]: 'bi-check-circle-fill',
        [LEAD_STATUS.MAYBE_LATER]: 'bi-clock-fill',
      };
      return icons[status] || 'bi-circle';
    };

    const formatDateTime = date => {
      if (!date) return '';
      const d = new Date(date);
      const day = d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      return `${day} ${time}`;
    };

    // Helper function to get time indicator color for a lead
    const getTimeIndicator = lead => {
      if (!lead || !lead.createdAt) return null;
      const stage = lead.pipelineStage || lead.stage;
      // Only show indicator for leads not in CLOSED stage
      if (stage === PIPELINE_STAGES.CLOSED) return null;

      const createdDate = new Date(lead.createdAt);
      const now = new Date();
      const monthsDiff = (now - createdDate) / (1000 * 60 * 60 * 24 * 30); // Approximate months

      if (monthsDiff < 1) return 'green';
      if (monthsDiff < 3) return 'yellow';
      return 'red';
    };

    // Helper function to get time indicator label
    const getTimeIndicatorLabel = indicator => {
      if (!indicator) return '';
      const labels = {
        green: $t('businessLeadPipeline.timeIndicator.green') || 'Less than 1 month',
        yellow: $t('businessLeadPipeline.timeIndicator.yellow') || '1-3 months',
        red: $t('businessLeadPipeline.timeIndicator.red') || 'More than 3 months',
      };
      return labels[indicator] || indicator;
    };

    // Helper function to get temperature indicator (color class)
    const getTemperatureIndicator = lead => {
      if (!lead || !lead.temperature) return null;
      const temp = lead.temperature.toUpperCase();
      if (temp === 'QUENTE') return 'danger'; // Red
      if (temp === 'MORNO') return 'success'; // Green
      if (temp === 'FRIO') return 'primary'; // Blue
      return null;
    };

    // Helper function to get temperature label
    const getTemperatureLabel = temperature => {
      if (!temperature) return '';
      const temp = temperature.toUpperCase();
      const labels = {
        QUENTE: $t('businessLeadPipeline.temperatureQuente') || 'Quente (Hot)',
        MORNO: $t('businessLeadPipeline.temperatureMorno') || 'Morno (Warm)',
        FRIO: $t('businessLeadPipeline.temperatureFrio') || 'Frio (Cold)',
      };
      return labels[temp] || temperature;
    };

    // Helper function to get source label
    const getSourceLabel = source => {
      if (!source) return '';
      // Map source values to translation keys
      const sourceMap = {
        manual: 'businessLeadPipeline.source.manual',
        'contact-form': 'businessLeadPipeline.source.contact-form',
        'exit-intent': 'businessLeadPipeline.source.exit-intent',
        publicSite: 'businessLeadPipeline.source.publicSite',
      };
      const translationKey = sourceMap[source] || `leadPipeline.source.${source}`;
      const translated = $t(translationKey);
      // If translation doesn't exist, return a formatted version of the source
      if (translated === translationKey) {
        return source.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      return translated;
    };

    // Helper function to get service name by ID
    const getServiceName = serviceId => {
      if (!serviceId) return '';
      const service = serviceStore.getServiceById(serviceId);
      return service?.name || $t('businessLeadPipeline.unknownService') || 'Serviço Desconhecido';
    };

    // Use global commerce from store
    const globalCommerce = computed(() => store.getCurrentCommerce);

    // Watch for commerce changes and load services accordingly
    watch(globalCommerce, async (newCommerce, oldCommerce) => {
      if (newCommerce && newCommerce.id && newCommerce.id !== oldCommerce?.id) {
        await loadServices();
      }
    }, { immediate: false });

    // Helper function to load services for current commerce
    const loadServices = async () => {
      try {
        // Use global commerce directly
        const currentCommerce = globalCommerce.value;

        if (currentCommerce && currentCommerce.id) {
          try {
            await serviceStore.fetchActiveServicesByCommerce(currentCommerce.id);
            return;
          } catch (error) {
            console.error('Failed to load services for commerce:', currentCommerce.id, error);
          }
        }

        // Fallback: ensure services array is initialized
        ensureServicesAvailable();

      } catch (error) {
        console.error('Critical error in loadServices:', error);
        ensureServicesAvailable();
      }
    };

    // Ensure services array is initialized, don't load fake data
    const ensureServicesAvailable = () => {
      if (!serviceStore.services) {
        serviceStore.services = [];
        serviceStore.error = null;
      }
    };

    // Direct REST call fallback function for services
    const loadServicesDirect = async (commerceId) => {
      try {
        const services = await getActiveServicesByCommerceId(commerceId);

        // Update store directly
        serviceStore.services = services || [];
        serviceStore.error = null;

        return services || [];
      } catch (error) {
        console.error('Direct REST call failed:', error);
        serviceStore.error = error.message;
        serviceStore.services = [];
        return [];
      }
    };

    // Test backend connectivity
    const testBackendConnectivity = async () => {
      try {
        const currentCommerce = globalCommerce.value;

        // Test network connectivity first
        try {
          const response = await fetch('/api/health', {
            method: 'GET',
            timeout: 5000
          });
        } catch (networkError) {
          // Silent fail for network test
        }

        // Try to make a simple backend call to test connectivity
        if (currentCommerce?.id) {
          try {
            const services = await loadServicesDirect(currentCommerce.id);
          } catch (apiError) {
            // Silent fail for backend test
          }
        }

      } catch (error) {
        console.error('Backend connectivity test failed:', error);
      }
    };

    // Opciones de origen para el filtro
    const originOptions = [
      { value: '', label: $t('businessLeadPipeline.allOrigins') || 'Todos os orígenes' },
      { value: 'REFERENCE', label: $t('businessLeadPipeline.originReference') || 'Referência' },
      { value: 'GOOGLE', label: 'Google' },
      { value: 'WEB_SITE', label: $t('businessLeadPipeline.originWebsite') || 'Website' },
      { value: 'INSTAGRAM', label: 'Instagram' },
      { value: 'FACEBOOK', label: 'Facebook' },
      { value: 'EMAIL', label: 'Email' },
      { value: 'MARKETING', label: $t('businessLeadPipeline.originMarketing') || 'Publicidade' },
      { value: 'TV', label: $t('businessLeadPipeline.originTV') || 'Televisão' },
      { value: 'RADIO', label: $t('businessLeadPipeline.originRadio') || 'Rádio' },
      { value: 'TIK_TOK', label: 'TikTok' },
      { value: 'WHATSAPP', label: 'WhatsApp' },
      { value: 'CALL', label: $t('businessLeadPipeline.originCall') || 'Chamada' },
      { value: 'OTHER', label: $t('businessLeadPipeline.originOther') || 'Outro' }
    ];

    // Toggle status filter
    const toggleStatusFilter = async status => {
      filtering.value = true;
      const index = statusFilter.value.indexOf(status);
      if (index > -1) {
        statusFilter.value.splice(index, 1);
      } else {
        statusFilter.value.push(status);
      }
      await loadLeads();
      filtering.value = false;
    };

    // Toggle time indicator filter
    const toggleTimeIndicatorFilter = async indicator => {
      filtering.value = true;
      const index = timeIndicatorFilter.value.indexOf(indicator);
      if (index > -1) {
        timeIndicatorFilter.value.splice(index, 1);
      } else {
        timeIndicatorFilter.value.push(indicator);
      }
      await loadLeads();
      filtering.value = false;
    };

    // Reset status filters
    const resetStatusFilters = async () => {
      filtering.value = true;
      statusFilter.value = [];
      await loadLeads();
      filtering.value = false;
    };

    // Reset time indicator filters
    const resetTimeIndicatorFilters = async () => {
      filtering.value = true;
      timeIndicatorFilter.value = [];
      await loadLeads();
      filtering.value = false;
    };

    // Toggle temperature filter
    const toggleTemperatureFilter = async temperature => {
      filtering.value = true;
      const tempUpper = temperature.toUpperCase();
      const index = temperatureFilter.value.indexOf(tempUpper);
      if (index > -1) {
        temperatureFilter.value.splice(index, 1);
      } else {
        temperatureFilter.value.push(tempUpper);
      }
      await loadLeads();
      filtering.value = false;
    };

    // Reset temperature filters
    const resetTemperatureFilters = async () => {
      filtering.value = true;
      temperatureFilter.value = [];
      await loadLeads();
      filtering.value = false;
    };

    // Reset service filter
    const resetServiceFilter = async () => {
      filtering.value = true;
      serviceFilter.value = '';
      await loadLeads();
      filtering.value = false;
    };

    // CSV Export function
    const exportLeadsToCSV = async () => {
      try {
        loading.value = true;

        // Collect all leads from all stages
        const allLeads = [
          ...leads.NEW,
          ...leads.IN_CONTACT,
          ...leads.WAITLIST,
          ...leads.IN_DEAL,
          ...leads.CLOSED,
        ];

        if (allLeads.length === 0) {
          const currentLocale = locale.value || 'es';
          const noLeadsMessages = {
            es: 'No hay leads para exportar',
            pt: 'Não há leads para exportar',
            en: 'No leads to export'
          };
          alertError.value = $t('businessLeadPipeline.noLeadsToExport', noLeadsMessages[currentLocale] || noLeadsMessages['es']);
          loading.value = false;
          return;
        }

        // Fetch contacts and transitions for each lead
        const leadsWithDetails = await Promise.all(
          allLeads.map(async lead => {
            let contacts = [];
            let transitions = [];

            try {
              // Always get contacts from Firebase (backend) - source of truth
              try {
                contacts = await getBusinessLeadContactsFromBackend(lead.id);
              } catch (e) {
                // If Firebase fails, contacts will be empty array
                // Don't use query stack - it's async and may be stale
                console.warn('Failed to get contacts from Firebase:', e);
                contacts = [];
              }

              // Get transitions
              transitions = await getBusinessLeadTransitions(lead.id);

              // Add initial transition if not present
              if (lead.createdAt && !transitions.some(t => t.isInitial)) {
                transitions.push({
                  id: 'initial',
                  oldStage: null,
                  newStage: PIPELINE_STAGES.NEW,
                  status: null,
                  occurredOn: lead.createdAt,
                  createdAt: lead.createdAt,
                  isInitial: true,
                });
              }
            } catch (error) {
              // Fail silently for individual leads
            }

            return {
              lead,
              contacts: contacts || [],
              transitions: transitions || [],
            };
          })
        );

        // Flatten data for CSV
        const csvRows = [];

        // Helper function to format dates
        const formatDateForCSV = date => {
          if (!date) return '';
          if (typeof date === 'object' && date.toDate) {
            return date.toDate().toISOString();
          }
          return new Date(date).toISOString();
        };

        // Helper function to escape CSV values
        const escapeCSV = value => {
          if (value === null || value === undefined) return '';
          const str = String(value);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        // Helper function to get CSV header with localized fallback
        const getCSVHeader = (key, fallbacks) => {
          const currentLocale = locale.value || 'es';
          const fallback = fallbacks[currentLocale] || fallbacks['es'] || key;
          return $t(key, fallback);
        };

        // Header row
        const headers = [
          getCSVHeader('businessLeadPipeline.csv.leadId', { es: 'ID Lead', pt: 'ID Lead', en: 'Lead ID' }),
          getCSVHeader('businessLeadPipeline.csv.name', { es: 'Nombre', pt: 'Nome', en: 'Name' }),
          getCSVHeader('businessLeadPipeline.csv.email', { es: 'Email', pt: 'Email', en: 'Email' }),
          getCSVHeader('businessLeadPipeline.csv.phone', { es: 'Teléfono', pt: 'Telefone', en: 'Phone' }),
          getCSVHeader('businessLeadPipeline.csv.company', { es: 'Empresa', pt: 'Empresa', en: 'Company' }),
          getCSVHeader('businessLeadPipeline.csv.source', { es: 'Origen', pt: 'Origem', en: 'Source' }),
          getCSVHeader('businessLeadPipeline.csv.pipelineStage', { es: 'Etapa Pipeline', pt: 'Etapa Pipeline', en: 'Pipeline Stage' }),
          getCSVHeader('businessLeadPipeline.csv.status', { es: 'Estado', pt: 'Status', en: 'Status' }),
          getCSVHeader('businessLeadPipeline.csv.createdAt', { es: 'Fecha Creación', pt: 'Data Criação', en: 'Created At' }),
          getCSVHeader('businessLeadPipeline.csv.updatedAt', { es: 'Fecha Actualización', pt: 'Data Atualização', en: 'Updated At' }),
          getCSVHeader('businessLeadPipeline.csv.lastContactedAt', { es: 'Último Contacto', pt: 'Último Contato', en: 'Last Contacted At' }),
          getCSVHeader('businessLeadPipeline.csv.assignedTo', { es: 'Asignado a Usuario ID', pt: 'Atribuído ao Usuário ID', en: 'Assigned To User ID' }),
          getCSVHeader('businessLeadPipeline.csv.businessId', { es: 'ID Negocio', pt: 'ID Negócio', en: 'Business ID' }),
          getCSVHeader('businessLeadPipeline.csv.commerceId', { es: 'ID Comercio', pt: 'ID Comércio', en: 'Commerce ID' }),
          getCSVHeader('businessLeadPipeline.csv.message', { es: 'Mensaje', pt: 'Mensagem', en: 'Message' }),
          getCSVHeader('businessLeadPipeline.csv.notes', { es: 'Notas', pt: 'Notas', en: 'Notes' }),
          getCSVHeader('businessLeadPipeline.csv.contactCount', { es: 'Total Contactos', pt: 'Total Contatos', en: 'Contact Count' }),
          getCSVHeader('businessLeadPipeline.csv.contacts', { es: 'Contactos', pt: 'Contatos', en: 'Contacts' }),
          getCSVHeader('businessLeadPipeline.csv.transitionCount', { es: 'Total Transiciones', pt: 'Total Transições', en: 'Transition Count' }),
          getCSVHeader('businessLeadPipeline.csv.transitions', { es: 'Transiciones', pt: 'Transições', en: 'Transitions' }),
        ];
        csvRows.push(headers.join(','));

        // Helper function to format contacts as readable text
        const formatContactsForCSV = contacts => {
          if (!contacts || contacts.length === 0) return '';

          return contacts
            .map(c => {
              const date = c.createdAt
                ? new Date(c.createdAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'N/A';

              const type = c.type || 'UNKNOWN';
              const result = c.result || 'N/A';
              const comment = c.comment ? c.comment.substring(0, 100) : ''; // Limit comment length

              return `${type} - ${result}${comment ? ` - ${comment}` : ''} (${date})`;
            })
            .join(' | ');
        };

        // Helper function to format transitions as readable text
        const formatTransitionsForCSV = transitions => {
          if (!transitions || transitions.length === 0) return '';

          return transitions
            .map(t => {
              const date =
                t.occurredOn || t.createdAt
                  ? new Date(t.occurredOn || t.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A';

              if (t.isInitial) {
                return `Created in ${t.newStage || 'NEW'} (${date})`;
              }

              if (t.isContact) {
                const contactType = t.contactType || 'CONTACT';
                const result = t.status || 'N/A';
                return `${contactType} - ${result} (${date})`;
              }

              if (t.oldStage && t.newStage) {
                return `${t.oldStage} → ${t.newStage}${t.status ? ` (${t.status})` : ''} (${date})`;
              }

              if (t.newStage) {
                return `Moved to ${t.newStage}${t.status ? ` (${t.status})` : ''} (${date})`;
              }

              return `Transition (${date})`;
            })
            .join(' | ');
        };

        // Data rows
        leadsWithDetails.forEach(({ lead, contacts, transitions }) => {
          // Format contacts as readable text
          const contactsText = formatContactsForCSV(contacts);

          // Format transitions as readable text
          const transitionsText = formatTransitionsForCSV(transitions);

          const row = [
            escapeCSV(lead.id),
            escapeCSV(lead.name),
            escapeCSV(lead.email),
            escapeCSV(lead.phone),
            escapeCSV(lead.company),
            escapeCSV(lead.source),
            escapeCSV(lead.pipelineStage || lead.stage),
            escapeCSV(lead.status),
            escapeCSV(formatDateForCSV(lead.createdAt)),
            escapeCSV(formatDateForCSV(lead.updatedAt)),
            escapeCSV(formatDateForCSV(lead.lastContactedAt)),
            escapeCSV(lead.assignedToUserId),
            escapeCSV(lead.businessId),
            escapeCSV(lead.commerceId),
            escapeCSV(lead.message),
            escapeCSV(lead.notes),
            contacts.length,
            escapeCSV(contactsText),
            transitions.length,
            escapeCSV(transitionsText),
          ];
          csvRows.push(row.join(','));
        });

        // Create and download CSV
        const csvContent = csvRows.join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);

        // Generate filename with date range if filtered
        let filename = 'leads_export';
        if (dateFilterFrom.value || dateFilterTo.value) {
          const from = dateFilterFrom.value ? dateFilterFrom.value.replace(/-/g, '') : 'all';
          const to = dateFilterTo.value ? dateFilterTo.value.replace(/-/g, '') : 'all';
          filename += `_${from}_to_${to}`;
        }
        filename += `_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.csv`;

        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        loading.value = false;
      } catch (error) {
        loading.value = false;
        console.error('Error exporting leads to CSV:', error);
        const currentLocale = locale.value || 'es';
        const exportErrorMessages = {
          es: 'Error al exportar leads a CSV',
          pt: 'Erro ao exportar leads para CSV',
          en: 'Error exporting leads to CSV'
        };
        alertError.value = $t('businessLeadPipeline.exportError', exportErrorMessages[currentLocale] || exportErrorMessages['es']);
      }
    };

    // Reset date filters to default (one month ago to today)
    const resetDateFilters = async () => {
      filtering.value = true;
      const today = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);

      dateFilterFrom.value = oneMonthAgo.toISOString().split('T')[0];
      dateFilterTo.value = today.toISOString().split('T')[0];
      // When clearing date filters for the pipeline, ensure we run queries
      // using only the date range for all statuses (clear status/time filters)
      statusFilter.value = [];
      timeIndicatorFilter.value = [];
      temperatureFilter.value = [];
      selectedOrigin.value = '';
      showConvertedOnly.value = 'all';
      await loadLeads(true);
      filtering.value = false;
    };

    // Clear all filters function
    const clearAllFilters = async () => {
      filtering.value = true;
      // Reset all filter values to default
      statusFilter.value = [];
      timeIndicatorFilter.value = [];
      temperatureFilter.value = [];
      serviceFilter.value = null;
      searchText.value = '';
      selectedOrigin.value = '';
      showConvertedOnly.value = 'all';

      // Reset dates to last month
      const today = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);
      dateFilterFrom.value = oneMonthAgo.toISOString().split('T')[0];
      dateFilterTo.value = today.toISOString().split('T')[0];

      await loadLeads(true);
      filtering.value = false;
    };

    // Pipeline carousel navigation refs
    const pipelineContainerMobile = ref(null);
    const pipelineContainerDesktop = ref(null);

    // Pipeline carousel navigation
    const scrollPipelineLeft = () => {
      // Try to find the visible container (mobile or desktop)
      let container = null;

      // Check if mobile container is visible and has ref
      if (pipelineContainerMobile.value) {
        const mobileElement = pipelineContainerMobile.value;
        if (mobileElement.offsetParent !== null) {
          // element is visible
          container = mobileElement;
        }
      }

      // If mobile not found or not visible, try desktop
      if (!container && pipelineContainerDesktop.value) {
        const desktopElement = pipelineContainerDesktop.value;
        if (desktopElement.offsetParent !== null) {
          // element is visible
          container = desktopElement;
        }
      }

      // Fallback to querySelector if refs not available
      if (!container) {
        container = document.querySelector('.pipeline-carousel-container');
      }

      if (container) {
        // Scroll by one column width (300px) plus gap
        const scrollAmount = 320; // column width + gap
        container.scrollBy({
          left: -scrollAmount,
          behavior: 'smooth',
        });
      } else {
        console.warn('Pipeline carousel container not found');
      }
    };

    const scrollPipelineRight = () => {
      // Try to find the visible container (mobile or desktop)
      let container = null;

      // Check if mobile container is visible and has ref
      if (pipelineContainerMobile.value) {
        const mobileElement = pipelineContainerMobile.value;
        if (mobileElement.offsetParent !== null) {
          // element is visible
          container = mobileElement;
        }
      }

      // If mobile not found or not visible, try desktop
      if (!container && pipelineContainerDesktop.value) {
        const desktopElement = pipelineContainerDesktop.value;
        if (desktopElement.offsetParent !== null) {
          // element is visible
          container = desktopElement;
        }
      }

      // Fallback to querySelector if refs not available
      if (!container) {
        container = document.querySelector('.pipeline-carousel-container');
      }

      if (container) {
        // Scroll by one column width (300px) plus gap
        const scrollAmount = 320; // column width + gap
        container.scrollBy({
          left: scrollAmount,
          behavior: 'smooth',
        });
      } else {
        console.warn('Pipeline carousel container not found');
      }
    };

    const formatDate = date => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    // Pipeline Statistics - Computed values for dashboard
    const pipelineStats = computed(() => {
      const allLeads = [
        ...(leads.NEW || []),
        ...(leads.IN_CONTACT || []),
        ...(leads.WAITLIST || []),
        ...(leads.IN_DEAL || []),
        ...(leads.CLOSED || []),
      ];

      const totalLeads = allLeads.length;
      const activeLeads = totalLeads - (leads.CLOSED?.length || 0);
      const closedLeads = leads.CLOSED?.length || 0;
      const successLeads = allLeads.filter(l => l.status === LEAD_STATUS.SUCCESS).length;
      const rejectedLeads = allLeads.filter(l => l.status === LEAD_STATUS.REJECTED).length;

      // Conversion rate: (SUCCESS / total that reached IN_DEAL or CLOSED) * 100
      const reachedDealOrClosed = (leads.IN_DEAL?.length || 0) + closedLeads;
      const conversionRate =
        reachedDealOrClosed > 0 ? ((successLeads / reachedDealOrClosed) * 100).toFixed(1) : 0;

      // Overall conversion: SUCCESS / total leads
      const overallConversion = totalLeads > 0 ? ((successLeads / totalLeads) * 100).toFixed(1) : 0;

      // Distribution by stage
      const stageDistribution = {
        NEW: leads.NEW?.length || 0,
        IN_CONTACT: leads.IN_CONTACT?.length || 0,
        WAITLIST: leads.WAITLIST?.length || 0,
        IN_DEAL: leads.IN_DEAL?.length || 0,
        CLOSED: closedLeads,
      };

      // Distribution by source
      const sourceDistribution = {};
      allLeads.forEach(lead => {
        const source = lead.source || 'manual';
        sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;
      });

      // Distribution by time indicator
      const timeDistribution = {
        green: 0,
        yellow: 0,
        red: 0,
      };
      allLeads.forEach(lead => {
        const indicator = getTimeIndicator(lead);
        if (indicator && Object.prototype.hasOwnProperty.call(timeDistribution, indicator)) {
          timeDistribution[indicator]++;
        }
      });

      // Average age of leads (in days)
      const now = new Date();
      const totalAge = allLeads.reduce((sum, lead) => {
        if (!lead.createdAt) return sum;
        const age = (now - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24); // days
        return sum + age;
      }, 0);
      const avgAge = totalLeads > 0 ? (totalAge / totalLeads).toFixed(1) : 0;

      // Stage transition rates
      const newToContact =
        stageDistribution.IN_CONTACT +
        stageDistribution.WAITLIST +
        stageDistribution.IN_DEAL +
        stageDistribution.CLOSED;
      const newToContactRate =
        stageDistribution.NEW > 0
          ? ((newToContact / (stageDistribution.NEW + newToContact)) * 100).toFixed(1)
          : 0;

      const contactToDeal = stageDistribution.IN_DEAL + stageDistribution.CLOSED;
      const contactToDealRate =
        stageDistribution.IN_CONTACT > 0
          ? ((contactToDeal / (stageDistribution.IN_CONTACT + contactToDeal)) * 100).toFixed(1)
          : 0;

      // Success vs Rejected ratio
      const successRejectedRatio =
        rejectedLeads > 0
          ? (successLeads / rejectedLeads).toFixed(2)
          : successLeads > 0
          ? '∞'
          : '0';

      return {
        totalLeads,
        activeLeads,
        closedLeads,
        successLeads,
        rejectedLeads,
        conversionRate,
        overallConversion,
        stageDistribution,
        sourceDistribution,
        timeDistribution,
        avgAge,
        newToContactRate,
        contactToDealRate,
        successRejectedRatio,
      };
    });

    // Desktop filters collapsed state
    const desktopFiltersCollapsed = ref(true);

    // Intelligent Insights - Automatically generated recommendations
    const pipelineInsights = computed(() => {
      const insights = [];
      const stats = pipelineStats.value;

      // Critical Alerts (Urgent issues)
      if (stats.timeDistribution.red > 0) {
        const percentOld = ((stats.timeDistribution.red / stats.activeLeads) * 100).toFixed(1);
        insights.push({
          type: 'critical',
          category: 'urgency',
          icon: 'bi-exclamation-triangle-fill',
          title: $t('businessLeadPipeline.insights.staleLeads.title') || 'Stale Leads Detected',
          message: $t('businessLeadPipeline.insights.staleLeads.message', {
            count: stats.timeDistribution.red,
            percent: percentOld,
            avgAge: stats.avgAge
          }) || `📊 ${stats.timeDistribution.red} leads (${percentOld}% of active) are older than 3 months. Average age: ${stats.avgAge} days. These leads are at high risk of becoming cold.`,
          action: $t('businessLeadPipeline.insights.staleLeads.action') || 'Prioritize contact or archive them',
        });
      }

      if (stats.stageDistribution.NEW > stats.stageDistribution.IN_CONTACT * 2) {
        const ratio = (
          stats.stageDistribution.NEW / (stats.stageDistribution.IN_CONTACT || 1)
        ).toFixed(1);
        const percentNew = ((stats.stageDistribution.NEW / stats.totalLeads) * 100).toFixed(1);
        insights.push({
          type: 'warning',
          category: 'bottleneck',
          icon: 'bi-funnel',
          title: $t('businessLeadPipeline.insights.bottleneck.title') || 'Bottleneck at NEW Stage',
          message: $t('businessLeadPipeline.insights.bottleneck.message', {
            count: stats.stageDistribution.NEW,
            percent: percentNew,
            ratio: ratio
          }) || `📊 ${stats.stageDistribution.NEW} leads (${percentNew}% of total) are waiting for first contact. Ratio NEW:IN_CONTACT is ${ratio}:1. This may indicate a capacity issue.`,
          action: $t('businessLeadPipeline.insights.bottleneck.action') || 'Increase contact velocity',
        });
      }

      // Conversion Opportunities
      if (parseFloat(stats.conversionRate) < 20 && stats.stageDistribution.IN_DEAL > 0) {
        const dealsToWin = stats.stageDistribution.IN_DEAL + stats.stageDistribution.CLOSED;
        insights.push({
          type: 'warning',
          category: 'conversion',
          icon: 'bi-graph-down',
          title: $t('businessLeadPipeline.insights.lowConversion.title') || 'Low Conversion Rate',
          message: $t('businessLeadPipeline.insights.lowConversion.message', {
            rate: stats.conversionRate,
            wins: stats.successLeads,
            total: dealsToWin,
            gap: (20 - parseFloat(stats.conversionRate)).toFixed(1)
          }) || `📊 Conversion rate: ${stats.conversionRate}% (${stats.successLeads} wins / ${dealsToWin} closed). Industry average: 20-30%. Gap: ${(20 - parseFloat(stats.conversionRate)).toFixed(1)}%`,
          action: $t('businessLeadPipeline.insights.lowConversion.action') || 'Review qualification criteria and sales process',
        });
      }

      // Positive Signals
      if (parseFloat(stats.conversionRate) > 30) {
        const aboveAvg = (parseFloat(stats.conversionRate) - 25).toFixed(1);
        insights.push({
          type: 'success',
          category: 'performance',
          icon: 'bi-trophy-fill',
          title: $t('businessLeadPipeline.insights.excellentConversion.title') || 'Excellent Conversion Rate',
          message: $t('businessLeadPipeline.insights.excellentConversion.message', {
            rate: stats.conversionRate,
            wins: stats.successLeads,
            above: aboveAvg
          }) || `📊 Your conversion rate is ${stats.conversionRate}% (${stats.successLeads} wins) — ${aboveAvg}% above industry average (25%)!`,
          action: $t('businessLeadPipeline.insights.excellentConversion.action') || "Document what's working for consistency",
        });
      }

      // Lead Velocity
      if (stats.stageDistribution.IN_CONTACT > 0 && stats.stageDistribution.IN_DEAL === 0) {
        const contactToDealRate = stats.contactToDealRate;
        insights.push({
          type: 'info',
          category: 'progression',
          icon: 'bi-arrow-right-circle',
          title: $t('businessLeadPipeline.insights.noActiveDeals.title') || 'No Active Deals',
          message: $t('businessLeadPipeline.insights.noActiveDeals.message', {
            contactCount: stats.stageDistribution.IN_CONTACT,
            contactToDealRate: contactToDealRate
          }) || `📊 You have ${stats.stageDistribution.IN_CONTACT} leads in contact but 0 in negotiation. Contact→Deal rate: ${contactToDealRate}%. Potential opportunity: Convert at least 1-2 leads.`,
          action: $t('businessLeadPipeline.insights.noActiveDeals.action') || 'Focus on qualifying and moving interested leads forward',
        });
      }

      // Waitlist Management
      if (stats.stageDistribution.WAITLIST > stats.stageDistribution.IN_CONTACT) {
        const ratio = (
          stats.stageDistribution.WAITLIST / (stats.stageDistribution.IN_CONTACT || 1)
        ).toFixed(1);
        const percentWaitlist = (
          (stats.stageDistribution.WAITLIST / stats.activeLeads) *
          100
        ).toFixed(1);
        insights.push({
          type: 'info',
          category: 'nurturing',
          icon: 'bi-pause-circle-fill',
          title: 'Large Waitlist',
          message: `📊 ${stats.stageDistribution.WAITLIST} leads (${percentWaitlist}% of active) are in waitlist. Ratio WAITLIST:IN_CONTACT is ${ratio}:1. Don't let them go cold.`,
          action: 'Set up automated nurturing campaign',
        });
      }

      // Success Ratio
      if (stats.successLeads > 0 && stats.rejectedLeads > 0) {
        const winRate = (
          (stats.successLeads / (stats.successLeads + stats.rejectedLeads)) *
          100
        ).toFixed(1);
        if (parseFloat(winRate) < 50) {
          insights.push({
            type: 'warning',
            category: 'winrate',
            icon: 'bi-pie-chart',
            title: 'Low Win Rate',
            message: `📊 Win rate: ${winRate}% (${stats.successLeads} wins vs ${
              stats.rejectedLeads
            } losses). Target: 50%+. Gap: ${(50 - parseFloat(winRate)).toFixed(1)}%`,
            action: 'Focus on higher quality leads',
          });
        }
      }

      return insights;
    });

    // Filtered leads based on search text and pagination
    const filteredLeads = computed(() => {
      let baseLeads = leads;

      // First, apply search filter if there's search text
      if (searchText.value && searchText.value.trim() !== '') {
        const searchTerm = searchText.value.toLowerCase().trim();
        baseLeads = {
          NEW: [],
          IN_CONTACT: [],
          WAITLIST: [],
          IN_DEAL: [],
          CLOSED: [],
        };

        // Filter each stage by search term
        Object.keys(leads).forEach(stage => {
          baseLeads[stage] = leads[stage].filter(lead => {
            const name = (lead.name || '').toLowerCase();
            const company = (lead.company || '').toLowerCase();
            const email = (lead.email || '').toLowerCase();
            const idNumber = (lead.idNumber || '').toLowerCase();

            return (
              name.includes(searchTerm) ||
              company.includes(searchTerm) ||
              email.includes(searchTerm) ||
              idNumber.includes(searchTerm)
            );
          });
        });
      }

      // Apply origin filter if selected
      if (selectedOrigin.value && selectedOrigin.value.trim() !== '') {
        if (!baseLeads.NEW) {
          baseLeads = { ...leads };
        }

        Object.keys(baseLeads).forEach(stage => {
          baseLeads[stage] = baseLeads[stage].filter(lead => {
            return lead.personalInfo?.origin === selectedOrigin.value;
          });
        });
      }

      // Then apply pagination if not showing all
      if (!showAll.value) {
        const paginated = {
          NEW: [],
          IN_CONTACT: [],
          WAITLIST: [],
          IN_DEAL: [],
          CLOSED: [],
        };

        Object.keys(baseLeads).forEach(stage => {
          const stageLeads = baseLeads[stage];
          const currentPage = currentPages[stage] || 1;
          const startIndex = (currentPage - 1) * pageSize.value;
          const endIndex = startIndex + pageSize.value;

          paginated[stage] = stageLeads.slice(startIndex, endIndex);
        });

        return paginated;
      }

      return baseLeads;
    });

    // Pagination functions
    const getTotalPages = stage => {
      const stageLeads =
        searchText.value && searchText.value.trim() !== ''
          ? leads[stage].filter(lead => {
              const searchTerm = searchText.value.toLowerCase().trim();
              const name = (lead.name || '').toLowerCase();
              const company = (lead.company || '').toLowerCase();
              const email = (lead.email || '').toLowerCase();
              return (
                name.includes(searchTerm) ||
                company.includes(searchTerm) ||
                email.includes(searchTerm)
              );
            })
          : leads[stage];
      return Math.ceil(stageLeads.length / pageSize.value);
    };

    const goToPage = (stage, page) => {
      const totalPages = getTotalPages(stage);
      if (page >= 1 && page <= totalPages) {
        currentPages[stage] = page;
      }
    };

    const nextPage = stage => {
      const totalPages = getTotalPages(stage);
      if (currentPages[stage] < totalPages) {
        currentPages[stage]++;
      }
    };

    const prevPage = stage => {
      if (currentPages[stage] > 1) {
        currentPages[stage]--;
      }
    };

    const toggleShowAll = () => {
      showAll.value = !showAll.value;
      // Reset all pages to 1 when toggling
      if (!showAll.value) {
        Object.keys(currentPages).forEach(stage => {
          currentPages[stage] = 1;
        });
      }
    };

    const showTop20 = () => {
      showAll.value = false;
      // Reset all pages to 1
      Object.keys(currentPages).forEach(stage => {
        currentPages[stage] = 1;
      });
    };

    const showAdd = async () => {
      showAddLead.value = true;

      // Ensure services are loaded
      if (!serviceStore.services || serviceStore.services.length === 0) {
        await loadServices();
      }

      // Final check - ensure services array is initialized
      ensureServicesAvailable();

      // Ensure toggles are set if not loaded yet
      if (!toggles.value || Object.keys(toggles.value).length === 0) {
        const userType = store.getCurrentUserType;
        if (userType === USER_TYPES.BUSINESS || userType === 'business' || userType === 'administrator') {
          toggles.value = {
            'business.lead-pipeline.view': true,
            'business.lead-pipeline.add': true,
            'business.lead-pipeline.edit': true,
            'business.lead-pipeline.delete': true,
            'business.main-menu.lead-pipeline': true,
          };
        } else if (userType === USER_TYPES.COLLABORATOR || userType === 'collaborator') {
          toggles.value = {
            'collaborator.lead-pipeline.view': true,
            'collaborator.lead-pipeline.add': true,
            'collaborator.lead-pipeline.edit': true,
            'collaborator.main-menu.lead-pipeline': true,
          };
        } else {
          // For master users or fallback
          toggles.value = {
            'business.lead-pipeline.view': true,
            'business.lead-pipeline.add': true,
            'business.lead-pipeline.edit': true,
            'business.lead-pipeline.delete': true,
            'business.lead-pipeline.convert': true,
            'business.main-menu.lead-pipeline': true,
          };
        }
      }
      // Show Bootstrap modal
      const addModalElement = document.getElementById('add-lead');
      if (addModalElement) {
        const addModal = new Modal(addModalElement, {
          backdrop: true,
          keyboard: false,
        });
        addModal.show();
      }
    };

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal');
      if (modalCloseButton) {
        modalCloseButton.click();
      }
    };

    const resetAddForm = () => {
      newLead.name = '';
      newLead.lastName = '';
      newLead.email = '';
      newLead.phone = '';
      newLead.idNumber = '';
      newLead.company = '';
      newLead.message = '';
      newLead.source = 'manual'; // Reset source
      newLead.temperature = 'MORNO'; // Reset to default
      newLead.productId = ''; // Reset service

      // Reset personal info
      newLead.personalInfo.birthday = '';
      newLead.personalInfo.addressText = '';
      newLead.personalInfo.addressCode = '';
      newLead.personalInfo.addressComplement = '';
      newLead.personalInfo.origin = '';
      newLead.personalInfo.code1 = '';
      newLead.personalInfo.code2 = '';
      newLead.personalInfo.code3 = '';
      newLead.personalInfo.healthAgreementId = '';

      // Reset phoneCode to default country (Brazil)
      newLead.phoneCode = '+55'; // Default to Brazil

      formState.addressCodeError = false;
      formState.loadingAddress = false;
      formState.birthdayInput = '';
      formState.showCalendar = false;
      alertError.value = '';
      errorsAdd.value = [];
      nameError.value = false;
      emailError.value = false;
      showAddLead.value = false;
    };

    // Advanced form utility functions
    const findPhoneCode = country => {
      const search = formState.phoneCodes.find(code => code.id === country);
      return search ? search.code : '';
    };

    const onlyNumber = event => {
      const keyCode = event.keyCode ? event.keyCode : event.which;
      if (keyCode < 48 || keyCode > 57) {
        if (keyCode !== 8 && keyCode !== 9 && keyCode !== 46) {
          event.preventDefault();
        }
      }
    };

    const onlyNumberAndLetters = event => {
      const keyCode = event.keyCode ? event.keyCode : event.which;
      // Allow numbers (48-57), letters (65-90, 97-122), backspace (8), tab (9), delete (46)
      if (
        !(keyCode >= 48 && keyCode <= 57) &&
        !(keyCode >= 65 && keyCode <= 90) &&
        !(keyCode >= 97 && keyCode <= 122) &&
        keyCode !== 8 &&
        keyCode !== 9 &&
        keyCode !== 46 &&
        keyCode !== 32
      ) {
        event.preventDefault();
      }
    };

    const onlyLetters = (event) => {
      const char = String.fromCharCode(event.which);
      if (!/[A-Za-z\s]/.test(char)) {
        event.preventDefault();
      }
    };

    // Form validation computed - simplified to minimum requirements
    const isFormValid = computed(() => {
      // Only require name - everything else is optional
      return newLead.name && newLead.name.trim() !== '';
    });

    const getAddress = async () => {
      const addressCode = newLead.personalInfo.addressCode;
      if (!addressCode) return;

      const cleanCep = addressCode.replace(/\D/g, '');
      if (cleanCep.length !== 8) return;

      const validcep = /^[0-9]{8}$/;
      if (validcep.test(cleanCep)) {
        try {
          formState.loadingAddress = true;
          formState.addressCodeError = false;

          const result = await getAddressBR(cleanCep);

          if (result && !result.erro) {
            newLead.personalInfo.addressText = `${result.logradouro}, ${result.bairro}, ${result.localidade} - ${result.uf}`;
            formState.addressCodeError = false;
          } else {
            formState.addressCodeError = true;
          }
        } catch (error) {
          console.error('Erro ao buscar CEP:', error);
          formState.addressCodeError = true;
        } finally {
          formState.loadingAddress = false;
        }
      } else {
        formState.addressCodeError = true;
      }
    };

    // CEP handling function
    const onCepInput = (event) => {
      let value = event.target.value.replace(/\D/g, '');

      // Apply CEP mask: 12345-678
      if (value.length > 5) {
        value = value.substring(0, 5) + '-' + value.substring(5, 8);
      }

      // Update the model
      newLead.personalInfo.addressCode = value;

      // Auto search when CEP is complete (8 digits)
      const cleanValue = value.replace(/\D/g, '');
      if (cleanValue.length === 8) {
        getAddress();
      }
    };

    // Birthday handling functions
    const formatISOtoDisplay = iso => {
      if (!iso) return '';
      try {
        const parts = iso.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      } catch (error) {
        console.warn('Error formatting birthday:', error);
      }
      return iso;
    };

    const formatDisplayToISO = display => {
      if (!display) return '';
      const parts = display.replace(/\D/g, '').match(/(\d{2})(\d{2})(\d{4})/);
      if (parts) {
        return `${parts[3]}-${parts[2]}-${parts[1]}`;
      }
      return '';
    };

    // Birthday helper functions for display formatting
    const formatBirthdayDisplay = iso => {
      return formatISOtoDisplay(iso);
    };

const onBirthdayInput = (val) => {
      // Only allow digits and /
      const cleaned = val.replace(/[^\d\/]/g, '');

      // Auto-format as dd/mm/yyyy
      if (cleaned.length > 0) {
        // Remove all slashes and work with digits only
        const digitsOnly = cleaned.replace(/\//g, '');

        let formatted = '';
        if (digitsOnly.length <= 2) {
          formatted = digitsOnly;
        } else if (digitsOnly.length <= 4) {
          formatted = digitsOnly.slice(0, 2) + '/' + digitsOnly.slice(2);
        } else if (digitsOnly.length <= 8) {
          formatted = digitsOnly.slice(0, 2) + '/' + digitsOnly.slice(2, 4) + '/' + digitsOnly.slice(4, 8);
        } else {
          // Limit to 8 digits (ddmmyyyy)
          formatted = digitsOnly.slice(0, 2) + '/' + digitsOnly.slice(2, 4) + '/' + digitsOnly.slice(4, 8);
        }

        formState.birthdayInput = formatted;

        // Check if the complete formatted date is valid
        if (formatted.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const iso = formatDisplayToISO(formatted);
          if (iso) {
            newLead.personalInfo.birthday = iso;
          } else {
            newLead.personalInfo.birthday = '';
          }
        } else {
          // Incomplete date - clear if not yet complete
          if (formatted.length < 10) {
            newLead.personalInfo.birthday = '';
          }
        }
      } else {
        formState.birthdayInput = '';
        newLead.personalInfo.birthday = '';
      }
    };

    const onBirthdayBlur = () => {
      const iso = formatDisplayToISO(formState.birthdayInput);
      if (iso) {
        newLead.personalInfo.birthday = iso;
        formState.birthdayInput = formatISOtoDisplay(iso);
      }
    };

    // Edit mode utility functions - duplicated from add mode but for editLead
    const getEditAddress = async () => {
      const addressCode = editLead.personalInfo.addressCode;
      if (addressCode && addressCode.length >= 8) {
        const user = store.getCurrentUser;
        const commerce = store.getCurrentCommerce;

        if (commerce && commerce.localeInfo && commerce.localeInfo.country === 'br') {
          const value = addressCode.replace(/\D/g, '');
          const validcep = /^[0-9]{8}$/;

          if (validcep.test(value)) {
            try {
              formState.loadingAddress = true;
              formState.addressCodeError = false;
              const result = await getAddressBR(addressCode);

              if (result && !result.erro) {
                editLead.personalInfo.addressText = `${result.logradouro}, ${result.bairro}, ${result.localidade} ${result.uf}`;
                formState.addressCodeError = false;
              } else {
                editLead.personalInfo.addressText = '';
                formState.addressCodeError = true;
              }
            } catch (error) {
              formState.addressCodeError = true;
              editLead.personalInfo.addressText = '';
            } finally {
              formState.loadingAddress = false;
            }
          }
        }
      }
    };

    const onEditBirthdayInput = event => {
      let value = event.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2);
      }
      if (value.length >= 5) {
        value = value.substring(0, 5) + '/' + value.substring(5, 9);
      }
      formState.birthdayInput = value;

      if (value.length === 10) {
        const iso = formatDisplayToISO(value);
        if (iso) {
          editLead.personalInfo.birthday = iso;
        }
      }
    };

    const onEditCepInput = (event) => {
      let value = event.target.value.replace(/\D/g, '');

      // Apply CEP mask: 12345-678
      if (value.length > 5) {
        value = value.substring(0, 5) + '-' + value.substring(5, 8);
      }

      // Update the model
      editLead.personalInfo.addressCode = value;
    };

    const onEditCepBlur = () => {
      const addressCode = editLead.personalInfo.addressCode;
      if (!addressCode) return;

      const cleanCep = addressCode.replace(/\D/g, '');

      if (cleanCep.length === 8) {
        getEditAddress();
      }
    };

    const onEditBirthdayBlur = () => {
      const iso = formatDisplayToISO(formState.birthdayInput);
      if (iso) {
        editLead.personalInfo.birthday = iso;
        formState.birthdayInput = formatISOtoDisplay(iso);
      }
    };

    const findEditPhoneCode = country => {
      const phoneCode = formState.phoneCodes.find(pc => pc.country.toLowerCase() === country.toLowerCase());
      return phoneCode ? phoneCode.code : '+55';
    };

    const validateNewLead = () => {
      errorsAdd.value = [];
      nameError.value = false;
      emailError.value = false;

      // Name is required
      if (!newLead.name || newLead.name.trim().length === 0) {
        nameError.value = true;
        errorsAdd.value.push('businessLeadPipeline.validate.name');
        return false;
      }

      // Email validation only if provided
      if (newLead.email && newLead.email.trim().length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newLead.email.trim())) {
          emailError.value = true;
          errorsAdd.value.push('businessLeadPipeline.validate.emailFormat');
          return false;
        }
      }

      // Phone code validation only if phone is provided
      if (newLead.phone && newLead.phone.trim().length > 0) {
        if (!newLead.phoneCode || newLead.phoneCode.trim().length === 0) {
          errorsAdd.value.push('businessLeadPipeline.validate.phoneCode');
          return false;
        }
      }

      return true;
    };

    const createLead = async () => {
      if (!validateNewLead()) {
        return;
      }
      try {
        loading.value = true;
        alertError.value = '';

        // Generate a unique ID for the lead
        const leadId = `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const user = store.getCurrentUser;
        const commerce = store.getCurrentCommerce;

        const leadData = {
          id: leadId,
          name: newLead.name?.trim() || '',
          lastName: newLead.lastName?.trim() || '',
          email: newLead.email?.trim() || '',
          phone: newLead.phone?.trim() || '',
          phoneCode: newLead.phoneCode?.trim() || '',
          idNumber: newLead.idNumber?.trim() || '',
          company: newLead.company?.trim() || '',
          message: newLead.message?.trim() || '',
          source: newLead.source || 'manual',
          page: window.location.href,
          temperature: newLead.temperature || 'MORNO',
          productId: newLead.productId?.trim() || '',
          personalInfo: {
            birthday: newLead.personalInfo.birthday || '',
            addressText: newLead.personalInfo.addressText?.trim() || '',
            addressCode: newLead.personalInfo.addressCode?.trim() || '',
            addressComplement: newLead.personalInfo.addressComplement?.trim() || '',
            origin: newLead.personalInfo.origin?.trim() || '',
            code1: newLead.personalInfo.code1?.trim() || '',
            code2: newLead.personalInfo.code2?.trim() || '',
            code3: newLead.personalInfo.code3?.trim() || '',
            healthAgreementId: newLead.personalInfo.healthAgreementId?.trim() || '',
          },
          businessId: user?.businessId,
          commerceId: commerce?.id,
        };

        // Create lead - this returns the lead from Firebase immediately
        const createdLead = await createBusinessLead(leadData);

        // Optimistic update: Add the lead to the NEW stage immediately
        // Convert Firebase timestamp to Date if needed
        if (
          createdLead.createdAt &&
          typeof createdLead.createdAt === 'object' &&
          createdLead.createdAt.toDate
        ) {
          createdLead.createdAt = createdLead.createdAt.toDate().toISOString();
        } else if (createdLead.createdAt && typeof createdLead.createdAt === 'string') {
          // Already a string, keep it
        } else if (createdLead.createdAt) {
          createdLead.createdAt = new Date(createdLead.createdAt).toISOString();
        }

        if (
          createdLead.updatedAt &&
          typeof createdLead.updatedAt === 'object' &&
          createdLead.updatedAt.toDate
        ) {
          createdLead.updatedAt = createdLead.updatedAt.toDate().toISOString();
        } else if (createdLead.updatedAt && typeof createdLead.updatedAt === 'string') {
          // Already a string, keep it
        } else if (createdLead.updatedAt) {
          createdLead.updatedAt = new Date(createdLead.updatedAt).toISOString();
        }

        // Add to the beginning of the NEW leads array immediately
        leads.NEW.unshift(createdLead);

        // Reset form and close modal
        resetAddForm();
        closeAddModal();

        // Reload leads from backend (Firebase) to ensure consistency
        // This will show the lead immediately while the event consumer processes it
        await loadLeads(true); // Use backend (Firebase) for immediate results
        loading.value = false;
      } catch (error) {
        loading.value = false;
        // Ensure alertError is always a string or number, not an array
        const errorMessage =
          error?.response?.data?.message || error?.message || $t('businessLeadPipeline.errors.createLead') || 'Error creating lead';
        alertError.value = Array.isArray(errorMessage)
          ? errorMessage[0]
          : error?.response?.status || errorMessage;
      }
    };

    // Permission helper functions based on user type
    const hasPermission = (permission) => {
      const userType = store.getCurrentUserType;

      // Master users have all permissions
      if (userType === USER_TYPES.MASTER || userType === 'master') {
        return true;
      }

      // For business and collaborator users, check their specific permission structure
      if (userType === USER_TYPES.BUSINESS || userType === 'business' || userType === 'administrator') {
        return toggles.value[`business.lead-pipeline.${permission}`] === true;
      } else if (userType === USER_TYPES.COLLABORATOR || userType === 'collaborator') {
        return toggles.value[`collaborator.lead-pipeline.${permission}`] === true;
      }

      return false;
    };

    const canAdd = computed(() => hasPermission('add'));
    const canEdit = computed(() => hasPermission('edit'));
    const canView = computed(() => hasPermission('view'));
    const canDelete = computed(() => hasPermission('delete'));
    const canConvert = computed(() => {
      const userType = store.getCurrentUserType;
      // Convert permission only exists for business users, collaborators don't have it
      if (userType === USER_TYPES.BUSINESS || userType === 'business' || userType === 'administrator' || userType === USER_TYPES.MASTER || userType === 'master') {
        return hasPermission('convert');
      }
      return false;
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;

        // Initialize current user and business first
        const currentUser = await store.getCurrentUser;
        const business = await store.getActualBusiness();

        // Initialize commerce in store if not set (critical for services loading)
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Load permissions based on user type
        const userType = store.getCurrentUserType;
        if (userType === USER_TYPES.BUSINESS || userType === 'business' || userType === 'administrator') {
          toggles.value = await getPermissions('business', 'lead-pipeline');
        } else if (userType === USER_TYPES.COLLABORATOR || userType === 'collaborator') {
          toggles.value = await getPermissions('collaborator', 'lead-pipeline');
        } else {
          // For master users or fallback, use all permissions
          toggles.value = {
            'business.lead-pipeline.view': true,
            'business.lead-pipeline.add': true,
            'business.lead-pipeline.edit': true,
            'business.lead-pipeline.delete': true,
            'business.lead-pipeline.convert': true,
            'business.main-menu.lead-pipeline': true,
          };
        }

        // Load advanced form data
        formState.phoneCodes = getPhoneCodes();
        formState.originCodes = getUserOrigin();

        // Set default phone code to Brazil
        newLead.phoneCode = '+55';

        // Test backend connectivity
        await testBackendConnectivity();

        // Load services for the current commerce
        await loadServices();

        // Load from backend (Firebase) first for immediate consistency
        // Backend has the latest data, query stack may lag behind
        await loadLeads(true); // Use backend for immediate, consistent data
        loading.value = false;
      } catch (error) {
        console.error('Error loading lead pipeline:', error);
        // Always use backend - no fallback to query stack
        const errorMsg = error?.response?.status || error?.message || $t('businessLeadPipeline.errors.loadPipeline') || 'Error loading lead pipeline';
        alertError.value = Array.isArray(errorMsg) ? errorMsg[0] : errorMsg;
        loading.value = false;
      }
    });

    onMounted(async () => {
      const addModal = document.getElementById('add-lead');
      if (addModal) {
        addModal.addEventListener('hidden.bs.modal', resetAddForm);
        addModal.addEventListener('show.bs.modal', async () => {
          showAddLead.value = true;

          // Load services from backend before showing modal
          await loadServices();

          // Ensure toggles are set if not loaded yet
          if (!toggles.value || Object.keys(toggles.value).length === 0) {
            const userType = store.getCurrentUserType;
            if (userType === USER_TYPES.BUSINESS || userType === 'business' || userType === 'administrator') {
              toggles.value = {
                'business.lead-pipeline.view': true,
                'business.lead-pipeline.add': true,
                'business.lead-pipeline.edit': true,
                'business.lead-pipeline.delete': true,
                'business.main-menu.lead-pipeline': true,
              };
            } else if (userType === USER_TYPES.COLLABORATOR || userType === 'collaborator') {
              toggles.value = {
                'collaborator.lead-pipeline.view': true,
                'collaborator.lead-pipeline.add': true,
                'collaborator.lead-pipeline.edit': true,
                'collaborator.main-menu.lead-pipeline': true,
              };
            } else {
              // For master users or fallback
              toggles.value = {
                'business.lead-pipeline.view': true,
                'business.lead-pipeline.add': true,
                'business.lead-pipeline.edit': true,
                'business.lead-pipeline.delete': true,
                'business.lead-pipeline.convert': true,
                'business.main-menu.lead-pipeline': true,
              };
            }
          }
        });
      }

      // Setup lead details modal event listeners
      const leadDetailsModal = document.getElementById('lead-details-modal');
      if (leadDetailsModal) {
        leadDetailsModal.addEventListener('hidden.bs.modal', () => {
          closeLeadDetails();
        });
      }

      // Load services from backend using current commerce - only if commerce is ready
      if (globalCommerce.value?.id) {
        await loadServices();
      }

      // Ensure initial load uses only date filters: clear status and time indicator filters
      statusFilter.value = [];
      timeIndicatorFilter.value = [];
      // Use backend for initial, immediate results filtered only by dates
      loadLeads(true);
    });

    onUnmounted(() => {
      const addModal = document.getElementById('add-lead');
      if (addModal) {
        addModal.removeEventListener('hidden.bs.modal', resetAddForm);
      }
    });

    return {
      loading,
      filtering,
      modalLoading,
      locale,
      alertError,
      leads,
      selectedLead,
      showLeadDetails,
      showAddContact,
      showAddLead,
      newContact,
      newLead,
      toggles,
      errorsAdd,
      refreshLeads,
      handleDragStart,
      handleDragEnd,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      draggedLead,
      dragOverStage,
      PIPELINE_RULES,
      nameError,
      emailError,
      isMaster,
      showAdd,
      closeAddModal,
      resetAddForm,
      PIPELINE_STAGES,
      LEAD_STATUS,
      CONTACT_TYPES,
      CONTACT_RESULTS,
      loadLeads,
      moveLead,
      openLeadDetails,
      closeLeadDetails,
      saveContact,
      archiveLead,
      updateLeadTemperature,
      handleTemperatureChange,
      saveTemperature,
      tempTemperature,
      resetTemperatureField,
      saveMessage,
      tempMessage,
      resetMessageField,
      formatDate,
      getContactResultIcon,
      getContactResultClass,
      getContactResultBadgeClass,
      getContactResultLabel,
      goBack,
      createLead,
      scrollPipelineLeft,
      scrollPipelineRight,
      pipelineContainerMobile,
      pipelineContainerDesktop,
      leadTransitions,
      activeTab,
      getStageLabel,
      getStageIcon,
      getStageColor,
      getStatusLabel,
      getStatusIcon,
      formatDateTime,
      dateFilterFrom,
      dateFilterTo,
      exportLeadsToCSV,
      resetDateFilters,
      clearAllFilters,
      statusFilter,
      timeIndicatorFilter,
      temperatureFilter,
      serviceFilter,
      getTimeIndicator,
      getTimeIndicatorLabel,
      getTemperatureIndicator,
      getTemperatureLabel,
      getSourceLabel,
      toggleStatusFilter,
      toggleTimeIndicatorFilter,
      toggleTemperatureFilter,
      resetStatusFilters,
      resetTimeIndicatorFilters,
      resetTemperatureFilters,
      resetServiceFilter,
      pipelineStats,
      pipelineInsights,
      showAnalytics,
      showMobileFilters,
      desktopFiltersCollapsed,
      searchText,
      selectedOrigin,
      showConvertedOnly,
      originOptions,
      filteredLeads,
      converting,
      convertLeadToClient,
      pageSize,
      showAll,
      currentPages,
      getTotalPages,
      goToPage,
      nextPage,
      prevPage,
      toggleShowAll,
      showTop20,
      isFormValid,
      onlyLetters,
      onlyNumberAndLetters,
      getAddress,
      onCepInput,
      onEditCepInput,
      onEditCepBlur,
      formatBirthdayDisplay,
      // Permission computed properties
      hasPermission,
      canAdd,
      canEdit,
      canView,
      canDelete,
      canConvert,
      formState,
      findPhoneCode,
      onlyNumber,
      editMode,
      editLead,
      startEditMode,
      cancelEditMode,
      saveEditLead,
      getEditAddress,
      onEditBirthdayInput,
      onEditBirthdayBlur,
      findEditPhoneCode,
      // Service functionality
      serviceStore,
      getServiceName,
      loadServices,
      loadServicesDirect,
      testBackendConnectivity,
      ensureServicesAvailable
    };
  },
};
</script>

<template>
  <div v-bind="$attrs">
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none" v-if="!loading && canView">
      <div class="content text-center">
        <CommerceLogo></CommerceLogo>
        <ComponentMenu
          :title="$t('businessLeadPipeline.title')"
          :toggles="toggles"
          component-name="leadPipeline"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <!-- Filtering state spinner -->
          <div v-if="filtering && !loading" class="filtering-spinner text-center">
            <div class="spinner-border spinner-border-sm text-primary" role="status">
              <span class="visually-hidden">Filtrando...</span>
            </div>
            <span class="ms-2 text-muted small">Aplicando filtros...</span>
          </div>
          <!-- Modal loading spinner -->
          <div v-if="modalLoading && !loading" class="modal-loading-spinner text-center">
            <div class="spinner-border spinner-border-sm text-success" role="status">
              <span class="visually-hidden">Cargando detalles...</span>
            </div>
            <span class="ms-2 text-muted small">Cargando detalles del lead...</span>
          </div>
          <Alert :show="!!alertError" :stack="alertError"></Alert>
        </div>

        <!-- Filters Section -->
        <div class="filters-container mb-3">
          <!-- Mobile Filter Toggle Button (Only visible on mobile/tablet) -->
          <div class="d-block d-lg-none mb-2">
            <button
              class="btn btn-xs btn-outline-primary mobile-filter-toggle"
              @click="showMobileFilters = !showMobileFilters"
            >
              <i class="bi" :class="showMobileFilters ? 'bi-funnel-fill' : 'bi-funnel'"></i>
              <span class="mx-1">{{ showMobileFilters ? 'Ocultar' : 'Filtros' }}</span>
              <i class="bi" :class="showMobileFilters ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
            </button>
          </div>

          <!-- Mobile Filters Content (Collapsible) -->
          <div
            class="d-block d-lg-none mobile-filters-wrapper"
            :class="{ collapsed: !showMobileFilters }"
          >
            <div class="mobile-filters-content">
              <!-- Search Filter Row -->
              <div class="filters-row mb-3">
                <div class="filter-group flex-grow-1">
                  <div class="input-with-info">
                    <div class="d-flex gap-2 align-items-center">
                      <div class="input-icon-wrapper flex-grow-1">
                        <i class="bi bi-search input-icon"></i>
                        <input
                          type="text"
                          class="form-control form-control-sm"
                          v-model="searchText"
                          :placeholder="
                            $t('businessLeadPipeline.searchPlaceholder') ||
                            'Buscar por nombre, empresa, email o ID...'
                          "
                        />
                      </div>
                      <button
                        v-if="searchText"
                        class="btn btn-sm btn-outline-secondary"
                        @click="searchText = ''"
                        :title="$t('businessLeadPipeline.clearSearch') || 'Limpar busca'"
                      >
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </div>
                    <Popper
                      class="filter-info-tooltip dark"
                      arrow
                      :content="$t('businessLeadPipeline.searchLeads') || 'Buscar Leads'"
                    >
                      <i class="bi bi-info-circle filter-info-icon"></i>
                    </Popper>
                  </div>
                </div>
              </div>

              <!-- Date Filters Row -->
              <div class="filters-row mb-3">
                <div class="filter-group">
                  <div class="input-with-info">
                    <div class="input-icon-wrapper">
                      <i class="bi bi-calendar-event input-icon"></i>
                      <input
                        id="filterFromDate"
                        class="form-control form-control-sm compact-date-input"
                        type="date"
                        v-model="dateFilterFrom"
                      />
                    </div>
                    <Popper
                      class="filter-info-tooltip dark"
                      arrow
                      :content="$t('businessLeadPipeline.filterFromDate') || 'Data De'"
                    >
                      <i class="bi bi-info-circle filter-info-icon"></i>
                    </Popper>
                  </div>
                </div>
                <div class="filter-group">
                  <div class="input-with-info">
                    <div class="input-icon-wrapper">
                      <i class="bi bi-calendar-check input-icon"></i>
                      <input
                        id="filterToDate"
                        class="form-control form-control-sm compact-date-input"
                        type="date"
                        v-model="dateFilterTo"
                      />
                    </div>
                    <Popper
                      class="filter-info-tooltip dark"
                      arrow
                      :content="$t('businessLeadPipeline.filterToDate') || 'Data Até'"
                    >
                      <i class="bi bi-info-circle filter-info-icon"></i>
                    </Popper>
                  </div>
                </div>
                <div class="filter-group">
                  <div class="input-with-info">
                    <div class="input-icon-wrapper">
                      <select
                        class="form-control form-control-sm compact-select-input"
                        v-model="selectedOrigin"
                      >
                        <option
                          v-for="option in originOptions"
                          :key="option.value"
                          :value="option.value"
                        >
                          {{ option.label }}
                        </option>
                      </select>
                      <i class="bi bi-chevron-down select-arrow"></i>
                    </div>
                    <Popper
                      class="filter-info-tooltip dark"
                      arrow
                      :content="$t('businessLeadPipeline.filterByOrigin') || 'Filtrar por Origen'"
                    >
                      <i class="bi bi-info-circle filter-info-icon"></i>
                    </Popper>
                  </div>
                  <!-- Client Conversion Filter -->
                  <div class="filter-group mb-3">
                    <div class="filter-wrapper">
                      <label class="filter-label">
                        <i class="bi bi-person-check"></i>
                        {{ $t('businessLeadPipeline.clientStatus') || 'Client Status' }}
                      </label>
                      <div class="custom-select-wrapper">
                        <select
                          class="form-select custom-select"
                          v-model="showConvertedOnly"
                        >
                          <option value="all">{{ $t('businessLeadPipeline.allLeads') || 'All Leads' }}</option>
                          <option value="converted">{{ $t('businessLeadPipeline.convertedOnly') || 'Converted to Client' }}</option>
                          <option value="not-converted">{{ $t('businessLeadPipeline.notConvertedOnly') || 'Not Converted' }}</option>
                        </select>
                        <i class="bi bi-chevron-down select-arrow"></i>
                      </div>
                      <Popper
                        class="filter-info-tooltip dark"
                        arrow
                        :content="$t('businessLeadPipeline.filterByClientStatus') || 'Filtrar por Estado de Cliente'"
                      >
                        <i class="bi bi-info-circle filter-info-icon"></i>
                      </Popper>
                    </div>
                  </div>

                  <!-- Product Filter -->
                  <div class="filter-group mb-3">
                    <div class="filter-wrapper">
                      <label class="filter-label">
                        {{ $t('businessLeadPipeline.filterByService') || 'Filtrar por Serviço' }}
                      </label>
                      <div class="custom-select-wrapper">
                        <select
                          class="form-select custom-select"
                          v-model="serviceFilter"
                        >
                          <option value="">{{ $t('businessLeadPipeline.allServices') || 'Todos os Serviços' }}</option>
                          <option
                            v-for="service in serviceStore.getActiveServices"
                            :key="service.id"
                            :value="service.id"
                          >
                            {{ service.name }}
                          </option>
                        </select>
                        <i class="bi bi-chevron-down select-arrow"></i>
                      </div>
                      <Popper
                        class="filter-info-tooltip dark"
                        arrow
                        :content="$t('businessLeadPipeline.filterByProduct') || 'Filter by Product'"
                      >
                        <i class="bi bi-info-circle filter-info-icon"></i>
                      </Popper>
                    </div>
                    <div class="filter-group-action" v-if="serviceFilter">
                      <Popper
                        class="filter-info-tooltip dark"
                        arrow
                        :content="$t('businessLeadPipeline.clearFilter') || 'Clear Filter'"
                      >
                        <button
                          class="btn btn-sm btn-outline-secondary reset-filter-btn"
                          @click="resetServiceFilter"
                        >
                          <i class="bi bi-x-lg"></i>
                        </button>
                      </Popper>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Status Filters -->
              <div class="filters-row mb-3">
                <div class="filter-section-header">
                  <i class="bi bi-funnel-fill filter-section-icon-info"></i>
                  <span class="filter-section-label"></span>
                  <Popper
                    class="filter-info-tooltip dark"
                    arrow
                    :content="$t('businessLeadPipeline.filterByStatus') || 'Filtrar por Status'"
                  >
                    <i class="bi bi-info-circle filter-info-icon"></i>
                  </Popper>
                </div>
                <div class="filter-buttons-group">
                  <Popper
                    v-for="status in Object.values(LEAD_STATUS)"
                    :key="status"
                    class="filter-info-tooltip dark"
                    arrow
                    :content="getStatusLabel(status)"
                  >
                    <button
                      class="btn btn-sm filter-option-btn"
                      :class="
                        statusFilter.includes(status) ? 'btn-primary active' : 'btn-outline-primary'
                      "
                      @click="toggleStatusFilter(status)"
                    >
                      <i :class="getStatusIcon(status)"></i>
                    </button>
                  </Popper>
                </div>
              </div>

              <!-- Compact Time Indicator Filters -->
              <div class="row mb-2">
                <div class="col-12">
                  <div class="compact-filter-section">
                    <Popper
                      class="filter-tooltip dark"
                      arrow
                      :content="
                        $t('businessLeadPipeline.filterByTime') || 'Filtrar por Tempo desde Criação'
                      "
                    >
                      <span class="filter-section-icon">
                        <i class="bi bi-clock-fill"></i>
                      </span>
                    </Popper>
                    <div class="compact-filter-buttons">
                      <Popper
                        class="filter-tooltip dark"
                        arrow
                        :content="getTimeIndicatorLabel('green')"
                      >
                        <button
                          class="btn btn-sm compact-filter-btn"
                          :class="
                            timeIndicatorFilter.includes('green')
                              ? 'btn-success'
                              : 'btn-outline-success'
                          "
                          @click="toggleTimeIndicatorFilter('green')"
                        >
                          <i
                            class="bi bi-circle-fill"
                            style="color: #28a745; font-size: 0.8rem"
                          ></i>
                        </button>
                      </Popper>
                      <Popper
                        class="filter-tooltip dark"
                        arrow
                        :content="getTimeIndicatorLabel('yellow')"
                      >
                        <button
                          class="btn btn-sm compact-filter-btn"
                          :class="
                            timeIndicatorFilter.includes('yellow')
                              ? 'btn-warning'
                              : 'btn-outline-warning'
                          "
                          @click="toggleTimeIndicatorFilter('yellow')"
                        >
                          <i
                            class="bi bi-circle-fill"
                            style="color: #ffc107; font-size: 0.8rem"
                          ></i>
                        </button>
                      </Popper>
                      <Popper
                        class="filter-tooltip dark"
                        arrow
                        :content="getTimeIndicatorLabel('red')"
                      >
                        <button
                          class="btn btn-sm compact-filter-btn"
                          :class="
                            timeIndicatorFilter.includes('red')
                              ? 'btn-danger'
                              : 'btn-outline-danger'
                          "
                          @click="toggleTimeIndicatorFilter('red')"
                        >
                          <i
                            class="bi bi-circle-fill"
                            style="color: #dc3545; font-size: 0.8rem"
                          ></i>
                        </button>
                      </Popper>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Temperature Filters -->
              <div class="row my-2">
                <div class="col-12">
                  <label class="form-label small fw-bold mb-2">{{
                    $t('businessLeadPipeline.filterByTemperature') || 'Filtrar por Prioridade'
                  }}</label>
                  <div class="d-flex flex-wrap gap-2 justify-content-center">
                    <button
                      class="btn btn-sm rounded-pill"
                      :class="
                        temperatureFilter.includes('QUENTE') ? 'btn-danger' : 'btn-outline-danger'
                      "
                      @click="toggleTemperatureFilter('QUENTE')"
                    >
                      <i class="bi bi-thermometer-half me-1"></i>
                      {{ getTemperatureLabel('QUENTE') }}
                    </button>
                    <button
                      class="btn btn-sm rounded-pill"
                      :class="
                        temperatureFilter.includes('MORNO') ? 'btn-success' : 'btn-outline-success'
                      "
                      @click="toggleTemperatureFilter('MORNO')"
                    >
                      <i class="bi bi-thermometer-half me-1"></i>
                      {{ getTemperatureLabel('MORNO') }}
                    </button>
                    <button
                      class="btn btn-sm rounded-pill"
                      :class="
                        temperatureFilter.includes('FRIO') ? 'btn-primary' : 'btn-outline-primary'
                      "
                      @click="toggleTemperatureFilter('FRIO')"
                    >
                      <i class="bi bi-thermometer-half me-1"></i>
                      {{ getTemperatureLabel('FRIO') }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Clear Filter Button -->
              <div class="filters-row mb-3">
                <div class="filter-group-action w-100 text-center">
                  <Popper
                    class="filter-info-tooltip dark"
                    arrow
                    :content="$t('businessLeadPipeline.clearFilter') || 'Limpar Filtro'"
                  >
                    <button
                      class="btn btn-sm btn-outline-dark clear-filter-btn"
                      @click="resetDateFilters"
                      :disabled="loading || filtering"
                    >
                      <i class="bi bi-eraser-fill"></i>
                    </button>
                  </Popper>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!loading" class="lead-pipeline-container">
          <!-- Add Lead Button and Export CSV -->
          <div class="row mb-3">
            <div class="col-12 text-start d-flex gap-2">
              <!-- Desktop Buttons -->
              <div class="d-none d-md-flex gap-2">
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                  @click="showAdd()"
                  :disabled="!canAdd"
                >
                  <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                </button>
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                  @click="showAnalytics = true"
                  :disabled="loading"
                >
                  <i class="bi bi-graph-up-arrow me-1"></i
                  >{{ $t('businessLeadPipeline.analytics.title') || 'Analytics & Insights' }}
                </button>
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                  @click="exportLeadsToCSV"
                  :disabled="loading"
                >
                  <i class="bi bi-download me-1"></i
                  >{{ $t('businessLeadPipeline.exportCSV') || 'Export to CSV' }}
                </button>
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                  @click="refreshLeads"
                  :disabled="loading"
                >
                  <i class="bi bi-arrow-clockwise me-1" :class="{ spinning: loading }"></i>
                  <span v-if="!loading">{{ $t('businessLeadPipeline.refresh') || 'Refresh' }}</span>
                  <span v-else>{{ $t('businessLeadPipeline.refreshing') || 'Refreshing...' }}</span>
                </button>
              </div>

              <!-- Mobile Buttons (Icon Only) -->
              <div class="d-flex d-md-none gap-1 w-100 justify-content-center">
                <button
                  class="btn btn-sm btn-dark mobile-action-btn"
                  @click="showAdd()"
                  :disabled="!canAdd"
                  :title="$t('add')"
                >
                  <i class="bi bi-plus-lg"></i>
                </button>
                <button
                  class="btn btn-sm btn-dark mobile-action-btn"
                  @click="showAnalytics = true"
                  :disabled="loading"
                  :title="$t('businessLeadPipeline.analytics.title') || 'Analytics'"
                >
                  <i class="bi bi-graph-up-arrow"></i>
                </button>
                <button
                  class="btn btn-sm btn-dark mobile-action-btn"
                  @click="exportLeadsToCSV"
                  :disabled="loading"
                  :title="$t('businessLeadPipeline.exportCSV') || 'Export CSV'"
                >
                  <i class="bi bi-download"></i>
                </button>
                <button
                  class="btn btn-sm btn-dark mobile-action-btn"
                  @click="refreshLeads"
                  :disabled="loading"
                  :title="
                    loading
                      ? $t('businessLeadPipeline.refreshing') || 'Refreshing...'
                      : $t('businessLeadPipeline.refresh') || 'Refresh'
                  "
                >
                  <i class="bi bi-arrow-clockwise" :class="{ spinning: loading }"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Pipeline Carousel Container -->
          <div class="pipeline-carousel-wrapper">
            <!-- Left Arrow -->
            <button
              class="pipeline-nav-arrow pipeline-nav-left"
              @click="scrollPipelineLeft"
              aria-label="Scroll left"
            >
              <i class="bi bi-chevron-left"></i>
            </button>

            <!-- Pipeline Columns Container -->
            <div
              class="pipeline-carousel-container"
              :class="{ 'modal-loading': modalLoading }"
              ref="pipelineContainerMobile"
            >
              <div class="pipeline-row">
                <!-- NEW Leads Column -->
                <div class="pipeline-column">
                  <div class="pipeline-header">
                    <h5>
                      <i class="bi bi-inbox-fill"></i>
                      {{ $t('businessLeadPipeline.newLeads') || 'New Leads' }}
                      <span class="badge bg-light text-dark">{{ leads.NEW?.length || 0 }}</span>
                    </h5>
                    <!-- Pagination Controls -->
                    <div v-if="!showAll" class="pagination-controls">
                      <button
                        class="btn btn-sm btn-outline-secondary pagination-btn"
                        @click="prevPage('NEW')"
                        :disabled="currentPages.NEW <= 1"
                        :title="$t('common.previous') || 'Previous'"
                      >
                        <i class="bi bi-chevron-left"></i>
                      </button>
                      <span class="pagination-info">
                        {{ currentPages.NEW }} / {{ getTotalPages('NEW') }}
                      </span>
                      <button
                        class="btn btn-sm btn-outline-secondary pagination-btn"
                        @click="nextPage('NEW')"
                        :disabled="currentPages.NEW >= getTotalPages('NEW')"
                        :title="$t('common.next') || 'Next'"
                      >
                        <i class="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                  <div
                    class="pipeline-body"
                    @dragover.prevent="handleDragOver($event, PIPELINE_STAGES.NEW)"
                    @dragleave="handleDragLeave"
                    @drop.prevent="handleDrop($event, PIPELINE_STAGES.NEW)"
                    :class="{ 'drag-over': dragOverStage === PIPELINE_STAGES.NEW }"
                  >
                    <div
                      v-for="lead in filteredLeads.NEW"
                      :key="lead.id"
                      class="modern-lead-card metric-type-info"
                      :class="{
                        draggable: PIPELINE_RULES.canDrag(lead),
                        'not-draggable': !PIPELINE_RULES.canDrag(lead),
                      }"
                      :draggable="PIPELINE_RULES.canDrag(lead)"
                      @dragstart="handleDragStart($event, lead)"
                      @dragend="handleDragEnd"
                      @click.stop="openLeadDetails(lead, $event)"
                    >
                      <div class="lead-card-header">
                        <div class="lead-icon-container icon-info">
                          <i class="bi bi-person-circle"></i>
                        </div>
                        <div class="lead-title-section">
                          <span class="lead-name-text">{{ lead.name }}{{ lead.lastName ? " " + lead.lastName : "" }}</span>
                          <span class="lead-date-text">{{ formatDate(lead.createdAt) }}</span>
                        </div>
                        <div class="d-flex gap-1 align-items-center">
                          <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                            <span
                              class="badge rounded-pill"
                              :class="{
                                'bg-success': getTimeIndicator(lead) === 'green',
                                'bg-warning': getTimeIndicator(lead) === 'yellow',
                                'bg-danger': getTimeIndicator(lead) === 'red',
                              }"
                              :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                            >
                              <i class="bi bi-circle-fill" style="font-size: 0.5rem"></i>
                            </span>
                          </div>
                          <div
                            class="lead-temperature-indicator"
                            v-if="getTemperatureIndicator(lead)"
                          >
                            <span
                              class="badge rounded-pill"
                              :class="`bg-${getTemperatureIndicator(lead)}`"
                              :title="getTemperatureLabel(lead.temperature)"
                            >
                              <i class="bi bi-thermometer-half" style="font-size: 0.6rem"></i>
                            </span>
                          </div>
                        </div>
                        <div class="lead-actions-mini">
                          <button
                            class="btn btn-sm btn-primary btn-action-mini"
                            @click.stop="moveLead(lead, PIPELINE_STAGES.IN_CONTACT)"
                            :title="$t('businessLeadPipeline.moveToContact') || 'Move to Contact'"
                          >
                            <i class="bi bi-arrow-right"></i>
                          </button>
                        </div>
                      </div>
                      <div class="lead-card-body">
                        <div class="lead-info-row">
                          <div class="lead-info-item">
                            <i class="bi bi-envelope"></i>
                            <span class="lead-info-text">{{ lead.email }}</span>
                          </div>
                          <span
                            class="badge lead-source-badge-mini"
                            :class="{
                              'bg-info':
                                lead.source === 'contact-form' || lead.source === 'exit-intent',
                              'bg-secondary': lead.source === 'manual',
                            }"
                            :title="getSourceLabel(lead.source)"
                          >
                            <i
                              :class="
                                lead.source === 'manual' ? 'bi bi-person-plus' : 'bi bi-globe'
                              "
                            ></i>
                            {{ getSourceLabel(lead.source) }}
                          </span>
                        </div>
                        <div class="lead-info-row" v-if="lead.idNumber">
                          <div class="lead-info-item">
                            <i class="bi bi-card-text"></i>
                            <span class="lead-info-text">{{ lead.idNumber }}</span>
                          </div>
                        </div>
                        <div class="lead-info-row" v-if="lead.phone || lead.company">
                          <div class="lead-info-item" v-if="lead.phone">
                            <i class="bi bi-telephone"></i>
                            <span class="lead-info-text">{{ lead.phone }}</span>
                          </div>
                          <div class="lead-info-item" v-if="lead.company">
                            <i class="bi bi-building"></i>
                            <span class="lead-info-text">{{ lead.company }}</span>
                          </div>
                        </div>
                        <div class="lead-info-row" v-if="lead.productId">
                          <div class="lead-info-item">
                            <span class="badge bg-primary service-badge">{{ getServiceName(lead.productId) }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="lead-card-accent"></div>
                    </div>
                    <div v-if="filteredLeads.NEW.length === 0" class="empty-state">
                      <Message
                        :icon="'inbox'"
                        :title="$t('businessLeadPipeline.noLeads') || 'No new leads'"
                        :content="$t('businessLeadPipeline.noLeadsDesc') || 'No leads in this stage'"
                      />
                    </div>
                  </div>
                </div>

                <!-- IN_CONTACT Leads Column -->
                <div class="pipeline-column">
                  <div class="pipeline-header">
                    <h5>
                      <i class="bi bi-chat-dots-fill"></i>
                      {{ $t('businessLeadPipeline.inContact') || 'In Contact' }}
                      <span class="badge bg-warning text-dark">{{
                        leads.IN_CONTACT?.length || 0
                      }}</span>
                    </h5>
                    <!-- Pagination Controls -->
                    <div v-if="!showAll" class="pagination-controls">
                      <button
                        class="btn btn-sm btn-outline-secondary pagination-btn"
                        @click="prevPage('IN_CONTACT')"
                        :disabled="currentPages.IN_CONTACT <= 1"
                        :title="$t('common.previous') || 'Previous'"
                      >
                        <i class="bi bi-chevron-left"></i>
                      </button>
                      <span class="pagination-info">
                        {{ currentPages.IN_CONTACT }} / {{ getTotalPages('IN_CONTACT') }}
                      </span>
                      <button
                        class="btn btn-sm btn-outline-secondary pagination-btn"
                        @click="nextPage('IN_CONTACT')"
                        :disabled="currentPages.IN_CONTACT >= getTotalPages('IN_CONTACT')"
                        :title="$t('common.next') || 'Next'"
                      >
                        <i class="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                  <div
                    class="pipeline-body"
                    @dragover.prevent="handleDragOver($event, PIPELINE_STAGES.IN_CONTACT)"
                    @dragleave="handleDragLeave"
                    @drop.prevent="handleDrop($event, PIPELINE_STAGES.IN_CONTACT)"
                    :class="{ 'drag-over': dragOverStage === PIPELINE_STAGES.IN_CONTACT }"
                  >
                    <div
                      v-for="lead in filteredLeads.IN_CONTACT"
                      :key="lead.id"
                      class="modern-lead-card metric-type-warning"
                      :class="{
                        draggable: PIPELINE_RULES.canDrag(lead),
                        'not-draggable': !PIPELINE_RULES.canDrag(lead),
                      }"
                      :draggable="PIPELINE_RULES.canDrag(lead)"
                      @dragstart="handleDragStart($event, lead)"
                      @dragend="handleDragEnd"
                      @click.stop="openLeadDetails(lead, $event)"
                    >
                      <div class="lead-card-header">
                        <div class="lead-icon-container icon-warning">
                          <i class="bi bi-chat-dots-fill"></i>
                        </div>
                        <div class="lead-title-section">
                          <span class="lead-name-text">{{ lead.name }}{{ lead.lastName ? " " + lead.lastName : "" }}</span>
                          <span v-if="lead.lastContactedAt" class="lead-date-text">
                            <i class="bi bi-clock"></i>
                            {{ $t('businessLeadPipeline.lastContact') || 'Last contact' }}:
                            {{ formatDate(lead.lastContactedAt) }}
                          </span>
                          <span v-else class="lead-date-text">{{
                            formatDate(lead.createdAt)
                          }}</span>
                        </div>
                        <div class="d-flex gap-1 align-items-center">
                          <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                            <span
                              class="badge rounded-pill"
                              :class="{
                                'bg-success': getTimeIndicator(lead) === 'green',
                                'bg-warning': getTimeIndicator(lead) === 'yellow',
                                'bg-danger': getTimeIndicator(lead) === 'red',
                              }"
                              :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                            >
                              <i class="bi bi-circle-fill" style="font-size: 0.5rem"></i>
                            </span>
                          </div>
                          <div
                            class="lead-temperature-indicator"
                            v-if="getTemperatureIndicator(lead)"
                          >
                            <span
                              class="badge rounded-pill"
                              :class="`bg-${getTemperatureIndicator(lead)}`"
                              :title="getTemperatureLabel(lead.temperature)"
                            >
                              <i class="bi bi-thermometer-half" style="font-size: 0.6rem"></i>
                            </span>
                          </div>
                        </div>
                        <div class="lead-actions-mini">
                          <!-- Move to Waitlist (click "in contacto" logo) -->
                          <button
                            class="btn btn-sm btn-info btn-action-mini"
                            @click.stop="moveLead(lead, PIPELINE_STAGES.WAITLIST)"
                            :title="$t('businessLeadPipeline.moveToWaitlist') || 'Move to Waitlist'"
                          >
                            <i class="bi bi-pause-circle"></i>
                          </button>
                          <!-- Move to In Deal (click "interessado") -->
                          <button
                            class="btn btn-sm btn-success btn-action-mini"
                            @click.stop="moveLead(lead, PIPELINE_STAGES.IN_DEAL)"
                            :title="$t('businessLeadPipeline.interested') || 'Interested - Move to Deal'"
                          >
                            <i class="bi bi-hand-thumbs-up"></i>
                          </button>
                          <!-- Reject - Move to CLOSED with REJECTED status -->
                          <button
                            class="btn btn-sm btn-danger btn-action-mini"
                            @click.stop="
                              moveLead(lead, PIPELINE_STAGES.CLOSED, LEAD_STATUS.REJECTED)
                            "
                            :title="$t('businessLeadPipeline.reject') || 'Reject'"
                          >
                            <i class="bi bi-x-circle"></i>
                          </button>
                        </div>
                      </div>
                      <div class="lead-card-body">
                        <div class="lead-info-row">
                          <div class="lead-info-item">
                            <i class="bi bi-envelope"></i>
                            <span class="lead-info-text">{{ lead.email }}</span>
                          </div>
                          <span
                            class="badge lead-source-badge-mini"
                            :class="{
                              'bg-info':
                                lead.source === 'contact-form' || lead.source === 'exit-intent',
                              'bg-secondary': lead.source === 'manual',
                            }"
                            :title="getSourceLabel(lead.source)"
                          >
                            <i
                              :class="
                                lead.source === 'manual' ? 'bi bi-person-plus' : 'bi bi-globe'
                              "
                            ></i>
                            {{ getSourceLabel(lead.source) }}
                          </span>
                        </div>
                        <div class="lead-info-row" v-if="lead.idNumber">
                          <div class="lead-info-item">
                            <i class="bi bi-card-text"></i>
                            <span class="lead-info-text">{{ lead.idNumber }}</span>
                          </div>
                        </div>
                        <div class="lead-info-row" v-if="lead.phone || lead.company">
                          <div class="lead-info-item" v-if="lead.phone">
                            <i class="bi bi-telephone"></i>
                            <span class="lead-info-text">{{ lead.phone }}</span>
                          </div>
                          <div class="lead-info-item" v-if="lead.company">
                            <i class="bi bi-building"></i>
                            <span class="lead-info-text">{{ lead.company }}</span>
                          </div>
                        </div>
                        <div class="lead-info-row" v-if="lead.productId">
                          <div class="lead-info-item">
                            <span class="badge bg-primary service-badge">{{ getServiceName(lead.productId) }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="lead-card-accent"></div>
                    </div>
                    <div v-if="filteredLeads.IN_CONTACT.length === 0" class="empty-state">
                      <Message
                        :icon="'chat-dots'"
                        :title="$t('businessLeadPipeline.noLeads') || 'No leads in contact'"
                        :content="$t('businessLeadPipeline.noLeadsDesc') || 'No leads in this stage'"
                      />
                    </div>
                  </div>
                </div>

                <!-- WAITLIST Leads Column -->
                <div class="pipeline-column">
                  <div class="pipeline-header">
                    <h5>
                      <i class="bi bi-pause-circle-fill"></i>
                      {{ $t('businessLeadPipeline.waitlist') || 'Waitlist' }}
                      <span class="badge bg-info text-dark">{{ leads.WAITLIST?.length || 0 }}</span>
                    </h5>
                    <!-- Pagination Controls -->
                    <div v-if="!showAll" class="pagination-controls">
                      <button
                        class="btn btn-sm btn-outline-secondary pagination-btn"
                        @click="prevPage('WAITLIST')"
                        :disabled="currentPages.WAITLIST <= 1"
                        :title="$t('common.previous') || 'Previous'"
                      >
                        <i class="bi bi-chevron-left"></i>
                      </button>
                      <span class="pagination-info">
                        {{ currentPages.WAITLIST }} / {{ getTotalPages('WAITLIST') }}
                      </span>
                      <button
                        class="btn btn-sm btn-outline-secondary pagination-btn"
                        @click="nextPage('WAITLIST')"
                        :disabled="currentPages.WAITLIST >= getTotalPages('WAITLIST')"
                        :title="$t('common.next') || 'Next'"
                      >
                        <i class="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                  <div
                    class="pipeline-body"
                    @dragover.prevent="handleDragOver($event, PIPELINE_STAGES.WAITLIST)"
                    @dragleave="handleDragLeave"
                    @drop.prevent="handleDrop($event, PIPELINE_STAGES.WAITLIST)"
                    :class="{ 'drag-over': dragOverStage === PIPELINE_STAGES.WAITLIST }"
                  >
                    <div
                      v-for="lead in filteredLeads.WAITLIST"
                      :key="lead.id"
                      class="modern-lead-card metric-type-info"
                      :class="{
                        draggable: PIPELINE_RULES.canDrag(lead),
                        'not-draggable': !PIPELINE_RULES.canDrag(lead),
                      }"
                      :draggable="PIPELINE_RULES.canDrag(lead)"
                      @dragstart="handleDragStart($event, lead)"
                      @dragend="handleDragEnd"
                      @click.stop="openLeadDetails(lead, $event)"
                    >
                      <div class="lead-card-header">
                        <div class="lead-icon-container icon-info">
                          <i class="bi bi-pause-circle-fill"></i>
                        </div>
                        <div class="lead-title-section">
                          <span class="lead-name-text">{{ lead.name }}{{ lead.lastName ? " " + lead.lastName : "" }}</span>
                          <span class="lead-date-text">{{
                            formatDate(lead.updatedAt || lead.createdAt)
                          }}</span>
                        </div>
                        <div class="d-flex gap-1 align-items-center">
                          <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                            <span
                              class="badge rounded-pill"
                              :class="{
                                'bg-success': getTimeIndicator(lead) === 'green',
                                'bg-warning': getTimeIndicator(lead) === 'yellow',
                                'bg-danger': getTimeIndicator(lead) === 'red',
                              }"
                              :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                            >
                              <i class="bi bi-circle-fill" style="font-size: 0.5rem"></i>
                            </span>
                          </div>
                          <div
                            class="lead-temperature-indicator"
                            v-if="getTemperatureIndicator(lead)"
                          >
                            <span
                              class="badge rounded-pill"
                              :class="`bg-${getTemperatureIndicator(lead)}`"
                              :title="getTemperatureLabel(lead.temperature)"
                            >
                              <i class="bi bi-thermometer-half" style="font-size: 0.6rem"></i>
                            </span>
                          </div>
                        </div>
                        <div class="lead-actions-mini">
                          <!-- Move back to IN_CONTACT (can be contacted again) -->
                          <button
                            class="btn btn-sm btn-warning btn-action-mini"
                            @click.stop="moveLead(lead, PIPELINE_STAGES.IN_CONTACT)"
                            :title="$t('businessLeadPipeline.moveToContact') || 'Move to Contact'"
                          >
                            <i class="bi bi-arrow-left"></i>
                          </button>
                        </div>
                      </div>
                      <div class="lead-card-body">
                        <div class="lead-info-row">
                          <div class="lead-info-item">
                            <i class="bi bi-envelope"></i>
                            <span class="lead-info-text">{{ lead.email }}</span>
                          </div>
                        </div>
                        <div class="lead-info-row" v-if="lead.idNumber">
                          <div class="lead-info-item">
                            <i class="bi bi-card-text"></i>
                            <span class="lead-info-text">{{ lead.idNumber }}</span>
                          </div>
                        </div>
                        <div class="lead-info-row" v-if="lead.phone">
                          <div class="lead-info-item">
                            <i class="bi bi-telephone"></i>
                            <span class="lead-info-text">{{ lead.phone }}</span>
                          </div>
                        </div>
                        <div class="lead-info-row" v-if="lead.productId">
                          <div class="lead-info-item">
                            <span class="badge bg-primary service-badge">{{ getServiceName(lead.productId) }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="lead-card-accent"></div>
                    </div>
                    <div v-if="filteredLeads.WAITLIST.length === 0" class="empty-state">
                      <Message
                        :icon="'pause-circle'"
                        :title="$t('businessLeadPipeline.noLeads') || 'No leads in waitlist'"
                        :content="$t('businessLeadPipeline.noLeadsDesc') || 'No leads in this stage'"
                      />
                    </div>
                  </div>
                </div>

                <!-- IN_DEAL Leads Column -->
                <div class="pipeline-column">
                  <div class="pipeline-header">
                    <h5>
                      <i class="bi bi-hand-thumbs-up-fill"></i>
                      {{ $t('businessLeadPipeline.inDeal') || 'In Deal' }}
                      <span class="badge bg-success">{{ leads.IN_DEAL?.length || 0 }}</span>
                    </h5>
                    <!-- Pagination Controls -->
                    <div v-if="!showAll" class="pagination-controls">
                      <button
                        class="btn btn-sm btn-outline-secondary pagination-btn"
                        @click="prevPage('IN_DEAL')"
                        :disabled="currentPages.IN_DEAL <= 1"
                        :title="$t('common.previous') || 'Previous'"
                      >
                        <i class="bi bi-chevron-left"></i>
                      </button>
                      <span class="pagination-info">
                        {{ currentPages.IN_DEAL }} / {{ getTotalPages('IN_DEAL') }}
                      </span>
                      <button
                        class="btn btn-sm btn-outline-secondary pagination-btn"
                        @click="nextPage('IN_DEAL')"
                        :disabled="currentPages.IN_DEAL >= getTotalPages('IN_DEAL')"
                        :title="$t('common.next') || 'Next'"
                      >
                        <i class="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                  <div
                    class="pipeline-body"
                    @dragover.prevent="handleDragOver($event, PIPELINE_STAGES.IN_DEAL)"
                    @dragleave="handleDragLeave"
                    @drop.prevent="handleDrop($event, PIPELINE_STAGES.IN_DEAL)"
                    :class="{ 'drag-over': dragOverStage === PIPELINE_STAGES.IN_DEAL }"
                  >
                    <div
                      v-for="lead in filteredLeads.IN_DEAL"
                      :key="lead.id"
                      class="modern-lead-card metric-type-success"
                      :class="{
                        draggable: PIPELINE_RULES.canDrag(lead),
                        'not-draggable': !PIPELINE_RULES.canDrag(lead),
                      }"
                      :draggable="PIPELINE_RULES.canDrag(lead)"
                      @dragstart="handleDragStart($event, lead)"
                      @dragend="handleDragEnd"
                      @click.stop="openLeadDetails(lead, $event)"
                    >
                      <div class="lead-card-header">
                        <div class="lead-icon-container icon-success">
                          <i class="bi bi-hand-thumbs-up-fill"></i>
                        </div>
                        <div class="lead-title-section">
                          <span class="lead-name-text">{{ lead.name }}{{ lead.lastName ? " " + lead.lastName : "" }}</span>
                          <span class="lead-date-text">{{
                            formatDate(lead.updatedAt || lead.createdAt)
                          }}</span>
                        </div>
                        <div class="d-flex gap-1 align-items-center">
                          <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                            <span
                              class="badge rounded-pill"
                              :class="{
                                'bg-success': getTimeIndicator(lead) === 'green',
                                'bg-warning': getTimeIndicator(lead) === 'yellow',
                                'bg-danger': getTimeIndicator(lead) === 'red',
                              }"
                              :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                            >
                              <i class="bi bi-circle-fill" style="font-size: 0.5rem"></i>
                            </span>
                          </div>
                          <div
                            class="lead-temperature-indicator"
                            v-if="getTemperatureIndicator(lead)"
                          >
                            <span
                              class="badge rounded-pill"
                              :class="`bg-${getTemperatureIndicator(lead)}`"
                              :title="getTemperatureLabel(lead.temperature)"
                            >
                              <i class="bi bi-thermometer-half" style="font-size: 0.6rem"></i>
                            </span>
                          </div>
                        </div>
                        <div class="lead-actions-mini">
                          <!-- Move to Waitlist -->
                          <button
                            class="btn btn-sm btn-info btn-action-mini"
                            @click.stop="moveLead(lead, PIPELINE_STAGES.WAITLIST)"
                            :title="$t('businessLeadPipeline.moveToWaitlist') || 'Move to Waitlist'"
                          >
                            <i class="bi bi-pause-circle"></i>
                          </button>
                          <!-- Successful Sale - Move to CLOSED with SUCCESS status -->
                          <button
                            class="btn btn-sm btn-success btn-action-mini"
                            @click.stop="
                              moveLead(lead, PIPELINE_STAGES.CLOSED, LEAD_STATUS.SUCCESS)
                            "
                            :title="$t('businessLeadPipeline.successfulSale') || 'Successful Sale'"
                          >
                            <i class="bi bi-check-circle"></i>
                          </button>
                          <!-- Reject - Move to CLOSED with REJECTED status -->
                          <button
                            class="btn btn-sm btn-danger btn-action-mini"
                            @click.stop="
                              moveLead(lead, PIPELINE_STAGES.CLOSED, LEAD_STATUS.REJECTED)
                            "
                            :title="$t('businessLeadPipeline.reject') || 'Reject'"
                          >
                            <i class="bi bi-x-circle"></i>
                          </button>
                        </div>
                      </div>
                      <div class="lead-card-body">
                        <div class="lead-info-row">
                          <div class="lead-info-item">
                            <i class="bi bi-envelope"></i>
                            <span class="lead-info-text">{{ lead.email }}</span>
                          </div>
                        </div>
                        <div class="lead-info-row" v-if="lead.idNumber">
                          <div class="lead-info-item">
                            <i class="bi bi-card-text"></i>
                            <span class="lead-info-text">{{ lead.idNumber }}</span>
                          </div>
                        </div>
                        <div class="lead-info-row" v-if="lead.phone">
                          <div class="lead-info-item">
                            <i class="bi bi-telephone"></i>
                            <span class="lead-info-text">{{ lead.phone }}</span>
                          </div>
                        </div>
                        <div class="lead-info-row" v-if="lead.productId">
                          <div class="lead-info-item">
                            <span class="badge bg-primary service-badge">{{ getServiceName(lead.productId) }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="lead-card-accent"></div>
                    </div>
                    <div v-if="filteredLeads.IN_DEAL.length === 0" class="empty-state">
                      <Message
                        :icon="'hand-thumbs-up'"
                        :title="$t('businessLeadPipeline.noLeads') || 'No leads in deal'"
                        :content="$t('businessLeadPipeline.noLeadsDesc') || 'No leads in this stage'"
                      />
                    </div>
                  </div>
                </div>

                <!-- CLOSED Leads Column -->
                <div class="pipeline-column">
                  <div class="pipeline-header">
                    <h5>
                      <i class="bi bi-check-circle-fill"></i>
                      {{ $t('businessLeadPipeline.closed') || 'Closed' }}
                      <span class="badge bg-secondary">{{ leads.CLOSED?.length || 0 }}</span>
                    </h5>
                    <!-- Pagination Controls -->
                    <div v-if="!showAll" class="pagination-controls">
                      <button
                        class="btn btn-sm btn-outline-secondary pagination-btn"
                        @click="prevPage('CLOSED')"
                        :disabled="currentPages.CLOSED <= 1"
                        :title="$t('common.previous') || 'Previous'"
                      >
                        <i class="bi bi-chevron-left"></i>
                      </button>
                      <span class="pagination-info">
                        {{ currentPages.CLOSED }} / {{ getTotalPages('CLOSED') }}
                      </span>
                      <button
                        class="btn btn-sm btn-outline-secondary pagination-btn"
                        @click="nextPage('CLOSED')"
                        :disabled="currentPages.CLOSED >= getTotalPages('CLOSED')"
                        :title="$t('common.next') || 'Next'"
                      >
                        <i class="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                  <div
                    class="pipeline-body"
                    @dragover.prevent="handleDragOver($event, PIPELINE_STAGES.CLOSED)"
                    @dragleave="handleDragLeave"
                    @drop.prevent="handleDrop($event, PIPELINE_STAGES.CLOSED)"
                    :class="{ 'drag-over': dragOverStage === PIPELINE_STAGES.CLOSED }"
                  >
                    <div
                      v-for="lead in filteredLeads.CLOSED"
                      :key="lead.id"
                      class="modern-lead-card"
                      :class="{
                        'metric-type-success':
                          lead.status === LEAD_STATUS.INTERESTED ||
                          lead.status === LEAD_STATUS.SUCCESS,
                        'metric-type-error': lead.status === LEAD_STATUS.REJECTED,
                        'metric-type-warning': lead.status === LEAD_STATUS.MAYBE_LATER,
                        'not-draggable': true, // CLOSED is always read-only
                      }"
                      :draggable="false"
                      @click.stop="openLeadDetails(lead, $event)"
                    >
                      <div class="lead-card-header">
                        <div
                          class="lead-icon-container"
                          :class="{
                            'icon-success':
                              lead.status === LEAD_STATUS.INTERESTED ||
                              lead.status === LEAD_STATUS.SUCCESS,
                            'icon-error': lead.status === LEAD_STATUS.REJECTED,
                            'icon-warning': lead.status === LEAD_STATUS.MAYBE_LATER,
                          }"
                        >
                          <i
                            :class="{
                              'bi bi-check-circle-fill':
                                lead.status === LEAD_STATUS.INTERESTED ||
                                lead.status === LEAD_STATUS.SUCCESS,
                              'bi bi-x-circle-fill': lead.status === LEAD_STATUS.REJECTED,
                              'bi bi-clock-fill': lead.status === LEAD_STATUS.MAYBE_LATER,
                            }"
                          ></i>
                        </div>
                        <div class="lead-title-section">
                          <span class="lead-name-text">{{ lead.name }}{{ lead.lastName ? " " + lead.lastName : "" }}</span>
                          <span class="lead-date-text">{{ formatDate(lead.createdAt) }}</span>
                        </div>
                        <div class="lead-status-badges-container">
                          <!-- Client converted indicator -->
                          <span
                            v-if="lead.convertedToClientId"
                            class="badge bg-primary me-1"
                            :title="$t('businessLeadPipeline.convertedToClient') || 'Converted to Client'"
                          >
                            <i class="bi bi-person-check-fill"></i>
                          </span>
                          <!-- Status badge -->
                          <span
                            class="badge lead-status-badge"
                            :class="{
                              'bg-success':
                                lead.status === LEAD_STATUS.INTERESTED ||
                                lead.status === LEAD_STATUS.SUCCESS,
                              'bg-danger': lead.status === LEAD_STATUS.REJECTED,
                              'bg-warning': lead.status === LEAD_STATUS.MAYBE_LATER,
                              'bg-info': !lead.status,
                            }"
                          >
                            {{ lead.status }}
                          </span>
                        </div>
                      </div>
                      <div class="lead-card-body">
                        <div class="lead-info-row">
                          <div class="lead-info-item">
                            <i class="bi bi-envelope"></i>
                            <span class="lead-info-text">{{ lead.email }}</span>
                          </div>
                          <span
                            class="badge lead-source-badge-mini"
                            :class="{
                              'bg-info':
                                lead.source === 'contact-form' || lead.source === 'exit-intent',
                              'bg-secondary': lead.source === 'manual',
                            }"
                            :title="getSourceLabel(lead.source)"
                          >
                            <i
                              :class="
                                lead.source === 'manual' ? 'bi bi-person-plus' : 'bi bi-globe'
                              "
                            ></i>
                            {{ getSourceLabel(lead.source) }}
                          </span>
                        </div>
                        <div class="lead-info-row" v-if="lead.idNumber">
                          <div class="lead-info-item">
                            <i class="bi bi-card-text"></i>
                            <span class="lead-info-text">{{ lead.idNumber }}</span>
                          </div>
                        </div>
                        <div class="lead-info-row" v-if="lead.phone || lead.company">
                          <div class="lead-info-item" v-if="lead.phone">
                            <i class="bi bi-telephone"></i>
                            <span class="lead-info-text">{{ lead.phone }}</span>
                          </div>
                          <div class="lead-info-item" v-if="lead.company">
                            <i class="bi bi-building"></i>
                            <span class="lead-info-text">{{ lead.company }}</span>
                          </div>
                        </div>
                        <div class="lead-info-row" v-if="lead.productId">
                          <div class="lead-info-item">
                            <span class="badge bg-primary service-badge">{{ getServiceName(lead.productId) }}</span>
                          </div>
                        </div>
                        <!-- Convert to Client Action -->
                        <div
                          v-if="lead.status === LEAD_STATUS.SUCCESS && !lead.convertedToClientId"
                          class="lead-convert-action mt-2"
                        >
                          <button
                            class="btn btn-primary btn-sm w-100"
                            :disabled="converting === lead.id"
                            @click.stop="convertLeadToClient(lead)"
                            :title="$t('businessLeadPipeline.convertToClient') || 'Convert to Client'"
                          >
                            <span v-if="converting === lead.id">
                              <i class="bi bi-hourglass"></i>
                              {{ $t('businessLeadPipeline.converting') || 'Converting...' }}
                            </span>
                            <span v-else>
                              <i class="bi bi-person-plus"></i>
                              {{ $t('businessLeadPipeline.convertToClient') || 'Convert to Client' }}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div class="lead-card-accent"></div>
                    </div>
                    <div v-if="filteredLeads.CLOSED.length === 0" class="empty-state">
                      <Message
                        :icon="'check-circle'"
                        :title="$t('businessLeadPipeline.noLeads') || 'No closed leads'"
                        :content="$t('businessLeadPipeline.noLeadsDesc') || 'No leads in this stage'"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Arrow -->
            <button
              class="pipeline-nav-arrow pipeline-nav-right"
              @click="scrollPipelineRight"
              aria-label="Scroll right"
            >
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Access Denied Message - Check permissions before showing content -->
    <div v-if="!loading && !canView">
      <div class="d-block d-lg-none">
        <div class="content text-center">
          <CommerceLogo></CommerceLogo>
          <div class="access-denied-container mt-4">
            <Message
              :title="$t('businessPermissionsAdmin.message.1.title')"
              :content="$t('businessPermissionsAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
      <div class="d-none d-lg-block">
        <div class="content">
          <div class="access-denied-container text-center mt-4">
            <Message
              :title="$t('businessPermissionsAdmin.message.1.title')"
              :content="$t('businessPermissionsAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block" v-if="!loading && canView">
      <div class="content">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <!-- Filtering state spinner -->
          <div v-if="filtering && !loading" class="filtering-spinner text-center">
            <div class="spinner-border spinner-border-sm text-primary" role="status">
              <span class="visually-hidden">Filtrando...</span>
            </div>
            <span class="ms-2 text-muted small">Aplicando filtros...</span>
          </div>
          <!-- Modal loading spinner -->
          <div v-if="modalLoading && !loading" class="modal-loading-spinner text-center">
            <div class="spinner-border spinner-border-sm text-success" role="status">
              <span class="visually-hidden">Cargando detalles...</span>
            </div>
            <span class="ms-2 text-muted small">Cargando detalles del lead...</span>
          </div>
          <Alert :show="!!alertError" :stack="alertError"></Alert>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <div id="commerce-logo-desktop">
                <img
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="$t('logo')"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="$t('businessLeadPipeline.title')"
              :toggles="toggles"
              component-name="leadPipeline"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>

        <!-- Filters Section -->
        <div class="filters-container mb-4">
          <!-- Desktop Filters Row -->
          <div class="desktop-filters-row">
            <!-- Search Filter -->
            <div class="filter-group" style="max-width: 280px">
              <div class="input-with-info">
                <div class="input-icon-wrapper">
                  <i class="bi bi-search input-icon"></i>
                  <input
                    type="text"
                    class="form-control form-control-sm compact-search-input"
                    v-model="searchText"
                    :placeholder="
                      $t('businessLeadPipeline.searchPlaceholder') ||
                      'Buscar por nombre, empresa, email o ID...'
                    "
                  />
                  <button
                    v-if="searchText"
                    class="btn btn-sm clear-search-btn"
                    @click="searchText = ''"
                    :title="$t('businessLeadPipeline.clearSearch') || 'Limpar busca'"
                  >
                    <i class="bi bi-x-circle-fill"></i>
                  </button>
                </div>
                <Popper
                  class="filter-info-tooltip dark"
                  arrow
                  :content="$t('businessLeadPipeline.searchLeads') || 'Buscar Leads'"
                >
                  <i class="bi bi-info-circle filter-info-icon"></i>
                </Popper>
              </div>
            </div>

            <!-- Date Inputs -->
            <div class="filter-group">
              <div class="input-with-info">
                <div class="input-icon-wrapper">
                  <i class="bi bi-calendar-event input-icon"></i>
                  <input
                    id="filterFromDateDesktop"
                    class="form-control form-control-sm compact-date-input"
                    type="date"
                    v-model="dateFilterFrom"
                    @change="loadLeads(true)"
                  />
                </div>
                <Popper
                  class="filter-info-tooltip dark"
                  arrow
                  :content="$t('businessLeadPipeline.filterFromDate') || 'Data De'"
                >
                  <i class="bi bi-info-circle filter-info-icon"></i>
                </Popper>
              </div>
            </div>
            <div class="filter-group">
              <div class="input-with-info">
                <div class="input-icon-wrapper">
                  <i class="bi bi-calendar-check input-icon"></i>
                  <input
                    id="filterToDateDesktop"
                    class="form-control form-control-sm compact-date-input"
                    type="date"
                    v-model="dateFilterTo"
                    @change="loadLeads(true)"
                  />
                </div>
                <Popper
                  class="filter-info-tooltip dark"
                  arrow
                  :content="$t('businessLeadPipeline.filterToDate') || 'Data Até'"
                >
                  <i class="bi bi-info-circle filter-info-icon"></i>
                </Popper>
              </div>
            </div>
            <div class="filter-group">
              <div class="input-with-info">
                <div class="input-icon-wrapper">
                  <select
                    class="form-control form-control-sm compact-select-input"
                    v-model="selectedOrigin"
                    @change="loadLeads(true)"
                  >
                    <option
                      v-for="option in originOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                  <i class="bi bi-chevron-down select-arrow"></i>
                </div>
                <Popper
                  class="filter-info-tooltip dark"
                  arrow
                  :content="$t('businessLeadPipeline.filterByOrigin') || 'Filtrar por Origen'"
                >
                  <i class="bi bi-info-circle filter-info-icon"></i>
                </Popper>
              </div>
            </div>
            <!-- Client Conversion Filter -->
            <div class="filter-group">
              <div class="input-with-info">
                <div class="input-icon-wrapper">
                  <select
                    class="form-control form-control-sm compact-select-input"
                    v-model="showConvertedOnly"
                  >
                    <option value="all">{{ $t('businessLeadPipeline.allLeads') || 'All Leads' }}</option>
                    <option value="converted">{{ $t('businessLeadPipeline.convertedOnly') || 'Converted to Client' }}</option>
                    <option value="not-converted">{{ $t('businessLeadPipeline.notConvertedOnly') || 'Not Converted' }}</option>
                  </select>
                  <i class="bi bi-chevron-down select-arrow"></i>
                </div>
                <Popper
                  class="filter-info-tooltip dark"
                  arrow
                  :content="$t('businessLeadPipeline.filterByClientStatus') || 'Filtrar por Estado de Cliente'"
                >
                  <i class="bi bi-info-circle filter-info-icon"></i>
                </Popper>
              </div>
            </div>
            <!-- Service Filter -->
            <div class="filter-group">
              <div class="input-with-info">
                <div class="input-icon-wrapper">
                  <select
                    class="form-control form-control-sm compact-select-input"
                    v-model="serviceFilter"
                  >
                    <option value="">{{ $t('businessLeadPipeline.allServices') || 'Todos os Serviços' }}</option>
                    <option
                      v-for="service in serviceStore.getActiveServices"
                      :key="service.id"
                      :value="service.id"
                    >
                      {{ service.name }}
                    </option>
                  </select>
                  <i class="bi bi-chevron-down select-arrow"></i>
                </div>
                <Popper
                  class="filter-info-tooltip dark"
                  arrow
                  :content="$t('businessLeadPipeline.filterByService') || 'Filtrar por Serviço'"
                >
                  <i class="bi bi-info-circle filter-info-icon"></i>
                </Popper>
              </div>
            </div>
            <div class="filter-group-action" v-if="serviceFilter">
              <Popper
                class="filter-info-tooltip dark"
                arrow
                :content="$t('businessLeadPipeline.clearFilter') || 'Limpar Filtro'"
              >
                <button
                  class="btn btn-sm btn-outline-secondary clear-filter-btn"
                  @click="resetServiceFilter"
                  :disabled="loading || filtering"
                >
                  <i class="bi bi-x-lg"></i>
                </button>
              </Popper>
            </div>

            <!-- Status Filter Section -->
            <div class="desktop-filter-section">
              <div class="filter-section-header">
                <i class="bi bi-funnel-fill filter-section-icon-info"></i>
                <span class="filter-section-label"></span>
                <Popper
                  class="filter-info-tooltip dark"
                  arrow
                  :content="$t('businessLeadPipeline.filterByStatus') || 'Filtrar por Status'"
                >
                  <i class="bi bi-info-circle filter-info-icon"></i>
                </Popper>
              </div>
              <div class="desktop-filter-buttons">
                <Popper
                  v-for="status in Object.values(LEAD_STATUS)"
                  :key="status"
                  class="filter-info-tooltip dark"
                  arrow
                  :content="getStatusLabel(status)"
                >
                  <button
                    class="btn btn-sm filter-option-btn"
                    :class="
                      statusFilter.includes(status) ? 'btn-primary active' : 'btn-outline-primary'
                    "
                    @click="toggleStatusFilter(status)"
                  >
                    <i :class="getStatusIcon(status)"></i>
                  </button>
                </Popper>
              </div>
            </div>

            <!-- Time Indicator Filter Section -->
            <div class="col-auto">
              <div class="desktop-filter-section">
                <Popper
                  class="filter-tooltip dark"
                  arrow
                  :content="$t('businessLeadPipeline.filterByTime') || 'Filtrar por Tempo desde Criação'"
                >
                  <span class="filter-section-icon">
                    <i class="bi bi-clock-fill"></i>
                  </span>
                </Popper>
                <div class="desktop-filter-buttons">
                  <Popper
                    class="filter-tooltip dark"
                    arrow
                    :content="getTimeIndicatorLabel('green')"
                  >
                    <button
                      class="btn btn-sm compact-filter-btn"
                      :class="
                        timeIndicatorFilter.includes('green')
                          ? 'btn-success'
                          : 'btn-outline-success'
                      "
                      @click="toggleTimeIndicatorFilter('green')"
                    >
                      <i class="bi bi-circle-fill" style="color: #28a745; font-size: 0.8rem"></i>
                    </button>
                  </Popper>
                  <Popper
                    class="filter-tooltip dark"
                    arrow
                    :content="getTimeIndicatorLabel('yellow')"
                  >
                    <button
                      class="btn btn-sm compact-filter-btn"
                      :class="
                        timeIndicatorFilter.includes('yellow')
                          ? 'btn-warning'
                          : 'btn-outline-warning'
                      "
                      @click="toggleTimeIndicatorFilter('yellow')"
                    >
                      <i class="bi bi-circle-fill" style="color: #ffc107; font-size: 0.8rem"></i>
                    </button>
                  </Popper>
                  <Popper class="filter-tooltip dark" arrow :content="getTimeIndicatorLabel('red')">
                    <button
                      class="btn btn-sm compact-filter-btn"
                      :class="
                        timeIndicatorFilter.includes('red') ? 'btn-danger' : 'btn-outline-danger'
                      "
                      @click="toggleTimeIndicatorFilter('red')"
                    >
                      <i class="bi bi-circle-fill" style="color: #dc3545; font-size: 0.8rem"></i>
                    </button>
                  </Popper>
                </div>
              </div>
            </div>

            <!-- Temperature Filter Section -->
            <div class="col-auto">
              <div class="desktop-filter-section">
                <Popper
                  class="filter-tooltip dark"
                  arrow
                  :content="$t('businessLeadPipeline.filterByTemperature') || 'Filtrar por Prioridade'"
                >
                  <span class="filter-section-icon">
                    <i class="bi bi-thermometer-half"></i>
                  </span>
                </Popper>
                <div class="desktop-filter-buttons">
                  <Popper
                    class="filter-tooltip dark"
                    arrow
                    :content="getTemperatureLabel('QUENTE')"
                  >
                    <button
                      class="btn btn-sm compact-filter-btn"
                      :class="
                        temperatureFilter.includes('QUENTE') ? 'btn-danger' : 'btn-outline-danger'
                      "
                      @click="toggleTemperatureFilter('QUENTE')"
                    >
                      <i class="bi bi-thermometer-high"></i>
                    </button>
                  </Popper>
                  <Popper class="filter-tooltip dark" arrow :content="getTemperatureLabel('MORNO')">
                    <button
                      class="btn btn-sm compact-filter-btn"
                      :class="
                        temperatureFilter.includes('MORNO') ? 'btn-success' : 'btn-outline-success'
                      "
                      @click="toggleTemperatureFilter('MORNO')"
                    >
                      <i class="bi bi-thermometer-half"></i>
                    </button>
                  </Popper>
                  <Popper class="filter-tooltip dark" arrow :content="getTemperatureLabel('FRIO')">
                    <button
                      class="btn btn-sm compact-filter-btn"
                      :class="
                        temperatureFilter.includes('FRIO') ? 'btn-primary' : 'btn-outline-primary'
                      "
                      @click="toggleTemperatureFilter('FRIO')"
                    >
                      <i class="bi bi-thermometer-snow"></i>
                    </button>
                  </Popper>
                </div>
              </div>
            </div>

            <!-- Clear Filter Button -->
            <div class="col-auto">
              <div class="desktop-filter-section">
                <Popper
                  class="filter-info-tooltip dark"
                  arrow
                  :content="$t('businessLeadPipeline.clearFilter') || 'Limpar Filtro'"
                >
                  <button
                    class="btn btn-sm btn-outline-dark clear-filter-btn"
                    @click="resetDateFilters"
                    :disabled="loading || filtering"
                  >
                    <i class="bi bi-eraser-fill"></i>
                  </button>
                </Popper>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!loading" class="lead-pipeline-container">
          <!-- Add Lead Button and Export CSV -->
          <div class="row mb-3">
            <div class="col-12 d-flex gap-2">
              <button
                v-if="canAdd"
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                @click="showAdd()"
              >
                <i class="bi bi-plus-circle me-1"></i>{{ $t('businessLeadPipeline.addLead') }}
              </button>
              <button
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                @click="showAnalytics = true"
                :disabled="loading"
              >
                <i class="bi bi-graph-up-arrow me-1"></i
                >{{ $t('businessLeadPipeline.analytics.title') || 'Analytics & Insights' }}
              </button>
              <button
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                @click="exportLeadsToCSV"
                :disabled="loading"
              >
                <i class="bi bi-download me-1"></i
                >{{ $t('businessLeadPipeline.exportCSV') || 'Export to CSV' }}
              </button>
              <button
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                @click="refreshLeads"
                :disabled="loading"
              >
                <i class="bi bi-arrow-clockwise me-1" :class="{ spinning: loading }"></i>
                <span v-if="!loading">{{ $t('businessLeadPipeline.refresh') || 'Refresh' }}</span>
                <span v-else>{{ $t('businessLeadPipeline.refreshing') || 'Refreshing...' }}</span>
              </button>
              <!-- General Pagination Controls -->
              <div class="general-pagination-controls">
                <button
                  class="btn btn-sm btn-outline-primary rounded-pill px-3 py-2"
                  @click="toggleShowAll"
                  :disabled="loading"
                  :title="
                    showAll
                      ? $t('businessLeadPipeline.showLimited') || 'Show Limited (20 per page)'
                      : $t('businessLeadPipeline.showAll') || 'Show All Leads'
                  "
                >
                  <i class="bi me-1" :class="showAll ? 'bi-dash-circle' : 'bi-plus-circle'"></i>
                  {{
                    showAll
                      ? $t('businessLeadPipeline.showLimited') || 'Show Limited'
                      : $t('businessLeadPipeline.showAll') || 'Show All'
                  }}
                </button>
              </div>
            </div>
          </div>

          <!-- Pipeline Container with Carousel -->
          <div class="pipeline-carousel-wrapper">
            <button
              class="pipeline-nav-arrow pipeline-nav-left"
              @click="scrollPipelineLeft"
              aria-label="Scroll left"
            >
              <i class="bi bi-chevron-left"></i>
            </button>

            <div
              class="pipeline-carousel-container"
              :class="{ 'modal-loading': modalLoading }"
              ref="pipelineContainerDesktop"
            >
              <!-- NEW Leads Column -->
              <div class="pipeline-column">
                <div class="pipeline-header">
                  <h5>
                    <i class="bi bi-inbox-fill"></i> {{ $t('businessLeadPipeline.newLeads') }}
                    <span class="badge bg-light text-dark">{{ leads.NEW?.length || 0 }}</span>
                  </h5>
                  <!-- Pagination Controls -->
                  <div v-if="!showAll" class="pagination-controls">
                    <button
                      class="btn btn-sm btn-outline-secondary pagination-btn"
                      @click="prevPage('NEW')"
                      :disabled="currentPages.NEW <= 1"
                      :title="$t('common.previous') || 'Previous'"
                    >
                      <i class="bi bi-chevron-left"></i>
                    </button>
                    <span class="pagination-info">
                      {{ currentPages.NEW }} / {{ getTotalPages('NEW') }}
                    </span>
                    <button
                      class="btn btn-sm btn-outline-secondary pagination-btn"
                      @click="nextPage('NEW')"
                      :disabled="currentPages.NEW >= getTotalPages('NEW')"
                      :title="$t('common.next') || 'Next'"
                    >
                      <i class="bi bi-chevron-right"></i>
                    </button>
                  </div>
                </div>
                <div
                  class="pipeline-body"
                  @dragover.prevent="handleDragOver($event, PIPELINE_STAGES.NEW)"
                  @dragleave="handleDragLeave"
                  @drop.prevent="handleDrop($event, PIPELINE_STAGES.NEW)"
                  :class="{ 'drag-over': dragOverStage === PIPELINE_STAGES.NEW }"
                >
                  <div
                    v-for="lead in filteredLeads.NEW"
                    :key="lead.id"
                    class="modern-lead-card metric-type-primary"
                    :class="{
                      draggable: PIPELINE_RULES.canDrag(lead),
                      'not-draggable': !PIPELINE_RULES.canDrag(lead),
                    }"
                    :draggable="PIPELINE_RULES.canDrag(lead)"
                    @dragstart="handleDragStart($event, lead)"
                    @dragend="handleDragEnd"
                    @click.stop="openLeadDetails(lead, $event)"
                  >
                    <div class="lead-card-header">
                      <div class="lead-icon-container icon-primary">
                        <i class="bi bi-inbox-fill"></i>
                      </div>
                      <div class="lead-title-section">
                        <span class="lead-name-text">{{ lead.name }}{{ lead.lastName ? " " + lead.lastName : "" }}</span>
                        <span class="lead-date-text">
                          <i class="bi bi-clock"></i>
                          {{ formatDate(lead.createdAt) }}
                        </span>
                      </div>
                      <div class="d-flex gap-1 align-items-center">
                        <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                          <span
                            class="badge rounded-pill"
                            :class="{
                              'bg-success': getTimeIndicator(lead) === 'green',
                              'bg-warning': getTimeIndicator(lead) === 'yellow',
                              'bg-danger': getTimeIndicator(lead) === 'red',
                            }"
                            :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                          >
                            <i class="bi bi-circle-fill" style="font-size: 0.5rem"></i>
                          </span>
                        </div>
                        <div
                          class="lead-temperature-indicator"
                          v-if="getTemperatureIndicator(lead)"
                        >
                          <span
                            class="badge rounded-pill"
                            :class="`bg-${getTemperatureIndicator(lead)}`"
                            :title="getTemperatureLabel(lead.temperature)"
                          >
                            <i class="bi bi-thermometer-half" style="font-size: 0.6rem"></i>
                          </span>
                        </div>
                      </div>
                      <div class="lead-actions-mini">
                        <button
                          class="btn btn-sm btn-info btn-action-mini"
                          title="Mover a En Contacto"
                          @click.stop="moveLead(lead.id, PIPELINE_STAGES.IN_CONTACT, null)"
                        >
                          <i class="bi bi-chat-dots-fill"></i>
                        </button>
                      </div>
                    </div>
                    <div class="lead-card-body">
                      <div class="lead-info-row">
                        <div class="lead-info-item">
                          <i class="bi bi-envelope"></i>
                          <span class="lead-info-text">{{ lead.email }}</span>
                        </div>
                        <span
                          class="badge lead-source-badge-mini"
                          :class="{
                            'bg-info':
                              lead.source === 'contact-form' ||
                              lead.source === 'exit-intent' ||
                              lead.source === 'publicSite',
                            'bg-secondary': lead.source === 'manual',
                          }"
                          :title="getSourceLabel(lead.source)"
                        >
                          <i
                            :class="lead.source === 'manual' ? 'bi bi-person-plus' : 'bi bi-globe'"
                          ></i>
                          {{ getSourceLabel(lead.source) }}
                        </span>
                      </div>
                      <div class="lead-info-row" v-if="lead.idNumber">
                        <div class="lead-info-item">
                          <i class="bi bi-card-text"></i>
                          <span class="lead-info-text">{{ lead.idNumber }}</span>
                        </div>
                      </div>
                      <div class="lead-info-row">
                        <div class="lead-info-item">
                          <i class="bi bi-telephone"></i>
                          <span class="lead-info-text">{{ lead.phone }}</span>
                        </div>
                        <div v-if="lead.company" class="lead-info-item">
                          <i class="bi bi-building"></i>
                          <span class="lead-info-text">{{ lead.company }}</span>
                        </div>
                      </div>
                      <div class="lead-info-row" v-if="lead.productId">
                        <div class="lead-info-item">
                          <span class="badge bg-primary service-badge">{{ getServiceName(lead.productId) }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="lead-card-accent"></div>
                  </div>
                  <div
                    v-if="!filteredLeads.NEW || filteredLeads.NEW.length === 0"
                    class="empty-state"
                  >
                    <Message
                      :icon="'inbox'"
                      :title="$t('businessLeadPipeline.noLeads') || 'No new leads'"
                      :content="$t('businessLeadPipeline.noLeadsDesc') || 'No leads in this stage'"
                    />
                  </div>
                </div>
              </div>

              <!-- IN_CONTACT Leads Column -->
              <div class="pipeline-column">
                <div class="pipeline-header">
                  <h5>
                    <i class="bi bi-chat-dots-fill"></i> {{ $t('businessLeadPipeline.inContact') }}
                    <span class="badge bg-warning text-dark">{{
                      leads.IN_CONTACT?.length || 0
                    }}</span>
                  </h5>
                  <!-- Pagination Controls -->
                  <div v-if="!showAll" class="pagination-controls">
                    <button
                      class="btn btn-sm btn-outline-secondary pagination-btn"
                      @click="prevPage('IN_CONTACT')"
                      :disabled="currentPages.IN_CONTACT <= 1"
                      :title="$t('common.previous') || 'Previous'"
                    >
                      <i class="bi bi-chevron-left"></i>
                    </button>
                    <span class="pagination-info">
                      {{ currentPages.IN_CONTACT }} / {{ getTotalPages('IN_CONTACT') }}
                    </span>
                    <button
                      class="btn btn-sm btn-outline-secondary pagination-btn"
                      @click="nextPage('IN_CONTACT')"
                      :disabled="currentPages.IN_CONTACT >= getTotalPages('IN_CONTACT')"
                      :title="$t('common.next') || 'Next'"
                    >
                      <i class="bi bi-chevron-right"></i>
                    </button>
                  </div>
                </div>
                <div
                  class="pipeline-body"
                  @dragover.prevent="handleDragOver($event, PIPELINE_STAGES.IN_CONTACT)"
                  @dragleave="handleDragLeave"
                  @drop.prevent="handleDrop($event, PIPELINE_STAGES.IN_CONTACT)"
                  :class="{ 'drag-over': dragOverStage === PIPELINE_STAGES.IN_CONTACT }"
                >
                  <div
                    v-for="lead in filteredLeads.IN_CONTACT"
                    :key="lead.id"
                    class="modern-lead-card metric-type-warning"
                    :class="{
                      draggable: PIPELINE_RULES.canDrag(lead),
                      'not-draggable': !PIPELINE_RULES.canDrag(lead),
                    }"
                    :draggable="PIPELINE_RULES.canDrag(lead)"
                    @dragstart="handleDragStart($event, lead)"
                    @dragend="handleDragEnd"
                    @click.stop="openLeadDetails(lead, $event)"
                  >
                    <div class="lead-card-header">
                      <div class="lead-icon-container icon-warning">
                        <i class="bi bi-chat-dots-fill"></i>
                      </div>
                      <div class="lead-title-section">
                        <span class="lead-name-text">{{ lead.name }}{{ lead.lastName ? " " + lead.lastName : "" }}</span>
                        <span class="lead-date-text">
                          <i class="bi bi-clock"></i>
                          {{
                            lead.lastContactedAt
                              ? formatDate(lead.lastContactedAt)
                              : formatDate(lead.createdAt)
                          }}
                        </span>
                      </div>
                      <div class="d-flex gap-1 align-items-center">
                        <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                          <span
                            class="badge rounded-pill"
                            :class="{
                              'bg-success': getTimeIndicator(lead) === 'green',
                              'bg-warning': getTimeIndicator(lead) === 'yellow',
                              'bg-danger': getTimeIndicator(lead) === 'red',
                            }"
                            :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                          >
                            <i class="bi bi-circle-fill" style="font-size: 0.5rem"></i>
                          </span>
                        </div>
                        <div
                          class="lead-temperature-indicator"
                          v-if="getTemperatureIndicator(lead)"
                        >
                          <span
                            class="badge rounded-pill"
                            :class="`bg-${getTemperatureIndicator(lead)}`"
                            :title="getTemperatureLabel(lead.temperature)"
                          >
                            <i class="bi bi-thermometer-half" style="font-size: 0.6rem"></i>
                          </span>
                        </div>
                      </div>
                      <div class="lead-actions-mini">
                        <button
                          class="btn btn-sm btn-info btn-action-mini"
                          title="Mover para Lista de Espera"
                          @click.stop="moveLead(lead.id, PIPELINE_STAGES.WAITLIST, null)"
                        >
                          <i class="bi bi-pause-circle"></i>
                        </button>
                        <button
                          class="btn btn-sm btn-success btn-action-mini"
                          title="Interessado"
                          @click.stop="
                            moveLead(lead.id, PIPELINE_STAGES.IN_DEAL, LEAD_STATUS.INTERESTED)
                          "
                        >
                          <i class="bi bi-hand-thumbs-up"></i>
                        </button>
                        <button
                          class="btn btn-sm btn-danger btn-action-mini"
                          title="Rejeitar"
                          @click.stop="
                            moveLead(lead.id, PIPELINE_STAGES.CLOSED, LEAD_STATUS.REJECTED)
                          "
                        >
                          <i class="bi bi-x-circle"></i>
                        </button>
                      </div>
                    </div>
                    <div class="lead-card-body">
                      <div class="lead-info-row">
                        <div class="lead-info-item">
                          <i class="bi bi-envelope"></i>
                          <span class="lead-info-text">{{ lead.email }}</span>
                        </div>
                        <span
                          class="badge lead-source-badge-mini"
                          :class="{
                            'bg-info':
                              lead.source === 'contact-form' ||
                              lead.source === 'exit-intent' ||
                              lead.source === 'publicSite',
                            'bg-secondary': lead.source === 'manual',
                          }"
                          :title="getSourceLabel(lead.source)"
                        >
                          <i
                            :class="lead.source === 'manual' ? 'bi bi-person-plus' : 'bi bi-globe'"
                          ></i>
                          {{ getSourceLabel(lead.source) }}
                        </span>
                      </div>
                      <div class="lead-info-row">
                        <div class="lead-info-item">
                          <i class="bi bi-telephone"></i>
                          <span class="lead-info-text">{{ lead.phone }}</span>
                        </div>
                        <div v-if="lead.company" class="lead-info-item">
                          <i class="bi bi-building"></i>
                          <span class="lead-info-text">{{ lead.company }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="lead-card-accent"></div>
                  </div>
                  <div
                    v-if="!leads.IN_CONTACT || leads.IN_CONTACT.length === 0"
                    class="empty-state"
                  >
                    <Message
                      :icon="'chat-dots'"
                      :title="$t('businessLeadPipeline.noLeads') || 'No leads in contact'"
                      :content="$t('businessLeadPipeline.noLeadsDesc') || 'No leads in this stage'"
                    />
                  </div>
                </div>
              </div>

              <!-- WAITLIST Leads Column -->
              <div class="pipeline-column">
                <div class="pipeline-header">
                  <h5>
                    <i class="bi bi-pause-circle-fill"></i> {{ $t('businessLeadPipeline.waitlist') }}
                    <span class="badge bg-info text-dark">{{ leads.WAITLIST?.length || 0 }}</span>
                  </h5>
                  <!-- Pagination Controls -->
                  <div v-if="!showAll" class="pagination-controls">
                    <button
                      class="btn btn-sm btn-outline-secondary pagination-btn"
                      @click="prevPage('WAITLIST')"
                      :disabled="currentPages.WAITLIST <= 1"
                      :title="$t('common.previous') || 'Previous'"
                    >
                      <i class="bi bi-chevron-left"></i>
                    </button>
                    <span class="pagination-info">
                      {{ currentPages.WAITLIST }} / {{ getTotalPages('WAITLIST') }}
                    </span>
                    <button
                      class="btn btn-sm btn-outline-secondary pagination-btn"
                      @click="nextPage('WAITLIST')"
                      :disabled="currentPages.WAITLIST >= getTotalPages('WAITLIST')"
                      :title="$t('common.next') || 'Next'"
                    >
                      <i class="bi bi-chevron-right"></i>
                    </button>
                  </div>
                </div>
                <div
                  class="pipeline-body"
                  @dragover.prevent="handleDragOver($event, PIPELINE_STAGES.WAITLIST)"
                  @dragleave="handleDragLeave"
                  @drop.prevent="handleDrop($event, PIPELINE_STAGES.WAITLIST)"
                  :class="{ 'drag-over': dragOverStage === PIPELINE_STAGES.WAITLIST }"
                >
                  <div
                    v-for="lead in filteredLeads.WAITLIST"
                    :key="lead.id"
                    class="modern-lead-card metric-type-info"
                    :class="{
                      draggable: PIPELINE_RULES.canDrag(lead),
                      'not-draggable': !PIPELINE_RULES.canDrag(lead),
                    }"
                    :draggable="PIPELINE_RULES.canDrag(lead)"
                    @dragstart="handleDragStart($event, lead)"
                    @dragend="handleDragEnd"
                    @click.stop="openLeadDetails(lead, $event)"
                  >
                    <div class="lead-card-header">
                      <div class="lead-icon-container icon-info">
                        <i class="bi bi-pause-circle-fill"></i>
                      </div>
                      <div class="lead-title-section">
                        <span class="lead-name-text">{{ lead.name }}{{ lead.lastName ? " " + lead.lastName : "" }}</span>
                        <span class="lead-date-text">
                          <i class="bi bi-clock"></i>
                          {{
                            lead.lastContactedAt
                              ? formatDate(lead.lastContactedAt)
                              : formatDate(lead.createdAt)
                          }}
                        </span>
                      </div>
                      <div class="d-flex gap-1 align-items-center">
                        <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                          <span
                            class="badge rounded-pill"
                            :class="{
                              'bg-success': getTimeIndicator(lead) === 'green',
                              'bg-warning': getTimeIndicator(lead) === 'yellow',
                              'bg-danger': getTimeIndicator(lead) === 'red',
                            }"
                            :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                          >
                            <i class="bi bi-circle-fill" style="font-size: 0.5rem"></i>
                          </span>
                        </div>
                        <div
                          class="lead-temperature-indicator"
                          v-if="getTemperatureIndicator(lead)"
                        >
                          <span
                            class="badge rounded-pill"
                            :class="`bg-${getTemperatureIndicator(lead)}`"
                            :title="getTemperatureLabel(lead.temperature)"
                          >
                            <i class="bi bi-thermometer-half" style="font-size: 0.6rem"></i>
                          </span>
                        </div>
                      </div>
                      <div class="lead-actions-mini">
                        <button
                          class="btn btn-sm btn-warning btn-action-mini"
                          title="Volver a En Contacto"
                          @click.stop="moveLead(lead.id, PIPELINE_STAGES.IN_CONTACT, null)"
                        >
                          <i class="bi bi-chat-dots-fill"></i>
                        </button>
                      </div>
                    </div>
                    <div class="lead-card-body">
                      <div class="lead-info-row">
                        <div class="lead-info-item">
                          <i class="bi bi-envelope"></i>
                          <span class="lead-info-text">{{ lead.email }}</span>
                        </div>
                        <span
                          class="badge lead-source-badge-mini"
                          :class="{
                            'bg-info':
                              lead.source === 'contact-form' ||
                              lead.source === 'exit-intent' ||
                              lead.source === 'publicSite',
                            'bg-secondary': lead.source === 'manual',
                          }"
                          :title="getSourceLabel(lead.source)"
                        >
                          <i
                            :class="lead.source === 'manual' ? 'bi bi-person-plus' : 'bi bi-globe'"
                          ></i>
                          {{ getSourceLabel(lead.source) }}
                        </span>
                      </div>
                      <div class="lead-info-row" v-if="lead.idNumber">
                        <div class="lead-info-item">
                          <i class="bi bi-card-text"></i>
                          <span class="lead-info-text">{{ lead.idNumber }}</span>
                        </div>
                      </div>
                      <div class="lead-info-row">
                        <div class="lead-info-item">
                          <i class="bi bi-telephone"></i>
                          <span class="lead-info-text">{{ lead.phone }}</span>
                        </div>
                        <div v-if="lead.company" class="lead-info-item">
                          <i class="bi bi-building"></i>
                          <span class="lead-info-text">{{ lead.company }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="lead-card-accent"></div>
                  </div>
                  <div v-if="!leads.WAITLIST || leads.WAITLIST.length === 0" class="empty-state">
                    <Message
                      :icon="'pause-circle'"
                      :title="$t('businessLeadPipeline.noLeads') || 'No leads in waitlist'"
                      :content="$t('businessLeadPipeline.noLeadsDesc') || 'No leads in this stage'"
                    />
                  </div>
                </div>
              </div>

              <!-- IN_DEAL Leads Column -->
              <div class="pipeline-column">
                <div class="pipeline-header">
                  <h5>
                    <i class="bi bi-hand-thumbs-up-fill"></i> {{ $t('businessLeadPipeline.inDeal') }}
                    <span class="badge bg-success">{{ leads.IN_DEAL?.length || 0 }}</span>
                  </h5>
                  <!-- Pagination Controls -->
                  <div v-if="!showAll" class="pagination-controls">
                    <button
                      class="btn btn-sm btn-outline-secondary pagination-btn"
                      @click="prevPage('IN_DEAL')"
                      :disabled="currentPages.IN_DEAL <= 1"
                      :title="$t('common.previous') || 'Previous'"
                    >
                      <i class="bi bi-chevron-left"></i>
                    </button>
                    <span class="pagination-info">
                      {{ currentPages.IN_DEAL }} / {{ getTotalPages('IN_DEAL') }}
                    </span>
                    <button
                      class="btn btn-sm btn-outline-secondary pagination-btn"
                      @click="nextPage('IN_DEAL')"
                      :disabled="currentPages.IN_DEAL >= getTotalPages('IN_DEAL')"
                      :title="$t('common.next') || 'Next'"
                    >
                      <i class="bi bi-chevron-right"></i>
                    </button>
                  </div>
                </div>
                <div
                  class="pipeline-body"
                  @dragover.prevent="handleDragOver($event, PIPELINE_STAGES.IN_DEAL)"
                  @dragleave="handleDragLeave"
                  @drop.prevent="handleDrop($event, PIPELINE_STAGES.IN_DEAL)"
                  :class="{ 'drag-over': dragOverStage === PIPELINE_STAGES.IN_DEAL }"
                >
                  <div
                    v-for="lead in filteredLeads.IN_DEAL"
                    :key="lead.id"
                    class="modern-lead-card metric-type-success"
                    :class="{
                      draggable: PIPELINE_RULES.canDrag(lead),
                      'not-draggable': !PIPELINE_RULES.canDrag(lead),
                    }"
                    :draggable="PIPELINE_RULES.canDrag(lead)"
                    @dragstart="handleDragStart($event, lead)"
                    @dragend="handleDragEnd"
                    @click.stop="openLeadDetails(lead, $event)"
                  >
                    <div class="lead-card-header">
                      <div class="lead-icon-container icon-success">
                        <i class="bi bi-hand-thumbs-up-fill"></i>
                      </div>
                      <div class="lead-title-section">
                        <span class="lead-name-text">{{ lead.name }}{{ lead.lastName ? " " + lead.lastName : "" }}</span>
                        <span class="lead-date-text">
                          <i class="bi bi-clock"></i>
                          {{
                            lead.lastContactedAt
                              ? formatDate(lead.lastContactedAt)
                              : formatDate(lead.createdAt)
                          }}
                        </span>
                      </div>
                      <div class="d-flex gap-1 align-items-center">
                        <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                          <span
                            class="badge rounded-pill"
                            :class="{
                              'bg-success': getTimeIndicator(lead) === 'green',
                              'bg-warning': getTimeIndicator(lead) === 'yellow',
                              'bg-danger': getTimeIndicator(lead) === 'red',
                            }"
                            :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                          >
                            <i class="bi bi-circle-fill" style="font-size: 0.5rem"></i>
                          </span>
                        </div>
                        <div
                          class="lead-temperature-indicator"
                          v-if="getTemperatureIndicator(lead)"
                        >
                          <span
                            class="badge rounded-pill"
                            :class="`bg-${getTemperatureIndicator(lead)}`"
                            :title="getTemperatureLabel(lead.temperature)"
                          >
                            <i class="bi bi-thermometer-half" style="font-size: 0.6rem"></i>
                          </span>
                        </div>
                      </div>
                      <div class="lead-actions-mini">
                        <button
                          class="btn btn-sm btn-info btn-action-mini"
                          title="Mover para Lista de Espera"
                          @click.stop="moveLead(lead.id, PIPELINE_STAGES.WAITLIST, null)"
                        >
                          <i class="bi bi-pause-circle"></i>
                        </button>
                        <button
                          class="btn btn-sm btn-success btn-action-mini"
                          title="Venda Exitosa"
                          @click.stop="
                            moveLead(lead.id, PIPELINE_STAGES.CLOSED, LEAD_STATUS.SUCCESS)
                          "
                        >
                          <i class="bi bi-check-circle"></i>
                        </button>
                        <button
                          class="btn btn-sm btn-danger btn-action-mini"
                          title="Rejeitar"
                          @click.stop="
                            moveLead(lead.id, PIPELINE_STAGES.CLOSED, LEAD_STATUS.REJECTED)
                          "
                        >
                          <i class="bi bi-x-circle"></i>
                        </button>
                      </div>
                    </div>
                    <div class="lead-card-body">
                      <div class="lead-info-row">
                        <div class="lead-info-item">
                          <i class="bi bi-envelope"></i>
                          <span class="lead-info-text">{{ lead.email }}</span>
                        </div>
                        <span
                          class="badge lead-source-badge-mini"
                          :class="{
                            'bg-info':
                              lead.source === 'contact-form' ||
                              lead.source === 'exit-intent' ||
                              lead.source === 'publicSite',
                            'bg-secondary': lead.source === 'manual',
                          }"
                          :title="getSourceLabel(lead.source)"
                        >
                          <i
                            :class="lead.source === 'manual' ? 'bi bi-person-plus' : 'bi bi-globe'"
                          ></i>
                          {{ getSourceLabel(lead.source) }}
                        </span>
                      </div>
                      <div class="lead-info-row" v-if="lead.idNumber">
                        <div class="lead-info-item">
                          <i class="bi bi-card-text"></i>
                          <span class="lead-info-text">{{ lead.idNumber }}</span>
                        </div>
                      </div>
                      <div class="lead-info-row">
                        <div class="lead-info-item">
                          <i class="bi bi-telephone"></i>
                          <span class="lead-info-text">{{ lead.phone }}</span>
                        </div>
                        <div v-if="lead.company" class="lead-info-item">
                          <i class="bi bi-building"></i>
                          <span class="lead-info-text">{{ lead.company }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="lead-card-accent"></div>
                  </div>
                  <div v-if="!leads.IN_DEAL || leads.IN_DEAL.length === 0" class="empty-state">
                    <Message
                      :icon="'hand-thumbs-up'"
                      :title="$t('businessLeadPipeline.noLeads') || 'No leads in deal'"
                      :content="$t('businessLeadPipeline.noLeadsDesc') || 'No leads in this stage'"
                    />
                  </div>
                </div>
              </div>

              <!-- CLOSED Leads Column -->
              <div class="pipeline-column">
                <div class="pipeline-header">
                  <h5>
                    <i class="bi bi-check-circle-fill"></i> {{ $t('businessLeadPipeline.closed') }}
                    <span class="badge bg-secondary">{{ leads.CLOSED?.length || 0 }}</span>
                  </h5>
                  <!-- Pagination Controls -->
                  <div v-if="!showAll" class="pagination-controls">
                    <button
                      class="btn btn-sm btn-outline-secondary pagination-btn"
                      @click="prevPage('CLOSED')"
                      :disabled="currentPages.CLOSED <= 1"
                      :title="$t('common.previous') || 'Previous'"
                    >
                      <i class="bi bi-chevron-left"></i>
                    </button>
                    <span class="pagination-info">
                      {{ currentPages.CLOSED }} / {{ getTotalPages('CLOSED') }}
                    </span>
                    <button
                      class="btn btn-sm btn-outline-secondary pagination-btn"
                      @click="nextPage('CLOSED')"
                      :disabled="currentPages.CLOSED >= getTotalPages('CLOSED')"
                      :title="$t('common.next') || 'Next'"
                    >
                      <i class="bi bi-chevron-right"></i>
                    </button>
                  </div>
                </div>
                <div
                  class="pipeline-body"
                  @dragover.prevent="handleDragOver($event, PIPELINE_STAGES.CLOSED)"
                  @dragleave="handleDragLeave"
                  @drop.prevent="handleDrop($event, PIPELINE_STAGES.CLOSED)"
                  :class="{ 'drag-over': dragOverStage === PIPELINE_STAGES.CLOSED }"
                >
                  <div
                    v-for="lead in filteredLeads.CLOSED"
                    :key="lead.id"
                    :class="`modern-lead-card metric-type-${
                      lead.status === LEAD_STATUS.SUCCESS ? 'success' : 'danger'
                    } not-draggable`"
                    :draggable="false"
                    @click.stop="openLeadDetails(lead, $event)"
                  >
                    <div class="lead-card-header">
                      <div
                        :class="`lead-icon-container icon-${
                          lead.status === LEAD_STATUS.SUCCESS ? 'success' : 'danger'
                        }`"
                      >
                        <i
                          :class="
                            lead.status === LEAD_STATUS.SUCCESS
                              ? 'bi bi-check-circle-fill'
                              : 'bi bi-x-circle-fill'
                          "
                        ></i>
                      </div>
                      <div class="lead-title-section">
                        <span class="lead-name-text">{{ lead.name }}{{ lead.lastName ? " " + lead.lastName : "" }}</span>
                        <span class="lead-date-text">
                          <i class="bi bi-clock"></i>
                          {{
                            lead.lastContactedAt
                              ? formatDate(lead.lastContactedAt)
                              : formatDate(lead.createdAt)
                          }}
                        </span>
                      </div>
                      <div class="lead-status-badges-container">
                        <!-- Client converted indicator -->
                        <span
                          v-if="lead.convertedToClientId"
                          class="badge bg-primary me-1"
                          :title="$t('businessLeadPipeline.convertedToClient') || 'Converted to Client'"
                        >
                          <i class="bi bi-person-check-fill"></i>
                        </span>
                        <!-- Status badge -->
                        <span
                          class="badge lead-status-badge"
                          :class="{
                            'bg-success':
                              lead.status === LEAD_STATUS.INTERESTED ||
                              lead.status === LEAD_STATUS.SUCCESS,
                            'bg-danger': lead.status === LEAD_STATUS.REJECTED,
                            'bg-warning': lead.status === LEAD_STATUS.MAYBE_LATER,
                            'bg-info': !lead.status,
                          }"
                        >
                          {{ getStatusLabel(lead.status) }}
                        </span>
                      </div>
                    </div>
                    <div class="lead-card-body">
                      <div class="lead-info-row">
                        <div class="lead-info-item">
                          <i class="bi bi-envelope"></i>
                          <span class="lead-info-text">{{ lead.email }}</span>
                        </div>
                        <span
                          class="badge lead-source-badge-mini"
                          :class="{
                            'bg-info':
                              lead.source === 'contact-form' ||
                              lead.source === 'exit-intent' ||
                              lead.source === 'publicSite',
                            'bg-secondary': lead.source === 'manual',
                          }"
                          :title="getSourceLabel(lead.source)"
                        >
                          <i
                            :class="lead.source === 'manual' ? 'bi bi-person-plus' : 'bi bi-globe'"
                          ></i>
                          {{ getSourceLabel(lead.source) }}
                        </span>
                      </div>
                      <div class="lead-info-row" v-if="lead.idNumber">
                        <div class="lead-info-item">
                          <i class="bi bi-card-text"></i>
                          <span class="lead-info-text">{{ lead.idNumber }}</span>
                        </div>
                      </div>
                      <div class="lead-info-row">
                        <div class="lead-info-item">
                          <i class="bi bi-telephone"></i>
                          <span class="lead-info-text">{{ lead.phone }}</span>
                        </div>
                        <div v-if="lead.company" class="lead-info-item">
                          <i class="bi bi-building"></i>
                          <span class="lead-info-text">{{ lead.company }}</span>
                        </div>
                      </div>
                      <!-- Convert to Client Action -->
                      <div
                        v-if="lead.status === LEAD_STATUS.SUCCESS && !lead.convertedToClientId"
                        class="lead-convert-action mt-2"
                      >
                        <button
                          class="btn btn-primary btn-sm w-100"
                          :disabled="converting === lead.id"
                          @click.stop="convertLeadToClient(lead)"
                          :title="$t('businessLeadPipeline.convertToClient') || 'Convert to Client'"
                        >
                          <span v-if="converting === lead.id">
                            <i class="bi bi-hourglass"></i>
                            {{ $t('businessLeadPipeline.converting') || 'Converting...' }}
                          </span>
                          <span v-else>
                            <i class="bi bi-person-plus"></i>
                            {{ $t('businessLeadPipeline.convertToClient') || 'Convert to Client' }}
                          </span>
                        </button>
                      </div>
                    </div>
                    <div class="lead-card-accent"></div>
                  </div>
                  <div v-if="!leads.CLOSED || leads.CLOSED.length === 0" class="empty-state">
                    <Message
                      :icon="'check-circle'"
                      :title="$t('businessLeadPipeline.noLeads') || 'No closed leads'"
                      :content="$t('businessLeadPipeline.noLeadsDesc') || 'No leads in this stage'"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              class="pipeline-nav-arrow pipeline-nav-right"
              @click="scrollPipelineRight"
              aria-label="Scroll right"
            >
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Add Lead -->
    <div
      class="modal fade"
      id="add-lead"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg modal-dialog-scrollable modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-0 active-name modern-modal-header">
            <div class="modern-modal-header-inner">
              <div class="modern-modal-icon-wrapper">
                <i class="bi bi-plus-lg"></i>
              </div>
              <div class="modern-modal-title-wrapper">
                <h5 class="modal-title fw-bold modern-modal-title">{{ $t('add') }}</h5>
                <p class="modern-modal-subtitle">{{ $t('businessLeadPipeline.addNewLead') || 'Novo Lead' }}</p>
              </div>
            </div>
            <button
              id="close-modal"
              type="button"
              class="modern-modal-close-btn"
              data-bs-dismiss="modal"
              aria-label="Close"
              @click="resetAddForm"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body p-4" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="!!alertError" :stack="alertError"></Alert>
            <div id="add-lead-form" class="result-card mb-4">
              <div class="form-fields-container" style="max-height: 60vh; overflow-y: auto;">
                <!-- Personal Information Section -->
                <div class="section-header mb-3">
                  <h6 class="section-title">
                    <i class="bi bi-person-fill me-2"></i>
                    {{ $t('businessLeadPipeline.personalInformation') || 'Personal Information' }}
                  </h6>
                </div>
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        {{ $t('businessLeadPipeline.name') || 'Name' }} *
                      </label>
                      <input
                        type="text"
                        class="form-control-modern"
                        :class="{ 'is-invalid': nameError }"
                        v-model="newLead.name"
                        :placeholder="$t('businessLeadPipeline.namePlaceholder') || 'Enter first name'"
                        @keypress="onlyLetters"
                      />
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        {{ $t('businessLeadPipeline.lastName') || 'Last Name' }}
                      </label>
                      <input
                        type="text"
                        class="form-control-modern"
                        v-model="newLead.lastName"
                        :placeholder="$t('businessLeadPipeline.lastNamePlaceholder') || 'Enter last name'"
                        @keypress="onlyLetters"
                      />
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        {{ $t('businessLeadPipeline.email') || 'Email' }} *
                      </label>
                      <input
                        type="email"
                        class="form-control-modern"
                        :class="{ 'is-invalid': emailError }"
                        v-model="newLead.email"
                        :placeholder="$t('businessLeadPipeline.emailPlaceholder') || 'Enter email address'"
                      />
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        {{ $t('businessLeadPipeline.phone') || 'Phone' }}
                      </label>
                      <div class="row g-1">
                        <div class="col-4">
                          <select
                            class="form-control-modern form-select"
                            v-model="newLead.phoneCode"
                          >
                            <option value="">{{ $t('businessLeadPipeline.selectCountry') || 'Country' }}</option>
                            <option v-for="code in formState.phoneCodes" :key="code.id" :value="code.code">
                              {{ code.label }}
                            </option>
                          </select>
                        </div>
                        <div class="col-8">
                          <input
                            type="tel"
                            class="form-control-modern"
                            v-model="newLead.phone"
                            :placeholder="$t('businessLeadPipeline.phonePlaceholder') || 'Enter phone number'"
                            @keypress="onlyNumber"
                            maxlength="15"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        {{ $t('businessLeadPipeline.idNumber') || 'ID Number' }}
                      </label>
                      <input
                        type="text"
                        class="form-control-modern"
                        v-model="newLead.idNumber"
                        :placeholder="$t('businessLeadPipeline.idNumberPlaceholder') || 'CPF/RUT/DNI'"
                      />
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        {{ $t('businessLeadPipeline.birthday') || 'Birthday' }}
                      </label>
                      <input
                        type="text"
                        class="form-control-modern"
                        :value="formState.birthdayInput"
                        :placeholder="$t('businessLeadPipeline.birthdayPlaceholder') || 'DD/MM/AAAA'"
                        @input="onBirthdayInput($event.target.value)"
                        @blur="onBirthdayBlur"
                        maxlength="10"
                      />
                    </div>
                  </div>
                </div>

                <!-- Business Information Section -->
                <div class="section-header mb-3 mt-4">
                  <h6 class="section-title">
                    <i class="bi bi-building me-2"></i>
                    {{ $t('businessLeadPipeline.businessInformation') || 'Business Information' }}
                  </h6>
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessLeadPipeline.company') || 'Company' }}
                  </label>
                  <input
                    type="text"
                    class="form-control-modern"
                    v-model="newLead.company"
                    :placeholder="$t('businessLeadPipeline.companyPlaceholder') || 'Enter company name'"
                  />
                </div>

                <!-- Address Information Section -->
                <div class="section-header mb-3 mt-4">
                  <h6 class="section-title">
                    <i class="bi bi-geo-alt-fill me-2"></i>
                    {{ $t('businessLeadPipeline.addressInformation') || 'Address Information' }}
                  </h6>
                </div>
                <div class="row">
                  <div class="col-md-4">
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        {{ $t('businessLeadPipeline.addressCode') || 'ZIP Code' }}
                        <span v-if="formState.loadingAddress" class="spinner-border spinner-border-sm ms-2" role="status"></span>
                      </label>
                      <input
                        type="text"
                        class="form-control-modern"
                        :class="{ 'is-invalid': formState.addressCodeError }"
                        v-model="newLead.personalInfo.addressCode"
                        :placeholder="$t('businessLeadPipeline.addressCodePlaceholder') || 'ZIP/Postal code'"
                        @input="onCepInput"
                        @blur="getAddress"
                        maxlength="9"
                      />
                      <div v-if="formState.addressCodeError" class="invalid-feedback">
                        {{ $t('businessLeadPipeline.invalidAddressCode') || 'Invalid ZIP/Postal code' }}
                      </div>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-12">
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        {{ $t('businessLeadPipeline.address') || 'Address' }}
                      </label>
                      <input
                        type="text"
                        class="form-control-modern"
                        v-model="newLead.personalInfo.addressText"
                        :placeholder="$t('businessLeadPipeline.addressPlaceholder') || 'Street address'"
                        readonly
                      />
                    </div>
                  </div>
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessLeadPipeline.addressComplement') || 'Address Complement' }}
                  </label>
                  <input
                    type="text"
                    class="form-control-modern"
                    v-model="newLead.personalInfo.addressComplement"
                    :placeholder="$t('businessLeadPipeline.addressComplementPlaceholder') || 'Apt, suite, building, etc.'"
                  />
                </div>

                <!-- Additional Information Section -->
                <div class="section-header mb-3 mt-4">
                  <h6 class="section-title">
                    <i class="bi bi-info-circle-fill me-2"></i>
                    {{ $t('businessLeadPipeline.additionalInformation') || 'Additional Information' }}
                  </h6>
                </div>
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        {{ $t('businessLeadPipeline.origin') || 'Origin' }}
                      </label>
                      <select
                        class="form-control-modern form-select"
                        v-model="newLead.personalInfo.origin"
                      >
                        <option value="">{{ $t('businessLeadPipeline.selectOrigin') || 'Select origin' }}</option>
                        <option v-for="origin in formState.originCodes" :key="origin.id" :value="origin.id">
                          {{ $t(`origin.${origin.id}`) || origin.name }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group-modern">
                      <label class="form-label-modern">
                        {{ $t('businessLeadPipeline.healthAgreement') || 'Health Agreement' }}
                      </label>
                      <input
                        type="text"
                        class="form-control-modern"
                        v-model="newLead.personalInfo.healthAgreementId"
                        :placeholder="$t('businessLeadPipeline.healthAgreementPlaceholder') || 'Health plan/agreement'"
                      />
                    </div>
                  </div>
                </div>

                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessLeadPipeline.message') || 'Message / Notes' }}
                  </label>
                  <textarea
                    class="form-control-modern"
                    v-model="newLead.message"
                    rows="3"
                    :placeholder="
                      $t('businessLeadPipeline.messagePlaceholder') ||
                      'Enter any additional notes or message'
                    "
                  ></textarea>
                </div>

                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessLeadPipeline.product') || 'Interested Product' }}
                  </label>
                  <select
                    class="form-control-modern form-select"
                    v-model="newLead.productId"
                  >
                    <option value="">{{ $t('businessLeadPipeline.selectService') || 'Selecionar serviço (opcional)' }}</option>
                    <option
                      v-for="service in serviceStore.getActiveServices"
                      :key="service.id"
                      :value="service.id"
                    >
                      {{ service.name }}
                    </option>
                  </select>
                </div>

                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessLeadPipeline.temperature') || 'Priority' }}
                  </label>
                  <select class="form-control-modern" v-model="newLead.temperature">
                    <option value="QUENTE">
                      {{ $t('businessLeadPipeline.temperatureQuente') || 'Quente (Hot - Red)' }}
                    </option>
                    <option value="MORNO">
                      {{ $t('businessLeadPipeline.temperatureMorno') || 'Morno (Warm - Green)' }}
                    </option>
                    <option value="FRIO">
                      {{ $t('businessLeadPipeline.temperatureFrio') || 'Frio (Cold - Blue)' }}
                    </option>
                  </select>
                </div>
                <div class="row g-1 errors" id="feedback" v-if="errorsAdd && errorsAdd.length > 0">
                  <Warning>
                    <template v-slot:message>
                      <li v-for="(error, index) in errorsAdd" :key="index">
                        {{ $t(error) }}
                      </li>
                    </template>
                  </Warning>
                </div>
              </div>
                <div class="col-12 text-center mt-4">
                  <button
                    class="btn fw-bold btn-dark rounded-pill px-4 me-3"
                    @click="createLead"
                    :disabled="!isFormValid || loading || formState.isSubmitting"
                  >
                    <span
                      v-if="formState.isSubmitting"
                      class="spinner-border spinner-border-sm me-2"
                    ></span>
                    {{ $t('businessLeadPipeline.createLead') || 'Create Lead' }}
                    <i class="bi bi-save"></i>
                  </button>
                  <button
                    class="btn fw-bold btn-secondary rounded-pill px-4"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                    @click="resetAddForm"
                  >
                    {{ $t('close') }} <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>

    <!-- Lead Details Modal -->
    <div
      class="modal fade"
      id="lead-details-modal"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="leadDetailsModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 active-name modern-modal-header">
            <div class="modern-modal-header-inner">
              <div class="modern-modal-icon-wrapper">
                <i class="bi bi-person-circle"></i>
              </div>
              <div class="modern-modal-title-wrapper">
                <h5 class="modal-title fw-bold modern-modal-title">{{ $t('businessLeadPipeline.leadDetails') || 'Lead Details' }}</h5>
                <p class="modern-modal-subtitle">{{ selectedLead?.name }}</p>
              </div>
            </div>
            <button
              id="close-modal"
              type="button"
              class="modern-modal-close-btn"
              data-bs-dismiss="modal"
              aria-label="Close"
              @click="closeLeadDetails"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body text-center mb-0" id="lead-details-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="!!alertError" :stack="alertError"></Alert>

            <!-- Tabs Navigation -->
            <ul class="nav nav-tabs nav-justified mb-4" role="tablist">
              <li class="nav-item" role="presentation">
                <button
                  class="nav-link"
                  :class="{ active: activeTab === 'info' }"
                  @click="activeTab = 'info'"
                  type="button"
                >
                  <i class="bi bi-person-circle me-2"></i
                  >{{ $t('businessLeadPipeline.leadInfo') || 'Lead Info' }}
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button
                  class="nav-link"
                  :class="{ active: activeTab === 'contacts' }"
                  @click="activeTab = 'contacts'"
                  type="button"
                >
                  <i class="bi bi-chat-left-text me-2"></i
                  >{{ $t('businessLeadPipeline.contacts') || 'Contacts' }}
                  <span v-if="selectedLead?.contacts?.length" class="badge bg-primary ms-2">{{
                    selectedLead.contacts.length
                  }}</span>
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button
                  class="nav-link"
                  :class="{ active: activeTab === 'transitions' }"
                  @click="activeTab = 'transitions'"
                  type="button"
                >
                  <i class="bi bi-clock-history me-2"></i
                  >{{ $t('businessLeadPipeline.transitions') || 'Pipeline History' }}
                  <span v-if="leadTransitions.length" class="badge bg-info ms-2">{{
                    leadTransitions.length
                  }}</span>
                </button>
              </li>
            </ul>

            <!-- Tab Content -->
            <div class="tab-content">
              <!-- Lead Information Tab -->
              <div
                v-show="activeTab === 'info'"
                class="tab-pane fade"
                :class="{ 'show active': activeTab === 'info' }"
              >
                <div v-if="selectedLead" class="result-card mb-4">
                  <!-- Lead Information -->
                  <div class="form-fields-container">
                    <!-- Personal Information Section -->
                    <div class="section-header mb-3">
                      <h6 class="section-title">
                        <i class="bi bi-person-fill me-2"></i>
                        {{ $t('businessLeadPipeline.personalInformation') || 'Personal Information' }}
                      </h6>
                    </div>
                    <div class="row">
                      <div class="col-md-6">
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessLeadPipeline.name') || 'Name'
                          }}</label>
                          <div v-if="!editMode" class="form-control-modern form-control-readonly">
                            <i class="bi bi-person me-2"></i>{{ selectedLead.name }}
                          </div>
                          <input
                            v-if="editMode"
                            type="text"
                            class="form-control-modern"
                            v-model="editLead.name"
                            :placeholder="$t('businessLeadPipeline.namePlaceholder') || 'Enter first name'"
                            @keypress="onlyLetters"
                          />
                        </div>
                      </div>
                      <div class="col-md-6" v-if="selectedLead.lastName || editMode">
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessLeadPipeline.lastName') || 'Last Name'
                          }}</label>
                          <div v-if="!editMode" class="form-control-modern form-control-readonly">
                            <i class="bi bi-person me-2"></i>{{ selectedLead.lastName }}
                          </div>
                          <input
                            v-if="editMode"
                            type="text"
                            class="form-control-modern"
                            v-model="editLead.lastName"
                            :placeholder="$t('businessLeadPipeline.lastNamePlaceholder') || 'Enter last name'"
                            @keypress="onlyLetters"
                          />
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-md-6">
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessLeadPipeline.email') || 'Email'
                          }}</label>
                          <div v-if="!editMode" class="form-control-modern form-control-readonly">
                            <a :href="`mailto:${selectedLead.email}`" class="contact-link">
                              <i class="bi bi-envelope me-2"></i>{{ selectedLead.email }}
                            </a>
                          </div>
                          <input
                            v-if="editMode"
                            type="email"
                            class="form-control-modern"
                            v-model="editLead.email"
                            :placeholder="$t('businessLeadPipeline.emailPlaceholder') || 'Enter email address'"
                          />
                        </div>
                      </div>
                      <div class="col-md-6" v-if="selectedLead.phone || editMode">
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessLeadPipeline.phone') || 'Phone'
                          }}</label>
                          <div v-if="!editMode" class="form-control-modern form-control-readonly">
                            <a
                              :href="`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}`"
                              target="_blank"
                              class="contact-link"
                            >
                              <i class="bi bi-whatsapp me-2"></i>{{ selectedLead.phone }}
                            </a>
                          </div>
                          <div v-if="editMode" class="row g-1">
                            <div class="col-4">
                              <select
                                class="form-control-modern form-select"
                                v-model="editLead.personalInfo.phoneCode"
                              >
                                <option value="">{{ $t('businessLeadPipeline.selectCountry') || 'Country' }}</option>
                                <option
                                  v-for="phone in formState.phoneCodes"
                                  :key="phone.code"
                                  :value="phone.code"
                                >
                                  {{ phone.country }} {{ phone.code }}
                                </option>
                              </select>
                            </div>
                            <div class="col-8">
                              <input
                                type="text"
                                class="form-control-modern"
                                v-model="editLead.phone"
                                :placeholder="$t('businessLeadPipeline.phonePlaceholder') || 'Enter phone number'"
                                @keypress="onlyNumber"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row" v-if="selectedLead.idNumber || selectedLead.personalInfo?.birthday || editMode">
                      <div class="col-md-6" v-if="selectedLead.idNumber || editMode">
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessLeadPipeline.idNumber') || 'ID Number'
                          }}</label>
                          <div v-if="!editMode" class="form-control-modern form-control-readonly">
                            <i class="bi bi-card-text me-2"></i>{{ selectedLead.idNumber }}
                          </div>
                          <input
                            v-if="editMode"
                            type="text"
                            class="form-control-modern"
                            v-model="editLead.idNumber"
                            :placeholder="$t('businessLeadPipeline.idNumberPlaceholder') || 'CPF/RUT/DNI'"
                          />
                        </div>
                      </div>
                      <div class="col-md-6" v-if="selectedLead.personalInfo?.birthday || editMode">
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessLeadPipeline.birthday') || 'Birthday'
                          }}</label>
                          <div v-if="!editMode" class="form-control-modern form-control-readonly">
                            <i class="bi bi-calendar me-2"></i>{{ formatDate(selectedLead.personalInfo.birthday) }}
                          </div>
                          <div v-if="editMode">
                            <input
                              type="text"
                              class="form-control-modern"
                              v-model="formState.birthdayInput"
                              :placeholder="$t('businessLeadPipeline.birthdayPlaceholder') || 'DD/MM/YYYY'"
                              @input="onEditBirthdayInput"
                              @blur="onEditBirthdayBlur"
                              maxlength="10"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Business Information Section -->
                    <div class="section-header mb-3 mt-4" v-if="selectedLead.company || editMode">
                      <h6 class="section-title">
                        <i class="bi bi-building me-2"></i>
                        {{ $t('businessLeadPipeline.businessInformation') || 'Business Information' }}
                      </h6>
                    </div>
                    <div v-if="selectedLead.company || editMode">
                      <div class="form-group-modern">
                        <label class="form-label-modern">{{
                          $t('businessLeadPipeline.company') || 'Company'
                        }}</label>
                        <div v-if="!editMode" class="form-control-modern form-control-readonly">
                          <i class="bi bi-building me-2"></i>{{ selectedLead.company }}
                        </div>
                        <input
                          v-if="editMode"
                          type="text"
                          class="form-control-modern"
                          v-model="editLead.company"
                          :placeholder="$t('businessLeadPipeline.companyPlaceholder') || 'Enter company name'"
                        />
                      </div>
                    </div>

                    <!-- Address Information Section -->
                    <div class="section-header mb-3 mt-4" v-if="selectedLead.personalInfo?.addressText || selectedLead.personalInfo?.addressCode || selectedLead.personalInfo?.addressComplement || editMode">
                      <h6 class="section-title">
                        <i class="bi bi-geo-alt-fill me-2"></i>
                        {{ $t('businessLeadPipeline.addressInformation') || 'Address Information' }}
                      </h6>
                    </div>
                    <div v-if="selectedLead.personalInfo?.addressText || selectedLead.personalInfo?.addressCode || selectedLead.personalInfo?.addressComplement || editMode">
                      <div class="row">
                        <div class="col-md-4" v-if="selectedLead.personalInfo?.addressCode || editMode">
                          <div class="form-group-modern">
                            <label class="form-label-modern">{{
                              $t('businessLeadPipeline.addressCode') || 'ZIP Code'
                            }}
                              <span v-if="formState.loadingAddress" class="spinner-border spinner-border-sm ms-2" role="status"></span>
                            </label>
                            <div v-if="!editMode" class="form-control-modern form-control-readonly">
                              <i class="bi bi-mailbox me-2"></i>{{ selectedLead.personalInfo.addressCode }}
                            </div>
                            <div v-if="editMode" class="position-relative">
                              <input
                                type="text"
                                class="form-control-modern"
                                :class="{ 'is-invalid': formState.addressCodeError }"
                                v-model="editLead.personalInfo.addressCode"
                                :placeholder="$t('businessLeadPipeline.addressCodePlaceholder') || 'Enter ZIP code'"
                                @input="onEditCepInput"
                                @blur="onEditCepBlur"
                                @keypress="onlyNumber"
                                maxlength="9"
                              />
                              <div v-if="formState.loadingAddress" class="position-absolute top-50 end-0 translate-middle-y me-3">
                                <div class="spinner-border spinner-border-sm text-primary"></div>
                              </div>
                              <div v-if="formState.addressCodeError" class="invalid-feedback">
                                {{ $t('businessLeadPipeline.invalidAddressCode') || 'Invalid ZIP code' }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="row my-2">
                        <div class="col-md-12" v-if="selectedLead.personalInfo?.addressText || editMode">
                          <div class="form-group-modern">
                            <label class="form-label-modern">{{
                              $t('businessLeadPipeline.address') || 'Address'
                            }}</label>
                            <div v-if="!editMode" class="form-control-modern form-control-readonly">
                              <i class="bi bi-geo-alt me-2"></i>{{ selectedLead.personalInfo.addressText }}
                            </div>
                            <input
                              v-if="editMode"
                              type="text"
                              class="form-control-modern"
                              v-model="editLead.personalInfo.addressText"
                              :placeholder="$t('businessLeadPipeline.addressPlaceholder') || 'Enter address'"
                            />
                          </div>
                        </div>
                      </div>
                      <div v-if="selectedLead.personalInfo?.addressComplement || editMode">
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessLeadPipeline.addressComplement') || 'Address Complement'
                          }}</label>
                          <div v-if="!editMode" class="form-control-modern form-control-readonly">
                            <i class="bi bi-building me-2"></i>{{ selectedLead.personalInfo.addressComplement }}
                          </div>
                          <input
                            v-if="editMode"
                            type="text"
                            class="form-control-modern"
                            v-model="editLead.personalInfo.addressComplement"
                            :placeholder="$t('businessLeadPipeline.addressComplementPlaceholder') || 'Apt, suite, building, etc.'"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- Additional Information Section -->
                    <div class="section-header mb-3 mt-4" v-if="selectedLead.personalInfo?.origin || selectedLead.personalInfo?.healthAgreementId || editMode">
                      <h6 class="section-title">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        {{ $t('businessLeadPipeline.additionalInformation') || 'Additional Information' }}
                      </h6>
                    </div>
                    <div class="row" v-if="selectedLead.personalInfo?.origin || selectedLead.personalInfo?.healthAgreementId || editMode">
                      <div class="col-md-6" v-if="selectedLead.personalInfo?.origin || editMode">
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessLeadPipeline.origin') || 'Origin'
                          }}</label>
                          <div v-if="!editMode" class="form-control-modern form-control-readonly">
                            <i class="bi bi-compass me-2"></i>{{ selectedLead.personalInfo.origin }}
                          </div>
                          <select
                            v-if="editMode"
                            class="form-control-modern form-select"
                            v-model="editLead.personalInfo.origin"
                          >
                            <option value="">{{ $t('businessLeadPipeline.selectOrigin') || 'Select origin' }}</option>
                            <option v-for="origin in formState.originCodes" :key="origin.id" :value="origin.id">
                              {{ $t(`origin.${origin.id}`) || origin.name }}
                            </option>
                          </select>
                        </div>
                      </div>
                      <div class="col-md-6" v-if="selectedLead.personalInfo?.healthAgreementId || editMode">
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessLeadPipeline.healthAgreement') || 'Health Agreement'
                          }}</label>
                          <div v-if="!editMode" class="form-control-modern form-control-readonly">
                            <i class="bi bi-shield-plus me-2"></i>{{ selectedLead.personalInfo.healthAgreementId }}
                          </div>
                          <input
                            v-if="editMode"
                            type="text"
                            class="form-control-modern"
                            v-model="editLead.personalInfo.healthAgreementId"
                            :placeholder="$t('businessLeadPipeline.healthAgreementPlaceholder') || 'Health plan/agreement'"
                          />
                        </div>
                      </div>
                    </div>

                    <div class="form-group-modern" v-if="selectedLead.company">
                      <label class="form-label-modern">{{
                        $t('businessLeadPipeline.company') || 'Company'
                      }}</label>
                      <div class="form-control-modern form-control-readonly">
                        {{ selectedLead.company }}
                      </div>
                    </div>
                    <div class="form-group-modern" v-if="selectedLead.source">
                      <label class="form-label-modern">{{
                        $t('businessLeadPipeline.source.label') || 'Source'
                      }}</label>
                      <div class="form-control-modern form-control-readonly">
                        <span
                          class="badge"
                          :class="{
                            'bg-info':
                              selectedLead.source === 'contact-form' ||
                              selectedLead.source === 'exit-intent' ||
                              selectedLead.source === 'publicSite',
                            'bg-secondary': selectedLead.source === 'manual',
                          }"
                        >
                          {{ getSourceLabel(selectedLead.source) }}
                        </span>
                      </div>
                    </div>
                    <!-- Temperature Field -->
                    <div class="form-group-modern">
                      <label class="form-label-modern">{{
                        $t('businessLeadPipeline.temperature') || 'Prioridade'
                      }}</label>
                      <div class="d-flex gap-2 align-items-center">
                        <select
                          class="form-control-modern form-select-modern flex-grow-1"
                          :value="tempTemperature || selectedLead?.temperature || ''"
                          @change="handleTemperatureChange"
                        >
                          <option value="">
                            {{ $t('businessLeadPipeline.temperature') || 'Selecione' }}
                          </option>
                          <option value="QUENTE">
                            {{ $t('businessLeadPipeline.temperatureQuente') || 'Quente (Vermelho)' }}
                          </option>
                          <option value="MORNO">
                            {{ $t('businessLeadPipeline.temperatureMorno') || 'Morno (Verde)' }}
                          </option>
                          <option value="FRIO">
                            {{ $t('businessLeadPipeline.temperatureFrio') || 'Frio (Azul)' }}
                          </option>
                        </select>
                        <button
                          class="btn btn-sm btn-dark rounded-pill px-3"
                          @click="saveTemperature"
                          :disabled="
                            loading ||
                            tempTemperature === (selectedLead?.temperature || '') ||
                            tempTemperature === ''
                          "
                          :title="
                            tempTemperature === (selectedLead?.temperature || '')
                              ? 'Sem mudanças para salvar'
                              : 'Salvar temperatura'
                          "
                        >
                          <i class="bi bi-check-lg"></i>
                        </button>
                      </div>
                    </div>
                    <div class="form-group-modern" v-if="selectedLead.message || selectedLead.id">
                      <label class="form-label-modern">{{
                        $t('businessLeadPipeline.message') || 'Message'
                      }}</label>
                      <div class="d-flex gap-2 align-items-start">
                        <textarea
                          v-if="selectedLead.id"
                          class="form-control-modern flex-grow-1"
                          v-model="tempMessage"
                          rows="5"
                          style="min-width: 400px"
                          :placeholder="$t('businessLeadPipeline.messagePlaceholder') || 'Enter message...'"
                        ></textarea>
                        <div
                          v-else
                          class="form-control-modern form-control-readonly flex-grow-1"
                          style="min-height: 60px; text-align: left; padding: 0.5rem"
                        >
                          {{ selectedLead.message }}
                        </div>
                        <button
                          v-if="selectedLead.id"
                          class="btn btn-sm btn-dark rounded-pill px-3"
                          @click="saveMessage"
                          :disabled="loading || tempMessage === (selectedLead?.message || '')"
                          :title="
                            tempMessage === (selectedLead?.message || '')
                              ? 'No changes to save'
                              : 'Save message'
                          "
                        >
                          <i class="bi bi-check-lg"></i>
                        </button>
                      </div>
                    </div>

                    <!-- Product Field -->
                    <div class="form-group-modern">
                      <label class="form-label-modern">{{
                        $t('businessLeadPipeline.product') || 'Interested Product'
                      }}</label>
                      <div v-if="!editMode && selectedLead.productId" class="form-control-modern form-control-readonly">
                        {{ getServiceName(selectedLead.productId) }}
                      </div>
                      <div v-if="!editMode && !selectedLead.productId" class="form-control-modern form-control-readonly text-muted">
                        <i class="bi bi-dash me-2"></i>{{ $t('businessLeadPipeline.noProductSelected') || 'No product selected' }}
                      </div>
                      <select
                        v-if="editMode"
                        class="form-control-modern form-select"
                        v-model="editLead.productId"
                      >
                        <option value="">{{ $t('businessLeadPipeline.selectService') || 'Selecionar serviço (opcional)' }}</option>
                        <option
                          v-for="service in serviceStore.getActiveServices"
                          :key="service.id"
                          :value="service.id"
                        >
                          {{ service.name }}
                        </option>
                      </select>
                    </div>

                    <div class="form-group-modern" v-if="selectedLead.notes">
                      <label class="form-label-modern">{{
                        $t('businessLeadPipeline.notes') || 'Notes'
                      }}</label>
                      <div
                        class="form-control-modern form-control-readonly"
                        style="min-height: 60px; text-align: left; padding: 0.5rem"
                      >
                        {{ selectedLead.notes }}
                      </div>
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                    <button
                      v-if="!editMode"
                      type="button"
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                      @click="startEditMode"
                    >
                      <i class="bi bi-pencil"></i>
                      {{ $t('businessLeadPipeline.edit') || 'Edit' }}
                    </button>
                    <button
                      v-if="editMode"
                      type="button"
                      class="btn btn-sm btn-size fw-bold btn-outline-secondary rounded-pill px-3"
                      @click="cancelEditMode"
                    >
                      <i class="bi bi-x-lg"></i>
                      {{ $t('businessLeadPipeline.cancel') || 'Cancel' }}
                    </button>
                    <button
                      v-if="editMode"
                      type="button"
                      class="btn btn-sm btn-size fw-bold btn-success rounded-pill px-3"
                      @click="saveEditLead"
                      :disabled="loading"
                    >
                      <i class="bi bi-check-lg"></i>
                      {{ $t('businessLeadPipeline.save') || 'Save' }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Contacts Tab -->
              <div
                v-show="activeTab === 'contacts'"
                class="tab-pane fade"
                :class="{ 'show active': activeTab === 'contacts' }"
              >
                <div class="result-card mb-4" style="padding-top: 1rem">
                  <div class="d-flex justify-content-between align-items-center m-3">
                    <h6 class="fw-bold mb-0">
                      <i class="bi bi-chat-left-text"></i>
                      {{ $t('businessLeadPipeline.contactHistory') || 'Contact History' }}
                    </h6>
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                      @click="showAddContact = !showAddContact"
                      :disabled="selectedLead && !PIPELINE_RULES.canAddContact(selectedLead)"
                      :title="
                        selectedLead && !PIPELINE_RULES.canAddContact(selectedLead)
                          ? 'Cannot add contacts to closed leads'
                          : ''
                      "
                    >
                      <i class="bi bi-plus-lg"></i>
                      {{ $t('businessLeadPipeline.addContact') || 'Add Contact' }}
                    </button>
                  </div>

                  <!-- Add Contact Form -->
                  <div v-if="showAddContact" class="mb-3">
                    <div class="form-fields-container">
                      <div class="form-group-modern">
                        <label class="form-label-modern">{{
                          $t('businessLeadPipeline.contactType') || 'Type'
                        }}</label>
                        <select
                          class="form-control-modern form-select-modern"
                          v-model="newContact.type"
                        >
                          <option v-for="(value, key) in CONTACT_TYPES" :key="key" :value="value">
                            {{ value }}
                          </option>
                        </select>
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">{{
                          $t('businessLeadPipeline.contactResult') || 'Result'
                        }}</label>
                        <select
                          class="form-control-modern form-select-modern"
                          v-model="newContact.result"
                        >
                          <option v-for="(value, key) in CONTACT_RESULTS" :key="key" :value="value">
                            {{ value }}
                          </option>
                        </select>
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">{{
                          $t('businessLeadPipeline.comment') || 'Comment'
                        }}</label>
                        <textarea
                          class="form-control-modern"
                          v-model="newContact.comment"
                          rows="3"
                          :placeholder="
                            $t('businessLeadPipeline.commentPlaceholder') || 'Enter contact details...'
                          "
                        ></textarea>
                      </div>
                      <div class="col text-center mt-2">
                        <button
                          type="button"
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click.stop="saveContact"
                          :disabled="
                            loading || (selectedLead && !PIPELINE_RULES.canAddContact(selectedLead))
                          "
                        >
                          <i class="bi bi-save"></i>
                          {{ $t('businessLeadPipeline.saveContact') || 'Save Contact' }}
                        </button>
                        <button
                          type="button"
                          class="btn btn-lg btn-size fw-bold btn-secondary rounded-pill mt-2 px-4 ms-2"
                          @click.stop="showAddContact = false"
                        >
                          <i class="bi bi-x-lg"></i> {{ $t('businessLeadPipeline.cancel') }}
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Contacts List -->
                  <div v-if="selectedLead?.contacts && selectedLead.contacts.length > 0">
                    <div
                      v-for="contact in selectedLead.contacts"
                      :key="contact.id"
                      class="contact-card mb-3"
                    >
                      <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1 text-left">
                          <div class="d-flex align-items-center mb-2">
                            <div
                              class="contact-result-indicator me-2"
                              :class="getContactResultClass(contact.result)"
                            >
                              <i :class="getContactResultIcon(contact.result)"></i>
                            </div>
                            <div class="flex-grow-1">
                              <div class="d-flex flex-wrap gap-1 mb-1">
                                <span class="badge bg-primary">{{ contact.type }}</span>
                                <span
                                  class="badge"
                                  :class="getContactResultBadgeClass(contact.result)"
                                >
                                  {{ getContactResultLabel(contact.result) }}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p class="mb-0 small text-muted contact-comment">{{ contact.comment }}</p>
                        </div>
                        <div class="text-end ms-2 flex-shrink-0">
                          <small class="text-muted d-block">{{
                            formatDate(contact.createdAt)
                          }}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-center py-3">
                    <Message
                      :icon="'chat-left'"
                      :title="$t('businessLeadPipeline.noContacts') || 'No contacts'"
                      :content="$t('businessLeadPipeline.noContactsDesc') || 'No contacts recorded yet.'"
                    />
                  </div>
                </div>
              </div>

              <!-- Transitions Tab -->
              <div
                v-show="activeTab === 'transitions'"
                class="tab-pane fade"
                :class="{ 'show active': activeTab === 'transitions' }"
              >
                <div class="result-card mb-4">
                  <h6 class="fw-bold mb-4">
                    <i class="bi bi-clock-history me-2"></i
                    >{{ $t('businessLeadPipeline.pipelineHistory') || 'Pipeline History' }}
                  </h6>

                  <!-- Timeline -->
                  <div v-if="leadTransitions.length > 0" class="timeline-container">
                    <div
                      v-for="transition in leadTransitions"
                      :key="transition.id"
                      class="timeline-item"
                    >
                      <div
                        class="timeline-marker"
                        :class="
                          transition.isContact
                            ? 'bg-info'
                            : `bg-${getStageColor(transition.newStage || 'NEW')}`
                        "
                      >
                        <i
                          :class="
                            transition.isContact
                              ? 'bi bi-chat-left-text'
                              : `bi ${getStageIcon(transition.newStage || 'NEW')}`
                          "
                        ></i>
                      </div>
                      <div class="timeline-content">
                        <div class="timeline-header">
                          <div class="d-flex align-items-center gap-2 flex-wrap">
                            <span
                              v-if="!transition.isContact"
                              class="badge"
                              :class="`bg-${getStageColor(transition.newStage || 'NEW')}`"
                            >
                              <i
                                :class="`bi ${getStageIcon(transition.newStage || 'NEW')} me-1`"
                              ></i>
                              {{ getStageLabel(transition.newStage || 'NEW') }}
                            </span>
                            <span v-else class="badge bg-info">
                              <i class="bi bi-chat-left-text me-1"></i>
                              {{ transition.contactType || 'CONTACT' }}
                            </span>
                            <span v-if="transition.status" class="badge bg-secondary">
                              {{ getStatusLabel(transition.status) }}
                            </span>
                            <span v-if="transition.isInitial" class="badge bg-success">
                              <i class="bi bi-star-fill me-1"></i
                              >{{ $t('businessLeadPipeline.created') || 'Created' }}
                            </span>
                          </div>
                          <div class="timeline-date">
                            <i class="bi bi-clock me-1"></i
                            >{{ formatDateTime(transition.occurredOn || transition.createdAt) }}
                          </div>
                        </div>
                        <div v-if="transition.isContact" class="timeline-transition">
                          <small class="text-muted">
                            <i class="bi bi-chat-left-text me-1"></i>
                            <strong>{{ transition.contactType || 'CONTACT' }}</strong>
                            <span v-if="transition.status" class="ms-2">
                              - {{ getStatusLabel(transition.status) }}
                            </span>
                            <div
                              v-if="transition.contactComment"
                              class="mt-2 text-muted"
                              style="font-size: 0.85rem"
                            >
                              {{ transition.contactComment }}
                            </div>
                          </small>
                        </div>
                        <div
                          v-else-if="transition.oldStage && !transition.isInitial"
                          class="timeline-transition"
                        >
                          <small class="text-muted">
                            <i class="bi bi-arrow-right me-1"></i>
                            {{ $t('businessLeadPipeline.movedFrom') || 'Moved from' }}
                            <strong>{{ getStageLabel(transition.oldStage) }}</strong>
                            {{ $t('businessLeadPipeline.to') || 'to' }}
                            <strong>{{ getStageLabel(transition.newStage) }}</strong>
                          </small>
                        </div>
                        <div v-else-if="transition.isInitial" class="timeline-transition">
                          <small class="text-muted">
                            <i class="bi bi-plus-circle me-1"></i>
                            {{ $t('businessLeadPipeline.created') || 'Lead created' }}
                            <strong>{{ getStageLabel(transition.newStage || 'NEW') }}</strong>
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-center py-4">
                    <Message
                      :icon="'clock-history'"
                      :title="$t('businessLeadPipeline.noTransitions') || 'No transitions'"
                      :content="
                        $t('businessLeadPipeline.noTransitionsDesc') ||
                        'No pipeline transitions recorded yet.'
                      "
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <button
              class="btn btn-sm fw-bold btn-danger rounded-pill p-1 px-4 mt-4 me-2"
              @click="archiveLead(selectedLead)"
              :disabled="loading"
              :title="$t('businessLeadPipeline.archiveLead') || 'Archive Lead'"
            >
              <i class="bi bi-archive"></i> {{ $t('businessLeadPipeline.archive') || 'Archive' }}
            </button>
            <a
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              data-bs-dismiss="modal"
              aria-label="Close"
              @click="closeLeadDetails"
            >
              {{ $t('close') }} <i class="bi bi-check-lg"></i>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics & Insights Modal -->
    <div
      v-if="showAnalytics"
      class="modal fade show analytics-modal"
      style="display: block; background: rgba(0, 0, 0, 0.5)"
      tabindex="-1"
      @click.self="showAnalytics = false"
    >
      <div class="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-0 active-name modern-modal-header">
            <div class="modern-modal-header-inner">
              <div class="modern-modal-icon-wrapper">
                <i class="bi bi-graph-up-arrow"></i>
              </div>
              <div class="modern-modal-title-wrapper">
                <h5 class="modal-title fw-bold modern-modal-title">{{ $t('businessLeadPipeline.analytics.title') || 'Pipeline Analytics & Insights' }}</h5>
                <p class="modern-modal-subtitle">{{ $t('businessLeadPipeline.analytics.subtitle') || 'Análise e Insights' }}</p>
              </div>
            </div>
            <button
              type="button"
              class="modern-modal-close-btn"
              @click="showAnalytics = false"
              aria-label="Close"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body p-4">
            <!-- AI-Powered Insights Section -->
            <div v-if="pipelineInsights.length > 0" class="insights-section mb-4">
              <h6 class="section-title mb-3">
                <i class="bi bi-lightbulb-fill me-2"></i>
                {{ $t('businessLeadPipeline.analytics.insights.title') || 'Smart Insights & Recommendations' }}
              </h6>
              <div class="row g-3">
                <div
                  v-for="(insight, index) in pipelineInsights"
                  :key="index"
                  class="col-12 col-md-6"
                >
                  <div class="insight-card" :class="`insight-${insight.type}`">
                    <div class="insight-header">
                      <i :class="`bi ${insight.icon} insight-icon`"></i>
                      <span class="insight-title">{{ insight.title }}</span>
                    </div>
                    <p class="insight-message">{{ insight.message }}</p>
                    <div class="insight-action">
                      <i class="bi bi-arrow-right-circle me-1"></i>
                      {{ insight.action }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Conversion Funnel -->
            <div class="analytics-section mb-4">
              <h6 class="section-title mb-3">
                <i class="bi bi-funnel-fill me-2"></i>
                {{ $t('businessLeadPipeline.analytics.funnel') || 'Conversion Funnel' }}
              </h6>
              <div class="funnel-container">
                <div class="funnel-stage" :style="{ width: '100%' }">
                  <div class="funnel-bar funnel-new">
                    <span class="funnel-label"
                      >{{ $t('businessLeadPipeline.newLeads') }} ({{ pipelineStats.totalLeads }})</span
                    >
                    <span class="funnel-percentage">100%</span>
                  </div>
                </div>
                <div
                  class="funnel-stage"
                  :style="{
                    width:
                      pipelineStats.totalLeads > 0
                        ? Math.max(
                            ((pipelineStats.totalLeads - pipelineStats.stageDistribution.NEW) /
                              pipelineStats.totalLeads) *
                              100,
                            30
                          ) + '%'
                        : '30%',
                  }"
                >
                  <div class="funnel-bar funnel-contact">
                    <span class="funnel-label"
                      >{{ $t('businessLeadPipeline.analytics.contacted') || 'Contacted' }} ({{
                        pipelineStats.totalLeads - pipelineStats.stageDistribution.NEW
                      }})</span
                    >
                    <span class="funnel-percentage">{{ pipelineStats?.newToContactRate || '0.0' }}%</span>
                  </div>
                </div>
                <div
                  class="funnel-stage"
                  :style="{
                    width:
                      pipelineStats.totalLeads > 0
                        ? Math.max(
                            ((pipelineStats.stageDistribution.IN_DEAL +
                              pipelineStats.stageDistribution.CLOSED) /
                              pipelineStats.totalLeads) *
                              100,
                            25
                          ) + '%'
                        : '25%',
                  }"
                >
                  <div class="funnel-bar funnel-deal">
                    <span class="funnel-label"
                      >{{ $t('businessLeadPipeline.inDeal') }} ({{
                        (pipelineStats?.stageDistribution?.IN_DEAL || 0) +
                        (pipelineStats?.stageDistribution?.CLOSED || 0)
                      }})</span
                    >
                    <span class="funnel-percentage"
                      >{{
                        pipelineStats?.totalLeads > 0 &&
                        pipelineStats?.stageDistribution?.IN_DEAL !== undefined &&
                        pipelineStats?.stageDistribution?.CLOSED !== undefined
                          ? (
                              ((pipelineStats.stageDistribution.IN_DEAL +
                                pipelineStats.stageDistribution.CLOSED) /
                                pipelineStats.totalLeads) *
                              100
                            ).toFixed(1)
                          : '0.0'
                      }}%</span
                    >
                  </div>
                </div>
                <div
                  class="funnel-stage"
                  :style="{
                    width:
                      pipelineStats.totalLeads > 0
                        ? Math.max(
                            (pipelineStats.successLeads / pipelineStats.totalLeads) * 100,
                            20
                          ) + '%'
                        : '20%',
                  }"
                >
                  <div class="funnel-bar funnel-success">
                    <span class="funnel-label"
                      >{{ $t('businessLeadPipeline.analytics.won') || 'Won' }} ({{
                        pipelineStats.successLeads
                      }})</span
                    >
                    <span class="funnel-percentage">{{ pipelineStats?.conversionRate || '0.0' }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Key Metrics Grid -->
            <div class="analytics-section mb-4">
              <h6 class="section-title mb-3">
                <i class="bi bi-speedometer2 me-2"></i>
                {{ $t('businessLeadPipeline.analytics.keyMetrics') || 'Key Performance Indicators' }}
              </h6>
              <div class="row g-3">
                <!-- Total Pipeline Value -->
                <div class="col-6 col-md-3">
                  <div class="metric-gauge">
                    <div class="gauge-container">
                      <svg class="gauge-svg" viewBox="0 0 100 50">
                        <path
                          class="gauge-bg"
                          d="M 10 45 A 40 40 0 0 1 90 45"
                          fill="none"
                          stroke="#e0e0e0"
                          stroke-width="8"
                          stroke-linecap="round"
                        />
                        <path
                          class="gauge-fill"
                          d="M 10 45 A 40 40 0 0 1 90 45"
                          fill="none"
                          stroke="#00c2cb"
                          stroke-width="8"
                          stroke-linecap="round"
                          :stroke-dasharray="`${
                            pipelineStats?.totalLeads > 0 && pipelineStats?.activeLeads !== undefined
                              ? (pipelineStats.activeLeads / pipelineStats.totalLeads) * 126
                              : 0
                          } 126`"
                        />
                      </svg>
                      <div class="gauge-value">{{ pipelineStats.activeLeads }}</div>
                    </div>
                    <div class="gauge-label">{{ $t('businessLeadPipeline.dashboard.activeLeads') }}</div>
                  </div>
                </div>

                <!-- Conversion Rate -->
                <div class="col-6 col-md-3">
                  <div class="metric-gauge">
                    <div
                      class="circular-progress"
                      :style="{ '--progress': pipelineStats.conversionRate }"
                    >
                      <div class="progress-value">{{ pipelineStats.conversionRate }}%</div>
                    </div>
                    <div class="gauge-label">{{ $t('businessLeadPipeline.analytics.conversionRate') }}</div>
                  </div>
                </div>

                <!-- Average Age -->
                <div class="col-6 col-md-3">
                  <div class="metric-gauge">
                    <div class="gauge-container">
                      <div class="gauge-icon">
                        <i class="bi bi-clock-history"></i>
                      </div>
                      <div class="gauge-value-large">{{ pipelineStats.avgAge }}</div>
                    </div>
                    <div class="gauge-label">
                      {{ $t('businessLeadPipeline.analytics.avgDays') || 'Avg Days' }}
                    </div>
                  </div>
                </div>

                <!-- Success Leads -->
                <div class="col-6 col-md-3">
                  <div class="metric-gauge">
                    <div class="gauge-container">
                      <div class="gauge-icon success">
                        <i class="bi bi-trophy-fill"></i>
                      </div>
                      <div class="gauge-value-large">{{ pipelineStats.successLeads }}</div>
                    </div>
                    <div class="gauge-label">
                      {{ $t('businessLeadPipeline.analytics.successfulSales') }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Stage Distribution Bars -->
            <div class="analytics-section mb-4">
              <h6 class="section-title mb-3">
                <i class="bi bi-bar-chart-fill me-2"></i>
                {{ $t('businessLeadPipeline.analytics.stageDistribution') || 'Stage Distribution' }}
              </h6>
              <div class="distribution-bars">
                <div class="distribution-item">
                  <div class="distribution-header">
                    <span class="distribution-label">
                      <i class="bi bi-inbox-fill me-2 text-primary"></i>
                      {{ $t('businessLeadPipeline.newLeads') }}
                    </span>
                    <span class="distribution-value">{{
                      pipelineStats.stageDistribution.NEW
                    }}</span>
                  </div>
                  <div class="distribution-bar-container">
                    <div
                      class="distribution-bar bg-primary"
                      :style="{
                        width:
                          pipelineStats.totalLeads > 0
                            ? (pipelineStats.stageDistribution.NEW / pipelineStats.totalLeads) *
                                100 +
                              '%'
                            : '0%',
                      }"
                    ></div>
                  </div>
                </div>

                <div class="distribution-item">
                  <div class="distribution-header">
                    <span class="distribution-label">
                      <i class="bi bi-chat-dots-fill me-2 text-warning"></i>
                      {{ $t('businessLeadPipeline.inContact') }}
                    </span>
                    <span class="distribution-value">{{
                      pipelineStats.stageDistribution.IN_CONTACT
                    }}</span>
                  </div>
                  <div class="distribution-bar-container">
                    <div
                      class="distribution-bar bg-warning"
                      :style="{
                        width:
                          pipelineStats.totalLeads > 0
                            ? (pipelineStats.stageDistribution.IN_CONTACT /
                                pipelineStats.totalLeads) *
                                100 +
                              '%'
                            : '0%',
                      }"
                    ></div>
                  </div>
                </div>

                <div class="distribution-item">
                  <div class="distribution-header">
                    <span class="distribution-label">
                      <i class="bi bi-pause-circle-fill me-2 text-info"></i>
                      {{ $t('businessLeadPipeline.waitlist') }}
                    </span>
                    <span class="distribution-value">{{
                      pipelineStats.stageDistribution.WAITLIST
                    }}</span>
                  </div>
                  <div class="distribution-bar-container">
                    <div
                      class="distribution-bar bg-info"
                      :style="{
                        width:
                          pipelineStats.totalLeads > 0
                            ? (pipelineStats.stageDistribution.WAITLIST /
                                pipelineStats.totalLeads) *
                                100 +
                              '%'
                            : '0%',
                      }"
                    ></div>
                  </div>
                </div>

                <div class="distribution-item">
                  <div class="distribution-header">
                    <span class="distribution-label">
                      <i class="bi bi-handshake-fill me-2 text-success"></i>
                      {{ $t('businessLeadPipeline.inDeal') }}
                    </span>
                    <span class="distribution-value">{{
                      pipelineStats.stageDistribution.IN_DEAL
                    }}</span>
                  </div>
                  <div class="distribution-bar-container">
                    <div
                      class="distribution-bar bg-success"
                      :style="{
                        width:
                          pipelineStats.totalLeads > 0
                            ? (pipelineStats.stageDistribution.IN_DEAL / pipelineStats.totalLeads) *
                                100 +
                              '%'
                            : '0%',
                      }"
                    ></div>
                  </div>
                </div>

                <div class="distribution-item">
                  <div class="distribution-header">
                    <span class="distribution-label">
                      <i class="bi bi-check-circle-fill me-2 text-secondary"></i>
                      {{ $t('businessLeadPipeline.closed') }}
                    </span>
                    <span class="distribution-value">{{
                      pipelineStats.stageDistribution.CLOSED
                    }}</span>
                  </div>
                  <div class="distribution-bar-container">
                    <div
                      class="distribution-bar bg-secondary"
                      :style="{
                        width:
                          pipelineStats.totalLeads > 0
                            ? (pipelineStats.stageDistribution.CLOSED / pipelineStats.totalLeads) *
                                100 +
                              '%'
                            : '0%',
                      }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Lead Age Distribution -->
            <div class="analytics-section">
              <h6 class="section-title mb-3">
                <i class="bi bi-hourglass-split me-2"></i>
                {{ $t('businessLeadPipeline.analytics.ageDistribution') || 'Lead Age Distribution' }}
              </h6>
              <div class="row g-3">
                <div class="col-4">
                  <div class="age-card age-green">
                    <div class="age-icon">
                      <i class="bi bi-circle-fill"></i>
                    </div>
                    <div class="age-value">{{ pipelineStats.timeDistribution.green }}</div>
                    <div class="age-label">{{ $t('businessLeadPipeline.timeIndicator.green') }}</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="age-card age-yellow">
                    <div class="age-icon">
                      <i class="bi bi-circle-fill"></i>
                    </div>
                    <div class="age-value">{{ pipelineStats.timeDistribution.yellow }}</div>
                    <div class="age-label">{{ $t('businessLeadPipeline.timeIndicator.yellow') }}</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="age-card age-red">
                    <div class="age-icon">
                      <i class="bi bi-circle-fill"></i>
                    </div>
                    <div class="age-value">{{ pipelineStats.timeDistribution.red }}</div>
                    <div class="age-label">{{ $t('businessLeadPipeline.timeIndicator.red') }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showAnalytics = false">
              {{ $t('close') }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.lead-pipeline-container {
  padding: 1rem;
  position: relative;
}

.pipeline-dashboard-section {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 251, 252, 0.95) 100%);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(169, 169, 169, 0.15);
  margin-bottom: 2rem;
}

.pipeline-dashboard-section h4 {
  color: #004aad;
  font-weight: 700;
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pipeline-dashboard-section h4 i {
  color: #00c2cb;
}

/* Analytics Modal Styles */
.analytics-modal .modal-dialog {
  max-width: 1200px;
}

.analytics-modal .modal-content {
  border-radius: 16px;
  border: none;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.analytics-modal .modal-header {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  border-radius: .5rem .5rem 0 0;
  min-height: auto;
  position: relative;
}

.analytics-modal .modal-title {
  font-size: 1rem;
  font-weight: 700;
}

.analytics-modal .btn-close {
  filter: brightness(0) invert(1);
}

.analytics-modal .modal-body {
  padding: 1.5rem 1.25rem;
}

.analytics-section {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: #004aad;
  padding-bottom: 0.4rem;
  margin-bottom: 0.75rem;
}

/* Insights Cards */
.insights-section {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.05) 0%, rgba(0, 74, 173, 0.05) 100%);
  padding: 1rem;
  border-radius: 12px;
}

.insight-card {
  background: white;
  border-radius: 10px;
  padding: 0.875rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  border-left: 3px solid;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.insight-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.insight-critical {
  border-left-color: #dc3545;
}

.insight-warning {
  border-left-color: #ffc107;
}

.insight-success {
  border-left-color: #28a745;
}

.insight-info {
  border-left-color: #17a2b8;
}

.insight-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.insight-icon {
  font-size: 1.25rem;
}

.insight-critical .insight-icon {
  color: #dc3545;
}

.insight-warning .insight-icon {
  color: #ffc107;
}

.insight-success .insight-icon {
  color: #28a745;
}

.insight-info .insight-icon {
  color: #17a2b8;
}

.insight-title {
  font-weight: 700;
  font-size: 0.9rem;
  color: #212529;
}

.insight-message {
  margin: 0.4rem 0;
  color: #6c757d;
  line-height: 1.5;
  font-size: 0.875rem;
  flex: 1;
}

.insight-action {
  margin-top: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #004aad;
}

/* Funnel Chart */
.funnel-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.05) 0%, rgba(0, 194, 203, 0.05) 100%);
  border-radius: 10px;
  max-width: 800px;
  margin: 0 auto;
}

.funnel-stage {
  transition: all 0.3s ease;
  min-width: 40%;
  width: 100%;
  display: flex;
  justify-content: center;
}

.funnel-bar {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  transition: all 0.3s ease;
  width: 100%;
  min-height: 48px;
}

.funnel-bar:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.funnel-new {
  background: linear-gradient(135deg, #004aad 0%, #0066cc 100%);
}

.funnel-contact {
  background: linear-gradient(135deg, #ffc107 0%, #ffb300 100%);
}

.funnel-deal {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
}

.funnel-success {
  background: linear-gradient(135deg, #00c2cb 0%, #00d4dd 100%);
}

.funnel-label {
  font-size: 0.9rem;
}

.funnel-percentage {
  font-size: 1.1rem;
  font-weight: 700;
}

/* Metric Gauges */
.metric-gauge {
  text-align: center;
  padding: 0.75rem;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.metric-gauge:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.gauge-container {
  position: relative;
  margin-bottom: 0.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.gauge-svg {
  width: 100%;
  height: auto;
  max-width: 120px;
  margin: 0 auto;
  display: block;
}

.gauge-fill {
  transition: stroke-dasharray 1s ease;
}

.gauge-value {
  position: absolute;
  top: 70%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.25rem;
  font-weight: 700;
  color: #004aad;
}

.gauge-value-large {
  font-size: 1.75rem;
  font-weight: 700;
  color: #004aad;
  margin-top: 0.4rem;
}

.gauge-icon {
  font-size: 2rem;
  color: #00c2cb;
  margin-bottom: 0.4rem;
}

.gauge-icon.success {
  color: #28a745;
}

.gauge-label {
  font-size: 0.875rem;
  color: #6c757d;
  font-weight: 600;
}

/* Circular Progress */
.circular-progress {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: conic-gradient(#00c2cb calc(var(--progress) * 1%), #e0e0e0 0);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.5rem;
  position: relative;
}

.circular-progress::before {
  content: '';
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: white;
}

.progress-value {
  position: relative;
  z-index: 1;
  font-size: 1.5rem;
  font-weight: 700;
  color: #004aad;
}

/* Distribution Bars */
.distribution-bars {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.distribution-item {
  background: white;
  padding: 0.75rem;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.distribution-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.distribution-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.distribution-label {
  font-weight: 600;
  color: #212529;
  display: flex;
  align-items: center;
}

.distribution-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #004aad;
}

.distribution-bar-container {
  height: 12px;
  background: #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}

.distribution-bar {
  height: 100%;
  border-radius: 6px;
  transition: width 1s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Age Cards */
.age-card {
  background: white;
  padding: 1rem;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  border-top: 3px solid;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.age-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.age-green {
  border-top-color: #28a745;
}

.age-yellow {
  border-top-color: #ffc107;
}

.age-red {
  border-top-color: #dc3545;
}

.age-icon {
  font-size: 1.75rem;
  margin-bottom: 0.4rem;
}

.age-green .age-icon {
  color: #28a745;
}

.age-yellow .age-icon {
  color: #ffc107;
}

.age-red .age-icon {
  color: #dc3545;
}

.age-value {
  font-size: 2rem;
  font-weight: 700;
  color: #212529;
  margin: 0.4rem 0;
}

.age-label {
  font-size: 0.8rem;
  color: #6c757d;
  font-weight: 600;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .analytics-modal .modal-dialog {
    max-width: 95%;
    margin: 0.5rem;
  }

  .funnel-bar {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }

  .funnel-label {
    font-size: 0.8rem;
  }

  .gauge-value-large {
    font-size: 1.5rem;
  }

  .age-value {
    font-size: 2rem;
  }
}

.pipeline-carousel-wrapper {
  position: relative;
  width: 100%;
}

.pipeline-carousel-container {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  padding: 0.5rem 0;
  gap: 1rem;
  -webkit-overflow-scrolling: touch;
}

.pipeline-carousel-container::-webkit-scrollbar {
  height: 8px;
}

.pipeline-carousel-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.pipeline-carousel-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.pipeline-carousel-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.pipeline-nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid var(--azul-turno);
  color: var(--azul-turno);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  font-size: 1.2rem;
}

.pipeline-nav-arrow:hover {
  background: var(--azul-turno);
  color: white;
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.pipeline-nav-arrow:active {
  transform: translateY(-50%) scale(0.95);
}

.pipeline-nav-left {
  left: 10px;
}

.pipeline-nav-right {
  right: 10px;
}

@media (max-width: 768px) {
  .pipeline-nav-arrow {
    width: 35px;
    height: 35px;
    font-size: 1rem;
  }
  .pipeline-nav-left {
    left: -15px;
  }
  .pipeline-nav-right {
    right: -15px;
  }
}

.pipeline-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 1rem;
  min-width: fit-content;
}

.pipeline-column {
  padding: 0;
  min-width: 300px;
  max-width: 320px;
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 600px;
}

.pipeline-header {
  background: linear-gradient(135deg, var(--azul-turno) 0%, #004aad 100%);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem 0.5rem 0 0;
  margin-bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-height: 3.5rem;
}

.pipeline-header h5 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.pipeline-header h5 i {
  font-size: 1.1rem;
}

.pipeline-header .badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  margin-left: 0.5rem;
}

.pipeline-body {
  background-color: var(--gris-clear);
  min-height: calc(5 * 130px + 3rem); /* At least 5 cards (110px each + 20px margin) + padding */
  height: auto; /* Grow as needed */
  max-height: 85vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.5rem;
  border-radius: 0 0 0.5rem 0.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Pagination Controls */
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.5rem !important;
  margin-right: 0.25rem !important;
}

.pagination-btn {
  padding: 0.125rem 0.25rem;
  font-size: 0.75rem;
  line-height: 1;
  border-radius: 50%;
  min-width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: var(--azul-turno);
}

.pagination-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.9);
  border-color: white;
  color: var(--azul-turno);
  transform: scale(1.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background-color: rgba(255, 255, 255, 0.5);
}

.pagination-info {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  padding: 0 0.25rem;
  min-width: 2rem;
  text-align: center;
}

/* General Pagination Controls */
.general-pagination-controls {
  margin-left: auto;
}

.general-pagination-controls .btn {
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.general-pagination-controls .btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Drag and Drop Styles */
.pipeline-body.drag-over {
  background-color: rgba(0, 194, 203, 0.1);
  border: 2px dashed rgba(0, 194, 203, 0.5);
  border-radius: 0.5rem;
}

.modern-lead-card.draggable {
  cursor: grab;
}

.modern-lead-card.draggable:active {
  cursor: grabbing;
  opacity: 0.7;
}

.modern-lead-card.not-draggable {
  cursor: default;
  opacity: 0.8;
}

.modern-lead-card.dragging {
  opacity: 0.5;
  transform: rotate(2deg);
}

/* Spinning refresh icon */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.bi-arrow-clockwise.spinning {
  animation: spin 1s linear infinite;
}

/* Ensure all pipeline columns have equal height */
.pipeline-row {
  align-items: stretch;
}

.pipeline-column {
  display: flex;
  flex-direction: column;
}

.pipeline-column > .pipeline-header {
  flex-shrink: 0;
}

.pipeline-column > .pipeline-body {
  flex: 1;
  min-height: 0;
}

/* Modern Lead Cards - Dashboard Style */
.modern-lead-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  cursor: pointer !important;
  width: 100%;
  flex-shrink: 0;
}

.modern-lead-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #00c2cb 0%, #00c4cc 50%, #00c2cb 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.modern-lead-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(169, 169, 169, 0.3);
}

.modern-lead-card:hover::before {
  opacity: 0.6;
}

.modern-lead-card.metric-type-success {
  border-left: 3px solid #00c2cb;
}

.modern-lead-card.metric-type-success:hover {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.05) 0%, rgba(0, 194, 203, 0.02) 100%);
}

.modern-lead-card.metric-type-warning {
  border-left: 3px solid #f9c322;
}

.modern-lead-card.metric-type-warning:hover {
  background: linear-gradient(135deg, rgba(249, 195, 34, 0.05) 0%, rgba(249, 195, 34, 0.02) 100%);
}

.modern-lead-card.metric-type-error,
.modern-lead-card.metric-type-danger {
  border-left: 3px solid #dc3545;
}

.modern-lead-card.metric-type-error:hover,
.modern-lead-card.metric-type-danger:hover {
  background: linear-gradient(135deg, rgba(220, 53, 69, 0.05) 0%, rgba(220, 53, 69, 0.02) 100%);
}

.modern-lead-card.metric-type-info {
  border-left: 3px solid #004aad;
}

.modern-lead-card.metric-type-info:hover {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.05) 0%, rgba(0, 74, 173, 0.02) 100%);
}

/* Card Header */
.lead-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.lead-icon-container {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.modern-lead-card:hover .lead-icon-container {
  transform: scale(1.1) rotate(5deg);
}

.lead-icon-container.icon-success {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.lead-icon-container.icon-warning {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
}

.lead-icon-container.icon-error {
  background: rgba(220, 53, 69, 0.15);
  color: #dc3545;
}

.lead-icon-container.icon-danger {
  background: rgba(220, 53, 69, 0.15);
  color: #dc3545;
}

.lead-icon-container.icon-info {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
}

.lead-icon-container i {
  font-size: 1.1rem;
}

.lead-title-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 0.2rem;
}

.lead-name-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.8);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: uppercase;
}

.lead-date-text {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
  line-height: 1.2;
}

.lead-actions-mini {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.btn-action-mini {
  font-size: 0.7rem;
  padding: 0.35rem 0.5rem;
  min-width: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.lead-status-badge-container {
  flex-shrink: 0;
}

/* Card Body */
.lead-card-body {
  display: flex;
  flex-direction: column;
}

.lead-info-row {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  flex-wrap: wrap;
}

.lead-info-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.7);
  flex: 1;
  min-width: 0;
}

.lead-info-item i {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.lead-info-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-transform: uppercase;
}

/* Email should be lowercase */
.bi-envelope + .lead-info-text {
  text-transform: lowercase;
}

/* Service name should be capitalized properly */
.service-name {
  text-transform: capitalize !important;
  font-weight: 500;
  color: #6366f1;
}

/* Service badge styling */
.service-badge {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  font-weight: 500;
  border-radius: 0.375rem;
  text-transform: capitalize;
}

.lead-source-badge-mini {
  font-size: 0.65rem;
  padding: 0.2rem 0.4rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  border-radius: 4px;
}

.lead-source-badge-mini i {
  font-size: 0.6rem;
  margin-right: 0.2rem;
}

.lead-status-badge {
  font-size: 0.7rem;
  padding: 0.3rem 0.5rem;
  font-weight: 600;
  border-radius: 6px;
}

.lead-card-accent {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(0, 194, 203, 0.3) 50%, transparent 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.modern-lead-card:hover .lead-card-accent {
  opacity: 1;
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-control-readonly {
  background-color: rgba(245, 246, 247, 0.8);
  color: rgba(0, 0, 0, 0.7);
  cursor: default;
  border: 1.5px solid rgba(169, 169, 169, 0.2);
  min-height: 38px;
  display: flex;
  align-items: center;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
}

.contact-item {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.contact-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.contact-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: #dee2e6;
}

.contact-result-indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.contact-interested {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.contact-rejected {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
}

.contact-no-response {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: white;
}

.contact-later {
  background: linear-gradient(135deg, #ffc107 0%, #ffb300 100%);
  color: #212529;
}

.contact-default {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: white;
}

.contact-comment {
  line-height: 1.5;
  color: #495057;
  padding-top: 0.5rem;
}

.contact-link {
  color: #0d6efd;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s ease;
}

.contact-link:hover {
  color: #0a58ca;
  text-decoration: underline;
}

.contact-link i {
  font-size: 1.1rem;
}

.contact-link i.bi-whatsapp {
  color: #25d366;
}

.metric-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}

/* Modern Form Styles - Matching other views */
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

.form-control-modern {
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

.form-control-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern::placeholder {
  color: rgba(0, 0, 0, 0.4);
  font-weight: 400;
}

.form-control-modern.is-invalid {
  border-color: rgba(165, 42, 42, 0.5);
  box-shadow: 0 0 0 2px rgba(165, 42, 42, 0.1);
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

.errors {
  font-size: small;
  color: var(--rojo-warning);
  text-align: left;
  margin-top: 0.5rem;
}

/* Filters and Export Section - Match Dashboard Style */
.control-box {
  background-color: var(--color-background);
  padding: 0.75rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}

.metric-controls {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
  padding: 0.5rem;
  font-size: 0.9rem;
}

.metric-controls:focus {
  border-color: var(--azul-turno);
  outline: none;
  box-shadow: 0 0 0 0.2rem rgba(0, 74, 173, 0.25);
}

/* Tabs Styling */
.nav-tabs {
  border-bottom: 2px solid #e9ecef;
}

.nav-tabs .nav-link {
  color: #6c757d;
  border: none;
  border-bottom: 3px solid transparent;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.nav-tabs .nav-link:hover {
  color: var(--azul-turno);
  border-bottom-color: rgba(0, 74, 173, 0.3);
  background-color: rgba(0, 74, 173, 0.05);
}

.nav-tabs .nav-link.active {
  color: var(--azul-turno);
  border-bottom-color: var(--azul-turno);
  background-color: transparent;
  font-weight: 600;
}

/* Remove blue background and border from active tab-pane */
.tab-pane.active,
.tab-pane.show.active,
.tab-pane.fade.show.active {
  background-color: transparent !important;
  background: transparent !important;
  border: none !important;
  border-color: transparent !important;
}

/* Timeline Styling */
.timeline-container {
  position: relative;
  padding-left: 2.5rem;
  max-height: 600px;
  overflow-y: auto;
}

.timeline-container::before {
  content: '';
  position: absolute;
  left: 1rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(
    180deg,
    var(--azul-turno) 0%,
    rgba(0, 74, 173, 0.3) 50%,
    transparent 100%
  );
}

.timeline-item {
  position: relative;
  margin-bottom: 2rem;
  padding-left: 1.5rem;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-marker {
  position: absolute;
  left: -2.5rem;
  top: 0.25rem;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 2;
  border: 3px solid white;
  transition: all 0.3s ease;
}

.timeline-item:hover .timeline-marker {
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.timeline-content {
  background: #ffffff;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.timeline-item:hover .timeline-content {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateX(4px);
  border-color: rgba(169, 169, 169, 0.3);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.timeline-date {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 500;
  white-space: nowrap;
}

.timeline-transition {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.timeline-transition strong {
  color: var(--azul-turno);
  font-weight: 600;
}

/* Badge colors for stages */
.bg-primary {
  background-color: #004aad !important;
}

.bg-warning {
  background-color: #f9c322 !important;
  color: #000 !important;
}

.bg-info {
  background-color: #00c2cb !important;
}

.bg-success {
  background-color: #28a745 !important;
}

.bg-secondary {
  background-color: #6c757d !important;
}

/* Custom scrollbar for timeline */
.timeline-container::-webkit-scrollbar {
  width: 6px;
}

.timeline-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.timeline-container::-webkit-scrollbar-thumb {
  background: var(--azul-turno);
  border-radius: 10px;
}

.timeline-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 74, 173, 0.8);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .timeline-container {
    padding-left: 2rem;
  }

  .timeline-marker {
    width: 2rem;
    height: 2rem;
    left: -2rem;
    font-size: 0.85rem;
  }

  .timeline-header {
    flex-direction: column;
  }

  .timeline-date {
    margin-top: 0.5rem;
  }

  .nav-tabs .nav-link {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}

/* Desktop Layout Styles */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
  }

  .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
  }

  .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 100px;
    width: auto;
    height: auto;
    margin-bottom: 0;
  }

  #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
  }
}

.lead-time-indicator {
  align-items: center;
  margin-left: 0.5rem;
}

.lead-time-indicator .badge {
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
}

/* Enhanced Filter Styles */
.filters-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
}

.filters-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.desktop-filters-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  position: relative;
}

.filter-group-action {
  display: flex;
  align-items: center;
}

.input-with-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  position: relative;
}

.input-icon-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
  font-size: 0.85rem;
  z-index: 3;
  pointer-events: none;
}

.compact-date-input {
  padding-left: 1.8rem !important;
  padding-right: 0.5rem !important;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  height: 32px;
  width: 125px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.compact-search-input {
  padding-left: 2rem !important;
  padding-right: 2rem !important;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  height: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.compact-search-input:focus {
  box-shadow: 0 0 0 0.2rem rgba(0, 74, 173, 0.25);
  border-color: var(--azul-turno);
}

.clear-search-btn {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  padding: 0;
  background: none;
  border: none;
  color: #6c757d;
  font-size: 0.85rem;
  z-index: 3;
  cursor: pointer;
  transition: color 0.2s ease;
}

.clear-search-btn:hover {
  color: var(--azul-turno);
}

.compact-date-input:focus {
  box-shadow: 0 0 0 0.2rem rgba(0, 74, 173, 0.25);
  border-color: var(--azul-turno, #004aad);
  transform: translateY(-1px);
}

.clear-filter-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
  border: 1px solid #dee2e6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.clear-filter-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.filter-info-icon {
  color: #6c757d;
  font-size: 0.8rem;
  cursor: help;
  transition: color 0.2s ease;
}

.filter-info-icon:hover {
  color: var(--azul-turno, #004aad);
}

/* Filter Sections */
.filter-section-header {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-right: 0.5rem;
}

.filter-section-icon-info {
  color: var(--azul-turno, #004aad);
  font-size: 0.8rem;
}

.filter-section-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #495057;
}

.filter-buttons-group {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-option-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
  padding: 0 !important;
  border: 1px solid;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-option-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.filter-option-btn.active {
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.filter-option-btn i {
  font-size: 0.9rem;
  font-weight: 600;
}

/* Desktop Filter Sections */
.desktop-filter-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  background: rgba(248, 249, 250, 0.8);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.desktop-filter-section:hover {
  background: rgba(248, 249, 250, 1);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.desktop-filter-buttons {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

/* Responsive adjustments */
@media (max-width: 991px) {
  .filters-container {
    padding: 1rem;
  }

  .filters-row {
    gap: 0.75rem;
  }

  .filter-section-header {
    margin-right: 0.5rem;
  }

  .filter-section-label {
    font-size: 0.8rem;
  }

  .compact-date-input {
    width: 130px;
    height: 34px;
    font-size: 0.85rem;
  }

  .filter-option-btn,
  .clear-filter-btn {
    width: 34px;
    height: 34px;
  }

  .filter-option-btn i {
    font-size: 0.85rem;
  }

  .filter-buttons-group {
    gap: 0.375rem;
  }
}

@media (max-width: 576px) {
  .filters-container {
    padding: 0.75rem;
  }

  .filters-row {
    flex-direction: column;
    gap: 1rem;
  }

  .filter-section-header {
    justify-content: center;
  }

  .compact-date-input {
    width: 120px;
    height: 32px;
    font-size: 0.8rem;
    padding-left: 2rem !important;
  }

  .input-icon {
    font-size: 0.8rem;
    left: 0.5rem;
  }

  .filter-option-btn,
  .clear-filter-btn {
    width: 32px;
    height: 32px;
  }
}

/* Mobile Action Buttons */
.mobile-action-btn {
  width: 40px;
  height: 40px;
  padding: 0 !important;
  border-radius: 50% !important;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  position: relative;
}

.mobile-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.mobile-action-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.mobile-action-btn i {
  font-size: 1rem;
  font-weight: 600;
}

.mobile-action-btn:disabled {
  opacity: 0.6;
  transform: none !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1) !important;
}

/* Mobile Filter Toggle and Collapsible Styles */
.mobile-filter-toggle {
  border-radius: 20px !important;
  font-weight: 600;
  transition: all 0.3s ease;
  padding: 0.4rem 1rem;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 100px;
  box-shadow: 0 2px 6px rgba(0, 123, 255, 0.15);
}

.mobile-filter-toggle:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.25);
}

.mobile-filter-toggle i {
  font-size: 0.75rem;
}

.mobile-filter-toggle span {
  font-size: 0.75rem;
  font-weight: 600;
}

.mobile-filters-wrapper {
  transition: all 0.3s ease;
  overflow: hidden;
  max-height: 500px;
}

.mobile-filters-wrapper.collapsed {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.mobile-filters-content {
  padding-top: 1rem;
}

/* Spinning animation for refresh button */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Enhanced Tooltip Styles */
:deep(.filter-info-tooltip) {
  z-index: 1050 !important;
}

:deep(.filter-info-tooltip.dark .popper) {
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
  color: white;
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 500;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  max-width: 220px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.filter-info-tooltip.dark .popper[data-popper-placement^='top'] > .popper__arrow) {
  border-top-color: #2d3748;
}

:deep(.filter-info-tooltip.dark .popper[data-popper-placement^='bottom'] > .popper__arrow) {
  border-bottom-color: #2d3748;
}

:deep(.filter-info-tooltip.dark .popper[data-popper-placement^='left'] > .popper__arrow) {
  border-left-color: #2d3748;
}

:deep(.filter-info-tooltip.dark .popper[data-popper-placement^='right'] > .popper__arrow) {
  border-right-color: #2d3748;
}

/* Pagination Controls */
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
  margin-right: 0.5rem;
}

.pagination-btn {
  padding: 0.125rem 0.25rem;
  font-size: 0.75rem;
  line-height: 1;
  border-radius: 0.25rem;
  min-width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-btn:hover:not(:disabled) {
  background-color: var(--azul-turno);
  border-color: var(--azul-turno);
  color: white;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  padding: 0 0.25rem;
  min-width: 2rem;
  text-align: center;
}

/* General Pagination Controls */
.general-pagination-controls {
  margin-left: auto;
}

.general-pagination-controls .btn {
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.general-pagination-controls .btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Business Lead Form Sections */
.section-header {
  border-bottom: 2px solid #e9ecef;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
}

.section-title {
  color: #495057;
  font-weight: 600;
  font-size: 0.9rem;
  margin: 0;
  display: flex;
  align-items: center;
}

.section-title i {
  color: #6c757d;
}

.form-control-modern.form-control-readonly {
  background-color: #f8f9fa;
  border-color: #e9ecef;
  color: #495057;
}

.form-control-modern.form-control-readonly a {
  text-decoration: none;
  color: inherit;
}

.form-control-modern.form-control-readonly a:hover {
  text-decoration: underline;
}

.contact-link {
  color: #0d6efd !important;
}

.contact-link:hover {
  color: #0a58ca !important;
}

/* Select arrow styling */
.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #6c757d;
  font-size: 0.8rem;
  z-index: 2;
}

.input-icon-wrapper select.compact-select-input {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background: transparent;
  padding-right: 30px;
}

.input-icon-wrapper select.compact-select-input::-ms-expand {
  display: none;
}

/* Loading disabled cards */
.loading-disabled {
  opacity: 0.6;
  pointer-events: none;
  cursor: not-allowed;
}

/* Disable all cards when modal is loading */
.modal-loading .modern-lead-card {
  opacity: 0.6;
  pointer-events: none;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.modal-loading .modern-lead-card:hover {
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Clear all filters button styling */
.clear-all-filters-btn {
  font-weight: 500;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.clear-all-filters-btn:hover {
  background-color: #dc3545;
  border-color: #dc3545;
  color: white;
}

/* Modern Modal Header Styles */
.modern-modal-header {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  border-radius: .5rem .5rem 0 0;
  min-height: auto;
  position: relative;
}

.modern-modal-header-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.modern-modal-icon-wrapper {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modern-modal-icon-wrapper i {
  font-size: 1.125rem;
  color: #ffffff;
}

.modern-modal-title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.modern-modal-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-background);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.modern-modal-subtitle {
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.2;
}

.modern-modal-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.85;
  width: 1.75rem;
  height: 1.75rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  padding: 0;
}

.modern-modal-close-btn i {
  color: white;
  font-size: 1rem;
}
</style>
