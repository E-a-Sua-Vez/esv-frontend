<script>
import { toRefs, reactive, computed, watch, onBeforeMount } from 'vue';
import Message from '../../components/common/Message.vue';

export default {
  name: 'SearchAdminItem',
  components: { Message },
  props: {
    businessItems: { type: Array, default: [] },
    type: { type: String, default: '' },
    receiveFilteredItems: { type: Function, default: () => {} },
  },
  async setup(props) {
    const state = reactive({
      filtered: [],
      types: [],
      searchText: undefined,
      counter: 0,
      page: 1,
      totalPages: 0,
      limit: 10,
      selectedType: undefined,
      limits: [10, 20, 50, 100],
    });

    const { businessItems } = toRefs(props);

    const { receiveFilteredItems } = props;

    onBeforeMount(async () => {
      state.filtered = businessItems.value;
      if (businessItems.value && businessItems.value.length > 0) {
        const types = businessItems.value
          .filter(item => item.type)
          .map(item => (item.type ? item.type : undefined));
        if (types && types.length > 0) {
          state.types = Array.from(new Set(types));
        }
      }
      refresh(state.filtered);
    });

    const clearSearch = () => {
      state.searchText = '';
      state.selectedType = undefined;
      state.filtered = businessItems.value;
      state.page = 1;
      refresh(state.filtered);
    };

    const setPage = pageIn => {
      state.page = pageIn;
    };

    const refresh = items => {
      if (items && items.length > 0) {
        const counter = items.length;
        state.counter = counter;
        const total = counter / state.limit;
        const totalB = Math.trunc(total);
        state.totalPages = totalB <= 0 ? 1 : counter % state.limit === 0 ? totalB : totalB + 1;
        const filtered = items.slice((state.page - 1) * state.limit, state.page * state.limit);
        state.filtered = filtered;
      } else {
        state.counter = 0;
        state.totalPages = 0;
        state.limit = 10;
      }
      receiveFilteredItems(state.filtered);
    };

    const changeSearchText = computed(() => {
      const { searchText, limit } = state;
      return {
        searchText,
        limit,
      };
    });

    const changeType = computed(() => {
      const { selectedType } = state;
      return {
        selectedType,
      };
    });

    const changeLimit = computed(() => {
      const { limit } = state;
      return {
        limit,
      };
    });

    const changePage = computed(() => {
      const { page } = state;
      return {
        page,
      };
    });

    watch(changeSearchText, async newData => {
      if (newData.searchText && newData.searchText.length > 3) {
        const searchText = newData.searchText.toUpperCase();
        const items = businessItems.value;
        if (items && items.length > 0) {
          const result = items.filter(item => item.name.toUpperCase().includes(searchText));
          state.filtered = result;
        }
      } else {
        state.filtered = businessItems.value;
      }
      refresh(state.filtered);
    });

    watch(changeType, async newData => {
      if (newData.selectedType) {
        const items = businessItems.value;
        const type = newData.selectedType.toUpperCase();
        if (items && items.length > 0) {
          const result = items.filter(item => item.type.toUpperCase().includes(type));
          state.filtered = result;
        }
      } else {
        state.filtered = businessItems.value;
      }
      refresh(state.filtered);
    });

    watch(changePage, async newData => {
      if (newData.page) {
        const items = businessItems.value;
        if (state.selectedType) {
          const type = state.selectedType.toUpperCase();
          if (items && items.length > 0) {
            const result = items.filter(item => item.type.toUpperCase().includes(type));
            state.filtered = result;
            refresh(state.filtered);
          }
        } else {
          refresh(businessItems.value);
        }
      }
    });

    watch(changeLimit, async newData => {
      if (newData.limit) {
        state.page = 1;
        const items = businessItems.value;
        if (state.selectedType) {
          const type = state.selectedType.toUpperCase();
          if (items && items.length > 0) {
            const result = items.filter(item => item.type.toUpperCase().includes(type));
            state.filtered = result;
            refresh(state.filtered);
          }
        } else {
          refresh(businessItems.value);
        }
      }
    });

    return {
      state,
      clearSearch,
      setPage,
    };
  },
};
</script>

