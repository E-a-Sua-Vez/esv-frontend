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
  methods: {
    async copyIdToClipboard(id) {
      if (!id) return;
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(id);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = id;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      } catch (e) {
        // silent fallback
      }
    },
  },
};
</script>

<template>
  <div class="survey-form-edit">
    <SurveyFormBasicFields
      :model-value="survey"
      @update:modelValue="value => $emit('update:survey', value)"
      :types="types"
      :queues="queues"
      :toggles="toggles"
      :errors="errors"
      prefix="update-"
      :is-add="false"
      :on-select-type="onSelectType"
    />
    <div id="survey-id-form" class="row -2 mb-g3" v-if="survey && survey.id">
      <div class="row survey-details-container">
        <div class="col">
          <span><strong>Id:</strong> {{ survey.id }}</span>
          <button
            type="button"
            class="btn btn-link btn-copy-id p-0 ms-2 align-baseline"
            @click="copyIdToClipboard(survey.id)"
            :title="$t('copy') || 'Copiar Id'"
          >
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      </div>
    </div>
    <SurveyFormQuestions
      v-if="showQuestions || (survey.questions && survey.questions.length > 0)"
      :model-value="survey.questions || []"
      @update:modelValue="value => $emit('update:survey', { ...survey, questions: value })"
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

.survey-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.btn-copy-id {
  font-size: 0.8rem;
  color: var(--gris-default);
  text-decoration: none;
}

.btn-copy-id:hover {
  color: var(--primary-color, #000);
  text-decoration: none;
}
</style>
