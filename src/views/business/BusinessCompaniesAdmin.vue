<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getCompanyByCommerce,
  updateCompany,
  addCompany,
} from '../../application/services/company';
import { getPermissions } from '../../application/services/permissions';
import Popper from 'vue3-popper';
import ServiceSimpleName from '../../components/common/ServiceSimpleName.vue';
import CompanyFormEdit from '../../components/company/CompanyFormEdit.vue';
import CompanyFormAdd from '../../components/company/CompanyFormAdd.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import { getCompanyTypes } from '../../shared/utils/data.ts';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';

export default {
  name: 'BusinessCompaniesAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ServiceSimpleName,
    CompanyFormEdit,
    CompanyFormAdd,
    Toggle,
    Warning,
    AreYouSure,
    Popper,
    ComponentMenu,
    DesktopPageHeader,
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
      companies: ref([]),
      showAdd: false,
      goToUnavailable: false,
      newCompany: {},
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
      filtered: [],
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Load companies when commerce changes
    const loadCompanies = async commerceId => {
      if (!commerceId) {
        state.companies = [];
        state.filtered = [];
        return;
      }
      try {
        const companies = await getCompanyByCommerce(commerceId);
        state.companies = companies || [];
        state.filtered = state.companies;
      } catch (error) {
        state.companies = [];
        state.filtered = [];
      }
    };

    // Watch for commerce changes and reload companies
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            // Immediately clear filtered data to prevent showing old results
            state.companies = [];
            state.filtered = [];
            await loadCompanies(newCommerce.id);
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
        state.types = getCompanyTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('companies', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Load companies for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadCompanies(commerceToUse.id);
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

    const validateAdd = service => {
      state.errorsAdd = [];
      if (!service.name || service.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessCompaniesAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!service.type || service.type.length === 0) {
        state.typeError = true;
        state.errorsAdd.push('businessCompaniesAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if (!service.tag || service.tag.length === 0) {
        state.tagError = true;
        state.errorsAdd.push('businessCompaniesAdmin.validate.tag');
      } else {
        state.tagError = false;
      }
      if (!service.order || service.order.length === 0) {
        state.orderAddError = true;
        state.errorsAdd.push('businessCompaniesAdmin.validate.order');
      } else {
        state.orderAddError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = service => {
      state.errorsUpdate = [];
      if (!service.name || service.name.length === 0) {
        state.nameError = true;
        state.errorsUpdate.push('businessCompaniesAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!service.order || service.order.length === 0) {
        state.orderUpdateError = true;
        state.errorsUpdate.push('businessCompaniesAdmin.validate.order');
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
      state.newCompany = {
        order: state.companies.length + 1,
        online: true,
        active: true,
        serviceInfo: {},
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newCompany) && commerce.value && commerce.value.id) {
          state.newCompany.commerceId = commerce.value.id;
          await addCompany(state.newCompany);
          await loadCompanies(commerce.value.id);
          state.showAdd = false;
          closeAddModal();
          state.newCompany = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const update = async service => {
      try {
        loading.value = true;
        if (validateUpdate(service) && commerce.value && commerce.value.id) {
          await updateCompany(service.id, service);
          await loadCompanies(commerce.value.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async service => {
      try {
        loading.value = true;
        if (service && service.id && commerce.value && commerce.value.id) {
          service.available = false;
          service.active = false;
          await updateCompany(service.id, service);
          await loadCompanies(commerce.value.id);
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
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo
          :src="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessCompaniesAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessCompaniesAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessCompaniesAdmin">
          <div v-if="isActiveBusiness && state.toggles['companies.admin.view']">
            <div class="control-box my-4"></div>
            <div v-if="!loading" id="businessCompaniesAdmin-result" class="mt-4">
              <div>
                <div v-if="state.companies.length === 0">
                  <Message
                    :title="$t('businessCompaniesAdmin.message.2.title')"
                    :content="$t('businessCompaniesAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce && commerce.id" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                      @click="showAdd(service)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-service`"
                      :disabled="!state.toggles['companies.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.companies"
                    :type="'companies'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(service, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <ServiceSimpleName :service="service"></ServiceSimpleName>
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
                    <CompanyFormEdit
                      v-if="state.toggles['companies.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      :company="service"
                      :types="state.types"
                      :toggles="state.toggles"
                      :errors="{
                        tagError: state.tagError,
                        orderError: state.orderUpdateError,
                        errorsUpdate: state.errorsUpdate,
                      }"
                      :max-order="state.companies.length"
                      @update:company="service = $event"
                    />
                    <div
                      v-if="state.toggles['companies.admin.read'] && state.extendedEntity === index"
                      class="row g-1 mt-2"
                    >
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(service)"
                          :disabled="!state.toggles['companies.admin.update']"
                        >
                          {{ $t('businessCompaniesAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['companies.admin.unavailable']"
                        >
                          {{ $t('businessQueuesAdmin.unavailable') }}
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          :yes-disabled="state.toggles['companies.admin.unavailable']"
                          :no-disabled="state.toggles['companies.admin.unavailable']"
                          @actionYes="unavailable(service)"
                          @actionNo="unavailableCancel()"
                        >
                        </AreYouSure>
                      </div>
                    </div>
                    <div
                      v-if="
                        (!isActiveBusiness() || !state.toggles['companies.admin.read']) && !loading
                      "
                    >
                      <Message
                        :title="$t('businessCompaniesAdmin.message.1.title')"
                        :content="$t('businessCompaniesAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['companies.admin.view']) && !loading">
            <Message
              :title="$t('businessCompaniesAdmin.message.1.title')"
              :content="$t('businessCompaniesAdmin.message.1.content')"
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
          :title="$t('businessCompaniesAdmin.title')"
          :toggles="state.toggles"
          component-name="businessCompaniesAdmin"
          @go-back="goBack"
        />
      </div>
    </div>
    <div id="businessCompaniesAdmin">
      <div v-if="isActiveBusiness && state.toggles['companies.admin.view']">
        <div class="control-box my-4"></div>
        <div v-if="!loading" id="businessCompaniesAdmin-result" class="mt-4">
          <div>
            <div v-if="state.companies.length === 0">
              <Message
                :title="$t('businessCompaniesAdmin.message.2.title')"
                :content="$t('businessCompaniesAdmin.message.2.content')"
              />
            </div>
            <div v-if="commerce && commerce.id" class="row mb-2">
              <div class="col lefted">
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                  @click="showAdd(service)"
                  data-bs-toggle="modal"
                  :data-bs-target="`#add-service`"
                  :disabled="!state.toggles['companies.admin.add']"
                >
                  <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                </button>
              </div>
            </div>
            <div>
              <SearchAdminItem
                :business-items="state.companies"
                :type="'companies'"
                :receive-filtered-items="receiveFilteredItems"
              >
              </SearchAdminItem>
              <div v-for="(service, index) in state.filtered" :key="index" class="result-card">
                <div class="row">
                  <div class="col-10">
                    <ServiceSimpleName :service="service"></ServiceSimpleName>
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
                <CompanyFormEdit
                  v-if="state.toggles['companies.admin.read']"
                  :class="{ show: state.extendedEntity === index }"
                  :company="service"
                  :types="state.types"
                  :toggles="state.toggles"
                  :errors="{
                    tagError: state.tagError,
                    orderError: state.orderUpdateError,
                    errorsUpdate: state.errorsUpdate,
                  }"
                  :max-order="state.companies.length"
                  @update:company="service = $event"
                />
                <div
                  v-if="state.toggles['companies.admin.read'] && state.extendedEntity === index"
                  class="row g-1 mt-2"
                >
                  <div class="col">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="update(service)"
                      :disabled="!state.toggles['companies.admin.update']"
                    >
                      {{ $t('businessCompaniesAdmin.update') }} <i class="bi bi-save"></i>
                    </button>
                    <button
                      class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                      @click="goToUnavailable()"
                      v-if="state.toggles['companies.admin.unavailable']"
                    >
                      {{ $t('businessQueuesAdmin.unavailable') }}
                      <i class="bi bi-trash-fill"></i>
                    </button>
                    <AreYouSure
                      :show="state.goToUnavailable"
                      :yes-disabled="state.toggles['companies.admin.unavailable']"
                      :no-disabled="state.toggles['companies.admin.unavailable']"
                      @actionYes="unavailable(service)"
                      @actionNo="unavailableCancel()"
                    >
                    </AreYouSure>
                  </div>
                </div>
                <div
                  v-if="(!isActiveBusiness() || !state.toggles['companies.admin.read']) && !loading"
                >
                  <Message
                    :title="$t('businessCompaniesAdmin.message.1.title')"
                    :content="$t('businessCompaniesAdmin.message.1.content')"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="(!isActiveBusiness() || !state.toggles['companies.admin.view']) && !loading">
        <Message
          :title="$t('businessCompaniesAdmin.message.1.title')"
          :content="$t('businessCompaniesAdmin.message.1.content')"
        />
      </div>
    </div>
    <!-- Modal Add -->
    <div
      class="modal fade"
      :id="`add-service`"
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
              id="add-service"
              class="result-card mb-4"
              v-if="state.showAdd && state.toggles['companies.admin.add']"
            >
              <div v-if="state.companies.length < state.toggles['companies.admin.limit']">
                <CompanyFormAdd
                  v-model="state.newCompany"
                  :types="state.types"
                  :toggles="state.toggles"
                  :errors="{
                    nameError: state.nameError,
                    tagError: state.tagError,
                    typeError: state.typeError,
                    orderError: state.orderAddError,
                    errorsAdd: state.errorsAdd,
                  }"
                  :max-order="state.companies.length + 1"
                />
                <div class="col mt-3">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4 pulse-btn"
                    @click="add(state.newCompany)"
                  >
                    {{ $t('businessCompaniesAdmin.add') }} <i class="bi bi-save"></i>
                  </button>
                </div>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessCompaniesAdmin.message.3.title')"
                  :content="$t('businessCompaniesAdmin.message.3.content')"
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
</style>