<template>
  <div>
    <div :class="'mx-2 mt-3'" id="filter-options">
      <div v-if="state.filtered">
        <div class="row col-md mb-2">
          <input
            min="1"
            max="50"
            type="text"
            class="col form-control mx-2"
            v-model="state.searchText"
            :placeholder="$t('searcher')"
          />
          <button
            class="col-2 btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2 mx-2"
            @click="clearSearch()"
          >
            <span><i class="bi bi-eraser-fill"></i></span>
          </button>
        </div>
      </div>
      <div v-if="state.types">
        <div class="col-12 col-md my-1 filter-card" v-if="state.types && state.types.length > 0">
          <label class="metric-card-subtitle mx-2" for="select-queue">
            {{ $t('dashboard.typeFilter') }}
          </label>
          <select
            class="btn btn-md btn-light fw-bold text-dark select"
            v-model="state.selectedType"
          >
            <option v-for="typ in state.types" :key="typ" :value="typ" id="select-queue">
              {{ $t(`${type}.types.${typ}`) }}
            </option>
            <option :key="'ALL'" :value="undefined" id="select-type-all">
              {{ $t('dashboard.all') }}
            </option>
          </select>
        </div>
      </div>
      <div class="mt-3">
        <span class="badge bg-secondary px-2 py-2 m-1"
          >{{ $t('businessAdmin.listResult') }} {{ state.counter }}
        </span>
        <span class="badge bg-secondary px-2 py-2 m-1">
          {{ $t('page') }} {{ state.page }} {{ $t('of') }} {{ state.totalPages }}
        </span>
        <select class="btn btn-sm btn-light fw-bold text-dark select mx-1" v-model="state.limit">
          <option v-for="lim in state.limits" :key="lim" :value="lim" id="select-queue">
            {{ lim }}
          </option>
        </select>
      </div>
      <div class="centered mt-2" v-if="state.filtered">
        <nav>
          <ul class="pagination pagination-ul">
            <li class="page-item">
              <button
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                aria-label="First"
                @click="setPage(1)"
                :disabled="state.page === 1 || state.totalPages === 0"
              >
                <span aria-hidden="true"><i class="bi bi-arrow-bar-left"></i></span>
              </button>
            </li>
            <li class="page-item">
              <button
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                aria-label="Previous"
                @click="setPage(state.page - 1)"
                :disabled="state.page === 1 || state.totalPages === 0"
              >
                <span aria-hidden="true">&laquo;</span>
              </button>
            </li>
            <li>
              <select
                class="btn btn-md btn-light fw-bold text-dark select mx-1 py-1"
                v-model="state.page"
                :disabled="state.totalPages === 0"
              >
                <option v-for="pag in state.totalPages" :key="pag" :value="pag" id="select-queue">
                  {{ pag }}
                </option>
              </select>
            </li>
            <li class="page-item">
              <button
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                aria-label="Next"
                @click="setPage(state.page + 1)"
                :disabled="state.page === state.totalPages || state.totalPages === 0"
              >
                <span aria-hidden="true">&raquo;</span>
              </button>
            </li>
            <li class="page-item">
              <button
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                aria-label="First"
                @click="setPage(state.totalPages)"
                :disabled="state.page === state.totalPages || state.totalPages === 1"
              >
                <span aria-hidden="true"><i class="bi bi-arrow-bar-right"></i></span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div v-if="state.filtered && state.filtered.length === 0">
        <Message
          :title="$t('searchAdminItem.message.1.title')"
          :content="$t('searchAdminItem.message.1.content')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.commerce-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}
.is-disabled {
  opacity: 0.5;
}
.show {
  padding: 10px;
  max-height: 2000px !important;
  overflow-y: visible;
}
.errors {
  font-size: small;
  color: var(--rojo-warning);
}
</style>
