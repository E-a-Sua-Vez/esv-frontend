<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../../stores';
import {
  getFeatureToggleByCommerceId,
  getFeatureToggleOptions,
  addFeatureToggle,
} from '../../../application/services/feature-toggle';
import { getPermissions } from '../../../application/services/permissions';
import Message from '../../../components/common/Message.vue';
import CommerceLogo from '../../../components/common/CommerceLogo.vue';
import Spinner from '../../../components/common/Spinner.vue';
import Alert from '../../../components/common/Alert.vue';
import Warning from '../../../components/common/Warning.vue';
import SimpleConfigurationCard from '../../../components/configuration/common/SimpleConfigurationCard.vue';
import ComponentMenu from '../../../components/common/ComponentMenu.vue';
import { getConfigurationTypes } from '../../../shared/utils/data';

export default {
  name: 'ConfigurationFeaturesManagement',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    Warning,
    SimpleConfigurationCard,
    ComponentMenu,
  },
  props: {
    showConfigurations: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    business: { type: Object, default: undefined },
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
      commerces: ref([]),
      configurations: ref([]),
      groupedConfigurations: {},
      types: [],
      typeSelected: undefined,
      options: [],
      allOptions: [],
      optionSelected: undefined,
      commerce: {},
      showAdd: false,
      newConfiguration: {},
      extendedEntity: undefined,
      configurationError: false,
      errorsAdd: [],
      toggles: {},
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce =
          state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        if (state.commerce) {
          selectCommerce(state.commerce);
        }
        state.types = getConfigurationTypes();
        state.allOptions = await getFeatureToggleOptions();
        state.toggles = await getPermissions('configuration', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const goBack = () => {
      router.back();
    };

    const selectCommerce = async commerce => {
      try {
        loading.value = true;
        state.commerce = commerce;
        state.configurations = await getFeatureToggleByCommerceId(state.commerce.id);
        if (state.configurations && state.configurations.length > 0) {
          state.groupedConfigurations = state.configurations.reduce((acc, conf) => {
            const type = conf.type;
            if (!acc[type]) {
              acc[type] = [];
            }
            acc[type].push(conf);
            return acc;
          }, {});
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const showAdd = () => {
      state.showAdd = true;
      state.newConfiguration = {
        commerceId: state.commerce.id,
      };
      // Reset selections when opening modal
      state.typeSelected = undefined;
      state.optionSelected = undefined;
      state.options = [];
    };

    const validateAdd = () => {
      state.errorsAdd = [];
      if (state.optionSelected) {
        state.newConfiguration.type = state.optionSelected.type;
        state.newConfiguration.name = state.optionSelected.name;
        state.optionSelected = undefined;
      } else {
        state.errorsAdd.push('businessConfiguration.validate.feature');
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd()) {
          await addFeatureToggle(state.newConfiguration);
          const configurations = await getFeatureToggleByCommerceId(state.commerce.id);
          state.configurations = configurations;
          if (state.configurations && state.configurations.length > 0) {
            state.groupedConfigurations = state.configurations.reduce((acc, conf) => {
              const type = conf.type;
              if (!acc[type]) {
                acc[type] = [];
              }
              acc[type].push(conf);
              return acc;
            }, {});
          }
          state.showAdd = false;
          closeAddModal();
          state.newConfiguration = {};
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal-config');
      modalCloseButton.click();
    };

    const selectType = () => {
      if (state.typeSelected) {
        // Get names of already configured features for this commerce
        const existingFeatureNames = state.configurations.map(conf => conf.name);
        // Filter options by type and exclude already added features
        state.options = state.allOptions.filter(
          element =>
            element.type === state.typeSelected && !existingFeatureNames.includes(element.name)
        );
        // Reset selected option when type changes
        state.optionSelected = undefined;
      } else {
        state.options = [];
        state.optionSelected = undefined;
      }
    };

    return {
      state,
      loading,
      alertError,
      selectType,
      goBack,
      isActiveBusiness,
      selectCommerce,
      showAdd,
      add,
    };
  },
};
</script>

<template>
  <div
    id="configurations-management"
    class="row"
    v-if="showConfigurations === true && toggles['configuration.admin.features']"
  >
    <div class="col">
      <div id="attention-management-component">
        <Spinner :show="loading"></Spinner>
        <div v-if="!loading">
          <div id="businessConfiguration">
            <div v-if="isActiveBusiness && state.toggles['configuration.admin.view']">
              <div v-if="!loading" id="businessConfiguration-result" class="mt-4">
                <div>
                  <div v-if="state.configurations.length === 0">
                    <Message
                      :title="$t('businessConfiguration.message.2.title')"
                      :content="$t('businessConfiguration.message.2.content')"
                    />
                  </div>
                  <div v-if="state.commerce" class="row mb-2">
                    <div class="col lefted">
                      <button
                        class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                        @click="showAdd()"
                        data-bs-toggle="modal"
                        :data-bs-target="`#add-configuration`"
                        :disabled="!state.toggles['configuration.admin.add']"
                      >
                        <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                      </button>
                    </div>
                  </div>
                  <div class="mt-1">
                    <span class="badge bg-secondary px-2 py-2 m-1"
                      >{{ $t('businessAdmin.listResult') }} {{ state.configurations.length }}
                    </span>
                  </div>
                  <div
                    class="config-tree-container"
                    v-if="
                      state.configurations.length > 0 && state.toggles['configuration.admin.edit']
                    "
                  >
                    <div class="config-tree-section">
                      <a
                        class="config-tree-header"
                        data-bs-toggle="collapse"
                        href="#email"
                        aria-expanded="false"
                      >
                        <div class="config-tree-header-content">
                          <i class="bi bi-envelope-fill config-tree-icon"></i>
                          <span class="config-tree-title">{{
                            $t('configuration.types.email')
                          }}</span>
                          <span class="config-tree-badge"
                            >{{
                              state.groupedConfigurations['EMAIL']
                                ? state.groupedConfigurations['EMAIL'].length
                                : 0
                            }}
                          </span>
                        </div>
                        <i class="bi bi-chevron-down config-tree-chevron"></i>
                      </a>
                      <div id="email" class="collapse config-tree-content">
                        <div
                          v-if="
                            state.groupedConfigurations['EMAIL'] &&
                            state.groupedConfigurations['EMAIL'].length > 0
                          "
                          class="config-tree-items"
                        >
                          <div
                            v-for="(configuration, index) in state.groupedConfigurations['EMAIL']"
                            :key="index"
                          >
                            <SimpleConfigurationCard
                              :show="true"
                              :can-update="
                                state.toggles[`configuration.admin.${configuration.name}`]
                              "
                              :configuration="configuration"
                              :show-tooltip="true"
                            >
                            </SimpleConfigurationCard>
                          </div>
                        </div>
                        <div v-else class="config-tree-empty">
                          <Message
                            :title="$t('businessConfiguration.message.1.title')"
                            :content="$t('businessConfiguration.message.1.content')"
                          />
                        </div>
                      </div>
                    </div>
                    <div class="config-tree-section">
                      <a
                        class="config-tree-header"
                        data-bs-toggle="collapse"
                        href="#product"
                        aria-expanded="false"
                      >
                        <div class="config-tree-header-content">
                          <i class="bi bi-box-seam-fill config-tree-icon"></i>
                          <span class="config-tree-title">{{
                            $t('configuration.types.product')
                          }}</span>
                          <span class="config-tree-badge">{{
                            state.groupedConfigurations['PRODUCT']
                              ? state.groupedConfigurations['PRODUCT'].length
                              : 0
                          }}</span>
                        </div>
                        <i class="bi bi-chevron-down config-tree-chevron"></i>
                      </a>
                      <div id="product" class="collapse config-tree-content">
                        <div
                          v-if="
                            state.groupedConfigurations['PRODUCT'] &&
                            state.groupedConfigurations['PRODUCT'].length > 0
                          "
                          class="config-tree-items"
                        >
                          <div
                            v-for="(configuration, index) in state.groupedConfigurations['PRODUCT']"
                            :key="index"
                          >
                            <SimpleConfigurationCard
                              :show="true"
                              :can-update="
                                state.toggles[`configuration.admin.${configuration.name}`]
                              "
                              :configuration="configuration"
                              :show-tooltip="true"
                            >
                            </SimpleConfigurationCard>
                          </div>
                        </div>
                        <div v-else class="config-tree-empty">
                          <Message
                            :title="$t('businessConfiguration.message.1.title')"
                            :content="$t('businessConfiguration.message.1.content')"
                          />
                        </div>
                      </div>
                    </div>
                    <div class="config-tree-section">
                      <a
                        class="config-tree-header"
                        data-bs-toggle="collapse"
                        href="#user"
                        aria-expanded="false"
                      >
                        <div class="config-tree-header-content">
                          <i class="bi bi-person-fill config-tree-icon"></i>
                          <span class="config-tree-title">{{
                            $t('configuration.types.user')
                          }}</span>
                          <span class="config-tree-badge"
                            >{{
                              state.groupedConfigurations['USER']
                                ? state.groupedConfigurations['USER'].length
                                : 0
                            }}
                          </span>
                        </div>
                        <i class="bi bi-chevron-down config-tree-chevron"></i>
                      </a>
                      <div id="user" class="collapse config-tree-content">
                        <div
                          v-if="
                            state.groupedConfigurations['USER'] &&
                            state.groupedConfigurations['USER'].length > 0
                          "
                          class="config-tree-items"
                        >
                          <div
                            v-for="(configuration, index) in state.groupedConfigurations['USER']"
                            :key="index"
                          >
                            <SimpleConfigurationCard
                              :show="true"
                              :can-update="
                                state.toggles[`configuration.admin.${configuration.name}`]
                              "
                              :configuration="configuration"
                              :show-tooltip="true"
                            >
                            </SimpleConfigurationCard>
                          </div>
                        </div>
                        <div v-else class="config-tree-empty">
                          <Message
                            :title="$t('businessConfiguration.message.1.title')"
                            :content="$t('businessConfiguration.message.1.content')"
                          />
                        </div>
                      </div>
                    </div>
                    <div class="config-tree-section">
                      <a
                        class="config-tree-header"
                        data-bs-toggle="collapse"
                        href="#whatsapp"
                        aria-expanded="false"
                      >
                        <div class="config-tree-header-content">
                          <i class="bi bi-whatsapp config-tree-icon"></i>
                          <span class="config-tree-title">{{
                            $t('configuration.types.whatsapp')
                          }}</span>
                          <span class="config-tree-badge"
                            >{{
                              state.groupedConfigurations['WHATSAPP']
                                ? state.groupedConfigurations['WHATSAPP'].length
                                : 0
                            }}
                          </span>
                        </div>
                        <i class="bi bi-chevron-down config-tree-chevron"></i>
                      </a>
                      <div id="whatsapp" class="collapse config-tree-content">
                        <div
                          v-if="
                            state.groupedConfigurations['WHATSAPP'] &&
                            state.groupedConfigurations['WHATSAPP'].length > 0
                          "
                          class="config-tree-items"
                        >
                          <div
                            v-for="(configuration, index) in state.groupedConfigurations[
                              'WHATSAPP'
                            ]"
                            :key="index"
                          >
                            <SimpleConfigurationCard
                              :show="true"
                              :can-update="
                                state.toggles[`configuration.admin.${configuration.name}`]
                              "
                              :configuration="configuration"
                              :show-tooltip="true"
                            >
                            </SimpleConfigurationCard>
                          </div>
                        </div>
                        <div v-else class="config-tree-empty">
                          <Message
                            :title="$t('businessConfiguration.message.1.title')"
                            :content="$t('businessConfiguration.message.1.content')"
                          />
                        </div>
                      </div>
                    </div>
                    <div class="config-tree-section">
                      <a
                        class="config-tree-header"
                        data-bs-toggle="collapse"
                        href="#message"
                        aria-expanded="false"
                      >
                        <div class="config-tree-header-content">
                          <i class="bi bi-chat-dots-fill config-tree-icon"></i>
                          <span class="config-tree-title">{{
                            $t('configuration.types.message')
                          }}</span>
                          <span class="config-tree-badge"
                            >{{
                              state.groupedConfigurations['MESSAGE']
                                ? state.groupedConfigurations['MESSAGE'].length
                                : 0
                            }}
                          </span>
                        </div>
                        <i class="bi bi-chevron-down config-tree-chevron"></i>
                      </a>
                      <div id="message" class="collapse config-tree-content">
                        <div
                          v-if="
                            state.groupedConfigurations['MESSAGE'] &&
                            state.groupedConfigurations['MESSAGE'].length > 0
                          "
                          class="config-tree-items"
                        >
                          <div
                            v-for="(configuration, index) in state.groupedConfigurations['MESSAGE']"
                            :key="index"
                          >
                            <SimpleConfigurationCard
                              :show="true"
                              :can-update="
                                state.toggles[`configuration.admin.${configuration.name}`]
                              "
                              :configuration="configuration"
                              :show-tooltip="true"
                            >
                            </SimpleConfigurationCard>
                          </div>
                        </div>
                        <div v-else class="config-tree-empty">
                          <Message
                            :title="$t('businessConfiguration.message.1.title')"
                            :content="$t('businessConfiguration.message.1.content')"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              v-if="(!isActiveBusiness() || !state.toggles['configuration.admin.view']) && !loading"
            >
              <Message
                :title="$t('businessConfiguration.message.1.title')"
                :content="$t('businessConfiguration.message.1.content')"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showConfigurations === true && !toggles['configuration.admin.features']">
      <Message
        :icon="'bi-graph-up-arrow'"
        :title="$t('dashboard.message.1.title')"
        :content="$t('dashboard.message.1.content')"
      />
    </div>
    <!-- Modal Add -->
    <div
      class="modal fade"
      :id="`add-configuration`"
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
              id="close-modal-config"
              class="btn-close"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="loading" :stack="alertError"></Alert>
            <div
              id="add-configuration"
              class="configuration-card mb-4"
              v-if="state.showAdd && state.toggles['configuration.admin.add']"
            >
              <div class="row g-1">
                <div id="configuration-feature-form-add" class="row g-1">
                  <div class="col text-label">
                    {{ $t('businessConfiguration.types') }}
                  </div>
                  <div class="col">
                    <select
                      class="btn btn-md btn-light fw-bold text-dark select mx-2"
                      v-model="state.typeSelected"
                      @change="selectType()"
                      id="types"
                    >
                      <option v-for="typ in state.types" :key="typ.id" :value="typ.id">
                        {{ $t(`configuration.types.${typ.name}`) }}
                      </option>
                    </select>
                  </div>
                </div>
                <div id="configuration-feature-form-add" class="row g-1">
                  <div class="col text-label">
                    {{ $t('businessConfiguration.feature') }}
                  </div>
                  <div class="col">
                    <select
                      class="btn btn-md btn-light fw-bold text-dark select mx-2"
                      v-model="state.optionSelected"
                      id="features"
                      v-bind:class="{ 'is-invalid': state.moduleError }"
                    >
                      <option v-for="opt in state.options" :key="opt.name" :value="opt">
                        {{ $t(`configuration.${opt.name}.title`) }}
                      </option>
                    </select>
                  </div>
                </div>
                <div class="col">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                    @click="add(state.newConfiguration)"
                  >
                    {{ $t('businessConfiguration.add') }} <i class="bi bi-save"></i>
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
  text-overflow: ellipsis;
}
.module-details-container {
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
  max-height: 1500px !important;
  overflow-y: auto;
}
.configuration-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
}

/* Modern Tree Structure */
.config-tree-container {
  margin-top: 1rem;
}

.config-tree-section {
  margin-bottom: 0.5rem;
}

.config-tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.9rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  color: inherit;
}

.config-tree-header:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%);
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateX(2px);
}

.config-tree-header[aria-expanded='true'] {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%);
  border-color: rgba(59, 130, 246, 0.4);
}

.config-tree-header[aria-expanded='true'] .config-tree-chevron {
  transform: rotate(180deg);
}

.config-tree-header-content {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
}

.config-tree-icon {
  font-size: 1rem;
  color: rgba(59, 130, 246, 0.8);
  flex-shrink: 0;
}

.config-tree-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.config-tree-badge {
  background: rgba(59, 130, 246, 0.2);
  color: rgba(37, 99, 235, 0.9);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 0.375rem;
  min-width: 1.5rem;
  text-align: center;
}

.config-tree-chevron {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.5);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.config-tree-content {
  margin-top: 0.5rem;
  margin-left: 1.2rem;
  padding-left: 1rem;
  border-left: 2px solid rgba(59, 130, 246, 0.15);
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.config-tree-items {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.config-tree-empty {
  padding: 0.5rem 0;
}
</style>
