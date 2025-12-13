<script>
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';

export default {
  name: 'SurveyFormBasicFields',
  components: { Toggle, Popper },
  props: {
    modelValue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    queues: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
    onSelectType: { type: Function, default: null },
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
  methods: {
    handleTypeChange() {
      if (this.onSelectType) {
        this.onSelectType(this.survey, this.isAdd ? 'add' : 'update');
      }
    },
  },
};
</script>

<template>
  <div class="form-fields-container">
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessSurveysAdmin.type') }}
        <Popper :class="'dark p-1'" arrow disable-click-away>
          <template #content>
            <div>{{ $t('businessSurveysAdmin.typeHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <select
        :id="`${prefix}survey-type-form`"
        class="form-control-modern form-select-modern"
        :class="{ 'is-invalid': errors.typeError }"
        v-model="survey.type"
        @change="handleTypeChange"
      >
        <option v-for="typ in types" :key="typ" :value="typ">
          {{ $t(`surveys.types.${typ}`) }}
        </option>
      </select>
    </div>
    <div class="form-group-modern form-group-toggle">
      <label class="form-label-modern">
        {{ $t('businessSurveysAdmin.attentionDefault') }}
        <Popper :class="'dark p-1'" arrow disable-click-away>
          <template #content>
            <div>{{ $t('businessSurveysAdmin.attentionDefaultHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <Toggle
        :id="`${prefix}survey-attentionDefault-form`"
        v-model="survey.attentionDefault"
        :disabled="isAdd ? false : !toggles['surveys.admin.edit']"
      />
    </div>
    <div v-if="!survey.attentionDefault" class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessSurveysAdmin.queue') }}
        <Popper :class="'dark p-1'" arrow disable-click-away>
          <template #content>
            <div>{{ $t('businessSurveysAdmin.queueHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <select
        :id="`${prefix}survey-queue-form`"
        class="form-control-modern form-select-modern"
        v-model="survey.queueId"
        :disabled="isAdd ? false : !toggles['surveys.admin.edit']"
      >
        <option v-for="queue in queues" :key="queue.id" :value="queue.id">
          {{ queue.name }}
        </option>
      </select>
    </div>
    <div class="form-group-modern form-group-toggle">
      <label class="form-label-modern">
        {{ $t('businessSurveysAdmin.csat') }}
      </label>
      <Toggle
        :id="`${prefix}survey-csat-form`"
        v-model="survey.hasCSAT"
        :disabled="isAdd ? false : !toggles['surveys.admin.edit']"
      />
    </div>
    <div class="form-group-modern form-group-toggle">
      <label class="form-label-modern">
        {{ $t('businessSurveysAdmin.nps') }}
      </label>
      <Toggle
        :id="`${prefix}survey-nps-form`"
        v-model="survey.hasNPS"
        :disabled="isAdd ? false : !toggles['surveys.admin.edit']"
      />
    </div>
    <div class="form-group-modern form-group-toggle">
      <label class="form-label-modern">
        {{ $t('businessSurveysAdmin.comment') }}
      </label>
      <Toggle
        :id="`${prefix}survey-comment-form`"
        v-model="survey.hasMessage"
        :disabled="isAdd ? false : !toggles['surveys.admin.edit']"
      />
    </div>
    <div class="form-group-modern form-group-toggle">
      <label class="form-label-modern">
        {{ $t('businessSurveysAdmin.active') }}
      </label>
      <Toggle
        :id="`${prefix}survey-active-form`"
        v-model="survey.active"
        :disabled="isAdd ? false : !toggles['surveys.admin.edit']"
      />
    </div>
  </div>
</template>

<style scoped>
/* Form Fields Container */
.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
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



