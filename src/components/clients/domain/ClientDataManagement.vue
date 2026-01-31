<script>
import { ref, reactive, toRefs, watch, computed, onBeforeMount } from 'vue';
import { updateClient } from '../../../application/services/client';
import { validateEmail } from '../../../shared/utils/email';
import { getActiveFeature } from '../../../shared/features';
import Message from '../../../components/common/Message.vue';
import Spinner from '../../../components/common/Spinner.vue';
import Alert from '../../../components/common/Alert.vue';
import Warning from '../../../components/common/Warning.vue';
import ClientForm from '../../../components/domain/ClientForm.vue';
import { validateIdNumber } from '../../../shared/utils/idNumber';

export default {
  name: 'ClientDataManagement',
  components: { Message, Spinner, Alert, Warning, ClientForm },
  props: {
    showClientDataManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    client: { type: Object, default: {} },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    closeModal: { type: Function, default: () => {} },
  },
  async setup(props, { emit }) {
    const loading = ref(false);
    const alertError = ref('');

    const { showClientDataManagement, toggles, client, commerce, commerces } = toRefs(props);

    const { closeModal } = props;

    const state = reactive({
      newUser: {},
      errorsAdd: [],
      phone: '',
      phoneCode: '',
      accept: false,
      clientData: undefined,
    });

    // ✅ Define receiveData first so it can be used in watchers and onBeforeMount
    const receiveData = data => {
      if (data) {
        // ✅ Always set clientId when receiving data
        state.newUser.clientId = client.value?.id || state.newUser.clientId;
        // ✅ Set all fields, including empty strings to clear previous values
        state.newUser.name = data.name || '';
        state.newUser.lastName = data.lastName || '';
        state.newUser.idNumber = data.idNumber || '';
        state.newUser.email = data.email || '';
        state.newUser.birthday = data.birthday || '';
        state.newUser.addressCode = data.addressCode || '';
        state.newUser.addressText = data.addressText || '';
        state.newUser.addressComplement = data.addressComplement || '';
        state.newUser.origin = data.origin || '';
        state.newUser.code1 = data.code1 || '';
        state.newUser.code2 = data.code2 || '';
        state.newUser.code3 = data.code3 || '';
        state.newUser.healthAgreementId = data.healthAgreementId || '';

        // ✅ Debug: Log received data
        console.log({
          birthday: data.birthday,
          origin: data.origin,
          stateBirthday: state.newUser.birthday,
          stateOrigin: state.newUser.origin,
        });
        if (data.phoneCode && data.phone) {
          const cleanedPhone = data.phone.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '');
          const cleanedPhoneCode = data.phoneCode.replace(
            /[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g,
            '',
          );

          // Verificar si el teléfono ya comienza con el código de área
          if (cleanedPhone.startsWith(cleanedPhoneCode)) {
            // El teléfono ya tiene el código de área, usarlo directamente
            state.phone = cleanedPhone.slice(cleanedPhoneCode.length);
            state.phoneCode = cleanedPhoneCode;
            state.newUser.phone = cleanedPhone;
          } else {
            // El teléfono no tiene el código de área, concatenarlo
            state.phone = cleanedPhone;
            state.phoneCode = cleanedPhoneCode;
            state.newUser.phone = `${cleanedPhoneCode}${cleanedPhone}`;
          }
        } else if (data.phone) {
          // ✅ Extract phone code from phone if not provided separately
          const cleanPhone = data.phone.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '');
          state.phoneCode = cleanPhone.slice(0, 2);
          state.phone = cleanPhone.slice(2);
          state.newUser.phone = cleanPhone;
        } else {
          // ✅ Clear phone fields if no phone data
          state.phone = '';
          state.phoneCode = '';
          state.newUser.phone = '';
        }
      }
    };

    // ✅ Helper function to populate form from client data
    const populateFormFromClient = clientData => {
      if (!clientData) return;

      // ✅ Extract personalInfo if it exists (from backend client structure)
      const personalInfo = clientData.personalInfo || {};

      // ✅ Try multiple possible locations for each field
      // Priority: 1) Flat properties (userBirthday, userOrigin), 2) personalInfo object, 3) direct properties
      const birthday =
        clientData.userBirthday || personalInfo.birthday || clientData.birthday || '';

      const origin = clientData.userOrigin || personalInfo.origin || clientData.origin || '';

      const addressCode =
        clientData.userAddressCode || personalInfo.addressCode || clientData.addressCode || '';

      const addressText =
        clientData.userAddressText || personalInfo.addressText || clientData.addressText || '';

      const addressComplement =
        clientData.userAddressComplement ||
        personalInfo.addressComplement ||
        clientData.addressComplement ||
        '';

      const code1 = clientData.userCode1 || personalInfo.code1 || clientData.code1 || '';

      const code2 = clientData.userCode2 || personalInfo.code2 || clientData.code2 || '';

      const code3 = clientData.userCode3 || personalInfo.code3 || clientData.code3 || '';

      const healthAgreementId =
        clientData.healthAgreementId ||
        personalInfo.healthAgreementId ||
        clientData.userHealthAgreementId ||
        '';

      receiveData({
        name: clientData.userName || clientData.name || '',
        lastName: clientData.userLastName || clientData.lastName || '',
        idNumber: clientData.userIdNumber || clientData.idNumber || '',
        email: clientData.userEmail || clientData.email || '',
        birthday,
        addressCode,
        addressText,
        addressComplement,
        origin,
        code1,
        code2,
        code3,
        healthAgreementId,
        phone: clientData.userPhone || clientData.phone || '',
      });
    };

    // ✅ Initialize clientData from client prop immediately
    onBeforeMount(() => {
      if (client.value) {
        state.clientData = client.value;
        // ✅ Immediately populate form with client data when component mounts
        populateFormFromClient(client.value);
      }
    });

    // ✅ Watch for client prop changes to update clientData
    watch(
      () => client.value,
      newClient => {
        if (newClient) {
          state.clientData = newClient;
          // ✅ Populate form when client changes
          populateFormFromClient(newClient);
        }
      },
      { deep: true, immediate: true },
    );

    const showConditions = () => {
      if (
        getActiveFeature(state.commerce, 'attention-user-name', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-lastName', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-idNumber', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-phone', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-email', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-birthday', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-address', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-origin', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-code1', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-code2', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-code3', 'USER') ||
        getActiveFeature(state.commerce, 'attention-user-health-agreement', 'USER')
      ) {
        return true;
      }
      return false;
    };

    const isDataActive = commerce => {
      let active = false;
      let features = [];
      if (commerce && commerce.features && commerce.features.length > 0) {
        features = commerce.features.filter(
          feature => feature.type === 'USER' && feature.active === true
        );
        if (features.length > 0) {
          active = true;
        }
      }
      if (!active) {
        state.accept = true;
      }
      return active;
    };

    const validate = user => {
      state.errorsAdd = [];
      if (!user.clientId || user.clientId.length === 0) {
        if (!getActiveFeature(state.commerce, 'attention-user-not-required', 'USER')) {
          if (getActiveFeature(state.commerce, 'attention-user-name', 'USER')) {
            if (!user.name || user.name.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.name');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-lastName', 'USER')) {
            if (!user.lastName || user.lastName.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.lastName');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-idNumber', 'USER')) {
            if (
              !user.idNumber ||
              user.idNumber.length === 0 ||
              !validateIdNumber(state.commerce, user.idNumber)
            ) {
              state.errorsAdd.push('commerceQueuesView.validate.idNumber');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-phone', 'USER')) {
            if (!state.phoneCode || state.phoneCode.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.phoneCode');
            } else {
              if (state.phoneCode === 'xx') {
                state.phoneCode = '';
              }
              user.phone = state.phoneCode + state.phone.replace(/^0+/, '');
            }
            if (!state.phone || state.phone.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.phone');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-email', 'USER')) {
            if (!user.email || user.email.length === 0 || !validateEmail(user.email)) {
              state.errorsAdd.push('commerceQueuesView.validate.email');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-address', 'USER')) {
            if (!user.addressText || user.addressText.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.addressText');
            }
            if (!user.addressCode || user.addressCode.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.addressCode');
            }
            if (!user.addressComplement || user.addressComplement.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.addressComplement');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-birthday', 'USER')) {
            if (!user.birthday || user.birthday.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.birthday');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-origin', 'USER')) {
            if (!user.origin || user.origin.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.origin');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-code1', 'USER')) {
            if (!user.code1 || user.code1.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.code1');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-code2', 'USER')) {
            if (!user.code2 || user.code2.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.code2');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-code3', 'USER')) {
            if (!user.code3 || user.code3.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.code3');
            }
          }
          if (getActiveFeature(state.commerce, 'attention-user-health-agreement', 'USER')) {
            if (!user.healthAgreementId || user.healthAgreementId.length === 0) {
              state.errorsAdd.push('commerceQueuesView.validate.healthAgreementId');
            }
          }
        } else {
          if (getActiveFeature(state.commerce, 'attention-user-email', 'USER')) {
            if (!validateEmail(user.email)) {
              state.errorsAdd.push('commerceQueuesView.validate.email');
            }
          }
        }
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const buildUserBody = user => {
      const personalInfo = {};
      if (user.birthday) {
        personalInfo.birthday = user.birthday;
        delete user.birthday;
      }
      if (user.addressText) {
        personalInfo.addressText = user.addressText;
        delete user.addressText;
      }
      if (user.addressCode) {
        personalInfo.addressCode = user.addressCode;
        delete user.addressCode;
      }
      if (user.addressComplement) {
        personalInfo.addressComplement = user.addressComplement;
        delete user.addressComplement;
      }
      if (user.origin) {
        personalInfo.origin = user.origin;
        delete user.origin;
      }
      if (user.code1) {
        personalInfo.code1 = user.code1;
        delete user.code1;
      }
      if (user.code2) {
        personalInfo.code2 = user.code2;
        delete user.code2;
      }
      if (user.code3) {
        personalInfo.code3 = user.code3;
        delete user.code3;
      }
      if (user.healthAgreementId) {
        personalInfo.healthAgreementId = user.healthAgreementId;
        delete user.healthAgreementId;
      }
      user.personalInfo = personalInfo;
      return user;
    };

    const update = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        if (validate(state.newUser)) {
          const bodyUser = buildUserBody(state.newUser);
          let body = undefined;
          if (isDataActive(commerce.value)) {
            body = {
              ...bodyUser,
              commerceId: commerce.value.id,
              businessId: commerce.value.businessId,
            };
          }
          const updatedClient = await updateClient(client.value.id, body);
          // Emit event with updated client data
          if (updatedClient) {
            // Merge updated data into client object to update the prop reactively
            const updatedData = {
              userName: updatedClient.name || updatedClient.userName,
              userLastName: updatedClient.lastName || updatedClient.userLastName,
              userIdNumber: updatedClient.idNumber || updatedClient.userIdNumber,
              userEmail: updatedClient.email || updatedClient.userEmail,
              userPhone: updatedClient.phone || updatedClient.userPhone,
              ...(updatedClient.personalInfo || {}),
            };
            Object.assign(client.value, updatedData);
            // Emit event to notify parent component
            emit('client-updated', updatedData);
          }
          closeModal();
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };

    const changeData = computed(() => {
      const { clientData } = state;
      return {
        clientData,
      };
    });

    const visible = computed(() => {
      const { showClientDataManagement } = props;
      return showClientDataManagement;
    });

    // ✅ Watch for showClientDataManagement to populate data when modal opens
    watch(
      () => showClientDataManagement.value,
      isVisible => {
        if (isVisible && client.value) {
          state.clientData = client.value;
          // ✅ Immediately populate form with client data when modal opens
          populateFormFromClient(client.value);
        }
      },
    );

    return {
      state,
      alertError,
      loading,
      showClientDataManagement,
      toggles,
      client,
      commerce,
      commerces,
      visible,
      update,
      showConditions,
      receiveData,
    };
  },
};
</script>
<template>
  <div>
    <div
      id="clientData-management"
      class="row"
      v-if="showClientDataManagement === true && toggles && toggles['client.admin.edit']"
    >
      <div class="content text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
        <div v-if="!loading">
          <div>
            <!-- FORM -->
            <ClientForm
              :show="visible"
              :commerce="commerce"
              :name="state.newUser.name"
              :last-name="state.newUser.lastName"
              :id-number="state.newUser.idNumber"
              :email="state.newUser.email"
              :phone="state.newUser.phone"
              :birthday="state.newUser.birthday"
              :address-text="state.newUser.addressText"
              :address-code="state.newUser.addressCode"
              :address-complement="state.newUser.addressComplement"
              :origin="state.newUser.origin"
              :code1="state.newUser.code1"
              :code2="state.newUser.code2"
              :code3="state.newUser.code3"
              :health-agreement-id="state.newUser.healthAgreementId"
              :client="client.id"
              :errors-add="state.errorsAdd"
              :receive-data="receiveData"
              :client-front="false"
            >
            </ClientForm>
            <div class="row mx-4">
              <button
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                @click="update()"
              >
                {{ $t('businessCommercesAdmin.update') }} <i class="bi bi-save"></i>
              </button>
            </div>
            <div class="row g-1 errors" id="feedback" v-if="state.errorsAdd.length > 0">
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
    </div>
    <div v-if="showClientDataManagement === true && (!toggles || !toggles['client.admin.edit'])">
      <Message
        :icon="'graph-up-arrow'"
        :title="$t('dashboard.message.1.title')"
        :content="$t('dashboard.message.1.content')"
      />
    </div>
  </div>
</template>
<style scoped>
.choose-attention {
  padding-bottom: 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1rem;
}
.data-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
}
.booking-data-card {
  --margin-top: 0.2rem;
  margin-bottom: 0.5rem;
  background-color: var(--color-background);
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  font-weight: 400;
}
.waitlist-box {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.3rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
  margin-bottom: 0.5rem;
}
.select {
  border-radius: 0.5rem;
  border: 1px solid var(--gris-clear);
}
.subtitle-info {
  font-size: 0.9rem;
  line-height: 1rem;
}
</style>
