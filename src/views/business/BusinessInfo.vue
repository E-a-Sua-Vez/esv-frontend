<script>
import { ref, reactive, onBeforeMount, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import * as bootstrap from 'bootstrap';
import { globalStore } from '../../stores';
import { getBusinessById, updateBusiness } from '../../application/services/business';
import { getPermissions } from '../../application/services/permissions';
import {
  updateBusinessLogo,
  getBusinessLogo,
  getBusinessLogoUrl,
} from '../../application/services/business-logo';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import BusinessEditModal from '../../components/business/BusinessEditModal.vue';
import BusinessLogoUpload from '../../components/business/common/BusinessLogoUpload.vue';

export default {
  name: 'BusinessInfo',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ComponentMenu,
    DesktopPageHeader,
    BusinessEditModal,
    BusinessLogoUpload,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');
    const showEditModal = ref(false);
    const showLogoUpload = ref(false);

    const state = reactive({
      currentUser: {},
      business: {},
      businessForEdit: null,
      toggles: {},
      errorsUpdate: [],
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('businesses', 'admin');
        alertError.value = '';
        loading.value = false;

        // Auto-open modal on mount
        openBusinessEditModal();
      } catch (error) {
        console.error('Error in BusinessInfo onBeforeMount:', error);
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    });

    onMounted(() => {
      // Ensure modal backdrop cleanup on component mount
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    });

    onUnmounted(() => {
      // Cleanup modal backdrop on component unmount
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const goBack = () => {
      router.push({ path: '/interno/negocio/menu' });
    };

    const validateUpdate = business => {
      state.errorsUpdate = [];
      if (business.contactInfo?.phone && !business.contactInfo.phone.match(/^[0-9]{10,15}$/)) {
        state.errorsUpdate.push('businessInfo.validate.phone');
      }
      if (!business.localeInfo?.country || business.localeInfo.country.length === 0) {
        state.errorsUpdate.push('businessInfo.validate.country');
      }
      if (
        business.localeInfo?.address &&
        (business.localeInfo.address.length < 5 || business.localeInfo.address.length > 200)
      ) {
        state.errorsUpdate.push('businessInfo.validate.address');
      }
      return state.errorsUpdate.length === 0;
    };

    const update = async business => {
      try {
        loading.value = true;
        if (validateUpdate(business)) {
          business.contactInfo.phone = business.phone;
          await updateBusiness(business);
          state.business = await store.renewActualBusiness();
          closeEditModal();
          loading.value = false;
        } else {
          alertError.value = 422;
          loading.value = false;
        }
      } catch (error) {
        console.error('Error updating business:', error);
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const openBusinessEditModal = async () => {
      try {
        loading.value = true;
        const businessData = await getBusinessById(state.business.id);
        state.businessForEdit = businessData;
        showEditModal.value = true;
        loading.value = false;
      } catch (error) {
        console.error('Error loading business:', error);
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const closeEditModal = () => {
      showEditModal.value = false;
      state.businessForEdit = null;
      // Clean modal backdrop
      const modals = document.querySelectorAll('.modal-backdrop');
      modals.forEach(modal => modal.remove());
      document.body.classList.remove('modal-open');
      // Go back to menu after closing
      goBack();
    };

    const handleModalHide = () => {
      closeEditModal();
    };

    const openLogoUpload = () => {
      showLogoUpload.value = true;
    };

    const closeLogoUpload = () => {
      showLogoUpload.value = false;
    };

    const handleLogoUploaded = async () => {
      try {
        await loadBusinessLogoPreview();
        state.business = await store.renewActualBusiness();
      } catch (error) {
        console.error('Error refreshing logo:', error);
      }
    };

    const loadBusinessLogoPreview = async () => {
      try {
        if (state.businessForEdit?.id) {
          const logoUrl = await getBusinessLogoUrl(state.businessForEdit.id);
          if (logoUrl && state.businessForEdit) {
            state.businessForEdit.logo = logoUrl;
          }
        }
      } catch (error) {
        console.error('Error loading business logo preview:', error);
      }
    };

    const getBusinessLogoUrlForDisplay = businessId => {
      if (!businessId) return '';
      return getBusinessLogoUrl(businessId);
    };

    return {
      state,
      loading,
      alertError,
      showEditModal,
      showLogoUpload,
      update,
      goBack,
      isActiveBusiness,
      openBusinessEditModal,
      closeEditModal,
      handleModalHide,
      openLogoUpload,
      closeLogoUpload,
      handleLogoUploaded,
      loadBusinessLogoPreview,
      getBusinessLogoUrlForDisplay,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :src="state.business?.logo" :business-id="state.business?.id"></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessInfo.title`)"
          :toggles="state.toggles"
          component-name="businessInfo"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessInfo">
          <div v-if="isActiveBusiness() && state.toggles['businesses.admin.view']">
            <div class="control-box my-4"></div>
            <div v-if="!loading" id="businessInfo-result" class="mt-4">
              <div v-if="state.business">
                <div class="business-info-card">
                  <div class="row g-2">
                    <div class="col-12">
                      <h5 class="mb-3">{{ $t('businessInfo.currentInfo') }}</h5>
                      <p>
                        <strong>{{ $t('businessInfo.name') }}:</strong> {{ state.business.name }}
                      </p>
                      <p>
                        <strong>{{ $t('businessInfo.keyName') }}:</strong>
                        {{ state.business.keyName }}
                      </p>
                      <p>
                        <strong>{{ $t('businessInfo.email') }}:</strong> {{ state.business.email }}
                      </p>
                      <p>
                        <strong>{{ $t('businessInfo.phone') }}:</strong>
                        {{ state.business.phone || state.business.contactInfo?.phone }}
                      </p>
                      <p>
                        <strong>{{ $t('businessInfo.country') }}:</strong>
                        {{ state.business.country || state.business.localeInfo?.country }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!state.toggles['businesses.admin.view'] && !loading">
            <Message
              :title="$t('businessInfo.message.1.title')"
              :content="$t('businessInfo.message.1.content')"
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
          :logo="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('businessInfo.title')"
          :toggles="state.toggles"
          component-name="businessInfo"
          @go-back="goBack"
        />
        <div id="businessInfo">
          <div v-if="isActiveBusiness() && state.toggles['businesses.admin.view']">
            <div class="control-box my-4"></div>
            <div v-if="!loading" id="businessInfo-result" class="mt-4">
              <div v-if="state.business">
                <div class="business-info-card">
                  <div class="row g-2">
                    <div class="col-12">
                      <h5 class="mb-3">{{ $t('businessInfo.currentInfo') }}</h5>
                      <p>
                        <strong>{{ $t('businessInfo.name') }}:</strong> {{ state.business.name }}
                      </p>
                      <p>
                        <strong>{{ $t('businessInfo.keyName') }}:</strong>
                        {{ state.business.keyName }}
                      </p>
                      <p>
                        <strong>{{ $t('businessInfo.email') }}:</strong> {{ state.business.email }}
                      </p>
                      <p>
                        <strong>{{ $t('businessInfo.phone') }}:</strong>
                        {{ state.business.phone || state.business.contactInfo?.phone }}
                      </p>
                      <p>
                        <strong>{{ $t('businessInfo.country') }}:</strong>
                        {{ state.business.country || state.business.localeInfo?.country }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!state.toggles['businesses.admin.view'] && !loading">
            <Message
              :title="$t('businessInfo.message.1.title')"
              :content="$t('businessInfo.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <Teleport to="body">
      <BusinessEditModal
        v-if="showEditModal && state.businessForEdit"
        :show="showEditModal"
        :business="state.businessForEdit"
        :errors="state.errorsUpdate"
        :is-own-business="true"
        @update="update"
        @close="closeEditModal"
        @hide="handleModalHide"
        @openLogoUpload="openLogoUpload"
        @loadLogo="loadBusinessLogoPreview"
      />
    </Teleport>

    <!-- Logo Upload Modal -->
    <Teleport to="body">
      <BusinessLogoUpload
        v-if="showLogoUpload && state.businessForEdit"
        :show="showLogoUpload"
        :business-id="state.businessForEdit.id"
        @close="closeLogoUpload"
        @uploaded="handleLogoUploaded"
      />
    </Teleport>
  </div>
</template>

<style scoped>
.business-info-card {
  background-color: var(--color-background);
  padding: 1.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  text-align: left;
}

.business-info-card p {
  margin-bottom: 0.5rem;
}

.business-info-card strong {
  color: var(--gris-dark);
}
</style>
