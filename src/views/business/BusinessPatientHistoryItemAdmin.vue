<script setup>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';

import {
  getPatientHistoryItemByCommerce,
  updatePatientHistoryItem,
  addPatientHistoryItem,
} from '../../application/services/patient-history-item';

import { getPermissions } from '../../application/services/permissions';
import { getPatientHistoryItemTypes } from '../../shared/utils/data';

import PatientHistoryItemName from '../../components/common/PatientHistoryItemName.vue';
import PatientHistoryItemFormEdit from '../../components/patient-history-item/PatientHistoryItemFormEdit.vue';
import PatientHistoryItemFormAdd from '../../components/patient-history-item/PatientHistoryItemFormAdd.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';

const router = useRouter();
const store = globalStore();

const loading = ref(false);
const alertError = ref('');

const state = reactive({
  currentUser: {},
  business: {},
  items: [],
  filtered: [],
  types: [],
  toggles: {},
  showAdd: false,
  goToUnavailable: false,
  extendedEntity: null,
  newPatientHistoryItem: {},
  errorsAdd: [],
  errorsUpdate: [],
  nameError: false,
  tagError: false,
  typeError: false,
  orderAddError: false,
  orderUpdateError: false,
});

const commerce = computed(() => store.getCurrentCommerce);

const isActiveBusiness = computed(() => state.business?.active === true);

/* ---------------- LOADERS ---------------- */

async function loadItems(commerceId) {
  if (!commerceId) {
    state.items = [];
    state.filtered = [];
    return;
  }

  try {
    const data = await getPatientHistoryItemByCommerce(commerceId);
    state.items = data || [];
    state.filtered = [...state.items];
  } catch {
    state.items = [];
    state.filtered = [];
  }
}

watch(commerce, async (newVal, oldVal) => {
  if (newVal?.id && newVal.id !== oldVal?.id) {
    loading.value = true;
    await loadItems(newVal.id);
    loading.value = false;
  }
});

onBeforeMount(async () => {
  loading.value = true;

  state.types = getPatientHistoryItemTypes();
  state.currentUser = await store.getCurrentUser;
  state.business = await store.getActualBusiness();
  state.toggles = await getPermissions('patient-history-item', 'admin');

  if (!commerce.value?.id) {
    const list = await store.getAvailableCommerces(state.business.commerces);
    if (list?.length) await store.setCurrentCommerce(list[0]);
  }

  if (commerce.value?.id) await loadItems(commerce.value.id);

  loading.value = false;
});

/* ---------------- ACTIONS ---------------- */

function showAdd() {
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
}

async function addItem() {
  if (!commerce.value?.id) return;

  loading.value = true;
  state.newPatientHistoryItem.commerceId = commerce.value.id;
  await addPatientHistoryItem(state.newPatientHistoryItem);
  await loadItems(commerce.value.id);
  state.showAdd = false;
  loading.value = false;
}

async function updateItem(item) {
  if (!commerce.value?.id) return;

  loading.value = true;
  await updatePatientHistoryItem(item.id, item);
  await loadItems(commerce.value.id);
  state.extendedEntity = null;
  loading.value = false;
}

function toggleExpand(index) {
  state.extendedEntity = state.extendedEntity === index ? null : index;
}

function receiveFilteredItems(items) {
  state.filtered = items;
}

function goBack() {
  router.back();
}
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
          :title="$t('businessPatientHistoryItemAdmin.title')"
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
                      @click="showAdd"
                      data-bs-toggle="modal"
                      data-bs-target="#add-item"
                      :disabled="!state.toggles['patient-history-item.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.items"
                    type="items"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(item, index) in state.filtered" :key="item.id" class="result-card">
                    <div class="row align-items-center">
                      <div class="col-10">
                        <PatientHistoryItemName :item="item" />
                      </div>
                      <div class="col-2 text-end">
                        <a href="#" @click.prevent="toggleExpand(index)">
                          <i
                            :class="
                              state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                            "
                          />
                        </a>
                      </div>
                    </div>

                    <div v-if="state.extendedEntity === index" class="detailed-data show">
                      <PatientHistoryItemFormEdit
                        :item="item"
                        :types="state.types"
                        :toggles="state.toggles"
                      />

                      <div class="col text-center">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="updateItem(item)"
                          :disabled="!state.toggles['patient-history-item.admin.update']"
                        >
                          {{ $t('businessPatientHistoryItemAdmin.update') }}
                          <i class="bi bi-save"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="
              (!isActiveBusiness || !state.toggles['patient-history-item.admin.view']) && !loading
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

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="container-fluid">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <DesktopPageHeader
          :logo="commerce?.logo || state.business?.logo"
          :loading="loading"
          :title="$t('businessPatientHistoryItemAdmin.title')"
          :toggles="state.toggles"
          component-name="businessPatientHistoryItemAdmin"
          @go-back="goBack"
        />
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
                      @click="showAdd"
                      data-bs-toggle="modal"
                      data-bs-target="#add-item"
                      :disabled="!state.toggles['patient-history-item.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.items"
                    type="items"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(item, index) in state.filtered" :key="item.id" class="result-card">
                    <div class="row align-items-center">
                      <div class="col-10">
                        <PatientHistoryItemName :item="item" />
                      </div>
                      <div class="col-2 text-end">
                        <a href="#" @click.prevent="toggleExpand(index)">
                          <i
                            :class="
                              state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                            "
                          />
                        </a>
                      </div>
                    </div>

                    <div v-if="state.extendedEntity === index" class="detailed-data show">
                      <PatientHistoryItemFormEdit
                        :item="item"
                        :types="state.types"
                        :toggles="state.toggles"
                      />

                      <div class="col text-center">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="updateItem(item)"
                          :disabled="!state.toggles['patient-history-item.admin.update']"
                        >
                          {{ $t('businessPatientHistoryItemAdmin.update') }}
                          <i class="bi bi-save"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="
              (!isActiveBusiness || !state.toggles['patient-history-item.admin.view']) && !loading
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

    <!-- MODAL ADD -->
    <div
      class="modal fade"
      id="add-item"
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
              id="add-item-form"
              class="result-card mb-4"
              v-if="
                state.items.length < (state.toggles['patient-history-item.admin.limit'] || 9999)
              "
            >
              <PatientHistoryItemFormAdd
                v-model="state.newPatientHistoryItem"
                :types="state.types"
                :toggles="state.toggles"
              />
              <div class="col">
                <button
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                  @click="addItem"
                >
                  {{ $t('businessPatientHistoryItemAdmin.add') }} <i class="bi bi-save"></i>
                </button>
              </div>
            </div>
            <div v-else>
              <Message
                :title="$t('businessPatientHistoryItemAdmin.message.3.title')"
                :content="$t('businessPatientHistoryItemAdmin.message.3.content')"
              />
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              data-bs-dismiss="modal"
              aria-label="Close"
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
    max-width: 150px;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo #commerce-logo {
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
