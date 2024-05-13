<script>
import Popper from "vue3-popper";
import Toggle from '@vueform/toggle';
import { getDate } from '../../shared/utils/date';
import { activeDocument } from '../../application/services/document';
import { getDocument } from '../../application/services/document';

export default {
  name: 'SimpleConfigurationCard',
  components: { Popper, Toggle },
  props: {
    show: { type: Boolean, default: true },
    canUpdate: { type: Boolean, default: true },
    document: { type: Object, default: {} },
    showTooltip: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    iconStyleClass: { type: String, default: '' }
  },
  data() {
    return { }
  },
  methods: {
    async update (document) {
      try {
        await activeDocument(document.id, document);
      } catch (error) {  }
    },
    getDate(date) {
      return getDate(date);
    },
    async executeDownload() {
      try {
        const fileToDownload = await getDocument(this.document.name, this.document.option);
        if (fileToDownload) {
          const file = new Blob(
            [fileToDownload],
            { type: 'application/pdf' }
          );
          const fileURL = URL.createObjectURL(file);
          window.open(fileURL);
        }
      } catch (error) {
      }
    }
  }
}
</script>

<template>
  <div v-if="show">
    <div class="row metric-card h4">
      <div class="idNumber-title lefted">
        <span class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold">{{ $t(`documents.types.${document.type}`) }} </span>
      </div>
      <div class="metric-card-title col-8">
        <div class="col-9 lefted" v-if="document.type === 'COMMERCE'">
          <i :class="`bi ${icon} ${iconStyleClass}`" ></i>
          <span> {{ $t(`document.${document.option}.title`) }} </span>
        </div>
        <div class="col-9 lefted" v-else-if="document.type === 'CLIENT'">
          <i :class="`bi ${icon} ${iconStyleClass}`" ></i>
          <span> {{ document.option }} </span>
        </div>
        <div class="col-3 centered">
          <Popper
            v-if="showTooltip"
            :class="'dark'"
            arrow
            disableClickAway
            :content="$t(`document.${document.option}.description`)">
            <i class='bi bi-info-circle-fill h7 m-2'></i>
          </Popper>
        </div>
      </div>
      <div class="col-3 centered">
        <Toggle
          class="toggle"
          v-model="document.active"
          :disabled="!canUpdate"
          @click="update(document)"
        />
        <button
          class="btn btn-sm btn-size fw-bold download fw-bold mx-1"
          @click="executeDownload()">
          <i class="bi bi-download"></i>
        </button>
      </div>
      <div id="conf-id-form" class="row">
        <div class="row document-details-container">
          <div class="col">
            <span v-if="document.modifiedAt" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ getDate(document.modifiedAt) }}</span>
            <span v-if="document.modifiedBy" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ document.modifiedBy }}</span><br>
            <span class="metric-keyword-tag mx-1 id"> <span class="fw-bold"> Id: </span>{{ document.id }} </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: .2rem;
  margin: .2rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.metric-card-title {
  margin: .1rem;
  font-size: .9rem;
  line-height: .8rem;
  font-weight: 500;
  display: flex;
  align-self: center;
}
.document-details-container {
  font-size: .8rem;
  margin-left: .5rem;
  margin-right: .5rem;
  margin-top: .5rem;
  margin-bottom: 0;
}
.download {
  padding: .1rem;
  padding-left: .5rem;
  padding-right: .5rem;
  font-size: 1rem;
  border: 1.2px solid var(--gris-default);
  border-radius: .5rem;
}
.toggle {
--toggle-width: 2.25rem;
--toggle-height: 1rem;
--toggle-border: 0.1rem;
}
.id {
  font-size: .7rem;
}
</style>