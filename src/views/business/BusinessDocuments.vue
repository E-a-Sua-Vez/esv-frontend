<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DocumentsManagement from '../../components/document/domain/DocumentsManagement.vue';
import DesktopContentLayout from '../../components/common/desktop/DesktopContentLayout.vue';
import DesktopFiltersPanel from '../../components/common/desktop/DesktopFiltersPanel.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import DateRangeFilters from '../../components/common/desktop/DateRangeFilters.vue';

export default {
  name: 'BusinessDocuments',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ToggleCapabilities,
    ComponentMenu,
    DocumentsManagement,
    DesktopContentLayout,
    DesktopFiltersPanel,
    DesktopPageHeader,
    DateRangeFilters,
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
      queues: ref({}),
      services: ref({}),
      queue: {},
      dateType: 'month',
      toggles: {},
      allCommerces: ref([]),
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Compute selectedCommerces - use all commerces for DocumentsManagement
    const selectedCommerces = computed(() => {
      if (state.allCommerces && state.allCommerces.length > 0) {
        return state.allCommerces;
      }
      return [];
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.allCommerces = await store.getAvailableCommerces(state.business.commerces);
        state.toggles = await getPermissions('document-commerce', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          if (state.allCommerces && state.allCommerces.length > 0) {
            await store.setCurrentCommerce(state.allCommerces[0]);
          }
        }

        await refresh();
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    // Watch for commerce changes and refresh
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            // Immediately clear data - DocumentsManagement will handle the refresh internally
            // The component will react to commerce prop changes
            await refresh();
            loading.value = false;
          } catch (error) {
            loading.value = false;
          }
        }
      },
      { immediate: false }
    );

    const isActiveBusiness = () => state.business && state.business.active === true;

    const getLocalHour = hour => {
      const date = new Date();
      const hourDate = new Date(date.setHours(hour));
      if (commerce.value && commerce.value.country) {
        if (commerce.value.country === 've') {
          return hourDate.getHours() - 4;
        } else if (['br', 'cl'].includes(commerce.value.country)) {
          return hourDate.getHours() - 3;
        } else {
          return hourDate.getHours();
        }
      }
    };

    const goBack = () => {
      router.back();
    };

    const handleFiltersToggle = collapsed => {
      state.filtersCollapsed = collapsed;
    };

    const handleCommerceChanged = async commerce => {
      // Commerce is now managed globally
      if (commerce && commerce.id && commerce.id !== 'ALL') {
        await store.setCurrentCommerce(commerce);
      }
    };

    const refresh = async () => {
      // Refresh is handled by DocumentsManagement component internally
      // This is kept for compatibility but may not be needed
    };

    return {
      state,
      loading,
      alertError,
      goBack,
      isActiveBusiness,
      commerce,
      selectedCommerces,
      getLocalHour,
      handleFiltersToggle,
      handleCommerceChanged,
      refresh,
    };
  },
};
</script>

