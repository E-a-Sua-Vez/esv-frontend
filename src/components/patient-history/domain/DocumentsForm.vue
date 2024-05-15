<script>
import { ref, reactive, onBeforeMount, toRefs, watch } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';
import { getPermissions } from '../../../application/services/permissions';
import { getDateAndHour } from '../../../shared/utils/date';
import { getClientDocument, addClientDocument, availableDocument } from '../../../application/services/document';
import Warning from '../../common/Warning.vue';
import Spinner from '../../common/Spinner.vue';
import Toggle from '@vueform/toggle';
import Message from '../../common/Message.vue';
import HistoryDetailsCard from '../common/HistoryDetailsCard.vue';

export default {
  name: 'DocumentsForm',
  components: { Warning, Spinner, VueRecaptcha, Toggle, Message, HistoryDetailsCard },
  props: {
    commerce: { type: Object, default: {} },
    cacheData: { type: Object, default: undefined },
    patientHistoryData: { type: Object, default: {} },
    clientData: { type: Object, default: {} },
    toggles: { type: Object, default: {} },
    errorsAdd: { type: Array, default: [] },
    patientHistoryItems: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} },
    onUpdate: { type: Function, default: () => {} },
  },
  async setup(props) {

    let loading = ref(false);
    let alertError = ref('');
    let file = ref({});

    const {
      commerce,
      cacheData,
      clientData,
      patientHistoryData,
      toggles,
      patientHistoryItems,
      errorsAdd,
    } = toRefs(props);

    const { receiveData, onUpdate } = props;

    const state = reactive({
      newDocuments: {},
      oldDocuments: [],
      documentList: [],
      captcha: false,
      documentsError: false,
      asc: true,
      errorsAdd: [],
      togglesDocuments: [],
      newDocument: {},
      optionSelected: {},
      file: undefined
    })

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.togglesDocuments = await getPermissions('document-client', 'admin');
        if (patientHistoryItems.value && patientHistoryItems.value.length > 0) {
          state.documentList = patientHistoryItems.value.filter(item => ['PATIENT_DOCUMENTS'].includes(item.type));
          state.documentList = state.documentList.sort((a, b) => b.order - a.order);
        }
        if (patientHistoryData.value && patientHistoryData.value.id) {
          state.oldDocuments = patientHistoryData.value.patientDocument.filter(doc => doc.available);
        }
        if (cacheData.value) {
          state.newDocuments = cacheData.value;
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    const sendData = async () => {
      await receiveData(state.newDocument);
    }

    const documentIcon = (format) => {
      if (format) {
        if (format === 'application/pdf') {
          return 'bi-file-earmark-pdf';
        } else if (format.startsWith('image')) {
          return 'bi-file-earmark-image';
        }
      }
    }

    const checkAsc = (event) => {
      if (event.target.checked) {
        state.asc = true;
      } else {
        state.asc = false;
      }
      if (state.oldDocuments && state.oldDocuments.length > 0) {
        let elementsSorted = [];
        const elements = state.oldDocuments;
        if (state.asc) {
          elementsSorted = elements.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        } else {
          elementsSorted = elements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        state.oldDocuments = elementsSorted.filter(doc => doc.available);
      }
    }

    const validateDocument = (file) => {
      state.errorsAdd = [];
      const typesPermitted = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];
      if (file.size === 0 || file.size > 5000000) {
        state.errorsAdd.push('businessDocument.validate.fileSize2');
      }
      if (!file.type || !typesPermitted.includes(file.type)) {
        state.errorsAdd.push('businessDocument.validate.fileType');
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const getFile = async ($event) => {
      try {
        loading.value = true;
        const target = $event.target;
        if (target && target.files && target.files.length > 0) {
          const fileUploaded = target.files[0];
          if (validateDocument(fileUploaded)) {
            file.value = fileUploaded;
            state.newDocument.file = file.value;
            state.newDocument.format = file.value.type;
          }
        }
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const validateAdd = () => {
      state.errorsAdd = [];
      if (state.optionSelected) {
        const documentMetadata = {
          clientName: clientData.value.userName,
          clientLastName: clientData.value.userLastName,
          clientIdNumber: clientData.value.userIdNumber,
          clientEmail: clientData.value.userEmail,
          optionSelected: state.optionSelected
        };
        const time = new Date().getTime();
        state.newDocument.type = 'CLIENT';
        state.newDocument.name = `${state.optionSelected.name.toLowerCase().replaceAll(' ', '-')}-${clientData.value.id}-${time}`;
        state.newDocument.commerceId = commerce.value.id;
        state.newDocument.clientId = clientData.value.id;
        state.newDocument.documentMetadata = JSON.stringify(documentMetadata);
        state.newDocument.reportType = 'patient_documents';
        state.newDocument.details = JSON.stringify(state.optionSelected);
      } else {
        state.errorsAdd.push('businessDocument.validate.feature');
      }
      if (!state.newDocument.file) {
        state.errorsAdd.push('businessDocument.validate.file');
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd()) {
          const body = state.newDocument;
          state.newDocument = await addClientDocument(body, file.value);
          state.newDocument.details = state.optionSelected;
          state.optionSelected = {};
          sendData();
          file = {};
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const executeDownload = async (item) => {
      try {
        loading.value = true;
        const fileToDownload = await getClientDocument(item.commerceId, item.option, item.name);
        if (fileToDownload) {
          const file = new Blob(
            [fileToDownload],
            { type: item.format }
          );
          const fileURL = URL.createObjectURL(file);
          window.open(fileURL);
        }
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const updateDocument = async (updatedDocument) => {
      if (updatedDocument && updatedDocument.id) {
        const elements = state.oldDocuments.filter(doc => doc.id !== updatedDocument.id);
        if (elements) {
          elements.push(updatedDocument);
        }
        state.oldDocuments = elements;
        await onUpdate(state.oldDocuments);
      }
    }

    const executeDelete = async (item) => {
      try {
        loading.value = true;
        const body = item;
        body.available = false;
        const updatedDocument = await availableDocument(item.id, body);
        if (updatedDocument && updatedDocument.id) {
          updateDocument(updatedDocument);
        }
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const showPopUpFile = async () => {
      document.getElementById('document-fileUpload').click();
    }

    watch (
      patientHistoryData,
      async () => {
        loading.value = true;
        if (patientHistoryData.value && patientHistoryData.value.id) {
          if (patientHistoryData.value.patientDocument &&
            patientHistoryData.value.patientDocument.length > 0 &&
            patientHistoryData.value.patientDocument[0]
          )
          state.oldDocuments = patientHistoryData.value.patientDocument.filter(doc => doc.available);
        }
        loading.value = false;
      }
    )

    return {
      state,
      alertError,
      loading,
      commerce,
      toggles,
      errorsAdd,
      getDateAndHour,
      checkAsc,
      getFile,
      showPopUpFile,
      add,
      executeDownload,
      executeDelete,
      documentIcon
    }
  }
}
</script>
<template>
  <div>
    <div id="form">
      <div class="row">
        <div class="col-12 mt-2">
          <div id="patient-name-form-add" class="row m-1">
            <div class="col-12 text-label">
              {{ $t("patientHistoryView.documents") }} <i class="bi bi-file-earmark-medical-fill mx-1"></i>
            </div>
            <Spinner :show="loading"></Spinner>
            <div class="col-12 mt-2">
              <div class="document-card" v-if="state.documentList && state.documentList.length > 0">
                <div class="col text-label mb-2">
                  {{ $t("businessDocument.uploadNewDocument") }} <i class="bi bi-cloud-upload-fill mx-1"></i>
                </div>
                <div id="document-feature-form-add" class="row g-1">
                  <div class="col-3">
                    {{ $t("businessDocument.feature") }}
                  </div>
                  <div class="col-9">
                    <select
                      class="btn btn-sm btn-light fw-bold text-dark select mx-2"
                      v-model="state.optionSelected"
                      id="features"
                      v-bind:class="{ 'is-invalid': state.moduleError }">
                      <option v-for="item in state.documentList" :key="item.name" :value="item">{{ item.name }}</option>
                    </select>
                  </div>
                </div>
                <div class="row mt-2" v-if="state.optionSelected && state.optionSelected.characteristics && state.optionSelected.characteristics.document && state.optionSelected.characteristics.document === true">
                  <div class="col centered">
                    <input
                      id="document-fileUpload"
                      ref="file"
                      :data-cy="`document-fileUpload-${state.optionSelected.name}`"
                      type="file"
                      hidden
                      @change="getFile($event)">
                    <button
                      id="document-upload-button"
                      :disabled="!state.togglesDocuments['document-client.admin.edit']"
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill card-action py-2"
                      @click="showPopUpFile()">
                      {{ $t("businessDocument.upload") }} <i class="bi bi-cloud-upload-fill"></i>
                    </button>
                    <button
                      id="document-add-button"
                      v-if="state.newDocument.file"
                      :disabled="!state.togglesDocuments['document-client.admin.edit']"
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill card-action py-2 bg-primary"
                      @click="add()">
                      {{ $t("businessDocument.add") }} <i class="bi bi-save"></i>
                    </button>
                  </div>
                </div>
                <div class="row g-1" v-if="state.newDocument.file">
                  <div class="col-12 examples">
                    <span class=""> <span class="fw-bold"> File: </span>{{ state.newDocument.file.name }} ({{ (state.newDocument.file.size / 1000000).toFixed(2) }} MB) </span>
                  </div>
                </div>
                <div class="" id="feedback" v-if="(state.errorsAdd.length > 0)">
                  <Warning>
                    <template v-slot:message>
                      <li v-for="(error, index) in state.errorsAdd" :key="index">
                        {{ $t(error) }}
                      </li>
                    </template>
                  </Warning>
                </div>
              </div>
              <div v-else>
                <Message
                  :title="$t('patientHistoryView.message.2.title')"
                  :content="$t('patientHistoryView.message.2.content')" />
              </div>
              <div v-if="state.oldDocuments && state.oldDocuments.length > 0">
                <div class="col-12 text-label fw-bold mt-4">
                  {{ $t("patientHistoryView.history") }} <i class="bi bi-clock-fill mx-1"></i>
                  <div class="form-check form-switch centered">
                    <input class="form-check-input m-1" :class="state.asc === false ? 'bg-danger' : ''" type="checkbox" name="asc" id="asc" v-model="state.asc" @click="checkAsc($event)">
                    <label class="form-check-label metric-card-subtitle" for="asc">{{ state.asc ? $t("dashboard.asc") :  $t("dashboard.desc") }}</label>
                  </div>
                </div>
                <div v-for="item in state.oldDocuments.filter(doc => doc.available)" :key="item.id">
                  <div v-if="item.active === true" class="document-card">
                    <div class="row" v-if="item.details && item.details.characteristics && item.details.characteristics.document && item.details.characteristics.document === true">
                      <div class="col-8">
                        <div class="lefted">
                          <span class="badge bg-primary"> {{ item.details.tag }} </span>
                          <span class="badge bg-secondary mx-1">  {{ item.details.name }} </span>
                        </div>
                        <div class="lefted">
                          <div>
                            <i :class="`bi ${documentIcon(item.format)} mx-1`"></i> <label class="form-check-label metric-card-subtitle mt-1">{{ getDateAndHour(item.createdAt) }}</label>
                          </div>
                        </div>
                      </div>
                      <div class="col-4 righted">
                        <button
                          class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2"
                          @click="executeDownload(item)">
                          <i class="bi bi-download"></i>
                        </button>
                        <button
                          class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-2"
                          @click="executeDelete(item)">
                          <i class="bi bi-trash-fill"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.blocks-section {
  overflow-y: scroll;
  max-height: 800px;
  font-size: small;
  margin-bottom: 2rem;
  padding: .5rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  background-color: var(--color-background);
}
.document-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .2rem;
  border-radius: .5rem;
  border: 1px solid var(--gris-default);
}
.download {
  padding: .1rem;
  padding-left: .5rem;
  padding-right: .5rem;
  font-size: 1rem;
  border: 1.2px solid var(--gris-default);
  border-radius: .5rem;
}
</style>