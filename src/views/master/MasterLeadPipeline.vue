<script>
import { ref, reactive, onBeforeMount, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { globalStore } from '../../stores';
import {
  getLeadsByStage,
  getLeadsByStageFromBackend,
  updateLeadStage,
  addLeadContact,
  getLeadContacts,
  getLeadContactsFromBackend,
  getLeadById,
  getLeadByIdFromBackend,
  createLeadFromContactForm,
  getLeadTransitions,
} from '../../application/services/lead';
import { getPermissions } from '../../application/services/permissions';
import { USER_TYPES } from '../../shared/constants';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Message from '../../components/common/Message.vue';
import Warning from '../../components/common/Warning.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
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

export default {
  name: 'MasterLeadPipeline',
  components: {
    CommerceLogo,
    ComponentMenu,
    Spinner,
    Alert,
    Message,
    Warning,
    Popper,
  },
  setup() {
    const router = useRouter();
    const { t: $t } = useI18n();
    const store = globalStore();
    const loading = ref(false);
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

    const isMaster = computed(() => {
      const userType = store.getCurrentUserType;
      return userType === USER_TYPES.MASTER || userType === 'master';
    });

    const newContact = reactive({
      type: CONTACT_TYPES.CALL,
      result: CONTACT_RESULTS.NO_RESPONSE,
      comment: '',
    });

    const newLead = reactive({
      name: '',
      email: '',
      phone: '',
      company: '',
      message: '',
      source: 'manual',
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

    const loadLeads = async (useBackend = false) => {
      try {
        loading.value = true;
        alertError.value = '';
        const user = store.getCurrentUser;
        const userType = store.getCurrentUserType;
        const isMasterUser = userType === USER_TYPES.MASTER || userType === 'master';
        // For master users, don't filter by userId
        const userId = isMasterUser ? undefined : user?.id;

        // Use backend (Firebase) for immediate results, or query stack (PostgreSQL) for processed data
        const getLeadsFn = useBackend ? getLeadsByStageFromBackend : getLeadsByStage;

        const [newLeads, inContactLeads, waitlistLeads, inDealLeads, closedLeads] = await Promise.all([
          getLeadsFn(PIPELINE_STAGES.NEW, userId, user?.businessId, user?.commerceId),
          getLeadsFn(PIPELINE_STAGES.IN_CONTACT, userId, user?.businessId, user?.commerceId),
          getLeadsFn(PIPELINE_STAGES.WAITLIST, userId, user?.businessId, user?.commerceId),
          getLeadsFn(PIPELINE_STAGES.IN_DEAL, userId, user?.businessId, user?.commerceId),
          getLeadsFn(PIPELINE_STAGES.CLOSED, userId, user?.businessId, user?.commerceId),
        ]);

        // Filter out archived leads and apply all filters
        // IMPORTANT: This function filters leads within their original stage, it does NOT move leads between stages
        // Note: The leads are already filtered by stage from the backend, so we don't need to verify the stage again
        const filterLeads = (leadList) => {
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

    const moveLead = async (lead, newStage, status) => {
      try {
        loading.value = true;

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
        await updateLeadStage(leadId, newStage, statusToSend);

        // Reload from backend (Firebase) to ensure consistency
        await loadLeads(true);
        loading.value = false;
      } catch (error) {
        loading.value = false;
        // On error, reload to get correct state
        await loadLeads(true);
        const errorMsg = error.response?.status || error.message || 500;
        alertError.value = Array.isArray(errorMsg) ? errorMsg[0] : errorMsg;
      }
    };

    const archiveLead = async (lead) => {
      try {
        if (!lead || !lead.id) {
          alertError.value = 'Lead ID is missing';
          return;
        }

        loading.value = true;
        alertError.value = '';

        // Confirm action
        const confirmed = window.confirm(
          $t('leadPipeline.archiveConfirm') || 'Are you sure you want to archive this lead? It will be removed from all lists.'
        );

        if (!confirmed) {
          loading.value = false;
          return;
        }

        // Update lead stage to ARCHIVED
        await updateLeadStage(lead.id, PIPELINE_STAGES.ARCHIVED, undefined);

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
          // Prevent event propagation if event is provided
          if (event) {
            event.stopPropagation();
          }

          try {
            loading.value = true;

            // Try to get from query stack first (PostgreSQL), fallback to backend (Firebase)
            let leadDetails = null;
            let contacts = [];

            try {
              [leadDetails, contacts] = await Promise.all([
                getLeadById(lead.id),
                getLeadContacts(lead.id),
              ]);
            } catch (queryError) {
              // If not in PostgreSQL yet, get from backend (Firebase)
              console.log('Lead not in PostgreSQL yet, fetching from Firebase');
              try {
                leadDetails = await getLeadByIdFromBackend(lead.id);
                contacts = []; // Contacts might not be in Firebase yet
              } catch (backendError) {
                // If not found in backend either, use the lead data we have
                leadDetails = lead;
              }
            }

            selectedLead.value = { ...(leadDetails || lead), contacts: contacts || [] };

            // Fetch transitions/history for this lead
            try {
              const transitions = await getLeadTransitions(lead.id);
              let finalTransitions = [...transitions];

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
                leadTransitions.value = [{
                  id: 'initial',
                  oldStage: null,
                  newStage: PIPELINE_STAGES.NEW,
                  status: null,
                  userId: null,
                  occurredOn: selectedLead.value.createdAt,
                  createdAt: selectedLead.value.createdAt,
                  isInitial: true,
                }];
              } else {
                leadTransitions.value = [];
              }
            }

            showLeadDetails.value = true;
            loading.value = false;

            // Show Bootstrap modal - wait for Vue to update DOM
            await new Promise(resolve => setTimeout(resolve, 300));

            const modalElement = document.getElementById('lead-details-modal');
            console.log('Modal element:', modalElement);

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
                console.log('Creating new modal instance');
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
            loading.value = false;
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
          showAddContact.value = false;
          newContact.comment = '';
          newContact.type = CONTACT_TYPES.CALL;
          newContact.result = CONTACT_RESULTS.NO_RESPONSE;
          newContact.scheduledAt = undefined;
        };

    const saveContact = async (event) => {
      // Prevent event propagation
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Clear any previous errors
      alertError.value = '';

      if (!selectedLead.value) {
        alertError.value = 'No lead selected';
        return;
      }

      if (!newContact.comment || newContact.comment.trim().length < 10) {
        alertError.value = 'Comment must be at least 10 characters';
        console.warn('Validation failed: Comment too short', {
          comment: newContact.comment,
          length: newContact.comment?.trim().length
        });
        return;
      }

      if (!newContact.type) {
        alertError.value = 'Contact type is required';
        return;
      }

      if (!newContact.result) {
        alertError.value = 'Contact result is required';
        return;
      }

      try {
        loading.value = true;
        alertError.value = '';

        // Validate data before sending
        if (!selectedLead.value.id) {
          throw new Error('Lead ID is missing');
        }

        console.log('Saving contact:', {
          leadId: selectedLead.value.id,
          contact: newContact
        });

        const contactData = {
          type: newContact.type,
          result: newContact.result,
          comment: newContact.comment.trim(),
          scheduledAt: newContact.scheduledAt || undefined,
        };

        console.log('Calling addLeadContact with:', {
          leadId: selectedLead.value.id,
          contactData: contactData
        });

        // Ensure we're actually calling the service
        console.log('About to call addLeadContact service...');
        const savedContact = await addLeadContact(selectedLead.value.id, contactData);
        console.log('Contact saved successfully:', savedContact);

        if (!savedContact || !savedContact.id) {
          console.warn('Contact saved but response is missing ID:', savedContact);
          throw new Error('Contact was not saved properly - missing ID in response');
        }

        // Optimistically add the contact to the list immediately for faster UI update
        if (savedContact && selectedLead.value.contacts) {
          selectedLead.value.contacts.unshift(savedContact);
        } else if (savedContact) {
          selectedLead.value.contacts = [savedContact];
        }

        // Check contact result and move lead accordingly
        const currentStage = selectedLead.value.pipelineStage || selectedLead.value.stage;
        console.log('Current lead stage:', currentStage);

        // Only apply automatic stage transitions when lead is in NEW stage
        if (currentStage === PIPELINE_STAGES.NEW) {
        // If contact result is REJECTED, move lead to CLOSED stage with REJECTED status
        if (newContact.result === CONTACT_RESULTS.REJECTED) {
          // Update immediately but catch errors so contact save still succeeds
          (async () => {
            try {
              console.log('Contact marked as rejected, moving lead to CLOSED stage with REJECTED status...', {
                leadId: selectedLead.value.id,
                currentStage: currentStage,
                targetStage: PIPELINE_STAGES.CLOSED,
                targetStatus: LEAD_STATUS.REJECTED
              });

              // updateLeadStage signature: (id, stage, status)
              const updatedLead = await updateLeadStage(
                selectedLead.value.id,
                PIPELINE_STAGES.CLOSED,
                LEAD_STATUS.REJECTED
              );

              console.log('Lead moved to CLOSED with REJECTED status successfully:', updatedLead);

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
                PIPELINE_STAGES.IN_DEAL
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

              // Reload leads to ensure UI is in sync with database
              setTimeout(async () => {
                try {
                  await loadLeads(true); // Use backend for immediate update
                } catch (reloadError) {
                  // Silently ignore - UI was already updated optimistically
                }
              }, 1500);
            } catch (stageError) {
              console.error('Error moving lead to CLOSED stage with REJECTED status:', stageError);
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
              console.log('Contact marked as contact later, moving lead to WAITLIST stage...', {
                leadId: selectedLead.value.id,
                currentStage: currentStage,
                targetStage: PIPELINE_STAGES.WAITLIST
              });

              // updateLeadStage signature: (id, stage, status)
              const updatedLead = await updateLeadStage(
                selectedLead.value.id,
                PIPELINE_STAGES.WAITLIST,
                undefined
              );

              console.log('Lead moved to WAITLIST stage successfully:', updatedLead);

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
                PIPELINE_STAGES.IN_DEAL
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
                console.log('Contact marked as interested, moving lead to IN_DEAL stage...', {
                  leadId: selectedLead.value.id,
                  currentStage: currentStage,
                  targetStage: PIPELINE_STAGES.IN_DEAL
                });

                // updateLeadStage signature: (id, stage, status)
                const updatedLead = await updateLeadStage(
                  selectedLead.value.id,
                  PIPELINE_STAGES.IN_DEAL,
                  undefined
                );

                console.log('Lead moved to IN_DEAL stage successfully:', updatedLead);

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
                  PIPELINE_STAGES.WAITLIST
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
                console.log('Contact marked as waiting for response, moving lead to IN_CONTACT stage...', {
                  leadId: selectedLead.value.id,
                  currentStage: currentStage,
                  targetStage: PIPELINE_STAGES.IN_CONTACT
                });

                // updateLeadStage signature: (id, stage, status)
                const updatedLead = await updateLeadStage(
                  selectedLead.value.id,
                  PIPELINE_STAGES.IN_CONTACT,
                  undefined
                );

                console.log('Lead moved to IN_CONTACT stage successfully:', updatedLead);

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
        }
        // Automatically move lead to IN_CONTACT stage when a contact is added (for non-NEW stages)
        // Only move if not already IN_CONTACT or CLOSED
        // Only move to IN_CONTACT if currently in WAITLIST
        // Don't move if already in IN_CONTACT, IN_DEAL, or CLOSED
        else if (currentStage === PIPELINE_STAGES.WAITLIST) {
          // Update immediately but catch errors so contact save still succeeds
          (async () => {
            try {
              console.log('Moving lead to IN_CONTACT stage in database...', {
                leadId: selectedLead.value.id,
                currentStage: currentStage,
                targetStage: PIPELINE_STAGES.IN_CONTACT
              });

              // updateLeadStage signature: (id, stage, status)
              // Backend gets userId from auth token automatically
              const updatedLead = await updateLeadStage(selectedLead.value.id, PIPELINE_STAGES.IN_CONTACT, undefined);

              console.log('Lead stage updated in database successfully:', updatedLead);

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
                const inContactIndex = leads.IN_CONTACT.findIndex(l => l.id === selectedLead.value.id);
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
        } else {
          console.log('Lead already in IN_CONTACT or CLOSED stage, skipping move');
        }

        // Reload contacts from query stack after a delay (non-blocking, silent failures)
        // The contact was already added optimistically, so this is just for refresh
        // Query stack needs time to process the event, so we wait a bit
        setTimeout(async () => {
          try {
            const contacts = await getLeadContacts(selectedLead.value.id);
            if (contacts && contacts.length > 0) {
              selectedLead.value.contacts = contacts;
            }
          } catch (error) {
            // Silently ignore - contact was already added optimistically
            // Query stack might not have processed the event yet (this is normal)
            // Don't log errors to avoid cluttering console with expected failures
          }
        }, 3000); // Wait 3 seconds for query stack to process

        // Reset form
        newContact.comment = '';
        newContact.type = CONTACT_TYPES.CALL;
        newContact.result = CONTACT_RESULTS.NO_RESPONSE;
        newContact.scheduledAt = undefined;
        showAddContact.value = false;

        loading.value = false;
      } catch (error) {
        loading.value = false;
        console.error('Error saving contact:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response,
          request: error.request,
          stack: error.stack
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
    const getContactResultIcon = (result) => {
      const icons = {
        INTERESTED: 'bi bi-check-circle-fill',
        REJECTED: 'bi bi-x-circle-fill',
        NO_RESPONSE: 'bi bi-question-circle-fill',
        CONTACT_LATER: 'bi bi-clock-fill',
        WAITING_FOR_RESPONSE: 'bi bi-hourglass-split',
      };
      return icons[result] || 'bi bi-circle';
    };

    const getContactResultClass = (result) => {
      const classes = {
        INTERESTED: 'contact-interested',
        REJECTED: 'contact-rejected',
        NO_RESPONSE: 'contact-no-response',
        CONTACT_LATER: 'contact-later',
        WAITING_FOR_RESPONSE: 'contact-waiting',
      };
      return classes[result] || 'contact-default';
    };

    const getContactResultBadgeClass = (result) => {
      const classes = {
        INTERESTED: 'bg-success',
        REJECTED: 'bg-danger',
        NO_RESPONSE: 'bg-secondary',
        CONTACT_LATER: 'bg-warning text-dark',
        WAITING_FOR_RESPONSE: 'bg-info text-dark',
      };
      return classes[result] || 'bg-secondary';
    };

    const getContactResultLabel = (result) => {
      const labels = {
        INTERESTED: 'Interested',
        REJECTED: 'Rejected',
        NO_RESPONSE: 'No Response',
        CONTACT_LATER: 'Contact Later',
        WAITING_FOR_RESPONSE: 'Waiting for Response',
      };
      return labels[result] || result;
    };

    // Stage helper functions for transitions
    const getStageLabel = (stage) => {
      const labels = {
        [PIPELINE_STAGES.NEW]: $t('leadPipeline.newLeads') || 'New',
        [PIPELINE_STAGES.IN_CONTACT]: $t('leadPipeline.inContact') || 'In Contact',
        [PIPELINE_STAGES.WAITLIST]: $t('leadPipeline.waitlist') || 'Waitlist',
        [PIPELINE_STAGES.IN_DEAL]: $t('leadPipeline.inDeal') || 'In Deal',
        [PIPELINE_STAGES.CLOSED]: $t('leadPipeline.closed') || 'Closed',
        [PIPELINE_STAGES.ARCHIVED]: $t('leadPipeline.archived') || 'Archived',
      };
      return labels[stage] || stage;
    };

    const getStageIcon = (stage) => {
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

    const getStageColor = (stage) => {
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

    const getStatusLabel = (status) => {
      if (!status) return '';
      const labels = {
        [LEAD_STATUS.INTERESTED]: $t('leadPipeline.interested') || 'Interested',
        [LEAD_STATUS.REJECTED]: $t('leadPipeline.rejected') || 'Rejected',
        [LEAD_STATUS.SUCCESS]: $t('leadPipeline.success') || 'Success',
        [LEAD_STATUS.MAYBE_LATER]: $t('leadPipeline.maybeLater') || 'Maybe Later',
        [LEAD_STATUS.NO_RESPONSE]: $t('leadPipeline.noResponse') || 'No Response',
      };
      return labels[status] || status;
    };

    const formatDateTime = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const day = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
      const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      return `${day} ${time}`;
    };

    // Helper function to get time indicator color for a lead
    const getTimeIndicator = (lead) => {
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
    const getTimeIndicatorLabel = (indicator) => {
      if (!indicator) return '';
      const labels = {
        green: $t('leadPipeline.timeIndicator.green') || 'Less than 1 month',
        yellow: $t('leadPipeline.timeIndicator.yellow') || '1-3 months',
        red: $t('leadPipeline.timeIndicator.red') || 'More than 3 months',
      };
      return labels[indicator] || indicator;
    };

    // Toggle status filter
    const toggleStatusFilter = (status) => {
      const index = statusFilter.value.indexOf(status);
      if (index > -1) {
        statusFilter.value.splice(index, 1);
      } else {
        statusFilter.value.push(status);
      }
      loadLeads();
    };

    // Toggle time indicator filter
    const toggleTimeIndicatorFilter = (indicator) => {
      const index = timeIndicatorFilter.value.indexOf(indicator);
      if (index > -1) {
        timeIndicatorFilter.value.splice(index, 1);
      } else {
        timeIndicatorFilter.value.push(indicator);
      }
      loadLeads();
    };

    // Reset status filters
    const resetStatusFilters = () => {
      statusFilter.value = [];
      loadLeads();
    };

    // Reset time indicator filters
    const resetTimeIndicatorFilters = () => {
      timeIndicatorFilter.value = [];
      loadLeads();
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
          alertError.value = $t('leadPipeline.noLeadsToExport') || 'No leads to export';
          loading.value = false;
          return;
        }

        // Fetch contacts and transitions for each lead
        const leadsWithDetails = await Promise.all(
          allLeads.map(async (lead) => {
            let contacts = [];
            let transitions = [];

            try {
              // Get contacts
              try {
                contacts = await getLeadContacts(lead.id);
              } catch (e) {
                try {
                  contacts = await getLeadContactsFromBackend(lead.id);
                } catch (e2) {
                  // Fail silently
                }
              }

              // Get transitions
              transitions = await getLeadTransitions(lead.id);

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
        const formatDateForCSV = (date) => {
          if (!date) return '';
          if (typeof date === 'object' && date.toDate) {
            return date.toDate().toISOString();
          }
          return new Date(date).toISOString();
        };

        // Helper function to escape CSV values
        const escapeCSV = (value) => {
          if (value === null || value === undefined) return '';
          const str = String(value);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        // Header row
        const headers = [
          'Lead ID',
          'Name',
          'Email',
          'Phone',
          'Company',
          'Source',
          'Pipeline Stage',
          'Status',
          'Created At',
          'Updated At',
          'Last Contacted At',
          'Assigned To User ID',
          'Business ID',
          'Commerce ID',
          'Message',
          'Notes',
          'Contact Count',
          'Contacts',
          'Transition Count',
          'Transitions',
        ];
        csvRows.push(headers.join(','));

        // Helper function to format contacts as readable text
        const formatContactsForCSV = (contacts) => {
          if (!contacts || contacts.length === 0) return '';

          return contacts
            .map(c => {
              const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }) : 'N/A';

              const type = c.type || 'UNKNOWN';
              const result = c.result || 'N/A';
              const comment = c.comment ? c.comment.substring(0, 100) : ''; // Limit comment length

              return `${type} - ${result}${comment ? ` - ${comment}` : ''} (${date})`;
            })
            .join(' | ');
        };

        // Helper function to format transitions as readable text
        const formatTransitionsForCSV = (transitions) => {
          if (!transitions || transitions.length === 0) return '';

          return transitions
            .map(t => {
              const date = (t.occurredOn || t.createdAt)
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
        alertError.value = $t('leadPipeline.exportError') || 'Error exporting leads to CSV';
      }
    };

    // Reset date filters to default (one month ago to today)
    const resetDateFilters = () => {
      const today = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);

      dateFilterFrom.value = oneMonthAgo.toISOString().split('T')[0];
      dateFilterTo.value = today.toISOString().split('T')[0];
      loadLeads(true);
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
        if (mobileElement.offsetParent !== null) { // element is visible
          container = mobileElement;
        }
      }

      // If mobile not found or not visible, try desktop
      if (!container && pipelineContainerDesktop.value) {
        const desktopElement = pipelineContainerDesktop.value;
        if (desktopElement.offsetParent !== null) { // element is visible
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
          behavior: 'smooth'
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
        if (mobileElement.offsetParent !== null) { // element is visible
          container = mobileElement;
        }
      }

      // If mobile not found or not visible, try desktop
      if (!container && pipelineContainerDesktop.value) {
        const desktopElement = pipelineContainerDesktop.value;
        if (desktopElement.offsetParent !== null) { // element is visible
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
          behavior: 'smooth'
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

    const showAdd = () => {
      showAddLead.value = true;
      // Ensure toggles are set if not loaded yet (for master users)
      if (isMaster.value && (!toggles.value || Object.keys(toggles.value).length === 0)) {
        toggles.value = {
          'leadPipeline.admin.add': true,
          'leadPipeline.admin.view': true,
          'leadPipeline.admin.read': true,
          'leadPipeline.admin.edit': true,
          'leadPipeline.admin.update': true,
        };
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
      newLead.email = '';
      newLead.phone = '';
      newLead.company = '';
      newLead.message = '';
      alertError.value = '';
      errorsAdd.value = [];
      nameError.value = false;
      emailError.value = false;
      showAddLead.value = false;
    };

    const validateNewLead = () => {
      errorsAdd.value = [];
      nameError.value = false;
      emailError.value = false;

      if (!newLead.name || newLead.name.trim().length === 0) {
        nameError.value = true;
        errorsAdd.value.push('leadPipeline.validate.name');
        return false;
      }

      if (!newLead.email || newLead.email.trim().length === 0) {
        emailError.value = true;
        errorsAdd.value.push('leadPipeline.validate.email');
        return false;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newLead.email)) {
        emailError.value = true;
        errorsAdd.value.push('leadPipeline.validate.emailFormat');
        return false;
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
        const leadData = {
          id: leadId,
          name: newLead.name.trim(),
          email: newLead.email.trim(),
          phone: newLead.phone?.trim() || '',
          company: newLead.company?.trim() || '',
          message: newLead.message?.trim() || '',
          source: 'manual',
          page: window.location.href,
          businessId: user?.businessId,
          commerceId: user?.commerceId,
        };

        // Create lead - this returns the lead from Firebase immediately
        const createdLead = await createLeadFromContactForm(leadData);

        // Optimistic update: Add the lead to the NEW stage immediately
        // Convert Firebase timestamp to Date if needed
        if (createdLead.createdAt && typeof createdLead.createdAt === 'object' && createdLead.createdAt.toDate) {
          createdLead.createdAt = createdLead.createdAt.toDate().toISOString();
        } else if (createdLead.createdAt && typeof createdLead.createdAt === 'string') {
          // Already a string, keep it
        } else if (createdLead.createdAt) {
          createdLead.createdAt = new Date(createdLead.createdAt).toISOString();
        }

        if (createdLead.updatedAt && typeof createdLead.updatedAt === 'object' && createdLead.updatedAt.toDate) {
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
        const errorMessage = error?.response?.data?.message || error?.message || 'Error creating lead';
        alertError.value = Array.isArray(errorMessage) ? errorMessage[0] : (error?.response?.status || errorMessage);
      }
    };

    onBeforeMount(async () => {
      try {
        loading.value = true;
        toggles.value = await getPermissions('leadPipeline', 'admin');
        // Load from backend (Firebase) first for immediate consistency
        // Backend has the latest data, query stack may lag behind
        await loadLeads(true); // Use backend for immediate, consistent data
        loading.value = false;
      } catch (error) {
        console.error('Error loading lead pipeline:', error);
        // Fallback to query stack if backend fails
        try {
          await loadLeads(false);
        } catch (fallbackError) {
        const errorMsg = error?.response?.status || error?.message || 'Error loading lead pipeline';
        alertError.value = Array.isArray(errorMsg) ? errorMsg[0] : errorMsg;
        }
        loading.value = false;
      }
    });

    onMounted(() => {
      const addModal = document.getElementById('add-lead');
      if (addModal) {
        addModal.addEventListener('hidden.bs.modal', resetAddForm);
        addModal.addEventListener('show.bs.modal', () => {
          showAddLead.value = true;
          // Ensure toggles are set if not loaded yet (for master users)
          if (isMaster.value && (!toggles.value || Object.keys(toggles.value).length === 0)) {
            toggles.value = {
              'leadPipeline.admin.add': true,
              'leadPipeline.admin.view': true,
              'leadPipeline.admin.read': true,
              'leadPipeline.admin.edit': true,
              'leadPipeline.admin.update': true,
            };
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
    });

    onUnmounted(() => {
      const addModal = document.getElementById('add-lead');
      if (addModal) {
        addModal.removeEventListener('hidden.bs.modal', resetAddForm);
      }
    });

    return {
      loading,
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
      formatDate,
      getContactResultIcon,
      getContactResultClass,
      getContactResultBadgeClass,
      getContactResultLabel,
      goBack,
      showAdd,
      closeAddModal,
      resetAddForm,
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
      formatDateTime,
      dateFilterFrom,
      dateFilterTo,
      exportLeadsToCSV,
      resetDateFilters,
      statusFilter,
      timeIndicatorFilter,
      getTimeIndicator,
      getTimeIndicatorLabel,
      toggleStatusFilter,
      toggleTimeIndicatorFilter,
      resetStatusFilters,
      resetTimeIndicatorFilters,
    };
  },
};
</script>

<template>
  <div v-bind="$attrs">
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
      <CommerceLogo></CommerceLogo>
      <ComponentMenu
        :title="$t('leadPipeline.title')"
        :toggles="toggles"
        component-name="leadPipeline"
        @goBack="goBack"
      >
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="false" :stack="alertError"></Alert>
      </div>

        <!-- Filters and Export Section -->
        <div class="control-box mb-4 text-center">
          <div class="row my-2 justify-content-center">
            <div class="col-6 col-md-3">
              <input
                id="filterFromDate"
                class="form-control metric-controls"
                type="date"
                v-model="dateFilterFrom"
                @change="loadLeads(true)"
                :placeholder="$t('leadPipeline.filterFromDate') || 'Data De'"
              />
            </div>
            <div class="col-6 col-md-3">
              <input
                id="filterToDate"
                class="form-control metric-controls"
                type="date"
                v-model="dateFilterTo"
                @change="loadLeads(true)"
                :placeholder="$t('leadPipeline.filterToDate') || 'Data Até'"
              />
            </div>
            <div class="col-6 col-md-3">
              <button
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2 w-100"
                @click="resetDateFilters"
                :disabled="loading"
              >
                <i class="bi bi-eraser-fill me-1"></i>{{ $t('leadPipeline.clearFilter') || 'Limpar Filtro' }}
              </button>
            </div>
          </div>

          <!-- Status Filters -->
          <div class="row my-2">
            <div class="col-12">
              <label class="form-label small fw-bold mb-2">{{ $t('leadPipeline.filterByStatus') || 'Filtrar por Status' }}</label>
              <div class="d-flex flex-wrap gap-2 justify-content-center">
              <button
                  v-for="status in Object.values(LEAD_STATUS)"
                  :key="status"
                  class="btn btn-sm rounded-pill"
                  :class="statusFilter.includes(status) ? 'btn-primary' : 'btn-outline-primary'"
                  @click="toggleStatusFilter(status)"
                >
                  {{ getStatusLabel(status) }}
              </button>
              </div>
            </div>
          </div>

          <!-- Time Indicator Filters -->
          <div class="row my-2">
            <div class="col-12">
              <label class="form-label small fw-bold mb-2">{{ $t('leadPipeline.filterByTime') || 'Filtrar por Tempo desde Criação' }}</label>
              <div class="d-flex flex-wrap gap-2 justify-content-center">
                <button
                  class="btn btn-sm rounded-pill"
                  :class="timeIndicatorFilter.includes('green') ? 'btn-success' : 'btn-outline-success'"
                  @click="toggleTimeIndicatorFilter('green')"
                >
                  <i class="bi bi-circle-fill me-1" style="font-size: 0.6rem;"></i> {{ getTimeIndicatorLabel('green') }}
                </button>
                <button
                  class="btn btn-sm rounded-pill"
                  :class="timeIndicatorFilter.includes('yellow') ? 'btn-warning' : 'btn-outline-warning'"
                  @click="toggleTimeIndicatorFilter('yellow')"
                >
                  <i class="bi bi-circle-fill me-1" style="font-size: 0.6rem;"></i> {{ getTimeIndicatorLabel('yellow') }}
                </button>
                <button
                  class="btn btn-sm rounded-pill"
                  :class="timeIndicatorFilter.includes('red') ? 'btn-danger' : 'btn-outline-danger'"
                  @click="toggleTimeIndicatorFilter('red')"
                >
                  <i class="bi bi-circle-fill me-1" style="font-size: 0.6rem;"></i> {{ getTimeIndicatorLabel('red') }}
                </button>
              </div>
            </div>
          </div>
        </div>

      <div v-if="!loading" class="lead-pipeline-container">
        <!-- Add Lead Button and Export CSV -->
        <div class="row mb-3">
          <div class="col-12 text-start d-flex gap-2">
            <button
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
              @click="showAdd()"
              :disabled="!isMaster && !toggles['leadPipeline.admin.add']"
            >
              <i class="bi bi-plus-lg"></i> {{ $t('add') }}
            </button>
            <button
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
              @click="exportLeadsToCSV"
              :disabled="loading"
            >
              <i class="bi bi-download me-1"></i>{{ $t('leadPipeline.exportCSV') || 'Export to CSV' }}
            </button>
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
          <div class="pipeline-carousel-container" ref="pipelineContainerMobile">
            <div class="pipeline-row">
          <!-- NEW Leads Column -->
              <div class="pipeline-column">
            <div class="pipeline-header">
              <h5>
                <i class="bi bi-inbox-fill"></i>
                {{ $t('leadPipeline.newLeads') || 'New Leads' }}
                <span class="badge bg-primary">{{ leads.NEW.length }}</span>
              </h5>
            </div>
            <div class="pipeline-body">
              <div
                v-for="lead in leads.NEW"
                :key="lead.id"
                class="modern-lead-card metric-type-info"
                @click="openLeadDetails(lead)"
              >
                <div class="lead-card-header">
                  <div class="lead-icon-container icon-info">
                    <i class="bi bi-person-circle"></i>
                  </div>
                  <div class="lead-title-section">
                    <span class="lead-name-text">{{ lead.name }}</span>
                    <span class="lead-date-text">{{ formatDate(lead.createdAt) }}</span>
                  </div>
                  <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                    <span
                      class="badge rounded-pill"
                      :class="{
                        'bg-success': getTimeIndicator(lead) === 'green',
                        'bg-warning': getTimeIndicator(lead) === 'yellow',
                        'bg-danger': getTimeIndicator(lead) === 'red'
                      }"
                      :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                    >
                      <i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i>
                    </span>
                  </div>
                  <div class="lead-actions-mini">
                    <button
                      class="btn btn-sm btn-primary btn-action-mini"
                      @click.stop="moveLead(lead, PIPELINE_STAGES.IN_CONTACT)"
                      :title="$t('leadPipeline.moveToContact') || 'Move to Contact'"
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
                        'bg-info': lead.source === 'contact-form' || lead.source === 'exit-intent',
                        'bg-secondary': lead.source === 'manual',
                      }"
                      :title="lead.source === 'manual' ? $t('leadPipeline.source.manual') : $t('leadPipeline.source.publicSite')"
                    >
                      <i :class="lead.source === 'manual' ? 'bi bi-person-plus' : 'bi bi-globe'"></i>
                    </span>
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
                </div>
                <div class="lead-card-accent"></div>
              </div>
              <div v-if="leads.NEW.length === 0" class="empty-state">
                <Message
                  :icon="'bi-inbox'"
                  :title="$t('leadPipeline.noLeads') || 'No new leads'"
                  :content="$t('leadPipeline.noLeadsDesc') || 'No leads in this stage'"
                />
              </div>
            </div>
          </div>

          <!-- IN_CONTACT Leads Column -->
          <div class="pipeline-column">
            <div class="pipeline-header">
              <h5>
                <i class="bi bi-chat-dots-fill"></i>
                {{ $t('leadPipeline.inContact') || 'In Contact' }}
                <span class="badge bg-warning">{{ leads.IN_CONTACT.length }}</span>
              </h5>
            </div>
            <div class="pipeline-body">
              <div
                v-for="lead in leads.IN_CONTACT"
                :key="lead.id"
                class="modern-lead-card metric-type-warning"
                @click="openLeadDetails(lead)"
              >
                <div class="lead-card-header">
                  <div class="lead-icon-container icon-warning">
                    <i class="bi bi-chat-dots-fill"></i>
                  </div>
                  <div class="lead-title-section">
                    <span class="lead-name-text">{{ lead.name }}</span>
                    <span v-if="lead.lastContactedAt" class="lead-date-text">
                      <i class="bi bi-clock"></i> {{ $t('leadPipeline.lastContact') || 'Last contact' }}: {{ formatDate(lead.lastContactedAt) }}
                    </span>
                    <span v-else class="lead-date-text">{{ formatDate(lead.createdAt) }}</span>
                  </div>
                  <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                    <span
                      class="badge rounded-pill"
                      :class="{
                        'bg-success': getTimeIndicator(lead) === 'green',
                        'bg-warning': getTimeIndicator(lead) === 'yellow',
                        'bg-danger': getTimeIndicator(lead) === 'red'
                      }"
                      :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                    >
                      <i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i>
                    </span>
                  </div>
                  <div class="lead-actions-mini">
                    <!-- Move to Waitlist (click "in contacto" logo) -->
                    <button
                      class="btn btn-sm btn-info btn-action-mini"
                      @click.stop="moveLead(lead, PIPELINE_STAGES.WAITLIST)"
                      :title="$t('leadPipeline.moveToWaitlist') || 'Move to Waitlist'"
                    >
                      <i class="bi bi-pause-circle"></i>
                    </button>
                    <!-- Move to In Deal (click "interessado") -->
                    <button
                      class="btn btn-sm btn-success btn-action-mini"
                      @click.stop="moveLead(lead, PIPELINE_STAGES.IN_DEAL)"
                      :title="$t('leadPipeline.interested') || 'Interested - Move to Deal'"
                    >
                      <i class="bi bi-hand-thumbs-up"></i>
                    </button>
                    <!-- Reject - Move to CLOSED with REJECTED status -->
                    <button
                      class="btn btn-sm btn-danger btn-action-mini"
                      @click.stop="moveLead(lead, PIPELINE_STAGES.CLOSED, LEAD_STATUS.REJECTED)"
                      :title="$t('leadPipeline.reject') || 'Reject'"
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
                        'bg-info': lead.source === 'contact-form' || lead.source === 'exit-intent',
                        'bg-secondary': lead.source === 'manual',
                      }"
                      :title="lead.source === 'manual' ? $t('leadPipeline.source.manual') : $t('leadPipeline.source.publicSite')"
                    >
                      <i :class="lead.source === 'manual' ? 'bi bi-person-plus' : 'bi bi-globe'"></i>
                    </span>
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
                </div>
                <div class="lead-card-accent"></div>
              </div>
              <div v-if="leads.IN_CONTACT.length === 0" class="empty-state">
                <Message
                  :icon="'bi-chat-dots'"
                  :title="$t('leadPipeline.noLeads') || 'No leads in contact'"
                  :content="$t('leadPipeline.noLeadsDesc') || 'No leads in this stage'"
                />
              </div>
            </div>
          </div>

          <!-- WAITLIST Leads Column -->
          <div class="pipeline-column">
            <div class="pipeline-header">
              <h5>
                <i class="bi bi-pause-circle-fill"></i>
                {{ $t('leadPipeline.waitlist') || 'Waitlist' }}
                <span class="badge bg-info">{{ leads.WAITLIST.length }}</span>
              </h5>
            </div>
            <div class="pipeline-body">
              <div
                v-for="lead in leads.WAITLIST"
                :key="lead.id"
                class="modern-lead-card metric-type-info"
                @click="openLeadDetails(lead)"
              >
                <div class="lead-card-header">
                  <div class="lead-icon-container icon-info">
                    <i class="bi bi-pause-circle-fill"></i>
                  </div>
                  <div class="lead-title-section">
                    <span class="lead-name-text">{{ lead.name }}</span>
                    <span class="lead-date-text">{{ formatDate(lead.updatedAt || lead.createdAt) }}</span>
                  </div>
                  <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                    <span
                      class="badge rounded-pill"
                      :class="{
                        'bg-success': getTimeIndicator(lead) === 'green',
                        'bg-warning': getTimeIndicator(lead) === 'yellow',
                        'bg-danger': getTimeIndicator(lead) === 'red'
                      }"
                      :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                    >
                      <i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i>
                    </span>
                  </div>
                  <div class="lead-actions-mini">
                    <!-- Move back to IN_CONTACT (can be contacted again) -->
                    <button
                      class="btn btn-sm btn-warning btn-action-mini"
                      @click.stop="moveLead(lead, PIPELINE_STAGES.IN_CONTACT)"
                      :title="$t('leadPipeline.moveToContact') || 'Move to Contact'"
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
                  <div class="lead-info-row" v-if="lead.phone">
                    <div class="lead-info-item">
                      <i class="bi bi-telephone"></i>
                      <span class="lead-info-text">{{ lead.phone }}</span>
                    </div>
                  </div>
                </div>
                <div class="lead-card-accent"></div>
              </div>
              <div v-if="leads.WAITLIST.length === 0" class="empty-state">
                <Message
                  :icon="'bi-pause-circle'"
                  :title="$t('leadPipeline.noLeads') || 'No leads in waitlist'"
                  :content="$t('leadPipeline.noLeadsDesc') || 'No leads in this stage'"
                />
              </div>
            </div>
          </div>

          <!-- IN_DEAL Leads Column -->
          <div class="pipeline-column">
            <div class="pipeline-header">
              <h5>
                <i class="bi bi-hand-thumbs-up-fill"></i>
                {{ $t('leadPipeline.inDeal') || 'In Deal' }}
                <span class="badge bg-success">{{ leads.IN_DEAL.length }}</span>
              </h5>
            </div>
            <div class="pipeline-body">
              <div
                v-for="lead in leads.IN_DEAL"
                :key="lead.id"
                class="modern-lead-card metric-type-success"
                @click="openLeadDetails(lead)"
              >
                <div class="lead-card-header">
                  <div class="lead-icon-container icon-success">
                    <i class="bi bi-hand-thumbs-up-fill"></i>
                  </div>
                  <div class="lead-title-section">
                    <span class="lead-name-text">{{ lead.name }}</span>
                    <span class="lead-date-text">{{ formatDate(lead.updatedAt || lead.createdAt) }}</span>
                  </div>
                  <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                    <span
                      class="badge rounded-pill"
                      :class="{
                        'bg-success': getTimeIndicator(lead) === 'green',
                        'bg-warning': getTimeIndicator(lead) === 'yellow',
                        'bg-danger': getTimeIndicator(lead) === 'red'
                      }"
                      :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                    >
                      <i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i>
                    </span>
                  </div>
                  <div class="lead-actions-mini">
                    <!-- Move to Waitlist -->
                    <button
                      class="btn btn-sm btn-info btn-action-mini"
                      @click.stop="moveLead(lead, PIPELINE_STAGES.WAITLIST)"
                      :title="$t('leadPipeline.moveToWaitlist') || 'Move to Waitlist'"
                    >
                      <i class="bi bi-pause-circle"></i>
                    </button>
                    <!-- Successful Sale - Move to CLOSED with SUCCESS status -->
                    <button
                      class="btn btn-sm btn-success btn-action-mini"
                      @click.stop="moveLead(lead, PIPELINE_STAGES.CLOSED, LEAD_STATUS.SUCCESS)"
                      :title="$t('leadPipeline.successfulSale') || 'Successful Sale'"
                    >
                      <i class="bi bi-check-circle"></i>
                    </button>
                    <!-- Reject - Move to CLOSED with REJECTED status -->
                    <button
                      class="btn btn-sm btn-danger btn-action-mini"
                      @click.stop="moveLead(lead, PIPELINE_STAGES.CLOSED, LEAD_STATUS.REJECTED)"
                      :title="$t('leadPipeline.reject') || 'Reject'"
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
                  <div class="lead-info-row" v-if="lead.phone">
                    <div class="lead-info-item">
                      <i class="bi bi-telephone"></i>
                      <span class="lead-info-text">{{ lead.phone }}</span>
                    </div>
                  </div>
                </div>
                <div class="lead-card-accent"></div>
              </div>
              <div v-if="leads.IN_DEAL.length === 0" class="empty-state">
                <Message
                  :icon="'bi-hand-thumbs-up'"
                  :title="$t('leadPipeline.noLeads') || 'No leads in deal'"
                  :content="$t('leadPipeline.noLeadsDesc') || 'No leads in this stage'"
                />
              </div>
            </div>
          </div>

          <!-- CLOSED Leads Column -->
          <div class="pipeline-column">
            <div class="pipeline-header">
              <h5>
                <i class="bi bi-check-circle-fill"></i>
                {{ $t('leadPipeline.closed') || 'Closed' }}
                <span class="badge bg-secondary">{{ leads.CLOSED.length }}</span>
              </h5>
            </div>
            <div class="pipeline-body">
              <div
                v-for="lead in leads.CLOSED"
                :key="lead.id"
                class="modern-lead-card"
                :class="{
                  'metric-type-success': lead.status === LEAD_STATUS.INTERESTED || lead.status === LEAD_STATUS.SUCCESS,
                  'metric-type-error': lead.status === LEAD_STATUS.REJECTED,
                  'metric-type-warning': lead.status === LEAD_STATUS.MAYBE_LATER,
                }"
                @click="openLeadDetails(lead)"
              >
                <div class="lead-card-header">
                  <div
                    class="lead-icon-container"
                    :class="{
                      'icon-success': lead.status === LEAD_STATUS.INTERESTED || lead.status === LEAD_STATUS.SUCCESS,
                      'icon-error': lead.status === LEAD_STATUS.REJECTED,
                      'icon-warning': lead.status === LEAD_STATUS.MAYBE_LATER,
                    }"
                  >
                    <i
                      :class="{
                        'bi bi-check-circle-fill': lead.status === LEAD_STATUS.INTERESTED || lead.status === LEAD_STATUS.SUCCESS,
                        'bi bi-x-circle-fill': lead.status === LEAD_STATUS.REJECTED,
                        'bi bi-clock-fill': lead.status === LEAD_STATUS.MAYBE_LATER,
                      }"
                    ></i>
                  </div>
                  <div class="lead-title-section">
                    <span class="lead-name-text">{{ lead.name }}</span>
                    <span class="lead-date-text">{{ formatDate(lead.createdAt) }}</span>
                  </div>
                  <div class="lead-status-badge-container">
                    <span
                      class="badge lead-status-badge"
                      :class="{
                        'bg-success': lead.status === LEAD_STATUS.INTERESTED || lead.status === LEAD_STATUS.SUCCESS,
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
                        'bg-info': lead.source === 'contact-form' || lead.source === 'exit-intent',
                        'bg-secondary': lead.source === 'manual',
                      }"
                      :title="lead.source === 'manual' ? $t('leadPipeline.source.manual') : $t('leadPipeline.source.publicSite')"
                    >
                      <i :class="lead.source === 'manual' ? 'bi bi-person-plus' : 'bi bi-globe'"></i>
                    </span>
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
                </div>
                <div class="lead-card-accent"></div>
              </div>
              <div v-if="leads.CLOSED.length === 0" class="empty-state">
                <Message
                  :icon="'bi-check-circle'"
                  :title="$t('leadPipeline.noLeads') || 'No closed leads'"
                  :content="$t('leadPipeline.noLeadsDesc') || 'No leads in this stage'"
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

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
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
              :title="$t('leadPipeline.title')"
              :toggles="toggles"
              component-name="leadPipeline"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>

        <!-- Filters and Export Section -->
        <div class="control-box mb-4 text-center">
          <div class="row my-2 justify-content-center">
            <div class="col-6 col-md-3">
              <input
                id="filterFromDateDesktop"
                class="form-control metric-controls"
                type="date"
                v-model="dateFilterFrom"
                @change="loadLeads(true)"
                :placeholder="$t('leadPipeline.filterFromDate') || 'Data De'"
              />
            </div>
            <div class="col-6 col-md-3">
              <input
                id="filterToDateDesktop"
                class="form-control metric-controls"
                type="date"
                v-model="dateFilterTo"
                @change="loadLeads(true)"
                :placeholder="$t('leadPipeline.filterToDate') || 'Data Até'"
              />
            </div>
            <div class="col-6 col-md-3">
              <button
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2 w-100"
                @click="resetDateFilters"
                :disabled="loading"
              >
                <i class="bi bi-eraser-fill me-1"></i>{{ $t('leadPipeline.clearFilter') || 'Limpar Filtro' }}
              </button>
            </div>
          </div>

          <!-- Status Filters -->
          <div class="row my-2">
            <div class="col-12">
              <label class="form-label small fw-bold mb-2">{{ $t('leadPipeline.filterByStatus') || 'Filtrar por Status' }}</label>
              <div class="d-flex flex-wrap gap-2 justify-content-center">
              <button
                  v-for="status in Object.values(LEAD_STATUS)"
                  :key="status"
                  class="btn btn-sm rounded-pill"
                  :class="statusFilter.includes(status) ? 'btn-primary' : 'btn-outline-primary'"
                  @click="toggleStatusFilter(status)"
                >
                  {{ getStatusLabel(status) }}
              </button>
              </div>
            </div>
          </div>

          <!-- Time Indicator Filters -->
          <div class="row my-2">
            <div class="col-12">
              <label class="form-label small fw-bold mb-2">{{ $t('leadPipeline.filterByTime') || 'Filtrar por Tempo desde Criação' }}</label>
              <div class="d-flex flex-wrap gap-2 justify-content-center">
                <button
                  class="btn btn-sm rounded-pill"
                  :class="timeIndicatorFilter.includes('green') ? 'btn-success' : 'btn-outline-success'"
                  @click="toggleTimeIndicatorFilter('green')"
                >
                  <i class="bi bi-circle-fill me-1" style="font-size: 0.6rem;"></i> {{ getTimeIndicatorLabel('green') }}
                </button>
                <button
                  class="btn btn-sm rounded-pill"
                  :class="timeIndicatorFilter.includes('yellow') ? 'btn-warning' : 'btn-outline-warning'"
                  @click="toggleTimeIndicatorFilter('yellow')"
                >
                  <i class="bi bi-circle-fill me-1" style="font-size: 0.6rem;"></i> {{ getTimeIndicatorLabel('yellow') }}
                </button>
                <button
                  class="btn btn-sm rounded-pill"
                  :class="timeIndicatorFilter.includes('red') ? 'btn-danger' : 'btn-outline-danger'"
                  @click="toggleTimeIndicatorFilter('red')"
                >
                  <i class="bi bi-circle-fill me-1" style="font-size: 0.6rem;"></i> {{ getTimeIndicatorLabel('red') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!loading" class="lead-pipeline-container">
          <!-- Add Lead Button and Export CSV -->
          <div class="row mb-3">
            <div class="col-12 d-flex gap-2">
              <button
                v-if="isMaster || toggles['leadPipeline.admin.add']"
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                @click="showAdd()"
              >
                <i class="bi bi-plus-circle me-1"></i>{{ $t('leadPipeline.addLead') }}
              </button>
              <button
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                @click="exportLeadsToCSV"
                :disabled="loading"
              >
                <i class="bi bi-download me-1"></i>{{ $t('leadPipeline.exportCSV') || 'Export to CSV' }}
              </button>
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

            <div class="pipeline-carousel-container" ref="pipelineContainerDesktop">
              <!-- NEW Leads Column -->
              <div class="pipeline-column">
                <div class="pipeline-header">
                  <h5>
                    <i class="bi bi-inbox-fill"></i> {{ $t('leadPipeline.newLeads') }}
                    <span class="badge bg-primary">{{ leads.NEW?.length || 0 }}</span>
                  </h5>
                </div>
                <div class="pipeline-body">
                  <div
                    v-for="lead in leads.NEW"
                    :key="lead.id"
                    class="modern-lead-card metric-type-primary"
                    @click="openLeadDetails(lead)"
                  >
                    <div class="lead-card-header">
                      <div class="lead-icon-container icon-primary">
                        <i class="bi bi-inbox-fill"></i>
                      </div>
                      <div class="lead-title-section">
                        <span class="lead-name-text">{{ lead.name }}</span>
                        <span class="lead-date-text">
                          <i class="bi bi-clock"></i>
                          {{ formatDate(lead.createdAt) }}
                        </span>
                      </div>
                      <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                        <span
                          class="badge rounded-pill"
                          :class="{
                            'bg-success': getTimeIndicator(lead) === 'green',
                            'bg-warning': getTimeIndicator(lead) === 'yellow',
                            'bg-danger': getTimeIndicator(lead) === 'red'
                          }"
                          :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                        >
                          <i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i>
                        </span>
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
                          class="badge lead-source-badge-mini bg-secondary"
                          :title="lead.source === 'publicSite' ? 'Sitio Público' : 'Manual'"
                        >
                          <i
                            :class="lead.source === 'publicSite' ? 'bi bi-globe' : 'bi bi-person-plus'"
                          ></i>
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
                  <div v-if="!leads.NEW || leads.NEW.length === 0" class="empty-state">
                    <Message
                      :icon="'bi-inbox'"
                      :title="$t('leadPipeline.noLeads') || 'No new leads'"
                      :content="$t('leadPipeline.noLeadsDesc') || 'No leads in this stage'"
                    />
                  </div>
                </div>
              </div>

              <!-- IN_CONTACT Leads Column -->
              <div class="pipeline-column">
                <div class="pipeline-header">
                  <h5>
                    <i class="bi bi-chat-dots-fill"></i> {{ $t('leadPipeline.inContact') }}
                    <span class="badge bg-warning">{{ leads.IN_CONTACT?.length || 0 }}</span>
                  </h5>
                </div>
                <div class="pipeline-body">
                  <div
                    v-for="lead in leads.IN_CONTACT"
                    :key="lead.id"
                    class="modern-lead-card metric-type-warning"
                    @click="openLeadDetails(lead)"
                  >
                    <div class="lead-card-header">
                      <div class="lead-icon-container icon-warning">
                        <i class="bi bi-chat-dots-fill"></i>
                      </div>
                      <div class="lead-title-section">
                        <span class="lead-name-text">{{ lead.name }}</span>
                        <span class="lead-date-text">
                          <i class="bi bi-clock"></i>
                          {{ lead.lastContactedAt ? formatDate(lead.lastContactedAt) : formatDate(lead.createdAt) }}
                        </span>
                      </div>
                      <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                        <span
                          class="badge rounded-pill"
                          :class="{
                            'bg-success': getTimeIndicator(lead) === 'green',
                            'bg-warning': getTimeIndicator(lead) === 'yellow',
                            'bg-danger': getTimeIndicator(lead) === 'red'
                          }"
                          :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                        >
                          <i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i>
                        </span>
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
                          @click.stop="moveLead(lead.id, PIPELINE_STAGES.IN_DEAL, LEAD_STATUS.INTERESTED)"
                        >
                          <i class="bi bi-hand-thumbs-up"></i>
                        </button>
                        <button
                          class="btn btn-sm btn-danger btn-action-mini"
                          title="Rejeitar"
                          @click.stop="moveLead(lead.id, PIPELINE_STAGES.CLOSED, LEAD_STATUS.REJECTED)"
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
                          class="badge lead-source-badge-mini bg-secondary"
                          :title="lead.source === 'publicSite' ? 'Sitio Público' : 'Manual'"
                        >
                          <i
                            :class="lead.source === 'publicSite' ? 'bi bi-globe' : 'bi bi-person-plus'"
                          ></i>
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
                  <div v-if="!leads.IN_CONTACT || leads.IN_CONTACT.length === 0" class="empty-state">
                    <Message
                      :icon="'bi-chat-dots'"
                      :title="$t('leadPipeline.noLeads') || 'No leads in contact'"
                      :content="$t('leadPipeline.noLeadsDesc') || 'No leads in this stage'"
                    />
                  </div>
                </div>
              </div>

              <!-- WAITLIST Leads Column -->
              <div class="pipeline-column">
                <div class="pipeline-header">
                  <h5>
                    <i class="bi bi-pause-circle-fill"></i> {{ $t('leadPipeline.waitlist') }}
                    <span class="badge bg-info">{{ leads.WAITLIST?.length || 0 }}</span>
                  </h5>
                </div>
                <div class="pipeline-body">
                  <div
                    v-for="lead in leads.WAITLIST"
                    :key="lead.id"
                    class="modern-lead-card metric-type-info"
                    @click="openLeadDetails(lead)"
                  >
                    <div class="lead-card-header">
                      <div class="lead-icon-container icon-info">
                        <i class="bi bi-pause-circle-fill"></i>
                      </div>
                      <div class="lead-title-section">
                        <span class="lead-name-text">{{ lead.name }}</span>
                        <span class="lead-date-text">
                          <i class="bi bi-clock"></i>
                          {{ lead.lastContactedAt ? formatDate(lead.lastContactedAt) : formatDate(lead.createdAt) }}
                        </span>
                      </div>
                      <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                        <span
                          class="badge rounded-pill"
                          :class="{
                            'bg-success': getTimeIndicator(lead) === 'green',
                            'bg-warning': getTimeIndicator(lead) === 'yellow',
                            'bg-danger': getTimeIndicator(lead) === 'red'
                          }"
                          :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                        >
                          <i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i>
                        </span>
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
                          class="badge lead-source-badge-mini bg-secondary"
                          :title="lead.source === 'publicSite' ? 'Sitio Público' : 'Manual'"
                        >
                          <i
                            :class="lead.source === 'publicSite' ? 'bi bi-globe' : 'bi bi-person-plus'"
                          ></i>
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
                  <div v-if="!leads.WAITLIST || leads.WAITLIST.length === 0" class="empty-state">
                    <Message
                      :icon="'bi-pause-circle'"
                      :title="$t('leadPipeline.noLeads') || 'No leads in waitlist'"
                      :content="$t('leadPipeline.noLeadsDesc') || 'No leads in this stage'"
                    />
                  </div>
                </div>
              </div>

              <!-- IN_DEAL Leads Column -->
              <div class="pipeline-column">
                <div class="pipeline-header">
                  <h5>
                    <i class="bi bi-hand-thumbs-up-fill"></i> {{ $t('leadPipeline.inDeal') }}
                    <span class="badge bg-success">{{ leads.IN_DEAL?.length || 0 }}</span>
                  </h5>
                </div>
                <div class="pipeline-body">
                  <div
                    v-for="lead in leads.IN_DEAL"
                    :key="lead.id"
                    class="modern-lead-card metric-type-success"
                    @click="openLeadDetails(lead)"
                  >
                    <div class="lead-card-header">
                      <div class="lead-icon-container icon-success">
                        <i class="bi bi-hand-thumbs-up-fill"></i>
                      </div>
                      <div class="lead-title-section">
                        <span class="lead-name-text">{{ lead.name }}</span>
                        <span class="lead-date-text">
                          <i class="bi bi-clock"></i>
                          {{ lead.lastContactedAt ? formatDate(lead.lastContactedAt) : formatDate(lead.createdAt) }}
                        </span>
                      </div>
                      <div class="lead-time-indicator" v-if="getTimeIndicator(lead)">
                        <span
                          class="badge rounded-pill"
                          :class="{
                            'bg-success': getTimeIndicator(lead) === 'green',
                            'bg-warning': getTimeIndicator(lead) === 'yellow',
                            'bg-danger': getTimeIndicator(lead) === 'red'
                          }"
                          :title="getTimeIndicatorLabel(getTimeIndicator(lead))"
                        >
                          <i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i>
                        </span>
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
                          @click.stop="moveLead(lead.id, PIPELINE_STAGES.CLOSED, LEAD_STATUS.SUCCESS)"
                        >
                          <i class="bi bi-check-circle"></i>
                        </button>
                        <button
                          class="btn btn-sm btn-danger btn-action-mini"
                          title="Rejeitar"
                          @click.stop="moveLead(lead.id, PIPELINE_STAGES.CLOSED, LEAD_STATUS.REJECTED)"
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
                          class="badge lead-source-badge-mini bg-secondary"
                          :title="lead.source === 'publicSite' ? 'Sitio Público' : 'Manual'"
                        >
                          <i
                            :class="lead.source === 'publicSite' ? 'bi bi-globe' : 'bi bi-person-plus'"
                          ></i>
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
                  <div v-if="!leads.IN_DEAL || leads.IN_DEAL.length === 0" class="empty-state">
                    <Message
                      :icon="'bi-hand-thumbs-up'"
                      :title="$t('leadPipeline.noLeads') || 'No leads in deal'"
                      :content="$t('leadPipeline.noLeadsDesc') || 'No leads in this stage'"
                    />
                  </div>
                </div>
              </div>

              <!-- CLOSED Leads Column -->
              <div class="pipeline-column">
                <div class="pipeline-header">
                  <h5>
                    <i class="bi bi-check-circle-fill"></i> {{ $t('leadPipeline.closed') }}
                    <span class="badge bg-secondary">{{ leads.CLOSED?.length || 0 }}</span>
                  </h5>
                </div>
                <div class="pipeline-body">
                  <div
                    v-for="lead in leads.CLOSED"
                    :key="lead.id"
                    :class="`modern-lead-card metric-type-${lead.status === LEAD_STATUS.SUCCESS ? 'success' : 'danger'}`"
                    @click="openLeadDetails(lead)"
                  >
                    <div class="lead-card-header">
                      <div
                        :class="`lead-icon-container icon-${lead.status === LEAD_STATUS.SUCCESS ? 'success' : 'danger'}`"
                      >
                        <i
                          :class="lead.status === LEAD_STATUS.SUCCESS ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'"
                        ></i>
                      </div>
                      <div class="lead-title-section">
                        <span class="lead-name-text">{{ lead.name }}</span>
                        <span class="lead-date-text">
                          <i class="bi bi-clock"></i>
                          {{ lead.lastContactedAt ? formatDate(lead.lastContactedAt) : formatDate(lead.createdAt) }}
                        </span>
                      </div>
                      <div class="lead-status-badge-container">
                        <span
                          class="badge lead-status-badge"
                          :class="{
                            'bg-success': lead.status === LEAD_STATUS.INTERESTED || lead.status === LEAD_STATUS.SUCCESS,
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
                          class="badge lead-source-badge-mini bg-secondary"
                          :title="lead.source === 'publicSite' ? 'Sitio Público' : 'Manual'"
                        >
                          <i
                            :class="lead.source === 'publicSite' ? 'bi bi-globe' : 'bi bi-person-plus'"
                          ></i>
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
                  <div v-if="!leads.CLOSED || leads.CLOSED.length === 0" class="empty-state">
                    <Message
                      :icon="'bi-check-circle'"
                      :title="$t('leadPipeline.noLeads') || 'No closed leads'"
                      :content="$t('leadPipeline.noLeadsDesc') || 'No leads in this stage'"
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
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-plus-lg"></i> {{ $t('add') }}
            </h5>
            <button
              id="close-modal"
              class="btn-close"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
              @click="resetAddForm"
            ></button>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="false" :stack="alertError"></Alert>
            <div
              id="add-lead-form"
              class="result-card mb-4"
            >
              <div class="form-fields-container">
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('leadPipeline.name') || 'Name' }}
                  </label>
                  <input
                    type="text"
                    class="form-control-modern"
                    :class="{ 'is-invalid': nameError }"
                    v-model="newLead.name"
                    :placeholder="$t('leadPipeline.namePlaceholder') || 'Enter lead name'"
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('leadPipeline.email') || 'Email' }}
                  </label>
                  <input
                    type="email"
                    class="form-control-modern"
                    :class="{ 'is-invalid': emailError }"
                    v-model="newLead.email"
                    :placeholder="$t('leadPipeline.emailPlaceholder') || 'Enter email address'"
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('leadPipeline.phone') || 'Phone' }}
                  </label>
                  <input
                    type="tel"
                    class="form-control-modern"
                    v-model="newLead.phone"
                    :placeholder="$t('leadPipeline.phonePlaceholder') || 'Enter phone number'"
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('leadPipeline.company') || 'Company' }}
                  </label>
                  <input
                    type="text"
                    class="form-control-modern"
                    v-model="newLead.company"
                    :placeholder="$t('leadPipeline.companyPlaceholder') || 'Enter company name'"
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('leadPipeline.message') || 'Message / Notes' }}
                  </label>
                  <textarea
                    class="form-control-modern"
                    v-model="newLead.message"
                    rows="3"
                    :placeholder="$t('leadPipeline.messagePlaceholder') || 'Enter any additional notes or message'"
                  ></textarea>
                </div>
                <div
                  class="row g-1 errors"
                  id="feedback"
                  v-if="errorsAdd && errorsAdd.length > 0"
                >
                  <Warning>
                    <template v-slot:message>
                      <li v-for="(error, index) in errorsAdd" :key="index">
                        {{ $t(error) }}
                      </li>
                    </template>
                  </Warning>
                </div>
              </div>
              <div class="col text-center mt-3">
                <button
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                  @click="createLead"
                  :disabled="loading"
                >
                  {{ $t('leadPipeline.createLead') || 'Create Lead' }}
                  <i class="bi bi-save"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              data-bs-dismiss="modal"
              aria-label="Close"
              @click="resetAddForm"
              >{{ $t('close') }} <i class="bi bi-check-lg"></i
            ></a>
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
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-person-circle"></i> {{ $t('leadPipeline.leadDetails') || 'Lead Details' }} - {{ selectedLead?.name }}
            </h5>
            <button
              class="btn-close"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
              @click="closeLeadDetails"
            ></button>
          </div>
          <div class="modal-body text-center mb-0" id="lead-details-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="false" :stack="alertError"></Alert>

            <!-- Tabs Navigation -->
            <ul class="nav nav-tabs nav-justified mb-4" role="tablist">
              <li class="nav-item" role="presentation">
                <button
                  class="nav-link"
                  :class="{ active: activeTab === 'info' }"
                  @click="activeTab = 'info'"
                  type="button"
                >
                  <i class="bi bi-person-circle me-2"></i>{{ $t('leadPipeline.leadInfo') || 'Lead Info' }}
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button
                  class="nav-link"
                  :class="{ active: activeTab === 'contacts' }"
                  @click="activeTab = 'contacts'"
                  type="button"
                >
                  <i class="bi bi-chat-left-text me-2"></i>{{ $t('leadPipeline.contacts') || 'Contacts' }}
                  <span v-if="selectedLead?.contacts?.length" class="badge bg-primary ms-2">{{ selectedLead.contacts.length }}</span>
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button
                  class="nav-link"
                  :class="{ active: activeTab === 'transitions' }"
                  @click="activeTab = 'transitions'"
                  type="button"
                >
                  <i class="bi bi-clock-history me-2"></i>{{ $t('leadPipeline.transitions') || 'Pipeline History' }}
                  <span v-if="leadTransitions.length" class="badge bg-info ms-2">{{ leadTransitions.length }}</span>
                </button>
              </li>
            </ul>

            <!-- Tab Content -->
            <div class="tab-content">
              <!-- Lead Information Tab -->
              <div v-show="activeTab === 'info'" class="tab-pane fade" :class="{ 'show active': activeTab === 'info' }">
                <div v-if="selectedLead" class="result-card mb-4">
                  <!-- Lead Information -->
                  <div class="form-fields-container">
                    <div class="form-group-modern">
                      <label class="form-label-modern">{{ $t('leadPipeline.email') || 'Email' }}</label>
                      <div class="form-control-modern form-control-readonly">
                        <a :href="`mailto:${selectedLead.email}`" class="contact-link">
                          <i class="bi bi-envelope me-2"></i>{{ selectedLead.email }}
                        </a>
                      </div>
                    </div>
                    <div class="form-group-modern" v-if="selectedLead.phone">
                      <label class="form-label-modern">{{ $t('leadPipeline.phone') || 'Phone' }}</label>
                      <div class="form-control-modern form-control-readonly">
                        <a :href="`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}`" target="_blank" class="contact-link">
                          <i class="bi bi-whatsapp me-2"></i>{{ selectedLead.phone }}
                        </a>
                      </div>
                    </div>
                    <div class="form-group-modern" v-if="selectedLead.company">
                      <label class="form-label-modern">{{ $t('leadPipeline.company') || 'Company' }}</label>
                      <div class="form-control-modern form-control-readonly">{{ selectedLead.company }}</div>
                    </div>
                    <div class="form-group-modern" v-if="selectedLead.source">
                      <label class="form-label-modern">{{ $t('leadPipeline.source.label') || 'Source' }}</label>
                      <div class="form-control-modern form-control-readonly">
                        <span
                          class="badge"
                          :class="{
                            'bg-info': selectedLead.source === 'contact-form' || selectedLead.source === 'exit-intent',
                            'bg-secondary': selectedLead.source === 'manual',
                          }"
                        >
                          {{
                            selectedLead.source === 'manual'
                              ? $t('leadPipeline.source.manual')
                              : $t('leadPipeline.source.publicSite')
                          }}
                        </span>
                      </div>
                    </div>
                    <div class="form-group-modern" v-if="selectedLead.message">
                      <label class="form-label-modern">{{ $t('leadPipeline.message') || 'Message' }}</label>
                      <div class="form-control-modern form-control-readonly" style="min-height: 60px; text-align: left; padding: 0.5rem;">
                        {{ selectedLead.message }}
                      </div>
                    </div>
                    <div class="form-group-modern" v-if="selectedLead.notes">
                      <label class="form-label-modern">{{ $t('leadPipeline.notes') || 'Notes' }}</label>
                      <div class="form-control-modern form-control-readonly" style="min-height: 60px; text-align: left; padding: 0.5rem;">
                        {{ selectedLead.notes }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Contacts Tab -->
              <div v-show="activeTab === 'contacts'" class="tab-pane fade" :class="{ 'show active': activeTab === 'contacts' }">
                <div class="result-card mb-4" style="padding-top: 1rem;">
                  <div class="d-flex justify-content-between align-items-center m-3">
                    <h6 class="fw-bold mb-0">
                      <i class="bi bi-chat-left-text"></i> {{ $t('leadPipeline.contactHistory') || 'Contact History' }}
                    </h6>
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                      @click="showAddContact = !showAddContact"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('leadPipeline.addContact') || 'Add Contact' }}
                    </button>
                  </div>

                  <!-- Add Contact Form -->
                  <div v-if="showAddContact" class="mb-3">
                    <div class="form-fields-container">
                      <div class="form-group-modern">
                        <label class="form-label-modern">{{ $t('leadPipeline.contactType') || 'Type' }}</label>
                        <select class="form-control-modern form-select-modern" v-model="newContact.type">
                          <option
                            v-for="(value, key) in CONTACT_TYPES"
                            :key="key"
                            :value="value"
                          >
                            {{ value }}
                          </option>
                        </select>
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">{{ $t('leadPipeline.contactResult') || 'Result' }}</label>
                        <select class="form-control-modern form-select-modern" v-model="newContact.result">
                          <option
                            v-for="(value, key) in CONTACT_RESULTS"
                            :key="key"
                            :value="value"
                          >
                            {{ value }}
                          </option>
                        </select>
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">{{ $t('leadPipeline.comment') || 'Comment' }}</label>
                        <textarea
                          class="form-control-modern"
                          v-model="newContact.comment"
                          rows="3"
                          :placeholder="$t('leadPipeline.commentPlaceholder') || 'Enter contact details...'"
                        ></textarea>
                      </div>
                      <div class="col text-center mt-2">
                        <button
                          type="button"
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click.stop="saveContact"
                          :disabled="loading"
                        >
                          <i class="bi bi-save"></i> {{ $t('leadPipeline.saveContact') || 'Save Contact' }}
                        </button>
                        <button
                          type="button"
                          class="btn btn-lg btn-size fw-bold btn-secondary rounded-pill mt-2 px-4 ms-2"
                          @click.stop="showAddContact = false"
                        >
                          <i class="bi bi-x-lg"></i> {{ $t('leadPipeline.cancel') }}
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
                          <small class="text-muted d-block">{{ formatDate(contact.createdAt) }}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-center py-3">
                    <Message
                      :icon="'bi-chat-left'"
                      :title="$t('leadPipeline.noContacts') || 'No contacts'"
                      :content="$t('leadPipeline.noContactsDesc') || 'No contacts recorded yet.'"
                    />
                  </div>
                </div>
              </div>

              <!-- Transitions Tab -->
              <div v-show="activeTab === 'transitions'" class="tab-pane fade" :class="{ 'show active': activeTab === 'transitions' }">
                <div class="result-card mb-4">
                  <h6 class="fw-bold mb-4">
                    <i class="bi bi-clock-history me-2"></i>{{ $t('leadPipeline.pipelineHistory') || 'Pipeline History' }}
                  </h6>

                  <!-- Timeline -->
                  <div v-if="leadTransitions.length > 0" class="timeline-container">
                    <div
                      v-for="transition in leadTransitions"
                      :key="transition.id"
                      class="timeline-item"
                    >
                      <div class="timeline-marker" :class="transition.isContact ? 'bg-info' : `bg-${getStageColor(transition.newStage || 'NEW')}`">
                        <i :class="transition.isContact ? 'bi bi-chat-left-text' : `bi ${getStageIcon(transition.newStage || 'NEW')}`"></i>
                      </div>
                      <div class="timeline-content">
                        <div class="timeline-header">
                          <div class="d-flex align-items-center gap-2 flex-wrap">
                            <span v-if="!transition.isContact" class="badge" :class="`bg-${getStageColor(transition.newStage || 'NEW')}`">
                              <i :class="`bi ${getStageIcon(transition.newStage || 'NEW')} me-1`"></i>
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
                              <i class="bi bi-star-fill me-1"></i>{{ $t('leadPipeline.created') || 'Created' }}
                            </span>
                          </div>
                          <div class="timeline-date">
                            <i class="bi bi-clock me-1"></i>{{ formatDateTime(transition.occurredOn || transition.createdAt) }}
                          </div>
                        </div>
                        <div v-if="transition.isContact" class="timeline-transition">
                          <small class="text-muted">
                            <i class="bi bi-chat-left-text me-1"></i>
                            <strong>{{ transition.contactType || 'CONTACT' }}</strong>
                            <span v-if="transition.status" class="ms-2">
                              - {{ getStatusLabel(transition.status) }}
                            </span>
                            <div v-if="transition.contactComment" class="mt-2 text-muted" style="font-size: 0.85rem;">
                              {{ transition.contactComment }}
                            </div>
                          </small>
                        </div>
                        <div v-else-if="transition.oldStage && !transition.isInitial" class="timeline-transition">
                          <small class="text-muted">
                            <i class="bi bi-arrow-right me-1"></i>
                            {{ $t('leadPipeline.movedFrom') || 'Moved from' }}
                            <strong>{{ getStageLabel(transition.oldStage) }}</strong>
                            {{ $t('leadPipeline.to') || 'to' }}
                            <strong>{{ getStageLabel(transition.newStage) }}</strong>
                          </small>
                        </div>
                        <div v-else-if="transition.isInitial" class="timeline-transition">
                          <small class="text-muted">
                            <i class="bi bi-plus-circle me-1"></i>
                            {{ $t('leadPipeline.created') || 'Lead created' }}
                            <strong>{{ getStageLabel(transition.newStage || 'NEW') }}</strong>
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-center py-4">
                    <Message
                      :icon="'bi-clock-history'"
                      :title="$t('leadPipeline.noTransitions') || 'No transitions'"
                      :content="$t('leadPipeline.noTransitionsDesc') || 'No pipeline transitions recorded yet.'"
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
              :title="$t('leadPipeline.archiveLead') || 'Archive Lead'"
            >
              <i class="bi bi-archive"></i> {{ $t('leadPipeline.archive') || 'Archive' }}
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
  </div>
</template>

<style scoped>
.lead-pipeline-container {
  padding: 1rem;
  position: relative;
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

/* Custom scrollbar for pipeline body */
.pipeline-body::-webkit-scrollbar {
  width: 6px;
}

.pipeline-body::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.pipeline-body::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.pipeline-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
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
  cursor: pointer;
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
  gap: 0.4rem;
}

.lead-info-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
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
  background: linear-gradient(180deg, var(--azul-turno) 0%, rgba(0, 74, 173, 0.3) 50%, transparent 100%);
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
  display: flex;
  align-items: center;
  margin-left: 0.5rem;
}

.lead-time-indicator .badge {
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
}
</style>

