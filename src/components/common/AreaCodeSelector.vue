<script>
export default {
  name: 'AreCodeSelector',
  data() {
    return {
      areaCodes: [
        { name: '58', logo: '+58' },
        { name: '56', logo: '+56' },
        { name: '55', logo: '+55' },
      ],
    };
  },
  methods: {
    selectAreaCode(areaCode) {
      if (areaCode) {
        this.areaCode = areaCode;
      }
    },
    defaultAreaCode() {},
  },
  async beforeMount() {
    this.defaultLocale();
    this.defaultTitle();
  },
};
</script>

<template>
  <div>
    <select
      class="btn-md btn-light text-dark px-1"
      v-model="locale"
      id="locale"
      @change="selectAreaCode(areaCode)"
    >
      <option v-for="areaCode in areaCodes" :key="areaCode.name" :value="areaCode.name">
        {{ areaCode.logo }}
      </option>
    </select>
  </div>
</template>

<style scoped>
label,
select {
  color: var(--color-text);
  width: 100%;
  cursor: pointer;
}
select {
  height: 2.5rem;
  border-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
</style>
