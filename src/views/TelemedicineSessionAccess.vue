<template>
  <div>
    <div class="content text-center">
      <!-- Commerce Logo - Only show if we have commerce logo, otherwise don't show any logo -->
      <CommerceLogo
        v-if="commerce && commerce.logo"
        :src="commerce.logo"
        :business-id="commerce.businessId"
        :loading="false"
      ></CommerceLogo>

      <div id="page-header" class="text-center mt-4" v-if="!keyValidated || !session">
        <div class="welcome">
          <span>{{ $t('telemedicineSession.patientWelcome') }}</span>
        </div>
      </div>

      <div class="login-container" :class="{ 'reduced-margin': !keyValidated }">
        <div class="modern-login-card text-center">
          <div class="login-card-content">
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
              </div>
              <p class="mt-3 text-muted">{{ $t('telemedicineSession.verifyingAccess') }}</p>
            </div>

            <!-- Session Ended Message -->
            <div v-else-if="sessionEnded" class="session-ended-message">
              <div class="text-center mb-4">
                <div
                  class="form-icon-wrapper mb-3"
                  style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%)"
                >
                  <i class="bi bi-x-circle-fill" style="color: white; font-size: 1.5rem"></i>
                </div>
                <h4 class="mt-3" style="color: #dc3545; font-weight: 700">
                  {{ $t('telemedicineSession.sessionNotAvailable') }}
                </h4>
                <p class="text-muted mt-2">
                  {{ $t('telemedicineSession.sessionEndedMessage') }}
                </p>
                <p
                  class="text-muted"
                  v-if="session?.status === 'completed' || session?.status === 'COMPLETED'"
                >
                  {{ $t('telemedicineSession.sessionCompletedMessage') }}
                </p>
                <p
                  class="text-muted"
                  v-else-if="session?.status === 'cancelled' || session?.status === 'CANCELLED'"
                >
                  {{ $t('telemedicineSession.sessionCancelledMessage') }}
                </p>
              </div>
            </div>

            <!-- Key Validation Form -->
            <div v-else-if="!keyValidated && !error && !sessionEnded" class="key-validation-form">
              <div class="text-center mb-4">
                <div class="form-icon-wrapper mb-3">
                  <i class="bi bi-shield-lock"></i>
                </div>
                <h4 class="mt-3">{{ $t('telemedicineSession.enterAccessKey') }}</h4>
                <p class="text-muted">
                  {{ $t('telemedicineSession.enterAccessKeyDescription') }}
                </p>
              </div>

              <form @submit.prevent="validateKey" class="mt-4">
                <div class="form-group">
                  <label for="accessKey" class="form-label">
                    {{ $t('telemedicineSession.accessKeyLabel') }}
                  </label>
                  <div class="input-wrapper">
                    <i class="bi bi-key-fill input-icon"></i>
                    <input
                      id="accessKey"
                      v-model="accessKey"
                      type="text"
                      class="form-control modern-input text-center"
                      placeholder="XXXX-XXXX"
                      maxlength="8"
                      pattern="[A-Z0-9]{4,8}"
                      required
                      autocomplete="off"
                      :disabled="validating"
                      @input="accessKey = accessKey.toUpperCase().replace(/[^A-Z0-9]/g, '')"
                      style="letter-spacing: 0.5rem; font-weight: bold; font-size: 1.5rem"
                    />
                  </div>
                  <div class="form-text mt-2">
                    {{ $t('telemedicineSession.accessKeyHint') }}
                  </div>
                </div>

                <div class="btn-area">
                  <button
                    type="submit"
                    class="btn btn-lg fw-bold btn-dark text-white rounded-pill modern-submit-btn"
                    :disabled="
                      validating || !accessKey || accessKey.length < 4 || accessKey.length > 8
                    "
                  >
                    <span v-if="validating" class="spinner-border spinner-border-sm me-2"></span>
                    <span v-else>
                      <i class="bi bi-check-circle me-2"></i>
                      {{ $t('telemedicineSession.validateAndAccess') }}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="errors">
              <div class="alert alert-danger text-center">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>{{ error }}</strong>
                <div class="mt-3">
                  <button @click="resetForm" class="btn btn-outline-danger">
                    {{ $t('telemedicineSession.tryAgain') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Session Access (After Validation) -->
            <div v-else-if="keyValidated && session" class="session-access">
              <div class="text-center mb-2">
                <div
                  class="form-icon-wrapper mb-1"
                  style="
                    background: linear-gradient(135deg, var(--verde-tu) 0%, var(--azul-turno) 100%);
                  "
                >
                  <i class="bi bi-check-circle-fill" style="color: white; font-size: 1.5rem"></i>
                </div>
                <h4
                  class="mt-1 mb-2"
                  style="
                    color: var(--verde-tu);
                    font-weight: 700;
                    font-size: 1.1rem;
                    line-height: 1.2;
                  "
                >
                  <span v-if="attention && (attention.userName || attention.user?.name)">
                    {{
                      $t('telemedicineSession.welcomeUser', {
                        name: attention.userName || attention.user?.name,
                      })
                    }}
                  </span>
                  <span v-else>{{ $t('telemedicineSession.accessValidated') }}</span>
                </h4>
              </div>

              <!-- Patient Information Card -->
              <div
                v-if="attention && (attention.user || attention.userName || attention.user?.name)"
                class="modern-session-info-card"
              >
                <div class="session-info-header">
                  <div class="session-info-icon">
                    <i class="bi bi-person-circle"></i>
                  </div>
                  <h5 class="session-info-title">Información del Paciente</h5>
                </div>
                <div class="session-info-content">
                  <div
                    class="session-info-item"
                    v-if="
                      attention.userName ||
                      attention.user?.name ||
                      attention.user?.name ||
                      attention.userLastName ||
                      attention.user?.lastName
                    "
                  >
                    <div class="session-info-label">
                      <i class="bi bi-person me-2"></i>
                      Nombre:
                    </div>
                    <div class="session-info-value">
                      {{ attention.userName || attention.user?.name || '' }}
                      {{ attention.userLastName || attention.user?.lastName || '' }}
                    </div>
                  </div>
                  <div
                    class="session-info-item"
                    v-if="attention.userIdNumber || attention.user?.idNumber"
                  >
                    <div class="session-info-label">
                      <i class="bi bi-person-vcard me-2"></i>
                      ID/Cédula:
                    </div>
                    <div class="session-info-value">
                      {{ attention.userIdNumber || attention.user?.idNumber }}
                    </div>
                  </div>
                  <div
                    class="session-info-item"
                    v-if="attention.userPhone || attention.user?.phone"
                  >
                    <div class="session-info-label">
                      <i class="bi bi-telephone me-2"></i>
                      Teléfono:
                    </div>
                    <div class="session-info-value">
                      {{ attention.userPhone || attention.user?.phone }}
                    </div>
                  </div>
                  <div
                    class="session-info-item"
                    v-if="attention.userEmail || attention.user?.email"
                  >
                    <div class="session-info-label">
                      <i class="bi bi-envelope me-2"></i>
                      {{ $t('telemedicineSession.email') }}:
                    </div>
                    <div class="session-info-value">
                      {{ attention.userEmail || attention.user?.email }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Queue/Service Information Card -->
              <div
                v-if="
                  attention && (attention.queue || attention.queueName || attention.servicesDetails)
                "
                class="modern-session-info-card"
              >
                <div class="session-info-header">
                  <div class="session-info-icon">
                    <i class="bi bi-list-ul"></i>
                  </div>
                  <h5 class="session-info-title">Información del Servicio</h5>
                </div>
                <div class="session-info-content">
                  <div
                    class="session-info-item"
                    v-if="attention.queue?.name || attention.queueName"
                  >
                    <div class="session-info-label">
                      <i class="bi bi-qr-code me-2"></i>
                      Fila/Servicio:
                    </div>
                    <div class="session-info-value">
                      {{ attention.queue?.name || attention.queueName }}
                    </div>
                  </div>
                  <div class="session-info-item" v-if="attention.attentionNumber">
                    <div class="session-info-label">
                      <i class="bi bi-hash me-2"></i>
                      Número de Atención:
                    </div>
                    <div class="session-info-value">
                      {{ attention.attentionNumber }}
                    </div>
                  </div>
                  <div
                    class="session-info-item"
                    v-if="attention.servicesDetails && attention.servicesDetails.length > 0"
                  >
                    <div class="session-info-label">
                      <i class="bi bi-briefcase me-2"></i>
                      Servicios:
                    </div>
                    <div class="session-info-value">
                      <span
                        v-for="(serv, index) in attention.servicesDetails"
                        :key="serv.id"
                        class="service-badge-modern"
                      >
                        {{ serv.name
                        }}<span v-if="index < attention.servicesDetails.length - 1">, </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Session Information Card -->
              <div class="modern-session-info-card">
                <div class="session-info-header">
                  <div class="session-info-icon">
                    <i class="bi bi-calendar-event"></i>
                  </div>
                  <h5 class="session-info-title">{{ $t('telemedicineSession.sessionInfo') }}</h5>
                </div>
                <div class="session-info-content">
                  <div class="session-info-item">
                    <div class="session-info-label">
                      <i class="bi bi-camera-video me-2"></i>
                      {{ $t('telemedicineSession.sessionType') }}
                    </div>
                    <div class="session-info-value">
                      <span v-if="session.type === 'video' || session.type === 'VIDEO'">{{
                        $t('telemedicineSession.video')
                      }}</span>
                      <span v-else-if="session.type === 'chat' || session.type === 'CHAT'">{{
                        $t('telemedicineSession.chat')
                      }}</span>
                      <span v-else-if="session.type === 'both' || session.type === 'BOTH'">{{
                        $t('telemedicineSession.both')
                      }}</span>
                      <span v-else>{{ session.type }}</span>
                    </div>
                  </div>
                  <div class="session-info-item">
                    <div class="session-info-label">
                      <i class="bi bi-clock me-2"></i>
                      {{ $t('telemedicineSession.sessionDate') }}
                    </div>
                    <div class="session-info-value">
                      {{ formatSessionDate(session.scheduledAt) }}
                    </div>
                  </div>
                  <div class="session-info-item" v-if="session.status === 'scheduled'">
                    <div class="modern-info-alert">
                      <i class="bi bi-info-circle me-2"></i>
                      {{ $t('telemedicineSession.sessionWillStart') }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Video/Chat Interface -->
              <div class="session-interface">
                <div v-if="session.status === 'scheduled'" class="modern-waiting-state">
                  <div class="waiting-icon-wrapper">
                    <i class="bi bi-hourglass-split"></i>
                  </div>
                  <h5 class="waiting-title">{{ $t('telemedicineSession.waitingForSession') }}</h5>
                  <p class="waiting-message">
                    {{ $t('telemedicineSession.waitingForDoctor') }}
                  </p>
                </div>

                <!-- Waiting for doctor to connect -->
                <div
                  v-if="session.status === 'active' && !doctorConnected"
                  class="modern-waiting-state"
                >
                  <div class="waiting-icon-wrapper">
                    <i class="bi bi-hourglass-split"></i>
                  </div>
                  <h5 class="waiting-title">Esperando conexión del doctor...</h5>
                  <p class="waiting-message">
                    {{ $t('telemedicineSession.waitingForDoctorDescription') }}
                  </p>
                </div>

                <!-- Reopen Button (when window is closed but session is active and doctor is connected) -->
                <div
                  v-if="session.status === 'active' && doctorConnected && !showVideo && !showChat"
                  class="reopen-session-container"
                >
                  <div class="modern-reopen-alert">
                    <div class="reopen-alert-icon">
                      <i class="bi bi-camera-video"></i>
                    </div>
                    <div class="reopen-alert-content">
                      <strong>{{ $t('telemedicineSession.sessionActiveWindowClosed') }}</strong>
                      <button
                        type="button"
                        class="btn btn-lg fw-bold btn-dark text-white rounded-pill modern-submit-btn mt-3"
                        @click="reopenSession"
                      >
                        <i class="bi bi-arrow-clockwise me-2"></i>
                        {{ $t('telemedicineSession.reopenSession') }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Floating Window for Video/Chat when session is active and doctor is connected -->
                <div
                  v-if="session.status === 'active' && doctorConnected && (showVideo || showChat)"
                >
                  <TelemedicineFloatingWindow
                    :show="showVideo || showChat"
                    :title="'Consulta Virtual'"
                    :icon-class="showChat && !showVideo ? 'bi-chat-dots' : 'bi-camera-video'"
                    :is-connected="true"
                    :is-connecting="false"
                    :client-connected="clientConnected"
                    :show-video-miniature="false"
                    :allow-minimize="false"
                    @close="closeSessionWindow"
                  >
                    <!-- Combined Video + Chat Layout (when type is 'both') -->
                    <div
                      v-if="session.type === 'both' || session.type === 'BOTH'"
                      class="combined-session-layout"
                    >
                      <div class="row g-2 h-100">
                        <div class="col-12 col-md-8" style="height: 100%">
                          <TelemedicineVideoCall
                            v-if="showVideo"
                            :session-id="session.id"
                            :current-user-id="session.clientId"
                            user-type="patient"
                            :access-key="accessKey"
                            :show-close="false"
                            @call-ended="handleCallEnded"
                            @session-ended="handleSessionEnded"
                          />
                        </div>
                        <div class="col-12 col-md-4" style="height: 100%">
                          <TelemedicineChat
                            v-if="showChat"
                            :session-id="session.id"
                            :current-user-id="session.clientId"
                            user-type="patient"
                            :access-key="accessKey"
                            :show-close="false"
                            @message-sent="handleMessageSent"
                            @session-ended="handleSessionEnded"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- Video Only -->
                    <div
                      v-else-if="
                        (session.type === 'video' || session.type === 'VIDEO') && showVideo
                      "
                      class="video-call-wrapper h-100"
                    >
                      <TelemedicineVideoCall
                        :session-id="session.id"
                        :current-user-id="session.clientId"
                        user-type="patient"
                        :access-key="accessKey"
                        :show-close="false"
                        @call-ended="handleCallEnded"
                        @session-ended="handleSessionEnded"
                      />
                    </div>

                    <!-- Chat Only -->
                    <div
                      v-else-if="(session.type === 'chat' || session.type === 'CHAT') && showChat"
                      class="chat-wrapper h-100"
                    >
                      <TelemedicineChat
                        :session-id="session.id"
                        :current-user-id="session.clientId"
                        user-type="patient"
                        :access-key="accessKey"
                        :show-close="false"
                        @message-sent="handleMessageSent"
                        @session-ended="handleSessionEnded"
                      />
                    </div>
                  </TelemedicineFloatingWindow>
                </div>

                <div v-else-if="session.status === 'completed'" class="modern-completed-state">
                  <div class="completed-icon-wrapper">
                    <i class="bi bi-check-circle-fill"></i>
                  </div>
                  <h5 class="completed-title">{{ $t('telemedicineSession.sessionCompleted') }}</h5>
                  <div v-if="redirecting" class="mt-3">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Redirigiendo...</span>
                    </div>
                    <p class="mt-3 text-muted">Redirigiendo...</p>
                  </div>
                  <div v-else>
                    <p class="completed-message">
                      Gracias por usar nuestro servicio de telemedicina
                    </p>
                    <p v-if="attention?.surveyId" class="completed-submessage">
                      Serás redirigido para completar la encuesta de satisfacción
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { requestBackend } from '../application/api';
import TelemedicineVideoCall from '../components/telemedicine/domain/TelemedicineVideoCall.vue';
import TelemedicineChat from '../components/telemedicine/domain/TelemedicineChat.vue';
import TelemedicineFloatingWindow from '../components/telemedicine/domain/TelemedicineFloatingWindow.vue';
import CommerceLogo from '../components/common/CommerceLogo.vue';
import { getAttentionDetails } from '../application/services/attention';
import { validatePortalSession } from '../application/services/client-portal';

export default {
  name: 'TelemedicineSessionAccess',
  components: {
    TelemedicineVideoCall,
    TelemedicineChat,
    TelemedicineFloatingWindow,
    CommerceLogo,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const sessionId = route.params.id;

    const loading = ref(false);
    const validating = ref(false);
    const keyValidated = ref(false);
    const accessKey = ref('');
    const session = ref(null);
    const error = ref('');
    const showVideo = ref(false);
    const showChat = ref(false);
    const clientConnected = ref(false);
    const doctorConnected = ref(false);
    const commerce = ref(null);
    const attention = ref(null);
    const sessionCompleted = ref(false);
    const redirecting = ref(false);
    const sessionEnded = ref(false);

    const formatSessionDate = dateString => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        dateStyle: 'long',
        timeStyle: 'short',
      });
    };

    const { t } = useI18n();

    /**
     * Intenta validar usando la sesión del portal si está disponible
     */
    const tryPortalSessionValidation = async () => {
      try {
        const portalToken = localStorage.getItem('clientPortalSessionToken');
        if (!portalToken) {
          return false; // No hay sesión del portal
        }

        // Validar sesión de telemedicina usando token del portal
        const response = await requestBackend.post(
          `/telemedicine/sessions/${sessionId}/validate-portal-session`,
          { portalToken }
        );

        if (response.data && response.data.id) {
          session.value = response.data;
          keyValidated.value = true;

          // Load commerce and attention details
          await loadCommerceAndAttention();

          // Check if doctor is connected
          doctorConnected.value = !!session.value.doctorConnectedAt;

          // Auto-open video/chat when session is active AND doctor is connected
          if (
            (session.value.status === 'active' || session.value.status === 'ACTIVE') &&
            doctorConnected.value
          ) {
            const sessionType = session.value.type || 'VIDEO';
            if (
              sessionType === 'VIDEO' ||
              sessionType === 'video' ||
              sessionType === 'BOTH' ||
              sessionType === 'both'
            ) {
              showVideo.value = true;
            }
            if (
              sessionType === 'CHAT' ||
              sessionType === 'chat' ||
              sessionType === 'BOTH' ||
              sessionType === 'both'
            ) {
              showChat.value = true;
            }
          }

          // Poll for session status updates
          startStatusPolling();

          return true; // Validación exitosa con sesión del portal
        }

        return false;
      } catch (err) {
        // Si el error es 401, 403 o 404, no hay sesión válida del portal
        // Continuar con flujo normal de código
        if (
          err.response?.status === 401 ||
          err.response?.status === 403 ||
          err.response?.status === 404
        ) {
          console.log('[TelemedicineSessionAccess] Portal session not valid, using normal flow');
        } else {
          console.log('[TelemedicineSessionAccess] Portal session validation error:', err);
        }
        return false; // Error al validar, continuar con flujo normal
      }
    };

    const validateKey = async () => {
      if (!accessKey.value || accessKey.value.length < 4 || accessKey.value.length > 8) {
        error.value = t('telemedicineSession.invalidKeyLength');
        return;
      }

      validating.value = true;
      error.value = '';

      try {
        const response = await requestBackend.post(
          `/telemedicine/sessions/${sessionId}/validate-key`,
          { accessKey: accessKey.value }
        );

        if (response.data && response.data.id) {
          session.value = response.data;
          keyValidated.value = true;

          // Load commerce and attention details
          await loadCommerceAndAttention();

          // Check if doctor is connected
          doctorConnected.value = !!session.value.doctorConnectedAt;

          // Auto-open video/chat when session is active AND doctor is connected
          if (
            (session.value.status === 'active' || session.value.status === 'ACTIVE') &&
            doctorConnected.value
          ) {
            const sessionType = session.value.type || 'VIDEO';
            if (
              sessionType === 'VIDEO' ||
              sessionType === 'video' ||
              sessionType === 'BOTH' ||
              sessionType === 'both'
            ) {
              showVideo.value = true;
            }
            if (
              sessionType === 'CHAT' ||
              sessionType === 'chat' ||
              sessionType === 'BOTH' ||
              sessionType === 'both'
            ) {
              showChat.value = true;
            }
          }

          // Poll for session status updates
          startStatusPolling();
        } else {
          error.value = t('telemedicineSession.invalidAccessKey');
        }
      } catch (err) {
        if (err.response?.status === 401) {
          error.value = t('telemedicineSession.incorrectAccessKey');
        } else if (err.response?.status === 404) {
          error.value = t('telemedicineSession.sessionNotFound');
        } else {
          error.value = err.response?.data?.message || t('telemedicineSession.validationError');
        }
      } finally {
        validating.value = false;
      }
    };

    let pollInterval = null;

    const loadCommerceAndAttention = async () => {
      if (!session.value?.attentionId) return;

      try {
        // Load attention details to get commerce and surveyId
        attention.value = await getAttentionDetails(session.value.attentionId);
        console.log('Attention loaded:', attention.value); // Debug: check attention structure
        console.log('User data:', attention.value?.user); // Debug: check user object
        if (attention.value?.commerce) {
          commerce.value = attention.value.commerce;
        }
      } catch (err) {
        console.error('Error loading commerce and attention:', err);
      }
    };

    const handleSessionCompleted = async () => {
      if (sessionCompleted.value || redirecting.value) return;

      sessionCompleted.value = true;
      redirecting.value = true;

      // Close video/chat windows
      showVideo.value = false;
      showChat.value = false;

      // Stop polling
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }

      // Ensure we have attention details
      if (!attention.value && session.value?.attentionId) {
        await loadCommerceAndAttention();
      }

      // Wait a moment before redirecting
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if attention has surveyId
      if (attention.value?.surveyId && attention.value?.queueId) {
        // Redirect to attention page to complete pesquisa
        router.push({
          path: `/interno/fila/${attention.value.queueId}/atencion/${attention.value.id}/`,
        });
      } else {
        // Show thank you message
        redirecting.value = false;
      }
    };

    const startStatusPolling = () => {
      // Poll every 10 seconds for session status updates (reduced from 5 to avoid rate limiting)
      let consecutiveErrors = 0;
      pollInterval = setInterval(async () => {
        if (!session.value) {
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          return;
        }

        // Check if session is completed or cancelled
        if (session.value.status === 'completed' || session.value.status === 'cancelled') {
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          // Handle session completion
          if (session.value.status === 'completed') {
            handleSessionCompleted();
          }
          return;
        }

        try {
          const response = await requestBackend.get(`/telemedicine/sessions/${sessionId}/public`);
          if (response.data) {
            consecutiveErrors = 0; // Reset error counter on success
            const previousStatus = session.value.status;
            session.value = response.data;

            // Check if session just became completed
            if (session.value.status === 'completed' && previousStatus !== 'completed') {
              if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
              }
              handleSessionCompleted();
              return;
            }

            // Check if doctor is connected
            doctorConnected.value = !!session.value.doctorConnectedAt;

            // Auto-open video/chat when session becomes active AND doctor is connected
            if (
              (session.value.status === 'active' || session.value.status === 'ACTIVE') &&
              doctorConnected.value &&
              !showVideo.value &&
              !showChat.value
            ) {
              const sessionType = session.value.type || 'VIDEO';
              if (
                sessionType === 'VIDEO' ||
                sessionType === 'video' ||
                sessionType === 'BOTH' ||
                sessionType === 'both'
              ) {
                showVideo.value = true;
              }
              if (
                sessionType === 'CHAT' ||
                sessionType === 'chat' ||
                sessionType === 'BOTH' ||
                sessionType === 'both'
              ) {
                showChat.value = true;
              }
            }
          }
        } catch (err) {
          consecutiveErrors++;
          // Si recibimos 429, pausar el polling temporalmente
          if (err.response?.status === 429) {
            console.warn(
              '[TelemedicineSessionAccess] Rate limited during polling, pausing for 15 seconds'
            );
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
              // Reanudar después de 15 segundos
              setTimeout(() => {
                startStatusPolling();
              }, 15000);
            }
          } else if (consecutiveErrors >= 3) {
            // Si hay 3 errores consecutivos (que no sean 429), pausar el polling
            console.warn('[TelemedicineSessionAccess] Too many polling errors, pausing');
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
          } else {
            console.error('Error polling session status:', err);
          }
        }
      }, 10000); // Poll cada 10 segundos en lugar de 5 para reducir carga
    };

    onUnmounted(() => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    });

    const resetForm = () => {
      keyValidated.value = false;
      accessKey.value = '';
      error.value = '';
      session.value = null;
    };

    const handleCallEnded = () => {
      // Refresh session status after call ends
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      // Check if session is completed
      if (session.value?.status === 'completed') {
        handleSessionCompleted();
      } else {
        startStatusPolling();
      }
    };

    const handleSessionEnded = () => {
      // Session was ended by doctor - close video/chat and show completion
      console.log('[TelemedicineSessionAccess] Session ended by doctor');
      showVideo.value = false;
      showChat.value = false;

      // Refresh session status to get updated status
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }

      // Fetch latest session status
      requestBackend
        .get(`/telemedicine/sessions/${sessionId}/public`)
        .then(response => {
          if (response.data) {
            session.value = response.data;
            if (session.value.status === 'completed' || session.value.status === 'COMPLETED') {
              handleSessionCompleted();
            }
          }
        })
        .catch(err => {
          console.error('[TelemedicineSessionAccess] Error fetching session status:', err);
          // Assume session is completed if we can't fetch status
          if (session.value) {
            session.value.status = 'completed';
            handleSessionCompleted();
          }
        });
    };

    // Watch for session status changes
    watch(
      () => session.value?.status,
      (newStatus, oldStatus) => {
        if (newStatus === 'completed' && oldStatus !== 'completed') {
          handleSessionCompleted();
        }
      }
    );

    const handleMessageSent = message => {
      // Message sent successfully, no action needed
      console.log('Message sent:', message);
    };

    const closeSessionWindow = () => {
      // Only close the window, don't end the session
      showVideo.value = false;
      showChat.value = false;
      console.log('[TelemedicineSessionAccess] Window closed by patient, session still active');
    };

    const reopenSession = () => {
      // Reopen video/chat based on session type, only if doctor is connected
      if (!session.value || !doctorConnected.value) return;

      const sessionType = session.value.type || 'VIDEO';

      if (
        sessionType === 'VIDEO' ||
        sessionType === 'video' ||
        sessionType === 'BOTH' ||
        sessionType === 'both'
      ) {
        showVideo.value = true;
      }
      if (
        sessionType === 'CHAT' ||
        sessionType === 'chat' ||
        sessionType === 'BOTH' ||
        sessionType === 'both'
      ) {
        showChat.value = true;
      }

      console.log('[TelemedicineSessionAccess] Session reopened by patient');
    };

    // Try to load commerce info from public session endpoint
    const loadCommerceFromSession = async () => {
      try {
        // Mark request as silent to avoid logging network errors (expected when backend is down)
        // Create config with _silent flag to suppress error logging
        const config = { _silent: true };
        const response = await requestBackend.get(
          `/telemedicine/sessions/${sessionId}/public`,
          config
        );
        if (response.data) {
          // Check if session is already completed or cancelled
          if (
            response.data.status === 'completed' ||
            response.data.status === 'cancelled' ||
            response.data.status === 'COMPLETED' ||
            response.data.status === 'CANCELLED'
          ) {
            sessionEnded.value = true;
            session.value = response.data;
            // Load commerce and attention for the message
            if (response.data.commerce) {
              commerce.value = response.data.commerce;
            } else if (response.data.attentionId) {
              try {
                attention.value = await getAttentionDetails(response.data.attentionId);
                if (attention.value?.commerce) {
                  commerce.value = attention.value.commerce;
                }
              } catch (err) {
                console.error('Error loading commerce from attention:', err);
              }
            }
            return;
          }

          // Check if session has commerce info directly
          if (response.data.commerce) {
            commerce.value = response.data.commerce;
          } else if (response.data.attentionId) {
            // Try to load from attention
            try {
              attention.value = await getAttentionDetails(response.data.attentionId);
              if (attention.value?.commerce) {
                commerce.value = attention.value.commerce;
              }
            } catch (err) {
              console.error('Error loading commerce from attention:', err);
            }
          }
        }
      } catch (err) {
        // If public endpoint requires auth or network error, we'll load it after validation
        // Only log if it's not a network error (which is expected when backend is down)
        if (err.code !== 'ERR_NETWORK' && err.message !== 'Network Error') {
          console.warn('Could not load commerce before validation:', err.message);
        } else {
          // Network errors are expected and will be handled after validation
          console.log('Could not load commerce before validation (network error), will load after');
        }
      }
    };

    // Check if key is already in URL query params (for direct links)
    onMounted(async () => {
      loading.value = true;

      // Try to load commerce logo before validation
      await loadCommerceFromSession();

      // Primero intentar usar sesión del portal si está disponible
      const portalValidationSuccess = await tryPortalSessionValidation();
      if (portalValidationSuccess) {
        loading.value = false;
        return; // Validación exitosa con sesión del portal
      }

      loading.value = false;

      // Si no hay sesión del portal o no coincide, usar flujo normal
      const keyFromUrl = route.query.key;
      if (keyFromUrl && keyFromUrl.length >= 4 && keyFromUrl.length <= 8) {
        accessKey.value = keyFromUrl.toUpperCase().replace(/[^A-Z0-9]/g, '');
        validateKey();
      }
    });

    return {
      loading,
      validating,
      keyValidated,
      accessKey,
      session,
      error,
      showVideo,
      showChat,
      clientConnected,
      doctorConnected,
      commerce,
      attention,
      sessionCompleted,
      redirecting,
      sessionEnded,
      validateKey,
      resetForm,
      formatSessionDate,
      handleCallEnded,
      handleMessageSent,
      closeSessionWindow,
      reopenSession,
      handleSessionEnded,
    };
  },
};
</script>