<template>
  <div>
    <!-- Render DocumentsManagement component once outside responsive sections for the modal -->
    <!-- This ensures single modal ID - buttons in both mobile and desktop will target this modal -->
    <!-- Bootstrap modals are appended to body when opened, so this hidden instance will work -->
    <!-- Always render this instance first to ensure modal is always accessible -->
    <div
      style="
        position: absolute;
        left: -9999px;
        width: 1px;
        height: 1px;
        overflow: hidden;
        visibility: hidden;
        pointer-events: none;
      "
    >
      <DocumentsManagement
        :show-client-management="true"
        :toggles="state.toggles"
        :commerce="commerce"
        :commerces="selectedCommerces"
      >
      </DocumentsManagement>
    </div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo
          :src="commerce?.logo || state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessDocument.title`)"
          :toggles="state.toggles"
          component-name="businessDocument"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessDocument">
          <div v-if="isActiveBusiness()">
            <div v-if="!commerce" class="control-box">
              <Message
                :title="$t('dashboard.message.3.title')"
                :content="$t('dashboard.message.3.content')"
              />
            </div>
            <div v-else class="control-box">
              <div id="dashboard-controls">
                <div class="row"></div>
              </div>
            </div>
            <div v-if="!loading" id="dashboard-result" class="mt-2">
              <div>
                <DocumentsManagement
                  :show-client-management="true"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :commerces="selectedCommerces"
                >
                </DocumentsManagement>
              </div>
            </div>
          </div>
          <div v-if="!isActiveBusiness() && !loading">
            <Message
              :title="$t('dashboard.message.1.title')"
              :content="$t('dashboard.message.1.content')"
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
          :logo="commerce?.logo || state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('businessDocument.title')"
          :toggles="state.toggles"
          component-name="businessDocument"
          @go-back="goBack"
        />
        <div id="businessDocument" v-if="isActiveBusiness()">
          <div v-if="!commerce" class="control-box">
            <Message
              :title="$t('dashboard.message.3.title')"
              :content="$t('dashboard.message.3.content')"
            />
          </div>
          <DesktopContentLayout
            v-else
            :show-filters="true"
            :filters-sticky="true"
            @filters-toggle="handleFiltersToggle"
          >
            <template #filters="{ onToggle, collapsed }">
              <DesktopFiltersPanel
                :model-value="{ commerce: commerce }"
                :loading="loading"
                :commerces="[]"
                :show-commerce-selector="false"
                :show-date-filters="false"
                :show-quick-date-buttons="false"
                :show-refresh-button="false"
                :sticky="true"
                :show-all-option="true"
                :commerce-selector-id="'documents-commerce-selector'"
                :on-toggle="onToggle"
                :collapsed="collapsed"
                @commerce-changed="handleCommerceChanged"
              >
                <template #custom-filters>
                  <!-- Filters from DocumentsManagement component -->
                  <DocumentsManagement
                    v-if="state.toggles && state.toggles['document-commerce.admin.view']"
                    :show-client-management="false"
                    :toggles="state.toggles"
                    :commerce="state.commerce"
                    :commerces="Array.isArray(selectedCommerces) ? selectedCommerces : []"
                    filters-location="slot"
                  >
                    <template #filters-exposed="filterProps">
                      <div class="filters-content-wrapper">
                        <!-- Date quick buttons -->
                        <div class="row my-2">
                          <div class="col-6 mb-2">
                            <button
                              class="btn btn-sm btn-dark rounded-pill w-100"
                              @click="filterProps.getToday()"
                              :disabled="filterProps.loading"
                            >
                              {{ $t('dashboard.today') }}
                            </button>
                          </div>
                          <div class="col-6 mb-2">
                            <button
                              class="btn btn-sm btn-dark rounded-pill w-100"
                              @click="filterProps.getCurrentMonth()"
                              :disabled="filterProps.loading"
                            >
                              {{ $t('dashboard.thisMonth') }}
                            </button>
                          </div>
                          <div class="col-6 mb-2">
                            <button
                              class="btn btn-sm btn-dark rounded-pill w-100"
                              @click="filterProps.getLastMonth()"
                              :disabled="filterProps.loading"
                            >
                              {{ $t('dashboard.lastMonth') }}
                            </button>
                          </div>
                          <div class="col-6 mb-2">
                            <button
                              class="btn btn-sm btn-dark rounded-pill w-100"
                              @click="filterProps.getLastThreeMonths()"
                              :disabled="filterProps.loading"
                            >
                              {{ $t('dashboard.lastThreeMonths') }}
                            </button>
                          </div>
                        </div>

                        <!-- DateRangeFilters with search button -->
                        <DateRangeFilters
                          :start-date="filterProps.startDate"
                          :end-date="filterProps.endDate"
                          :show-quick-buttons="false"
                          :disabled="filterProps.loading"
                          :show-search-button="true"
                          @update:startDate="
                            val => {
                              filterProps.startDate = val;
                            }
                          "
                          @update:endDate="
                            val => {
                              filterProps.endDate = val;
                            }
                          "
                          @search="() => filterProps.refresh(1)"
                        />

                        <!-- Search field -->
                        <div class="mb-3">
                          <label class="form-label fw-bold mb-2">{{
                            $t('dashboard.search') || 'Buscar'
                          }}</label>
                          <div class="d-flex gap-2">
                            <input
                              type="text"
                              class="form-control flex-grow-1"
                              :value="filterProps.searchText"
                              @input="
                                e => {
                                  filterProps.searchText = e.target.value;
                                }
                              "
                              :placeholder="$t('dashboard.search')"
                            />
                            <button
                              class="btn btn-sm btn-dark rounded-pill"
                              @click="filterProps.refresh(1)"
                              :disabled="filterProps.loading"
                              style="flex-shrink: 0"
                            >
                              <i class="bi bi-search"></i>
                            </button>
                          </div>
                        </div>

                        <!-- Type selector -->
                        <div class="mb-3" v-if="filterProps.types && filterProps.types.length > 1">
                          <label class="form-label fw-bold mb-2">{{ $t('dashboard.type') }}</label>
                          <select
                            class="form-select metric-controls"
                            :value="filterProps.type"
                            @change="
                              e => {
                                filterProps.type = e.target.value;
                                filterProps.refresh(1);
                              }
                            "
                          >
                            <option value="">{{ $t('dashboard.all') || 'Todos' }}</option>
                            <option v-for="typ in filterProps.types" :key="typ.id" :value="typ.id">
                              {{ $t(`documents.types.${typ.name}`) }}
                            </option>
                          </select>
                        </div>

                        <!-- Ascending/Descending toggle -->
                        <div class="mb-3">
                          <div class="form-check form-switch">
                            <input
                              class="form-check-input"
                              :class="filterProps.asc === false ? 'bg-danger' : ''"
                              type="checkbox"
                              :checked="filterProps.asc"
                              @change="filterProps.checkAsc($event)"
                              id="documents-asc-toggle"
                            />
                            <label class="form-check-label" for="documents-asc-toggle">
                              {{ $t('dashboard.ascending') || 'Ascendente' }}
                            </label>
                          </div>
                        </div>

                        <!-- Clear button -->
                        <div class="mb-3">
                          <button
                            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
                            @click="filterProps.clear()"
                          >
                            <i class="bi bi-eraser-fill"></i>
                            {{ $t('dashboard.clear') || 'Limpiar' }}
                          </button>
                        </div>
                      </div>
                    </template>
                  </DocumentsManagement>
                </template>
              </DesktopFiltersPanel>
            </template>

            <template #content>
              <DocumentsManagement
                :show-client-management="true"
                :toggles="state.toggles"
                :commerce="state.commerce"
                :commerces="Array.isArray(selectedCommerces) ? selectedCommerces : []"
                filters-location="slot"
              >
              </DocumentsManagement>
            </template>
          </DesktopContentLayout>
        </div>
        <div v-if="!isActiveBusiness() && !loading">
          <Message
            :title="$t('dashboard.message.1.title')"
            :content="$t('dashboard.message.1.content')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-title {
  text-align: left;
  font-size: 1.1rem;
  font-weight: 700;
}
.metric-subtitle {
  text-align: left;
  font-size: 0.9rem;
  font-weight: 500;
}
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.metric-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}
.metric-card-title {
  font-size: 0.8rem;
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.green-icon {
  color: var(--verde-tu);
}
.red-icon {
  color: var(--rojo-warning);
}
.yellow-icon {
  color: var(--amarillo-star);
}
.metric-card-subtitle {
  font-size: 0.6rem;
  font-weight: 500;
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
