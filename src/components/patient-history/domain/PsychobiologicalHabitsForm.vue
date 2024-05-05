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
  name: 'PsychobiologicalHabitsForm',
  components: { Warning, Spinner, VueRecaptcha, Toggle, Message, HistoryDetailsCard },
  props: {
    commerce: { type: Object, default: {} },
    cacheData: { type: Object, default: undefined },
    patientHistoryData: { type: Object, default: {} },
    toggles: { type: Object, default: {} },
    errorsAdd: { type: Array, default: [] },
    patientHistoryItems: { type: Array, default: [] },
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
      newPsychobiologicalHabits: {

      },
      oldPsychobiologicalHabits: {},
      patientHistoryItemFrequenciesTypes: [],
      habitsAux: {},
      captcha: false,
      habitsError: false,
      asc: true
    })

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.patientHistoryItemFrequenciesTypes = getPatientHistoryItemFrequenciesTypes();
        if (patientHistoryData.value && patientHistoryData.value.id) {
          state.oldPsychobiologicalHabits = patientHistoryData.value.psychobiologicalHabits;
          state.habitsAux = state.oldPsychobiologicalHabits.habitsDetails;
          state.newPsychobiologicalHabits = patientHistoryData.value.psychobiologicalHabits;
        }
        if (cacheData.value) {
          state.newPsychobiologicalHabits = cacheData.value;
          state.habitsAux = state.newPsychobiologicalHabits.habitsDetails;
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    const sendData = () => {
      receiveData(state.newPsychobiologicalHabits);
    }

    const checkAsc = (event) => {
      if (event.target.checked) {
        state.asc = true;
      } else {
        state.asc = false;
      }
      if (state.oldPsychobiologicalHabits && state.oldPsychobiologicalHabits.length > 0) {
        let elementsSorted = [];
        const elements = state.oldPsychobiologicalHabits;
        if (state.asc) {
          elementsSorted = elements.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        } else {
          elementsSorted = elements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        state.oldPsychobiologicalHabits = elementsSorted;
      }
    }

    const checkItem = (item, event) => {
      if (item && item.id) {
        if (event.target.checked) {
          if (!state.habitsAux[item.id]) {
            state.habitsAux[item.id] = {
              id: item.id,
              name: item.name,
              active: true
            }
          } else {
            state.habitsAux[item.id].active = true;
            state.habitsAux[item.id].actual = true;
          }
        } else {
          if (state.habitsAux[item.id]) {
            delete state.habitsAux[item.id];
          }
        }
        state.newPsychobiologicalHabits.habitsDetails = state.habitsAux;
        sendData();
      }
    }

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
        state.newPsychobiologicalHabits.habitsDetails = state.habitsAux;
        sendData();
      }
    }

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
        state.newPsychobiologicalHabits.habitsDetails = state.habitsAux;
        sendData();
      }
    }

    const sendAgeTo = (item, event) => {
      if (item && item.id) {
        if (event.target.value) {
          const age = event.target.value;
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].ageTo= age;
          }
        } else {
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].ageTo = undefined;
          }
        }
        state.newPsychobiologicalHabits.habitsDetails = state.habitsAux;
        sendData();
      }
    }

    const sendComment = (item, event) => {
      if (item && item.id) {
        if (event.target.value) {
          const comment = event.target.value;
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].comment = comment;
          }
        } else {
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].comment = undefined;
          }
        }
        state.newPsychobiologicalHabits.habitsDetails = state.habitsAux;
        sendData();
      }
    }

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
        state.newPsychobiologicalHabits.habitsDetails = state.habitsAux;
        sendData();
      }
    }

    watch (
      patientHistoryData,
      async () => {
        loading.value = true;
        if (patientHistoryData.value && patientHistoryData.value.id) {
          if (patientHistoryData.value.psychobiologicalHabits &&
            patientHistoryData.value.psychobiologicalHabits.length > 0 &&
            patientHistoryData.value.psychobiologicalHabits[0]
          )
          state.oldPsychobiologicalHabits = patientHistoryData.value.psychobiologicalHabits;
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
      checkAsc,
      checkItem,
      checkActual,
      sendAgeFrom,
      sendAgeTo,
      sendComment,
      sendFrequency
    }
  }
}
</script>
<template>
  <div>
    <div id="form">
      <div class="row">
        <div class="col-12 col-md-8">
          <div id="patient-name-form-add" class="row m-1">
            <div class="col-12 text-label">
              {{ $t("patientHistoryView.psychobiologicalHabits") }} <i class="bi bi-capsule-pill mx-1"></i>
            </div>
            <div class="col-12">
              <div v-for="item in patientHistoryItems.sort((a, b) => a.order - b.order)" :key="item.id">
                <div v-if="item.active === true && item.online === true" class="row habit-card">
                  <div class="col-4 lefted">
                    <div class="form-check form-switch centered">
                      <input class="form-check-input m-1" type="checkbox" :name="item.name" id="item.id" :checked="state.habitsAux[item.id] && state.habitsAux[item.id].active" @click="checkItem(item, $event)">
                      <label class="form-check-label metric-card-subtitle">{{ item.name }}</label>
                    </div>
                  </div>
                  <div class="col-8 col-md-8">
                    <div v-if="state.habitsAux[item.id]">
                      <div v-if="item.characteristics.actual && item.characteristics.actual === true">
                        <div class="form-check form-switch centered">
                          <label class="form-check-label metric-card-subtitle">{{  $t("businessPatientHistoryItemAdmin.actual") }}</label>
                          <input class="form-check-input m-1" type="checkbox" :id="`actual-${item.id}`" @click="checkActual(item, $event)" :checked="state.habitsAux[item.id] && state.habitsAux[item.id].actual">
                        </div>
                      </div>
                      <div>
                        <div class="row centered">
                          <div class="col-6">
                            <div class="row m-1">
                              <label class="form-check-label metric-card-subtitle">{{  $t("businessPatientHistoryItemAdmin.ageFrom") }}</label>
                              <input
                                :disabled="!toggles['patient.history.edit']"
                                min="1"
                                max="100"
                                type="number"
                                :value="state.habitsAux[item.id].ageFrom"
                                @keyup="sendAgeFrom(item, $event)"
                                class="form-control form-control-sm">
                            </div>
                          </div>
                          <div class="col-6" v-if="state.habitsAux[item.id].actual === false">
                            <div class="row m-1">
                              <label class="form-check-label metric-card-subtitle">{{  $t("businessPatientHistoryItemAdmin.ageTo") }}</label>
                              <input
                                :disabled="!toggles['patient.history.edit']"
                                min="1"
                                max="100"
                                type="number"
                                :value="state.habitsAux[item.id].ageTo"
                                @keyup="sendAgeTo(item, $event)"
                                class="form-control form-control-sm">
                            </div>
                          </div>
                        </div>
                        <div class="row centered">
                          <div class="row mt-2">
                            <label class="form-check-label metric-card-subtitle">{{  $t("businessPatientHistoryItemAdmin.frequency") }}</label>
                            <select class="btn btn-sm btn-light fw-bold text-dark select" @change="sendFrequency(item, $event)">
                              <option v-for="value in state.patientHistoryItemFrequenciesTypes" :key="value.id" :value="value.id" id="select-block" :selected="state.habitsAux[item.id].frequency === value.id">{{ $t(`patientHistoryItemFrequenciesTypes.${value.name}`) }}</option>
                            </select>
                          </div>
                        </div>
                        <div class="row centered">
                          <div class="row mt-2">
                            <label class="form-check-label metric-card-subtitle">{{  $t("businessPatientHistoryItemAdmin.comment") }}</label>
                              <textarea
                                :disabled="!toggles['patient.history.edit']"
                                class="form-control form-control-sm"
                                id="commennt"
                                rows="2"
                                :max="200"
                                :value="state.habitsAux[item.id].comment"
                                @keyup="sendComment(item, $event)">
                              </textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="row">
            <label class="form-check-label metric-card-subtitle mt-2">{{  $t("businessPatientHistoryItemAdmin.comment") }}</label>
            <textarea
              :disabled="!toggles['patient.history.edit']"
              class="form-control"
              id="commennt"
              rows="5"
              :max="500"
              @keyup="sendData"
              v-bind:class="{ 'is-invalid': state.habitsError }"
              v-model="state.newPsychobiologicalHabits.habits">
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
.habit-card {
  background-color: var(--color-background);
  padding: .2rem;
  margin: .2rem;
  border-radius: .5rem;
  border: 1px solid var(--gris-default);
}
.blocks-section {
  overflow-y: scroll;
  max-height: 800px;
  font-size: small;
  margin-bottom: 2rem;
  padding: .5rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  background-color: var(--color-habits);
}
</style>