<script>
import { ref, reactive, onBeforeMount, toRefs, watch } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';
import Warning from '../../common/Warning.vue';
import Spinner from '../../common/Spinner.vue';
import Toggle from '@vueform/toggle';
import Message from '../../common/Message.vue';
import HistoryDetailsCard from '../common/HistoryDetailsCard.vue';
import { getPatientHistoryItemFrequenciesTypes } from '../../../shared/utils/data';

export default {
  name: 'PatientAnamneseForm',
  components: { Warning, Spinner, VueRecaptcha, Toggle, Message, HistoryDetailsCard },
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
    const loading = ref(false);

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
    });

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
          state.oldPatientAnamnese = patientHistoryData.value.patientAnamnese;
          state.habitsAux = state.oldPatientAnamnese.habitsDetails;
          state.newPatientAnamnese = patientHistoryData.value.patientAnamnese;
        } else if (patientForms.value && patientForms.value.length > 0) {
          const patientFormFirstAttentions = patientForms.value.filter(
            form => form.type === 'FIRST_ATTENTION'
          );
          state.patientFormFirstAttention =
            patientFormFirstAttentions && patientFormFirstAttentions.length > 0
              ? patientFormFirstAttentions[0]
              : undefined;
          if (state.patientFormFirstAttention && state.patientFormFirstAttention.id) {
            const answers = state.patientFormFirstAttention.answers.filter(
              ans => ans.type === 'PERSONAL_HISTORY'
            );
            if (answers && answers.length > 0) {
              answers.forEach(element => {
                if (element.id) {
                  state.habitsAux[element.id] = { ...element.answer, ...element };
                }
              });
            }
          }
        }
        if (cacheData.value) {
          state.newPatientAnamnese = cacheData.value;
          state.habitsAux = state.newPatientAnamnese.habitsDetails;
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const sendData = () => {
      receiveData(state.newPatientAnamnese);
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
        if (event.target.value) {
          const comment = event.target.value;
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].comment = comment;
          } else {
            state.habitsAux[item.id] = { comment };
          }
        } else {
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].comment = undefined;
          }
        }
        state.newPatientAnamnese.habitsDetails = state.habitsAux;
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
      } else if (patientForms.value && patientForms.value.length > 0) {
        const patientFormFirstAttentions = patientForms.value.filter(
          form => form.type === 'FIRST_ATTENTION'
        );
        state.patientFormFirstAttention =
          patientFormFirstAttentions && patientFormFirstAttentions.length > 0
            ? patientFormFirstAttentions[0]
            : undefined;
        if (state.patientFormFirstAttention && state.patientFormFirstAttention.id) {
          const answers = state.patientFormFirstAttention.answers.filter(
            ans => ans.type === 'PERSONAL_HISTORY'
          );
          if (answers && answers.length > 0) {
            answers.forEach(element => {
              if (element.id) {
                state.habitsAux[element.id] = { ...element.answer, ...element };
              }
            });
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
      checkAsc,
      checkItem,
      checkActual,
      sendAgeFrom,
      sendAgeTo,
      sendComment,
      sendFrequency,
      sendSelectedOption,
      sendOptionYesNo,
      sendOtherOption,
      sendResult,
      sendCheckOption,
      sendCheckOtherOption,
    };
  },
};
</script>
<template>
  <div>
    <div id="form">
      <div class="row">
        <div class="col-12">
          <div id="patient-name-form-add" class="row m-1">
            <div class="col-12 text-label">
              {{ $t('patientHistoryView.patientAnamnese') }} <i class="bi bi-capsule-pill mx-1"></i>
            </div>
            <div class="col-12">
              <div v-for="item in state.habitsList" :key="item.id">
                <div v-if="item.active === true && item.online === true">
                  <!-- SELECT 1 -->
                  <div
                    class="row item-card"
                    v-if="item.characteristics && item.characteristics.select1"
                  >
                    <div class="col m-1">
                      <div class="lefted">
                        <span class="badge bg-primary"> {{ item.tag }} </span>
                      </div>
                      <div class="lefted">
                        <label class="fw-bold">{{ item.name }}</label>
                      </div>
                    </div>
                    <div :id="`details-${item.id}`">
                      <div
                        class="form-check form-switch check-option lefted"
                        v-for="(option, index) in item.characteristics.options.split(',')"
                        :key="`option-${index}`"
                      >
                        <input
                          class="form-check-input"
                          type="radio"
                          :name="`check-${option.title}-${index}`"
                          :checked="state.habitsAux[item.id]?.answer.includes(option.toUpperCase())"
                          @click="sendCheckOption(item, $event, option)"
                        />
                        <label class="form-check-label mx-2" for="option">{{
                          option.toUpperCase().trim()
                        }}</label>
                      </div>
                      <div class="col mb-1">
                        <input
                          maxlength="50"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Other"
                          :value="
                            state.habitsAux[item.id]?.answer.filter(
                              ans =>
                                !item.characteristics.options
                                  .toUpperCase()
                                  .split(',')
                                  .includes(ans.toUpperCase())
                            )
                          "
                          @blur="sendCheckOtherOption(item, $event)"
                        />
                      </div>
                      <div
                        class="row centered"
                        v-if="item.characteristics.comment && item.characteristics.comment === true"
                      >
                        <div class="row mt-1">
                          <label class="form-check-label metric-card-subtitle">{{
                            $t('businessPatientHistoryItemAdmin.comment')
                          }}</label>
                          <textarea
                            :disabled="!toggles['patient.history.edit']"
                            class="form-control form-control-sm"
                            rows="2"
                            :max="200"
                            :placeholder="$t('businessPatientHistoryItemAdmin.write')"
                            :value="state.habitsAux[item.id]?.comment"
                            @keyup="sendComment(item, $event)"
                          >
                          </textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- SELECT N -->
                  <div
                    class="row item-card"
                    v-else-if="item.characteristics && item.characteristics.selectN"
                  >
                    <div class="col-12">
                      <div class="col m-1">
                        <div class="lefted">
                          <span class="badge bg-primary"> {{ item.tag }} </span>
                        </div>
                        <div class="lefted">
                          <label class="fw-bold">{{ item.name }}</label>
                        </div>
                      </div>
                    </div>
                    <div :id="`details-${item.id}`">
                      <div
                        class="form-check form-switch check-option lefted"
                        v-for="(option, index) in item.characteristics.options.split(',')"
                        :key="`option-${index}`"
                      >
                        <input
                          class="form-check-input"
                          type="checkbox"
                          :name="`option-${option.title}`"
                          :checked="
                            state.habitsAux[item.id]?.answer?.includes(option.toUpperCase())
                          "
                          @click="sendSelectedOption(item, $event, option)"
                        />
                        <label class="form-check-label mx-2" for="option">{{
                          option.toUpperCase().trim()
                        }}</label>
                      </div>
                      <div class="col mb-1">
                        <input
                          maxlength="50"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Other"
                          :value="
                            state.habitsAux[item.id]?.answer.filter(
                              ans =>
                                !item.characteristics.options
                                  .toUpperCase()
                                  .split(',')
                                  .includes(ans.toUpperCase())
                            )
                          "
                          @blur="sendOtherOption(item, $event)"
                        />
                      </div>
                      <div
                        class="row centered"
                        v-if="item.characteristics.comment && item.characteristics.comment === true"
                      >
                        <div class="row mt-1">
                          <label class="form-check-label metric-card-subtitle">{{
                            $t('businessPatientHistoryItemAdmin.comment')
                          }}</label>
                          <textarea
                            :disabled="!toggles['patient.history.edit']"
                            class="form-control form-control-sm"
                            rows="2"
                            :max="200"
                            :placeholder="$t('businessPatientHistoryItemAdmin.write')"
                            :value="state.habitsAux[item.id]?.comment"
                            @keyup="sendComment(item, $event)"
                          >
                          </textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- SELECT YES NO -->
                  <div
                    class="row item-card"
                    v-else-if="item.characteristics && item.characteristics.yesNo"
                  >
                    <div class="col-12">
                      <div class="col m-1">
                        <div class="lefted">
                          <span class="badge bg-primary"> {{ item.tag }} </span>
                        </div>
                        <div class="lefted">
                          <label class="fw-bold">{{ item.name }}</label>
                        </div>
                      </div>
                    </div>
                    <div :id="`details-${item.id}`">
                      <div class="form-check form-switch check-option lefted">
                        <input
                          class="form-check-input"
                          type="checkbox"
                          :checked="
                            state.habitsAux[item.id]?.answer.answer === 'YES' ? true : false
                          "
                          @click="sendOptionYesNo(item, $event)"
                        />
                        <label class="form-check-label mx-2" for="option">{{
                          state.habitsAux[item.id]?.answer.answer === 'YES' ? '✅' : '🚫'
                        }}</label>
                      </div>
                      <div
                        class="col mb-1"
                        v-if="item.characteristics && item.characteristics.result"
                      >
                        <input
                          maxlength="50"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Other"
                          :value="state.habitsAux[item.id]?.result"
                          @blur="sendResult(item, $event)"
                        />
                      </div>
                      <div
                        class="col mb-1"
                        v-if="item.characteristics && item.characteristics.comment"
                      >
                        <input
                          maxlength="50"
                          type="text"
                          class="form-control form-control-sm"
                          :placeholder="$t('businessPatientHistoryItemAdmin.write')"
                          :value="state.habitsAux[item.id]?.comment"
                          @blur="sendComment(item, $event)"
                        />
                      </div>
                    </div>
                  </div>
                  <!-- SELECT CHECK -->
                  <div
                    class="row item-card"
                    v-else-if="item.characteristics && item.characteristics.check"
                  >
                    <div class="col-12">
                      <div class="col m-1">
                        <div class="lefted">
                          <span class="badge bg-primary"> {{ item.tag }} </span>
                        </div>
                        <div class="lefted">
                          <div class="form-check form-switch">
                            <input
                              class="form-check-input"
                              type="checkbox"
                              :name="item.name"
                              id="item.id"
                              :checked="state.habitsAux[item.id] && state.habitsAux[item.id].check"
                              @click="checkItem(item, $event)"
                            />
                            <label class="form-check-label metric-card-subtitle fw-bold">{{
                              item.name
                            }}</label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div :id="`details-${item.id}`">
                      <div
                        v-if="item.characteristics.actual && item.characteristics.actual === true"
                      >
                        <div class="form-check form-switch centered">
                          <label class="form-check-label metric-card-subtitle">{{
                            $t('businessPatientHistoryItemAdmin.actual')
                          }}</label>
                          <input
                            class="form-check-input m-1"
                            type="checkbox"
                            :id="`actual-${item.id}`"
                            @click="checkActual(item, $event)"
                            :checked="state.habitsAux[item.id] && state.habitsAux[item.id].actual"
                          />
                        </div>
                      </div>
                      <div>
                        <div class="row centered">
                          <div class="col-6">
                            <div class="row">
                              <div class="col">
                                <label class="form-check-label metric-card-subtitle">{{
                                  $t('businessPatientHistoryItemAdmin.ageFrom')
                                }}</label>
                              </div>
                              <div class="col">
                                <input
                                  :disabled="!toggles['patient.history.edit']"
                                  min="1"
                                  max="100"
                                  type="number"
                                  :value="state.habitsAux[item.id]?.ageFrom"
                                  @keyup="sendAgeFrom(item, $event)"
                                  class="form-control form-control-sm"
                                />
                              </div>
                            </div>
                          </div>
                          <div
                            class="col-6"
                            v-if="
                              item.characteristics.ageFrom &&
                              item.characteristics.ageFrom === true &&
                              !state.habitsAux[item.id]?.actual
                            "
                          >
                            <div class="row">
                              <div class="col">
                                <label class="form-check-label metric-card-subtitle">{{
                                  $t('businessPatientHistoryItemAdmin.ageTo')
                                }}</label>
                              </div>
                              <div class="col">
                                <input
                                  :disabled="!toggles['patient.history.edit']"
                                  min="1"
                                  max="100"
                                  type="number"
                                  :value="state.habitsAux[item.id]?.ageTo"
                                  @keyup="sendAgeTo(item, $event)"
                                  class="form-control form-control-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div
                          class="row centered"
                          v-if="
                            item.characteristics.frequency &&
                            item.characteristics.frequency === true
                          "
                        >
                          <div class="row mt-1">
                            <div class="col">
                              <label class="form-check-label metric-card-subtitle">{{
                                $t('businessPatientHistoryItemAdmin.frequency')
                              }}</label>
                            </div>
                            <div class="col">
                              <select
                                class="btn btn-sm btn-light fw-bold text-dark select"
                                @change="sendFrequency(item, $event)"
                              >
                                <option
                                  v-for="value in state.patientHistoryItemFrequenciesTypes"
                                  :key="value.id"
                                  :value="value.id"
                                  id="select-block"
                                  :selected="state.habitsAux[item.id]?.frequency === value.id"
                                >
                                  {{ $t(`patientHistoryItemFrequenciesTypes.${value.name}`) }}
                                </option>
                              </select>
                            </div>
                          </div>
                        </div>
                        <div
                          class="row centered"
                          v-if="
                            item.characteristics.comment && item.characteristics.comment === true
                          "
                        >
                          <div class="row mt-1">
                            <label class="form-check-label metric-card-subtitle">{{
                              $t('businessPatientHistoryItemAdmin.comment')
                            }}</label>
                            <textarea
                              :disabled="!toggles['patient.history.edit']"
                              class="form-control form-control-sm"
                              rows="2"
                              :max="200"
                              :placeholder="$t('businessPatientHistoryItemAdmin.write')"
                              :value="state.habitsAux[item.id]?.comment"
                              @keyup="sendComment(item, $event)"
                            >
                            </textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- SELECT COMMENT -->
                  <div
                    class="row item-card"
                    v-else-if="item.characteristics && item.characteristics.comment"
                  >
                    <div class="col-12">
                      <div class="col m-1">
                        <div class="lefted">
                          <span class="badge bg-primary"> {{ item.tag }} </span>
                        </div>
                        <div class="lefted">
                          <label class="fw-bold">{{ item.name }}</label>
                        </div>
                      </div>
                    </div>
                    <div
                      class="col mb-1"
                      v-if="item.characteristics && item.characteristics.comment"
                    >
                      <textarea
                        :disabled="!toggles['patient.history.edit']"
                        class="form-control form-control-sm"
                        rows="2"
                        :max="200"
                        :placeholder="$t('businessPatientHistoryItemAdmin.write')"
                        :value="state.habitsAux[item.id]?.comment"
                        @keyup="sendComment(item, $event)"
                      >
                      </textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12">
          <div class="row mt-2 mx-3">
            <label class="form-check-label metric-card-subtitle mt-2">{{
              $t('businessPatientHistoryItemAdmin.comment')
            }}</label>
            <textarea
              :disabled="!toggles['patient.history.edit']"
              class="form-control form-control-sm"
              rows="10"
              :max="500"
              @keyup="sendData"
              v-bind:class="{ 'is-invalid': state.habitsError }"
              :placeholder="$t('businessPatientHistoryItemAdmin.write')"
              v-model="state.newPatientAnamnese.habits"
            >
            </textarea>
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
    </div>
  </div>
</template>
<style scoped>
.blocks-section {
  overflow-y: scroll;
  max-height: 800px;
  font-size: small;
  margin-bottom: 2rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  background-color: var(--color-habits);
}
.show {
  max-height: 2000px !important;
  overflow-y: visible;
}
.habit-title {
  text-align: left;
}
</style>
