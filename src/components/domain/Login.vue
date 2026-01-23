<script>
import { globalStore } from '../../stores';
import { VueRecaptcha } from 'vue-recaptcha';
import { signIn } from '../../application/services/auth';
import { signOut } from '../../application/services/auth';
import Alert from '../../components/common/Alert.vue';
import Spinner from '../../components/common/Spinner.vue';
import Message from '../../components/common/Message.vue';
import Warning from '../../components/common/Warning.vue';
import AccessAdmin from '../../components/domain/AccessAdmin.vue';
import { useProfessionalProfileStore } from '../../stores/professional-profile';
import { getProfessionalByCollaboratorId } from '../../application/services/professional';

export default {
  name: 'Login',
  components: { Message, Warning, VueRecaptcha, Spinner, Alert, AccessAdmin },
  props: {
    userType: { type: String, default: undefined },
    urlOkRedirect: { type: String, default: '' },
  },
  data() {
    const { keyName } = this.$route.params;
    const siteKey = import.meta.env.VITE_RECAPTCHA_CHECK;
    const store = globalStore();
    return {
      email: '',
      password: '',
      accept: false,
      captcha: false,
      passwordError: false,
      emailError: false,
      errors: [],
      modalVisible: false,
      loading: false,
      alertError: '',
      user: { id: this.userId },
      siteKey,
      keyName,
      store,
      visible: false,
      showPassword: false,
    };
  },
  computed: {
    isDevelopment() {
      return import.meta.env.DEV;
    },
  },
  methods: {
    async login() {
      if (this.validate()) {
        try {
          this.loading = true;
          this.alertError = '';
          const authenticated = await this.authentication();
          this.user = await this.store.getCurrentUser;
          if (this.user && authenticated) {
            if (this.userType !== undefined) {
              this.store.setCurrentUserType(this.userType);
            }

            // Load professional profile if it's a collaborator
            if (this.userType === 'collaborator' && this.user.id) {
              try {
                const professionalStore = useProfessionalProfileStore();
                const professionalData = await getProfessionalByCollaboratorId(this.user.id);
                professionalStore.setProfessional(professionalData);
              } catch (error) {
                console.warn('Could not load professional profile:', error);
                // Continue with login even if professional profile fails
              }
            }

            let path = this.urlOkRedirect;
            if (this.userType === 'collaborator') {
              path = path.replace(':id', this.user.commerceId);
            }
            this.$router.push({ path });
          }
          this.loading = false;
        } catch (error) {
          this.loading = false;
          this.alertError = error.message;
        }
      }
    },
    validate() {
      this.errors = [];
      if (this.password.length === 0) {
        this.passwordError = true;
        this.errors.push('loginData.validate.password.1');
      }
      if (this.email.length > 0) {
        if (this.email.length < 10) {
          this.emailError = true;
          this.errors.push('loginData.validate.email.1');
        }
      }
      if (this.password.length === 0 && this.email.length === 0) {
        this.errors.push('loginData.validate.common.1');
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
        this.captcha = true; // Allow login in development even if reCAPTCHA fails
      } else {
        this.errors.push('clientNotifyData.validate.common.3');
      }
    },
    async authentication() {
      const result = await signIn(this.email, this.password, this.userType);
      if (result === 'error') {
        this.errors.push('loginData.validate.common.3');
        return false;
      } else if (result === 'inactive') {
        this.errors.push('loginData.validate.common.6');
        return false;
      } else {
        this.store.setCurrentUser(result.user);
        return true;
      }
    },
    closeMenu() {
      this.visible = !this.visible;
      if (this.visible === false) {
        const modalCloseButton = document.getElementById('close-modal');
        modalCloseButton.click();
      }
    },
    handleModalOpen(event) {
      // Remove aria-hidden immediately when modal link is clicked
      // This prevents the accessibility warning about aria-hidden on focused elements
      const modalElement = document.getElementById('modalPassword');
      if (modalElement) {
        // Remove aria-hidden before Bootstrap processes the modal opening
        modalElement.removeAttribute('aria-hidden');
      }
      // Call closeMenu as before
      this.closeMenu();
    },
    togglePasswordVisibility() {
      this.showPassword = !this.showPassword;
    },
  },
  watch: {
    modalVisible(newVal) {
      this.modalVisible = newVal;
    },
  },
  async beforeMount() {
    const currentUser = await this.store.getCurrentUser;
    const currentUserType = await this.store.getCurrentUserType;
    if (currentUser && currentUserType) {
      await signOut(currentUser.email, currentUserType);
      await this.store.resetSession();
    }
  },
  mounted() {
    // Fix accessibility issue: ensure aria-hidden is properly managed
    const modalElement = document.getElementById('modalPassword');

    if (modalElement) {
      // Ensure aria-hidden is removed early when modal starts opening
      modalElement.addEventListener('show.bs.modal', () => {
        modalElement.removeAttribute('aria-hidden');
      });

      // When modal is hidden, ensure aria-hidden is restored
      modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.setAttribute('aria-hidden', 'true');
      });
    }
  },
};
</script>
<template>
  <div class="login-container">
    <form @submit.prevent="login">
      <div class="modern-login-card text-center">
        <div class="login-card-content">
          <div class="form-group">
            <label for="email" class="form-label"> Usuario </label>
            <div class="input-wrapper">
              <i class="bi bi-person-fill input-icon"></i>
              <input
                type="email"
                class="form-control modern-input"
                id="email"
                v-model="email"
                autocomplete="username"
                v-bind:class="{ 'is-invalid': emailError }"
                :placeholder="$t('loginData.email.placeholder')"
              />
            </div>
          </div>
          <div class="form-group">
            <label for="password" class="form-label"> Senha </label>
            <div class="input-wrapper">
              <i class="bi bi-key-fill input-icon"></i>
              <input
                :type="showPassword ? 'text' : 'password'"
                class="form-control modern-input"
                id="password"
                v-model="password"
                autocomplete="current-password"
                v-bind:class="{ 'is-invalid': passwordError }"
                :placeholder="$t('loginData.password.placeholder')"
              />
              <button
                type="button"
                class="password-toggle-btn"
                @click="togglePasswordVisibility"
                :aria-label="showPassword ? $t('loginData.hidePassword') : $t('loginData.showPassword')"
              >
                <i :class="showPassword ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'"></i>
              </button>
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
              type="submit"
              :disabled="loading"
            >
              <span v-if="!loading">{{ $t('loginData.actions.1.action') }}</span>
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
        <div class="errors" id="feedback" v-if="errors.length > 0">
          <Warning>
            <template v-slot:message>
              <li v-for="(error, index) in errors" :key="index">
                {{ $t(error) }}
              </li>
            </template>
          </Warning>
        </div>
        <div class="actions" v-if="userType !== 'master'">
          <p class="actions-text">{{ $t('loginData.actions.2.title.1') }}</p>
          <a
            class="actions-link"
            data-bs-toggle="modal"
            data-bs-target="#modalPassword"
            @click="handleModalOpen"
          >
            {{ $t('loginData.actions.2.action') }}
            <i class="bi bi-arrow-right ms-1"></i>
          </a>
        </div>
        <!-- Modal Password - Use Teleport to render outside component to avoid overflow/position issues -->
        <Teleport to="body">
          <div
            class="modal fade"
            id="modalPassword"
            data-bs-backdrop="static"
            data-bs-keyboard="false"
            tabindex="-1"
            aria-labelledby="modalPasswordLabel"
            role="dialog"
            aria-modal="true"
            aria-hidden="true"
          >
            <div class="modal-dialog modal-xl modern-modal-wrapper">
              <div class="modal-content modern-modal-container">
                <div class="modal-header border-0 active-name modern-modal-header">
                  <div class="modern-modal-header-inner">
                    <div class="modern-modal-icon-wrapper">
                      <i class="bi bi-key-fill"></i>
                    </div>
                    <div class="modern-modal-title-wrapper">
                      <h5 class="modal-title fw-bold modern-modal-title">
                        {{ $t('accessAdmin.subtitle.1') }}
                      </h5>
                      <p class="modern-modal-subtitle">
                        {{ $t('accessAdmin.subtitle.2') }}
                      </p>
                    </div>
                  </div>
                  <button
                    class="btn-close modern-modal-close-btn"
                    type="button"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  >
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
                <div class="modal-body modern-modal-body-compact">
                  <Suspense>
                    <template #default>
                      <AccessAdmin :user-type="userType" @closeModal="closeMenu()"> </AccessAdmin>
                    </template>
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </Teleport>
      </div>
    </form>
  </div>