<style scoped>
@import '../shared/styles/prontuario-common.css';

/* Use the same login container styles */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem;
}

.login-container.reduced-margin {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
}

.modern-login-card {
  width: 100%;
  max-width: 580px;
  background: var(--color-background);
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 0.5px solid var(--gris-default);
  overflow: hidden;
}

.login-card-content {
  padding: 0.75rem;
}

.form-group {
  margin-bottom: 0.75rem;
}

.form-label {
  display: block;
  margin-bottom: 0.375rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--gris-elite-1);
  text-align: left;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1.25rem;
  font-size: 1.25rem;
  color: var(--azul-turno);
  z-index: 2;
  transition: color 0.3s ease, transform 0.2s ease;
}

.modern-input {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 3.5rem;
  border: 1.75px solid #ced4da;
  border-radius: 1rem;
  font-size: 1rem;
  line-height: 1.5;
  background-color: var(--color-background);
  transition: all 0.3s ease;
  text-align: left;
}

.modern-input:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 0.2rem rgba(0, 74, 173, 0.15);
  background-color: var(--color-background);
}

.modern-input:focus + .input-icon,
.input-wrapper:focus-within .input-icon {
  color: var(--verde-tu);
  transform: scale(1.1);
}

.modern-input.is-invalid {
  border-color: var(--rojo-warning);
  background-color: var(--rojo-ligth);
}

