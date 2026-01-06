<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { globalStore } from '../../stores/index';
import LogoSkeleton from '../../components/skeletons/LogoSkeleton.vue';
import { getBusinessLogo, getBusinessLogoUrl } from '../../application/services/business-logo';
import { getCommerceLogo, getCommerceLogoUrl } from '../../application/services/commerce-logo';
import { useRoute } from 'vue-router';

export default {
  name: 'CommerceLogo',
  components: { LogoSkeleton },
  props: {
    src: { type: String, default: undefined },
    loading: { type: Boolean, default: false },
    businessId: { type: String, default: undefined },
    commerceId: { type: String, default: undefined },
    desktopSize: { type: Boolean, default: false },
    largeSize: { type: Boolean, default: false },
    fallbackSrc: { type: String, default: undefined },
  },
  setup(props) {
    const store = globalStore();
    const logoUrl = ref(null);
    const logoLoading = ref(false);
    const logoError = ref(false);
    const businessLogoUrl = ref(null);
    const businessLogoLoaded = ref(false);
    const businessLogoError = ref(false);
    let cachedLogoBlobUrl = null;

    // Load commerce-specific logo
    const loadCommerceLogo = async () => {
      if (!props.commerceId) {
        return false;
      }

      try {
        const logoMetadata = await getCommerceLogo(props.commerceId);
        if (logoMetadata && logoMetadata.id) {
          const url = await getCommerceLogoUrl(props.commerceId, logoMetadata.id);
          if (url) {
            logoUrl.value = url;
            cachedLogoBlobUrl = url;
            return true;
          }
        }
      } catch (error) {
        console.debug('No commerce-specific logo found, will use fallback:', error);
      }
      return false;
    };

    // Load commerce logo from path (e.g., /commerce-logos/commerceId/logoId)
    const loadCommerceLogoFromPath = async () => {
      if (props.src && props.src.startsWith('/commerce-logos/')) {
        const parts = props.src.split('/');
        if (parts.length === 4) {
          const commerceIdFromPath = parts[2];
          const logoId = parts[3];
          try {
            logoLoading.value = true;
            logoError.value = false;
            const url = await getCommerceLogoUrl(commerceIdFromPath, logoId);
            if (url) {
              logoUrl.value = url;
              cachedLogoBlobUrl = url;
              return true;
            }
          } catch (error) {
            console.error('Error loading commerce logo from path:', error);
          } finally {
            logoLoading.value = false;
          }
        }
      }
      return false;
    };

    const loadBusinessLogo = async () => {
      // If src is a business-logo path, extract businessId and logoId directly (same as SearchBar)
      if (props.src && props.src.startsWith('/business-logos/')) {
        const parts = props.src.split('/');
        if (parts.length === 4) {
          const businessIdFromPath = parts[2];
          const logoId = parts[3];
          try {
            logoLoading.value = true;
            logoError.value = false;
            // Directly get logo URL using the logoId from the path (same as SearchBar)
            const url = await getBusinessLogoUrl(businessIdFromPath, logoId);
            if (url) {
              logoUrl.value = url;
              cachedLogoBlobUrl = url;
            } else {
              logoError.value = true;
            }
          } catch (error) {
            console.error('Error loading business logo from path:', error);
            logoError.value = true;
          } finally {
            logoLoading.value = false;
          }
          return;
        }
      }

      // Fallback: use businessId prop if provided
      if (!props.businessId) {
        return;
      }

      try {
        logoLoading.value = true;
        logoError.value = false;

        // Check if business has a custom logo
        const logoMetadata = await getBusinessLogo(props.businessId);

        if (logoMetadata && logoMetadata.id) {
          // Get logo URL from S3
          const url = await getBusinessLogoUrl(props.businessId, logoMetadata.id);
          if (url) {
            logoUrl.value = url;
            cachedLogoBlobUrl = url;
          } else {
            logoError.value = true;
          }
        } else {
          // No custom logo, use default
          logoError.value = true;
        }
      } catch (error) {
        console.error('Error loading business logo:', error);
        logoError.value = true;
      } finally {
        logoLoading.value = false;
      }
    };

    // Main logo loading function with commerce-first strategy
    const loadLogo = async () => {
      logoLoading.value = true;
      logoError.value = false;

      try {
        // Priority 1: Commerce logo path
        if (props.src && props.src.startsWith('/commerce-logos/')) {
          const loaded = await loadCommerceLogoFromPath();
          if (loaded) return;
        }

        // Priority 2: Commerce-specific logo by commerceId
        if (props.commerceId) {
          const loaded = await loadCommerceLogo();
          if (loaded) return;
        }

        // Priority 3: Business logo path
        if (props.src && props.src.startsWith('/business-logos/')) {
          await loadBusinessLogo();
          return;
        }

        // Priority 4: Business logo by businessId
        if (props.businessId) {
          await loadBusinessLogo();
          return;
        }

        // No logo found
        logoError.value = true;
      } finally {
        logoLoading.value = false;
      }
    };

    // Load business logo as fallback (preload it)
    const loadBusinessLogoAsFallback = async () => {
      if (!props.businessId || businessLogoLoaded.value) {
        return;
      }

      try {
        const logoMetadata = await getBusinessLogo(props.businessId);
        if (logoMetadata && logoMetadata.id) {
          const url = await getBusinessLogoUrl(props.businessId, logoMetadata.id);
          if (url) {
            businessLogoUrl.value = url;
            businessLogoLoaded.value = true;
          } else {
            businessLogoError.value = true;
          }
        } else {
          businessLogoError.value = true;
        }
      } catch (error) {
        console.error('Error preloading business logo fallback:', error);
        businessLogoError.value = true;
      }
    };

    // Handle image load error - try business logo fallback
    const handleImageError = async () => {
      logoError.value = true;
      // If we have businessId and haven't loaded business logo yet, load it now
      if (props.businessId && !businessLogoLoaded.value && !businessLogoError.value) {
        await loadBusinessLogoAsFallback();
      }
    };

    // Watch for businessId, commerceId or src changes
    watch(
      () => [props.businessId, props.commerceId, props.src],
      ([newBusinessId, newCommerceId, newSrc]) => {
        if (newCommerceId || newBusinessId || (newSrc && (newSrc.startsWith('/business-logos/') || newSrc.startsWith('/commerce-logos/')))) {
          loadLogo();
        } else {
          logoUrl.value = null;
          if (cachedLogoBlobUrl) {
            URL.revokeObjectURL(cachedLogoBlobUrl);
            cachedLogoBlobUrl = null;
          }
        }
        // Preload business logo as fallback if businessId is available and we're using commerce logo
        if (newBusinessId && (newCommerceId || (newSrc && newSrc.startsWith('/commerce-logos/')))) {
          loadBusinessLogoAsFallback();
        }
      },
      { immediate: true },
    );

    onMounted(() => {
      if (props.commerceId || props.businessId || (props.src && (props.src.startsWith('/business-logos/') || props.src.startsWith('/commerce-logos/')))) {
        loadLogo();
      }
      // Preload business logo as fallback
      if (props.businessId && (props.commerceId || (props.src && props.src.startsWith('/commerce-logos/')))) {
        loadBusinessLogoAsFallback();
      }
    });

    onUnmounted(() => {
      if (cachedLogoBlobUrl) {
        URL.revokeObjectURL(cachedLogoBlobUrl);
        cachedLogoBlobUrl = null;
      }
    });

    return {
      store,
      logoUrl,
      logoLoading,
      logoError,
      businessLogoUrl,
      handleImageError,
    };
  },
};
</script>
<template>
  <div id="commerce-logo">
    <LogoSkeleton v-if="(loading || logoLoading) && src === undefined && !logoUrl"></LogoSkeleton>
    <img
      v-else
      :class="[
        'rounded',
        'img-fluid',
        'logo',
        { 'desktop-size': desktopSize, 'large-size': largeSize, 'mx-auto': !desktopSize },
      ]"
      :alt="this.$t('logoAlt')"
      :src="logoError ? (businessLogoUrl || fallbackSrc || this.$t('logo')) : (logoUrl || (src === undefined ? this.$t('logo') : src))"
      loading="lazy"
      width="250"
      height="230"
      @error="handleImageError"
    />
  </div>
</template>
<style scoped>
.logo {
  display: flex;
  max-width: 250px;
  max-height: 230px;
  background-repeat: no-repeat;
  background-size: 100%;
  margin-bottom: 0.3rem;
  cursor: pointer;
}
@media (min-width: 992px) {
  .logo {
    max-width: 120px;
    max-height: 100px;
    background-position: center;
  }
}

/* Desktop layout overrides for admin pages */
.logo.desktop-size {
  max-width: 120px !important;
  max-height: 100px !important;
  width: auto !important;
  height: auto !important;
  margin-bottom: 0 !important;
}

.desktop-commerce-logo .logo.desktop-size {
  max-width: 120px !important;
  max-height: 100px !important;
  width: auto !important;
  height: auto !important;
  margin-bottom: 0 !important;
}

/* Large size for public pages (attention/booking requests) */
.logo.large-size {
  max-width: 300px !important;
  max-height: 280px !important;
  width: auto !important;
  height: auto !important;
}

@media (min-width: 992px) {
  .logo.large-size {
    max-width: 250px !important;
    max-height: 230px !important;
  }
}
</style>
