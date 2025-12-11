<script>
import { ref, computed, watch, onBeforeMount, onMounted } from 'vue';
import { globalStore } from '../../stores';
import { USER_TYPES } from '../../shared/constants';

export default {
  name: 'CommerceSelector',
  emits: ['commerce-changed'],
  setup(props, { emit }) {
    const store = globalStore();
    const loading = ref(false);
    const commerces = ref([]);
    const selectedCommerce = ref(null);
    const currentBusiness = ref(null);
    const lastLoadedBusinessId = ref(null);
    const lastLoadedUserCommercesId = ref(null);

    const currentUserType = computed(() => store.getCurrentUserType);
    const currentUser = computed(() => store.getCurrentUser);
    const storedCommerce = computed(() => store.getCurrentCommerce);

    // Check if commerce selector should be visible
    const shouldShow = computed(() => {
      const userType = currentUserType.value;
      if (!userType || !commerces.value || commerces.value.length === 0) return false;

      // Show for business users when there are multiple commerces
      if (userType === USER_TYPES.BUSINESS) {
        return commerces.value.length > 1;
      }

      // Show for master users when a business is selected and there are multiple commerces (same standard as business)
      if (userType === USER_TYPES.MASTER) {
        const business = store.getCurrentBusiness;
        return business && business.id && commerces.value.length > 1;
      }

      // Show for collaborator users when there are multiple commerces
      if (userType === USER_TYPES.COLLABORATOR) {
        return commerces.value.length > 1;
      }

      return false;
    });

    const loadCommerces = async () => {
      // Prevent concurrent calls
      if (loading.value) return;

      try {
        loading.value = true;
        currentBusiness.value = store.getCurrentBusiness;
        const userType = currentUserType.value;

        // For collaborators, get commerces from user's commercesId
        if (userType === USER_TYPES.COLLABORATOR) {
          const user = currentUser.value;
          if (user && user.commercesId && user.commercesId.length > 0) {
            // Check if already loaded for same commercesId
            const commercesIdStr = JSON.stringify(user.commercesId.sort());
            if (commercesIdStr === lastLoadedUserCommercesId.value && commerces.value.length > 0) {
              loading.value = false;
              return;
            }
            // Get commerces by IDs
            const { getCommerceById } = await import('../../application/services/commerce');
            const commercePromises = user.commercesId.map(id => getCommerceById(id));
            const commerceResults = await Promise.all(commercePromises);
            commerces.value = commerceResults.filter(c => c && c.id);
            lastLoadedUserCommercesId.value = commercesIdStr;
          } else {
            // Fallback: use commerce from store or user's commerceId
            const storedCommerce = store.getCurrentCommerce;
            if (storedCommerce && storedCommerce.id) {
              commerces.value = [storedCommerce];
            } else if (user && user.commerceId) {
              // Try to get commerce by ID
              const { getCommerceById } = await import('../../application/services/commerce');
              const commerce = await getCommerceById(user.commerceId);
              commerces.value = commerce ? [commerce] : [];
            } else {
              commerces.value = [];
            }
          }
        } else if (!currentBusiness.value) {
          commerces.value = [];
          selectedCommerce.value = null;
          lastLoadedBusinessId.value = null;
          loading.value = false;
          return;
        } else {
          // Check if already loaded for same business
          if (
            currentBusiness.value.id === lastLoadedBusinessId.value &&
            commerces.value.length > 0
          ) {
            loading.value = false;
            return;
          }
          // Get available commerces for the current business (for BUSINESS and MASTER users)
          commerces.value = await store.getAvailableCommerces(
            currentBusiness.value.commerces || []
          );
          lastLoadedBusinessId.value = currentBusiness.value.id;
        }

        // Load stored commerce or use first available
        if (storedCommerce.value && storedCommerce.value.id) {
          // Verify the stored commerce is still in the available list
          const found = commerces.value.find(c => c.id === storedCommerce.value.id);
          if (found) {
            selectedCommerce.value = storedCommerce.value;
          } else {
            // Stored commerce not available, use first one
            selectedCommerce.value =
              commerces.value && commerces.value.length > 0 ? commerces.value[0] : null;
          }
        } else {
          // No stored commerce, use first available
          selectedCommerce.value =
            commerces.value && commerces.value.length > 0 ? commerces.value[0] : null;
        }

        // Save to store if we have a commerce (auto-select first if only one)
        if (commerces.value && commerces.value.length > 0) {
          if (
            !selectedCommerce.value ||
            !commerces.value.find(c => c.id === selectedCommerce.value.id)
          ) {
            // Auto-select first commerce if none selected or selected one is not in list
            selectedCommerce.value = commerces.value[0];
          }
          await store.setCurrentCommerce(selectedCommerce.value);
        } else {
          // Clear commerce if no commerces available
          selectedCommerce.value = null;
          await store.setCurrentCommerce(null);
        }

        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };

    const handleCommerceChange = event => {
      if (!event || !event.target) return;
      const commerceId = event.target.value;
      if (!commerceId || !commerces.value || commerces.value.length === 0) return;
      const commerce = commerces.value.find(c => c && c.id === commerceId);
      if (commerce && commerce.id) {
        selectCommerce(commerce);
      }
    };

    const selectCommerce = async commerce => {
      if (!commerce || !commerce.id) return;

      try {
        loading.value = true;
        // Ensure commerce object is valid before setting
        if (commerce && commerce.id) {
          selectedCommerce.value = commerce;
          await store.setCurrentCommerce(commerce);
          emit('commerce-changed', commerce);
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };

    // Watch for business changes
    watch(
      () => store.getCurrentBusiness,
      (newBusiness, oldBusiness) => {
        if (!newBusiness || (oldBusiness && newBusiness.id === oldBusiness.id)) return;
        loadCommerces();
      },
      { deep: true }
    );

    // Watch for stored commerce changes from other sources
    watch(
      () => store.getCurrentCommerce,
      newCommerce => {
        if (
          newCommerce &&
          newCommerce.id &&
          (!selectedCommerce.value ||
            !selectedCommerce.value?.id ||
            selectedCommerce.value.id !== newCommerce.id)
        ) {
          selectedCommerce.value = newCommerce;
        } else if (!newCommerce || !newCommerce.id) {
          // Handle null commerce gracefully
          selectedCommerce.value = null;
        }
      },
      { deep: true }
    );

    onBeforeMount(async () => {
      await loadCommerces();
    });

    // Removed duplicate loadCommerces call from onMounted - onBeforeMount is sufficient

    return {
      commerces,
      selectedCommerce,
      loading,
      shouldShow,
      selectCommerce,
      handleCommerceChange,
      currentUserType,
    };
  },
};
</script>

<template>
  <div v-if="shouldShow && !loading" class="commerce-selector">
    <select
      class="btn-md btn-light text-dark px-2"
      :value="selectedCommerce ? selectedCommerce.id : ''"
      @change="handleCommerceChange($event)"
      id="commerce-select"
    >
      <option value="" disabled>{{ $t('commerceSelector.select') || 'Select Commerce' }}</option>
      <option v-for="commerce in commerces" :key="commerce?.id || ''" :value="commerce?.id || ''">
        {{ commerce?.active ? `🟢 ${commerce?.tag || ''}` : `🔴 ${commerce?.tag || ''}` }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.commerce-selector {
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
</style>
