<template>
  <div>
    <!-- Search Bar -->
    <div class="search-bar">
      <div class="search-input-group">
        <i class="bi bi-search search-icon"></i>
        <input
          v-model="searchText"
          @input="handleSearch"
          type="text"
          :placeholder="$t('documentSearch.searchPlaceholder')"
          class="search-input"
        />
        <button v-if="searchText" @click="clearSearch" class="clear-search-btn">
          <i class="bi bi-x"></i>
        </button>
      </div>

      <div class="filter-container">
        <button
          @click="toggleFilters"
          class="filter-toggle-btn"
          :class="{ active: showFilters || hasActiveFilters }"
        >
          <i class="bi bi-funnel"></i>
          {{ $t('documentSearch.filters') }}
          <span v-if="activeFilterCount > 0" class="filter-count">{{ activeFilterCount }}</span>
        </button>

        <!-- Compact Filters -->
        <div class="filters-panel" :class="{ expanded: showFilters }">
          <div class="filters-content compact-filters">
            <!-- Row 1: Category and Urgency -->
            <div class="filter-row">
              <div class="filter-group compact">
                <label class="filter-label">{{ $t('documentSearch.category') }}</label>
                <select v-model="filters.category" @change="applyFilters" class="filter-select compact">
                  <option value="">{{ $t('documentSearch.all') }}</option>
                  <option v-for="category in categories" :key="category.value" :value="category.value">
                    {{ category.label }}
                  </option>
                </select>
              </div>

              <div class="filter-group compact">
                <label class="filter-label">{{ $t('documentSearch.urgency') }}</label>
                <select v-model="filters.urgency" @change="applyFilters" class="filter-select compact">
                  <option value="">{{ $t('documentSearch.all') }}</option>
                  <option v-for="urgency in urgencyLevels" :key="urgency.value" :value="urgency.value">
                    {{ urgency.label }}</option>
                </select>
              </div>
            </div>

            <!-- Row 2: Date Range -->
            <div class="filter-row">
              <div class="filter-group compact">
                <label class="filter-label">{{ $t('documentSearch.from') }}</label>
                <input
                  v-model="filters.dateFrom"
                  @change="applyFilters"
                  type="date"
                  class="filter-input compact"
                />
              </div>

              <div class="filter-group compact">
                <label class="filter-label">{{ $t('documentSearch.to') }}</label>
                <input
                  v-model="filters.dateTo"
                  @change="applyFilters"
                  type="date"
                  class="filter-input compact"
                />
              </div>
            </div>

            <!-- Row 3: Tags -->
            <div class="filter-row">
              <div class="filter-group compact full-width">
                <label class="filter-label">{{ $t('documentSearch.tags') }}</label>
                <input
                  v-model="newTag"
                  @keydown.enter="addTag"
                  @keydown="handleTagInputKeydown"
                  type="text"
                  :placeholder="$t('documentSearch.addTagPlaceholder')"
                  class="filter-input compact"
                />
                <div v-if="filters.tags.length > 0" class="tags-display">
                  <span
                    v-for="tag in filters.tags"
                    :key="tag"
                    class="tag-chip"
                    @click="removeTag(tag)"
                  >
                    {{ tag }} <i class="bi bi-x"></i>
                  </span>
                </div>
              </div>
            </div>

            <!-- Row 4: Actions -->
            <div class="filter-row">
              <button @click="clearFilters" class="filter-btn clear-btn">{{ $t('documentSearch.clear') }}</button>
              <button @click="applyFilters" class="filter-btn apply-btn">{{ $t('documentSearch.apply') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Filters Display -->
    <div class="active-filters" v-if="hasActiveFilters">
      <span class="active-filters-label">{{ $t('documentSearch.activeFilters') }}</span>

      <span v-if="filters.category" class="active-filter-chip">
        {{ getCategoryLabel(filters.category) }}
        <button @click="clearFilter('category')" class="remove-filter-btn">
          <i class="bi bi-x"></i>
        </button>
      </span>

      <span v-if="filters.urgency" class="active-filter-chip">
        {{ getUrgencyLabel(filters.urgency) }}
        <button @click="clearFilter('urgency')" class="remove-filter-btn">
          <i class="bi bi-x"></i>
        </button>
      </span>

      <span v-if="filters.status" class="active-filter-chip">
        {{ getStatusLabel(filters.status) }}
        <button @click="clearFilter('status')" class="remove-filter-btn">
          <i class="bi bi-x"></i>
        </button>
      </span>

      <span v-if="filters.dateFrom || filters.dateTo" class="active-filter-chip">
        {{ formatDateRange() }}
        <button @click="clearDateFilter" class="remove-filter-btn">
          <i class="bi bi-x"></i>
        </button>
      </span>

      <span v-for="tag in filters.tags" :key="tag" class="active-filter-chip tag-chip">
        #{{ tag }}
        <button @click="removeTag(tag)" class="remove-filter-btn">
          <i class="bi bi-x"></i>
        </button>
      </span>
    </div>
  </div>
</template>

<script>
import { ref, computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  getDocumentCategories,
  getDocumentUrgencyLevels,
  getDocumentStatusOptions,
} from '../../application/services/document';

export default {
  name: 'DocumentSearch',
  emits: ['search', 'filters-changed'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const searchText = ref('');
    const showFilters = ref(false);
    const newTag = ref('');
    const quickFilter = ref('');

    const categories = getDocumentCategories();
    const urgencyLevels = getDocumentUrgencyLevels();
    const statusOptions = getDocumentStatusOptions();

    const filters = reactive({
      category: '',
      urgency: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      tags: [],
    });

    // Computed properties
    const hasActiveFilters = computed(
      () =>
        filters.category ||
        filters.urgency ||
        filters.status ||
        filters.dateFrom ||
        filters.dateTo ||
        filters.tags.length > 0
    );

    const activeFilterCount = computed(() => {
      let count = 0;
      if (filters.category) count++;
      if (filters.urgency) count++;
      if (filters.status) count++;
      if (filters.dateFrom || filters.dateTo) count++;
      count += filters.tags.length;
      return count;
    });

    // Methods
    const handleSearch = () => {
      emit('search', searchText.value);
    };

    const clearSearch = () => {
      searchText.value = '';
      handleSearch();
    };

    const toggleFilters = () => {
      showFilters.value = !showFilters.value;
    };

    const applyFilters = () => {
      emit('filters-changed', { ...filters });
    };

    const clearFilter = filterName => {
      filters[filterName] = '';
      applyFilters();
    };

    const clearDateFilter = () => {
      filters.dateFrom = '';
      filters.dateTo = '';
      applyFilters();
    };

    const clearAllFilters = () => {
      filters.category = '';
      filters.urgency = '';
      filters.status = '';
      filters.dateFrom = '';
      filters.dateTo = '';
      filters.tags = [];
      quickFilter.value = '';
      applyFilters();
    };

    const addTag = () => {
      if (newTag.value.trim() && !filters.tags.includes(newTag.value.trim())) {
        filters.tags.push(newTag.value.trim());
        newTag.value = '';
        applyFilters();
      }
    };

    const removeTag = tag => {
      const index = filters.tags.indexOf(tag);
      if (index > -1) {
        filters.tags.splice(index, 1);
        applyFilters();
      }
    };

    const removeLastTag = () => {
      if (newTag.value === '' && filters.tags.length > 0) {
        filters.tags.pop();
        applyFilters();
      }
    };

    const handleTagInputKeydown = event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addTag();
      } else if (event.key === 'Backspace' && newTag.value === '') {
        event.preventDefault();
        removeLastTag();
      }
    };

    const applyQuickFilter = type => {
      clearAllFilters();
      quickFilter.value = type;

      const today = new Date();
      const formatDate = date => date.toISOString().split('T')[0];

      switch (type) {
        case 'today':
          filters.dateFrom = formatDate(today);
          filters.dateTo = formatDate(today);
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          filters.dateFrom = formatDate(weekAgo);
          filters.dateTo = formatDate(today);
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          filters.dateFrom = formatDate(monthAgo);
          filters.dateTo = formatDate(today);
          break;
        case 'critical':
          filters.urgency = 'CRITICAL';
          break;
      }

      applyFilters();
    };

    const getCategoryLabel = value => {
      const category = categories.find(c => c.value === value);
      return category?.label || value;
    };

    const getUrgencyLabel = value => {
      const urgency = urgencyLevels.find(u => u.value === value);
      return urgency?.label || value;
    };

    const getStatusLabel = value => {
      const status = statusOptions.find(s => s.value === value);
      return status?.label || value;
    };

    const formatDateRange = () => {
      if (filters.dateFrom && filters.dateTo) {
        return `${filters.dateFrom} - ${filters.dateTo}`;
      } else if (filters.dateFrom) {
        return `Desde ${filters.dateFrom}`;
      } else if (filters.dateTo) {
        return `Hasta ${filters.dateTo}`;
      }
      return '';
    };

    const saveFilterPreset = () => {
      // In a real implementation, you would save this to localStorage or backend
      const preset = {
        name: `Preset ${new Date().toLocaleString()}`,
        filters: { ...filters },
        searchText: searchText.value,
      };

      // You could show a toast notification here
    };

    return {
      searchText,
      showFilters,
      newTag,
      quickFilter,
      filters,
      categories,
      urgencyLevels,
      statusOptions,
      hasActiveFilters,
      activeFilterCount,
      handleSearch,
      clearSearch,
      toggleFilters,
      applyFilters,
      clearFilter,
      clearDateFilter,
      clearAllFilters,
      addTag,
      removeTag,
      removeLastTag,
      handleTagInputKeydown,
      applyQuickFilter,
      getCategoryLabel,
      getUrgencyLabel,
      getStatusLabel,
      formatDateRange,
      saveFilterPreset,
    };
  },
};
</script>

