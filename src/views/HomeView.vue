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
      store,
    };
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
    },
  },
};
</script>

<template>
  <div class="masthead">
    <div class="container text-center">
      <div>
        <img
          class="rounded img-fluid mx-auto logo"
          :alt="this.$t('logoAlt')"
          :src="this.$t('logo')"
          width="300"
          height="auto"
          fetchpriority="high"
        />
      </div>
      <div class="row my-4">
        <div class="col-6">
          <a
            class="btn btn-lg btn-size fw-bold btn-orange col-12 rounded-pill mt-2 px-4"
            @click="loginBusiness()"
            >{{ $t('enterCommerce') }} <i class="bi bi-person-badge-fill"></i
          ></a>
        </div>
        <div class="col-6">
          <a
            class="btn btn-lg btn-size fw-bold btn-orange col-12 rounded-pill mt-2 px-4"
            @click="loginCollaborator()"
            >{{ $t('enterCollaborator') }} <i class="bi bi-people-fill"></i
          ></a>
        </div>
      </div>
      <div class="row mt-4">
        <hr />
        <div class="subtitle centered mt-2">
          <a
            class="btn btn-lg btn-size fw-bold col-8 btn-secondary rounded-pill mt-2 px-4"
            :href="$t('serviceStatusUrl')"
            target="_blank"
            >{{ $t('serviceStatus') }} <i class="bi bi-rocket-takeoff-fill"></i>
          </a>
        </div>
        <div class="subtitle centered mt-1">
          <a
            class="btn btn-lg btn-size fw-bold col-8 btn-secondary rounded-pill px-4"
            :href="$t('publicSiteUrl')"
            target="_blank"
            >{{ $t('publicSite') }} <i class="bi bi-arrow-up-right-circle-fill"></i>
          </a>
        </div>
      </div>
      <div hidden class="subtitle mb-3 mt-4">
        <span>{{ $t('titleEnterMaster') }}</span
        ><br />
        <a @click="loginMaster()"
          ><span class="btn btn-lg btn-size col-8 fw-bold btn-dark rounded-pill mt-2 px-4"
            >{{ $t('enterMaster') }} <i class="bi bi-person-fill-gear"></i></span
        ></a>
      </div>
      <PoweredBy />
    </div>
  </div>
</template>

<style scoped>
.logo {
  width: 300px;
  max-width: 100%;
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
.btn-orange {
  --bs-btn-color: #fff;
  --bs-btn-bg: var(--orange-no-device);
  --bs-btn-border-color: var(--orange-no-device);
  --bs-btn-hover-color: #fff;
  --bs-btn-hover-bg: #424649;
  --bs-btn-hover-border-color: #373b3e;
  --bs-btn-focus-shadow-rgb: 66, 70, 73;
  --bs-btn-active-color: #fff;
  --bs-btn-active-bg: #4d5154;
  --bs-btn-active-border-color: #373b3e;
  --bs-btn-active-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.125);
  --bs-btn-disabled-color: #fff;
  --bs-btn-disabled-bg: var(--orange-no-device);
  --bs-btn-disabled-border-color: var(--orange-no-device);
}
@media (min-width: 1024px) {
  .logo {
    width: 300px;
    max-width: 100%;
    background-position: center;
  }
}
</style>
