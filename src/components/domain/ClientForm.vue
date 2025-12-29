<script>
/* eslint-disable no-useless-escape, vue/no-dupe-keys, no-empty */
import { ref, reactive, onBeforeMount, watch, toRefs } from 'vue';
import { getActiveFeature } from '../../shared/features';
import { getPhoneCodes, getUserOrigin } from '../../shared/utils/data';
import { getAddressBR } from '../../application/services/address';
import { searchClientByIdNumber } from '../../application/services/client';
import { getActiveCompaniesByCommerceIdAnyType } from '../../application/services/company';
import { VueRecaptcha } from 'vue-recaptcha';
import Warning from '../../components/common/Warning.vue';
import Spinner from '../common/Spinner.vue';
import { getDocument, getDocumentByOption } from '../../application/services/document';

export default {
  name: 'ClientForm',
  components: { Warning, Spinner, VueRecaptcha },
  props: {
    show: { type: Boolean, default: false },
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
    healthAgreementId: { type: String, default: '' },
    client: { type: String, default: undefined },
    errorsAdd: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} },
    clientFront: { type: Boolean, default: true },
  },
  async setup(props) {
    const loading = ref(false);
    const loadingSearch = ref(false);
    const siteKey = import.meta.env.VITE_RECAPTCHA_CHECK;

    const {
      show,
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
      healthAgreementId,
      client,
      errorsAdd,
      clientFront,
    } = toRefs(props);

    const { receiveData } = props;

    const state = reactive({
      newUser: {},
      showCalendar: false,
      accept: true, // Default to true for streamlined flow
      captcha: false,
      phone: '',
      phoneCode: '',
      phoneCodes: [],
      originCodes: [],
      healthAgreementCompanies: [],
      addressCodeError: false,
      birthdayError: false,
      showNewClient: true,
      showOldClient: false,
      idNumber: '',
      idNumberError: '',
      documentServiceConditions: undefined,
      fileServiceConditions: undefined,
      clientSearched: {},
      errorsSearch: [],
    });

    // Birthday input helper (display dd/mm/yyyy while keeping ISO internally)
    state.birthdayInput = '';

    const pad = n => (n < 10 ? `0${n}` : `${n}`);

    const formatISOtoDisplay = iso => {
      if (!iso) return '';
      try {
        // Parse ISO format (YYYY-MM-DD) directly to avoid timezone issues
        const parts = iso.split('-');
        if (parts.length === 3) {
          const [yyyy, mm, dd] = parts;
          return `${dd}/${mm}/${yyyy}`;
        }
        // Fallback to Date parsing if format is different
        const d = new Date(iso);
        if (isNaN(d)) return '';
        return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
      } catch (e) {
        return '';
      }
    };

    const parseDisplayToISO = str => {
      if (!str) return '';
      const parts = str.split('/').map(p => p.trim());
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        const day = parseInt(dd, 10);
        const month = parseInt(mm, 10);
        const year = parseInt(yyyy, 10);

        // Validate day and month ranges
        if (day < 1 || day > 31 || month < 1 || month > 12) {
          return '';
        }

        // For months with 30 days, validate day <= 30
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        // Check leap year
        if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
          daysInMonth[1] = 29;
        }

        if (day > daysInMonth[month - 1]) {
          return '';
        }

        // Validate date is not in the future and not more than 120 years old
        const date = new Date(year, month - 1, day);
        const today = new Date();
        const minYear = today.getFullYear() - 120;

        if (year > today.getFullYear() || year < minYear) {
          return '';
        }

        // Return ISO format
        return `${yyyy.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }
      return '';
    };

    const onBirthdayInput = val => {
      // Only allow digits and /
      const cleaned = val.replace(/[^\d\/]/g, '');

      // Auto-format as dd/mm/yyyy
      if (cleaned.length > 0) {
        // Remove all slashes and work with digits only
        const digitsOnly = cleaned.replace(/\//g, '');

        let formatted = '';
        if (digitsOnly.length <= 2) {
          formatted = digitsOnly;
        } else if (digitsOnly.length <= 4) {
          formatted = digitsOnly.slice(0, 2) + '/' + digitsOnly.slice(2);
        } else if (digitsOnly.length <= 8) {
          formatted =
            digitsOnly.slice(0, 2) + '/' + digitsOnly.slice(2, 4) + '/' + digitsOnly.slice(4, 8);
        } else {
          // Limit to 8 digits (ddmmyyyy)
          formatted =
            digitsOnly.slice(0, 2) + '/' + digitsOnly.slice(2, 4) + '/' + digitsOnly.slice(4, 8);
        }

        state.birthdayInput = formatted;

        // Check if the complete formatted date is valid
        if (formatted.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const iso = parseDisplayToISO(formatted);
          if (iso) {
            state.newUser.birthday = iso;
            state.birthdayError = false;
            sendData();
          } else {
            state.birthdayError = true;
            state.newUser.birthday = '';
            sendData();
          }
        } else {
          // Incomplete date - clear error if not yet complete
          if (formatted.length < 10) {
            state.birthdayError = false;
          }
        }
      } else {
        state.birthdayInput = '';
        state.newUser.birthday = '';
        state.birthdayError = false;
        sendData();
      }
    };

    const onBirthdayFocus = () => {
      // Ensure label stays up when focusing on input with value
      // This is handled by CSS, but we can add any focus logic here if needed
    };

    const isBirthdayComplete = () => {
      if (!state.birthdayInput || state.birthdayInput.trim() === '') {
        return false;
      }
      // Check if date has complete format (dd/mm/yyyy = 10 characters)
      const formatted = state.birthdayInput.trim();
      if (formatted.length !== 10 || !formatted.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        return false;
      }
      // Check if date is valid (no error)
      return !state.birthdayError && state.newUser.birthday && state.newUser.birthday.length > 0;
    };

    const onBirthdayBlur = () => {
      if (!state.birthdayInput || state.birthdayInput.trim() === '') {
        state.newUser.birthday = '';
        state.birthdayError = false;
        return;
      }

      const iso = parseDisplayToISO(state.birthdayInput);
      if (iso) {
        state.newUser.birthday = iso;
        state.birthdayInput = formatISOtoDisplay(iso);
        state.birthdayError = false;
      } else {
        // Invalid date - mark as error
        state.birthdayError = true;
        state.newUser.birthday = '';
      }
    };

    const toggleCalendar = () => {
      state.showCalendar = !state.showCalendar;
    };

    const onCalendarSelect = val => {
      // val may be ISO string or Date; try to normalize
      let iso = '';
      if (!val) iso = '';
      else if (typeof val === 'string') iso = val.slice(0, 10);
      else if (val instanceof Date) iso = val.toISOString().slice(0, 10);
      else if (Array.isArray(val) && val[0]) {
        const d = new Date(val[0]);
        if (!isNaN(d)) iso = d.toISOString().slice(0, 10);
      }
      state.newUser.birthday = iso;
      state.birthdayInput = formatISOtoDisplay(iso);
      state.showCalendar = false;
      sendData();
    };

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.phoneCodes = getPhoneCodes();
        state.originCodes = getUserOrigin();
        if (show.value === true) {
          if (clientFront.value === true) {
            if (getActiveFeature(commerce.value, 'user-service-conditions', 'PRODUCT')) {
              state.documentServiceConditions = await getDocumentByOption(
                commerce.value.id,
                'terms_of_service'
              );
              if (
                state.documentServiceConditions &&
                state.documentServiceConditions.active === true
              ) {
                state.fileServiceConditions = await getDocument(
                  `${commerce.value.id}.pdf`,
                  'terms_of_service'
                );
              }
            }
          }
          if (getActiveFeature(commerce.value, 'attention-user-health-agreement', 'USER')) {
            state.healthAgreementCompanies = await getActiveCompaniesByCommerceIdAnyType(
              commerce.value.id,
              'HEALTH_AGREEMENT'
            );
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
            const idNumberIn = idNumber.value.replace(/[^0-9A-Za-z]/g, '');
            state.newUser.idNumber = idNumberIn !== 'undefined' ? idNumberIn : '';
          }
          if (email.value) {
            state.newUser.email = email.value !== 'undefined' ? email.value : '';
          }
          if (phone.value) {
            const phoneIn = phone.value.replace(/\D/g, '');
            if (phoneIn !== 'undefined' && phoneIn.length > 0) {
              state.phoneCode = phoneIn.slice(0, 2);
              state.phone = phoneIn.slice(2);
              state.newUser.phoneCode = state.phoneCode;
              state.newUser.phone = state.phone;
            }
          }
          if (birthday.value) {
            state.newUser.birthday = birthday.value != 'undefined' ? birthday.value : '';
          } else {
            // No predefined birthday: keep empty unless a prop value is provided
            state.newUser.birthday = '';
          }
          if (addressText.value) {
            state.newUser.addressText = addressText.value != 'undefined' ? addressText.value : '';
          }
          if (addressComplement.value) {
            state.newUser.addressComplement =
              addressComplement.value != 'undefined' ? addressComplement.value : '';
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
            state.newUser.code2 = code2.value != 'undefined' ? code2.value : '';
          }
          if (code3.value) {
            state.newUser.code3 = code3.value != 'undefined' ? code3.value : '';
          }
          if (healthAgreementId.value) {
            state.newUser.healthAgreementId =
              healthAgreementId.value != 'undefined' ? healthAgreementId.value : '';
          }
        }
        // initialize birthday display value
        state.birthdayInput = formatISOtoDisplay(state.newUser.birthday);
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    // ✅ Watch for prop changes to update form fields when props change (for edit modal)
    watch(
      [
        name,
        lastName,
        email,
        idNumber,
        phone,
        birthday,
        addressText,
        addressCode,
        addressComplement,
        origin,
        code1,
        code2,
        code3,
        healthAgreementId,
      ],
      () => {
        // ✅ Always update when props change, not just when show is true
        if (name.value) {
          state.newUser.name = name.value !== 'undefined' ? name.value : '';
        }
        if (lastName.value) {
          state.newUser.lastName = lastName.value !== 'undefined' ? lastName.value : '';
        }
        if (idNumber.value) {
          const idNumberIn = idNumber.value.replace(/[^0-9A-Za-z]/g, '');
          state.newUser.idNumber = idNumberIn !== 'undefined' ? idNumberIn : '';
        }
        if (email.value) {
          state.newUser.email = email.value !== 'undefined' ? email.value : '';
        }
        if (phone.value) {
          const phoneIn = phone.value.replace(/\D/g, '');
          if (phoneIn !== 'undefined' && phoneIn.length > 0) {
            state.phoneCode = phoneIn.slice(0, 2);
            state.phone = phoneIn.slice(2);
            state.newUser.phoneCode = state.phoneCode;
            state.newUser.phone = state.phone;
          }
        }
        // ✅ Always update birthday, checking for undefined/null/empty
        if (
          birthday.value !== undefined &&
          birthday.value !== null &&
          birthday.value !== 'undefined' &&
          birthday.value !== ''
        ) {
          state.newUser.birthday = birthday.value;
          state.birthdayInput = formatISOtoDisplay(state.newUser.birthday);
        } else {
          // ✅ Clear birthday if no value
          state.newUser.birthday = '';
          state.birthdayInput = '';
        }
        if (addressText.value !== undefined) {
          state.newUser.addressText = addressText.value != 'undefined' ? addressText.value : '';
        }
        if (addressComplement.value !== undefined) {
          state.newUser.addressComplement =
            addressComplement.value != 'undefined' ? addressComplement.value : '';
        }
        if (addressCode.value !== undefined) {
          state.newUser.addressCode = addressCode.value != 'undefined' ? addressCode.value : '';
        }
        // ✅ Always update origin, checking for undefined/null/empty
        if (
          origin.value !== undefined &&
          origin.value !== null &&
          origin.value !== 'undefined' &&
          origin.value !== ''
        ) {
          state.newUser.origin = origin.value;
        } else {
          // ✅ Clear origin if no value
          state.newUser.origin = '';
        }
        if (code1.value !== undefined) {
          state.newUser.code1 = code1.value != 'undefined' ? code1.value : '';
        }
        if (code2.value !== undefined) {
          state.newUser.code2 = code2.value != 'undefined' ? code2.value : '';
        }
        if (code3.value !== undefined) {
          state.newUser.code3 = code3.value != 'undefined' ? code3.value : '';
        }
        if (healthAgreementId.value !== undefined) {
          state.newUser.healthAgreementId =
            healthAgreementId.value != 'undefined' ? healthAgreementId.value : '';
        }

        // ✅ Debug: Log birthday and origin updates
        console.log('🔍 ClientForm - watch updated:', {
          birthdayProp: birthday.value,
          originProp: origin.value,
          stateBirthday: state.newUser.birthday,
          stateOrigin: state.newUser.origin,
          birthdayInput: state.birthdayInput,
        });
      },
      { deep: true, immediate: true },
    );

    const sendData = () => {
      state.newUser.birthdayError = state.birthdayError;
      receiveData(state.newUser);
    };

    const sendDataOnlyNumber = () => {
      if (state.newUser.idNumber && state.newUser.idNumber.length > 0) {
        const idNumber = state.newUser.idNumber.replace(
          /[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g,
          ''
        );
        state.newUser.idNumber = idNumber;
      }
      if (state.newUser.phone && state.newUser.phone.length > 0) {
        const phone = state.newUser.phone.replace(/[\s~`!@#$%^&*(){}[\];:"'<,.>?/\\|_+=-]/g, '');
        state.newUser.phone = phone;
      }
      if (state.newUser.addressCode && state.newUser.addressCode.length > 0) {
        const addressCode = state.newUser.addressCode.replace(
          /[\s~`!@#$%^&*(){}[\];:"'<,.>?/\\|_+=-]/g,
          ''
        );
        state.newUser.addressCode = addressCode;
      }
      receiveData(state.newUser);
    };

    const replaceOnlyNumber = () => {
      if (state.idNumber && state.idNumber.length > 0) {
        const idNumber = state.idNumber.replace(/[\s~`!@#$%^&*(){}[\];:"'<,.>?/\\|_+=-]/g, '');
        state.idNumber = idNumber;
      }
    };

    const isDataActive = () => {
      let active = false;
      let features = [];
      if (commerce.value !== undefined && commerce.value.features.length > 0) {
        features = commerce.value.features.filter(
          feature => feature.type === 'USER' && feature.active === true
        );
        if (features.length > 0) {
          active = true;
        }
      }
      if (!active) {
        state.accept = true;
      }
      return active;
    };

    const isActiveCommerce = () => commerce.value.active === true;

    const findPhoneCode = codeIn => {
      const search = state.phoneCodes.find(code => code.id === codeIn);
      if (search) {
        return search.code;
      }
      return '';
    };

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
    };

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
        getActiveFeature(commerce.value, 'attention-user-code3', 'USER') ||
        getActiveFeature(commerce.value, 'attention-user-health-agreement', 'USER')
      ) {
        return true;
      }
      state.accept = true; // Default to true for streamlined flow
      return false;
    };

    const validate = () => {
      let valid = false;
      if (!state.idNumber || state.idNumber.length < 8) {
        state.errorsSearch.push('dashboard.validate.search');
        state.idNumberError = true;
      }
      if (!state.captcha && !import.meta.env.DEV) {
        state.errorsSearch.push('loginData.validate.common.2');
      }
      if (state.errorsSearch.length === 0) {
        valid = true;
      }
      return valid;
    };

    const searchClient = async () => {
      try {
        loadingSearch.value = true;
        state.clientSearched = {};
        state.newUser = {};
        state.accept = true; // Default to true for streamlined flow
        state.errorsSearch = [];
        if (validate()) {
          const result = await searchClientByIdNumber(commerce.value.id, state.idNumber);
          if (result) {
            state.clientSearched = result;
            if (state.clientSearched && state.clientSearched.id) {
              // ✅ Populate ALL available client data fields
              const clientData = {
                clientId: state.clientSearched.id,
                id: state.clientSearched.id, // Also set id for compatibility
                // Basic fields
                name: state.clientSearched.name,
                lastName: state.clientSearched.lastName,
                idNumber: state.clientSearched.idNumber,
                email: state.clientSearched.email,
              };

              // Handle phone and phoneCode
              if (state.clientSearched.phone) {
                // If phoneCode is provided, use it
                if (state.clientSearched.phoneCode) {
                  clientData.phoneCode = state.clientSearched.phoneCode;
                  // Remove phone code from phone number if it starts with +
                  const phoneWithoutCode = state.clientSearched.phone.replace(/^\+\d{1,3}/, '');
                  clientData.phone = phoneWithoutCode || state.clientSearched.phone;
                } else {
                  // Try to extract phone code from phone number (format: +XX...)
                  const phoneMatch = state.clientSearched.phone.match(/^\+(\d{1,3})(.+)$/);
                  if (phoneMatch) {
                    clientData.phoneCode = phoneMatch[1];
                    clientData.phone = phoneMatch[2];
                  } else {
                    // No + prefix, use default phone code
                    clientData.phone = state.clientSearched.phone;
                    clientData.phoneCode = findPhoneCode(commerce.value.localeInfo?.country);
                  }
                }
              }

              // Personal info fields
              if (state.clientSearched.personalInfo) {
                if (state.clientSearched.personalInfo.birthday) {
                  clientData.birthday = state.clientSearched.personalInfo.birthday;
                }
                if (state.clientSearched.personalInfo.addressText) {
                  clientData.addressText = state.clientSearched.personalInfo.addressText;
                }
                if (state.clientSearched.personalInfo.addressCode) {
                  clientData.addressCode = state.clientSearched.personalInfo.addressCode;
                }
                if (state.clientSearched.personalInfo.addressComplement) {
                  clientData.addressComplement =
                    state.clientSearched.personalInfo.addressComplement;
                }
                if (state.clientSearched.personalInfo.origin) {
                  clientData.origin = state.clientSearched.personalInfo.origin;
                }
                if (state.clientSearched.personalInfo.code1) {
                  clientData.code1 = state.clientSearched.personalInfo.code1;
                }
                if (state.clientSearched.personalInfo.code2) {
                  clientData.code2 = state.clientSearched.personalInfo.code2;
                }
                if (state.clientSearched.personalInfo.code3) {
                  clientData.code3 = state.clientSearched.personalInfo.code3;
                }
                if (state.clientSearched.personalInfo.healthAgreementId) {
                  clientData.healthAgreementId =
                    state.clientSearched.personalInfo.healthAgreementId;
                }
              }

              // Needed to include for validation
              if (state.clientSearched.neededToInclude) {
                clientData.neededToInclude = state.clientSearched.neededToInclude;
              }

              state.newUser = clientData;
              sendData();

              if (
                state.clientSearched.neededToInclude &&
                state.clientSearched.neededToInclude.length > 0
              ) {
                state.showNewClient = true;
                state.showOldClient = false;
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
    };

    const showFormInput = (commerce, name, type) => {
      if (getActiveFeature(commerce, 'attention-user-search', 'USER')) {
        if (commerce.value && commerce.value.localeInfo.country) {
          state.newUser.phoneCode = findPhoneCode(commerce.value.localeInfo.country);
        }
        if (state.clientSearched && state.clientSearched.id) {
          if (
            state.clientSearched.neededToInclude &&
            state.clientSearched.neededToInclude.length > 0
          ) {
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
      return false;
    };

    const clearClient = () => {
      state.idNumberError = false;
      state.idNumber = '';
      state.clientSearched = {};
      state.newUser = {};
      state.accept = true; // Default to true for streamlined flow
      if (commerce.value && commerce.value.localeInfo.country) {
        state.newUser.phoneCode = findPhoneCode(commerce.value.localeInfo.country);
      }
    };

    const showNewClient = () => {
      state.showNewClient = true;
      state.showOldClient = false;
      clearClient();
    };

    const showOldClient = () => {
      state.showNewClient = false;
      state.showOldClient = true;
      clearClient();
    };

    const validateCaptchaOk = response => {
      if (response) {
        state.captcha = true;
      }
    };

    const validateCaptchaError = () => {
      state.errorsAdd.push('clientNotifyData.validate.common.3');
    };

    const onlyNumber = $event => {
      const keyCode = $event.keyCode ? $event.keyCode : $event.which;
      if ((keyCode < 48 || keyCode > 57) && keyCode !== 46) {
        // 46 is dot
        $event.preventDefault();
      }
    };

    const getDocumentServiceConditions = async () => {
      try {
        if (state.fileServiceConditions) {
          const file = new Blob([state.fileServiceConditions], { type: 'application/pdf' });
          const fileURL = URL.createObjectURL(file);
          window.open(fileURL, '_blank').focus();
        }
      } catch (error) {
        console.error(error);
      }
    };

    return {
      state,
      show,
      clientFront,
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
      getDocumentServiceConditions,
      sendDataOnlyNumber,
      replaceOnlyNumber,
      onBirthdayInput,
      onBirthdayFocus,
      onBirthdayBlur,
      toggleCalendar,
      onCalendarSelect,
      isBirthdayComplete,
      isDevelopment: import.meta.env.DEV,
    };
  },
};
</script>
<template>
  <div v-if="show">
    <div id="data" v-if="isDataActive()">
      <div
        v-if="isActiveCommerce() && clientFront === true"
        class="choose-attention py-2 pt-3 centered"
      >
        <i class="bi bi-1-circle-fill h5"></i>
        <span class="fw-bold h6 m-1">{{ $t('commerceQueuesView.data') }}</span>
      </div>
      <div class="col col-md-10 offset-md-1 data-card">
        <div
          class="row g-1"
          v-if="
            getActiveFeature(commerce, 'attention-user-search', 'USER') &&
            !client &&
            clientFront === true
          "
        >
          <div class="col-6">
            <button
              class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
              :class="state.showNewClient ? 'btn-selected' : ''"
              @click="showNewClient"
            >
              {{ $t('commerceQueuesView.newClient') }} <i class="bi bi-person-fill-add"></i>
            </button>
          </div>
          <div class="col-6">
            <button
              class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
              :class="state.showOldClient ? 'btn-selected' : ''"
              @click="showOldClient"
            >
              {{ $t('commerceQueuesView.oldClient') }} <i class="bi bi-person-heart"></i>
            </button>
          </div>
        </div>
        <div class="row g-1 mt-2" v-if="state.showOldClient">
          <div class="col-10 col-md-10">
            <input
              maxlength="20"
              type="text"
              class="form-control"
              v-model.trim="state.idNumber"
              :placeholder="$t('dashboard.search3')"
              @keyup="replaceOnlyNumber"
              @keypress="onlyNumber"
              @keyup.enter="searchClient"
            />
          </div>
          <div class="col-2 col-md-2 centered">
            <button
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
              @click="clearClient()"
            >
              <span><i class="bi bi-eraser-fill"></i></span>
            </button>
          </div>
          <div>
            <label class="examples centered">
              {{ $t('clientNotifyData.validate.idNumber.example') }}
            </label>
          </div>
          <div class="recaptcha-area" v-if="!state.clientSearched.id">
            <div class="centered">
              <VueRecaptcha
                v-if="siteKey && !isDevelopment"
                :sitekey="siteKey"
                :size="'compact'"
                @verify="validateCaptchaOk"
                @error="validateCaptchaError"
              ></VueRecaptcha>
              <div v-if="isDevelopment" class="dev-notice">
                <small class="text-muted">Development mode: reCAPTCHA disabled</small>
              </div>
            </div>
          </div>
          <div class="">
            <div class="centered">
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
          <div class="row g-1 errors" id="feedback" v-if="state.errorsSearch.length > 0">
            <Warning>
              <template v-slot:message>
                <li v-for="(error, index) in state.errorsSearch" :key="index">
                  {{ $t(error) }}
                </li>
              </template>
            </Warning>
          </div>
          <div class="welcome-user centered" v-if="state.clientSearched && state.clientSearched.id">
            {{ $t('collaboratorAttentionValidate.hello-user') }},
            {{ state.clientSearched.name || state.clientSearched.idNumber }}!
          </div>
          <div
            id="conditions"
            v-if="
              getActiveFeature(commerce, 'user-service-conditions', 'PRODUCT') &&
              state.documentServiceConditions &&
              state.fileServiceConditions
            "
          >
            <div
              class="recaptcha-area form-check form-check-inline centered"
              v-if="state.clientSearched && state.clientSearched.id"
            >
              <input
                type="checkbox"
                class="col-2 form-check-input mx-1"
                id="conditions"
                v-model="state.newUser.accept"
                @change="sendData"
              />
              <label class="form-check-label label-conditions text-left" for="conditions">
                {{ $t('clientNotifyData.accept.1') }}
                <a href="#conditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal">
                  {{ $t('clientNotifyData.accept.2') }}</a
                >
                {{ $t('clientNotifyData.accept.3') }}
                <a href="#conditions" @click="getDocumentServiceConditions()">
                  {{ $t('clientNotifyData.accept.4') }}</a
                >
              </label>
            </div>
          </div>
          <div v-else>
            <div
              class="recaptcha-area form-check form-check-inline centered"
              v-if="state.clientSearched && state.clientSearched.id"
            >
              <input
                type="checkbox"
                class="form-check-input mx-1"
                id="conditions"
                v-model="state.newUser.accept"
                @change="sendData"
              />
              <label class="form-check-label label-conditions text-left" for="conditions">
                {{ $t('clientNotifyData.accept.1') }}
                <a href="#conditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal">
                  {{ $t('clientNotifyData.accept.2') }}</a
                >
              </label>
            </div>
          </div>
        </div>
        <div class="row g-1 mt-2" v-if="state.showNewClient">
          <div
            id="attention-name-form-add"
            class="row g-1"
            v-if="showFormInput(commerce, 'attention-user-name', 'USER')"
          >
            <div class="col form-floating">
              <input
                id="attention-name-input-add"
                maxlength="30"
                type="text"
                class="form-control form-control-solid"
                v-model.trim="state.newUser.name"
                placeholder="Ex. Jhon"
                @keyup="sendData"
              />
              <label for="attention-name-input-add" class="label-form"
                >{{ $t('commerceQueuesView.name') }} <i class="bi bi-person"></i
              ></label>
            </div>
          </div>
          <div
            id="attention-lastname-form-add"
            class="row g-1"
            v-if="showFormInput(commerce, 'attention-user-lastName', 'USER')"
          >
            <div class="col form-floating">
              <input
                id="attention-lastname-input-add"
                maxlength="30"
                type="text"
                class="form-control form-control-solid"
                v-model.trim="state.newUser.lastName"
                placeholder="Ex. Pérez"
                @keyup="sendData"
              />
              <label for="attention-lastname-input-add"
                >{{ $t('commerceQueuesView.lastName') }} <i class="bi bi-person"></i
              ></label>
            </div>
          </div>
          <div
            id="attention-idnumber-form-add"
            class="row g-1"
            v-if="showFormInput(commerce, 'attention-user-idNumber', 'USER')"
          >
            <div class="col form-floating">
              <input
                id="attention-idnumber-input-add"
                maxlength="20"
                type="text"
                class="form-control"
                v-model.trim="state.newUser.idNumber"
                placeholder="Ex. 112223334"
                @keyup="sendDataOnlyNumber"
                @keypress="onlyNumber"
              />
              <label for="attention-idnumber-input-add"
                >{{ $t('commerceQueuesView.idNumber') }} <i class="bi bi-person-vcard"></i
              ></label>
            </div>
            <label class="examples mt-2">
              {{ $t('clientNotifyData.validate.idNumber.example') }}
            </label>
          </div>
          <div
            id="attention-email-form-add"
            class="row g-1"
            v-if="showFormInput(commerce, 'attention-user-email', 'USER')"
          >
            <div class="col form-floating">
              <input
                id="attention-email-input-add"
                maxlength="50"
                type="email"
                class="form-control"
                v-model.trim="state.newUser.email"
                placeholder="Ex. jhon@user.com"
                @keyup="sendData"
              />
              <label for="attention-lastname-input-add"
                >{{ $t('commerceQueuesView.email') }} <i class="bi bi-envelope"></i
              ></label>
            </div>
          </div>
          <div
            id="attention-phone-form-add"
            class="row g-1"
            v-if="showFormInput(commerce, 'attention-user-phone', 'USER')"
          >
            <div class="col-3 form-floating">
              <select
                class="form-control form-select btn btn-lg btn-light fw-bold text-dark select"
                v-model.trim="state.newUser.phoneCode"
                @change="sendData"
                id="attention-phoneCode-input-add"
              >
                <option v-for="code in state.phoneCodes" :key="code.id" :value="code.code">
                  {{ code.label }}
                </option>
              </select>
              <label for="attention-phoneCode-input-add">
                {{ $t('commerceQueuesView.phoneCode') }}</label
              >
            </div>
            <div class="col-9 form-floating">
              <input
                id="attention-phone-input-add"
                maxlength="15"
                type="tel"
                class="form-control"
                v-model="state.newUser.phone"
                placeholder="Ex.: 56233445533"
                @keyup="sendDataOnlyNumber"
                @keypress="onlyNumber"
              />
              <label for="attention-phone-input-add"
                >{{ $t('commerceQueuesView.phone') }} <i class="bi bi-phone-vibrate"></i>
              </label>
            </div>
            <label v-if="!state.newUser.phoneCode" class="examples mt-2">
              {{ $t('clientNotifyData.validate.cellphone.example') }}
            </label>
            <label v-else class="examples mt-1">
              {{ $t(`clientNotifyData.validate.cellphone.examples.${state.newUser.phoneCode}`) }}
            </label>
          </div>
          <div
            id="attention-birthday-form-add"
            class="row g-1"
            v-if="showFormInput(commerce, 'attention-user-birthday', 'USER')"
          >
            <div
              class="col form-floating birthday-input-wrapper"
              :class="{ 'has-value': state.birthdayInput && state.birthdayInput.trim() !== '' }"
            >
              <input
                id="attention-birthday-input-add"
                class="form-control birthday-input"
                type="text"
                :value="state.birthdayInput"
                @input="onBirthdayInput($event.target.value)"
                @blur="onBirthdayBlur"
                @keyup="sendData"
                @focus="onBirthdayFocus"
                v-bind:class="{ 'is-invalid': state.birthdayError }"
                placeholder=" "
              />
              <button
                class="btn btn-outline-secondary birthday-calendar-btn"
                type="button"
                @click.prevent="toggleCalendar"
                aria-label="Open calendar"
              >
                <i class="bi bi-calendar"></i>
              </button>
              <label for="attention-birthday-input-add"
                >{{ $t('commerceQueuesView.birthday') }} <i class="bi bi-calendar"></i
              ></label>
            </div>
            <div v-if="state.showCalendar" class="col-12 mt-2">
              <v-date-picker
                is-inline
                :model-value="state.newUser.birthday"
                @update:model-value="onCalendarSelect"
              />
            </div>
          </div>
          <div
            id="attention-addressCode-form-add"
            class="row g-1"
            v-if="showFormInput(commerce, 'attention-user-address', 'USER')"
          >
            <div class="col-12 col-md-6 form-floating">
              <input
                id="attention-addressCode-input-add"
                maxlength="10"
                type="text"
                class="form-control"
                v-model.trim="state.newUser.addressCode"
                placeholder="00000-00"
                @blur="getAddress"
                @keyup="sendDataOnlyNumber"
                @keypress="onlyNumber"
                v-bind:class="{ 'is-invalid': state.addressCodeError }"
              />
              <label for="attention-addressCode-input-add" class="label-form"
                >{{ $t('commerceQueuesView.addressCode') }} <i class="bi bi-geo-alt-fill"></i
              ></label>
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
              />
              <label for="attention-addressComplement-input-add" class="label-form"
                >{{ $t('commerceQueuesView.addressComplement') }} <i class="bi bi-geo-alt-fill"></i
              ></label>
            </div>
          </div>
          <div
            id="attention-addressCode-form-add"
            class="row g-1"
            v-if="showFormInput(commerce, 'attention-user-address', 'USER')"
          >
            <div class="col form-floating">
              <input
                id="attention-addressText-input-add"
                maxlength="80"
                type="text"
                class="form-control"
                v-model.trim="state.newUser.addressText"
                placeholder="00000-00"
                @keyup="sendData"
              />
              <label for="attention-addressText-input-add" class="label-form"
                >{{ $t('commerceQueuesView.addressText') }} <i class="bi bi-geo-alt-fill"></i
              ></label>
            </div>
          </div>
          <div
            id="attention-code1-form-add"
            class="row g-1"
            v-if="showFormInput(commerce, 'attention-user-code1', 'USER')"
          >
            <div class="col form-floating">
              <input
                id="attention-code1-input-add"
                maxlength="30"
                type="text"
                class="form-control form-control-solid"
                v-model.trim="state.newUser.code1"
                placeholder="Code 1"
                @keyup="sendData"
              />
              <label for="attention-code1-input-add" class="label-form"
                >{{ $t('commerceQueuesView.code1') }} <i class="bi bi-hash"></i
              ></label>
            </div>
          </div>
          <div
            id="attention-code2-form-add"
            class="row g-1"
            v-if="showFormInput(commerce, 'attention-user-code2', 'USER')"
          >
            <div class="col form-floating">
              <input
                id="attention-code2-input-add"
                maxlength="30"
                type="text"
                class="form-control form-control-solid"
                v-model.trim="state.newUser.code2"
                placeholder="Code 1"
                @keyup="sendData"
              />
              <label for="attention-code2-input-add" class="label-form"
                >{{ $t('commerceQueuesView.code2') }} <i class="bi bi-hash"></i
              ></label>
            </div>
          </div>
          <div
            id="attention-code3-form-add"
            class="row g-1"
            v-if="showFormInput(commerce, 'attention-user-code3', 'USER')"
          >
            <div class="col form-floating">
              <input
                id="attention-code3-input-add"
                maxlength="30"
                type="text"
                class="form-control form-control-solid"
                v-model.trim="state.newUser.code3"
                placeholder="Code 1"
                @keyup="sendData"
              />
              <label for="attention-code3-input-add" class="label-form"
                >{{ $t('commerceQueuesView.code3') }} <i class="bi bi-hash"></i
              ></label>
            </div>
          </div>
          <div
            id="attention-origin-form-add"
            class="row g-1"
            v-if="showFormInput(commerce, 'attention-user-origin', 'USER')"
          >
            <div class="col form-floating">
              <select
                class="form-control form-select btn btn-light select"
                v-model="state.newUser.origin"
                id="attention-origin-input-add"
                @change="sendData"
              >
                <option v-for="code in state.originCodes" :key="code.id" :value="code.code">
                  {{ $t(`origin.${code.id}`) }}
                </option>
              </select>
              <label for="attention-origin-input-add">
                {{ $t('commerceQueuesView.originText') }}</label
              >
            </div>
          </div>
          <div
            id="attention-health-agreement-form-add"
            class="row g-1"
            v-if="
              showFormInput(commerce, 'attention-user-health-agreement', 'USER') &&
              state.healthAgreementCompanies &&
              state.healthAgreementCompanies.length > 0
            "
          >
            <div class="col form-floating">
              <select
                class="form-control form-select btn btn-light select"
                v-model="state.newUser.healthAgreementId"
                id="attention-healthAgreementId-input-add"
                @change="sendData"
              >
                <option
                  v-for="company in state.healthAgreementCompanies"
                  :key="company.id"
                  :value="company.id"
                >
                  {{ company.tag }}
                </option>
              </select>
              <label for="attention-origin-input-add">
                {{ $t('commerceQueuesView.healthAgreementText') }}</label
              >
            </div>
          </div>
          <div
            id="conditions"
            v-if="
              getActiveFeature(commerce, 'user-service-conditions', 'PRODUCT') &&
              state.documentServiceConditions &&
              state.fileServiceConditions &&
              clientFront === true
            "
          >
            <div
              class="recaptcha-area form-check form-check-inline centered"
              v-if="showConditions()"
            >
              <input
                type="checkbox"
                class="col-2 form-check-input mx-1"
                id="conditions"
                v-model="state.newUser.accept"
                @change="sendData"
              />
              <label class="form-check-label label-conditions text-left" for="conditions">
                {{ $t('clientNotifyData.accept.1') }}
                <a href="#conditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal">
                  {{ $t('clientNotifyData.accept.2') }}</a
                >
                {{ $t('clientNotifyData.accept.3') }}
                <a href="#conditions" @click="getDocumentServiceConditions()">
                  {{ $t('clientNotifyData.accept.4') }}</a
                >
              </label>
            </div>
          </div>
          <div v-else>
            <div
              class="recaptcha-area form-check form-check-inline centered"
              v-if="showConditions() && clientFront === true"
            >
              <input
                type="checkbox"
                class="form-check-input mx-1"
                id="conditions"
                v-model="state.newUser.accept"
                @change="sendData"
              />
              <label class="form-check-label label-conditions text-left" for="conditions">
                {{ $t('clientNotifyData.accept.1') }}
                <a href="#conditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal">
                  {{ $t('clientNotifyData.accept.2') }}</a
                >
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
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1rem;
}
.form-floating > label {
  text-align: center !important;
  transform-origin: center center !important;
  font-weight: 700;
  font-size: 0.9rem;
  left: 50% !important;
  transform: translateX(-50%) !important;
  width: auto !important;
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
}

/* When label floats up (input has value or is focused) */
.form-floating > .form-control:not(:placeholder-shown) ~ label,
.form-floating > .form-control:focus ~ label,
.form-floating > .form-select:not([value='']) ~ label,
.form-floating > .form-select:focus ~ label,
.form-floating > .form-select:not([value='0']) ~ label {
  left: 50% !important;
  transform: translateX(-50%) scale(0.85) translateY(-0.5rem) !important;
}
.form-control {
  border: 1.75px solid #ced4da !important;
  border-radius: 1rem !important;
  text-align: center;
  line-height: 1.5rem;
}

/* Red border when input is invalid */
.form-control.is-invalid {
  border-color: #dc3545 !important;
}
/* Birthday input wrapper - separate input and button but visually together */
.birthday-input-wrapper {
  position: relative;
  display: flex;
  align-items: stretch;
}

.birthday-input-wrapper .birthday-input {
  flex: 1;
  border-right: 0 !important;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  padding-right: 3rem !important; /* Space for button */
}

/* Red border when date is invalid */
.birthday-input-wrapper .birthday-input.is-invalid {
  border-color: #dc3545 !important;
  border-left-color: #dc3545 !important;
  border-top-color: #dc3545 !important;
  border-bottom-color: #dc3545 !important;
}

.birthday-input-wrapper .birthday-calendar-btn {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  border-left: 1.75px solid #ced4da !important;
  border-color: #ced4da !important;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
  padding: 0.5rem 0.75rem !important;
  height: 100%;
  display: flex;
  align-items: center;
  z-index: 5;
  background-color: white;
}

.birthday-input-wrapper .birthday-calendar-btn:hover:not(:disabled) {
  background-color: #f8f9fa;
}

.birthday-input-wrapper .birthday-calendar-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #e9ecef !important;
}

/* Fix for birthday field: ensure label moves up when there's a value */
/* When input has value (not placeholder-shown) or is focused, move label up */
.birthday-input-wrapper.has-value > label,
.birthday-input-wrapper .birthday-input:not(:placeholder-shown) ~ label,
.birthday-input-wrapper .birthday-input:focus ~ label {
  opacity: 1 !important;
  transform: translateX(-50%) scale(0.85) translateY(-0.5rem) !important;
  color: rgba(0, 0, 0, 0.65) !important;
  left: 50% !important;
}

/* Ensure label stays up when input has value (even on blur) */
.birthday-input-wrapper.has-value > label {
  transform: translateX(-50%) scale(0.85) translateY(-0.5rem) !important;
  opacity: 1 !important;
  color: rgba(0, 0, 0, 0.65) !important;
  left: 50% !important;
}
.data-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
}

/* Centering utility class */
.centered {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

/* Center the main container */
#data.centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

/* Center the choose-attention header */
.choose-attention.centered {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
}

/* Center the buttons row */
.row.g-1 {
  justify-content: center;
}

/* Center the search input row */
.row.g-1.mt-2.centered {
  justify-content: center;
  align-items: center;
}

/* Center the search button */
.centered .btn {
  margin: 0 auto;
}

/* Center labels and examples */
.examples.centered {
  text-align: center;
  display: block;
  width: 100%;
}

/* Center recaptcha area */
.recaptcha-area .centered {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}
.examples {
  font-size: 0.8rem;
  line-height: 1rem;
  color: 0.5px solid var(--gris-default);
}
.label-conditions {
  font-size: 1rem;
  line-height: 1rem;
  margin-left: 0.3rem;
}
</style>
