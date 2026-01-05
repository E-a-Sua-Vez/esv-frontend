<template>
  <div>
    <div class="content text-center">
      <!-- Commerce Logo -->
      <CommerceLogo
        v-if="commerce && commerce.logo"
        :src="commerce.logo"
        :loading="false"
        :large-size="true"
      ></CommerceLogo>

      <div id="page-header" class="text-center mt-4" v-if="!authenticated">
        <div class="welcome">
          <span>{{ $t('clientPortal.login.welcome') }}</span>
        </div>
      </div>

      <div class="login-container" :class="{ 'reduced-margin': !authenticated }">
        <div class="modern-login-card text-center">
          <div class="login-card-content">
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">{{ $t('clientPortal.login.loading') }}</span>
              </div>
              <p class="mt-3 text-muted">{{ $t('clientPortal.login.processing') }}</p>
            </div>

            <!-- Request Access Form -->
            <div v-else-if="!codeRequested && !authenticated" class="request-access-form">
              <div class="text-center mb-4">
                <div class="form-icon-wrapper mb-3">
                  <i class="bi bi-person-circle"></i>
                </div>
                <h4 class="mt-3">{{ $t('clientPortal.login.requestAccess') }}</h4>
                <p class="text-muted">
                  {{ $t('clientPortal.login.requestAccessDescription') }}
                </p>
              </div>

              <form @submit.prevent="requestCode" class="mt-4">
                <div class="form-group">
                  <label for="commerceId" class="form-label">
                    {{ $t('clientPortal.login.commerceId') }}
                  </label>
                  <div class="input-wrapper">
                    <i class="bi bi-building input-icon"></i>
                    <input
                      id="commerceId"
                      v-model="commerceId"
                      type="text"
                      class="form-control modern-input"
                      :placeholder="$t('clientPortal.login.commerceIdPlaceholder')"
                      required
                      :disabled="requesting"
                    />
                  </div>
                </div>

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

                <div class="form-group">
                  <label for="email" class="form-label">
                    {{ $t('clientPortal.login.email') }}
                  </label>
                  <div class="input-wrapper">
                    <i class="bi bi-envelope input-icon"></i>
                    <input
                      id="email"
                      v-model="email"
                      type="email"
                      class="form-control modern-input"
                      :placeholder="$t('clientPortal.login.emailPlaceholder')"
                      :disabled="requesting"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label for="phone" class="form-label">
                    {{ $t('clientPortal.login.phone') }}
                  </label>
                  <div class="input-wrapper">
                    <i class="bi bi-telephone input-icon"></i>
                    <input
                      id="phone"
                      v-model="phone"
                      type="tel"
                      class="form-control modern-input"
                      :placeholder="$t('clientPortal.login.phonePlaceholder')"
                      :disabled="requesting"
                    />
                  </div>
                </div>

                <div class="btn-area">
                  <button
                    type="submit"
                    class="btn btn-lg fw-bold btn-dark text-white rounded-pill modern-submit-btn"
                    :disabled="requesting || !commerceId || (!idNumber && !email && !phone)"
                  >
                    <span v-if="requesting" class="spinner-border spinner-border-sm me-2"></span>
                    <span v-else>
                      <i class="bi bi-send me-2"></i>
                      {{ $t('clientPortal.login.sendCode') }}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            <!-- Code Validation Form -->
            <div v-else-if="codeRequested && !authenticated" class="code-validation-form">
              <div class="text-center mb-4">
                <div class="form-icon-wrapper mb-3">
                  <i class="bi bi-shield-lock"></i>
                </div>
                <h4 class="mt-3">{{ $t('clientPortal.login.enterCode') }}</h4>
                <p class="text-muted">
                  {{ $t('clientPortal.login.enterCodeDescription') }}
                </p>
                <p v-if="sentVia" class="text-info small">
                  {{ $t('clientPortal.login.codeSentVia', { via: sentVia }) }}
                </p>
              </div>

              <form @submit.prevent="validateCode" class="mt-4">
                <div class="form-group">
                  <label for="accessCode" class="form-label">
                    {{ $t('clientPortal.login.accessCode') }}
                  </label>
                  <div class="input-wrapper">
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
                </div>

                <div class="btn-area">
                  <button
                    type="submit"
                    class="btn btn-lg fw-bold btn-dark text-white rounded-pill modern-submit-btn"
                    :disabled="
                      validating || !accessCode || accessCode.length < 4 || accessCode.length > 8
                    "
                  >
                    <span v-if="validating" class="spinner-border spinner-border-sm me-2"></span>
                    <span v-else>
                      <i class="bi bi-check-circle me-2"></i>
                      {{ $t('clientPortal.login.validateAndAccess') }}
                    </span>
                  </button>
                </div>

                <div class="mt-3">
                  <button type="button" class="btn btn-link text-muted" @click="resetForm">
                    {{ $t('clientPortal.login.requestNewCode') }}
                  </button>
                </div>
              </form>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="errors">
              <div class="alert alert-danger text-center">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>{{ error }}</strong>
                <div class="mt-3">
                  <button @click="resetForm" class="btn btn-outline-danger">
                    {{ $t('clientPortal.login.tryAgain') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Success - Redirecting -->
            <div v-else-if="authenticated" class="success-state">
              <div class="text-center mb-4">
                <div
                  class="form-icon-wrapper mb-3"
                  style="
                    background: linear-gradient(135deg, var(--verde-tu) 0%, var(--azul-turno) 100%);
                  "
                >
                  <i class="bi bi-check-circle-fill" style="color: white; font-size: 1.5rem"></i>
                </div>
                <h4 class="mt-3" style="color: var(--verde-tu); font-weight: 700">
                  {{ $t('clientPortal.login.accessGranted') }}
                </h4>
                <p class="text-muted mt-2">
                  {{ $t('clientPortal.login.redirecting') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { requestPortalAccess, validatePortalCode } from '../../application/services/client-portal';
import CommerceLogo from '../../components/common/CommerceLogo.vue';

export default {
  name: 'ClientPortalLogin',
  components: {
    CommerceLogo,
  },
  setup() {
    const router = useRouter();
    const { t } = useI18n();

    const loading = ref(false);
    const requesting = ref(false);
    const validating = ref(false);
    const codeRequested = ref(false);
    const authenticated = ref(false);
    const accessCode = ref('');
    const commerceId = ref('');
    const idNumber = ref('');
    const email = ref('');
    const phone = ref('');
    const error = ref('');
    const commerce = ref(null);
    const sentVia = ref(null);

    const requestCode = async () => {
      if (!commerceId.value || (!idNumber.value && !email.value && !phone.value)) {
        error.value = t('clientPortal.login.fillRequiredFields');
        return;
      }

      requesting.value = true;
      error.value = '';

      try {
        const response = await requestPortalAccess(
          commerceId.value,
          email.value || undefined,
          phone.value || undefined,
          idNumber.value || undefined
        );

        if (response && response.sentVia) {
          codeRequested.value = true;
          sentVia.value = response.sentVia;
          // Não mostrar o código em produção, apenas para debug
          if (process.env.NODE_ENV === 'development') {
            console.log('Access code:', response.code);
          }
        } else {
          error.value = t('clientPortal.login.errorSendingCode');
        }
      } catch (err) {
        if (err.response?.status === 404) {
          error.value = t('clientPortal.login.clientNotFound');
        } else if (err.response?.status === 400) {
          error.value = err.response?.data?.message || t('clientPortal.login.invalidRequest');
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
        const response = await validatePortalCode(accessCode.value, commerceId.value);

        if (response && response.valid && response.sessionToken) {
          // Salvar token de sessão
          localStorage.setItem('clientPortalSessionToken', response.sessionToken);
          localStorage.setItem('clientPortalSessionExpiresAt', response.expiresAt);

          // Salvar dados do cliente e comércio
          if (response.client) {
            localStorage.setItem('clientPortalClient', JSON.stringify(response.client));
          }
          if (response.commerce) {
            localStorage.setItem('clientPortalCommerce', JSON.stringify(response.commerce));
            commerce.value = response.commerce;
          }

          authenticated.value = true;

          // Redirecionar para o menu do portal após 1 segundo
          setTimeout(() => {
            router.push({ path: '/portal' });
          }, 1000);
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
    };

    onMounted(() => {
      // Verificar se já existe sessão válida
      const existingToken = localStorage.getItem('clientPortalSessionToken');
      const expiresAt = localStorage.getItem('clientPortalSessionExpiresAt');

      if (existingToken && expiresAt && new Date(expiresAt) > new Date()) {
        // Sessão válida, redirecionar para o portal
        router.push({ path: '/portal' });
      }
    });

    return {
      loading,
      requesting,
      validating,
      codeRequested,
      authenticated,
      accessCode,
      commerceId,
      idNumber,
      email,
      phone,
      error,
      commerce,
      sentVia,
      requestCode,
      validateCode,
      resetForm,
    };
  },
};
</script>

<style scoped>
@import '../../shared/styles/prontuario-common.css';

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem;
}

.login-container.reduced-margin {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
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
  padding: 0.75rem;
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

.form-icon-wrapper {
  width: 50px;
  height: 50px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  border-radius: 50%;
  color: white;
  font-size: 1.5rem;
  box-shadow: 0 4px 15px rgba(0, 74, 173, 0.3);
}

.success-state {
  padding: 2rem 1rem;
}

.form-text {
  font-size: 0.875rem;
  color: var(--gris-elite-1);
  text-align: left;
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

  .form-icon-wrapper {
    width: 70px;
    height: 70px;
    font-size: 2rem;
  }
}
</style>

