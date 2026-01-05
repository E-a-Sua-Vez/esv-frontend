<script>
import { globalStore } from '../stores';
import CommerceLogo from '../components/common/CommerceLogo.vue';

export default {
  name: 'Home',
  components: { CommerceLogo },
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
  <div class="home-view">
    <div class="container">
      <div class="home-hero">
        <div class="logo-container">
          <img
            class="home-logo"
            :alt="$t('logoAlt')"
            :src="$t('logo')"
            width="200"
            height="auto"
            fetchpriority="high"
          />
        </div>
        <h1 class="home-title">{{ $t('welcome') }}</h1>
        <p class="home-subtitle">{{ $t('titleEnterUser') }}</p>
      </div>

      <div class="home-actions">
        <div class="action-cards">
          <div class="action-card modern-card" @click="loginBusiness()">
            <div class="action-card-icon">
              <i class="bi bi-person-badge-fill"></i>
            </div>
            <h3 class="action-card-title">{{ $t('enterCommerce') }}</h3>
            <button class="action-card-btn">
              {{ $t('continue') }}
              <i class="bi bi-arrow-right"></i>
            </button>
          </div>

          <div class="action-card modern-card" @click="loginCollaborator()">
            <div class="action-card-icon">
              <i class="bi bi-people-fill"></i>
            </div>
            <h3 class="action-card-title">{{ $t('enterCollaborator') }}</h3>
            <button class="action-card-btn">
              {{ $t('continue') }}
              <i class="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="home-links">
        <div class="link-cards">
          <a
            class="link-card modern-card"
            :href="$t('serviceStatusUrl')"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="link-card-icon">
              <i class="bi bi-rocket-takeoff-fill"></i>
            </div>
            <span class="link-card-text">{{ $t('serviceStatus') }}</span>
            <i class="bi bi-arrow-up-right-circle-fill link-card-arrow"></i>
          </a>

          <a
            class="link-card modern-card"
            :href="$t('publicSiteUrl')"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="link-card-icon">
              <i class="bi bi-globe"></i>
            </div>
            <span class="link-card-text">{{ $t('publicSite') }}</span>
            <i class="bi bi-arrow-up-right-circle-fill link-card-arrow"></i>
          </a>
        </div>
      </div>

      <div v-if="false" class="home-master-section">
        <p class="master-label">{{ $t('titleEnterMaster') }}</p>
        <button class="master-btn modern-card" @click="loginMaster()">
          <i class="bi bi-person-fill-gear"></i>
          <span>{{ $t('enterMaster') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  min-height: calc(100vh - 200px);
  padding: 2rem 1rem;
  background: linear-gradient(135deg, rgba(248, 249, 250, 0.5) 0%, rgba(255, 255, 255, 0.8) 100%);
}

.home-hero {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-container {
  margin-bottom: 1.25rem;
  animation: fadeInDown 0.6s ease-out;
}

.home-logo {
  width: 200px;
  max-width: 100%;
  height: auto;
}

.home-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.75rem;
  animation: fadeInUp 0.6s ease-out 0.2s both;
}

.home-subtitle {
  font-size: 1.1rem;
  color: rgba(0, 0, 0, 0.7);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
  animation: fadeInUp 0.6s ease-out 0.4s both;
}

.home-actions {
  margin-bottom: 2rem;
}

.action-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
}

.action-card {
  text-align: center;
  padding: 2rem 1.5rem;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.6s ease-out 0.6s both;
}

.action-card:nth-child(2) {
  animation-delay: 0.8s;
}

.action-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.action-card:hover::before {
  left: 100%;
}

.action-card-icon {
  width: 70px;
  height: 70px;
  margin: 0 auto 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  border-radius: 50%;
  color: white;
  font-size: 1.75rem;
  box-shadow: 0 4px 15px rgba(0, 74, 173, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.action-card:hover .action-card-icon {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 6px 25px rgba(0, 74, 173, 0.4);
}

.action-card-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.action-card-description {
  font-size: 0.9rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.action-card-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border: none;
  border-radius: 2rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 10px rgba(0, 74, 173, 0.2);
}

.action-card-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 74, 173, 0.4);
}

.action-card-btn i {
  transition: transform 0.3s ease;
}

.action-card:hover .action-card-btn i {
  transform: translateX(4px);
}

.home-links {
  margin-bottom: 1.5rem;
}

.link-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.25rem;
  max-width: 700px;
  margin: 0 auto;
}

.link-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1.25rem;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  position: relative;
}

.link-card:hover {
  transform: translateY(-3px);
  color: var(--azul-turno);
}

.link-card-icon {
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 150, 136, 0.1) 100%);
  border-radius: 12px;
  color: var(--azul-turno);
  font-size: 1.35rem;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.link-card:hover .link-card-icon {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  transform: scale(1.1);
}

.link-card-text {
  flex: 1;
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text);
  transition: color 0.3s ease;
}

.link-card-arrow {
  color: rgba(0, 0, 0, 0.4);
  font-size: 1.2rem;
  transition: all 0.3s ease;
}

.link-card:hover .link-card-arrow {
  color: var(--azul-turno);
  transform: translate(3px, -3px);
}

.home-master-section {
  text-align: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.master-label {
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 1rem;
}

.master-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.75rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 600;
  color: var(--color-text);
  transition: all 0.3s ease;
}

.master-btn:hover {
  transform: translateY(-2px);
  color: var(--azul-turno);
}

.master-btn i {
  font-size: 1.2rem;
}

/* Animations */
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .home-view {
    padding: 1.5rem 1rem;
  }

  .home-hero {
    margin-bottom: 1.5rem;
  }

  .logo-container {
    margin-bottom: 1rem;
  }

  .home-title {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .home-subtitle {
    font-size: 1rem;
  }

  .home-actions {
    margin-bottom: 1.5rem;
  }

  .action-cards {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .action-card {
    padding: 1.75rem 1.25rem;
  }

  .action-card-icon {
    width: 65px;
    height: 65px;
    font-size: 1.6rem;
    margin-bottom: 1rem;
  }

  .link-cards {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .link-card {
    padding: 0.875rem 1rem;
  }
}

@media (min-width: 1024px) {
  .home-logo {
    width: 250px;
  }

  .home-title {
    font-size: 3rem;
  }

  .home-subtitle {
    font-size: 1.2rem;
  }
}
</style>
