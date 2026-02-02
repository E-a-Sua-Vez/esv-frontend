import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import {
  getTelemedicineSession,
  startTelemedicineSession,
} from '../application/services/telemedicine';

/**
 * Composable para manejar conexión WebSocket de telemedicina
 */
export function useTelemedicine(sessionId, userId, userType, accessKey = null) {
  const socket = ref(null);
  const connected = ref(false);
  const error = ref(null);
  const roomId = ref(null);
  const session = ref(null);

  // Connection status callbacks - moved outside connect() to be available immediately
  const connectionStatusCallbacks = [];

  // Session completion callbacks
  const sessionCompletedCallbacks = [];

  // Method to subscribe to connection status updates
  const onConnectionStatusUpdate = callback => {
    connectionStatusCallbacks.push(callback);
    return () => {
      const index = connectionStatusCallbacks.indexOf(callback);
      if (index > -1) {
        connectionStatusCallbacks.splice(index, 1);
      }
    };
  };

  // Method to subscribe to session completion events
  const onSessionCompleted = callback => {
    sessionCompletedCallbacks.push(callback);
    return () => {
      const index = sessionCompletedCallbacks.indexOf(callback);
      if (index > -1) {
        sessionCompletedCallbacks.splice(index, 1);
      }
    };
  };

  const connect = async () => {
    try {
      // Obtener sesión para obtener roomId
      // Si ya tenemos la sesión y el roomId, reutilizarlos para evitar llamadas duplicadas
      if (!session.value || !roomId.value) {
        try {
          const sessionData = await getTelemedicineSession(sessionId);
          session.value = sessionData;
          roomId.value = sessionData.roomId;
        } catch (err) {
          // Si es un error 429, intentar usar datos existentes si están disponibles
          if (err.response?.status === 429 && session.value && session.value.roomId) {
            console.warn('[useTelemedicine] Rate limited, using cached session data');
            roomId.value = session.value.roomId;
          } else {
            throw err; // Re-throw otros errores
          }
        }
      } else {
        // Ya tenemos la sesión, usar el roomId existente
        roomId.value = session.value.roomId;
      }

      // Si ya hay una conexión activa, no crear una nueva
      if (socket.value && socket.value.connected && connected.value) {
        return;
      }

      // Si hay un socket pero no está conectado, desconectarlo primero
      if (socket.value && !socket.value.connected) {
        socket.value.disconnect();
        socket.value = null;
      }

      // Conectar a WebSocket
      // Use backend URL for WebSocket connection
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      // Socket.io connects to the same server as the backend API
      // The namespace '/telemedicine' is specified in the gateway configuration
      // Parse the URL to ensure proper format
      const url = new URL(backendUrl);
      const socketUrl = `${url.protocol}//${url.host}/telemedicine`;

      // Prepare auth object for socket connection
      const auth = {};

      // For patients, use access key authentication
      if (userType === 'patient' && accessKey) {
        auth.accessKey = accessKey;
        auth.sessionId = sessionId;
      } else if (userType === 'doctor') {
        // For doctors, try to get Firebase token
        try {
          const { getCurrentUser } = await import('../application/firebase');
          const token = await getCurrentUser();
          if (token && typeof token === 'string') {
            auth.token = token;
          } else {
            // Try alternative method - get auth directly
            const { getAuth } = await import('firebase/auth');
            const firebaseAuth = getAuth();
            const currentUser = firebaseAuth.currentUser;
            if (currentUser) {
              const firebaseToken = await currentUser.getIdToken();
              if (firebaseToken) {
                auth.token = firebaseToken;
              }
            }
          }
        } catch (err) {
          console.warn('[useTelemedicine] Could not get Firebase token for doctor:', err);
          // Continue without token - server might authenticate via other means
        }
      }

      socket.value = io(socketUrl, {
        transports: ['websocket', 'polling'], // Use websocket first, fallback to polling
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
        forceNew: true,
        path: '/socket.io/', // Default Socket.IO path
        auth: Object.keys(auth).length > 0 ? auth : undefined, // Only include auth if we have credentials
      });

      // Configurar listeners antes de esperar la conexión
      socket.value.on('disconnect', reason => {
        connected.value = false;
        console.warn('[useTelemedicine] Socket disconnected:', reason);
      });

      socket.value.on('connect_error', err => {
        connected.value = false;
        error.value = err;
        console.error('[useTelemedicine] WebSocket connection error:', err);
      });

      socket.value.on('error', err => {
        error.value = err;
        console.error('[useTelemedicine] WebSocket error:', err);
      });

      socket.value.on('user-joined', data => {
        // Emit event for connection status updates
        if (socket.value && socket.value.connected) {
          socket.value.emit('connection-status', {
            sessionId,
            userId,
            userType,
            connected: true,
          });
        }
      });

      socket.value.on('user-left', data => {
        // Emit event for connection status updates
        if (socket.value && socket.value.connected) {
          socket.value.emit('connection-status', {
            sessionId,
            userId,
            userType,
            connected: false,
          });
        }
      });

      // Listen for connection status updates from other users
      socket.value.on('connection-status-update', data => {
        connectionStatusCallbacks.forEach(callback => callback(data));
      });

      // Listen for room join confirmation (if the server emits one)
      socket.value.on('joined-room', data => {
        if (socket.value && socket.value.connected) {
          connected.value = true;
        }
      });

      // Listen for session completion notification
      socket.value.on('session-completed', data => {
        // Call all registered session completion callbacks
        sessionCompletedCallbacks.forEach(callback => callback(data));
      });

      // Listen for room join errors
      socket.value.on('error', err => {
        if (err.message && err.message.includes('Unauthorized')) {
          console.error('[useTelemedicine] Room join failed - unauthorized');
          connected.value = false;
        }
      });

      // Esperar a que el socket se conecte antes de continuar
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 20000);

        socket.value.once('connect', () => {
          clearTimeout(timeout);

          // Set connected immediately when socket connects
          connected.value = true;
          error.value = null;

          // Unirse a la sala
          socket.value.emit('join-room', {
            sessionId,
            roomId: roomId.value,
            userId,
            userType, // 'doctor' | 'patient'
          });

          resolve();
        });

        socket.value.once('connect_error', err => {
          clearTimeout(timeout);
          console.error('[useTelemedicine] Connection error:', err);
          reject(err);
        });
      });
    } catch (err) {
      error.value = err.message || 'Error connecting to telemedicine service';
      console.error('Error connecting:', err);
    }
  };

  const disconnect = () => {
    if (socket.value) {
      socket.value.emit('leave-room', { roomId: roomId.value });
      socket.value.disconnect();
      socket.value = null;
      connected.value = false;
    }
  };

  const sendMessage = message => {
    if (socket.value && connected.value) {
      socket.value.emit('send-message', {
        sessionId,
        senderId: userId,
        senderType: userType,
        message,
      });
    }
  };

  const onMessage = callback => {
    if (socket.value) {
      socket.value.on('new-message', callback);
    }
  };

  const onVideoOffer = callback => {
    if (socket.value) {
      socket.value.on('video-offer', data => {
        callback(data);
      });
    }
  };

  const onVideoAnswer = callback => {
    if (socket.value) {
      socket.value.on('video-answer', data => {
        callback(data);
      });
    }
  };

  const onIceCandidate = callback => {
    if (socket.value) {
      socket.value.on('ice-candidate', data => {
        callback(data);
      });
    }
  };

  const sendVideoOffer = offer => {
    // Check both the ref and actual socket connection state
    const isConnected = socket.value && (socket.value.connected || connected.value);
    if (isConnected) {
      socket.value.emit('video-offer', {
        roomId: roomId.value,
        offer,
      });
    } else {
      console.warn('[useTelemedicine] Cannot send video-offer: socket not connected', {
        hasSocket: !!socket.value,
        socketConnected: socket.value?.connected,
        connectedRef: connected.value,
      });
    }
  };

  const sendVideoAnswer = answer => {
    // Check both the ref and actual socket connection state
    const isConnected = socket.value && (socket.value.connected || connected.value);
    if (isConnected) {
      socket.value.emit('video-answer', {
        roomId: roomId.value,
        answer,
      });
    } else {
      console.warn('[useTelemedicine] Cannot send video-answer: socket not connected', {
        hasSocket: !!socket.value,
        socketConnected: socket.value?.connected,
        connectedRef: connected.value,
      });
    }
  };

  const sendIceCandidate = candidate => {
    // Check both the ref and actual socket connection state
    const isConnected = socket.value && (socket.value.connected || connected.value);
    if (isConnected) {
      socket.value.emit('ice-candidate', {
        roomId: roomId.value,
        candidate,
      });
    } else {
      console.warn('[useTelemedicine] Cannot send ice-candidate: socket not connected', {
        hasSocket: !!socket.value,
        socketConnected: socket.value?.connected,
        connectedRef: connected.value,
      });
    }
  };

  const startScreenShare = () => {
    if (socket.value && connected.value) {
      socket.value.emit('screen-share-start', { roomId: roomId.value });
    }
  };

  const stopScreenShare = () => {
    if (socket.value && connected.value) {
      socket.value.emit('screen-share-stop', { roomId: roomId.value });
    }
  };

  onUnmounted(() => {
    disconnect();
  });

  return {
    socket,
    connected,
    error,
    roomId,
    session,
    connect,
    disconnect,
    sendMessage,
    onMessage,
    onVideoOffer,
    onVideoAnswer,
    onIceCandidate,
    sendVideoOffer,
    sendVideoAnswer,
    sendIceCandidate,
    startScreenShare,
    stopScreenShare,
    onConnectionStatusUpdate,
    onSessionCompleted,
  };
}
