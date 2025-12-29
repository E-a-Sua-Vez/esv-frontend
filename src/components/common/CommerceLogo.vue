<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { globalStore } from '../../stores/index';
import LogoSkeleton from '../../components/skeletons/LogoSkeleton.vue';
import { getBusinessLogo, getBusinessLogoUrl } from '../../application/services/business-logo';

export default {
  name: 'CommerceLogo',
  components: { LogoSkeleton },
  props: {
    src: { type: String, default: undefined },
    loading: { type: Boolean, default: false },
    businessId: { type: String, default: undefined },
    desktopSize: { type: Boolean, default: false },
  },
  setup(props) {
    const store = globalStore();
    const logoUrl = ref(null);
    const logoLoading = ref(false);
    const logoError = ref(false);
    let cachedLogoBlobUrl = null;

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

    // Watch for businessId or src changes
    watch(
      () => [props.businessId, props.src],
      ([newId, newSrc]) => {
        if (newId || (newSrc && newSrc.startsWith('/business-logos/'))) {
          loadBusinessLogo();
        } else {
          logoUrl.value = null;
          if (cachedLogoBlobUrl) {
            URL.revokeObjectURL(cachedLogoBlobUrl);
            cachedLogoBlobUrl = null;
          }
        }
      },
      { immediate: true },
    );

    onMounted(() => {
      if (props.businessId || (props.src && props.src.startsWith('/business-logos/'))) {
        loadBusinessLogo();
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
    };
  },
};
</script>
<template>
  <div id="commerce-logo">
    <LogoSkeleton v-if="(loading || logoLoading) && src === undefined && !logoUrl"></LogoSkeleton>
    <img
      v-else
      :class="['rounded', 'img-fluid', 'logo', { 'desktop-size': desktopSize, 'mx-auto': !desktopSize }]"
      :alt="this.$t('logoAlt')"
      :src="logoUrl || (src === undefined ? this.$t('logo') : src)"
      loading="lazy"
      width="250"
      height="230"
      @error="logoError = true"
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
</style>
