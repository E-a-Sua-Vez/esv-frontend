<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import {
  getConsentRequirements,
  createConsentRequirement,
  updateConsentRequirement,
  getRequirementVersions,
  deleteConsentRequirement,
} from '../../application/services/consent';

import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import Toggle from '@vueform/toggle';
import ConsentTypeMultiSelector from '../../components/lgpd/ConsentTypeMultiSelector.vue';
import ConsentTemplateSelector from '../../components/lgpd/ConsentTemplateSelector.vue';
import MarkdownEditor from '../../components/lgpd/MarkdownEditor.vue';
import { getTemplateByType } from '../../data/consent-templates';

export default {
  name: 'BusinessLgpdConsentAdmin',
  inheritAttrs: false,
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ComponentMenu,
    DesktopPageHeader,
    SearchAdminItem,
    AreYouSure,
    Toggle,
    ConsentTypeMultiSelector,
    ConsentTemplateSelector,
    MarkdownEditor,
  },

  setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');
    const confirmDeleteId = ref(null);

    // History and Preview modals
    const showHistoryModal = ref(false);
    const showPreviewModal = ref(false);
    const selectedRequirementId = ref(null);
    const requirementVersions = ref([]);
    const previewRequirement = ref(null);
    const previewChannel = ref('web');

    const state = reactive({
      currentUser: {},
      business: {},
      requirements: [],
      filtered: [],
      showAddModal: false,
      newRequirement: {
        consentType: '',
        required: true,
        blockingForAttention: false,
        requestStrategy: {
          timing: 'BOOKING',
          methods: ['WHATSAPP'],
          reminderIntervalHours: 24,
          maxReminders: 3,
        },
        templates: {
          whatsapp: '',
          formIntroText: '',
          fullTerms: '',
          dataDescription: '',
          legalBasis: '',
          retentionPeriod: '',
          privacyPolicyLink: '',
          revocationInstructions: '',
        },
        active: true,
      },
      expandedIndex: null,
      toggles: {},

      consentTypes: [
        'DATA_PROCESSING',
        'DATA_SHARING',
        'MARKETING',
        'RESEARCH',
        'THIRD_PARTY',
        'DATA_EXPORT',
        'TELEMEDICINE',
        'BIOMETRIC',
      ],
      timingOptions: [
        'BOOKING',
        'PRE_ATTENTION',
        'CHECK_IN',
        'FIRST_ATTENTION',
        'ON_REGISTRATION',
        'ON_LOGIN',
        'PERIODIC_RENEWAL',
        'BEFORE_SERVICE',
        'AFTER_ATTENTION',
      ],
      methodOptions: ['EMAIL', 'WHATSAPP', 'WEB_FORM', 'PRESENTIAL', 'SMS', 'IN_APP', 'QR_CODE'],
      selectedConsentTypes: [],
      creatingBatch: false,
      batchProgress: { current: 0, total: 0 },
    });

    const commerce = computed(() => store.getCurrentCommerce);
    const isActiveBusiness = computed(() => state.business?.active === true);

    // Helper function to ensure requirement has proper structure
    // Returns a new object to avoid reactive mutations during render
    const ensureRequirementStructure = req => {
      try {
        if (!req || typeof req !== 'object') return null;

        // Safely extract basic properties without spreading (to avoid Proxy issues)
        const safeReq = {
          id: req.id,
          consentType: req.consentType,
          required: req.required,
          blockingForAttention: req.blockingForAttention,
          active: req.active,
          requestStrategy: req.requestStrategy,
          templates: req.templates,
        };

        // Create a new object with basic properties
        const result = {
          id: safeReq.id,
          consentType: safeReq.consentType || '',
          required: safeReq.required !== undefined ? safeReq.required : true,
          blockingForAttention: safeReq.blockingForAttention || false,
          active: safeReq.active !== undefined ? safeReq.active : true,
        };

        // Ensure requestStrategy exists and has proper structure
        if (!safeReq.requestStrategy || typeof safeReq.requestStrategy !== 'object') {
          result.requestStrategy = {
            timing: 'BOOKING',
            methods: [],
            reminderIntervalHours: 24,
            maxReminders: 3,
          };
        } else {
          try {
            result.requestStrategy = {
              timing: safeReq.requestStrategy.timing || 'BOOKING',
              methods: Array.isArray(safeReq.requestStrategy.methods)
                ? [...safeReq.requestStrategy.methods]
                : [],
              reminderIntervalHours: safeReq.requestStrategy.reminderIntervalHours ?? 24,
              maxReminders: safeReq.requestStrategy.maxReminders ?? 3,
            };
          } catch (e) {
            // If accessing requestStrategy properties fails, use defaults
            result.requestStrategy = {
              timing: 'BOOKING',
              methods: [],
              reminderIntervalHours: 24,
              maxReminders: 3,
            };
          }
        }

        // Ensure templates exists and has all required fields
        if (!safeReq.templates || typeof safeReq.templates !== 'object') {
          result.templates = {
            whatsapp: '',
            formIntroText: '',
            fullTerms: '',
            dataDescription: '',
            legalBasis: '',
            retentionPeriod: '',
            privacyPolicyLink: '',
            revocationInstructions: '',
          };
        } else {
          try {
            result.templates = {
              whatsapp: safeReq.templates.whatsapp || '',
              formIntroText: safeReq.templates.formIntroText || '',
              fullTerms: safeReq.templates.fullTerms || '',
              dataDescription: safeReq.templates.dataDescription || '',
              legalBasis: safeReq.templates.legalBasis || '',
              retentionPeriod: safeReq.templates.retentionPeriod || '',
              privacyPolicyLink: safeReq.templates.privacyPolicyLink || '',
              revocationInstructions: safeReq.templates.revocationInstructions || '',
            };
          } catch (e) {
            // If accessing templates properties fails, use defaults
            result.templates = {
              whatsapp: '',
              formIntroText: '',
              fullTerms: '',
              dataDescription: '',
              legalBasis: '',
              retentionPeriod: '',
              privacyPolicyLink: '',
              revocationInstructions: '',
            };
          }
        }

        return result;
      } catch (error) {
        console.error('Error in ensureRequirementStructure:', error, req);
        return null;
      }
    };

    const loadRequirements = async commerceId => {
      if (!commerceId) {
        state.requirements = [];
        state.filtered = [];
        return;
      }
      try {
        loading.value = true;
        const data = await getConsentRequirements(commerceId);
        const mappedRequirements = (data || []).map(r => ({
          ...r,
          requestStrategy: {
            timing: r.requestStrategy?.timing || 'BOOKING',
            methods: Array.isArray(r.requestStrategy?.methods) ? r.requestStrategy.methods : [],
            reminderIntervalHours: r.requestStrategy?.reminderIntervalHours ?? 24,
            maxReminders: r.requestStrategy?.maxReminders ?? 3,
          },
          templates: {
            whatsapp: r.templates?.whatsapp || '',
            formIntroText: r.templates?.formIntroText || '',
            fullTerms: r.templates?.fullTerms || '',
            dataDescription: r.templates?.dataDescription || '',
            legalBasis: r.templates?.legalBasis || '',
            retentionPeriod: r.templates?.retentionPeriod || '',
            privacyPolicyLink: r.templates?.privacyPolicyLink || '',
            revocationInstructions: r.templates?.revocationInstructions || '',
          },
        }));
        const processed = [];
        for (const req of mappedRequirements) {
          try {
            const processedReq = ensureRequirementStructure(req);
            if (processedReq) {
              processed.push(processedReq);
            }
          } catch (itemError) {
            console.error('Error processing requirement in loadRequirements:', itemError, req);
            // Continue processing other requirements
          }
        }
        state.requirements = processed;
        state.filtered = state.requirements;
        loading.value = false;
      } catch (error) {
        console.error('Error loading requirements:', error);
        state.requirements = [];
        state.filtered = [];
        loading.value = false;
      }
    };

    // Función helper para aplicar templates automáticamente
    const applyTemplate = consentType => {
      if (!consentType) return;
      const variables = {
        commerceName: commerce.value?.name || '',
        commerceAddress: commerce.value?.address || '',
        commercePhone: commerce.value?.phone || '',
        commerceEmail: commerce.value?.email || '',
        privacyPolicyLink: state.newRequirement.templates.privacyPolicyLink || '',
      };
      const template = getTemplateByType(consentType, variables);
      if (template) {
        // Preservar valores existentes que el usuario haya modificado manualmente
        // Solo actualizar campos que estén vacíos o que sean parte del template
        state.newRequirement.templates = {
          ...state.newRequirement.templates,
          ...template,
          // Preservar privacyPolicyLink si ya existe
          privacyPolicyLink:
            state.newRequirement.templates.privacyPolicyLink || template.privacyPolicyLink || '',
        };
      }
    };

    // Función helper para combinar múltiples templates
    const combineTemplates = consentTypes => {
      if (!consentTypes || consentTypes.length === 0) return;

      const variables = {
        commerceName: commerce.value?.name || '',
        commerceAddress: commerce.value?.address || '',
        commercePhone: commerce.value?.phone || '',
        commerceEmail: commerce.value?.email || '',
        privacyPolicyLink: state.newRequirement.templates.privacyPolicyLink || '',
      };

      // Combinar templates de todos los tipos seleccionados
      const combinedTemplate = {
        formIntroText: '',
        fullTerms: '',
        dataDescription: '',
        legalBasis: '',
        retentionPeriod: '',
        revocationInstructions: '',
        whatsapp: '',
        privacyPolicyLink: state.newRequirement.templates.privacyPolicyLink || '',
      };

      consentTypes.forEach((type, index) => {
        const template = getTemplateByType(type, variables);
        if (template) {
          // Combinar formIntroText con separadores
          if (template.formIntroText) {
            combinedTemplate.formIntroText +=
              (combinedTemplate.formIntroText ? '\n\n' : '') + template.formIntroText;
          }

          // Combinar fullTerms con separadores y encabezados
          if (template.fullTerms) {
            const separator = combinedTemplate.fullTerms ? '\n\n---\n\n' : '';
            combinedTemplate.fullTerms += separator + template.fullTerms;
          }

          // Combinar dataDescription
          if (template.dataDescription) {
            combinedTemplate.dataDescription +=
              (combinedTemplate.dataDescription ? '\n\n' : '') + template.dataDescription;
          }

          // Combinar legalBasis
          if (template.legalBasis) {
            combinedTemplate.legalBasis +=
              (combinedTemplate.legalBasis ? '\n\n' : '') + template.legalBasis;
          }

          // Combinar retentionPeriod
          if (template.retentionPeriod) {
            combinedTemplate.retentionPeriod +=
              (combinedTemplate.retentionPeriod ? '\n\n' : '') + template.retentionPeriod;
          }

          // Combinar revocationInstructions (solo una vez, son similares)
          if (template.revocationInstructions && !combinedTemplate.revocationInstructions) {
            combinedTemplate.revocationInstructions = template.revocationInstructions;
          }

          // Combinar whatsapp (usar el primero o combinar)
          if (template.whatsapp && !combinedTemplate.whatsapp) {
            combinedTemplate.whatsapp = template.whatsapp;
          }

          // Privacy policy link (usar el primero disponible)
          if (template.privacyPolicyLink && !combinedTemplate.privacyPolicyLink) {
            combinedTemplate.privacyPolicyLink = template.privacyPolicyLink;
          }
        }
      });

      // Aplicar template combinado
      state.newRequirement.templates = {
        ...state.newRequirement.templates,
        ...combinedTemplate,
      };
    };

    // Watch for changes in selectedConsentTypes to update consentType and apply templates
    watch(
      () => state.selectedConsentTypes,
      (newTypes, oldTypes) => {
        // Solo aplicar templates si hay cambios reales (evitar loops infinitos)
        const typesChanged = !oldTypes || JSON.stringify(newTypes) !== JSON.stringify(oldTypes);

        if (newTypes.length === 1) {
          // Si hay un solo tipo seleccionado, actualizar consentType y aplicar template
          state.newRequirement.consentType = newTypes[0];
          if (typesChanged) {
            // Aplicar template automáticamente
            applyTemplate(newTypes[0]);
          }
        } else if (newTypes.length > 1) {
          // Si hay múltiples tipos, combinar templates de todos los tipos seleccionados
          const firstType = newTypes[0];
          state.newRequirement.consentType = firstType;
          if (typesChanged) {
            // Combinar templates de todos los tipos seleccionados
            combineTemplates(newTypes);
          }
        } else if (newTypes.length === 0) {
          // Si no hay tipos seleccionados, limpiar consentType
          state.newRequirement.consentType = '';
        }
      },
      { immediate: true },
    );

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('lgpd', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Load requirements for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadRequirements(commerceToUse.id);
        }

        alertError.value = '';
      } catch (error) {
        console.error('Error in onBeforeMount:', error);
        alertError.value = error.response?.status || error.status || 500;
      } finally {
        loading.value = false;
      }
    });

    const toggleMethod = (req, method) => {
      if (!req) return;
      if (!req.requestStrategy) {
        req.requestStrategy = {
          timing: 'BOOKING',
          methods: [],
          reminderIntervalHours: 24,
          maxReminders: 3,
        };
      }
      if (!Array.isArray(req.requestStrategy.methods)) {
        req.requestStrategy.methods = [];
      }
      const list = req.requestStrategy.methods;
      const i = list.indexOf(method);
      i >= 0 ? list.splice(i, 1) : list.push(method);
    };

    const openAddModal = () => {
      state.showAddModal = true;
      state.newRequirement = {
        consentType: '',
        required: true,
        blockingForAttention: false,
        requestStrategy: {
          timing: 'BOOKING',
          methods: ['WHATSAPP'],
          reminderIntervalHours: 24,
          maxReminders: 3,
        },
        templates: {
          whatsapp: '',
          formIntroText: '',
          fullTerms: '',
          dataDescription: '',
          legalBasis: '',
          retentionPeriod: '',
          privacyPolicyLink: '',
          revocationInstructions: '',
        },
        active: true,
      };
    };

    const toggleExpand = index => {
      state.expandedIndex = state.expandedIndex === index ? null : index;
    };

    const add = async () => {
      // Si hay múltiples tipos seleccionados, crear en lote
      if (state.selectedConsentTypes.length > 1) {
        await addBatch();
        return;
      }

      // Si hay un solo tipo seleccionado, usar ese
      if (state.selectedConsentTypes.length === 1) {
        state.newRequirement.consentType = state.selectedConsentTypes[0];
      }

      // Validación
      if (!state.newRequirement.consentType) {
        alertError.value = 'lgpd.consent.admin.validate.consentType';
        return;
      }

      if (!state.newRequirement.requestStrategy.timing) {
        alertError.value = 'lgpd.consent.admin.validate.timing';
        return;
      }

      if (
        !state.newRequirement.requestStrategy.methods ||
        state.newRequirement.requestStrategy.methods.length === 0
      ) {
        alertError.value = 'lgpd.consent.admin.validate.methods';
        return;
      }

      try {
        loading.value = true;
        await createConsentRequirement(commerce.value.id, state.newRequirement);
        await loadRequirements(commerce.value.id);
        state.showAddModal = false;
        state.selectedConsentTypes = [];
        alertError.value = '';
      } catch (error) {
        console.error('Error creating requirement:', error);
        alertError.value = error.response?.status || 500;
      } finally {
        loading.value = false;
      }
    };

    const addBatch = async () => {
      if (state.selectedConsentTypes.length === 0) {
        alertError.value = 'lgpd.consent.admin.validate.consentTypes';
        return;
      }

      try {
        state.creatingBatch = true;
        state.batchProgress = { current: 0, total: state.selectedConsentTypes.length };
        loading.value = true;

        const baseRequirement = { ...state.newRequirement };
        const variables = {
          commerceName: commerce.value?.name || '',
          commerceAddress: commerce.value?.address || '',
          commercePhone: commerce.value?.phone || '',
          commerceEmail: commerce.value?.email || '',
          privacyPolicyLink: baseRequirement.templates.privacyPolicyLink || '',
        };

        for (const consentType of state.selectedConsentTypes) {
          // Aplicar template si existe
          const template = getTemplateByType(consentType, variables);
          const requirement = {
            ...baseRequirement,
            consentType,
            templates: template
              ? {
                  ...baseRequirement.templates,
                  ...template,
                }
              : baseRequirement.templates,
          };

          await createConsentRequirement(commerce.value.id, requirement);
          state.batchProgress.current++;
        }

        await loadRequirements(commerce.value.id);
        state.showAddModal = false;
        state.selectedConsentTypes = [];
        alertError.value = '';
      } catch (error) {
        console.error('Error creating batch requirements:', error);
        alertError.value = error.response?.status || 500;
      } finally {
        state.creatingBatch = false;
        state.batchProgress = { current: 0, total: 0 };
        loading.value = false;
      }
    };

    const update = async req => {
      loading.value = true;
      await updateConsentRequirement(req.id, { requirement: req });
      await loadRequirements(commerce.value.id);
      state.expandedIndex = null;
      loading.value = false;
    };

    const askDelete = id => {
      confirmDeleteId.value = id;
    };

    const cancelDelete = () => {
      confirmDeleteId.value = null;
    };

    const confirmDelete = async () => {
      loading.value = true;
      await deleteConsentRequirement(confirmDeleteId.value);
      await loadRequirements(commerce.value.id);
      confirmDeleteId.value = null;
      loading.value = false;
    };

    return {
      state,
      commerce,
      loading,
      alertError,
      isActiveBusiness,
      openAddModal,
      toggleExpand,
      toggleMethod,
      add,
      addBatch,
      update,
      askDelete,
      applyTemplate,
      applyPreset: presetKey => {
        // Esta función será llamada cuando se seleccione un preset
        // Los presets se manejarán en el componente padre
      },
      cancelDelete,
      confirmDelete,
      receiveFilteredItems: items => {
        try {
          if (!Array.isArray(items)) {
            state.filtered = [];
            return;
          }
          const processed = [];
          for (const item of items) {
            try {
              const processedItem = ensureRequirementStructure(item);
              if (processedItem) {
                processed.push(processedItem);
              }
            } catch (itemError) {
              console.error(
                'Error processing individual item in receiveFilteredItems:',
                itemError,
                item,
              );
              // Continue processing other items
            }
          }
          state.filtered = processed;
        } catch (error) {
          console.error('Error in receiveFilteredItems:', error);
          state.filtered = [];
        }
      },
      goBack: () => router.back(),
      getConsentTypeLabel: t => `lgpd.consent.types.${t}`,
      getTimingLabel: t => `lgpd.consent.admin.timingOptions.${t}`,
      confirmDeleteId,
      showHistoryModal,
      showPreviewModal,
      selectedRequirementId,
      requirementVersions,
      previewRequirement,
      previewChannel,
      showHistory: async requirementId => {
        try {
          selectedRequirementId.value = requirementId;
          requirementVersions.value = await getRequirementVersions(requirementId);
          showHistoryModal.value = true;
        } catch (error) {
          console.error('Error loading history:', error);
          alertError.value = 'lgpd.consent.admin.historyError';
        }
      },
      showPreview: requirement => {
        previewRequirement.value = requirement;
        previewChannel.value = 'web';
        showPreviewModal.value = true;
      },
      closeHistoryModal: () => {
        showHistoryModal.value = false;
        selectedRequirementId.value = null;
        requirementVersions.value = [];
      },
      closePreviewModal: () => {
        showPreviewModal.value = false;
        previewRequirement.value = null;
      },
      formatMarkdown: text => {
        if (!text) return '';
        // Simple markdown to HTML converter (similar to MarkdownEditor)
        let html = text;
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>');
        html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
        html = html.replace(/\n/gim, '<br>');
        return html;
      },
    };
  },
};
</script>

