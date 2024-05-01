<script>
import { ref, reactive, onBeforeMount, toRefs, computed, watch } from 'vue';
import { getPhoneCodes, getCivilStatuses, getSexs } from '../../../shared/utils/data';
import { getAddressBR } from '../../../application/services/address';
import { VueRecaptcha } from 'vue-recaptcha';
import Warning from '../../../components/common/Warning.vue';
import Spinner from '../../common/Spinner.vue';
import Toggle from '@vueform/toggle';

export default {
  name: 'PatientPersonalDataForm',
  components: { Warning, Spinner, VueRecaptcha, Toggle },
  props: {
    commerce: { type: Object, default: {} },
    cacheData: { type: Object, default: undefined },
    patientHistoryData: { type: Object, default: {} },
    toggles: { type: Object, default: {} },
    errorsAdd: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} }
  },
  async setup(props) {

    let loading = ref(false);

    const {
      commerce,
      cacheData,
      patientHistoryData,
      toggles,
      errorsAdd,
    } = toRefs(props);

    const { receiveData } = props;

    const state = reactive({
      newPersonalData: {},
      captcha: false,
      phoneCodes: [],
      civilStatuses: [],
      sexs: [],
      idNumberError: false,
      addressCodeError: false,
      nameError: false,
      lastNameError: false,
      idNumberError: false,
      birthdayError: false,
      ageError: false,
      civilStatusError: false,
      sexError: false,
      occupationError: false,
      addressTextError: false,
      addressCodeError: false,
      addressComplementError: false,
      phoneError: false,
      fontError: false
    })

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.phoneCodes = getPhoneCodes();
        state.civilStatuses = getCivilStatuses();
        state.sexs = getSexs();
        if (patientHistoryData.value && patientHistoryData.value.id) {
          state.newPersonalData = patientHistoryData.value.personalData;
        } else {
          if (commerce.value && commerce.value.localeInfo.country) {
            state.newPersonalData.phoneCode = findPhoneCode(commerce.value.localeInfo.country);
          }
          state.newPersonalData.birthday = new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0,10);
          state.newPersonalData.age = calculateAge(new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0,10));
          state.newPersonalData.font = true;
        }
        if (cacheData.value) {
          state.newPersonalData = cacheData.value;
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    const sendData = () => {
      receiveData(state.newPersonalData);
    }

    const findPhoneCode = (codeIn) => {
      const search = state.phoneCodes.find(code => code.id === codeIn);
      if (search) {
        return search.code;
      }
      return '';
    }

    const calculateAge = (birthday) => {
      let hoy = new Date();
      let fechaNacimiento = new Date(birthday);
      let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
      let diferenciaMeses = hoy.getMonth() - fechaNacimiento.getMonth();
      if (diferenciaMeses < 0 || (diferenciaMeses === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
        edad--;
      }
      return edad;
    }

    const getAddress = async () => {
      const addressCode = state.newPersonalData.addressCode;
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
                    state.newPersonalData.addressText = `${result.logradouro}, ${result.bairro}, ${result.localidade} ${result.uf}`;
                    state.addressCodeError = false;
                  } else {
                    state.newUser.addressText = '';
                    state.addressCodeError = true;
                  }
                }
              } catch (error) {
                state.addressCodeError = true;
                state.newPersonalData.addressText = '';
              }
            }
          }
        }
      }
    }

    const onlyNumber = ($event) => {
      let keyCode = ($event.keyCode ? $event.keyCode : $event.which);
      if ((keyCode < 48 || keyCode > 57) && keyCode !== 46) { // 46 is dot
        $event.preventDefault();
      }
    }

    const changeBirthday = computed(() => {
      const { newPersonalData } = state;
      const { birthday } = newPersonalData;
      return {
        birthday
      }
    })

    watch (
      changeBirthday,
      async () => {
        if (state.newPersonalData.birthday) {
          state.newPersonalData.age = calculateAge(state.newPersonalData.birthday);
        }
      }
    )

    watch (
      patientHistoryData,
      async () => {
        loading.value = true;
        if (patientHistoryData.value && patientHistoryData.value.id) {
          state.newPersonalData = patientHistoryData.value.personalData;
        } else {
          if (commerce.value && commerce.value.localeInfo.country) {
            state.newPersonalData.phoneCode = findPhoneCode(commerce.value.localeInfo.country);
          }
          state.newPersonalData.birthday = new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0,10);
          state.newPersonalData.age = calculateAge(new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0,10));
          state.newPersonalData.font = true;
        }
        loading.value = false;
      }
    )

    return {
      state,
      loading,
      commerce,
      toggles,
      errorsAdd,
      sendData,
      getAddress,
      onlyNumber
    }
  }
}
</script>
<template>
  <div>
    <div id="form">
      <div class="row m-1 mb-2">
        <div class="col-12 text-label">
          {{ $t("patientHistoryView.showPersonalData") }} <i class="bi bi-person-fill mx-1"></i>
        </div>
      </div>
      <div id="patient-name-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t("patientHistoryView.name") }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            min="1"
            max="50"
            type="text"
            class="form-control form-control-sm"
            @keyup="sendData"
            v-bind:class="{ 'is-invalid': state.nameError }"
            v-model.trim="state.newPersonalData.name">
        </div>
      </div>
      <div id="patient-lastName-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t("patientHistoryView.lastName") }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            min="1"
            max="50"
            type="text"
            class="form-control form-control-sm"
            @keyup="sendData"
            v-bind:class="{ 'is-invalid': state.lastNameError }"
            v-model.trim="state.newPersonalData.lastName">
        </div>
      </div>
      <div id="patient-idNumber-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t("patientHistoryView.idNumber") }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            min="1"
            max="50"
            type="text"
            @keypress="onlyNumber"
            @keyup="sendData"
            class="form-control form-control-sm"
            v-bind:class="{ 'is-invalid': state.idNumberError }"
            v-model.trim="state.newPersonalData.idNumber">
        </div>
      </div>
      <div id="patient-birthday-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t("patientHistoryView.birthday") }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            type="date"
            class="form-control form-control-sm"
            @blur="calculateAge"
            @keyup="sendData"
            v-bind:class="{ 'is-invalid': state.birthdayError }"
            v-model.trim="state.newPersonalData.birthday">
        </div>
      </div>
      <div id="patient-age-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t("patientHistoryView.age") }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            min="18"
            max="100"
            type="number"
            @keypress="onlyNumber"
            @keyup="sendData"
            class="form-control form-control-sm"
            v-bind:class="{ 'is-invalid': state.ageError }"
            v-model.trim="state.newPersonalData.age">
        </div>
      </div>
      <div id="patient-occupation-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t("patientHistoryView.occupation") }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            min="1"
            max="50"
            type="text"
            class="form-control form-control-sm"
            @keyup="sendData"
            v-bind:class="{ 'is-invalid': state.occupationError }"
            v-model.trim="state.newPersonalData.occupation">
        </div>
      </div>
      <div id="patient-civilStatus-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t("patientHistoryView.civilStatus") }}
        </div>
        <div class="col-8">
          <select
            class="btn btn-sm btn-light fw-bold text-dark select"
            @change="sendData"
            v-model.trim="state.newPersonalData.civilStatus"
            id="attention-phoneCode-input-add">
            <option v-for="status in state.civilStatuses" :key="status.id" :value="status.id">{{ $t(`civilStatuses.${status.name}`) }}</option>
          </select>
        </div>
      </div>
      <div id="patient-sex-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t("patientHistoryView.sex") }}
        </div>
        <div class="col-8">
          <select
            class="btn btn-sm btn-light fw-bold text-dark select"
            @change="sendData"
            v-model.trim="state.newPersonalData.sex"
            id="attention-phoneCode-input-add">
            <option v-for="status in state.sexs" :key="status.id" :value="status.id">{{ $t(`sexs.${status.name}`) }}</option>
          </select>
        </div>
      </div>
      <div id="patient-addressCode-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t("patientHistoryView.addressCode") }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            min="1"
            max="50"
            type="text"
            class="form-control form-control-sm"
            @blur="getAddress"
            @keypress="onlyNumber"
            @keyup="sendData"
            v-bind:class="{ 'is-invalid': state.addressCodeError }"
            v-model.trim="state.newPersonalData.addressCode">
        </div>
      </div>
      <div id="patient-addressText-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t("patientHistoryView.addressText") }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            min="1"
            max="50"
            type="text"
            class="form-control form-control-sm"
            @keyup="sendData"
            v-bind:class="{ 'is-invalid': state.addressTextError }"
            v-model.trim="state.newPersonalData.addressText">
        </div>
      </div>
      <div id="patient-addressComplement-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t("patientHistoryView.addressComplement") }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            min="1"
            max="50"
            type="text"
            class="form-control form-control-sm"
            @keyup="sendData"
            v-model.trim="state.newPersonalData.addressComplement">
        </div>
      </div>
      <div id="patient-phone-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t("patientHistoryView.phone") }}
        </div>
        <div class="col-8">
          <div class="row">
            <div class="col-3">
              <select
                class="btn btn-sm btn-light fw-bold text-dark select"
                @change="sendData"
                v-model.trim="state.newPersonalData.phoneCode"
                id="attention-phoneCode-input-add">
                <option v-for="code in state.phoneCodes" :key="code.id" :value="code.code">{{ code.label }}</option>
              </select>
            </div>
            <div class="col-9">
              <input
                :disabled="!toggles['patient.history.edit']"
                min="1"
                max="50"
                type="text"
                class="form-control form-control-sm"
                @keypress="onlyNumber"
                @keyup="sendData"
                v-bind:class="{ 'is-invalid': state.phoneError }"
                v-model.trim="state.newPersonalData.phone">
            </div>
          </div>
        </div>
      </div>
      <div id="patient-font-form" class="row g-1">
        <div class="col-4 text-label">
          {{ $t("patientHistoryView.font") }}
        </div>
        <div class="col-8">
          <Toggle
            v-model="state.newPersonalData.font"
            :disabled="!toggles['patient.history.edit']"
          />
        </div>
      </div>
      <div class="row g-1 errors" id="feedback" v-if="errorsAdd && errorsAdd.length > 0">
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
</template>
<style scoped>

</style>