<script>
import { createForm } from '../../application/services/form';
import Message from '../common/Message.vue';
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';
import LikeForm from '../form/LikeForm.vue';
import { getCivilStatuses, getPatientHistoryItemFrequenciesTypes, getSexs } from '../../shared/utils/data';
import { useI18n } from 'vue-i18n';
import Warning from '../common/Warning.vue';

export default {
  name: 'FormDisplay',
  components: {
    Alert,
    Message,
    Spinner,
    LikeForm,
    Warning
  },
  props: {
    formPersonalized: { type: Object, default: {} },
    commerceId: { type: String, default: undefined },
    clientId: { type: String, default: undefined },
    attentionId: { type: String, default: undefined },
    bookingId: { type: String, default: undefined },
    queueId: { type: String, default: undefined }
  },
  data() {
    const { t } = useI18n();
    return {
      like: undefined,
      answers: [],
      answersClient: [],
      formCompleted: false,
      formPersonalizedIn: {},
      patientHistoryItemFrequenciesTypes: [],
      loading: false,
      alertError: '',
      occupation: undefined,
      sex: undefined,
      civilStatus: undefined,
      sexs: [],
      civilStatuses: [],
      errorsAdd: [],
      body: {},
      t
    }
  },
  beforeMount() {
    this.patientHistoryItemFrequenciesTypes = getPatientHistoryItemFrequenciesTypes();
    this.sexs = getSexs().map(sex => sex.id).join(',');
    this.civilStatuses = getCivilStatuses().map(sex => sex.id).join(',');
    if (this.formPersonalized && this.formPersonalized.questions && this.formPersonalized.questions.length > 0) {
      if (this.formPersonalized.type === 'FIRST_ATTENTION') {
        this.formPersonalized.questions.forEach(question => {
        if (question.patientHistoryItem.type === 'PERSONAL_HISTORY') {
          if (question.patientHistoryItem.characteristics.check === true) {
            this.answers.push({ check: false });
          } else {
            this.answers.push({ });
          }
        } else {
          this.answers.push({});
        }
      })
    }} else if (this.formPersonalized.type === 'PRE_ATTENTION') {

    }
  },
  methods: {
    checkOption(event, index, option) {
      if (this.answers[index] === undefined ||
        Object.keys(this.answers[index]).length === 0
      ) {
        this.answers[index] = [];
      }
      if (event.target.checked) {
        if (!this.answers[index].includes(option)) {
          this.answers[index].push(option);
        }
      } else {
        this.answers[index] = this.answers[index].filter(el => el !== option);
      }
    },
    fillOtherOption(event, index) {
      if (this.answers[index] === undefined) {
        this.answers[index] = [];
      }
      let option;
      if (event.target.value) {
        const options = event.target.value.toUpperCase().split(',');
        option = options.filter(opt => opt && opt.length > 0).map(opt => opt.trim().toUpperCase());
        if (!this.answers[index].includes(option)) {
          const filtered = state.habitsAux[item.id].answer.filter(ans => item.characteristics.options.includes(ans) && ans.length > 0);
          this.answers[index] = Array.from(new Set([...filtered, ...option]));
        }
      } else {
        this.answers[index] = this.answers[index].filter(el => el !== option);
      }
    },
    selectOption(event, index, option) {
      this.answers[index] = [];
      if (event.target.checked) {
        const element = option.toUpperCase();
        this.answers[index].push(element);
      }
    },
    setOption(index, option) {
      const element = option.toUpperCase();
      this.answers[index] = element;
    },
    setResultOption(event, index) {
      if (event.target.value) {
        const element = event.target.value.toUpperCase();
        this.answers[index].result = element;
      }
    },
    setCommentOption(event, index) {
      if (event.target.value) {
        const element = event.target.value.toUpperCase();
        this.answers[index].comment = element;
      }
    },
    backToBooking() {
      if (this.bookingId) {
        this.$router.push({  name: 'commerce-queue-booking', params: { id: this.bookingId } })
      }
    },
    backToAttention() {
      if (this.attentionId) {
        this.$router.push({  name: 'commerce-queue-attention', params: { id: this.attentionId, queueId: this.queueId } })
      }
    },
    checkActual(index, $event) {
      if ($event.target.checked !== undefined) {
        this.answers[index].actual = $event.target.checked ;
      }
    },
    checkItem(index, $event) {
      if ($event.target.checked !== undefined) {
        this.answers[index].check = $event.target.checked;
      }
    },
    validateAnswers () {
      this.errorsAdd = [];
      if (this.body) {
        let questionWithoutAnswer = 0;
        if (this.body.answers && this.body.answers.length > 0) {
          this.body.answers.forEach(ans => {
            if (Object.keys(ans.answer).length === 0) {
              questionWithoutAnswer += 1;
            }
          })

          if (questionWithoutAnswer > 0) {
            this.errorsAdd.push('attentionForm.validate.withoutAnswer');
          }
        }
      }
      if(this.errorsAdd.length === 0) {
        return true;
      }
      return false;
    },
    async saveForm() {
      try {
        this.loading = true;
        this.alertError = '';
        let answersCollected = [];
        if (this.formPersonalized.questions && this.formPersonalized.questions.length > 0) {
          answersCollected = this.formPersonalized.questions.map((question, ind) =>  {
            if (question) {
              const answer = {
                id: question.patientHistoryItem?.id || undefined,
                characteristics: question.patientHistoryItem?.characteristics || undefined,
                title: question.title,
                type: question.patientHistoryItem?.type || question.type,
                answer: this.answers[ind]
              };
              return answer;
            }
          })
        }
        this.body = {
          commerceId: this.commerceId,
          personalizedId: this.formPersonalized.id || undefined,
          clientId: this.clientId,
          attentionId: this.attentionId,
          bookingId: this.bookingId,
          type: this.formPersonalized.type,
          questions: this.formPersonalized.questions || [],
          answers: answersCollected || []
        };
        if (this.validateAnswers()) {
          await createForm(this.body);
          this.formCompleted = true;
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    }
  }
}
</script>

<template>
  <div v-if="formPersonalized.id" class="mt-4">
    <div v-if="!formCompleted">
      <div v-if="formPersonalized.questions && formPersonalized.questions.length > 0">
        <div v-for="(question, index) in formPersonalized.questions" :key="`question-${index}`" class="mt-4">
          <div class="your-rating">
            <span> {{ question.title.trim() }}</span>
          </div>
          <div v-if="formPersonalized.type === 'FIRST_ATTENTION'">
            <div v-if="question.patientHistoryItem && question.patientHistoryItem.type === 'PATIENT_SEX'">
              <div class="form-check form-switch check-option" v-for="(option, ind) in sexs.split(',')" :key="`sex-${ind}`">
                <input
                  class="form-check-input"
                  type="radio"
                  :name="`option-sex-${option.id}`"
                  :id="`option-sex-${0}`"
                  @click="selectOption($event, index, option)"
                  >
                <label class="form-check-label" :for="`option-${0}`">{{ $t(`sexs.${option.toUpperCase().trim()}`) }}</label>
              </div>
            </div>
            <div v-if="question.patientHistoryItem && question.patientHistoryItem.type === 'PATIENT_CIVIL_STATUS'">
              <div class="form-check form-switch check-option" v-for="(option, ind) in civilStatuses.split(',')" :key="`civilStatus-${ind}`">
                <input
                  class="form-check-input"
                  type="radio"
                  :name="`option-civilStatus-${option.id}`"
                  :id="`option-civilStatus-${0}`"
                  @click="selectOption($event, index, option)"
                  >
                <label class="form-check-label" :for="`option-${1}`">{{ $t(`civilStatuses.${option.toUpperCase().trim()}`) }}</label>
              </div>
            </div>
            <div v-if="question.patientHistoryItem && question.patientHistoryItem.type === 'PATIENT_OCCUPATION'">
              <div>
                <input
                  type="text"
                  class="form-control mt-2"
                  v-model.trim="occupation"
                  @keyup="setOption(index, occupation)">
              </div>
            </div>
            <div v-if="question.patientHistoryItem && question.patientHistoryItem.type === 'PERSONAL_HISTORY'">
              <div>
                <div v-if="question.patientHistoryItem.active === true && question.patientHistoryItem.online === true" class="row item-card">
                  <div :id="`details-${question.patientHistoryItem.id}`" class="mt-2">
                    <!-- SELECT 1 -->
                    <div v-if="question.patientHistoryItem.characteristics && question.patientHistoryItem.characteristics.select1">
                      <div class="form-check form-switch check-option" v-for="(option, ind) in question.patientHistoryItem.characteristics.options.split(',')" :key="`option-${ind}`">
                        <input
                          class="form-check-input"
                          type="radio"
                          :name="`option-${question.title}`"
                          :id="`option-${index}`"
                          @click="selectOption($event, index, option)"
                          >
                        <label class="form-check-label" :for="`option-${index}`">{{ option.toUpperCase().trim() }}</label>
                      </div>
                      <div class="col form-floating">
                        <input
                          :id="`option-other-${index}`"
                          maxlength="50"
                          type="text"
                          class="form-control form-control-solid"
                          :name="`option-other`"
                          placeholder="Other"
                          v-on:blur="fillOtherOption($event, index, option)">
                          <label for="option-other" class="label-form">{{ $t("attentionForm.other") }}</label>
                      </div>
                    </div>
                    <!-- SELECT N -->
                    <div v-else-if="question.patientHistoryItem.characteristics && question.patientHistoryItem.characteristics.selectN">
                      <div class="form-check form-switch check-option" v-for="(option, ind) in question.patientHistoryItem.characteristics.options.split(',')" :key="`option-${ind}`">
                        <input
                          class="form-check-input"
                          type="checkbox"
                          :name="`option-${option.title}`"
                          :id="`option-${index}`"
                          @click="checkOption($event, index, option)"
                          >
                        <label class="form-check-label" for="option">{{ option.toUpperCase().trim() }}</label>
                      </div>
                      <div class="col form-floating">
                        <input
                          :id="`option-other-${index}`"
                          maxlength="50"
                          type="text"
                          class="form-control form-control-solid"
                          :name="`option-other`"
                          placeholder="Other"
                          v-on:blur="fillOtherOption($event, index, option)">
                          <label for="option-other" class="label-form">{{ $t("attentionForm.other") }}</label>
                      </div>
                    </div>
                    <!-- SELECT YES NO -->
                    <div v-else-if="question.patientHistoryItem.characteristics && question.patientHistoryItem.characteristics.yesNo">
                      <LikeForm
                        :show="true"
                        v-model:like="answers[index].answer"
                      ></LikeForm>
                      <div v-if="question.patientHistoryItem.characteristics.result && answers[index].answer === 'YES'">
                        <input
                          :id="`option-other-${index}`"
                          maxlength="50"
                          type="text"
                          class="form-control form-control-solid"
                          :name="`option-other`"
                          :placeholder="$t('attentionForm.yesExplain')"
                          v-on:blur="setResultOption($event, index)">
                      </div>
                    </div>
                    <!-- SELECT CHECK -->
                    <div v-else-if="question.patientHistoryItem.characteristics && question.patientHistoryItem.characteristics.check">
                      <div>
                        <div class="form-check form-switch centered" v-if="question.patientHistoryItem.characteristics.check && question.patientHistoryItem.characteristics.check === true">
                          <input class="form-check-input" type="checkbox" :name="question.patientHistoryItem.name" id="item.id" @click="checkItem(index, $event)">
                        </div>
                      </div>
                      <div v-if="answers[index].check === true" class="">
                        <div v-if="question.patientHistoryItem.characteristics.actual && question.patientHistoryItem.characteristics.actual === true">
                          <div class="form-check form-switch centered">
                            <label class="form-check-label metric-card-subtitle">{{  $t("businessPatientHistoryItemAdmin.actual") }}</label>
                            <input class="form-check-input m-1" type="checkbox" :id="`actual-${question.patientHistoryItem.id}`" @click="checkActual(index, $event)">
                          </div>
                        </div>
                        <div>
                          <div class="row centered">
                            <div class="col-6">
                              <div class="row">
                                <div class="col">
                                  <label class="form-check-label metric-card-subtitle">{{  $t("businessPatientHistoryItemAdmin.ageFrom") }}</label>
                                </div>
                                <div class="col">
                                  <input
                                    min="1"
                                    max="100"
                                    type="number"
                                    @keyup="sendData"
                                    v-model.trim="answers[index].ageFrom"
                                    class="form-control form-control-sm">
                                </div>
                              </div>
                            </div>
                            <div class="col-6" v-if="question.patientHistoryItem.characteristics.ageFrom && question.patientHistoryItem.characteristics.ageFrom === true && !answers[index].actual">
                              <div class="row">
                                <div class="col">
                                  <label class="form-check-label metric-card-subtitle">{{  $t("businessPatientHistoryItemAdmin.ageTo") }}</label>
                                </div>
                                <div class="col">
                                  <input
                                    min="1"
                                    max="100"
                                    type="number"
                                    v-model.trim="answers[index].ageTo"
                                    class="form-control form-control-sm">
                                </div>
                              </div>
                            </div>
                          </div>
                          <div class="row centered" v-if="question.patientHistoryItem.characteristics.frequency && question.patientHistoryItem.characteristics.frequency === true">
                            <div class="row mt-1">
                              <div class="col">
                                <label class="form-check-label metric-card-subtitle">{{  $t("businessPatientHistoryItemAdmin.frequency") }}</label>
                              </div>
                              <div class="col">
                                <select class="btn btn-sm btn-light fw-bold text-dark select" v-model="answers[index].frequency">
                                  <option v-for="value in patientHistoryItemFrequenciesTypes" :key="value.id" :value="value.id" id="select-block">{{ $t(`patientHistoryItemFrequenciesTypes.${value.name}`) }}</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- SELECT COMMENT -->
                    <div class="row item-card" v-else-if="question.patientHistoryItem.characteristics && question.patientHistoryItem.characteristics.comment">
                      <div class="col mb-1" v-if="question.patientHistoryItem.characteristics && question.patientHistoryItem.characteristics.comment">
                        <textarea
                          class="form-control form-control-sm"
                          rows="3"
                          :max="200"
                          :value="''"
                          :placeholder="$t('businessPatientHistoryItemAdmin.write')"
                          v-on:blur="setCommentOption($event, index)">
                        </textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="formPersonalized.type === 'PRE_ATTENTION'">
            <div v-if="question.type === 'YES_OR_NOT'">
              <LikeForm
                :show="true"
                v-model:like="answers[index]"
              ></LikeForm>
            </div>
            <div v-else-if="question.type === 'OPEN_TEXT_FIELD'">
              <input
                type="text"
                class="form-control mt-2"
                v-model.trim="answers[index]"
                :placeholder="$t('attentionForm.writing.placeholder')">
            </div>
            <div v-else-if="question.type === 'OPEN_NUMBER_FIELD'">
              <input
                type="number"
                class="form-control mt-2"
                v-model.trim="answers[index]"
                :placeholder="$t('attentionForm.writing.placeholder')">
            </div>
            <div v-else-if="question.type === 'OPEN_WRITING'">
              <textarea
                class="form-control mt-2"
                id="commennt"
                rows="3"
                v-model.trim="answers[index]"
                :placeholder="$t('attentionForm.writing.placeholder')">
              </textarea>
            </div>
            <div v-else-if="question.type === 'OPEN_OPTIONS'" class="mt-3">
              <div class="form-check form-switch check-option" v-for="(option, ind) in question.options.split(',')" :key="`option-${ind}`">
                <input
                  class="form-check-input"
                  type="checkbox"
                  :name="`option-${option.title}`"
                  :id="`option-${index}`"
                  @click="checkOption($event, index, option)"
                  >
                <label class="form-check-label" for="option">{{ option.toUpperCase().trim() }}</label>
              </div>
              <div class="col form-floating" v-if="question.otherOption && question.otherOptionOpen">
                <input
                  :id="`option-other-${index}`"
                  maxlength="50"
                  type="text"
                  class="form-control form-control-solid"
                  :name="`option-other`"
                  placeholder="Other"
                  v-on:blur="fillOtherOption($event, index, option)">
                  <label for="option-other" class="label-form">{{ $t("attentionForm.other") }}</label>
              </div>
              <div v-else-if="question.otherOption && !question.otherOptionOpen">
                <div class="form-check form-switch check-option">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    :name="`option-other-${index}`"
                    :id="`option-${index}`"
                    @click="checkOption($event, index, 'OTHER')"
                    >
                  <label class="form-check-label" for="option">{{ $t("attentionForm.other") }}</label>
                </div>
              </div>
            </div>
            <div v-else-if="question.type === 'CHOOSE_OPTION'" class="mt-2">
              <div class="form-check form-switch check-option" v-for="(option, ind) in question.options.split(',')" :key="`option-${ind}`">
                <input
                  class="form-check-input"
                  type="radio"
                  :name="`option-${question.title}`"
                  :id="`option-${index}`"
                  @click="selectOption($event, index, option)"
                  >
                <label class="form-check-label" :for="`option-${index}`">{{ option.toUpperCase().trim() }}</label>
              </div>
              <div class="col form-floating" v-if="question.otherOption && question.otherOptionOpen">
                <input
                  :id="`option-other-${index}`"
                  maxlength="50"
                  type="text"
                  class="form-control form-control-solid"
                  :name="`option-other`"
                  placeholder="Other"
                  v-on:blur="fillOtherOption($event, index, option)">
                  <label for="option-other" class="label-form">{{ $t("attentionForm.other") }}</label>
              </div>
              <div v-else-if="question.otherOption && !question.otherOptionOpen">
                <div class="form-check form-switch check-option">
                  <input
                    class="form-check-input"
                    type="radio"
                    :name="`option-${question.title}`"
                    :id="`option-${index}`"
                    @click="checkOption($event, index, 'OTHER')"
                    >
                  <label class="form-check-label" for="option">{{ 'OTHER'.toUpperCase().trim() }}</label>
                </div>
              </div>
            </div>
          </div>
          <hr>
        </div>
      </div>
      <div class="mt-3">
        <a
          class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
          @click="saveForm()">
          {{ $t("attentionForm.actions.1.action") }} <i class="bi bi-check-all"></i>
        </a>
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div class="row g-1 errors" id="feedback" v-if="(errorsAdd.length > 0)">
        <Warning>
          <template v-slot:message>
            <li v-for="(error, index) in errorsAdd" :key="index">
              {{ $t(error) }}
            </li>
          </template>
        </Warning>
      </div>
    </div>
    <div v-else>
      <Message
        :title="$t('attentionForm.message.1.title')"
        :content="$t('attentionForm.message.1.content')"
        :icon="'bi bi-emoji-sunglasses'">
      </Message>
      <a
        v-if="bookingId"
        class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
        @click="backToBooking()">
        {{ $t("attentionForm.actions.2.action") }} <i class="bi bi-arrow-left"></i>
      </a>
      <a
        v-else-if="attentionId"
        class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
        @click="backToAttention()">
        {{ $t("attentionForm.actions.3.action") }} <i class="bi bi-arrow-left"></i>
      </a>
    </div>
  </div>
  <div v-else>
    <Message
      :title="$t('attentionForm.message.2.title')"
      :content="$t('attentionForm.message.2.content')"
      :icon="'bi bi-emoji-sunglasses'">
    </Message>
  </div>
</template>

<style scoped>
.details {
  line-height: normal;
}
.your-rating {
 line-height: 1.1rem;
}
.your-rating-2 {
 line-height: 1.1rem;
 text-align: left;
}
.check-option {
  text-align: left;
}
.title {
  font-size: 12px;
  font-weight: 500;
}
</style>