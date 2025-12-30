<script>
import { ref, reactive, computed, onBeforeMount } from 'vue';
import { useI18n } from 'vue-i18n';
import { globalStore } from '../../../stores';
import { markFormAsLoadedToProntuario } from '../../../application/services/form';
import {
  sortFormsByDate,
  filterFormsByType,
  canLoadFormToProntuario,
  extractPersonalDataFromForm,
  extractAnamneseDataFromForm,
} from '../../../shared/utils/preprontuario-helpers';
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';

export default {
  name: 'PreprontuarioHistoryView',
  components: {
    Spinner,
    Alert,
  },
  props: {
    patientForms: { type: Array, default: [] },
    commerce: { type: Object, default: {} },
    client: { type: Object, default: {} },
    toggles: { type: Object, default: {} },
    onLoadToPersonalData: { type: Function, default: null },
    onLoadToAnamnese: { type: Function, default: null },
  },
  emits: ['form-loaded'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const store = globalStore();
    const loading = ref(false);
    const alertError = ref('');
    const alertSuccess = ref('');

    const state = reactive({
      preprontuarios: [],
      selectedForm: null,
      loadingForm: null,
      expandedForms: new Set(), // Track which forms have expanded load actions
    });

    // Filter and sort preprontuarios (FIRST_ATTENTION and PRE_ATTENTION)
    const preprontuarios = computed(() => {
      if (!props.patientForms || props.patientForms.length === 0) {
        return [];
      }

      const firstAttention = filterFormsByType(props.patientForms, 'FIRST_ATTENTION');
      const preAttention = filterFormsByType(props.patientForms, 'PRE_ATTENTION');
      const all = [...firstAttention, ...preAttention];

      return sortFormsByDate(all);
    });

    // Get form type label
    const getFormTypeLabel = type => {
      if (type === 'FIRST_ATTENTION') {
        return t('forms.types.FIRST_ATTENTION') || 'Primeira Vez';
      }
      if (type === 'PRE_ATTENTION') {
        return t('forms.types.PRE_ATTENTION') || 'Pre Atendimento';
      }
      return type;
    };

    // Get form status
    const getFormStatus = form => {
      if (!form.answers || form.answers.length === 0) {
        return {
          label: t('dashboard.preprontuarioDetails.pending') || 'Pendente',
          class: 'status-pending',
          icon: 'bi-exclamation-circle-fill',
        };
      }

      if (form.loadedToProntuario === true) {
        return {
          label: t('dashboard.preprontuarioHistory.loaded') || 'Carregado ao Prontuário',
          class: 'status-loaded',
          icon: 'bi-check-circle-fill',
        };
      }

      return {
        label: t('dashboard.preprontuarioDetails.completed') || 'Completado',
        class: 'status-completed',
        icon: 'bi-check-circle-fill',
      };
    };

    // Format date
    const formatDate = date => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    // Load form to personal data
    const loadToPersonalData = async form => {
      console.log('🚀 Starting loadToPersonalData with form:', form);

      if (!canLoadFormToProntuario(form)) {
        console.log('❌ Form cannot be loaded to prontuario');
        alertError.value =
          t('dashboard.preprontuarioHistory.cannotLoad') ||
          'Este formulário não pode ser carregado';
        return;
      }

      try {
        loading.value = true;
        alertError.value = '';
        state.loadingForm = form.id;

        const personalData = extractPersonalDataFromForm(form);
        console.log('📥 Extracted personal data:', personalData);

        if (!personalData || Object.keys(personalData).length === 0) {
          console.log('❌ No personal data found in form');
          alertError.value =
            t('dashboard.preprontuarioHistory.noPersonalData') ||
            'Este formulário não contém dados pessoais';
          return;
        }

        // Call parent callback if provided
        if (props.onLoadToPersonalData) {
          console.log('📤 Calling parent callback with personal data');
          await props.onLoadToPersonalData(personalData);
        }

        // Mark form as loaded
        const user = store.getCurrentUser;
        if (user && user.id) {
          await markFormAsLoadedToProntuario(form.id, user.id);
        }

        emit('form-loaded', form);
        alertSuccess.value =
          t('dashboard.preprontuarioHistory.loadedSuccess') || 'Dados carregados com sucesso!';
        setTimeout(() => {
          alertSuccess.value = '';
        }, 3000);
      } catch (error) {
        console.error('Error loading form to personal data:', error);
        alertError.value =
          t('dashboard.preprontuarioHistory.loadError') || 'Erro ao carregar dados';
      } finally {
        loading.value = false;
        state.loadingForm = null;
      }
    };

    // Load form to anamnese
    const loadToAnamnese = async form => {
      console.log('🚀 Starting loadToAnamnese with form:', form);

      if (!canLoadFormToProntuario(form)) {
        console.log('❌ Form cannot be loaded to prontuario');
        alertError.value =
          t('dashboard.preprontuarioHistory.cannotLoad') ||
          'Este formulário não pode ser carregado';
        return;
      }

      try {
        loading.value = true;
        alertError.value = '';
        state.loadingForm = form.id;

        const anamneseData = extractAnamneseDataFromForm(form);
        console.log('📥 Extracted anamnese data:', anamneseData);

        if (!anamneseData || Object.keys(anamneseData).length === 0) {
          console.log('❌ No anamnese data found in form');
          alertError.value =
            t('dashboard.preprontuarioHistory.noAnamneseData') ||
            'Este formulário não contém dados de anamnese';
          return;
        }

        // Call parent callback if provided
        if (props.onLoadToAnamnese) {
          console.log('📤 Calling parent callback with anamnese data');
          await props.onLoadToAnamnese(anamneseData);
        }

        // Mark form as loaded
        const user = store.getCurrentUser;
        if (user && user.id) {
          await markFormAsLoadedToProntuario(form.id, user.id);
        }

        emit('form-loaded', form);
        alertSuccess.value =
          t('dashboard.preprontuarioHistory.loadedSuccess') || 'Dados carregados com sucesso!';
        setTimeout(() => {
          alertSuccess.value = '';
        }, 3000);
      } catch (error) {
        console.error('Error loading form to anamnese:', error);
        alertError.value =
          t('dashboard.preprontuarioHistory.loadError') || 'Erro ao carregar dados';
      } finally {
        loading.value = false;
        state.loadingForm = null;
      }
    };

    // Toggle load actions visibility
    const toggleLoadActions = formId => {
      if (state.expandedForms.has(formId)) {
        state.expandedForms.delete(formId);
      } else {
        state.expandedForms.add(formId);
      }
    };

    // Check if load actions are expanded
    const isLoadActionsExpanded = formId => state.expandedForms.has(formId);

    // Format object values for display
    const formatObjectValue = value => {
      if (value === true) return 'Sim';
      if (value === false) return 'Não';
      if (value === null || value === undefined) return '-';
      return String(value);
    };

    // Get frequency label
    const getFrequencyLabel = frequency => {
      const frequencyMap = {
        DAILY: 'Diário',
        WEEKLY: 'Semanal',
        MONTHLY: 'Mensal',
        YEARLY: 'Anual',
        OCCASIONAL: 'Ocasional',
        NEVER: 'Nunca',
      };
      return frequencyMap[frequency] || frequency;
    };

    // Get answer display value
    const getAnswerDisplay = answer => {
      if (!answer || !answer.answer) {
        return '-';
      }

      const answerValue = answer.answer;

      if (typeof answerValue === 'string') {
        // Try to parse as JSON if it looks like JSON
        if (answerValue.trim().startsWith('{') || answerValue.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(answerValue);
            return getAnswerDisplay({ answer: parsed });
          } catch (e) {
            // Not valid JSON, return as string
            return answerValue;
          }
        }
        return answerValue;
      }

      if (Array.isArray(answerValue)) {
        return answerValue
          .map(item => {
            if (typeof item === 'object') {
              return formatComplexAnswer(item);
            }
            return String(item);
          })
          .join(', ');
      }

      if (typeof answerValue === 'object' && answerValue !== null) {
        if (answerValue.answer) {
          return answerValue.answer;
        }
        return formatComplexAnswer(answerValue);
      }

      return String(answerValue);
    };

    // Format complex answer objects
    const formatComplexAnswer = obj => {
      if (!obj || typeof obj !== 'object') {
        return String(obj);
      }

      const parts = [];

      // Frequency
      if (obj.frequency) {
        parts.push(`Frequência: ${getFrequencyLabel(obj.frequency)}`);
      }

      // Age range
      if (obj.ageFrom !== undefined || obj.ageTo !== undefined) {
        const ageFrom = obj.ageFrom !== undefined ? obj.ageFrom : '?';
        const ageTo = obj.ageTo !== undefined ? obj.ageTo : '?';
        if (ageFrom === ageTo) {
          parts.push(`Idade: ${ageFrom} anos`);
        } else {
          parts.push(`Idade: ${ageFrom} - ${ageTo} anos`);
        }
      }

      // Check/Actual (boolean flags)
      if (obj.check !== undefined) {
        parts.push(`Marcado: ${formatObjectValue(obj.check)}`);
      }
      if (obj.actual !== undefined) {
        parts.push(`Atual: ${formatObjectValue(obj.actual)}`);
      }

      // Yes/No answer
      if (obj.answer !== undefined && typeof obj.answer === 'boolean') {
        parts.push(`Resposta: ${formatObjectValue(obj.answer)}`);
      }

      // Comment
      if (obj.comment) {
        parts.push(`Comentário: ${obj.comment}`);
      }

      // Other fields
      const handledFields = [
        'frequency',
        'ageFrom',
        'ageTo',
        'check',
        'actual',
        'answer',
        'comment',
      ];
      Object.keys(obj).forEach(key => {
        if (!handledFields.includes(key)) {
          const value = obj[key];
          if (value !== null && value !== undefined && value !== '') {
            parts.push(`${key}: ${formatObjectValue(value)}`);
          }
        }
      });

      return parts.length > 0 ? parts.join(' • ') : JSON.stringify(obj);
    };

    // Format answer for HTML display
    const formatAnswerForDisplay = answer => {
      const display = getAnswerDisplay(answer);
      if (display.includes(' • ')) {
        return display
          .split(' • ')
          .map(part => `<div class="answer-part">${part}</div>`)
          .join('');
      }
      return display;
    };

    return {
      loading,
      alertError,
      alertSuccess,
      state,
      preprontuarios,
      getFormTypeLabel,
      getFormStatus,
      formatDate,
      loadToPersonalData,
      loadToAnamnese,
      canLoadFormToProntuario,
      getAnswerDisplay,
      formatAnswerForDisplay,
      toggleLoadActions,
      isLoadActionsExpanded,
    };
  },
};
</script>

