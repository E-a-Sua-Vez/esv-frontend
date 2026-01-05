<script>
import { onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores/index';
import Message from '../../components/common/Message.vue';
import Login from '../../components/domain/Login.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';

export default {
  name: 'CollaboratorLogin',
  components: { Login, CommerceLogo, Message },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    onBeforeMount(async () => {
      await store.resetSession();
    });

    const goSite = () => {
      router.push('/');
    };

    const commerceQueuesUrl = '/interno/colaborador/menu';

    return {
      commerceQueuesUrl,
      goSite,
    };
  },
};
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="$t('logo')" @click="goSite()" :large-size="true"></CommerceLogo>
      <div id="page-header" class="text-center mt-4">
        <div class="welcome">
          <span>{{ $t('collaboratorLogin.welcome') }}</span>
        </div>
        <div class="login-message">
          <span>{{ $t('collaboratorLogin.login') }}</span>
        </div>
      </div>
      <div>
        <Login :user-type="'collaborator'" :url-ok-redirect="commerceQueuesUrl"></Login>
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
