<script>
import { ref, reactive, onBeforeMount, toRefs, computed, watch } from 'vue';
import { getPhoneCodes, getCivilStatuses, getSexs } from '../../../shared/utils/data.ts';
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
    clientData: { type: Object, default: {} },
    cacheData: { type: Object, default: {} },
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
      clientData,
      cacheData,
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

    const findPhoneCode = codeIn => {
      const search = state.phoneCodes.find(code => code.id === codeIn);
      if (search) {
        return search.code;
      }
      return '';
    };

    const calculateAge = birthday => {
      if (!birthday) return null;

      // Parse the date string to avoid timezone issues
      const parts = birthday.split('-');
      if (parts.length !== 3) return null;

      const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const today = new Date();

      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age >= 0 ? age : null;
    };

    // Computed property for calculated age - always derives from birthday
    const calculatedAge = computed(() => {
      if (state.newPersonalData.birthday) {
        return calculateAge(state.newPersonalData.birthday);
      }
      return null;
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.phoneCodes = getPhoneCodes();
        state.civilStatuses = getCivilStatuses();
        state.sexs = getSexs();
        if (patientHistoryData.value && patientHistoryData.value.id) {
          // Use deep copy to ensure Vue reactivity works correctly
          if (patientHistoryData.value.personalData) {
            state.newPersonalData = { ...patientHistoryData.value.personalData };
          }
        } else {
          if (
            commerce.value &&
            commerce.value.id &&
            commerce.value.localeInfo &&
            commerce.value.localeInfo.country
          ) {
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
          if (clientData.value && clientData.value && clientData.value.id) {
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
            // Calculate age if birthday exists
            if (state.newPersonalData.birthday) {
              state.newPersonalData.age = calculateAge(state.newPersonalData.birthday);
            }
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
            const email = clientData.value.userEmail || clientData.value.email || undefined;
            state.newPersonalData.email = email ? email : '';
            sendData();
          }
          // REMOVED: Automatic loading from preprontuario forms
          // This is now handled manually via PreprontuarioHistoryView component
        }

        // Apply cache data from preprontuario if available
        if (cacheData.value && Object.keys(cacheData.value).length > 0) {
          state.newPersonalData = { ...state.newPersonalData, ...cacheData.value };
          // Recalculate age if birthday exists after merging cache data
          if (state.newPersonalData.birthday) {
            state.newPersonalData.age = calculateAge(state.newPersonalData.birthday);
          }
          sendData();
        }

        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const sendData = () => {
      receiveData(state.newPersonalData);
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

    // Sync calculated age with newPersonalData.age whenever birthday changes
    watch(
      () => state.newPersonalData.birthday,
      newBirthday => {
        if (newBirthday) {
          state.newPersonalData.age = calculateAge(newBirthday);
          sendData();
        }
      }
    );

    watch(clientData, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        // Use deep copy to ensure Vue reactivity works correctly
        if (patientHistoryData.value.personalData) {
          state.newPersonalData = { ...patientHistoryData.value.personalData };
        }
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
          // Calculate age if birthday exists
          if (state.newPersonalData.birthday) {
            state.newPersonalData.age = calculateAge(state.newPersonalData.birthday);
          }
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
          const email = clientData.value.userEmail || clientData.value.email || undefined;
          state.newPersonalData.email = email ? email : '';
          sendData();
        }
      }
      loading.value = false;
    });

    watch(patientHistoryData, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        // Use deep copy to ensure Vue reactivity works correctly
        if (patientHistoryData.value.personalData) {
          state.newPersonalData = { ...patientHistoryData.value.personalData };
          // Recalculate age to ensure it's correct
          if (state.newPersonalData.birthday) {
            state.newPersonalData.age = calculateAge(state.newPersonalData.birthday);
          }
        }
      } else {
        // Only set defaults if there's no existing birthday data
        if (!state.newPersonalData.birthday) {
          if (commerce.value && commerce.value.localeInfo.country) {
            state.newPersonalData.phoneCode = findPhoneCode(commerce.value.localeInfo.country);
          }
          const defaultBirthday = new Date(new Date().setFullYear(new Date().getFullYear() - 18))
            .toISOString()
            .slice(0, 10);
          state.newPersonalData.birthday = defaultBirthday;
          state.newPersonalData.age = calculateAge(defaultBirthday);
          state.newPersonalData.font = true;
          sendData();
        }
      }
      loading.value = false;
    });

    watch(patientForms, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        // Use deep copy to ensure Vue reactivity works correctly
        if (patientHistoryData.value.personalData) {
          state.newPersonalData = { ...patientHistoryData.value.personalData };
        }
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
      calculatedAge,
    };
  },
};
</script>
<template>
  <div class="patient-form-modern">
    <div class="form-header-modern">
      <div class="form-header-icon">
        <i class="bi bi-person-fill"></i>
      </div>
      <div class="form-header-content">
        <h3 class="form-header-title">{{ $t('patientHistoryView.showPersonalData') }}</h3>
        <p class="form-header-subtitle">Informações pessoais e de contato do paciente</p>
      </div>
    </div>

    <div class="form-content-modern">
      <!-- Personal Information Section -->
      <div class="form-group-card">
        <div class="form-group-header">
          <i class="bi bi-person-badge form-group-icon"></i>
          <h4 class="form-group-title">Informações Pessoais</h4>
        </div>
        <div class="form-group-content">
          <div class="form-row-modern">
            <div class="form-field-modern form-field-inline">
              <label class="form-label-modern" for="patient-name">
                <i class="bi bi-person me-1"></i>
                {{ $t('patientHistoryView.name') }}
              </label>
              <input
                :disabled="!toggles['patient.history.edit']"
                id="patient-name"
                type="text"
                class="form-control-modern"
                @keyup="sendData"
                v-bind:class="{
                  'form-control-invalid': errorsAdd.includes(
                    'patientHistoryView.validate.personalData.name'
                  ),
                }"
                v-model.trim="state.newPersonalData.name"
              />
            </div>
            <div class="form-field-modern form-field-inline">
              <label class="form-label-modern" for="patient-lastName">
                <i class="bi bi-person-badge me-1"></i>
                {{ $t('patientHistoryView.lastName') }}
              </label>
              <input
                :disabled="!toggles['patient.history.edit']"
                id="patient-lastName"
                type="text"
                class="form-control-modern"
                @keyup="sendData"
                v-bind:class="{
                  'form-control-invalid': errorsAdd.includes(
                    'patientHistoryView.validate.personalData.lastName'
                  ),
                }"
                v-model.trim="state.newPersonalData.lastName"
              />
            </div>
          </div>
          <div class="form-row-modern">
            <div class="form-field-modern form-field-inline">
              <label class="form-label-modern" for="patient-idNumber">
                <i class="bi bi-card-text me-1"></i>
                {{ $t('patientHistoryView.idNumber') }}
              </label>
              <input
                :disabled="!toggles['patient.history.edit']"
                id="patient-idNumber"
                type="text"
                @keypress="onlyNumber"
                @keyup="sendData"
                class="form-control-modern"
                v-bind:class="{
                  'form-control-invalid': errorsAdd.includes(
                    'patientHistoryView.validate.personalData.idNumber'
                  ),
                }"
                v-model.trim="state.newPersonalData.idNumber"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Birth Information Section -->
      <div class="form-group-card">
        <div class="form-group-header">
          <i class="bi bi-calendar-event form-group-icon"></i>
          <h4 class="form-group-title">Data de Nascimento</h4>
        </div>
        <div class="form-group-content">
          <div class="form-row-modern">
            <div class="form-field-modern form-field-inline">
              <label class="form-label-modern" for="patient-birthday">
                <i class="bi bi-calendar3 me-1"></i>
                {{ $t('patientHistoryView.birthday') }}
              </label>
              <input
                :disabled="!toggles['patient.history.edit']"
                id="patient-birthday"
                type="date"
                class="form-control-modern"
                @keyup="sendData"
                v-bind:class="{
                  'form-control-invalid': errorsAdd.includes(
                    'patientHistoryView.validate.personalData.birthday'
                  ),
                }"
                v-model.trim="state.newPersonalData.birthday"
              />
            </div>
            <div class="form-field-modern form-field-inline">
              <label class="form-label-modern" for="patient-age">
                <i class="bi bi-clock-history me-1"></i>
                {{ $t('patientHistoryView.age') }}
              </label>
              <input
                disabled
                id="patient-age"
                type="number"
                class="form-control-modern"
                v-bind:class="{
                  'form-control-invalid': errorsAdd.includes(
                    'patientHistoryView.validate.personalData.age'
                  ),
                }"
                :value="calculatedAge"
                placeholder="Calculado automáticamente"
                title="La edad se calcula automáticamente desde la fecha de nacimiento"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Social Information Section -->
      <div class="form-group-card">
        <div class="form-group-header">
          <i class="bi bi-info-circle form-group-icon"></i>
          <h4 class="form-group-title">Informações Sociais</h4>
        </div>
        <div class="form-group-content">
          <div class="form-row-modern">
            <div class="form-field-modern form-field-inline">
              <label class="form-label-modern" for="patient-occupation">
                <i class="bi bi-briefcase me-1"></i>
                {{ $t('patientHistoryView.occupation') }}
              </label>
              <input
                :disabled="!toggles['patient.history.edit']"
                id="patient-occupation"
                type="text"
                class="form-control-modern"
                @keyup="sendData"
                v-bind:class="{
                  'form-control-invalid': errorsAdd.includes(
                    'patientHistoryView.validate.personalData.occupation'
                  ),
                }"
                v-model.trim="state.newPersonalData.occupation"
              />
            </div>
          </div>
          <div class="form-row-modern">
            <div class="form-field-modern form-field-inline">
              <label class="form-label-modern" for="patient-civilStatus">
                <i class="bi bi-heart me-1"></i>
                {{ $t('patientHistoryView.civilStatus') }}
              </label>
              <select
                id="patient-civilStatus"
                class="form-control-modern form-select-modern"
                @change="sendData"
                v-model.trim="state.newPersonalData.civilStatus"
              >
                <option value="">{{ $t('patientHistoryView.select') || 'Selecione...' }}</option>
                <option v-for="status in state.civilStatuses" :key="status.id" :value="status.id">
                  {{ $t(`civilStatuses.${status.name}`) }}
                </option>
              </select>
            </div>
            <div class="form-field-modern form-field-inline">
              <label class="form-label-modern" for="patient-sex">
                <i class="bi bi-gender-ambiguous me-1"></i>
                {{ $t('patientHistoryView.sex') }}
              </label>
              <select
                id="patient-sex"
                class="form-control-modern form-select-modern"
                @change="sendData"
                v-model.trim="state.newPersonalData.sex"
              >
                <option value="">{{ $t('patientHistoryView.select') || 'Selecione...' }}</option>
                <option v-for="status in state.sexs" :key="status.id" :value="status.id">
                  {{ $t(`sexs.${status.name}`) }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Address Section -->
      <div class="form-group-card">
        <div class="form-group-header">
          <i class="bi bi-geo-alt form-group-icon"></i>
          <h4 class="form-group-title">Endereço</h4>
        </div>
        <div class="form-group-content">
          <div class="form-row-modern">
            <div class="form-field-modern form-field-inline">
              <label class="form-label-modern" for="patient-addressCode">
                <i class="bi bi-postage me-1"></i>
                {{ $t('patientHistoryView.addressCode') }}
              </label>
              <input
                :disabled="!toggles['patient.history.edit']"
                id="patient-addressCode"
                type="text"
                class="form-control-modern"
                @blur="getAddress"
                @keypress="onlyNumber"
                @keyup="sendData"
                v-bind:class="{
                  'form-control-invalid': errorsAdd.includes(
                    'patientHistoryView.validate.personalData.addressCode'
                  ),
                }"
                v-model.trim="state.newPersonalData.addressCode"
                placeholder="00000-000"
              />
            </div>
            <div class="form-field-modern form-field-inline">
              <label class="form-label-modern" for="patient-addressComplement">
                <i class="bi bi-house me-1"></i>
                {{ $t('patientHistoryView.addressComplement') }}
              </label>
              <input
                :disabled="!toggles['patient.history.edit']"
                id="patient-addressComplement"
                type="text"
                class="form-control-modern"
                @keyup="sendData"
                v-bind:class="{
                  'form-control-invalid': errorsAdd.includes(
                    'patientHistoryView.validate.personalData.addressComplement'
                  ),
                }"
                v-model.trim="state.newPersonalData.addressComplement"
              />
            </div>
          </div>
          <div class="form-row-modern">
            <div class="form-field-modern form-field-inline">
              <label class="form-label-modern" for="patient-addressText">
                <i class="bi bi-geo-alt-fill me-1"></i>
                {{ $t('patientHistoryView.addressText') }}
              </label>
              <input
                :disabled="!toggles['patient.history.edit']"
                id="patient-addressText"
                type="text"
                class="form-control-modern"
                @keyup="sendData"
                v-bind:class="{
                  'form-control-invalid': errorsAdd.includes(
                    'patientHistoryView.validate.personalData.addressText'
                  ),
                }"
                v-model.trim="state.newPersonalData.addressText"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Contact Section -->
      <div class="form-group-card">
        <div class="form-group-header">
          <i class="bi bi-telephone form-group-icon"></i>
          <h4 class="form-group-title">Contato</h4>
        </div>
        <div class="form-group-content">
          <div class="form-row-modern">
            <div class="form-field-modern form-field-inline form-field-phone">
              <label class="form-label-modern" for="patient-phone">
                <i class="bi bi-phone me-1"></i>
                {{ $t('patientHistoryView.phone') }}
              </label>
              <select
                class="form-control-modern form-select-modern phone-code-select"
                @change="sendData"
                v-model.trim="state.newPersonalData.phoneCode"
              >
                <option v-for="code in state.phoneCodes" :key="code.id" :value="code.code">
                  {{ code.label }}
                </option>
              </select>
              <input
                :disabled="!toggles['patient.history.edit']"
                id="patient-phone"
                type="text"
                class="form-control-modern phone-number-input"
                @keypress="onlyNumber"
                @keyup="sendData"
                v-bind:class="{
                  'form-control-invalid': errorsAdd.includes(
                    'patientHistoryView.validate.personalData.phone'
                  ),
                }"
                v-model.trim="state.newPersonalData.phone"
              />
            </div>
            <div class="form-field-modern form-field-inline form-field-full-width">
              <label class="form-label-modern" for="patient-email">
                <i class="bi bi-envelope me-1"></i>
                {{ $t('patientHistoryView.email') || 'Email' }}
              </label>
              <input
                :disabled="!toggles['patient.history.edit']"
                id="patient-email"
                type="email"
                class="form-control-modern"
                @keyup="sendData"
                v-bind:class="{
                  'form-control-invalid': errorsAdd.includes(
                    'patientHistoryView.validate.personalData.email'
                  ),
                }"
                v-model.trim="state.newPersonalData.email"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Data Source Section -->
      <div class="form-group-card">
        <div class="form-group-header">
          <i class="bi bi-database form-group-icon"></i>
          <h4 class="form-group-title">Fonte dos Dados</h4>
        </div>
        <div class="form-group-content">
          <div class="form-row-modern">
            <div class="form-field-modern form-field-toggle">
              <div class="toggle-wrapper">
                <Toggle
                  v-model="state.newPersonalData.font"
                  :disabled="!toggles['patient.history.edit']"
                />
                <span class="toggle-label">
                  {{
                    state.newPersonalData.font
                      ? 'Dados fornecidos pelo paciente'
                      : 'Dados de outra fonte'
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Errors Section -->
      <div class="form-errors-modern" v-if="errorsAdd && errorsAdd.length > 0">
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
@import '../../../shared/styles/prontuario-common.css';

.patient-form-modern {
  width: 100%;
  padding: 0;
}

/* Form Header */

/* Form Content */
.form-content-modern {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Form Group Card */
.form-group-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0.5rem;
  transition: all 0.3s ease;
}

.form-group-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.form-group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.form-group-icon {
  font-size: 1.1rem;
  color: var(--azul-turno);
}

.form-group-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.form-group-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Form Rows and Fields */
.form-row-modern {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
}

.form-field-modern {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.5rem;
}

.form-field-modern.form-field-inline {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0;
}

.form-field-modern.form-field-inline .form-label-modern {
  margin-bottom: 0;
  min-width: 120px;
  flex-shrink: 0;
  font-size: 0.8rem;
}

.form-field-modern.form-field-inline .form-control-modern {
  flex: 1;
}

.form-field-modern.form-field-full-width {
  grid-column: 1 / -1;
}

.form-label-modern {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 0.35rem;
}

.form-control-modern {
  width: 100%;
  padding: 0.35rem 0.75rem;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.625rem;
  font-size: 0.85rem;
  background: white;
  transition: all 0.3s ease;
  font-family: inherit;
  z-index: 1 !important;
}

.form-control-modern:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  background: white;
}

.form-control-modern:disabled {
  background: rgba(0, 0, 0, 0.03);
  cursor: not-allowed;
  opacity: 0.7;
}

.form-control-invalid {
  border-color: #dc3545 !important;
}

.form-control-invalid:focus {
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1) !important;
}

.form-select-modern {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
}

/* Phone Input Group */
.form-field-phone {
  grid-column: 1 / -1;
}

.phone-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.form-field-inline .phone-code-select {
  flex: 0 0 120px;
  min-width: 120px;
}

.form-field-inline .phone-number-input {
  flex: 1;
}

/* Toggle Field */
.form-field-toggle {
  grid-column: 1 / -1;
}

.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 0.5rem;
}

.toggle-label {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.8;
}

/* Errors */
.form-errors-modern {
  margin-top: 0.75rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .form-row-modern {
    grid-template-columns: 1fr;
  }

  .form-header-modern {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .phone-input-group {
    flex-direction: column;
  }

  .phone-code-select {
    flex: 1;
    width: 100%;
  }
}
</style>
