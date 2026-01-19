import { defineStore } from 'pinia';
import {
  getProfessionalById,
  getProfessionalsByCommerce,
  getActiveProfessionalsByCommerce,
  getAvailableProfessionalsForService,
  createProfessional,
  updateProfessional,
} from '../application/services/professional';

export const professionalStore = defineStore('professionalStore', {
  state: () => ({
    professionals: [],
    currentProfessional: null,
    loading: false,
    error: null,
  }),
  getters: {
    getProfessionals: state => state.professionals,
    getCurrentProfessional: state => state.currentProfessional,
    isLoading: state => state.loading,
    getError: state => state.error,
    getActiveProfessionals: state => state.professionals.filter(p => p.active && p.available),
    getProfessionalsByType: state => type =>
      state.professionals.filter(p => p.professionalInfo?.professionalType === type),
  },
  actions: {
    async fetchProfessionalById(id) {
      this.loading = true;
      this.error = null;
      try {
        const professional = await getProfessionalById(id);
        this.currentProfessional = professional;
        return professional;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchProfessionalsByCommerce(commerceId) {
      this.loading = true;
      this.error = null;
      try {
        const professionals = await getProfessionalsByCommerce(commerceId);
        this.professionals = professionals || [];
        return professionals;
      } catch (error) {
        this.error = error.message;
        this.professionals = [];
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchActiveProfessionalsByCommerce(commerceId) {
      this.loading = true;
      this.error = null;
      try {
        const professionals = await getActiveProfessionalsByCommerce(commerceId);
        this.professionals = professionals || [];
        return professionals;
      } catch (error) {
        this.error = error.message;
        this.professionals = [];
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchAvailableProfessionalsForService(serviceId, commerceId) {
      this.loading = true;
      this.error = null;
      try {
        const professionals = await getAvailableProfessionalsForService(serviceId, commerceId);
        return professionals || [];
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async addProfessional(professional) {
      this.loading = true;
      this.error = null;
      try {
        const created = await createProfessional(professional);
        this.professionals.push(created);
        return created;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async editProfessional(id, professional) {
      this.loading = true;
      this.error = null;
      try {
        const updated = await updateProfessional(id, professional);
        const index = this.professionals.findIndex(p => p.id === id);
        if (index !== -1) {
          this.professionals[index] = updated;
        }
        if (this.currentProfessional?.id === id) {
          this.currentProfessional = updated;
        }
        return updated;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    setCurrentProfessional(professional) {
      this.currentProfessional = professional;
    },

    clearCurrentProfessional() {
      this.currentProfessional = null;
    },

    clearError() {
      this.error = null;
    },
  },
});
