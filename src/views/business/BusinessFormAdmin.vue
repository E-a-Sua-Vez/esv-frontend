<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getFormPersonalizedByCommerceId,
  updateFormPersonalized,
  createFormPersonalized,
} from '../../application/services/form-personalized';
import { getServiceByCommerce } from '../../application/services/service';
import { getPermissions } from '../../application/services/permissions';
import { getActivePatientHistoryItemsByCommerceId } from '../../application/services/patient-history-item';
import Popper from 'vue3-popper';
import FormName from '../../components/common/FormName.vue';
import FormFormEdit from '../../components/form/FormFormEdit.vue';
import FormFormAdd from '../../components/form/FormFormAdd.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import { getQueueByCommerce } from '../../application/services/queue';
import { getQuestionFormTypes, getFormTypes } from '../../shared/utils/data';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';

export default {
  name: 'BusinessFormsAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    FormName,
    FormFormEdit,
    FormFormAdd,
    Toggle,
    Warning,
    Popper,
    AreYouSure,
    ComponentMenu,
    SearchAdminItem,
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
      commerces: ref([]),
      services: ref([]),
      forms: ref([]),
      service: {},
      types: [],
      question_types: [],
      commerce: {},
      queues: [],
      patientHistoryItems: [],
      showAdd: false,
      goToUnavailable: false,
      showAddQuestions: false,
      showUpdateQuestions: false,
      questions: ref([]),
      newForm: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      typeError: false,
      toggles: {},
      filtered: [],
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.question_types = getQuestionFormTypes();
        state.types = getFormTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce =
          state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        if (state.commerce) {
          const forms = await getFormPersonalizedByCommerceId(state.commerce.id);
          state.forms = forms;
          const commerce = await getQueueByCommerce(state.commerce.id);
          state.queues = commerce.queues;
          state.services = await getServiceByCommerce(state.commerce.id);
          if (state.services.length > 0) {
            state.service = undefined;
          }
          const patientHistoryItems = await getActivePatientHistoryItemsByCommerceId(
            state.commerce.id
          );
          state.patientHistoryItems = patientHistoryItems.filter(item =>
            [
              'PERSONAL_HISTORY',
              'PATIENT_SEX',
              'PATIENT_OCCUPATION',
              'PATIENT_CIVIL_STATUS',
            ].includes(item.type)
          );
        }
        state.filtered = state.forms;
        state.toggles = await getPermissions('forms', 'admin');
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

    const validateAdd = form => {
      state.errorsAdd = [];
      if (!form.type || form.type.length === 0) {
        state.typeError = true;
        state.errorsAdd.push('businessFormsAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = form => {
      state.errorsUpdate = [];
      if (!form.type || form.type.length === 0) {
        state.typeError = true;
        state.errorsUpdate.push('businessFormsAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const showAdd = () => {
      const servicesId = [];
      state.showAdd = true;
      state.newForm = {
        servicesId,
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newForm)) {
          state.newForm.commerceId = state.commerce.id;
          state.newForm.questions = state.questions;
          if (state.newForm.attentionDefault === true) {
            state.newForm.queueId = undefined;
          }
          await createFormPersonalized(state.newForm);
          state.forms = await getFormPersonalizedByCommerceId(state.commerce.id);
          state.showAdd = false;
          closeAddModal();
          state.newForm = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const update = async form => {
      try {
        loading.value = true;
        if (validateUpdate(form)) {
          if (form.attentionDefault === true) {
            form.queueId = undefined;
          }
          await updateFormPersonalized(form.id, form);
          state.forms = await getFormPersonalizedByCommerceId(state.commerce.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async form => {
      try {
        loading.value = true;
        if (form && form.id) {
          form.available = false;
          form.active = false;
          await updateFormPersonalized(form.id, form);
          state.forms = await getFormPersonalizedByCommerceId(state.commerce.id);
          state.extendedEntity = undefined;
          state.goToUnavailable = false;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const goToUnavailable = () => {
      state.goToUnavailable = !state.goToUnavailable;
    };

    const unavailableCancel = () => {
      state.goToUnavailable = false;
    };

    const selectCommerce = async commerce => {
      try {
        loading.value = true;
        state.commerce = commerce;
        state.services = await getServiceByCommerce(state.commerce.id);
        const forms = await getFormPersonalizedByCommerceId(state.commerce.id);
        state.forms = forms;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const selectType = operation => {
      if (operation === 'add') {
        state.showAddQuestions = true;
      } else {
        state.showUpdateQuestions = false;
      }
    };

    const selectTypeItem = question => {
      if (question.patientHistoryItem && question.patientHistoryItem.id) {
        question.type = 'PATIENT_HISTORY_ITEM';
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
      const form = state.forms[index];
      const question = {
        title: '',
        active: true,
        order: form.questions.length + 1,
      };
      if (form.questions === undefined) {
        form.questions = [];
      }
      form.questions.push(question);
      state.forms[index] = form;
    };

    const deleteAddQuestion = question => {
      state.questions = state.questions.filter(item => item.title !== question.title);
    };

    const deleteUpdateQuestion = (question, index) => {
      const form = state.forms[index];
      form.questions = form.questions.filter(item => item.title !== question.title);
      state.forms[index] = form;
    };

    const selectService = async (form, service) => {
      if (service) {
        if (form.servicesId && form.servicesId.length >= 0) {
          if (!form.servicesId.includes(service.id)) {
            form.servicesId.push(service.id);
          }
        }
      }
    };

    const selectServiceIndex = async (index, service) => {
      if (!state.forms[index].servicesId) {
        state.forms[index].servicesId = [];
      }
      if (state.forms[index].servicesId && state.forms[index].servicesId.length >= 0) {
        if (!state.forms[index].servicesId.includes(service.id)) {
          state.forms[index].servicesId.push(service.id);
        }
      }
    };

    const deleteService = (form, serviceId) => {
      if (form && serviceId) {
        if (form.servicesId && form.servicesId.length >= 0) {
          if (form.servicesId.includes(serviceId)) {
            const filtered = form.servicesId.filter(com => com !== serviceId);
            form.servicesId = filtered;
          }
        }
      }
    };

    const showService = serviceId => {
      if (state.services && state.services.length >= 1) {
        const service = state.services.find(com => com.id === serviceId);
        if (service) {
          return service.tag;
        }
      }
    };

    const receiveFilteredItems = items => {
      state.filtered = items;
    };

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal');
      modalCloseButton.click();
    };

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
      unavailable,
      goToUnavailable,
      unavailableCancel,
      receiveFilteredItems,
      selectService,
      deleteService,
      showService,
      selectServiceIndex,
      selectTypeItem,
    };
  },
};
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="$t(`businessFormsAdmin.title`)"
        :toggles="state.toggles"
        component-name="businessFormsAdmin"
        @goBack="goBack"
      >
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessFormsAdmin">
        <div v-if="isActiveBusiness && state.toggles['forms.admin.view']">
          <div id="businessFormsAdmin-controls" class="control-box">
            <div class="row">
              <div class="col" v-if="state.commerces.length > 0">
                <span>{{ $t('businessFormsAdmin.commerce') }} </span>
                <select
                  class="form-control-modern form-select-modern"
                  v-model="state.commerce"
                  @change="selectCommerce(state.commerce)"
                  id="modules"
                >
                  <option v-for="com in state.commerces" :key="com.id" :value="com">
                    {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
                  </option>
                </select>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessFormsAdmin.message.4.title')"
                  :content="$t('businessFormsAdmin.message.4.content')"
                />
              </div>
            </div>
          </div>
          <div v-if="!loading" id="businessFormsAdmin-result" class="mt-4">
            <div>
              <div v-if="state.forms.length === 0">
                <Message
                  :title="$t('businessFormsAdmin.message.2.title')"
                  :content="$t('businessFormsAdmin.message.2.content')"
                />
              </div>
              <div v-if="state.commerce" class="row mb-2">
                <div class="col lefted">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd(form)"
                    data-bs-toggle="modal"
                    :data-bs-target="`#add-form`"
                    :disabled="!state.toggles['forms.admin.add']"
                  >
                    <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                  </button>
                </div>
              </div>
              <div>
                <SearchAdminItem
                  :business-items="state.forms"
                  :type="'forms'"
                  :receive-filtered-items="receiveFilteredItems"
                >
                </SearchAdminItem>
                <div v-for="(form, index) in state.filtered" :key="index" class="result-card">
                  <div class="row">
                    <div class="col-10">
                      <FormName :type="form.type" :active="form.active"></FormName>
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
                    v-if="state.toggles['forms.admin.read']"
                    :class="{ show: state.extendedEntity === index }"
                    class="detailed-data transition-slow"
                  >
                    <FormFormEdit
                      :form="form"
                      :types="state.types"
                      :queues="state.queues"
                      :services="state.services"
                      :toggles="state.toggles"
                      :errors="{
                        typeError: state.typeError,
                        errorsUpdate: state.errorsUpdate,
                      }"
                      :show-service="showService"
                      :select-service="(f, s) => selectServiceIndex(index, s)"
                      :delete-service="deleteService"
                      :selected-service="state.service"
                      @update:form="form = $event"
                      @update:selectedService="state.service = $event"
                      @selectType="selectType"
                    />
                    <div
                      id="form-questions-form-update"
                      v-if="state.showUpdateQuestions === true || (form.questions && form.questions.length > 0)"
                      class="row g-1 mt-2"
                    >
                        <span @click="addUpdateQuestion(index)" class="add-question my-2">
                          <i class="bi bi-plus-circle"></i>
                          {{ $t('businessFormsAdmin.addQuestion') }}
                        </span>
                        <div
                          v-for="(question, ind) in form.questions"
                          :key="`question-update.${ind}`"
                          class="result-card mb-1"
                        >
                          <div class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessFormsAdmin.question') }}
                            </div>
                            <div class="col-7">
                              <input
                                type="text"
                                class="form-control"
                                v-model="question.title"
                                v-bind:class="{ 'is-invalid': state.questionTitleError }"
                                placeholder="Question title"
                              />
                            </div>
                          </div>
                          <div class="row g-1 mt-1" v-if="form.type !== 'FIRST_ATTENTION'">
                            <div class="col-4 text-label">
                              {{ $t('businessFormsAdmin.type') }}
                            </div>
                            <div class="col-7">
                              <select
                                class="form-control-modern form-select-modern"
                                v-model="question.type"
                                id="types"
                                :class="{ 'is-invalid': state.typeError }"
                              >
                                <option v-for="typ in state.question_types" :key="typ" :value="typ">
                                  {{ $t(`forms.question_types.${typ}`) }}
                                </option>
                              </select>
                            </div>
                          </div>
                          <div class="row g-1 mt-1" v-else>
                            <div class="col-4 text-label">
                              {{ $t('businessFormsAdmin.type') }}
                              <Popper
                                :class="'dark p-1'"
                                arrow
                                disable-click-away
                                :content="$t('businessFormsAdmin.typeQuestionHelp')"
                              >
                                <i class="bi bi-info-circle-fill h7"></i>
                              </Popper>
                            </div>
                            <div class="col-7">
                              <select
                                class="form-control-modern form-select-modern"
                                v-model="question.patientHistoryItem"
                                id="types"
                                @change="selectTypeItem(question)"
                                :class="{ 'is-invalid': state.typeError }"
                              >
                                <option
                                  v-for="typ in state.patientHistoryItems"
                                  :key="typ"
                                  :value="typ"
                                >
                                  {{ typ.name }}
                                </option>
                              </select>
                            </div>
                          </div>
                          <div
                            v-if="
                              question.type === 'OPEN_OPTIONS' || question.type === 'CHOOSE_OPTION'
                            "
                            class="row g-1 mt-1"
                          >
                            <div class="col-4 text-label">
                              {{ $t('businessFormsAdmin.otherOption') }}
                            </div>
                            <div class="col-8">
                              <Toggle v-model="question.otherOption" />
                            </div>
                          </div>
                          <div
                            v-if="
                              (question.type === 'OPEN_OPTIONS' ||
                                question.type === 'CHOOSE_OPTION') &&
                              question.otherOption === true
                            "
                            class="row g-1 mt-1"
                          >
                            <div class="col-4 text-label">
                              {{ $t('businessFormsAdmin.otherOpen') }}
                            </div>
                            <div class="col-8">
                              <Toggle v-model="question.otherOptionOpen" />
                            </div>
                          </div>
                          <div
                            v-if="
                              question.type === 'OPEN_WRITING' || question.type === 'OPEN_WRITING'
                            "
                            class="row g-1 mt-1"
                          >
                            <div class="col-4 text-label">
                              {{ $t('businessFormsAdmin.analize') }}
                            </div>
                            <div class="col-8">
                              <Toggle v-model="question.analize" />
                            </div>
                          </div>
                          <div class="row g-1 mt-1">
                            <div class="col-4 text-label">
                              {{ $t('businessFormsAdmin.order') }}
                            </div>
                            <div class="col-7">
                              <input
                                min="1"
                                :max="form.questions.length + 1"
                                type="number"
                                class="form-control"
                                v-model="question.order"
                                v-bind:class="{ 'is-invalid': state.orderAddError }"
                                placeholder="1"
                              />
                            </div>
                          </div>
                          <div
                            class="row g-1 mt-1"
                            v-if="
                              question.type === 'OPEN_OPTIONS' || question.type === 'CHOOSE_OPTION'
                            "
                          >
                            <div class="col-4 text-label">
                              {{ $t('businessFormsAdmin.options') }}
                              <Popper
                                :class="'dark p-1'"
                                arrow
                                disable-click-away
                                :content="$t('businessFormsAdmin.optionsHelp')"
                              >
                                <i class="bi bi-info-circle-fill h7"></i>
                              </Popper>
                            </div>
                            <div class="col-7">
                              <input
                                type="text"
                                class="form-control"
                                v-model="question.options"
                                v-bind:class="{ 'is-invalid': state.questionOptionsError }"
                                placeholder="Answer 1,Anwswer 2"
                              />
                            </div>
                          </div>
                          <span
                            @click="deleteUpdateQuestion(question, index)"
                            class="delete-question"
                          >
                            <i class="bi bi-trash3-fill"></i>
                            {{ $t('businessFormsAdmin.deleteQuestion') }}
                          </span>
                        </div>
                    </div>
                    <div
                      v-if="state.toggles['forms.admin.read'] && state.extendedEntity === index"
                      class="row g-1 mt-2"
                    >
                        <div class="col">
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="update(form)"
                            :disabled="!state.toggles['forms.admin.update']"
                          >
                            {{ $t('businessFormsAdmin.update') }} <i class="bi bi-save"></i>
                          </button>
                          <button
                            class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                            @click="goToUnavailable()"
                            v-if="state.toggles['forms.admin.unavailable']"
                          >
                            {{ $t('businessQueuesAdmin.unavailable') }}
                            <i class="bi bi-trash-fill"></i>
                          </button>
                          <AreYouSure
                            :show="state.goToUnavailable"
                            :yes-disabled="state.toggles['forms.admin.unavailable']"
                            :no-disabled="state.toggles['forms.admin.unavailable']"
                            @actionYes="unavailable(form)"
                            @actionNo="unavailableCancel()"
                          >
                          </AreYouSure>
                        </div>
                    </div>
                  </div>
                  <div
                    v-if="(!isActiveBusiness() || !state.toggles['forms.admin.read']) && !loading"
                  >
                    <Message
                      :title="$t('businessFormsAdmin.message.1.title')"
                      :content="$t('businessFormsAdmin.message.1.content')"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['forms.admin.view']) && !loading">
          <Message
            :title="$t('businessFormsAdmin.message.1.title')"
            :content="$t('businessFormsAdmin.message.1.content')"
          />
        </div>
      </div>
    </div>
    <!-- Modal Add -->
    <div
      class="modal fade"
      :id="`add-form`"
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
            <Alert :show="loading" :stack="alertError"></Alert>
            <div
              id="add-form"
              class="result-card mb-4"
              v-if="state.showAdd && state.toggles['forms.admin.add']"
            >
              <div v-if="state.forms.length < state.toggles['forms.admin.limit']">
                <FormFormAdd
                  v-model="state.newForm"
                  :types="state.types"
                  :queues="state.queues"
                  :services="state.services"
                  :toggles="state.toggles"
                  :errors="{
                    typeError: state.typeError,
                    errorsAdd: state.errorsAdd,
                  }"
                  :show-service="showService"
                  :select-service="selectService"
                  :delete-service="deleteService"
                  :selected-service="state.service"
                  @update:modelValue="state.newForm = $event"
                  @update:selectedService="state.service = $event"
                  @selectType="selectType"
                />
                  <div
                    id="form-questions-form-add"
                    v-if="state.showAddQuestions === true"
                    class="row g-1"
                  >
                    <div>
                      <span @click="addAddQuestion(state.questions)" class="add-question">
                        <i class="bi bi-plus-circle"></i> {{ $t('businessFormsAdmin.addQuestion') }}
                      </span>
                      <Popper
                        :class="'dark p-1'"
                        arrow
                        disable-click-away
                        :content="$t('businessFormsAdmin.addQuestionHelp')"
                      >
                        <i class="bi bi-info-circle-fill h7"></i>
                      </Popper>
                    </div>
                    <div
                      v-for="(question, ind) in state.questions"
                      :key="`question-add.${ind}`"
                      class="result-card mb-1"
                    >
                      <div class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessFormsAdmin.question') }}
                        </div>
                        <div class="col-7">
                          <input
                            type="text"
                            class="form-control"
                            v-model="question.title"
                            v-bind:class="{ 'is-invalid': state.questionTitleError }"
                            placeholder="Question title"
                          />
                        </div>
                      </div>
                      <div class="row g-1 mt-1" v-if="state.newForm.type !== 'FIRST_ATTENTION'">
                        <div class="col-4 text-label">
                          {{ $t('businessFormsAdmin.type') }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disable-click-away
                            :content="$t('businessFormsAdmin.typeQuestionHelp')"
                          >
                            <i class="bi bi-info-circle-fill h7"></i>
                          </Popper>
                        </div>
                        <div class="col-7">
                          <select
                            class="form-control-modern form-select-modern"
                            v-model="question.type"
                            id="types"
                            :class="{ 'is-invalid': state.typeError }"
                          >
                            <option v-for="typ in state.question_types" :key="typ" :value="typ">
                              {{ $t(`forms.question_types.${typ}`) }}
                            </option>
                          </select>
                        </div>
                      </div>
                      <div class="row g-1 mt-1" v-else>
                        <div class="col-4 text-label">
                          {{ $t('businessFormsAdmin.type') }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disable-click-away
                            :content="$t('businessFormsAdmin.typeQuestionHelp')"
                          >
                            <i class="bi bi-info-circle-fill h7"></i>
                          </Popper>
                        </div>
                        <div class="col-7">
                          <select
                            class="form-control-modern form-select-modern"
                            v-model="question.patientHistoryItem"
                            id="types"
                            @change="selectTypeItem(question)"
                            :class="{ 'is-invalid': state.typeError }"
                          >
                            <option
                              v-for="typ in state.patientHistoryItems"
                              :key="typ"
                              :value="typ"
                            >
                              {{ typ.name }}
                            </option>
                          </select>
                        </div>
                      </div>
                      <div
                        v-if="question.type === 'OPEN_OPTIONS' || question.type === 'CHOOSE_OPTION'"
                        class="row g-1 mt-1"
                      >
                        <div class="col-4 text-label">
                          {{ $t('businessFormsAdmin.otherOption') }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disable-click-away
                            :content="$t('businessFormsAdmin.otherOptionQuestionHelp')"
                          >
                            <i class="bi bi-info-circle-fill h7"></i>
                          </Popper>
                        </div>
                        <div class="col-8">
                          <Toggle v-model="question.otherOption" />
                        </div>
                      </div>
                      <div
                        v-if="
                          (question.type === 'OPEN_OPTIONS' || question.type === 'CHOOSE_OPTION') &&
                          question.otherOption === true
                        "
                        class="row g-1 mt-1"
                      >
                        <div class="col-4 text-label">
                          {{ $t('businessFormsAdmin.otherOpen') }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disable-click-away
                            :content="$t('businessFormsAdmin.otherOpenQuestionHelp')"
                          >
                            <i class="bi bi-info-circle-fill h7"></i>
                          </Popper>
                        </div>
                        <div class="col-8">
                          <Toggle v-model="question.otherOptionOpen" />
                        </div>
                      </div>
                      <div
                        v-if="question.type === 'OPEN_WRITING' || question.type === 'OPEN_WRITING'"
                        class="row g-1 mt-1"
                      >
                        <div class="col-4 text-label">
                          {{ $t('businessFormsAdmin.analize') }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disable-click-away
                            :content="$t('businessFormsAdmin.analizeIAQuestionHelp')"
                          >
                            <i class="bi bi-info-circle-fill h7"></i>
                          </Popper>
                        </div>
                        <div class="col-8">
                          <Toggle v-model="question.analize" />
                        </div>
                      </div>
                      <div class="row g-1 mt-1">
                        <div class="col-4 text-label">
                          {{ $t('businessFormsAdmin.order') }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disable-click-away
                            :content="$t('businessFormsAdmin.orderQuestionHelp')"
                          >
                            <i class="bi bi-info-circle-fill h7"></i>
                          </Popper>
                        </div>
                        <div class="col-7">
                          <input
                            min="1"
                            :max="state.questions.length + 1"
                            type="number"
                            class="form-control"
                            v-model="question.order"
                            v-bind:class="{ 'is-invalid': state.orderAddError }"
                            placeholder="1"
                          />
                        </div>
                      </div>
                      <div
                        class="row g-1 mt-1"
                        v-if="question.type === 'OPEN_OPTIONS' || question.type === 'CHOOSE_OPTION'"
                      >
                        <div class="col-4 text-label">
                          {{ $t('businessFormsAdmin.options') }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disable-click-away
                            :content="$t('businessFormsAdmin.optionsHelp')"
                          >
                            <i class="bi bi-info-circle-fill h7"></i>
                          </Popper>
                        </div>
                        <div class="col-7">
                          <input
                            type="text"
                            class="form-control"
                            v-model="question.options"
                            v-bind:class="{ 'is-invalid': state.questionOptionsError }"
                            placeholder="Answer 1,Anwswer 2"
                          />
                        </div>
                      </div>
                      <div>
                        <span @click="deleteAddQuestion(question)" class="delete-question">
                          <i class="bi bi-trash3-fill"></i>
                          {{ $t('businessFormsAdmin.deleteQuestion') }}
                        </span>
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disable-click-away
                          :content="$t('businessFormsAdmin.deleteQuestionHelp')"
                        >
                          <i class="bi bi-info-circle-fill h7"></i>
                        </Popper>
                      </div>
                    </div>
                  </div>
                <div class="col mt-3">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                    @click="add(state.newForm)"
                  >
                    {{ $t('businessFormsAdmin.add') }} <i class="bi bi-save"></i>
                  </button>
                </div>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessFormsAdmin.message.3.title')"
                  :content="$t('businessFormsAdmin.message.3.content')"
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
/* Modern Form Styles */
.select,
.form-select-modern {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.select:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
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

.form-select-modern {
  flex: 1;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
}

.form-control {
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
}

.text-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: capitalize;
  letter-spacing: 0.5px;
}

.result-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 0.2rem;
  margin-bottom: 0.75rem;
  transition: all 0.3s ease;
}

.result-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
  background-color: var(--color-background);
  transition: max-height 0.3s ease;
}

.detailed-data.show {
  padding: 0.5rem;
  max-height: 2000px !important;
  overflow-y: visible;
}

.is-disabled {
  opacity: 0.5;
}

.errors {
  font-size: small;
  color: var(--rojo-warning);
}

.btn-close {
  height: 0em !important;
}

.add-question {
  text-decoration: underline;
  font-size: 0.8rem;
  cursor: pointer;
  text-align: right;
  margin-bottom: 1rem;
  color: rgba(0, 194, 203, 0.8);
  transition: color 0.2s ease;
}

.add-question:hover {
  color: rgba(0, 194, 203, 1);
}

.delete-question {
  text-decoration: underline;
  font-size: 0.8rem;
  cursor: pointer;
  text-align: right;
  margin-bottom: 1rem;
  color: var(--rojo-warning);
  transition: color 0.2s ease;
}

.delete-question:hover {
  color: rgba(165, 42, 42, 1);
}
</style>
