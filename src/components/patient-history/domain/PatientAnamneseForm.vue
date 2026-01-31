<script>
import { ref, reactive, onBeforeMount, toRefs, watch } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';
import Warning from '../../common/Warning.vue';
import Spinner from '../../common/Spinner.vue';
import Toggle from '@vueform/toggle';
import Message from '../../common/Message.vue';
import HistoryDetailsCard from '../common/HistoryDetailsCard.vue';
import TemplatePicker from '../../medical-templates/domain/TemplatePicker.vue';
import { getPatientHistoryItemFrequenciesTypes } from '../../../shared/utils/data.ts';
import { useSpeechRecognition } from '../composables/useSpeechRecognition';
import { useI18n } from 'vue-i18n';
import { globalStore } from '../../../stores';

export default {
  name: 'PatientAnamneseForm',
  components: {
    Warning,
    Spinner,
    VueRecaptcha,
    Toggle,
    Message,
    HistoryDetailsCard,
    TemplatePicker,
  },
  props: {
    commerce: { type: Object, default: {} },
    cacheData: { type: Object, default: undefined },
    patientHistoryData: { type: Object, default: {} },
    patientForms: { type: Array, default: [] },
    toggles: { type: Object, default: {} },
    errorsAdd: { type: Array, default: [] },
    patientHistoryItems: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} },
  },
  async setup(props) {
    const { t } = useI18n();
    const loading = ref(false);
    const store = globalStore();
    const currentUser = ref(null);

    onBeforeMount(async () => {
      currentUser.value = await store.getCurrentUser;
    });

    const {
      commerce,
      cacheData,
      patientForms,
      patientHistoryData,
      toggles,
      errorsAdd,
      patientHistoryItems,
    } = toRefs(props);

    const { receiveData } = props;

    const state = reactive({
      newPatientAnamnese: {},
      oldPatientAnamnese: {},
      patientHistoryItemFrequenciesTypes: [],
      patientFormFirstAttention: {},
      habitsAux: {},
      habitsList: [],
      captcha: false,
      habitsError: false,
      asc: true,
      showHistory: false,
    });

    // Load current user from store
    onBeforeMount(async () => {
      try {
        loading.value = true;
        if (patientHistoryItems.value && patientHistoryItems.value.length > 0) {
          state.habitsList = patientHistoryItems.value.filter(habit =>
            ['PERSONAL_HISTORY'].includes(habit.type)
          );
          state.habitsList = state.habitsList.sort((a, b) => a.order - b.order);
        }
        state.patientHistoryItemFrequenciesTypes = getPatientHistoryItemFrequenciesTypes();
        if (patientHistoryData.value && patientHistoryData.value.id) {
          const patientAnamnese = patientHistoryData.value.patientAnamnese;
          if (patientAnamnese) {
            state.oldPatientAnamnese = patientAnamnese;
            state.habitsAux = patientAnamnese.habitsDetails || {};
            state.newPatientAnamnese = patientAnamnese;
          }
        }
        if (!state.newPatientAnamnese || !state.newPatientAnamnese.id) {
          // REMOVED: Automatic loading from preprontuario forms
          // This is now handled manually via PreprontuarioHistoryView component
        }
        // Only use cacheData if no saved data exists in patientHistoryData
        if ((!state.newPatientAnamnese || !state.newPatientAnamnese.id) && cacheData.value) {
          state.newPatientAnamnese = cacheData.value;
          state.habitsAux = state.newPatientAnamnese?.habitsDetails || {};
        }

        // Ensure habitsAux is always an object
        if (!state.habitsAux || typeof state.habitsAux !== 'object') {
          state.habitsAux = {};
        }
        loading.value = false;
      } catch (_error) {
        loading.value = false;
      }
    });

    const sendData = () => {
      receiveData(state.newPatientAnamnese);
    };

    // Speech recognition - single instance that tracks active field
    const {
      isListening: isListeningSpeech,
      isSupported: isSpeechSupported,
      error: speechError,
      startListening: startSpeechListening,
      stopListening: stopSpeechListening,
    } = useSpeechRecognition();

    const activeSpeechField = ref(null); // Track which field is being edited: 'general' or {itemId, fieldName}

    const handleSpeechResult = interimText => {
      // Show interim results (optional)
    };

    // Create a speech result handler that captures the field in its closure
    const createSpeechResultHandler = field => finalText => {
      if (!finalText || finalText.trim() === '') {
        console.warn('⚠️ handleSpeechFinalResult: Empty final text');
        return;
      }


      if (field === 'general') {
        const currentText = state.newPatientAnamnese.habits || '';
        const newText =
          currentText && currentText.trim() !== '' ? `${currentText}\n\n${finalText}` : finalText;
        state.newPatientAnamnese.habits = newText;
      } else {
        const { itemId, fieldName } = field;

        // Ensure the item exists in habitsAux and initialize field if needed
        if (!state.habitsAux[itemId]) {
          state.habitsAux[itemId] = { id: itemId };
        }
        if (!state.habitsAux[itemId][fieldName]) {
          state.habitsAux[itemId][fieldName] = '';
        }

        const currentText = state.habitsAux[itemId][fieldName] || '';
        const newText =
          currentText && currentText.trim() !== '' ? `${currentText}\n\n${finalText}` : finalText;

        // Force reactivity by creating a new object reference for the item
        state.habitsAux[itemId] = {
          ...state.habitsAux[itemId],
          [fieldName]: newText,
        };

        // Force reactivity by reassigning the entire habitsAux object
        state.habitsAux = { ...state.habitsAux };

        // Update habitsDetails to trigger reactivity
        state.newPatientAnamnese.habitsDetails = { ...state.habitsAux };

      }

      sendData();
    };

    // Default handler that uses activeSpeechField (for backward compatibility)
    const handleSpeechFinalResult = finalText => {
      const currentField = activeSpeechField.value;

      if (!currentField) {
        console.warn('⚠️ handleSpeechFinalResult: No active speech field', {
          finalText,
          isListening: isListeningSpeech.value,
          activeField: activeSpeechField.value,
        });
        return;
      }

      // Use the captured field handler
      const handler = createSpeechResultHandler(currentField);
      handler(finalText);
    };

    const toggleSpeechRecognition = (itemId = null, fieldName = 'comment') => {
      if (isListeningSpeech.value) {
        // Only reset if we're stopping the same field that's currently active
        const currentField = activeSpeechField.value;
        const isCurrentField =
          itemId === null
            ? currentField === 'general'
            : currentField?.itemId === itemId && currentField?.fieldName === fieldName;

        if (isCurrentField) {
          stopSpeechListening();
          activeSpeechField.value = null;
        }
      } else {
        // Stop any existing recognition first
        if (isListeningSpeech.value) {
          stopSpeechListening();
        }

        // Set the active field before starting recognition
        const fieldToActivate = itemId ? { itemId, fieldName } : 'general';
        activeSpeechField.value = fieldToActivate;

        // Create a handler that captures the field in its closure
        // This ensures the field is always available even if activeSpeechField is reset
        const fieldHandler = createSpeechResultHandler(fieldToActivate);

        const language = commerce.value?.localeInfo?.language || 'pt-BR';
        // Use a unique sessionId for each field to prevent callback conflicts
        const sessionId = itemId ? `anamnese-${itemId}-${fieldName}` : 'anamnese-general';
        startSpeechListening(handleSpeechResult, fieldHandler, language, sessionId);
      }
    };

    const isListeningForField = (itemId = null) => {
      if (!isListeningSpeech.value) return false;
      if (itemId === null) {
        return activeSpeechField.value === 'general';
      }
      return activeSpeechField.value?.itemId === itemId;
    };

    const clearCommentField = itemId => {
      if (itemId && state.habitsAux[itemId]) {
        state.habitsAux[itemId].comment = '';
        state.newPatientAnamnese.habitsDetails = state.habitsAux;
        sendData();
      }
    };

    const clearGeneralField = () => {
      state.newPatientAnamnese.anamnese = '';
      sendData();
    };

    const checkAsc = event => {
      if (event.target.checked) {
        state.asc = true;
      } else {
        state.asc = false;
      }
      if (state.oldPatientAnamnese && state.oldPatientAnamnese.length > 0) {
        let elementsSorted = [];
        const elements = state.oldPatientAnamnese;
        if (state.asc) {
          elementsSorted = elements.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        } else {
          elementsSorted = elements.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        state.oldPatientAnamnese = elementsSorted;
      }
    };

    const checkItem = (item, event) => {
      if (item && item.id) {
        if (event.target.checked) {
          if (!state.habitsAux[item.id]) {
            state.habitsAux[item.id] = {
              id: item.id,
              name: item.name,
              check: true,
            };
          } else {
            state.habitsAux[item.id].check = true;
            state.habitsAux[item.id].actual = true;
          }
        } else {
          if (state.habitsAux[item.id]) {
            delete state.habitsAux[item.id];
          }
        }
        state.newPatientAnamnese.habitsDetails = state.habitsAux;
        sendData();
      }
    };

    const checkActual = (item, event) => {
      if (item && item.id) {
        if (event.target.checked) {
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].actual = true;
          }
        } else {
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].actual = false;
            state.habitsAux[item.id].ageTo = undefined;
          }
        }
        state.newPatientAnamnese.habitsDetails = state.habitsAux;
        sendData();
      }
    };

    const sendAgeFrom = (item, event) => {
      if (item && item.id) {
        if (event.target.value) {
          const age = event.target.value;
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].ageFrom = age;
          }
        } else {
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].ageFrom = undefined;
          }
        }
        state.newPatientAnamnese.habitsDetails = state.habitsAux;
        sendData();
      }
    };

    const sendAgeTo = (item, event) => {
      if (item && item.id) {
        if (event.target.value) {
          const age = event.target.value;
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].ageTo = age;
          }
        } else {
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].ageTo = undefined;
          }
        }
        state.newPatientAnamnese.habitsDetails = state.habitsAux;
        sendData();
      }
    };

    const sendComment = (item, event) => {
      if (item && item.id) {
        // Ensure the item exists in habitsAux
        if (!state.habitsAux[item.id]) {
          state.habitsAux[item.id] = { id: item.id };
        }

        if (event.target.value) {
          const comment = event.target.value;
          state.habitsAux[item.id].comment = comment;
        } else {
          state.habitsAux[item.id].comment = '';
        }

        // Force reactivity
        state.habitsAux[item.id] = { ...state.habitsAux[item.id] };
        state.newPatientAnamnese.habitsDetails = { ...state.habitsAux };
        sendData();
      }
    };

    const sendFrequency = (item, event) => {
      if (item && item.id) {
        if (event.target.value) {
          const frequency = event.target.value;
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].frequency = frequency;
          }
        } else {
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].frequency = frequency;
          }
        }
        state.newPatientAnamnese.habitsDetails = state.habitsAux;
        sendData();
      }
    };

    const sendSelectedOption = (item, event, option) => {
      if (item && item.id) {
        if (state.habitsAux[item.id] === undefined) {
          state.habitsAux[item.id] = { answer: [] };
        }
        if (event.target.checked) {
          if (!state.habitsAux[item.id].answer.includes(option)) {
            state.habitsAux[item.id].answer.push(option);
          }
        } else {
          const values = state.habitsAux[item.id];
          state.habitsAux[item.id].answer = values.answer
            ? values.answer.filter(el => el !== option)
            : values.answer;
        }
        state.newPatientAnamnese.habitsDetails = state.habitsAux;
        sendData();
      }
    };

    const sendOtherOption = (item, event) => {
      if (item && item.id) {
        if (state.habitsAux[item.id] === undefined) {
          state.habitsAux[item.id] = { answer: [] };
        } else {
          state.habitsAux[item.id] = state.habitsAux[item.id];
        }
        let option;
        if (event.target.value !== undefined && event.target.value.length > 0) {
          const options = event.target.value.toUpperCase().split(',');
          option = options
            .filter(opt => opt && opt.length > 0)
            .map(opt => opt.trim().toUpperCase());
          if (!state.habitsAux[item.id].answer.includes(option)) {
            const filtered = state.habitsAux[item.id].answer.filter(
              ans => item.characteristics.options.includes(ans) && ans.length > 0
            );
            state.habitsAux[item.id].answer = Array.from(new Set([...filtered, ...option]));
          }
        } else {
          state.habitsAux[item.id].answer = state.habitsAux[item.id].answer.filter(ans =>
            item.characteristics.options.includes(ans)
          );
        }
        state.newPatientAnamnese.habitsDetails = state.habitsAux;
        sendData();
      }
    };

    const sendCheckOption = (item, event, option) => {
      if (item && item.id) {
        if (state.habitsAux[item.id] === undefined) {
          state.habitsAux[item.id] = {};
        }
        state.habitsAux[item.id].answer = [];
        if (event.target.checked) {
          const element = option.toUpperCase();
          state.habitsAux[item.id].answer.push(element);
        }
        state.newPatientAnamnese.habitsDetails = state.habitsAux;
        sendData();
      }
    };

    const sendCheckOtherOption = (item, event, option) => {
      if (item && item.id) {
        if (state.habitsAux[item.id] === undefined) {
          state.habitsAux[item.id] = {};
        }
        let option;
        if (event.target.value !== undefined && event.target.value.length > 0) {
          option = event.target.value.toUpperCase().split(',')[0];
          state.habitsAux[item.id].answer = [];
          state.habitsAux[item.id].answer = [option];
        } else {
          state.habitsAux[item.id].answer = state.habitsAux[item.id].answer;
        }
        state.newPatientAnamnese.habitsDetails = state.habitsAux;
        sendData();
      }
    };

    const sendOptionYesNo = (item, event) => {
      if (item && item.id) {
        if (event.target.checked !== undefined) {
          const option = event.target.checked ? 'YES' : 'NO';
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].answer = { answer: option };
          }
          if (option === 'NO') {
            state.habitsAux[item.id].result = '';
          }
        } else {
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].answer = { answer: option };
          }
        }
        state.newPatientAnamnese.habitsDetails = state.habitsAux;
        sendData();
      }
    };

    const sendResult = (item, event) => {
      if (item && item.id) {
        if (state.habitsAux[item.id] === undefined) {
          state.habitsAux[item.id] = {};
        }
        let option;
        if (event.target.value !== undefined && event.target.value.length > 0) {
          option = event.target.value.toUpperCase().split(',');
          if (!state.habitsAux[item.id].result.includes(option)) {
            state.habitsAux[item.id].result = Array.from(
              new Set([...state.habitsAux[item.id].result, ...option])
            );
          }
        } else {
          state.habitsAux[item.id].result = state.habitsAux[item.id].result.filter(ans =>
            item.characteristics.options.includes(ans)
          );
        }
        state.newPatientAnamnese.habitsDetails = state.habitsAux;
        sendData();
      }
    };

    watch(patientHistoryData, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        if (
          patientHistoryData.value.patientAnamnese &&
          patientHistoryData.value.patientAnamnese.length > 0 &&
          patientHistoryData.value.patientAnamnese[0]
        )
          state.oldPatientAnamnese = patientHistoryData.value.patientAnamnese;
      }
      loading.value = false;
    });

    watch(patientForms, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        if (
          patientHistoryData.value.patientAnamnese &&
          patientHistoryData.value.patientAnamnese.length > 0 &&
          patientHistoryData.value.patientAnamnese[0]
        )
          state.oldPatientAnamnese = patientHistoryData.value.patientAnamnese;
        state.newPatientAnamnese = patientHistoryData.value.patientAnamnese;
      }
      // REMOVED: Automatic loading from preprontuario forms
      // This is now handled manually via PreprontuarioHistoryView component
      loading.value = false;
    });

    return {
      state,
      loading,
      commerce,
      toggles,
      errorsAdd,
      store,
      sendData,
      checkAsc,
      checkItem,
      checkActual,
      sendAgeFrom,
      sendAgeTo,
      sendComment,
      sendFrequency,
      sendSelectedOption,
      sendOptionYesNo,
      isListeningSpeech,
      isSpeechSupported,
      speechError,
      toggleSpeechRecognition,
      isListeningForField,
      clearCommentField,
      clearGeneralField,
      sendOtherOption,
      sendResult,
      sendCheckOption,
      sendCheckOtherOption,
      currentUser,
      // Template methods
      handleTemplateSelected: template => {
        if (template && template.content) {
          // Append template content to habits field
          const currentText = state.newPatientAnamnese.habits || '';
          const templateText = template.content;
          const newText =
            currentText && currentText.trim() !== ''
              ? `${currentText}\n\n${templateText}`
              : templateText;
          state.newPatientAnamnese.habits = newText;
          // Trigger data send
          sendData();
        }
      },
    };
  },
};
</script>
<template>
  <div class="patient-form-modern anamnese-form">
    <div class="form-header-modern">
      <div class="form-header-icon">
        <i class="bi bi-clipboard-heart-fill"></i>
      </div>
      <div class="form-header-content">
        <h3 class="form-header-title">{{ $t('patientHistoryView.patientAnamnese') }}</h3>
        <p class="form-header-subtitle">História pessoal e anamnese do paciente</p>
      </div>
    </div>

    <!-- Dynamic Items Container -->
    <div class="anamnese-items-container">
      <div v-for="item in state.habitsList" :key="item.id">
        <div v-if="item.active === true && item.online === true">
          <!-- SELECT 1 (Radio) -->
          <div
            v-if="item.characteristics && item.characteristics.select1"
            class="anamnese-item-card"
          >
            <div class="anamnese-item-header">
              <span class="badge badge-primary">{{ item.tag }}</span>
              <h5 class="anamnese-item-title">{{ item.name }}</h5>
            </div>
            <div class="anamnese-item-content">
              <div class="options-group">
                <div
                  v-for="(option, index) in item.characteristics.options.split(',')"
                  :key="`option-${index}`"
                  class="option-item"
                >
                  <input
                    class="form-check-input option-radio"
                    type="radio"
                    :name="`check-${item.id}-${index}`"
                    :id="`option-${item.id}-${index}`"
                    :checked="state.habitsAux[item.id]?.answer?.includes(option.toUpperCase())"
                    @click="sendCheckOption(item, $event, option)"
                  />
                  <label class="option-label" :for="`option-${item.id}-${index}`">
                    {{ option.toUpperCase().trim() }}
                  </label>
                </div>
              </div>
              <div class="form-field-modern">
                <input
                  class="form-control-modern"
                  type="text"
                  maxlength="50"
                  placeholder="Outro..."
                  :value="
                    state.habitsAux[item.id]?.answer?.filter(
                      ans =>
                        !item.characteristics.options
                          .toUpperCase()
                          .split(',')
                          .includes(ans.toUpperCase())
                    )?.[0] || ''
                  "
                  @blur="sendCheckOtherOption(item, $event)"
                />
              </div>
              <div
                v-if="item.characteristics.comment && item.characteristics.comment === true"
                class="form-field-modern"
              >
                <label
                  class="form-label-modern d-flex align-items-center flex-wrap"
                  :for="`comment-select1-${item.id}`"
                >
                  <i class="bi bi-chat-text me-1"></i>
                  {{ $t('businessPatientHistoryItemAdmin.comment') }}
                  <button
                    v-if="isSpeechSupported && toggles['patient.history.edit']"
                    type="button"
                    class="btn btn-sm ms-2 btn-outline-secondary d-flex align-items-center"
                    :class="{ 'btn-danger': isListeningForField(item.id) }"
                    @click="toggleSpeechRecognition(item.id, 'comment')"
                    :title="
                      isListeningForField(item.id)
                        ? $t('patientHistoryView.stopRecording')
                        : $t('patientHistoryView.startRecording')
                    "
                  >
                    <i :class="isListeningForField(item.id) ? 'bi bi-mic-fill' : 'bi bi-mic'"></i>
                  </button>
                  <button
                    v-if="toggles['patient.history.edit']"
                    type="button"
                    class="btn btn-sm ms-2 btn-outline-secondary d-flex align-items-center"
                    @click="clearCommentField(item.id)"
                    :title="$t('patientHistoryView.clearField')"
                  >
                    <i class="bi bi-eraser"></i>
                  </button>
                </label>
                <div class="position-relative">
                  <textarea
                    :id="`comment-select1-${item.id}`"
                    :disabled="!toggles['patient.history.edit']"
                    class="form-control-modern"
                    rows="3"
                    :max="200"
                    :value="state.habitsAux[item.id]?.comment || ''"
                    @input="
                      e => {
                        if (!state.habitsAux[item.id]) state.habitsAux[item.id] = { id: item.id };
                        state.habitsAux[item.id].comment = e.target.value;
                        sendComment(item, e);
                      }
                    "
                    @keyup="sendComment(item, $event)"
                  ></textarea>
                  <div v-if="isListeningForField(item.id)" class="speech-recording-indicator">
                    <span class="recording-dot"></span>
                    <span class="ms-2">Gravando... Fale agora</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SELECT N (Checkboxes) -->
          <div
            v-else-if="item.characteristics && item.characteristics.selectN"
            class="anamnese-item-card"
          >
            <div class="anamnese-item-header">
              <span class="badge badge-primary">{{ item.tag }}</span>
              <h5 class="anamnese-item-title">{{ item.name }}</h5>
            </div>
            <div class="anamnese-item-content">
              <div class="options-group">
                <div
                  v-for="(option, index) in item.characteristics.options.split(',')"
                  :key="`option-${index}`"
                  class="option-item"
                >
                  <input
                    class="form-check-input option-checkbox"
                    type="checkbox"
                    :name="`option-${item.id}-${index}`"
                    :id="`option-${item.id}-${index}`"
                    :checked="state.habitsAux[item.id]?.answer?.includes(option.toUpperCase())"
                    @click="sendSelectedOption(item, $event, option)"
                  />
                  <label class="option-label" :for="`option-${item.id}-${index}`">
                    {{ option.toUpperCase().trim() }}
                  </label>
                </div>
              </div>
              <div class="form-field-modern">
                <input
                  class="form-control-modern"
                  type="text"
                  maxlength="50"
                  placeholder="Outro..."
                  :value="
                    state.habitsAux[item.id]?.answer?.filter(
                      ans =>
                        !item.characteristics.options
                          .toUpperCase()
                          .split(',')
                          .includes(ans.toUpperCase())
                    )?.[0] || ''
                  "
                  @blur="sendOtherOption(item, $event)"
                />
              </div>
              <div
                v-if="item.characteristics.comment && item.characteristics.comment === true"
                class="form-field-modern"
              >
                <label
                  class="form-label-modern d-flex align-items-center flex-wrap"
                  :for="`comment-selectN-${item.id}`"
                >
                  <i class="bi bi-chat-text me-1"></i>
                  {{ $t('businessPatientHistoryItemAdmin.comment') }}
                  <button
                    v-if="isSpeechSupported && toggles['patient.history.edit']"
                    type="button"
                    class="btn btn-sm ms-2 btn-outline-secondary d-flex align-items-center"
                    :class="{ 'btn-danger': isListeningForField(item.id) }"
                    @click="toggleSpeechRecognition(item.id, 'comment')"
                    :title="
                      isListeningForField(item.id)
                        ? $t('patientHistoryView.stopRecording')
                        : $t('patientHistoryView.startRecording')
                    "
                  >
                    <i :class="isListeningForField(item.id) ? 'bi bi-mic-fill' : 'bi bi-mic'"></i>
                  </button>
                  <button
                    v-if="toggles['patient.history.edit']"
                    type="button"
                    class="btn btn-sm ms-2 btn-outline-secondary d-flex align-items-center"
                    @click="clearCommentField(item.id)"
                    :title="$t('patientHistoryView.clearField')"
                  >
                    <i class="bi bi-eraser"></i>
                  </button>
                </label>
                <div class="position-relative">
                  <textarea
                    :id="`comment-selectN-${item.id}`"
                    :disabled="!toggles['patient.history.edit']"
                    class="form-control-modern"
                    rows="3"
                    :max="200"
                    :value="state.habitsAux[item.id]?.comment || ''"
                    @input="
                      e => {
                        if (!state.habitsAux[item.id]) state.habitsAux[item.id] = { id: item.id };
                        state.habitsAux[item.id].comment = e.target.value;
                        sendComment(item, e);
                      }
                    "
                    @keyup="sendComment(item, $event)"
                  ></textarea>
                  <div v-if="isListeningForField(item.id)" class="speech-recording-indicator">
                    <span class="recording-dot"></span>
                    <span class="ms-2">{{ $t('patientHistoryView.recordingMessage') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- YES/NO -->
          <div
            v-else-if="item.characteristics && item.characteristics.yesNo"
            class="anamnese-item-card"
          >
            <div class="anamnese-item-header">
              <span class="badge badge-primary">{{ item.tag }}</span>
              <h5 class="anamnese-item-title">{{ item.name }}</h5>
            </div>
            <div class="anamnese-item-content">
              <div class="yesno-toggle-wrapper">
                <label class="yesno-toggle-label">
                  <input
                    class="form-check-input yesno-checkbox"
                    type="checkbox"
                    :checked="state.habitsAux[item.id]?.answer?.answer === 'YES'"
                    @click="sendOptionYesNo(item, $event)"
                  />
                  <span class="yesno-indicator">
                    <i
                      :class="
                        state.habitsAux[item.id]?.answer?.answer === 'YES'
                          ? 'bi bi-check-circle-fill text-success'
                          : 'bi bi-x-circle-fill text-danger'
                      "
                    ></i>
                    <span class="yesno-text">
                      {{ state.habitsAux[item.id]?.answer?.answer === 'YES' ? 'Sim' : 'Não' }}
                    </span>
                  </span>
                </label>
              </div>
              <div
                v-if="item.characteristics && item.characteristics.result"
                class="form-field-modern"
              >
                <input
                  class="form-control-modern"
                  type="text"
                  maxlength="50"
                  placeholder="Resultado..."
                  :value="state.habitsAux[item.id]?.result"
                  @blur="sendResult(item, $event)"
                />
              </div>
              <div
                v-if="item.characteristics && item.characteristics.comment"
                class="form-field-modern"
              >
                <input
                  class="form-control-modern"
                  type="text"
                  maxlength="50"
                  :placeholder="$t('businessPatientHistoryItemAdmin.write')"
                  :value="state.habitsAux[item.id]?.comment"
                  @blur="sendComment(item, $event)"
                />
              </div>
            </div>
          </div>

          <!-- CHECK (Checkbox with additional fields) -->
          <div
            v-else-if="item.characteristics && item.characteristics.check"
            class="anamnese-item-card"
          >
            <div class="anamnese-item-header">
              <span class="badge badge-primary">{{ item.tag }}</span>
              <div class="anamnese-item-toggle">
                <input
                  class="form-check-input anamnese-checkbox"
                  type="checkbox"
                  :name="item.name"
                  :id="`check-${item.id}`"
                  :checked="state.habitsAux[item.id] && state.habitsAux[item.id].check"
                  @click="checkItem(item, $event)"
                />
                <label class="anamnese-item-title" :for="`check-${item.id}`">
                  {{ item.name }}
                </label>
              </div>
            </div>
            <div
              v-if="state.habitsAux[item.id] && state.habitsAux[item.id].check"
              class="anamnese-item-content"
            >
              <div
                v-if="item.characteristics.actual && item.characteristics.actual === true"
                class="form-field-modern"
              >
                <label class="toggle-label-modern">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    :id="`actual-${item.id}`"
                    @click="checkActual(item, $event)"
                    :checked="state.habitsAux[item.id] && state.habitsAux[item.id].actual"
                  />
                  <span class="toggle-text">
                    <i class="bi bi-check-circle me-1"></i>
                    {{ $t('businessPatientHistoryItemAdmin.actual') }}
                  </span>
                </label>
              </div>
              <div class="form-row-modern">
                <div class="form-field-modern">
                  <label class="form-label-modern" :for="`ageFrom-${item.id}`">
                    <i class="bi bi-calendar-range me-1"></i>
                    {{ $t('businessPatientHistoryItemAdmin.ageFrom') }}
                  </label>
                  <input
                    :id="`ageFrom-${item.id}`"
                    :disabled="!toggles['patient.history.edit']"
                    min="1"
                    max="100"
                    type="number"
                    :value="state.habitsAux[item.id]?.ageFrom"
                    @keyup="sendAgeFrom(item, $event)"
                    class="form-control-modern"
                  />
                </div>
                <div
                  v-if="
                    item.characteristics.ageFrom &&
                    item.characteristics.ageFrom === true &&
                    !state.habitsAux[item.id]?.actual
                  "
                  class="form-field-modern"
                >
                  <label class="form-label-modern" :for="`ageTo-${item.id}`">
                    <i class="bi bi-calendar-range me-1"></i>
                    {{ $t('businessPatientHistoryItemAdmin.ageTo') }}
                  </label>
                  <input
                    :id="`ageTo-${item.id}`"
                    :disabled="!toggles['patient.history.edit']"
                    min="1"
                    max="100"
                    type="number"
                    :value="state.habitsAux[item.id]?.ageTo"
                    @keyup="sendAgeTo(item, $event)"
                    class="form-control-modern"
                  />
                </div>
              </div>
              <div
                v-if="item.characteristics.frequency && item.characteristics.frequency === true"
                class="form-field-modern"
              >
                <label class="form-label-modern" :for="`frequency-${item.id}`">
                  <i class="bi bi-arrow-repeat me-1"></i>
                  {{ $t('businessPatientHistoryItemAdmin.frequency') }}
                </label>
                <select
                  :id="`frequency-${item.id}`"
                  class="form-control-modern form-select-modern"
                  @change="sendFrequency(item, $event)"
                >
                  <option value="">{{ $t('patientHistoryView.select') || 'Selecione...' }}</option>
                  <option
                    v-for="value in state.patientHistoryItemFrequenciesTypes"
                    :key="value.id"
                    :value="value.id"
                    :selected="state.habitsAux[item.id]?.frequency === value.id"
                  >
                    {{ $t(`patientHistoryItemFrequenciesTypes.${value.name}`) }}
                  </option>
                </select>
              </div>
              <div
                v-if="item.characteristics.comment && item.characteristics.comment === true"
                class="form-field-modern"
              >
                <label
                  class="form-label-modern d-flex align-items-center flex-wrap"
                  :for="`comment-check-${item.id}`"
                >
                  <i class="bi bi-chat-text me-1"></i>
                  {{ $t('businessPatientHistoryItemAdmin.comment') }}
                  <button
                    v-if="isSpeechSupported && toggles['patient.history.edit']"
                    type="button"
                    class="btn btn-sm ms-2 btn-outline-secondary d-flex align-items-center"
                    :class="{ 'btn-danger': isListeningForField(item.id) }"
                    @click="toggleSpeechRecognition(item.id, 'comment')"
                    :title="
                      isListeningForField(item.id)
                        ? $t('patientHistoryView.stopRecording')
                        : $t('patientHistoryView.startRecording')
                    "
                  >
                    <i :class="isListeningForField(item.id) ? 'bi bi-mic-fill' : 'bi bi-mic'"></i>
                  </button>
                  <button
                    v-if="toggles['patient.history.edit']"
                    type="button"
                    class="btn btn-sm ms-2 btn-outline-secondary d-flex align-items-center"
                    @click="clearCommentField(item.id)"
                    :title="$t('patientHistoryView.clearField')"
                  >
                    <i class="bi bi-eraser"></i>
                  </button>
                </label>
                <div class="position-relative">
                  <textarea
                    :id="`comment-check-${item.id}`"
                    :disabled="!toggles['patient.history.edit']"
                    class="form-control-modern"
                    rows="3"
                    :max="200"
                    :value="state.habitsAux[item.id]?.comment || ''"
                    @input="
                      e => {
                        if (!state.habitsAux[item.id]) state.habitsAux[item.id] = { id: item.id };
                        state.habitsAux[item.id].comment = e.target.value;
                        sendComment(item, e);
                      }
                    "
                    @keyup="sendComment(item, $event)"
                  ></textarea>
                  <div v-if="isListeningForField(item.id)" class="speech-recording-indicator">
                    <span class="recording-dot"></span>
                    <span class="ms-2">{{ $t('patientHistoryView.recordingMessage') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- COMMENT ONLY -->
          <div
            v-else-if="item.characteristics && item.characteristics.comment"
            class="anamnese-item-card"
          >
            <div class="anamnese-item-header">
              <span class="badge badge-primary">{{ item.tag }}</span>
              <h5 class="anamnese-item-title">{{ item.name }}</h5>
            </div>
            <div class="anamnese-item-content">
              <div class="form-field-modern">
                <label
                  class="form-label-modern d-flex align-items-center flex-wrap"
                  :for="`comment-only-${item.id}`"
                >
                  <i class="bi bi-chat-text me-1"></i>
                  {{ $t('businessPatientHistoryItemAdmin.comment') }}
                  <button
                    v-if="isSpeechSupported && toggles['patient.history.edit']"
                    type="button"
                    class="btn btn-sm ms-2 btn-outline-secondary d-flex align-items-center"
                    :class="{ 'btn-danger': isListeningForField(item.id) }"
                    @click="toggleSpeechRecognition(item.id, 'comment')"
                    :title="
                      isListeningForField(item.id)
                        ? $t('patientHistoryView.stopRecording')
                        : $t('patientHistoryView.startRecording')
                    "
                  >
                    <i :class="isListeningForField(item.id) ? 'bi bi-mic-fill' : 'bi bi-mic'"></i>
                  </button>
                  <button
                    v-if="toggles['patient.history.edit']"
                    type="button"
                    class="btn btn-sm ms-2 btn-outline-secondary d-flex align-items-center"
                    @click="clearCommentField(item.id)"
                    :title="$t('patientHistoryView.clearField')"
                  >
                    <i class="bi bi-eraser"></i>
                  </button>
                </label>
                <div class="position-relative">
                  <textarea
                    :id="`comment-only-${item.id}`"
                    :disabled="!toggles['patient.history.edit']"
                    class="form-control-modern"
                    rows="4"
                    :max="200"
                    :value="state.habitsAux[item.id]?.comment || ''"
                    @input="
                      e => {
                        if (!state.habitsAux[item.id]) state.habitsAux[item.id] = { id: item.id };
                        state.habitsAux[item.id].comment = e.target.value;
                        sendComment(item, e);
                      }
                    "
                    @keyup="sendComment(item, $event)"
                  ></textarea>
                  <div v-if="isListeningForField(item.id)" class="speech-recording-indicator">
                    <span class="recording-dot"></span>
                    <span class="ms-2">{{ $t('patientHistoryView.recordingMessage') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="general-comment-section">
      <div class="form-section-header">
        <div class="form-section-icon">
          <i class="bi bi-file-text"></i>
        </div>
        <div class="form-section-title d-flex align-items-center flex-wrap">
          <h4 class="form-title-text">{{ $t('businessPatientHistoryItemAdmin.comment') }}</h4>
          <p class="form-title-subtitle">Comentários gerais sobre a anamnese</p>
          <button
            v-if="isSpeechSupported && toggles['patient.history.edit']"
            type="button"
            class="btn btn-sm ms-2 btn-outline-secondary d-flex align-items-center"
            :class="{ 'btn-danger': isListeningForField(null) }"
            @click="toggleSpeechRecognition()"
            :title="
              isListeningForField(null)
                ? $t('patientHistoryView.stopRecording')
                : $t('patientHistoryView.startRecording')
            "
          >
            <i :class="isListeningForField(null) ? 'bi bi-mic-fill' : 'bi bi-mic'"></i>
          </button>
          <button
            v-if="toggles['patient.history.edit']"
            type="button"
            class="btn btn-sm ms-2 btn-outline-secondary d-flex align-items-center"
            @click="clearGeneralField"
            :title="$t('patientHistoryView.clearField')"
          >
            <i class="bi bi-eraser"></i>
          </button>
        </div>
      </div>

      <!-- Template Picker -->
      <div
        class="form-field-modern"
        v-if="commerce && commerce.id && currentUser && currentUser.id"
      >
        <TemplatePicker
          :commerce-id="commerce.id"
          :doctor-id="currentUser.id"
          template-type="anamnesis"
          :toggles="toggles"
          @template-selected="handleTemplateSelected"
        />
      </div>

      <div class="form-field-modern">
        <div class="position-relative">
          <textarea
            :disabled="!toggles['patient.history.edit']"
            class="form-control-modern"
            rows="8"
            :max="500"
            @keyup="sendData"
            v-bind:class="{ 'form-control-invalid': state.habitsError }"
            v-model="state.newPatientAnamnese.habits"
          ></textarea>
          <div v-if="isListeningForField(null)" class="speech-recording-indicator">
            <span class="recording-dot"></span>
            <span class="ms-2">{{ $t('patientHistoryView.recordingMessage') }}</span>
          </div>
          <div
            v-if="speechError && isListeningForField(null)"
            class="speech-error-message text-danger small mt-1"
          >
            <i class="bi bi-exclamation-triangle me-1"></i>
            {{ speechError }}
          </div>
        </div>
        <div class="form-field-hint" v-if="state.newPatientAnamnese.habits">
          <span class="character-count"
            >{{ (state.newPatientAnamnese.habits || '').length }}/500</span
          >
        </div>
      </div>
    </div>

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
</template>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.patient-form-modern.anamnese-form {
  width: 100%;
  padding: 0;
}

/* Anamnese Items Container */
.anamnese-items-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.anamnese-item-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  padding: 0.75rem;
  transition: all 0.3s ease;
}

.anamnese-item-card:hover {
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.anamnese-item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.badge-primary {
  padding: 0.35rem 0.75rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.anamnese-item-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  flex: 1;
}

.anamnese-item-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.anamnese-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
  margin: 0;
}

.anamnese-item-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Options Group */
.options-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.option-item:hover {
  background: rgba(0, 0, 0, 0.05);
  border-color: var(--azul-turno);
}

.option-radio,
.option-checkbox {
  width: 1.1rem;
  height: 1.1rem;
  cursor: pointer;
  margin: 0;
}

.option-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
  margin: 0;
}

/* Yes/No Toggle */
.yesno-toggle-wrapper {
  margin-bottom: 0.5rem;
}

.yesno-toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 0.625rem;
  border: 2px solid rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.yesno-toggle-label:hover {
  border-color: var(--azul-turno);
  background: rgba(0, 123, 255, 0.05);
}

.yesno-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  margin: 0 0.75rem 0 0;
  cursor: pointer;
}

.yesno-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.yesno-text {
  font-weight: 600;
  color: var(--color-text);
}

/* Form Fields */
.form-field-modern {
  display: flex;
  flex-direction: column;
}

.form-label-modern {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.form-control-modern {
  width: 100%;
  padding: 0.65rem 0.875rem;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.625rem;
  font-size: 0.9rem;
  background: white;
  transition: all 0.3s ease;
  font-family: inherit;
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

.form-row-modern {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.toggle-label-modern {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 0.5rem;
}

.toggle-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
}

.general-comment-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid rgba(0, 0, 0, 0.08);
}

.form-section-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.form-section-icon {
  width: 48px;
  height: 48px;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.form-section-title {
  flex: 1;
}

.form-title-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.25rem 0;
  line-height: 1.3;
}

.form-title-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
  margin: 0;
  line-height: 1.4;
}

.form-field-hint {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.character-count {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.6;
}

.form-errors-modern {
  margin-top: 1rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .form-row-modern {
    grid-template-columns: 1fr;
  }

  .options-group {
    flex-direction: column;
  }

  .option-item {
    width: 100%;
  }
}

.position-relative {
  position: relative;
}

.speech-recording-indicator {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  background: rgba(220, 53, 69, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  color: #dc3545;
  font-weight: 600;
  z-index: 10;
  pointer-events: none;
}

.recording-dot {
  width: 8px;
  height: 8px;
  background: #dc3545;
  border-radius: 50%;
  animation: blink-recording 1s ease-in-out infinite;
}

@keyframes blink-recording {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.speech-error-message {
  padding: 0.25rem 0.5rem;
  background: rgba(220, 53, 69, 0.1);
  border-radius: 0.375rem;
  margin-top: 0.25rem;
}
</style>
