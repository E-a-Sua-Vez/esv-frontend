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
      if (!this.captcha) {
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
    validateCaptchaError() {
      this.errors.push('clientNotifyData.validate.common.3');
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
        <h2 class="portfolio-modal-title mb-0">{{ $t('accessAdmin.title') }}</h2>
        <div class="divider-custom">
          <div class="divider-custom-line"></div>
          <div class="divider-custom-icon"><i class="bi bi-key"></i></div>
          <div class="divider-custom-line"></div>
        </div>
        <div>
          <div id="accessAdmin" class="card mb-4">
            <p class="mb-2 details">
              <span class="fw-bold">{{ $t('accessAdmin.subtitle.1') }}</span>
            </p>
            <div v-if="!passwordChanged">
              <p class="details-subtitle mt-2">{{ $t('accessAdmin.subtitle.2') }}</p>
              <div id="email-form" class="row g-2 mb-3">
                <div class="col-2 icon">
                  <i class="bi bi-person-fill"></i>
                </div>
                <div class="col-10">
                  <input
                    type="email"
                    class="form-control"
                    id="reset-email"
                    v-model="email"
                    autocomplete="username"
                    v-bind:class="{ 'is-invalid': emailError }"
                    placeholder="tunombre@tumail.com"
                  />
                </div>
              </div>
              <div class="recaptcha-area">
                <VueRecaptcha
                  :sitekey="siteKey"
                  :size="'compact'"
                  @verify="validateCaptchaOk"
                  @error="validateCaptchaError"
                ></VueRecaptcha>
              </div>
              <div class="btn-area d-grid gap-2">
                <button
                  class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4"
                  @click="sendEmail()"
                >
                  {{ $t('accessAdmin.actions.1.action') }}
                  <i class="bi bi-check-lg"></i>
                </button>
                <Spinner :show="loading"></Spinner>
                <Alert :show="loading" :stack="alertError"></Alert>
              </div>
            </div>
            <div v-else>
              <Message
                :title="$t('accessAdmin.message.1.title')"
                :content="$t('accessAdmin.message.1.content')"
                :icon="'bi bi-emoji-sunglasses'"
              >
              </Message>
              <div class="btn-area d-grid gap-2">
                <button
                  class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4"
                  @click="closeModal()"
                >
                  {{ $t('accessAdmin.actions.2.action') }}
                  <i class="bi bi-check-lg"></i>
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
.details {
  font-size: 1.2rem;
  line-height: 1rem;
}
.details-subtitle {
  font-size: 0.9rem;
  line-height: 1rem;
}
.card {
  background-color: var(--color-background);
  margin-top: 1rem;
  margin-bottom: 1rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  padding: 1rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
}
</style>
