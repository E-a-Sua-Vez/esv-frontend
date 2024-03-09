<script>
import { ref, reactive, onBeforeMount, toRefs } from 'vue';
import { getActiveFeature } from '../../shared/features';
import { getPhoneCodes } from '../../shared/utils/data';
import Warning from '../../components/common/Warning.vue';

export default {
  name: 'ClientForm',
  components: { Warning },
  props: {
    commerce: { type: Object, default: {} },
    name: { type: String, default: '' },
    lastName: { type: String, default: '' },
    idNumber: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    receiveData: { type: Function, default: () => {} }
  },
  async setup(props) {

    let loading = ref(false);

    const {
      commerce,
      name,
      lastName,
      idNumber,
      phone,
      email,
    } = toRefs(props);

    const { receiveData } = props;

    const state = reactive({
      newUser: {},
      accept: false,
      phone: '',
      phoneCode: '',
      phoneCodes: [],
      errorsAdd: []
    })

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.phoneCodes = getPhoneCodes();
        if (commerce.value && commerce.value.localeInfo.country) {
            state.newUser.phoneCode = findPhoneCode(commerce.value.localeInfo.country);
          }
        if (name.value || lastName.value || idNumber.value || email.value) {
          state.newUser.name = name.value !== 'undefined' ? name.value : '';
          state.newUser.lastName = lastName.value !== 'undefined' ? lastName.value : '';
          state.newUser.idNumber = idNumber.value !== 'undefined' ? idNumber.value : '';
          state.newUser.email = email.value !== 'undefined' ? email.value : ''
        }
        if (phone.value) {
          state.newUser.phoneCode = phone.value !== 'undefined' ? phone.value.slice(0,2) : '';
          state.newUser.phone = phone.value !== 'undefined' ? phone.value.slice(2,20) : '';
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    const sendData = () => {
      receiveData(state.newUser);
    }

    const isDataActive = () => {
      let active = false;
      let features = [];
      if (commerce.value !== undefined && commerce.value.features.length > 0) {
        features = commerce.value.features.filter(feature => feature.type === 'USER' && feature.active === true);
        if (features.length > 0) {
          active = true;
        }
      }
      if (!active) {
        state.accept = true;
      }
      return active;
    };

    const isActiveCommerce = () => {
      return commerce.value.active === true &&
        commerce.value.queues.length > 0
    };

    const findPhoneCode = (codeIn) => {
      const search = state.phoneCodes.find(code => code.id === codeIn);
      if (search) {
        return search.code;
      }
      return '';
    }

    const showConditions = () => {
      if (
        getActiveFeature(commerce.value, 'attention-user-name', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-lastName', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-idNumber', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-phone', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-email', 'USER')
      ) {
        return true;
      }
      state.accept = false;
      return false;
    }

    return {
      state,
      loading,
      commerce,
      isDataActive,
      isActiveCommerce,
      getActiveFeature,
      showConditions,
      sendData
    }
  }
}
</script>
<template>
  <div>
    <div id="data" v-if="isDataActive()">
      <div v-if="isActiveCommerce()" class="choose-attention py-1 pt-4">
        <span>{{ $t("commerceQueuesView.data") }}</span>
      </div>
      <div class="row g-1">
        <div class="col col-md-10 offset-md-1 data-card">
          <div id="attention-name-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(commerce, 'attention-user-name', 'USER')">
            <div class="col form-floating">
              <input
                id="attention-name-input-add"
                maxlength="30"
                type="text"
                class="form-control form-control-solid"
                v-model.trim="state.newUser.name"
                placeholder="Ex. Jhon"
                @keyup="sendData"
                >
                <label for="attention-name-input-add" class="label-form">{{ $t("commerceQueuesView.name") }} <i class="bi bi-person"></i></label>
            </div>
          </div>
          <div id="attention-lastname-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(commerce, 'attention-user-lastName', 'USER')">
            <div class="col form-floating">
              <input
                id="attention-lastname-input-add"
                maxlength="20"
                type="text"
                class="form-control form-control-solid"
                v-model.trim="state.newUser.lastName"
                placeholder="Ex. Pérez"
                @keyup="sendData"
                >
                <label for="attention-lastname-input-add">{{ $t("commerceQueuesView.lastName") }} <i class="bi bi-person"></i></label>
            </div>
          </div>
          <div id="attention-idnumber-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(commerce, 'attention-user-idNumber', 'USER')">
            <div class="col form-floating">
              <input
                id="attention-idnumber-input-add"
                maxlength="20"
                type="text"
                class="form-control"
                v-model.trim="state.newUser.idNumber"
                v-bind:class="{ 'is-invalid': state.idNumberError }"
                placeholder="Ex. 112223334"
                @keyup="sendData"
                >
                <label for="attention-lastname-input-add">{{ $t("commerceQueuesView.idNumber") }} <i class="bi bi-person-vcard"></i></label>
            </div>
          </div>
          <div id="attention-email-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(commerce, 'attention-user-email', 'USER')">
            <div class="col form-floating">
              <input
                id="attention-email-input-add"
                maxlength="50"
                type="email"
                class="form-control"
                v-model.trim="state.newUser.email"
                placeholder="Ex. jhon@user.com"
                @keyup="sendData"
                >
                <label for="attention-lastname-input-add">{{ $t("commerceQueuesView.email") }} <i class="bi bi-envelope"></i></label>
            </div>
          </div>
          <div id="attention-phone-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(commerce, 'attention-user-phone', 'USER')">
            <div class="col-3 form-floating">
              <select
                class="form-control form-select btn btn-lg btn-light fw-bold text-dark select"
                v-model.trim="state.newUser.phoneCode"
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
                v-model="state.newUser.phone"
                placeholder="Ex.: 56233445533"
                @keyup="sendData"
                >
                <label for="attention-phone-input-add">{{ $t("commerceQueuesView.phone") }} <i class="bi bi-phone-vibrate"></i> </label>
            </div>
            <label v-if="!state.phoneCode" class="examples mt-2"> {{ $t('clientNotifyData.validate.cellphone.example') }} </label>
            <label v-else class="examples mt-2"> {{ $t(`clientNotifyData.validate.cellphone.examples.${state.phoneCode}`) }} </label>
          </div>
          <div class="recaptcha-area form-check form-check-inline" v-if="showConditions()">
            <input type="checkbox" class="form-check-input" id="conditions" v-model="state.newUser.accept" @change="sendData">
            <label class="form-check-label label-conditions text-left" for="conditions"> {{ $t("clientNotifyData.accept.1") }}
              <a href="#conditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal"> {{ $t("clientNotifyData.accept.2") }}</a>
            </label>
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
  </div>
</template>
<style scoped>
.choose-attention {
  padding-bottom: 1rem;
  font-size: .9rem;
  font-weight: 500;
  line-height: 1rem;
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
.data-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
</style>