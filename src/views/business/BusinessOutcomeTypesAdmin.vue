<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getOutcomeTypesByCommerceId,
  updateOutcomeType,
  addOutcomeType,
} from '../../application/services/outcome-type';
import { getPermissions } from '../../application/services/permissions';
import OutcomeTypeName from '../../components/common/OutcomeTypeName.vue';
import OutcomeTypeFormEdit from '../../components/outcome-type/OutcomeTypeFormEdit.vue';
import OutcomeTypeFormAdd from '../../components/outcome-type/OutcomeTypeFormAdd.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import { getOutcomeTypes } from '../../shared/utils/data.ts';

export default {
  name: 'BusinessOutcomeTypesAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    OutcomeTypeName,
    OutcomeTypeFormEdit,
    OutcomeTypeFormAdd,
    Toggle,
    Warning,
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
      goToUnavailable: false,
      outcomeTypes: ref([]),
      showAdd: false,
      newOutcomeType: {},
      extendedEntity: undefined,
      tagAddError: false,
      tadUpdateError: false,
      typeError: false,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      tagUpdateError: false,
      toggles: {},
      filtered: [],
      types: [],
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Load outcome types when commerce changes
    const loadOutcomeTypes = async commerceId => {
      if (!commerceId) {
        state.outcomeTypes = [];
        state.filtered = [];
        return;
      }
      try {
        const outcomeTypes = await getOutcomeTypesByCommerceId(commerceId);
        state.outcomeTypes = outcomeTypes || [];
        state.filtered = state.outcomeTypes;
      } catch (error) {
        state.outcomeTypes = [];
        state.filtered = [];
      }
    };

    // Watch for commerce changes and reload outcome types
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            // Immediately clear filtered data to prevent showing old results
            state.outcomeTypes = [];
            state.filtered = [];
            await loadOutcomeTypes(newCommerce.id);
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
        state.types = getOutcomeTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('outcome-types', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Load outcome types for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadOutcomeTypes(commerceToUse.id);
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

    const validateAdd = outcomeType => {
      state.errorsAdd = [];
      if (!outcomeType.name || outcomeType.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessOutcomeTypesAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!outcomeType.tag || outcomeType.tag.length === 0) {
        state.tagAddError = true;
        state.errorsAdd.push('businessOutcomeTypesAdmin.validate.tag');
      } else {
        state.tagAddError = false;
      }
      if (!outcomeType.type || outcomeType.type.length === 0) {
        state.typeError = true;
        state.errorsAdd.push('businessOutcomeTypesAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = outcomeType => {
      state.errorsUpdate = [];
      if (!outcomeType.tag || outcomeType.tag.length === 0) {
        state.tagUpdateError = true;
        state.errorsUpdate.push('businessOutcomeTypesAdmin.validate.tag');
      } else {
        state.tagUpdateError = false;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const showAdd = () => {
      state.showAdd = true;
      state.newOutcomeType = {
        order: state.outcomeTypes.length + 1,
        active: true,
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newOutcomeType) && commerce.value && commerce.value.id) {
          state.newOutcomeType.commerceId = commerce.value.id;
          await addOutcomeType(state.newOutcomeType);
          await loadOutcomeTypes(commerce.value.id);
          state.showAdd = false;
          closeAddModal();
          state.newOutcomeType = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const update = async outcomeType => {
      try {
        loading.value = true;
        if (validateUpdate(outcomeType) && commerce.value && commerce.value.id) {
          await updateOutcomeType(outcomeType.id, outcomeType);
          await loadOutcomeTypes(commerce.value.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async outcomeType => {
      try {
        loading.value = true;
        if (outcomeType && outcomeType.id && commerce.value && commerce.value.id) {
          outcomeType.available = false;
          outcomeType.active = false;
          await updateOutcomeType(outcomeType.id, outcomeType);
          await loadOutcomeTypes(commerce.value.id);
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
    <!-- Desktop -->
    <div class="content text-center">
      <DesktopPageHeader
        :logo="state.business?.logo"
        :business-id="state.business?.id"
        :loading="loading"
        :title="$t(`businessOutcomeTypesAdmin.title`)"
        :toggles="state.toggles"
        component-name="businessOutcomeTypesAdmin"
        @go-back="goBack"
      />
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="false" :stack="alertError"></Alert>
      </div>
      <div id="businessOutcomeTypesAdmin">
        <div v-if="isActiveBusiness && state.toggles['outcome-types.admin.view']">
          <div class="control-box my-4"></div>
          <div v-if="!loading" id="businessOutcomeTypesAdmin-result" class="mt-4">
            <div>
              <div v-if="state.outcomeTypes.length === 0">
                <Message
                  :title="$t('businessOutcomeTypesAdmin.message.2.title')"
                  :content="$t('businessOutcomeTypesAdmin.message.2.content')"
                />
              </div>
              <div v-if="commerce && commerce.id" class="row mb-2">
                <div class="col lefted">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                    @click="showAdd(outcomeType)"
                    data-bs-toggle="modal"
                    :data-bs-target="`#add-outcomeType`"
                    :disabled="!state.toggles['outcome-types.admin.add']"
                  >
                    <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                  </button>
                </div>
              </div>
              <div>
                <SearchAdminItem
                  :business-items="state.outcomeTypes"
                  :type="'outcomes'"
                  :receive-filtered-items="receiveFilteredItems"
                >
                </SearchAdminItem>
                <div
                  v-for="(outcomeType, index) in state.filtered"
                  :key="index"
                  class="result-card"
                >
                  <div class="row">
                    <div class="col-10">
                      <OutcomeTypeName
                        :name="outcomeType.name"
                        :active="outcomeType.active"
                        :tag="outcomeType.tag"
                      ></OutcomeTypeName>
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
                  <OutcomeTypeFormEdit
                    v-if="state.toggles['outcome-types.admin.read']"
                    :class="{ show: state.extendedEntity === index }"
                    :outcome-type="outcomeType"
                    :types="state.types"
                    :toggles="state.toggles"
                    :errors="{
                      tagError: state.tagUpdateError,
                      errorsUpdate: state.errorsUpdate || [],
                    }"
                    @update:outcomeType="outcomeType = $event"
                  />
                  <div
                    v-if="
                      state.toggles['outcome-types.admin.read'] && state.extendedEntity === index
                    "
                    class="row g-1 mt-2"
                  >
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4 pulse-btn"
                        @click="update(outcomeType)"
                        v-if="state.toggles['outcome-types.admin.update']"
                      >
                        {{ $t('businessOutcomeTypesAdmin.update') }} <i class="bi bi-save"></i>
                      </button>
                      <button
                        class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                        @click="goToUnavailable()"
                        v-if="state.toggles['outcome-types.admin.unavailable']"
                      >
                        {{ $t('businessQueuesAdmin.unavailable') }}
                        <i class="bi bi-trash-fill"></i>
                      </button>
                      <AreYouSure
                        :show="state.goToUnavailable"
                        :yes-disabled="state.toggles['outcome-types.admin.unavailable']"
                        :no-disabled="state.toggles['outcome-types.admin.unavailable']"
                        @actionYes="unavailable(outcomeType)"
                        @actionNo="unavailableCancel()"
                      >
                      </AreYouSure>
                    </div>
                  </div>
                  <div
                    v-if="
                      (!isActiveBusiness() || !state.toggles['outcome-types.admin.read']) &&
                      !loading
                    "
                  >
                    <Message
                      :title="$t('businessOutcomeTypesAdmin.message.1.title')"
                      :content="$t('businessOutcomeTypesAdmin.message.1.content')"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['outcome-types.admin.view']) && !loading">
          <Message
            :title="$t('businessOutcomeTypesAdmin.message.1.title')"
            :content="$t('businessOutcomeTypesAdmin.message.1.content')"
          />
        </div>
      </div>
    </div>

    <!-- Modal Add -->
    <div
      class="modal fade"
      :id="`add-outcomeType`"
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
            <div
              id="add-outcomeType"
              class="result-card mb-4"
              v-if="state.showAdd && state.toggles['outcome-types.admin.add']"
            >
              <div class="control-box my-4"></div>
              <div v-if="state.outcomeTypes.length < state.toggles['outcome-types.admin.limit']">
                <OutcomeTypeFormAdd
                  v-model="state.newOutcomeType"
                  :types="state.types"
                  :toggles="state.toggles"
                  :errors="{
                    nameError: state.nameError,
                    tagError: state.tagAddError,
                    typeError: state.typeError,
                    errorsAdd: state.errorsAdd,
                  }"
                />
                <div class="col mt-3">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4 pulse-btn"
                    @click="add(state.newOutcomeType)"
                  >
                    {{ $t('businessOutcomeTypesAdmin.add') }} <i class="bi bi-save"></i>
                  </button>
                </div>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessOutcomeTypesAdmin.message.3.title')"
                  :content="$t('businessOutcomeTypesAdmin.message.3.content')"
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
