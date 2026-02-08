<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getMedicalExamByCommerce,
  createMedicalExam,
  updateMedicalExam,
  deleteMedicalExam,
} from '../../application/services/medical-exam';
import { getPermissions } from '../../application/services/permissions';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import MedicalExamSimpleName from '../../components/common/MedicalExamSimpleName.vue';
import Popper from 'vue3-popper';

export default {
  name: 'BusinessMedicalExamsAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    Warning,
    AreYouSure,
    ComponentMenu,
    DesktopPageHeader,
    SearchAdminItem,
    MedicalExamSimpleName,
    Popper,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    // ✅ Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    const state = reactive({
      currentUser: {},
      business: {},
      exams: ref([]),
      showAdd: false,
      goToUnavailable: false,
      newExam: {
        name: '',
        code: '',
        type: 'laboratory',
        category: '',
        description: '',
        preparation: '',
        estimatedDuration: null,
        cost: null,
        active: true,
        available: true,
      },
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      toggles: {},
      filtered: [],
    });

    // ✅ Load exams when commerce changes
    const loadExams = async commerceId => {
      if (!commerceId) {
        state.exams = [];
        state.filtered = [];
        return;
      }
      try {
        loading.value = true;
        const exams = await getMedicalExamByCommerce(commerceId);
        state.exams = exams || [];
        state.filtered = state.exams;
        loading.value = false;
      } catch (error) {
        state.exams = [];
        state.filtered = [];
        loading.value = false;
      }
    };

    // ✅ Watch for commerce changes and reload exams
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            state.exams = [];
            state.filtered = [];
            await loadExams(newCommerce.id);
          } catch (error) {
            state.exams = [];
            state.filtered = [];
            loading.value = false;
          }
        } else if (!newCommerce || !newCommerce.id) {
          state.exams = [];
          state.filtered = [];
        }
      },
      { immediate: true },
    );

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('medical-exams', 'admin');

        // ✅ Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // ✅ Load exams for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadExams(commerceToUse.id);
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

    const validateAdd = exam => {
      state.errorsAdd = [];
      if (!exam.name || exam.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessMedicalExamsAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!exam.type || exam.type.length === 0) {
        state.errorsAdd.push('businessMedicalExamsAdmin.validate.type');
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const showAdd = () => {
      state.showAdd = true;
      state.newExam = {
        name: '',
        code: '',
        type: 'laboratory',
        category: '',
        description: '',
        preparation: '',
        estimatedDuration: null,
        cost: null,
        active: true,
        available: true,
      };
    };

    const closeAddModal = () => {
      const closeButton = document.getElementById('close-modal');
      if (closeButton) {
        closeButton.click();
      }
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newExam)) {
          if (commerce.value && commerce.value.id) {
            state.newExam.commerceId = commerce.value.id; // ✅ Asignación de commerceId
          }
          await createMedicalExam(state.newExam);
          await loadExams(commerce.value?.id); // ✅ Recargar con commerceId
          state.showAdd = false;
          closeAddModal();
          state.newExam = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const update = async exam => {
      try {
        loading.value = true;
        await updateMedicalExam(exam.id, exam);
        if (commerce.value && commerce.value.id) {
          await loadExams(commerce.value.id); // ✅ Recargar con commerceId
        }
        state.extendedEntity = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async exam => {
      try {
        loading.value = true;
        if (exam && exam.id) {
          await deleteMedicalExam(exam.id);
          if (commerce.value && commerce.value.id) {
            await loadExams(commerce.value.id); // ✅ Recargar con commerceId
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

    const copyIdToClipboard = async id => {
      if (!id) return;
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(id);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = id;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      } catch (e) {
        // silent fallback
      }
    };

    const showUpdateForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    };

    const receiveFilteredItems = items => {
      state.filtered = items;
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
      unavailable,
      commerce, // ✅ Export commerce
      goToUnavailable,
      unavailableCancel,
      receiveFilteredItems,
      copyIdToClipboard,
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
          :src="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessMedicalExamsAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessMedicalExamsAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessMedicalExamsAdmin">
          <div v-if="isActiveBusiness && state.toggles['medical-exams.admin.view']">
            <div class="control-box my-4"></div>
            <div v-if="!loading" id="businessMedicalExamsAdmin-result" class="mt-4">
              <div>
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessMedicalExamsAdmin.message.4.title')"
                    :content="$t('businessMedicalExamsAdmin.message.4.content')"
                  />
                </div>
                <div v-if="commerce && state.exams.length === 0">
                  <Message
                    :title="$t('businessMedicalExamsAdmin.message.2.title')"
                    :content="$t('businessMedicalExamsAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                      @click="showAdd()"
                      data-bs-toggle="modal"
                      data-bs-target="#add-exam"
                      :disabled="!state.toggles['medical-exams.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div v-if="commerce">
                  <SearchAdminItem
                    :business-items="state.exams"
                    :type="'exams'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(exam, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <MedicalExamSimpleName :exam="exam"></MedicalExamSimpleName>
                      </div>
                      <div class="col-2">
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
                      <div id="medical-exam-id-form" class="row mb-1">
                        <div class="col">
                          <span><strong>Id:</strong> {{ exam.id }}</span>
                          <button
                            type="button"
                            class="btn btn-link btn-sm p-0 ms-2 align-baseline"
                            @click="copyIdToClipboard(exam.id)"
                            :title="$t('copy') || 'Copiar Id'"
                          >
                            <i class="bi bi-clipboard"></i>
                          </button>
                        </div>
                      </div>
                      <div class="form-fields-container">
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicalExamsAdmin.name') }}
                            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
                              <template #content>
                                <div>{{ $t('businessMedicalExamsAdmin.nameHelp') }}</div>
                              </template>
                              <i class="bi bi-info-circle-fill form-help-icon"></i>
                            </Popper>
                          </label>
                          <input
                            v-model="exam.name"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medical-exams.admin.update']"
                            placeholder=""
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicalExamsAdmin.type') }}
                            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
                              <template #content>
                                <div>{{ $t('businessMedicalExamsAdmin.typeHelp') }}</div>
                              </template>
                              <i class="bi bi-info-circle-fill form-help-icon"></i>
                            </Popper>
                          </label>
                          <select
                            v-model="exam.type"
                            class="form-control-modern"
                            :disabled="!state.toggles['medical-exams.admin.update']"
                          >
                            <option value="laboratory">Laboratorio</option>
                            <option value="imaging">Imagenología</option>
                            <option value="procedure">Procedimiento</option>
                            <option value="other">Otro</option>
                          </select>
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicalExamsAdmin.description') }}
                            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
                              <template #content>
                                <div>{{ $t('businessMedicalExamsAdmin.descriptionHelp') }}</div>
                              </template>
                              <i class="bi bi-info-circle-fill form-help-icon"></i>
                            </Popper>
                          </label>
                          <textarea
                            v-model="exam.description"
                            class="form-control-modern"
                            rows="3"
                            :disabled="!state.toggles['medical-exams.admin.update']"
                            placeholder=""
                          ></textarea>
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicalExamsAdmin.preparation') }}
                            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
                              <template #content>
                                <div>{{ $t('businessMedicalExamsAdmin.preparationHelp') }}</div>
                              </template>
                              <i class="bi bi-info-circle-fill form-help-icon"></i>
                            </Popper>
                          </label>
                          <textarea
                            v-model="exam.preparation"
                            class="form-control-modern"
                            rows="3"
                            :disabled="!state.toggles['medical-exams.admin.update']"
                            placeholder=""
                          ></textarea>
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4 pulse-btn"
                          @click="update(exam)"
                          :disabled="!state.toggles['medical-exams.admin.update']"
                        >
                          {{ $t('businessMedicalExamsAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['medical-exams.admin.delete']"
                        >
                          {{ $t('businessMedicalExamsAdmin.delete') }}
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          @actionYes="unavailable(exam)"
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
            v-if="(!isActiveBusiness() || !state.toggles['medical-exams.admin.view']) && !loading"
          >
            <Message
              :title="$t('businessMedicalExamsAdmin.message.1.title')"
              :content="$t('businessMedicalExamsAdmin.message.1.content')"
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
          :logo="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('businessMedicalExamsAdmin.title')"
          :toggles="state.toggles"
          component-name="businessMedicalExamsAdmin"
          @go-back="goBack"
        />
        <div id="businessMedicalExamsAdmin">
          <div v-if="isActiveBusiness && state.toggles['medical-exams.admin.view']">
            <div id="businessMedicalExamsAdmin-controls" class="control-box">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessMedicalExamsAdmin.message.4.title')"
                    :content="$t('businessMedicalExamsAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessMedicalExamsAdmin-result" class="mt-4">
              <div>
                <div v-if="commerce && state.exams.length === 0">
                  <Message
                    :title="$t('businessMedicalExamsAdmin.message.2.title')"
                    :content="$t('businessMedicalExamsAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                      @click="showAdd()"
                      data-bs-toggle="modal"
                      data-bs-target="#add-exam"
                      :disabled="!state.toggles['medical-exams.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div v-if="commerce">
                  <SearchAdminItem
                    :business-items="state.exams"
                    :type="'exams'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(exam, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <MedicalExamSimpleName :exam="exam"></MedicalExamSimpleName>
                      </div>
                      <div class="col-2">
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
                          <label class="form-label-modern">
                            {{ $t('businessMedicalExamsAdmin.name') }}
                            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
                              <template #content>
                                <div>{{ $t('businessMedicalExamsAdmin.nameHelp') }}</div>
                              </template>
                              <i class="bi bi-info-circle-fill form-help-icon"></i>
                            </Popper>
                          </label>
                          <input
                            v-model="exam.name"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medical-exams.admin.update']"
                            placeholder=""
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicalExamsAdmin.type') }}
                            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
                              <template #content>
                                <div>{{ $t('businessMedicalExamsAdmin.typeHelp') }}</div>
                              </template>
                              <i class="bi bi-info-circle-fill form-help-icon"></i>
                            </Popper>
                          </label>
                          <select
                            v-model="exam.type"
                            class="form-control-modern"
                            :disabled="!state.toggles['medical-exams.admin.update']"
                          >
                            <option value="laboratory">Laboratorio</option>
                            <option value="imaging">Imagenología</option>
                            <option value="procedure">Procedimiento</option>
                            <option value="other">Otro</option>
                          </select>
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicalExamsAdmin.description') }}
                            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
                              <template #content>
                                <div>{{ $t('businessMedicalExamsAdmin.descriptionHelp') }}</div>
                              </template>
                              <i class="bi bi-info-circle-fill form-help-icon"></i>
                            </Popper>
                          </label>
                          <textarea
                            v-model="exam.description"
                            class="form-control-modern"
                            rows="3"
                            :disabled="!state.toggles['medical-exams.admin.update']"
                            placeholder=""
                          ></textarea>
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicalExamsAdmin.preparation') }}
                            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
                              <template #content>
                                <div>{{ $t('businessMedicalExamsAdmin.preparationHelp') }}</div>
                              </template>
                              <i class="bi bi-info-circle-fill form-help-icon"></i>
                            </Popper>
                          </label>
                          <textarea
                            v-model="exam.preparation"
                            class="form-control-modern"
                            rows="3"
                            :disabled="!state.toggles['medical-exams.admin.update']"
                            placeholder=""
                          ></textarea>
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4 pulse-btn"
                          @click="update(exam)"
                          :disabled="!state.toggles['medical-exams.admin.update']"
                        >
                          {{ $t('businessMedicalExamsAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['medical-exams.admin.delete']"
                        >
                          {{ $t('businessMedicalExamsAdmin.delete') }}
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          @actionYes="unavailable(exam)"
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
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['medical-exams.admin.view']) && !loading">
          <Message
            :title="$t('businessMedicalExamsAdmin.message.1.title')"
            :content="$t('businessMedicalExamsAdmin.message.1.content')"
          />
        </div>
      </div>
    </div>

    <!-- Modal Add -->
    <div
      class="modal fade"
      id="add-exam"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 active-name modern-modal-header">
            <div class="modern-modal-header-inner">
              <div class="modern-modal-icon-wrapper">
                <i class="bi bi-plus-lg"></i>
              </div>
              <div class="modern-modal-title-wrapper">
                <h5 class="modal-title fw-bold modern-modal-title">{{ $t('add') }}</h5>
              </div>
              <button
                id="close-modal"
                class="modern-modal-close-btn"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="false" :stack="alertError"></Alert>
            <div id="add-exam" class="result-card mb-4" v-if="state.showAdd">
              <div class="form-fields-container">
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessMedicalExamsAdmin.name') }} *
                    <Popper :class="'dark p-1'" arrow :disable-click-away="false">
                      <template #content>
                        <div>{{ $t('businessMedicalExamsAdmin.nameHelp') }}</div>
                      </template>
                      <i class="bi bi-info-circle-fill form-help-icon"></i>
                    </Popper>
                  </label>
                  <input
                    v-model="state.newExam.name"
                    type="text"
                    class="form-control-modern"
                    :class="{ 'is-invalid': state.nameError }"
                    placeholder=""
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessMedicalExamsAdmin.type') }} *
                    <Popper :class="'dark p-1'" arrow :disable-click-away="false">
                      <template #content>
                        <div>{{ $t('businessMedicalExamsAdmin.typeHelp') }}</div>
                      </template>
                      <i class="bi bi-info-circle-fill form-help-icon"></i>
                    </Popper>
                  </label>
                  <select v-model="state.newExam.type" class="form-control-modern">
                    <option value="laboratory">Laboratorio</option>
                    <option value="imaging">Imagenología</option>
                    <option value="procedure">Procedimiento</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessMedicalExamsAdmin.description') }}
                    <Popper :class="'dark p-1'" arrow :disable-click-away="false">
                      <template #content>
                        <div>{{ $t('businessMedicalExamsAdmin.descriptionHelp') }}</div>
                      </template>
                      <i class="bi bi-info-circle-fill form-help-icon"></i>
                    </Popper>
                  </label>
                  <textarea
                    v-model="state.newExam.description"
                    class="form-control-modern"
                    rows="3"
                    placeholder=""
                  ></textarea>
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessMedicalExamsAdmin.preparation') }}
                    <Popper :class="'dark p-1'" arrow :disable-click-away="false">
                      <template #content>
                        <div>{{ $t('businessMedicalExamsAdmin.preparationHelp') }}</div>
                      </template>
                      <i class="bi bi-info-circle-fill form-help-icon"></i>
                    </Popper>
                  </label>
                  <textarea
                    v-model="state.newExam.preparation"
                    class="form-control-modern"
                    rows="3"
                    placeholder=""
                  ></textarea>
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
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4 pulse-btn"
                  @click="add()"
                >
                  {{ $t('businessMedicalExamsAdmin.add') }} <i class="bi bi-save"></i>
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

.form-help-icon {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.4);
  cursor: help;
}

.form-control-modern.is-invalid {
  border-color: rgba(220, 53, 69, 0.5);
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.1);
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

/* Modern Modal Header Styles */
.modern-modal-header {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 1rem 1rem 0 0;
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

.modern-modal-client-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
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
  font-size: 1rem;
  color: #ffffff;
  line-height: 1;
}

.modern-modal-close-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.25);
}
</style>
