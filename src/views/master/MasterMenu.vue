<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { getBusinesses } from '../../application/services/business';
import { globalStore } from '../../stores';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import SearchBar from '../../components/common/SearchBar.vue';
import WelcomeMenu from '../../components/common/WelcomeMenu.vue';

export default {
  name: 'MasterMenu',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, SearchBar, WelcomeMenu },
  async setup() {
    const router = useRouter();
    const loading = ref(false);
    const alertError = ref('');

    const store = globalStore();

    const state = reactive({
      currentUser: {},
      businesses: {},
      business: {},
      manageSubMenuOption: false,
      manageControlSubMenuOption: false,
      masterMenuOptions: [
        'business-master-admin',
        'plans-master-admin',
        'features-master-admin',
        'plan-activations-admin',
      ],
      businessMenuOptions: [
        'dashboard',
        'reports',
        'bookings-master-admin',
        'manage-master-admin',
        'configuration',
        'documents',
        'your-plan',
        'business-master-resume',
        'go-minisite',
      ],
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
        'patient-history-item-master-admin',
        'product-master-admin',
        'permissions-master-admin',
      ],
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = store.getCurrentUser;
        state.businesses = await getBusinesses();
        state.business = store.getCurrentBusiness;
        if (state.business && state.business.id !== undefined) {
          state.currentUser.businessId = state.business.id;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const goToOption = async option => {
      try {
        loading.value = true;
        alertError.value = '';
        if (option) {
          if (option === 'manage-master-admin') {
            state.manageSubMenuOption = !state.manageSubMenuOption;
          } else if (option === 'control-master-admin') {
            state.manageControlSubMenuOption = !state.manageControlSubMenuOption;
          } else {
            router.push({ path: `/interno/master/${option}` });
          }
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };

    const selectBusiness = business => {
      state.business = business;
      state.currentUser.businessId = business.id;
      store.setCurrentBusiness(state.business);
    };

    const closeBusiness = () => {
      state.business = undefined;
      state.currentUser.businessId = undefined;
      store.setCurrentBusiness(undefined);
    };

    const getBusinessLink = () => {
      const businessKeyName = state.business.keyName;
      return `${import.meta.env.VITE_URL}/interno/negocio/${businessKeyName}`;
    };

    return {
      state,
      loading,
      alertError,
      goToOption,
      selectBusiness,
      closeBusiness,
      getBusinessLink,
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
        <div class="choose-attention">
          <span>{{ $t('masterMenu.choose') }}</span>
        </div>
        <div id="master-menu">
          <div class="row">
            <div
              v-for="option in state.masterMenuOptions"
              :key="option"
              class="d-grid btn-group btn-group-justified"
            >
              <div>
                <button
                  type="button"
                  class="btn btn-lg btn-block btn-size col-8 fw-bold btn-dark rounded-pill mt-2 mb-2"
                  @click="goToOption(option)"
                >
                  {{ $t(`masterMenu.${option}`) }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div id="searcher" class="mx-3">
          <SearchBar
            :list="state.businesses"
            :label="$t('masterMenu.business')"
            @selectItem="selectBusiness"
          >
          </SearchBar>
        </div>
        <div class="business-admin">
          <div v-if="state.business && state.business.id" class="card mt-1 mb-3">
            <div class="row d-flex m-1 business-title">
              <div class="col-4">
                <img :src="state.business.logo" class="img-thumbnail rounded-start item-image" />
              </div>
              <div class="col-7">
                <span class="item-title fw-bold"> {{ state.business.name }} </span>
              </div>
              <button
                type="button"
                class="btn-close"
                aria-label="Close"
                @click="closeBusiness()"
              ></button>
            </div>
            <div id="business-menu" class="my-2">
              <div class="row">
                <div
                  v-for="option in state.businessMenuOptions"
                  :key="option"
                  class="d-grid btn-group btn-group-justified"
                >
                  <div v-if="option === 'go-minisite'" class="centered">
                    <a
                      type="button"
                      class="btn btn-lg btn-block btn-size col-8 fw-bold btn-secondary rounded-pill mt-2 mb-2"
                      :href="`${getBusinessLink()}`"
                      target="_blank"
                    >
                      {{ $t(`masterMenu.${option}`) }} <i class="bi bi-box-arrow-up-right"></i>
                    </a>
                  </div>
                  <div v-else>
                    <button
                      type="button"
                      class="btn btn-lg btn-block btn-size col-8 fw-bold btn-dark rounded-pill mt-2 mb-2"
                      @click="goToOption(option)"
                    >
                      {{ $t(`masterMenu.${option}`) }}
                      <i
                        v-if="option === 'manage-master-admin'"
                        :class="`bi ${
                          state.manageSubMenuOption === true ? 'bi-chevron-up' : 'bi-chevron-down'
                        }`"
                      ></i>
                      <i
                        v-if="option === 'control-master-admin'"
                        :class="`bi ${
                          state.manageControlSubMenuOption === true
                            ? 'bi-chevron-up'
                            : 'bi-chevron-down'
                        }`"
                      ></i>
                    </button>
                    <div
                      v-if="option === 'manage-master-admin' && state.manageSubMenuOption === true"
                      class="mb-1"
                    >
                      <div
                        v-for="opt in state.manageSubMenuOptions"
                        :key="opt"
                        class="centered mx-3"
                      >
                        <button
                          type="button"
                          class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-1"
                          @click="goToOption(opt)"
                        >
                          {{ $t(`masterMenu.${opt}`) }} <i class="bi bi-chevron-right"></i>
                        </button>
                      </div>
                    </div>
                    <div
                      v-if="
                        option === 'control-master-admin' &&
                        state.manageControlSubMenuOption === true
                      "
                      class="mb-1"
                    >
                      <div
                        v-for="opt in state.manageControlSubMenuOption"
                        :key="opt"
                        class="centered mx-3"
                      >
                        <button
                          type="button"
                          class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-1"
                          @click="goToOption(opt)"
                        >
                          {{ $t(`masterMenu.${opt}`) }} <i class="bi bi-chevron-right"></i>
                        </button>
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
    <PoweredBy :name="state.business?.name || ''" />
  </div>
</template>
<style scoped>
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
.btn-light {
  --bs-btn-bg: #dcddde !important;
}
</style>
