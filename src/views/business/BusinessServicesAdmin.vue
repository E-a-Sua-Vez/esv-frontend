<script>
import { ref, reactive, onBeforeMount, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getServiceByCommerce,
  updateService,
  addService,
} from '../../application/services/service';
import { getPermissions } from '../../application/services/permissions';
import Popper from 'vue3-popper';
import ServiceSimpleName from '../../components/common/ServiceSimpleName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import { getServiceTypes } from '../../shared/utils/data.ts';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import ServiceFormEdit from '../../components/service/ServiceFormEdit.vue';
import ServiceFormAdd from '../../components/service/ServiceFormAdd.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';

export default {
  name: 'BusinessServicesAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ServiceSimpleName,
    Toggle,
    Warning,
    AreYouSure,
    Popper,
    ComponentMenu,
    SearchAdminItem,
    ServiceFormEdit,
    ServiceFormAdd,
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
      services: ref([]),
      showAdd: false,
      goToUnavailable: false,
      newService: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      tagError: false,
      orderAddError: false,
      orderUpdateError: false,
      estimatedTimeAddError: false,
      estimatedTimeUpdateError: false,
      blockTimeAddError: false,
      blockTimeUpdateError: false,
      shortDescriptionAddError: false,
      shortDescriptionUpdateError: false,
      types: [],
      toggles: {},
      filtered: [],
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Load services when commerce changes
    const loadServices = async commerceId => {
      if (!commerceId) {
        state.services = [];
        state.filtered = [];
        return;
      }
      try {
        const services = await getServiceByCommerce(commerceId);
        state.services = services || [];
        state.filtered = state.services;
      } catch (error) {
        state.services = [];
        state.filtered = [];
      }
    };

    // Watch for commerce changes and reload services
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            // Immediately clear filtered data to prevent showing old results
            state.services = [];
            state.filtered = [];
            await loadServices(newCommerce.id);
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
        state.types = getServiceTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('services', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Load services for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadServices(commerceToUse.id);
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

    const validateAdd = service => {
      state.errorsAdd = [];
      if (!service.name || service.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessServicesAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!service.tag || service.tag.length === 0) {
        state.tagError = true;
        state.errorsAdd.push('businessServicesAdmin.validate.tag');
      } else {
        state.tagError = false;
      }
      if (!service.order || service.order.length === 0) {
        state.orderAddError = true;
        state.errorsAdd.push('businessServicesAdmin.validate.order');
      } else {
        state.orderAddError = false;
      }
      if (!service.serviceInfo || !service.serviceInfo.estimatedTime) {
        state.estimatedTimeAddError = true;
        state.errorsAdd.push('businessServicesAdmin.validate.estimatedTime');
      } else {
        state.estimatedTimeAddError = false;
      }
      if (!service.serviceInfo || !service.serviceInfo.blockTime) {
        state.blockTimeAddError = true;
        state.errorsAdd.push('businessServicesAdmin.validate.blockTime');
      } else {
        state.blockTimeAddError = false;
      }
      if (
        !service.serviceInfo.shortDescription ||
        service.serviceInfo.shortDescription.length === 0
      ) {
        state.shortDescriptionAddError = true;
        state.errorsAdd.push('businessServicesAdmin.validate.shortDescription');
      } else {
        state.shortDescriptionAddError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = service => {
      state.errorsUpdate = [];
      if (!service.order || service.order.length === 0) {
        state.orderUpdateError = true;
        state.errorsUpdate.push('businessServicesAdmin.validate.order');
      } else {
        state.orderUpdateError = false;
      }
      if (!service.serviceInfo || !service.serviceInfo.estimatedTime) {
        state.estimatedTimeUpdateError = true;
        state.errorsUpdate.push('businessServicesAdmin.validate.estimatedTime');
      } else {
        state.estimatedTimeUpdateError = false;
      }
      if (!service.serviceInfo || !service.serviceInfo.blockTime) {
        state.blockTimeUpdateError = true;
        state.errorsUpdate.push('businessServicesAdmin.validate.blockTime');
      } else {
        state.blockTimeUpdateError = false;
      }
      if (
        !service.serviceInfo ||
        !service.serviceInfo.shortDescription ||
        service.serviceInfo.shortDescription.length === 0
      ) {
        state.shortDescriptionUpdateError = true;
        state.errorsUpdate.push('businessServicesAdmin.validate.shortDescription');
      } else {
        state.shortDescriptionUpdateError = false;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const showAdd = () => {
      state.showAdd = true;
      state.newService = {
        order: state.services.length + 1,
        online: true,
        active: true,
        serviceInfo: {},
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newService)) {
          state.newService.commerceId = commerce.value.id;
          await addService(state.newService);
          state.services = await getServiceByCommerce(commerce.value.id);
          state.showAdd = false;
          closeAddModal();
          state.newService = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const update = async service => {
      try {
        loading.value = true;
        if (validateUpdate(service)) {
          await updateService(service.id, service);
          state.services = await getServiceByCommerce(commerce.value.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async service => {
      try {
        loading.value = true;
        if (service && service.id) {
          service.available = false;
          service.active = false;
          await updateService(service.id, service);
          state.services = await getServiceByCommerce(commerce.value.id);
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

    const showUpdateForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    };

    const receiveFilteredItems = items => {
      state.filtered = items;
    };

    const closeAddModal = () => {
      const modalElement = document.getElementById('add-service');
      const modalCloseButton = document.getElementById('close-modal');

      // Intentar cerrar usando el botón de cierre del modal
      if (modalCloseButton) {
        modalCloseButton.click();
      }

      // Refuerzo: si Bootstrap está disponible, forzar el cierre del modal
      if (modalElement && window.bootstrap && window.bootstrap.Modal) {
        const existingInstance = window.bootstrap.Modal.getInstance(modalElement);
        const modalInstance = existingInstance || new window.bootstrap.Modal(modalElement);
        modalInstance.hide();
      }
    };

    const resetAddForm = () => {
      state.newService = {
        order: state.services.length + 1,
        online: true,
        active: true,
        serviceInfo: {},
      };
      state.errorsAdd = [];
      state.nameError = false;
      state.tagError = false;
      state.orderAddError = false;
      state.estimatedTimeAddError = false;
      state.shortDescriptionAddError = false;
      state.blockTimeAddError = false;
    };

    const handleCloseButtonMousedown = e => {
      // Remove focus immediately on mousedown (before click) to avoid aria-hidden warning
      if (e.target && (e.target.id === 'close-modal' || e.target.closest('#close-modal'))) {
        const button = e.target.id === 'close-modal' ? e.target : e.target.closest('#close-modal');
        if (button) {
          button.blur();
          // Also blur any active element to ensure no focus remains
          if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
          }
        }
      }
    };

    const handleModalBackdropClick = e => {
      // Remove focus when clicking backdrop to close modal
      if (e.target === e.currentTarget && document.activeElement) {
        document.activeElement.blur();
      }
    };

    onMounted(() => {
      const addModal = document.getElementById('add-service');
      const closeButton = document.getElementById('close-modal');

      if (addModal) {
        addModal.addEventListener('hidden.bs.modal', resetAddForm);
        // Remove focus when clicking backdrop
        addModal.addEventListener('click', handleModalBackdropClick);
      }

      // Use mousedown (fires before click) to remove focus early
      if (closeButton) {
        closeButton.addEventListener('mousedown', handleCloseButtonMousedown, true);
      }

      // Also listen on the document for any close button clicks
      document.addEventListener('mousedown', handleCloseButtonMousedown, true);
    });

    onUnmounted(() => {
      const addModal = document.getElementById('add-service');
      const closeButton = document.getElementById('close-modal');

      if (addModal) {
        addModal.removeEventListener('hidden.bs.modal', resetAddForm);
        addModal.removeEventListener('click', handleModalBackdropClick);
      }

      if (closeButton) {
        closeButton.removeEventListener('mousedown', handleCloseButtonMousedown, true);
      }

      document.removeEventListener('mousedown', handleCloseButtonMousedown, true);
    });

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
      commerce,
      unavailable,
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
          :title="$t(`businessServicesAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessServicesAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessServicesAdmin">
          <div v-if="isActiveBusiness && state.toggles['services.admin.view']">
            <div id="businessServicesAdmin-controls" class="control-box my-4">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessServicesAdmin.message.4.title')"
                    :content="$t('businessServicesAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessServicesAdmin-result" class="mt-4">
              <div>
                <div v-if="state.services.length === 0">
                  <Message
                    :title="$t('businessServicesAdmin.message.2.title')"
                    :content="$t('businessServicesAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                      @click="showAdd(service)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-service`"
                      :disabled="!state.toggles['services.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.services"
                    :type="'services'"
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
                    <ServiceFormEdit
                      v-if="state.toggles['services.admin.read']"
                      :service="service"
                      :types="state.types"
                      :toggles="state.toggles"
                      :errors="{
                        orderUpdateError: state.orderUpdateError,
                        shortDescriptionUpdateError: state.shortDescriptionUpdateError,
                        estimatedTimeUpdateError: state.estimatedTimeUpdateError,
                        blockTimeUpdateError: state.blockTimeUpdateError,
                        errorsUpdate: state.errorsUpdate,
                      }"
                      :services-length="state.services.length"
                      :class="{ show: state.extendedEntity === index }"
                      @update:service="service = $event"
                    />
                    <div class="col" v-if="state.extendedEntity === index">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4 pulse-btn"
                        @click="update(service)"
                        :disabled="!state.toggles['services.admin.update']"
                      >
                        {{ $t('businessServicesAdmin.update') }} <i class="bi bi-save"></i>
                      </button>
                      <button
                        class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                        @click="goToUnavailable()"
                        v-if="state.toggles['services.admin.unavailable']"
                      >
                        {{ $t('businessQueuesAdmin.unavailable') }}
                        <i class="bi bi-trash-fill"></i>
                      </button>
                      <AreYouSure
                        :show="state.goToUnavailable"
                        :yes-disabled="state.toggles['services.admin.unavailable']"
                        :no-disabled="state.toggles['services.admin.unavailable']"
                        @actionYes="unavailable(service)"
                        @actionNo="unavailableCancel()"
                      >
                      </AreYouSure>
                    </div>
                    <div
                      v-if="
                        (!isActiveBusiness() || !state.toggles['services.admin.read']) && !loading
                      "
                    >
                      <Message
                        :title="$t('businessServicesAdmin.message.1.title')"
                        :content="$t('businessServicesAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['services.admin.view']) && !loading">
            <Message
              :title="$t('businessServicesAdmin.message.1.title')"
              :content="$t('businessServicesAdmin.message.1.content')"
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
          :title="$t('businessServicesAdmin.title')"
          :toggles="state.toggles"
          component-name="businessServicesAdmin"
          @go-back="goBack"
        />
        <div id="businessServicesAdmin">
          <div v-if="isActiveBusiness && state.toggles['services.admin.view']">
            <div id="businessServicesAdmin-controls" class="control-box">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessServicesAdmin.message.4.title')"
                    :content="$t('businessServicesAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessServicesAdmin-result" class="mt-4">
              <div>
                <div v-if="state.services.length === 0">
                  <Message
                    :title="$t('businessServicesAdmin.message.2.title')"
                    :content="$t('businessServicesAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                      @click="showAdd(service)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-service`"
                      :disabled="!state.toggles['services.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.services"
                    :type="'services'"
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
                    <ServiceFormEdit
                      v-if="state.toggles['services.admin.read']"
                      :service="service"
                      :types="state.types"
                      :toggles="state.toggles"
                      :errors="{
                        orderUpdateError: state.orderUpdateError,
                        shortDescriptionUpdateError: state.shortDescriptionUpdateError,
                        estimatedTimeUpdateError: state.estimatedTimeUpdateError,
                        blockTimeUpdateError: state.blockTimeUpdateError,
                        errorsUpdate: state.errorsUpdate,
                      }"
                      :services-length="state.services.length"
                      :class="{ show: state.extendedEntity === index }"
                      @update:service="service = $event"
                    />
                    <div class="col" v-if="state.extendedEntity === index">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4 pulse-btn"
                        @click="update(service)"
                        :disabled="!state.toggles['services.admin.update']"
                      >
                        {{ $t('businessServicesAdmin.update') }} <i class="bi bi-save"></i>
                      </button>
                      <button
                        class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                        @click="goToUnavailable()"
                        v-if="state.toggles['services.admin.unavailable']"
                      >
                        {{ $t('businessQueuesAdmin.unavailable') }}
                        <i class="bi bi-trash-fill"></i>
                      </button>
                      <AreYouSure
                        :show="state.goToUnavailable"
                        :yes-disabled="state.toggles['services.admin.unavailable']"
                        :no-disabled="state.toggles['services.admin.unavailable']"
                        @actionYes="unavailable(service)"
                        @actionNo="unavailableCancel()"
                      >
                      </AreYouSure>
                    </div>
                    <div
                      v-if="
                        (!isActiveBusiness() || !state.toggles['services.admin.read']) && !loading
                      "
                    >
                      <Message
                        :title="$t('businessServicesAdmin.message.1.title')"
                        :content="$t('businessServicesAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['services.admin.view']) && !loading">
            <Message
              :title="$t('businessServicesAdmin.message.1.title')"
              :content="$t('businessServicesAdmin.message.1.content')"
            />
          </div>
        </div>
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
            <div v-if="state.services.length < state.toggles['services.admin.limit']">
              <ServiceFormAdd
                v-model="state.newService"
                :types="state.types"
                :toggles="state.toggles"
                :errors="{
                  nameError: state.nameError,
                  tagError: state.tagError,
                  typeError: state.typeError,
                  orderAddError: state.orderAddError,
                  shortDescriptionAddError: state.shortDescriptionAddError,
                  estimatedTimeAddError: state.estimatedTimeAddError,
                  blockTimeAddError: state.blockTimeAddError,
                  errorsAdd: state.errorsAdd,
                }"
              />
              <div class="col">
                <button
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4 pulse-btn"
                  @click="add(state.newService)"
                >
                  {{ $t('businessServicesAdmin.add') }} <i class="bi bi-save"></i>
                </button>
              </div>
            </div>
            <div v-else>
              <Message
                :title="$t('businessServicesAdmin.message.3.title')"
                :content="$t('businessServicesAdmin.message.3.content')"
              />
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
.is-disabled {
  opacity: 0.5;
}
.show {
  padding: 10px;
  max-height: 1500px !important;
  overflow-y: auto;
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
