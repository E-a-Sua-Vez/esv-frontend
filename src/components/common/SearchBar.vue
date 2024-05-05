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
          i.name?.toLowerCase().includes(this.searchString.toLowerCase()) ||
          i.keyName?.toLowerCase().includes(this.searchString.toLowerCase()) ||
          i.email?.toLowerCase().includes(this.searchString.toLowerCase()) ||
          i.idNumber?.toLowerCase().includes(this.searchString.toLowerCase()));
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
        <div v-if="searchItem" class="row d-flex m-1 searcher item" @click="selectItem(searchItem)">
          <div class="col-3">
            <img v-if="searchItem.logo" :src="searchItem.logo" class="img-thumbnail rounded-start item-image">
            <i v-else class="bi bi-person-circle"> </i>
          </div>
          <div class="col-9">
            <span v-if="searchItem.name" class="item-title"> {{ searchItem.name }} </span>
            <span v-if="searchItem.email" class="item-sub-title"> {{ searchItem.email }} </span>
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
  font-weight: 600;
  line-height: .9rem !important;
}
.item-sub-title {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: .5rem;
  font-size: .7rem;
  line-height: .7rem !important;
}
.item-image {
  max-width: 80px;
  max-height: 70px;
}
.item {
  text-align: left;
}
</style>