.modern-input.is-invalid + .input-icon {
  color: var(--rojo-warning);
}

.modern-input::placeholder {
  color: var(--gris-default);
  opacity: 0.7;
}

.btn-area {
  margin-top: 0.75rem;
  position: relative;
}

.modern-submit-btn {
  width: 100%;
  padding: 0.875rem 2rem;
  font-size: 1rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.modern-submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 74, 173, 0.4);
}

.modern-submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.modern-submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.errors {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--rojo-warning);
  padding: 0 0.5rem;
}

.form-icon-wrapper {
  width: 50px;
  height: 50px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  border-radius: 50%;
  color: white;
  font-size: 1.5rem;
  box-shadow: 0 4px 15px rgba(0, 74, 173, 0.3);
}

.key-validation-form {
  width: 100%;
}

/* Modern Session Info Card */
.modern-session-info-card {
  background: var(--color-background);
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 0.5px solid var(--gris-default);
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.session-info-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.session-info-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  border-radius: 6px;
  color: white;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.session-info-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  line-height: 1.2;
}

.session-info-content {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.session-info-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.session-info-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--gris-elite-1);
  display: flex;
  align-items: center;
  line-height: 1.2;
}

.session-info-value {
  font-size: 0.85rem;
  color: var(--color-text);
  font-weight: 500;
  padding-left: 1.25rem;
  line-height: 1.3;
}

