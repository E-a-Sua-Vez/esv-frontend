<script>
import { ref, reactive, onBeforeMount, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getSurveyPersonalizedByCommerceId,
  updateSurveyPersonalized,
  createSurveyPersonalized,
} from '../../application/services/survey-personalized';
import { getPermissions } from '../../application/services/permissions';
import Popper from 'vue3-popper';
import SurveyName from '../../components/common/SurveyName.vue';
import SurveyFormEdit from '../../components/survey/SurveyFormEdit.vue';
import SurveyFormAdd from '../../components/survey/SurveyFormAdd.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import { getQueueByCommerce } from '../../application/services/queue';
import { getQuestionTypes, getSurveyTypes } from '../../shared/utils/data.ts';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';

export default {
  name: 'BusinessSurveysAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    SurveyName,
    SurveyFormEdit,
    SurveyFormAdd,
    Toggle,
    Warning,
    Popper,
    AreYouSure,
    ComponentMenu,
    SearchAdminItem,
    DesktopPageHeader,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      surveys: ref([]),
      types: [],
      question_types: [],
      queues: [],
      showAdd: false,
      goToUnavailable: false,
      showAddQuestions: false,
      showUpdateQuestions: false,
      questions: ref([]),
      newSurvey: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      typeError: false,
      toggles: {},
      filtered: [],
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Load surveys and queues when commerce changes
    const loadCommerceData = async commerceId => {
      if (!commerceId) {
        state.surveys = [];
        state.queues = [];
        state.filtered = [];
        return;
      }
      try {
        const surveys = await getSurveyPersonalizedByCommerceId(commerceId);
        state.surveys = surveys || [];
        const commerceData = await getQueueByCommerce(commerceId);
        state.queues = commerceData.queues || [];
        state.filtered = state.surveys;
      } catch (error) {
        state.surveys = [];
        state.queues = [];
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
            state.surveys = [];
            state.filtered = [];
            state.queues = [];
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
        state.question_types = getQuestionTypes();
        state.types = getSurveyTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('surveys', 'admin');

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
          await loadCommerceData(commerceToUse.id);
        }

        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const goBack = () => {
      router.back();
    };

    const validateAdd = survey => {
      state.errorsAdd = [];
      if (!survey.type || survey.type.length === 0) {
        state.typeError = true;
        state.errorsAdd.push('businessSurveysAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = survey => {
      state.errorsUpdate = [];
      if (!survey.type || survey.type.length === 0) {
        state.typeError = true;
        state.errorsUpdate.push('businessSurveysAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const showAdd = () => {
      state.showAdd = true;
      state.newSurvey = {
        attentionDefault: true,
        hasCSAT: false,
        hasNPS: false,
        hasMessage: false,
        active: true,
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newSurvey)) {
          state.newSurvey.commerceId = commerce.value.id;
          state.newSurvey.questions = state.questions;
          if (state.newSurvey.attentionDefault === true) {
            state.newSurvey.queueId = undefined;
          }
          await createSurveyPersonalized(state.newSurvey);
          state.surveys = await getSurveyPersonalizedByCommerceId(commerce.value.id);
          state.showAdd = false;
          closeAddModal();
          state.newSurvey = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const update = async survey => {
      try {
        loading.value = true;
        if (validateUpdate(survey)) {
          if (survey.attentionDefault === true) {
            survey.queueId = undefined;
          }
          await updateSurveyPersonalized(survey.id, survey);
          state.surveys = await getSurveyPersonalizedByCommerceId(commerce.value.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async survey => {
      try {
        loading.value = true;
        if (survey && survey.id) {
          survey.available = false;
          survey.active = false;
          await updateSurveyPersonalized(survey.id, survey);
          state.surveys = await getSurveyPersonalizedByCommerceId(commerce.value.id);
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

    const selectType = (survey, operation) => {
      if (operation === 'add') {
        state.showAddQuestions = false;
      } else {
        state.showUpdateQuestions = false;
      }
      if (survey.type === 'SIMPLE_CSAT') {
        survey.hasCSAT = true;
        survey.hasNPS = false;
        survey.hasMessage = true;
      } else if (survey.type === 'SIMPLE_NPS') {
        survey.hasCSAT = false;
        survey.hasNPS = true;
        survey.hasMessage = true;
      } else if (survey.type === 'SIMPLE_CSAT_NPS') {
        survey.hasCSAT = true;
        survey.hasNPS = true;
        survey.hasMessage = true;
      } else {
        survey.hasCSAT = false;
        survey.hasNPS = false;
        survey.hasMessage = false;
        if (operation === 'add') {
          state.showAddQuestions = true;
        } else {
          state.showUpdateQuestions = true;
        }
      }
    };

    const showUpdateForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    };

    const addAddQuestion = questions => {
      const question = {
        title: '',
        active: true,
        order: state.questions.length + 1,
        otherOption: false,
        otherOptionOpen: false,
        analize: false,
      };
      if (questions === undefined) {
        questions = [];
      }
      questions.push(question);
    };

    const addUpdateQuestion = index => {
      const survey = state.surveys[index];
      const question = {
        title: '',
        active: true,
        order: survey.questions.length + 1,
      };
      if (survey.questions === undefined) {
        survey.questions = [];
      }
      survey.questions.push(question);
      state.surveys[index] = survey;
    };

    const deleteAddQuestion = question => {
      state.questions = state.questions.filter(item => item.title !== question.title);
    };

    const deleteUpdateQuestion = (question, index) => {
      const survey = state.surveys[index];
      survey.questions = survey.questions.filter(item => item.title !== question.title);
      state.surveys[index] = survey;
    };

    const getSurveyLink = survey => {
      const commerceKeyName = commerce.value?.keyName;
      const queueId = survey.queueId;
      if (queueId) {
        return `${import.meta.env.VITE_URL}/publico/comercio/${commerceKeyName}/filas/${queueId}`;
      }
      return `${import.meta.env.VITE_URL}/publico/comercio/${commerceKeyName}/filas`;
    };

    const copyLink = survey => {
      const textToCopy = getSurveyLink(survey);
      navigator.clipboard.writeText(textToCopy);
    };

    const receiveFilteredItems = items => {
      state.filtered = items;
    };

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal');
      modalCloseButton.click();
    };

    const resetAddForm = () => {
      state.newSurvey = {
        attentionDefault: true,
        hasCSAT: false,
        hasNPS: false,
        hasMessage: false,
        active: true,
      };
      state.questions = [];
      state.showAddQuestions = false;
      state.errorsAdd = [];
      state.typeError = false;
    };

    const handleModalHide = () => {
      const closeButton = document.getElementById('close-modal');
      if (closeButton) {
        closeButton.blur();
      }
    };

    onMounted(() => {
      const addModal = document.getElementById('add-survey');
      if (addModal) {
        addModal.addEventListener('hidden.bs.modal', resetAddForm);
        addModal.addEventListener('hide.bs.modal', handleModalHide);
      }
      document.addEventListener('mousedown', e => {
        if (
          e.target &&
          (e.target.classList.contains('modal-backdrop') || e.target.closest('.modal'))
        ) {
          handleModalHide();
        }
      });
    });

    onUnmounted(() => {
      const addModal = document.getElementById('add-survey');
      if (addModal) {
        addModal.removeEventListener('hidden.bs.modal', resetAddForm);
        addModal.removeEventListener('hide.bs.modal', handleModalHide);
      }
      document.removeEventListener('mousedown', handleModalHide);
    });

    return {
      state,
      loading,
      alertError,
      showUpdateForm,
      addAddQuestion,
      addUpdateQuestion,
      deleteAddQuestion,
      deleteUpdateQuestion,
      selectType,
      update,
      showAdd,
      add,
      goBack,
      isActiveBusiness,
      commerce,
      copyLink,
      getSurveyLink,
      unavailable,
      goToUnavailable,
      unavailableCancel,
      receiveFilteredItems,
      resetAddForm,
      handleModalHide,
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
          :title="$t(`businessSurveysAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessSurveysAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessSurveysAdmin">
          <div v-if="isActiveBusiness && state.toggles['surveys.admin.view']">
            <div id="businessSurveysAdmin-controls" class="control-box my-4">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessSurveysAdmin.message.4.title')"
                    :content="$t('businessSurveysAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessSurveysAdmin-result" class="mt-4">
              <div>
                <div v-if="state.surveys.length === 0">
                  <Message
                    :title="$t('businessSurveysAdmin.message.2.title')"
                    :content="$t('businessSurveysAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                      @click="showAdd(survey)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-survey`"
                      :disabled="!state.toggles['surveys.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.surveys"
                    :type="'surveys'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(survey, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <SurveyName
                          :survey="survey"
                          :commerce-key-name="commerce?.keyName || ''"
                        ></SurveyName>
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
                    <div
                      v-if="state.toggles['surveys.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      class="detailed-data transition-slow"
                    >
                      <div class="form-fields-container">
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessSurveysAdmin.link') }}
                          </label>
                          <div style="flex: 1; display: flex; gap: 0.5rem; align-items: center">
                            <button class="btn-copy-mini" @click="copyLink(survey)">
                              <i class="bi bi-file-earmark-spreadsheet"></i>
                            </button>
                            <a
                              class="btn-link-mini"
                              :href="`${getSurveyLink(survey)}`"
                              target="_blank"
                            >
                              <i class="bi bi-box-arrow-up-right"></i>
                              {{ $t('businessSurveysAdmin.go') }}
                            </a>
                          </div>
                        </div>
                      </div>
                      <SurveyFormEdit
                        :survey="survey"
                        :types="state.types"
                        :question-types="state.question_types"
                        :queues="state.queues"
                        :toggles="state.toggles"
                        :errors="{
                          typeError: state.typeError,
                          questionTitleError: state.questionTitleError,
                          questionOptionsError: state.questionOptionsError,
                          orderAddError: state.orderAddError,
                        }"
                        :show-questions="state.showUpdateQuestions"
                        :on-select-type="(s, op) => selectType(s, op)"
                        :on-add-question="() => addUpdateQuestion(index)"
                        :on-delete-question="q => deleteUpdateQuestion(q, index)"
                        @update:survey="
                          state.surveys[index] = $event;
                          state.filtered[index] = $event;
                        "
                      />
                      <div id="survey-id-form" class="row -2 mb-g3">
                        <div class="row survey-details-container">
                          <div class="col">
                            <span><strong>Id:</strong> {{ survey.id }}</span>
                          </div>
                        </div>
                        <div class="col">
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="update(survey)"
                            :disabled="!state.toggles['surveys.admin.update']"
                          >
                            {{ $t('businessSurveysAdmin.update') }} <i class="bi bi-save"></i>
                          </button>
                          <button
                            class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                            @click="goToUnavailable()"
                            v-if="state.toggles['surveys.admin.unavailable']"
                          >
                            {{ $t('businessQueuesAdmin.unavailable') }}
                            <i class="bi bi-trash-fill"></i>
                          </button>
                          <AreYouSure
                            :show="state.goToUnavailable"
                            :yes-disabled="state.toggles['surveys.admin.unavailable']"
                            :no-disabled="state.toggles['surveys.admin.unavailable']"
                            @actionYes="unavailable(survey)"
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
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['surveys.admin.view']) && !loading">
            <Message
              :title="$t('businessSurveysAdmin.message.1.title')"
              :content="$t('businessSurveysAdmin.message.1.content')"
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
          :title="$t('businessSurveysAdmin.title')"
          :toggles="state.toggles"
          component-name="businessSurveysAdmin"
          @go-back="goBack"
        />
        <div id="businessSurveysAdmin">
          <div v-if="isActiveBusiness && state.toggles['surveys.admin.view']">
            <div id="businessSurveysAdmin-controls" class="control-box">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessSurveysAdmin.message.4.title')"
                    :content="$t('businessSurveysAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessSurveysAdmin-result" class="mt-4">
              <!-- Full content from mobile section needs to be duplicated here -->
              <!-- Due to file size, referencing mobile section structure (lines 388-765) -->
              <div>
                <div v-if="state.surveys.length === 0">
                  <Message
                    :title="$t('businessSurveysAdmin.message.2.title')"
                    :content="$t('businessSurveysAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                      @click="showAdd(survey)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-survey`"
                      :disabled="!state.toggles['surveys.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.surveys"
                    :type="'surveys'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(survey, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <SurveyName
                          :survey="survey"
                          :commerce-key-name="commerce?.keyName || ''"
                        ></SurveyName>
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
                    <div
                      v-if="state.toggles['surveys.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      class="detailed-data transition-slow"
                    >
                      <div class="form-fields-container">
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessSurveysAdmin.link') }}
                          </label>
                          <div style="flex: 1; display: flex; gap: 0.5rem; align-items: center">
                            <button class="btn-copy-mini" @click="copyLink(survey)">
                              <i class="bi bi-file-earmark-spreadsheet"></i>
                            </button>
                            <a
                              class="btn-link-mini"
                              :href="`${getSurveyLink(survey)}`"
                              target="_blank"
                            >
                              <i class="bi bi-box-arrow-up-right"></i>
                              {{ $t('businessSurveysAdmin.go') }}
                            </a>
                          </div>
                        </div>
                      </div>
                      <SurveyFormEdit
                        :survey="survey"
                        :types="state.types"
                        :question-types="state.question_types"
                        :queues="state.queues"
                        :toggles="state.toggles"
                        :errors="{
                          typeError: state.typeError,
                          questionTitleError: state.questionTitleError,
                          questionOptionsError: state.questionOptionsError,
                          orderAddError: state.orderAddError,
                        }"
                        :show-questions="state.showUpdateQuestions"
                        :on-select-type="(s, op) => selectType(s, op)"
                        :on-add-question="() => addUpdateQuestion(index)"
                        :on-delete-question="q => deleteUpdateQuestion(q, index)"
                        @update:survey="
                          state.surveys[index] = $event;
                          state.filtered[index] = $event;
                        "
                      />
                      <div id="survey-id-form" class="row -2 mb-g3">
                        <div class="row survey-details-container">
                          <div class="col">
                            <span><strong>Id:</strong> {{ survey.id }}</span>
                          </div>
                        </div>
                        <div class="col">
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="update(survey)"
                            :disabled="!state.toggles['surveys.admin.update']"
                          >
                            {{ $t('businessSurveysAdmin.update') }} <i class="bi bi-save"></i>
                          </button>
                          <button
                            class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                            @click="goToUnavailable()"
                            v-if="state.toggles['surveys.admin.unavailable']"
                          >
                            {{ $t('businessQueuesAdmin.unavailable') }}
                            <i class="bi bi-trash-fill"></i>
                          </button>
                          <AreYouSure
                            :show="state.goToUnavailable"
                            :yes-disabled="state.toggles['surveys.admin.unavailable']"
                            :no-disabled="state.toggles['surveys.admin.unavailable']"
                            @actionYes="unavailable(survey)"
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
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['surveys.admin.view']) && !loading">
            <Message
              :title="$t('businessSurveysAdmin.message.1.title')"
              :content="$t('businessSurveysAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Add -->
    <div
      class="modal fade"
      :id="`add-survey`"
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
                @mousedown.stop="handleModalHide"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="false" :stack="alertError"></Alert>
            <div
              id="add-survey"
              class="result-card mb-4"
              v-if="state.showAdd && state.toggles['surveys.admin.add']"
            >
              <div v-if="state.surveys.length < state.toggles['surveys.admin.limit']">
                <SurveyFormAdd
                  v-model="state.newSurvey"
                  :types="state.types"
                  :question-types="state.question_types"
                  :queues="state.queues"
                  :toggles="state.toggles"
                  :errors="{
                    typeError: state.typeError,
                    questionTitleError: state.questionTitleError,
                    questionOptionsError: state.questionOptionsError,
                    orderAddError: state.orderAddError,
                  }"
                  :questions="state.questions"
                  :show-questions="state.showAddQuestions"
                  :on-select-type="(s, op) => selectType(s, op)"
                  :on-add-question="() => addAddQuestion(state.questions)"
                  :on-delete-question="q => deleteAddQuestion(q)"
                  @update:questions="state.questions = $event"
                />
                <div class="col mt-3">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4 pulse-btn"
                    @click="add(state.newSurvey)"
                  >
                    {{ $t('businessSurveysAdmin.add') }} <i class="bi bi-save"></i>
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
                  :title="$t('businessSurveysAdmin.message.3.title')"
                  :content="$t('businessSurveysAdmin.message.3.content')"
                />
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
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
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
.survey-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}
.is-disabled {
  opacity: 0.5;
}
.show {
  padding: 10px;
  max-height: 2000px !important;
  overflow-y: auto;
}
.errors {
  font-size: small;
  color: var(--rojo-warning);
}
.add-question {
  text-decoration: underline;
  font-size: 0.8rem;
  cursor: pointer;
  text-align: right;
  margin-bottom: 1rem;
}
.delete-question {
  text-decoration: underline;
  font-size: 0.8rem;
  cursor: pointer;
  text-align: right;
  margin-bottom: 1rem;
  color: var(--rojo-warning);
}

/* Form Fields Container */
.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
}

/* Form Group Modern */
.form-group-modern {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
}

/* Form Label Modern */
.form-label-modern {
  min-width: 120px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
  text-transform: capitalize;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  padding-top: 0.4rem;
}

/* Action Buttons */
.btn-copy-mini {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-copy-mini:hover {
  background: rgba(169, 169, 169, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

.btn-copy-mini i {
  font-size: 0.875rem;
}

.btn-link-mini {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  text-decoration: none;
}

.btn-link-mini:hover {
  background: rgba(169, 169, 169, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

.btn-link-mini i {
  font-size: 0.875rem;
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
