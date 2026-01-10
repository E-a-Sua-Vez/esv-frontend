<template>
  <div class="telemedicine-video-call patient-form-modern">
    <div class="video-call-header">
      <div class="video-call-header-content">
        <div class="video-call-header-icon">
          <i class="bi bi-camera-video"></i>
        </div>
        <div class="video-call-header-title">
          <h5>Consulta Virtual</h5>
          <span v-if="connected" class="status-badge badge-modern badge-modern-success">
            <i class="bi bi-circle-fill me-1"></i>
            Conectado
          </span>
          <span v-else class="status-badge badge-modern badge-modern-warning">
            <i class="bi bi-circle-fill me-1"></i>
            Conectando...
          </span>
          <span
            v-if="clientConnected && userType === 'doctor'"
            class="status-badge badge-modern badge-modern-success ms-2"
          >
            <i class="bi bi-person-check-fill me-1"></i>
            Cliente conectado
          </span>
          <span
            v-if="isRecording"
            class="status-badge badge-modern ms-2"
            style="background: #ef4444; color: white"
          >
            <i class="bi bi-record-circle-fill me-1"></i>
            Grabando {{ formatRecordingTime(recordingTime) }}
          </span>
        </div>
      </div>
      <button type="button" class="btn-close" @click="$emit('close')" v-if="showClose"></button>
    </div>

    <div class="video-call-body">
      <div v-if="loading" class="text-center py-5">
        <Spinner />
        <p class="mt-3">Iniciando videollamada...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          {{ error }}
        </div>
      </div>

      <div v-else class="video-container">
        <!-- Video local -->
        <div class="video-wrapper local-video">
          <video
            ref="localVideo"
            autoplay
            muted
            playsinline
            class="video-element"
            :disablepictureinpicture="true"
            :controlslist="'nodownload nofullscreen noremoteplayback'"
            preload="metadata"
          ></video>
          <div class="video-overlay">
            <span class="video-label">Tú</span>
            <span v-if="!localStream" class="video-status">
              <i class="bi bi-camera-video-off"></i>
            </span>
          </div>
        </div>

        <!-- Video remoto -->
        <div class="video-wrapper remote-video">
          <video
            ref="remoteVideo"
            autoplay
            playsinline
            class="video-element"
            :disablepictureinpicture="true"
            :controlslist="'nodownload nofullscreen noremoteplayback'"
            preload="metadata"
          ></video>
          <div class="video-overlay">
            <span class="video-label">
              {{ userType === 'doctor' ? 'Paciente' : 'Médico' }}
            </span>
            <span v-if="!remoteStream" class="video-status">
              <i class="bi bi-camera-video-off"></i>
              Esperando conexión...
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="video-call-controls">
      <div class="controls-group">
        <button
          type="button"
          class="btn-control"
          :class="{ 'btn-control-active': !isMuted }"
          @click="toggleMute"
          :disabled="!localStream"
          title="Microfono"
        >
          <i :class="isMuted ? 'bi bi-mic-mute-fill' : 'bi bi-mic-fill'"></i>
        </button>
        <button
          type="button"
          class="btn-control"
          :class="{ 'btn-control-active': !isVideoOff }"
          @click="toggleVideo"
          :disabled="!localStream"
          title="Cámara"
        >
          <i :class="isVideoOff ? 'bi bi-camera-video-off' : 'bi bi-camera-video-fill'"></i>
        </button>
        <button
          type="button"
          class="btn-control"
          :class="{ 'btn-control-active': isScreenSharing }"
          @click="toggleScreenShare"
          :disabled="!localStream"
          title="Compartir pantalla"
        >
          <i class="bi bi-display"></i>
        </button>
        <button
          v-if="recordingEnabled"
          type="button"
          class="btn-control"
          :class="{ 'btn-control-active': isRecording, 'btn-control-recording': isRecording }"
          @click="toggleRecording"
          :disabled="!localStream || !remoteStream"
          title="Grabar sesión"
        >
          <i :class="isRecording ? 'bi bi-record-circle-fill' : 'bi bi-record-circle'"></i>
          <span v-if="isRecording" class="recording-indicator"></span>
        </button>
      </div>
      <div class="controls-group">
        <!-- Only show end call button for doctors -->
        <button
          v-if="userType === 'doctor'"
          type="button"
          class="btn-control btn-control-danger"
          @click="endCall"
          title="Finalizar llamada"
        >
          <i class="bi bi-telephone-x-fill"></i>
        </button>
        <!-- Patients cannot end the session, no button shown -->
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch, nextTick, defineExpose } from 'vue';
import { useTelemedicine } from '../../../composables/useTelemedicine';
import {
  startTelemedicineSession,
  endTelemedicineSession,
  getTelemedicineSession,
  markPatientConnected,
  markDoctorConnected,
} from '../../../application/services/telemedicine';
import { requestBackend, getHeaders } from '../../../application/api';
import Spinner from '../../common/Spinner.vue';

