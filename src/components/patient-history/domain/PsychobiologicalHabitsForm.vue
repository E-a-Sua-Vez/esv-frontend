<script>
import { ref, reactive, onBeforeMount, toRefs, watch } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';
import Warning from '../../common/Warning.vue';
import Spinner from '../../common/Spinner.vue';
import Toggle from '@vueform/toggle';
import Message from '../../common/Message.vue';
import HistoryDetailsCard from '../common/HistoryDetailsCard.vue';

export default {
  name: 'PsychobiologicalHabitsForm',
  components: { Warning, Spinner, VueRecaptcha, Toggle, Message, HistoryDetailsCard },
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
      newPsychobiologicalHabits: {},
      oldPsychobiologicalHabits: [],
      captcha: false,
      habitsError: false,
      asc: true
    })

    onBeforeMount(async () => {
      try {
        loading.value = true;
        if (patientHistoryData.value && patientHistoryData.value.id) {
          state.oldPsychobiologicalHabits = patientHistoryData.value.psychobiologicalHabits;
        }
        if (cacheData.value) {
          state.newPsychobiologicalHabits = cacheData.value;
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
      checkAsc
    }
  }
}
</script>
<template>
  <div>
    <div id="form">
      <div class="row">
        <div class="col-6">
          <div id="patient-name-form-add" class="row m-1">
            <div class="col-12 text-label">
              {{ $t("patientHistoryView.psychobiologicalHabits") }} <i class="bi bi-capsule-pill mx-1"></i>
            </div>
            <div class="col-12">
              <textarea
                :disabled="!toggles['patient.history.edit']"
                class="form-control mt-2"
                id="commennt"
                rows="5"
                :max="500"
                @keyup="sendData"
                v-bind:class="{ 'is-invalid': state.habitsError }"
                v-model="state.newPsychobiologicalHabits.habits">
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
        <div class="col-6 blocks-section">
          <div class="col-12 text-label fw-bold">
            {{ $t("patientHistoryView.history") }} <i class="bi bi-clock-fill mx-1"></i>
            <div class="form-check form-switch centered">
              <input class="form-check-input m-1" :class="state.asc === false ? 'bg-danger' : ''" type="checkbox" name="asc" id="asc" v-model="state.asc" @click="checkAsc($event)">
              <label class="form-check-label metric-card-subtitle" for="asc">{{ state.asc ? $t("dashboard.asc") :  $t("dashboard.desc") }}</label>
            </div>
          </div>
          <div v-if="state.oldPsychobiologicalHabits && state.oldPsychobiologicalHabits.length > 0 && state.oldPsychobiologicalHabits[0]">
            <div v-for="(element, index) in state.oldPsychobiologicalHabits" :key="`habits-${index}`">
              <HistoryDetailsCard
                :show="toggles['patient.history.view']"
                :date="element.createdAt"
                :content="element.habits"
              >
              </HistoryDetailsCard>
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