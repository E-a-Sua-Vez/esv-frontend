<script>

export default {
  name: 'SearchBar',
  props: {
    list: { type: Object, default: [] },
    label: { type: String, default: ''}
  },
  data() {
    return {
      searchString: '',
      selectedItem: undefined
    }
  },
  methods: {
    selectItem(item) {
      this.searchString = '';
      this.selectedItem = item;
      this.$emit('selectItem', this.selectedItem)
    }
  },
  computed:{
    searchItem() {
      if (this.searchString.length >= 3) {
        const result = this.list.filter(i =>
          i.name.toLowerCase().includes(this.searchString.toLowerCase()) ||
          i.keyName.toLowerCase().includes(this.searchString.toLowerCase()));
        return result[0];
      }
    }
  }
}
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
        :placeholder="$t('enterSearcher')">
    </div>
    <div>
      <div v-if="this.searchString.length >= 3" class="card mt-1 mb-3">
        <div v-if="searchItem" class="row d-flex m-1 searcher" @click="selectItem(searchItem)">
          <div class="col-4">
            <img :src="searchItem.logo" class="img-thumbnail rounded-start item-image">
          </div>
          <div class="col-8">
            <span class="item-title"> {{ searchItem.name }} </span>
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
  margin: .5rem;
  font-size: 1rem;
  line-height: .9rem !important;
}
.item-image {
  max-width: 80px;
  max-height: 70px;
}
</style>