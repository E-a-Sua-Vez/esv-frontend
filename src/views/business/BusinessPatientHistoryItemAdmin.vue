<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPatientHistoryItemByCommerce, updatePatientHistoryItem, addPatientHistoryItem } from '../../application/services/patient-history-item';
import { getPermissions } from '../../application/services/permissions';
import Popper from "vue3-popper";
import ServiceSimpleName from '../../components/common/ServiceSimpleName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import { getPatientHistoryItemTypes } from '../../shared/utils/data';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';

export default {
  name: 'BusinessPatientHistoryItemAdmin',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, ServiceSimpleName, Toggle, Warning, AreYouSure, Popper, ComponentMenu, SearchAdminItem },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      commerces: ref([]),
      items: ref([]),
      types: ref([]),
      commerce: {},
      showAdd: false,
      goToUnavailable: false,
      newPatientHistoryItem: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      tagError: false,
      typeError: false,
      orderAddError: false,
      orderUpdateError: false,
      estimatedTimeAddError: false,
      estimatedTimeUpdateError: false,
      types: [],
      toggles: {},
      filtered: []
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.types = getPatientHistoryItemTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        if (state.commerce) {
          state.items = await getPatientHistoryItemByCommerce(state.commerce.id);
        }
        state.filtered = state.items;
        state.toggles = await getPermissions('patient-history-item', 'admin');
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

    const validateAdd = (item) => {
      state.errorsAdd = [];
      if(!item.name || item.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessPatientHistoryItemAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if(!item.type || item.type.length === 0) {
        state.typeError = true;
        state.errorsAdd.push('businessPatientHistoryItemAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if(!item.tag || item.tag.length === 0) {
        state.tagError = true;
        state.errorsAdd.push('businessPatientHistoryItemAdmin.validate.tag');
      } else {
        state.tagError = false;
      }
      if(!item.order || item.order.length === 0) {
        state.orderAddError = true;
        state.errorsAdd.push('businessPatientHistoryItemAdmin.validate.order');
      } else {
        state.orderAddError = false;
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const validateUpdate = (item) => {
      state.errorsUpdate = [];
      if(!item.name || item.name.length === 0) {
        state.nameError = true;
        state.errorsUpdate.push('businessPatientHistoryItemAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if(!item.order || item.order.length === 0) {
        state.orderUpdateError = true;
        state.errorsUpdate.push('businessPatientHistoryItemAdmin.validate.order');
      } else {
        state.orderUpdateError = false;
      }
      if(state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    }

    const showAdd = () => {
      state.showAdd = true;
      state.newPatientHistoryItem = {
        order: state.items.length + 1,
        active: true,
        online: true,
        characteristics: {
          actual: false,
          frequency: false,
          ageFrom: false,
          ageTo: false,
          comment: false,
          value: false,
          result: false,
          selectN: false,
          select1: false,
          yesNo: false,
          document: false,
          options: ''
        }
      }
    }

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newPatientHistoryItem)) {
          state.newPatientHistoryItem.commerceId = state.commerce.id;
          await addPatientHistoryItem(state.newPatientHistoryItem);
          state.items = await getPatientHistoryItemByCommerce(state.commerce.id);
          state.showAdd = false;
          closeAddModal();
          state.newPatientHistoryItem = {}
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const update = async (item) => {
      try {
        loading.value = true;
        if (validateUpdate(item)) {
          await updatePatientHistoryItem(item.id, item);
          state.items = await getPatientHistoryItemByCommerce(state.commerce.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const unavailable = async (item) => {
      try {
        loading.value = true;
        if (item && item.id) {
          item.available = false;
          item.active = false;
          await updatePatientHistoryItem(item.id, item);
          state.items = await getPatientHistoryItemByCommerce(state.commerce.id);
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
        state.items = await getPatientHistoryItemByCommerce(state.commerce.id);
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const showUpdateForm = (index) => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    }

    const receiveFilteredItems = (items) => {
      state.filtered = items;
    }

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal');
      modalCloseButton.click();
    }

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
      selectCommerce,
      unavailable,
      goToUnavailable,
      unavailableCancel,
      receiveFilteredItems
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="$t(`businessPatientHistoryItemAdmin.title`)"
        :toggles="state.toggles"
        componentName="businessPatientHistoryItemAdmin"
        @goBack="goBack">
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessPatientHistoryItemAdmin">
        <div v-if="isActiveBusiness && state.toggles['patient-history-item.admin.view']">
          <div id="businessPatientHistoryItemAdmin-controls" class="control-box">
            <div class="row">
              <div class="col" v-if="state.commerces.length > 0">
                <span>{{ $t("businessPatientHistoryItemAdmin.commerce") }} </span>
                <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="modules">
                  <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                </select>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessPatientHistoryItemAdmin.message.4.title')"
                  :content="$t('businessPatientHistoryItemAdmin.message.4.content')" />
              </div>
            </div>
          </div>
          <div v-if="!loading" id="businessPatientHistoryItemAdmin-result" class="mt-4">
            <div>
              <div v-if="state.items.length === 0">
                <Message
                  :title="$t('businessPatientHistoryItemAdmin.message.2.title')"
                  :content="$t('businessPatientHistoryItemAdmin.message.2.content')" />
              </div>
              <div v-if="state.commerce" class="row mb-2">
                <div class="col lefted">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd(item)"
                    data-bs-toggle="modal"
                    :data-bs-target="`#add-item`"
                    :disabled="!state.toggles['patient-history-item.admin.add']">
                    <i class="bi bi-plus-lg"></i> {{ $t("add") }}
                  </button>
                </div>
              </div>
              <div>
                <SearchAdminItem
                  :businessItems="state.items"
                  :type="'items'"
                  :receiveFilteredItems="receiveFilteredItems"
                >
                </SearchAdminItem>
                <div v-for="(item, index) in state.filtered" :key="index" class="result-card">
                  <div class="row">
                    <div class="col-10">
                      <ServiceSimpleName :service="item"></ServiceSimpleName>
                    </div>
                    <div class="col-2">
                      <a
                        href="#"
                        @click.prevent="showUpdateForm(index)">
                        <i :id="index" :class="`bi ${state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                      </a>
                    </div>
                  </div>
                  <div v-if="state.toggles['patient-history-item.admin.read']"
                    :class="{ show: state.extendedEntity === index }"
                    class="detailed-data transition-slow"
                    >
                    <div class="row g-1">
                      <div id="item-type-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.type") }}
                        </div>
                        <div class="col-8">
                          <input
                            :disabled="true"
                            type="text"
                            class="form-control"
                            v-model="item.type"
                            placeholder="Type">
                        </div>
                      </div>
                      <div id="item-tag-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessPatientHistoryItemAdmin.tag") }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disableClickAway
                            :content="$t('businessPatientHistoryItemAdmin.tagHelp')">
                            <i class='bi bi-info-circle-fill h7'></i>
                          </Popper>
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="item.tag"
                            v-bind:class="{ 'is-invalid': state.tagError }"
                            placeholder="Habit">
                        </div>
                      </div>
                      <div id="item-order-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessPatientHistoryItemAdmin.order") }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disableClickAway
                            :content="$t('businessPatientHistoryItemAdmin.orderHelp')">
                            <i class='bi bi-info-circle-fill h7'></i>
                          </Popper>
                        </div>
                        <div class="col-8">
                          <input
                            :disabled="!state.toggles['patient-history-item.admin.edit']"
                            min="1"
                            :max="state.items.length"
                            type="number"
                            class="form-control"
                            v-model="item.order"
                            v-bind:class="{ 'is-invalid': state.orderUpdateError }"
                            placeholder="1">
                        </div>
                      </div>
                      <div id="item-online-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessPatientHistoryItemAdmin.online") }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disableClickAway
                            :content="$t('businessPatientHistoryItemAdmin.onlineHelp')">
                            <i class='bi bi-info-circle-fill h7'></i>
                          </Popper>
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="item.online"
                            :disabled="!state.toggles['patient-history-item.admin.edit']"
                          />
                        </div>
                      </div>
                      <div id="item-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessPatientHistoryItemAdmin.active") }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="item.active"
                            :disabled="!state.toggles['patient-history-item.admin.edit']"
                          />
                        </div>
                      </div>
                      <!-- Datos de Caracteristicas -->
                      <div class="row g-1">
                        <a
                          class="nav-link subdata-title centered active"
                          data-bs-toggle="collapse"
                          href="#update-items">
                          {{ $t("businessPatientHistoryItemAdmin.characteristics") }} <i class="bi bi-chevron-down"></i>
                        </a>
                      </div>
                      <div id="update-items" class="collapse row m-0">
                        <div id="item-actual-form-update" class="row g-1">
                          <div class="col-6 text-label">
                            {{ $t("businessPatientHistoryItemAdmin.actual") }}
                          </div>
                          <div class="col-6">
                            <Toggle
                              v-model="item.characteristics.actual"
                              :disabled="!state.toggles['patient-history-item.admin.edit']"
                            />
                          </div>
                        </div>
                        <div id="item-frequency-form-update" class="row g-1">
                          <div class="col-6 text-label">
                            {{ $t("businessPatientHistoryItemAdmin.frequency") }}
                          </div>
                          <div class="col-6">
                            <Toggle
                              v-model="item.characteristics.frequency"
                              :disabled="!state.toggles['patient-history-item.admin.edit']"
                            />
                          </div>
                        </div>
                        <div id="item-ageFrom-form-update" class="row g-1">
                          <div class="col-6 text-label">
                            {{ $t("businessPatientHistoryItemAdmin.ageFrom") }}
                          </div>
                          <div class="col-6">
                            <Toggle
                              v-model="item.characteristics.ageFrom"
                              :disabled="!state.toggles['patient-history-item.admin.edit']"
                            />
                          </div>
                        </div>
                        <div id="item-ageTo-form-update" class="row g-1">
                          <div class="col-6 text-label">
                            {{ $t("businessPatientHistoryItemAdmin.ageTo") }}
                          </div>
                          <div class="col-6">
                            <Toggle
                              v-model="item.characteristics.ageTo"
                              :disabled="!state.toggles['patient-history-item.admin.edit']"
                            />
                          </div>
                        </div>
                        <div id="item-comment-form-update" class="row g-1">
                          <div class="col-6 text-label">
                            {{ $t("businessPatientHistoryItemAdmin.comment") }}
                          </div>
                          <div class="col-6">
                            <Toggle
                              v-model="item.characteristics.comment"
                              :disabled="!state.toggles['patient-history-item.admin.edit']"
                            />
                          </div>
                        </div>
                        <div id="item-value-form-update" class="row g-1">
                          <div class="col-6 text-label">
                            {{ $t("businessPatientHistoryItemAdmin.value") }}
                          </div>
                          <div class="col-6">
                            <Toggle
                              v-model="item.characteristics.value"
                              :disabled="!state.toggles['patient-history-item.admin.edit']"
                            />
                          </div>
                        </div>
                        <div id="item-result-form-update" class="row g-1">
                          <div class="col-6 text-label">
                            {{ $t("businessPatientHistoryItemAdmin.result") }}
                          </div>
                          <div class="col-6">
                            <Toggle
                              v-model="item.characteristics.result"
                              :disabled="!state.toggles['patient-history-item.admin.edit']"
                            />
                          </div>
                        </div>
                        <div id="item-selectN-form-update" class="row g-1">
                          <div class="col-6 text-label">
                            {{ $t("businessPatientHistoryItemAdmin.selectN") }}
                          </div>
                          <div class="col-6">
                            <Toggle
                              v-model="item.characteristics.selectN"
                              :disabled="!state.toggles['patient-history-item.admin.edit']"
                            />
                          </div>
                        </div>
                        <div id="item-select1-form-update" class="row g-1">
                          <div class="col-6 text-label">
                            {{ $t("businessPatientHistoryItemAdmin.select1") }}
                          </div>
                          <div class="col-6">
                            <Toggle
                              v-model="item.characteristics.select1"
                              :disabled="!state.toggles['patient-history-item.admin.edit']"
                            />
                          </div>
                        </div>
                        <div id="item-yesNo-form-update" class="row g-1">
                          <div class="col-6 text-label">
                            {{ $t("businessPatientHistoryItemAdmin.yesNo") }}
                          </div>
                          <div class="col-6">
                            <Toggle
                              v-model="item.characteristics.yesNo"
                              :disabled="!state.toggles['patient-history-item.admin.edit']"
                            />
                          </div>
                        </div>
                        <div id="item-document-form-update" class="row g-1">
                          <div class="col-6 text-label">
                            {{ $t("businessPatientHistoryItemAdmin.document") }}
                          </div>
                          <div class="col-6">
                            <Toggle
                              v-model="item.characteristics.document"
                              :disabled="!state.toggles['patient-history-item.admin.edit']"
                            />
                          </div>
                        </div>
                        <div id="item-options-form-update" class="row g-1">
                          <div class="col-6 text-label">
                            {{ $t("businessPatientHistoryItemAdmin.options") }}
                          </div>
                          <div class="col-6">
                            <input
                              type="text"
                              class="form-control"
                              v-model="item.characteristics.options"
                              placeholder="Answer 1,Anwswer 2">
                          </div>
                        </div>
                      </div>
                      <div id="item-id-form" class="row -2 mb-g3">
                        <div class="row item-details-container">
                          <div class="col">
                            <span><strong>Id:</strong> {{ item.id }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(item)"
                          :disabled="!state.toggles['patient-history-item.admin.update']">
                          {{ $t("businessPatientHistoryItemAdmin.update") }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['patient-history-item.admin.unavailable']">
                          {{ $t("businessQueuesAdmin.unavailable") }} <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          :yesDisabled="state.toggles['patient-history-item.admin.unavailable']"
                          :noDisabled="state.toggles['patient-history-item.admin.unavailable']"
                          @actionYes="unavailable(item)"
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
                  <div v-if="(!isActiveBusiness() || !state.toggles['patient-history-item.admin.read']) && !loading">
                    <Message
                      :title="$t('businessPatientHistoryItemAdmin.message.1.title')"
                      :content="$t('businessPatientHistoryItemAdmin.message.1.content')" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['patient-history-item.admin.view']) && !loading">
          <Message
            :title="$t('businessPatientHistoryItemAdmin.message.1.title')"
            :content="$t('businessPatientHistoryItemAdmin.message.1.content')" />
        </div>
      </div>
    </div>
    <!-- Modal Add -->
    <div class="modal fade" :id="`add-item`" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-plus-lg"></i> {{ $t("add") }} </h5>
            <button id="close-modal" class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="loading" :stack="alertError"></Alert>
            <div id="add-item" class="result-card mb-4" v-if="state.showAdd && state.toggles['patient-history-item.admin.add']">
              <div v-if="state.items.length < state.toggles['patient-history-item.admin.limit']">
                <div class="row g-1">
                  <div id="item-name-form-add" class="row g-1">
                    <div class="col-6 text-label">
                      {{ $t("businessPatientHistoryItemAdmin.name") }}
                    </div>
                    <div class="col-6">
                      <input
                        min="1"
                        max="50"
                        type="text"
                        class="form-control"
                        v-model="state.newPatientHistoryItem.name"
                        v-bind:class="{ 'is-invalid': state.nameError }"
                        placeholder="PatientHistoryItem A">
                    </div>
                  </div>
                  <div id="item-tag-form-add" class="row g-1">
                    <div class="col-6 text-label">
                      {{ $t("businessPatientHistoryItemAdmin.tag") }}
                      <Popper
                        :class="'dark p-1'"
                        arrow
                        disableClickAway
                        :content="$t('businessPatientHistoryItemAdmin.tagHelp')">
                        <i class='bi bi-info-circle-fill h7'></i>
                      </Popper>
                    </div>
                    <div class="col-6">
                      <input
                        min="1"
                        max="50"
                        type="text"
                        class="form-control"
                        v-model="state.newPatientHistoryItem.tag"
                        v-bind:class="{ 'is-invalid': state.tagError }"
                        placeholder="Habit">
                    </div>
                  </div>
                  <div id="item-type-form-add" class="row g-1">
                    <div class="col-6 text-label">
                      {{ $t("businessPatientHistoryItemAdmin.type") }}
                      <Popper
                        :class="'dark p-1'"
                        arrow
                        disableClickAway
                        :content="$t('businessPatientHistoryItemAdmin.typeHelp')">
                        <i class='bi bi-info-circle-fill h7'></i>
                      </Popper>
                    </div>
                    <div class="col-6">
                      <select
                        class="btn btn-md btn-light fw-bold text-dark select"
                        v-model="state.newPatientHistoryItem.type"
                        id="types"
                        v-bind:class="{ 'is-invalid': state.typeError }">
                        <option v-for="typ in state.types" :key="typ.id" :value="typ.id">{{ $t(`items.types.${typ.id}`) }}</option>
                      </select>
                    </div>
                  </div>
                  <div id="item-order-form-add" class="row g-1">
                    <div class="col-6 text-label">
                      {{ $t("businessPatientHistoryItemAdmin.order") }}
                      <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessPatientHistoryItemAdmin.orderHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                    </div>
                    <div class="col-6">
                      <input
                        min="1"
                        :max="state.items.length + 1"
                        type="number"
                        class="form-control"
                        v-model="state.newPatientHistoryItem.order"
                        v-bind:class="{ 'is-invalid': state.orderAddError }"
                        placeholder="1">
                    </div>
                  </div>
                  <div id="add-item-online-form" class="row g-1">
                    <div class="col-6 text-label">
                      {{ $t("businessPatientHistoryItemAdmin.online") }}
                      <Popper
                        :class="'dark p-1'"
                        arrow
                        disableClickAway
                        :content="$t('businessPatientHistoryItemAdmin.onlineHelp')">
                        <i class='bi bi-info-circle-fill h7'></i>
                      </Popper>
                    </div>
                    <div class="col-6">
                      <Toggle
                        v-model="state.newPatientHistoryItem.online"
                        :disabled="!state.toggles['patient-history-item.admin.edit']"
                      />
                    </div>
                  </div>
                  <!-- Datos de Caracteristicas -->
                  <div class="row g-1">
                    <a
                      class="nav-link subdata-title centered active"
                      data-bs-toggle="collapse"
                      href="#add-items">
                      {{ $t("businessPatientHistoryItemAdmin.characteristics") }} <i class="bi bi-chevron-down"></i>
                    </a>
                  </div>
                  <div id="add-items" class="collapse row m-0">
                    <div id="item-actual-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessPatientHistoryItemAdmin.actual") }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="state.newPatientHistoryItem.characteristics.actual"
                          :disabled="!state.toggles['patient-history-item.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="item-frequency-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessPatientHistoryItemAdmin.frequency") }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="state.newPatientHistoryItem.characteristics.frequency"
                          :disabled="!state.toggles['patient-history-item.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="item-ageFrom-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessPatientHistoryItemAdmin.ageFrom") }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="state.newPatientHistoryItem.characteristics.ageFrom"
                          :disabled="!state.toggles['patient-history-item.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="item-ageTo-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessPatientHistoryItemAdmin.ageTo") }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="state.newPatientHistoryItem.characteristics.ageTo"
                          :disabled="!state.toggles['patient-history-item.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="item-comment-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessPatientHistoryItemAdmin.comment") }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="state.newPatientHistoryItem.characteristics.comment"
                          :disabled="!state.toggles['patient-history-item.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="item-actual-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessPatientHistoryItemAdmin.value") }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="state.newPatientHistoryItem.characteristics.value"
                          :disabled="!state.toggles['patient-history-item.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="item-actual-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessPatientHistoryItemAdmin.result") }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="state.newPatientHistoryItem.characteristics.result"
                          :disabled="!state.toggles['patient-history-item.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="item-selectN-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessPatientHistoryItemAdmin.selectN") }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="state.newPatientHistoryItem.characteristics.selectN"
                          :disabled="!state.toggles['patient-history-item.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="item-select1-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessPatientHistoryItemAdmin.select1") }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="state.newPatientHistoryItem.characteristics.select1"
                          :disabled="!state.toggles['patient-history-item.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="item-yesNo-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessPatientHistoryItemAdmin.yesNo") }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="state.newPatientHistoryItem.characteristics.yesNo"
                          :disabled="!state.toggles['patient-history-item.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="item-document-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessPatientHistoryItemAdmin.document") }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="state.newPatientHistoryItem.characteristics.document"
                          :disabled="!state.toggles['patient-history-item.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="item-options-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessPatientHistoryItemAdmin.options") }}
                      </div>
                      <div class="col-6">
                        <input
                          type="text"
                          class="form-control"
                          v-model="state.newPatientHistoryItem.characteristics.options"
                          placeholder="Answer 1,Anwswer 2">
                      </div>
                    </div>
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
                  <div class="col">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="add(state.newPatientHistoryItem)">
                      {{ $t("businessPatientHistoryItemAdmin.add") }} <i class="bi bi-save"></i>
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
                  :title="$t('businessPatientHistoryItemAdmin.message.3.title')"
                  :content="$t('businessPatientHistoryItemAdmin.message.3.content')" />
              </div>
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-dismiss="modal" aria-label="Close">{{ $t("close") }} <i class="bi bi-check-lg"></i></a>
          </div>
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
.service-details-container {
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
  max-height: 1500px !important;
  overflow-y: auto;
}
</style>