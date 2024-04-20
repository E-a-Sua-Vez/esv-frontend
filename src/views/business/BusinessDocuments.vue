<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getDocumentByCommerceId, getDocumentOptions, addDocument } from '../../application/services/document';
import { getPermissions } from '../../application/services/permissions';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import SimpleDocumentCard from '../../components/document/SimpleDocumentCard.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

export default {
  name: 'BusinessDocuments',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, Warning, SimpleDocumentCard, ComponentMenu },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    let loading = ref(false);
    let alertError = ref('');
    let file = ref(undefined);

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      commerces: ref([]),
      documents: ref([]),
      groupedDocuments : {},
      options: {},
      optionSelected: undefined,
      commerce: {},
      showAdd: false,
      newDocument: {},
      extendedEntity: undefined,
      documentError: false,
      errorsAdd: [],
      toggles: {},
      file: undefined
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        if (state.commerce) {
          selectCommerce(state.commerce);
        }
        state.options = await getDocumentOptions();
        state.toggles = await getPermissions('document-commerce', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    })

    const isActiveBusiness = () => {
      return state.business && state.business.active === true
    };

    const goBack = () => {
      router.back();
    }

    const selectCommerce = async (commerce) => {
      try {
        loading.value = true;
        state.commerce = commerce;
        state.documents = await getDocumentByCommerceId(state.commerce.id);
        if (state.documents && state.documents.length > 0) {
          state.groupedDocuments  = state.documents.reduce((acc, conf) => {
            const type = conf.type;
            if (!acc[type]) {
              acc[type] = [];
            }
            acc[type].push(conf);
            return acc;
          }, {});
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const showAdd = () => {
      state.showAdd = true;
      state.newDocument = {
        commerceId: state.commerce.id,
      }
    }

    const validateAdd = () => {
      state.errorsAdd = [];
      if (state.optionSelected) {
        state.newDocument.type = state.optionSelected.type;
        state.newDocument.name = state.optionSelected.name;
        state.newDocument.commerceId = state.commerce.id;
        state.optionSelected = undefined;
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

    const validateDocument = (file) => {
      state.errorsAdd = [];
      if (file.size === 0 || file.size > 10000000) {
        state.errorsAdd.push('businessDocument.validate.fileSize');
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
          await addDocument(state.newDocument, file.value);
          const documents = await getDocumentByCommerceId(state.commerce.id);
          state.documents = documents;
          if (state.documents && state.documents.length > 0) {
            state.groupedDocuments = state.documents.reduce((acc, conf) => {
              const type = conf.type;
              if (!acc[type]) {
                acc[type] = [];
              }
              acc[type].push(conf);
              return acc;
            }, {});
          }
          state.showAdd = false;
          closeAddModal();
          state.newDocument = {};
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const showPopUpFile = async () => {
      document.getElementById('document-fileUpload').click();
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

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal');
      modalCloseButton.click();
    }

    return {
      state,
      loading,
      alertError,
      showPopUpFile,
      goBack,
      isActiveBusiness,
      selectCommerce,
      showAdd,
      add,
      getFile
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="$t(`businessDocument.title`)"
        :toggles="state.toggles"
        componentName="businessDocument"
        @goBack="goBack">
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessDocument">
        <div v-if="isActiveBusiness && state.toggles['document-commerce.admin.view']">
          <div id="businessDocument-controls" class="control-box">
            <div class="row">
              <div class="col" v-if="state.commerces.length > 0">
                <span>{{ $t("businessDocument.commerce") }} </span>
                <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="documents">
                  <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                </select>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessDocument.message.3.title')"
                  :content="$t('businessDocument.message.3.content')" />
              </div>
            </div>
          </div>
          <div v-if="!loading" id="businessDocument-result" class="mt-4">
            <div>
              <div v-if="state.documents.length === 0">
                <Message
                  :title="$t('businessDocument.message.2.title')"
                  :content="$t('businessDocument.message.2.content')" />
              </div>
              <div v-if="state.commerce" class="row mb-2">
                <div class="col lefted">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd()"
                    data-bs-toggle="modal"
                    :data-bs-target="`#add-document`"
                    :disabled="!state.toggles['document-commerce.admin.add']">
                    <i class="bi bi-plus-lg"></i> {{ $t("add") }}
                  </button>
                </div>
              </div>
              <div class="mt-1">
                <span class="badge bg-secondary px-2 py-2 m-1">{{ $t("businessAdmin.listResult") }} {{ state.documents.length }} </span>
              </div>
              <div class="mb-4" v-if="state.documents.length > 0 && state.toggles['document-commerce.admin.edit']">
                <div class="my-2">
                  <a class="nav-link document-title centered"
                    data-bs-toggle="collapse"
                    href="#commerce">
                    {{ $t("document.types.COMMERCE") }}
                    <span class="badge bg-secondary px-2 py-1 mx-1">{{ state.groupedDocuments['COMMERCE'] ? state.groupedDocuments['COMMERCE'].length : 0 }} </span>
                    <i class="bi bi-chevron-down mx-2"></i>
                  </a>
                  <div id="commerce" class="collapse">
                    <div v-if="state.groupedDocuments['COMMERCE'] && state.groupedDocuments['COMMERCE'].length > 0">
                      <div v-for="(document, index) in state.groupedDocuments['COMMERCE']" :key="index">
                        <SimpleDocumentCard
                          :show="true"
                          :canUpdate="state.toggles[`document-commerce.admin.${document.name}`]"
                          :document="document"
                          :showTooltip="true"
                        >
                        </SimpleDocumentCard>
                      </div>
                    </div>
                    <div v-else>
                      <Message
                        :title="$t('businessDocument.message.1.title')"
                        :content="$t('businessDocument.message.1.content')" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['document-commerce.admin.view']) && !loading">
          <Message
            :title="$t('businessDocument.message.1.title')"
            :content="$t('businessDocument.message.1.content')" />
        </div>
      </div>
    </div>
    <!-- Modal Add -->
    <div class="modal fade" :id="`add-document`" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-plus-lg"></i> {{ $t("add") }} </h5>
            <button id="close-modal" class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="loading" :stack="alertError"></Alert>
            <div id="add-document" class="document-card mb-4" v-if="state.showAdd && state.toggles['document-commerce.admin.add']">
              <div class="row g-1">
                <div id="document-feature-form-add" class="row g-1">
                  <div class="col-4 text-label">
                    {{ $t("businessDocument.feature") }}
                  </div>
                  <div class="col-8">
                    <select
                      class="btn btn-md btn-light fw-bold text-dark select mx-2"
                      v-model="state.optionSelected"
                      id="features"
                      v-bind:class="{ 'is-invalid': state.moduleError }">
                      <option v-for="opt in state.options" :key="opt.name" :value="opt">{{ $t(`document.${opt.name}.title`) }}</option>
                    </select>
                  </div>
                </div>
                <div id="document-file-form-add" class="row g-1">
                  <div class="col-4 text-label">
                    {{ $t("businessDocument.file") }}
                  </div>
                  <div class="col-8">
                    <input
                      id="document-fileUpload"
                      ref="file"
                      data-cy="document-fileUpload"
                      type="file"
                      hidden
                      @change="getFile($event)">
                    <button
                      id="document-upload-button"
                      :disabled="!state.toggles['document-commerce.admin.edit']"
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-1 px-4"
                      @click="showPopUpFile()">
                      {{ $t("businessDocument.upload") }} <i class="bi bi-cloud-upload-fill"></i>
                    </button>
                  </div>
                </div>
                <div class="row g-1" v-if="state.newDocument.file">
                  <div class="col-5"></div>
                  <div class="col-6 examples">
                    <span class=""> {{ state.newDocument.file.name }} ({{ (state.newDocument.file.size / 1000000).toFixed(2) }} MB) </span>
                  </div>
                </div>
                <div class="col">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                    @click="add(state.newDocument)">
                    {{ $t("businessDocument.add") }} <i class="bi bi-save"></i>
                  </button>
                </div>
                <div class="row g-1 errors" id="feedback" v-if="(state.errorsAdd.length > 0)">
                  <Warning>
                    <template v-slot:message>
                      <li v-for="(error, index) in state.errorsAdd" :key="index">
                        {{ $t(error) }}
                      </li>
                    </template>
                  </Warning>
                </div>
              </div>
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-dismiss="modal" aria-label="Close">{{ $t("notificationConditions.action") }} <i class="bi bi-check-lg"></i></a>
          </div>
        </div>
      </div>
    </div>
    <PoweredBy :name="state.business.name" />
  </div>
</template>

<style scoped>
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
  text-overflow: ellipsis;
}
.module-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.module-details-container {
  font-size: .8rem;
  margin-left: .5rem;
  margin-right: .5rem;
  margin-top: .5rem;
  margin-bottom: 0;
}
.is-disabled {
  opacity: 0.5;
}
.show {
  padding: 10px;
  max-height: 1500px !important;
  overflow-y: auto;
}
.document-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.document-title {
  line-height: 1.2rem;
  font-size: .9rem;
  font-weight: 700;
  text-align: left;
  background-color: var(--azul-turno);
  margin: .1rem;
  border-radius: 1rem;
  line-height: 1rem;
  border: 1.5px solid var(--azul-turno);
  color: var(--color-background);
  padding: .2rem;
}
.examples {
  font-size: .8rem;
  line-height: 1rem;
  color: .5px solid var(--gris-default);
}
</style>