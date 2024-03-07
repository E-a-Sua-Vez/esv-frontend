<script>
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';
import Warning from '../common/Warning.vue';
import Message from '../common/Message.vue';
import { VueRecaptcha } from 'vue-recaptcha';
import { createSuggestion } from '../../application/services/suggestion';
import { globalStore } from '../../stores';

export default {
  name: 'Suggestions',
  components: { Spinner, Alert, Warning, Message, VueRecaptcha },
  data() {
    const store = globalStore();
    const siteKey = import.meta.env.VITE_RECAPTCHA_CHECK;
    return {
      userName: undefined,
      userType: '',
      currentUser: undefined,
      captcha: false,
      types: [
        {
          name: 'SOMETHING-WRONG',
          description: this.$t("suggestions.types.1")
        },
        {
          name: 'SOMETHING-NEW',
          description: this.$t("suggestions.types.2")
        },
        {
          name: 'SOMETHING-BETTER',
          description: this.$t("suggestions.types.3")
        },
        {
          name: 'COMMENT',
          description: this.$t("suggestions.types.4")
        }
      ],
      type: 'COMMENT',
      comment: undefined,
      loading: false,
      attention: undefined,
      alertError: '',
      errors: [],
      store,
      siteKey,
      suggestion: undefined
    }
  },
  methods: {
    closeModal() {
      this.$emit('close-modal');
      this.suggestion = undefined;
    },
    async getUserType() {
      this.userType = await this.store.getCurrentUserType;
    },
    async getCurrentUser() {
      this.currentUser = await this.store.getCurrentUser;
    },
    validateCaptchaOk(response) {
      if(response) {
        this.captcha = true;
      }
    },
    validateCaptchaError() {
      this.errors.push('suggestions.validate.captcha');
    },
    validate() {
      this.errors = [];
      if(this.type === undefined || this.type.length === 0) {
        this.errors.push('suggestions.validate.type');
      }
      if(this.comment === undefined || this.comment.length < 10) {
        this.errors.push('suggestions.validate.comment');
      }
      if(!this.captcha) {
        this.errors.push('suggestions.validate.captcha');
      }
      if(this.errors.length === 0) {
        return true;
      }
      return false;
    },
    async sentSuggestion() {
      try {
        this.loading = true;
        this.alertError = '';
        if(this.validate()) {
          const body = { type: this.type, comment: this.comment, userId: this.currentUser.id || 'invitado', userType: this.userType };
          this.suggestion = await createSuggestion(body);
        }
        this.alertError = '';
        this.loading = false;
      } catch (error) {
        this.alertError = error.response;
        this.loading = false;
      }
    }
  },
  async beforeMount() {
    await this.getUserType();
    await this.getCurrentUser();
  },
  watch: {
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
        await this.getCurrentUser();
      }
    }
  },
}
</script>

<template>
  <div v-if="this.suggestion">
    <Message
      :title="$t('suggestions.message.title')"
      :content="$t('suggestions.message.content')"
      :icon="'bi bi-check-circle'">
    </Message>
  </div>
  <div id="suggestions" class="card mb-4" v-else>
    <p class="mb-2 details"><span class="fw-bold">{{ $t("suggestions.subtitle.1.1") }}</span></p>
    <p class="details-subtitle mt-2">{{ $t("suggestions.subtitle.1.2") }}</p>
    <div class="mb-2">
      <div class="row mb-2">
        <div id="type-selector" class="col-4 text-label">
          <span>{{ $t("suggestions.type") }}</span>
        </div>
        <div class="col-8">
          <select class="form-control btn-md btn-light text-dark px-1" v-model="this.type" id="types">
            <option v-for="typ in this.types" :key="typ.name" :value="typ.name">{{ typ.description }}</option>
          </select>
        </div>
      </div>
      <div class="row mb-2">
        <div id="comment" class="col-4 text-label">
          <span>{{ $t("suggestions.comment.label") }} </span>
        </div>
        <div class="col-8">
          <textarea
            class="form-control"
            id="comment"
            rows="3"
            maxlength="500"
            v-model="comment"
            :placeholder="$t('suggestions.comment.placeholder')">
          </textarea>
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
      <a class="btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4"
        @click="sentSuggestion()">
        {{ $t("suggestions.actions.1") }}
        <i class="bi bi-check2-all"></i>
      </a>
      <div class="row">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
        <div class="errors" id="feedback" v-if="(errors.length > 0)">
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
</template>

<style scoped>
.details {
  font-size: 1.2rem;
  line-height: 1rem;
}
.details-subtitle {
  font-size: .9rem;
  line-height: 1rem;
}
.card {
  background-color: var(--color-background);
  margin-top: 1rem;
  margin-bottom: 1rem;
  margin-left: .5rem;
  margin-right: .5rem;
  padding: 1rem;
  border-radius: 1rem;
  border: .5px solid var(--gris-default);
}
.text-label {
  font-size: .9rem;
  line-height: 1.2rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
</style>