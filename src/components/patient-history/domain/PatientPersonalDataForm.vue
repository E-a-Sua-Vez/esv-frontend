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
    clientData: { type: Object, default: {} },
    patientForms: { type: Array, default: [] },
    patientHistoryData: { type: Object, default: {} },
    toggles: { type: Object, default: {} },
    errorsAdd: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} },
  },
  async setup(props) {
    const loading = ref(false);

    const {
      commerce,
      cacheData,
      clientData,
      patientForms,
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
      patientFormFirstAttention: {},
      commerce: {},
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
      fontError: false,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.phoneCodes = getPhoneCodes();
        state.civilStatuses = getCivilStatuses();
        state.sexs = getSexs();
        if (patientHistoryData.value && patientHistoryData.value.id) {
          state.newPersonalData = patientHistoryData.value.personalData;
        } else {
          if (commerce.value && commerce.value.id && commerce.value.localeInfo.country) {
            state.newPersonalData.phoneCode = findPhoneCode(commerce.value.localeInfo.country);
          }
          state.newPersonalData.birthday = new Date(
            new Date().setFullYear(new Date().getFullYear() - 18)
          )
            .toISOString()
            .slice(0, 10);
          state.newPersonalData.age = calculateAge(
            new Date(new Date().setFullYear(new Date().getFullYear() - 18))
              .toISOString()
              .slice(0, 10)
          );
          state.newPersonalData.font = true;
          if (clientData.value && clientData.value.id) {
            const phoneIn = clientData.value.userPhone || clientData.value.phone || undefined;
            state.newPersonalData.phoneCode = phoneIn ? phoneIn.slice(0, 2) : '';
            state.newPersonalData.phone = phoneIn ? phoneIn.slice(2, 20) : '';
            const name = clientData.value.userName || clientData.value.name || undefined;
            state.newPersonalData.name = name ? name : '';
            const lastName =
              clientData.value.userLastName || clientData.value.lastName || undefined;
            state.newPersonalData.lastName = lastName ? lastName : '';
            const idNumber =
              clientData.value.userIdNumber || clientData.value.idNumber || undefined;
            state.newPersonalData.idNumber = idNumber ? idNumber : '';
            const birthday =
              clientData.value.userBirthday ||
              (clientData.value.personalInfo && clientData.value.personalInfo.birthday) ||
              undefined;
            state.newPersonalData.birthday = birthday ? birthday : '';
            const addressCode =
              clientData.value.userAddressCode ||
              (clientData.value.personalInfo && clientData.value.personalInfo.addressCode) ||
              undefined;
            state.newPersonalData.addressCode = addressCode ? addressCode : '';
            const addressComplement =
              clientData.value.userAddressComplement ||
              (clientData.value.personalInfo && clientData.value.personalInfo.addressComplement) ||
              undefined;
            state.newPersonalData.addressComplement = addressComplement ? addressComplement : '';
            const addressText =
              clientData.value.userAddressText ||
              (clientData.value.personalInfo && clientData.value.personalInfo.addressText) ||
              undefined;
            state.newPersonalData.addressText = addressText ? addressText : '';
            sendData();
          }
          if (patientForms.value && patientForms.value.length > 0) {
            const patientFormFirstAttentions = patientForms.value.filter(
              form => form.type === 'FIRST_ATTENTION'
            );
            state.patientFormFirstAttention =
              patientFormFirstAttentions && patientFormFirstAttentions.length > 0
                ? patientFormFirstAttentions[0]
                : undefined;
            if (state.patientFormFirstAttention && state.patientFormFirstAttention.id) {
              if (
                state.patientFormFirstAttention.answers &&
                state.patientFormFirstAttention.answers.length > 0
              ) {
                const occupationAnswer = state.patientFormFirstAttention.answers.filter(
                  answer => answer.type === 'PATIENT_OCCUPATION'
                );
                const occupation = occupationAnswer[0].answer || undefined;
                state.newPersonalData.occupation =
                  state.newPersonalData.occupation || occupation ? occupation : '';
                const sexAnswer = state.patientFormFirstAttention.answers.filter(
                  answer => answer.type === 'PATIENT_SEX'
                );
                const sex = sexAnswer[0].answer[0] || undefined;
                state.newPersonalData.sex = state.newPersonalData.sex || sex ? sex : '';
                const civilStatusAnswer = state.patientFormFirstAttention.answers.filter(
                  answer => answer.type === 'PATIENT_CIVIL_STATUS'
                );
                const civilStatus = civilStatusAnswer[0].answer[0] || undefined;
                state.newPersonalData.civilStatus =
                  state.newPersonalData.civilStatus || civilStatus ? civilStatus : '';
                sendData();
              }
            }
          }
        }
        if (cacheData.value) {
          state.newPersonalData = cacheData.value;
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const sendData = () => {
      receiveData(state.newPersonalData);
    };

    const findPhoneCode = codeIn => {
      const search = state.phoneCodes.find(code => code.id === codeIn);
      if (search) {
        return search.code;
      }
      return '';
    };

    const calculateAge = birthday => {
      const hoy = new Date();
      const fechaNacimiento = new Date(birthday);
      let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
      const diferenciaMeses = hoy.getMonth() - fechaNacimiento.getMonth();
      if (
        diferenciaMeses < 0 ||
        (diferenciaMeses === 0 && hoy.getDate() < fechaNacimiento.getDate())
      ) {
        edad--;
      }
      return edad;
    };

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
    };

    const onlyNumber = $event => {
      const keyCode = $event.keyCode ? $event.keyCode : $event.which;
      if ((keyCode < 48 || keyCode > 57) && keyCode !== 46) {
        // 46 is dot
        $event.preventDefault();
      }
    };

    const changeBirthday = computed(() => {
      const { newPersonalData } = state;
      const birthday = newPersonalData.birthday;
      return {
        birthday,
      };
    });

    watch(clientData, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        state.newPersonalData = patientHistoryData.value.personalData;
      } else {
        if (clientData.value && clientData.value.id) {
          const phoneIn = clientData.value.userPhone || clientData.value.phone || undefined;
          state.newPersonalData.phoneCode = phoneIn ? phoneIn.slice(0, 2) : '';
          state.newPersonalData.phone = phoneIn ? phoneIn.slice(2, 20) : '';
          const name = clientData.value.userName || clientData.value.name || undefined;
          state.newPersonalData.name = name ? name : '';
          const lastName = clientData.value.userLastName || clientData.value.lastName || undefined;
          state.newPersonalData.lastName = lastName ? lastName : '';
          const idNumber = clientData.value.userIdNumber || clientData.value.idNumber || undefined;
          state.newPersonalData.idNumber = idNumber ? idNumber : '';
          const birthday =
            clientData.value.userBirthday ||
            (clientData.value.personalInfo && clientData.value.personalInfo.birthday) ||
            undefined;
          state.newPersonalData.birthday = birthday ? birthday : '';
          const addressCode =
            clientData.value.userAddressCode ||
            (clientData.value.personalInfo && clientData.value.personalInfo.addressCode) ||
            undefined;
          state.newPersonalData.addressCode = addressCode ? addressCode : '';
          const addressComplement =
            clientData.value.userAddressComplement ||
            (clientData.value.personalInfo && clientData.value.personalInfo.addressComplement) ||
            undefined;
          state.newPersonalData.addressComplement = addressComplement ? addressComplement : '';
          const addressText =
            clientData.value.userAddressText ||
            (clientData.value.personalInfo && clientData.value.personalInfo.addressText) ||
            undefined;
          state.newPersonalData.addressText = addressText ? addressText : '';
          sendData();
        }
      }
      loading.value = false;
    });

    watch(changeBirthday, async () => {
      if (state.newPersonalData.birthday) {
        state.newPersonalData.age = calculateAge(state.newPersonalData.birthday);
      }
    });

    watch(patientHistoryData, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        state.newPersonalData = patientHistoryData.value.personalData;
      } else {
        if (commerce.value && commerce.value.localeInfo.country) {
          state.newPersonalData.phoneCode = findPhoneCode(commerce.value.localeInfo.country);
        }
        state.newPersonalData.birthday = new Date(
          new Date().setFullYear(new Date().getFullYear() - 18)
        )
          .toISOString()
          .slice(0, 10);
        state.newPersonalData.age = calculateAge(
          new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0, 10)
        );
        state.newPersonalData.font = true;
        sendData();
      }
      loading.value = false;
    });

    watch(patientForms, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        state.newPersonalData = patientHistoryData.value.personalData;
      } else {
        if (patientForms.value && patientForms.value.length > 0) {
          const patientFormFirstAttentions = patientForms.value.filter(
            form => form.type === 'FIRST_ATTENTION'
          );
          state.patientFormFirstAttention =
            patientFormFirstAttentions && patientFormFirstAttentions.length > 0
              ? patientFormFirstAttentions[0]
              : undefined;
          if (state.patientFormFirstAttention && state.patientFormFirstAttention.id) {
            if (
              state.patientFormFirstAttention.answers &&
              state.patientFormFirstAttention.answers.length > 0
            ) {
              const occupationAnswer = state.patientFormFirstAttention.answers.filter(
                answer => answer.type === 'PATIENT_OCCUPATION'
              );
              const occupation = occupationAnswer[0].answer || undefined;
              state.newPersonalData.occupation = occupation ? occupation : '';
              const sexAnswer = state.patientFormFirstAttention.answers.filter(
                answer => answer.type === 'PATIENT_SEX'
              );
              const sex = sexAnswer[0].answer[0] || undefined;
              state.newPersonalData.sex = sex ? sex : '';
              const civilStatusAnswer = state.patientFormFirstAttention.answers.filter(
                answer => answer.type === 'PATIENT_CIVIL_STATUS'
              );
              const civilStatus = civilStatusAnswer[0].answer[0] || undefined;
              state.newPersonalData.civilStatus = civilStatus ? civilStatus : '';
              sendData();
            }
          }
        }
      }
      loading.value = false;
    });

    return {
      state,
      loading,
      commerce,
      toggles,
      errorsAdd,
      sendData,
      getAddress,
      onlyNumber,
    };
  },
};
</script>
<template>
  <div>
    <div id="form">
      <div class="row m-1 mb-2">
        <div class="col-12 text-label">
          {{ $t('patientHistoryView.showPersonalData') }} <i class="bi bi-person-fill mx-1"></i>
        </div>
      </div>
      <div id="patient-name-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t('patientHistoryView.name') }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            min="1"
            max="50"
            type="text"
            class="form-control form-control-sm"
            @keyup="sendData"
            v-bind:class="{
              'is-invalid': errorsAdd.includes('patientHistoryView.validate.personalData.name'),
            }"
            v-model.trim="state.newPersonalData.name"
          />
        </div>
      </div>
      <div id="patient-lastName-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t('patientHistoryView.lastName') }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            min="1"
            max="50"
            type="text"
            class="form-control form-control-sm"
            @keyup="sendData"
            v-bind:class="{
              'is-invalid': errorsAdd.includes('patientHistoryView.validate.personalData.lastName'),
            }"
            v-model.trim="state.newPersonalData.lastName"
          />
        </div>
      </div>
      <div id="patient-idNumber-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t('patientHistoryView.idNumber') }}
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
            v-bind:class="{
              'is-invalid': errorsAdd.includes('patientHistoryView.validate.personalData.idNumber'),
            }"
            v-model.trim="state.newPersonalData.idNumber"
          />
        </div>
      </div>
      <div id="patient-birthday-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t('patientHistoryView.birthday') }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            type="date"
            class="form-control form-control-sm"
            @blur="calculateAge"
            @keyup="sendData"
            v-bind:class="{
              'is-invalid': errorsAdd.includes('patientHistoryView.validate.personalData.birthday'),
            }"
            v-model.trim="state.newPersonalData.birthday"
          />
        </div>
      </div>
      <div id="patient-age-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t('patientHistoryView.age') }}
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
            v-bind:class="{
              'is-invalid': errorsAdd.includes('patientHistoryView.validate.personalData.age'),
            }"
            v-model.trim="state.newPersonalData.age"
          />
        </div>
      </div>
      <div id="patient-occupation-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t('patientHistoryView.occupation') }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            min="1"
            max="50"
            type="text"
            class="form-control form-control-sm"
            @keyup="sendData"
            v-bind:class="{
              'is-invalid': errorsAdd.includes(
                'patientHistoryView.validate.personalData.occupation'
              ),
            }"
            v-model.trim="state.newPersonalData.occupation"
          />
        </div>
      </div>
      <div id="patient-civilStatus-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t('patientHistoryView.civilStatus') }}
        </div>
        <div class="col-8">
          <select
            class="btn btn-sm btn-light fw-bold text-dark select"
            @change="sendData"
            v-model.trim="state.newPersonalData.civilStatus"
            id="attention-phoneCode-input-add"
          >
            <option v-for="status in state.civilStatuses" :key="status.id" :value="status.id">
              {{ $t(`civilStatuses.${status.name}`) }}
            </option>
          </select>
        </div>
      </div>
      <div id="patient-sex-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t('patientHistoryView.sex') }}
        </div>
        <div class="col-8">
          <select
            class="btn btn-sm btn-light fw-bold text-dark select"
            @change="sendData"
            v-model.trim="state.newPersonalData.sex"
            id="attention-phoneCode-input-add"
          >
            <option v-for="status in state.sexs" :key="status.id" :value="status.id">
              {{ $t(`sexs.${status.name}`) }}
            </option>
          </select>
        </div>
      </div>
      <div id="patient-addressCode-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t('patientHistoryView.addressCode') }}
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
            v-bind:class="{
              'is-invalid': errorsAdd.includes(
                'patientHistoryView.validate.personalData.addressCode'
              ),
            }"
            v-model.trim="state.newPersonalData.addressCode"
          />
        </div>
      </div>
      <div id="patient-addressText-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t('patientHistoryView.addressText') }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            min="1"
            max="50"
            type="text"
            class="form-control form-control-sm"
            @keyup="sendData"
            v-bind:class="{
              'is-invalid': errorsAdd.includes(
                'patientHistoryView.validate.personalData.addressText'
              ),
            }"
            v-model.trim="state.newPersonalData.addressText"
          />
        </div>
      </div>
      <div id="patient-addressComplement-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t('patientHistoryView.addressComplement') }}
        </div>
        <div class="col-8">
          <input
            :disabled="!toggles['patient.history.edit']"
            min="1"
            max="50"
            type="text"
            class="form-control form-control-sm"
            @keyup="sendData"
            v-bind:class="{
              'is-invalid': errorsAdd.includes(
                'patientHistoryView.validate.personalData.addressComplement'
              ),
            }"
            v-model.trim="state.newPersonalData.addressComplement"
          />
        </div>
      </div>
      <div id="patient-phone-form-add" class="row m-1">
        <div class="col-4 text-label">
          {{ $t('patientHistoryView.phone') }}
        </div>
        <div class="col-8">
          <div class="row">
            <div class="col-3">
              <select
                class="btn btn-sm btn-light fw-bold text-dark select"
                @change="sendData"
                v-model.trim="state.newPersonalData.phoneCode"
                id="attention-phoneCode-input-add"
              >
                <option v-for="code in state.phoneCodes" :key="code.id" :value="code.code">
                  {{ code.label }}
                </option>
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
                v-bind:class="{
                  'is-invalid': errorsAdd.includes(
                    'patientHistoryView.validate.personalData.phone'
                  ),
                }"
                v-model.trim="state.newPersonalData.phone"
              />
            </div>
          </div>
        </div>
      </div>
      <div id="patient-font-form" class="row g-1">
        <div class="col-4 text-label">
          {{ $t('patientHistoryView.font') }}
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
<style scoped></style>
