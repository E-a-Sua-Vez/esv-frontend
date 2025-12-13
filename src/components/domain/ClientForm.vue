<script>
import { ref, reactive, onBeforeMount, toRefs } from 'vue';
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
      accept: false,
      captcha: false,
      phone: '',
      phoneCode: '',
      phoneCodes: [],
      originCodes: [],
      healthAgreementCompanies: [],
      addressCodeError: false,
      showNewClient: true,
      showOldClient: false,
      idNumber: '',
      idNumberError: '',
      documentServiceConditions: undefined,
      fileServiceConditions: undefined,
      clientSearched: {},
      errorsSearch: [],
      showOriginModal: false,
      showHealthAgreementModal: false,
      showPhoneCodeModal: false,
      birthdayError: false,
    });

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
            const idNumberIn = idNumber.value.replace(
              /[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g,
              ''
            );
            state.newUser.idNumber = idNumberIn !== 'undefined' ? idNumberIn : '';
          }
          if (email.value) {
            state.newUser.email = email.value !== 'undefined' ? email.value : '';
          }
          if (phone.value) {
            const phoneIn = phone.value.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '');
            state.newUser.phoneCode = phoneIn !== 'undefined' ? phoneIn.slice(0, 2) : '';
            state.newUser.phone = phoneIn !== 'undefined' ? phoneIn.slice(2, 20) : '';
          }
          if (birthday.value) {
            state.newUser.birthday = birthday.value != 'undefined' ? birthday.value : '';
          } else {
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
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const sendData = () => {
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
        const phone = state.newUser.phone.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '');
        state.newUser.phone = phone;
      }
      if (state.newUser.addressCode && state.newUser.addressCode.length > 0) {
        const addressCode = state.newUser.addressCode.replace(
          /[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g,
          ''
        );
        state.newUser.addressCode = addressCode;
      }
      receiveData(state.newUser);
    };

    // Date formatting utilities
    const formatDateForDisplay = dateString => {
      if (!dateString) return '';
      // If already in YYYY-MM-DD format, convert to DD/MM/YYYY
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
      }
      return dateString;
    };

    const formatDateForModel = dateString => {
      if (!dateString) return '';
      // If in DD/MM/YYYY format, convert to YYYY-MM-DD
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        const [day, month, year] = dateString.split('/');
        return `${year}-${month}-${day}`;
      }
      // If already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      return dateString;
    };

    // Comprehensive date validation function
    const validateDate = (dayStr, monthStr, yearStr) => {
      // Convert strings to numbers
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);

      // Get current year
      const currentYear = new Date().getFullYear();

      // Validate year: must be a valid number and not beyond current year
      if (isNaN(year) || year > currentYear || year < 1900) {
        return { valid: false, reason: 'year' };
      }

      // Validate month: must be between 01 and 12
      if (isNaN(month) || month < 1 || month > 12) {
        return { valid: false, reason: 'month' };
      }

      // Validate day: must be between 01 and 31
      if (isNaN(day) || day < 1 || day > 31) {
        return { valid: false, reason: 'day' };
      }

      // Check if day is valid for the specific month
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day > daysInMonth) {
        return { valid: false, reason: 'day' };
      }

      // Final validation: create a date object and verify it matches
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() !== year ||
        date.getMonth() + 1 !== month ||
        date.getDate() !== day
      ) {
        return { valid: false, reason: 'invalid' };
      }

      return { valid: true };
    };

    // Validate partial date as user types
    const validatePartialDate = (formattedValue) => {
      const numbers = formattedValue.replace(/\D/g, '');
      const dayStr = numbers.slice(0, 2);
      const monthStr = numbers.slice(2, 4);
      const yearStr = numbers.slice(4, 8);

      // Validate day as user types (first 2 digits)
      if (dayStr.length === 2) {
        const day = parseInt(dayStr, 10);
        if (isNaN(day) || day < 1 || day > 31) {
          return false;
        }
      } else if (dayStr.length === 1) {
        // Single digit day: allow 0-3 (could be 01-09, 10-19, 20-29, 30-31)
        const firstDigit = parseInt(dayStr, 10);
        if (isNaN(firstDigit) || firstDigit < 0 || firstDigit > 3) {
          return false;
        }
      }

      // Validate month as user types (digits 3-4)
      if (monthStr.length === 2) {
        const month = parseInt(monthStr, 10);
        if (isNaN(month) || month < 1 || month > 12) {
          return false;
        }
        // If we have both day and month, validate day against month
        if (dayStr.length === 2) {
          const day = parseInt(dayStr, 10);
          // Use a reasonable default year (current year) for validation
          const currentYear = new Date().getFullYear();
          const daysInMonth = new Date(currentYear, month, 0).getDate();
          if (day > daysInMonth) {
            return false;
          }
        }
      } else if (monthStr.length === 1) {
        // Single digit month: allow 0-1 (could be 01-09, 10-12)
        const firstDigit = parseInt(monthStr, 10);
        if (isNaN(firstDigit) || firstDigit < 0 || firstDigit > 1) {
          return false;
        }
      }

      // Validate year as user types (digits 5-8)
      if (yearStr.length === 4) {
        const currentYear = new Date().getFullYear();
        const year = parseInt(yearStr, 10);
        if (isNaN(year) || year > currentYear || year < 1900) {
          return false;
        }
        // If we have complete date, validate it comprehensively
        if (dayStr.length === 2 && monthStr.length === 2) {
          const validation = validateDate(dayStr, monthStr, yearStr);
          return validation.valid;
        }
      } else if (yearStr.length === 3) {
        // Three digits: check if it's heading towards a valid year
        const firstThree = parseInt(yearStr, 10);
        if (isNaN(firstThree) || firstThree < 190 || firstThree > 202) {
          return false;
        }
      } else if (yearStr.length === 2) {
        // Two digits: check if it's heading towards a valid year (19xx or 20xx)
        const firstTwo = parseInt(yearStr, 10);
        if (isNaN(firstTwo) || firstTwo < 19 || firstTwo > 20) {
          return false;
        }
      } else if (yearStr.length === 1) {
        // Single digit year: allow 1 or 2 (could be 19xx or 20xx)
        const firstDigit = parseInt(yearStr, 10);
        if (isNaN(firstDigit) || firstDigit < 1 || firstDigit > 2) {
          return false;
        }
      }

      return true;
    };

    const formatDateInput = value => {
      // Remove all non-numeric characters
      const numbers = value.replace(/\D/g, '');

      // Format as DD/MM/YYYY automatically as user types
      let formatted = numbers;
      if (numbers.length > 0) {
        formatted = numbers.slice(0, 2);
      }
      if (numbers.length > 2) {
        formatted = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}`;
      }
      if (numbers.length > 4) {
        formatted = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
      }

      // Limit to 10 characters (DD/MM/YYYY)
      return formatted;
    };

    const handleDateInput = event => {
      const input = event.target;
      const oldValue = input.value;
      const cursorPosition = input.selectionStart;
      const rawValue = input.value;

      // Get the raw numbers before formatting
      const numbersBefore = oldValue.replace(/\D/g, '');
      const numbersAfter = rawValue.replace(/\D/g, '');

      // If user is deleting, allow it
      if (numbersAfter.length < numbersBefore.length) {
        const formatted = formatDateInput(rawValue);
        input.value = formatted;
        state.birthdayError = false;
        state.newUser.birthday = '';
        return;
      }

      // Validate partial date as user types
      const formatted = formatDateInput(rawValue);
      const isValidPartial = validatePartialDate(formatted);

      if (!isValidPartial && formatted.replace(/\D/g, '').length > 0) {
        // Invalid input, revert to previous value
        input.value = oldValue;
        state.birthdayError = true;
        state.newUser.birthday = '';

        // Set cursor back to where it was
        setTimeout(() => {
          input.setSelectionRange(cursorPosition, cursorPosition);
        }, 0);
        return;
      }

      // Update the input value
      input.value = formatted;
      state.birthdayError = false;

      // Calculate new cursor position after formatting
      // Count how many digits were before the cursor
      const digitsBeforeCursor = oldValue.slice(0, cursorPosition).replace(/\D/g, '').length;

      // Find the position in the new formatted string that corresponds to the same number of digits
      let newCursorPosition = 0;
      let digitCount = 0;

      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitCount++;
          if (digitCount === digitsBeforeCursor) {
            newCursorPosition = i + 1;
            break;
          }
        }
        if (digitCount < digitsBeforeCursor) {
          newCursorPosition = i + 1;
        }
      }

      // If we're at the end, place cursor at the end
      if (digitsBeforeCursor >= formatted.replace(/\D/g, '').length) {
        newCursorPosition = formatted.length;
      }

      // Set cursor position after a brief delay to ensure the value is updated
      setTimeout(() => {
        input.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);

      // Convert to YYYY-MM-DD format for model only when we have a complete date
      if (formatted.length === 10) {
        const modelDate = formatDateForModel(formatted);
        if (modelDate && /^\d{4}-\d{2}-\d{2}$/.test(modelDate)) {
          // Extract day, month, year from DD/MM/YYYY format
          const [day, month, year] = formatted.split('/');

          // Comprehensive validation
          const validation = validateDate(day, month, year);

          if (validation.valid) {
            state.newUser.birthday = modelDate;
            state.birthdayError = false;
            sendData();
          } else {
            // Invalid date (e.g., 31/02/2024, 30/02/2026, etc.), show error
            state.newUser.birthday = '';
            state.birthdayError = true;
          }
        } else {
          state.newUser.birthday = '';
          state.birthdayError = true;
        }
      } else if (formatted.length < 10) {
        // Partial date, clear model value but don't show error yet
        state.newUser.birthday = '';
        state.birthdayError = false;
      }
    };

    const openDatePicker = () => {
      if (typeof document === 'undefined') return;

      const hiddenDateInput = document.getElementById('attention-birthday-input-hidden');
      const textInput = document.getElementById('attention-birthday-input-add');

      if (hiddenDateInput && textInput) {
        // Enable pointer events and position it over the text input
        hiddenDateInput.style.pointerEvents = 'auto';
        hiddenDateInput.style.cursor = 'pointer';

        // Ensure it's positioned correctly (already positioned absolutely in the same container)
        // Scroll the input into view if needed
        textInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Small delay to ensure positioning is correct
        setTimeout(() => {
          // Try modern showPicker API first (if available)
          if (typeof hiddenDateInput.showPicker === 'function') {
            try {
              const pickerPromise = hiddenDateInput.showPicker();
              // Check if it returns a Promise
              if (pickerPromise && typeof pickerPromise.catch === 'function') {
                pickerPromise.catch(() => {
                  // Fallback to click if showPicker fails
                  hiddenDateInput.focus();
                  hiddenDateInput.click();
                });
              } else {
                // If showPicker doesn't return a Promise, just use click
                hiddenDateInput.focus();
                hiddenDateInput.click();
              }
            } catch (error) {
              // Fallback to click if showPicker throws an error
              hiddenDateInput.focus();
              hiddenDateInput.click();
            }
          } else {
            // Fallback for browsers without showPicker
            hiddenDateInput.focus();
            hiddenDateInput.click();
          }

          // Reset pointer events after interaction
          setTimeout(() => {
            if (hiddenDateInput) {
              hiddenDateInput.style.pointerEvents = 'none';
            }
          }, 500);
        }, 10);
      }
    };

    const handleDatePickerChange = event => {
      const dateValue = event.target.value;
      const hiddenDateInput = event.target;

      // Reset pointer events after date selection
      if (hiddenDateInput) {
        hiddenDateInput.style.pointerEvents = 'none';
      }

      if (dateValue) {
        // Validate the date from picker (should already be valid, but double-check)
        const [year, month, day] = dateValue.split('-');
        const validation = validateDate(day, month, year);

        if (validation.valid) {
          state.newUser.birthday = dateValue;
          state.birthdayError = false;
          // Update the text input display
          if (typeof document !== 'undefined') {
            const textInput = document.getElementById('attention-birthday-input-add');
            if (textInput) {
              textInput.value = formatDateForDisplay(dateValue);
            }
          }
          sendData();
        } else {
          state.birthdayError = true;
          state.newUser.birthday = '';
        }
      }
    };

    const handleDateBlur = event => {
      const input = event.target;
      const formatted = input.value;

      // If field is empty, clear error
      if (!formatted || formatted.trim() === '') {
        state.birthdayError = false;
        state.newUser.birthday = '';
        sendData();
        return;
      }

      // If we have a complete date, validate it
      if (formatted.length === 10) {
        const [day, month, year] = formatted.split('/');
        if (day && month && year) {
          const validation = validateDate(day, month, year);
          if (validation.valid) {
            const modelDate = formatDateForModel(formatted);
            state.newUser.birthday = modelDate;
            state.birthdayError = false;
          } else {
            state.birthdayError = true;
            state.newUser.birthday = '';
          }
        } else {
          state.birthdayError = true;
          state.newUser.birthday = '';
        }
      } else {
        // Incomplete date, show error
        state.birthdayError = true;
        state.newUser.birthday = '';
      }

      sendData();
    };

    const handleDatePickerBlur = () => {
      if (typeof document === 'undefined') return;
      const el = document.getElementById('attention-birthday-input-hidden');
      if (el) {
        el.style.pointerEvents = 'none';
      }
    };

    const handleDatePaste = event => {
      event.preventDefault();
      const pastedText = (event.clipboardData || window.clipboardData).getData('text');
      // Try to parse various date formats
      let parsedDate = '';

      // Try YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(pastedText)) {
        parsedDate = formatDateForDisplay(pastedText);
      }
      // Try DD/MM/YYYY format
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(pastedText)) {
        parsedDate = pastedText;
      }
      // Try DD-MM-YYYY format
      else if (/^\d{2}-\d{2}-\d{4}$/.test(pastedText)) {
        parsedDate = pastedText.replace(/-/g, '/');
      }
      // Try to extract date from text
      else {
        const numbers = pastedText.replace(/\D/g, '');
        if (numbers.length >= 8) {
          // Assume DDMMYYYY format
          const day = numbers.slice(0, 2);
          const month = numbers.slice(2, 4);
          const year = numbers.slice(4, 8);
          parsedDate = `${day}/${month}/${year}`;
        }
      }

      if (parsedDate) {
        // Validate the pasted date
        const [day, month, year] = parsedDate.split('/');
        if (day && month && year) {
          const validation = validateDate(day, month, year);
          if (validation.valid) {
            const input = event.target;
            input.value = parsedDate;
            handleDateInput({ target: input });
          } else {
            // Invalid date, show error
            state.birthdayError = true;
            const input = event.target;
            input.value = '';
            state.newUser.birthday = '';
          }
        } else {
          const input = event.target;
          input.value = parsedDate;
          handleDateInput({ target: input });
        }
      }
    };

    const isMobileDevice = () =>
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth <= 768;

    const openOriginModal = () => {
      state.showOriginModal = true;
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    };

    const closeOriginModal = () => {
      state.showOriginModal = false;
      // Restore body scroll
      document.body.style.overflow = '';
    };

    const selectOrigin = code => {
      state.newUser.origin = code;
      sendData();
      closeOriginModal();
    };

    const getSelectedOriginLabel = () => {
      if (!state.newUser.origin) return '';
      const selected = state.originCodes.find(code => code.code === state.newUser.origin);
      return selected ? selected.id : '';
    };

    // Health Agreement modal functions
    const openHealthAgreementModal = () => {
      state.showHealthAgreementModal = true;
      document.body.style.overflow = 'hidden';
    };

    const closeHealthAgreementModal = () => {
      state.showHealthAgreementModal = false;
      document.body.style.overflow = '';
    };

    const selectHealthAgreement = id => {
      state.newUser.healthAgreementId = id;
      sendData();
      closeHealthAgreementModal();
    };

    const getSelectedHealthAgreementLabel = () => {
      if (!state.newUser.healthAgreementId) return '';
      const selected = state.healthAgreementCompanies.find(
        company => company.id === state.newUser.healthAgreementId
      );
      return selected ? selected.tag : '';
    };

    // Phone Code modal functions
    const openPhoneCodeModal = () => {
      state.showPhoneCodeModal = true;
      document.body.style.overflow = 'hidden';
    };

    const closePhoneCodeModal = () => {
      state.showPhoneCodeModal = false;
      document.body.style.overflow = '';
    };

    const selectPhoneCode = code => {
      state.newUser.phoneCode = code;
      sendData();
      closePhoneCodeModal();
    };

    const getSelectedPhoneCodeLabel = () => {
      if (!state.newUser.phoneCode) return '';
      const selected = state.phoneCodes.find(code => code.code === state.newUser.phoneCode);
      return selected ? selected.label : '';
    };

    const replaceOnlyNumber = () => {
      if (state.idNumber && state.idNumber.length > 0) {
        const idNumber = state.idNumber.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '');
        state.idNumber = idNumber;
      }
    };

    const isDataActive = () => {
      let active = false;
      let features = [];
      if (commerce.value && commerce.value.features && commerce.value.features.length > 0) {
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
      state.accept = false;
      return false;
    };

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
    };

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
              if (
                state.clientSearched.neededToInclude &&
                state.clientSearched.neededToInclude.length > 0
              ) {
                state.newUser = {
                  clientId: state.clientSearched.id,
                  neededToInclude: state.clientSearched.neededToInclude,
                };
                sendData();
                state.showNewClient = true;
                state.showOldClient = false;
              } else {
                state.newUser = {
                  clientId: state.clientSearched.id,
                  name: state.clientSearched.name,
                  neededToInclude: state.clientSearched.neededToInclude,
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
    };

    const clearClient = () => {
      state.idNumberError = false;
      state.idNumber = '';
      state.clientSearched = {};
      state.newUser = {};
      state.accept = false;
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
      } catch (error) {}
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
      formatDateForDisplay,
      handleDateInput,
      openDatePicker,
      handleDatePickerChange,
      handleDatePickerBlur,
      handleDateBlur,
      handleDatePaste,
      isMobileDevice,
      openOriginModal,
      closeOriginModal,
      selectOrigin,
      getSelectedOriginLabel,
      openHealthAgreementModal,
      closeHealthAgreementModal,
      selectHealthAgreement,
      getSelectedHealthAgreementLabel,
      openPhoneCodeModal,
      closePhoneCodeModal,
      selectPhoneCode,
      getSelectedPhoneCodeLabel,
    };
  },
};
</script>
<template>
  <div v-if="show">
    <div id="data" v-if="isDataActive()">
      <div v-if="isActiveCommerce() && clientFront === true" class="choose-attention py-2 pt-3">
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
          <div class="row g-1 errors" id="feedback" v-if="state.errorsSearch.length > 0">
            <Warning>
              <template v-slot:message>
                <li v-for="(error, index) in state.errorsSearch" :key="index">
                  {{ $t(error) }}
                </li>
              </template>
            </Warning>
          </div>
          <div class="welcome-user" v-if="state.clientSearched && state.clientSearched.id">
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
            <div class="col-3 form-floating position-relative">
              <!-- Mobile: Custom button that opens modal -->
              <button
                v-if="isMobileDevice()"
                type="button"
                class="form-control form-control-solid phone-code-select-button"
                @click="openPhoneCodeModal"
              >
                <span v-if="state.newUser.phoneCode" class="phone-code-selected-text">
                  {{ getSelectedPhoneCodeLabel() }}
                </span>
                <span v-else class="text-muted">
                  {{ $t('commerceQueuesView.phoneCode') }}
                </span>
                <i class="bi bi-chevron-down phone-code-chevron"></i>
              </button>
              <!-- Desktop: Native select -->
              <select
                v-else
                class="form-control form-control-solid form-select phone-code-select-desktop"
                v-model.trim="state.newUser.phoneCode"
                @change="sendData"
                id="attention-phoneCode-input-add"
              >
                <option v-for="code in state.phoneCodes" :key="code.id" :value="code.code">
                  {{ code.label }}
                </option>
              </select>
              <label for="attention-phoneCode-input-add" class="label-form">
                {{ $t('commerceQueuesView.phoneCode') }}
              </label>
              <!-- Mobile Modal -->
              <teleport to="body">
                <div
                  v-if="isMobileDevice() && state.showPhoneCodeModal"
                  class="modal fade show d-block phone-code-modal"
                  tabindex="-1"
                  role="dialog"
                  @click.self="closePhoneCodeModal"
                >
                  <div
                    class="modal-dialog modal-dialog-centered modal-dialog-scrollable phone-code-modal-dialog"
                    role="document"
                    @click.stop
                  >
                    <div class="modal-content phone-code-modal-content">
                      <div class="modal-header phone-code-modal-header">
                        <h5 class="modal-title fw-bold">
                          <i class="bi bi-telephone me-2"></i
                          >{{ $t('commerceQueuesView.phoneCode') }}
                        </h5>
                        <button
                          type="button"
                          class="btn-close"
                          @click="closePhoneCodeModal"
                          aria-label="Close"
                        ></button>
                      </div>
                      <div class="modal-body phone-code-modal-body">
                        <div class="phone-code-options-list">
                          <button
                            v-for="code in state.phoneCodes"
                            :key="code.id"
                            type="button"
                            class="phone-code-option-button"
                            :class="{
                              'phone-code-option-selected': state.newUser.phoneCode === code.code,
                            }"
                            @click="selectPhoneCode(code.code)"
                          >
                            <span>{{ code.label }}</span>
                            <i
                              v-if="state.newUser.phoneCode === code.code"
                              class="bi bi-check-circle-fill phone-code-check-icon"
                            ></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </teleport>
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
            <div class="col form-floating position-relative">
              <input
                id="attention-birthday-input-add"
                class="form-control form-control-solid"
                :class="{ 'is-invalid': state.birthdayError }"
                type="text"
                :value="formatDateForDisplay(state.newUser.birthday)"
                @input="handleDateInput"
                @paste="handleDatePaste"
                @blur="handleDateBlur"
                placeholder="DD/MM/YYYY"
                maxlength="10"
                inputmode="numeric"
              />
              <label for="attention-birthday-input-add" class="label-form"
                >{{ $t('commerceQueuesView.birthday') }} <i class="bi bi-calendar"></i
              ></label>
              <button
                type="button"
                class="btn btn-link position-absolute end-0 top-50 translate-middle-y me-2 p-0"
                style="z-index: 10; border: none; background: none; color: #6c757d"
                @click="openDatePicker"
                :aria-label="$t('commerceQueuesView.birthday')"
              >
                <i class="bi bi-calendar3 fs-5"></i>
              </button>
              <input
                id="attention-birthday-input-hidden"
                type="date"
                class="position-absolute"
                :value="state.newUser.birthday"
                :max="new Date().toISOString().split('T')[0]"
                @change="handleDatePickerChange"
                @blur="handleDatePickerBlur"
                style="
                  opacity: 0;
                  width: 100%;
                  height: 100%;
                  top: 0;
                  left: 0;
                  z-index: 5;
                  pointer-events: none;
                  cursor: pointer;
                "
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
            <div class="col form-floating position-relative">
              <!-- Mobile: Custom button that opens modal -->
              <button
                v-if="isMobileDevice()"
                type="button"
                class="form-control form-control-solid origin-select-button"
                @click="openOriginModal"
              >
                <span v-if="state.newUser.origin" class="origin-selected-text">
                  {{ $t(`origin.${getSelectedOriginLabel()}`) }}
                </span>
                <span v-else class="text-muted">
                  {{ $t('commerceQueuesView.originText') }}
                </span>
                <i class="bi bi-chevron-down origin-chevron"></i>
              </button>
              <!-- Desktop: Native select -->
              <select
                v-else
                class="form-control form-control-solid form-select origin-select-desktop"
                v-model="state.newUser.origin"
                id="attention-origin-input-add"
                @change="sendData"
              >
                <option value=""></option>
                <option v-for="code in state.originCodes" :key="code.id" :value="code.code">
                  {{ $t(`origin.${code.id}`) }}
                </option>
              </select>
              <label for="attention-origin-input-add" class="label-form">
                {{ $t('commerceQueuesView.originText') }} <i class="bi bi-compass"></i>
              </label>
              <!-- Mobile Modal -->
              <teleport to="body">
                <div
                  v-if="isMobileDevice() && state.showOriginModal"
                  class="modal fade show d-block origin-modal"
                  tabindex="-1"
                  role="dialog"
                  @click.self="closeOriginModal"
                >
                  <div
                    class="modal-dialog modal-dialog-centered modal-dialog-scrollable origin-modal-dialog"
                    role="document"
                    @click.stop
                  >
                    <div class="modal-content origin-modal-content">
                      <div class="modal-header origin-modal-header">
                        <h5 class="modal-title fw-bold">
                          <i class="bi bi-compass me-2"></i
                          >{{ $t('commerceQueuesView.originText') }}
                        </h5>
                        <button
                          type="button"
                          class="btn-close"
                          @click="closeOriginModal"
                          aria-label="Close"
                        ></button>
                      </div>
                      <div class="modal-body origin-modal-body">
                        <div class="origin-options-list">
                          <button
                            v-for="code in state.originCodes"
                            :key="code.id"
                            type="button"
                            class="origin-option-button"
                            :class="{
                              'origin-option-selected': state.newUser.origin === code.code,
                            }"
                            @click="selectOrigin(code.code)"
                          >
                            <span>{{ $t(`origin.${code.id}`) }}</span>
                            <i
                              v-if="state.newUser.origin === code.code"
                              class="bi bi-check-circle-fill origin-check-icon"
                            ></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </teleport>
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
            <div class="col form-floating position-relative">
              <!-- Mobile: Custom button that opens modal -->
              <button
                v-if="isMobileDevice()"
                type="button"
                class="form-control form-control-solid health-agreement-select-button"
                @click="openHealthAgreementModal"
              >
                <span v-if="state.newUser.healthAgreementId" class="health-agreement-selected-text">
                  {{ getSelectedHealthAgreementLabel() }}
                </span>
                <span v-else class="text-muted">
                  {{ $t('commerceQueuesView.healthAgreementText') }}
                </span>
                <i class="bi bi-chevron-down health-agreement-chevron"></i>
              </button>
              <!-- Desktop: Native select -->
              <select
                v-else
                class="form-control form-control-solid form-select health-agreement-select-desktop"
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
              <label for="attention-healthAgreementId-input-add" class="label-form">
                {{ $t('commerceQueuesView.healthAgreementText') }} <i class="bi bi-heart-pulse"></i>
              </label>
              <!-- Mobile Modal -->
              <teleport to="body">
                <div
                  v-if="isMobileDevice() && state.showHealthAgreementModal"
                  class="modal fade show d-block health-agreement-modal"
                  tabindex="-1"
                  role="dialog"
                  @click.self="closeHealthAgreementModal"
                >
                  <div
                    class="modal-dialog modal-dialog-centered modal-dialog-scrollable health-agreement-modal-dialog"
                    role="document"
                    @click.stop
                  >
                    <div class="modal-content health-agreement-modal-content">
                      <div class="modal-header health-agreement-modal-header">
                        <h5 class="modal-title fw-bold">
                          <i class="bi bi-heart-pulse me-2"></i
                          >{{ $t('commerceQueuesView.healthAgreementText') }}
                        </h5>
                        <button
                          type="button"
                          class="btn-close"
                          @click="closeHealthAgreementModal"
                          aria-label="Close"
                        ></button>
                      </div>
                      <div class="modal-body health-agreement-modal-body">
                        <div class="health-agreement-options-list">
                          <button
                            v-for="company in state.healthAgreementCompanies"
                            :key="company.id"
                            type="button"
                            class="health-agreement-option-button"
                            :class="{
                              'health-agreement-option-selected':
                                state.newUser.healthAgreementId === company.id,
                            }"
                            @click="selectHealthAgreement(company.id)"
                          >
                            <span>{{ company.tag }}</span>
                            <i
                              v-if="state.newUser.healthAgreementId === company.id"
                              class="bi bi-check-circle-fill health-agreement-check-icon"
                            ></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </teleport>
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
}
.form-control {
  border: 1.75px solid #ced4da !important;
  border-radius: 1rem !important;
  text-align: center;
  line-height: 1.5rem;
}
.data-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 2rem 1.5rem;
  margin-bottom: 1.5rem;
  border-radius: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  align-items: left;
}

.data-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
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
/* Origin select component styles */
.origin-select-button {
  text-align: center !important;
  cursor: pointer;
  position: relative;
  padding-right: 2.5rem !important;
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
  height: auto !important;
  min-height: 58px;
  line-height: 1.2 !important;
}

/* Hide label when using custom mobile button */
.origin-select-button + label {
  display: none;
}

/* Style for placeholder text in origin button */
.origin-select-button .text-muted {
  font-weight: 600 !important;
  color: #495057 !important;
  line-height: 1.2 !important;
}

.origin-selected-text {
  color: inherit;
  font-weight: 600;
  line-height: 1.2;
}

.origin-chevron {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
  font-size: 0.875rem;
}

/* Mobile origin modal styles */
.origin-modal {
  z-index: 1050;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.origin-modal-dialog {
  max-width: 90%;
  margin: 1rem auto;
}

.origin-modal-content {
  border-radius: 1rem;
  border: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.origin-modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom: none;
  padding: 1rem 1.25rem;
  border-radius: 1rem 1rem 0 0;
}

.origin-modal-header .btn-close {
  filter: invert(1);
  opacity: 0.9;
}

.origin-modal-header .btn-close:hover {
  opacity: 1;
}

.origin-modal-body {
  padding: 0;
  max-height: 60vh;
  overflow-y: auto;
}

.origin-options-list {
  display: flex;
  flex-direction: column;
}

.origin-option-button {
  width: 100%;
  padding: 0.875rem 1.25rem;
  border: none;
  background: white;
  text-align: left;
  font-size: 0.95rem;
  color: #212529;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.origin-option-button:last-child {
  border-bottom: none;
}

.origin-option-button:hover {
  background-color: #f8f9fa;
  padding-left: 1.5rem;
}

.origin-option-button:active {
  background-color: #e9ecef;
}

.origin-option-selected {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  color: #667eea;
  font-weight: 600;
  border-left: 3px solid #667eea;
}

.origin-option-selected:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  padding-left: 1.5rem;
}

.origin-check-icon {
  color: #667eea;
  font-size: 1.1rem;
}

.origin-select-desktop {
  text-align: center !important;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem !important;
}

/* Phone Code select component styles */
.phone-code-select-button {
  text-align: center !important;
  cursor: pointer;
  position: relative;
  padding-right: 2.5rem !important;
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
  height: auto !important;
  min-height: 58px;
  line-height: 1.2 !important;
}

/* Hide label when using custom mobile button */
.phone-code-select-button + label {
  display: none;
}

/* Style for placeholder text in phone code button */
.phone-code-select-button .text-muted {
  font-weight: 600 !important;
  color: #495057 !important;
  line-height: 1.2 !important;
}

.phone-code-selected-text {
  color: inherit;
  font-weight: 600;
  line-height: 1.2;
}

.phone-code-chevron {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
  font-size: 0.875rem;
}

.phone-code-modal {
  z-index: 1050;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.phone-code-modal-dialog {
  max-width: 90%;
  margin: 1rem auto;
}

.phone-code-modal-content {
  border-radius: 1rem;
  border: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.phone-code-modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom: none;
  padding: 1rem 1.25rem;
  border-radius: 1rem 1rem 0 0;
}

.phone-code-modal-header .btn-close {
  filter: invert(1);
  opacity: 0.9;
}

.phone-code-modal-header .btn-close:hover {
  opacity: 1;
}

.phone-code-modal-body {
  padding: 0;
  max-height: 60vh;
  overflow-y: auto;
}

.phone-code-options-list {
  display: flex;
  flex-direction: column;
}

.phone-code-option-button {
  width: 100%;
  padding: 0.875rem 1.25rem;
  border: none;
  background: white;
  text-align: left;
  font-size: 0.95rem;
  color: #212529;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.phone-code-option-button:last-child {
  border-bottom: none;
}

.phone-code-option-button:hover {
  background-color: #f8f9fa;
  padding-left: 1.5rem;
}

.phone-code-option-button:active {
  background-color: #e9ecef;
}

.phone-code-option-selected {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  color: #667eea;
  font-weight: 600;
  border-left: 3px solid #667eea;
}

.phone-code-option-selected:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  padding-left: 1.5rem;
}

.phone-code-check-icon {
  color: #667eea;
  font-size: 1.1rem;
}

.phone-code-select-desktop {
  text-align: center !important;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem !important;
}

/* Health Agreement select component styles */
.health-agreement-select-button {
  text-align: center !important;
  cursor: pointer;
  position: relative;
  padding-right: 2.5rem !important;
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
  height: auto !important;
  min-height: 58px;
  line-height: 1.2 !important;
}

/* Hide label when using custom mobile button */
.health-agreement-select-button + label {
  display: none;
}

/* Style for placeholder text in health agreement button */
.health-agreement-select-button .text-muted {
  font-weight: 600 !important;
  color: #495057 !important;
  line-height: 1.2 !important;
}

.health-agreement-selected-text {
  color: inherit;
  font-weight: 600;
  line-height: 1.2;
}

.health-agreement-chevron {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
  font-size: 0.875rem;
}

.health-agreement-modal {
  z-index: 1050;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.health-agreement-modal-dialog {
  max-width: 90%;
  margin: 1rem auto;
}

.health-agreement-modal-content {
  border-radius: 1rem;
  border: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.health-agreement-modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom: none;
  padding: 1rem 1.25rem;
  border-radius: 1rem 1rem 0 0;
}

.health-agreement-modal-header .btn-close {
  filter: invert(1);
  opacity: 0.9;
}

.health-agreement-modal-header .btn-close:hover {
  opacity: 1;
}

.health-agreement-modal-body {
  padding: 0;
  max-height: 60vh;
  overflow-y: auto;
}

.health-agreement-options-list {
  display: flex;
  flex-direction: column;
}

.health-agreement-option-button {
  width: 100%;
  padding: 0.875rem 1.25rem;
  border: none;
  background: white;
  text-align: left;
  font-size: 0.95rem;
  color: #212529;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.health-agreement-option-button:last-child {
  border-bottom: none;
}

.health-agreement-option-button:hover {
  background-color: #f8f9fa;
  padding-left: 1.5rem;
}

.health-agreement-option-button:active {
  background-color: #e9ecef;
}

.health-agreement-option-selected {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  color: #667eea;
  font-weight: 600;
  border-left: 3px solid #667eea;
}

.health-agreement-option-selected:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  padding-left: 1.5rem;
}

.health-agreement-check-icon {
  color: #667eea;
  font-size: 1.1rem;
}

.health-agreement-select-desktop {
  text-align: center !important;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem !important;
}
.position-relative .btn-link {
  cursor: pointer;
  transition: color 0.2s ease;
}
.position-relative .btn-link:hover {
  color: #495057 !important;
}
.position-relative .btn-link:active {
  color: #212529 !important;
}
.d-none {
  display: none !important;
}
</style>
