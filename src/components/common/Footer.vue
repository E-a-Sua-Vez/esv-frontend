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
              <img src="/images/hub/logo/hub-blanco-transparente.png" alt="Hub" class="logo-img" />
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
                  style="cursor: pointer"
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
        </div>
      </div>
    </div>

    <!-- Modal Buzon - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
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
    </Teleport>
  </footer>
</template>

<style scoped>
.modern-footer {
  background: linear-gradient(
    135deg,
    #0a0a1a 0%,
    #1a1a2e 25%,
    #16213e 50%,
    #0f3460 75%,
    #1a1a2e 100%
  );
  color: rgba(255, 255, 255, 0.9);
  position: relative;
  margin-top: 4rem;
  margin-bottom: 0;
  padding-top: 1.5rem;
  padding-bottom: 1rem;
}

.modern-footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
}

.modern-footer::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 20% 30%, rgba(0, 74, 173, 0.3) 0%, transparent 50%),
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
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1rem;
}

.footer-brand {
  padding-right: 2rem;
}

.footer-logo {
  margin-bottom: 0.5rem;
}

.logo-img {
  max-width: 140px;
  height: auto;
  width: auto;
  object-fit: contain;
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
  padding: 1rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-copyright p {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

@media (max-width: 768px) {
  .modern-footer {
    padding-top: 2rem;
    padding-bottom: 2rem;
    padding-left: 1rem;
    padding-right: 1rem;
    margin-top: 4rem;
  }

  .footer-container .container {
    padding-left: 1rem;
    padding-right: 1rem;
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

  .footer-bottom {
    padding: 1.5rem 0;
  }
}

@media (max-width: 576px) {
  .modern-footer {
    padding-top: 2rem;
    padding-bottom: 2.5rem;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }

  .footer-container .container {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }

  .footer-main {
    padding-bottom: 2.5rem;
  }

  .footer-bottom {
    padding: 2rem 0;
  }

  .footer-title {
    font-size: 0.95rem;
  }

  .footer-link {
    font-size: 0.85rem;
  }
}
</style>
