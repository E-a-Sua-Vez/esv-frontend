<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../../stores';
import { getFeatureToggleByCommerceId, getFeatureToggleOptions, addFeatureToggle } from '../../../application/services/feature-toggle';
import { getPermissions } from '../../../application/services/permissions';
import Message from '../../../components/common/Message.vue';
import PoweredBy from '../../../components/common/PoweredBy.vue';
import CommerceLogo from '../../../components/common/CommerceLogo.vue';
import Spinner from '../../../components/common/Spinner.vue';
import Alert from '../../../components/common/Alert.vue';
import Warning from '../../../components/common/Warning.vue';
import SimpleConfigurationCard from '../../../components/configuration/common/SimpleConfigurationCard.vue';
import ComponentMenu from '../../../components/common/ComponentMenu.vue';
import { getConfigurationTypes } from '../../../shared/utils/data';

export default {
  name: 'ConfigurationFeaturesManagement',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, Warning, SimpleConfigurationCard, ComponentMenu },
  props: {
    showConfigurations: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    business: { type: Object, default: undefined },
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      commerces: ref([]),
      configurations: ref([]),
      groupedConfigurations : {},
      types: [],
      typeSelected: undefined,
      options: {},
      allOptions: [],
      optionSelected: undefined,
      commerce: {},
      showAdd: false,
      newConfiguration: {},
      extendedEntity: undefined,
      configurationError: false,
      errorsAdd: [],
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
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
    })

    const isActiveBusiness = () => {
      return state.business && state.business.active === true
    };

    const goBack = () => {
      router.back();
    }

    const selectCommerce = async (commerce) => {
      try {
        loading.value = true;
        state.commerce = commerce;
        state.configurations = await getFeatureToggleByCommerceId(state.commerce.id);
        if (state.configurations && state.configurations.length > 0) {
          state.groupedConfigurations  = state.configurations.reduce((acc, conf) => {
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
    }

    const showAdd = () => {
      state.showAdd = true;
      state.newConfiguration = {
        commerceId: state.commerce.id,
      }
    }

    const validateAdd = () => {
      state.errorsAdd = [];
      if(state.optionSelected) {
        state.newConfiguration.type = state.optionSelected.type;
        state.newConfiguration.name = state.optionSelected.name;
        state.optionSelected = undefined;
      } else {
        state.errorsAdd.push('businessConfiguration.validate.feature');
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

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
    }

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal-config');
      modalCloseButton.click();
    }

    const selectType = () => {
      if (state.typeSelected) {
        state.options = state.allOptions.filter((element) => element.type === state.typeSelected);
      }
    }

    return {
      state,
      loading,
      alertError,
      selectType,
      goBack,
      isActiveBusiness,
      selectCommerce,
      showAdd,
      add
    }
  }
}
</script>

<template>
  <div id="configurations-management" class="row" v-if="showConfigurations === true && toggles['configuration.admin.features']">
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
                      :content="$t('businessConfiguration.message.2.content')" />
                  </div>
                  <div v-if="state.commerce" class="row mb-2">
                    <div class="col lefted">
                      <button
                        class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                        @click="showAdd()"
                        data-bs-toggle="modal"
                        :data-bs-target="`#add-configuration`"
                        :disabled="!state.toggles['configuration.admin.add']">
                        <i class="bi bi-plus-lg"></i> {{ $t("add") }}
                      </button>
                    </div>
                  </div>
                  <div class="mt-1">
                    <span class="badge bg-secondary px-2 py-2 m-1">{{ $t("businessAdmin.listResult") }} {{ state.configurations.length }} </span>
                  </div>
                  <div class="mb-4" v-if="state.configurations.length > 0 && state.toggles['configuration.admin.edit']">
                    <div class="my-2">
                      <a class="nav-link configuration-title centered active"
                        data-bs-toggle="collapse"
                        href="#email">
                        {{ $t("configuration.types.email") }}
                        <span class="badge bg-secondary px-2 py-1 mx-1">{{ state.groupedConfigurations['EMAIL'] ? state.groupedConfigurations['EMAIL'].length : 0 }} </span>
                        <i class="bi bi-chevron-down mx-2"></i>
                      </a>
                      <div id="email" class="collapse">
                        <div v-if="state.groupedConfigurations['EMAIL'] && state.groupedConfigurations['EMAIL'].length > 0">
                          <div v-for="(configuration, index) in state.groupedConfigurations['EMAIL']" :key="index">
                            <SimpleConfigurationCard
                              :show="true"
                              :canUpdate="state.toggles[`configuration.admin.${configuration.name}`]"
                              :configuration="configuration"
                              :showTooltip="true"
                            >
                            </SimpleConfigurationCard>
                          </div>
                        </div>
                        <div v-else>
                          <Message
                            :title="$t('businessConfiguration.message.1.title')"
                            :content="$t('businessConfiguration.message.1.content')" />
                        </div>
                      </div>
                    </div>
                    <div class="my-2">
                      <a class="nav-link configuration-title centered"
                        data-bs-toggle="collapse"
                        href="#product">
                        {{ $t("configuration.types.product") }}
                        <span class="badge bg-secondary px-2 py-1 mx-1">{{ state.groupedConfigurations['PRODUCT'] ? state.groupedConfigurations['PRODUCT'].length : 0 }}</span>
                        <i class="bi bi-chevron-down mx-2"></i>
                      </a>
                      <div id="product" class="collapse">
                        <div v-if="state.groupedConfigurations['PRODUCT'] && state.groupedConfigurations['PRODUCT'].length > 0">
                          <div v-for="(configuration, index) in state.groupedConfigurations['PRODUCT']" :key="index">
                            <SimpleConfigurationCard
                              :show="true"
                              :canUpdate="state.toggles[`configuration.admin.${configuration.name}`]"
                              :configuration="configuration"
                              :showTooltip="true"
                            >
                            </SimpleConfigurationCard>
                          </div>
                        </div>
                        <div v-else>
                          <Message
                            :title="$t('businessConfiguration.message.1.title')"
                            :content="$t('businessConfiguration.message.1.content')" />
                        </div>
                      </div>
                    </div>
                    <div class="my-2">
                      <a class="nav-link configuration-title centered"
                        data-bs-toggle="collapse"
                        href="#user">
                        {{ $t("configuration.types.user") }}
                        <span class="badge bg-secondary px-2 py-1 mx-1">{{ state.groupedConfigurations['USER'] ? state.groupedConfigurations['USER'].length : 0 }} </span>
                        <i class="bi bi-chevron-down mx-2"></i>
                      </a>
                      <div id="user" class="collapse">
                        <div v-if="state.groupedConfigurations['USER'] && state.groupedConfigurations['USER'].length > 0">
                          <div v-for="(configuration, index) in state.groupedConfigurations['USER']" :key="index">
                            <SimpleConfigurationCard
                              :show="true"
                              :canUpdate="state.toggles[`configuration.admin.${configuration.name}`]"
                              :configuration="configuration"
                              :showTooltip="true"
                            >
                            </SimpleConfigurationCard>
                          </div>
                        </div>
                        <div v-else>
                          <Message
                            :title="$t('businessConfiguration.message.1.title')"
                            :content="$t('businessConfiguration.message.1.content')" />
                        </div>
                      </div>
                    </div>
                    <div class="my-2">
                      <a class="nav-link configuration-title centered"
                        data-bs-toggle="collapse"
                        href="#whatsapp">
                        {{ $t("configuration.types.whatsapp") }}
                        <span class="badge bg-secondary px-2 py-1 mx-1">{{ state.groupedConfigurations['WHATSAPP'] ? state.groupedConfigurations['WHATSAPP'].length : 0 }} </span>
                        <i class="bi bi-chevron-down mx-2"></i>
                      </a>
                      <div id="whatsapp" class="collapse">
                        <div v-if="state.groupedConfigurations['WHATSAPP'] && state.groupedConfigurations['WHATSAPP'].length > 0">
                          <div v-for="(configuration, index) in state.groupedConfigurations['WHATSAPP']" :key="index">
                            <SimpleConfigurationCard
                              :show="true"
                              :canUpdate="state.toggles[`configuration.admin.${configuration.name}`]"
                              :configuration="configuration"
                              :showTooltip="true"
                            >
                            </SimpleConfigurationCard>
                          </div>
                        </div>
                        <div v-else>
                          <Message
                            :title="$t('businessConfiguration.message.1.title')"
                            :content="$t('businessConfiguration.message.1.content')" />
                        </div>
                      </div>
                    </div>
                    <div class="my-2">
                      <a class="nav-link configuration-title centered"
                        data-bs-toggle="collapse"
                        href="#message">
                        {{ $t("configuration.types.message") }}
                        <span class="badge bg-secondary px-2 py-1 mx-1">{{ state.groupedConfigurations['MESSAGE'] ? state.groupedConfigurations['MESSAGE'].length : 0 }} </span>
                        <i class="bi bi-chevron-down mx-2"></i>
                      </a>
                      <div id="message" class="collapse">
                        <div v-if="state.groupedConfigurations['MESSAGE'] && state.groupedConfigurations['MESSAGE'].length > 0">
                          <div v-for="(configuration, index) in state.groupedConfigurations['MESSAGE']" :key="index">
                            <SimpleConfigurationCard
                              :show="true"
                              :canUpdate="state.toggles[`configuration.admin.${configuration.name}`]"
                              :configuration="configuration"
                              :showTooltip="true"
                            >
                            </SimpleConfigurationCard>
                          </div>
                        </div>
                        <div v-else>
                          <Message
                            :title="$t('businessConfiguration.message.1.title')"
                            :content="$t('businessConfiguration.message.1.content')" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="(!isActiveBusiness() || !state.toggles['configuration.admin.view']) && !loading">
              <Message
                :title="$t('businessConfiguration.message.1.title')"
                :content="$t('businessConfiguration.message.1.content')" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showConfigurations === true && !toggles['configuration.admin.features']">
      <Message
        :icon="'bi-graph-up-arrow'"
        :title="$t('dashboard.message.1.title')"
        :content="$t('dashboard.message.1.content')" />
    </div>
    <!-- Modal Add -->
    <div class="modal fade" :id="`add-configuration`" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-plus-lg"></i> {{ $t("add") }} </h5>
            <button id="close-modal-config" class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="loading" :stack="alertError"></Alert>
            <div id="add-configuration" class="configuration-card mb-4" v-if="state.showAdd && state.toggles['configuration.admin.add']">
              <div class="row g-1">
                <div id="configuration-feature-form-add" class="row g-1">
                  <div class="col text-label">
                    {{ $t("businessConfiguration.types") }}
                  </div>
                  <div class="col">
                    <select
                      class="btn btn-md btn-light fw-bold text-dark select mx-2"
                      v-model="state.typeSelected"
                      @change="selectType()"
                      id="types">
                      <option v-for="typ in state.types" :key="typ.id" :value="typ.id">{{ $t(`configuration.types.${typ.name}`) }}</option>
                    </select>
                  </div>
                </div>
                <div id="configuration-feature-form-add" class="row g-1">
                  <div class="col text-label">
                    {{ $t("businessConfiguration.feature") }}
                  </div>
                  <div class="col">
                    <select
                      class="btn btn-md btn-light fw-bold text-dark select mx-2"
                      v-model="state.optionSelected"
                      id="features"
                      v-bind:class="{ 'is-invalid': state.moduleError }">
                      <option v-for="opt in state.options" :key="opt.name" :value="opt">{{ $t(`configuration.${opt.name}.title`) }}</option>
                    </select>
                  </div>
                </div>
                <div class="col">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                    @click="add(state.newConfiguration)">
                    {{ $t("businessConfiguration.add") }} <i class="bi bi-save"></i>
                  </button>
                </div>
                <div class="row g-1 errors" id="feedback" v-if="(state.errorsAdd.length > 0)">
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
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-dismiss="modal" aria-label="Close">{{ $t("close") }} <i class="bi bi-check-lg"></i></a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
  text-overflow: ellipsis;
}
.module-details-container {
  font-size: .8rem;
  margin-left: .5rem;
  margin-right: .5rem;
  margin-top: .5rem;
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
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.configuration-title {
  line-height: 1.2rem;
  font-size: .9rem;
  font-weight: 700;
  text-align: left;
  background-color: var(--azul-turno);
  margin: .1rem;
  border-radius: 1rem;
  line-height: 1rem;
  border: 1.5px solid var(--azul-turno);
  color: var(--color-background);
  padding: .2rem;
}
</style>