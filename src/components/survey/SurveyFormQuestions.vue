<script>
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';

export default {
  name: 'SurveyFormQuestions',
  components: { Toggle, Popper },
  props: {
    modelValue: { type: Array, default: () => [] },
    questionTypes: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
    onAddQuestion: { type: Function, default: null },
    onDeleteQuestion: { type: Function, default: null },
  },
  emits: ['update:modelValue'],
  computed: {
    questions: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      },
    },
  },
  methods: {
    handleAddQuestion() {
      if (this.onAddQuestion) {
        this.onAddQuestion(this.questions);
      }
    },
    handleDeleteQuestion(question) {
      if (this.onDeleteQuestion) {
        this.onDeleteQuestion(question);
      }
    },
  },
};
</script>

<template>
  <div v-if="questions && questions.length > 0" class="survey-questions-container">
    <div class="questions-header">
      <button type="button" class="add-question-btn" @click="handleAddQuestion">
        <i class="bi bi-plus-circle"></i>
        {{ $t('businessSurveysAdmin.addQuestion') }}
      </button>
    </div>
    <div
      v-for="(question, ind) in questions"
      :key="`question-${prefix}.${ind}`"
      class="question-card"
    >
      <div class="form-fields-container">
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessSurveysAdmin.question') }}
          </label>
          <input
            :id="`${prefix}question-title-${ind}`"
            type="text"
            class="form-control-modern"
            :class="{ 'is-invalid': errors.questionTitleError }"
            v-model="question.title"
            placeholder="Question title"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessSurveysAdmin.type') }}
            <Popper v-if="prefix === 'add-'" :class="'dark p-1'" arrow disable-click-away>
              <template #content>
                <div>{{ $t('businessSurveysAdmin.typeQuestionHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <select
            :id="`${prefix}question-type-${ind}`"
            class="form-control-modern form-select-modern"
            :class="{ 'is-invalid': errors.typeError }"
            v-model="question.type"
          >
            <option v-for="typ in questionTypes" :key="typ" :value="typ">
              {{ $t(`surveys.question_types.${typ}`) }}
            </option>
          </select>
        </div>
        <div
          v-if="question.type === 'OPEN_OPTIONS' || question.type === 'CHOOSE_OPTION'"
          class="form-group-modern form-group-toggle"
        >
          <label class="form-label-modern">
            {{ $t('businessSurveysAdmin.otherOption') }}
            <Popper v-if="prefix === 'add-'" :class="'dark p-1'" arrow disable-click-away>
              <template #content>
                <div>{{ $t('businessSurveysAdmin.otherOptionQuestionHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <Toggle :id="`${prefix}question-otherOption-${ind}`" v-model="question.otherOption" />
        </div>
        <div
          v-if="
            (question.type === 'OPEN_OPTIONS' || question.type === 'CHOOSE_OPTION') &&
            question.otherOption === true
          "
          class="form-group-modern form-group-toggle"
        >
          <label class="form-label-modern">
            {{ $t('businessSurveysAdmin.otherOpen') }}
            <Popper v-if="prefix === 'add-'" :class="'dark p-1'" arrow disable-click-away>
              <template #content>
                <div>{{ $t('businessSurveysAdmin.otherOpenQuestionHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <Toggle :id="`${prefix}question-otherOpen-${ind}`" v-model="question.otherOptionOpen" />
        </div>
        <div v-if="question.type === 'OPEN_WRITING'" class="form-group-modern form-group-toggle">
          <label class="form-label-modern">
            {{ $t('businessSurveysAdmin.analize') }}
            <Popper v-if="prefix === 'add-'" :class="'dark p-1'" arrow disable-click-away>
              <template #content>
                <div>{{ $t('businessSurveysAdmin.analizeIAQuestionHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <Toggle :id="`${prefix}question-analize-${ind}`" v-model="question.analize" />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessSurveysAdmin.order') }}
            <Popper v-if="prefix === 'add-'" :class="'dark p-1'" arrow disable-click-away>
              <template #content>
                <div>{{ $t('businessSurveysAdmin.orderQuestionHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}question-order-${ind}`"
            min="1"
            :max="questions.length + 1"
            type="number"
            class="form-control-modern"
            :class="{ 'is-invalid': errors.orderAddError }"
            v-model="question.order"
            placeholder="1"
          />
        </div>
        <div
          v-if="question.type === 'OPEN_OPTIONS' || question.type === 'CHOOSE_OPTION'"
          class="form-group-modern"
        >
          <label class="form-label-modern">
            {{ $t('businessSurveysAdmin.options') }}
            <Popper :class="'dark p-1'" arrow disable-click-away>
              <template #content>
                <div>{{ $t('businessSurveysAdmin.optionsHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}question-options-${ind}`"
            type="text"
            class="form-control-modern"
            :class="{ 'is-invalid': errors.questionOptionsError }"
            v-model="question.options"
            placeholder="Answer 1,Answer 2"
          />
        </div>
        <div class="question-actions">
          <button type="button" class="delete-question-btn" @click="handleDeleteQuestion(question)">
            <i class="bi bi-trash3-fill"></i>
            {{ $t('businessSurveysAdmin.deleteQuestion') }}
          </button>
          <Popper v-if="prefix === 'add-'" :class="'dark p-1'" arrow disable-click-away>
            <template #content>
              <div>{{ $t('businessSurveysAdmin.deleteQuestionHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </div>
      </div>
    </div>
  </div>
  <div v-else-if="isAdd" class="survey-questions-container">
    <div class="questions-header">
      <button type="button" class="add-question-btn" @click="handleAddQuestion">
        <i class="bi bi-plus-circle"></i>
        {{ $t('businessSurveysAdmin.addQuestion') }}
      </button>
      <Popper :class="'dark p-1'" arrow disable-click-away>
        <template #content>
          <div>{{ $t('businessSurveysAdmin.addQuestionHelp') }}</div>
        </template>
        <i class="bi bi-info-circle-fill h7"></i>
      </Popper>
    </div>
  </div>
</template>

<style scoped>
.survey-questions-container {
  margin-top: 1rem;
}

.questions-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.add-question-btn {
  background: none;
  border: none;
  color: rgba(0, 74, 173, 0.8);
  text-decoration: underline;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s ease;
}

.add-question-btn:hover {
  color: rgba(0, 74, 173, 1);
  text-decoration: none;
}

.question-card {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}

.question-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.delete-question-btn {
  background: none;
  border: none;
  color: var(--rojo-warning, #dc3545);
  text-decoration: underline;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.2s ease;
}

.delete-question-btn:hover {
  color: #c82333;
  text-decoration: none;
}

/* Form Fields Container */
.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0;
}

/* Form Group Modern */
.form-group-modern {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
}

.form-group-toggle {
  justify-content: space-between;
}

/* Form Label Modern */
.form-label-modern {
  min-width: 120px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
  text-transform: capitalize;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  padding-top: 0.4rem;
}

/* Form Control Modern */
.form-control-modern,
.form-select-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #212529;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 5px;
  transition: all 0.2s ease;
}

.form-control-modern:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 74, 173, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 74, 173, 0.1);
}

.form-select-modern {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.625rem center;
  background-size: 1rem;
  padding-right: 2.5rem;
  appearance: none;
}

/* Toggle Styles */
:deep(.toggle) {
  --toggle-width: 2.25rem;
  --toggle-height: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .form-group-modern {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-label-modern {
    min-width: auto;
    width: 100%;
    padding-top: 0;
  }
}
</style>



