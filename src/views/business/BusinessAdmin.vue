<script>
import { ref, reactive, onBeforeMount, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getBusinesses, updateBusiness, addBusiness } from '../../application/services/business';
import { getActiveCommercesByBusinessId } from '../../application/services/commerce';
import { getPermissions } from '../../application/services/permissions';
import { updateBusinessLogo, getBusinessLogo, getBusinessLogoUrl } from '../../application/services/business-logo';
import Popper from 'vue3-popper';
import CommerceName from '../../components/common/CommerceName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import BusinessLogoUpload from '../../components/business/common/BusinessLogoUpload.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import SearchBar from '../../components/common/SearchBar.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

export default {
  name: 'BusinessAdmin',
  components: {
    CommerceLogo,
    BusinessLogoUpload,
    Message,
    Spinner,
    Alert,
    CommerceName,
    Toggle,
    Warning,
    Popper,
    SearchBar,
    ComponentMenu,
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
      businesses: [],
      modules: ref({}),
      showAdd: false,
      newBusiness: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      keyNameError: false,
      tagAddError: false,
      tagUpdateError: false,
      phoneAddError: false,
      phoneUpdateError: false,
      urlAddError: false,
      urlUpdateError: false,
      emailError: false,
      addressAddError: false,
      categoryAddError: false,
      countryAddError: false,
      countryUpdateError: false,
      categories: [
        'beauty',
        'entertaiment',
        'health',
        'shop',
        'pharmacy',
        'services',
        'restaurant',
        'supermarket',
      ],
      toggles: {},
      filtered: [],
      // Pagination state
      page: 1,
      totalPages: 0,
      limit: 10,
      counter: 0,
      limits: [10, 20, 50, 100],
      // Business view state
      selectedBusiness: null,
      selectedCommerces: ref([]),
      selectedCommerce: null,
      loadingCommerces: false,
      // Logo upload state
      showLogoUpload: false,
      logoUploadBusinessId: null,
      businessLogos: {}, // Cache de logos por businessId
      selectedBusinessLogoUrl: null, // Logo URL para el modal
      selectedBusinessLogoUrl: null, // Logo URL para el modal
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        // Asegurar que toggles siempre sea un objeto válido
        if (!state.toggles || typeof state.toggles !== 'object' || Array.isArray(state.toggles)) {
          state.toggles = {};
        }
        state.currentUser = await store.getCurrentUser;
        state.businesses = await getBusinesses() || [];
        state.business = {};
        store.setCurrentBusiness(state.business);
        const permissions = await getPermissions('businesses', 'admin');
        if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
          state.toggles = permissions;
        } else {
          state.toggles = {};
        }
        state.filtered = state.businesses;
        refreshPagination();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        console.error('Error in BusinessAdmin onBeforeMount:', error);
        state.toggles = {};
        state.businesses = Array.isArray(state.businesses) ? state.businesses : [];
        alertError.value = error?.response?.status || error?.status || 500;
        loading.value = false;
      }
    });

    const goBack = () => {
      router.back();
    };

    const getToggle = (key) => {
      try {
        return state.toggles && typeof state.toggles === 'object' && state.toggles[key] ? state.toggles[key] : false;
      } catch (e) {
        return false;
      }
    };

    const getToggleLimit = (key) => {
      try {
        const limit = getToggle(key);
        return limit !== false && limit !== undefined && typeof limit === 'number' ? limit : Infinity;
      } catch (e) {
        return Infinity;
      }
    };

    // Computed property para accesos seguros a toggles
    const toggles = computed(() => {
      try {
        if (!state.toggles || typeof state.toggles !== 'object' || Array.isArray(state.toggles)) {
          return {};
        }
        // Retornar el objeto directamente pero asegurar que todas las propiedades existan
        const safeToggles = {};
        const keys = ['businesses.admin.view', 'businesses.admin.add', 'businesses.admin.edit',
                      'businesses.admin.read', 'businesses.admin.update', 'businesses.admin.limit'];
        keys.forEach(key => {
          safeToggles[key] = state.toggles[key] !== undefined ? state.toggles[key] : false;
        });
        // También incluir todas las demás propiedades del objeto original
        Object.keys(state.toggles).forEach(key => {
          if (!safeToggles.hasOwnProperty(key)) {
            safeToggles[key] = state.toggles[key];
          }
        });
        return safeToggles;
      } catch (e) {
        console.error('Error in toggles computed:', e);
        return {};
      }
    });

    const validateAdd = business => {
      state.errorsAdd = [];
      if (!business.name || business.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!business.keyName || business.keyName.length === 0) {
        state.keyNameError = true;
        state.errorsAdd.push('businessAdmin.validate.keyName');
      } else {
        state.keyNameError = false;
      }
      if (!business.email || business.email.length < 10) {
        state.emailError = true;
        state.errorsAdd.push('businessAdmin.validate.email');
      } else {
        state.emailError = false;
      }
      if (!business.category || business.category.length === 0) {
        state.categoryAddError = true;
        state.errorsAdd.push('businessAdmin.validate.category');
      } else {
        state.categoryAddError = false;
      }
      if (!business.contactInfo.phone || business.contactInfo.phone.length < 10) {
        state.phoneAddError = true;
        state.errorsAdd.push('businessAdmin.validate.phone');
      } else {
        state.phoneAddError = false;
      }
      if (!business.localeInfo.country || business.localeInfo.country.length === 0) {
        state.countryAddError = true;
        state.errorsAdd.push('businessAdmin.validate.country');
      } else {
        state.countryAddError = false;
      }
      if (!business.localeInfo.address || business.localeInfo.address.length < 10) {
        state.addressAddError = true;
        state.errorsAdd.push('businessAdmin.validate.address');
      } else {
        state.addressAddError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = business => {
      state.errorsUpdate = [];
      if (!business.phone || business.phone.length < 10) {
        state.phoneUpdateError = true;
        state.errorsUpdate.push('businessAdmin.validate.phone');
      } else {
        state.phoneUpdateError = false;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const update = async business => {
      try {
        loading.value = true;
        if (validateUpdate(business)) {
          await updateBusiness(business.id, business);
          state.businesses = await getBusinesses();
          state.filtered = state.businesses;
          refreshPagination();
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      state.newBusiness = {
        localeInfo: {},
        contactInfo: {},
        serviceInfo: {
          break: false,
          personalized: false,
          personalizedHours: {},
          holiday: false,
          holidays: {},
        },
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newBusiness)) {
          await addBusiness(state.newBusiness);
          state.businesses = await getBusinesses();
          state.filtered = state.businesses;
          refreshPagination();
          state.showAdd = false;
          state.newBusiness = {};
        }
        state.extendedEntity = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const showUpdateForm = async index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
      // Load logo preview when form is expanded
      if (state.extendedEntity === index) {
        await nextTick();
        const business = paginatedItems.value[index];
        if (business && business.id && business.logo) {
          // Load logo if it's a business-logo path and not already cached
          if (business.logo.startsWith('/business-logos/') && !state.businessLogos[business.id]) {
            await loadBusinessLogoPreview(business.id, business.logo);
          }
        }
      }
    };

    // Watch for extendedEntity changes to preload logos
    watch(() => state.extendedEntity, async (newIndex) => {
      if (newIndex !== undefined) {
        await nextTick(); // Wait for DOM to update
        const business = paginatedItems.value[newIndex];
        if (business && business.id && business.logo) {
          // Load logo if it's a business-logo path and not already cached
          if (business.logo.startsWith('/business-logos/') && !state.businessLogos[business.id]) {
            await loadBusinessLogoPreview(business.id, business.logo);
          }
        }
      }
    }, { immediate: false });

    const receiveFilteredItems = items => {
      state.filtered = items;
    };

    // Pagination methods
    const refreshPagination = () => {
      state.counter = state.filtered.length;
      state.totalPages = Math.ceil(state.counter / state.limit) || 1;
      if (state.page > state.totalPages) {
        state.page = 1;
      }
    };

    const setPage = pageIn => {
      state.page = pageIn;
    };

    // Computed for paginated items
    const paginatedItems = computed(() => {
      const start = (state.page - 1) * state.limit;
      const end = start + state.limit;
      return state.filtered.slice(start, end);
    });

    // Handle search text changes from SearchBar to filter business list
    const handleSearchChange = searchText => {
      if (!searchText || searchText.trim().length < 3) {
        state.filtered = state.businesses;
      } else {
        const searchLower = searchText.toLowerCase();
        state.filtered = state.businesses.filter(business => {
          const name = (business.name || '').toLowerCase();
          const keyName = (business.keyName || '').toLowerCase();
          const email = (business.email || '').toLowerCase();
          return name.includes(searchLower) || keyName.includes(searchLower) || email.includes(searchLower);
        });
      }
      state.page = 1; // Reset to first page on search
      refreshPagination();
    };

    // Handle business selection from SearchBar - show action modal
    const handleBusinessSelect = business => {
      state.selectedBusinessForAction = business;
      // Show modal with options: Manage or View as Business User
    };

    // Logo upload functions
    const openLogoUpload = (businessId) => {
      state.logoUploadBusinessId = businessId;
      state.showLogoUpload = true;
    };

    const closeLogoUpload = () => {
      state.showLogoUpload = false;
      state.logoUploadBusinessId = null;
    };

    const handleLogoUploaded = async (logoData) => {
      try {
        loading.value = true;
        const businessId = state.logoUploadBusinessId;

        if (!businessId) {
          throw new Error('Business ID not found');
        }

        // Upload logo to S3
        const uploadedLogo = await updateBusinessLogo(businessId, logoData);

        // Update business with logo reference
        // The logo URL will be constructed from the logo metadata
        const business = state.businesses.find(b => b.id === businessId);
        if (business) {
          // Update logo field to reference the uploaded logo
          // Format: /business-logos/{businessId}/{logoId}
          business.logo = `/business-logos/${businessId}/${uploadedLogo.id}`;

          // Update business in backend
          await updateBusiness(businessId, business);

          // Load new logo URL for preview
          const logoUrl = await getBusinessLogoUrl(businessId, uploadedLogo.id);
          if (logoUrl) {
            state.businessLogos[businessId] = logoUrl;
          }

          // Refresh businesses list
          state.businesses = await getBusinesses();
          state.filtered = state.businesses;
          refreshPagination();
        }

        closeLogoUpload();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        console.error('Error uploading business logo:', error);
        alertError.value = error.response?.status || error.message || 500;
        loading.value = false;
      }
    };

    // Load business logo for preview (same simple approach as SearchBar)
    const loadBusinessLogoPreview = async (businessId, businessLogoPath = null) => {
      if (!businessId) {
        return;
      }

      // If already loaded, skip
      if (state.businessLogos[businessId]) {
        return;
      }

      // Check if already loading (prevent duplicate requests)
      const loadingKey = `loading_${businessId}`;
      if (state.businessLogos[loadingKey]) {
        return;
      }

      try {
        state.businessLogos[loadingKey] = true; // Mark as loading

        // If businessLogoPath is provided and is a business-logo path, extract logoId directly
        if (businessLogoPath && businessLogoPath.startsWith('/business-logos/')) {
          const parts = businessLogoPath.split('/');
          if (parts.length === 4) {
            const logoId = parts[3];
            // Directly get logo URL using the logoId from the path (same as SearchBar)
            const logoUrl = await getBusinessLogoUrl(businessId, logoId);
            if (logoUrl) {
              // Direct assignment works in reactive objects (same as SearchBar)
              state.businessLogos[businessId] = logoUrl;
              delete state.businessLogos[loadingKey];
              return;
            }
          }
        }

        // Fallback: try to get logo metadata first
        const logoMetadata = await getBusinessLogo(businessId);
        if (logoMetadata && logoMetadata.id) {
          const logoUrl = await getBusinessLogoUrl(businessId, logoMetadata.id);
          if (logoUrl) {
            // Direct assignment works in reactive objects
            state.businessLogos[businessId] = logoUrl;
          }
        }
      } catch (error) {
        console.error('Error loading business logo preview:', error);
      } finally {
        const loadingKey = `loading_${businessId}`;
        delete state.businessLogos[loadingKey];
      }
    };

    // Get logo URL for display (handles business-logo paths with reactive cache)
    const getBusinessLogoUrlForDisplay = (business) => {
      if (!business || !business.logo) {
        return null;
      }

      // If it's a business-logo path, use cached URL or trigger load
      if (business.logo.startsWith('/business-logos/')) {
        // Check cache first
        if (state.businessLogos[business.id]) {
          return state.businessLogos[business.id];
        }

        // Check if not already loading, then trigger async load
        const loadingKey = `loading_${business.id}`;
        if (!state.businessLogos[loadingKey]) {
          // Trigger async load (will update cache when ready)
          loadBusinessLogoPreview(business.id, business.logo).then(() => {
            // Force reactivity update after load
            if (state.businessLogos[business.id]) {
              // Trigger reactivity by accessing the reactive object
              const _ = state.businessLogos[business.id];
            }
          });
        }

        // Return null while loading (will show placeholder)
        return null;
      }

      // Return original logo for static paths or URLs
      return business.logo;
    };

    // Open manage business form
    const openManageBusiness = () => {
      if (!state.selectedBusinessForAction) return;
      const index = state.businesses.findIndex(b => b.id === state.selectedBusinessForAction.id);
      if (index !== -1) {
        state.extendedEntity = index;
        // Scroll to the business in the list
        setTimeout(() => {
          const element = document.querySelector(`[data-business-index="${index}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      closeBusinessActionModal();
    };

    // Open view as business user
    const openViewAsBusinessUser = () => {
      if (!state.selectedBusinessForAction) return;
      selectBusiness(state.selectedBusinessForAction);
      closeBusinessActionModal();
    };

    // Close business action modal
    const closeBusinessActionModal = () => {
      state.selectedBusinessForAction = null;
    };


    const dayChecked = (serviceInfo, day) => {
      if (serviceInfo && serviceInfo.attentionDays) {
        return serviceInfo.attentionDays.includes(day);
      }
      return false;
    };

    const checkDay = (event, serviceInfo, day) => {
      if (serviceInfo) {
        if (!serviceInfo.attentionDays) {
          serviceInfo.attentionDays = [];
        }
        if (event.target.checked) {
          if (!serviceInfo.attentionDays.includes(day)) {
            serviceInfo.attentionDays.push(day);
          }
        } else {
          serviceInfo.attentionDays = serviceInfo.attentionDays.filter(el => el !== day);
        }
        serviceInfo.attentionDays.sort();
        if (serviceInfo.personalized === true) {
          serviceInfo.personalizedHours[day] = {
            attentionHourFrom: serviceInfo.attentionHourFrom,
            attentionHourTo: serviceInfo.attentionHourTo,
          };
        }
      }
    };

    const initializedParsonalizedHours = serviceInfo => {
      if (serviceInfo.personalized === true) {
        if (!serviceInfo.personalizedHours) {
          serviceInfo.personalizedHours = {};
        }
        if (serviceInfo.attentionDays && serviceInfo.attentionDays.length > 0) {
          serviceInfo.attentionDays.forEach(day => {
            serviceInfo.personalizedHours[day] = {
              attentionHourFrom: serviceInfo.attentionHourFrom,
              attentionHourTo: serviceInfo.attentionHourTo,
            };
          });
        }
      }
    };

    // Business view functions
    const selectBusiness = async business => {
      try {
        state.selectedBusiness = business;
        state.selectedCommerce = null;
        state.loadingCommerces = true;
        state.selectedBusinessLogoUrl = null; // Reset logo

        // Load business logo if it's a business-logo path (same as SearchBar)
        if (business.logo && business.logo.startsWith('/business-logos/')) {
          const parts = business.logo.split('/');
          if (parts.length === 4) {
            const logoId = parts[3];
            try {
              const logoUrl = await getBusinessLogoUrl(business.id, logoId);
              if (logoUrl) {
                state.selectedBusinessLogoUrl = logoUrl;
              }
            } catch (error) {
              console.error('Error loading business logo for modal:', error);
            }
          }
        } else if (business.logo) {
          // Use static logo
          state.selectedBusinessLogoUrl = business.logo;
        }

        const commerces = await getActiveCommercesByBusinessId(business.id);
        state.selectedCommerces = Array.isArray(commerces) ? commerces : [];
        // Auto-select first commerce if available
        if (state.selectedCommerces && state.selectedCommerces.length > 0) {
          state.selectedCommerce = state.selectedCommerces[0];
        }
        state.loadingCommerces = false;
      } catch (error) {
        console.error('Error loading commerces:', error);
        state.selectedCommerces = [];
        state.selectedCommerce = null;
        state.loadingCommerces = false;
        alertError.value = error.response?.status || 500;
      }
    };

    const selectCommerce = commerce => {
      state.selectedCommerce = commerce;
      // Bootstrap dropdown closes automatically on item click
    };

    const clearBusinessSelection = () => {
      state.selectedBusiness = null;
      state.selectedCommerces = [];
      state.selectedCommerce = null;
      state.selectedBusinessLogoUrl = null;
      // Reset filtered list to show all businesses
      state.filtered = state.businesses;
      refreshPagination();
    };

    const accessAsBusinessUser = async () => {
      if (!state.selectedBusiness) {
        console.error('No business selected');
        return;
      }

      // If no commerce selected but there are commerces, select the first one
      if (!state.selectedCommerce && state.selectedCommerces && state.selectedCommerces.length > 0) {
        state.selectedCommerce = state.selectedCommerces[0];
      }

      if (!state.selectedCommerce) {
        console.error('No commerce available');
        alertError.value = 'No hay comercios disponibles para este negocio';
        return;
      }

      try {
        // Set business and commerce in store
        await store.setCurrentBusiness(state.selectedBusiness);
        await store.setCurrentCommerce(state.selectedCommerce);
        // Navigate to master business menu page
        router.push({ path: `/interno/master/business-menu` });
      } catch (error) {
        console.error('Error accessing as business user:', error);
        alertError.value = error.response?.status || error.message || 500;
      }
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
      dayChecked,
      checkDay,
      initializedParsonalizedHours,
      receiveFilteredItems,
      getToggle,
      getToggleLimit,
      toggles,
      selectBusiness,
      selectCommerce,
      clearBusinessSelection,
      accessAsBusinessUser,
      handleSearchChange,
      handleBusinessSelect,
      openManageBusiness,
      openViewAsBusinessUser,
      closeBusinessActionModal,
      paginatedItems,
      setPage,
      refreshPagination,
      openLogoUpload,
      closeLogoUpload,
      handleLogoUploaded,
      loadBusinessLogoPreview,
      getBusinessLogoUrlForDisplay,
    };
  },
};
</script>

<template>
  <div v-bind="$attrs">
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessAdmin.title`)"
          :toggles="toggles"
          component-name="businessAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessAdmin">
          <div v-if="toggles['businesses.admin.view']">
            <div v-if="!loading" id="businessAdmin-result" class="mt-4">
              <!-- Unified Search Bar -->
              <div id="business-searcher" class="mx-3 mb-3">
                <SearchBar
                  :list="state.businesses"
                  :label="$t('businessAdmin.searchOrSelectBusiness')"
                  @selectItem="handleBusinessSelect"
                  @searchChange="handleSearchChange"
                >
                </SearchBar>
              </div>

              <!-- Business Action Modal -->
              <div
                v-if="state.selectedBusinessForAction"
                class="modal fade show d-block"
                tabindex="-1"
                style="background-color: rgba(0,0,0,0.5);"
                @click.self="closeBusinessActionModal"
              >
                <div class="modal-dialog modal-dialog-centered">
                  <div class="modal-content modern-modal-container">
                    <div class="modal-header border-0 active-name modern-modal-header">
                      <div class="modern-modal-header-inner">
                        <div class="modern-modal-icon-wrapper">
                          <i class="bi bi-building"></i>
                        </div>
                        <div class="modern-modal-title-wrapper">
                          <h5 class="modal-title fw-bold modern-modal-title">
                            {{ $t('businessAdmin.selectAction') }}
                          </h5>
                          <p class="modern-modal-client-name">
                            {{ state.selectedBusinessForAction?.name }}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        class="btn-close modern-modal-close-btn"
                        @click="closeBusinessActionModal"
                        aria-label="Close"
                      >
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </div>
                    <div class="modal-body modern-modal-body-content">
                      <div class="d-grid gap-3">
                        <button
                          type="button"
                          class="btn btn-lg btn-size fw-bold btn-outline-dark rounded-pill px-4"
                          @click="openManageBusiness"
                        >
                          <i class="bi bi-pencil-square me-2"></i>
                          {{ $t('businessAdmin.manageBusiness') }}
                        </button>
                        <button
                          type="button"
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                          @click="openViewAsBusinessUser"
                        >
                          <i class="bi bi-eye-fill me-2"></i>
                          {{ $t('businessAdmin.viewAsBusiness') }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Business View Modal -->
              <div
                v-if="state.selectedBusiness && state.selectedBusiness.id"
                class="modal fade show d-block"
                tabindex="-1"
                style="background-color: rgba(0,0,0,0.5);"
                @click.self="clearBusinessSelection()"
              >
                <div class="modal-dialog modal-dialog-centered modal-lg">
                  <div class="modal-content modern-modal-container">
                    <div class="modal-header border-0 active-name modern-modal-header">
                      <div class="modern-modal-header-inner">
                        <div class="modern-modal-icon-wrapper">
                          <i class="bi bi-eye-fill"></i>
                        </div>
                        <div class="modern-modal-title-wrapper">
                          <h5 class="modal-title fw-bold modern-modal-title">
                            {{ $t('businessAdmin.viewAsBusiness') }}
                          </h5>
                          <p class="modern-modal-client-name">
                            {{ state.selectedBusiness.name }}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        class="btn-close modern-modal-close-btn"
                        @click="clearBusinessSelection()"
                        aria-label="Close"
                      >
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </div>
                    <div class="modal-body modern-modal-body-content">
                      <!-- Business Info -->
                      <div class="business-info-card p-3 mb-3">
                        <div class="row d-flex align-items-center">
                          <div class="col-3 text-center">
                            <img
                              :src="state.selectedBusinessLogoUrl || state.selectedBusiness.logo"
                              class="business-view-logo img-thumbnail rounded"
                              :alt="state.selectedBusiness.name"
                              @error="state.selectedBusinessLogoUrl = null"
                            />
                          </div>
                          <div class="col-9">
                            <div class="fw-bold business-view-name mb-2">
                              {{ state.selectedBusiness.name }}
                            </div>
                            <div class="text-muted small business-view-email">
                              <i class="bi bi-envelope me-1"></i>
                              {{ state.selectedBusiness.email }}
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Commerce Selector -->
                      <div class="commerce-selector-section mb-3">
                        <label class="form-label fw-bold mb-2">
                          <i class="bi bi-shop me-2"></i>
                          {{ $t('businessAdmin.commerce') }}
                        </label>

                        <!-- Loading commerces -->
                        <div v-if="state.loadingCommerces" class="text-center py-3">
                          <Spinner :show="true"></Spinner>
                        </div>

                        <!-- Multiple commerces: Dropdown -->
                        <div
                          v-else-if="state.selectedCommerces && state.selectedCommerces.length > 1"
                          class="dropdown"
                        >
                          <button
                            class="btn btn-outline-dark w-100 commerce-select-btn d-flex align-items-center justify-content-between"
                            type="button"
                            id="commerceDropdown"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                          >
                            <div class="d-flex align-items-center">
                              <img
                                v-if="state.selectedCommerce && state.selectedCommerce.logo"
                                :src="state.selectedCommerce.logo"
                                class="commerce-mini-logo me-2"
                              />
                              <div class="text-start">
                                <div class="fw-bold">
                                  {{ state.selectedCommerce?.tag || $t('businessAdmin.selectCommerce') }}
                                </div>
                                <div
                                  v-if="state.selectedCommerce?.localeInfo?.address"
                                  class="small text-muted"
                                >
                                  <i class="bi bi-geo-alt-fill"></i>
                                  {{ state.selectedCommerce.localeInfo.address }}
                                </div>
                              </div>
                            </div>
                            <i class="bi bi-chevron-down"></i>
                          </button>
                          <ul class="dropdown-menu w-100" aria-labelledby="commerceDropdown">
                            <li v-for="com in state.selectedCommerces" :key="com.id">
                              <a
                                href="#"
                                class="dropdown-item commerce-option d-flex align-items-center"
                                :class="{ active: state.selectedCommerce?.id === com.id }"
                                @click.prevent="selectCommerce(com)"
                              >
                                <img
                                  v-if="com.logo"
                                  :src="com.logo"
                                  class="commerce-mini-logo me-2"
                                />
                                <div class="flex-grow-1">
                                  <div class="fw-bold">{{ com.tag }}</div>
                                  <div v-if="com.localeInfo?.address" class="small text-muted">
                                    <i class="bi bi-geo-alt-fill"></i>
                                    {{ com.localeInfo.address }}
                                  </div>
                                </div>
                                <i
                                  v-if="state.selectedCommerce?.id === com.id"
                                  class="bi bi-check-circle-fill text-success"
                                ></i>
                              </a>
                            </li>
                          </ul>
                        </div>

                        <!-- Single commerce: Simple display -->
                        <div
                          v-else-if="state.selectedCommerces && state.selectedCommerces.length === 1"
                          class="commerce-single-display p-3 border rounded"
                        >
                          <div class="d-flex align-items-center">
                            <img
                              v-if="state.selectedCommerces[0].logo"
                              :src="state.selectedCommerces[0].logo"
                              class="commerce-mini-logo me-3"
                            />
                            <div>
                              <div class="fw-bold">{{ state.selectedCommerces[0].tag }}</div>
                              <div
                                v-if="state.selectedCommerces[0].localeInfo?.address"
                                class="small text-muted"
                              >
                                <i class="bi bi-geo-alt-fill"></i>
                                {{ state.selectedCommerces[0].localeInfo.address }}
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- No commerces message -->
                        <div v-else class="alert alert-warning">
                          <i class="bi bi-exclamation-triangle me-2"></i>
                          {{ $t('businessAdmin.noCommerces') }}
                        </div>
                      </div>
                    </div>
                    <div class="modal-footer border-0 modern-modal-footer">
                      <div class="d-flex align-items-center justify-content-between w-100 gap-3">
                        <button
                          type="button"
                          class="btn btn-sm fw-bold btn-outline-secondary rounded-pill px-4"
                          @click="clearBusinessSelection()"
                        >
                          {{ $t('close') || 'Cancelar' }}
                        </button>
                        <button
                          type="button"
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                          :disabled="!state.selectedCommerce || !state.selectedCommerce.id"
                          @click="accessAsBusinessUser()"
                        >
                          <i class="bi bi-box-arrow-right me-2"></i>
                          {{ $t('businessAdmin.accessAsBusiness') }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div v-if="state.businesses.length === 0">
                  <Message
                    :title="$t('businessAdmin.message.2.title')"
                    :content="$t('businessAdmin.message.2.content')"
                  />
                </div>
                <div class="row my-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd()"
                      :disabled="!toggles['businesses.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div
                  id="add-business"
                  class="business-card mb-4"
                  v-if="state.showAdd && toggles['businesses.admin.add']"
                >
                  <div v-if="state.businesses.length < getToggleLimit('businesses.admin.limit')">
                    <div class="row g-1">
                      <div id="business-name-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.name') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="state.newBusiness.name"
                            v-bind:class="{ 'is-invalid': state.nameError }"
                            placeholder="brilliant-shop-1"
                          />
                        </div>
                      </div>
                      <div id="business-keyName-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.keyName') }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disable-click-away
                            :content="$t('businessAdmin.keyNameHelp')"
                          >
                            <i class="bi bi-info-circle-fill h7"></i>
                          </Popper>
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="state.newBusiness.keyName"
                            v-bind:class="{ 'is-invalid': state.keyNameError }"
                            placeholder="brilliant-shop-1"
                          />
                        </div>
                      </div>
                      <div id="business-email-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.email') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="10"
                            type="email"
                            class="form-control"
                            v-model="state.newBusiness.email"
                            v-bind:class="{ 'is-invalid': state.emailError }"
                            placeholder="name@email.com"
                          />
                        </div>
                      </div>
                      <div id="business-logo-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.logo') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="10"
                            type="text"
                            class="form-control"
                            v-model="state.newBusiness.logo"
                            placeholder="url/image.png"
                          />
                        </div>
                      </div>
                      <div id="business-category-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.category') }}
                        </div>
                        <div class="col-8">
                          <select
                            class="btn btn-md btn-light fw-bold text-dark select"
                            v-model="state.newBusiness.category"
                            id="caterogies"
                            v-bind:class="{ 'is-invalid': state.categoryAddError }"
                          >
                            <option v-for="cat in state.categories" :key="cat" :value="cat">
                              {{ $t(`categories.${cat}`) }}
                            </option>
                          </select>
                        </div>
                      </div>
                      <!-- Datos de localizacion -->
                      <div class="row g-1">
                        <a class="nav-link fw-bold" data-bs-toggle="collapse" href="#add-location">
                          {{ $t('businessAdmin.location') }} <i class="bi bi-chevron-down"></i>
                        </a>
                      </div>
                      <div id="add-location" class="collapse row m-0">
                        <div id="business-country-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.country') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="12"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.localeInfo.country"
                              v-bind:class="{ 'is-invalid': state.countryAddError }"
                              placeholder="Ex. ve, br, cl"
                            />
                          </div>
                        </div>
                        <div id="business-language-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.language') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="3"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.localeInfo.language"
                              placeholder="Ex.: es / en / pt"
                            />
                          </div>
                        </div>
                        <div id="business-timezone-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.timezone') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="30"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.localeInfo.timezone"
                              placeholder="Ex.: America/Caracas"
                            />
                          </div>
                        </div>
                        <div id="business-address-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.address') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="80"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.localeInfo.address"
                              v-bind:class="{ 'is-invalid': state.addressAddError }"
                              placeholder="Street 1, Building 56, City, State"
                            />
                          </div>
                        </div>
                        <div id="business-addressLat-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.addressLat') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="10"
                              type="number"
                              class="form-control"
                              v-model="state.newBusiness.localeInfo.addressLat"
                              placeholder="Ex.: 10.65656"
                            />
                          </div>
                        </div>
                        <div id="business-addressLng-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.addressLng') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="10"
                              type="number"
                              class="form-control"
                              v-model="state.newBusiness.localeInfo.addressLng"
                              placeholder="Ex.: -10.65656"
                            />
                          </div>
                        </div>
                      </div>
                      <!-- Datos de Contacto -->
                      <div class="row g-1">
                        <a class="nav-link fw-bold" data-bs-toggle="collapse" href="#add-contact">
                          {{ $t('businessAdmin.contact') }} <i class="bi bi-chevron-down"></i>
                        </a>
                      </div>
                      <div id="add-contact" class="collapse row m-0">
                        <div id="business-contact-email-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.email') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="30"
                              type="email"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.email"
                              placeholder="Ex.: contact@business.com"
                            />
                          </div>
                        </div>
                        <div id="business-contact-url-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.url') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="30"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.url"
                              placeholder="Ex.: https://www.business.com/"
                            />
                          </div>
                        </div>
                        <div id="business-phone-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.phone') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="10"
                              type="tel"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.phone"
                              v-bind:class="{ 'is-invalid': state.phoneAddError }"
                              placeholder="Cod. Pais + Numero"
                            />
                          </div>
                        </div>
                        <div id="business-contact-phone2-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.phone2') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="9"
                              max="12"
                              type="tel"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.phone2"
                              placeholder="Ex.: 56233445533"
                            />
                          </div>
                        </div>
                        <div id="business-contact-whatsapp-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.whatsapp') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="9"
                              max="12"
                              type="tel"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.whatsapp"
                              placeholder="Ex.: 56233445533"
                            />
                          </div>
                        </div>
                        <div id="business-contact-twitter-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.twitter') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="5"
                              max="20"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.twitter"
                              placeholder="Ex.: tw_business"
                            />
                          </div>
                        </div>
                        <div id="business-contact-instagram-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.instagram') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="5"
                              max="20"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.instagram"
                              placeholder="Ex.: ig_business"
                            />
                          </div>
                        </div>
                        <div id="business-contact-facebook-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.facebook') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="5"
                              max="20"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.facebook"
                              placeholder="Ex.: fb_business"
                            />
                          </div>
                        </div>
                      </div>
                      <!-- Datos de Servicio -->
                      <div class="row g-1">
                        <a class="nav-link fw-bold" data-bs-toggle="collapse" href="#add-service">
                          {{ $t('businessAdmin.service') }} <i class="bi bi-chevron-down"></i>
                        </a>
                      </div>
                      <div id="add-service" class="collapse row m-0">
                        <div id="business-serviceUrl-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.serviceUrl') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="12"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.serviceInfo.serviceUrl"
                              placeholder="Ex. https://menu.business.com"
                            />
                          </div>
                        </div>
                        <div id="business-attentionHour-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.attentionHour') }}
                          </div>
                          <div class="col-3">
                            <input
                              min="0"
                              max="24"
                              minlength="1"
                              maxlength="2"
                              type="number"
                              class="form-control"
                              v-model="state.newBusiness.serviceInfo.attentionHourFrom"
                              placeholder="Ex. 8"
                            />
                          </div>
                          <div class="col-2">-</div>
                          <div class="col-3">
                            <input
                              min="0"
                              max="24"
                              minlength="1"
                              maxlength="2"
                              type="number"
                              class="form-control"
                              v-model="state.newBusiness.serviceInfo.attentionHourTo"
                              placeholder="Ex. 16"
                            />
                          </div>
                        </div>
                        <div id="add-business-break-active-form" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessCommercesAdmin.break') }}
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="state.newBusiness.serviceInfo.break"
                              :disabled="!toggles['businesses.admin.edit']"
                            />
                          </div>
                        </div>
                        <div
                          id="business-attentionBreak-form-add"
                          v-if="state.newBusiness.serviceInfo.break"
                          class="row g-1"
                        >
                          <div class="col-4 text-label">
                            {{ $t('businessCommercesAdmin.breakHour') }}
                          </div>
                          <div class="col-3">
                            <input
                              min="0"
                              max="24"
                              minlength="1"
                              maxlength="5"
                              type="number"
                              class="form-control"
                              v-model="state.newBusiness.serviceInfo.breakHourFrom"
                              placeholder="Ex. 8"
                            />
                          </div>
                          <div class="col-2">-</div>
                          <div class="col-3">
                            <input
                              min="0"
                              max="24"
                              minlength="1"
                              maxlength="5"
                              type="number"
                              class="form-control"
                              v-model="state.newBusiness.serviceInfo.breakHourTo"
                              placeholder="Ex. 16"
                            />
                          </div>
                        </div>
                        <div id="business-attentionDays-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.attentionDays') }}
                          </div>
                          <div class="col-8">
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="monday"
                                :checked="dayChecked(state.newBusiness.serviceInfo, 1)"
                                @click="checkDay($event, state.newBusiness.serviceInfo, 1)"
                              />
                              <label class="form-check-label" for="monday">{{
                                $t('days.1')
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="tuesday"
                                :checked="dayChecked(state.newBusiness.serviceInfo, 2)"
                                @click="checkDay($event, state.newBusiness.serviceInfo, 2)"
                              />
                              <label class="form-check-label" for="tuesday">{{
                                $t('days.2')
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="wednesday"
                                :checked="dayChecked(state.newBusiness.serviceInfo, 3)"
                                @click="checkDay($event, state.newBusiness.serviceInfo, 3)"
                              />
                              <label class="form-check-label" for="wednesday">{{
                                $t('days.3')
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="thursday"
                                :checked="dayChecked(state.newBusiness.serviceInfo, 4)"
                                @click="checkDay($event, state.newBusiness.serviceInfo, 4)"
                              />
                              <label class="form-check-label" for="thursday">{{
                                $t('days.4')
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="friday"
                                :checked="dayChecked(state.newBusiness.serviceInfo, 5)"
                                @click="checkDay($event, state.newBusiness.serviceInfo, 5)"
                              />
                              <label class="form-check-label" for="friday">{{
                                $t('days.5')
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="sabado"
                                :checked="dayChecked(state.newBusiness.serviceInfo, 6)"
                                @click="checkDay($event, state.newBusiness.serviceInfo, 6)"
                              />
                              <label class="form-check-label" for="sabado">{{
                                $t('days.6')
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="domingo"
                                :checked="dayChecked(state.newBusiness.serviceInfo)"
                                @click="checkDay($event, state.newBusiness.serviceInfo, 7)"
                              />
                              <label class="form-check-label" for="domingo">{{
                                $t('days.7')
                              }}</label>
                            </div>
                          </div>
                        </div>
                        <div id="add-business-personalized-active-form" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessCommercesAdmin.personalized') }}
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="state.newBusiness.serviceInfo.personalized"
                              :disabled="!toggles['businesses.admin.edit']"
                              @click="initializedParsonalizedHours(state.newBusiness.serviceInfo)"
                            />
                          </div>
                        </div>
                        <div
                          id="business-personalized-form-add"
                          v-if="state.newBusiness.serviceInfo.personalized"
                          class="row g-1"
                        >
                          <div
                            class="row g-1"
                            v-for="day in state.newBusiness.serviceInfo.attentionDays"
                            :key="day"
                          >
                            <div class="col-4 text-label">
                              {{ $t(`days.${day}`) }}
                            </div>
                            <div class="col-3">
                              <input
                                min="0"
                                max="24"
                                minlength="1"
                                maxlength="2"
                                type="number"
                                class="form-control"
                                v-model="
                                  state.newBusiness.serviceInfo.personalizedHours[day]
                                    .attentionHourFrom
                                "
                                placeholder="Ex. 8"
                              />
                            </div>
                            <div class="col-2">-</div>
                            <div class="col-3">
                              <input
                                min="0"
                                max="24"
                                minlength="1"
                                maxlength="2"
                                type="number"
                                class="form-control"
                                v-model="
                                  state.newBusiness.serviceInfo.personalizedHours[day]
                                    .attentionHourTo
                                "
                                placeholder="Ex. 16"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="add(state.newBusiness)"
                        >
                          {{ $t('businessAdmin.add') }} <i class="bi bi-save"></i>
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
                  <div v-else>
                    <Message
                      :title="$t('businessAdmin.message.3.title')"
                      :content="$t('businessAdmin.message.3.content')"
                    />
                  </div>
                </div>
                <!-- Pagination Mobile/Tablet -->
                <div v-if="state.filtered && state.filtered.length > 0" class="mt-3 mb-3">
                  <div class="d-flex justify-content-center align-items-center flex-wrap gap-2 mb-2">
                    <span class="badge bg-secondary px-2 py-2 m-1">
                      {{ $t('businessAdmin.listResult') }} {{ state.counter }}
                    </span>
                    <span class="badge bg-secondary px-2 py-2 m-1">
                      {{ $t('page') }} {{ state.page }} {{ $t('of') }} {{ state.totalPages }}
                    </span>
                    <select class="btn btn-sm btn-light fw-bold text-dark select mx-1" v-model="state.limit" @change="refreshPagination()">
                      <option v-for="lim in state.limits" :key="lim" :value="lim">
                        {{ lim }}
                      </option>
                    </select>
                  </div>
                  <div class="centered mt-2" v-if="state.filtered">
                    <nav>
                      <ul class="pagination pagination-ul">
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="First"
                            @click="setPage(1)"
                            :disabled="state.page === 1 || state.totalPages === 0"
                          >
                            <span aria-hidden="true"><i class="bi bi-arrow-bar-left"></i></span>
                          </button>
                        </li>
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="Previous"
                            @click="setPage(state.page - 1)"
                            :disabled="state.page === 1 || state.totalPages === 0"
                          >
                            <span aria-hidden="true">&laquo;</span>
                          </button>
                        </li>
                        <li>
                          <select
                            class="btn btn-md btn-light fw-bold text-dark select mx-1 py-1"
                            v-model="state.page"
                            :disabled="state.totalPages === 0"
                          >
                            <option v-for="pag in state.totalPages" :key="pag" :value="pag">
                              {{ pag }}
                            </option>
                          </select>
                        </li>
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="Next"
                            @click="setPage(state.page + 1)"
                            :disabled="state.page === state.totalPages || state.totalPages === 0"
                          >
                            <span aria-hidden="true">&raquo;</span>
                          </button>
                        </li>
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="Last"
                            @click="setPage(state.totalPages)"
                            :disabled="state.page === state.totalPages || state.totalPages === 1"
                          >
                            <span aria-hidden="true"><i class="bi bi-arrow-bar-right"></i></span>
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
                <div>
                  <!-- SearchAdminItem removed - SearchBar now handles filtering -->
                  <div v-for="(business, index) in paginatedItems" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <CommerceName
                          :name="business.name"
                          :tag="business.tag || business.name"
                          :active="business.active"
                          :key-name="business.keyName"
                        ></CommerceName>
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
                      v-if="toggles['businesses.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      class="detailed-data transition-slow"
                      @vue:mounted="loadBusinessLogoPreview(business.id)"
                    >
                      <div class="row g-1">
                        <div id="business-name-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.name') }}
                          </div>
                          <div class="col-8">
                            <input
                              :disabled="true"
                              min="1"
                              max="50"
                              type="text"
                              class="form-control"
                              v-model="business.name"
                              placeholder="brilliant-shop-1"
                            />
                          </div>
                        </div>
                        <div id="business-keyName-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.keyName') }}
                          </div>
                          <div class="col-8">
                            <input
                              :disabled="true"
                              min="1"
                              max="50"
                              type="text"
                              class="form-control"
                              v-model="business.keyName"
                              placeholder="brilliant-shop-1"
                            />
                          </div>
                        </div>
                        <div id="business-email-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.email') }}
                          </div>
                          <div class="col-8">
                            <input
                              :disabled="true"
                              min="10"
                              type="email"
                              class="form-control"
                              v-model="business.email"
                              placeholder="business@email.com"
                            />
                          </div>
                        </div>
                          <div id="business-logo-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessAdmin.logo') }}
                            </div>
                            <div class="col-8">
                              <div class="d-flex flex-column gap-2">
                                <!-- Logo Preview -->
                                <div v-if="state.businessLogos[business.id]" class="logo-preview-small">
                                  <img
                                    :src="state.businessLogos[business.id]"
                                    :alt="$t('businessAdmin.logo')"
                                    class="logo-preview-img"
                                    @error="loadBusinessLogoPreview(business.id, business.logo)"
                                  />
                                </div>
                                <div v-else-if="business.logo && business.logo.startsWith('/business-logos/')" class="logo-preview-small">
                                  <div class="logo-loading-placeholder d-flex flex-column align-items-center justify-content-center p-3">
                                    <i class="bi bi-hourglass-split mb-2"></i>
                                    <span class="small text-muted">{{ $t('common.loading') || 'Cargando...' }}</span>
                                  </div>
                                </div>
                                <div v-else-if="business.logo && !business.logo.startsWith('/business-logos/')" class="logo-preview-small">
                                  <img
                                    :src="business.logo"
                                    :alt="$t('businessAdmin.logo')"
                                    class="logo-preview-img"
                                  />
                                </div>
                                <!-- Upload Button -->
                                <div class="d-flex align-items-center gap-2">
                                  <button
                                    type="button"
                                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                                    @click="openLogoUpload(business.id); loadBusinessLogoPreview(business.id)"
                                    :disabled="!toggles['businesses.admin.edit']"
                                  >
                                    <i class="bi bi-image me-1"></i>
                                    {{ state.businessLogos[business.id] || business.logo ? $t('businessAdmin.logoUpload.replaceLogo') : $t('businessAdmin.logoUpload.selectLogo') }}
                                  </button>
                                  <span v-if="business.logo || state.businessLogos[business.id]" class="small text-muted">
                                    <i class="bi bi-check-circle text-success"></i>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div id="business-category-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessAdmin.category') }}
                            </div>
                            <div class="col-8">
                              <select
                                class="btn btn-md btn-light fw-bold text-dark select"
                                v-model="business.category"
                                id="caterogies"
                              >
                                <option v-for="cat in state.categories" :key="cat" :value="cat">
                                  {{ $t(`categories.${cat}`) }}
                                </option>
                              </select>
                            </div>
                          </div>
                          <div id="business-active-form" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessCommercesAdmin.active') }}
                            </div>
                            <div class="col-8">
                              <Toggle
                                v-model="business.active"
                                :disabled="!toggles['businesses.admin.edit']"
                              />
                            </div>
                          </div>
                          <!-- Datos de localizacion -->
                          <div class="row g-1">
                            <a
                              class="nav-link fw-bold"
                              data-bs-toggle="collapse"
                              aria-expanded="true"
                              :aria-controls="`update-location-${index}`"
                              :href="`#update-location-${index}`"
                            >
                              {{ $t('businessCommercesAdmin.location') }}
                              <i class="bi bi-chevron-down"></i>
                            </a>
                          </div>
                            <div :id="`update-location-${index}`" class="collapse row m-0">
                            <div id="business-country-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.country') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="12"
                                  type="text"
                                  class="form-control"
                                  v-model="business.localeInfo.country"
                                  v-bind:class="{ 'is-invalid': state.countryUpdateError }"
                                  placeholder="Ex. ve, br, cl"
                                />
                              </div>
                            </div>
                            <div id="business-language-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.language') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="3"
                                  type="text"
                                  class="form-control"
                                  v-model="business.localeInfo.language"
                                  placeholder="Ex.: es / en / pt"
                                />
                              </div>
                            </div>
                            <div id="business-timezone-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.timezone') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="30"
                                  type="text"
                                  class="form-control"
                                  v-model="business.localeInfo.timezone"
                                  placeholder="Ex.: America/Caracas"
                                />
                              </div>
                            </div>
                            <div id="business-address-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.address') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="80"
                                  type="text"
                                  class="form-control"
                                  v-model="business.localeInfo.address"
                                  v-bind:class="{ 'is-invalid': state.addressAddError }"
                                  placeholder="Street 1, Building 56, City, State"
                                />
                              </div>
                            </div>
                            <div id="business-addressLat-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.addressLat') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="10"
                                  type="number"
                                  class="form-control"
                                  v-model="business.localeInfo.addressLat"
                                  placeholder="Ex.: 10.65656"
                                />
                              </div>
                            </div>
                            <div id="business-addressLng-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.addressLng') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="10"
                                  type="number"
                                  class="form-control"
                                  v-model="business.localeInfo.addressLng"
                                  placeholder="Ex.: -10.65656"
                                />
                              </div>
                            </div>
                          </div>
                          <!-- Datos de Contacto -->
                          <div class="row g-1">
                            <a
                              class="nav-link fw-bold"
                              data-bs-toggle="collapse"
                              :href="`#update-contact-${index}`"
                            >
                              {{ $t('businessCommercesAdmin.contact') }}
                              <i class="bi bi-chevron-down"></i>
                            </a>
                          </div>
                          <div :id="`update-contact-${index}`" class="collapse row m-0">
                            <div id="business-contact-email-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.email') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="30"
                                  type="email"
                                  class="form-control"
                                  v-model="business.contactInfo.email"
                                  placeholder="Ex.: contact@business.com"
                                />
                              </div>
                            </div>
                            <div id="business-contact-url-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.url') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="30"
                                  type="text"
                                  class="form-control"
                                  v-model="business.contactInfo.url"
                                  placeholder="Ex.: https://www.business.com/"
                                />
                              </div>
                            </div>
                            <div id="business-phone-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.phone') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="10"
                                  type="tel"
                                  class="form-control"
                                  v-model="business.contactInfo.phone"
                                  v-bind:class="{ 'is-invalid': state.phoneUpdateError }"
                                  placeholder="Cod. Pais + Numero"
                                />
                              </div>
                            </div>
                            <div id="business-contact-phone2-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.phone2') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="9"
                                  max="12"
                                  type="tel"
                                  class="form-control"
                                  v-model="business.contactInfo.phone2"
                                  placeholder="Ex.: 56233445533"
                                />
                              </div>
                            </div>
                            <div id="business-contact-whatsapp-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.whatsapp') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="9"
                                  max="12"
                                  type="tel"
                                  class="form-control"
                                  v-model="business.contactInfo.whatsapp"
                                  placeholder="Ex.: 56233445533"
                                />
                              </div>
                            </div>
                            <div id="business-contact-twitter-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.twitter') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="5"
                                  max="20"
                                  type="text"
                                  class="form-control"
                                  v-model="business.contactInfo.twitter"
                                  placeholder="Ex.: tw_commerce"
                                />
                              </div>
                            </div>
                            <div id="business-contact-instagram-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.instagram') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="5"
                                  max="20"
                                  type="text"
                                  class="form-control"
                                  v-model="business.contactInfo.instagram"
                                  placeholder="Ex.: ig_commerce"
                                />
                              </div>
                            </div>
                            <div id="business-contact-facebook-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.facebook') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="5"
                                  max="20"
                                  type="text"
                                  class="form-control"
                                  v-model="business.contactInfo.facebook"
                                  placeholder="Ex.: fb_commerce"
                                />
                              </div>
                            </div>
                          </div>
                          <!-- Datos de Servicio -->
                          <div class="row g-1">
                            <a
                              class="nav-link fw-bold"
                              data-bs-toggle="collapse"
                              :href="`#update-service-${index}`"
                            >
                              {{ $t('businessCommercesAdmin.service') }}
                              <i class="bi bi-chevron-down"></i>
                            </a>
                          </div>
                          <div :id="`update-service-${index}`" class="collapse row m-0">
                            <div id="business-serviceUrl-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.serviceUrl') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="12"
                                  type="text"
                                  class="form-control"
                                  v-model="business.serviceInfo.serviceUrl"
                                  placeholder="Ex. https://menu.business.com"
                                />
                              </div>
                            </div>
                            <div id="business-attentionHour-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.attentionHour') }}
                              </div>
                              <div class="col-3">
                                <input
                                  min="0"
                                  max="24"
                                  minlength="1"
                                  maxlength="2"
                                  type="number"
                                  class="form-control"
                                  v-model="business.serviceInfo.attentionHourFrom"
                                  placeholder="Ex. 8"
                                />
                              </div>
                              <div class="col-2">-</div>
                              <div class="col-3">
                                <input
                                  min="0"
                                  max="24"
                                  minlength="1"
                                  maxlength="2"
                                  type="number"
                                  class="form-control"
                                  v-model="business.serviceInfo.attentionHourTo"
                                  placeholder="Ex. 16"
                                />
                              </div>
                            </div>
                            <div id="add-business-break-active-form" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.break') }}
                              </div>
                              <div class="col-8">
                                <Toggle
                                  v-model="business.serviceInfo.break"
                                  :disabled="!toggles['businesses.admin.edit']"
                                />
                              </div>
                            </div>
                            <div
                              id="business-attentionBreak-form-update"
                              v-if="business.serviceInfo.break"
                              class="row g-1"
                            >
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.breakHour') }}
                              </div>
                              <div class="col-3">
                                <input
                                  min="0"
                                  max="24"
                                  minlength="1"
                                  maxlength="5"
                                  type="number"
                                  class="form-control"
                                  v-model="business.serviceInfo.breakHourFrom"
                                  placeholder="Ex. 8"
                                />
                              </div>
                              <div class="col-2">-</div>
                              <div class="col-3">
                                <input
                                  min="0"
                                  max="24"
                                  minlength="1"
                                  maxlength="5"
                                  type="number"
                                  class="form-control"
                                  v-model="business.serviceInfo.breakHourTo"
                                  placeholder="Ex. 16"
                                />
                              </div>
                            </div>
                            <div id="business-attentionDays-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.attentionDays') }}
                              </div>
                              <div class="col-8">
                                <div class="form-check form-switch">
                                  <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="monday"
                                    :checked="dayChecked(business.serviceInfo, 1)"
                                    @click="checkDay($event, business.serviceInfo, 1)"
                                  />
                                  <label class="form-check-label" for="monday">{{
                                    $t('days.1')
                                  }}</label>
                                </div>
                                <div class="form-check form-switch">
                                  <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="tuesday"
                                    :checked="dayChecked(business.serviceInfo, 2)"
                                    @click="checkDay($event, business.serviceInfo, 2)"
                                  />
                                  <label class="form-check-label" for="tuesday">{{
                                    $t('days.2')
                                  }}</label>
                                </div>
                                <div class="form-check form-switch">
                                  <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="wednesday"
                                    :checked="dayChecked(business.serviceInfo, 3)"
                                    @click="checkDay($event, business.serviceInfo, 3)"
                                  />
                                  <label class="form-check-label" for="wednesday">{{
                                    $t('days.3')
                                  }}</label>
                                </div>
                                <div class="form-check form-switch">
                                  <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="thursday"
                                    :checked="dayChecked(business.serviceInfo, 4)"
                                    @click="checkDay($event, business.serviceInfo, 4)"
                                  />
                                  <label class="form-check-label" for="thursday">{{
                                    $t('days.4')
                                  }}</label>
                                </div>
                                <div class="form-check form-switch">
                                  <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="friday"
                                    :checked="dayChecked(business.serviceInfo, 5)"
                                    @click="checkDay($event, business.serviceInfo, 5)"
                                  />
                                  <label class="form-check-label" for="friday">{{
                                    $t('days.5')
                                  }}</label>
                                </div>
                                <div class="form-check form-switch">
                                  <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="sabado"
                                    :checked="dayChecked(business.serviceInfo, 6)"
                                    @click="checkDay($event, business.serviceInfo, 6)"
                                  />
                                  <label class="form-check-label" for="sabado">{{
                                    $t('days.6')
                                  }}</label>
                                </div>
                                <div class="form-check form-switch">
                                  <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="domingo"
                                    :checked="dayChecked(business.serviceInfo, 7)"
                                    @click="checkDay($event, business.serviceInfo, 7)"
                                  />
                                  <label class="form-check-label" for="domingo">{{
                                    $t('days.7')
                                  }}</label>
                                </div>
                              </div>
                            </div>
                            <div id="update-business-personalized-active-form" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.personalized') }}
                              </div>
                              <div class="col-8">
                                <Toggle
                                  v-model="business.serviceInfo.personalized"
                                :disabled="!toggles['businesses.admin.edit']"
                                  @click="initializedParsonalizedHours(business.serviceInfo)"
                                />
                              </div>
                            </div>
                            <div
                              id="business-personalized-form-update"
                              v-if="business.serviceInfo.personalized"
                              class="row g-1"
                            >
                              <div
                                class="row g-1"
                                v-for="day in business.serviceInfo.attentionDays"
                                :key="day"
                              >
                                <div class="col-4 text-label">
                                  {{ $t(`days.${day}`) }}
                                </div>
                                <div class="col-3">
                                  <input
                                    min="0"
                                    max="24"
                                    minlength="1"
                                    maxlength="2"
                                    type="number"
                                    class="form-control"
                                    v-model="
                                      business.serviceInfo.personalizedHours[day]
                                        .attentionHourFrom
                                    "
                                    placeholder="Ex. 8"
                                  />
                                </div>
                                <div class="col-2">-</div>
                                <div class="col-3">
                                  <input
                                    min="0"
                                    max="24"
                                    minlength="1"
                                    maxlength="2"
                                    type="number"
                                    class="form-control"
                                    v-model="
                                      business.serviceInfo.personalizedHours[day]
                                        .attentionHourTo
                                    "
                                    placeholder="Ex. 16"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div id="business-id-form" class="row -2 mb-g3">
                            <div class="row business-details-container">
                              <div class="col">
                                <span><strong>Id:</strong> {{ business.id }}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="toggles['businesses.admin.read']"
                      class="row g-1 mt-2"
                    >
                      <div class="col">
                        <div class="d-flex gap-2 flex-wrap justify-content-center">
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="update(business)"
                            :disabled="!toggles['businesses.admin.update']"
                          >
                            {{ $t('businessAdmin.update') }} <i class="bi bi-save"></i>
                          </button>
                          <button
                            type="button"
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="selectBusiness(business)"
                          >
                            <i class="bi bi-eye-fill me-2"></i>
                            {{ $t('businessAdmin.viewAsBusiness') }}
                          </button>
                        </div>
                      </div>
                      <div
                        class="row g-1 errors"
                        id="feedback"
                        v-if="state.errorsUpdate.length > 0"
                      >
                        <Warning>
                          <template v-slot:message>
                            <li v-for="(error, errorIndex) in state.errorsUpdate" :key="errorIndex">
                              {{ $t(error) }}
                            </li>
                          </template>
                        </Warning>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="d-flex justify-content-center align-items-center flex-wrap gap-2 mb-2">
              <span class="badge bg-secondary px-2 py-2 m-1">
                {{ $t('businessAdmin.listResult') }} {{ state.counter }}
              </span>
              <span class="badge bg-secondary px-2 py-2 m-1">
                {{ $t('page') }} {{ state.page }} {{ $t('of') }} {{ state.totalPages }}
              </span>
              <select class="btn btn-sm btn-light fw-bold text-dark select mx-1" v-model="state.limit" @change="refreshPagination()">
                <option v-for="lim in state.limits" :key="lim" :value="lim">
                  {{ lim }}
                </option>
              </select>
            </div>
            <div class="centered mt-2" v-if="state.filtered">
              <nav>
                <ul class="pagination pagination-ul">
                  <li class="page-item">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                      aria-label="First"
                      @click="setPage(1)"
                      :disabled="state.page === 1 || state.totalPages === 0"
                    >
                      <span aria-hidden="true"><i class="bi bi-arrow-bar-left"></i></span>
                    </button>
                  </li>
                  <li class="page-item">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                      aria-label="Previous"
                      @click="setPage(state.page - 1)"
                      :disabled="state.page === 1 || state.totalPages === 0"
                    >
                      <span aria-hidden="true">&laquo;</span>
                    </button>
                  </li>
                  <li>
                    <select
                      class="btn btn-md btn-light fw-bold text-dark select mx-1 py-1"
                      v-model="state.page"
                      :disabled="state.totalPages === 0"
                    >
                      <option v-for="pag in state.totalPages" :key="pag" :value="pag">
                        {{ pag }}
                      </option>
                    </select>
                  </li>
                  <li class="page-item">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                      aria-label="Next"
                      @click="setPage(state.page + 1)"
                      :disabled="state.page === state.totalPages || state.totalPages === 0"
                    >
                      <span aria-hidden="true">&raquo;</span>
                    </button>
                  </li>
                  <li class="page-item">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                      aria-label="Last"
                      @click="setPage(state.totalPages)"
                      :disabled="state.page === state.totalPages || state.totalPages === 1"
                    >
                      <span aria-hidden="true"><i class="bi bi-arrow-bar-right"></i></span>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
          <div v-if="(!toggles['businesses.admin.view']) && !loading">
            <Message
              :title="$t('businessAdmin.message.1.title')"
              :content="$t('businessAdmin.message.1.content')"
            />
          </div>
      </div>
      </div>
  </div>
    <!-- Desktop Layout -->
    <!-- eslint-disable vue/no-multiple-template-root -->
    <div class="d-none d-lg-block">
      <div class="content text-center">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <!-- Alert show prop was always false, fixed to show if alertError has value -->
          <Alert :show="!!alertError" :stack="alertError"></Alert>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row justify-content-start">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <div id="commerce-logo-desktop">
                <img
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="$t('logo')"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="$t('businessAdmin.title')"
              :toggles="toggles"
              component-name="businessAdmin"
              @goBack="goBack"
            />
          </div>
        </div>
        <div id="businessAdmin">
          <div v-if="toggles['businesses.admin.view']">
            <div v-if="!loading" id="businessAdmin-result" class="mt-4">
              <!-- Unified Search Bar -->
              <div id="business-searcher" class="mx-3 mb-3">
                <SearchBar
                  :list="state.businesses"
                  :label="$t('businessAdmin.searchOrSelectBusiness')"
                  @selectItem="handleBusinessSelect"
                  @searchChange="handleSearchChange"
                >
                </SearchBar>
              </div>

              <!-- Business Action Modal -->
              <div
                v-if="state.selectedBusinessForAction"
                class="modal fade show d-block"
                tabindex="-1"
                style="background-color: rgba(0,0,0,0.5);"
                @click.self="closeBusinessActionModal"
              >
                <div class="modal-dialog modal-dialog-centered">
                  <div class="modal-content modern-modal-container">
                    <div class="modal-header border-0 active-name modern-modal-header">
                      <div class="modern-modal-header-inner">
                        <div class="modern-modal-icon-wrapper">
                          <i class="bi bi-building"></i>
                        </div>
                        <div class="modern-modal-title-wrapper">
                          <h5 class="modal-title fw-bold modern-modal-title">
                            {{ $t('businessAdmin.selectAction') }}
                          </h5>
                          <p class="modern-modal-client-name">
                            {{ state.selectedBusinessForAction?.name }}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        class="btn-close modern-modal-close-btn"
                        @click="closeBusinessActionModal"
                        aria-label="Close"
                      >
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </div>
                    <div class="modal-body modern-modal-body-content">
                      <div class="d-grid gap-3">
                        <button
                          type="button"
                          class="btn btn-lg btn-size fw-bold btn-outline-dark rounded-pill px-4"
                          @click="openManageBusiness"
                        >
                          <i class="bi bi-pencil-square me-2"></i>
                          {{ $t('businessAdmin.manageBusiness') }}
                        </button>
                        <button
                          type="button"
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                          @click="openViewAsBusinessUser"
                        >
                          <i class="bi bi-eye-fill me-2"></i>
                          {{ $t('businessAdmin.viewAsBusiness') }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Business View Modal -->
              <div
                v-if="state.selectedBusiness && state.selectedBusiness.id"
                class="modal fade show d-block"
                tabindex="-1"
                style="background-color: rgba(0,0,0,0.5);"
                @click.self="clearBusinessSelection()"
              >
                <div class="modal-dialog modal-dialog-centered modal-lg">
                  <div class="modal-content modern-modal-container">
                    <div class="modal-header border-0 active-name modern-modal-header">
                      <div class="modern-modal-header-inner">
                        <div class="modern-modal-icon-wrapper">
                          <i class="bi bi-eye-fill"></i>
                        </div>
                        <div class="modern-modal-title-wrapper">
                          <h5 class="modal-title fw-bold modern-modal-title">
                            {{ $t('businessAdmin.viewAsBusiness') }}
                          </h5>
                          <p class="modern-modal-client-name">
                            {{ state.selectedBusiness.name }}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        class="btn-close modern-modal-close-btn"
                        @click="clearBusinessSelection()"
                        aria-label="Close"
                      >
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </div>
                    <div class="modal-body modern-modal-body-content">
                      <!-- Business Info -->
                      <div class="business-info-card p-3 mb-3">
                        <div class="row d-flex align-items-center">
                          <div class="col-3 text-center">
                            <img
                              :src="state.selectedBusinessLogoUrl || state.selectedBusiness.logo"
                              class="business-view-logo img-thumbnail rounded"
                              :alt="state.selectedBusiness.name"
                              @error="state.selectedBusinessLogoUrl = null"
                            />
                          </div>
                          <div class="col-9">
                            <div class="fw-bold business-view-name mb-2">
                              {{ state.selectedBusiness.name }}
                            </div>
                            <div class="text-muted small business-view-email">
                              <i class="bi bi-envelope me-1"></i>
                              {{ state.selectedBusiness.email }}
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Commerce Selector -->
                      <div class="commerce-selector-section mb-3">
                        <label class="form-label fw-bold mb-2">
                          <i class="bi bi-shop me-2"></i>
                          {{ $t('businessAdmin.commerce') }}
                        </label>

                        <!-- Loading commerces -->
                        <div v-if="state.loadingCommerces" class="text-center py-3">
                          <Spinner :show="true"></Spinner>
                        </div>

                        <!-- Multiple commerces: Dropdown -->
                        <div
                          v-else-if="state.selectedCommerces && state.selectedCommerces.length > 1"
                          class="dropdown"
                        >
                          <button
                            class="btn btn-outline-dark w-100 commerce-select-btn d-flex align-items-center justify-content-between"
                            type="button"
                            id="commerceDropdown"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                          >
                            <div class="d-flex align-items-center">
                              <img
                                v-if="state.selectedCommerce && state.selectedCommerce.logo"
                                :src="state.selectedCommerce.logo"
                                class="commerce-mini-logo me-2"
                              />
                              <div class="text-start">
                                <div class="fw-bold">
                                  {{ state.selectedCommerce?.tag || $t('businessAdmin.selectCommerce') }}
                                </div>
                                <div
                                  v-if="state.selectedCommerce?.localeInfo?.address"
                                  class="small text-muted"
                                >
                                  <i class="bi bi-geo-alt-fill"></i>
                                  {{ state.selectedCommerce.localeInfo.address }}
                                </div>
                              </div>
                            </div>
                            <i class="bi bi-chevron-down"></i>
                          </button>
                          <ul class="dropdown-menu w-100" aria-labelledby="commerceDropdown">
                            <li v-for="com in state.selectedCommerces" :key="com.id">
                              <a
                                href="#"
                                class="dropdown-item commerce-option d-flex align-items-center"
                                :class="{ active: state.selectedCommerce?.id === com.id }"
                                @click.prevent="selectCommerce(com)"
                              >
                                <img
                                  v-if="com.logo"
                                  :src="com.logo"
                                  class="commerce-mini-logo me-2"
                                />
                                <div class="flex-grow-1">
                                  <div class="fw-bold">{{ com.tag }}</div>
                                  <div v-if="com.localeInfo?.address" class="small text-muted">
                                    <i class="bi bi-geo-alt-fill"></i>
                                    {{ com.localeInfo.address }}
                                  </div>
                                </div>
                                <i
                                  v-if="state.selectedCommerce?.id === com.id"
                                  class="bi bi-check-circle-fill text-success"
                                ></i>
                              </a>
                            </li>
                          </ul>
                        </div>

                        <!-- Single commerce: Simple display -->
                        <div
                          v-else-if="state.selectedCommerces && state.selectedCommerces.length === 1"
                          class="commerce-single-display p-3 border rounded"
                        >
                          <div class="d-flex align-items-center">
                            <img
                              v-if="state.selectedCommerces[0].logo"
                              :src="state.selectedCommerces[0].logo"
                              class="commerce-mini-logo me-3"
                            />
                            <div>
                              <div class="fw-bold">{{ state.selectedCommerces[0].tag }}</div>
                              <div
                                v-if="state.selectedCommerces[0].localeInfo?.address"
                                class="small text-muted"
                              >
                                <i class="bi bi-geo-alt-fill"></i>
                                {{ state.selectedCommerces[0].localeInfo.address }}
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- No commerces message -->
                        <div v-else class="alert alert-warning">
                          <i class="bi bi-exclamation-triangle me-2"></i>
                          {{ $t('businessAdmin.noCommerces') }}
                        </div>
                      </div>
                    </div>
                    <div class="modal-footer border-0 modern-modal-footer">
                      <div class="d-flex align-items-center justify-content-between w-100 gap-3">
                        <button
                          type="button"
                          class="btn btn-sm fw-bold btn-outline-secondary rounded-pill px-4"
                          @click="clearBusinessSelection()"
                        >
                          {{ $t('close') || 'Cancelar' }}
                        </button>
                        <button
                          type="button"
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                          :disabled="!state.selectedCommerce || !state.selectedCommerce.id"
                          @click="accessAsBusinessUser()"
                        >
                          <i class="bi bi-box-arrow-right me-2"></i>
                          {{ $t('businessAdmin.accessAsBusiness') }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div v-if="state.businesses.length === 0">
                  <Message
                    :title="$t('businessAdmin.message.2.title')"
                    :content="$t('businessAdmin.message.2.content')"
                  />
                </div>
                <div class="row my-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd()"
                      :disabled="!toggles['businesses.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div
                  id="add-business"
                  class="business-card mb-4"
                  v-if="state.showAdd && toggles['businesses.admin.add']"
                >
                  <div v-if="state.businesses.length < getToggleLimit('businesses.admin.limit')">
                    <form @submit.prevent="add(state.newBusiness)">
                      <div class="row g-1">
                        <div id="business-name-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.name') }}
                          </div>
                          <div class="col-8">
                            <input
                              minlength="1"
                              maxlength="50"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.name"
                              :class="{ 'is-invalid': state.nameError }"
                              placeholder="brilliant-shop"
                              required
                            />
                          </div>
                        </div>
                        <div id="business-keyName-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.keyName') }}
                          </div>
                          <div class="col-8">
                            <input
                              minlength="1"
                              maxlength="50"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.keyName"
                              :class="{ 'is-invalid': state.keyNameError }"
                              placeholder="brilliant-shop"
                              required
                            />
                          </div>
                        </div>
                        <div id="business-email-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.email') }}
                          </div>
                          <div class="col-8">
                            <input
                              minlength="10"
                              type="email"
                              class="form-control"
                              v-model="state.newBusiness.email"
                              :class="{ 'is-invalid': state.emailError }"
                              placeholder="name@email.com"
                              required
                            />
                          </div>
                        </div>
                        <div id="business-tag-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.tag') }}
                          </div>
                          <div class="col-8">
                            <input
                              minlength="1"
                              maxlength="50"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.tag"
                              :class="{ 'is-invalid': state.tagAddError }"
                              placeholder="Brilliant Shop"
                            />
                          </div>
                        </div>
                        <div id="business-logo-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.logo') }}
                          </div>
                          <div class="col-8">
                            <input
                              minlength="10"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.logo"
                              placeholder="url/logo.png"
                            />
                          </div>
                        </div>
                        <div id="business-category-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.category') }}
                          </div>
                          <div class="col-8">
                            <select
                              class="btn btn-md btn-light fw-bold text-dark select"
                              v-model="state.newBusiness.category"
                              id="categories"
                              :class="{ 'is-invalid': state.categoryAddError }"
                              required
                            >
                              <option v-for="cat in state.categories" :key="cat" :value="cat">
                                {{ $t(`categories.${cat}`) }}
                              </option>
                            </select>
                          </div>
                        </div>
                        <div id="business-country-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.country') }}
                          </div>
                          <div class="col-8">
                            <input
                              minlength="1"
                              maxlength="12"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.country"
                              :class="{ 'is-invalid': state.countryAddError }"
                              placeholder="Ex. ve, br, cl"
                              required
                            />
                          </div>
                        </div>
                        <div id="business-url-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.url') }}
                          </div>
                          <div class="col-8">
                            <input
                              minlength="1"
                              maxlength="30"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.url"
                              :class="{ 'is-invalid': state.urlAddError }"
                              placeholder="Ex.: https://www.business.com/"
                            />
                          </div>
                        </div>
                        <div id="business-phone-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.phone') }}
                          </div>
                          <div class="col-8">
                            <input
                              minlength="10"
                              type="tel"
                              class="form-control"
                              v-model="state.newBusiness.phone"
                              :class="{ 'is-invalid': state.phoneAddError }"
                              placeholder="Cod. Pais + Numero"
                            />
                          </div>
                        </div>
                        <div id="business-address-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.address') }}
                          </div>
                          <div class="col-8">
                            <input
                              minlength="1"
                              maxlength="80"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.address"
                              :class="{ 'is-invalid': state.addressAddError }"
                              placeholder="Street 1, Building 56, City, State"
                            />
                          </div>
                        </div>
                        <div class="col">
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            type="submit"
                          >
                            {{ $t('businessAdmin.add') }} <i class="bi bi-save"></i>
                          </button>
                        </div>
                        <div class="row g-1 errors" id="feedback" v-if="state.errorsAdd.length > 0">
                          <Warning>
                            <template v-slot:message>
                              <!-- index/idx fixes: be careful with duplicate key warning, want unique keys -->
                              <li v-for="(error, idx) in state.errorsAdd" :key="error + '.' + idx">
                                {{ $t(error) }}
                              </li>
                            </template>
                          </Warning>
                        </div>
                      </div>
                    </form>
                  </div>
                  <div v-else>
                    <Message
                      :title="$t('businessAdmin.message.3.title')"
                      :content="$t('businessAdmin.message.3.content')"
                    />
                  </div>
                </div>
                <!-- Pagination Desktop -->
                <div v-if="state.filtered && state.filtered.length > 0" class="mt-3 mb-3">
                  <div class="d-flex justify-content-center align-items-center flex-wrap gap-2 mb-2">
                    <span class="badge bg-secondary px-2 py-2 m-1">
                      {{ $t('businessAdmin.listResult') }} {{ state.counter }}
                    </span>
                    <span class="badge bg-secondary px-2 py-2 m-1">
                      {{ $t('page') }} {{ state.page }} {{ $t('of') }} {{ state.totalPages }}
                    </span>
                    <select class="btn btn-sm btn-light fw-bold text-dark select mx-1" v-model="state.limit" @change="refreshPagination()">
                      <option v-for="lim in state.limits" :key="lim" :value="lim">
                        {{ lim }}
                      </option>
                    </select>
                  </div>
                  <div class="centered mt-2" v-if="state.filtered">
                    <nav>
                      <ul class="pagination pagination-ul">
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="First"
                            @click="setPage(1)"
                            :disabled="state.page === 1 || state.totalPages === 0"
                          >
                            <span aria-hidden="true"><i class="bi bi-arrow-bar-left"></i></span>
                          </button>
                        </li>
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="Previous"
                            @click="setPage(state.page - 1)"
                            :disabled="state.page === 1 || state.totalPages === 0"
                          >
                            <span aria-hidden="true">&laquo;</span>
                          </button>
                        </li>
                        <li>
                          <select
                            class="btn btn-md btn-light fw-bold text-dark select mx-1 py-1"
                            v-model="state.page"
                            :disabled="state.totalPages === 0"
                          >
                            <option v-for="pag in state.totalPages" :key="pag" :value="pag">
                              {{ pag }}
                            </option>
                          </select>
                        </li>
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="Next"
                            @click="setPage(state.page + 1)"
                            :disabled="state.page === state.totalPages || state.totalPages === 0"
                          >
                            <span aria-hidden="true">&raquo;</span>
                          </button>
                        </li>
                        <li class="page-item">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                            aria-label="Last"
                            @click="setPage(state.totalPages)"
                            :disabled="state.page === state.totalPages || state.totalPages === 1"
                          >
                            <span aria-hidden="true"><i class="bi bi-arrow-bar-right"></i></span>
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
                <div>
                  <!-- SearchAdminItem removed - SearchBar now handles filtering -->
                  <div v-for="(business, idx) in paginatedItems" :key="business.id || idx" class="result-card" :data-business-index="idx">
                    <div class="row">
                      <div class="col-10">
                        <CommerceName
                          :name="business.name"
                          :tag="business.tag || business.name"
                          :active="business.active"
                          :key-name="business.keyName"
                        />
                      </div>
                      <div class="col-2">
                        <a href="#" @click.prevent="showUpdateForm(idx)">
                          <i
                            :id="idx"
                            :class="`bi ${state.extendedEntity === idx ? 'bi-chevron-up' : 'bi-chevron-down'}`"
                          ></i>
                        </a>
                      </div>
                    </div>
                    <div
                      v-if="toggles['businesses.admin.read']"
                      :class="{ show: state.extendedEntity === idx }"
                      class="detailed-data transition-slow"
                    >
                      <div class="row g-1">
                        <!-- Desktop form fields - same structure as mobile but with simplified fields -->
                        <div id="business-name-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.name') }}
                          </div>
                          <div class="col-8">
                            <input
                              disabled
                              minlength="1"
                              maxlength="50"
                              type="text"
                              class="form-control"
                              v-model="business.name"
                              placeholder="brilliant-shop-1"
                            />
                          </div>
                        </div>
                        <div id="business-keyName-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.keyName') }}
                          </div>
                          <div class="col-8">
                            <input
                              disabled
                              minlength="1"
                              maxlength="50"
                              type="text"
                              class="form-control"
                              v-model="business.keyName"
                              placeholder="brilliant-shop-1"
                            />
                          </div>
                        </div>
                        <div id="business-email-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.email') }}
                          </div>
                          <div class="col-8">
                            <input
                              disabled
                              minlength="10"
                              type="email"
                              class="form-control"
                              v-model="business.email"
                              placeholder="business@email.com"
                            />
                          </div>
                        </div>
                        <div id="business-logo-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.logo') }}
                          </div>
                          <div class="col-8">
                            <div class="d-flex flex-column gap-2">
                              <!-- Logo Preview -->
                              <div v-if="state.businessLogos && state.businessLogos[business.id]" class="logo-preview-small">
                                <img
                                  :key="`logo-desktop-${business.id}-${state.businessLogos[business.id]}`"
                                  :src="state.businessLogos[business.id]"
                                  :alt="$t('businessAdmin.logo')"
                                  class="logo-preview-img"
                                  @error="loadBusinessLogoPreview(business.id, business.logo)"
                                />
                              </div>
                              <div v-else-if="business.logo && business.logo.startsWith('/business-logos/')" class="logo-preview-small">
                                <div class="logo-loading-placeholder d-flex flex-column align-items-center justify-content-center p-3">
                                  <i class="bi bi-hourglass-split mb-2"></i>
                                  <span class="small text-muted">{{ $t('common.loading') || 'Cargando...' }}</span>
                                </div>
                              </div>
                              <div v-else-if="business.logo && !business.logo.startsWith('/business-logos/')" class="logo-preview-small">
                                <img
                                  :src="business.logo"
                                  :alt="$t('businessAdmin.logo')"
                                  class="logo-preview-img"
                                />
                              </div>
                              <!-- Upload Button -->
                              <div class="d-flex align-items-center gap-2">
                                <button
                                  type="button"
                                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                                  @click="openLogoUpload(business.id); loadBusinessLogoPreview(business.id)"
                                  :disabled="!toggles['businesses.admin.edit']"
                                >
                                  <i class="bi bi-image me-1"></i>
                                  {{ state.businessLogos[business.id] || business.logo ? $t('businessAdmin.logoUpload.replaceLogo') : $t('businessAdmin.logoUpload.selectLogo') }}
                                </button>
                                <span v-if="business.logo || state.businessLogos[business.id]" class="small text-muted">
                                  <i class="bi bi-check-circle text-success"></i>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div id="business-category-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.category') }}
                          </div>
                          <div class="col-8">
                            <select
                              class="btn btn-md btn-light fw-bold text-dark select"
                              v-model="business.category"
                              id="categories"
                            >
                              <option v-for="cat in state.categories" :key="cat" :value="cat">
                                {{ $t(`categories.${cat}`) }}
                              </option>
                            </select>
                          </div>
                        </div>
                        <div id="business-active-form" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessCommercesAdmin.active') }}
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="business.active"
                              :disabled="!toggles['businesses.admin.edit']"
                            />
                          </div>
                        </div>
                        <div id="business-id-form" class="row -2 mb-g3">
                          <div class="row business-details-container">
                            <div class="col">
                              <span><strong>Id:</strong> {{ business.id }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="toggles['businesses.admin.read'] && state.extendedEntity === idx"
                      class="row g-1 mt-2"
                    >
                      <div class="col">
                        <div class="d-flex gap-2 flex-wrap justify-content-center">
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="update(business)"
                            :disabled="!toggles['businesses.admin.update']"
                          >
                            {{ $t('businessAdmin.update') }} <i class="bi bi-save"></i>
                          </button>
                          <button
                            type="button"
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="selectBusiness(business)"
                          >
                            <i class="bi bi-eye-fill me-2"></i>
                            {{ $t('businessAdmin.viewAsBusiness') }}
                          </button>
                        </div>
                      </div>
                      <div
                        class="row g-1 errors"
                        id="feedback"
                        v-if="state.errorsUpdate.length > 0"
                      >
                        <Warning>
                          <template v-slot:message>
                            <li v-for="(error, eIdx) in state.errorsUpdate" :key="error + '.' + eIdx">
                              {{ $t(error) }}
                            </li>
                          </template>
                        </Warning>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!toggles['businesses.admin.view']) && !loading">
            <Message
              :title="$t('businessAdmin.message.1.title')"
              :content="$t('businessAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>


  <!-- Business Logo Upload Modal - Using Teleport for proper modal rendering -->
  <Teleport to="body">
    <BusinessLogoUpload
      v-if="state.logoUploadBusinessId"
      :show="state.showLogoUpload"
      :business-id="state.logoUploadBusinessId"
      @close="closeLogoUpload"
      @logo-uploaded="handleLogoUploaded"
    />
  </Teleport>
</template>

<style scoped>
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
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
.business-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
}
.business-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}
.is-disabled {
  opacity: 0.5;
}
.show {
  padding: 10px;
  max-height: 2000px !important;
  overflow-y: visible;
}
.errors {
  font-size: small;
  color: var(--rojo-warning);
}
.choose-attention {
  padding-bottom: 1rem;
  font-size: 1rem;
  font-weight: 700;
}
.business-title {
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 3rem;
  margin: 0.3rem;
  font-size: 1rem;
  line-height: 0.9rem;
}
.item-image {
  max-width: 100px;
  max-height: 60px;
}

/* Business View Modal Styles */
/* Modal styles are handled by modern-modal-* classes */

.business-view-section {
  padding: 0;
}

.business-info-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 0.75rem;
  margin: 0 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.business-view-logo {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.business-view-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--azul-turno);
  margin-bottom: 0.25rem;
}

.business-view-email {
  font-size: 0.875rem;
}

.commerce-selector-section {
  margin: 0;
}

.commerce-select-btn {
  padding: 0.875rem 1.25rem;
  border: 1.5px solid var(--gris-default);
  border-radius: 0.75rem;
  background: white;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.commerce-select-btn:hover {
  border-color: var(--azul-turno);
  background: rgba(0, 194, 203, 0.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.commerce-mini-logo {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.commerce-option {
  padding: 0.75rem 1rem;
  cursor: pointer;
}

.commerce-option:hover {
  background: rgba(0, 194, 203, 0.08);
}

.commerce-option.active {
  background: rgba(0, 194, 203, 0.12);
  border-left: 3px solid var(--azul-turno);
}

.commerce-single-display {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.08) 0%, rgba(0, 194, 203, 0.04) 100%);
  border-color: var(--azul-turno) !important;
  border-width: 1.5px !important;
}

/* Business View Modal - Additional Styles */
.business-info-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  margin: 0;
}

.commerce-selector-section {
  margin: 0;
}

/* Modern Modal Styles */
.modern-modal-container {
  border: none;
  border-radius: 0.75rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.modern-modal-header {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 0.75rem 0.75rem 0 0;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.modern-modal-body-content {
  padding: 1.5rem;
  background: #ffffff;
}

/* Logo Preview in Form */
.logo-preview-small {
  width: 100%;
  max-width: 200px;
  height: auto;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 0.5rem;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.logo-preview-img {
  max-width: 100%;
  max-height: 150px;
  height: auto;
  object-fit: contain;
  border-radius: 0.25rem;
}

.logo-loading-placeholder {
  min-height: 100px;
  color: #6c757d;
}

.logo-loading-placeholder i {
  font-size: 1.5rem;
}
</style>

