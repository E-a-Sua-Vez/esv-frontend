<script>
import { globalStore } from '../stores';
import PoweredBy from '../components/common/PoweredBy.vue';
import CommerceLogo from '../components/common/CommerceLogo.vue';

export default {
  name: 'Home',
  components: { CommerceLogo, PoweredBy },
  data() {
    const store = globalStore();
    return {
      store
    }
  },
  methods: {
    async loginCollaborator() {
      await this.store.setCurrentUserType('collaborator');
      setTimeout(() => {
        this.$router.push({ path: '/publico/colaborador/login' });
      }, 1000);
    },
    async loginBusiness() {
      await this.store.setCurrentUserType('business');
      setTimeout(() => {
        this.$router.push({ path: '/publico/negocio/login' });
      }, 1000);
    },
    async loginMaster() {
      await this.store.setCurrentUserType('master');
      setTimeout(() => {
        this.$router.push({ path: '/publico/master/login' });
      }, 1000);
    }
  }

}
</script>

<template>
  <div class="masthead">
    <div class="container text-center">
      <CommerceLogo @click="goSite()"></CommerceLogo>
      <div id="welcome" class="mb-2">
        <span class="welcome">{{ $t("welcome") }}</span>
      </div>
      <div class="mx-4">
        <img class="rounded img-fluid mx-auto logo" :src="$t('logoValues')" :alt="$t('logoValuesAlt')">
      </div>
      <div class="row mt-4 mb-1 subtitle">
        <span>{{ $t("titleEnterUser") }}</span>
      </div>
      <div class="row my-1">
        <div class="col-6">
          <a class="btn btn-lg btn-size fw-bold btn-dark col-12 rounded-pill mt-2 px-4" @click="loginBusiness()">{{ $t("enterCommerce") }} <i class="bi bi-person-badge-fill"></i></a>
        </div>
        <div class="col-6">
          <a class="btn btn-lg btn-size fw-bold btn-dark col-12 rounded-pill mt-2 px-4" @click="loginCollaborator()">{{ $t("enterCollaborator") }} <i class="bi bi-people-fill"></i></a>
        </div>
      </div>
      <div class="row mt-4">
        <hr>
        <div class="subtitle centered mt-2">
          <a
            class="btn btn-lg btn-size fw-bold  col-8 btn-secondary rounded-pill mt-2 px-4"
            :href="$t('serviceStatusUrl')"
            target="_blank">{{ $t("serviceStatus") }} <i class="bi bi-rocket-takeoff-fill"></i>
          </a>
        </div>
        <div class="subtitle centered mt-1">
          <a
            class="btn btn-lg btn-size fw-bold col-8 btn-secondary rounded-pill px-4"
            :href="$t('publicSiteUrl')"
            target="_blank">{{ $t("publicSite") }} <i class="bi bi-arrow-up-right-circle-fill"></i>
          </a>
        </div>
      </div>
      <div hidden class="subtitle mb-3 mt-4">
          <span>{{ $t("titleEnterMaster") }}</span><br>
          <a @click="loginMaster()"><span class="btn btn-lg btn-size col-8 fw-bold btn-dark rounded-pill mt-2 px-4">{{ $t("enterMaster") }} <i class="bi bi-person-fill-gear"></i></span></a>
        </div>
      <PoweredBy />
    </div>
  </div>
</template>

<style scoped>
.logo {
  display: flex;
  width: 250px;
  background-repeat: no-repeat;
  background-size: 100%;
}
.subtitle {
  line-height: 1.2rem;
}
.enter-master {
  text-decoration: underline;
  cursor: pointer;
}
@media (min-width: 1024px) {
  .logo {
    width: 250px;
    background-position: center;
  }
}
</style>
