<script>
import SurveyFormBasicFields from './SurveyFormBasicFields.vue';
import SurveyFormQuestions from './SurveyFormQuestions.vue';

export default {
  name: 'SurveyFormEdit',
  components: {
    SurveyFormBasicFields,
    SurveyFormQuestions,
  },
  props: {
    survey: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    questionTypes: { type: Array, default: () => [] },
    queues: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    showQuestions: { type: Boolean, default: false },
    onSelectType: { type: Function, default: null },
    onAddQuestion: { type: Function, default: null },
    onDeleteQuestion: { type: Function, default: null },
  },
  emits: ['update:survey'],
};
</script>

<template>
  <div class="survey-form-edit">
    <SurveyFormBasicFields
      :model-value="survey"
      @update:modelValue="(value) => $emit('update:survey', value)"
      :types="types"
      :queues="queues"
      :toggles="toggles"
      :errors="errors"
      prefix="update-"
      :is-add="false"
      :on-select-type="onSelectType"
    />
    <SurveyFormQuestions
      v-if="showQuestions || (survey.questions && survey.questions.length > 0)"
      :model-value="survey.questions || []"
      @update:modelValue="(value) => $emit('update:survey', { ...survey, questions: value })"
      :question-types="questionTypes"
      :toggles="toggles"
      :errors="errors"
      prefix="update-"
      :is-add="false"
      :on-add-question="onAddQuestion"
      :on-delete-question="onDeleteQuestion"
    />
  </div>
</template>

<style scoped>
.survey-form-edit {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>

