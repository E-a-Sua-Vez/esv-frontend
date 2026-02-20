<script>
import { ref, reactive, onBeforeMount, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { getValidatedPlanActivationByBusinessId } from '../../application/services/plan-activation';
import { getBusinessById, updateBusiness } from '../../application/services/business';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import PlanStatus from '../../components/plan/PlanStatus.vue';
import WelcomeMenu from '../../components/common/WelcomeMenu.vue';
import SpySection from '../../components/domain/SpySection.vue';
import BusinessEditModal from '../../components/business/BusinessEditModal.vue';

export default {
  name: 'BusinessMenu',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    PlanStatus,
    ToggleCapabilities,
    WelcomeMenu,
    SpySection,
    BusinessEditModal,
  },
  async setup() {
    const router = useRouter();

    const loading = ref(false);
    const alertError = ref('');
    const showEditModal = ref(false);

    const store = globalStore();

    const state = reactive({
      currentUser: {},
      business: {},
      commerces: [],
      businessForEdit: null,
      manageSubMenuOption: false,
      manageControlSubMenuOption: false,
      medicalManagementSubMenuOption: false,
      errorsUpdate: [],
      menuOptions: [
        'dashboard',
        'reports',
        'booking-manage',
        'control-admin',
        'manage-admin',
        'medical-management',
        'configuration',
        'documents',
        'your-plan',
        'business-resume',
        'go-minisite',
        'client-portal',
      ],
      menuIcons: {
        dashboard: 'bi-speedometer2',
        reports: 'bi-bar-chart',
        'booking-manage': 'bi-calendar-check',
        'control-admin': 'bi-gear',
        'manage-admin': 'bi-people',
        'medical-management': 'bi-heart-pulse',
        configuration: 'bi-sliders',
        documents: 'bi-file-earmark-text',
        'your-plan': 'bi-credit-card',
        'business-resume': 'bi-building',
        'go-minisite': 'bi-globe',
        'client-portal': 'bi-person-circle',
      },
      manageControlSubMenuOptions: [
        'tracing',
        'lead-pipeline',
        'product-stock',
        'financial',
        //'patients',
        //'marketing'
      ],
      manageSubMenuOptions: [
        'business-info',
        'commerce-admin',
        'service-admin',
        'modules-admin',
        'queues-admin',
        'collaborators-admin',
        'professionals-admin',
        'surveys-admin',
        'product-admin',
        'outcome-types-admin',
        'company-admin',
        'forms-admin',
        'lgpd-consent-admin',
        'permissions-admin',
      ],
      medicalManagementSubMenuOptions: [
        'patient-history-item-admin',
        'medications-admin',
        'medical-exams-admin',
        'medical-templates-admin',
        'pdf-templates-admin',
        'audit-log',
      ],
      currentPlanActivation: {},
      toggles: {},
      businessAdminToggles: {},
      showMobileMenuSide: true,
      showMobileSpySide: false,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.renewActualBusiness();
        state.commerces = state.business.commerces || [];
        state.currentPlanActivation =
          (await getValidatedPlanActivationByBusinessId(state.business.id, true)) || {};
        state.toggles = await getPermissions('business', 'main-menu');
        state.businessAdminToggles = await getPermissions('businesses', 'admin');
        // Ensure lgpd-consent-admin permission exists (default to false if not found)
        if (state.toggles['business.main-menu.lgpd-consent-admin'] === undefined) {
          console.warn(
            'LGPD Consent Admin permission not found in toggles. Available permissions:',
            Object.keys(state.toggles),
          );
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error ? (error.response ? error.respose.status : 500) : 500;
        loading.value = false;
      }
    });

    const goToOption = async option => {
      try {
        loading.value = true;
        alertError.value = '';
        if (option) {
          if (option === 'manage-admin') {
            state.manageSubMenuOption = !state.manageSubMenuOption;
            state.manageControlSubMenuOption = false;
            state.medicalManagementSubMenuOption = false;
            loading.value = false;
          } else if (option === 'control-admin') {
            state.manageControlSubMenuOption = !state.manageControlSubMenuOption;
            state.manageSubMenuOption = false;
            state.medicalManagementSubMenuOption = false;
            loading.value = false;
          } else if (option === 'medical-management') {
            state.medicalManagementSubMenuOption = !state.medicalManagementSubMenuOption;
            state.manageSubMenuOption = false;
            state.manageControlSubMenuOption = false;
            loading.value = false;
          } else if (option === 'business-info') {
            // Abrir modal de edición de empresa
            await openBusinessEditModal();
            loading.value = false;
          } else {
            // Verificar permisos antes de navegar
            const permissionKey = `business.main-menu.${option}`;
            if (state.toggles && state.toggles[permissionKey] === false) {
              // No tiene permisos, mostrar error y no navegar
              loading.value = false;
              alertError.value = 'No tienes permisos para acceder a esta sección';
              return;
            }

            try {
              await router.push({ path: `/interno/negocio/${option}` });
              loading.value = false;
            } catch (routeError) {
              loading.value = false;
              alertError.value = routeError?.message || 'Error navigating to route';
            }
          }
        }
      } catch (error) {
        loading.value = false;
        alertError.value = error?.message || 'An unexpected error occurred';
      }
    };

    const isActiveBusiness = () => state.business && state.business.active === true;

    const getBusinessLink = () => {
      const businessKeyName = state.business.keyName;
      return `${import.meta.env.VITE_URL}/interno/negocio/${businessKeyName}`;
    };

    const getClientPortalLink = () => {
      // Use commerce keyName for client portal, fallback to business if no commerce selected
      const keyName =
        state.commerces.length > 0 && store.getCurrentCommerce?.keyName
          ? store.getCurrentCommerce.keyName
          : state.business.keyName;
      return `/public/portal/${keyName}/login`;
    };

    const validateUpdate = business => {
      state.errorsUpdate = [];
      if (business.contactInfo?.phone && !business.contactInfo.phone.match(/^[0-9]{10,15}$/)) {
        state.errorsUpdate.push('businessInfo.validate.phone');
      }
      if (!business.localeInfo?.country || business.localeInfo.country.length === 0) {
        state.errorsUpdate.push('businessInfo.validate.country');
      }
      if (
        business.localeInfo?.address &&
        (business.localeInfo.address.length < 5 || business.localeInfo.address.length > 200)
      ) {
        state.errorsUpdate.push('businessInfo.validate.address');
      }
      return state.errorsUpdate.length === 0;
    };

    const update = async business => {
      try {
        loading.value = true;
        if (validateUpdate(business)) {
          business.contactInfo.phone = business.phone;
          await updateBusiness(business);
          state.business = await store.renewActualBusiness();
          closeEditModal();
          loading.value = false;
        } else {
          alertError.value = 422;
          loading.value = false;
        }
      } catch (error) {
        console.error('Error updating business:', error);
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const openBusinessEditModal = async () => {
      try {
        loading.value = true;
        const businessData = await getBusinessById(state.business.id);
        state.businessForEdit = businessData;
        showEditModal.value = true;
        loading.value = false;
      } catch (error) {
        console.error('Error loading business:', error);
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const closeEditModal = () => {
      showEditModal.value = false;
      state.businessForEdit = null;
      // Clean modal backdrop
      const modals = document.querySelectorAll('.modal-backdrop');
      modals.forEach(modal => modal.remove());
      document.body.classList.remove('modal-open');
    };

    const handleSubmenuClick = (opt) => {
      if (state.toggles[`business.main-menu.${opt}`] !== false) {
        goToOption(opt);
      }
    };

    const onShowMobileMenuSide = () => {
      state.showMobileMenuSide = true;
      state.showMobileSpySide = false;
    };

    const onShowMobileSpySide = () => {
      state.showMobileMenuSide = false;
      state.showMobileSpySide = true;
    };

    const getSubmenuIcon = opt => {
      const iconMap = {
        'business-info': 'bi-building',
        'commerce-admin': 'bi-shop',
        'service-admin': 'bi-tools',
        'modules-admin': 'bi-layers',
        'queues-admin': 'bi-list-check',
        'collaborators-admin': 'bi-people',
        'professionals-admin': 'bi-person-badge',
        'surveys-admin': 'bi-clipboard-check',
        'product-admin': 'bi-box-seam',
        'outcome-types-admin': 'bi-check-circle',
        'company-admin': 'bi-briefcase',
        'forms-admin': 'bi-file-text',
        'lgpd-consent-admin': 'bi-shield-check',
        'permissions-admin': 'bi-key',
        tracing: 'bi-search',
        'lead-pipeline': 'bi-funnel',
        'product-stock': 'bi-boxes',
        financial: 'bi-cash',
        'patient-history-admin': 'bi-file-medical',
        'medications-admin': 'bi-capsule',
        'medical-exams-admin': 'bi-clipboard-data',
        'medical-templates-admin': 'bi-file-earmark-medical',
        'pdf-templates-admin': 'bi-file-earmark-pdf',
        'audit-log': 'bi-journal-text',
      };
      return `bi ${iconMap[opt] || 'bi-chevron-right'}`;
    };

    // Función para cerrar todos los submenús
    const closeAllSubmenus = () => {
      state.manageSubMenuOption = false;
      state.manageControlSubMenuOption = false;
      state.medicalManagementSubMenuOption = false;
    };

    // Función para manejar click outside
    const handleClickOutside = event => {
      // No cerrar si el modal está abierto
      if (showEditModal.value) {
        return;
      }

      // No hacer nada si se hizo click en una tarjeta de menú o submenú
      const isMenuCard = event.target.closest('.menu-card, .submenu-card, .mobile-submenu-card');
      if (isMenuCard) {
        return;
      }
      closeAllSubmenus();
    };

    // Agregar event listener para click outside
    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });



    // Remover event listener al desmontar
    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    return {
      state,
      loading,
      alertError,
      showEditModal,
      isActiveBusiness,
      goToOption,
      getBusinessLink,
      getClientPortalLink,
      onShowMobileMenuSide,
      onShowMobileSpySide,
      getSubmenuIcon,
      update,
      closeEditModal,
      handleSubmenuClick,
    };
  },
};
</script>

<template>
  <div class="business-menu-container">
    <div class="content">
      <!-- Mobile/Tablet Layout -->
      <div class="d-block d-lg-none mobile-menu-layout">
        <div class="text-center">
          <CommerceLogo :business-id="state.business?.id" :loading="loading"></CommerceLogo>
          <WelcomeMenu
            :name="state.currentUser.name"
            :toggles="state.toggles"
            component-name="businessMenu"
          >
          </WelcomeMenu>
        </div>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <PlanStatus :show="true" :plan-activation="state.currentPlanActivation" :can-admin="true">
          </PlanStatus>
        </div>
        <div id="menu-mobile">
          <div class="sub-menu-spy">
            <span v-if="state.showMobileMenuSide" @click="onShowMobileSpySide()"
              >{{ $t('businessMenu.seeSpy') }}<i class="bi bi-arrow-right-circle-fill mx-1"></i>
            </span>
            <span v-else @click="onShowMobileMenuSide()"
              >{{ $t('businessMenu.seeMenu') }}<i class="bi bi-arrow-right-circle-fill mx-1"></i>
            </span>
          </div>
          <div class="mobile-content-wrapper">
            <Transition name="slide" mode="out-in">
              <div
                v-if="state.showMobileMenuSide === true"
                id="menu-side-mobile"
                :key="`menu-side-mobile`"
              >
                <div class="choose-attention my-3 mt-4">
                  <span>{{ $t('businessMenu.choose') }}</span>
                </div>
                <!-- Main menu options (excluding portal and minisite) -->
                <div class="row mobile-cards-grid">
                  <div
                    v-for="option in state.menuOptions.filter(
                      opt => opt !== 'go-minisite' && opt !== 'client-portal'
                    )"
                    :key="option"
                    class="col-12 mobile-card-wrapper"
                  >
                    <div
                      class="menu-card mobile-menu-card"
                      @click.stop="goToOption(option)"
                      :class="{ disabled: !state.toggles[`business.main-menu.${option}`] }"
                    >
                      <div class="card-icon">
                        <i :class="`bi ${state.menuIcons[option]}`"></i>
                      </div>
                      <div class="card-text">
                        {{ $t(`businessMenu.${option}`) }}
                        <i
                          v-if="option === 'manage-admin'"
                          :class="`chevron bi ${
                            state.manageSubMenuOption === true ? 'bi-chevron-up' : 'bi-chevron-down'
                          }`"
                        ></i>
                        <i
                          v-if="option === 'control-admin'"
                          :class="`chevron bi ${
                            state.manageControlSubMenuOption === true
                              ? 'bi-chevron-up'
                              : 'bi-chevron-down'
                          }`"
                        ></i>
                        <i
                          v-if="option === 'medical-management'"
                          :class="`chevron bi ${
                            state.medicalManagementSubMenuOption === true
                              ? 'bi-chevron-up'
                              : 'bi-chevron-down'
                          }`"
                        ></i>
                      </div>
                    </div>
                    <div
                      v-if="option === 'manage-admin' && state.manageSubMenuOption === true"
                      class="mobile-submenu-container"
                    >
                      <div
                        v-for="opt in state.manageSubMenuOptions"
                        :key="opt"
                        class="mobile-submenu-item"
                      >
                        <div
                          class="mobile-submenu-card"
                          @click.prevent.stop="handleSubmenuClick(opt)"
                          :class="{ disabled: state.toggles[`business.main-menu.${opt}`] === false }"
                          :title="
                            state.toggles[`business.main-menu.${opt}`] === false
                              ? $t('businessMenu.permissionRequired')
                              : ''
                          "
                        >
                          <div class="card-icon">
                            <i :class="getSubmenuIcon(opt)"></i>
                          </div>
                          <div class="card-text">
                            {{ $t(`businessMenu.${opt}`) }}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="option === 'control-admin' && state.manageControlSubMenuOption === true"
                      class="mobile-submenu-container"
                    >
                      <div
                        v-for="opt in state.manageControlSubMenuOptions"
                        :key="opt"
                        class="mobile-submenu-item"
                      >
                        <div
                          class="mobile-submenu-card"
                          @click.prevent.stop="handleSubmenuClick(opt)"
                          :class="{ disabled: state.toggles[`business.main-menu.${opt}`] === false }"
                        >
                          <div class="card-icon">
                            <i :class="getSubmenuIcon(opt)"></i>
                          </div>
                          <div class="card-text">
                            {{ $t(`businessMenu.${opt}`) }}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="
                        option === 'medical-management' &&
                        state.medicalManagementSubMenuOption === true
                      "
                      class="mobile-submenu-container"
                    >
                      <div
                        v-for="opt in state.medicalManagementSubMenuOptions"
                        :key="opt"
                        class="mobile-submenu-item"
                      >
                        <div
                          class="mobile-submenu-card"
                          @click.prevent.stop="handleSubmenuClick(opt)"
                          :class="{ disabled: state.toggles[`business.main-menu.${opt}`] === false }"
                        >
                          <div class="card-icon">
                            <i :class="getSubmenuIcon(opt)"></i>
                          </div>
                          <div class="card-text">
                            {{ $t(`businessMenu.${opt}`) }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Portal and Minisite buttons in same row -->
                  <div class="row">
                    <div class="col-6 centered mobile-portal-wrapper">
                      <a
                        class="menu-card mobile-menu-card portal-card external-link"
                        :href="`${getBusinessLink()}`"
                        target="_blank"
                      >
                        <div class="card-icon">
                          <i :class="`bi ${state.menuIcons['go-minisite']}`"></i>
                        </div>
                        <div class="card-text">{{ $t('businessMenu.go-minisite') }}</div>
                        <i class="bi bi-box-arrow-up-right external-icon"></i>
                      </a>
                    </div>
                    <div class="col-6 centered mobile-portal-wrapper">
                      <a
                        class="menu-card mobile-menu-card portal-card external-link"
                        :href="`${getClientPortalLink()}`"
                        target="_blank"
                      >
                        <div class="card-icon">
                          <i :class="`bi ${state.menuIcons['client-portal']}`"></i>
                        </div>
                        <div class="card-text">{{ $t('businessMenu.client-portal') }}</div>
                        <i class="bi bi-box-arrow-up-right external-icon"></i>
                      </a>
                    </div>
                  </div>
                </div>
                <div v-if="!isActiveBusiness() && !loading">
                  <Message
                    :title="$t('businessMenu.message.1.title')"
                    :content="$t('businessMenu.message.1.content')"
                    :icon="'bi bi-emoji-dizzy'"
                  >
                  </Message>
                </div>
              </div>
              <div
                v-else-if="state.showMobileSpySide"
                id="spy-side-mobile"
                :key="`spy-side-mobile`"
              >
                <SpySection :show="true" :commerces="state.commerces"> </SpySection>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Desktop Layout -->
      <div class="d-none d-lg-block desktop-menu-layout">
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <PlanStatus :show="true" :plan-activation="state.currentPlanActivation" :can-admin="true">
          </PlanStatus>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row">
          <div class="col-auto desktop-logo-wrapper">
            <CommerceLogo :business-id="state.business?.id" :loading="loading" />
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <WelcomeMenu
              :name="state.currentUser.name"
              :toggles="state.toggles"
              component-name="businessMenu"
            >
            </WelcomeMenu>
          </div>
        </div>
        <div id="menu-desktop" class="row desktop-menu-content">
          <div id="menu-side" class="col-lg-5 desktop-menu-column">
            <div class="choose-attention my-3 mb-4">
              <span>{{ $t('businessMenu.choose') }}</span>
            </div>
            <!-- Main menu options (excluding portal and minisite) -->
            <div class="row menu-cards-grid">
              <div
                v-for="option in state.menuOptions.filter(
                  opt => opt !== 'go-minisite' && opt !== 'client-portal'
                )"
                :key="option"
                class="col-12 menu-card-wrapper"
              >
                <div
                  class="menu-card"
                  @click.stop="goToOption(option)"
                  :class="{
                    disabled: !state.toggles[`business.main-menu.${option}`],
                  }"
                >
                  <div class="card-icon">
                    <i :class="`bi ${state.menuIcons[option]}`"></i>
                  </div>
                  <div class="card-text">
                    {{ $t(`businessMenu.${option}`) }}
                    <i
                      v-if="option === 'manage-admin'"
                      :class="`chevron bi ${
                        state.manageSubMenuOption === true ? 'bi-chevron-up' : 'bi-chevron-down'
                      }`"
                    ></i>
                    <i
                      v-if="option === 'control-admin'"
                      :class="`chevron bi ${
                        state.manageControlSubMenuOption === true
                          ? 'bi-chevron-up'
                          : 'bi-chevron-down'
                      }`"
                    ></i>
                    <i
                      v-if="option === 'medical-management'"
                      :class="`chevron bi ${
                        state.medicalManagementSubMenuOption === true
                          ? 'bi-chevron-up'
                          : 'bi-chevron-down'
                      }`"
                    ></i>
                  </div>
                </div>
                <Transition name="fade">
                  <div
                    v-if="option === 'manage-admin' && state.manageSubMenuOption === true"
                    class="submenu-container"
                  >
                    <div v-for="opt in state.manageSubMenuOptions" :key="opt" class="submenu-item">
                      <div
                        class="submenu-card"
                        @click.prevent.stop="handleSubmenuClick(opt)"
                        :class="{ disabled: state.toggles[`business.main-menu.${opt}`] === false }"
                      >
                        <div class="card-icon">
                          <i :class="getSubmenuIcon(opt)"></i>
                        </div>
                        <div class="card-text">
                          {{ $t(`businessMenu.${opt}`) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
                <Transition name="fade">
                  <div
                    v-if="option === 'control-admin' && state.manageControlSubMenuOption === true"
                    class="submenu-container"
                  >
                    <div
                      v-for="opt in state.manageControlSubMenuOptions"
                      :key="opt"
                      class="submenu-item"
                    >
                      <div
                        class="submenu-card"
                        @click.prevent.stop="handleSubmenuClick(opt)"
                        :class="{ disabled: state.toggles[`business.main-menu.${opt}`] === false }"
                      >
                        <div class="card-icon">
                          <i :class="getSubmenuIcon(opt)"></i>
                        </div>
                        <div class="card-text">
                          {{ $t(`businessMenu.${opt}`) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
                <Transition name="fade">
                  <div
                    v-if="
                      option === 'medical-management' &&
                      state.medicalManagementSubMenuOption === true
                    "
                    class="submenu-container"
                  >
                    <div
                      v-for="opt in state.medicalManagementSubMenuOptions"
                      :key="opt"
                      class="submenu-item"
                    >
                      <div
                        class="submenu-card"
                        @click.prevent.stop="handleSubmenuClick(opt)"
                        :class="{ disabled: state.toggles[`business.main-menu.${opt}`] === false }"
                      >
                        <div class="card-icon">
                          <i :class="getSubmenuIcon(opt)"></i>
                        </div>
                        <div class="card-text">
                          {{ $t(`businessMenu.${opt}`) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
            <!-- Portal and Minisite buttons in same row, full width -->
            <div class="portal-buttons-row">
              <a
                class="menu-card portal-card external-link portal-button"
                :href="`${getBusinessLink()}`"
                target="_blank"
              >
                <div class="card-icon">
                  <i :class="`bi ${state.menuIcons['go-minisite']}`"></i>
                </div>
                <div class="card-text">{{ $t('businessMenu.go-minisite') }}</div>
                <i class="bi bi-box-arrow-up-right external-icon"></i>
              </a>
              <a
                class="menu-card portal-card external-link portal-button"
                :href="`${getClientPortalLink()}`"
                target="_blank"
              >
                <div class="card-icon">
                  <i :class="`bi ${state.menuIcons['client-portal']}`"></i>
                </div>
                <div class="card-text">{{ $t('businessMenu.client-portal') }}</div>
                <i class="bi bi-box-arrow-up-right external-icon"></i>
              </a>
            </div>
            <div v-if="!isActiveBusiness() && !loading">
              <Message
                :title="$t('businessMenu.message.1.title')"
                :content="$t('businessMenu.message.1.content')"
                :icon="'bi bi-emoji-dizzy'"
              >
              </Message>
            </div>
          </div>
          <div id="spy-side" class="col-lg-7 desktop-spy-column" v-if="!loading">
            <SpySection :show="true" :commerces="state.commerces"> </SpySection>
          </div>
        </div>
      </div>
    </div>

    <!-- Business Edit Modal -->
    <BusinessEditModal
      v-if="showEditModal && state.businessForEdit"
      :show="showEditModal"
      :business="state.businessForEdit"
      :toggles="state.businessAdminToggles"
      :is-own-business="true"
      @update="update"
      @close="closeEditModal"
    />
  </div>
</template>

<style scoped>
.choose-attention {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1rem;
  text-align: center;
}
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.btn-style {
  line-height: 1rem;
  padding: 0.65rem 0rem;
}
.btn-light {
  --bs-btn-bg: #dcddde !important;
}
.spy-details {
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 0.8rem;
  cursor: pointer;
}
.spy-title {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1rem;
  text-align: center;
}
/* Mobile card container for slide transition */
.mobile-card-container {
  position: relative;
  overflow: hidden;
}

.mobile-content-wrapper {
  position: relative;
  min-height: 400px;
  width: 100%;
}

/* Slide transition for mobile card swap */
.slide-enter-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-enter-to,
.slide-leave-from {
  transform: translateX(0);
  opacity: 1;
}

#menu-side-mobile,
#spy-side-mobile {
  width: 100%;
  will-change: transform, opacity;
}
.sub-menu-spy {
  text-decoration: underline;
  margin: 1rem;
  text-align: right;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 0.8rem;
  cursor: pointer;
}

/* Desktop menu layout improvements */
.menu-buttons-grid {
  gap: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: stretch;
}

.menu-button-wrapper {
  padding: 0 0.5rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
}

.menu-button-wrapper > div {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}

.desktop-menu-btn {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}

/* Submenu styles */
.submenu-container {
  width: 100%;
  display: block;
}

.submenu-item {
  width: 100%;
  display: block;
}

.submenu-item .desktop-submenu-btn {
  width: 100%;
  max-width: 100%;
}

/* Desktop: more compact button layout */
@media (min-width: 992px) {
  .desktop-menu-btn {
    font-size: 0.85rem;
    padding: 0.45rem 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-block;
    margin: 0 auto;
  }

  .desktop-submenu-btn {
    font-size: 0.8rem;
    padding: 0.4rem 0.85rem;
    width: 100%;
    max-width: 100%;
  }

  .menu-button-wrapper {
    padding: 0 0.25rem;
    justify-content: flex-start;
    align-items: center;
  }

  .submenu-container {
    width: 100%;
    display: block;
  }

  .submenu-item {
    width: 100%;
    display: block;
  }

  .menu-buttons-grid {
    gap: 0.35rem;
    justify-content: center;
  }
}

/* Desktop Menu Layout Styles */
@media (min-width: 992px) {
  .desktop-menu-layout {
    padding: 0;
    width: 100%;
  }

  .desktop-menu-layout .content {
    padding-left: 15px;
    padding-right: 15px;
    max-width: 100%;
  }

  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
  }

  .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
  }

  .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 100px;
    width: auto;
    height: auto;
    margin-bottom: 0;
  }

  #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
  }

  .desktop-menu-content {
    align-items: flex-start;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  .desktop-menu-column {
    padding-right: 1.5rem;
  }

  .desktop-spy-column {
    min-width: 0;
    padding-left: 1.5rem;
  }

  /* Align titles to the center in desktop layout */
  .desktop-menu-column .choose-attention {
    text-align: center;
  }

  .desktop-spy-column .spy-title {
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .desktop-spy-column .spy-subdetails {
    text-align: center;
  }

  .desktop-spy-column .spy-details {
    text-align: center;
  }
}

/* Mobile: Center menu buttons */
@media (max-width: 991px) {
  #menu-side-mobile .row {
    justify-content: center;
  }

  .mobile-button-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .mobile-button-wrapper > div {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .mobile-menu-btn.col-8 {
    flex: 0 0 auto;
    width: 66.666667%;
    margin-left: auto;
    margin-right: auto;
  }

  /* Mobile submenu styles */
  .mobile-submenu-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
  }

  .mobile-submenu-item {
    width: 100%;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding-left: 20px;
  }

  .mobile-submenu-btn {
    width: auto;
    margin-left: 0;
    margin-right: 0;
  }
}

/* New card-based menu styles */
.menu-cards-grid {
  gap: 0.5rem;
  justify-content: center;
}

.menu-card-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.menu-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-left: 3px solid #007bff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
  height: 40px;
  width: 100%;
  text-decoration: none;
  color: inherit;
}

.menu-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.12);
  border-color: var(--azul-turno);
}

.menu-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-card.disabled:hover {
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.submenu-card {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  padding: 0rem 0.8rem;
  margin: 0.25rem 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-left: 3px solid #0056b3;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s ease;
  height: 40px;
  width: 80%;
  text-decoration: none;
  color: inherit;
}

.submenu-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 74, 173, 0.1);
  border-color: var(--azul-turno);
}

.submenu-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submenu-card.disabled:hover {
  transform: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.card-icon {
  font-size: 1.25rem;
  color: var(--azul-turno);
  margin-right: 0.5rem;
  position: relative;
  flex-shrink: 0;
}

.card-text .chevron {
  margin-left: 0.5rem;
  font-size: 0.8rem;
}

.card-text {
  font-size: 0.9rem;
  font-weight: 500;
  text-align: left;
  color: #333;
  line-height: 1.1;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 0.1rem;
  flex: 1;
  min-width: 0;
}

.external-link .card-text {
  margin-right: 0.1rem;
}

.external-icon {
  font-size: 0.6rem;
  color: var(--azul-turno);
}

.submenu-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.submenu-btn {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-color: var(--azul-turno);
  color: var(--azul-turno);
}

.submenu-btn:hover {
  background-color: var(--azul-turno);
  color: white;
}

/* Portal card styles - blue background with white icons */
.portal-card {
  background: var(--azul-turno) !important;
  border-color: var(--azul-turno) !important;
  border-left: 3px solid #0056b3 !important;
  color: white !important;
  width: 120px !important;
}

.portal-card .card-icon {
  color: white !important;
}

.portal-card .card-text {
  color: white !important;
}

.portal-card .external-icon {
  color: white !important;
}

.portal-card:hover {
  background: var(--azul-turno-hover, #0056b3) !important;
  border-color: var(--azul-turno-hover, #0056b3) !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.25) !important;
}

/* Portal row styles */
.portal-row {
  margin-top: 1rem;
}

.portal-card-wrapper {
  padding: 0 0.25rem;
}

/* Mobile card styles */
.mobile-cards-grid {
  gap: 0.4rem;
  justify-content: center;
  padding: 0 0.5rem;
}

.mobile-card-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.15rem;
}

.mobile-menu-card {
  height: 40px;
  padding: 0.5rem 1rem;
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
}

.mobile-menu-card .card-icon {
  font-size: 1.1rem;
  margin-right: 0.5rem;
}

.mobile-menu-card .card-text {
  font-size: 0.85rem; /* Reduced for long text */
  font-weight: 500;
  text-align: left;
  padding: 0 0.1rem;
  word-wrap: break-word;
  hyphens: auto;
  line-height: 1.1;
}

.mobile-submenu-card {
  height: 40px;
  padding: 0.2rem 0.8rem;
  margin: 0.25rem 0.5rem;
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  background: white;
  border: 1px solid #e0e0e0;
  border-left: 3px solid #0056b3;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  color: inherit;
  display: flex;
}

.mobile-submenu-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 74, 173, 0.1);
  border-color: var(--azul-turno);
}

.mobile-submenu-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mobile-submenu-card.disabled:hover {
  transform: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.mobile-submenu-card .card-icon {
  font-size: 1rem;
  margin-right: 0.5rem;
  flex-shrink: 0;
}

.mobile-submenu-card .card-text {
  font-size: 0.85rem;
  font-weight: 500;
  text-align: left;
  padding: 0 0.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.1;
  flex: 1;
  min-width: 0;
  line-height: 1.1;
}

.mobile-submenu-btn {
  font-size: 0.65rem;
  padding: 0.1rem 0.3rem;
  width: 100%;
  max-width: 95px;
}

/* Mobile portal row */
.mobile-portal-row {
  margin-top: 1rem;
  padding: 0 0.5rem;
}

.mobile-portal-wrapper {
  padding: 0.15rem;
  display: flex;
}

/* Desktop portal buttons */
.portal-buttons-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.portal-button {
  flex: 1;
}

/* Portal cards in mobile should be narrower */
.mobile-menu-card.portal-card {
  width: 100% !important;
}

.mobile-submenu-btn {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  width: 100%;
  max-width: 100px;
}
</style>
