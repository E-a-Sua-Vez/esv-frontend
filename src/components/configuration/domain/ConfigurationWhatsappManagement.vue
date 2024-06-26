<script>
import { ref, reactive, onBeforeMount, computed, watch, toRefs } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../../stores';
import { requestWhatsappConnectionById, returnWhatsappConnectionById, statusWhatsappConnectionById, disconnectWhatsappConnectionById } from '../../../application/services/business';
import { getPermissions } from '../../../application/services/permissions';
import { getDate } from '../../../shared/utils/date';
import Message from '../../common/Message.vue';
import PoweredBy from '../../common/PoweredBy.vue';
import CommerceLogo from '../../common/CommerceLogo.vue';
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import Warning from '../../common/Warning.vue';
import SimpleConfigurationCard from '../common/SimpleConfigurationCard.vue';
import ComponentMenu from '../../common/ComponentMenu.vue';
import { getPhoneCodes } from '../../../shared/utils/data';
import AreYouSure from '../../common/AreYouSure.vue';

export default {
  name: 'ConfigurationWhatsappManagement',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, Warning, SimpleConfigurationCard, ComponentMenu, AreYouSure },
  props: {
    showConfigurations: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    business: { type: Object, default: undefined },
    whatsappStatus: { type: Object, default: {} },
    getWhatsappStatusFromContainer: { type: Function, default: () => {} },
  },
  async setup(props) {
    const router = useRouter();
    const store = globalStore();

    let loading = ref(false);
    let alertError = ref('');

    const {
      business,
    } = toRefs(props);

    const { getWhatsappStatusFromContainer } = props;

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      showAdd: false,
      phone: '',
      phoneCode: '',
      whatsapp: '',
      phoneCodes: [],
      errorsAdd: [],
      whatsappConnectionStatus: {},
      whatsappRequest: {},
      whatsappRequested: false,
      whatsappRequestError: false,
      goToDisconnect: false,
      whatsappRequestResult: {},
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.phoneCodes = getPhoneCodes();
        state.phoneCode = findPhoneCode(business.value.localeInfo.country);
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('configuration', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    })

    const isActiveBusiness = () => {
      return state.business && state.business.active === true;
    };

    const goBack = () => {
      router.back();
    }

    const showAdd = () => {
      state.showAdd = true;
    }

    const validate = () => {
      state.errorsAdd = [];
      if (!state.phoneCode || state.phoneCode.length === 0) {
        state.errorsAdd.push('commerceQueuesView.validate.phoneCode');
      } else {
        if (state.phoneCode === 'xx') {
          state.phoneCode = '';
        }
        state.whatsapp = state.phoneCode + state.phone.replace(/^0+/, '');
      }
      if(!state.phone || state.phone.length === 0) {
        state.errorsAdd.push('commerceQueuesView.validate.phone');
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const getWhatsappConnection = async () => {
      try {
        loading.value = true;
        if (validate()) {
          state.whatsappRequest = await requestWhatsappConnectionById(state.business.id, state.whatsapp);
        } else {
          loading.value = false;
        }
      } catch (error) {
        state.whatsappRequestError = true;
        loading.value = false;
      }
    }

    const getWhatsappConnectionResult = async () => {
      try {
        loading.value = true;
        if (state.whatsappRequest && state.whatsappRequest['w_instancia_id']) {
          setTimeout(async () => {
            state.whatsappRequested = false;
            state.whatsappRequestResult = await returnWhatsappConnectionById(state.business.id, state.whatsappRequest['w_instancia_id']);
            state.whatsappRequestError = false;
            loading.value = false;
          }, 15000);
        }
      } catch (error) {
        state.whatsappRequestError = true;
        loading.value = false;
        alertError.value = error.response.status || 500;
      }
    }

    const onlyNumber = ($event) => {
      let keyCode = ($event.keyCode ? $event.keyCode : $event.which);
      if ((keyCode < 48 || keyCode > 57) && keyCode !== 46) { // 46 is dot
          $event.preventDefault();
      }
    }

    const findPhoneCode = (codeIn) => {
      const search = state.phoneCodes.find(code => code.id === codeIn);
      if (search) {
        return search.code;
      }
      return '';
    }

    const getWhatsappStatus = async () => {
      try {
        loading.value = true;
        await getWhatsappStatusFromContainer();
        state.showAdd = false;
        closeAddModal();
        loading.value = false;
      } catch (error) {
        state.whatsappConnectionStatus = {};
        loading.value = false;
      }
    }

    const disconnectWhatsapp = async () => {
      try {
        loading.value = true;
        if (state.whatsappConnectionStatus && state.whatsappConnectionStatus.connected === true) {
          await disconnectWhatsappConnectionById(state.business.id, state.whatsappConnectionStatus.idConnection);
          setTimeout(async () => {
            const result = await statusWhatsappConnectionById(state.business.id);
            if (result && result.whatsappConnection) {
              state.whatsappConnectionStatus = result.whatsappConnection;
            }
            loading.value = false;
          }, 5000);
        }
      } catch (error) {
        loading.value = false;
      }
    }

    const goDisconnect = () => {
      state.goToDisconnect = !state.goToDisconnect;
    }

    const confirmCancel = () => {
      state.goToDisconnect = false;
    }

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('btn-close-2');
      modalCloseButton.click();
    }

    const changeWhatsappRequest = computed(() => {
      const { whatsappRequest } = state;
      return {
        whatsappRequest
      }
    })

    const changeWhatsappRequestResult = computed(() => {
      const { whatsappRequestResult } = state;
      return {
        whatsappRequestResult
      }
    })

    const changeWhatsappStatus = computed(() => {
      const { whatsappStatus } = props;
      state.whatsappConnectionStatus = whatsappStatus;
    })

    watch(
      changeWhatsappRequest,
      async () => {
        if (state.whatsappRequest['result'] === 'success') {
          state.whatsappRequested = true;
          await getWhatsappConnectionResult();
        } else {
          state.whatsappRequestError = true;
        }
      }
    )

    watch(
      changeWhatsappRequestResult,
      async () => {
        loading.value = true;
        if (!state.whatsappRequestResult.payload) {
          state.whatsappRequestError = true;
        }
        loading.value = false;
      }
    )

    watch(
      changeWhatsappStatus,
      async () => { }
    )

    return {
      state,
      loading,
      alertError,
      changeWhatsappStatus,
      getDate,
      onlyNumber,
      showAdd,
      goBack,
      isActiveBusiness,
      getWhatsappConnection,
      getWhatsappStatus,
      disconnectWhatsapp,
      goDisconnect,
      confirmCancel
    }
  }
}
</script>

