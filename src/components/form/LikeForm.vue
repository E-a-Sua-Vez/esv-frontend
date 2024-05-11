<script>
export default {
  name: 'LikeForm',
  props: {
    show: { type: Boolean, default: false },
    like: { type: [String, Object], default: undefined }
  },
  emits: ['update:like'],
  data() {
    return {
      selected: undefined
    }
  },
  beforeMount() {
    //this.select(undefined);
  },
  methods: {
    select(value) {
      this.selected = value;
      this.$emit('update:like', this.selected);
    }
  }
}
</script>

<template>
  <div v-if="show">
    <div class="nps-container">
      <div class="widget">
        <span class="title"> <i class="bi bi-hand-thumbs-down-fill"></i> {{ $t("attentionForm.like.subtitle") }} <i class="bi bi-hand-thumbs-up-fill"></i>  </span> <br>
        <button :class="`button no ${selected == 'NO' ? 'no-selected': ''} m-2`" @click="select('NO')"><i class="bi bi-hand-thumbs-down-fill"></i></button>
        <button :class="`button yes ${selected == 'YES' ? 'yes-selected': ''} m-2`" @click="select('YES')"><i class="bi bi-hand-thumbs-up-fill"></i></button>
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
  margin: .2rem;
  outline: none;
  margin-left: -1px;
  width: 40px;
  height: 40px;
  border: 2px solid #eee;
  transform: scale(1);
}

.no:hover {
  background: #F44336;
  color: white;
  border-color: lighten(#F44336, 5%);
  transform: scale(1);
}

.no-selected {
  background: #F44336;
  color: white;
  border-color: lighten(#F44336, 5%);
  transform: scale(1.20);
}

.yes:hover {
  background: #3b5998;
  color: white;
  border-color: lighten(#3b5998, 5%);
  transform: scale(1);
}

.yes-selected {
  background: #3b5998;
  color: white;
  border-color: lighten(#3b5998, 5%);
  transform: scale(1.20);
}
</style>