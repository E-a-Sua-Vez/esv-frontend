<script>
export default {
  name: 'SearchBar',
  props: {
    list: { type: Object, default: [] },
    label: { type: String, default: '' },
  },
  data() {
    return {
      searchString: '',
      selectedItem: undefined,
    };
  },
  methods: {
    selectItem(item) {
      this.searchString = '';
      this.selectedItem = item;
      this.$emit('selectItem', this.selectedItem);
    },
  },
  computed: {
    searchItem() {
      if (this.searchString.length >= 3) {
        const result = this.list.filter(
          i =>
            i.name?.toLowerCase().includes(this.searchString.toLowerCase()) ||
            i.keyName?.toLowerCase().includes(this.searchString.toLowerCase()) ||
            i.email?.toLowerCase().includes(this.searchString.toLowerCase()) ||
            i.idNumber?.toLowerCase().includes(this.searchString.toLowerCase())
        );
        return result;
      }
    },
  },
};
</script>

<template>
  <div class="search-bar-container">
    <div class="search-bar-wrapper">
      <label class="search-bar-label">{{ label }}</label>
      <div class="search-input-wrapper">
        <i class="bi bi-search search-icon"></i>
        <input
          min="1"
          max="50"
          type="text"
          class="form-control-modern search-input"
          v-model="searchString"
          :placeholder="$t('enterSearcher')"
        />
      </div>
    </div>
    <div class="search-results-wrapper" v-if="this.searchString.length >= 3">
      <div class="search-results-dropdown" v-if="searchItem && searchItem.length > 0">
        <div
          v-for="item in searchItem"
          :key="item.id"
          class="search-result-item"
          @click="selectItem(item)"
        >
          <div class="search-result-image">
            <img v-if="item.logo" :src="item.logo" class="result-image" loading="lazy" alt="Logo" />
            <div v-else class="result-icon-placeholder">
              <i class="bi bi-person-circle"></i>
            </div>
          </div>
          <div class="search-result-content">
            <span v-if="item.name" class="result-name">{{ item.name }}</span>
            <span v-if="item.email" class="result-email">{{ item.email }}</span>
          </div>
        </div>
      </div>
      <div class="search-results-dropdown search-no-results" v-else>
        <div class="no-results-message">{{ $t('noResults') }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-bar-container {
  position: relative;
  margin: 0.5rem 0;
  width: 100%;
}

.search-bar-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.search-bar-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #000000;
  margin-bottom: 0.25rem;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: rgba(0, 0, 0, 0.4);
  font-size: 0.9375rem;
  z-index: 1;
  pointer-events: none;
}

.search-input {
  flex: 1;
  padding: 0.4rem 0.625rem 0.4rem 2.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  color: #000000;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.search-input:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.search-input:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.search-input::placeholder {
  color: rgba(0, 0, 0, 0.4);
  font-weight: 400;
}

.search-results-wrapper {
  position: relative;
  width: 100%;
  margin-top: 0.25rem;
}

.search-results-dropdown {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(169, 169, 169, 0.25);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
  max-height: 400px;
  overflow-y: auto;
  z-index: 10000;
  margin-top: 0.25rem;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(169, 169, 169, 0.1);
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background-color: rgba(0, 194, 203, 0.05);
}

.search-result-item:active {
  background-color: rgba(0, 194, 203, 0.1);
}

.search-result-image {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 194, 203, 0.1);
}

.result-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-icon-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 194, 203, 0.7);
  font-size: 1.5rem;
}

.search-result-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.result-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #000000;
  line-height: 1.3;
  word-break: break-word;
}

.result-email {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.2;
  word-break: break-word;
}

.search-no-results {
  padding: 1rem;
  text-align: center;
}

.no-results-message {
  font-size: 0.8125rem;
  color: rgba(0, 0, 0, 0.5);
  font-style: italic;
}

/* Ensure dropdown appears above modals and other elements */
/* Bootstrap modals use z-index 1050, so we use 10000 to be safe */
.search-results-dropdown {
  z-index: 10000 !important;
}

/* Ensure dropdown appears above modal backdrop (z-index 1040) but below modal (z-index 1050) */
/* However, we want it above everything when searching, so 10000 is correct */

/* Scrollbar styling for dropdown */
.search-results-dropdown::-webkit-scrollbar {
  width: 6px;
}

.search-results-dropdown::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.search-results-dropdown::-webkit-scrollbar-thumb {
  background: rgba(0, 194, 203, 0.3);
  border-radius: 3px;
}

.search-results-dropdown::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 194, 203, 0.5);
}
</style>
