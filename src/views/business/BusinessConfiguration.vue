<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getFeatureToggleByCommerceId, getFeatureToggleOptions, addFeatureToggle } from '../../application/services/feature-toggle';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import SimpleConfigurationCard from '../../components/configuration/SimpleConfigurationCard.vue';

export default {
  name: 'BusinessConfiguration',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, ToggleCapabilities, Warning, SimpleConfigurationCard },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      commerces: ref({}),
      configurations: ref({}),
      groupedConfigurations : {},
      options: {},
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
        state.options = await getFeatureToggleOptions();
        state.toggles = await getPermissions('configuration', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status;
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
        alertError.value = error.response.status;
        loading.value = false;
      }
    }

    const showAdd = () => {
      state.showAdd = !state.showAdd;
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
          state.newConfiguration = {};
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    return {
      state,
      loading,
      alertError,
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
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <div class="col">
        <a class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4" @click="goBack()"> {{ $t("businessConfiguration.return") }} <i class="bi bi-arrow-left"></i></a>
      </div>
      <div id="page-header" class="text-center mt-4">
        <span class="welcome-user">{{ $t("businessConfiguration.title") }}</span>
        <ToggleCapabilities
          :toggles="state.toggles"
          componentName="businessConfiguration"
        ></ToggleCapabilities>
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessConfiguration">
        <div v-if="isActiveBusiness && state.toggles['configuration.admin.view']">
          <div id="businessConfiguration-controls" class="control-box">
            <div class="row">
              <div class="col" v-if="state.commerces.length > 0">
                <span>{{ $t("businessConfiguration.commerce") }} </span>
                <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="configurations">
                  <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                </select>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessConfiguration.message.3.title')"
                  :content="$t('businessConfiguration.message.3.content')" />
              </div>
            </div>
          </div>
          <div v-if="!loading" id="businessConfiguration-result" class="mt-4">
            <div>
              <div v-if="state.configurations.length === 0">
                <Message
                  :title="$t('businessConfiguration.message.2.title')"
                  :content="$t('businessConfiguration.message.2.content')" />
              </div>
              <div v-if="state.commerce" class="row mb-2">
                <div class="col-8 text-label">
                  <span>{{ $t("businessConfiguration.listResult") }}</span>
                  <span class="fw-bold m-2">{{ state.configurations.length }}</span>
                </div>
                <div class="col-4">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd()"
                    :disabled="!state.toggles['configuration.admin.add']">
                    <i class="bi bi-plus-lg"></i>
                  </button>
                </div>
              </div>
              <div id="add-configuration" class="configuration-card mb-4" v-if="state.showAdd && state.toggles['configuration.admin.add']">
                <div class="row g-1">
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
              <div class="configuration-card mb-4" v-if="state.configurations.length > 0 && state.toggles['configuration.admin.edit']">
                <div class="my-4">
                  <a class="nav-link configuration-title centered"
                    data-bs-toggle="collapse"
                    href="#email">
                    {{ $t("configuration.types.email") }} <i class="bi bi-chevron-down mx-2"></i>
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
                <div class="my-4">
                  <a class="nav-link configuration-title centered"
                    data-bs-toggle="collapse"
                    href="#product">
                    {{ $t("configuration.types.product") }} <i class="bi bi-chevron-down mx-2"></i>
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
                <div class="my-4">
                  <a class="nav-link configuration-title centered"
                    data-bs-toggle="collapse"
                    href="#user">
                    {{ $t("configuration.types.user") }} <i class="bi bi-chevron-down mx-2"></i>
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
                <div class="my-4">
                  <a class="nav-link configuration-title centered"
                    data-bs-toggle="collapse"
                    href="#whatsapp">
                    {{ $t("configuration.types.whatsapp") }} <i class="bi bi-chevron-down mx-2"></i>
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
    <PoweredBy :name="state.business.name" />
  </div>
</template>

<style scoped>
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
  text-overflow: ellipsis;
}
.text-label {
  line-height: 1.2rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.module-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.control-box {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .1rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
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
  max-height: 400px !important;
  overflow-y: auto;
}
.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
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
  line-height: 1rem;
  font-size: 1.1rem;
  font-weight: 700;
  text-align: left;
}
</style>