<style scoped>
.document-search-container {
  position: relative;
  background: white;
  border-radius: 0.375rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  margin-bottom: 0.5rem;
  overflow: visible;
}

.search-bar {
  display: flex;
  gap: 0.375rem;
  padding: 0.5rem;
}

.search-input-group {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 1rem;
  color: #6c757d;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 0.375rem 0.5rem 0.375rem 2rem;
  border: 1px solid #e9ecef;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  z-index: 1 !important;
}

.search-input:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.clear-search-btn {
  position: absolute;
  right: 0.5rem;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  background: #495057;
}

.filter-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 0.25rem;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  font-size: 0.8rem;
}

.filter-toggle-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.filter-toggle-btn.active {
  background: var(--azul-turno);
  border-color: var(--azul-turno);
  color: white;
}

.filter-count {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  background: #dc3545;
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.filter-container {
  position: relative;
  display: inline-block;
}

.filters-panel {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 1000;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 0.375rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.3s ease;
  max-height: 70vh;
  overflow-y: auto;
  min-width: 300px;
}

.filters-panel.expanded {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.filters-content {
  font-size: 0.8rem;
  line-height: .9;
  font-weight: 300 !important;
  color: rgba(0, 0, 0, 0.7);
  text-transform: uppercase;
  align-items: flex-start;
  padding: 0.5rem;
  background: #f8f9fa;
}

.filters-content.compact-filters {
  padding: 0.375rem 0.5rem;
}

.filter-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.filter-row:last-child {
  margin-bottom: 0;
  padding-top: 0.75rem;
  border-top: 1px solid #e9ecef;
}

.filter-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.clear-btn {
  background: white;
  color: #6c757d;
  border-color: #dee2e6;
}

.clear-btn:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
  color: #495057;
}

.apply-btn {
  background: var(--azul-turno);
  color: white;
  border-color: var(--azul-turno);
}

.apply-btn:hover {
  background: #0056b3;
  border-color: #0056b3;
  color: white;
}

.filter-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.filter-group {
  margin-bottom: 0.5rem;
}

.filter-group.compact {
  margin-bottom: 0;
  flex: 1;
}

.filter-group.date-range {
  flex: 2;
}

.filter-label {
  display: block;
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
}

.filter-select {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  background: white;
  font-size: 0.8rem;
  transition: border-color 0.2s ease;
}

.filter-select.compact {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.filter-select:focus {
  outline: none;
  border-color: var(--azul-turno);
}

.date-range-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-range-inputs.compact {
  gap: 0.25rem;
}

.date-input {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  font-size: 0.8rem;
}

.date-input.compact {
  padding: 0.25rem 0.375rem;
  font-size: 0.75rem;
}

.date-separator {
  color: #6c757d;
  font-size: 0.75rem;
  font-weight: 500;
}

.tags-input-container {
  display: flex;
  gap: 0.375rem;
}

.tag-input {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  font-size: 0.8rem;
}

.add-tag-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--azul-turno);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.add-tag-btn:hover {
  background: #0056b3;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.375rem;
}

.selected-tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: #e9ecef;
  border-radius: 1rem;
  font-size: 0.75rem;
  color: #495057;
}

