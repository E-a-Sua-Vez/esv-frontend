<template>
  <div>
    <div class="content text-center">
      <!-- Commerce Logo -->
      <CommerceLogo
        :commerce-id="commerce?.id"
        :business-id="commerce?.businessId"
        :loading="false"
        :large-size="true"
        :fallback-src="$t('logo')"
      ></CommerceLogo>

      <div id="page-header" class="text-center mt-4" v-if="!authenticated">
        <div class="welcome">
          <span>{{ $t('clientPortal.login.welcome') }}</span>
        </div>
        <div class="login-message">
          <span>{{ $t('clientPortal.login.loginMessage') }}</span>
        </div>
      </div>

      <div class="login-container">
        <form @submit.prevent="codeRequested ? validateCode() : requestCode()">
          <div class="modern-login-card text-center">
            <div class="login-card-content">
              <!-- Loading Commerce State -->
              <div v-if="loadingCommerce" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">{{ $t('clientPortal.login.loading') }}</span>
                </div>
                <p class="mt-3 text-muted">{{ $t('clientPortal.login.loadingCommerce') }}</p>
              </div>

              <!-- Commerce Not Found Error -->
              <div v-else-if="commerceNotFound" class="text-center py-5">
                <Message
                  :title="$t('clientPortal.login.commerceNotFoundTitle')"
                  :content="$t('clientPortal.login.commerceNotFound')"
                  :icon="'exclamation-triangle-fill'"
                  type="error"
                />
              </div>

              <!-- Request Access Form -->
              <div
                v-else-if="
                  !codeRequested &&
                  !showCodeForm &&
                  !authenticated &&
                  !loadingCommerce &&
                  !commerceNotFound
                "
                class="request-access-form"
              >
                <div class="alert alert-info mb-3" v-if="commerce">
                  <i class="bi bi-info-circle-fill me-2"></i>
                  <strong>{{ commerce.name }}</strong>
                </div>

                <p class="help-text text-center mb-3">
                  <i class="bi bi-info-circle me-1"></i>
                  {{ $t('clientPortal.login.atLeastOneRequired') }}
                </p>

                <div class="form-group">
                  <label for="idNumber" class="form-label">
                    {{ $t('clientPortal.login.idNumber') }}
                  </label>
                  <div class="input-wrapper">
                    <i class="bi bi-person-vcard input-icon"></i>
                    <input
                      id="idNumber"
                      v-model="idNumber"
                      type="text"
                      class="form-control modern-input"
                      :placeholder="$t('clientPortal.login.idNumberPlaceholder')"
                      :disabled="requesting"
                    />
                  </div>
                </div>

                <!-- reCAPTCHA -->
                <div class="recaptcha-area">
                  <VueRecaptcha
                    v-if="siteKey && !isDevelopment"
                    :sitekey="siteKey"
                    :size="'compact'"
                    @verify="validateCaptchaOk"
                    @error="validateCaptchaError"
                  ></VueRecaptcha>
                  <div v-if="isDevelopment" class="dev-notice">
                    <small class="text-muted">Development mode: reCAPTCHA disabled</small>
                  </div>
                </div>

                <div class="btn-area">
                  <button
                    type="submit"
                    class="btn btn-lg fw-bold btn-dark text-white rounded-pill modern-submit-btn"
                    :disabled="requesting || (!idNumber && !email && !phone) || !canRequestCode"
                  >
                    <span v-if="!requesting && canRequestCode">{{
                      $t('clientPortal.login.sendCode')
                    }}</span>
                    <span v-else-if="!canRequestCode">
                      {{ $t('clientPortal.login.waitToRequestAgain', { seconds: cooldownText }) }}
                    </span>
                    <span
                      v-else
                      class="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    <i v-if="!requesting && canRequestCode" class="bi bi-send ms-2"></i>
                  </button>

                  <!-- Cooldown Display -->
                  <div
                    v-if="!canRequestCode && cooldownTime > 0"
                    class="cooldown-display mt-3 text-center"
                  >
                    <div class="alert alert-info d-flex align-items-center justify-content-center">
                      <i class="bi bi-clock me-2"></i>
                      <span>{{
                        $t('clientPortal.login.waitToRequestAgain', { seconds: cooldownText })
                      }}</span>
                    </div>
                  </div>

                  <!-- Ya tengo código button -->
                  <div class="mt-3">
                    <a
                      :disabled="!hasInputData"
                      class="btn actions-link"
                      @click="toggleCodeForm"
                      style="cursor: pointer"
                    >
                      {{ $t('clientPortal.login.alreadyHaveCode') }}
                      <i class="bi bi-arrow-right ms-1"></i>
                    </a>
                  </div>
                </div>
              </div>

              <!-- Code Validation Form -->
              <div
                v-else-if="(codeRequested || showCodeForm) && !authenticated"
                class="code-validation-form"
              >
                <div class="form-group">
                  <label for="accessCode" class="form-label">
                    {{ $t('clientPortal.login.accessCode') }}
                  </label>
                  <div class="input-wrapper">
                    <i class="bi bi-key-fill input-icon"></i>
                    <i class="bi bi-key-fill input-icon"></i>
                    <input
                      id="accessCode"
                      v-model="accessCode"
                      type="text"
                      class="form-control modern-input text-center"
                      placeholder="XXXX-XXXX"
                      maxlength="8"
                      pattern="[A-Z0-9]{4,8}"
                      required
                      autocomplete="off"
                      :disabled="validating"
                      @input="accessCode = accessCode.toUpperCase().replace(/[^A-Z0-9]/g, '')"
                      style="letter-spacing: 0.5rem; font-weight: bold; font-size: 1.5rem"
                    />
                  </div>
                  <div class="form-text mt-2">
                    {{ $t('clientPortal.login.codeHint') }}
                  </div>
                  <p v-if="sentVia" class="text-info small mt-2">
                    <span v-if="sentVia === 'EMAIL+WHATSAPP'">
                      {{ $t('clientPortal.login.codeSentViaEmailWhatsapp') }}
                    </span>
                    <span v-else-if="sentVia === 'EMAIL+SMS'">
                      {{ $t('clientPortal.login.codeSentViaEmailSms') }}
                    </span>
                    <span v-else>
                      {{ $t('clientPortal.login.codeSentVia', { via: sentVia }) }}
                    </span>
                  </p>
                </div>

                <div class="btn-area">
                  <button
                    type="submit"
                    class="btn btn-lg fw-bold btn-dark text-white rounded-pill modern-submit-btn"
                    :disabled="
                      validating || !accessCode || accessCode.length < 4 || accessCode.length > 8
                    "
                  >
                    <span v-if="!validating">{{ $t('clientPortal.login.validateAndAccess') }}</span>
                    <span
                      v-else
                      class="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    <i v-if="!validating" class="bi bi-check-lg ms-2"></i>
                  </button>
                </div>
              </div>

              <!-- Success State -->
              <div v-else-if="authenticated" class="success-state py-5">
                <div class="text-center">
                  <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem"></i>
                  <h4 class="mt-3 text-success">
                    {{ $t('clientPortal.login.accessGranted') }}
                  </h4>
                  <p class="text-muted mt-2">
                    {{ $t('clientPortal.login.redirecting') }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Error State -->
            <div class="errors" v-if="error && !commerceNotFound">
              <div class="alert alert-danger">
                <li>{{ error }}</li>
              </div>
            </div>

            <!-- Actions for code re-request -->
            <div class="actions" v-if="(codeRequested || showCodeForm) && !authenticated">
              <p class="actions-text">{{ $t('clientPortal.login.didntReceiveCode') }}</p>
              <div v-if="canRequestCode">
                <a class="actions-link" @click="resetForm">
                  {{ $t('clientPortal.login.requestNewCode') }}
                  <i class="bi bi-arrow-right ms-1"></i>
                </a>
              </div>
              <div v-else class="text-muted">
                <small>
                  {{ $t('clientPortal.login.waitToRequestAgain', { seconds: cooldownText }) }}
                  <i class="bi bi-clock ms-1"></i>
                </small>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { VueRecaptcha } from 'vue-recaptcha';
import {
  requestPortalAccess,
  validatePortalCode,
  validatePortalSession,
  getCommerceBySlug,
} from '../../application/services/client-portal';
import { globalStore } from '../../stores';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Message from '../../components/common/Message.vue';

export default {
  name: 'ClientPortalLogin',
  components: {
    CommerceLogo,
    Message,
    VueRecaptcha,
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const { t } = useI18n();
    const store = globalStore();

    const loading = ref(false);
    const loadingCommerce = ref(true);
    const requesting = ref(false);
    const validating = ref(false);
    const codeRequested = ref(false);
    const authenticated = ref(false);
    const accessCode = ref('');
    const commerceSlug = ref(route.params.commerceSlug);
    const idNumber = ref('');
    const email = ref('');
    const phone = ref('');
    const error = ref('');
    const commerceNotFound = ref(false);
    const commerce = ref(null);
    const sentVia = ref(null);
    const captcha = ref(false);
    const siteKey = import.meta.env.VITE_RECAPTCHA_CHECK;

    // Rate limiting variables
    const lastRequestTime = ref(null);
    const cooldownTime = ref(0);
    const cooldownInterval = ref(null);
    const showCodeForm = ref(false); // Para la opción "Ya tengo código"

    const isDevelopment = computed(() => import.meta.env.DEV);

    // Computed para verificar si hay datos ingresados
    const hasInputData = computed(
      () => idNumber.value.trim() || email.value.trim() || phone.value.trim()
    );

    // Rate limiting computed
    const canRequestCode = computed(() => cooldownTime.value === 0);

    const cooldownText = computed(() => {
      if (cooldownTime.value === 0) return '';
      const minutes = Math.floor(cooldownTime.value / 60);
      const seconds = cooldownTime.value % 60;
      if (minutes > 0) {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      return `${seconds}s`;
    });

    const validateCaptchaOk = response => {
      if (response) {
        captcha.value = true;
      }
    };

    const validateCaptchaError = err => {
      console.warn('reCAPTCHA error:', err);
      // In development, we can be more lenient with reCAPTCHA errors
      if (import.meta.env.DEV) {
        console.warn('Development mode: reCAPTCHA error ignored');
        captcha.value = true; // Allow request in development even if reCAPTCHA fails
      } else {
        error.value = t('clientPortal.login.captchaError');
      }
    };

    // Rate limiting functions
    const startCooldown = () => {
      lastRequestTime.value = Date.now();
      cooldownTime.value = 60; // 60 segundos

      cooldownInterval.value = setInterval(() => {
        cooldownTime.value--;
        if (cooldownTime.value <= 0) {
          clearInterval(cooldownInterval.value);
          cooldownInterval.value = null;
        }
      }, 1000);
    };

    const checkCooldown = () => {
      if (!lastRequestTime.value) return true;

      const timeSinceLastRequest = Date.now() - lastRequestTime.value;
      const remainingCooldown = 60000 - timeSinceLastRequest; // 60 seconds in ms

      if (remainingCooldown > 0) {
        cooldownTime.value = Math.ceil(remainingCooldown / 1000);
        startCooldown();
        return false;
      }

      return true;
    };

    // Función para mostrar/ocultar el formulario de código
    const toggleCodeForm = () => {
      showCodeForm.value = !showCodeForm.value;
      if (showCodeForm.value) {
        codeRequested.value = true;
      }
      error.value = '';
    };

    const loadCommerce = async () => {
      loadingCommerce.value = true;
      error.value = '';
      commerceNotFound.value = false;

      try {
        const commerceData = await getCommerceBySlug(commerceSlug.value);
        commerce.value = commerceData;
      } catch (err) {
        if (err.response?.status === 404) {
          error.value = t('clientPortal.login.commerceNotFound');
          commerceNotFound.value = true;
        } else {
          error.value = t('clientPortal.login.errorLoadingCommerce');
          commerceNotFound.value = true;
        }
      } finally {
        loadingCommerce.value = false;
      }
    };

    const requestCode = async () => {
      // Check rate limiting
      if (!checkCooldown()) {
        error.value = t('clientPortal.login.rateLimitError', { seconds: cooldownText.value });
        return;
      }

      if (!idNumber.value && !email.value && !phone.value) {
        error.value = t('clientPortal.login.fillRequiredFields');
        return;
      }

      if (!captcha.value && !import.meta.env.DEV) {
        error.value = t('clientPortal.login.captchaRequired');
        return;
      }

      requesting.value = true;
      error.value = '';

      try {
        const response = await requestPortalAccess(
          commerceSlug.value,
          email.value || undefined,
          phone.value || undefined,
          idNumber.value || undefined
        );

        if (response && response.sentVia) {
          codeRequested.value = true;
          sentVia.value = response.sentVia;
          startCooldown(); // Start cooldown after successful request
          showCodeForm.value = false; // Reset this flag
        } else {
          error.value = t('clientPortal.login.errorSendingCode');
        }
      } catch (err) {
        if (err.code === 'ECONNABORTED' && err.message.includes('timeout')) {
          error.value =
            'El servidor no está respondiendo. Por favor, verifica que el backend esté funcionando.';
        } else if (err.response?.status === 404) {
          error.value = t('clientPortal.login.clientNotFound');
        } else if (err.response?.status === 400) {
          error.value = err.response?.data?.message || t('clientPortal.login.invalidRequest');
        } else if (err.message?.includes('Network Error') || err.code === 'ECONNREFUSED') {
          error.value =
            'No se puede conectar al servidor. Verifica que el backend esté corriendo en puerto 3000.';
        } else {
          error.value = err.response?.data?.message || t('clientPortal.login.errorRequestingCode');
        }
      } finally {
        requesting.value = false;
      }
    };

    const validateCode = async () => {
      if (!accessCode.value || accessCode.value.length < 4 || accessCode.value.length > 8) {
        error.value = t('clientPortal.login.invalidCodeLength');
        return;
      }

      validating.value = true;
      error.value = '';

      try {
        const response = await validatePortalCode(accessCode.value, commerceSlug.value);

        if (response && response.valid && response.sessionToken) {
          // Salvar token de sessão
          localStorage.setItem('clientPortalSessionToken', response.sessionToken);
          localStorage.setItem('clientPortalSessionExpiresAt', response.expiresAt);
          localStorage.setItem('clientPortalSessionExpiresAt', response.expiresAt);

          // Establecer userType como 'client' en store
          await store.setCurrentUserType('client');

          // Salvar dados do cliente e comércio
          if (response.client) {
            localStorage.setItem('clientPortalClient', JSON.stringify(response.client));
            await store.setCurrentUser(response.client);
          }
          if (response.commerce) {
            localStorage.setItem('clientPortalCommerce', JSON.stringify(response.commerce));
            commerce.value = response.commerce;
            await store.setCurrentCommerce(response.commerce);
          }

          authenticated.value = true;

          try {
            await router.push({
              name: 'client-portal-menu',
              params: { commerceSlug: commerceSlug.value },
            });
          } catch (navError) {
            console.error('Error navegando a client-portal-menu:', navError);
          }
        } else {
          error.value = t('clientPortal.login.invalidCode');
        }
      } catch (err) {
        if (err.response?.status === 401) {
          error.value = t('clientPortal.login.incorrectCode');
        } else if (err.response?.status === 429) {
          error.value = t('clientPortal.login.tooManyAttempts');
        } else {
          error.value = err.response?.data?.message || t('clientPortal.login.validationError');
        }
      } finally {
        validating.value = false;
      }
    };

    const resetForm = () => {
      codeRequested.value = false;
      accessCode.value = '';
      error.value = '';
      sentVia.value = null;
      showCodeForm.value = false;
      // No reseteamos el cooldown cuando el usuario pide un nuevo código
    };

    onMounted(async () => {
      // Limpiar completamente el store y localStorage al entrar a la página de login
      await store.setCurrentUserType('client');
      await store.setCurrentUser(null);
      await store.setCurrentCommerce(null);
      await store.setCurrentPermissions(null);

      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('clientPortalSessionToken');
        localStorage.removeItem('clientPortalSessionExpiresAt');
        localStorage.removeItem('clientPortalClient');
        localStorage.removeItem('clientPortalCommerce');
      }

      // Cargar datos del comercio
      await loadCommerce();

      // Enfocar el input de idNumber después de que el componente se monte
      await nextTick();
      const idNumberInput = document.getElementById('idNumber');
      if (idNumberInput) {
        idNumberInput.focus();
      }

      // Verificar se já existe sessão válida
      const existingToken = localStorage.getItem('clientPortalSessionToken');
      const expiresAt = localStorage.getItem('clientPortalSessionExpiresAt');

      if (existingToken && expiresAt && new Date(expiresAt) > new Date()) {
        // Validar token contra o backend para garantir que está ativo
        try {
          const response = await validatePortalSession(existingToken);
          if (response && response.valid && !response.expired) {
            if (response.client) {
              await store.setCurrentUser(response.client);
            }
            if (response.commerce) {
              await store.setCurrentCommerce(response.commerce);
            }
            try {
              await router.push({
                name: 'client-portal-consents',
                params: { commerceSlug: commerceSlug.value },
              });
            } catch (navError) {
              console.error('🔥 Error navegando desde sesión existente:', navError);
            }
            return;
          } else {
            // Token inválido ou expirado por inatividade, limpar localStorage
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('clientPortalSessionToken');
              localStorage.removeItem('clientPortalSessionExpiresAt');
              localStorage.removeItem('clientPortalClient');
              localStorage.removeItem('clientPortalCommerce');
            }
          }
        } catch (err) {
          // Erro ao validar, limpar localStorage
          console.error('Error validating existing session:', err);
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('clientPortalSessionToken');
            localStorage.removeItem('clientPortalSessionExpiresAt');
            localStorage.removeItem('clientPortalClient');
            localStorage.removeItem('clientPortalCommerce');
          }
        }
      }
    });

    // Watcher para enfocar el input de código cuando se muestra
    watch([codeRequested, showCodeForm], async newValues => {
      if (newValues[0] || newValues[1]) {
        await nextTick();
        const accessCodeInput = document.getElementById('accessCode');
        if (accessCodeInput) {
          accessCodeInput.focus();
        }
      }
    });

    return {
      loading,
      loadingCommerce,
      requesting,
      validating,
      codeRequested,
      authenticated,
      accessCode,
      commerceSlug,
      idNumber,
      email,
      phone,
      error,
      commerceNotFound,
      commerce,
      sentVia,
      captcha,
      siteKey,
      isDevelopment,
      validateCaptchaOk,
      validateCaptchaError,
      requestCode,
      validateCode,
      resetForm,
      // Rate limiting variables
      canRequestCode,
      cooldownTime,
      cooldownText,
      hasInputData,
      showCodeForm,
      toggleCodeForm,
    };
  },
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem;
  min-height: calc(100vh - 200px);
}

