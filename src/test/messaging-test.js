/**
 * Script de Prueba del Sistema de Mensajería Interna
 *
 * Este script te permite probar todas las funcionalidades del sistema
 * desde la consola del navegador.
 *
 * INSTRUCCIONES:
 * 1. Abre la aplicación en el navegador
 * 2. Abre la consola de desarrollador (F12)
 * 3. Copia y pega este código
 * 4. Ejecuta los comandos de prueba
 *
 * COMANDOS DISPONIBLES:
 *
 * // Enviar notificación de prueba
 * await testMessaging.sendTestNotification();
 *
 * // Enviar notificación urgente
 * await testMessaging.sendUrgentNotification();
 *
 * // Enviar múltiples notificaciones
 * await testMessaging.sendMultipleNotifications(5);
 *
 * // Ver estadísticas
 * await testMessaging.getStats();
 *
 * // Marcar todas como leídas
 * await testMessaging.markAllAsRead();
 */

import internalMessageService from '@/application/services/internal-message';

const testMessaging = {
  // Obtener el userId actual del store
  getUserId() {
    // Ajusta según tu store
    return window.__VUE_APP__?.config?.globalProperties?.$store?.state?.user?.uid ||
           localStorage.getItem('userId') ||
           'TEST_USER_ID';
  },

  // Enviar notificación de prueba básica
  async sendTestNotification() {
    try {
      const response = await fetch('/api/test/send-test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          recipientId: this.getUserId(),
          title: '🎉 Notificación de Prueba',
          content: 'Este es un mensaje de prueba del sistema de mensajería interna',
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error:', error);
    }
  },

  // Enviar notificación urgente
  async sendUrgentNotification() {
    try {
      const response = await fetch('/api/test/send-test-urgent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          recipientId: this.getUserId(),
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error:', error);
    }
  },

  // Simular notificación de stock bajo
  async sendStockNotification() {
    try {
      const response = await fetch('/api/test/send-test-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          recipientId: this.getUserId(),
          productName: 'Producto de Prueba XYZ',
          currentStock: 3,
          minStock: 10,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error:', error);
    }
  },

  // Simular notificación de reserva
  async sendBookingNotification() {
    try {
      const response = await fetch('/api/test/send-test-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          recipientId: this.getUserId(),
          serviceName: 'Consulta Médica',
          date: new Date().toLocaleDateString(),
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error:', error);
    }
  },

  // Simular notificación de pago
  async sendPaymentNotification() {
    try {
      const response = await fetch('/api/test/send-test-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          recipientId: this.getUserId(),
          amount: 150.50,
          currency: 'USD',
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error:', error);
    }
  },

  // Enviar múltiples notificaciones
  async sendMultipleNotifications(count = 5) {
    try {
      const response = await fetch('/api/test/send-test-multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          recipientId: this.getUserId(),
          count,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error:', error);
    }
  },

  // Obtener estadísticas
  async getStats() {
    try {
      const response = await internalMessageService.getStats();
      return response;
    } catch (error) {
      console.error('❌ Error:', error);
    }
  },

  // Obtener inbox
  async getInbox() {
    try {
      const response = await internalMessageService.getInbox({
        limit: 20,
      });
      return response;
    } catch (error) {
      console.error('❌ Error:', error);
    }
  },

  // Marcar todas como leídas
  async markAllAsRead() {
    try {
      const inbox = await internalMessageService.getInbox({ unreadOnly: true });
      const unreadIds = inbox.data.messages.map(m => m.id);

      if (unreadIds.length === 0) {
        return;
      }

      await internalMessageService.bulkMarkAsRead(unreadIds);
    } catch (error) {
      console.error('❌ Error:', error);
    }
  },

  // Probar todo el flujo
  async testFullFlow() {
    await this.getStats();
    await this.delay(1000);

    await this.sendTestNotification();
    await this.delay(2000);

    await this.sendUrgentNotification();
    await this.delay(2000);

    await this.sendStockNotification();
    await this.delay(2000);

    await this.sendBookingNotification();
    await this.delay(2000);

    await this.sendPaymentNotification();
    await this.delay(2000);

    await this.getInbox();
    await this.delay(1000);

    await this.getStats();
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};

// Exponer globalmente para uso en consola
window.testMessaging = testMessaging;

export default testMessaging;
