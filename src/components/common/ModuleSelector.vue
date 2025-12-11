<script>
import { ref, computed, watch, onBeforeMount, onMounted } from 'vue';
import { globalStore } from '../../stores';
import { USER_TYPES } from '../../shared/constants';
import { getActiveModulesByCommerceId } from '../../application/services/module';

export default {
  name: 'ModuleSelector',
  emits: ['module-changed'],
  setup(props, { emit }) {
    const store = globalStore();
    const loading = ref(false);
    const modules = ref([]);
    const selectedModule = ref(null);
    const currentCommerce = ref(null);
    const lastLoadedCommerceId = ref(null);

    const currentUserType = computed(() => store.getCurrentUserType);
    const currentUser = computed(() => store.getCurrentUser);
    const storedModule = computed(() => store.getCurrentModule);
    const storedCommerce = computed(() => store.getCurrentCommerce);

    // Check if module selector dropdown should be visible (only when multiple modules)
    const shouldShowSelector = computed(() => {
      const userType = currentUserType.value;
      if (!userType || userType !== USER_TYPES.COLLABORATOR) return false;
      if (!modules.value || modules.value.length === 0) return false;
      // Show dropdown only when there are multiple modules
      return modules.value.length > 1;
    });

    // Check if module info should be visible (always show when there's at least one module)
    const shouldShow = computed(() => {
      const userType = currentUserType.value;
      if (!userType || userType !== USER_TYPES.COLLABORATOR) return false;
      if (!modules.value || modules.value.length === 0) return false;
      if (!selectedModule.value || !selectedModule.value.id) return false;
      // Always show module info when there's at least one module
      return true;
    });

    const loadModules = async () => {
      // Prevent concurrent calls
      if (loading.value) return;

      try {
        loading.value = true;

        // Check if user is authenticated and is a collaborator
        const userType = currentUserType.value;
        const user = currentUser.value;

        if (!userType || userType !== USER_TYPES.COLLABORATOR || !user || !user.id) {
          modules.value = [];
          selectedModule.value = null;
          await store.setCurrentModule(null);
          lastLoadedCommerceId.value = null;
          loading.value = false;
          return;
        }

        currentCommerce.value = store.getCurrentCommerce;

        if (!currentCommerce.value || !currentCommerce.value.id) {
          modules.value = [];
          selectedModule.value = null;
          await store.setCurrentModule(null);
          lastLoadedCommerceId.value = null;
          loading.value = false;
          return;
        }

        // Skip if already loaded for this commerce
        if (currentCommerce.value.id === lastLoadedCommerceId.value && modules.value.length >= 0) {
          loading.value = false;
          return;
        }

        // Get active modules for the current commerce
        modules.value = await getActiveModulesByCommerceId(currentCommerce.value.id);
        lastLoadedCommerceId.value = currentCommerce.value.id;

        // Load stored module or use first available
        if (storedModule.value && storedModule.value.id) {
          // Verify the stored module is still in the available list
          const found = modules.value.find(m => m && m.id === storedModule.value.id);
          if (found) {
            selectedModule.value = storedModule.value;
          } else {
            // Stored module not available, use first one
            selectedModule.value =
              modules.value && modules.value.length > 0 ? modules.value[0] : null;
          }
        } else {
          // No stored module, use first available
          selectedModule.value =
            modules.value && modules.value.length > 0 ? modules.value[0] : null;
        }

        // Save to store if we have a module (auto-select first if only one)
        if (modules.value && modules.value.length > 0) {
          if (
            !selectedModule.value ||
            !modules.value.find(m => m && m.id === selectedModule.value.id)
          ) {
            // Auto-select first module if none selected or selected one is not in list
            selectedModule.value = modules.value[0];
          }
          await store.setCurrentModule(selectedModule.value);
        } else {
          // Clear module if no modules available
          selectedModule.value = null;
          await store.setCurrentModule(null);
        }

        loading.value = false;
      } catch (error) {
        // Silently handle 401 (Unauthorized) errors - user is not authenticated yet
        if (error.response && error.response.status === 401) {
          modules.value = [];
          selectedModule.value = null;
          await store.setCurrentModule(null);
        } else {
        }
        loading.value = false;
      }
    };

    const handleModuleChange = event => {
      if (!event || !event.target) return;
      const moduleId = event.target.value;
      if (!moduleId || !modules.value || modules.value.length === 0) return;
      const module = modules.value.find(m => m && m.id === moduleId);
      if (module && module.id) {
        selectModule(module);
      }
    };

    const selectModule = async module => {
      if (!module || !module.id) return;

      try {
        loading.value = true;
        // Ensure module object is valid before setting
        if (module && module.id) {
          selectedModule.value = module;
          await store.setCurrentModule(module);
          emit('module-changed', module);
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };

    // Watch for commerce changes - reload modules when commerce changes
    watch(
      () => store.getCurrentCommerce,
      (newCommerce, oldCommerce) => {
        if (!newCommerce || !newCommerce.id) {
          modules.value = [];
          selectedModule.value = null;
          store.setCurrentModule(null);
          return;
        }
        // Only reload if commerce actually changed
        if (!oldCommerce || oldCommerce.id !== newCommerce.id) {
          loadModules();
        }
      },
      { deep: true }
    );

    // Watch for stored module changes from other sources
    watch(
      () => store.getCurrentModule,
      newModule => {
        if (
          newModule &&
          newModule.id &&
          (!selectedModule.value ||
            !selectedModule.value?.id ||
            selectedModule.value.id !== newModule.id)
        ) {
          selectedModule.value = newModule;
        } else if (!newModule || !newModule.id) {
          // Handle null module gracefully
          selectedModule.value = null;
        }
      },
      { deep: true }
    );

    onBeforeMount(async () => {
      await loadModules();
    });

    // Removed duplicate loadModules call from onMounted - onBeforeMount is sufficient

    return {
      modules,
      selectedModule,
      loading,
      shouldShow,
      shouldShowSelector,
      selectModule,
      handleModuleChange,
      currentUserType,
    };
  },
};
</script>

<template>
  <div v-if="shouldShow && !loading" class="module-selector">
    <!-- Show dropdown selector only when there are multiple modules -->
    <select
      v-if="shouldShowSelector"
      class="btn-md btn-light text-dark px-2"
      :value="selectedModule ? selectedModule.id : ''"
      @change="handleModuleChange($event)"
      id="module-select"
    >
      <option value="" disabled>{{ $t('moduleSelector.select') || 'Select Module' }}</option>
      <option v-for="module in modules" :key="module?.id || ''" :value="module?.id || ''">
        {{
          module?.active
            ? `🟢 ${module?.tag || module?.name || ''}`
            : `🔴 ${module?.tag || module?.name || ''}`
        }}
      </option>
    </select>
    <!-- Show module name when there's only one module (no dropdown) -->
    <span v-else-if="selectedModule" class="module-name-display">
      {{ selectedModule.tag || selectedModule.name || '' }}
    </span>
  </div>
</template>

<style scoped>
.module-selector {
  display: flex;
  align-items: center;
}

label,
select {
  color: var(--color-text);
}

select {
  height: 2.5rem;
  min-width: 150px;
  max-width: 250px;
  border-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 991px) {
  select {
    width: 100%;
    max-width: 100%;
  }
}

.module-name-display {
  font-weight: 600;
  color: var(--color-text);
  padding: 0.5rem 0.75rem;
  display: inline-block;
}
</style>