.modern-login-card {
  width: 100%;
  max-width: 580px;
  background: var(--color-background);
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 0.5px solid var(--gris-default);
  overflow: hidden;
}

.login-card-content {
  padding: 1rem;
}

.form-group {
  margin-bottom: 0.75rem;
}

.form-label {
  display: block;
  margin-bottom: 0.375rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--gris-elite-1);
  text-align: left;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1.25rem;
  font-size: 1.25rem;
  color: var(--azul-turno);
  z-index: 2;
  transition: color 0.3s ease, transform 0.2s ease;
}

.modern-input {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 3.5rem;
  border: 1.75px solid #ced4da;
  border-radius: 1rem;
  font-size: 1rem;
  line-height: 1.5;
  background-color: var(--color-background);
  transition: all 0.3s ease;
  text-align: left;
}

.modern-input:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 0.2rem rgba(0, 74, 173, 0.15);
  background-color: var(--color-background);
}

.modern-input:focus + .input-icon,
.input-wrapper:focus-within .input-icon {
  color: var(--verde-tu);
  transform: scale(1.1);
}

.modern-input::placeholder {
  color: var(--gris-default);
  opacity: 0.7;
}

.btn-area {
  margin-top: 0.75rem;
  position: relative;
}

.modern-submit-btn {
  width: 100%;
  padding: 0.875rem 2rem;
  font-size: 1rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.modern-submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 74, 173, 0.4);
}

