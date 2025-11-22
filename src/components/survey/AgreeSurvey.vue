<script>
export default {
  name: 'AgreeSurvey',
  props: {
    show: { type: Boolean, default: false },
    agree: { type: Number, default: 10 },
  },
  emits: ['update:agree'],
  data() {
    return {
      selected: 10,
    };
  },
  beforeMount() {
    this.select(10);
  },
  methods: {
    select(value) {
      this.selected = value;
      this.$emit('update:agree', this.selected);
    },
  },
};
</script>

<template>
  <div v-if="show">
    <div class="nps-container">
      <div class="widget">
        <span class="title">
          <i class="bi bi-hand-thumbs-down-fill"></i> {{ $t('attentionSurvey.agree.subtitle') }}
          <i class="bi bi-hand-thumbs-up-fill"></i>
        </span>
        <br />
        <button
          :class="`button detractor ${selected == 1 ? 'detractor-selected' : ''}`"
          @click="select(1)"
        >
          1
        </button>
        <button
          :class="`button detractor ${selected == 2 ? 'detractor-selected' : ''}`"
          @click="select(2)"
        >
          2
        </button>
        <button
          :class="`button detractor ${selected == 3 ? 'detractor-selected' : ''}`"
          @click="select(3)"
        >
          3
        </button>
        <button
          :class="`button detractor ${selected == 4 ? 'detractor-selected' : ''}`"
          @click="select(4)"
        >
          4
        </button>
        <button
          :class="`button detractor ${selected == 5 ? 'detractor-selected' : ''}`"
          @click="select(5)"
        >
          5
        </button>
        <button
          :class="`button passive ${selected == 6 ? 'passive-selected' : ''}`"
          @click="select(6)"
        >
          6
        </button>
        <button
          :class="`button passive ${selected == 7 ? 'passive-selected' : ''}`"
          @click="select(7)"
        >
          7
        </button>
        <button
          :class="`button passive ${selected == 8 ? 'passive-selected' : ''}`"
          @click="select(8)"
        >
          8
        </button>
        <button
          :class="`button promoter ${selected == 9 ? 'promoter-selected' : ''}`"
          @click="select(9)"
        >
          9
        </button>
        <button
          :class="`button promoter ${selected == 10 ? 'promoter-selected' : ''}`"
          @click="select(10)"
        >
          10
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nps-container {
  margin: 1rem;
}
.title {
  font-size: 12px;
  font-weight: 500;
}

.button {
  /* padding: 5px 10px; */
  font-size: 12px;
  white-space: nowrap;
  vertical-align: middle;
  display: inline-block;
  background: none;
  border: none;
  box-shadow: none;
  cursor: pointer;
  text-align: center;
  font-weight: 700;
  border-radius: 100%;
  margin: 0.2rem;
  outline: none;
  margin-left: -1px;
  width: 40px;
  height: 40px;
  border: 2px solid #eee;
  transform: scale(1);
}

.detractor:hover {
  background: #f44336;
  color: white;
  border-color: lighten(#f44336, 5%);
  transform: scale(1);
}

.detractor-selected {
  background: #f44336;
  color: white;
  border-color: lighten(#f44336, 5%);
  transform: scale(1.2);
}

.passive:hover {
  background: #f57c00;
  color: white;
  border-color: lighten(#f57c00, 5%);
  transform: scale(1);
}

.passive-selected {
  background: #f57c00;
  color: white;
  border-color: lighten(#f57c00, 5%);
  transform: scale(1.2);
}

.promoter:hover {
  background: #4caf50;
  color: white;
  border-color: lighten(#4caf50, 5%);
  transform: scale(1);
}

.promoter-selected {
  background: #4caf50;
  color: white;
  border-color: lighten(#4caf50, 5%);
  transform: scale(1.2);
}
</style>
