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
  <div class="my-2" role="alert">
    <div class="row">
      <span>{{ label }} </span>
      <input
        min="1"
        max="50"
        type="text"
        class="form-control"
        v-model="searchString"
        :placeholder="$t('enterSearcher')"
      />
    </div>
    <div>
      <div v-if="this.searchString.length >= 3" class="card mt-1 menu">
        <div v-if="searchItem && searchItem.length > 0">
          <div
            v-for="item in searchItem"
            :key="item.id"
            class="row d-flex m-1 searcher item"
            @click="selectItem(item)"
          >
            <div class="col-3">
              <img
                v-if="item.logo"
                :src="item.logo"
                class="img-thumbnail rounded-start item-image"
              />
              <i v-else class="bi bi-person-circle"> </i>
            </div>
            <div class="col-9">
              <span v-if="item.name" class="item-title"> {{ item.name }} </span>
              <span v-if="item.email" class="item-sub-title m-0"> {{ item.email }} </span>
            </div>
            <hr />
          </div>
        </div>
        <div v-else>{{ $t('noResults') }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.item-title {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0.1rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 0.9rem !important;
}
.item-sub-title {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0.1rem;
  font-size: 0.7rem;
  line-height: 0.7rem !important;
}
.item-image {
  max-width: 80px;
  max-height: 70px;
}
.item {
  text-align: left;
  cursor: pointer;
}
.menu {
  height: auto;
  display: flex;
  z-index: 100;
  position: absolute;
}
</style>
