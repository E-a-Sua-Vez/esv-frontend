<script>
import { ref, reactive, onBeforeMount, toRefs, watch } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';
import Warning from '../../common/Warning.vue';
import Spinner from '../../common/Spinner.vue';
import Toggle from '@vueform/toggle';
import Message from '../../common/Message.vue';
import { getControlReasonsTypes, getControlStatusTypes } from '../../../shared/utils/data';
import HistoryControlDetailsCard from '../common/HistoryControlDetailsCard.vue';

export default {
  name: 'ControlForm',
  components: { Warning, Spinner, VueRecaptcha, Toggle, Message, HistoryControlDetailsCard },
  props: {
    commerce: { type: Object, default: {} },
    cacheData: { type: Object, default: undefined },
    patientHistoryData: { type: Object, default: {} },
    toggles: { type: Object, default: {} },
    errorsAdd: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} },
    onSave: { type: Function, default: () => {} },
    onUpdate: { type: Function, default: () => {} },
  },
  async setup(props) {
    const loading = ref(false);

    const { commerce, cacheData, patientHistoryData, toggles, errorsAdd } = toRefs(props);

    const { receiveData, onSave, onUpdate } = props;

    const state = reactive({
      newControl: {},
      oldControl: [],
      status: [],
      reasons: [],
      clientId: undefined,
      captcha: false,
      controlError: false,
      showAdd: false,
      date: new Date().toISOString().slice(0, 10),
      status: 'PENDING',
      reason: undefined,
      result: undefined,
      errorsAddControl: [],
      asc: true,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.reasons = getControlReasonsTypes();
        state.statuses = getControlStatusTypes();
        if (patientHistoryData.value && patientHistoryData.value.id) {
          state.oldControl = patientHistoryData.value.control;
          state.clientId = patientHistoryData.value.clientId;
        }
        if (cacheData.value) {
          state.newControl = cacheData.value;
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const sendData = () => {
      receiveData(state.newControl);
    };

    const checkAsc = event => {
      if (event.target.checked) {
        state.asc = true;
      } else {
        state.asc = false;
      }
      if (state.oldControl && state.oldControl.length > 0) {
        let elementsSorted = [];
        const elements = state.oldControl;
        if (state.asc) {
          elementsSorted = elements.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        } else {
          elementsSorted = elements.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        state.oldControl = elementsSorted;
      }
    };

    const validateAdd = control => {
      state.errorsAddControl = [];
      if (!control.reason || control.reason.length === 0) {
        state.reasonError = true;
        state.errorsAddControl.push('patientHistoryView.validate.control.reason');
      } else {
        state.reasonError = false;
      }
      if (!control.status || control.status.length === 0) {
        state.statusError = true;
        state.errorsAddControl.push('patientHistoryView.validate.control.status');
      } else {
        state.statusError = false;
      }
      if (!control.scheduledDate || control.scheduledDate.length === 0) {
        state.scheduledDateError = true;
        state.errorsAddControl.push('patientHistoryView.validate.control.scheduledDate');
      } else {
        state.scheduledDateError = false;
      }
      if (state.errorsAddControl.length === 0) {
        return true;
      }
      return false;
    };

    const addControl = () => {
      state.newControl = {
        reason: state.reason || undefined,
        status: state.status || undefined,
        scheduledDate: state.date || undefined,
        controlResult: state.result || undefined,
      };
      if (validateAdd(state.newControl)) {
        sendData();
        onSave();
        resetAdd();
        state.showAdd = false;
      }
    };

    const updateControl = (index, reason, status, controlResult) => {
      if (state.oldControl && state.oldControl.length > 0) {
        const element = state.oldControl[index];
        if (reason) {
          element.reason = reason;
        }
        if (status) {
          element.status = status;
        }
        if (controlResult) {
          element.controlResult = controlResult;
        }
        onUpdate(state.oldControl);
      }
    };

    const resetAdd = () => {
      state.date = new Date().toISOString().slice(0, 10);
      state.status = 'PENDING';
      state.reason = undefined;
      state.result = undefined;
    };

    const showAdd = () => {
      state.showAdd = !state.showAdd;
    };

    watch(patientHistoryData, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        if (
          patientHistoryData.value.control &&
          patientHistoryData.value.control.length > 0 &&
          patientHistoryData.value.control[0]
        )
          state.oldControl = patientHistoryData.value.control;
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
      addControl,
      showAdd,
      updateControl,
    };
  },
};
</script>
<template>
  <div>
    <div id="form">
      <div class="row">
        <div class="col-12 col-md-6 mt-2">
          <div id="patient-name-form-add" class="row m-1">
            <div class="col-12 text-label">
              {{ $t('patientHistoryView.control') }}
              <i class="bi bi-file-earmark-medical-fill mx-1"></i>
            </div>
            <div class="row mt-2">
              <button
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                @click="showAdd()"
                :disabled="!toggles['patient.history.control-edit']"
              >
                <i class="bi bi-plus-lg"></i> {{ $t('patientHistoryView.addControl') }}
              </button>
            </div>
            <div id="add-control" v-if="state.showAdd" class="metric-card">
              <div class="mt-2">
                <div class="row">
                  <div class="col-12 col-md my-1 lefted">
                    <label class="metric-card-subtitle mx-2 habit-title" for="select-reason">
                      {{ $t('patientHistoryView.controlReason') }}
                    </label>
                    <select
                      class="btn btn-sm btn-light fw-bold text-dark select"
                      v-model="state.reason"
                    >
                      <option
                        v-for="reason in state.reasons"
                        :key="reason.name"
                        :value="reason.id"
                        id="select-queue"
                      >
                        {{ $t(`controlReasonTypes.${reason.id}`) }}
                      </option>
                    </select>
                  </div>
                </div>
                <div class="row">
                  <div class="col-12 col-md my-1 lefted">
                    <label class="metric-card-subtitle mx-2 habit-title" for="select-status">
                      {{ $t('patientHistoryView.controlStatus') }}
                    </label>
                    <select
                      class="btn btn-sm btn-light fw-bold text-dark select"
                      v-model="state.status"
                    >
                      <option
                        v-for="status in state.statuses"
                        :key="status.name"
                        :value="status.id"
                        id="select-queue"
                      >
                        {{ $t(`controlStatusTypes.${status.id}`) }}
                      </option>
                    </select>
                  </div>
                </div>
                <div class="row">
                  <div class="col-12 col-md my-1 lefted habit-title">
                    <label class="metric-card-subtitle mx-2">
                      {{ $t('patientHistoryView.controlDate') }}
                    </label>
                    <input
                      id="endDate"
                      class="form-control form-control-sm"
                      type="date"
                      v-model="state.date"
                    />
                  </div>
                </div>
                <div class="row">
                  <div class="col-12 col-md my-1 lefted">
                    <textarea
                      :disabled="!toggles['patient.history.control-edit']"
                      class="form-control form-control-sm"
                      id="commennt"
                      rows="5"
                      :max="500"
                      :value="state.result"
                      :placeholder="$t('businessPatientHistoryItemAdmin.write')"
                    >
                    </textarea>
                  </div>
                </div>
                <div class="row">
                  <div class="col-12 col-md my-1">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 mt-2"
                      @click="addControl()"
                      :disabled="!toggles['patient.history.control-edit']"
                    >
                      <i class="bi bi-person-check-fill"> </i> {{ $t('patientHistoryView.add') }}
                    </button>
                  </div>
                </div>
                <div
                  class="row g-1 errors"
                  id="feedback"
                  v-if="state.errorsAddControl && state.errorsAddControl.length > 0"
                >
                  <Warning>
                    <template v-slot:message>
                      <li v-for="(error, index) in state.errorsAddControl" :key="index">
                        {{ $t(error) }}
                      </li>
                    </template>
                  </Warning>
                </div>
              </div>
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
            {{ $t('patientHistoryView.history') }} <i class="bi bi-clock-fill mx-1"></i>
            <div class="form-check form-switch centered">
              <input
                class="form-check-input m-1"
                :class="state.asc === false ? 'bg-danger' : ''"
                type="checkbox"
                name="asc"
                id="asc"
                v-model="state.asc"
                @click="checkAsc($event)"
              />
              <label class="form-check-label metric-card-subtitle" for="asc">{{
                state.asc ? $t('dashboard.asc') : $t('dashboard.desc')
              }}</label>
            </div>
          </div>
          <div v-if="state.oldControl && state.oldControl.length > 0 && state.oldControl[0]">
            <div v-for="(element, index) in state.oldControl" :key="`control-${index}`">
              <HistoryControlDetailsCard
                :show="toggles['patient.history.view']"
                :date="element.scheduledDate"
                :commerce="commerce"
                :client-id="state.clientId"
                :content="element.controlResult"
                :status="element.status"
                :reason="element.reason"
                :toggles="toggles"
                :index="index"
                @onSave="updateControl"
              >
              </HistoryControlDetailsCard>
            </div>
          </div>
          <div v-else>
            <Message
              :title="$t('patientHistoryView.message.1.title')"
              :content="$t('patientHistoryView.message.1.content')"
            />
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
  background-color: var(--color-background);
}
.show {
  max-height: 2000px !important;
  overflow-y: visible;
}
.habit-title {
  text-align: left;
}
</style>
