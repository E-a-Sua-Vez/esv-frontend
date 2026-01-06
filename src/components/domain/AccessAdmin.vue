<script>
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';
import Warning from '../common/Warning.vue';
import Message from '../common/Message.vue';
import { sendResetPasswordEmail } from '../../application/firebase';
import { changePassword } from '../../application/services/auth';
import { VueRecaptcha } from 'vue-recaptcha';
import { globalStore } from '../../stores';

export default {
  name: 'AccessAdmin',
  props: {
    userType: { type: String, default: undefined },
  },
  components: { Spinner, Alert, VueRecaptcha, Warning, Message },
  data() {
    const store = globalStore();
    const siteKey = import.meta.env.VITE_RECAPTCHA_CHECK;
    return {
      email: '',
      accept: false,
      captcha: false,
      emailError: false,
      errors: [],
      modalVisible: false,
      loading: false,
      alertError: '',
      siteKey,
      store,
      visible: false,
      passwordChanged: false,
    };
  },
  computed: {
    isDevelopment() {
      return import.meta.env.DEV;
    },
  },
  methods: {
    closeModal() {
      this.$emit('close-modal');
    },
    validate() {
      this.errors = [];
      if (this.email.length > 0) {
        if (this.email.length < 10) {
          this.emailError = true;
          this.errors.push('loginData.validate.email.1');
        }
      } else {
        this.emailError = true;
        this.errors.push('loginData.validate.common.4');
      }
      if (!this.captcha && !import.meta.env.DEV) {
        this.errors.push('loginData.validate.common.2');
      }
      if (this.errors.length === 0) {
        return true;
      }
      return false;
    },
    validateCaptchaOk(response) {
      if (response) {
        this.captcha = true;
      }
    },
    validateCaptchaError(error) {
      console.warn('reCAPTCHA error:', error);
      // In development, we can be more lenient with reCAPTCHA errors
      if (import.meta.env.DEV) {
        console.warn('Development mode: reCAPTCHA error ignored');
        this.captcha = true; // Allow operation in development even if reCAPTCHA fails
      } else {
        this.errors.push('clientNotifyData.validate.common.3');
      }
    },
    async sendEmail() {
      if (this.validate()) {
        try {
          this.loading = true;
          this.alertError = '';
          try {
            await changePassword(this.email, this.userType);
            const result = await sendResetPasswordEmail(this.email);
            if (result === 'Email Sent') {
              this.passwordChanged = true;
            } else {
              this.errors.push('loginData.validate.common.6');
            }
          } catch (error) {
            this.errors.push('loginData.validate.common.5');
          }
          this.loading = false;
        } catch (error) {
          this.loading = false;
          this.alertError = error.message;
        }
      }
    },
  },
};
</script>

<template>
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <div class="w-100">
          <div id="accessAdmin" class="modern-access-card-content">
            <div v-if="!passwordChanged" class="access-card-body-compact">
              <div class="form-group">
                <label for="reset-email" class="form-label"> Usuario </label>
                <div class="input-wrapper">
                  <i class="bi bi-person-fill input-icon"></i>
                  <input
                    type="email"
                    class="form-control modern-input"
                    id="reset-email"
                    v-model="email"
                    autocomplete="username"
                    v-bind:class="{ 'is-invalid': emailError }"
                    :placeholder="$t('loginData.email.placeholder')"
                  />
                </div>
              </div>
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
                  class="btn btn-lg fw-bold btn-dark text-white rounded-pill modern-submit-btn"
                  @click="sendEmail()"
                  :disabled="loading"
                >
                  <span v-if="!loading">{{ $t('accessAdmin.actions.1.action') }}</span>
                  <span
                    v-else
                    class="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  <i v-if="!loading" class="bi bi-check-lg ms-2"></i>
                </button>
                <Spinner :show="loading"></Spinner>
                <Alert :show="loading" :stack="alertError"></Alert>
              </div>
            </div>
            <div v-else class="access-card-body">
              <Message
                :title="$t('accessAdmin.message.1.title')"
                :content="$t('accessAdmin.message.1.content')"
                :icon="'bi bi-emoji-sunglasses'"
              >
              </Message>
              <div class="btn-area">
                <button
                  class="btn btn-lg fw-bold btn-dark text-white rounded-pill modern-submit-btn"
                  @click="closeModal()"
                >
                  {{ $t('accessAdmin.actions.2.action') }}
                  <i class="bi bi-check-lg ms-2"></i>
                </button>
              </div>
            </div>
            <div class="errors" id="feedback" v-if="errors.length > 0">
              <Warning>
                <template v-slot:message>
                  <li v-for="(error, index) in errors" :key="index">
                    {{ $t(error) }}
                  </li>
                </template>
              </Warning>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modern-access-card-content {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
  margin: 0;
  box-shadow: none;
  overflow: visible;
  width: 100%;
}

.access-card-body-compact {
  padding: 0;
  overflow: visible;
  word-wrap: break-word;
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

.modern-input.is-invalid {
  border-color: var(--rojo-warning);
  background-color: var(--rojo-ligth);
}

.modern-input.is-invalid + .input-icon {
  color: var(--rojo-warning);
}

.modern-input::placeholder {
  color: var(--gris-default);
  opacity: 0.7;
}

.recaptcha-area {
  display: flex;
  justify-content: center;
  margin: 0.75rem 0;
  padding: 0.25rem 0;
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
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.container {
  width: 100%;
  max-width: 100%;
  padding: 0;
  margin: 0;
}

.row {
  margin: 0;
}

.col-lg-8 {
  padding: 0;
  width: 100%;
}

@media (min-width: 768px) {
  .access-card-body {
    padding: 2rem 2rem;
  }

  .access-card-header {
    padding: 1rem 1.5rem;
  }

  .access-card-title {
    font-size: 1.2rem;
  }
}

@media (max-width: 768px) {
  .access-card-header {
    padding: 0.75rem 1rem;
  }

  .access-card-title {
    font-size: 1rem;
  }

  .access-card-body {
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
