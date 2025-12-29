<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { pdfTemplateService } from '../../application/services/pdf-template';
import { getPermissions } from '../../application/services/permissions';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import PdfTemplateCanvasEditor from '../../components/pdf-templates/PdfTemplateCanvasEditor.vue';
import PdfTemplateSimpleName from '../../components/common/PdfTemplateSimpleName.vue';

export default {
  name: 'BusinessPdfTemplatesAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    Warning,
    AreYouSure,
    ComponentMenu,
    SearchAdminItem,
    PdfTemplateCanvasEditor,
    PdfTemplateSimpleName,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      commerce: {},
      templates: [],
      showAdd: false,
      goToUnavailable: false,
      newTemplate: {
        name: '',
        description: '',
        documentType: 'prescription',
        scope: 'COMMERCE',
        active: true,
        available: true,
        header: {
          type: 'header',
          enabled: false,
          includeLogo: true,
          includeCommerceInfo: true,
        },
        footer: {
          type: 'footer',
          enabled: false,
          includeDigitalSignature: true,
          includeDoctorInfo: true,
        },
        content: {
          type: 'content',
          enabled: false,
        },
        pageSize: 'A4',
        orientation: 'portrait',
        isDefault: false,
      },
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      toggles: {},
      filtered: [],
      showCanvasEditor: false,
      editingTemplate: null,
      editingSection: 'header',
      showPreview: false,
      previewUrl: '',
      previewLoading: false,
      documentTypes: [
        { value: 'prescription', label: 'Receta Médica' },
        { value: 'exam_order', label: 'Orden de Examen' },
        { value: 'reference', label: 'Referencia Médica' },
      ],
      scopes: [
        { value: 'GLOBAL', label: 'Global' },
        { value: 'COMMERCE', label: 'Comercio' },
        { value: 'PERSONAL', label: 'Personal' },
      ],
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Computed property to ensure filtered is always a valid array
    const filteredTemplates = computed(() => {
      if (!Array.isArray(state.filtered)) {
        return [];
      }
      // Filter out any non-object items (strings, numbers, etc.)
      return state.filtered.filter(
        item => item && typeof item === 'object' && !Array.isArray(item) && item !== null
      );
    });

    const loadTemplates = async commerceId => {
      if (!commerceId) {
        state.templates = [];
        state.filtered = [];
        return;
      }
      try {
        loading.value = true;
        const templates = await pdfTemplateService.listTemplates(undefined, commerceId, 'COMMERCE');
        // Ensure templates is always an array
        state.templates = Array.isArray(templates) ? templates : [];
        state.filtered = Array.isArray(state.templates) ? [...state.templates] : [];
        loading.value = false;
      } catch (error) {
        console.error('Error loading templates:', error);
        state.templates = [];
        state.filtered = [];
        loading.value = false;
      }
    };

    // Watch for commerce changes and reload templates
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            state.templates = [];
            state.filtered = [];
            await loadTemplates(newCommerce.id);
          } catch (error) {
            console.error('Error loading templates on commerce change:', error);
            alertError.value = error.response?.status || 500;
          } finally {
            loading.value = false;
          }
        } else if (!newCommerce || !newCommerce.id) {
          state.templates = [];
          state.filtered = [];
        }
      },
      { immediate: false }
    );

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('pdf-templates', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Load templates for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadTemplates(commerceToUse.id);
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

    const addTemplate = async () => {
      try {
        state.errorsAdd = [];
        if (!state.newTemplate.name) {
          state.errorsAdd.push('El nombre es requerido');
          return;
        }

        if (!commerce.value || !commerce.value.id) {
          state.errorsAdd.push('Debe seleccionar un comercio');
          return;
        }

        const templateData = {
          ...state.newTemplate,
          commerceId: commerce.value.id,
        };

        await pdfTemplateService.createTemplate(templateData);
        await loadTemplates(commerce.value.id);
        state.showAdd = false;
        state.newTemplate = {
          name: '',
          description: '',
          documentType: 'prescription',
          scope: 'COMMERCE',
          active: true,
          available: true,
          header: { type: 'header', enabled: false, includeLogo: true, includeCommerceInfo: true },
          footer: { type: 'footer', enabled: false, includeDigitalSignature: true, includeDoctorInfo: true },
          content: { type: 'content', enabled: false },
          pageSize: 'A4',
          orientation: 'portrait',
          isDefault: false,
        };
      } catch (error) {
        console.error('Error adding template:', error);
        state.errorsAdd.push(error.response?.data?.message || 'Error al crear template');
      }
    };

    const updateTemplate = async template => {
      try {
        state.errorsUpdate = [];
        if (!commerce.value || !commerce.value.id) {
          state.errorsUpdate.push('Debe seleccionar un comercio');
          return;
        }
        await pdfTemplateService.updateTemplate(template.id, template);
        await loadTemplates(commerce.value.id);
        state.extendedEntity = undefined;
      } catch (error) {
        console.error('Error updating template:', error);
        state.errorsUpdate.push(error.response?.data?.message || 'Error al actualizar template');
      }
    };

    const deleteTemplateConfirm = async template => {
      try {
        if (!commerce.value || !commerce.value.id) {
          return;
        }
        await pdfTemplateService.deleteTemplate(template.id);
        await loadTemplates(commerce.value.id);
        state.extendedEntity = undefined;
        state.goToUnavailable = false;
      } catch (error) {
        console.error('Error deleting template:', error);
        alertError.value = error.response?.data?.message || 'Error al eliminar template';
      }
    };

    const setAsDefault = async template => {
      try {
        if (!commerce.value || !commerce.value.id) {
          return;
        }
        await pdfTemplateService.setAsDefault(template.id);
        await loadTemplates(commerce.value.id);
      } catch (error) {
        console.error('Error setting default:', error);
        alertError.value = error.response?.data?.message || 'Error al establecer como default';
      }
    };

    const receiveFilteredItems = filtered => {
      // Ensure we always receive an array, never a string or other type
      if (Array.isArray(filtered)) {
        // Filter out any non-object items (in case there are strings mixed in)
        state.filtered = filtered.filter(item => item && typeof item === 'object' && !Array.isArray(item));
      } else {
        state.filtered = [];
      }
    };

    const getDocumentTypeLabel = type => {
      const typeObj = state.documentTypes.find(t => t.value === type);
      return typeObj ? typeObj.label : type;
    };

    const getScopeLabel = scope => {
      const scopeObj = state.scopes.find(s => s.value === scope);
      return scopeObj ? scopeObj.label : scope;
    };

    const showUpdateForm = index => {
      if (state.extendedEntity === index) {
        state.extendedEntity = undefined;
      } else {
        state.extendedEntity = index;
      }
    };

    const showAdd = () => {
      state.showAdd = true;
      const currentCommerce = store.getCurrentCommerce;
      state.newTemplate = {
        name: '',
        description: '',
        documentType: 'prescription',
        scope: 'COMMERCE',
        active: true,
        available: true,
        header: { type: 'header', enabled: false, includeLogo: true, includeCommerceInfo: true },
        footer: { type: 'footer', enabled: false, includeDigitalSignature: true, includeDoctorInfo: true },
        content: { type: 'content', enabled: false },
        pageSize: 'A4',
        orientation: 'portrait',
        isDefault: false,
        commerceId: currentCommerce?.id || '',
      };
    };

    const openCanvasEditor = (template, section = 'header') => {
      state.editingTemplate = template;
      state.editingSection = section;
      state.showCanvasEditor = true;
    };

    const closeCanvasEditor = () => {
      state.showCanvasEditor = false;
      state.editingTemplate = null;
    };

    const unavailableCancel = () => {
      state.goToUnavailable = false;
    };

    const saveCanvasTemplate = async templateData => {
      try {
        loading.value = true;
        if (!commerce.value || !commerce.value.id) {
          return;
        }
        await pdfTemplateService.updateTemplate(state.editingTemplate.id, templateData);
        await loadTemplates(commerce.value.id);
        closeCanvasEditor();
      } catch (error) {
        console.error('Error saving template:', error);
        alertError.value = 'Erro ao salvar template';
      } finally {
        loading.value = false;
      }
    };

    const generatePreview = async template => {
      try {
        if (!template || !template.id) {
          alertError.value = 'Template não encontrado';
          return;
        }
        state.previewLoading = true;
        const url = await pdfTemplateService.generatePreview(template.id);
        if (!url) {
          throw new Error('URL do preview não foi retornada');
        }
        // Abrir directamente en nueva pestaña
        window.open(url, '_blank');
      } catch (error) {
        console.error('Error generating preview:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Erro ao gerar preview do PDF';
        alertError.value = Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage;
      } finally {
        state.previewLoading = false;
      }
    };

    // --- Page size change handling: scale elements to new dimensions ---
    const getBaseDimensions = size => {
      switch (size) {
        case 'LETTER':
          return { w: 612, h: 792 };
        case 'A5':
          return { w: 420, h: 595 };
        case 'LETTER_HALF':
          return { w: 396, h: 612 };
        case 'A4':
        default:
          return { w: 595, h: 842 };
      }
    };

    const getDims = (tpl, sizeOverride) => {
      const size = sizeOverride || tpl.pageSize || 'A4';
      const orient = tpl.orientation || 'portrait';
      const { w, h } = getBaseDimensions(size);
      return orient === 'landscape' ? { w: h, h: w } : { w, h };
    };

    const scaleElementsArray = (arr, sx, sy) => {
      if (!Array.isArray(arr)) return;
      arr.forEach(el => {
        if (typeof el.x === 'number') el.x = Math.round(el.x * sx);
        if (typeof el.y === 'number') el.y = Math.round(el.y * sy);
        if (typeof el.width === 'number') el.width = Math.round(el.width * sx);
        if (typeof el.height === 'number') el.height = Math.round(el.height * sy);
        if (typeof el.fontSize === 'number') el.fontSize = Math.round(el.fontSize * ((sx + sy) / 2));
        if (typeof el.lineWidth === 'number') el.lineWidth = Math.max(1, Math.round(el.lineWidth * ((sx + sy) / 2)));
      });
    };

    const storePrevPageSize = tpl => {
      tpl.__prevPageSize = tpl.pageSize || 'A4';
      tpl.__prevOrientation = tpl.orientation || 'portrait';
    };

    const handlePageSizeChange = tpl => {
      const prev = tpl.__prevPageSize || tpl.pageSize || 'A4';
      const prevOrient = tpl.__prevOrientation || tpl.orientation || 'portrait';
      const { w: oldW, h: oldH } = getDims({ pageSize: prev, orientation: prevOrient }, prev);
      const { w: newW, h: newH } = getDims(tpl);
      const sx = newW / oldW;
      const sy = newH / oldH;
      if (!isFinite(sx) || !isFinite(sy) || sx <= 0 || sy <= 0) return;
      if (tpl.header && Array.isArray(tpl.header.elements)) scaleElementsArray(tpl.header.elements, sx, sy);
      if (tpl.footer && Array.isArray(tpl.footer.elements)) scaleElementsArray(tpl.footer.elements, sx, sy);
      if (tpl.content && Array.isArray(tpl.content.elements)) scaleElementsArray(tpl.content.elements, sx, sy);
    };

    return {
      loading,
      alertError,
      state,
      commerce,
      filteredTemplates,
      isActiveBusiness,
      goBack,
      addTemplate,
      updateTemplate,
      deleteTemplateConfirm,
      setAsDefault,
      receiveFilteredItems,
      getDocumentTypeLabel,
      getScopeLabel,
      showUpdateForm,
      showAdd,
      openCanvasEditor,
      closeCanvasEditor,
      saveCanvasTemplate,
      unavailableCancel,
      generatePreview,
      storePrevPageSize,
      handlePageSizeChange,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :src="state.business?.logo" :loading="loading"></CommerceLogo>
        <ComponentMenu
          :title="$t('pdfTemplates.title')"
          :toggles="state.toggles"
          component-name="pdf-templates"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessPdfTemplatesAdmin">
          <div v-if="isActiveBusiness() && state.toggles['pdf-templates.admin.view']">
            <div v-if="!loading" id="businessPdfTemplatesAdmin-result" class="mt-4">
              <div>
                <div v-if="!commerce">
                  <Message
                    :title="$t('pdfTemplates.message.4.title')"
                    :content="$t('pdfTemplates.message.4.content')"
                  />
                </div>
                <div v-if="commerce && state.templates.length === 0">
                  <Message
                    :title="$t('pdfTemplates.message.2.title')"
                    :content="$t('pdfTemplates.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd()"
                      data-bs-toggle="modal"
                      data-bs-target="#add-template"
                      :disabled="!state.toggles['pdf-templates.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div v-if="commerce">
                  <SearchAdminItem
                    :business-items="state.templates"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(template, index) in filteredTemplates" :key="index" class="result-card">
                    <div class="row align-items-center">
                      <div class="col-10">
                        <PdfTemplateSimpleName
                          :template="template"
                          :get-document-type-label="getDocumentTypeLabel"
                          :get-scope-label="getScopeLabel"
                        />
                      </div>
                      <div class="col-2 text-end">
                        <a href="#" @click.prevent="showUpdateForm(index)">
                          <i
                            :class="`bi ${
                              state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                            }`"
                          ></i>
                        </a>
                      </div>
                    </div>
                    <div v-if="state.extendedEntity === index" class="mt-3">
                      <div class="form-fields-container">
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{ $t('pdfTemplates.name') }}</label>
                          <input
                            v-model="template.name"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['pdf-templates.admin.update']"
                            placeholder=""
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{ $t('pdfTemplates.description') }}</label>
                          <textarea
                            v-model="template.description"
                            class="form-control-modern"
                            rows="3"
                            :disabled="!state.toggles['pdf-templates.admin.update']"
                          ></textarea>
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{ $t('pdfTemplates.documentType') }}</label>
                          <select
                            v-model="template.documentType"
                            class="form-control-modern"
                            :disabled="!state.toggles['pdf-templates.admin.update']"
                          >
                            <option
                              v-for="type in state.documentTypes"
                              :key="type.value"
                              :value="type.value"
                            >
                              {{ type.label }}
                            </option>
                          </select>
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{ $t('pdfTemplates.scope') }}</label>
                          <select
                            v-model="template.scope"
                            class="form-control-modern"
                            :disabled="!state.toggles['pdf-templates.admin.update']"
                          >
                            <option
                              v-for="scope in state.scopes"
                              :key="scope.value"
                              :value="scope.value"
                            >
                              {{ scope.label }}
                            </option>
                          </select>
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{ $t('pdfTemplates.pageSize') }}</label>
                          <select
                            v-model="template.pageSize"
                              @focus="storePrevPageSize(template)"
                              @change="handlePageSizeChange(template)"
                            class="form-control-modern"
                            :disabled="!state.toggles['pdf-templates.admin.update']"
                          >
                            <option value="A4">A4</option>
                            <option value="A5">A5 (Media página A4)</option>
                            <option value="LETTER">Letter</option>
                            <option value="LETTER_HALF">Half Letter (Media página)</option>
                          </select>
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="updateTemplate(template)"
                          :disabled="!state.toggles['pdf-templates.admin.update']"
                        >
                          {{ $t('pdfTemplates.update') || 'Update' }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          v-if="!template.isDefault && state.toggles['pdf-templates.admin.delete']"
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="state.goToUnavailable = true"
                        >
                          {{ $t('delete') }} <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          @actionYes="deleteTemplateConfirm(template); unavailableCancel()"
                          @actionNo="unavailableCancel()"
                        >
                        </AreYouSure>
                        <button
                          v-if="!template.isDefault && state.toggles['pdf-templates.admin.edit']"
                          class="btn btn-lg btn-size fw-bold btn-success rounded-pill mt-2 px-4 ms-2"
                          @click="setAsDefault(template)"
                        >
                          {{ $t('pdfTemplates.setAsDefault') }} <i class="bi bi-star"></i>
                        </button>
                        <div class="form-group-modern text-center mt-4">
                          <label class="form-label-modern">Edición del Template</label>
                        </div>
                        <div class="btn-group mt-2" role="group">
                          <button
                            v-if="state.toggles['pdf-templates.admin.edit']"
                            @click="openCanvasEditor(template, 'header')"
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            :title="$t('pdfTemplates.canvasEditor.header') || 'Editor Header'"
                          >
                            <i class="bi bi-paint-bucket"></i> Header
                          </button>
                          <button
                            v-if="state.toggles['pdf-templates.admin.edit']"
                            @click="openCanvasEditor(template, 'footer')"
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            :title="$t('pdfTemplates.canvasEditor.footer') || 'Editor Footer'"
                          >
                            <i class="bi bi-paint-bucket"></i> Footer
                          </button>
                          <button
                            v-if="state.toggles['pdf-templates.admin.edit']"
                            @click="openCanvasEditor(template, 'content')"
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            :title="$t('pdfTemplates.canvasEditor.content') || 'Editor Content'"
                          >
                            <i class="bi bi-paint-bucket"></i> Content
                          </button>
                          <button
                            @click="generatePreview(template)"
                            class="btn btn-sm btn-size fw-bold btn-success rounded-pill px-3"
                            :disabled="state.previewLoading"
                            :title="$t('pdfTemplates.preview') || 'Preview PDF'"
                          >
                            <i class="bi bi-eye"></i> Preview PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="(!isActiveBusiness() || !state.toggles['pdf-templates.admin.view']) && !loading"
          >
            <Message
              :title="$t('pdfTemplates.message.1.title')"
              :content="$t('pdfTemplates.message.1.content')"
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
        <div class="row align-items-center mb-1 desktop-header-row justify-content-start">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <CommerceLogo :src="state.business?.logo" :loading="loading" :desktop-size="false" />
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="$t('pdfTemplates.title')"
              :toggles="state.toggles"
              component-name="pdf-templates"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <div id="businessPdfTemplatesAdmin">
          <div v-if="isActiveBusiness() && state.toggles['pdf-templates.admin.view']">
            <div id="businessPdfTemplatesAdmin-controls" class="control-box">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('pdfTemplates.message.4.title')"
                    :content="$t('pdfTemplates.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessPdfTemplatesAdmin-result" class="mt-4">
              <div>
                <div v-if="commerce && state.templates.length === 0">
                  <Message
                    :title="$t('pdfTemplates.message.2.title')"
                    :content="$t('pdfTemplates.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd()"
                      data-bs-toggle="modal"
                      data-bs-target="#add-template"
                      :disabled="!state.toggles['pdf-templates.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div v-if="commerce">
                  <SearchAdminItem
                    :business-items="state.templates"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(template, index) in filteredTemplates" :key="index" class="result-card">
                    <div class="row align-items-center">
                      <div class="col-10">
                        <PdfTemplateSimpleName
                          :template="template"
                          :get-document-type-label="getDocumentTypeLabel"
                          :get-scope-label="getScopeLabel"
                        />
                      </div>
                      <div class="col-2 text-end">
                        <a href="#" @click.prevent="showUpdateForm(index)">
                          <i
                            :class="`bi ${
                              state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                            }`"
                          ></i>
                        </a>
                      </div>
                    </div>
                    <div v-if="state.extendedEntity === index" class="mt-3">
                      <div class="form-fields-container">
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{ $t('pdfTemplates.name') }}</label>
                          <input
                            v-model="template.name"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['pdf-templates.admin.update']"
                            placeholder=""
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{ $t('pdfTemplates.description') }}</label>
                          <textarea
                            v-model="template.description"
                            class="form-control-modern"
                            rows="3"
                            :disabled="!state.toggles['pdf-templates.admin.update']"
                          ></textarea>
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{ $t('pdfTemplates.documentType') }}</label>
                          <select
                            v-model="template.documentType"
                            class="form-control-modern"
                            :disabled="!state.toggles['pdf-templates.admin.update']"
                          >
                            <option
                              v-for="type in state.documentTypes"
                              :key="type.value"
                              :value="type.value"
                            >
                              {{ type.label }}
                            </option>
                          </select>
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{ $t('pdfTemplates.scope') }}</label>
                          <select
                            v-model="template.scope"
                            class="form-control-modern"
                            :disabled="!state.toggles['pdf-templates.admin.update']"
                          >
                            <option
                              v-for="scope in state.scopes"
                              :key="scope.value"
                              :value="scope.value"
                            >
                              {{ scope.label }}
                            </option>
                          </select>
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{ $t('pdfTemplates.pageSize') }}</label>
                          <select
                            v-model="template.pageSize"
                              @focus="storePrevPageSize(template)"
                              @change="handlePageSizeChange(template)"
                            class="form-control-modern"
                            :disabled="!state.toggles['pdf-templates.admin.update']"
                          >
                            <option value="A4">A4</option>
                            <option value="A5">A5 (Media página A4)</option>
                            <option value="LETTER">Letter</option>
                            <option value="LETTER_HALF">Half Letter (Media página)</option>
                          </select>
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="updateTemplate(template)"
                          :disabled="!state.toggles['pdf-templates.admin.update']"
                        >
                          {{ $t('pdfTemplates.update') || 'Update' }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          v-if="!template.isDefault && state.toggles['pdf-templates.admin.delete']"
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="state.goToUnavailable = true"
                        >
                          {{ $t('delete') }} <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          @actionYes="deleteTemplateConfirm(template); unavailableCancel()"
                          @actionNo="unavailableCancel()"
                        >
                        </AreYouSure>
                        <button
                          v-if="!template.isDefault && state.toggles['pdf-templates.admin.edit']"
                          class="btn btn-lg btn-size fw-bold btn-success rounded-pill mt-2 px-4 ms-2"
                          @click="setAsDefault(template)"
                        >
                          {{ $t('pdfTemplates.setAsDefault') }} <i class="bi bi-star"></i>
                        </button>
                        <div class="form-group-modern text-center mt-4">
                          <label class="form-label-modern">Edición del Template</label>
                        </div>
                        <div class="btn-group mt-2" role="group">
                          <button
                            v-if="state.toggles['pdf-templates.admin.edit']"
                            @click="openCanvasEditor(template, 'header')"
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            :title="$t('pdfTemplates.canvasEditor.header') || 'Editor Header'"
                          >
                            <i class="bi bi-paint-bucket"></i> Header
                          </button>
                          <button
                            v-if="state.toggles['pdf-templates.admin.edit']"
                            @click="openCanvasEditor(template, 'footer')"
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            :title="$t('pdfTemplates.canvasEditor.footer') || 'Editor Footer'"
                          >
                            <i class="bi bi-paint-bucket"></i> Footer
                          </button>
                          <button
                            v-if="state.toggles['pdf-templates.admin.edit']"
                            @click="openCanvasEditor(template, 'content')"
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            :title="$t('pdfTemplates.canvasEditor.content') || 'Editor Content'"
                          >
                            <i class="bi bi-paint-bucket"></i> Content
                          </button>
                          <button
                            @click="generatePreview(template)"
                            class="btn btn-sm btn-size fw-bold btn-success rounded-pill px-3"
                            :disabled="state.previewLoading"
                            :title="$t('pdfTemplates.preview') || 'Preview PDF'"
                          >
                            <i class="bi bi-eye"></i> Preview PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="(!isActiveBusiness() || !state.toggles['pdf-templates.admin.view']) && !loading"
          >
            <Message
              :title="$t('pdfTemplates.message.1.title')"
              :content="$t('pdfTemplates.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Add -->
    <div
      class="modal fade"
      id="add-template"
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
              @click="state.showAdd = false"
            ></button>
          </div>
          <div class="modal-body text-center mb-0" id="pdf-templates-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="false" :stack="alertError"></Alert>
            <div id="add-template-form" class="result-card mb-4" v-if="state.showAdd">
              <div class="form-fields-container">
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('pdfTemplates.name') }} *
                  </label>
                  <input
                    v-model="state.newTemplate.name"
                    type="text"
                    class="form-control-modern"
                    :class="{ 'is-invalid': state.errorsAdd.length > 0 && !state.newTemplate.name }"
                    placeholder=""
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('pdfTemplates.description') }}
                  </label>
                  <textarea
                    v-model="state.newTemplate.description"
                    class="form-control-modern"
                    rows="3"
                    placeholder=""
                  ></textarea>
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('pdfTemplates.documentType') }}
                  </label>
                  <select v-model="state.newTemplate.documentType" class="form-control-modern">
                    <option
                      v-for="type in state.documentTypes"
                      :key="type.value"
                      :value="type.value"
                    >
                      {{ type.label }}
                    </option>
                  </select>
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('pdfTemplates.scope') }}
                  </label>
                  <select v-model="state.newTemplate.scope" class="form-control-modern">
                    <option
                      v-for="scope in state.scopes"
                      :key="scope.value"
                      :value="scope.value"
                    >
                      {{ scope.label }}
                    </option>
                  </select>
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('pdfTemplates.pageSize') }}
                  </label>
                  <select v-model="state.newTemplate.pageSize" class="form-control-modern">
                    <option value="A4">A4</option>
                    <option value="LETTER">Letter</option>
                  </select>
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('pdfTemplates.isDefault') }}
                  </label>
                  <div class="form-check" style="flex: 1; display: flex; align-items: center; justify-content: flex-start;">
                    <input
                      v-model="state.newTemplate.isDefault"
                      type="checkbox"
                      class="form-check-input"
                      id="isDefault"
                      style="margin-top: 0; margin-right: 0.5rem; flex-shrink: 0;"
                    />
                    <label class="form-check-label" for="isDefault" style="margin-bottom: 0; cursor: pointer;">
                      {{ $t('pdfTemplates.isDefault') }}
                    </label>
                  </div>
                </div>
              </div>
              <div
                class="row g-1 errors"
                v-if="state.errorsAdd && state.errorsAdd.length > 0"
              >
                <Warning>
                  <template v-slot:message>
                    <li v-for="(error, index) in state.errorsAdd" :key="index">
                      {{ error }}
                    </li>
                  </template>
                </Warning>
              </div>
              <div class="col mt-3">
                <button
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                  @click="addTemplate"
                >
                  {{ $t('save') }} <i class="bi bi-save"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              data-bs-dismiss="modal"
              aria-label="Close"
              @click="state.showAdd = false"
            >
              {{ $t('close') }} <i class="bi bi-check-lg"></i>
            </a>
          </div>
        </div>
      </div>
    </div>

        <!-- Canvas Editor Modal -->
        <div
          v-if="state.showCanvasEditor && state.editingTemplate"
          class="modal fade show d-block"
          tabindex="-1"
          @click.self="closeCanvasEditor"
          style="
            background: rgba(0, 0, 0, 0.5);
            z-index: 1050;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          "
        >
          <div class="modal-dialog modal-fullscreen">
            <div class="modal-content">
              <div class="modal-header border-0 centered active-name">
                <h5 class="modal-title fw-bold">
                  <i class="bi bi-paint-bucket"></i> Editor Gráfico - {{ state.editingTemplate.name }} ({{ state.editingSection }})
                </h5>
                <button
                  id="close-modal"
                  type="button"
                  class="btn-close"
                  @click="closeCanvasEditor"
                  aria-label="Close"
                ></button>
              </div>
              <div class="modal-body">
                <PdfTemplateCanvasEditor
                  :template="state.editingTemplate"
                  :section="state.editingSection"
                  @save="saveCanvasTemplate"
                  @cancel="closeCanvasEditor"
                />
              </div>
            </div>
          </div>
        </div>


    <!-- Canvas Editor Modal -->
    <div
      v-if="state.showCanvasEditor && state.editingTemplate"
      class="modal fade show d-block"
      tabindex="-1"
      @click.self="closeCanvasEditor"
      style="
        background: rgba(0, 0, 0, 0.5);
        z-index: 1050;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      "
    >
      <div class="modal-dialog modal-fullscreen">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-paint-bucket"></i> Editor Gráfico - {{ state.editingTemplate.name }} ({{ state.editingSection }})
            </h5>
            <button
              id="close-modal"
              type="button"
              class="btn-close"
              @click="closeCanvasEditor"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <PdfTemplateCanvasEditor
              :template="state.editingTemplate"
              :section="state.editingSection"
              @save="saveCanvasTemplate"
              @cancel="closeCanvasEditor"
            />
          </div>
        </div>
      </div>
    </div>

    <Warning
      v-if="!isActiveBusiness()"
      :show="!isActiveBusiness()"
      :message="$t('businessMenu.message.1.content')"
    ></Warning>
  </div>
</template>

<style scoped>
.errors {
  font-size: small;
  color: var(--rojo-warning);
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

.form-control-modern:disabled {
  background-color: rgba(245, 246, 247, 0.8);
  cursor: not-allowed;
  opacity: 0.6;
}

.form-control-modern.is-invalid {
  border-color: rgba(220, 53, 69, 0.5);
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.1);
}

/* Desktop Layout Styles */
@media (min-width: 992px) {
  .desktop-header-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    margin-bottom: 1rem;
    padding: 0;
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
</style>
