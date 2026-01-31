<script>
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';
import CommerceLogoUpload from '../common/CommerceLogoUpload.vue';
import { uploadCommerceLogo, getCommerceLogoUrl } from '../../application/services/commerce-logo';
import { getBusinessLogo, getBusinessLogoUrl } from '../../application/services/business-logo';

export default {
  name: 'CommerceFormBasicFields',
  components: { Toggle, Popper, CommerceLogoUpload },
  props: {
    modelValue: { type: Object, required: true },
    categories: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
    businessId: { type: String, default: '' },
    businessLogo: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      showLogoUploadModal: false,
      uploadingLogo: false,
      logoPreviewUrl: null,
      businessLogoPreviewUrl: null,
      businessLogoLoading: false,
      logoLoadFailed: false,
    };
  },
  computed: {
    commerce: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      },
    },
    hasOwnLogo() {
      // Commerce has its own logo only if it starts with /commerce-logos/
      // If it has /business-logos/ it's using the inherited business logo
      const logo = this.commerce.logo;
      return logo && logo.startsWith('/commerce-logos/');
    },
    effectiveLogoUrl() {
      // Commerce's own logo takes priority
      if (this.hasOwnLogo) {
        return this.logoPreviewUrl || null; // Don't return raw path
      }
      // Use business logo as fallback
      if (this.businessLogoLoading) {
        return null;
      }
      return this.businessLogoPreviewUrl;
    },
    isUsingBusinessLogo() {
      return !this.hasOwnLogo && !!this.businessLogoPreviewUrl;
    },
  },
  watch: {
    'commerce.logo': {
      immediate: true,
      handler(newLogo) {
        if (newLogo) {
          this.loadCommerceLogoPreview();
        } else {
          this.logoPreviewUrl = null;
        }
      },
    },
    businessLogo: {
      immediate: true,
      handler(newLogo) {
        if (newLogo) {
          this.loadBusinessLogoPreview();
        }
      },
    },
    businessId: {
      immediate: true,
      handler(newId) {
        if (newId && !this.businessLogo) {
          this.loadBusinessLogoPreview();
        }
      },
    },
  },
  methods: {
    slugifyName(text) {
      if (!text) return '';
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');
    },
    onNameInput(value) {
      const keyName = this.slugifyName(value);
      this.commerce = {
        ...this.commerce,
        name: value,
        keyName,
      };
    },
    openLogoUpload() {
      this.showLogoUploadModal = true;
    },
    closeLogoUpload() {
      this.showLogoUploadModal = false;
    },
    async loadCommerceLogoPreview() {
      const logo = this.commerce.logo;
      if (!logo) {
        this.logoPreviewUrl = null;
        return;
      }

      // Only load if it's a commerce-logos path
      if (logo.startsWith('/commerce-logos/')) {
        try {
          // Path format: /commerce-logos/{commerceId}/{logoId}
          const parts = logo.split('/');
          if (parts.length === 4) {
            const commerceId = parts[2];
            const logoId = parts[3];

            const url = await getCommerceLogoUrl(commerceId, logoId);
            if (url) {
              this.logoPreviewUrl = url;
              this.logoLoadFailed = false;

              return;
            }
          }
        } catch (error) {
          console.error('Error loading commerce logo preview:', error);
          this.logoLoadFailed = true;
        }
      } else if (logo.startsWith('http://') || logo.startsWith('https://')) {
        // Direct URL
        this.logoPreviewUrl = logo;
        this.logoLoadFailed = false;
      }
    },
    async loadBusinessLogoPreview() {
      const businessId = this.businessId || this.commerce?.businessId;
      const logo = this.businessLogo;

      if (!logo && !businessId) {
        this.businessLogoPreviewUrl = null;
        this.businessLogoLoading = false;
        return;
      }

      this.businessLogoLoading = true;

      try {
        // If we have a direct logo URL (http/https), use it directly
        if (logo && (logo.startsWith('http://') || logo.startsWith('https://'))) {
          this.businessLogoPreviewUrl = logo;
          return;
        }

        // If it's a business-logos path, extract businessId and logoId from path
        // Path format: /business-logos/{businessId}/{logoId}
        if (logo && logo.startsWith('/business-logos/')) {
          const parts = logo.split('/');
          if (parts.length === 4) {
            const pathBusinessId = parts[2];
            const logoId = parts[3];

            const url = await getBusinessLogoUrl(pathBusinessId, logoId);

            if (url) {
              this.businessLogoPreviewUrl = url;
              return;
            }
          }
        }

        // Fallback: Try to get logo metadata from backend using businessId
        if (businessId) {
          const logoData = await getBusinessLogo(businessId);

          if (logoData && logoData.id) {
            const url = await getBusinessLogoUrl(businessId, logoData.id);

            if (url) {
              this.businessLogoPreviewUrl = url;
            }
          }
        }
      } catch (error) {
        console.error('Error loading business logo preview:', error);
      } finally {
        this.businessLogoLoading = false;
      }
    },
    handleLogoError() {
      this.logoLoadFailed = true;
    },
    async onLogoUploaded(logoData) {
      try {
        this.uploadingLogo = true;
        const commerceId = this.commerce.id;
        const businessId = this.businessId || this.commerce.businessId;

        if (!commerceId) {
          throw new Error('Commerce ID not found');
        }

        // Upload logo to S3
        const uploadedLogo = await uploadCommerceLogo(commerceId, businessId, logoData);

        // Update commerce logo field with reference path
        // Format: /commerce-logos/{commerceId}/{logoId}
        this.commerce.logo = `/commerce-logos/${commerceId}/${uploadedLogo.id}`;

        // Reload preview
        await this.loadCommerceLogoPreview();

        this.showLogoUploadModal = false;
      } catch (error) {
        console.error('Error uploading commerce logo:', error);
        alert(this.$t('commerceAdmin.logoUpload.errors.saveFailed'));
      } finally {
        this.uploadingLogo = false;
      }
    },
  },
};
</script>

