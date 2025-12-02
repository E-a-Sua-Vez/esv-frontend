<script>
import Popper from 'vue3-popper';

export default {
  name: 'SurveyName',
  components: { Popper },
  props: {
    survey: { type: Object, default: () => ({ type: '', attentionDefault: false, active: false, id: '', queueId: '' }) },
    commerceKeyName: { type: String, default: '' },
  },
  computed: {
    statusClass() {
      return this.survey.active ? 'survey-active' : 'survey-inactive';
    },
    statusIconClass() {
      return this.survey.active ? 'icon-success' : 'icon-error';
    },
    statusTooltip() {
      return this.survey.active
        ? this.$t('dashboard.clientCard.tooltip.surveyActive') || 'Encuesta activa'
        : this.$t('dashboard.clientCard.tooltip.surveyInactive') || 'Encuesta inactiva';
    },
    surveyType() {
      return this.survey.type ? this.$t(`surveys.types.${this.survey.type}`) : '';
    },
    surveyTag() {
      return this.survey.attentionDefault
        ? this.$t('businessSurveysAdmin.attentionDefault') || 'Post Atención'
        : this.$t('businessSurveysAdmin.other') || 'Otra';
    },
    tagTooltip() {
      return this.survey.attentionDefault
        ? this.$t('businessSurveysAdmin.attentionDefaultHelp') || 'Encuesta post atención'
        : this.$t('businessSurveysAdmin.otherHelp') || 'Otra encuesta';
    },
    surveyLink() {
      if (!this.commerceKeyName) return '';
      if (this.survey.queueId) {
        return `${import.meta.env.VITE_URL}/publico/comercio/${this.commerceKeyName}/filas/${this.survey.queueId}`;
      }
      return `${import.meta.env.VITE_URL}/publico/comercio/${this.commerceKeyName}/filas`;
    },
  },
  methods: {
    copyLink() {
      if (this.surveyLink) {
        navigator.clipboard.writeText(this.surveyLink);
      }
    },
  },
};
</script>

<template>
  <div class="survey-name-container" :class="statusClass">
    <!-- Survey Icon -->
    <Popper :class="'dark'" arrow hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div class="survey-icon" :class="statusIconClass">
        <i class="bi bi-pencil-square"></i>
      </div>
    </Popper>

    <!-- Survey Type -->
    <span class="survey-name-text" :class="statusClass">
      {{ surveyType || $t('dashboard.clientCard.label.noSurvey') || 'N/I' }}
    </span>

    <!-- Survey Tag -->
    <Popper v-if="surveyTag" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ tagTooltip }}</div>
      </template>
      <span class="survey-tag">
        <i class="bi bi-tags-fill"></i>
        <span class="survey-tag-text">{{ surveyTag }}</span>
      </span>
    </Popper>

    <!-- Action Buttons -->
    <Popper v-if="surveyLink" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('dashboard.clientCard.tooltip.copy') || 'Copiar link de la encuesta' }}</div>
      </template>
      <button class="btn-copy-mini" @click.stop="copyLink()">
        <i class="bi bi-file-earmark-spreadsheet"></i>
      </button>
    </Popper>
    <Popper v-if="surveyLink" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('dashboard.clientCard.tooltip.openWebsite') || 'Abrir encuesta' }}</div>
      </template>
      <a
        class="btn-link-mini"
        :href="surveyLink"
        target="_blank"
        @click.stop
      >
        <i class="bi bi-box-arrow-up-right"></i>
      </a>
    </Popper>
  </div>
</template>

<style scoped>
/* Survey Name Container */
.survey-name-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  transition: all 0.2s ease;
}

.survey-name-container.survey-active {
  border-left: 4px solid rgba(0, 194, 203, 0.8);
}

.survey-name-container.survey-inactive {
  border-left: 4px solid rgba(165, 42, 42, 0.6);
}

/* Survey Icon */
.survey-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 4px;
  font-size: 1rem;
  flex-shrink: 0;
}

.survey-icon.icon-success {
  background: rgba(0, 194, 203, 0.1);
  color: rgba(0, 194, 203, 0.9);
}

.survey-icon.icon-error {
  background: rgba(165, 42, 42, 0.1);
  color: rgba(165, 42, 42, 0.8);
}

/* Survey Name Text */
.survey-name-text {
  font-size: 0.875rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  flex: 1;
  text-align: left;
}

.survey-name-text.survey-active {
  color: rgba(0, 0, 0, 0.9);
}

.survey-name-text.survey-inactive {
  color: rgba(0, 0, 0, 0.5);
}

/* Survey Tag */
.survey-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.1875rem 0.5rem;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: help;
  transition: all 0.2s ease;
  line-height: 1.3;
}

.survey-tag:hover {
  background: rgba(0, 74, 173, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 74, 173, 0.2);
}

.survey-tag i {
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.survey-tag-text {
  font-weight: 700;
  letter-spacing: 0.15px;
  text-transform: capitalize;
}

/* Action Buttons */
.btn-copy-mini {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-copy-mini:hover {
  background: rgba(169, 169, 169, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

.btn-copy-mini i {
  font-size: 0.875rem;
}

.btn-link-mini {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  text-decoration: none;
}

.btn-link-mini:hover {
  background: rgba(169, 169, 169, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

.btn-link-mini i {
  font-size: 0.875rem;
}

/* Allow tooltips to overflow parent containers */
.survey-name-container {
  overflow: visible;
}
</style>
