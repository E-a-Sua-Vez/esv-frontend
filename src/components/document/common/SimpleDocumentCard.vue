<script>
import Popper from 'vue3-popper';
import Toggle from '@vueform/toggle';
import { getDate } from '../../../shared/utils/date';
import { activeDocument } from '../../../application/services/document';
import { getDocument, getClientDocument } from '../../../application/services/document';
import { formatIdNumber } from '../../../shared/utils/idNumber';

export default {
  name: 'SimpleConfigurationCard',
  components: { Popper, Toggle },
  props: {
    show: { type: Boolean, default: true },
    canUpdate: { type: Boolean, default: true },
    document: { type: Object, default: {} },
    commerce: { type: Object, default: {} },
    showTooltip: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    iconStyleClass: { type: String, default: '' },
  },
  data() {
    return {
      loading: false,
    };
  },
  methods: {
    async update(document) {
      try {
        await activeDocument(document.id, document);
      } catch (error) {}
    },
    getDate(date) {
      return getDate(date);
    },
    async executeDownload() {
      try {
        this.loading = true;
        const fileToDownload = await getDocument(this.document.name, this.document.option);
        if (fileToDownload) {
          const file = new Blob([fileToDownload], { type: 'application/pdf' });
          const fileURL = URL.createObjectURL(file);
          window.open(fileURL);
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async executeClientDownload(item) {
      try {
        this.loading = true;
        const fileToDownload = await getClientDocument(item.commerceId, item.option, item.name);
        if (fileToDownload) {
          const file = new Blob([fileToDownload], { type: item.format });
          const fileURL = URL.createObjectURL(file);
          window.open(fileURL);
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    documentIcon(format) {
      if (format) {
        if (format === 'application/pdf') {
          return 'bi-file-earmark-pdf';
        } else if (format.startsWith('image')) {
          return 'bi-file-earmark-image';
        }
      }
    },
    formatIdNumber(idNumber) {
      return formatIdNumber(this.commerce, idNumber);
    },
  },
};
</script>

<template>
  <div v-if="show">
    <div class="row metric-card">
      <div class="idNumber-title lefted">
        <span class="badge bg-primary metric-keyword-tag mx-1 fw-bold"
          >{{ $t(`documents.types.${document.type}`) }}
        </span>
        <span
          v-if="document.type === 'CLIENT'"
          class="badge bg-primary metric-keyword-tag mx-1 fw-bold"
          >{{ $t(`documents.options.${document.option}`) }}
        </span>
        <span
          v-if="
            document.type === 'CLIENT' &&
            document.optionSelected &&
            JSON.parse(document.optionSelected).tag
          "
          class="badge bg-primary metric-keyword-tag mx-1 fw-bold"
          >{{ JSON.parse(document.optionSelected).tag }}
        </span>
      </div>
      <div
        class="idNumber-title lefted mt-1"
        v-if="document.clientName || document.clientLastName || document.idNumber"
      >
        <span
          v-if="document.clientName || document.clientLastName"
          class="metric-keyword-tag mx-1 fw-bold"
          ><i class="bi bi-person-circle"></i>
          {{ `${document.clientName || ''} ${document.clientLastName || ''}` }}
        </span>
        <span v-if="document.clientIdNumber" class="metric-keyword-tag mx-1 fw-bold">
          <i class="bi bi-person-vcard mx-1"></i>
          {{ formatIdNumber(document.clientIdNumber) || '' }}
        </span>
      </div>
      <div class="col-6 metric-card-title mt-1">
        <div class="col-12 lefted" v-if="document.type === 'COMMERCE'">
          <i :class="`bi ${documentIcon(document.format)}`"></i>
          <span class="mx-1 document-name">
            {{ document.active ? '🟢' : '🔴' }} {{ $t(`document.${document.option}.title`) }}
          </span>
        </div>
        <div class="col-12 lefted" v-else-if="document.type === 'CLIENT'">
          <i :class="`bi ${documentIcon(document.format)}`"></i>
          <span
            class="mx-1 document-name"
            v-if="document.optionSelected && JSON.parse(document.optionSelected).name"
          >
            {{ document.available ? '🟢' : '🔴' }} {{ JSON.parse(document.optionSelected).name }}
          </span>
        </div>
        <div class="col centered">
          <Popper
            v-if="showTooltip && document.type === 'COMMERCE'"
            :class="'dark'"
            arrow
            disable-click-away
            :content="$t(`document.${document.option}.description`)"
          >
            <i class="bi bi-info-circle-fill h7 m-2"></i>
          </Popper>
        </div>
      </div>
      <div class="col-5 righted">
        <Toggle
          v-if="document.type === 'COMMERCE'"
          class="toggle"
          v-model="document.active"
          :disabled="!canUpdate"
          @click="update(document)"
        />
        <button
          v-if="document.type === 'COMMERCE'"
          class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-0 mx-1"
          @click="executeDownload()"
        >
          <i class="bi bi-download"></i>
        </button>
        <button
          v-if="document.type === 'CLIENT'"
          class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-0 mx-1"
          @click="executeClientDownload(document)"
        >
          <i class="bi bi-download"></i>
        </button>
      </div>
      <div id="conf-id-form" class="row">
        <div class="row document-details-container">
          <div class="col">
            <span
              v-if="document.modifiedBy"
              class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"
            >
              {{ document.modifiedBy }}</span
            >
            <span class="metric-keyword-tag mx-1 id">
              <span class="fw-bold"> Id: </span>{{ document.id }}
            </span>
            <span v-if="document.createdAt" class="mx-1 metric-keyword-tag id">
              <span class="fw-bold"> Date: </span> {{ getDate(document.createdAt) }}</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: 0.2rem;
  margin: 0.2rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}
.metric-card-title {
  margin: 0.1rem;
  font-size: 0.9rem;
  line-height: 0.8rem;
  font-weight: 500;
  display: flex;
  align-self: center;
}
.document-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}
.download {
  padding: 0.1rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  font-size: 1rem;
  border: 1.2px solid var(--gris-default);
  border-radius: 0.5rem;
}
.toggle {
  --toggle-width: 2.25rem;
  --toggle-height: 1rem;
  --toggle-border: 0.1rem;
}
.id {
  font-size: 0.7rem;
}
.document-name {
  text-align: left;
}
</style>