<template>
  <div v-bind="$attrs">
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo
          :src="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t('lgpd.consent.admin.title')"
          :toggles="state.toggles"
          component-name="businessLgpdConsentAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessLgpdConsentAdmin">
          <div v-if="isActiveBusiness && state.toggles['lgpd.admin.view']">
            <div class="control-box my-4"></div>
            <div v-if="!loading" id="businessLgpdConsentAdmin-result" class="mt-4">
              <div>
                <div v-if="state.requirements.length === 0">
                  <Message
                    :title="$t('lgpd.consent.admin.message.noRequirements.title')"
                    :content="$t('lgpd.consent.admin.message.noRequirements.content')"
                  />
                </div>
                <div v-if="commerce && commerce.id" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                      @click="openAddModal()"
                      data-bs-toggle="modal"
                      data-bs-target="#add-lgpd-requirement"
                      :disabled="!state.toggles['lgpd.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.requirements"
                    :type="'lgpd-requirements'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div
                    v-for="(requirement, index) in state.filtered"
                    :key="index"
                    class="result-card"
                  >
                    <div class="row">
                      <div class="col-10">
                        <div class="d-flex align-items-center">
                          <span class="badge bg-primary me-2">
                            {{ $t(getConsentTypeLabel(requirement.consentType)) }}
                          </span>
                          <span
                            :class="requirement.active ? 'badge bg-success' : 'badge bg-secondary'"
                          >
                            {{ requirement.active ? $t('active') : $t('inactive') }}
                          </span>
                        </div>
                      </div>
                      <div class="col-2">
                        <a href="#" @click.prevent="toggleExpand(index)">
                          <i
                            :id="index"
                            :class="`bi ${
                              state.expandedIndex === index ? 'bi-chevron-up' : 'bi-chevron-down'
                            }`"
                          ></i>
                        </a>
                      </div>
                    </div>
                    <div
                      v-if="state.toggles['lgpd.admin.read']"
                      :class="{ show: state.expandedIndex === index }"
                      class="detailed-data transition-slow"
                    >
                      <div class="form-fields-container">
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.consentType') }} *
                          </label>
                          <select
                            v-model="requirement.consentType"
                            class="form-control-modern form-select-modern"
                            :disabled="!state.toggles['lgpd.admin.update']"
                          >
                            <option value="">{{ $t('lgpd.consent.admin.selectType') }}</option>
                            <option v-for="type in state.consentTypes" :key="type" :value="type">
                              {{ $t(getConsentTypeLabel(type)) }}
                            </option>
                          </select>
                        </div>

                        <div class="form-group-modern form-group-toggle">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.required') }}
                          </label>
                          <Toggle
                            v-model="requirement.required"
                            :disabled="!state.toggles['lgpd.admin.update']"
                          />
                        </div>

                        <div class="form-group-modern form-group-toggle">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.blockingForAttention') }}
                          </label>
                          <Toggle
                            v-model="requirement.blockingForAttention"
                            :disabled="!state.toggles['lgpd.admin.update']"
                          />
                        </div>

                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.timing') }} *
                          </label>
                          <select
                            v-model="requirement.requestStrategy.timing"
                            class="form-control-modern form-select-modern"
                            :disabled="!state.toggles['lgpd.admin.update']"
                          >
                            <option
                              v-for="timing in state.timingOptions"
                              :key="timing"
                              :value="timing"
                            >
                              {{ $t(getTimingLabel(timing)) }}
                            </option>
                          </select>
                        </div>

                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.methods') }} *
                          </label>
                          <div class="d-flex flex-wrap gap-2" style="flex: 1">
                            <div
                              v-for="method in state.methodOptions"
                              :key="method"
                              class="form-check"
                            >
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :checked="
                                  requirement.requestStrategy?.methods?.includes(method) || false
                                "
                                @change="toggleMethod(requirement, method)"
                                :disabled="!state.toggles['lgpd.admin.update']"
                                :id="`method-${index}-${method}`"
                              />
                              <label class="form-check-label" :for="`method-${index}-${method}`">
                                {{ $t(`lgpd.consent.admin.method.${method}`) }}
                              </label>
                            </div>
                          </div>
                        </div>

                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.reminderIntervalHours') }}
                          </label>
                          <input
                            type="number"
                            class="form-control-modern"
                            v-model.number="requirement.requestStrategy.reminderIntervalHours"
                            :disabled="!state.toggles['lgpd.admin.update']"
                            min="1"
                            placeholder=""
                          />
                        </div>

                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.maxReminders') }}
                          </label>
                          <input
                            type="number"
                            class="form-control-modern"
                            v-model.number="requirement.requestStrategy.maxReminders"
                            :disabled="!state.toggles['lgpd.admin.update']"
                            min="0"
                            placeholder=""
                          />
                        </div>

                        <div class="form-group-modern form-group-textarea">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.whatsappTemplate') }}
                          </label>
                          <textarea
                            class="form-control-modern"
                            v-model="requirement.templates.whatsapp"
                            :disabled="!state.toggles['lgpd.admin.update']"
                            rows="3"
                            :placeholder="$t('lgpd.consent.admin.whatsappTemplatePlaceholder')"
                          ></textarea>
                        </div>

                        <div class="form-group-modern form-group-textarea">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.formIntroText') }}
                          </label>
                          <textarea
                            class="form-control-modern"
                            v-model="requirement.templates.formIntroText"
                            :disabled="!state.toggles['lgpd.admin.update']"
                            rows="4"
                            :placeholder="$t('lgpd.consent.admin.formIntroTextPlaceholder')"
                          ></textarea>
                        </div>

                        <div class="form-group-modern form-group-toggle">
                          <label class="form-label-modern">
                            {{ $t('active') }}
                          </label>
                          <Toggle
                            v-model="requirement.active"
                            :disabled="!state.toggles['lgpd.admin.update']"
                          />
                        </div>

                        <div
                          v-if="state.toggles['lgpd.admin.read'] && state.expandedIndex === index"
                          class="col mt-3 centered"
                        >
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="update(requirement)"
                            :disabled="!state.toggles['lgpd.admin.update']"
                          >
                            {{ $t('update') }} <i class="bi bi-save"></i>
                          </button>
                          <button
                            class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                            @click="askDelete(requirement.id)"
                            v-if="state.toggles['lgpd.admin.delete']"
                          >
                            {{ $t('delete') }} <i class="bi bi-trash-fill"></i>
                          </button>
                          <AreYouSure
                            :show="confirmDeleteId === requirement.id"
                            :yes-disabled="!state.toggles['lgpd.admin.delete']"
                            :no-disabled="!state.toggles['lgpd.admin.delete']"
                            @actionYes="confirmDelete()"
                            @actionNo="cancelDelete()"
                          >
                          </AreYouSure>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="(!isActiveBusiness || !state.toggles['lgpd.admin.view']) && !loading">
              <Message
                :title="$t('lgpd.consent.admin.message.noAccess.title')"
                :content="$t('lgpd.consent.admin.message.noAccess.content')"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="container-fluid">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <DesktopPageHeader
          :logo="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('lgpd.consent.admin.title')"
          :toggles="state.toggles"
          component-name="businessLgpdConsentAdmin"
          @go-back="goBack"
        />
        <div id="businessLgpdConsentAdmin">
          <div v-if="isActiveBusiness && state.toggles['lgpd.admin.view']">
            <div class="control-box my-4"></div>
            <div v-if="!loading" id="businessLgpdConsentAdmin-result" class="mt-4">
              <div>
                <div v-if="state.requirements.length === 0">
                  <Message
                    :title="$t('lgpd.consent.admin.message.noRequirements.title')"
                    :content="$t('lgpd.consent.admin.message.noRequirements.content')"
                  />
                </div>
                <div v-if="commerce && commerce.id" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                      @click="openAddModal()"
                      data-bs-toggle="modal"
                      data-bs-target="#add-lgpd-requirement"
                      :disabled="!state.toggles['lgpd.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.requirements"
                    :type="'lgpd-requirements'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div
                    v-for="(requirement, index) in state.filtered"
                    :key="index"
                    class="result-card"
                  >
                    <div class="row">
                      <div class="col-10">
                        <div class="d-flex align-items-center">
                          <span class="badge bg-primary me-2">
                            {{ $t(getConsentTypeLabel(requirement.consentType)) }}
                          </span>
                          <span
                            :class="requirement.active ? 'badge bg-success' : 'badge bg-secondary'"
                          >
                            {{ requirement.active ? $t('active') : $t('inactive') }}
                          </span>
                        </div>
                      </div>
                      <div class="col-2">
                        <a href="#" @click.prevent="toggleExpand(index)">
                          <i
                            :id="index"
                            :class="`bi ${
                              state.expandedIndex === index ? 'bi-chevron-up' : 'bi-chevron-down'
                            }`"
                          ></i>
                        </a>
                      </div>
                    </div>
                    <div
                      v-if="state.toggles['lgpd.admin.read']"
                      :class="{ show: state.expandedIndex === index }"
                      class="detailed-data transition-slow"
                    >
                      <div class="form-fields-container">
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.consentType') }} *
                          </label>
                          <select
                            v-model="requirement.consentType"
                            class="form-control-modern form-select-modern"
                            :disabled="!state.toggles['lgpd.admin.update']"
                          >
                            <option value="">{{ $t('lgpd.consent.admin.selectType') }}</option>
                            <option v-for="type in state.consentTypes" :key="type" :value="type">
                              {{ $t(getConsentTypeLabel(type)) }}
                            </option>
                          </select>
                        </div>

                        <div class="form-group-modern form-group-toggle">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.required') }}
                          </label>
                          <Toggle
                            v-model="requirement.required"
                            :disabled="!state.toggles['lgpd.admin.update']"
                          />
                        </div>

                        <div class="form-group-modern form-group-toggle">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.blockingForAttention') }}
                          </label>
                          <Toggle
                            v-model="requirement.blockingForAttention"
                            :disabled="!state.toggles['lgpd.admin.update']"
                          />
                        </div>

                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.timing') }} *
                          </label>
                          <select
                            v-model="requirement.requestStrategy.timing"
                            class="form-control-modern form-select-modern"
                            :disabled="!state.toggles['lgpd.admin.update']"
                          >
                            <option
                              v-for="timing in state.timingOptions"
                              :key="timing"
                              :value="timing"
                            >
                              {{ $t(getTimingLabel(timing)) }}
                            </option>
                          </select>
                        </div>

                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.methods') }} *
                          </label>
                          <div class="d-flex flex-wrap gap-2" style="flex: 1">
                            <div
                              v-for="method in state.methodOptions"
                              :key="method"
                              class="form-check"
                            >
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :checked="
                                  requirement.requestStrategy?.methods?.includes(method) || false
                                "
                                @change="toggleMethod(requirement, method)"
                                :disabled="!state.toggles['lgpd.admin.update']"
                                :id="`method-desk-${index}-${method}`"
                              />
                              <label
                                class="form-check-label"
                                :for="`method-desk-${index}-${method}`"
                              >
                                {{ $t(`lgpd.consent.admin.method.${method}`) }}
                              </label>
                            </div>
                          </div>
                        </div>

                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.reminderIntervalHours') }}
                          </label>
                          <input
                            type="number"
                            class="form-control-modern"
                            v-model.number="requirement.requestStrategy.reminderIntervalHours"
                            :disabled="!state.toggles['lgpd.admin.update']"
                            min="1"
                            placeholder=""
                          />
                        </div>

                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.maxReminders') }}
                          </label>
                          <input
                            type="number"
                            class="form-control-modern"
                            v-model.number="requirement.requestStrategy.maxReminders"
                            :disabled="!state.toggles['lgpd.admin.update']"
                            min="0"
                            placeholder=""
                          />
                        </div>

                        <div class="form-group-modern form-group-textarea">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.whatsappTemplate') }}
                          </label>
                          <textarea
                            class="form-control-modern"
                            v-model="requirement.templates.whatsapp"
                            :disabled="!state.toggles['lgpd.admin.update']"
                            rows="3"
                            :placeholder="$t('lgpd.consent.admin.whatsappTemplatePlaceholder')"
                          ></textarea>
                        </div>

                        <div class="form-group-modern form-group-textarea">
                          <label class="form-label-modern">
                            {{ $t('lgpd.consent.admin.formIntroText') }}
                          </label>
                          <textarea
                            class="form-control-modern"
                            v-model="requirement.templates.formIntroText"
                            :disabled="!state.toggles['lgpd.admin.update']"
                            rows="4"
                            :placeholder="$t('lgpd.consent.admin.formIntroTextPlaceholder')"
                          ></textarea>
                        </div>

                        <div class="form-group-modern form-group-toggle">
                          <label class="form-label-modern">
                            {{ $t('active') }}
                          </label>
                          <Toggle
                            v-model="requirement.active"
                            :disabled="!state.toggles['lgpd.admin.update']"
                          />
                        </div>

                        <div
                          v-if="state.toggles['lgpd.admin.read'] && state.expandedIndex === index"
                          class="col mt-3 centered"
                        >
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="update(requirement)"
                            :disabled="!state.toggles['lgpd.admin.update']"
                          >
                            {{ $t('update') }} <i class="bi bi-save"></i>
                          </button>
                          <button
                            class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                            @click="askDelete(requirement.id)"
                            v-if="state.toggles['lgpd.admin.delete']"
                          >
                            {{ $t('delete') }} <i class="bi bi-trash-fill"></i>
                          </button>
                          <AreYouSure
                            :show="confirmDeleteId === requirement.id"
                            :yes-disabled="!state.toggles['lgpd.admin.delete']"
                            :no-disabled="!state.toggles['lgpd.admin.delete']"
                            @actionYes="confirmDelete()"
                            @actionNo="cancelDelete()"
                          >
                          </AreYouSure>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="(!isActiveBusiness || !state.toggles['lgpd.admin.view']) && !loading">
              <Message
                :title="$t('lgpd.consent.admin.message.noAccess.title')"
                :content="$t('lgpd.consent.admin.message.noAccess.content')"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Add Requirement -->
    <div
      class="modal fade"
      id="add-lgpd-requirement"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="addLgpdRequirementLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-fullscreen-lg-down modal-xl modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-plus-lg"></i> {{ $t('add') }}</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              id="close-modal-lgpd"
            ></button>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="false" :stack="alertError"></Alert>
            <div
              id="add-lgpd-requirement"
              class="result-card mb-4"
              v-if="state.toggles['lgpd.admin.add']"
            >
              <div class="form-fields-container">
                <!-- Selección Múltiple de Tipos -->
                <ConsentTypeMultiSelector
                  v-model="state.selectedConsentTypes"
                  :available-types="state.consentTypes"
                  :show-error="state.selectedConsentTypes.length === 0 && state.showAddModal"
                />

                <!-- Selector de Template (solo si hay un tipo seleccionado) -->
                <ConsentTemplateSelector
                  v-if="state.selectedConsentTypes.length === 1 && state.newRequirement.consentType"
                  v-model="state.newRequirement"
                  :commerce="commerce"
                  :consent-type="state.selectedConsentTypes[0]"
                  @preset-selected="applyPreset"
                />

                <!-- Tipo único (para compatibilidad) -->
                <div v-if="state.selectedConsentTypes.length === 0" class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('lgpd.consent.admin.consentType') }} *
                  </label>
                  <select
                    v-model="state.newRequirement.consentType"
                    class="form-control-modern form-select-modern"
                    required
                    @change="applyTemplate(state.newRequirement.consentType)"
                  >
                    <option value="">{{ $t('lgpd.consent.admin.selectType') }}</option>
                    <option v-for="type in state.consentTypes" :key="type" :value="type">
                      {{ $t(getConsentTypeLabel(type)) }}
                    </option>
                  </select>
                </div>

                <div class="form-group-modern form-group-toggle">
                  <label class="form-label-modern">
                    {{ $t('lgpd.consent.admin.required') }}
                  </label>
                  <Toggle v-model="state.newRequirement.required" />
                </div>

                <div class="form-group-modern form-group-toggle">
                  <label class="form-label-modern">
                    {{ $t('lgpd.consent.admin.blockingForAttention') }}
                  </label>
                  <Toggle v-model="state.newRequirement.blockingForAttention" />
                </div>

                <div class="form-group-modern">
                  <label class="form-label-modern"> {{ $t('lgpd.consent.admin.timing') }} * </label>
                  <select
                    v-model="state.newRequirement.requestStrategy.timing"
                    class="form-control-modern form-select-modern"
                    required
                  >
                    <option v-for="timing in state.timingOptions" :key="timing" :value="timing">
                      {{ $t(getTimingLabel(timing)) }}
                    </option>
                  </select>
                </div>

                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('lgpd.consent.admin.methods') }} *
                  </label>
                  <div class="d-flex flex-wrap gap-2" style="flex: 1">
                    <div v-for="method in state.methodOptions" :key="method" class="form-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        :checked="state.newRequirement.requestStrategy.methods.includes(method)"
                        @change="toggleMethod(state.newRequirement, method)"
                        :id="`new-method-${method}`"
                      />
                      <label class="form-check-label" :for="`new-method-${method}`">
                        {{ $t(`lgpd.consent.admin.method.${method}`) }}
                      </label>
                    </div>
                  </div>
                </div>

                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('lgpd.consent.admin.reminderIntervalHours') }}
                  </label>
                  <input
                    type="number"
                    class="form-control-modern"
                    v-model.number="state.newRequirement.requestStrategy.reminderIntervalHours"
                    min="1"
                    placeholder=""
                  />
                </div>

                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('lgpd.consent.admin.maxReminders') }}
                  </label>
                  <input
                    type="number"
                    class="form-control-modern"
                    v-model.number="state.newRequirement.requestStrategy.maxReminders"
                    min="0"
                    placeholder=""
                  />
                </div>

                <div class="form-group-modern form-group-textarea">
                  <label class="form-label-modern">
                    {{ $t('lgpd.consent.admin.whatsappTemplate') }}
                  </label>
                  <textarea
                    class="form-control-modern"
                    v-model="state.newRequirement.templates.whatsapp"
                    rows="3"
                    :placeholder="$t('lgpd.consent.admin.whatsappTemplatePlaceholder')"
                  ></textarea>
                </div>

                <div class="form-group-modern form-group-textarea">
                  <label class="form-label-modern">
                    {{ $t('lgpd.consent.admin.formIntroText') }}
                  </label>
                  <textarea
                    class="form-control-modern"
                    v-model="state.newRequirement.templates.formIntroText"
                    rows="4"
                    :placeholder="$t('lgpd.consent.admin.formIntroTextPlaceholder')"
                  ></textarea>
                </div>

                <div class="form-group-modern form-group-textarea">
                  <label class="form-label-modern">
                    {{ $t('lgpd.consent.admin.fullTerms') }}
                  </label>
                  <MarkdownEditor
                    v-model="state.newRequirement.templates.fullTerms"
                    :rows="8"
                    :placeholder="$t('lgpd.consent.admin.fullTermsPlaceholder')"
                  />
                </div>

                <div class="form-group-modern form-group-textarea">
                  <label class="form-label-modern">
                    {{ $t('lgpd.consent.admin.dataDescription') }}
                  </label>
                  <MarkdownEditor
                    v-model="state.newRequirement.templates.dataDescription"
                    :rows="6"
                    :placeholder="$t('lgpd.consent.admin.dataDescriptionPlaceholder')"
                  />
                </div>

                <div class="form-group-modern form-group-textarea">
                  <label class="form-label-modern">
                    {{ $t('lgpd.consent.admin.legalBasis') }}
                  </label>
                  <MarkdownEditor
                    v-model="state.newRequirement.templates.legalBasis"
                    :rows="4"
                    :placeholder="$t('lgpd.consent.admin.legalBasisPlaceholder')"
                  />
                </div>

                <div class="form-group-modern form-group-textarea">
                  <label class="form-label-modern">
                    {{ $t('lgpd.consent.admin.retentionPeriod') }}
                  </label>
                  <MarkdownEditor
                    v-model="state.newRequirement.templates.retentionPeriod"
                    :rows="3"
                    :placeholder="$t('lgpd.consent.admin.retentionPeriodPlaceholder')"
                  />
                </div>

                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('lgpd.consent.admin.privacyPolicyLink') }}
                  </label>
                  <input
                    type="url"
                    class="form-control-modern"
                    v-model="state.newRequirement.templates.privacyPolicyLink"
                    :placeholder="$t('lgpd.consent.admin.privacyPolicyLinkPlaceholder')"
                  />
                </div>

                <div class="form-group-modern form-group-textarea">
                  <label class="form-label-modern">
                    {{ $t('lgpd.consent.admin.revocationInstructions') }}
                  </label>
                  <MarkdownEditor
                    v-model="state.newRequirement.templates.revocationInstructions"
                    :rows="4"
                    :placeholder="$t('lgpd.consent.admin.revocationInstructionsPlaceholder')"
                  />
                </div>

                <div class="form-group-modern form-group-toggle">
                  <label class="form-label-modern">
                    {{ $t('active') }}
                  </label>
                  <Toggle v-model="state.newRequirement.active" />
                </div>
              </div>
              <div class="col mt-3">
                <button
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4 pulse-btn"
                  @click="add()"
                  :disabled="!state.toggles['lgpd.admin.add'] || loading"
                >
                  {{ $t('add') }} <i class="bi bi-save"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              data-bs-dismiss="modal"
              aria-label="Close"
              >{{ $t('close') }} <i class="bi bi-check-lg"></i
            ></a>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Histórico de Versões -->
    <div
      v-if="showHistoryModal"
      class="modal fade show"
      style="display: block; background-color: rgba(0, 0, 0, 0.5)"
      @click.self="closeHistoryModal"
    >
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ $t('lgpd.consent.admin.history') }}</h5>
            <button type="button" class="btn-close" @click="closeHistoryModal"></button>
          </div>
          <div class="modal-body">
            <div v-if="requirementVersions.length === 0" class="text-center py-4">
              <p>{{ $t('lgpd.consent.admin.noHistory') }}</p>
            </div>
            <div v-else>
              <div v-for="version in requirementVersions" :key="version.id" class="card mb-3">
                <div class="card-header d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{{ $t('lgpd.consent.admin.version') }} {{ version.version }}</strong>
                    <span
                      class="badge ms-2"
                      :class="{
                        'bg-success': version.action === 'CREATE',
                        'bg-primary': version.action === 'UPDATE',
                        'bg-danger': version.action === 'DELETE',
                      }"
                    >
                      {{ $t(`lgpd.consent.admin.action.${version.action}`) }}
                    </span>
                  </div>
                  <small class="text-muted">
                    {{ new Date(version.changedAt).toLocaleString() }}
                  </small>
                </div>
                <div class="card-body">
                  <div v-if="version.changedFields && version.changedFields.length > 0">
                    <strong>{{ $t('lgpd.consent.admin.changedFields') }}:</strong>
                    <ul class="mb-2">
                      <li v-for="field in version.changedFields" :key="field">
                        {{ $t(`lgpd.consent.admin.field.${field}`) || field }}
                      </li>
                    </ul>
                  </div>
                  <div v-if="version.changeDescription">
                    <strong>{{ $t('lgpd.consent.admin.description') }}:</strong>
                    <p>{{ version.changeDescription }}</p>
                  </div>
                  <small class="text-muted">
                    {{ $t('lgpd.consent.admin.changedBy') }}: {{ version.changedBy }}
                  </small>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeHistoryModal">
              {{ $t('close') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal de Preview de Template -->
      <div
        v-if="showPreviewModal && previewRequirement"
        class="modal fade show"
        style="display: block; background-color: rgba(0, 0, 0, 0.5)"
        @click.self="closePreviewModal"
      >
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ $t('lgpd.consent.admin.preview') }}</h5>
              <button type="button" class="btn-close" @click="closePreviewModal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <h6>{{ $t('lgpd.consent.admin.previewChannel') }}</h6>
                <div class="btn-group" role="group">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    @click="previewChannel = 'web'"
                    :class="{ active: previewChannel === 'web' }"
                  >
                    {{ $t('lgpd.consent.admin.previewWeb') }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    @click="previewChannel = 'whatsapp'"
                    :class="{ active: previewChannel === 'whatsapp' }"
                  >
                    {{ $t('lgpd.consent.admin.previewWhatsApp') }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    @click="previewChannel = 'email'"
                    :class="{ active: previewChannel === 'email' }"
                  >
                    {{ $t('lgpd.consent.admin.previewEmail') }}
                  </button>
                </div>
              </div>

              <!-- Preview Web Form -->
              <div v-if="previewChannel === 'web'" class="preview-container border rounded p-4">
                <h5 class="mb-3">{{ $t('lgpd.consent.admin.previewWebForm') }}</h5>
                <div
                  v-html="formatMarkdown(previewRequirement.templates?.formIntroText || '')"
                ></div>
                <hr />
                <div v-html="formatMarkdown(previewRequirement.templates?.fullTerms || '')"></div>
                <div class="mt-3">
                  <button class="btn btn-primary">{{ $t('lgpd.consent.admin.accept') }}</button>
                  <button class="btn btn-secondary ms-2">
                    {{ $t('lgpd.consent.admin.decline') }}
                  </button>
                </div>
              </div>

              <!-- Preview WhatsApp -->
              <div
                v-if="previewChannel === 'whatsapp'"
                class="preview-container border rounded p-4"
              >
                <h5 class="mb-3">{{ $t('lgpd.consent.admin.previewWhatsAppMessage') }}</h5>
                <div class="whatsapp-preview bg-light p-3 rounded">
                  <div v-html="formatMarkdown(previewRequirement.templates?.whatsapp || '')"></div>
                </div>
              </div>

              <!-- Preview Email -->
              <div v-if="previewChannel === 'email'" class="preview-container border rounded p-4">
                <h5 class="mb-3">{{ $t('lgpd.consent.admin.previewEmailMessage') }}</h5>
                <div class="email-preview border p-3 rounded">
                  <div v-html="formatMarkdown(previewRequirement.templates?.email || '')"></div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closePreviewModal">
                {{ $t('close') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-card {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.detailed-data {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.detailed-data.show {
  max-height: 5000px;
  padding-top: 1rem;
}

.transition-slow {
  transition: all 0.3s ease;
}

.lefted {
  text-align: left;
}

/* Modern Form Styles - Compact */
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
  min-height: 2.5rem;
}

.form-group-modern.form-group-textarea {
  align-items: flex-start;
}

.form-group-modern.form-group-toggle {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.form-group-modern.form-group-toggle .toggle-container {
  flex-shrink: 0;
}

.form-fields-container .form-check-label {
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 0;
}

.form-label-modern {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  margin-bottom: 0;
  min-width: 140px;
  max-width: 140px;
  flex-shrink: 0;
  padding-top: 0.5rem;
  line-height: 1.4;
  text-align: left;
}

.form-group-modern.form-group-textarea .form-label-modern {
  padding-top: 0.75rem;
}

.form-group-modern.form-group-checkbox .form-label-modern {
  padding-top: 0.5rem;
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
  min-height: 2.5rem;
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
  cursor: not-allowed;
  opacity: 0.6;
}

.form-control-modern.is-invalid,
.form-select-modern.is-invalid {
  border-color: rgba(220, 53, 69, 0.5);
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.1);
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

textarea.form-control-modern {
  min-height: auto;
  resize: vertical;
}

/* Desktop Layout Styles */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
    text-align: left;
  }

  .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    text-align: left;
  }

  .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
    text-align: left;
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
    text-align: left;
  }
}
</style>
