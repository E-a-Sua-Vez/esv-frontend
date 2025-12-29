<script>
import { onBeforeMount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores/index';
import Message from '../../components/common/Message.vue';
import Login from '../../components/domain/Login.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';

export default {
  name: 'BusinessLogin',
  components: { Login, CommerceLogo, Message },
  setup() {
    // Get router and store - they should be available in setup
    const router = useRouter();
    let store = null;

    // Try to get store - will retry in onBeforeMount if needed
    try {
      store = globalStore();
    } catch (error) {
      // Store will be retried in onBeforeMount
      // This can happen if component mounts before Pinia is fully initialized
    }

    onBeforeMount(async () => {
      // Wait for next tick to ensure Pinia is fully initialized
      await nextTick();

      try {
        // Retry getting store if it wasn't available before
        if (!store) {
          store = globalStore();
        }

        if (store) {
          await store.resetSession();
        }
      } catch (error) {
        // Silently fail - this is not critical for component functionality
        // The component can still work without resetting the session
      }
    });

    const goSite = () => {
      router.push('/').catch(err => {
        // Ignore navigation errors (e.g., navigating to same route)
        if (err.name !== 'NavigationDuplicated') {
          // Only log if it's a real error
          console.debug('[BusinessLogin] Navigation error:', err);
        }
      });
    };

    const bussinesUrl = '/interno/negocio/menu';

    return {
      bussinesUrl,
      goSite,
    };
  },
};
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="$t('logo')" @click="goSite()"></CommerceLogo>
      <div id="page-header" class="text-center mt-4">
        <div class="welcome">
          <span>{{ $t('businessLogin.welcome') }}</span>
        </div>
        <div class="login-message">
          <span>{{ $t('businessLogin.login') }}</span>
        </div>
      </div>
      <div>
        <Login :user-type="'business'" :url-ok-redirect="bussinesUrl"></Login>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scan-qr {
  font-size: 1rem;
  font-weight: 700;
}
.get-attention {
  padding-bottom: 1rem;
  font-size: 1rem;
}
</style>
