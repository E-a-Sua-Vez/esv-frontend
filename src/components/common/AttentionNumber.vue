<script>
export default {
  name: 'AttentionNumber',
  props: {
    type: { type: String, default: 'primary' },
    number: { type: Number, default: 0 },
    data: { type: Object, default: {} },
    showData: { type: Boolean, default: true },
    toList: { type: Boolean, default: false },
  },
  data() {
    return {
      extendedEntity: false,
    }
  },
  methods: {
    hasData() {
      return Object.keys(this.data).length > 0 || false;
    },
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    colorNumberToShow() {
      return this.type === 'primary' ? 'color-primary' : this.type === 'no-device' ? 'color-nodevice' : 'color-secondary'
    },
    colorDetailToShow() {
      return this.type === 'primary' ? 'color-primary-reverse' : this.type === 'no-device' ? 'color-nodevice-reverse' : 'color-secondary-reverse'
    },
    identifier() {
      return this.data.name
        || this.data.idNumber
        || undefined
    }
  }
}
</script>

<template>
  <div class="justify-content-center">
    <span
      :class="`${toList ? 'attention-identifier-list' : 'attention-identifier'} ${colorDetailToShow()}`"
      v-if="identifier() !== undefined">
      <i class="bi bi-people-fill"></i> {{ identifier() }}
    </span>
    <div
      v-if="number"
      :class="`${toList ? 'attention-number-list' : 'attention-number'} ${colorNumberToShow()}`">
      {{ number }}
    </div>
    <div :class="`details-arrow ${colorDetailToShow()}`" v-if="showData && hasData()">
      <span
        data-bs-toggle="collapse"
        :href="`#user-data-${number}`"
        @click.prevent="showDetails()">
        <i class="dark fw-bold" :class="`bi ${extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
      </span>
      <div
        :id="`#user-data-${number}`"
        :class="`collapse ${extendedEntity ? 'show' : ''} detailed-data`">
        <div id="user-details">
          <span class="details-title fw-bold">{{ $t('attentionNumber.details.title') }}</span>
        </div>
        <div class="row details-data" v-if="data.name">
          <div class="col-4">
            <span class="fw-bold">{{ $t('attentionNumber.details.name') }}</span>
          </div>
          <div class="col-8">
            {{ data.name }}
          </div>
        </div>
        <div class="row details-data" v-if="data.lastName">
          <div class="col-4">
            <span class="fw-bold">{{ $t('attentionNumber.details.lastName') }}</span>
          </div>
          <div class="col-8">
            {{ data.lastName }}
          </div>
        </div>
        <div class="row details-data" v-if="data.idNumber">
          <div class="col-4">
            <span class="fw-bold">{{ $t('attentionNumber.details.idNumber') }}</span>
          </div>
          <div class="col-8">
            {{ data.idNumber }}
          </div>
        </div>
        <div class="row details-data" v-if="data.phone">
          <div class="col-4">
            <span class="fw-bold">{{ $t('attentionNumber.details.phone') }}</span>
          </div>
          <div class="col-8">
            {{ data.phone }}
          </div>
        </div>
        <div class="row details-data" v-if="data.email">
          <div class="col-4">
            <span class="fw-bold">{{ $t('attentionNumber.details.email') }}</span>
          </div>
          <div class="col-8">
            {{ data.email }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.attention-identifier {
  width: 60%;
  padding: .1rem 1rem;
  margin: 0;
  border-radius: .6rem;
  font-weight: 700;
  font-size: .8rem;
}
.attention-identifier-list {
  margin-bottom: -2rem;
  padding: 0rem 1.5rem 0rem 1.5rem;
  border-radius: .6rem;
  font-weight: 700;
  font-size: .7rem;
}
.attention-number {
  margin-left: .3rem;
  margin-right: .3rem;
  padding: 1rem;
  border-radius: 1rem;
  font-weight: 900;
  font-size: 2.8rem;
  line-height: 2rem;
}
.attention-number-list {
  margin-left: .3rem;
  margin-right: .3rem;
  padding: .3rem;
  padding-bottom: .5rem;
  border-radius: 1rem;
  font-weight: 900;
  font-size: 1.8rem;
  line-height: 1.5rem;
}
.color-primary {
  color: var(--verde-tu);
  background-color: var(--color-background);
  border: 1.5px solid var(--verde-tu);
}
.color-secondary {
  color: var(--gris-default);
  background-color: var(--color-background);
  border: 1px solid var(--gris-default);
}
.color-nodevice {
  color: var(--orange-no-device);
  background-color: var(--color-background);
  border: 1.5px solid var(--orange-no-device);
}
.color-primary-reverse {
  background-color: var(--verde-tu);
  color: var(--color-text);
  border: 1.5px solid var(--verde-tu);
}
.color-secondary-reverse {
  color: var(--color-text);
  background-color: var(--gris-default);
  border: 1px solid var(--gris-default);
}
.color-nodevice-reverse {
  background-color: var(--orange-no-device);
  color: var(--color-background);
  border: 1.5px solid var(--orange-no-device);
}
.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
  background-color: var(--color-background);
  border-bottom-left-radius: 2rem;
  border-bottom-right-radius: 2rem;
  border-top-left-radius: .5rem;
  border-top-right-radius: .5rem;
}
.details-arrow {
  margin-left: 1.2rem;
  margin-right: 1.2rem;
  margin-top: 0;
  padding: .01rem;
  border-bottom-left-radius: 2rem;
  border-bottom-right-radius: 2rem;
  line-height: 1rem;
  border-top: 0;
}
.show {
  padding: .5rem;
  max-height: 400px !important;
  overflow-y: auto;
}
.details-title {
  font-size: .8rem;
  color: var(--color-text);
}
.details-data {
  margin-left: 1rem;
  font-size: .7rem;
  color: var(--color-text);
  text-align: left;
}
</style>