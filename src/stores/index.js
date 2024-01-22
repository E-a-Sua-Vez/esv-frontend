import { ref } from 'vue';
import { defineStore } from 'pinia';

export const globalStore = defineStore('globalStore', {
  state: () => ({
    currentUser: ref(undefined),
    currentPermissions: ref(undefined),
    currentQueue: ref(undefined),
    currentCommerce: ref(undefined),
    currentBusiness: ref(undefined),
    currentUserType: ref(undefined),
    currentAttentionChannel: ref(undefined)
  }),
  getters: {
    getCurrentUser: (state) => {
      const localValue = localStorage.getItem('currentUser');
      let value = state.currentUser || localValue || undefined;
      value = value === 'undefined' ? undefined : value;
      value = value ? JSON.parse(value) : value;
      return value;
    },
    getCurrentPermissions: (state) => {
      const localValue = localStorage.getItem('currentPermissions');
      let value = state.currentPermissions || localValue || undefined;
      value = value === 'undefined' ? undefined : value;
      value = value ? JSON.parse(value) : value;
      return value;
    },
    getCurrentQueue: async (state) => {
      const localValue = localStorage.getItem('currentQueue');
      let value = state.currentQueue || localValue || undefined;
      value = value === 'undefined' ? undefined : value;
      value = value ? JSON.parse(value) : value;
      return value;
    },
    getCurrentUserType: async (state) => {
      const localValue = localStorage.getItem('currentUserType');
      const value = state.currentUserType || localValue || undefined;
      return value === 'undefined' ? undefined : value;
    },
    getCurrentCommerce: async (state) => {
      let localValue = localStorage.getItem('currentCommerce');
      let value = state.currentCommerce || localValue || undefined;
      value = value === 'undefined' ? undefined : value;
      value = value ? JSON.parse(value) : value;
      return value;
    },
    getCurrentBusiness: async (state) => {
      let localValue = localStorage.getItem('currentBusiness');
      let value = state.currentBusiness || localValue || undefined;
      value = value === 'undefined' ? undefined : value;
      value = value ? JSON.parse(value) : value;
      return value;
    },
    getCurrentAttentionChannel: async (state) => {
      const localValue = localStorage.getItem('currentAttentionChannel');
      let value = state.currentAttentionChannel || localValue || 'QR';
      return value === 'undefined' ? undefined : value;
    }
  },
  actions: {
    async setCurrentUser(value) {
      const val = value ? JSON.stringify(value) : value;
      await localStorage.setItem('currentUser', val);
      this.currentUser = val;
    },
    async setCurrentPermissions(value) {
      const val = value ? JSON.stringify(value) : value;
      await localStorage.setItem('currentPermissions', val);
      this.currentPermissions = val;
    },
    async setCurrentQueue(value) {
      const val = value ? JSON.stringify(value) : value;
      await localStorage.setItem('currentQueue', val);
      this.currentQueue = val;
    },
    async setCurrentUserType(value) {
      await localStorage.setItem('currentUserType', value);
      this.currentUserType = value;
    },
    async setCurrentCommerce(value) {
      const val = value ? JSON.stringify(value) : value;
      await localStorage.setItem('currentCommerce', val);
      this.currentCommerce = val;
    },
    async setCurrentBusiness(value) {
      const val = value ? JSON.stringify(value) : value;
      await localStorage.setItem('currentBusiness', val);
      this.currentBusiness = val;
    },
    async setCurrentAttentionChannel(value) {
      await localStorage.setItem('currentAttentionChannel', value);
      this.currentAttentionChannel = value;
    },
    async resetSession() {
      await localStorage.setItem('currentUser', undefined);
      await localStorage.setItem('currentQueue', undefined);
      await localStorage.setItem('currentPermissions', undefined);
      await this.setCurrentUser(undefined);
      await this.setCurrentQueue(undefined);
      await this.setCurrentPermissions(undefined);
      this.currentUser = undefined;
      this.currentQueue = undefined;
      this.currentPermissions = undefined;
    }
  },
});