</template>
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

.password-toggle-btn {
  position: absolute;
  right: 1rem;
  background: none;
  border: none;
  color: var(--gris-default);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.3s ease, transform 0.2s ease;
  z-index: 2;
}

.password-toggle-btn:hover {
  color: var(--azul-turno);
  transform: scale(1.1);
}

.password-toggle-btn:active {
  transform: scale(0.95);
}

.password-toggle-btn:focus {
  outline: none;
  color: var(--verde-tu);
}

.modern-input {
  width: 100%;
  padding: 0.875rem 3.5rem 0.875rem 3.5rem;
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

.modern-modal-content {
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2);
}

.modern-modal-body {
  padding: 1rem;
  overflow: visible;
  word-wrap: break-word;
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

  .modern-modal-body {
    padding: 1.5rem 2rem;
  }
}

@media (max-width: 576px) {
  .login-card-content {
    padding: 0.875rem;
  }

  .modern-input {
    padding: 0.75rem 3rem 0.75rem 3rem;
    font-size: 0.95rem;
  }

  .input-icon {
    left: 1rem;
    font-size: 1.1rem;
  }

  .password-toggle-btn {
    right: 0.75rem;
    font-size: 1.1rem;
  }
}

/* Modern Modal Styles */
.modern-modal-wrapper {
  max-width: 600px;
}

.modern-modal-container {
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2);
  border: none;
}

.modern-modal-header {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 1rem 1rem 0 0;
  min-height: auto;
  position: relative;
}

.modern-modal-header-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.modern-modal-icon-wrapper {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modern-modal-icon-wrapper i {
  font-size: 1.125rem;
  color: #ffffff;
}

.modern-modal-title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.modern-modal-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-background);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.modern-modal-subtitle {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.2;
}

.modern-modal-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.85;
  width: 1.75rem;
  height: 1.75rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  padding: 0;
}

.modern-modal-close-btn i {
  font-size: 1rem;
  color: #ffffff;
  line-height: 1;
}

.modern-modal-close-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.25);
}

.modern-modal-body-compact {
  padding: 1.5rem;
  background-color: var(--color-background);
}
</style>
