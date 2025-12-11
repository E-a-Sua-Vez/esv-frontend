<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getPatientHistoryItemByCommerce,
  updatePatientHistoryItem,
  addPatientHistoryItem,
} from '../../application/services/patient-history-item';
import { getPermissions } from '../../application/services/permissions';
import Popper from 'vue3-popper';
import PatientHistoryItemName from '../../components/common/PatientHistoryItemName.vue';
import PatientHistoryItemFormEdit from '../../components/patient-history-item/PatientHistoryItemFormEdit.vue';
import PatientHistoryItemFormAdd from '../../components/patient-history-item/PatientHistoryItemFormAdd.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
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
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    PatientHistoryItemName,
    PatientHistoryItemFormEdit,
    PatientHistoryItemFormAdd,
    Toggle,
    Warning,
    AreYouSure,
    Popper,
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
      items: ref([]),
      types: ref([]),
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
      toggles: {},
      filtered: [],
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Load items when commerce changes
    const loadItems = async commerceId => {
      if (!commerceId) {
        state.items = [];
        state.filtered = [];
        return;
      }
      try {
        const items = await getPatientHistoryItemByCommerce(commerceId);
        state.items = items || [];
        state.filtered = state.items;
      } catch (error) {
        state.items = [];
        state.filtered = [];
      }
    };

    // Watch for commerce changes and reload items
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            // Immediately clear filtered data to prevent showing old results
            state.items = [];
            state.filtered = [];
            await loadItems(newCommerce.id);
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
        state.types = getPatientHistoryItemTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('patient-history-item', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Load items for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadItems(commerceToUse.id);
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

    const validateAdd = item => {
      state.errorsAdd = [];
      if (!item.name || item.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessPatientHistoryItemAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!item.type || item.type.length === 0) {
        state.typeError = true;
        state.errorsAdd.push('businessPatientHistoryItemAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if (!item.tag || item.tag.length === 0) {
        state.tagError = true;
        state.errorsAdd.push('businessPatientHistoryItemAdmin.validate.tag');
      } else {
        state.tagError = false;
      }
      if (!item.order || item.order.length === 0) {
        state.orderAddError = true;
        state.errorsAdd.push('businessPatientHistoryItemAdmin.validate.order');
      } else {
        state.orderAddError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = item => {
      state.errorsUpdate = [];
      if (!item.name || item.name.length === 0) {
        state.nameError = true;
        state.errorsUpdate.push('businessPatientHistoryItemAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!item.order || item.order.length === 0) {
        state.orderUpdateError = true;
        state.errorsUpdate.push('businessPatientHistoryItemAdmin.validate.order');
      } else {
        state.orderUpdateError = false;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

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
          options: '',
        },
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newPatientHistoryItem) && commerce.value && commerce.value.id) {
          state.newPatientHistoryItem.commerceId = commerce.value.id;
          await addPatientHistoryItem(state.newPatientHistoryItem);
          await loadItems(commerce.value.id);
          state.showAdd = false;
          closeAddModal();
          state.newPatientHistoryItem = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const update = async item => {
      try {
        loading.value = true;
        if (validateUpdate(item) && commerce.value && commerce.value.id) {
          await updatePatientHistoryItem(item.id, item);
          await loadItems(commerce.value.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async item => {
      try {
        loading.value = true;
        if (item && item.id && commerce.value && commerce.value.id) {
          item.available = false;
          item.active = false;
          await updatePatientHistoryItem(item.id, item);
          await loadItems(commerce.value.id);
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

    const showUpdateForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
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
      update,
      showAdd,
      add,
      goBack,
      isActiveBusiness,
      unavailable,
      goToUnavailable,
      unavailableCancel,
      receiveFilteredItems,
      commerce,
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
          :src="commerce?.logo || state.business?.logo"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessPatientHistoryItemAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessPatientHistoryItemAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessPatientHistoryItemAdmin">
          <div v-if="isActiveBusiness && state.toggles['patient-history-item.admin.view']">
            <div v-if="!loading" id="businessPatientHistoryItemAdmin-result" class="mt-4">
              <div>
                <div v-if="state.items.length === 0">
                  <Message
                    :title="$t('businessPatientHistoryItemAdmin.message.2.title')"
                    :content="$t('businessPatientHistoryItemAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce && commerce.id" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(item)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-item`"
                      :disabled="!state.toggles['patient-history-item.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.items"
                    :type="'items'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(item, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <PatientHistoryItemName :item="item"></PatientHistoryItemName>
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
                      v-if="state.toggles['patient-history-item.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      class="detailed-data transition-slow"
                    >
                      <PatientHistoryItemFormEdit
                        :item="item"
                        :types="state.types"
                        :toggles="state.toggles"
                        :errors="{
                          nameError: state.nameError,
                          tagError: state.tagError,
                          typeError: state.typeError,
                          orderUpdateError: state.orderUpdateError,
                          errorsUpdate: state.errorsUpdate,
                        }"
                        @update:item="item = $event"
                      />
                      <div class="row g-1">
                        <!-- Datos de Caracteristicas -->
                        <div class="row g-1">
                          <a
                            class="nav-link subdata-title centered active"
                            data-bs-toggle="collapse"
                            href="#update-items"
                          >
                            {{ $t('businessPatientHistoryItemAdmin.characteristics') }}
                            <i class="bi bi-chevron-down"></i>
                          </a>
                        </div>
                        <div id="update-items" class="collapse row m-0">
                          <div id="item-actual-form-update" class="row g-1">
                            <div class="col-6 text-label">
                              {{ $t('businessPatientHistoryItemAdmin.actual') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.frequency') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.ageFrom') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.ageTo') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.comment') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.value') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.result') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.selectN') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.select1') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.yesNo') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.document') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.options') }}
                            </div>
                            <div class="col-6">
                              <input
                                type="text"
                                class="form-control"
                                v-model="item.characteristics.options"
                                placeholder="Answer 1,Anwswer 2"
                              />
                            </div>
                          </div>
                        </div>
                        <div class="col">
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="update(item)"
                            :disabled="!state.toggles['patient-history-item.admin.update']"
                          >
                            {{ $t('businessPatientHistoryItemAdmin.update') }}
                            <i class="bi bi-save"></i>
                          </button>
                          <button
                            class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                            @click="goToUnavailable()"
                            v-if="state.toggles['patient-history-item.admin.unavailable']"
                          >
                            {{ $t('businessQueuesAdmin.unavailable') }}
                            <i class="bi bi-trash-fill"></i>
                          </button>
                          <AreYouSure
                            :show="state.goToUnavailable"
                            :yes-disabled="state.toggles['patient-history-item.admin.unavailable']"
                            :no-disabled="state.toggles['patient-history-item.admin.unavailable']"
                            @actionYes="unavailable(item)"
                            @actionNo="unavailableCancel()"
                          >
                          </AreYouSure>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="
                        (!isActiveBusiness() ||
                          !state.toggles['patient-history-item.admin.read']) &&
                        !loading
                      "
                    >
                      <Message
                        :title="$t('businessPatientHistoryItemAdmin.message.1.title')"
                        :content="$t('businessPatientHistoryItemAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="
              (!isActiveBusiness() || !state.toggles['patient-history-item.admin.view']) && !loading
            "
          >
            <Message
              :title="$t('businessPatientHistoryItemAdmin.message.1.title')"
              :content="$t('businessPatientHistoryItemAdmin.message.1.content')"
            />
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
          <div class="row align-items-center mb-1 desktop-header-row justify-content-start">
            <div class="col-auto desktop-logo-wrapper">
              <div class="desktop-commerce-logo">
                <div id="commerce-logo-desktop">
                  <img
                    v-if="!loading || commerce?.logo || state.business?.logo"
                    class="rounded img-fluid logo-desktop"
                    :alt="$t('logoAlt')"
                    :src="commerce?.logo || state.business?.logo || $t('hubLogoBlanco')"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
            <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
              <ComponentMenu
                :title="$t(`businessPatientHistoryItemAdmin.title`)"
                :toggles="state.toggles"
                component-name="businessPatientHistoryItemAdmin"
                @goBack="goBack"
              >
              </ComponentMenu>
            </div>
          </div>
          <div id="businessPatientHistoryItemAdmin">
            <div v-if="isActiveBusiness && state.toggles['patient-history-item.admin.view']">
              <div v-if="!loading" id="businessPatientHistoryItemAdmin-result" class="mt-4">
                <div>
                  <div v-if="state.items.length === 0">
                    <Message
                      :title="$t('businessPatientHistoryItemAdmin.message.2.title')"
                      :content="$t('businessPatientHistoryItemAdmin.message.2.content')"
                    />
                  </div>
                  <div v-if="commerce && commerce.id" class="row mb-2">
                    <div class="col lefted">
                      <button
                        class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                        @click="showAdd(item)"
                        data-bs-toggle="modal"
                        :data-bs-target="`#add-item`"
                        :disabled="!state.toggles['patient-history-item.admin.add']"
                      >
                        <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                      </button>
                    </div>
                  </div>
                  <div>
                    <SearchAdminItem
                      :business-items="state.items"
                      :type="'items'"
                      :receive-filtered-items="receiveFilteredItems"
                    >
                    </SearchAdminItem>
                    <div v-for="(item, index) in state.filtered" :key="index" class="result-card">
                      <div class="row">
                        <div class="col-10">
                          <PatientHistoryItemName :item="item"></PatientHistoryItemName>
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
                        v-if="state.toggles['patient-history-item.admin.read']"
                        :class="{ show: state.extendedEntity === index }"
                        class="detailed-data transition-slow"
                      >
                        <PatientHistoryItemFormEdit
                          :item="item"
                          :toggles="state.toggles"
                          :errors="{
                            nameError: state.nameError,
                            errorsUpdate: state.errorsUpdate,
                          }"
                          @update:item="item = $event"
                        />
                        <!-- Datos de Caracteristicas -->
                        <div class="row g-1">
                          <a
                            class="nav-link subdata-title centered active"
                            data-bs-toggle="collapse"
                            href="#update-items"
                          >
                            {{ $t('businessPatientHistoryItemAdmin.characteristics') }}
                            <i class="bi bi-chevron-down"></i>
                          </a>
                        </div>
                        <div id="update-items" class="collapse row m-0">
                          <div id="item-actual-form-update" class="row g-1">
                            <div class="col-6 text-label">
                              {{ $t('businessPatientHistoryItemAdmin.actual') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.frequency') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.ageFrom') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.ageTo') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.comment') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.value') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.result') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.selectN') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.select1') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.yesNo') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.document') }}
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
                              {{ $t('businessPatientHistoryItemAdmin.options') }}
                            </div>
                            <div class="col-6">
                              <input
                                type="text"
                                class="form-control"
                                v-model="item.characteristics.options"
                                placeholder="Answer 1,Anwswer 2"
                              />
                            </div>
                          </div>
                        </div>
                        <div class="col">
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="update(item)"
                            :disabled="!state.toggles['patient-history-item.admin.update']"
                          >
                            {{ $t('businessPatientHistoryItemAdmin.update') }}
                            <i class="bi bi-save"></i>
                          </button>
                          <button
                            class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                            @click="goToUnavailable()"
                            v-if="state.toggles['patient-history-item.admin.unavailable']"
                          >
                            {{ $t('businessQueuesAdmin.unavailable') }}
                            <i class="bi bi-trash-fill"></i>
                          </button>
                          <AreYouSure
                            :show="state.goToUnavailable"
                            :yes-disabled="state.toggles['patient-history-item.admin.unavailable']"
                            :no-disabled="state.toggles['patient-history-item.admin.unavailable']"
                            @actionYes="unavailable(item)"
                            @actionNo="unavailableCancel()"
                          >
                          </AreYouSure>
                        </div>
                      </div>
                      <div
                        v-if="
                          (!isActiveBusiness() ||
                            !state.toggles['patient-history-item.admin.read']) &&
                          !loading
                        "
                      >
                        <Message
                          :title="$t('businessPatientHistoryItemAdmin.message.1.title')"
                          :content="$t('businessPatientHistoryItemAdmin.message.1.content')"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="
              (!isActiveBusiness() || !state.toggles['patient-history-item.admin.view']) && !loading
            "
          >
            <Message
              :title="$t('businessPatientHistoryItemAdmin.message.1.title')"
              :content="$t('businessPatientHistoryItemAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Add -->
    <div
      class="modal fade"
      :id="`add-item`"
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
              id="add-item"
              class="result-card mb-4"
              v-if="state.showAdd && state.toggles['patient-history-item.admin.add']"
            >
              <div v-if="state.items.length < state.toggles['patient-history-item.admin.limit']">
                <PatientHistoryItemFormAdd
                  v-model="state.newPatientHistoryItem"
                  :types="state.types"
                  :toggles="state.toggles"
                  :errors="{
                    nameError: state.nameError,
                    tagError: state.tagError,
                    typeError: state.typeError,
                    orderAddError: state.orderAddError,
                    errorsAdd: state.errorsAdd,
                  }"
                />
                <div class="row g-1">
                  <!-- Datos de Caracteristicas -->
                  <div class="row g-1">
                    <a
                      class="nav-link subdata-title centered active"
                      data-bs-toggle="collapse"
                      href="#add-items"
                    >
                      {{ $t('businessPatientHistoryItemAdmin.characteristics') }}
                      <i class="bi bi-chevron-down"></i>
                    </a>
                  </div>
                  <div id="add-items" class="collapse row m-0">
                    <div id="item-actual-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPatientHistoryItemAdmin.actual') }}
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
                        {{ $t('businessPatientHistoryItemAdmin.frequency') }}
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
                        {{ $t('businessPatientHistoryItemAdmin.ageFrom') }}
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
                        {{ $t('businessPatientHistoryItemAdmin.ageTo') }}
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
                        {{ $t('businessPatientHistoryItemAdmin.comment') }}
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
                        {{ $t('businessPatientHistoryItemAdmin.value') }}
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
                        {{ $t('businessPatientHistoryItemAdmin.result') }}
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
                        {{ $t('businessPatientHistoryItemAdmin.selectN') }}
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
                        {{ $t('businessPatientHistoryItemAdmin.select1') }}
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
                        {{ $t('businessPatientHistoryItemAdmin.yesNo') }}
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
                        {{ $t('businessPatientHistoryItemAdmin.document') }}
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
                        {{ $t('businessPatientHistoryItemAdmin.options') }}
                      </div>
                      <div class="col-6">
                        <input
                          type="text"
                          class="form-control"
                          v-model="state.newPatientHistoryItem.characteristics.options"
                          placeholder="Answer 1,Anwswer 2"
                        />
                      </div>
                    </div>
                  </div>
                  <div class="col">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="add(state.newPatientHistoryItem)"
                    >
                      {{ $t('businessPatientHistoryItemAdmin.add') }} <i class="bi bi-save"></i>
                    </button>
                  </div>
                </div>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessPatientHistoryItemAdmin.message.3.title')"
                  :content="$t('businessPatientHistoryItemAdmin.message.3.content')"
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

/* Result Card */
.result-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 8px;
  padding: 0.2rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.result-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.detailed-data {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
  padding: 0;
}

.detailed-data.show {
  max-height: 1500px;
  padding: 0.5rem;
  overflow-y: auto;
}

.item-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.is-disabled {
  opacity: 0.5;
}

/* Characteristics Section */
.subdata-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #000000;
  padding: 0.5rem;
  background: rgba(0, 194, 203, 0.05);
  border-radius: 5px;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
}

.subdata-title:hover {
  background: rgba(0, 194, 203, 0.1);
}

.collapse {
  padding: 0.5rem;
  background: rgba(245, 246, 247, 0.5);
  border-radius: 5px;
  margin-top: 0.25rem;
}

.collapse .row {
  margin-bottom: 0.5rem;
}

.collapse .row:last-child {
  margin-bottom: 0;
}

.collapse .text-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #000000;
}

.collapse .form-control {
  font-size: 0.8125rem;
  padding: 0.4rem 0.625rem;
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
}

.collapse .form-control:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
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
    justify-content: center;
  }

  .desktop-header-row .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 60px;
    object-fit: contain;
  }

  .desktop-header-row #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .desktop-header-row .desktop-menu-wrapper {
    flex: 1 1 auto;
    min-width: 0;
  }
}
</style>