export default {
  name: 'TelemedicineVideoCall',
  components: {
    Spinner,
  },
  props: {
    sessionId: {
      type: String,
      required: true,
    },
    currentUserId: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      required: true,
      validator: value => ['doctor', 'patient'].includes(value),
    },
    accessKey: {
      type: String,
      required: false,
      default: null,
    },
    showClose: {
      type: Boolean,
      default: false,
    },
    recordingEnabled: {
      type: Boolean,
      default: false,
    },
    clientConnected: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'call-ended', 'session-ended'],
  setup(props, { emit }) {
    const loading = ref(true);
    const error = ref(null);
    const localVideo = ref(null);
    const remoteVideo = ref(null);
    const localStream = ref(null);
    const remoteStream = ref(null);
    const isMuted = ref(false);
    const isVideoOff = ref(false);
    const isScreenSharing = ref(false);
    const isRecording = ref(false);
    const recordingTime = ref(0);
    let peerConnection = null;
    let screenStream = null;
    let mediaRecorder = null;
    let recordedChunks = [];
    let recordingInterval = null;
    const statusPollInterval = ref(null);
    let offerTimeout = null;
    let isCreatingOffer = false;

    const {
      connected,
      connect,
      disconnect,
      onVideoOffer,
      onVideoAnswer,
      onIceCandidate,
      sendVideoOffer,
      sendVideoAnswer,
      sendIceCandidate,
      startScreenShare: startScreenShareWs,
      stopScreenShare: stopScreenShareWs,
      onConnectionStatusUpdate,
      onSessionCompleted,
    } = useTelemedicine(props.sessionId, props.currentUserId, props.userType, props.accessKey);

    const clientConnectedStatus = ref(props.clientConnected);

    // STUN servers para WebRTC
    const rtcConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const initializeWebRTC = async () => {
      try {
        console.log('[TelemedicineVideoCall] Requesting camera and microphone access...');

        // Verificar que getUserMedia esté disponible
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(
            'getUserMedia no está disponible en este navegador. Por favor, usa un navegador moderno con soporte para WebRTC.'
          );
        }

        // Obtener stream local
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        console.log('[TelemedicineVideoCall] Camera and microphone access granted', {
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
        });

        localStream.value = stream;

        // Usar nextTick para asegurar que el elemento de video esté disponible
        await nextTick();

        if (localVideo.value) {
          localVideo.value.srcObject = stream;
          console.log('[TelemedicineVideoCall] Local video element updated');

          // Forzar play para asegurar que el video se muestre
          try {
            await localVideo.value.play();
            console.log('[TelemedicineVideoCall] Local video playing');
          } catch (playErr) {
            console.warn('[TelemedicineVideoCall] Could not autoplay video:', playErr);
          }
        } else {
          console.warn('[TelemedicineVideoCall] Local video element not found, retrying...');
          // Retry after a short delay
          setTimeout(async () => {
            if (localVideo.value && localStream.value) {
              localVideo.value.srcObject = localStream.value;
              try {
                await localVideo.value.play();
                console.log('[TelemedicineVideoCall] Local video element updated (retry)');
              } catch (playErr) {
                console.warn('[TelemedicineVideoCall] Could not autoplay video (retry):', playErr);
              }
            }
          }, 500);
        }

        // Crear RTCPeerConnection
        peerConnection = new RTCPeerConnection(rtcConfiguration);

        // Agregar stream local a peer connection
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });

        // Manejar stream remoto
        peerConnection.ontrack = async event => {
          console.log('[TelemedicineVideoCall] ontrack event received:', {
            streams: event.streams.length,
            track: event.track.kind,
            trackId: event.track.id,
            trackEnabled: event.track.enabled,
            trackReadyState: event.track.readyState,
            streamsInfo: event.streams.map(s => ({
              id: s.id,
              active: s.active,
              videoTracks: s.getVideoTracks().length,
              audioTracks: s.getAudioTracks().length,
            })),
          });

          if (event.streams && event.streams.length > 0) {
            remoteStream.value = event.streams[0];
            console.log('[TelemedicineVideoCall] Remote stream set:', {
              streamId: remoteStream.value?.id,
              active: remoteStream.value?.active,
              videoTracks: remoteStream.value?.getVideoTracks().length,
              audioTracks: remoteStream.value?.getAudioTracks().length,
            });

            await nextTick();
            if (remoteVideo.value) {
              remoteVideo.value.srcObject = remoteStream.value;
              console.log('[TelemedicineVideoCall] Remote video srcObject set');
              try {
                await remoteVideo.value.play();
                console.log('[TelemedicineVideoCall] Remote video playing');
              } catch (playErr) {
                console.warn('[TelemedicineVideoCall] Could not autoplay remote video:', playErr);
              }
            } else {
              console.warn('[TelemedicineVideoCall] Remote video element not found');
            }
          } else {
            console.warn('[TelemedicineVideoCall] ontrack event has no streams');
          }
        };

        // Manejar ICE candidates
        peerConnection.onicecandidate = event => {
          if (event.candidate) {
            console.log('[TelemedicineVideoCall] ICE candidate generated:', {
              candidate: event.candidate.candidate.substring(0, 50) + '...',
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              sdpMid: event.candidate.sdpMid,
            });
            sendIceCandidate(event.candidate);
          } else {
            console.log('[TelemedicineVideoCall] ICE candidate gathering complete');
          }
        };

        // Monitorear cambios en el estado de la conexión
        peerConnection.oniceconnectionstatechange = () => {
          console.log('[TelemedicineVideoCall] ICE connection state changed:', {
            iceConnectionState: peerConnection.iceConnectionState,
            connectionState: peerConnection.connectionState,
            signalingState: peerConnection.signalingState,
          });
        };

        peerConnection.onconnectionstatechange = () => {
          console.log('[TelemedicineVideoCall] Connection state changed:', {
            connectionState: peerConnection.connectionState,
            iceConnectionState: peerConnection.iceConnectionState,
            signalingState: peerConnection.signalingState,
          });
        };

        // Variable para rastrear si ya se recibió una oferta
        const offerReceived = ref(false);

        // Escuchar ofertas/respuestas de video
        onVideoOffer(async data => {
          console.log('[TelemedicineVideoCall] Received video offer:', {
            from: data.from,
            socketId: data.socketId,
            hasOffer: !!data.offer,
            currentUserId: props.currentUserId,
            userType: props.userType,
            isFromSelf: data.from === props.currentUserId,
            offerType: data.offer?.type,
            offerSdp: data.offer?.sdp?.substring(0, 50) + '...',
          });

          // Aceptar ofertas de otros usuarios (comparar por userId, no socketId)
          if (data.from !== props.currentUserId && data.offer) {
            console.log('[TelemedicineVideoCall] Processing offer from different user:', {
              fromUserId: data.from,
              currentUserId: props.currentUserId,
              willProcess: true,
            });
            // Marcar que se recibió una oferta
            offerReceived.value = true;

            // Verificar que la conexión esté activa
            if (!peerConnection || peerConnection.signalingState === 'closed') {
              console.warn(
                '[TelemedicineVideoCall] Cannot process offer: peerConnection is closed'
              );
              return;
            }

            try {
              console.log('[TelemedicineVideoCall] Processing offer from another user...');
              console.log('[TelemedicineVideoCall] PeerConnection state before processing:', {
                signalingState: peerConnection.signalingState,
                connectionState: peerConnection.connectionState,
              });

              await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
              console.log('[TelemedicineVideoCall] Remote description set, creating answer...');

              // Verificar nuevamente antes de crear la respuesta
              if (peerConnection.signalingState === 'closed') {
                console.warn(
                  '[TelemedicineVideoCall] PeerConnection closed before creating answer'
                );
                return;
              }

              const answer = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answer);
              console.log('[TelemedicineVideoCall] Answer created, sending...');
              sendVideoAnswer(answer);
              console.log('[TelemedicineVideoCall] Answer sent via WebSocket');
            } catch (err) {
              console.error('[TelemedicineVideoCall] Error handling video offer:', err);
              if (err.name === 'InvalidStateError') {
                console.warn(
                  '[TelemedicineVideoCall] InvalidStateError - peerConnection may be closed'
                );
              }
            }
          } else {
            console.log('[TelemedicineVideoCall] Ignoring offer (from self or no offer data)');
          }
        });

        onVideoAnswer(async data => {
          console.log('[TelemedicineVideoCall] Received video answer:', {
            from: data.from,
            socketId: data.socketId,
            hasAnswer: !!data.answer,
            currentUserId: props.currentUserId,
            userType: props.userType,
            isFromSelf: data.from === props.currentUserId,
            answerType: data.answer?.type,
            answerSdp: data.answer?.sdp?.substring(0, 50) + '...',
          });

          if (data.from !== props.currentUserId && data.answer) {
            console.log('[TelemedicineVideoCall] Processing answer from different user:', {
              fromUserId: data.from,
              currentUserId: props.currentUserId,
              willProcess: true,
            });
            // Verificar que la conexión esté activa
            if (!peerConnection || peerConnection.signalingState === 'closed') {
              console.warn(
                '[TelemedicineVideoCall] Cannot process answer: peerConnection is closed'
              );
              return;
            }

            try {
              console.log('[TelemedicineVideoCall] Processing answer from another user...');
              await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
              console.log('[TelemedicineVideoCall] Remote description set from answer');
            } catch (err) {
              console.error('[TelemedicineVideoCall] Error handling video answer:', err);
              if (err.name === 'InvalidStateError') {
                console.warn(
                  '[TelemedicineVideoCall] InvalidStateError - peerConnection may be closed'
                );
              }
            }
          } else {
            console.log('[TelemedicineVideoCall] Ignoring answer (from self or no answer data)');
          }
        });

        onIceCandidate(async data => {
          console.log('[TelemedicineVideoCall] Received ICE candidate:', {
            from: data.from,
            socketId: data.socketId,
            hasCandidate: !!data.candidate,
            currentUserId: props.currentUserId,
            isFromSelf: data.from === props.currentUserId,
          });

          if (data.from !== props.currentUserId && data.candidate) {
            try {
              console.log('[TelemedicineVideoCall] Adding ICE candidate from different user');
              await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
              console.log('[TelemedicineVideoCall] ICE candidate added successfully');
            } catch (err) {
              console.error('[TelemedicineVideoCall] Error adding ICE candidate:', err);
            }
          } else {
            console.log(
              '[TelemedicineVideoCall] Ignoring ICE candidate (from self or no candidate)'
            );
          }
        });

        // Crear oferta después de un breve delay para asegurar que ambos usuarios estén conectados
        // Solo el doctor crea la oferta inicialmente, el paciente espera
        const waitForConnection = () =>
          new Promise(resolve => {
            if (connected.value) {
              resolve();
            } else {
              const checkInterval = setInterval(() => {
                if (connected.value) {
                  clearInterval(checkInterval);
                  resolve();
                }
              }, 100);
              // Timeout después de 5 segundos
              setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
              }, 5000);
            }
          });

        await waitForConnection();

        // Solo el doctor crea la oferta inicialmente
        // El paciente espera a recibir una oferta, y si no recibe una en 3 segundos, crea una
        if (props.userType === 'doctor') {
          // Doctor crea la oferta después de un breve delay
          offerTimeout = setTimeout(async () => {
            // Verificar que la conexión aún esté activa antes de crear la oferta
            if (!peerConnection || peerConnection.signalingState === 'closed') {
              console.warn('[TelemedicineVideoCall] Cannot create offer: peerConnection is closed');
              return;
            }

            if (isCreatingOffer) {
              console.warn(
                '[TelemedicineVideoCall] Offer creation already in progress, skipping...'
              );
              return;
            }

            try {
              isCreatingOffer = true;
              console.log('[TelemedicineVideoCall] Doctor creating offer...');
              console.log('[TelemedicineVideoCall] PeerConnection state:', {
                signalingState: peerConnection.signalingState,
                connectionState: peerConnection.connectionState,
                iceConnectionState: peerConnection.iceConnectionState,
              });

              // Verificar nuevamente el estado antes de crear la oferta
              if (peerConnection.signalingState === 'closed') {
                console.warn('[TelemedicineVideoCall] PeerConnection closed before creating offer');
                isCreatingOffer = false;
                return;
              }

              const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
              });

              // Verificar el estado después de crear la oferta
              if (peerConnection.signalingState === 'closed') {
                console.warn('[TelemedicineVideoCall] PeerConnection closed after creating offer');
                isCreatingOffer = false;
                return;
              }

              await peerConnection.setLocalDescription(offer);
              console.log(
                '[TelemedicineVideoCall] Offer created and local description set, sending...'
              );
              sendVideoOffer(offer);
              console.log('[TelemedicineVideoCall] Offer sent via WebSocket');
              isCreatingOffer = false;
            } catch (err) {
              isCreatingOffer = false;
              console.error('[TelemedicineVideoCall] Error creating offer:', err);
              if (err.name === 'InvalidStateError') {
                console.warn(
                  '[TelemedicineVideoCall] InvalidStateError - peerConnection may be closed'
                );
              } else {
                error.value = 'Error al establecer la conexión de video';
              }
            }
          }, 2000); // Doctor espera 2 segundos
        } else {
          // Paciente espera a recibir una oferta, si no recibe una en 3 segundos, crea una
          offerTimeout = setTimeout(async () => {
            if (offerReceived.value) {
              console.log('[TelemedicineVideoCall] Patient received offer, not creating one');
              return;
            }

            // Verificar que la conexión aún esté activa antes de crear la oferta
            if (!peerConnection || peerConnection.signalingState === 'closed') {
              console.warn('[TelemedicineVideoCall] Cannot create offer: peerConnection is closed');
              return;
            }

            if (isCreatingOffer) {
              console.warn(
                '[TelemedicineVideoCall] Offer creation already in progress, skipping...'
              );
              return;
            }

            // Verificar si ya hay una descripción local (significa que ya se procesó una oferta)
            if (peerConnection.localDescription) {
              console.log(
                '[TelemedicineVideoCall] Patient already has local description, not creating offer'
              );
              return;
            }

            try {
              isCreatingOffer = true;
              console.log(
                '[TelemedicineVideoCall] Patient creating offer (no offer received from doctor)...'
              );
              console.log('[TelemedicineVideoCall] PeerConnection state:', {
                signalingState: peerConnection.signalingState,
                connectionState: peerConnection.connectionState,
                iceConnectionState: peerConnection.iceConnectionState,
              });

              // Verificar nuevamente el estado antes de crear la oferta
              if (peerConnection.signalingState === 'closed') {
                console.warn('[TelemedicineVideoCall] PeerConnection closed before creating offer');
                isCreatingOffer = false;
                return;
              }

              const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
              });

              // Verificar el estado después de crear la oferta
              if (peerConnection.signalingState === 'closed') {
                console.warn('[TelemedicineVideoCall] PeerConnection closed after creating offer');
                isCreatingOffer = false;
                return;
              }

              await peerConnection.setLocalDescription(offer);
              console.log(
                '[TelemedicineVideoCall] Offer created and local description set, sending...'
              );
              sendVideoOffer(offer);
              console.log('[TelemedicineVideoCall] Offer sent via WebSocket');
              isCreatingOffer = false;
            } catch (err) {
              isCreatingOffer = false;
              console.error('[TelemedicineVideoCall] Error creating offer:', err);
              if (err.name === 'InvalidStateError') {
                console.warn(
                  '[TelemedicineVideoCall] InvalidStateError - peerConnection may be closed'
                );
              } else {
                error.value = 'Error al establecer la conexión de video';
              }
            }
          }, 3000); // Paciente espera 3 segundos antes de crear su propia oferta
        }

        loading.value = false;
      } catch (err) {
        console.error('[TelemedicineVideoCall] Error initializing WebRTC:', err);

        // Mensajes de error más específicos
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          error.value =
            'Permisos de cámara y micrófono denegados. Por favor, permite el acceso en la configuración de tu navegador.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          error.value =
            'No se encontraron dispositivos de cámara o micrófono. Por favor, verifica que estén conectados.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          error.value =
            'No se puede acceder a la cámara o micrófono. Puede estar siendo usado por otra aplicación.';
        } else if (
          err.name === 'OverconstrainedError' ||
          err.name === 'ConstraintNotSatisfiedError'
        ) {
          error.value =
            'Las restricciones de video/audio no se pueden satisfacer. Por favor, verifica tu configuración.';
        } else {
          error.value = `Error al acceder a la cámara o micrófono: ${
            err.message || 'Error desconocido'
          }. Por favor, verifica los permisos.`;
        }

        loading.value = false;
      }
    };

    const toggleMute = () => {
      if (localStream.value) {
        const audioTracks = localStream.value.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = isMuted.value;
        });
        isMuted.value = !isMuted.value;
      }
    };

    const toggleVideo = () => {
      if (localStream.value) {
        const videoTracks = localStream.value.getVideoTracks();
        videoTracks.forEach(track => {
          track.enabled = isVideoOff.value;
        });
        isVideoOff.value = !isVideoOff.value;
      }
    };

    const toggleScreenShare = async () => {
      try {
        if (!isScreenSharing.value) {
          // Iniciar compartir pantalla
          screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

          // Reemplazar video track
          const videoTrack = screenStream.getVideoTracks()[0];
          const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }

          // Actualizar video local
          if (localVideo.value) {
            localVideo.value.srcObject = screenStream;
          }

          // Detectar cuando se detiene el compartir
          videoTrack.onended = () => {
            toggleScreenShare();
          };

          startScreenShareWs();
          isScreenSharing.value = true;
        } else {
          // Detener compartir pantalla
          if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
            screenStream = null;
          }

          // Restaurar video track original
          const videoTrack = localStream.value.getVideoTracks()[0];
          const sender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }

          // Restaurar video local
          if (localVideo.value) {
            localVideo.value.srcObject = localStream.value;
          }

          stopScreenShareWs();
          isScreenSharing.value = false;
        }
      } catch (err) {
        console.error('Error toggling screen share:', err);
      }
    };

    const toggleRecording = async () => {
      try {
        if (!isRecording.value) {
          // Start recording
          if (!localStream.value || !remoteStream.value) {
            alert('Esperando conexión de video para grabar');
            return;
          }

          // Create combined stream for recording
          const combinedStream = new MediaStream();

          // Add local video/audio tracks
          localStream.value.getVideoTracks().forEach(track => {
            combinedStream.addTrack(track);
          });
          localStream.value.getAudioTracks().forEach(track => {
            combinedStream.addTrack(track);
          });

          // Add remote video/audio tracks
          remoteStream.value.getVideoTracks().forEach(track => {
            combinedStream.addTrack(track);
          });
          remoteStream.value.getAudioTracks().forEach(track => {
            combinedStream.addTrack(track);
          });

          // Check if MediaRecorder is supported
          if (!MediaRecorder.isTypeSupported('video/webm')) {
            alert('La grabación no es compatible con este navegador');
            return;
          }

          recordedChunks = [];
          mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm;codecs=vp8,opus',
            videoBitsPerSecond: 2500000, // 2.5 Mbps
          });

          mediaRecorder.ondataavailable = event => {
            if (event.data && event.data.size > 0) {
              recordedChunks.push(event.data);
            }
          };

          mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            await saveRecording(blob);
            recordedChunks = [];
          };

          mediaRecorder.start(1000); // Collect data every second
          isRecording.value = true;
          recordingTime.value = 0;

          // Start recording timer
          recordingInterval = setInterval(() => {
            recordingTime.value++;
          }, 1000);
        } else {
          // Stop recording
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
          if (recordingInterval) {
            clearInterval(recordingInterval);
            recordingInterval = null;
          }
          isRecording.value = false;
        }
      } catch (err) {
        console.error('Error toggling recording:', err);
        alert('Error al iniciar/detener la grabación');
      }
    };

    const saveRecording = async blob => {
      try {
        // Upload to backend which will save to S3
        const formData = new FormData();
        formData.append('file', blob, `telemedicine-session-${props.sessionId}-${Date.now()}.webm`);
        formData.append('sessionId', props.sessionId);

        const options = { ...(await getHeaders()) };
        options.headers['Content-Type'] = 'multipart/form-data';

        const response = await requestBackend.post(
          `/telemedicine/sessions/${props.sessionId}/recording/upload`,
          formData,
          options
        );

        if (response.data && response.data.recordingUrl) {
          // Recording URL saved successfully
          console.log('Recording saved:', response.data.recordingUrl);
        }
      } catch (err) {
        console.error('Error saving recording:', err);
        // Fallback: create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `telemedicine-session-${props.sessionId}-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Error al subir la grabación. Se descargará localmente.');
      }
    };

    const formatRecordingTime = seconds => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const endCall = async () => {
      // Only doctors can end the session
      if (props.userType !== 'doctor') {
        console.warn('[TelemedicineVideoCall] Patients cannot end the session');
        return;
      }

      try {
        // Stop recording if active
        if (isRecording.value && mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        if (recordingInterval) {
          clearInterval(recordingInterval);
        }

        // Detener streams
        if (localStream.value) {
          localStream.value.getTracks().forEach(track => track.stop());
        }
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
        }
        if (remoteStream.value) {
          remoteStream.value.getTracks().forEach(track => track.stop());
        }

        // Cerrar peer connection
        if (peerConnection) {
          // Verificar el estado antes de cerrar
          if (peerConnection.signalingState !== 'closed') {
            peerConnection.close();
          }
          peerConnection = null;
        }

        // Finalizar sesión (only doctors can do this)
        await endTelemedicineSession(props.sessionId, {
          notes: 'Consulta finalizada',
        });

        disconnect();
        emit('call-ended');
        emit('close');
      } catch (err) {
        console.error('Error ending call:', err);
        emit('close');
      }
    };

    onMounted(async () => {
      try {
        console.log('[TelemedicineVideoCall] Component mounted', {
          sessionId: props.sessionId,
          currentUserId: props.currentUserId,
          userType: props.userType,
        });

        if (!props.sessionId) {
          throw new Error('Session ID is required');
        }

        if (!props.currentUserId) {
          throw new Error('Current user ID is required');
        }

        // Verificar el estado de la sesión antes de intentar iniciarla
        // Nota: connect() también obtendrá la sesión, así que solo la obtenemos aquí si necesitamos verificar el estado antes de conectar
        let sessionData;
        let sessionStatus;

        // Solo obtener la sesión si necesitamos verificar el estado antes de conectar
        // Si hay un error 429, continuamos de todas formas ya que connect() también intentará obtenerla
        try {
          sessionData = await getTelemedicineSession(props.sessionId);
          console.log('[TelemedicineVideoCall] Current session status:', sessionData.status);
          sessionStatus = sessionData?.status?.toUpperCase();
        } catch (err) {
          // Si es un error 429, no bloqueamos - connect() intentará obtenerla después
          if (err.response?.status === 429) {
            console.warn('[TelemedicineVideoCall] Rate limited, will try again in connect()');
            sessionStatus = undefined; // Continuar sin saber el estado
          } else {
            console.warn('[TelemedicineVideoCall] Could not fetch session data:', err);
            sessionStatus = undefined;
          }
        }

        // Solo iniciar la sesión si está en estado SCHEDULED
        if (sessionStatus === 'SCHEDULED' || sessionStatus === 'scheduled') {
          console.log('[TelemedicineVideoCall] Starting telemedicine session...');
          try {
            await startTelemedicineSession(props.sessionId);
            console.log('[TelemedicineVideoCall] Session started successfully');
          } catch (err) {
            // Si el error es 400, puede ser que la sesión ya cambió de estado
            if (err.response?.status === 400) {
              console.warn(
                '[TelemedicineVideoCall] Session start failed (might already be active), verifying...'
              );
              // Intentar obtener la sesión de nuevo para verificar el estado
              try {
                sessionData = await getTelemedicineSession(props.sessionId);
                const newStatus = sessionData.status?.toUpperCase();
                if (newStatus === 'ACTIVE' || newStatus === 'active') {
                  console.log('[TelemedicineVideoCall] Session is already active, continuing...');
                } else {
                  throw err; // Re-throw si realmente hay un problema
                }
              } catch (fetchErr) {
                throw err; // Re-throw el error original si no podemos verificar
              }
            } else {
              throw err; // Re-throw otros errores
            }
          }
        } else if (sessionStatus === 'ACTIVE' || sessionStatus === 'active') {
          console.log('[TelemedicineVideoCall] Session is already active, skipping start');
        } else {
          console.warn(
            '[TelemedicineVideoCall] Session status is',
            sessionStatus,
            '- attempting to start anyway'
          );
          try {
            await startTelemedicineSession(props.sessionId);
          } catch (err) {
            // Si falla, continuar de todas formas si la sesión está activa
            if (err.response?.status === 400) {
              console.warn('[TelemedicineVideoCall] Could not start session, but continuing...');
            } else {
              throw err;
            }
          }
        }

        // Conectar WebSocket
        console.log('[TelemedicineVideoCall] Connecting to WebSocket...');
        await connect();

        // Inicializar WebRTC (esto solicitará permisos de cámara/micrófono)
        console.log(
          '[TelemedicineVideoCall] Initializing WebRTC (requesting camera/microphone permissions)...'
        );
        await initializeWebRTC();
        console.log('[TelemedicineVideoCall] WebRTC initialized successfully');

        // Marcar como conectado según el tipo de usuario
        try {
          if (props.userType === 'patient') {
            await markPatientConnected(props.sessionId);
            console.log('[TelemedicineVideoCall] Patient marked as connected');
          } else if (props.userType === 'doctor') {
            await markDoctorConnected(props.sessionId);
            console.log('[TelemedicineVideoCall] Doctor marked as connected');
          }
        } catch (err) {
          console.warn('[TelemedicineVideoCall] Failed to mark as connected:', err);
          // No bloquear el flujo si falla el tracking
        }

        // Listen for session completion notification from WebSocket
        onSessionCompleted(data => {
          console.log('[TelemedicineVideoCall] Session completed notification received:', data);
          if (statusPollInterval.value) {
            clearInterval(statusPollInterval.value);
            statusPollInterval.value = null;
          }
          // Close peer connection
          if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
          }
          // Stop local stream
          if (localStream.value) {
            localStream.value.getTracks().forEach(track => track.stop());
          }
          // Emit events to parent component
          emit('session-ended');
          emit('close');
        });

        // Iniciar polling para verificar si la sesión fue cerrada por el doctor (solo para pacientes)
        // Usar un intervalo más largo para evitar rate limiting (429)
        if (props.userType === 'patient') {
          let consecutiveErrors = 0;
          const pollSessionStatus = async () => {
            try {
              const session = await getTelemedicineSession(props.sessionId);
              consecutiveErrors = 0; // Reset error counter on success

              if (session.status === 'completed' || session.status === 'cancelled') {
                if (statusPollInterval.value) {
                  clearInterval(statusPollInterval.value);
                  statusPollInterval.value = null;
                }
                // Emitir evento para que el componente padre maneje el cierre
                emit('session-ended');
                emit('close');
              }
            } catch (err) {
              consecutiveErrors++;
              // Si recibimos 429, pausar temporalmente
              if (err.response?.status === 429) {
                console.warn(
                  '[TelemedicineVideoCall] Rate limited during polling, pausing for 15 seconds'
                );
                // Pausar el polling por 15 segundos si hay rate limiting
                if (statusPollInterval.value) {
                  clearInterval(statusPollInterval.value);
                  statusPollInterval.value = null;
                  // Reanudar después de 15 segundos
                  setTimeout(() => {
                    if (props.userType === 'patient' && !statusPollInterval.value) {
                      statusPollInterval.value = setInterval(pollSessionStatus, 15000); // Usar intervalo más largo
                    }
                  }, 15000);
                }
              } else if (consecutiveErrors >= 3) {
                // Si hay 3 errores consecutivos (que no sean 429), pausar el polling
                console.warn('[TelemedicineVideoCall] Too many polling errors, pausing');
                if (statusPollInterval.value) {
                  clearInterval(statusPollInterval.value);
                  statusPollInterval.value = null;
                }
              } else {
                console.error('[TelemedicineVideoCall] Error polling session status:', err);
              }
            }
          };

          statusPollInterval.value = setInterval(pollSessionStatus, 10000); // Poll cada 10 segundos en lugar de 3 para reducir carga
        }

        // Add event listeners to prevent videos from pausing when hidden
        if (localVideo.value) {
          localVideo.value.addEventListener('pause', (e) => {
            e.target.play().catch(() => {});
          });
        }

        if (remoteVideo.value) {
          remoteVideo.value.addEventListener('pause', (e) => {
            e.target.play().catch(() => {});
          });
        }

        // Keep videos playing even when hidden
        const keepVideosPlaying = () => {
          if (localVideo.value && localStream.value && localVideo.value.paused) {
            localVideo.value.play().catch(() => {});
          }
          if (remoteVideo.value && remoteStream.value && remoteVideo.value.paused) {
            remoteVideo.value.play().catch(() => {});
          }
        };

        // Check every second to ensure videos keep playing
        const videoKeepAliveInterval = setInterval(keepVideosPlaying, 1000);

        // Add Page Visibility API listener to prevent pause when tab becomes inactive
        const handleVisibilityChange = () => {
          setTimeout(() => {
            keepVideosPlaying();
          }, 100);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Store references for cleanup
        window.__telemedicineVideoKeepAlive = videoKeepAliveInterval;
        window.__telemedicineVisibilityHandler = handleVisibilityChange;
      } catch (err) {
        console.error('[TelemedicineVideoCall] Error starting video call:', err);
        error.value = err.message || 'Error al iniciar la videollamada';
        loading.value = false;
      }
    });

    onUnmounted(() => {
      // Clean up video keep alive interval
      if (window.__telemedicineVideoKeepAlive) {
        clearInterval(window.__telemedicineVideoKeepAlive);
        delete window.__telemedicineVideoKeepAlive;
      }

      // Clean up visibility handler
      if (window.__telemedicineVisibilityHandler) {
        document.removeEventListener('visibilitychange', window.__telemedicineVisibilityHandler);
        delete window.__telemedicineVisibilityHandler;
      }

      // Stop recording if active
      if (isRecording.value && mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
      // Clear status polling interval
      if (statusPollInterval.value) {
        clearInterval(statusPollInterval.value);
        statusPollInterval.value = null;
      }

      // Limpiar recursos
      if (localStream.value) {
        localStream.value.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
      disconnect();
    });

    // Watch for localVideo element to be available
    watch(
      localVideo,
      async newVal => {
        if (newVal && localStream.value && !newVal.srcObject) {
          newVal.srcObject = localStream.value;

          // Add pause listener to prevent auto-pause
          newVal.addEventListener('pause', (e) => {
            e.target.play().catch(() => {});
          });

          try {
            await newVal.play();
          } catch (playErr) {
            // Autoplay might be blocked by browser
          }
        }
      },
      { immediate: true }
    );

    // Watch for remoteVideo element to be available
    watch(
      remoteVideo,
      async newVal => {
        if (newVal && remoteStream.value && !newVal.srcObject) {
          newVal.srcObject = remoteStream.value;

          // Add pause listener to prevent auto-pause
          newVal.addEventListener('pause', (e) => {
            e.target.play().catch(() => {});
          });

          try {
            await newVal.play();
          } catch (playErr) {
            // Autoplay might be blocked by browser
          }
        }
      },
      { immediate: true }
    );

    // Watch for localStream changes
    watch(localStream, async newStream => {
      if (newStream && localVideo.value) {
        await nextTick();
        if (!localVideo.value.srcObject) {
          console.log(
            '[TelemedicineVideoCall] Setting local stream to video element (stream watch)'
          );
          localVideo.value.srcObject = newStream;
          try {
            await localVideo.value.play();
          } catch (playErr) {
            console.warn(
              '[TelemedicineVideoCall] Could not autoplay video (stream watch):',
              playErr
            );
          }
        }
      }
    });

    // Watch for remoteStream changes
    watch(remoteStream, async newStream => {
      if (newStream && remoteVideo.value) {
        await nextTick();
        if (!remoteVideo.value.srcObject) {
          console.log(
            '[TelemedicineVideoCall] Setting remote stream to video element (stream watch)'
          );
          remoteVideo.value.srcObject = newStream;
          try {
            await remoteVideo.value.play();
          } catch (playErr) {
            console.warn(
              '[TelemedicineVideoCall] Could not autoplay remote video (stream watch):',
              playErr
            );
          }
        }
      }
    });

    return {
      loading,
      error,
      localVideo,
      remoteVideo,
      localStream,
      remoteStream,
      connected,
      isMuted,
      isVideoOff,
      isScreenSharing,
      isRecording,
      recordingTime,
      clientConnectedStatus,
      toggleMute,
      toggleVideo,
      toggleScreenShare,
      toggleRecording,
      formatRecordingTime,
      endCall,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.telemedicine-video-call {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 800px;
  padding: 0;
  overflow: hidden;
}

.video-call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--gradient-primary);
  color: white;
}

.video-call-header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.video-call-header-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius-md);
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.video-call-header-title h5 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.video-call-body {
  flex: 1;
  position: relative;
  background: #000;
  overflow: hidden;
}

