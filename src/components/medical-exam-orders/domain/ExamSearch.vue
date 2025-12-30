<template>
  <div class="exam-search-wrapper">
    <div class="position-relative">
      <input
        :disabled="disabled"
        type="text"
        class="form-control-modern"
        v-model="searchTerm"
        @input="handleSearch"
        @focus="showResults = true"
        @blur="setTimeout(() => (showResults = false), 200)"
        placeholder="Buscar examen..."
      />
      <div v-if="searching" class="search-loading">
        <Spinner />
      </div>

      <!-- Search Results Dropdown -->
      <div v-if="showResults && searchResults.length > 0" class="search-dropdown">
        <div
          v-for="(exam, index) in searchResults"
          :key="index"
          class="search-item"
          @mousedown="selectExam(exam)"
        >
          <div class="exam-name">{{ exam.name }}</div>
          <div v-if="exam.code" class="exam-code">
            <span class="badge bg-secondary">{{ exam.code }}</span>
          </div>
          <div v-if="exam.description" class="exam-description">
            {{ exam.description }}
          </div>
          <div v-if="exam.preparation" class="exam-preparation">
            <i class="bi bi-info-circle me-1"></i>
            Preparación: {{ exam.preparation }}
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Exam Info -->
    <div v-if="selectedExam" class="selected-exam-info mt-2">
      <div class="exam-badge">
        <i class="bi bi-check-circle me-1"></i>
        {{ selectedExam.name }}
        <span v-if="selectedExam.code" class="badge bg-secondary ms-2">{{
          selectedExam.code
        }}</span>
      </div>
      <div v-if="selectedExam.preparation" class="exam-preparation-info mt-1">
        <small class="text-muted">
          <i class="bi bi-info-circle me-1"></i>
          Preparación: {{ selectedExam.preparation }}
        </small>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import Spinner from '../../common/Spinner.vue';
import { searchExams } from '../../../application/services/medical-exam-order';

export default {
  name: 'ExamSearch',
  components: {
    Spinner,
  },
  props: {
    disabled: { type: Boolean, default: false },
    examType: { type: String, default: '' },
    selectedExam: { type: Object, default: null },
    commerceId: { type: String, default: '' },
  },
  emits: ['select'],
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
        const results = await searchExams({
          q: searchTerm.value,
          type: props.examType,
          limit: 20,
          commerceId: props.commerceId,
        });
        searchResults.value = results.exams || [];
      } catch (error) {
        console.error('Error searching exams:', error);
        searchResults.value = [];
      } finally {
        searching.value = false;
      }
    };

    const selectExam = exam => {
      emit('select', exam);
      searchTerm.value = '';
      showResults.value = false;
    };

    watch(
      () => props.selectedExam,
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
      selectExam,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.exam-search-wrapper {
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

.exam-name {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.875rem;
}

.exam-code {
  margin-top: 0.25rem;
}

.exam-description {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}

.exam-preparation {
  font-size: 0.8rem;
  color: var(--azul-turno);
  margin-top: 0.25rem;
  font-style: italic;
}

.selected-exam-info {
  padding: 0.75rem;
  background: rgba(68, 111, 252, 0.1);
  border-radius: var(--border-radius-sm);
  border-left: 3px solid var(--azul-turno);
}

.exam-badge {
  font-weight: 600;
  color: var(--azul-turno);
  font-size: 0.875rem;
}

.exam-preparation-info {
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color);
}

.search-loading {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
}
</style>
