<script>
import { ref, reactive, onBeforeMount, toRefs } from 'vue';
import { getActiveFeature } from '../../shared/features';
import { getPhoneCodes, getUserOrigin } from '../../shared/utils/data';
import { getAddressBR } from '../../application/services/address';
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
    birthday: { type: String, default: '' },
    addressText: { type: String, default: '' },
    addressCode: { type: String, default: '' },
    origin: { type: String, default: '' },
    code1: { type: String, default: '' },
    code2: { type: String, default: '' },
    code3: { type: String, default: '' },
    errorsAdd: { type: Array, default: [] },
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
      birthday,
      addressText,
      addressCode,
      origin,
      code1,
      code2,
      code3,
      errorsAdd
    } = toRefs(props);

    const { receiveData } = props;

    const state = reactive({
      newUser: {},
      accept: false,
      phone: '',
      phoneCode: '',
      phoneCodes: [],
      originCodes: [],
      addressCodeError: false
    })

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.phoneCodes = getPhoneCodes();
        state.originCodes = getUserOrigin()
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
        if (birthday.value) {
          state.newUser.birthday = birthday.value != 'undefined' ? birthday.value : '';
        } else {
          state.newUser.birthday = new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0,10);
        }
        if (addressText.value) {
          state.newUser.addressText = addressText.value != 'undefined' ? addressText.value : '';
        }
        if (addressCode.value) {
          state.newUser.addressCode = addressCode.value != 'undefined' ? addressCode.value : '';
        }
        if (origin.value) {
          state.newUser.origin = origin.value != 'undefined' ? origin.value : '';
        }
        if (code1.value) {
          state.newUser.code1 = code1.value != 'undefined' ? code1.value : '';
        }
        if (code2.value) {
          state.newUser.code1 = code2.value != 'undefined' ? code2.value : '';
        }
        if (code3.value) {
          state.newUser.code1 = code3.value != 'undefined' ? code3.value : '';
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

    const getAddress = async () => {
      const addressCode = state.newUser.addressCode;
      if (addressCode) {
        if (commerce.value && commerce.value.localeInfo.country) {
          if (commerce.value.localeInfo.country === 'br') {
            const value = addressCode.replace(/\D/g, '');
            const validcep = /^[0-9]{8}$/;
            if (validcep.test(value)) {
              try {
                const result = await getAddressBR(addressCode);
                if (result) {
                  if (!result.erro) {
                    state.newUser.addressText = `${result.logradouro}, ${result.bairro}, ${result.localidade} ${result.uf}`;
                    state.addressCodeError = false;
                  } else {
                    state.addressCodeError = true;
                  }
                }
              } catch (error) {
                state.addressCodeError = true;
                state.newUser.addressText = '';
              }
            }
          }
        }
      }
    }

    const showConditions = () => {
      if (
        getActiveFeature(commerce.value, 'attention-user-name', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-lastName', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-idNumber', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-phone', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-email', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-birthday', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-address', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-origin', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-code1', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-code2', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-code3', 'USER')
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
      errorsAdd,
      isDataActive,
      isActiveCommerce,
      getActiveFeature,
      showConditions,
      sendData,
      getAddress
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
                maxlength="30"
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
            <label v-if="!state.newUser.phoneCode" class="examples mt-2"> {{ $t('clientNotifyData.validate.cellphone.example') }} </label>
            <label v-else class="examples mt-2"> {{ $t(`clientNotifyData.validate.cellphone.examples.${state.newUser.phoneCode}`) }} </label>
          </div>
          <div id="attention-birthday-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(commerce, 'attention-user-birthday', 'USER')">
            <div class="col form-floating">
              <input
                id="attention-birthday-input-add"
                class="form-control form-control-solid"
                type="date"
                v-model.trim="state.newUser.birthday"
                @keyup="sendData"
                >
                <label for="attention-birthday-input-add" class="label-form">{{ $t("commerceQueuesView.birthday") }} <i class="bi bi-calendar"></i></label>
            </div>
          </div>
          <div id="attention-addressCode-form-add" class="row g-1 mb-1"  v-if="getActiveFeature(commerce, 'attention-user-address', 'USER')">
            <div class="col form-floating">
              <input
                id="attention-addressCode-input-add"
                maxlength="10"
                type="text"
                class="form-control"
                v-model.trim="state.newUser.addressCode"
                placeholder="00000-00"
                @blur="getAddress"
                @keyup="sendData"
                v-bind:class="{ 'is-invalid': state.addressCodeError }"
                >
                <label for="attention-addressCode-input-add" class="label-form">{{ $t("commerceQueuesView.addressCode") }} <i class="bi bi-geo-alt-fill"></i></label>
            </div>
          </div>
          <div id="attention-addressCode-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(commerce, 'attention-user-address', 'USER')">
            <div class="col form-floating">
              <input
                id="attention-addressText-input-add"
                maxlength="80"
                type="text"
                class="form-control"
                v-model.trim="state.newUser.addressText"
                placeholder="00000-00"
                @keyup="sendData"
                >
                <label for="attention-addressText-input-add" class="label-form">{{ $t("commerceQueuesView.addressText") }} <i class="bi bi-geo-alt-fill"></i></label>
            </div>
          </div>
          <div id="attention-code1-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(commerce, 'attention-user-code1', 'USER')">
            <div class="col form-floating">
              <input
                id="attention-code1-input-add"
                maxlength="30"
                type="text"
                class="form-control form-control-solid"
                v-model.trim="state.newUser.code1"
                placeholder="Code 1"
                @keyup="sendData"
                >
                <label for="attention-code1-input-add" class="label-form">{{ $t("commerceQueuesView.code1") }} <i class="bi bi-hash"></i></label>
            </div>
          </div>
          <div id="attention-code2-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(commerce, 'attention-user-code2', 'USER')">
            <div class="col form-floating">
              <input
                id="attention-code2-input-add"
                maxlength="30"
                type="text"
                class="form-control form-control-solid"
                v-model.trim="state.newUser.code2"
                placeholder="Code 1"
                @keyup="sendData"
                >
                <label for="attention-code2-input-add" class="label-form">{{ $t("commerceQueuesView.code2") }} <i class="bi bi-hash"></i></label>
            </div>
          </div>
          <div id="attention-code3-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(commerce, 'attention-user-code3', 'USER')">
            <div class="col form-floating">
              <input
                id="attention-code3-input-add"
                maxlength="30"
                type="text"
                class="form-control form-control-solid"
                v-model.trim="state.newUser.code3"
                placeholder="Code 1"
                @keyup="sendData"
                >
                <label for="attention-code3-input-add" class="label-form">{{ $t("commerceQueuesView.code3") }} <i class="bi bi-hash"></i></label>
            </div>
          </div>
          <div id="attention-origin-form-add" class="row g-1 mb-2"  v-if="getActiveFeature(commerce, 'attention-user-origin', 'USER')">
            <div class="col form-floating">
              <select
                class="form-control form-select btn btn-light select"
                v-model.trim="state.newUser.origin"
                id="attention-origin-input-add">
                <option v-for="code in state.originCodes" :key="code.id" :value="code.code">{{ $t(`origin.${code.id}`) }}</option>
              </select>
              <label for="attention-origin-input-add"> {{ $t("commerceQueuesView.originText") }}</label>
            </div>
          </div>
          <div class="recaptcha-area form-check form-check-inline" v-if="showConditions()">
            <input type="checkbox" class="form-check-input" id="conditions" v-model="state.newUser.accept" @change="sendData">
            <label class="form-check-label label-conditions text-left" for="conditions"> {{ $t("clientNotifyData.accept.1") }}
              <a href="#conditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal"> {{ $t("clientNotifyData.accept.2") }}</a>
            </label>
          </div>
          <div class="row g-1 errors" id="feedback" v-if="(errorsAdd.length > 0)">
            <Warning>
              <template v-slot:message>
                <li v-for="(error, index) in errorsAdd" :key="index">
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
.examples {
  font-size: .8rem;
  line-height: 1rem;
  color: .5px solid var(--gris-default);
}
</style>