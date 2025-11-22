import { defineStore } from 'pinia';
import { getActiveCommercesByBusinessId } from '../application/services/commerce';
import { getBusinessById } from '../application/services/business';
import { getStorageItem, setStorageItem, removeStorageItem } from '@/shared/utils/storage';
import { STORAGE_KEYS } from '@/shared/constants';

export const globalStore = defineStore('globalStore', {
  state: () => ({
    currentUser: null,
    currentPermissions: null,
    currentQueue: null,
    currentCommerce: null,
    currentBusiness: null,
    currentUserType: null,
    currentAttentionChannel: null,
    currentActiveAttentions: null,
  }),
  getters: {
    getCurrentUser: state => state.currentUser || getStorageItem(STORAGE_KEYS.CURRENT_USER),
    getCurrentPermissions: state =>
      state.currentPermissions || getStorageItem(STORAGE_KEYS.CURRENT_PERMISSIONS),
    getCurrentQueue: state => state.currentQueue || getStorageItem(STORAGE_KEYS.CURRENT_QUEUE),
    getCurrentUserType: state => {
      const stored = state.currentUserType || localStorage.getItem(STORAGE_KEYS.CURRENT_USER_TYPE);
      return stored && stored !== 'undefined' ? stored : null;
    },
    getCurrentCommerce: state =>
      state.currentCommerce || getStorageItem(STORAGE_KEYS.CURRENT_COMMERCE),
    getCurrentBusiness: state =>
      state.currentBusiness || getStorageItem(STORAGE_KEYS.CURRENT_BUSINESS),
    getCurrentAttentionChannel: state => {
      const stored =
        state.currentAttentionChannel ||
        localStorage.getItem(STORAGE_KEYS.CURRENT_ATTENTION_CHANNEL);
      return stored && stored !== 'undefined' ? stored : 'QR';
    },
    getCurrentActiveAttentions: state =>
      state.currentActiveAttentions || getStorageItem(STORAGE_KEYS.CURRENT_ACTIVE_ATTENTIONS),
  },
  actions: {
    async setCurrentUser(value) {
      this.currentUser = value;
      setStorageItem(STORAGE_KEYS.CURRENT_USER, value);
    },
    async setCurrentPermissions(value) {
      this.currentPermissions = value;
      setStorageItem(STORAGE_KEYS.CURRENT_PERMISSIONS, value);
    },
    async setCurrentQueue(value) {
      this.currentQueue = value;
      setStorageItem(STORAGE_KEYS.CURRENT_QUEUE, value);
    },
    async setCurrentUserType(value) {
      this.currentUserType = value;
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_TYPE, value);
    },
    async setCurrentCommerce(value) {
      this.currentCommerce = value;
      setStorageItem(STORAGE_KEYS.CURRENT_COMMERCE, value);
    },
    async setCurrentBusiness(value) {
      this.currentBusiness = value;
      setStorageItem(STORAGE_KEYS.CURRENT_BUSINESS, value);
    },
    async setCurrentAttentionChannel(value) {
      this.currentAttentionChannel = value;
      localStorage.setItem(STORAGE_KEYS.CURRENT_ATTENTION_CHANNEL, value);
    },
    async setCurrentActiveAttentions(value) {
      this.currentActiveAttentions = value;
      setStorageItem(STORAGE_KEYS.CURRENT_ACTIVE_ATTENTIONS, value);
    },
    async resetSession() {
      // Clear state
      this.currentUser = null;
      this.currentQueue = null;
      this.currentPermissions = null;
      this.currentActiveAttentions = null;

      // Clear storage
      removeStorageItem(STORAGE_KEYS.CURRENT_USER);
      removeStorageItem(STORAGE_KEYS.CURRENT_QUEUE);
      removeStorageItem(STORAGE_KEYS.CURRENT_PERMISSIONS);
      removeStorageItem(STORAGE_KEYS.CURRENT_ACTIVE_ATTENTIONS);
    },
    async getActualBusiness() {
      let business = this.getCurrentBusiness || undefined;
      const currentUser = this.getCurrentUser;
      const currentCommerce = this.getCurrentCommerce;
      if (
        !business &&
        ((currentUser && currentUser.businessId) || (currentCommerce && currentCommerce.businessId))
      ) {
        business = await getBusinessById(currentUser.businessId || currentCommerce.businessId);
        this.setCurrentBusiness(business);
      }
      return business;
    },
    async renewActualBusiness() {
      let business = this.getCurrentBusiness || undefined;
      const currentUser = this.getCurrentUser;
      const currentCommerce = this.getCurrentCommerce;
      if (
        (currentUser && currentUser.businessId) ||
        (currentCommerce && currentCommerce.businessId)
      ) {
        business = await getBusinessById(currentUser.businessId || currentCommerce.businessId);
        this.setCurrentBusiness(business);
      }
      return business;
    },
    async getAvailableCommerces(commercesIn) {
      let commerces = undefined;
      const currentUser = this.getCurrentUser;
      commerces = commercesIn;
      if (!commerces) {
        const business = this.getCurrentBusiness;
        const businessId = currentUser.businessId || business.id;
        commerces = await getActiveCommercesByBusinessId(businessId);
      }
      if (currentUser && currentUser.commercesId) {
        if (currentUser.commercesId.length > 0) {
          const availablesIds = currentUser.commercesId;
          const availableCommerces = commerces.filter(com => availablesIds.includes(com.id));
          if (availableCommerces && availableCommerces.length > 0) {
            commerces = availableCommerces;
          }
        }
      }
      return commerces;
    },
  },
});
