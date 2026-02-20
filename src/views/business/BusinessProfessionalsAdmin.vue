<script>
import { ref, reactive, onBeforeMount, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getActiveModulesByCommerceId } from '../../application/services/module';
import {
  getProfessionalsByCommerceId,
  updateProfessional,
  addProfessional,
} from '../../application/services/professional';
import { getPermissions } from '../../application/services/permissions';
import { getServiceByCommerce } from '../../application/services/service';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import Popper from 'vue3-popper';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import { getProfessionalTypes } from '../../shared/utils/data.ts';
import ProfessionalFormEdit from '../../components/professional/ProfessionalFormEdit.vue';
import ProfessionalFormAdd from '../../components/professional/ProfessionalFormAdd.vue';
import ProfessionalName from '../../components/common/ProfessionalName.vue';
import ProfessionalEditModal from '../../components/professional/ProfessionalEditModal.vue';

export default {
  name: 'BusinessProfessionalsAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    Toggle,
    Warning,
    Popper,
    AreYouSure,
    ComponentMenu,
    DesktopPageHeader,
    SearchAdminItem,
    ProfessionalFormEdit,
    ProfessionalFormAdd,
    ProfessionalName,
    ProfessionalEditModal,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');
    const showEditModal = ref(false);
    const professionalForEdit = ref(null);

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      allCommerces: ref([]),
      services: ref([]),
      modules: ref([]),
      professionals: ref([]),
      types: [],
      commercesSelected: {},
      service: {},
      showAdd: false,
      goToUnavailable: false,
      newProfessional: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      emailError: false,
      typeError: false,
      idNumberError: false,
      phoneError: false,
      licenseError: false,
      toggles: {},
      filtered: [],
    });

    const commerce = computed(() => store.getCurrentCommerce);

    const loadCommerceData = async commerceId => {
      if (!commerceId) {
        state.professionals = [];
        state.modules = [];
        state.services = [];
        state.filtered = [];
        return;
      }
      try {
        state.modules = await getActiveModulesByCommerceId(commerceId);
        const professionals = await getProfessionalsByCommerceId(commerceId);
        state.professionals = professionals || [];
        state.services = (await getServiceByCommerce(commerceId)) || [];
        state.filtered = state.professionals;
        if (state.services.length > 0) {
          state.service = undefined;
        }
      } catch (error) {
        state.professionals = [];
        state.modules = [];
        state.services = [];
        state.filtered = [];
      }
    };

    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            state.professionals = [];
            state.filtered = [];
            state.modules = [];
            state.services = [];
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
        state.types = getProfessionalTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.allCommerces = await store.getAvailableCommerces(state.business.commerces);
        state.toggles = await getPermissions('professionals', 'admin');

        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          if (state.allCommerces && state.allCommerces.length > 0) {
            await store.setCurrentCommerce(state.allCommerces[0]);
          }
        }

        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadCommerceData(commerceToUse.id);
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

    const validateAdd = professional => {
      state.errorsAdd = [];
      if (!professional.personalInfo?.name || professional.personalInfo.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessProfessionalsAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!professional.personalInfo?.idNumber || professional.personalInfo.idNumber.length === 0) {
        state.idNumberError = true;
        state.errorsAdd.push('businessProfessionalsAdmin.validate.idNumber');
      } else {
        state.idNumberError = false;
      }
      if (!professional.personalInfo?.email || professional.personalInfo.email.length < 10) {
        state.emailError = true;
        state.errorsAdd.push('businessProfessionalsAdmin.validate.email');
      } else {
        state.emailError = false;
      }
      if (!professional.personalInfo?.phone || professional.personalInfo.phone.length === 0) {
        state.phoneError = true;
        state.errorsAdd.push('businessProfessionalsAdmin.validate.phone');
      } else {
        state.phoneError = false;
      }
      if (
        !professional.professionalInfo?.professionalType ||
        professional.professionalInfo.professionalType.length === 0
      ) {
        state.typeError = true;
        state.errorsAdd.push('businessProfessionalsAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = professional => {
      state.errorsUpdate = [];
      if (!professional.personalInfo?.name || professional.personalInfo.name.length === 0) {
        state.nameError = true;
        state.errorsUpdate.push('businessProfessionalsAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!professional.personalInfo?.idNumber || professional.personalInfo.idNumber.length === 0) {
        state.idNumberError = true;
        state.errorsUpdate.push('businessProfessionalsAdmin.validate.idNumber');
      } else {
        state.idNumberError = false;
      }
      if (!professional.personalInfo?.email || professional.personalInfo.email.length < 10) {
        state.emailError = true;
        state.errorsUpdate.push('businessProfessionalsAdmin.validate.email');
      } else {
        state.emailError = false;
      }
      if (!professional.personalInfo?.phone || professional.personalInfo.phone.length === 0) {
        state.phoneError = true;
        state.errorsUpdate.push('businessProfessionalsAdmin.validate.phone');
      } else {
        state.phoneError = false;
      }
      if (
        !professional.professionalInfo?.professionalType ||
        professional.professionalInfo.professionalType.length === 0
      ) {
        state.typeError = true;
        state.errorsUpdate.push('businessProfessionalsAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newProfessional)) {
          state.newProfessional.businessId = state.business.id;
          state.newProfessional.commerceId = commerce.value.id;

          // Limpiar financialInfo si está incompleto o vacío
          if (state.newProfessional.financialInfo) {
            // Limpiar commission si está incompleto
            const hasCommissionType =
              state.newProfessional.financialInfo.commissionType &&
              state.newProfessional.financialInfo.commissionType.trim() !== '';
            const hasCommissionValue =
              state.newProfessional.financialInfo.commissionValue !== null &&
              state.newProfessional.financialInfo.commissionValue !== undefined &&
              state.newProfessional.financialInfo.commissionValue !== '';

            // Si no tiene ambos o solo tiene uno, limpiar ambos
            if (!hasCommissionType || !hasCommissionValue) {
              state.newProfessional.financialInfo.commissionType = null;
              state.newProfessional.financialInfo.commissionValue = null;
            }

            // Limpiar paymentAccount si está vacío
            if (state.newProfessional.financialInfo?.paymentAccount) {
              const pa = state.newProfessional.financialInfo.paymentAccount;
              const isEmpty =
                !pa.bank && !pa.accountNumber && !pa.accountType && !pa.pixKey && !pa.holder;
              if (isEmpty) {
                delete state.newProfessional.financialInfo.paymentAccount;
              }
            }

            // Si financialInfo está completamente vacío, eliminarlo
            const fi = state.newProfessional.financialInfo;
            if (!fi.commissionType && !fi.commissionValue && !fi.paymentAccount) {
              delete state.newProfessional.financialInfo;
            }
          }

          // Mapear professionalType a role (el backend requiere role)
          if (state.newProfessional.professionalInfo?.professionalType) {
            state.newProfessional.professionalInfo.role = state.newProfessional.professionalInfo.professionalType;
          }

          await addProfessional(state.newProfessional);
          alertError.value = '';
          closeAddModal();
          await loadCommerceData(commerce.value.id);
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.response?.status || 500;
      }
    };

    const update = async professional => {
      try {
        loading.value = true;
        if (validateUpdate(professional)) {
          // Limpiar financialInfo si está incompleto o vacío
          if (professional.financialInfo) {
            // Limpiar commission si está incompleto
            const hasCommissionType =
              professional.financialInfo.commissionType &&
              professional.financialInfo.commissionType.trim() !== '';
            const hasCommissionValue =
              professional.financialInfo.commissionValue !== null &&
              professional.financialInfo.commissionValue !== undefined &&
              professional.financialInfo.commissionValue !== '';

            // Si no tiene ambos o solo tiene uno, limpiar ambos
            if (!hasCommissionType || !hasCommissionValue) {
              professional.financialInfo.commissionType = null;
              professional.financialInfo.commissionValue = null;
            }

            // Limpiar paymentAccount si está vacío
            if (professional.financialInfo?.paymentAccount) {
              const pa = professional.financialInfo.paymentAccount;
              // Si es string, convertir a objeto vacío o eliminar
              if (typeof pa === 'string') {
                if (pa.trim() === '') {
                  delete professional.financialInfo.paymentAccount;
                } else {
                  // Convertir string a objeto con accountNumber
                  professional.financialInfo.paymentAccount = {
                    accountNumber: pa,
                    bank: '',
                    accountType: '',
                    pixKey: '',
                    holder: '',
                  };
                }
              } else {
                // Si es objeto y está vacío, eliminar
                const isEmpty =
                  !pa.bank && !pa.accountNumber && !pa.accountType && !pa.pixKey && !pa.holder;
                if (isEmpty) {
                  delete professional.financialInfo.paymentAccount;
                }
              }
            }

            // Si financialInfo está completamente vacío, eliminarlo
            const fi = professional.financialInfo;
            if (!fi.commissionType && !fi.commissionValue && !fi.paymentAccount) {
              delete professional.financialInfo;
            }
          }

          await updateProfessional(professional);
          state.extendedEntity = undefined;
          await loadCommerceData(commerce.value.id);
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.response?.status || 500;
      }
    };

    const unavailable = async professional => {
      try {
        loading.value = true;
        professional.active = false;
        await updateProfessional(professional);
        state.goToUnavailable = false;
        state.extendedEntity = undefined;
        await loadCommerceData(commerce.value.id);
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.response?.status || 500;
      }
    };

    const unavailableCancel = () => {
      state.goToUnavailable = false;
    };

    const showUpdateForm = index => {
      // Open modal instead of expanding card
      openProfessionalEditModal(index);
    };

    const openProfessionalEditModal = (index) => {
      const professional = state.filtered[index];
      if (professional) {
        professionalForEdit.value = { ...professional, _index: index };
        showEditModal.value = true;
      }
    };

    const closeEditModal = () => {
      showEditModal.value = false;
      professionalForEdit.value = null;
      state.errorsUpdate = [];

      // Clean modal backdrop if any
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      document.body.classList.remove('modal-open');
      document.body.style = '';
    };

    const handleModalUpdate = async (professional) => {
      // Update the professional in the list
      if (professional._index !== undefined) {
        state.filtered[professional._index] = professional;
      }
      // Call the update function
      await update(professional);
      closeEditModal();
    };

    const handleModalDelete = async (professionalId) => {
      // Find the professional object by ID
      const professional = state.professionals.find(p => p.id === professionalId);
      if (!professional) {
        console.error('Professional not found:', professionalId);
        return;
      }
      // Call unavailable function
      await unavailable(professional);
    };

    const showAdd = () => {
      state.showAdd = true;
      const servicesId = [];
      const commercesId = [];
      state.newProfessional = {
        businessId: state.business.id,
        commerceId: commerce.value?.id,
        personalInfo: {
          name: '',
          idNumber: '',
          email: '',
          phone: '',
        },
        professionalInfo: {
          professionalType: '',
          specialties: [],
          servicesId: [],
          license: '',
        },
        financialInfo: {
          commissionType: null,
          commissionValue: null,
          paymentAccount: {
            bank: '',
            accountNumber: '',
            accountType: '',
            pixKey: '',
            holder: '',
          },
        },
        active: true,
        available: true,
        servicesId,
        commercesId,
      };
    };

    const goToUnavailable = () => {
      state.goToUnavailable = !state.goToUnavailable;
    };

    const selectService = async (professional, service) => {
      if (service) {
        if (!professional.professionalInfo.servicesId) {
          professional.professionalInfo.servicesId = [];
        }
        if (!professional.professionalInfo.servicesId.includes(service.id)) {
          professional.professionalInfo.servicesId.push(service.id);
        }
      }
    };

    const selectServiceIndex = async (index, service) => {
      if (!state.professionals[index].professionalInfo.servicesId) {
        state.professionals[index].professionalInfo.servicesId = [];
      }
      if (!state.professionals[index].professionalInfo.servicesId.includes(service.id)) {
        state.professionals[index].professionalInfo.servicesId.push(service.id);
      }
    };

    const deleteService = (professional, serviceId) => {
      if (professional?.professionalInfo?.servicesId?.length >= 0) {
        if (professional.professionalInfo.servicesId.includes(serviceId)) {
          const filtered = professional.professionalInfo.servicesId.filter(id => id !== serviceId);
          professional.professionalInfo.servicesId = filtered;
        }
      }
    };

    const showService = serviceId => {
      if (state.services && state.services.length >= 1) {
        const service = state.services.find(s => s.id === serviceId);
        if (service) {
          return service.tag;
        }
      }
    };

    const selectModule = (professional, module) => {
      if (professional?.professionalInfo && module?.id) {
        if (!professional.professionalInfo.modulesId) {
          professional.professionalInfo.modulesId = [];
        }
        if (!professional.professionalInfo.modulesId.includes(module.id)) {
          professional.professionalInfo.modulesId.push(module.id);
        }
      }
    };

    const deleteModule = (professional, moduleId) => {
      if (professional?.professionalInfo?.modulesId?.length >= 0) {
        if (professional.professionalInfo.modulesId.includes(moduleId)) {
          const filtered = professional.professionalInfo.modulesId.filter(id => id !== moduleId);
          professional.professionalInfo.modulesId = filtered;
        }
      }
    };

    const showModule = moduleId => {
      if (state.modules && state.modules.length >= 1) {
        const module = state.modules.find(m => m.id === moduleId);
        if (module) {
          return module.name;
        }
      }
    };

    const receiveFilteredItems = items => {
      state.filtered = items;
    };

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal');
      if (modalCloseButton) {
        modalCloseButton.click();
      }
    };

    const resetAddForm = () => {
      const servicesId = [];
      const commercesId = [];
      state.newProfessional = {
        businessId: state.business.id,
        commerceId: commerce.value?.id,
        personalInfo: {
          name: '',
          idNumber: '',
          email: '',
          phone: '',
        },
        professionalInfo: {
          professionalType: '',
          specialties: [],
          servicesId: [],
          license: '',
        },
        financialInfo: {
          commissionType: null,
          commissionValue: null,
          paymentAccount: {
            bank: '',
            accountNumber: '',
            accountType: '',
            pixKey: '',
            holder: '',
          },
        },
        active: true,
        available: true,
        servicesId,
        commercesId,
      };
      state.errorsAdd = [];
      state.nameError = false;
      state.emailError = false;
      state.typeError = false;
      state.idNumberError = false;
      state.phoneError = false;
      state.licenseError = false;
      alertError.value = '';
    };

    const handleModalHide = () => {
      const closeButton = document.getElementById('close-modal');
      if (closeButton) {
        closeButton.blur();
      }
    };

    onMounted(() => {
      const addModal = document.getElementById('add-professional');
      if (addModal) {
        addModal.addEventListener('hidden.bs.modal', resetAddForm);
        addModal.addEventListener('hide.bs.modal', handleModalHide);
      }
      document.addEventListener('mousedown', e => {
        if (e.target && e.target.closest('.modal-backdrop')) {
          handleModalHide();
        }
      });
    });

    onUnmounted(() => {
      const addModal = document.getElementById('add-professional');
      if (addModal) {
        addModal.removeEventListener('hidden.bs.modal', resetAddForm);
        addModal.removeEventListener('hide.bs.modal', handleModalHide);
      }
    });

    return {
      state,
      loading,
      alertError,
      showEditModal,
      professionalForEdit,
      showUpdateForm,
      update,
      showAdd,
      add,
      goBack,
      isActiveBusiness,
      commerce,
      selectService,
      deleteService,
      showService,
      selectServiceIndex,
      selectModule,
      deleteModule,
      showModule,
      showCommerce: () => {},
      deleteCommerce: () => {},
      selectCommerceSelected: () => {},
      selectCommerceIndex: () => {},
      receiveFilteredItems,
      unavailable,
      unavailableCancel,
      goToUnavailable,
      openProfessionalEditModal,
      closeEditModal,
      handleModalUpdate,
      handleModalDelete,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile Layout -->
    <div class="content d-lg-none">
      <div id="page-header" class="text-center">
        <CommerceLogo
          :src="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessProfessionalsAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessProfessionalsAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
      </div>
      <div>
        <div>
          <div id="professionals-admin-component">
            <div v-if="isActiveBusiness() && state.toggles['professionals.admin.view'] && !loading">
              <div id="businessServicesAdmin-controls" class="control-box my-4"></div>
              <div>
                <div v-if="!isActiveBusiness() || !state.toggles['professionals.admin.view']">
                  <Message
                    :title="$t('businessProfessionalsAdmin.message.1.title')"
                    :content="$t('businessProfessionalsAdmin.message.1.content')"
                  />
                </div>
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessProfessionalsAdmin.message.2.title')"
                    :content="$t('businessProfessionalsAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                      @click="showAdd()"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-professional`"
                      :disabled="!state.toggles['professionals.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.professionals"
                    :type="'professionals'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div
                    v-for="(professional, index) in state.filtered"
                    :key="index"
                    class="result-card-2"
                    @click="openProfessionalEditModal(index)"
                    style="cursor: pointer;"
                  >
                    <div class="row">
                      <div class="col-12">
                        <ProfessionalName
                          :name="professional.personalInfo?.name"
                          :email="professional.personalInfo?.email"
                          :active="professional.active"
                          :id-number="professional.personalInfo?.idNumber"
                          :has-collaborator="!!professional.collaboratorId"
                          :professional="professional"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="(!isActiveBusiness() || !state.toggles['professionals.admin.view']) && !loading"
          >
            <Message
              :title="$t('businessProfessionalsAdmin.message.1.title')"
              :content="$t('businessProfessionalsAdmin.message.1.content')"
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
          :title="$t('businessProfessionalsAdmin.title')"
          :toggles="state.toggles"
          component-name="businessProfessionalsAdmin"
          @go-back="goBack"
        />
        <div>
          <div>
            <div id="professionals-admin-component">
              <div
                v-if="isActiveBusiness() && state.toggles['professionals.admin.view'] && !loading"
              >
                <div id="businessServicesAdmin-controls" class="control-box my-4"></div>
                <div>
                  <div v-if="!isActiveBusiness() || !state.toggles['professionals.admin.view']">
                    <Message
                      :title="$t('businessProfessionalsAdmin.message.1.title')"
                      :content="$t('businessProfessionalsAdmin.message.1.content')"
                    />
                  </div>
                  <div v-if="!commerce">
                    <Message
                      :title="$t('businessProfessionalsAdmin.message.2.title')"
                      :content="$t('businessProfessionalsAdmin.message.2.content')"
                    />
                  </div>
                  <div v-if="commerce" class="row mb-2">
                    <div class="col lefted">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                        @click="showAdd()"
                        data-bs-toggle="modal"
                        :data-bs-target="`#add-professional`"
                        :disabled="!state.toggles['professionals.admin.add']"
                      >
                        <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                      </button>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col">
                      <SearchAdminItem
                        :business-items="state.professionals"
                        :type="'professionals'"
                        :receive-filtered-items="receiveFilteredItems"
                      >
                      </SearchAdminItem>
                    </div>
                  </div>
                  <div
                    v-for="(professional, index) in state.filtered"
                    :key="index"
                    class="result-card-2"
                    @click="openProfessionalEditModal(index)"
                    style="cursor: pointer;"
                  >
                    <div class="row">
                      <div class="col-12">
                        <ProfessionalName
                          :name="professional.personalInfo?.name"
                          :email="professional.personalInfo?.email"
                          :active="professional.active"
                          :id-number="professional.personalInfo?.idNumber"
                          :has-collaborator="!!professional.collaboratorId"
                          :professional="professional"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-if="
                  (!isActiveBusiness() || !state.toggles['professionals.admin.view']) && !loading
                "
              >
                <Message
                  :title="$t('businessProfessionalsAdmin.message.1.title')"
                  :content="$t('businessProfessionalsAdmin.message.1.content')"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Add Professional -->
    <div
      class="modal fade"
      id="add-professional"
      data-bs-backdrop="static"
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
          <div class="modal-body text-center mb-0" id="professionals-component">
            <div class="text-center">
              <Spinner :show="loading"></Spinner>
            </div>
            <Alert :show="false" :stack="alertError"></Alert>
            <div id="add-professional" class="result-card mb-4">
              <div>
                <ProfessionalFormAdd
                  :professional="state.newProfessional"
                  :commerce-id="commerce?.id"
                  :types="state.types"
                  :modules="state.modules"
                  :services="state.services"
                  :toggles="state.toggles"
                  :errors="{
                    nameError: state.nameError,
                    idNumberError: state.idNumberError,
                    emailError: state.emailError,
                    phoneError: state.phoneError,
                    typeError: state.typeError,
                    licenseError: state.licenseError,
                  }"
                  :on-select-service="selectService"
                  :on-delete-service="deleteService"
                  :show-service="showService"
                  @update:professional="state.newProfessional = $event"
                />
              </div>
              <div class="col">
                <button
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4 pulse-btn"
                  @click="add()"
                  :disabled="!state.toggles['professionals.admin.add']"
                >
                  {{ $t('add') }} <i class="bi bi-save"></i>
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

    <!-- Professional Edit Modal -->
    <ProfessionalEditModal
      v-if="showEditModal && professionalForEdit"
      :show="showEditModal"
      :professional="professionalForEdit"
      :commerce-id="commerce?.id"
      :types="state.types"
      :modules="state.modules"
      :services="state.services"
      :toggles="state.toggles"
      :errors="{
        nameError: state.nameError,
        emailError: state.emailError,
        typeError: state.typeError,
        licenseError: state.licenseError,
      }"
      :on-select-service="(prof, service) => selectServiceIndex(professionalForEdit._index, service)"
      :on-delete-service="(prof, serviceId) => deleteService(prof, serviceId)"
      :show-service="showService"
      :on-select-module="(prof, module) => selectModule(prof, module)"
      :on-delete-module="(prof, moduleId) => deleteModule(prof, moduleId)"
      :show-module="showModule"
      @update="handleModalUpdate"
      @delete="handleModalDelete"
      @close="closeEditModal"
    />
  </div>
</template>

<style scoped>
.content {
  padding: 1rem;
}

#page-header {
  margin-bottom: 1rem;
}

.result-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
  padding: 1rem;
}

.result-card-2 {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  transition: all 0.3s ease;
}

.detailed-data {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.5s ease-in-out;
}

.detailed-data.show {
  max-height: 2000px;
  margin-top: 1rem;
}

.transition-slow {
  transition: all 0.5s ease;
}

.metric-card-subtitle {
  font-size: 0.875rem;
  color: #6c757d;
}

.errors {
  margin-top: 1rem;
}

.lefted {
  text-align: left;
}

.centered {
  text-align: center;
}

.pulse-animation {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
  }
}

