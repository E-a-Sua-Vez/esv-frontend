<script>
import Popper from 'vue3-popper';

export default {
  name: 'CommerceFormContact',
  components: { Popper },
  props: {
    modelValue: { type: Object, required: true },
    errors: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    toggles: { type: Object, default: () => ({}) },
    isAdd: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  computed: {
    contactInfo: {
      get() {
        return this.modelValue.contactInfo || {};
      },
      set(value) {
        this.$emit('update:modelValue', {
          ...this.modelValue,
          contactInfo: value,
        });
      },
    },
  },
};
</script>

<template>
  <div>
    <button
      v-if="isAdd"
      class="section-toggle-button"
      type="button"
      data-bs-toggle="collapse"
      :aria-expanded="!isAdd"
      :aria-controls="`${prefix}contact`"
      :data-bs-target="`#${prefix}contact`"
    >
      <span class="section-toggle-text">{{ $t('businessCommercesAdmin.contact') }}</span>
      <i class="bi bi-chevron-down section-toggle-icon"></i>
    </button>
    <div :id="`${prefix}contact`" :class="isAdd ? ['collapse', { show: !isAdd }] : ''">
      <div class="form-fields-container">
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.email') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('businessAdmin.contactEmailHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}commerce-contact-email-form`"
            min="1"
            max="30"
            type="email"
            class="form-control-modern"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            v-model="contactInfo.email"
            placeholder="Ex.: contact@commerce.com"
          />
        </div>
        <div class="form-group-modern" v-if="isAdd">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.url') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('businessAdmin.contactUrlHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}commerce-contact-url-form`"
            min="1"
            max="30"
            type="text"
            class="form-control-modern"
            :class="{ 'is-invalid': errors.urlError }"
            v-model="contactInfo.url"
            placeholder="Ex.: https://www.commerce.com/"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.phone') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('businessAdmin.contactPhoneHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}commerce-phone-form`"
            min="10"
            type="tel"
            class="form-control-modern"
            :class="{ 'is-invalid': errors.phoneError }"
            v-model="contactInfo.phone"
            placeholder="Cod. Pais + Numero"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.phone2') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('businessAdmin.phone2Help') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}commerce-contact-phone2-form`"
            min="9"
            max="12"
            type="tel"
            class="form-control-modern"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            v-model="contactInfo.phone2"
            placeholder="Ex.: 56233445533"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.whatsapp') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('businessAdmin.whatsappHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}commerce-contact-whatsapp-form`"
            min="9"
            max="12"
            type="tel"
            class="form-control-modern"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            v-model="contactInfo.whatsapp"
            placeholder="Ex.: 56233445533"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.twitter') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('businessAdmin.twitterHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}commerce-contact-twitter-form`"
            min="5"
            max="20"
            type="text"
            class="form-control-modern"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            v-model="contactInfo.twitter"
            placeholder="Ex.: tw_commerce"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.instagram') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('businessAdmin.instagramHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}commerce-contact-instagram-form`"
            min="5"
            max="20"
            type="text"
            class="form-control-modern"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            v-model="contactInfo.instagram"
            placeholder="Ex.: ig_commerce"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.facebook') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('businessAdmin.facebookHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}commerce-contact-facebook-form`"
            min="5"
            max="20"
            type="text"
            class="form-control-modern"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            v-model="contactInfo.facebook"
            placeholder="Ex.: fb_commerce"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modern Form Styles - Compact */
.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
}

.form-group-modern {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.form-label-modern {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  margin-bottom: 0;
  min-width: 120px;
  flex-shrink: 0;
}

.form-control-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  color: #000000;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.form-control-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:disabled {
  background-color: rgba(245, 246, 247, 0.8);
  color: rgba(0, 0, 0, 0.5);
  cursor: not-allowed;
  opacity: 0.7;
}

.form-control-modern::placeholder {
  color: rgba(0, 0, 0, 0.4);
  font-weight: 400;
}

.form-control-modern.is-invalid {
  border-color: rgba(165, 42, 42, 0.5);
  box-shadow: 0 0 0 2px rgba(165, 42, 42, 0.1);
}

/* Modern Section Toggle Button - Compact with Black Background */
.section-toggle-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.625rem;
  margin-bottom: 0.375rem;
  background: rgba(0, 0, 0, 0.85);
  border: none;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.section-toggle-button:hover {
  background: rgba(0, 0, 0, 0.95);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.section-toggle-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
}

.section-toggle-button[aria-expanded='true'] {
  background: rgba(0, 0, 0, 0.85);
}

.section-toggle-button[aria-expanded='true']:hover {
  background: rgba(0, 0, 0, 0.95);
}

.section-toggle-text {
  flex: 1;
  text-align: left;
}

.section-toggle-icon {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.section-toggle-button[aria-expanded='true'] .section-toggle-icon {
  transform: rotate(180deg);
}
</style>
