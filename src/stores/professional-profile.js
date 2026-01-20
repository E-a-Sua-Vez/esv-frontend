import { defineStore } from 'pinia';
import { getStorageItem, setStorageItem, removeStorageItem } from '@/shared/utils/storage';

const STORAGE_KEY_PROFESSIONAL = 'professionalProfile';

export const useProfessionalProfileStore = defineStore('professionalProfile', {
  state: () => ({
    professional: null,
    isLoaded: false,
    lastUpdated: null,
  }),

  getters: {
    getProfessional: state => {
      const stored = state.professional || getStorageItem(STORAGE_KEY_PROFESSIONAL);
      return stored || null;
    },

    isProfessionalLoaded: state => state.isLoaded,

    getProfessionalFullName: state => {
      const professional = state.professional || getStorageItem(STORAGE_KEY_PROFESSIONAL);
      if (!professional) return '';
      return `${professional.personalInfo?.firstName || ''} ${professional.personalInfo?.lastName || ''}`.trim();
    },

    getProfessionalSpecialties: state => {
      const professional = state.professional || getStorageItem(STORAGE_KEY_PROFESSIONAL);
      if (!professional) return [];
      return professional.professionalInfo?.specialties || [];
    },

    getProfessionalMedicalData: state => {
      const professional = state.professional || getStorageItem(STORAGE_KEY_PROFESSIONAL);
      if (!professional) return null;
      return professional.medicalData || null;
    },

    getProfessionalPhotoUrl: state => {
      const professional = state.professional || getStorageItem(STORAGE_KEY_PROFESSIONAL);
      if (!professional) return null;
      return professional.profilePhotoUrl || null;
    },
  },

  actions: {
    setProfessional(professional) {
      this.professional = professional;
      this.isLoaded = !!professional;
      this.lastUpdated = new Date().toISOString();
      if (professional) {
        setStorageItem(STORAGE_KEY_PROFESSIONAL, professional);
      } else {
        removeStorageItem(STORAGE_KEY_PROFESSIONAL);
      }
    },

    clearProfessional() {
      this.professional = null;
      this.isLoaded = false;
      this.lastUpdated = null;
      removeStorageItem(STORAGE_KEY_PROFESSIONAL);
    },

    // Restaurar professional desde localStorage (útil cuando la página se recarga)
    restoreProfessionalFromStorage() {
      const stored = getStorageItem(STORAGE_KEY_PROFESSIONAL);
      if (stored) {
        this.professional = stored;
        this.isLoaded = true;
        this.lastUpdated = new Date().toISOString();
      }
    },
  },
});
