<script>
import Message from '../../components/common/Message.vue';
import Warning from '../../components/common/Warning.vue';
import NotificationConditions from '../../components/domain/NotificationConditions.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import { notify } from '../../application/services/attention';
import { VueRecaptcha } from 'vue-recaptcha';
import { getPhoneCodes } from '../../shared/utils/data';

export default {
  name: 'ClientNotifyData',
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
      phoneCode: '',
      phoneNumber: '',
      phone: '',
      email: '',
      captcha: false,
      phoneError: false,
			emailError: false,
      loading: false,
      enterFullNumber: false,
      alertError: '',
      errors: [],
      accept: false,
      confirmed: false,
      user: { id: this.userId, notificationOn: this.notificationOn },
      siteKey: import.meta.env.VITE_RECAPTCHA_INVISIBLE,
      captchaEnabled: import.meta.env.VITE_RECAPTCHA_ENABLED || 'false',
      phoneCodes: [],
      toggles: {
        'client.notify.whatsapp': true,
        'client.notify.email': false,
      }
    }
  },
  beforeMount() {
    this.phoneCodes = getPhoneCodes();
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
            phone: this.phone,
            email: undefined,
            attentionId: this.attentionId,
            commerceId: this.commerceId,
            queueId: this.queueId,
            notificationOn: true
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
      if(this.phoneNumber > 0) {
        if (this.phoneCode.length > 0) {
          this.phone = this.phoneCode;
        } else {
          if (this.phoneCode === 'xx' ) {
            this.enterFullNumber = true;
          } else if (this.commerce.localeInfo && this.commerce.localeInfo.country) {
            this.phone = this.findPhoneCodeByCountry(this.commerce.localeInfo.country);
          }
        }
        if (this.phone.length === 0) {
          this.phoneError = true;
          this.errors.push('clientNotifyData.validate.cellphone.1');
        } else {
          if (this.phone === 'xx') {
            this.phone = '';
          }
          this.phone = this.phone + this.phoneNumber.replace(/^0+/, '');
        }
      }
      if(this.phone.length > 0) {
        if(this.phone.length < 10) {
          this.phoneError = true;
          this.errors.push('clientNotifyData.validate.cellphone.1');
        }
      }
      if(this.phone.length === 0) {
        this.errors.push('clientNotifyData.validate.common.1');
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
    findPhoneCodeByCountry(countryIn) {
      const search = this.phoneCodes.find(code => code.id === countryIn);
      if (search) {
        return search.code;
      }
      return '';
    },
    findPhoneCodeByCode(codeIn) {
      const search = this.phoneCodes.find(code => code.id === codeIn);
      if (search) {
        return search.code;
      }
      return '';
    }
  },
  watch: {
    userIn() {
      if (this.$props.userIn.phone) {
        const phoneCode = this.$props.userIn.phone.slice(0, 2) || '';
        const phoneNumber = this.$props.userIn.phone.slice(2, this.$props.userIn.phone.length) || '';
        this.phoneCode = phoneCode;
        this.phoneNumber = phoneNumber;
        this.confirmed = true;
      }
    },
    commerce: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.commerce.localeInfo && this.commerce.localeInfo.country) {
          if (this.phoneCode.length === 0) {
            this.phoneCode = this.findPhoneCodeByCountry(this.commerce.localeInfo.country);
          }
        }
      }
    },
    phoneCode: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.phoneCode === 'xx' ) {
          this.enterFullNumber = true;
        } else {
          this.enterFullNumber = false;
        }
      }
    }
  }
}
</script>
<template>
  <div>
    <div class="client-data-card text-center">
      <div>
        <div v-if="notificationOn && phoneNumber && confirmed">
          <Message
            :title="$t('clientNotifyData.message.title')"
            :content="$t('clientNotifyData.message.content')"
            :icon="'bi bi-check-circle'">
          </Message>
        </div>
        <div id="cellphone-form" v-if="toggles['client.notify.whatsapp'] && !confirmed" class="row g-2 mb-1">
          <div class="col-1 centered mt-3">
            <i class="h4 bi bi-whatsapp"></i>
          </div>
          <div class="col-11 centered">
            <select
              class="btn btn-md btn-light fw-bold text-dark select mx-1"
              v-model="phoneCode"
              id="phoneCodes"
              v-bind:class="{ 'is-invalid': phoneError }"
              placeholder="Cod. Pais">
              <option v-for="code in phoneCodes" :key="code.id" :value="code.code">{{ code.label }}</option>
            </select>
            <input
              type="tel"
              class="form-control"
              id="phone"
              maxlength="11"
              v-model="phoneNumber"
              v-bind:class="{ 'is-invalid': phoneError }"
              :placeholder="$t('clientNotifyData.phonePlaceholder')">
          </div>
          <label v-if="!phoneCode" class="examples mt-2"> {{ $t('clientNotifyData.validate.cellphone.example') }} </label>
          <label v-else class="examples mt-2"> {{ $t(`clientNotifyData.validate.cellphone.examples.${phoneCode}`) }} </label>
        </div>
        <div id="email-form" v-if="this.toggles['client.notify.email']" class="row g-2 mb-3">
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
              placeholder="tunombre@estuturno.com">
          </div>
        </div>
        <div class="recaptcha-area form-check form-check-inline" v-if="!notificationOn">
          <input type="checkbox" class="form-check-input" id="conditions" v-model="accept">
          <label class="form-check-label label-conditions text-left" for="conditions"> {{ $t("clientNotifyData.accept.1") }}
            <a href="#conditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal"> {{ $t("clientNotifyData.accept.2") }}</a>
          </label>
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
.tilte-phone {
  font-size: .9rem;
  font-weight: 400;
  line-height: 1rem;
  margin-bottom: 1rem;
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