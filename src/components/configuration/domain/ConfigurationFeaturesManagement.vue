<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../../stores';
import {
  getFeatureToggleByCommerceId,
  getFeatureToggleOptions,
  updateFeatureToggle,
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
      allOptions: [],
      commerce: {},
      toggles: {},
      openGroups: {},
    });

    const STORAGE_KEY = 'configurationFeaturesOpenGroups';

    const loadOpenGroups = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          state.openGroups = { ...state.openGroups, ...parsed };
        }
      } catch (error) {}
    };

    const persistOpenGroups = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.openGroups));
      } catch (error) {}
    };

    const ensureTypesInOpenGroups = () => {
      const types = ['EMAIL', 'PRODUCT', 'USER', 'WHATSAPP', 'MESSAGE'];
      types.forEach(type => {
        if (!(type in state.openGroups)) {
          state.openGroups[type] = false;
        }
      });
    };

    onBeforeMount(async () => {
      try {
        loading.value = true;
        loadOpenGroups();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        // Seleccionar el primer comercio disponible solo si existe
        state.commerce =
          state.commerces && state.commerces.length > 0 ? state.commerces[0] : undefined;
        state.allOptions = await getFeatureToggleOptions();
        if (state.commerce) {
          await selectCommerce(state.commerce);
        }
        state.toggles = await getPermissions('configuration', 'admin');
        ensureTypesInOpenGroups();
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

    const buildGroupedConfigurations = () => {
      if (!state.allOptions || state.allOptions.length === 0) {
        state.groupedConfigurations = {};
        return;
      }

      const configurationsByName = new Map(
        (state.configurations || []).map(conf => [conf.name, conf])
      );

      const grouped = {};

      state.allOptions.forEach(option => {
        const existing = configurationsByName.get(option.name);
        const merged = existing
          ? { ...existing }
          : {
              id: undefined,
              name: option.name,
              type: option.type,
              commerceId: state.commerce?.id,
              active: false,
            };

        const type = option.type;
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(merged);
      });

      state.groupedConfigurations = grouped;
    };

    const selectCommerce = async commerce => {
      try {
        loading.value = true;
        state.commerce = commerce;
        state.configurations = await getFeatureToggleByCommerceId(state.commerce.id);
        buildGroupedConfigurations();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const refreshConfigurations = async () => {
      if (!state.commerce) return;
      await selectCommerce(state.commerce);
    };

    const getTypeStats = type => {
      const list = state.groupedConfigurations[type] || [];
      const total = list.length;
      const active = list.filter(conf => conf.active).length;
      const inactive = total - active;
      return { total, active, inactive };
    };

    const isGroupOpen = type => !!state.openGroups[type];

    const toggleGroupOpen = type => {
      state.openGroups[type] = !state.openGroups[type];
      persistOpenGroups();
    };

    const isGroupFullyActive = type => {
      const list = state.groupedConfigurations[type] || [];
      if (list.length === 0) return false;
      return list.every(conf => conf.active);
    };

    const setGroupActive = async (type, active) => {
      const list = state.groupedConfigurations[type] || [];
      if (list.length === 0) return;

      try {
        loading.value = true;
        for (const configuration of list) {
          if (configuration.id) {
            await updateFeatureToggle(configuration.id, { active });
          } else if (active && state.commerce?.id) {
            const payload = {
              name: configuration.name,
              type: configuration.type,
              commerceId: state.commerce.id,
            };
            await addFeatureToggle(payload);
          }
        }
      } catch (error) {
        alertError.value = error.response?.status || 500;
      } finally {
        await refreshConfigurations();
        loading.value = false;
      }
    };

    const toggleGroupActive = async type => {
      const nextState = !isGroupFullyActive(type);
      await setGroupActive(type, nextState);
    };

    return {
      state,
      loading,
      alertError,
      goBack,
      isActiveBusiness,
      selectCommerce,
      refreshConfigurations,
      getTypeStats,
      isGroupOpen,
      toggleGroupOpen,
      isGroupFullyActive,
      toggleGroupActive,
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
                  <div v-if="state.allOptions.length > 0" class="mt-1 text-center d-md-block">
                    <span class="badge bg-secondary px-2 py-2 m-1"
                      >{{ $t('businessAdmin.listResult') }} {{ state.allOptions.length }}
                    </span>
                  </div>
                  <div
                    class="config-tree-container"
                    v-if="state.toggles['configuration.admin.edit']"
                  >
                    <div class="config-tree-section">
                      <a
                        class="config-tree-header"
                        :aria-expanded="isGroupOpen('EMAIL') ? 'true' : 'false'"
                        @click.prevent="toggleGroupOpen('EMAIL')"
                      >
                        <div class="config-tree-header-content">
                          <i class="bi bi-envelope-fill config-tree-icon"></i>
                          <span class="config-tree-title">{{
                            $t('configuration.types.email')
                          }}</span>
                          <span class="config-tree-badge">
                            {{ getTypeStats('EMAIL').total }}
                            ({{ getTypeStats('EMAIL').active }}/{{
                              getTypeStats('EMAIL').inactive
                            }})
                          </span>
                        </div>
                        <div class="config-tree-right-controls">
                          <i class="bi bi-chevron-down config-tree-chevron"></i>
                          <input
                            type="checkbox"
                            class="toggle-checkbox group-toggle-checkbox"
                            :checked="isGroupFullyActive('EMAIL')"
                            @click.stop="toggleGroupActive('EMAIL')"
                            :title="
                              isGroupFullyActive('EMAIL') ? 'Desactivar todas' : 'Activar todas'
                            "
                          />
                        </div>
                      </a>
                      <div
                        id="email"
                        class="collapse config-tree-content"
                        :class="{ show: isGroupOpen('EMAIL') }"
                      >
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
                              :commerce-id="state.commerce?.id"
                              @updated="refreshConfigurations"
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
                        :aria-expanded="isGroupOpen('PRODUCT') ? 'true' : 'false'"
                        @click.prevent="toggleGroupOpen('PRODUCT')"
                      >
                        <div class="config-tree-header-content">
                          <i class="bi bi-box-seam-fill config-tree-icon"></i>
                          <span class="config-tree-title">{{
                            $t('configuration.types.product')
                          }}</span>
                          <span class="config-tree-badge">
                            {{ getTypeStats('PRODUCT').total }}
                            ({{ getTypeStats('PRODUCT').active }}/{{
                              getTypeStats('PRODUCT').inactive
                            }})
                          </span>
                        </div>
                        <div class="config-tree-right-controls">
                          <i class="bi bi-chevron-down config-tree-chevron"></i>
                          <input
                            type="checkbox"
                            class="toggle-checkbox group-toggle-checkbox"
                            :checked="isGroupFullyActive('PRODUCT')"
                            @click.stop="toggleGroupActive('PRODUCT')"
                            :title="
                              isGroupFullyActive('PRODUCT') ? 'Desactivar todas' : 'Activar todas'
                            "
                          />
                        </div>
                      </a>
                      <div
                        id="product"
                        class="collapse config-tree-content"
                        :class="{ show: isGroupOpen('PRODUCT') }"
                      >
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
                              :commerce-id="state.commerce?.id"
                              @updated="refreshConfigurations"
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
                        :aria-expanded="isGroupOpen('USER') ? 'true' : 'false'"
                        @click.prevent="toggleGroupOpen('USER')"
                      >
                        <div class="config-tree-header-content">
                          <i class="bi bi-person-fill config-tree-icon"></i>
                          <span class="config-tree-title">{{
                            $t('configuration.types.user')
                          }}</span>
                          <span class="config-tree-badge">
                            {{ getTypeStats('USER').total }}
                            ({{ getTypeStats('USER').active }}/{{ getTypeStats('USER').inactive }})
                          </span>
                        </div>
                        <div class="config-tree-right-controls">
                          <i class="bi bi-chevron-down config-tree-chevron"></i>
                          <input
                            type="checkbox"
                            class="toggle-checkbox group-toggle-checkbox"
                            :checked="isGroupFullyActive('USER')"
                            @click.stop="toggleGroupActive('USER')"
                            :title="
                              isGroupFullyActive('USER') ? 'Desactivar todas' : 'Activar todas'
                            "
                          />
                        </div>
                      </a>
                      <div
                        id="user"
                        class="collapse config-tree-content"
                        :class="{ show: isGroupOpen('USER') }"
                      >
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
                              :commerce-id="state.commerce?.id"
                              @updated="refreshConfigurations"
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
                        :aria-expanded="isGroupOpen('WHATSAPP') ? 'true' : 'false'"
                        @click.prevent="toggleGroupOpen('WHATSAPP')"
                      >
                        <div class="config-tree-header-content">
                          <i class="bi bi-whatsapp config-tree-icon"></i>
                          <span class="config-tree-title">{{
                            $t('configuration.types.whatsapp')
                          }}</span>
                          <span class="config-tree-badge">
                            {{ getTypeStats('WHATSAPP').total }}
                            ({{ getTypeStats('WHATSAPP').active }}/{{
                              getTypeStats('WHATSAPP').inactive
                            }})
                          </span>
                        </div>
                        <div class="config-tree-right-controls">
                          <i class="bi bi-chevron-down config-tree-chevron"></i>
                          <input
                            type="checkbox"
                            class="toggle-checkbox group-toggle-checkbox"
                            :checked="isGroupFullyActive('WHATSAPP')"
                            @click.stop="toggleGroupActive('WHATSAPP')"
                            :title="
                              isGroupFullyActive('WHATSAPP') ? 'Desactivar todas' : 'Activar todas'
                            "
                          />
                        </div>
                      </a>
                      <div
                        id="whatsapp"
                        class="collapse config-tree-content"
                        :class="{ show: isGroupOpen('WHATSAPP') }"
                      >
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
                              :commerce-id="state.commerce?.id"
                              @updated="refreshConfigurations"
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
                        :aria-expanded="isGroupOpen('MESSAGE') ? 'true' : 'false'"
                        @click.prevent="toggleGroupOpen('MESSAGE')"
                      >
                        <div class="config-tree-header-content">
                          <i class="bi bi-chat-dots-fill config-tree-icon"></i>
                          <span class="config-tree-title">{{
                            $t('configuration.types.message')
                          }}</span>
                          <span class="config-tree-badge">
                            {{ getTypeStats('MESSAGE').total }}
                            ({{ getTypeStats('MESSAGE').active }}/{{
                              getTypeStats('MESSAGE').inactive
                            }})
                          </span>
                        </div>
                        <div class="config-tree-right-controls">
                          <i class="bi bi-chevron-down config-tree-chevron"></i>
                          <input
                            type="checkbox"
                            class="toggle-checkbox group-toggle-checkbox"
                            :checked="isGroupFullyActive('MESSAGE')"
                            @click.stop="toggleGroupActive('MESSAGE')"
                            :title="
                              isGroupFullyActive('MESSAGE') ? 'Desactivar todas' : 'Activar todas'
                            "
                          />
                        </div>
                      </a>
                      <div
                        id="message"
                        class="collapse config-tree-content"
                        :class="{ show: isGroupOpen('MESSAGE') }"
                      >
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
                              :commerce-id="state.commerce?.id"
                              @updated="refreshConfigurations"
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
        :icon="'graph-up-arrow'"
        :title="$t('dashboard.message.1.title')"
        :content="$t('dashboard.message.1.content')"
      />
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

.config-tree-right-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.group-toggle-checkbox {
  width: 40px;
  height: 20px;
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
