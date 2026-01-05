<template>
  <div class="consent-form-container">
    <div class="consent-form-wrapper">
      <!-- Header con branding del comercio -->
      <div v-if="commerce" class="commerce-branding">
        <img v-if="commerce.logo" :src="commerce.logo" :alt="commerce.name" class="commerce-logo" />
        <h2 class="commerce-name">{{ commerce.name }}</h2>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">{{ $t('common.loading') }}</span>
        </div>
        <p class="mt-3">{{ $t('common.loading') }}</p>
      </div>

      <!-- Expired Token -->
      <div v-else-if="expired" class="alert alert-danger text-center">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        {{ $t('lgpd.consent.form.tokenExpired') }}
      </div>

      <!-- Formulario -->
      <div v-else-if="requirements && requirements.length > 0" class="consent-form">
        <!-- Introducción -->
        <div class="consent-intro mb-4">
          <h3 class="mb-3">{{ $t('lgpd.consent.form.title') }}</h3>
          <p class="mb-2">
            {{ $t('lgpd.consent.form.intro', { clientName: client?.name || $t('common.client') }) }}
          </p>
          <p class="text-muted small">
            {{ $t('lgpd.consent.form.lgpdInfo') }}
          </p>
        </div>

        <!-- Lista de Consentimientos -->
        <div
          v-for="(requirement, index) in requirements"
          :key="requirement.id || index"
          class="consent-item mb-4"
        >
          <div class="metric-card p-3" :class="{ 'border-warning': requirement.required }">
            <div class="consent-header mb-3">
              <div class="d-flex justify-content-between align-items-start">
                <h5 class="mb-0">
                  {{ getConsentTypeLabel(requirement.consentType) }}
                </h5>
                <span v-if="requirement.required" class="badge bg-danger ms-2">
                  {{ $t('lgpd.consent.form.required') }}
                </span>
              </div>
            </div>

            <div class="consent-description mb-3">
              <!-- Resumen Introductorio -->
              <p v-if="requirement.templates?.formIntroText" class="mb-3 text-muted">
                {{ requirement.templates.formIntroText }}
              </p>

              <!-- Accordion com todos os detalhes legais -->
              <div class="accordion" :id="`accordion-${index}`">
                <!-- Termos Completos -->
                <div v-if="requirement.templates?.fullTerms" class="accordion-item">
                  <h2 class="accordion-header">
                    <button
                      class="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      :data-bs-target="`#collapse-full-${index}`"
                      :aria-expanded="false"
                    >
                      <i class="bi bi-file-text me-2"></i>
                      {{ $t('lgpd.consent.form.fullTerms') }}
                    </button>
                  </h2>
                  <div
                    :id="`collapse-full-${index}`"
                    class="accordion-collapse collapse"
                    :data-bs-parent="`#accordion-${index}`"
                  >
                    <div class="accordion-body">
                      <div
                        class="consent-terms-content"
                        v-html="formatText(requirement.templates.fullTerms)"
                      ></div>
                    </div>
                  </div>
                </div>

                <!-- Descrição dos Dados -->
                <div v-if="requirement.templates?.dataDescription" class="accordion-item">
                  <h2 class="accordion-header">
                    <button
                      class="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      :data-bs-target="`#collapse-data-${index}`"
                      :aria-expanded="false"
                    >
                      <i class="bi bi-database me-2"></i>
                      {{ $t('lgpd.consent.form.dataDescription') }}
                    </button>
                  </h2>
                  <div
                    :id="`collapse-data-${index}`"
                    class="accordion-collapse collapse"
                    :data-bs-parent="`#accordion-${index}`"
                  >
                    <div class="accordion-body">
                      <div
                        class="consent-terms-content"
                        v-html="formatText(requirement.templates.dataDescription)"
                      ></div>
                    </div>
                  </div>
                </div>

                <!-- Base Legal -->
                <div v-if="requirement.templates?.legalBasis" class="accordion-item">
                  <h2 class="accordion-header">
                    <button
                      class="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      :data-bs-target="`#collapse-legal-${index}`"
                      :aria-expanded="false"
                    >
                      <i class="bi bi-shield-check me-2"></i>
                      {{ $t('lgpd.consent.form.legalBasis') }}
                    </button>
                  </h2>
                  <div
                    :id="`collapse-legal-${index}`"
                    class="accordion-collapse collapse"
                    :data-bs-parent="`#accordion-${index}`"
                  >
                    <div class="accordion-body">
                      <div
                        class="consent-terms-content"
                        v-html="formatText(requirement.templates.legalBasis)"
                      ></div>
                    </div>
                  </div>
                </div>

                <!-- Prazo de Retenção -->
                <div v-if="requirement.templates?.retentionPeriod" class="accordion-item">
                  <h2 class="accordion-header">
                    <button
                      class="accordion-button collapsed"
                      type="button"
                      data-bs-toggle="collapse"
                      :data-bs-target="`#collapse-retention-${index}`"
                      :aria-expanded="false"
                    >
                      <i class="bi bi-clock-history me-2"></i>
                      {{ $t('lgpd.consent.form.retentionPeriod') }}
                    </button>
                  </h2>
                  <div
                    :id="`collapse-retention-${index}`"
                    class="accordion-collapse collapse"
                    :data-bs-parent="`#accordion-${index}`"
                  >
                    <div class="accordion-body">
                      <div
                        class="consent-terms-content"
                        v-html="formatText(requirement.templates.retentionPeriod)"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Link da Política de Privacidade -->
              <div v-if="requirement.templates?.privacyPolicyLink" class="mt-3">
                <a
                  :href="requirement.templates.privacyPolicyLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-sm btn-outline-primary"
                >
                  <i class="bi bi-link-45deg me-1"></i>
                  {{ $t('lgpd.consent.form.privacyPolicy') }}
                </a>
              </div>

              <!-- Instruções de Revogação -->
              <div
                v-if="requirement.templates?.revocationInstructions"
                class="mt-3 p-3 bg-light rounded"
              >
                <h6 class="mb-2">
                  <i class="bi bi-info-circle me-2 text-info"></i>
                  {{ $t('lgpd.consent.form.revocationInstructions') }}
                </h6>
                <p
                  class="mb-0 small"
                  v-html="formatText(requirement.templates.revocationInstructions)"
                ></p>
              </div>
            </div>

            <!-- Opciones -->
            <div class="consent-options">
              <div class="form-check mb-2">
                <input
                  class="form-check-input"
                  type="radio"
                  :name="`consent-${index}`"
                  :id="`grant-${index}`"
                  :value="true"
                  v-model="responses[requirement.consentType]"
                  :required="requirement.required"
                />
                <label class="form-check-label" :for="`grant-${index}`">
                  <i class="bi bi-check-circle text-success me-2"></i>
                  {{ $t('lgpd.consent.form.iAgree') }}
                </label>
              </div>

              <div class="form-check">
                <input
                  class="form-check-input"
                  type="radio"
                  :name="`consent-${index}`"
                  :id="`deny-${index}`"
                  :value="false"
                  v-model="responses[requirement.consentType]"
                />
                <label class="form-check-label" :for="`deny-${index}`">
                  <i class="bi bi-x-circle text-danger me-2"></i>
                  {{ $t('lgpd.consent.form.iDoNotAgree') }}
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Botón de Envío -->
        <div class="consent-actions mt-4">
          <button
            @click="submitConsents"
            :disabled="!allRequiredAnswered || submitting"
            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill w-100"
          >
            <span v-if="submitting">
              <span class="spinner-border spinner-border-sm me-2"></span>
              {{ $t('lgpd.consent.form.submitting') }}
            </span>
            <span v-else>
              {{ $t('lgpd.consent.form.submit') }}
            </span>
          </button>
        </div>

        <!-- Footer Legal -->
        <div class="consent-footer mt-4">
          <p class="small text-muted text-center">
            {{ $t('lgpd.consent.form.legalFooter') }}
          </p>
        </div>
      </div>

      <!-- No Requirements -->
      <div v-else class="alert alert-info text-center">
        <i class="bi bi-info-circle me-2"></i>
        {{ $t('lgpd.consent.widget.noRequirements') }}
      </div>
    </div>

    <!-- Success Modal - Enhanced Visual Confirmation -->
    <div
      v-if="showSuccess"
      class="modal fade show d-block"
      tabindex="-1"
      style="background-color: rgba(0, 0, 0, 0.5); z-index: 1055"
      @click.self="showSuccess = false"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="border: none; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2)">
          <div class="modal-header border-0 bg-success text-white">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-check-circle-fill me-2"></i>
              {{ $t('lgpd.consent.form.successTitle') }}
            </h5>
            <button
              type="button"
              class="btn-close btn-close-white"
              @click="showSuccess = false"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body text-center py-5">
            <div class="success-animation mb-4">
              <div class="success-checkmark">
                <div class="check-icon">
                  <span class="icon-line line-tip"></span>
                  <span class="icon-line line-long"></span>
                  <div class="icon-circle"></div>
                  <div class="icon-fix"></div>
                </div>
              </div>
            </div>
            <h4 class="text-success fw-bold mb-3">{{ $t('lgpd.consent.form.successTitle') }}</h4>
            <p class="lead mb-2">{{ $t('lgpd.consent.form.successMessage') }}</p>
            <p class="text-muted small mb-0">{{ $t('lgpd.consent.form.successSubmessage') }}</p>
          </div>
          <div class="modal-footer border-0 justify-content-center bg-light">
            <button
              type="button"
              class="btn btn-lg btn-size fw-bold btn-success rounded-pill px-5"
              @click="showSuccess = false"
            >
              <i class="bi bi-check-lg me-2"></i>
              {{ $t('common.close') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { validateConsentToken, submitConsentResponses } from '@/application/services/consent';

export default {
  name: 'ConsentFormView',
  setup() {
    const route = useRoute();
    const { t } = useI18n();
    const token = route.params.token;

    const loading = ref(true);
    const expired = ref(false);
    const submitting = ref(false);
    const showSuccess = ref(false);
    const commerce = ref(null);
    const client = ref(null);
    const requirements = ref([]);
    const responses = ref({});

    const allRequiredAnswered = computed(() =>
      requirements.value
        .filter(r => r.required)
        .every(r => responses.value[r.consentType] !== undefined)
    );

    const getConsentTypeLabel = type => t(`lgpd.consent.types.${type}`) || type;

    const formatText = text => {
      if (!text) return '';
      // Convertir markdown básico a HTML
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^### (.*$)/gim, '<h5>$1</h5>')
        .replace(/^## (.*$)/gim, '<h4>$1</h4>')
        .replace(/^# (.*$)/gim, '<h3>$1</h3>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/\n/g, '<br>');
    };

    const loadFormData = async () => {
      try {
        loading.value = true;
        const data = await validateConsentToken(token);

        if (!data.valid) {
          expired.value = data.expired;
          return;
        }

        if (data.expired) {
          expired.value = true;
          return;
        }

        commerce.value = data.commerce;
        client.value = data.client;
        requirements.value = data.requirements || [];

        // Initialize responses
        requirements.value.forEach(r => {
          responses.value[r.consentType] = undefined;
        });
      } catch (error) {
        console.error('Error loading consent form:', error);
        expired.value = true;
      } finally {
        loading.value = false;
      }
    };

    const submitConsents = async () => {
      if (!allRequiredAnswered.value) return;

      try {
        submitting.value = true;

        const payload = Object.entries(responses.value)
          .filter(([_, value]) => value !== undefined)
          .map(([type, granted]) => ({
            consentType: type,
            granted: granted === true,
            notes: undefined,
          }));

        await submitConsentResponses(token, payload);
        showSuccess.value = true;
      } catch (error) {
        console.error('Error submitting consents:', error);
        const errorMessage =
          error.response?.data?.message ||
          t('lgpd.consent.form.errorSubmitting') ||
          'Error al enviar los consentimientos';
        alert(errorMessage);
      } finally {
        submitting.value = false;
      }
    };

    onMounted(() => {
      loadFormData();
    });

    return {
      loading,
      expired,
      submitting,
      showSuccess,
      commerce,
      client,
      requirements,
      responses,
      allRequiredAnswered,
      submitConsents,
      getConsentTypeLabel,
      formatText,
    };
  },
};
</script>

<style scoped>
.consent-form-container {
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(248, 249, 250, 0.5) 0%, rgba(255, 255, 255, 0.8) 100%);
  padding: 2rem 1rem;
}

.consent-form-wrapper {
  max-width: 800px;
  margin: 0 auto;
}

.commerce-branding {
  text-align: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.commerce-logo {
  max-height: 80px;
  max-width: 200px;
  margin-bottom: 1rem;
}

.commerce-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--azul-turno, #004aad);
  margin: 0;
}

.consent-form {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.consent-intro h3 {
  color: var(--azul-turno, #004aad);
  font-weight: 700;
}

.consent-item {
  margin-bottom: 1.5rem;
}

.consent-header h5 {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.consent-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-check-label {
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.consent-actions {
  margin-top: 2rem;
}

.consent-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.consent-terms-content {
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.8);
}

.consent-terms-content h3,
.consent-terms-content h4,
.consent-terms-content h5 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
}

.consent-terms-content h3 {
  font-size: 1.25rem;
}

.consent-terms-content h4 {
  font-size: 1.1rem;
}

.consent-terms-content h5 {
  font-size: 1rem;
}

.consent-terms-content li {
  margin-bottom: 0.25rem;
  padding-left: 0.5rem;
}

.consent-terms-content strong {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.9);
}

.accordion-button {
  font-size: 0.9rem;
  font-weight: 500;
}

.accordion-button:not(.collapsed) {
  background-color: rgba(0, 194, 203, 0.1);
  color: rgba(0, 194, 203, 1);
}

.metric-card {
  background-color: var(--color-background, #ffffff);
  padding: 0.5rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default, #e0e0e0);
}

.metric-card.border-warning {
  border-left: 3px solid #f59e0b !important;
}

/* Success Animation */
.success-animation {
  display: flex;
  justify-content: center;
  align-items: center;
}

.success-checkmark {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: block;
  stroke-width: 2;
  stroke: #4caf50;
  stroke-miterlimit: 10;
  box-shadow: inset 0px 0px 0px #4caf50;
  animation: fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;
  position: relative;
  top: 5px;
  right: 5px;
  margin: 0 auto;
}

.check-icon {
  width: 56px;
  height: 56px;
  position: relative;
  border-radius: 50%;
  display: block;
  stroke-width: 2;
  stroke: #4caf50;
  stroke-miterlimit: 10;
}

.icon-line {
  height: 5px;
  display: block;
  stroke-dasharray: 74;
  stroke-dashoffset: 74;
  stroke-width: 2;
  stroke-miterlimit: 10;
  stroke: #4caf50;
  fill: none;
  animation: icon-line 0.6s ease-in-out 0.8s forwards;
}

.line-tip {
  top: 46px;
  left: 14px;
  width: 25px;
  transform: rotate(45deg);
  position: absolute;
}

.line-long {
  top: 38px;
  right: 8px;
  width: 47px;
  transform: rotate(-45deg);
  position: absolute;
}

.icon-circle {
  top: -4px;
  left: -4px;
  z-index: 10;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  position: absolute;
  box-shadow: inset 0px 0px 0px #4caf50;
  animation: fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;
}

.icon-fix {
  top: 8px;
  width: 5px;
  left: 26px;
  z-index: 1;
  height: 85px;
  position: absolute;
  transform: rotate(-45deg);
  background-color: #fff;
}

@keyframes fill {
  from {
    box-shadow: inset 0px 0px 0px #4caf50;
  }
  to {
    box-shadow: inset 0px 0px 0px 30px #4caf50;
  }
}

@keyframes scale {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes icon-line {
  to {
    stroke-dashoffset: 0;
  }
}

@media (max-width: 768px) {
  .consent-form-container {
    padding: 1rem 0.5rem;
  }

  .consent-form {
    padding: 1.5rem;
  }
}
</style>