.remove-tag-btn {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.6rem;
}

.quick-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.quick-filter-btn {
  padding: 0.375rem 0.75rem;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
}

.quick-filter-btn:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
}

.quick-filter-btn.active {
  background: var(--azul-turno);
  border-color: var(--azul-turno);
  color: white;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #dee2e6;
}

.clear-filters-btn,
.save-preset-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  background: white;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
}

.clear-filters-btn:hover {
  background: #f8f9fa;
}

.save-preset-btn:hover {
  background: var(--azul-turno);
  color: white;
  border-color: var(--azul-turno);
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem;
  background: #fff3cd;
  border-top: 1px solid #ffeaa7;
}

.active-filters-label {
  font-weight: 600;
  color: #856404;
  font-size: 0.875rem;
}

.active-filter-chip {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  background: #ffc107;
  color: #212529;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.active-filter-chip.tag-chip {
  background: var(--azul-turno);
  color: white;
}

.remove-filter-btn {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  color: currentColor;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.6rem;
}

.remove-filter-btn:hover {
  background: rgba(0, 0, 0, 0.4);
}

/* Responsive Design */
@media (max-width: 768px) {
  .search-bar {
    flex-direction: column;
  }

  .date-range-inputs {
    flex-direction: column;
  }

  .date-separator {
    display: none;
  }

  .filter-actions {
    flex-direction: column;
  }

  .active-filters {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
