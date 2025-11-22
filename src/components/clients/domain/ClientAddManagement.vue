<script>
import { ref, reactive, toRefs, watch, computed, onBeforeMount } from 'vue';
import { updateClient } from '../../../application/services/client';
import { validateEmail } from '../../../shared/utils/email';
import { getActiveFeature } from '../../../shared/features';
import Message from '../../common/Message.vue';
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import Warning from '../../common/Warning.vue';
import ClientForm from '../../domain/ClientForm.vue';
import { validateIdNumber } from '../../../shared/utils/idNumber';

export default {
  name: 'ClientAddManagement',
  components: { Message, Spinner, Alert, Warning, ClientForm },
  props: {
    showClientAddManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    client: { type: Object, default: {} },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    closeModal: { type: Function, default: () => {} },
  },
  async setup(props) {
    const loading = ref(false);
    const alertError = ref('');

    const { showClientAddManagement, toggles, client, commerce, commerces } = toRefs(props);

    const { closeModal } = props;

    const state = reactive({
      newUser: {},
      errorsAdd: [],
      phone: '',
      phoneCode: '',
      accept: false,
      clientData: undefined,
    });

    onBeforeMount(() => {
      state.clientData = client.value;
    });

    const receiveData = data => {
      if (data) {
        if (!state.newUser.clientId) {
          state.newUser.clientId = client.value.id;
        }
        if (data.name) {
          state.newUser.name = data.name;
        }
        if (data.lastName) {
          state.newUser.lastName = data.lastName;
        }
        if (data.idNumber) {
          state.newUser.idNumber = data.idNumber;
        }
        if (data.email) {
          state.newUser.email = data.email;
        }
        if (data.birthday) {
          state.newUser.birthday = data.birthday;
        }
        if (data.addressCode) {
          state.newUser.addressCode = data.addressCode;
        }
        if (data.addressText) {
          state.newUser.addressText = data.addressText;
        }
        if (data.addressComplement) {
          state.newUser.addressComplement = data.addressComplement;
        }
        if (data.origin) {
          state.newUser.origin = data.origin;
        }
        if (data.code1) {
          state.newUser.code1 = data.code1;
        }
        if (data.code2) {
          state.newUser.code2 = data.code2;
        }
        if (data.code3) {
          state.newUser.code3 = data.code3;
        }
        if (data.healthAgreementId) {
          state.newUser.healthAgreementId = data.healthAgreementId;
        }
        if (data.phoneCode && data.phone) {
          state.phone = data.phone.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '');
          state.phoneCode = data.phoneCode.replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '');
          state.newUser.phone = `${state.phoneCode}${state.phone}`;
        } else if (data.phone) {
          state.phoneCode = data.phone
            .replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '')
            .slice(0, 2);
          state.phone = data.phone
            .replace(/[\s~`!@#$%^&*(){}\[\];:"'<,.>?\/\\|_+=-]/g, '')
            .slice(2, data.phone.length);
          state.newUser.phone = `${state.phoneCode}${state.phone}`;
        }
      }
    };

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
      if (commerce !== undefined && commerce.features.length > 0) {
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

    const add = async () => {
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
          await updateClient(client.value.id, body);
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
      const { showClientAddManagement } = props;
      return showClientAddManagement;
    });

    watch(changeData, async () => {
      if (state.clientData) {
        const clientData = state.clientData;
        receiveData({
          name: clientData.userName,
          lastName: clientData.userLastName,
          idNumber: clientData.userIdNumber,
          email: clientData.userEmail,
          birthday: clientData.userBirthday,
          addressCode: clientData.userAddressCode,
          addressText: clientData.userAddressText,
          addressComplement: clientData.userAddressComplement,
          origin: clientData.userOrigin,
          code1: clientData.userCode1,
          code2: clientData.userCode2,
          code3: clientData.userCode3,
          healthAgreementId: clientData.healthAgreementId,
          phone: clientData.userPhone,
        });
      } else {
        state.newUser = {};
      }
    });

    return {
      state,
      alertError,
      loading,
      showClientAddManagement,
      toggles,
      client,
      commerce,
      commerces,
      visible,
      add,
      showConditions,
      receiveData,
    };
  },
};
</script>
<template>
  <div
    id="clientData-management"
    class="row"
    v-if="showClientAddManagement === true && toggles['client.admin.add']"
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
              @click="add()"
            >
              {{ $t('businessCommercesAdmin.add') }} <i class="bi bi-save"></i>
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
  <div v-if="showClientAddManagement === true && !toggles['client.admin.add']">
    <Message
      :icon="'bi-graph-up-arrow'"
      :title="$t('dashboard.message.1.title')"
      :content="$t('dashboard.message.1.content')"
    />
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
