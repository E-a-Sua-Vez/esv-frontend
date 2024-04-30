<script>
import { ref, reactive, onBeforeMount, toRefs } from 'vue';
import { getActiveFeature } from '../../shared/features';
import { getPhoneCodes, getUserOrigin } from '../../shared/utils/data';
import { getAddressBR } from '../../application/services/address';
import { searchClientByIdNumber } from '../../application/services/client';
import { VueRecaptcha } from 'vue-recaptcha';
import Warning from '../../components/common/Warning.vue';
import Spinner from '../common/Spinner.vue';
import { getDocument, getDocumentByOption } from '../../application/services/document';

export default {
  name: 'ClientForm',
  components: { Warning, Spinner, VueRecaptcha },
  props: {
    commerce: { type: Object, default: {} },
    name: { type: String, default: '' },
    lastName: { type: String, default: '' },
    idNumber: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    birthday: { type: String, default: '' },
    addressText: { type: String, default: '' },
    addressComplement: { type: String, default: '' },
    addressCode: { type: String, default: '' },
    origin: { type: String, default: '' },
    code1: { type: String, default: '' },
    code2: { type: String, default: '' },
    code3: { type: String, default: '' },
    client: { type: String, default: undefined },
    errorsAdd: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} }
  },
  async setup(props) {

    let loading = ref(false);
    let loadingSearch = ref(false);
    const siteKey = import.meta.env.VITE_RECAPTCHA_CHECK;

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
      addressComplement,
      origin,
      code1,
      code2,
      code3,
      client,
      errorsAdd
    } = toRefs(props);

    const { receiveData } = props;

    const state = reactive({
      newUser: {},
      accept: false,
      captcha: false,
      phone: '',
      phoneCode: '',
      phoneCodes: [],
      originCodes: [],
      addressCodeError: false,
      showNewClient: true,
      showOldClient: false,
      idNumber: '',
      idNumberError: '',
      documentServiceConditions: undefined,
      fileServiceConditions: undefined,
      clientSearched: {},
      errorsSearch: []
    })

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.phoneCodes = getPhoneCodes();
        state.originCodes = getUserOrigin();
        if (getActiveFeature(commerce.value, 'user-service-conditions', 'PRODUCT')) {
          state.documentServiceConditions = await getDocumentByOption(commerce.value.id, 'terms_of_service');
          if (state.documentServiceConditions && state.documentServiceConditions.active === true) {
            state.fileServiceConditions = await getDocument(`${commerce.value.id}.pdf`, 'terms_of_service');
          }
        }
        if (commerce.value && commerce.value.localeInfo.country) {
          state.newUser.phoneCode = findPhoneCode(commerce.value.localeInfo.country);
        }
        if (name.value) {
          state.newUser.name = name.value !== 'undefined' ? name.value : '';
        }
        if (lastName.value) {
          state.newUser.lastName = lastName.value !== 'undefined' ? lastName.value : '';
        }
        if (idNumber.value) {
          const idNumberIn = idNumber.value.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '');
          state.newUser.idNumber = idNumberIn !== 'undefined' ? idNumberIn : '';
        }
        if (email.value) {
          state.newUser.email = email.value !== 'undefined' ? email.value : ''
        }
        if (phone.value) {
          const phoneIn = phone.value.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '');
          state.newUser.phoneCode = phoneIn !== 'undefined' ? phoneIn.slice(0,2) : '';
          state.newUser.phone = phoneIn !== 'undefined' ? phoneIn.slice(2,20) : '';
        }
        if (birthday.value) {
          state.newUser.birthday = birthday.value != 'undefined' ? birthday.value : '';
        } else {
          state.newUser.birthday = new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0,10);
        }
        if (addressText.value) {
          state.newUser.addressText = addressText.value != 'undefined' ? addressText.value : '';
        }
        if (addressComplement.value) {
          state.newUser.addressComplement = addressComplement.value != 'undefined' ? addressComplement.value : '';
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
                    state.newUser.addressText = '';
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

    const validate = () => {
      let valid = false;
      if (!state.idNumber || state.idNumber.length < 8) {
        state.errorsSearch.push('dashboard.validate.search');
        state.idNumberError = true;
      }
      if (!state.captcha) {
        state.errorsSearch.push('loginData.validate.common.2');
      }
      if (state.errorsSearch.length === 0) {
        valid = true;
      }
      return valid;
    }

    const searchClient = async () => {
      try {
        loadingSearch.value = true;
        state.clientSearched = {};
        state.newUser = {};
        state.accept = false;
        state.errorsSearch = [];
        if (validate()) {
          const result = await searchClientByIdNumber(commerce.value.id, state.idNumber);
          if (result) {
            state.clientSearched = result;
            if (state.clientSearched && state.clientSearched.id) {
              if (state.clientSearched.neededToInclude && state.clientSearched.neededToInclude.length > 0) {
                state.newUser = {
                  clientId: state.clientSearched.id,
                  neededToInclude: state.clientSearched.neededToInclude
                };
                sendData();
                state.showNewClient = true;
                state.showOldClient = false;
              } else {
                state.newUser = {
                  clientId: state.clientSearched.id,
                  name: state.clientSearched.name,
                  neededToInclude: state.clientSearched.neededToInclude
                };
                sendData();
              }
            }
          } else {
            state.clientSearched = undefined;
            state.idNumber = '';
            showNewClient();
          }
          if (!state.clientSearched || !state.clientSearched.id) {
            state.clientSearched = undefined;
            state.idNumber = '';
            showNewClient();
          }
        }
        loadingSearch.value = false;
      } catch (error) {
        loadingSearch.value = false;
        state.idNumber = '';
        showNewClient();
      }
    }

    const showFormInput = (commerce, name, type) => {
      if (getActiveFeature(commerce, 'attention-user-search', 'USER')) {
        if (commerce.value && commerce.value.localeInfo.country) {
          state.newUser.phoneCode = findPhoneCode(commerce.value.localeInfo.country);
        }
        if (state.clientSearched && state.clientSearched.id) {
          if (state.clientSearched.neededToInclude && state.clientSearched.neededToInclude.length > 0) {
            if (state.clientSearched.neededToInclude.includes(name)) {
              return true;
            }
          }
        } else {
          return getActiveFeature(commerce, name, type);
        }
      } else {
        return getActiveFeature(commerce, name, type);
      }
    }

    const clearClient = () => {
      state.idNumberError = false;
      state.idNumber = '';
      state.clientSearched = {};
      state.newUser = {};
      state.accept = false;
      if (commerce.value && commerce.value.localeInfo.country) {
        state.newUser.phoneCode = findPhoneCode(commerce.value.localeInfo.country);
      }
    }

    const showNewClient = () => {
      state.showNewClient = true;
      state.showOldClient = false;
      clearClient();
    }

    const showOldClient = () => {
      state.showNewClient = false;
      state.showOldClient = true;
      clearClient();
    }

    const validateCaptchaOk = (response) => {
      if(response) {
        state.captcha = true;
      }
    };

    const validateCaptchaError = () => {
      state.errorsAdd.push('clientNotifyData.validate.common.3');
    };

    const onlyNumber = ($event) => {
      let keyCode = ($event.keyCode ? $event.keyCode : $event.which);
      if ((keyCode < 48 || keyCode > 57) && keyCode !== 46) { // 46 is dot
          $event.preventDefault();
      }
    }

    const getDocumentServiceConditions = async () =>{
      try {
        if (state.fileServiceConditions) {
          const file = new Blob(
            [state.fileServiceConditions],
            { type: 'application/pdf' }
          );
          const fileURL = URL.createObjectURL(file);
          window.open(fileURL, '_blank').focus();
        }
      } catch (error) {
      }
    }

    return {
      state,
      loading,
      loadingSearch,
      commerce,
      errorsAdd,
      client,
      siteKey,
      showFormInput,
      validateCaptchaOk,
      validateCaptchaError,
      isDataActive,
      isActiveCommerce,
      getActiveFeature,
      showConditions,
      sendData,
      getAddress,
      showNewClient,
      showOldClient,
      searchClient,
      clearClient,
      onlyNumber,
      getDocumentServiceConditions
    }
  }
}
</script>
<template>
  <div>
    <div id="data" v-if="isDataActive()">
      <div v-if="isActiveCommerce()" class="choose-attention py-2 pt-3">
        <span class="fw-bold">{{ $t("commerceQueuesView.data") }}</span>
      </div>
      <div class="col col-md-10 offset-md-1 data-card">
        <div class="row g-1" v-if="getActiveFeature(commerce, 'attention-user-search', 'USER') && !client">
          <div class="col-6">
            <button
              class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
              :class="state.showNewClient ? 'btn-selected' : ''"
              @click="showNewClient">
              {{ $t("commerceQueuesView.newClient") }} <i class="bi bi-person-fill-add"></i>
            </button>
          </div>
          <div class="col-6">
            <button
              class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
              :class="state.showOldClient ? 'btn-selected' : ''"
              @click="showOldClient">
              {{ $t("commerceQueuesView.oldClient") }} <i class="bi bi-person-heart"></i>
            </button>
          </div>
        </div>
        <div class="row g-1 mt-2" v-if="state.showOldClient">
          <div class="col-10 col-md-10">
            <input
              type="number"
              class="form-control"
              v-model.trim="state.idNumber"
              v-bind:class="{ 'is-invalid': state.searchTextError }"
              :placeholder="$t('dashboard.search3')"
              @keypress="onlyNumber"
            >
          </div>
          <div class="col-2 col-md-2 centered">
            <button
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
              @click="clearClient()">
              <span><i class="bi bi-eraser-fill"></i></span>
            </button>
          </div>
          <div>
            <label class="examples"> {{ $t('clientNotifyData.validate.idNumber.example') }} </label>
          </div>
          <div class="recaptcha-area" v-if="!state.clientSearched.id">
            <div class="centered">
              <VueRecaptcha
                :sitekey="siteKey"
                :size="'compact'"
                @verify="validateCaptchaOk"
                @error="validateCaptchaError"
              ></VueRecaptcha>
            </div>
          </div>
          <div class="">
            <div class="">
              <button
                class="btn btn-sm fw-bold btn-dark rounded-pill px-5"
                @click="searchClient()"
                :disabled="state.clientSearched.id"
                >
                <span>{{ $t('dashboard.refresh') }}<i class="bi bi-search mx-1"></i></span>
              </button>
            </div>
          </div>
          <Spinner :show="loadingSearch"> </Spinner>
          <div class="row g-1 errors" id="feedback" v-if="(state.errorsSearch.length > 0)">
            <Warning>
              <template v-slot:message>
                <li v-for="(error, index) in state.errorsSearch" :key="index">
                  {{ $t(error) }}
                </li>
              </template>
            </Warning>
          </div>
          <div class="welcome-user" v-if="state.clientSearched && state.clientSearched.id">
            {{ $t("collaboratorAttentionValidate.hello-user") }}, {{ state.clientSearched.name || state.clientSearched.idNumber }}!
          </div>
          <div id="conditions" v-if="getActiveFeature(commerce, 'user-service-conditions', 'PRODUCT') && state.documentServiceConditions && state.fileServiceConditions">
            <div class="recaptcha-area form-check form-check-inline centered" v-if="state.clientSearched && state.clientSearched.id">
              <input type="checkbox" class="col-2 form-check-input mx-1" id="conditions" v-model="state.newUser.accept" @change="sendData">
              <label class="form-check-label label-conditions text-left" for="conditions"> {{ $t("clientNotifyData.accept.1") }}
                <a href="#conditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal"> {{ $t("clientNotifyData.accept.2") }}</a>
                {{ $t("clientNotifyData.accept.3") }}
                <a href="#conditions" @click="getDocumentServiceConditions()"> {{ $t("clientNotifyData.accept.4") }}</a>
              </label>
            </div>
          </div>
          <div v-else>
            <div class="recaptcha-area form-check form-check-inline centered" v-if="state.clientSearched && state.clientSearched.id">
              <input type="checkbox" class="form-check-input mx-1" id="conditions" v-model="state.newUser.accept" @change="sendData">
              <label class="form-check-label label-conditions text-left" for="conditions"> {{ $t("clientNotifyData.accept.1") }}
                <a href="#conditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal"> {{ $t("clientNotifyData.accept.2") }}</a>
              </label>
            </div>
          </div>
        </div>
        <div class="row g-1 mt-2" v-if="state.showNewClient">
          <div id="attention-name-form-add" class="row g-1" v-if="showFormInput(commerce, 'attention-user-name', 'USER')">
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
          <div id="attention-lastname-form-add" class="row g-1" v-if="showFormInput(commerce, 'attention-user-lastName', 'USER')">
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
          <div id="attention-idnumber-form-add" class="row g-1"  v-if="showFormInput(commerce, 'attention-user-idNumber', 'USER')">
            <div class="col form-floating">
              <input
                id="attention-idnumber-input-add"
                maxlength="20"
                type="text"
                class="form-control"
                v-model.trim="state.newUser.idNumber"
                placeholder="Ex. 112223334"
                @keyup="sendData"
                @keypress="onlyNumber"
                >
                <label for="attention-idnumber-input-add">{{ $t("commerceQueuesView.idNumber") }} <i class="bi bi-person-vcard"></i></label>
            </div>
            <label class="examples mt-2"> {{ $t('clientNotifyData.validate.idNumber.example') }} </label>
          </div>
          <div id="attention-email-form-add" class="row g-1"  v-if="showFormInput(commerce, 'attention-user-email', 'USER')">
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
          <div id="attention-phone-form-add" class="row g-1"  v-if="showFormInput(commerce, 'attention-user-phone', 'USER')">
            <div class="col-3 form-floating">
              <select
                class="form-control form-select btn btn-lg btn-light fw-bold text-dark select"
                v-model.trim="state.newUser.phoneCode"
                @change="sendData"
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
                @keypress="onlyNumber"
                >
                <label for="attention-phone-input-add">{{ $t("commerceQueuesView.phone") }} <i class="bi bi-phone-vibrate"></i> </label>
            </div>
            <label v-if="!state.newUser.phoneCode" class="examples mt-2"> {{ $t('clientNotifyData.validate.cellphone.example') }} </label>
            <label v-else class="examples mt-1"> {{ $t(`clientNotifyData.validate.cellphone.examples.${state.newUser.phoneCode}`) }} </label>
          </div>
          <div id="attention-birthday-form-add" class="row g-1"  v-if="showFormInput(commerce, 'attention-user-birthday', 'USER')">
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
          <div id="attention-addressCode-form-add" class="row g-1"  v-if="showFormInput(commerce, 'attention-user-address', 'USER')">
            <div class="col-12 col-md-6 form-floating">
              <input
                id="attention-addressCode-input-add"
                maxlength="10"
                type="text"
                class="form-control"
                v-model.trim="state.newUser.addressCode"
                placeholder="00000-00"
                @blur="getAddress"
                @keyup="sendData"
                @keypress="onlyNumber"
                v-bind:class="{ 'is-invalid': state.addressCodeError }"
                >
                <label for="attention-addressCode-input-add" class="label-form">{{ $t("commerceQueuesView.addressCode") }} <i class="bi bi-geo-alt-fill"></i></label>
            </div>
            <div class="col-12 col-md-6 form-floating">
              <input
                id="attention-addressComplement-input-add"
                maxlength="10"
                type="text"
                class="form-control"
                v-model.trim="state.newUser.addressComplement"
                placeholder="00000-00"
                @keyup="sendData"
                >
                <label for="attention-addressComplement-input-add" class="label-form">{{ $t("commerceQueuesView.addressComplement") }} <i class="bi bi-geo-alt-fill"></i></label>
            </div>
          </div>
          <div id="attention-addressCode-form-add" class="row g-1"  v-if="showFormInput(commerce, 'attention-user-address', 'USER')">
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
          <div id="attention-code1-form-add" class="row g-1"  v-if="showFormInput(commerce, 'attention-user-code1', 'USER')">
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
          <div id="attention-code2-form-add" class="row g-1"  v-if="showFormInput(commerce, 'attention-user-code2', 'USER')">
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
          <div id="attention-code3-form-add" class="row g-1"  v-if="showFormInput(commerce, 'attention-user-code3', 'USER')">
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
          <div id="attention-origin-form-add" class="row g-1"  v-if="showFormInput(commerce, 'attention-user-origin', 'USER')">
            <div class="col form-floating">
              <select
                class="form-control form-select btn btn-light select"
                v-model="state.newUser.origin"
                id="attention-origin-input-add"
                @change="sendData"
                >
                <option v-for="code in state.originCodes" :key="code.id" :value="code.code">{{ $t(`origin.${code.id}`) }}</option>
              </select>
              <label for="attention-origin-input-add"> {{ $t("commerceQueuesView.originText") }}</label>
            </div>
          </div>
          <div id="conditions" v-if="getActiveFeature(commerce, 'user-service-conditions', 'PRODUCT') && state.documentServiceConditions && state.fileServiceConditions">
            <div class="recaptcha-area form-check form-check-inline centered" v-if="showConditions()">
              <input type="checkbox" class="col-2 form-check-input mx-1" id="conditions" v-model="state.newUser.accept" @change="sendData">
              <label class="form-check-label label-conditions text-left" for="conditions"> {{ $t("clientNotifyData.accept.1") }}
                <a href="#conditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal"> {{ $t("clientNotifyData.accept.2") }}</a>
                {{ $t("clientNotifyData.accept.3") }}
                <a href="#conditions" @click="getDocumentServiceConditions()"> {{ $t("clientNotifyData.accept.4") }}</a>
              </label>
            </div>
          </div>
          <div v-else>
            <div class="recaptcha-area form-check form-check-inline centered" v-if="showConditions()">
              <input type="checkbox" class="form-check-input mx-1" id="conditions" v-model="state.newUser.accept" @change="sendData">
              <label class="form-check-label label-conditions text-left" for="conditions"> {{ $t("clientNotifyData.accept.1") }}
                <a href="#conditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal"> {{ $t("clientNotifyData.accept.2") }}</a>
              </label>
            </div>
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
.label-conditions {
  font-size:1rem;
  line-height: 1rem;
  margin-left: .3rem;
}
</style>