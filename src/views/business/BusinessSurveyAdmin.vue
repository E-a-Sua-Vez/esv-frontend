<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getSurveyPersonalizedByCommerceId, updateSurveyPersonalized, createSurveyPersonalized } from '../../application/services/survey-personalized';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import SurveyName from '../../components/common/SurveyName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import Popper from "vue3-popper";
import { getQueueByCommerce } from '../../application/services/queue';
import { getQuestionTypes, getSurveyTypes } from '../../shared/utils/data';
import AreYouSure from '../../components/common/AreYouSure.vue';

export default {
  name: 'BusinessSurveysAdmin',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, SurveyName, Toggle, ToggleCapabilities, Warning, Popper, AreYouSure },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      commerces: ref({}),
      surveys: ref({}),
      types: [],
      question_types: [],
      commerce: {},
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
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.question_types = getQuestionTypes();
        state.types = getSurveyTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        if (state.commerce) {
          const surveys = await getSurveyPersonalizedByCommerceId(state.commerce.id);
          state.surveys = surveys;
          const commerce = await getQueueByCommerce(state.commerce.id);
          state.queues = commerce.queues;
        }
        state.toggles = await getPermissions('surveys', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    })

    const isActiveBusiness = () => {
      return state.business && state.business.active === true;
    };

    const goBack = () => {
      router.back();
    }

    const validateAdd = (survey) => {
      state.errorsAdd = [];
      if(!survey.type || survey.type.length === 0) {
        state.typeError = true;
        state.errorsAdd.push('businessSurveysAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const validateUpdate = (survey) => {
      state.errorsUpdate = [];
      if(!survey.type || survey.type.length === 0) {
        state.typeError = true;
        state.errorsUpdate.push('businessSurveysAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if(state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    }

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      state.newSurvey = {
        attentionDefault: true,
        hasCSAT: false,
        hasNPS: false,
        hasMessage: false
      }
    }

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newSurvey)) {
          state.newSurvey.commerceId = state.commerce.id;
          state.newSurvey.questions = state.questions;
          if (state.newSurvey.attentionDefault === true) {
            state.newSurvey.queueId = undefined;
          }
          await createSurveyPersonalized(state.newSurvey);
          const surveys = await getSurveyPersonalizedByCommerceId(state.commerce.id);
          state.surveys = surveys;
          state.showAdd = false;
          state.newSurvey = {}
        }
        state.extendedEntity = undefined;
        showAdd();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const update = async (survey) => {
      try {
        loading.value = true;
        if (validateUpdate(survey)) {
          if (survey.attentionDefault === true) {
            survey.queueId = undefined;
          }
          await updateSurveyPersonalized(survey.id, survey);
          const surveys = await getSurveyPersonalizedByCommerceId(state.commerce.id);
          state.surveys = surveys;
        }
        state.extendedEntity = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const unavailable = async (survey) => {
      try {
        loading.value = true;
        if (survey && survey.id) {
          survey.available = false;
          survey.active = false;
          await updateSurveyPersonalized(survey.id, survey);
          const surveys = await getSurveyPersonalizedByCommerceId(state.commerce.id);
          state.surveys = surveys;
          state.extendedEntity = undefined;
          state.goToUnavailable = false;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const goToUnavailable = () => {
      state.goToUnavailable = !state.goToUnavailable;
    }

    const unavailableCancel = () => {
      state.goToUnavailable = false;
    }

    const selectCommerce = async (commerce) => {
      try {
        loading.value = true;
        state.commerce = commerce;
        const surveys = await getSurveyPersonalizedByCommerceId(state.commerce.id);
        state.surveys = surveys;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

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
      } else if (survey.type === 'SIMPLE_CSAT_NPS'){
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
    }

    const showUpdateForm = (index) => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    }

    const addAddQuestion = (questions) => {
      const question = {
        title: '',
        active: true,
        order: state.questions.length + 1,
        otherOption: false,
        otherOptionOpen: false,
        analize: false
      }
      if (questions === undefined) {
        questions = [];
      }
      questions.push(question);
    }

    const addUpdateQuestion = (index) => {
      const survey = state.surveys[index];
      const question = {
        title: '',
        active: true,
        order: survey.questions.length + 1
      }
      if (survey.questions === undefined) {
        survey.questions = [];
      }
      survey.questions.push(question);
      state.surveys[index] = survey;
    }

    const deleteAddQuestion = (question) => {
      state.questions = state.questions.filter(item => item.title !== question.title);
    }

    const deleteUpdateQuestion = (question, index) => {
      const survey = state.surveys[index];
      survey.questions = survey.questions.filter(item => item.title !== question.title);
      state.surveys[index] = survey;
    }

    const getSurveyLink = (survey) => {
      const commerceKeyName = state.commerce.keyName;
      const queueId = survey.queueId;
      if (queueId) {
        return `${import.meta.env.VITE_URL}/publico/comercio/${commerceKeyName}/filas/${queueId}`;
      }
      return `${import.meta.env.VITE_URL}/publico/comercio/${commerceKeyName}/filas`;
    }

    const copyLink = (survey) => {
      const textToCopy = getSurveyLink(survey);
      navigator.clipboard.writeText(textToCopy);
    }

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
      selectCommerce,
      copyLink,
      getSurveyLink,
      unavailable,
      goToUnavailable,
      unavailableCancel
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <div class="col">
        <a class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4" @click="goBack()"> {{ $t("businessSurveysAdmin.return") }} <i class="bi bi-arrow-left"></i></a>
      </div>
      <div id="page-header" class="text-center mt-4">
        <span class="welcome-user">{{ $t("businessSurveysAdmin.title") }}</span>
        <ToggleCapabilities
          :toggles="state.toggles"
          componentName="businessSurveysAdmin"
        ></ToggleCapabilities>
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessSurveysAdmin">
        <div v-if="isActiveBusiness && state.toggles['surveys.admin.view']">
          <div id="businessSurveysAdmin-controls" class="control-box">
            <div class="row">
              <div class="col" v-if="state.commerces.length > 0">
                <span>{{ $t("businessSurveysAdmin.commerce") }} </span>
                <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="modules">
                  <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                </select>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessSurveysAdmin.message.4.title')"
                  :content="$t('businessSurveysAdmin.message.4.content')" />
              </div>
            </div>
          </div>
          <div v-if="!loading" id="businessSurveysAdmin-result" class="mt-4">
            <div>
              <div v-if="state.surveys.length === 0">
                <Message
                  :title="$t('businessSurveysAdmin.message.2.title')"
                  :content="$t('businessSurveysAdmin.message.2.content')" />
              </div>
              <div v-if="state.commerce" class="row mb-2">
                <div class="col-8 text-labe">
                  <span>{{ $t("businessSurveysAdmin.listResult") }}</span>
                  <span class="fw-bold m-2">{{ state.surveys.length }}</span>
                </div>
                <div class="col-4">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd(survey)"
                    :disabled="!state.toggles['surveys.admin.add']">
                    <i class="bi bi-plus-lg"></i>
                  </button>
                </div>
              </div>
              <div id="add-survey" class="survey-card mb-4" v-if="state.showAdd && state.toggles['surveys.admin.add']">
                <div v-if="state.surveys.length < state.toggles['surveys.admin.limit']">
                  <div class="row g-1">
                    <div id="survey-type-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessSurveysAdmin.type") }}
                      </div>
                      <div class="col-8">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select"
                          v-model="state.newSurvey.type"
                          id="types"
                          v-bind:class="{ 'is-invalid': state.typeError }"
                          @change="selectType(state.newSurvey, 'add')"
                          >
                          <option v-for="typ in state.types" :key="typ" :value="typ" >{{ $t(`surveys.types.${typ}`) }}</option>
                        </select>
                      </div>
                    </div>
                    <div id="survey-attentionDefault-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessSurveysAdmin.attentionDefault") }}
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="state.newSurvey.attentionDefault"
                        />
                      </div>
                    </div>
                    <div v-if="!state.newSurvey.attentionDefault" id="survey-queue-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessSurveysAdmin.queue") }}
                      </div>
                      <div class="col-8">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select"
                          v-model="state.newSurvey.queueId"
                          id="queues">
                          <option v-for="queue in state.queues" :key="queue.name" :value="queue.id">{{ queue.name }}</option>
                        </select>
                      </div>
                    </div>
                    <div id="survey-csat-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessSurveysAdmin.csat") }}
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="state.newSurvey.hasCSAT"
                        />
                      </div>
                    </div>
                    <div id="survey-nps-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessSurveysAdmin.nps") }}
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="state.newSurvey.hasNPS"
                        />
                      </div>
                    </div>
                    <div id="survey-comment-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessSurveysAdmin.comment") }}
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="state.newSurvey.hasMessage"
                        />
                      </div>
                    </div>
                    <div id="survey-questions-form-add" v-if="state.showAddQuestions === true" class="row g-1">
                      <span @click="addAddQuestion(state.questions)" class="add-question"> <i class="bi bi-plus-circle"></i> {{ $t("businessSurveysAdmin.add_question") }} </span>
                      <div v-for="(question, ind) in state.questions" :key="`question-add.${ind}`" class="survey-card mb-1">
                        <div class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t("businessSurveysAdmin.question") }}
                          </div>
                          <div class="col-7">
                            <input
                              type="text"
                              class="form-control"
                              v-model="question.title"
                              v-bind:class="{ 'is-invalid': state.questionTitleError }"
                              placeholder="Question title">
                          </div>
                        </div>
                        <div class="row g-1 mt-1">
                          <div class="col-4 text-label">
                            {{ $t("businessSurveysAdmin.type") }}
                          </div>
                          <div class="col-7">
                            <select
                              class="btn btn-md btn-light fw-bold text-dark select"
                              v-model="question.type"
                              id="types"
                              v-bind:class="{ 'is-invalid': state.typeError }">
                              <option v-for="typ in state.question_types" :key="typ" :value="typ" >{{ $t(`surveys.question_types.${typ}`) }}</option>
                            </select>
                          </div>
                        </div>
                        <div v-if="question.type === 'OPEN_OPTIONS' || question.type === 'CHOOSE_OPTION'" class="row g-1 mt-1">
                          <div class="col-4 text-label">
                            {{ $t("businessSurveysAdmin.otherOption") }}
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="question.otherOption"
                            />
                          </div>
                        </div>
                        <div v-if="(question.type === 'OPEN_OPTIONS' || question.type === 'CHOOSE_OPTION') && (question.otherOption === true)" class="row g-1 mt-1">
                          <div class="col-4 text-label">
                            {{ $t("businessSurveysAdmin.otherOpen") }}
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="question.otherOptionOpen"
                            />
                          </div>
                        </div>
                        <div v-if="(question.type === 'OPEN_WRITING' || question.type === 'OPEN_WRITING')" class="row g-1 mt-1">
                          <div class="col-4 text-label">
                            {{ $t("businessSurveysAdmin.analize") }}
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="question.analize"
                            />
                          </div>
                        </div>
                        <div class="row g-1 mt-1">
                          <div class="col-4 text-label">
                            {{ $t("businessSurveysAdmin.order") }}
                          </div>
                          <div class="col-7">
                            <input
                              min="1"
                              :max="state.questions.length + 1"
                              type="number"
                              class="form-control"
                              v-model="question.order"
                              v-bind:class="{ 'is-invalid': state.orderAddError }"
                              placeholder="1">
                          </div>
                        </div>
                        <div class="row g-1 mt-1" v-if="question.type === 'OPEN_OPTIONS' || question.type === 'CHOOSE_OPTION'">
                          <div class="col-4 text-label">
                            {{ $t("businessSurveysAdmin.options") }}
                            <Popper
                              :class="'dark p-1'"
                              arrow
                              disableClickAway
                              :content="$t('businessSurveysAdmin.optionsHelp')">
                              <i class='bi bi-info-circle-fill h7'></i>
                            </Popper>
                          </div>
                          <div class="col-7">
                            <input
                              type="text"
                              class="form-control"
                              v-model="question.options"
                              v-bind:class="{ 'is-invalid': state.questionOptionsError }"
                              placeholder="Answer 1,Anwswer 2">
                          </div>
                        </div>
                        <span @click="deleteAddQuestion(question)" class="delete-question"> <i class="bi bi-trash3-fill"></i> {{ $t("businessSurveysAdmin.delete_question") }} </span>
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="add(state.newSurvey)">
                        {{ $t("businessSurveysAdmin.add") }} <i class="bi bi-save"></i>
                      </button>
                    </div>
                    <div class="row g-1 errors" id="feedback" v-if="(state.errorsAdd.length > 0)">
                      <Warning>
                        <template v-slot:message>
                          <li v-for="(error, index) in state.errorsAdd" :key="index">
                            {{ $t(error) }}
                          </li>
                        </template>
                      </Warning>
                    </div>
                  </div>
                </div>
                <div v-else>
                  <Message
                    :title="$t('businessSurveysAdmin.message.3.title')"
                    :content="$t('businessSurveysAdmin.message.3.content')" />
                </div>
              </div>
              <div v-for="(survey, index) in state.surveys" :key="index" class="survey-card">
                <div class="row">
                  <div class="col-10">
                    <SurveyName :type="survey.type" :attentionDefault="survey.attentionDefault" :active="survey.active"></SurveyName>
                  </div>
                  <div class="col-2">
                    <a
                      href="#"
                      @click.prevent="showUpdateForm(index)">
                      <i :id="index" :class="`bi ${state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                    </a>
                  </div>
                </div>
                <div v-if="state.toggles['surveys.admin.read']"
                  :class="{ show: state.extendedEntity === index }"
                  class="detailed-data transition-slow"
                  >
                  <div class="row g-1">
                    <div id="survey-link-form" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessSurveysAdmin.link") }}
                      </div>
                      <div class="col-8">
                        <a class="btn copy-icon"
                          @click="copyLink(survey)">
                          <i class="bi bi-file-earmark-spreadsheet"></i>
                        </a>
                        <a class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2"
                            :href="`${getSurveyLink(survey)}`"
                            target="_blank">
                          <i class="bi bi-box-arrow-up-right"></i> {{ $t("businessSurveysAdmin.go") }}
                        </a>
                      </div>
                    </div>
                    <div id="survey-type-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessSurveysAdmin.type") }}
                      </div>
                      <div class="col-8">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select"
                          v-model="survey.type"
                          id="types"
                          v-bind:class="{ 'is-invalid': state.typeError }"
                          @change="selectType(survey, 'update')"
                          >
                          <option v-for="typ in state.types" :key="typ" :value="typ" >{{ $t(`surveys.types.${typ}`) }}</option>
                        </select>
                      </div>
                    </div>
                    <div id="survey-attentionDefault-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessSurveysAdmin.attentionDefault") }}
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="survey.attentionDefault"
                        />
                      </div>
                    </div>
                    <div v-if="!survey.attentionDefault" id="survey-queue-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessSurveysAdmin.queue") }}
                      </div>
                      <div class="col-8">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select"
                          v-model="survey.queueId"
                          id="queue-edit"
                          :disabled="!state.toggles['surveys.admin.edit']">
                          <option v-for="queue in state.queues" :key="queue.name" :value="queue.id">{{ queue.name }}</option>
                        </select>
                      </div>
                    </div>
                    <div id="survey-csat-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessSurveysAdmin.csat") }}
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="survey.hasCSAT"
                        />
                      </div>
                    </div>
                    <div id="survey-nps-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessSurveysAdmin.nps") }}
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="survey.hasNPS"
                        />
                      </div>
                    </div>
                    <div id="survey-comment-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessSurveysAdmin.comment") }}
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="survey.hasMessage"
                        />
                      </div>
                    </div>
                    <div id="survey-active-form" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessSurveysAdmin.active") }}
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="survey.active"
                          :disabled="!state.toggles['surveys.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="survey-questions-form-update" v-if="state.showUpdateQuestions === true || survey.questions.length > 0" class="row g-1">
                      <span @click="addUpdateQuestion(index)" class="add-question my-2"> <i class="bi bi-plus-circle"></i> {{ $t("businessSurveysAdmin.add_question") }} </span>
                      <div v-for="(question, ind) in survey.questions" :key="`question-update.${ind}`" class="survey-card mb-1">
                        <div class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t("businessSurveysAdmin.question") }}
                          </div>
                          <div class="col-7">
                            <input
                              type="text"
                              class="form-control"
                              v-model="question.title"
                              v-bind:class="{ 'is-invalid': state.questionTitleError }"
                              placeholder="Question title">
                          </div>
                        </div>
                        <div class="row g-1 mt-1">
                          <div class="col-4 text-label">
                            {{ $t("businessSurveysAdmin.type") }}
                          </div>
                          <div class="col-7">
                            <select
                              class="btn btn-md btn-light fw-bold text-dark select"
                              v-model="question.type"
                              id="types"
                              v-bind:class="{ 'is-invalid': state.typeError }">
                              <option v-for="typ in state.question_types" :key="typ" :value="typ" >{{ $t(`surveys.question_types.${typ}`) }}</option>
                            </select>
                          </div>
                        </div>
                        <div v-if="question.type === 'OPEN_OPTIONS' || question.type === 'CHOOSE_OPTION'" class="row g-1 mt-1">
                          <div class="col-4 text-label">
                            {{ $t("businessSurveysAdmin.otherOption") }}
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="question.otherOption"
                            />
                          </div>
                        </div>
                        <div v-if="(question.type === 'OPEN_OPTIONS' || question.type === 'CHOOSE_OPTION') && (question.otherOption === true)" class="row g-1 mt-1">
                          <div class="col-4 text-label">
                            {{ $t("businessSurveysAdmin.otherOpen") }}
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="question.otherOptionOpen"
                            />
                          </div>
                        </div>
                        <div v-if="(question.type === 'OPEN_WRITING' || question.type === 'OPEN_WRITING')" class="row g-1 mt-1">
                          <div class="col-4 text-label">
                            {{ $t("businessSurveysAdmin.analize") }}
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="question.analize"
                            />
                          </div>
                        </div>
                        <div class="row g-1 mt-1">
                          <div class="col-4 text-label">
                            {{ $t("businessSurveysAdmin.order") }}
                          </div>
                          <div class="col-7">
                            <input
                              min="1"
                              :max="survey.questions.length + 1"
                              type="number"
                              class="form-control"
                              v-model="question.order"
                              v-bind:class="{ 'is-invalid': state.orderAddError }"
                              placeholder="1">
                          </div>
                        </div>
                        <div class="row g-1 mt-1" v-if="question.type === 'OPEN_OPTIONS' || question.type === 'CHOOSE_OPTION'">
                          <div class="col-4 text-label">
                            {{ $t("businessSurveysAdmin.options") }}
                            <Popper
                              :class="'dark p-1'"
                              arrow
                              disableClickAway
                              :content="$t('businessSurveysAdmin.optionsHelp')">
                              <i class='bi bi-info-circle-fill h7'></i>
                            </Popper>
                          </div>
                          <div class="col-7">
                            <input
                              type="text"
                              class="form-control"
                              v-model="question.options"
                              v-bind:class="{ 'is-invalid': state.questionOptionsError }"
                              placeholder="Answer 1,Anwswer 2">
                          </div>
                        </div>
                        <span @click="deleteUpdateQuestion(question, index)" class="delete-question"> <i class="bi bi-trash3-fill"></i> {{ $t("businessSurveysAdmin.delete_question") }} </span>
                      </div>
                    </div>
                    <div id="survey-id-form" class="row -2 mb-g3">
                      <div class="row survey-details-container">
                        <div class="col">
                          <span><strong>Id:</strong> {{ survey.id }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="update(survey)"
                        :disabled="!state.toggles['surveys.admin.update']">
                        {{ $t("businessSurveysAdmin.update") }} <i class="bi bi-save"></i>
                      </button>
                      <button
                        class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                        @click="goToUnavailable()"
                        v-if="state.toggles['surveys.admin.unavailable']">
                        {{ $t("businessQueuesAdmin.unavailable") }} <i class="bi bi-trash-fill"></i>
                      </button>
                      <AreYouSure
                        :show="state.goToUnavailable"
                        :yesDisabled="state.toggles['surveys.admin.unavailable']"
                        :noDisabled="state.toggles['surveys.admin.unavailable']"
                        @actionYes="unavailable(survey)"
                        @actionNo="unavailableCancel()"
                      >
                      </AreYouSure>
                    </div>
                    <div class="row g-1 errors" id="feedback" v-if="(state.errorsUpdate.length > 0)">
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
                <div v-if="(!isActiveBusiness() || !state.toggles['surveys.admin.read']) && !loading">
                  <Message
                    :title="$t('businessSurveysAdmin.message.1.title')"
                    :content="$t('businessSurveysAdmin.message.1.content')" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['surveys.admin.view']) && !loading">
          <Message
            :title="$t('businessSurveysAdmin.message.1.title')"
            :content="$t('businessSurveysAdmin.message.1.content')" />
        </div>
      </div>
    </div>
    <PoweredBy :name="state.business.name" />
  </div>
</template>

<style scoped>
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.text-label {
  line-height: 1.2rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.survey-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.control-box {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .1rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.survey-details-container {
  font-size: .8rem;
  margin-left: .5rem;
  margin-right: .5rem;
  margin-top: .5rem;
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
.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
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
.copy-icon {
  color: var(--gris-default);
  cursor: pointer;
  margin: .5rem;
}
</style>