<template>
  <div id="whatsapp-management" class="row" v-if="showConfigurations === true && toggles['configuration.admin.whatsapps']">
    <div class="">
      <div id="attention-management-component">
        <Spinner :show="loading"></Spinner>
        <div v-if="!loading">
          <div id="businessConfiguration">
            <div v-if="isActiveBusiness && state.toggles['configuration.admin.whatsapps']">
              <div v-if="!loading" id="businessConfiguration-result" class="mt-4">
                <div v-if="state.business" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      v-if="!state.whatsappConnectionStatus || !state.whatsappConnectionStatus.connected"
                      @click="showAdd()"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-whatsapp`"
                      :disabled="!state.toggles['configuration.admin.whatsapps-connect']">
                      <i class="bi bi-plugin"></i> {{ $t("businessConfiguration.connect") }}
                    </button>
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="getWhatsappStatus()"
                      :disabled="!state.toggles['configuration.admin.whatsapps-connect']">
                      <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                  </div>
                </div>
                <div v-if="state.whatsappConnectionStatus &&state.whatsappConnectionStatus.connected !== undefined">
                  <div class="configuration-card">
                    <div class="row">
                      <div class="col-2 centered">
                        <span> {{ state.whatsappConnectionStatus.connected ? '🟢' : '🔴' }}</span>
                      </div>
                      <div class="col-10">
                        <div class="col">
                          <i class="bi bi-whatsapp"></i> <span class="fw-bold mx-2"> {{ state.whatsappConnectionStatus.whatsapp }} </span>
                        </div>
                        <div class="colm mt-2">
                        <span class="badge detail-data-badge mx-2">
                          <span class="fw-bold detail-data-badge-title"> {{ $t('businessConfiguration.id') }} </span>
                          {{ state.whatsappConnectionStatus.idConnection }}
                          </span>
                        <span class="badge detail-data-badge mx-2">
                          <span class="fw-bold detail-data-badge-title"> {{ $t('businessConfiguration.lastConnection') }} </span>
                          {{ getDate(state.whatsappConnectionStatus.lastConection) }}
                        </span>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div v-if="state.whatsappConnectionStatus.connected === true">
                        <hr>
                        <button class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-4"
                          @click="goDisconnect()"
                          :disabled="!toggles['configuration.admin.whatsapps-disconnect']"
                          >
                          {{ $t('businessConfiguration.disconnect') }} <i class="bi bi-x-circle-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToDisconnect"
                          :yesDisabled="toggles['configuration.admin.whatsapps-disconnect']"
                          :noDisabled="toggles['configuration.admin.whatsapps-disconnect']"
                          @actionYes="disconnectWhatsapp()"
                          @actionNo="confirmCancel()"
                        >
                        </AreYouSure>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else>
                  <Message
                    :title="$t('businessConfiguration.message.4.title')"
                    :content="$t('businessConfiguration.message.4.content')" />
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
    <div class="modal fade" :id="`add-whatsapp`" data-bs-keyboard="false" tabindex="-1" aria-labelledby="" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-plugin"></i> {{ $t("businessConfiguration.connect") }} </h5>
            <button id="close-modal" class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="loading" :stack="alertError"></Alert>
            <div id="add-whatsapp" class="configuration-card mb-4" v-if="state.showAdd && state.toggles['configuration.admin.whatsapps']">
              <div class="row g-1">
                <div id="attention-phone-form-add" class="row g-1">
                  <div class="col-3 form-floating">
                    <select
                      class="form-control form-select btn btn-lg btn-light fw-bold text-dark select"
                      v-model.trim="state.phoneCode"
                      id="attention-phoneCode-input-add">
                      <option v-for="code in state.phoneCodes" :key="code.id" :value="code.code">{{ code.label }}</option>
                    </select>
                    <label for="attention-phoneCode-input-add"> {{ $t("commerceQueuesView.phoneCode") }}</label>
                  </div>
                  <div class="col-9 form-floating">
                    <input
                      id="attention-phone-input-add"
                      maxlength="15"
                      type="tel"
                      class="form-control"
                      v-model="state.phone"
                      placeholder="Ex.: 56233445533"
                      @keypress="onlyNumber"
                      >
                      <label for="attention-phone-input-add">{{ $t("commerceQueuesView.phone") }} <i class="bi bi-phone-vibrate"></i> </label>
                  </div>
                  <label v-if="!state.phoneCode" class="examples mt-2"> {{ $t('clientNotifyData.validate.cellphone.example') }} </label>
                  <label v-else class="examples mt-1"> {{ $t(`clientNotifyData.validate.cellphone.examples.${state.phoneCode}`) }} </label>
                </div>
                <div class="col">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                    @click="getWhatsappConnection()"
                    :disabled="!toggles['configuration.admin.whatsapps-connect']"
                    >
                    {{ $t("businessConfiguration.request") }} <i class="bi bi-qr-code"></i>
                  </button>
                </div>
                <div v-if="state.whatsappRequested && !state.whatsappRequestError">
                  <Message
                    :title="$t('businessConfiguration.message.5.title')"
                    :content="$t('businessConfiguration.message.5.content')" />
                </div>
                <div v-if="state.whatsappRequestError">
                  <Message
                    :title="$t('businessConfiguration.message.6.title')"
                    :content="$t('businessConfiguration.message.6.content')" />
                </div>
                <div v-if="!state.whatsappRequestError && state.whatsappRequestResult && state.whatsappRequestResult.payload">
                  <div v-if="state.whatsappRequestResult.payload.qrcode">
                    <div class="centered mx-3 mt-3">
                      <div class="configuration-card">
                        <div class="row instructions">
                          <span class="fw-bold mb-2"> {{ $t("businessConfiguration.instructions.title") }} </span>
                          <span class="mb-1"> {{ $t("businessConfiguration.instructions.1") }} </span>
                          <span class="mb-1"> {{ $t("businessConfiguration.instructions.2") }} </span>
                          <span class="mb-1"> {{ $t("businessConfiguration.instructions.3") }} </span>
                          <span class="mb-1"> {{ $t("businessConfiguration.instructions.4") }} </span>
                          <span class="mb-1"> {{ $t("businessConfiguration.instructions.5") }} </span>
                        </div>
                      </div>
                    </div>
                    <div class="row centered">
                      <img v-bind:src="state.whatsappRequestResult.payload.qrcode" class="image-qr"/>
                    </div>
                    <div class="row centered">
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="getWhatsappStatus()"
                          data-bs-dismiss="modal" aria-label="Close"
                          >
                          {{ $t("businessConfiguration.confirm") }} <i class="bi bi-plugin"></i>
                        </button>
                      </div>
                    </div>
                  </div>
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
          <div class="mx-2 mb-4 righted">
            <button id="btn-close-2"
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              data-bs-dismiss="modal" aria-label="Close">{{ $t("close") }} <i class="bi bi-check-lg"></i>
            </button>
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
.instructions {
  font-size: .8rem;
  line-height: .8rem;
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
.form-floating > label {
  text-align: center !important;
  transform-origin: center center !important;
  font-weight: 700;
  font-size: .9rem;
}
.form-control {
  border: 1.75px solid #ced4da !important;
  border-radius: 1rem !important;
  text-align: center;
  line-height: 1.5rem;
}
.image-qr {
  height: 250px;
  width: 250px;
}
</style>