.video-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  height: 100%;
  padding: 0.5rem;
}

.video-wrapper {
  position: relative;
  background: #1a1a1a;
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
  min-width: 1px !important;
  min-height: 1px !important;
}

.video-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.75rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.video-label {
  font-weight: 600;
  font-size: 0.875rem;
}

.video-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  opacity: 0.8;
}

.error-state {
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.video-call-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color);
  background: white;
}

.controls-group {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  justify-content: center;
  align-items: center;
}

.btn-control {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: linear-gradient(145deg, #f8fafc, #e2e8f0);
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  position: relative;
}

.btn-control:hover:not(:disabled) {
  background: linear-gradient(145deg, #e2e8f0, #cbd5e1);
  transform: translateY(-1px);
  box-shadow: 0 8px 12px -2px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  color: #334155;
}

.btn-control:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f1f5f9;
  color: #94a3b8;
  box-shadow: none;
}

.btn-control-active {
  background: linear-gradient(145deg, #3b82f6, #2563eb);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-control-active:hover:not(:disabled) {
  background: linear-gradient(145deg, #2563eb, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn-control-danger {
  background: linear-gradient(145deg, #ef4444, #dc2626);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-control-danger:hover:not(:disabled) {
  background: linear-gradient(145deg, #dc2626, #b91c1c);
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn-control-recording {
  background: linear-gradient(145deg, #ef4444, #dc2626);
  color: white;
  border-color: rgba(255, 255, 255, 0.2);
  animation: pulse-recording 2s infinite;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-control-recording:hover:not(:disabled) {
  background: linear-gradient(145deg, #dc2626, #b91c1c);
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Focus states for accessibility */
.btn-control:focus {
  outline: none;
  ring: 2px;
  ring-color: #3b82f6;
  ring-offset: 2px;
  ring-offset-color: #ffffff;
}

.btn-control-active:focus {
  ring-color: #60a5fa;
}

.btn-control-danger:focus,
.btn-control-recording:focus {
  ring-color: #f87171;
}

/* Additional enhancement for inactive buttons */
.btn-control:not(.btn-control-active):not(.btn-control-danger):not(.btn-control-recording) {
  background: linear-gradient(145deg, #f8fafc, #e2e8f0);
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-control:not(.btn-control-active):not(.btn-control-danger):not(.btn-control-recording):hover {
  background: linear-gradient(145deg, #e2e8f0, #cbd5e1);
  color: #475569;
  border-color: #cbd5e1;
}

.recording-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: blink-recording 1s infinite;
}

@keyframes pulse-recording {
  0% {
    transform: scale(1);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.35), 0 3px 6px rgba(0, 0, 0, 0.15);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25), 0 2px 4px rgba(0, 0, 0, 0.1);
  }
}

@keyframes blink-recording {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

@media (max-width: 768px) {
  .video-container {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .video-call-controls {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .btn-control {
    width: 44px;
    height: 44px;
    font-size: 1.1rem;
  }
}
</style>
