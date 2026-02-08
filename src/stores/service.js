import { defineStore } from 'pinia';
import {
  getActiveServicesByCommerceId,
  getServiceById,
  getServicesById,
  getServiceByCommerce
} from '../application/services/service';

export const useServiceStore = defineStore('service', {
  state: () => ({
    services: [],
    loading: false,
    error: null,
  }),

  getters: {
    getServiceById: (state) => (id) => {
      return state.services.find(service => service.id === id);
    },

    getActiveServices: (state) => {
      return state.services.filter(service => service.active && service.available);
    }
  },

  actions: {
    async fetchActiveServicesByCommerce(commerceId) {
      this.loading = true;
      this.error = null;
      try {
        const services = await getActiveServicesByCommerceId(commerceId);
        this.services = services || [];
        return services;
      } catch (error) {
        this.error = error.message;
        this.services = [];
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchServiceById(id) {
      this.loading = true;
      this.error = null;
      try {
        const service = await getServiceById(id);
        if (service) {
          // Add or update service in store
          const existingIndex = this.services.findIndex(s => s.id === id);
          if (existingIndex !== -1) {
            this.services[existingIndex] = service;
          } else {
            this.services.push(service);
          }
        }
        return service;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchServicesByCommerce(commerceId) {
      this.loading = true;
      this.error = null;
      try {
        const services = await getServiceByCommerce(commerceId);
        this.services = services || [];
        return services;
      } catch (error) {
        this.error = error.message;
        this.services = [];
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchServicesByIds(ids) {
      if (!ids || ids.length === 0) {
        return [];
      }

      this.loading = true;
      this.error = null;
      try {
        const services = await getServicesById(ids);
        // Update store with fetched services
        if (services && services.length > 0) {
          services.forEach(service => {
            const existingIndex = this.services.findIndex(s => s.id === service.id);
            if (existingIndex !== -1) {
              this.services[existingIndex] = service;
            } else {
              this.services.push(service);
            }
          });
        }
        return services || [];
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearServices() {
      this.services = [];
      this.error = null;
      this.loading = false;
    }
  },
});