.modern-submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.modern-submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.errors {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--rojo-warning);
  padding: 0 0.5rem;
}

.actions {
  margin-top: 1.5rem;
  padding: 1.5rem 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.actions-text {
  margin: 0;
  font-size: 0.95rem;
  color: var(--gris-elite-1);
  line-height: 1.5;
}

.actions-link {
  color: var(--azul-turno);
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
}

.actions-link:hover {
  color: var(--verde-tu);
  transform: translateX(4px);
}

.actions-link i {
  transition: transform 0.3s ease;
}

.actions-link:hover i {
  transform: translateX(4px);
}

.form-text {
  font-size: 0.875rem;
  color: var(--gris-elite-1);
  text-align: left;
}

.help-text {
  font-size: 0.9rem;
  color: var(--gris-elite-1);
  margin-bottom: 1rem;
}

.optional-badge {
  background: #17a2b8;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-left: 8px;
  text-transform: uppercase;
}

.success-state {
  padding: 2rem 1rem;
}

.recaptcha-area {
  display: flex;
  justify-content: center;
  margin: 0.75rem 0;
  padding: 0.25rem 0;
}

.dev-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 0.25rem;
  color: #856404;
  font-size: 0.875rem;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .login-container {
    padding: 1.5rem;
  }

  .login-card-content {
    padding: 1.25rem;
  }

  .modern-login-card {
    max-width: 600px;
  }
}

@media (max-width: 576px) {
  .login-card-content {
    padding: 0.875rem;
  }

  .modern-input {
    padding: 0.75rem 0.875rem 0.75rem 3rem;
    font-size: 0.95rem;
  }

  .input-icon {
    left: 1rem;
    font-size: 1.1rem;
  }
}
</style>
