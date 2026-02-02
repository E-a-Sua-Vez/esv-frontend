<script>
import { ref, reactive, onBeforeMount, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import WelcomeMenu from '../../components/common/WelcomeMenu.vue';
import { getBusinessLogoUrl } from '../../application/services/business-logo';
import { getActiveCommercesByBusinessId } from '../../application/services/commerce';

export default {
  name: 'MasterBusinessMenu',
  components: { CommerceLogo, Message, Spinner, Alert, WelcomeMenu },
  async setup() {
    const router = useRouter();
    const loading = ref(false);
    const alertError = ref('');

    const store = globalStore();

    const state = reactive({
      currentUser: {},
      business: {},
      commerce: {},
      commerces: [],
      loadingCommerces: false,
      showCommerceModal: false,
      manageSubMenuOption: false,
      manageControlSubMenuOption: false,
      medicalManagementSubMenuOption: false,
      businessMenuOptions: [
        'dashboard',
        'reports',
        'bookings-master-admin',
        'manage-master-admin',
        'medical-management',
        'control-master-admin',
        'configuration',
        'documents',
        'your-plan',
        'business-master-resume',
        'go-minisite',
        'client-portal',
      ],
      menuIcons: {
        'dashboard': 'bi-speedometer2',
        'reports': 'bi-bar-chart',
        'bookings-master-admin': 'bi-calendar-check',
        'control-master-admin': 'bi-gear',
        'manage-master-admin': 'bi-people',
        'medical-management': 'bi-heart-pulse',
        'configuration': 'bi-sliders',
        'documents': 'bi-file-earmark-text',
        'your-plan': 'bi-credit-card',
        'business-master-resume': 'bi-building',
        'go-minisite': 'bi-globe',
        'client-portal': 'bi-person-circle',
      },
      manageControlSubMenuOptions: [
        'tracing',
        'product-stock',
        'financial',
        //'patients',
        //'marketing'
      ],
      manageSubMenuOptions: [
        'commerce-master-admin',
        'service-master-admin',
        'modules-master-admin',
        'queues-master-admin',
        'administrators-master-admin',
        'collaborators-master-admin',
        'surveys-master-admin',
        'forms-master-admin',
        'outcome-types-master-admin',
        'company-master-admin',
        'product-master-admin',
        'permissions-master-admin',
      ],
      medicalManagementSubMenuOptions: [
        'patient-history-item-master-admin',
        'medications-admin',
        'medical-exams-admin',
        'medical-templates-admin',
        'pdf-templates-admin',
        'audit-log',
      ],
      businessLogoUrl: null,
    });

    const loadBusinessData = async () => {
      try {
        state.business = store.getCurrentBusiness;
        state.commerce = store.getCurrentCommerce;

        if (!state.business || !state.business.id) {
          router.push({ path: '/interno/master/business-master-admin' });
          return;
        }

        if (state.business && state.business.id !== undefined) {
          state.currentUser.businessId = state.business.id;

          // Cargar logo del negocio si existe
          if (state.business.logo && state.business.logo.startsWith('/business-logos/')) {
            try {
              const parts = state.business.logo.split('/');
              if (parts.length === 4) {
                const logoId = parts[3];
                state.businessLogoUrl = await getBusinessLogoUrl(state.business.id, logoId);
              }
            } catch (error) {
              console.error('Error loading business logo:', error);
            }
          }

          // Cargar comercios del negocio
          await loadCommerces();
        }
      } catch (error) {
        console.error('Error loading business data:', error);
        alertError.value = error.response?.status || 500;
      }
    };

    const loadCommerces = async () => {
      if (!state.business || !state.business.id) return;

      try {
        state.loadingCommerces = true;
        const commerces = await getActiveCommercesByBusinessId(state.business.id);
        state.commerces = Array.isArray(commerces) ? commerces : [];

        // Si no hay comercio seleccionado pero hay comercios disponibles, seleccionar el primero
        if (!state.commerce && state.commerces.length > 0) {
          state.commerce = state.commerces[0];
          await store.setCurrentCommerce(state.commerce);
        }

        // Si el comercio actual no está en la lista, seleccionar el primero
        if (state.commerce && state.commerces.length > 0) {
          const commerceExists = state.commerces.some(c => c.id === state.commerce.id);
          if (!commerceExists) {
            state.commerce = state.commerces[0];
            await store.setCurrentCommerce(state.commerce);
          }
        }
      } catch (error) {
        console.error('Error loading commerces:', error);
        state.commerces = [];
      } finally {
        state.loadingCommerces = false;
      }
    };

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = store.getCurrentUser;
        await loadBusinessData();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    });

    // Watch for business changes in store
    watch(
      () => store.getCurrentBusiness,
      async newBusiness => {
        if (newBusiness && newBusiness.id) {
          state.business = newBusiness;
          await loadCommerces();
        }
      },
      { deep: true }
    );

    const goToOption = async option => {
      try {
        loading.value = true;
        alertError.value = '';
        if (option) {
          if (option === 'manage-master-admin') {
            state.manageSubMenuOption = !state.manageSubMenuOption;
            state.manageControlSubMenuOption = false;
            state.medicalManagementSubMenuOption = false;
            loading.value = false;
          } else if (option === 'control-master-admin') {
            state.manageControlSubMenuOption = !state.manageControlSubMenuOption;
            state.manageSubMenuOption = false;
            state.medicalManagementSubMenuOption = false;
            loading.value = false;
          } else if (option === 'medical-management') {
            state.medicalManagementSubMenuOption = !state.medicalManagementSubMenuOption;
            state.manageSubMenuOption = false;
            state.manageControlSubMenuOption = false;
            loading.value = false;
          } else if (option === 'go-minisite') {
            window.open(getBusinessLink(), '_blank');
            loading.value = false;
          } else if (option === 'client-portal') {
            window.open(getClientPortalLink(), '_blank');
            loading.value = false;
          } else {
            router.push({ path: `/interno/master/${option}` });
            loading.value = false;
          }
        }
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };

    const goBackToBusinessAdmin = () => {
      router.push({ path: '/interno/master/business-master-admin' });
    };

    const openCommerceModal = () => {
      state.showCommerceModal = true;
    };

    const closeCommerceModal = () => {
      state.showCommerceModal = false;
    };

    const selectCommerce = async commerce => {
      try {
        state.commerce = commerce;
        await store.setCurrentCommerce(commerce);
        closeCommerceModal();
      } catch (error) {
        console.error('Error selecting commerce:', error);
        alertError.value = 'Error al seleccionar el comercio';
      }
    };

    const getBusinessLink = () => {
      const businessKeyName = state.business.keyName;
      return `${import.meta.env.VITE_URL}/interno/negocio/${businessKeyName}`;
    };

    const getBusinessLogo = () => {
      if (state.businessLogoUrl) {
        return state.businessLogoUrl;
      }
      return state.business?.logo;
    };

    const getClientPortalLink = () => {
      // Use commerce keyName for client portal, fallback to business if no commerce selected
      const keyName =
        state.commerces.length > 0 && store.getCurrentCommerce?.keyName
          ? store.getCurrentCommerce.keyName
          : state.business.keyName;
      return `/public/portal/${keyName}/login`;
    };

    const getSubmenuIcon = (opt) => {
      const iconMap = {
        'commerce-master-admin': 'bi-building',
        'service-master-admin': 'bi-tools',
        'modules-master-admin': 'bi-layers',
        'queues-master-admin': 'bi-list-check',
        'administrators-master-admin': 'bi-person-badge',
        'collaborators-master-admin': 'bi-people',
        'surveys-master-admin': 'bi-clipboard-check',
        'forms-master-admin': 'bi-file-text',
        'outcome-types-master-admin': 'bi-check-circle',
        'company-master-admin': 'bi-building',
        'product-master-admin': 'bi-box-seam',
        'permissions-master-admin': 'bi-key',
        'tracing': 'bi-search',
        'product-stock': 'bi-boxes',
        'financial': 'bi-cash',
        'patient-history-item-master-admin': 'bi-file-medical',
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
    const handleClickOutside = (event) => {
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
      goToOption,
      goBackToBusinessAdmin,
      openCommerceModal,
      closeCommerceModal,
      selectCommerce,
      getBusinessLink,
      getBusinessLogo,
      getClientPortalLink,
      getSubmenuIcon,
      router,
    };
  },
};
</script>
<template>
  <div>
    <div class="content text-center">
      <CommerceLogo></CommerceLogo>
      <WelcomeMenu :name="state.currentUser.name" :toggles="undefined" :component-name="undefined">
      </WelcomeMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>

        <!-- Navigation Controls -->
        <div v-if="state.business && state.business.id" class="navigation-controls mb-3">
          <div class="d-flex justify-content-between align-items-center">
            <button
              type="button"
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-3"
              @click="goBackToBusinessAdmin()"
            >
              <i class="bi bi-arrow-left me-2"></i>
              {{ $t('dashboard.return') || 'Volver a Gestión de Negocios' }}
            </button>
            <div class="commerce-selector">
              <button
                type="button"
                class="btn btn-sm fw-bold btn-outline-dark rounded-pill px-3"
                @click="openCommerceModal()"
                :disabled="state.loadingCommerces || state.commerces.length === 0"
              >
                <i class="bi bi-shop me-2"></i>
                <span v-if="state.commerce">{{ state.commerce.tag || 'Comercio' }}</span>
                <span v-else>{{
                  $t('businessAdmin.selectCommerce') || 'Seleccionar Comercio'
                }}</span>
                <i class="bi bi-chevron-down ms-2"></i>
              </button>
            </div>
          </div>
        </div>

        <div v-if="state.business && state.business.id" class="business-admin">
          <div class="card mt-4 mb-4 business-card">
            <div class="row d-flex business-title">
              <div class="col-4 d-flex align-items-center justify-content-center">
                <CommerceLogo
                  v-if="state.business && state.business.id"
                  :src="getBusinessLogo()"
                  :business-id="state.business.id"
                />
              </div>
              <div class="col-8 d-flex align-items-center">
                <div class="flex-grow-1">
                  <div class="item-title fw-bold mb-1">{{ state.business.name }}</div>
                  <div v-if="state.commerce" class="commerce-info small text-muted">
                    <i class="bi bi-shop"></i> {{ state.commerce.tag }}
                    <span v-if="state.commerce.localeInfo?.address" class="ms-2">
                      <i class="bi bi-geo-alt-fill"></i> {{ state.commerce.localeInfo.address }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div id="business-menu" class="business-menu-content">
              <div class="row justify-content-center">
                <div class="col-12 col-md-10 col-lg-8">
                  <div class="row">
                    <div
                      v-for="option in state.businessMenuOptions.filter(opt => opt !== 'go-minisite' && opt !== 'client-portal')"
                      :key="option"
                      class="col-12"
                    >
                      <div
                        class="menu-card mb-2"
                        @click.stop="goToOption(option)"
                      >
                        <div class="card-icon">
                          <i :class="`bi ${state.menuIcons[option]}`"></i>
                        </div>
                        <div class="card-text">
                          {{ $t(`masterMenu.${option}`) }}
                          <i
                            v-if="option === 'manage-master-admin'"
                            :class="`chevron bi ${
                              state.manageSubMenuOption === true ? 'bi-chevron-up' : 'bi-chevron-down'
                            }`"
                          ></i>
                          <i
                            v-if="option === 'control-master-admin'"
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
                        v-if="option === 'manage-master-admin' && state.manageSubMenuOption === true"
                        class="submenu-container"
                      >
                        <div
                          v-for="opt in state.manageSubMenuOptions"
                          :key="opt"
                          class="submenu-item"
                        >
                          <div
                            class="submenu-card"
                            @click="goToOption(opt)"
                          >
                            <div class="card-icon">
                              <i :class="getSubmenuIcon(opt)"></i>
                            </div>
                            <div class="card-text">
                              {{ $t(`masterMenu.${opt}`) }}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        v-if="
                          option === 'control-master-admin' &&
                          state.manageControlSubMenuOption === true
                        "
                        class="submenu-container"
                      >
                        <div
                          v-for="opt in state.manageControlSubMenuOptions"
                          :key="opt"
                          class="submenu-item"
                        >
                          <div
                            class="submenu-card"
                            @click="goToOption(opt)"
                          >
                            <div class="card-icon">
                              <i :class="getSubmenuIcon(opt)"></i>
                            </div>
                            <div class="card-text">
                              {{ $t(`masterMenu.${opt}`) }}
                            </div>
                          </div>
                        </div>
                      </div>
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
                            @click="goToOption(opt)"
                          >
                            <div class="card-icon">
                              <i :class="getSubmenuIcon(opt)"></i>
                            </div>
                            <div class="card-text">
                              {{ $t(`masterMenu.${opt}`) }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="col-12">
                      <div class="row portal-row">
                        <div class="col-6 portal-card-wrapper">
                          <div class="menu-card portal-card">
                            <a
                              class="menu-link"
                              :href="`${getBusinessLink()}`"
                              target="_blank"
                            >
                              <div class="card-icon">
                                <i class="bi bi-globe"></i>
                              </div>
                              <div class="card-text">
                                {{ $t(`masterMenu.go-minisite`) }} <i class="bi bi-box-arrow-up-right ms-2"></i>
                              </div>
                            </a>
                          </div>
                        </div>
                        <div class="col-6 portal-card-wrapper">
                          <div class="menu-card portal-card">
                            <a
                              class="menu-link"
                              :href="`${getClientPortalLink()}`"
                              target="_blank"
                            >
                              <div class="card-icon">
                                <i class="bi bi-person-circle"></i>
                              </div>
                              <div class="card-text">
                                {{ $t(`masterMenu.client-portal`) }} <i class="bi bi-box-arrow-up-right ms-2"></i>
                              </div>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center mt-4">
          <Message
            :title="$t('businessAdmin.message.2.title')"
            :content="$t('businessAdmin.message.2.content')"
          />
          <button
            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4 mt-3"
            @click="router.push({ path: '/interno/master/business-master-admin' })"
          >
            {{ $t('businessAdmin.selectBusiness') || 'Seleccionar Negocio' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Commerce Selection Modal -->
    <div
      v-if="state.showCommerceModal"
      class="modal fade show d-block"
      tabindex="-1"
      role="dialog"
      style="background-color: rgba(0, 0, 0, 0.5)"
      @click.self="closeCommerceModal()"
    >
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title">
              <i class="bi bi-shop"></i>
              {{ $t('businessAdmin.selectCommerce') || 'Seleccionar Comercio' }}
            </h5>
            <button
              type="button"
              class="btn-close"
              aria-label="Close"
              @click="closeCommerceModal()"
            ></button>
          </div>
          <div class="modal-body">
            <div v-if="state.loadingCommerces" class="text-center py-4">
              <Spinner :show="true"></Spinner>
            </div>
            <div v-else-if="state.commerces.length === 0" class="alert alert-warning">
              <i class="bi bi-exclamation-triangle me-2"></i>
              {{ $t('businessAdmin.noCommerces') || 'No hay comercios disponibles' }}
            </div>
            <div v-else class="commerce-list">
              <div
                v-for="com in state.commerces"
                :key="com.id"
                class="commerce-item p-3 mb-2 border rounded cursor-pointer"
                :class="{ 'border-primary bg-light': state.commerce?.id === com.id }"
                @click="selectCommerce(com)"
              >
                <div class="d-flex align-items-center">
                  <img
                    v-if="com.logo"
                    :src="com.logo"
                    class="commerce-mini-logo me-3"
                    style="width: 50px; height: 50px; object-fit: cover; border-radius: 0.25rem"
                  />
                  <div class="flex-grow-1">
                    <div class="fw-bold">{{ com.tag }}</div>
                    <div v-if="com.localeInfo?.address" class="small text-muted">
                      <i class="bi bi-geo-alt-fill"></i>
                      {{ com.localeInfo.address }}
                    </div>
                  </div>
                  <i
                    v-if="state.commerce?.id === com.id"
                    class="bi bi-check-circle-fill text-success fs-4"
                  ></i>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button btn-dark btn"
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              @click="closeCommerceModal()"
            >
              {{ $t('close') || 'Cerrar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.choose-attention {
  padding-bottom: 1rem;
  font-size: 1rem;
  font-weight: 700;
}

.navigation-controls {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.commerce-selector {
  min-width: 200px;
}

.business-card {
  padding: 1.5rem;
  border-radius: 0.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.business-title {
  color: white;
  border-radius: 16px 16px 0 0;
  padding: 1rem 1.25rem;
}

.business-title .col-4 {
  padding-right: 1rem;
}

.business-title .col-8 {
  padding-left: 1.5rem;
}

.item-title {
  font-size: 1.5rem;
  line-height: 1.5;
  color: var(--bs-dark, #212529);
}

.commerce-info {
  font-size: 0.875rem;
}

.business-menu-content {
  padding-top: 1.5rem;
  padding-bottom: 0.5rem;
}

.item-image {
  max-width: 100px;
  max-height: 60px;
}

.btn-light {
  --bs-btn-bg: #dcddde !important;
}

/* Ajustes para el logo dentro del business-title */
.business-title :deep(#commerce-logo) {
  margin: 0;
}

.business-title :deep(#commerce-logo img) {
  max-width: 120px;
  max-height: 120px;
  object-fit: contain;
}

/* New card-based menu styles */
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

.submenu-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.submenu-item {
  width: 100%;
  display: block;
}

.menu-link {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  padding: 0.5rem 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
  height: 40px;
  width: 90%;
  text-decoration: none;
  color: inherit;
}

.menu-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.12);
  border-color: var(--azul-turno);
}

/* Portal card styles - blue background with white icons */
.portal-card {
  background: var(--azul-turno) !important;
  border-color: var(--azul-turno) !important;
  border-left: 3px solid #0056b3 !important;
  color: white !important;
  width: 100% !important;
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

/* Commerce Modal Styles */
.commerce-list {
  max-height: 400px;
  overflow-y: auto;
}

.commerce-item {
  transition: all 0.2s ease;
  cursor: pointer;
}

.commerce-item:hover {
  background-color: var(--bs-light, #f8f9fa) !important;
  border-color: var(--bs-primary, #0d6efd) !important;
}

.commerce-mini-logo {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 0.25rem;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
