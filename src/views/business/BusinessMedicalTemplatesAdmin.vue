<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  searchTemplates,
  getTemplatesByCommerce,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateById,
} from '../../application/services/medical-template';
import { getPermissions } from '../../application/services/permissions';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import MedicalTemplateSimpleName from '../../components/common/MedicalTemplateSimpleName.vue';

export default {
  name: 'BusinessMedicalTemplatesAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    Warning,
    AreYouSure,
    ComponentMenu,
    SearchAdminItem,
    MedicalTemplateSimpleName,
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
      templates: ref([]),
      showAdd: false,
      goToUnavailable: false,
      newTemplate: {
        name: '',
        description: '',
        type: 'general',
        category: '',
        content: '',
        variables: [],
        scope: 'personal',
        tags: [],
        isFavorite: false,
        active: true,
        available: true,
      },
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      toggles: {},
      filtered: [],
      templateTypes: [
        { value: 'general', label: 'General' },
        { value: 'diagnostic', label: 'Diagnóstico' },
        { value: 'anamnesis', label: 'Anamnesis' },
        { value: 'evolution', label: 'Evolución' },
        { value: 'prescription', label: 'Receta' },
        { value: 'exam_order', label: 'Pedido de Examen' },
        { value: 'reference', label: 'Referencia' },
      ],
      templateScopes: [
        { value: 'personal', label: 'Personal' },
        { value: 'commerce', label: 'Comercio' },
        { value: 'global', label: 'Global' },
      ],
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    const loadTemplates = async (commerceId, doctorId) => {
      if (!commerceId || !doctorId) {
        state.templates = [];
        state.filtered = [];
        return;
      }
      try {
        loading.value = true;
        const result = await getTemplatesByCommerce(commerceId, doctorId);
        state.templates = result?.templates || result?.data || [];
        state.filtered = state.templates;
        loading.value = false;
      } catch (error) {
        console.error('Error loading templates:', error);
        state.templates = [];
        state.filtered = [];
        loading.value = false;
      }
    };

    // ✅ Watch for commerce changes and reload templates
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          if (state.currentUser && state.currentUser.id) {
            try {
              loading.value = true;
              state.templates = [];
              state.filtered = [];
            await loadTemplates(newCommerce.id, state.currentUser.id);
            } catch (error) {
              state.templates = [];
              state.filtered = [];
              loading.value = false;
            }
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
        state.toggles = await getPermissions('medical-templates', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Load templates for current commerce and user
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id && state.currentUser && state.currentUser.id) {
          await loadTemplates(commerceToUse.id, state.currentUser.id);
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

    const validateAdd = template => {
      state.errorsAdd = [];
      if (!template.name || template.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessMedicalTemplatesAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!template.content || template.content.length === 0) {
        state.errorsAdd.push('businessMedicalTemplatesAdmin.validate.content');
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const showAdd = () => {
      state.showAdd = true;
      const currentCommerce = store.getCurrentCommerce;
      state.newTemplate = {
        name: '',
        description: '',
        type: 'general',
        category: '',
        content: '',
        variables: [],
        scope: 'personal',
        tags: [],
        isFavorite: false,
        active: true,
        available: true,
        commerceId: currentCommerce?.id || '',
        doctorId: state.currentUser?.id || '',
        doctorName: state.currentUser?.userName || '',
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newTemplate)) {
          const currentCommerce = store.getCurrentCommerce;
          if (!currentCommerce || !currentCommerce.id) {
            alertError.value = 400;
            loading.value = false;
            return;
          }
          state.newTemplate.commerceId = currentCommerce.id;
          state.newTemplate.doctorId = state.currentUser?.id || '';
          state.newTemplate.doctorName = state.currentUser?.userName || '';
          await createTemplate(state.newTemplate);
          if (currentCommerce.id && state.currentUser?.id) {
            await loadTemplates(currentCommerce.id, state.currentUser.id);
          }
          state.showAdd = false;
          state.newTemplate = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const update = async template => {
      try {
        loading.value = true;
        await updateTemplate(template.id, template);
        const currentCommerce = store.getCurrentCommerce;
        if (currentCommerce?.id && state.currentUser?.id) {
          await loadTemplates(currentCommerce.id, state.currentUser.id);
        }
        state.extendedEntity = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async template => {
      try {
        loading.value = true;
        if (template && template.id) {
          await deleteTemplate(template.id);
          const currentCommerce = store.getCurrentCommerce;
          if (currentCommerce?.id && state.currentUser?.id) {
            await loadTemplates(currentCommerce.id, state.currentUser.id);
          }
          state.extendedEntity = undefined;
          state.goToUnavailable = false;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
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

    const receiveFilteredItems = items => {
      state.filtered = items;
    };

    const getTypeLabel = type => {
      const typeObj = state.templateTypes.find(t => t.value === type);
      return typeObj ? typeObj.label : type;
    };

    const getScopeLabel = scope => {
      const scopeObj = state.templateScopes.find(s => s.value === scope);
      return scopeObj ? scopeObj.label : scope;
    };

    return {
      state,
      loading,
      alertError,
      showUpdateForm,
      update,
      showAdd,
      add,
      goBack,
      isActiveBusiness,
      commerce,
      unavailable,
      goToUnavailable,
      unavailableCancel,
      receiveFilteredItems,
      getTypeLabel,
      getScopeLabel,
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
        :title="$t(`businessMedicalTemplatesAdmin.title`)"
        :toggles="state.toggles"
        component-name="businessMedicalTemplatesAdmin"
        @goBack="goBack"
      >
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="false" :stack="alertError"></Alert>
      </div>
      <div id="businessMedicalTemplatesAdmin">
        <div v-if="isActiveBusiness() && state.toggles['medical-templates.admin.view']">
          <div v-if="!loading" id="businessMedicalTemplatesAdmin-result" class="mt-4">
            <div>
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessMedicalTemplatesAdmin.message.4.title')"
                    :content="$t('businessMedicalTemplatesAdmin.message.4.content')"
                  />
                </div>
                <div v-if="commerce && state.templates.length === 0">
                <Message
                  :title="$t('businessMedicalTemplatesAdmin.message.2.title')"
                  :content="$t('businessMedicalTemplatesAdmin.message.2.content')"
                />
              </div>
                <div v-if="commerce" class="row mb-2">
                <div class="col lefted">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd()"
                    data-bs-toggle="modal"
                    data-bs-target="#add-template"
                    :disabled="!state.toggles['medical-templates.admin.add']"
                  >
                    <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                  </button>
                </div>
              </div>
                <div v-if="commerce">
                <SearchAdminItem
                  :business-items="state.templates"
                  :type="'templates'"
                  :receive-filtered-items="receiveFilteredItems"
                >
                </SearchAdminItem>
                <div v-for="(template, index) in state.filtered" :key="index" class="result-card">
                  <div class="row align-items-center">
                    <div class="col-10">
                      <MedicalTemplateSimpleName
                        :template="template"
                        :get-type-label="getTypeLabel"
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
                          <label class="form-label-modern">{{
                          $t('businessMedicalTemplatesAdmin.name')
                        }}</label>
                        <input
                          v-model="template.name"
                          type="text"
                            class="form-control-modern"
                          :disabled="!state.toggles['medical-templates.admin.update']"
                            placeholder=""
                        />
                      </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                          $t('businessMedicalTemplatesAdmin.type')
                        }}</label>
                        <select
                          v-model="template.type"
                            class="form-control-modern"
                          :disabled="!state.toggles['medical-templates.admin.update']"
                        >
                          <option
                            v-for="type in state.templateTypes"
                            :key="type.value"
                            :value="type.value"
                          >
                            {{ type.label }}
                          </option>
                        </select>
                      </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                          $t('businessMedicalTemplatesAdmin.description')
                        }}</label>
                        <input
                          v-model="template.description"
                          type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medical-templates.admin.update']"
                            placeholder=""
                          />
                        </div>
                        <div class="form-field-full-width">
                          <label class="form-label-modern">{{
                            $t('businessMedicalTemplatesAdmin.content')
                          }}</label>
                          <textarea
                            v-model="template.content"
                            class="form-control-modern form-control-full-width"
                            rows="8"
                            :disabled="!state.toggles['medical-templates.admin.update']"
                            placeholder=""
                          ></textarea>
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessMedicalTemplatesAdmin.scope')
                          }}</label>
                          <select
                            v-model="template.scope"
                            class="form-control-modern"
                            :disabled="!state.toggles['medical-templates.admin.update']"
                          >
                            <option
                              v-for="scope in state.templateScopes"
                              :key="scope.value"
                              :value="scope.value"
                            >
                              {{ scope.label }}
                            </option>
                          </select>
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessMedicalTemplatesAdmin.category')
                          }}</label>
                          <input
                            v-model="template.category"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medical-templates.admin.update']"
                            placeholder=""
                          />
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(template)"
                          :disabled="!state.toggles['medical-templates.admin.update']"
                        >
                          {{ $t('businessMedicalTemplatesAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['medical-templates.admin.delete']"
                        >
                          {{ $t('businessMedicalTemplatesAdmin.delete') }}
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          @actionYes="unavailable(template)"
                          @actionNo="unavailableCancel()"
                        >
                        </AreYouSure>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="(!isActiveBusiness() || !state.toggles['medical-templates.admin.view']) && !loading"
          >
            <Message
              :title="$t('businessMedicalTemplatesAdmin.message.1.title')"
              :content="$t('businessMedicalTemplatesAdmin.message.1.content')"
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
              :title="$t(`businessMedicalTemplatesAdmin.title`)"
              :toggles="state.toggles"
              component-name="businessMedicalTemplatesAdmin"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <div id="businessMedicalTemplatesAdmin">
          <div v-if="isActiveBusiness() && state.toggles['medical-templates.admin.view']">
            <div id="businessMedicalTemplatesAdmin-controls" class="control-box">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessMedicalTemplatesAdmin.message.4.title')"
                    :content="$t('businessMedicalTemplatesAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessMedicalTemplatesAdmin-result" class="mt-4">
              <div>
                <div v-if="commerce && state.templates.length === 0">
                  <Message
                    :title="$t('businessMedicalTemplatesAdmin.message.2.title')"
                    :content="$t('businessMedicalTemplatesAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd()"
                      data-bs-toggle="modal"
                      data-bs-target="#add-template"
                      :disabled="!state.toggles['medical-templates.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div v-if="commerce">
                  <SearchAdminItem
                    :business-items="state.templates"
                    :type="'templates'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(template, index) in state.filtered" :key="index" class="result-card">
                    <div class="row align-items-center">
                      <div class="col-10">
                        <MedicalTemplateSimpleName
                          :template="template"
                          :get-type-label="getTypeLabel"
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
                          <label class="form-label-modern">{{
                            $t('businessMedicalTemplatesAdmin.name')
                          }}</label>
                          <input
                            v-model="template.name"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medical-templates.admin.update']"
                            placeholder=""
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessMedicalTemplatesAdmin.type')
                          }}</label>
                          <select
                            v-model="template.type"
                            class="form-control-modern"
                            :disabled="!state.toggles['medical-templates.admin.update']"
                          >
                            <option
                              v-for="type in state.templateTypes"
                              :key="type.value"
                              :value="type.value"
                            >
                              {{ type.label }}
                            </option>
                          </select>
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessMedicalTemplatesAdmin.description')
                          }}</label>
                          <input
                            v-model="template.description"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medical-templates.admin.update']"
                            placeholder=""
                          />
                        </div>
                        <div class="form-field-full-width">
                          <label class="form-label-modern">{{
                          $t('businessMedicalTemplatesAdmin.content')
                        }}</label>
                        <textarea
                          v-model="template.content"
                            class="form-control-modern form-control-full-width"
                            rows="8"
                          :disabled="!state.toggles['medical-templates.admin.update']"
                            placeholder=""
                        ></textarea>
                      </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessMedicalTemplatesAdmin.scope')
                          }}</label>
                          <select
                            v-model="template.scope"
                            class="form-control-modern"
                            :disabled="!state.toggles['medical-templates.admin.update']"
                          >
                            <option
                              v-for="scope in state.templateScopes"
                              :key="scope.value"
                              :value="scope.value"
                            >
                              {{ scope.label }}
                            </option>
                          </select>
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">{{
                            $t('businessMedicalTemplatesAdmin.category')
                          }}</label>
                          <input
                            v-model="template.category"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medical-templates.admin.update']"
                            placeholder=""
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">Tags:</label>
                          <input
                            v-model="template.tags"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medical-templates.admin.update']"
                            placeholder="Separados por coma"
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">Variables:</label>
                          <input
                            v-model="template.variables"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medical-templates.admin.update']"
                            placeholder="{date}, {time}, {patientName}"
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">Favorito:</label>
                          <input
                            v-model="template.isFavorite"
                            type="checkbox"
                            class="form-check-input"
                            :disabled="!state.toggles['medical-templates.admin.update']"
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">Activo:</label>
                          <input
                            v-model="template.active"
                            type="checkbox"
                            class="form-check-input"
                            :disabled="!state.toggles['medical-templates.admin.update']"
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">Disponible:</label>
                          <input
                            v-model="template.available"
                            type="checkbox"
                            class="form-check-input"
                            :disabled="!state.toggles['medical-templates.admin.update']"
                          />
                        </div>
                      </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="update(template)"
                        :disabled="!state.toggles['medical-templates.admin.update']"
                      >
                        {{ $t('businessMedicalTemplatesAdmin.update') }} <i class="bi bi-save"></i>
                      </button>
                      <button
                        class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                        @click="goToUnavailable()"
                        v-if="state.toggles['medical-templates.admin.delete']"
                      >
                        {{ $t('businessMedicalTemplatesAdmin.delete') }}
                        <i class="bi bi-trash-fill"></i>
                      </button>
                      <AreYouSure
                        :show="state.goToUnavailable"
                        @actionYes="unavailable(template)"
                        @actionNo="unavailableCancel()"
                      >
                      </AreYouSure>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="(!isActiveBusiness() || !state.toggles['medical-templates.admin.view']) && !loading"
        >
          <Message
            :title="$t('businessMedicalTemplatesAdmin.message.1.title')"
            :content="$t('businessMedicalTemplatesAdmin.message.1.content')"
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
            ></button>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="false" :stack="alertError"></Alert>
            <div
              id="add-template"
              class="result-card mb-4"
              v-if="state.showAdd"
            >
              <div class="form-fields-container">
                <div class="form-group-modern">
                  <label class="form-label-modern">{{ $t('businessMedicalTemplatesAdmin.name') }} *</label>
                <input
                  v-model="state.newTemplate.name"
                  type="text"
                    class="form-control-modern"
                  :class="{ 'is-invalid': state.nameError }"
                    placeholder=""
                />
              </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">{{ $t('businessMedicalTemplatesAdmin.type') }} *</label>
                  <select v-model="state.newTemplate.type" class="form-control-modern">
                  <option v-for="type in state.templateTypes" :key="type.value" :value="type.value">
                    {{ type.label }}
                  </option>
                </select>
              </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">{{
                  $t('businessMedicalTemplatesAdmin.description')
                }}</label>
                  <input
                    v-model="state.newTemplate.description"
                    type="text"
                    class="form-control-modern"
                    placeholder=""
                  />
              </div>
                <div class="form-field-full-width">
                  <label class="form-label-modern">{{
                    $t('businessMedicalTemplatesAdmin.content')
                  }} *</label>
                <textarea
                  v-model="state.newTemplate.content"
                    class="form-control-modern form-control-full-width"
                    rows="10"
                    placeholder=""
                ></textarea>
                  <small class="form-help-text">
                  {{ $t('businessMedicalTemplatesAdmin.contentHelp') }}
                </small>
              </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">{{ $t('businessMedicalTemplatesAdmin.scope') }}</label>
                  <select v-model="state.newTemplate.scope" class="form-control-modern">
                  <option
                    v-for="scope in state.templateScopes"
                    :key="scope.value"
                    :value="scope.value"
                  >
                    {{ scope.label }}
                  </option>
                </select>
              </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">{{ $t('businessMedicalTemplatesAdmin.category') }}</label>
                  <input
                    v-model="state.newTemplate.category"
                    type="text"
                    class="form-control-modern"
                    placeholder=""
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">Tags:</label>
                  <input
                    v-model="state.newTemplate.tags"
                    type="text"
                    class="form-control-modern"
                    placeholder="Separados por coma"
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">Variables:</label>
                  <input
                    v-model="state.newTemplate.variables"
                    type="text"
                    class="form-control-modern"
                    placeholder="{date}, {time}, {patientName}"
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">Favorito:</label>
                  <input
                    v-model="state.newTemplate.isFavorite"
                    type="checkbox"
                    class="form-check-input"
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">Activo:</label>
                  <input
                    v-model="state.newTemplate.active"
                    type="checkbox"
                    class="form-check-input"
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">Disponible:</label>
                  <input
                    v-model="state.newTemplate.available"
                    type="checkbox"
                    class="form-check-input"
                  />
                </div>
            </div>
            <div class="row g-1 errors" v-if="state.errorsAdd && state.errorsAdd.length > 0">
              <Warning>
                <template v-slot:message>
                  <li v-for="(error, index) in state.errorsAdd" :key="index">
                    {{ $t(error) }}
                  </li>
                </template>
              </Warning>
            </div>
            <div class="col">
              <button
                class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                @click="add()"
              >
                {{ $t('businessMedicalTemplatesAdmin.add') }} <i class="bi bi-save"></i>
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
  </div>
</template>

<style scoped>
.errors {
  font-size: small;
  color: var(--rojo-warning);
}

/* Modern Form Styles */
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

/* Full-width field (label above, input below) */
.form-field-full-width {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.form-field-full-width .form-label-modern {
  min-width: auto;
  text-align: left;
}

.form-control-full-width {
  width: 100%;
  min-height: 200px;
  resize: vertical;
}

.form-help-text {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 0.25rem;
  line-height: 1.4;
  text-align: left;
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

  .desktop-header-row .desktop-commerce-logo #commerce-logo {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-header-row .desktop-commerce-logo #commerce-logo .logo {
    max-width: 120px !important;
    max-height: 100px !important;
    width: auto !important;
    height: auto !important;
    margin-bottom: 0 !important;
  }

  .desktop-header-row .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
    text-align: left;
  }
}
</style>


