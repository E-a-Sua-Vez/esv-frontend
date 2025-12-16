<template>
  <div class="medication-search-wrapper">
    <div class="position-relative">
      <input
        :disabled="disabled"
        type="text"
        class="form-control-modern"
        v-model="searchTerm"
        @input="handleSearch"
        @focus="showResults = true"
        @blur="setTimeout(() => (showResults = false), 200)"
        placeholder="Buscar medicamento..."
      />
      <div v-if="searching" class="search-loading">
        <Spinner />
      </div>

      <!-- Search Results Dropdown -->
      <div v-if="showResults && searchResults.length > 0" class="search-dropdown">
        <div
          v-for="(medication, index) in searchResults"
          :key="index"
          class="search-item"
          @mousedown="selectMedication(medication)"
        >
          <div class="medication-name">{{ medication.name }}</div>
          <div v-if="medication.commercialName" class="medication-commercial">
            {{ medication.commercialName }}
          </div>
          <div v-if="medication.activePrinciple" class="medication-principle">
            {{ medication.activePrinciple }}
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Medication Info -->
    <div v-if="selectedMedication" class="selected-medication-info mt-2">
      <div class="medication-badge">
        <i class="bi bi-check-circle me-1"></i>
        {{ selectedMedication.name }}
        <span v-if="selectedMedication.commercialName" class="text-muted ms-2">
          ({{ selectedMedication.commercialName }})
        </span>
      </div>
      <div v-if="selectedMedication.standardDosage" class="medication-dosage mt-1">
        <small class="text-muted">Dosis estándar: {{ selectedMedication.standardDosage }}</small>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import Spinner from '../../common/Spinner.vue';
import { searchMedications } from '../../../application/services/prescription';

export default {
  name: 'MedicationSearch',
  components: {
    Spinner,
  },
  props: {
    disabled: { type: Boolean, default: false },
    selectedMedication: { type: Object, default: null },
  },
  emits: ['select', 'validate-interactions'],
  setup(props, { emit }) {
    const searchTerm = ref('');
    const searchResults = ref([]);
    const searching = ref(false);
    const showResults = ref(false);

    const handleSearch = async () => {
      if (!searchTerm.value || searchTerm.value.length < 2) {
        searchResults.value = [];
        return;
      }
      try {
        searching.value = true;
        const results = await searchMedications({ searchTerm: searchTerm.value, limit: 20 });
        searchResults.value = results.medications || [];
      } catch (error) {
        console.error('Error searching medications:', error);
        searchResults.value = [];
      } finally {
        searching.value = false;
      }
    };

    const selectMedication = medication => {
      emit('select', medication);
      searchTerm.value = '';
      showResults.value = false;
    };

    watch(
      () => props.selectedMedication,
      newVal => {
        if (newVal) {
          searchTerm.value = newVal.name;
        }
      }
    );

    return {
      searchTerm,
      searchResults,
      searching,
      showResults,
      handleSearch,
      selectMedication,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.medication-search-wrapper {
  position: relative;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-lg);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 0.25rem;
}

.search-item {
  padding: 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s ease;
}

.search-item:hover {
  background: rgba(68, 111, 252, 0.1);
}

.medication-name {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.875rem;
}

.medication-commercial {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}

.medication-principle {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-style: italic;
  margin-top: 0.25rem;
}

.selected-medication-info {
  padding: 0.75rem;
  background: rgba(68, 111, 252, 0.1);
  border-radius: var(--border-radius-sm);
  border-left: 3px solid var(--azul-turno);
}

.medication-badge {
  font-weight: 600;
  color: var(--azul-turno);
  font-size: 0.875rem;
}

.search-loading {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
}
</style>
