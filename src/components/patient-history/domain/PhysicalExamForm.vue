<script>
import { ref, reactive, onBeforeMount, toRefs, watch } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';
import { dateYYYYMMDD } from '../../../shared/utils/date';
import Warning from '../../common/Warning.vue';
import Spinner from '../../common/Spinner.vue';
import Toggle from '@vueform/toggle';
import Message from '../../common/Message.vue';
import HistoryDetailsCard from '../common/HistoryDetailsCard.vue';
import HistoryDetailsWithItemsCard from '../common/HistoryDetailsWithItemsCard.vue';

export default {
  name: 'PhysicalExamForm',
  components: { Warning, Spinner, VueRecaptcha, Toggle, Message, HistoryDetailsCard, HistoryDetailsWithItemsCard },
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
      patientHistoryItems,
    } = toRefs(props);

    const { receiveData } = props;

    const state = reactive({
      newPhysicalExam: {},
      oldPhysicalExam: {},
      oldPhysicalExams: [],
      habitsList: [],
      habitsAux: {},
      captcha: false,
      examError: false,
      asc: true
    })

    onBeforeMount(async () => {
      try {
        loading.value = true;
        if (patientHistoryItems.value && patientHistoryItems.value.length > 0) {
          state.habitsList = patientHistoryItems.value.filter(habit => ['PHYSICAL_EXAM'].includes(habit.type));
          state.habitsList = state.habitsList.sort((a, b) => b.order - a.order);
        }
        if (patientHistoryData.value && patientHistoryData.value.id) {
          state.oldPhysicalExams = patientHistoryData.value.physicalExam;
          const elements = patientHistoryData.value.physicalExam;
          const sortedExams = elements.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          });
          if (sortedExams && sortedExams.length > 0) {
            if (dateYYYYMMDD(sortedExams[0].createdAt) === dateYYYYMMDD(new Date())) {
              state.oldPhysicalExam = sortedExams[0];
              state.habitsAux = state.oldPhysicalExam.examDetails;
              state.newPhysicalExam = patientHistoryData.value.physicalExam[0];
            }
          }
        }
        if (cacheData.value) {
          state.newPhysicalExam = cacheData.value;
          state.habitsAux = state.newPhysicalExam.examDetails;
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    const sendData = () => {
      receiveData(state.newPhysicalExam);
    }


    const checkAsc = (event) => {
      if (event.target.checked) {
        state.asc = true;
      } else {
        state.asc = false;
      }
      if (state.oldPhysicalExams && state.oldPhysicalExams.length > 0) {
        let elementsSorted = [];
        const elements = state.oldPhysicalExams;
        if (state.asc) {
          elementsSorted = elements.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        } else {
          elementsSorted = elements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        state.oldPhysicalExams = elementsSorted;
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
          }
        } else {
          if (state.habitsAux[item.id]) {
            delete state.habitsAux[item.id];
          }
        }
        state.newPhysicalExam.examDetails = state.habitsAux;
        sendData();
      }
    }

    const sendValue = (item, event) => {
      if (item && item.id) {
        if (event.target.value) {
          const value = event.target.value;
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].value = value;
            state.habitsAux[item.id].name = item.name;
          } else {
            state.habitsAux[item.id] = { value: value, name: item.name };
          }
        } else {
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].value = undefined;
          }
        }
        state.newPhysicalExam.examDetails = state.habitsAux;
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
        state.newPhysicalExam.examDetails = state.habitsAux;
        sendData();
      }
    }

    watch (
      patientHistoryData,
      async () => {
        loading.value = true;
        if (patientHistoryData.value && patientHistoryData.value.id) {
          if (patientHistoryData.value.physicalExam &&
            patientHistoryData.value.physicalExam.length > 0 &&
            patientHistoryData.value.physicalExam[0]
          )
          state.oldPhysicalExams = patientHistoryData.value.physicalExam;
          state.oldPhysicalExam = patientHistoryData.value.physicalExam[0];
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
      sendValue,
      sendData,
      checkAsc,
      checkItem,
      sendComment
    }
  }
}
</script>
<template>
  <div>
    <div id="form">
      <div class="row">
        <div class="col-12 col-md-6 mt-2">
          <div id="patient-name-form-add" class="row m-1">
            <div class="col-12 text-label">
              {{ $t("patientHistoryView.physicalExam") }} <i class="bi bi-person-fill mx-1"></i>
            </div>
            <div class="col-12">
              <div v-for="item in state.habitsList" :key="item.id">
                <div v-if="item.active === true && item.online === true" class="row habit-card lefted">
                  <div class="col-12">
                    <div class="col m-1">
                      <div class="lefted">
                        <span class="badge bg-primary"> {{ item.tag }} </span>
                      </div>
                      <div class="lefted">
                        <div :class="`${item.characteristics && item.characteristics.check ? 'form-check form-switch' : ''}`">
                          <input v-if="item.characteristics && item.characteristics.check" class="form-check-input m-1" type="checkbox" :name="item.name" id="item.id" :checked="state.habitsAux && state.habitsAux[item.id] && state.habitsAux[item.id].check" @click="checkItem(item, $event)">
                          <label class="form-check-label metric-card-subtitle fw-bold">{{ item.name }}</label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="centered">
                      <div v-if="item.characteristics.value && item.characteristics.value === true">
                        <div class="row m-1">
                          <label class="form-check-label metric-card-subtitle">{{  $t("businessPatientHistoryItemAdmin.value") }}</label>
                          <input
                            :disabled="!toggles['patient.history.edit']"
                            min="0"
                            max="1000"
                            type="number"
                            :value="state.habitsAux[item.id]?.value"
                            @keyup="sendValue(item, $event)"
                            class="form-control form-control-sm">
                        </div>
                      </div>
                      <div class="row centered" v-if="item.characteristics.comment && item.characteristics.comment === true">
                        <div class="row mt-2">
                          <label class="form-check-label metric-card-subtitle">{{  $t("businessPatientHistoryItemAdmin.comment") }}</label>
                          <textarea
                            :disabled="!toggles['patient.history.edit']"
                            class="form-control form-control-sm"
                            id="commennt"
                            rows="2"
                            :max="200"
                            :value="state.habitsAux[item.id]?.comment"
                            @keyup="sendComment(item, $event)">
                          </textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-12 mt-2">
              <label class="form-check-label metric-card-subtitle">{{  $t("businessPatientHistoryItemAdmin.comment") }}</label>
              <textarea
                :disabled="!toggles['patient.history.edit']"
                class="form-control form-control-sm"
                id="commennt"
                rows="5"
                :max="500"
                @keyup="sendData"
                v-bind:class="{ 'is-invalid': state.examError }"
                v-model="state.newPhysicalExam.exam"
                :placeholder="$t('businessPatientHistoryItemAdmin.write')"
                >
              </textarea>
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
        <div class="col-12 col-md-6 mt-2 blocks-section">
          <div class="col-12 text-label fw-bold">
            {{ $t("patientHistoryView.history") }} <i class="bi bi-clock-fill mx-1"></i>
            <div class="form-check form-switch centered">
              <input class="form-check-input m-1" :class="state.asc === false ? 'bg-danger' : ''" type="checkbox" name="asc" id="asc" v-model="state.asc" @click="checkAsc($event)">
              <label class="form-check-label metric-card-subtitle" for="asc">{{ state.asc ? $t("dashboard.asc") :  $t("dashboard.desc") }}</label>
            </div>
          </div>
          <div v-if="state.oldPhysicalExams && state.oldPhysicalExams.length > 0 && state.oldPhysicalExams[0]">
            <div v-for="(element, index) in state.oldPhysicalExams" :key="`exam-${index}`">
              <HistoryDetailsWithItemsCard
                :show="toggles['patient.history.view']"
                :date="element.createdAt"
                :details="element.examDetails"
                :content="element.exam"
              >
              </HistoryDetailsWithItemsCard>
            </div>
          </div>
          <div v-else>
            <Message
              :title="$t('patientHistoryView.message.1.title')"
              :content="$t('patientHistoryView.message.1.content')" />
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
  margin: .2rem .1rem;
  border-radius: .5rem;
  border: 1px solid var(--gris-default);
}
.habit-title {
  text-align: left;
}
.blocks-section {
  overflow-y: scroll;
  max-height: 800px;
  font-size: small;
  margin-bottom: 2rem;
  padding: .5rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  background-color: var(--color-background);
}
</style>