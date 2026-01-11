import { requestBackend } from '../api';

/**
 * Internal Messaging Service
 *
 * Proporciona métodos para interactuar con el sistema de mensajería interna
 * incluyendo notificaciones, chat y broadcast.
 */
export default {
  /**
   * Obtiene el inbox del usuario con filtros opcionales
   * @param {Object} filters - Filtros para el inbox
   * @param {string} filters.type - Tipo de mensaje (notification, chat, broadcast)
   * @param {string} filters.category - Categoría del mensaje
   * @param {string} filters.priority - Prioridad del mensaje
   * @param {string} filters.status - Estado del mensaje
   * @param {boolean} filters.unreadOnly - Solo mensajes no leídos
   * @param {string} filters.conversationId - ID de conversación
   * @param {number} filters.limit - Límite de resultados
   * @param {Date} filters.before - Mensajes antes de esta fecha
   * @returns {Promise<Object>} Respuesta con mensajes y metadata
   */
  async getInbox(filters = {}) {
    const params = new URLSearchParams();

    if (filters.type) params.append('type', filters.type);
    if (filters.category) params.append('category', filters.category);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.status) params.append('status', filters.status);
    if (filters.unreadOnly !== undefined) params.append('unreadOnly', filters.unreadOnly);
    if (filters.conversationId) params.append('conversationId', filters.conversationId);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.before) params.append('before', filters.before.toISOString());

    const queryString = params.toString();
    const url = `/internal-message/inbox${queryString ? `?${queryString}` : ''}`;

    return (await requestBackend.get(url)).data;
  },

  /**
   * Marca un mensaje como leído
   * @param {string} messageId - ID del mensaje
   * @returns {Promise<Object>} Mensaje actualizado
   */
  async markAsRead(messageId) {
    try {
      return (await requestBackend.patch(`/internal-message/${messageId}/read`, {})).data;
    } catch (error) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.message || '';
      // Tratar 404 como idempotente: ya no existe o ya está leído
      if (status === 404 || /not found/i.test(msg)) {
        // Silenciar 404 para evitar spam en consola
        return { skipped: true };
      }
      throw error;
    }
  },

  /**
   * Marca múltiples mensajes como leídos
   * @param {Array<string>} messageIds - IDs de mensajes
   * @returns {Promise<Object>} Resultado de la operación
   */
  async bulkMarkAsRead(messageIds) {
    try {
      return (await requestBackend.post('/internal-message/bulk/read', { messageIds })).data;
    } catch (error) {
      const status = error?.response?.status;
      // Para robustez, si backend retorna 404 en bulk (raro), no romper el flujo
      if (status === 404) {
        if (import.meta.env?.DEV) {
          console.warn('[InternalMessage] bulkMarkAsRead 404 ignorado:', messageIds);
        }
        return { skipped: true, updated: 0 };
      }
      throw error;
    }
  },

  /**
   * Archiva un mensaje
   * @param {string} messageId - ID del mensaje
   * @returns {Promise<Object>} Mensaje actualizado
   */
  async archiveMessage(messageId) {
    return (await requestBackend.patch(`/internal-message/${messageId}/archive`, {})).data;
  },

  /**
   * Archiva múltiples mensajes
   * @param {Array<string>} messageIds - IDs de mensajes
   * @returns {Promise<Object>} Resultado de la operación
   */
  async bulkArchive(messageIds) {
    return (await requestBackend.post('/internal-message/bulk/archive', { messageIds })).data;
  },

  /**
   * Envía un mensaje (chat)
   * @param {Object} data - Datos del mensaje
   * @param {string} data.recipientId - ID del destinatario
   * @param {string} data.recipientType - Tipo de destinatario
   * @param {string} data.content - Contenido del mensaje
   * @param {string} data.conversationId - ID de conversación (opcional)
   * @param {string} data.parentMessageId - ID de mensaje padre (opcional)
   * @returns {Promise<Object>} Mensaje creado
   */
  async sendMessage(data) {
    return (await requestBackend.post('/internal-message/send', data)).data;
  },

  /**
   * Envía una notificación del sistema
   * @param {Object} data - Datos de la notificación
   * @param {string} data.category - Categoría del mensaje
   * @param {string} data.priority - Prioridad (normal, high, urgent, low)
   * @param {string} data.title - Título
   * @param {string} data.content - Contenido
   * @param {string} data.recipientId - ID del destinatario
   * @param {string} data.recipientType - Tipo de destinatario
   * @returns {Promise<Object>} Notificación creada
   */
  async sendSystemNotification(data) {
    return (await requestBackend.post('/internal-message/system-notification', data)).data;
  },

  /**
   * Obtiene o crea una conversación con otro usuario
   * @param {string} recipientId - ID del destinatario
   * @param {string} recipientType - Tipo de destinatario (user, collaborator)
   * @returns {Promise<Object>} Conversación
   */
  async getOrCreateConversation(recipientId, recipientType) {
    return (
      await requestBackend.post('/internal-message/conversations', {
        recipientId,
        recipientType,
      })
    ).data;
  },

  /**
   * Obtiene estadísticas de mensajes del usuario
   * @returns {Promise<Object>} Estadísticas (total, unread, byPriority)
   */
  async getStats() {
    return (await requestBackend.get('/internal-message/stats')).data;
  },

  /**
   * Obtiene un mensaje por ID
   * @param {string} messageId - ID del mensaje
   * @returns {Promise<Object>} Mensaje
   */
  async getMessage(messageId) {
    return (await requestBackend.get(`/internal-message/${messageId}`)).data;
  },

  /**
   * Obtiene mensajes de una conversación
   * @param {string} conversationId - ID de la conversación
   * @param {number} limit - Límite de resultados
   * @param {Date} before - Mensajes antes de esta fecha
   * @returns {Promise<Object>} Mensajes de la conversación
   */
  async getConversationMessages(conversationId, limit = 50, before = null) {
    const params = new URLSearchParams();
    params.append('conversationId', conversationId);
    params.append('limit', limit);
    if (before) params.append('before', before.toISOString());

    return (
      await requestBackend.get(
        `/internal-message/conversations/${conversationId}?${params.toString()}`
      )
    ).data;
  },
};
