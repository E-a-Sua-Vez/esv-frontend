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
    };
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
};
</script>
<template>
  <div>
    <form @submit.prevent="login">
      <div class="client-data-card text-center mx-4">
        <div>
          <div id="email-form" class="row g-2 mb-3">
            <div class="col-2 icon">
              <i class="bi bi-person-fill"></i>
            </div>
            <div class="col-10">
              <input
                type="email"
                class="form-control"
                id="email"
                v-model="email"
                autocomplete="username"
                v-bind:class="{ 'is-invalid': emailError }"
                placeholder="tunombre@tumail.com"
              />
            </div>
          </div>
          <div id="password-form" class="row g-2 mb-3">
            <div class="col-2 icon">
              <i class="bi bi-key-fill"></i>
            </div>
            <div class="col-10">
              <input
                type="password"
                class="form-control"
                id="password"
                v-model="password"
                autocomplete="current-password"
                v-bind:class="{ 'is-invalid': passwordError }"
                :placeholder="$t('loginData.password.placeholder')"
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
              type="submit"
            >
              {{ $t('loginData.actions.1.action') }}
              <i class="bi bi-check-lg"></i>
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
        <div class="actions mt-4" v-if="userType !== 'master'">
          <span>{{ $t('loginData.actions.2.title.1') }}</span>
          <div class="d-grid gap-2">
            <a
              class="mb-3 link"
              data-bs-toggle="modal"
              data-bs-target="#modalPassword"
              @click="$event => closeMenu()"
            >
              {{ $t('loginData.actions.2.action') }}
            </a>
          </div>
        </div>
        <!-- Modal Password -->
        <div
          class="modal fade"
          id="modalPassword"
          data-bs-backdrop="static"
          data-bs-keyboard="false"
          tabindex="-1"
          aria-labelledby="staticBackdropLabel"
          aria-hidden="true"
        >
          <div class="modal-dialog modal-xl">
            <div class="modal-content">
              <div class="modal-header border-0">
                <button
                  id="close-modal"
                  class="btn-close"
                  type="button"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>
              <div class="modal-body text-center pb-5">
                <Suspense>
                  <template #default>
                    <AccessAdmin :user-type="userType" @closeModal="closeMenu()"> </AccessAdmin>
                  </template>
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>
<style scoped>
.client-data-card {
  margin-top: 0.2rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background-color: var(--color-background);
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  font-weight: 400;
  line-height: 2.5rem;
}
.icon {
  font-size: 1.5rem;
}
.errors {
  font-size: small;
  color: var(--rojo-warning);
}
.btn-area {
  z-index: 99;
  position: relative;
  top: 0;
  right: 0;
}
.link {
  cursor: pointer;
}
</style>
