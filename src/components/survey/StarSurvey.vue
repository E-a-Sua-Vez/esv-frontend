<script>
export default {
  name: 'StarSurvey',
  props: {
    show: { type: Boolean, default: false },
    rating: { type: Number, default: 5 },
  },
  emits: ['update:rating'],
  data() {
    return {
      selected: 0,
    };
  },
  beforeMount() {
    this.select(5);
  },
  methods: {
    select(value) {
      this.selected = value;
      this.$emit('update:rating', this.selected || 5);
    },
  },
};
</script>

<template>
  <div v-if="show">
    <div class="nps-container">
      <div class="widget">
        <a
          :class="`button bi bi-star-fill ${selected >= 1 ? 'selected' : 'button'}`"
          @click="select(1)"
        ></a>
        <a
          :class="`button bi bi-star-fill ${selected >= 2 ? 'selected' : 'button'}`"
          @click="select(2)"
        ></a>
        <a
          :class="`button bi bi-star-fill ${selected >= 3 ? 'selected' : 'button'}`"
          @click="select(3)"
        ></a>
        <a
          :class="`button bi bi-star-fill ${selected >= 4 ? 'selected' : 'button'}`"
          @click="select(4)"
        ></a>
        <a
          :class="`button bi bi-star-fill ${selected >= 5 ? 'selected' : 'button'}`"
          @click="select(5)"
        ></a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nps-container {
  margin: 0.5rem;
}

.button {
  font-size: 2.8rem;
  color: #a9a9a9;
  margin: 0.1rem;
  cursor: pointer;
  transform: scale(1);
}

.selected:hover {
  color: #f9c322;
  border-color: lighten(#f9c322, 5%);
  transform: scale(1.5);
}

.selected {
  color: #f9c322;
  border-color: lighten(#f9c322, 5%);
}
</style>
