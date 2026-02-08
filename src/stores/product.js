import { defineStore } from 'pinia';
import {
  getActiveProductsByCommerceId,
  getProductById,
  getProductsById,
  getProductByCommerce
} from '../application/services/product';

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [],
    loading: false,
    error: null,
  }),

  getters: {
    getProductById: (state) => (id) => {
      return state.products.find(product => product.id === id);
    },

    getActiveProducts: (state) => {
      return state.products.filter(product => product.active && product.available);
    }
  },

  actions: {
    async fetchActiveProductsByCommerce(commerceId) {
      this.loading = true;
      this.error = null;
      try {
        const products = await getActiveProductsByCommerceId(commerceId);
        this.products = products || [];
        return products;
      } catch (error) {
        this.error = error.message;
        this.products = [];
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchProductById(id) {
      this.loading = true;
      this.error = null;
      try {
        const product = await getProductById(id);
        if (product) {
          // Add or update product in store
          const existingIndex = this.products.findIndex(p => p.id === id);
          if (existingIndex >= 0) {
            this.products[existingIndex] = product;
          } else {
            this.products.push(product);
          }
        }
        return product;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchProductsByIds(ids) {
      this.loading = true;
      this.error = null;
      try {
        const products = await getProductsById(ids);
        // Add or update products in store
        products?.forEach(product => {
          const existingIndex = this.products.findIndex(p => p.id === product.id);
          if (existingIndex >= 0) {
            this.products[existingIndex] = product;
          } else {
            this.products.push(product);
          }
        });
        return products;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    clearProducts() {
      this.products = [];
      this.error = null;
    }
  }
});