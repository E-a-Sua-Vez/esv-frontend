<script>
import Actions from '../domain/Actions.vue';

export default {
  name: 'Footer',
  components: { Actions },
  data() {
    return {
      visible: false,
    };
  },
  methods: {
    closeMenu() {
      this.visible = !this.visible;
      if (this.visible === false) {
        const problemsModalCloseButton = document.getElementById('close-modal');
        if (problemsModalCloseButton) {
          problemsModalCloseButton.click();
        }
      }
    },
  },
};
</script>

<template>
  <footer class="modern-footer">
    <div class="footer-container">
      <div class="container">
        <!-- Main Footer Content -->
        <div class="row footer-main">
          <!-- Brand Column -->
          <div class="col-12 col-md-6 col-lg-4 footer-brand mb-4 mb-md-0">
            <div class="footer-logo mb-3">
              <img src="/images/hub/logo/hub-blanco-transparente.png" alt="Hub" class="logo-img">
            </div>
            <p class="footer-description">{{ $t('footer.description') || 'Transforme seu atendimento ao cliente com nossa plataforma digital completa de filas, agendamentos e pesquisas de satisfação.' }}</p>
            <div class="footer-social mt-3">
              <a href="https://twitter.com/estuturnocl" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Twitter">
                <i class="bi bi-twitter"></i>
              </a>
              <a href="https://instagram.com/estuturnobr/" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Instagram">
                <i class="bi bi-instagram"></i>
              </a>
              <a href="https://www.facebook.com/estuturnocl" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Facebook">
                <i class="bi bi-facebook"></i>
              </a>
              <a href="https://www.linkedin.com/company/estuturno" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="LinkedIn">
                <i class="bi bi-linkedin"></i>
              </a>
            </div>
          </div>

          <!-- Resources Column -->
          <div class="col-6 col-md-3 col-lg-2 footer-column mb-4 mb-md-0">
            <h6 class="footer-title">{{ $t('footer.resources') || 'Recursos' }}</h6>
            <ul class="footer-links">
              <li>
                <a
                  class="footer-link"
                  data-bs-toggle="modal"
                  data-bs-target="#modalBuzon"
                  @click="closeMenu()"
                  style="cursor: pointer;"
                >
                  <i class="bi bi-box-fill me-2"></i>{{ $t('footer.mailbox') || 'Ações' }}
                </a>
              </li>
              <li>
                <a :href="$t('blog')" target="_blank" class="footer-link">
                  <i class="bi bi-journal-text me-2"></i>{{ $t('footer.blog') || 'Blog' }}
                </a>
              </li>
              <li>
                <a :href="$t('blog')" target="_blank" class="footer-link">
                  <i class="bi bi-question-circle me-2"></i>{{ $t('footer.faq') || 'FAQ' }}
                </a>
              </li>
            </ul>
          </div>

          <!-- Contact Column -->
          <div class="col-6 col-md-3 col-lg-2 footer-column mb-4 mb-md-0">
            <h6 class="footer-title">{{ $t('footer.contact') || 'Contato' }}</h6>
            <ul class="footer-links">
              <li>
                <a :href="`mailto:${$t('footer.emailDir')}`" class="footer-link">
                  <i class="bi bi-envelope me-2"></i>{{ $t('footer.emailDir') }}
                </a>
              </li>
              <li>
                <a href="https://calendly.com/estuturno/conoce-mas-de-es-tu-turno" target="_blank" class="footer-link">
                  <i class="bi bi-calendar-check me-2"></i>{{ $t('footer.schedule') || 'Agendar Reunião' }}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <!-- Footer Bottom -->
        <div class="footer-bottom">
          <div class="row align-items-center">
            <div class="col-12 col-md-6 footer-copyright">
              <p class="mb-0">{{ $t('footer.copyright') }}</p>
            </div>
          </div>
          <!-- Powered by / Desenvolvido por -->
          <div class="row mt-3">
            <div class="col-12">
              <div class="footer-powered-by">
                <span class="powered-by-text">{{ $t('footer.poweredBy') || 'Desenvolvido por' }}</span>
                <a :href="$t('publicSiteUrl')" target="_blank" class="powered-by-link">
                  <img src="/images/esv/esv-blanco-horizontal-transparente.png" alt="É a sua Vez" class="powered-by-logo">
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Buzon -->
    <div
      class="modal fade"
      id="modalBuzon"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0">
            <button
              id="close-modal"
              class="btn-close"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body text-center pb-5">
            <Suspense>
              <template #default>
                <Actions @closeModal="closeMenu()"></Actions>
              </template>
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.modern-footer {
  background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #1a1a2e 100%);
  color: rgba(255, 255, 255, 0.9);
  position: relative;
  margin-top: 4rem;
  padding-top: 3rem;
}

.modern-footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
}

.modern-footer::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(0, 74, 173, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(0, 194, 203, 0.2) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
  opacity: 0.6;
}

.footer-container {
  position: relative;
  z-index: 1;
}

.footer-main {
  padding-bottom: 2.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 2rem;
}

.footer-brand {
  padding-right: 2rem;
}

.footer-logo {
  margin-bottom: 1rem;
}

.logo-img {
  max-width: 180px;
  height: auto;
  width: auto;
  object-fit: contain;
}

.footer-description {
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1rem;
}

.footer-social {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.social-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  transition: all 0.3s ease;
  font-size: 1.1rem;
}

.social-link:hover {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.4);
}

.footer-column {
  padding: 0 1rem;
}

.footer-title {
  font-size: 1rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-links li {
  margin-bottom: 0.75rem;
}

.footer-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
}

.footer-link:hover {
  color: var(--verde-tu);
  padding-left: 4px;
}

.footer-link i {
  font-size: 0.85rem;
}

.footer-bottom {
  padding: 1.5rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-copyright p {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.footer-powered-by {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 1rem;
}

.powered-by-text {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 400;
}

.powered-by-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  transition: all 0.3s ease;
  opacity: 0.8;
}

.powered-by-link:hover {
  opacity: 1;
  transform: translateY(-2px);
}

.powered-by-logo {
  max-width: 120px;
  height: auto;
  width: auto;
  object-fit: contain;
  filter: brightness(0) invert(1);
  transition: all 0.3s ease;
}

.powered-by-link:hover .powered-by-logo {
  filter: brightness(0) invert(1) drop-shadow(0 2px 8px rgba(255, 255, 255, 0.3));
}

@media (max-width: 768px) {
  .modern-footer {
    padding-top: 2rem;
    margin-top: 2rem;
  }

  .footer-main {
    padding-bottom: 2rem;
  }

  .footer-brand {
    padding-right: 0;
    margin-bottom: 2rem;
  }

  .logo-img {
    max-width: 150px;
  }

  .footer-column {
    padding: 0;
    margin-bottom: 2rem;
  }

  .footer-powered-by {
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 1rem;
    margin-top: 0.75rem;
  }

  .powered-by-text {
    font-size: 0.8rem;
  }

  .powered-by-logo {
    max-width: 100px;
  }
}

@media (max-width: 576px) {
  .footer-description {
    font-size: 0.9rem;
  }

  .footer-title {
    font-size: 0.95rem;
  }

  .footer-link {
    font-size: 0.85rem;
  }
}
</style>
