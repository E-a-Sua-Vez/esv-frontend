<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { globalStore } from '../../stores/index';
import LogoSkeleton from '../../components/skeletons/LogoSkeleton.vue';
import { getBusinessLogo, getBusinessLogoUrl } from '../../application/services/business-logo';
import { getCommerceLogo, getCommerceLogoUrl } from '../../application/services/commerce-logo';
import { useRoute } from 'vue-router';

export default {
  name: 'CommerceLogo',
  inheritAttrs: false,
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

    // No cache needed - browser handles caching automatically
    // and authenticated endpoints don't work with fetch() without credentials

    // Load commerce-specific logo
    const loadCommerceLogo = async () => {
      if (!props.commerceId) {
        return false;
      }

      try {
        // First get the path from backend
        const path = await getCommerceLogo(props.commerceId);
        if (path) {
          let logoId;
          // Handle both relative paths and full URLs
          if (path.startsWith('/')) {
            // Relative path: /commerce-logos/commerceId/logoId
            const parts = path.split('/');
            if (parts.length === 4) {
              logoId = parts[3];
            }
          } else if (path.startsWith('http')) {
            // Full URL: http://localhost:3000/commerce-logos/commerceId/logoId
            const url = new URL(path);
            const parts = url.pathname.split('/');
            if (parts.length === 4) {
              logoId = parts[3];
            }
          }

          if (logoId) {
            // Use getCommerceLogoUrl to get blob URL with authentication
            const blobUrl = await getCommerceLogoUrl(props.commerceId, logoId);
            if (blobUrl) {
              logoUrl.value = blobUrl;
              return true;
            }
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

        // First get the path from backend
        const path = await getBusinessLogo(props.businessId);
        if (path) {
          let logoId;
          // Handle both relative paths and full URLs
          if (path.startsWith('/')) {
            // Relative path: /business-logos/businessId/logoId
            const parts = path.split('/');
            if (parts.length === 4) {
              logoId = parts[3];
            }
          } else if (path.startsWith('http')) {
            // Full URL: http://localhost:3000/business-logos/businessId/logoId
            const url = new URL(path);
            const parts = url.pathname.split('/');
            if (parts.length === 4) {
              logoId = parts[3];
            }
          }

          if (logoId) {
            // Use getBusinessLogoUrl to get blob URL with authentication
            const blobUrl = await getBusinessLogoUrl(props.businessId, logoId);
            if (blobUrl) {
              logoUrl.value = blobUrl;
            } else {
              logoError.value = true;
            }
          } else {
            logoError.value = true;
          }
        } else {
          logoError.value = true;
        }
      } catch (error) {
        console.error('Error loading business logo:', error);
        logoError.value = true;
      } finally {
        logoLoading.value = false;
      }
    };

    // Main logo loading function
    const loadLogo = async () => {
      logoLoading.value = true;
      logoError.value = false;

      try {
        // If commerceId is provided, try to load commerce logo first
        if (props.commerceId) {
          const loaded = await loadCommerceLogo();
          if (loaded) {
            return;
          }
        }

        // Fallback to business logo if businessId is provided
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

    // Watch for businessId or commerceId changes
    watch(
      () => [props.commerceId, props.businessId],
      ([newCommerceId, newBusinessId] = [], [oldCommerceId, oldBusinessId] = []) => {
        if (newCommerceId || newBusinessId) {
          loadLogo();
        } else {
          logoUrl.value = null;
        }
      },
      { immediate: true },
    );

    onMounted(() => {
      if (props.commerceId || props.businessId) {
        loadLogo();
      }
    });

    onUnmounted(() => {
      // No cleanup needed for data URLs
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
        $attrs.class
      ]"
      :alt="this.$t('logoAlt')"
      :src="logoUrl || this.$t('logo')"
      loading="lazy"
      width="250"
      height="230"
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
