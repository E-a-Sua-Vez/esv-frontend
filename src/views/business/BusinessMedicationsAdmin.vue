<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getAllMedications,
  getMedicationByCommerce,
  createMedication,
  updateMedication,
  deleteMedication,
} from '../../application/services/medication';
import { getPermissions } from '../../application/services/permissions';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import MedicationSimpleName from '../../components/common/MedicationSimpleName.vue';

export default {
  name: 'BusinessMedicationsAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    Warning,
    AreYouSure,
    ComponentMenu,
    SearchAdminItem,
    MedicationSimpleName,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    const state = reactive({
      currentUser: {},
      business: {},
      medications: ref([]),
      showAdd: false,
      goToUnavailable: false,
      newMedication: {
        name: '',
        commercialName: '',
        atcCode: '',
        activePrinciple: '',
        presentation: '',
        dosageForm: '',
        route: '',
        standardDosage: '',
        contraindications: [],
        interactions: [],
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

    // Load medications when commerce changes
    const loadMedications = async commerceId => {
      if (!commerceId) {
        state.medications = [];
        state.filtered = [];
        return;
      }
      try {
        loading.value = true;
        const medications = await getMedicationByCommerce(commerceId);
        state.medications = medications || [];
        state.filtered = state.medications;
        loading.value = false;
      } catch (error) {
        state.medications = [];
        state.filtered = [];
        loading.value = false;
      }
    };

    // Watch for commerce changes and reload medications
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            // Immediately clear data to prevent showing old results
            state.medications = [];
            state.filtered = [];
            await loadMedications(newCommerce.id);
          } catch (error) {
            state.medications = [];
            state.filtered = [];
            loading.value = false;
          }
        } else if (!newCommerce || !newCommerce.id) {
          // Clear data if no commerce selected
          state.medications = [];
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
        state.toggles = await getPermissions('medications', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Load medications for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadMedications(commerceToUse.id);
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

    const validateAdd = medication => {
      state.errorsAdd = [];
      if (!medication.name || medication.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessMedicationsAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!medication.activePrinciple || medication.activePrinciple.length === 0) {
        state.errorsAdd.push('businessMedicationsAdmin.validate.activePrinciple');
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const showAdd = () => {
      state.showAdd = true;
      state.newMedication = {
        name: '',
        commercialName: '',
        atcCode: '',
        activePrinciple: '',
        presentation: '',
        dosageForm: '',
        route: '',
        standardDosage: '',
        contraindications: [],
        interactions: [],
        active: true,
        available: true,
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newMedication)) {
          if (commerce.value && commerce.value.id) {
            state.newMedication.commerceId = commerce.value.id;
          }
          await createMedication(state.newMedication);
          await loadMedications(commerce.value?.id);
          state.showAdd = false;
          state.newMedication = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const update = async medication => {
      try {
        loading.value = true;
        await updateMedication(medication.id, medication);
        if (commerce.value && commerce.value.id) {
          await loadMedications(commerce.value.id);
        }
        state.extendedEntity = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async medication => {
      try {
        loading.value = true;
        if (medication && medication.id) {
          await deleteMedication(medication.id);
          if (commerce.value && commerce.value.id) {
            await loadMedications(commerce.value.id);
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
      commerce,
      goToUnavailable,
      unavailableCancel,
      receiveFilteredItems,
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
          :title="$t(`businessMedicationsAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessMedicationsAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessMedicationsAdmin">
          <div v-if="isActiveBusiness && state.toggles['medications.admin.view']">
            <div v-if="!loading" id="businessMedicationsAdmin-result" class="mt-4">
              <div>
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessMedicationsAdmin.message.4.title')"
                    :content="$t('businessMedicationsAdmin.message.4.content')"
                  />
                </div>
                <div v-if="commerce && state.medications.length === 0">
                  <Message
                    :title="$t('businessMedicationsAdmin.message.2.title')"
                    :content="$t('businessMedicationsAdmin.message.2.content')"
                  />
                </div>
                <div class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd()"
                      data-bs-toggle="modal"
                      data-bs-target="#add-medication"
                      :disabled="!state.toggles['medications.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.medications"
                    :type="'medications'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div
                    v-for="(medication, index) in state.filtered"
                    :key="index"
                    class="result-card"
                  >
                    <div class="row">
                      <div class="col-10">
                        <MedicationSimpleName :medication="medication"></MedicationSimpleName>
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
                    <div v-if="state.extendedEntity === index" class="mt-3">
                      <div class="form-fields-container">
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicationsAdmin.name') }}
                          </label>
                          <input
                            id="update-medication-name-form"
                            v-model="medication.name"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medications.admin.update']"
                            placeholder=""
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicationsAdmin.activePrinciple') }}
                          </label>
                          <input
                            id="update-medication-activePrinciple-form"
                            v-model="medication.activePrinciple"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medications.admin.update']"
                            placeholder=""
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicationsAdmin.presentation') }}
                          </label>
                          <input
                            id="update-medication-presentation-form"
                            v-model="medication.presentation"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medications.admin.update']"
                            placeholder=""
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicationsAdmin.route') }}
                          </label>
                          <input
                            id="update-medication-route-form"
                            v-model="medication.route"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medications.admin.update']"
                            placeholder=""
                          />
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(medication)"
                          :disabled="!state.toggles['medications.admin.update']"
                        >
                          {{ $t('businessMedicationsAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['medications.admin.delete']"
                        >
                          {{ $t('businessMedicationsAdmin.delete') }}
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          @actionYes="unavailable(medication)"
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
          <div v-if="(!isActiveBusiness() || !state.toggles['medications.admin.view']) && !loading">
            <Message
              :title="$t('businessMedicationsAdmin.message.1.title')"
              :content="$t('businessMedicationsAdmin.message.1.content')"
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
              :title="$t(`businessMedicationsAdmin.title`)"
              :toggles="state.toggles"
              component-name="businessMedicationsAdmin"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <div id="businessMedicationsAdmin">
          <div v-if="isActiveBusiness && state.toggles['medications.admin.view']">
            <div id="businessMedicationsAdmin-controls" class="control-box">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessMedicationsAdmin.message.4.title')"
                    :content="$t('businessMedicationsAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessMedicationsAdmin-result" class="mt-4">
              <div>
                <div v-if="commerce && state.medications.length === 0">
                  <Message
                    :title="$t('businessMedicationsAdmin.message.2.title')"
                    :content="$t('businessMedicationsAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd()"
                      data-bs-toggle="modal"
                      data-bs-target="#add-medication"
                      :disabled="!state.toggles['medications.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div v-if="commerce">
                  <SearchAdminItem
                    :business-items="state.medications"
                    :type="'medications'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div
                    v-for="(medication, index) in state.filtered"
                    :key="index"
                    class="result-card"
                  >
                    <div class="row">
                      <div class="col-10">
                        <MedicationSimpleName :medication="medication"></MedicationSimpleName>
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
                    <div v-if="state.extendedEntity === index" class="mt-3">
                      <div class="form-fields-container">
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicationsAdmin.name') }}
                          </label>
                          <input
                            id="update-medication-name-form"
                            v-model="medication.name"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medications.admin.update']"
                            placeholder=""
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicationsAdmin.activePrinciple') }}
                          </label>
                          <input
                            id="update-medication-activePrinciple-form"
                            v-model="medication.activePrinciple"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medications.admin.update']"
                            placeholder=""
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicationsAdmin.presentation') }}
                          </label>
                          <input
                            id="update-medication-presentation-form"
                            v-model="medication.presentation"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medications.admin.update']"
                            placeholder=""
                          />
                        </div>
                        <div class="form-group-modern">
                          <label class="form-label-modern">
                            {{ $t('businessMedicationsAdmin.route') }}
                          </label>
                          <input
                            id="update-medication-route-form"
                            v-model="medication.route"
                            type="text"
                            class="form-control-modern"
                            :disabled="!state.toggles['medications.admin.update']"
                            placeholder=""
                          />
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(medication)"
                          :disabled="!state.toggles['medications.admin.update']"
                        >
                          {{ $t('businessMedicationsAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['medications.admin.delete']"
                        >
                          {{ $t('businessMedicationsAdmin.delete') }}
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          @actionYes="unavailable(medication)"
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
          <div v-if="(!isActiveBusiness() || !state.toggles['medications.admin.view']) && !loading">
            <Message
              :title="$t('businessMedicationsAdmin.message.1.title')"
              :content="$t('businessMedicationsAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Add -->
    <div
      class="modal fade"
      id="add-medication"
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
            <div id="add-medication" class="result-card mb-4" v-if="state.showAdd">
              <div class="form-fields-container">
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessMedicationsAdmin.name') }} *
                  </label>
                  <input
                    id="add-medication-name-form"
                    v-model="state.newMedication.name"
                    type="text"
                    class="form-control-modern"
                    :class="{ 'is-invalid': state.nameError }"
                    placeholder=""
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessMedicationsAdmin.commercialName') }}
                  </label>
                  <input
                    id="add-medication-commercialName-form"
                    v-model="state.newMedication.commercialName"
                    type="text"
                    class="form-control-modern"
                    placeholder=""
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessMedicationsAdmin.activePrinciple') }} *
                  </label>
                  <input
                    id="add-medication-activePrinciple-form"
                    v-model="state.newMedication.activePrinciple"
                    type="text"
                    class="form-control-modern"
                    placeholder=""
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessMedicationsAdmin.presentation') }}
                  </label>
                  <input
                    id="add-medication-presentation-form"
                    v-model="state.newMedication.presentation"
                    type="text"
                    class="form-control-modern"
                    placeholder=""
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessMedicationsAdmin.dosageForm') }}
                  </label>
                  <input
                    id="add-medication-dosageForm-form"
                    v-model="state.newMedication.dosageForm"
                    type="text"
                    class="form-control-modern"
                    placeholder=""
                  />
                </div>
                <div class="form-group-modern">
                  <label class="form-label-modern">
                    {{ $t('businessMedicationsAdmin.route') }}
                  </label>
                  <input
                    id="add-medication-route-form"
                    v-model="state.newMedication.route"
                    type="text"
                    class="form-control-modern"
                    placeholder=""
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
              <div class="col mt-3">
                <button
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                  @click="add()"
                >
                  {{ $t('businessMedicationsAdmin.add') }} <i class="bi bi-save"></i>
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

  .desktop-header-row .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
    text-align: left;
  }
}
</style>