<template>
  <div class="form-fields-container">
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCommercesAdmin.name') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessAdmin.nameHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}commerce-name-form`"
        :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
        min="1"
        max="50"
        type="text"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.nameError }"
        :value="commerce.name"
        @input="onNameInput($event.target.value)"
        placeholder="brilliant-shop-1"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCommercesAdmin.keyName') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessCommercesAdmin.keyNameHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}commerce-keyName-form`"
        :disabled="true"
        min="1"
        max="50"
        type="text"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.keyNameError }"
        :value="commerce.keyName"
        placeholder="brilliant-shop-1"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCommercesAdmin.email') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessAdmin.emailHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}commerce-email-form`"
        :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
        min="10"
        type="email"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.emailError }"
        v-model="commerce.email"
        placeholder="commerce@email.com"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCommercesAdmin.tag') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessCommercesAdmin.tagHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}commerce-tag-form`"
        :disabled="!toggles['commerces.admin.edit']"
        min="1"
        max="50"
        type="text"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.tagError }"
        v-model="commerce.tag"
        placeholder="brilliant-1"
      />
    </div>
    <div class="form-group-modern" v-if="!isAdd">
      <label class="form-label-modern">
        {{ $t('businessCommercesAdmin.logo') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessAdmin.logoHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <div class="logo-section">
        <div class="d-flex flex-column gap-2">
          <!-- Logo Preview - Always show with fallback to business logo -->
          <div v-if="effectiveLogoUrl" class="logo-preview-container">
            <div class="logo-preview-small">
              <img
                :src="effectiveLogoUrl"
                :alt="$t('businessCommercesAdmin.logo')"
                class="logo-preview-img"
                @error="handleLogoError"
              />
            </div>
            <!-- Badge indicating if using business logo as default -->
            <span
              v-if="isUsingBusinessLogo"
              class="badge bg-secondary small mt-1"
              :title="$t('commerceAdmin.logoUpload.usingBusinessLogo')"
            >
              <i class="bi bi-building me-1"></i>
              {{ $t('commerceAdmin.logoUpload.businessDefault') }}
            </span>
          </div>
          <!-- Upload Button -->
          <div class="d-flex align-items-center gap-2">
            <button
              v-if="!isAdd && commerce.id"
              type="button"
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
              @click="openLogoUpload"
              :disabled="!toggles['commerces.admin.edit']"
            >
              <i class="bi bi-image me-1"></i>
              {{
                hasOwnLogo
                  ? $t('commerceAdmin.logoUpload.replaceLogo')
                  : $t('commerceAdmin.logoUpload.selectLogo')
              }}
            </button>
            <span v-if="hasOwnLogo" class="small text-muted">
              <i class="bi bi-check-circle text-success"></i>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Commerce Logo Upload Modal - Using Teleport for proper modal rendering -->
    <Teleport to="body">
      <CommerceLogoUpload
        :show="showLogoUploadModal && !!commerce.id"
        :commerce-id="commerce.id"
        :business-id="businessId || commerce.businessId"
        @logo-uploaded="onLogoUploaded"
        @close="closeLogoUpload"
      />
    </Teleport>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCommercesAdmin.category') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessAdmin.categoryHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <select
        :id="`${prefix}commerce-category-form`"
        :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
        class="form-control-modern form-select-modern"
        :class="{ 'is-invalid': errors.categoryError }"
        v-model="commerce.category"
      >
        <option v-for="cat in categories" :key="cat" :value="cat">
          {{ $t(`categories.${cat}`) }}
        </option>
      </select>
    </div>
    <div class="form-group-modern form-group-toggle" v-if="!isAdd">
      <label class="form-label-modern">
        {{ $t('businessCommercesAdmin.active') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessAdmin.activeHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <Toggle
        v-model="commerce.active"
        :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
      />
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

.form-group-toggle {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
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

.form-control-modern,
.form-select-modern {
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

.form-control-modern:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:hover:not(:disabled),
.form-select-modern:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:disabled,
.form-select-modern:disabled {
  background-color: rgba(245, 246, 247, 0.8);
  color: rgba(0, 0, 0, 0.5);
  cursor: not-allowed;
  opacity: 0.7;
}

.form-control-modern::placeholder {
  color: rgba(0, 0, 0, 0.4);
  font-weight: 400;
}

.form-control-modern.is-invalid,
.form-select-modern.is-invalid {
  border-color: rgba(165, 42, 42, 0.5);
  box-shadow: 0 0 0 2px rgba(165, 42, 42, 0.1);
}

.form-select-modern {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
}

/* Logo Preview Styles (matching BusinessAdmin) */
.text-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
}

.logo-section {
  flex: 1;
}

.logo-preview-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.logo-preview-small {
  width: 80px;
  height: 80px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 0.5rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.logo-preview-img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 0.25rem;
}
</style>
