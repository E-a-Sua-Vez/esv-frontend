<script>
import Message from '../common/Message.vue';
import Warning from '../common/Warning.vue';
import NotificationConditions from '../conditions/NotificationConditions.vue';
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';
import { notify } from '../../application/services/attention';
import { VueRecaptcha } from 'vue-recaptcha';

export default {
  name: 'ClientEmailNotifyData',
  components: { Message, Warning, NotificationConditions, VueRecaptcha, Spinner, Alert },
  props: {
    attentionId: { type: String, default: undefined },
    userId: { type: String, default: undefined },
    commerceId: { type: String, default: undefined },
    queueId: { type: String, default: undefined },
    notificationOn: { type: Boolean, default: false },
    commerce: { type: Object, default: {} },
    userIn: { type: Object, default: {} },
  },
  data() {
    return {
      email: '',
      accept: false,
      confirmed: false,
      captcha: false,
			emailError: false,
      loading: false,
      alertError: '',
      errors: [],
      user: { id: this.userId, notificationOn: this.notificationOn },
      siteKey: import.meta.env.VITE_RECAPTCHA_INVISIBLE,
      captchaEnabled: import.meta.env.VITE_RECAPTCHA_ENABLED || 'false',
      toggles: {
        'client.notify.email': true,
      }
    }
  },
  methods: {
    async saveClientData() {
      if (!this.captchaEnabled || this.captchaEnabled === 'false') {
        this.captcha = true;
      }
      if(this.validate()) {
        try {
          this.loading = true;
          this.alertError = '';
          const body = {
            name: undefined,
            email: this.email,
            attentionId: this.attentionId,
            commerceId: this.commerceId,
            queueId: this.queueId,
            notificationEmailOn: true
          };
          const attention = await notify(this.attentionId, body);
          this.user = attention.user;
          this.$emit('createdUser', this.user);
          this.confirmed = true;
          this.loading = false;
        } catch (error) {
          this.loading = false;
          this.alertError = error.message;
        }
      }
    },
    validate() {
      this.errors = [];
      if(this.email.length > 0) {
        if(this.email.length < 10) {
          this.emailError = true;
          this.errors.push('clientNotifyData.validate.email.1');
        }
      }
      if(!this.accept) {
        if (this.notificationOn) {
          this.accept = this.notificationOn;
        } else {
          this.errors.push('clientNotifyData.validate.common.2');
        }
      }
      if(!this.captcha) {
        this.errors.push('clientNotifyData.validate.common.3');
      }
      if(this.errors.length === 0) {
        return true;
      }
      return false;
	  },
    async validateCaptchaOk(response) {
      if(response) {
        this.captcha = true;
        await this.saveClientData();
      }
    },
    validateCaptchaError() {
      this.captcha = false;
      this.errors.push('clientNotifyData.validate.common.3');
    },
  },
  watch: {
    userIn() {
      if (this.$props.userIn.email) {
        const email = this.$props.userIn.email || '';
        this.email = email;
        this.confirmed = true;
      }
    }
  }
}
</script>
<template>
  <div>
    <div class="client-data-card text-center">
      <div>
        <div v-if="this.notificationOn && email && confirmed">
          <Message
            :title="$t('clientNotifyData.message.title')"
            :content="$t('clientNotifyData.message.content')"
            :icon="'bi bi-check-circle'">
          </Message>
        </div>
        <div id="email-form" v-if="this.toggles['client.notify.email'] && !confirmed" class="row g-2 mb-3">
          <div class="col-2 centered">
            <i class="h4 bi bi-envelope-fill"></i>
          </div>
          <div class="col-10 centered">
            <input
              type="email"
              class="form-control"
              id="email"
              v-model="email"
              v-bind:class="{ 'is-invalid': emailError }"
              placeholder="tuemail@estuturno.app">
          </div>
        </div>
        <div class="recaptcha-area form-check form-check-inline" v-if="!notificationOn">
          <input type="checkbox" class="form-check-input" id="conditions" v-model="accept">
          <label class="form-check-label label-conditions text-left" for="conditions"> {{ $t("clientNotifyData.accept.1") }} <a href="#conditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal"> {{ $t("clientNotifyData.accept.2") }}</a></label>
        </div>
        <div class="mt-3" v-if="!confirmed">
          <div v-if="captchaEnabled || captchaEnabled === 'true'" class="btn-area d-grid gap-2">
            <VueRecaptcha
              :sitekey="siteKey"
              @verify="validateCaptchaOk"
              @error="validateCaptchaError">
              <button
                class="btn btn-md fw-bold btn-dark text-white rounded-pill p-1 px-4"
                type="submit"
                @click="saveClientData()">
                {{ $t("clientNotifyData.action") }}
                <i class="bi bi-check-lg"></i>
              </button>
            </VueRecaptcha>
          </div>
          <div v-else>
            <button
              class="btn btn-md fw-bold btn-dark text-white rounded-pill p-1 px-4"
              type="submit"
              @click="saveClientData()">
              {{ $t("clientNotifyData.action") }}
              <i class="bi bi-check-lg"></i>
            </button>
          </div>
          <Spinner :show="loading"></Spinner>
          <Alert :show="loading" :stack="alertError"></Alert>
        </div>
      </div>
      <div class="errors" id="feedback" v-if="(errors.length > 0)">
        <Warning>
          <template v-slot:message>
            <li v-for="(error, index) in errors" :key="index">
              {{ $t(error) }}
            </li>
          </template>
        </Warning>
      </div>
      <!-- Modal Conditions -->
      <div class="modal fade" id="conditionsModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
        <div class=" modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header border-0"><button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button></div>
              <div class="modal-body text-center pb-5">
                <NotificationConditions></NotificationConditions>
                <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4" data-bs-toggle="modal" data-bs-target="#conditionsModal">{{ $t("notificationConditions.action") }} <i class="bi bi-check-lg"></i></a>
              </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.client-data-card {
  --margin-top: .2rem;
  --margin-bottom: 1rem;
  padding: 0rem 1rem;
  background-color: var(--color-background);
  --border-radius: .5rem;
  --border: .5px solid var(--gris-default);
  font-weight: 400;
}
.label-conditions {
  font-size: .9rem;
  line-height: 1rem;
  margin-left: .3rem;
}
.errors {
  font-size: small;
  color: var(--rojo-warning);
}
.examples {
  font-size: .8rem;
  line-height: 1rem;
  color: .5px solid var(--gris-default);
}
.btn-area {
  z-index: 99;
  position: relative;
  top: 0;
  right: 0;
}
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
</style>