/* Modern Form Styles */
.form-fields-container {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.form-group-modern {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
}

.form-label-modern {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem;
  min-width: 10rem;
  font-weight: 600;
  font-size: 0.75rem;
  color: #1f2937;
  padding-top: 0.375rem;
}

.form-label-modern i {
  font-size: 0.875rem;
  color: #6b7280;
  cursor: help;
}

.form-control-modern,
.form-select-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #212529;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 5px;
  transition: all 0.2s ease;
}

.form-control-modern:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 74, 173, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 74, 173, 0.1);
}

.form-control-modern:disabled,
.form-select-modern:disabled {
  background-color: #e9ecef;
  opacity: 0.6;
  cursor: not-allowed;
}

.form-control-modern.is-invalid,
.form-select-modern.is-invalid {
  border-color: #dc3545;
}

.form-select-modern {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.625rem center;
  background-size: 1rem;
  padding-right: 2.5rem;
  appearance: none;
}

.form-group-toggle {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.selected-items-modern {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.badge-modern {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.625rem;
  background: linear-gradient(135deg, #004aad 0%, #004aad 100%);
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.badge-modern:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.3);
}

.badge-modern i {
  margin-left: 0.25rem;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.badge-modern i:hover {
  opacity: 1;
}

:deep(.toggle) {
  --toggle-bg-on: #28a745;
  --toggle-bg-off: #6c757d;
  --toggle-width: 2.25rem;
  --toggle-height: 1rem;
}

:deep(.toggle:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .form-group-modern {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-label-modern {
    min-width: auto;
    width: 100%;
  }

  .form-control-modern,
  .form-select-modern {
    width: 100%;
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
