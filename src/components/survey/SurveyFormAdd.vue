<script>
import SurveyFormBasicFields from './SurveyFormBasicFields.vue';
import SurveyFormQuestions from './SurveyFormQuestions.vue';

export default {
  name: 'SurveyFormAdd',
  components: {
    SurveyFormBasicFields,
    SurveyFormQuestions,
  },
  props: {
    modelValue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    questionTypes: { type: Array, default: () => [] },
    queues: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    questions: { type: Array, default: () => [] },
    showQuestions: { type: Boolean, default: false },
    onSelectType: { type: Function, default: null },
    onAddQuestion: { type: Function, default: null },
    onDeleteQuestion: { type: Function, default: null },
  },
  emits: ['update:modelValue'],
  computed: {
    survey: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      },
    },
  },
};
</script>

<template>
  <div class="survey-form-add">
    <SurveyFormBasicFields
      v-model="survey"
      :types="types"
      :queues="queues"
      :toggles="toggles"
      :errors="errors"
      prefix="add-"
      :is-add="true"
      :on-select-type="onSelectType"
    />
    <SurveyFormQuestions
      v-if="showQuestions || (questions && questions.length > 0)"
      :model-value="questions"
      @update:modelValue="$emit('update:questions', $event)"
      :question-types="questionTypes"
      :toggles="toggles"
      :errors="errors"
      prefix="add-"
      :is-add="true"
      :on-add-question="onAddQuestion"
      :on-delete-question="onDeleteQuestion"
    />
  </div>
</template>

<style scoped>
.survey-form-add {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
