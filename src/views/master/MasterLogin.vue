<script>
import { onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores/index';
import PoweredBy from '../../components/common/PoweredBy.vue';
import Message from '../../components/common/Message.vue';
import Login from '../../components/domain/Login.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';

export default {
  name: 'MasterLogin',
  components: { CommerceLogo, PoweredBy, Message, Login },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    onBeforeMount(async () => {
      await store.resetSession;
    })

    const goSite = () => {
      router.push('/');
    }

    const bussinesUrl = `/interno/master/menu`;

    return {
      bussinesUrl,
      goSite
    }
  }
}
</script>

<template>
  <div>
    <div  class="content text-center">
      <CommerceLogo @click="goSite()"></CommerceLogo>
      <div id="page-header" class="text-center mt-4">
        <div class="welcome">
          <span>{{ $t("masterLogin.welcome") }}</span>
        </div>
        <div class="login-message">
          <span>{{ $t("masterLogin.login") }}</span>
        </div>
      </div>
      <div>
        <Login
          :userType="'master'"
          :urlOkRedirect="bussinesUrl"
        ></Login>
      </div>
    </div>
    <PoweredBy />
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