.modern-info-alert {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.08) 0%, rgba(0, 194, 203, 0.08) 100%);
  border-left: 4px solid var(--azul-turno);
  border-radius: 0.5rem;
  padding: 1rem;
  color: var(--gris-elite-1);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
}

.service-badge-modern {
  display: inline-block;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  margin-right: 0.5rem;
  margin-bottom: 0.25rem;
}

/* Modern Waiting State */
.modern-waiting-state {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 0.5px solid var(--gris-default);
  padding: 3rem 2rem;
}

.waiting-icon-wrapper {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(249, 195, 34, 0.1) 0%, rgba(249, 195, 34, 0.2) 100%);
  border-radius: 50%;
  margin-bottom: 1.5rem;
  animation: pulse 2s ease-in-out infinite;
}

.waiting-icon-wrapper i {
  font-size: 3rem;
  color: var(--amarillo-star);
}

.waiting-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.waiting-message {
  font-size: 1rem;
  color: var(--gris-elite-1);
  max-width: 400px;
  text-align: center;
  line-height: 1.6;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

/* Modern Completed State */
.modern-completed-state {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 0.5px solid var(--gris-default);
  padding: 3rem 2rem;
}

.completed-icon-wrapper {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--verde-tu) 0%, var(--azul-turno) 100%);
  border-radius: 50%;
  margin-bottom: 1.5rem;
}

