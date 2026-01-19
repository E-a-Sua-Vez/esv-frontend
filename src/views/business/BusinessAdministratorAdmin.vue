<script>
import { ref, reactive, onBeforeMount, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getAdministratorsByBusinessId,
  updateAdministrator,
  addAdministrator,
} from '../../application/services/administrator';
import { getPermissions } from '../../application/services/permissions';
import CollaboratorName from '../../components/common/CollaboratorName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import Popper from 'vue3-popper';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import AdministratorFormAdd from '../../components/administrator/AdministratorFormAdd.vue';
import AdministratorFormEdit from '../../components/administrator/AdministratorFormEdit.vue';

export default {
  name: 'BusinessAdministratorsAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    CollaboratorName,
    Toggle,
    Warning,
    Popper,
    ComponentMenu,
    DesktopPageHeader,
    SearchAdminItem,
    AdministratorFormAdd,
    AdministratorFormEdit,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      commerces: ref(undefined),
      administrators: ref([]),
      commerce: {},
      showAdd: false,
      newAdministrator: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      emailError: false,
      toggles: {},
      filtered: [],
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        const administrators = await getAdministratorsByBusinessId(state.business.id);
        state.administrators = administrators;
        state.filtered = administrators;
        state.toggles = await getPermissions('administrators', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const goBack = () => {
      router.back();
    };

    const validateAdd = administrator => {
      state.errorsAdd = [];
      if (!administrator.name || administrator.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessAdministratorAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!administrator.email || administrator.email.length < 10) {
        state.emailError = true;
        state.errorsAdd.push('businessAdministratorAdmin.validate.email');
      } else {
        state.emailError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = administrator => {
      state.errorsUpdate = [];
      if (administrator.bot === true) {
        return true;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const update = async administrator => {
      try {
        loading.value = true;
        if (validateUpdate(administrator)) {
          await updateAdministrator(administrator.id, administrator);
          const administrators = await getAdministratorsByBusinessId(state.business.id);
          state.administrators = administrators;
        }
        state.commerce = undefined;
        state.extendedEntity = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const showAdd = () => {
      state.showAdd = true;
      const commercesId = [];
      if (state.commerces && state.commerces.length === 1) {
        commercesId.push(state.commerces[0].id);
      }
      state.newAdministrator = {
        commercesId,
      };
    };

    const resetAddForm = () => {
      const commercesId = [];
      if (state.commerces && state.commerces.length === 1) {
        commercesId.push(state.commerces[0].id);
      }
      state.newAdministrator = {
        commercesId,
      };
      state.errorsAdd = [];
      state.nameError = false;
      state.emailError = false;
    };

    const handleModalHide = () => {
      const closeButton = document.getElementById('close-modal-admin');
      if (closeButton) {
        closeButton.blur();
      }
    };

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal-admin');
      if (modalCloseButton) {
        modalCloseButton.click();
      }
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newAdministrator)) {
          state.newAdministrator.businessId = state.business.id;
          await addAdministrator(state.newAdministrator);
          const administrators = await getAdministratorsByBusinessId(state.business.id);
          state.administrators = administrators;
          state.showAdd = false;
          state.commerce = undefined;
          closeAddModal();
          resetAddForm();
        }
        state.extendedEntity = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const selectCommerce = async (administrator, commerce) => {
      if (administrator.commercesId && administrator.commercesId.length >= 0) {
        if (!administrator.commercesId.includes(commerce.id)) {
          administrator.commercesId.push(commerce.id);
        }
      }
    };

    const selectCommerceIndex = async (index, commerce) => {
      if (!state.administrators[index].commercesId) {
        state.administrators[index].commercesId = [];
      }
      if (
        state.administrators[index].commercesId &&
        state.administrators[index].commercesId.length >= 0
      ) {
        if (!state.administrators[index].commercesId.includes(commerce.id)) {
          state.administrators[index].commercesId.push(commerce.id);
        }
      }
    };

    const showCommerce = commerceId => {
      if (state.commerces && state.commerces.length >= 1) {
        const commerce = state.commerces.find(com => com.id === commerceId);
        if (commerce) {
          return commerce.tag;
        }
      }
    };

    const deleteCommerce = (administrator, commerceId) => {
      if (administrator.commercesId && administrator.commercesId.length >= 0) {
        if (administrator.commercesId.includes(commerceId)) {
          const filtered = administrator.commercesId.filter(com => com !== commerceId);
          administrator.commercesId = filtered;
        }
      }
    };

    const showUpdateForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    };

    const receiveFilteredItems = items => {
      state.filtered = items;
    };

    onMounted(() => {
      const addModal = document.getElementById('add-administrator-modal');
      if (addModal) {
        addModal.addEventListener('hidden.bs.modal', resetAddForm);
        addModal.addEventListener('hide.bs.modal', handleModalHide);
      }
      document.addEventListener('mousedown', e => {
        if (e.target && e.target.closest('.modal-backdrop')) {
          handleModalHide();
        }
      });
    });

    onUnmounted(() => {
      const addModal = document.getElementById('add-administrator-modal');
      if (addModal) {
        addModal.removeEventListener('hidden.bs.modal', resetAddForm);
        addModal.removeEventListener('hide.bs.modal', handleModalHide);
      }
    });

    return {
      state,
      loading,
      alertError,
      showUpdateForm,
      update,
      showAdd,
      add,
      goBack,
      isActiveBusiness,
      selectCommerce,
      showCommerce,
      deleteCommerce,
      selectCommerceIndex,
      commerce,
      resetAddForm,
      handleModalHide,
      closeAddModal,
      receiveFilteredItems,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo
          :business-id="state.business?.id"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessAdministratorAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessAdministratorAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessAdministratorAdmin">
          <div v-if="isActiveBusiness && state.toggles['administrators.admin.view']">
            <div v-if="!loading" id="businessAdministratorAdmin-result" class="mt-4">
              <div>
                <div v-if="state.administrators.length === 0">
                  <Message
                    :title="$t('businessAdministratorAdmin.message.2.title')"
                    :content="$t('businessAdministratorAdmin.message.2.content')"
                  />
                </div>
                <div v-if="state.commerces" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(administrator)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-administrator-modal`"
                      :disabled="!state.toggles['administrators.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.administrators"
                    :type="'administrators'"
                    :receive-filtered-items="receiveFilteredItems"
                  ></SearchAdminItem>
                </div>
                <div
                  v-for="(administrator, index) in state.filtered"
                  :key="index"
                  class="administrator-card"
                >
                  <div class="row">
                    <div class="col-10">
                      <CollaboratorName
                        :name="administrator.name"
                        :email="administrator.email"
                        :active="administrator.active"
                      ></CollaboratorName>
                    </div>
                    <div class="col-2">
                      <a href="#" @click.prevent="showUpdateForm(index)">
                        <i
                          :id="index"
                          :class="`bi ${
                            state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                          }`"
                        ></i>
                      </a>
                    </div>
                  </div>
                  <AdministratorFormEdit
                    v-if="state.toggles['administrators.admin.read']"
                    :administrator="administrator"
                    :commerces="state.commerces"
                    :toggles="state.toggles"
                    :errors="{ errorsUpdate: state.errorsUpdate }"
                    :on-select-commerce="(admin, commerce) => selectCommerceIndex(index, commerce)"
                    :on-delete-commerce="(admin, commerceId) => deleteCommerce(admin, commerceId)"
                    :show-commerce="showCommerce"
                    :class="{ show: state.extendedEntity === index }"
                    @update:administrator="administrator = $event"
                  />
                  <div class="col" v-if="state.extendedEntity === index">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="update(administrator)"
                      :disabled="!state.toggles['administrators.admin.update']"
                    >
                      {{ $t('businessAdministratorAdmin.update') }} <i class="bi bi-save"></i>
                    </button>
                  </div>
                  <div
                    v-if="
                      (!isActiveBusiness() || !state.toggles['administrators.admin.read']) &&
                      !loading
                    "
                  >
                    <Message
                      :title="$t('businessAdministratorAdmin.message.1.title')"
                      :content="$t('businessAdministratorAdmin.message.1.content')"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="(!isActiveBusiness() || !state.toggles['administrators.admin.view']) && !loading"
          >
            <Message
              :title="$t('businessAdministratorAdmin.message.1.title')"
              :content="$t('businessAdministratorAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content text-center">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <DesktopPageHeader
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('businessAdministratorAdmin.title')"
          :toggles="state.toggles"
          component-name="businessAdministratorAdmin"
          @go-back="goBack"
        />
        <div id="businessAdministratorAdmin">
          <div v-if="isActiveBusiness && state.toggles['administrators.admin.view']">
            <div v-if="!loading" id="businessAdministratorAdmin-result" class="mt-4">
              <div>
                <div v-if="state.administrators.length === 0">
                  <Message
                    :title="$t('businessAdministratorAdmin.message.2.title')"
                    :content="$t('businessAdministratorAdmin.message.2.content')"
                  />
                </div>
                <div v-if="state.commerces" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(administrator)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-administrator-modal`"
                      :disabled="!state.toggles['administrators.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.administrators"
                    :type="'administrators'"
                    :receive-filtered-items="receiveFilteredItems"
                  ></SearchAdminItem>
                </div>
                <div
                  v-for="(administrator, index) in state.filtered"
                  :key="index"
                  class="administrator-card"
                >
                  <div class="row">
                    <div class="col-10">
                      <CollaboratorName
                        :name="administrator.name"
                        :email="administrator.email"
                        :active="administrator.active"
                      ></CollaboratorName>
                    </div>
                    <div class="col-2">
                      <a href="#" @click.prevent="showUpdateForm(index)">
                        <i
                          :id="index"
                          :class="`bi ${
                            state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                          }`"
                        ></i>
                      </a>
                    </div>
                  </div>
                  <AdministratorFormEdit
                    v-if="state.toggles['administrators.admin.read']"
                    :administrator="administrator"
                    :commerces="state.commerces"
                    :toggles="state.toggles"
                    :errors="{ errorsUpdate: state.errorsUpdate }"
                    :on-select-commerce="(admin, commerce) => selectCommerceIndex(index, commerce)"
                    :on-delete-commerce="(admin, commerceId) => deleteCommerce(admin, commerceId)"
                    :show-commerce="showCommerce"
                    :class="{ show: state.extendedEntity === index }"
                    @update:administrator="administrator = $event"
                  />
                  <div class="col" v-if="state.extendedEntity === index">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="update(administrator)"
                      :disabled="!state.toggles['administrators.admin.update']"
                    >
                      {{ $t('businessAdministratorAdmin.update') }} <i class="bi bi-save"></i>
                    </button>
                  </div>
                  <div
                    v-if="
                      (!isActiveBusiness() || !state.toggles['administrators.admin.read']) &&
                      !loading
                    "
                  >
                    <Message
                      :title="$t('businessAdministratorAdmin.message.1.title')"
                      :content="$t('businessAdministratorAdmin.message.1.content')"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="(!isActiveBusiness() || !state.toggles['administrators.admin.view']) && !loading"
          >
            <Message
              :title="$t('businessAdministratorAdmin.message.1.title')"
              :content="$t('businessAdministratorAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Add -->
    <div
      class="modal fade"
      :id="`add-administrator-modal`"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="addAdministratorModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold" id="addAdministratorModalLabel">
              <i class="bi bi-plus-lg"></i> {{ $t('add') }}
            </h5>
            <button
              id="close-modal-admin"
              class="btn-close"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
              @mousedown.stop="handleModalHide"
            ></button>
          </div>
          <div class="modal-body text-center mb-0">
            <Spinner :show="loading"></Spinner>
            <Alert :show="false" :stack="alertError"></Alert>
            <div
              id="add-administrator"
              class="administrator-card mb-4"
              v-if="state.showAdd && state.toggles['administrators.admin.add']"
            >
              <div v-if="state.administrators.length < state.toggles['administrators.admin.limit']">
                <AdministratorFormAdd
                  v-model="state.newAdministrator"
                  :commerces="state.commerces"
                  :toggles="state.toggles"
                  :errors="{
                    nameError: state.nameError,
                    emailError: state.emailError,
                    errorsAdd: state.errorsAdd,
                  }"
                  :on-select-commerce="selectCommerce"
                  :on-delete-commerce="deleteCommerce"
                  :show-commerce="showCommerce"
                />
                <div class="col">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4 pulse-btn"
                    @click="add(state.newAdministrator)"
                  >
                    {{ $t('businessAdministratorAdmin.add') }} <i class="bi bi-save"></i>
                  </button>
                </div>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessAdministratorAdmin.message.3.title')"
                  :content="$t('businessAdministratorAdmin.message.3.content')"
                />
              </div>
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              data-bs-dismiss="modal"
              aria-label="Close"
              >{{ $t('close') }} <i class="bi bi-check-lg"></i
            ></a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}

/* Desktop Layout Styles - Only affects the header row */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
    text-align: left;
  }

  .desktop-header-row .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 100px;
    width: auto;
    height: auto;
    margin-bottom: 0;
  }

  .desktop-header-row #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-header-row .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
    text-align: left;
  }
}
.administrator-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
}
.administrator-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}
.is-disabled {
  opacity: 0.5;
}
.show {
  padding: 10px;
  max-height: 400px !important;
  overflow-y: auto;
}
.errors {
  font-size: small;
  color: var(--rojo-warning);
}
.btn-close {
  height: 0em !important;
}
</style>