<template>
  <div class="patient-form-modern preprontuario-history-view">
    <div class="form-header-modern">
      <div class="form-header-icon">
        <i class="bi bi-file-earmark-medical-fill"></i>
      </div>
      <div class="form-header-content">
        <h3 class="form-header-title">
          {{ $t('dashboard.preprontuarioHistory.title') || 'Histórico de Pré-Prontuários' }}
        </h3>
        <p class="form-header-subtitle">
          {{
            $t('dashboard.preprontuarioHistory.subtitle') ||
            'Visualize todos os pré-prontuários preenchidos pelo cliente'
          }}
        </p>
      </div>
    </div>

    <!-- Alerts -->
    <div v-if="alertError" class="alert-container">
      <Alert :message="alertError" type="error" />
    </div>
    <div v-if="alertSuccess" class="alert-container">
      <Alert :message="alertSuccess" type="success" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <Spinner />
    </div>

    <!-- Empty State -->
    <div v-else-if="preprontuarios.length === 0" class="empty-state">
      <div class="empty-state-icon">
        <i class="bi bi-inbox"></i>
      </div>
      <h4 class="empty-state-title">
        {{ $t('dashboard.preprontuarioHistory.noForms') || 'Nenhum pré-prontuário encontrado' }}
      </h4>
      <p class="empty-state-text">
        {{
          $t('dashboard.preprontuarioHistory.noFormsDescription') ||
          'O cliente ainda não preencheu nenhum pré-prontuário.'
        }}
      </p>
    </div>

    <!-- Forms List -->
    <div v-else class="preprontuarios-list">
      <div
        v-for="form in preprontuarios"
        :key="form.id"
        class="preprontuario-card"
        :class="{ 'preprontuario-card-expanded': state.selectedForm === form.id }"
      >
        <!-- Card Header -->
        <div class="preprontuario-card-header">
          <div class="preprontuario-card-header-left">
            <div
              class="preprontuario-type-badge"
              :class="form.type === 'FIRST_ATTENTION' ? 'badge-first' : 'badge-pre'"
            >
              <i
                class="bi"
                :class="form.type === 'FIRST_ATTENTION' ? 'bi-person-fill' : 'bi-clock-history'"
              ></i>
              <span>{{ getFormTypeLabel(form.type) }}</span>
            </div>
            <div class="preprontuario-date">
              <i class="bi bi-calendar3 me-1"></i>
              {{ formatDate(form.createdAt) }}
            </div>
          </div>
          <div class="preprontuario-card-header-right">
            <div class="preprontuario-status" :class="getFormStatus(form).class">
              <i class="bi" :class="getFormStatus(form).icon"></i>
              <span>{{ getFormStatus(form).label }}</span>
            </div>
            <button
              class="btn btn-sm btn-outline-secondary preprontuario-toggle-btn"
              @click="state.selectedForm = state.selectedForm === form.id ? null : form.id"
            >
              <i
                class="bi"
                :class="state.selectedForm === form.id ? 'bi-chevron-up' : 'bi-chevron-down'"
              ></i>
            </button>
          </div>
        </div>

        <!-- Card Content (Expanded) -->
        <div v-if="state.selectedForm === form.id" class="preprontuario-card-content">
          <!-- Questions and Answers -->
          <div v-if="form.questions && form.questions.length > 0" class="questions-section">
            <h5 class="section-title">
              <i class="bi bi-question-circle me-2"></i>
              {{
                $t('dashboard.preprontuarioHistory.questionsAndAnswers') || 'Perguntas e Respostas'
              }}
            </h5>
            <div class="questions-list">
              <div
                v-for="(question, index) in form.questions"
                :key="question.id || index"
                class="question-item"
              >
                <div class="question-header">
                  <span class="question-number">{{ index + 1 }}</span>
                  <h6 class="question-title">
                    {{ question.title || question.patientHistoryItem?.name || 'Pergunta' }}
                  </h6>
                </div>
                <div class="question-answer">
                  <span class="answer-label">
                    {{ $t('dashboard.preprontuarioHistory.answer') || 'Resposta' }}:
                  </span>
                  <div
                    class="answer-value"
                    v-html="
                      formatAnswerForDisplay(
                        form.answers && form.answers.find(a => a.id === question.id)
                          ? form.answers.find(a => a.id === question.id)
                          : form.answers && form.answers[index]
                          ? form.answers[index]
                          : null
                      )
                    "
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Load Actions -->
          <div
            v-if="canLoadFormToProntuario(form) && toggles['patient.history.edit']"
            class="load-actions"
          >
            <h5
              class="section-title load-actions-title"
              @click="toggleLoadActions(form.id)"
              :title="
                $t('dashboard.preprontuarioHistory.loadToProntuario') || 'Carregar ao Prontuário'
              "
            >
              <i
                class="bi"
                :class="isLoadActionsExpanded(form.id) ? 'bi-chevron-down' : 'bi-chevron-right'"
              ></i>
              <i class="bi bi-upload"></i>
              {{
                $t('dashboard.preprontuarioHistory.loadToProntuario') || 'Carregar ao Prontuário'
              }}
            </h5>
            <div v-show="isLoadActionsExpanded(form.id)" class="load-buttons">
              <button
                class="btn-action btn-action-primary"
                :disabled="loading || state.loadingForm === form.id"
                @click="loadToPersonalData(form)"
              >
                <i class="bi bi-person-fill"></i>
                <span>{{
                  $t('dashboard.preprontuarioHistory.loadToPersonalData') ||
                  'Carregar Dados Pessoais'
                }}</span>
                <Spinner v-if="loading && state.loadingForm === form.id" class="ms-1" size="sm" />
              </button>
              <button
                class="btn-action btn-action-primary"
                :disabled="loading || state.loadingForm === form.id"
                @click="loadToAnamnese(form)"
              >
                <i class="bi bi-clipboard-heart"></i>
                <span>{{
                  $t('dashboard.preprontuarioHistory.loadToAnamnese') || 'Carregar Anamnese'
                }}</span>
                <Spinner v-if="loading && state.loadingForm === form.id" class="ms-1" size="sm" />
              </button>
            </div>
          </div>

          <!-- Already Loaded Message -->
          <div v-else-if="form.loadedToProntuario === true" class="already-loaded-message">
            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              {{
                $t('dashboard.preprontuarioHistory.alreadyLoaded') ||
                'Este pré-prontuário já foi carregado ao prontuário.'
              }}
              <span v-if="form.loadedToProntuarioDate" class="loaded-date">
                {{ $t('dashboard.preprontuarioHistory.loadedOn') || 'Carregado em' }}:
                {{ formatDate(form.loadedToProntuarioDate) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.preprontuario-history-view {
  width: 100%;
  padding: 0;
}

.alert-container {
  margin-bottom: 0.75rem;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: var(--color-text-muted);
}

.empty-state-icon {
  font-size: 3.5rem;
  color: var(--border-color);
  margin-bottom: 0.75rem;
  opacity: 0.5;
}

.empty-state-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.empty-state-text {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.preprontuarios-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preprontuario-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

.preprontuario-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--gradient-primary);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.preprontuario-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.preprontuario-card:hover::before {
  opacity: 1;
}

.preprontuario-card-expanded {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preprontuario-card-expanded::before {
  opacity: 1;
}

.preprontuario-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  gap: 0.75rem;
}

.preprontuario-card-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.preprontuario-card-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.preprontuario-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.preprontuario-type-badge i {
  font-size: 0.85rem;
}

.badge-first {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.badge-pre {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.preprontuario-date {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.preprontuario-date i {
  font-size: 0.8rem;
  margin-right: 0.35rem;
  opacity: 0.7;
}

.preprontuario-status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.6rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.preprontuario-status i {
  font-size: 0.75rem;
}

.status-pending {
  background: rgba(251, 191, 36, 0.15);
  color: #d97706;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.status-completed {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-loaded {
  background: rgba(59, 130, 246, 0.15);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.preprontuario-toggle-btn {
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  color: var(--color-text-secondary);
  padding: 0.35rem;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.preprontuario-toggle-btn:hover {
  background: var(--gradient-primary);
  color: white;
  border-color: transparent;
  transform: scale(1.05);
}

.preprontuario-toggle-btn i {
  font-size: 0.9rem;
  transition: transform 0.2s ease;
}

.preprontuario-card-expanded .preprontuario-toggle-btn i {
  transform: rotate(180deg);
}

.preprontuario-card-content {
  padding: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.section-title i {
  font-size: 0.9rem;
  margin-right: 0.5rem;
  color: var(--azul-turno);
}

.load-actions-title {
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  padding: 0.5rem;
  margin: -0.5rem;
  margin-bottom: 0.75rem;
  border-radius: 0.5rem;
}

.load-actions-title:hover {
  background-color: rgba(0, 0, 0, 0.03);
  color: var(--azul-turno);
}

.load-actions-title i:first-child {
  font-size: 0.75rem;
  margin-right: 0.4rem;
  transition: transform 0.2s ease;
  color: var(--color-text-muted);
}

.load-actions-title:hover i:first-child {
  color: var(--azul-turno);
}

.questions-section {
  margin-bottom: 1rem;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-item {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.625rem;
  padding: 0.75rem;
  transition: all 0.2s ease;
}

.question-item:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.12);
}

.question-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}

.question-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--gradient-primary);
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.question-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  line-height: 1.4;
}

.question-answer {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.answer-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.answer-value {
  font-size: 0.85rem;
  color: var(--color-text);
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  word-break: break-word;
  line-height: 1.5;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.answer-part {
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.answer-part:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.answer-part:first-child {
  padding-top: 0;
}

.load-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.load-buttons {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  cursor: pointer;
  height: 32px;
  gap: 0.4rem;
  min-width: fit-content;
}

.btn-action-primary {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.btn-action-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-action-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-action i {
  font-size: 0.85rem;
}

.already-loaded-message {
  margin-top: 1rem;
}

.already-loaded-message .alert {
  padding: 0.75rem;
  font-size: 0.85rem;
  margin: 0;
  border-radius: 0.625rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  color: #2563eb;
}

.already-loaded-message .alert i {
  margin-right: 0.5rem;
}

.loaded-date {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  opacity: 0.8;
  font-style: italic;
}

@media (max-width: 768px) {
  .preprontuario-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6rem;
  }

  .preprontuario-card-header-right {
    width: 100%;
    justify-content: space-between;
  }

  .preprontuario-card-header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6rem;
    width: 100%;
  }

  .load-buttons {
    flex-direction: column;
  }

  .btn-action {
    width: 100%;
    justify-content: center;
  }
}
</style>