.completed-icon-wrapper i {
  font-size: 3rem;
  color: white;
}

.completed-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--verde-tu);
  margin-bottom: 1rem;
}

.completed-message {
  font-size: 1rem;
  color: var(--gris-elite-1);
  text-align: center;
  margin-bottom: 0.5rem;
}

.completed-submessage {
  font-size: 0.9rem;
  color: var(--gris-elite-1);
  text-align: center;
}

.video-call-wrapper,
.chat-wrapper {
  width: 100%;
  height: 100%;
}

.combined-session-layout {
  width: 100%;
  height: 100%;
}

.combined-session-layout .telemedicine-video-call,
.combined-session-layout .telemedicine-chat {
  height: 100%;
}

/* Modern Reopen Session */
.reopen-session-container {
  margin-bottom: 1.5rem;
}

.modern-reopen-alert {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.08) 0%, rgba(0, 194, 203, 0.08) 100%);
  border: 1px solid var(--azul-turno);
  border-radius: 0.5rem;
  padding: 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.reopen-alert-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  border-radius: 12px;
  color: white;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.reopen-alert-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.reopen-alert-content strong {
  font-size: 1.1rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.form-text {
  font-size: 0.875rem;
  color: var(--gris-elite-1);
  text-align: left;
}

.login-message {
  padding: 0.1rem;
  font-size: 1.1rem;
  line-height: 1.4rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.7);
  margin-top: 0.5rem;
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .login-container {
    padding: 1.5rem;
  }

  .login-card-content {
    padding: 1.25rem;
  }

  .modern-login-card {
    max-width: 600px;
  }

  .modern-session-info-card {
    padding: 1rem;
  }
}

@media (max-width: 576px) {
  .login-card-content {
    padding: 0.875rem;
  }

  .modern-input {
    padding: 0.75rem 0.875rem 0.75rem 3rem;
    font-size: 0.95rem;
  }

  .input-icon {
    left: 1rem;
    font-size: 1.1rem;
  }

  .form-icon-wrapper {
    width: 70px;
    height: 70px;
    font-size: 2rem;
  }

  .modern-session-info-card {
    padding: 0.625rem;
  }

  .session-info-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .modern-waiting-state,
  .modern-completed-state {
    padding: 2rem 1rem;
  }

  .waiting-icon-wrapper,
  .completed-icon-wrapper {
    width: 80px;
    height: 80px;
  }

  .waiting-icon-wrapper i,
  .completed-icon-wrapper i {
    font-size: 2.5rem;
  }

  .modern-reopen-alert {
    flex-direction: column;
    text-align: center;
  }
}
</style>
