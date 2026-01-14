<script>
import { onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores/index';
import Message from '../../components/common/Message.vue';
import Login from '../../components/domain/Login.vue';

export default {
  name: 'CollaboratorLogin',
  components: { Login, Message },
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
      <img :src="$t('logo')" @click="goSite()" class="logo large-logo" />
      <div id="page-header" class="text-center mt-4">
        <div class="welcome">
          <span>{{ $t('collaboratorLogin.welcome') }}</span>
        </div>
        <div class="login-message">
          <span>{{ $t('collaboratorLogin.login') }}</span>
        </div>
        <div class="mt-2">
          <a class="actions-link" @click="goSite">
            {{ $t('collaboratorLogin.notCollaborator') }}
            <i class="bi bi-arrow-right ms-1"></i>
          </a>
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
.large-logo {
  width: 200px;
  height: auto;
  cursor: pointer;
}

.actions-link {
  color: var(--azul-turno);
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
}

.actions-link:hover {
  color: var(--verde-tu);
  transform: translateX(4px);
}

.actions-link i {
  transition: transform 0.3s ease;
}

.actions-link:hover i {
  transform: translateX(4px);
}
</style>
