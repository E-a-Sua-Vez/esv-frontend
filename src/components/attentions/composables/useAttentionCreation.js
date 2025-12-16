import { ref, reactive } from 'vue';
import { createAttention } from '../../../application/services/attention';
import { globalStore } from '../../../stores';
import { validateEmail } from '../../../shared/utils/email';
import { validateIdNumber } from '../../../shared/utils/idNumber';
import { getActiveFeature } from '../../../shared/features';
import { DateModel } from '../../../shared/utils/date.model';

export function useAttentionCreation(commerce, options = {}) {
  const store = globalStore();
  const errors = ref([]);
  const loading = ref(false);

  const validateUser = (user, phoneCode, phone, accept, showConditionsFn) => {
    errors.value = [];

    if (!user.clientId || user.clientId.length === 0) {
      if (!getActiveFeature(commerce, 'attention-user-not-required', 'USER')) {
        if (getActiveFeature(commerce, 'attention-user-name', 'USER')) {
          if (!user.name || user.name.length === 0) {
            errors.value.push('commerceQueuesView.validate.name');
          }
        }
        if (getActiveFeature(commerce, 'attention-user-lastName', 'USER')) {
          if (!user.lastName || user.lastName.length === 0) {
            errors.value.push('commerceQueuesView.validate.lastName');
          }
        }
        if (getActiveFeature(commerce, 'attention-user-idNumber', 'USER')) {
          if (
            !user.idNumber ||
            user.idNumber.length === 0 ||
            !validateIdNumber(commerce, user.idNumber)
          ) {
            errors.value.push('commerceQueuesView.validate.idNumber');
          }
        }
        if (getActiveFeature(commerce, 'attention-user-phone', 'USER')) {
          if (!phoneCode || phoneCode.length === 0) {
            errors.value.push('commerceQueuesView.validate.phoneCode');
          } else {
            if (phoneCode === 'xx') {
              phoneCode = '';
            }
            user.phone = phoneCode + phone.replace(/^0+/, '');
          }
          if (!phone || phone.length === 0) {
            errors.value.push('commerceQueuesView.validate.phone');
          }
        }
        if (getActiveFeature(commerce, 'attention-user-email', 'USER')) {
          if (!user.email || user.email.length === 0 || !validateEmail(user.email)) {
            errors.value.push('commerceQueuesView.validate.email');
          }
        }
        if (getActiveFeature(commerce, 'attention-user-address', 'USER')) {
          if (!user.addressText || user.addressText.length === 0) {
            errors.value.push('commerceQueuesView.validate.addressText');
          }
          if (!user.addressCode || user.addressCode.length === 0) {
            errors.value.push('commerceQueuesView.validate.addressCode');
          }
          if (!user.addressComplement || user.addressComplement.length === 0) {
            errors.value.push('commerceQueuesView.validate.addressComplement');
          }
        }
        if (getActiveFeature(commerce, 'attention-user-birthday', 'USER')) {
          if (!user.birthday || user.birthday.length === 0) {
            errors.value.push('commerceQueuesView.validate.birthday');
          }
        }
        if (getActiveFeature(commerce, 'attention-user-origin', 'USER')) {
          if (!user.origin || user.origin.length === 0) {
            errors.value.push('commerceQueuesView.validate.origin');
          }
        }
        if (getActiveFeature(commerce, 'attention-user-code1', 'USER')) {
          if (!user.code1 || user.code1.length === 0) {
            errors.value.push('commerceQueuesView.validate.code1');
          }
        }
        if (getActiveFeature(commerce, 'attention-user-code2', 'USER')) {
          if (!user.code2 || user.code2.length === 0) {
            errors.value.push('commerceQueuesView.validate.code2');
          }
        }
        if (getActiveFeature(commerce, 'attention-user-code3', 'USER')) {
          if (!user.code3 || user.code3.length === 0) {
            errors.value.push('commerceQueuesView.validate.code3');
          }
        }
        if (getActiveFeature(commerce, 'attention-user-health-agreement', 'USER')) {
          if (!user.healthAgreementId || user.healthAgreementId.length === 0) {
            errors.value.push('commerceQueuesView.validate.healthAgreementId');
          }
        }
      } else {
        if (getActiveFeature(commerce, 'attention-user-email', 'USER')) {
          if (!validateEmail(user.email)) {
            errors.value.push('commerceQueuesView.validate.email');
          }
        }
      }
    }

    if (showConditionsFn && showConditionsFn()) {
      if (!accept) {
        errors.value.push('commerceQueuesView.validate.accept');
      }
    }

    return errors.value.length === 0;
  };

  const buildUserBody = user => {
    const userCopy = { ...user };
    const personalInfo = {};

    if (userCopy.birthday) {
      personalInfo.birthday = userCopy.birthday;
      delete userCopy.birthday;
    }
    if (userCopy.addressText) {
      personalInfo.addressText = userCopy.addressText;
      delete userCopy.addressText;
    }
    if (userCopy.addressCode) {
      personalInfo.addressCode = userCopy.addressCode;
      delete userCopy.addressCode;
    }
    if (userCopy.addressComplement) {
      personalInfo.addressComplement = userCopy.addressComplement;
      delete userCopy.addressComplement;
    }
    if (userCopy.origin) {
      personalInfo.origin = userCopy.origin;
      delete userCopy.origin;
    }
    if (userCopy.code1) {
      personalInfo.code1 = userCopy.code1;
      delete userCopy.code1;
    }
    if (userCopy.code2) {
      personalInfo.code2 = userCopy.code2;
      delete userCopy.code2;
    }
    if (userCopy.code3) {
      personalInfo.code3 = userCopy.code3;
      delete userCopy.code3;
    }
    if (userCopy.healthAgreementId) {
      personalInfo.healthAgreementId = userCopy.healthAgreementId;
      delete userCopy.healthAgreementId;
    }

    userCopy.personalInfo = personalInfo;
    return userCopy;
  };

  const convertBlockToPlainObject = block => {
    if (!block) {
      return undefined;
    }
    // Convert block to plain object to avoid Firestore serialization issues
    if (block.blockNumbers && block.blocks) {
      // Multiple blocks case
      return {
        blockNumbers: block.blockNumbers,
        blocks: block.blocks.map(b => ({
          number: b.number,
          hourFrom: b.hourFrom,
          hourTo: b.hourTo,
        })),
      };
    } else if (block.number) {
      // Single block case
      return {
        number: block.number,
        hourFrom: block.hourFrom,
        hourTo: block.hourTo,
      };
    }
    return block;
  };

  const isDataActive = () => !getActiveFeature(commerce, 'attention-user-not-required', 'USER');

  const createAttentionRequest = async ({
    queue,
    user,
    phoneCode,
    phone,
    accept,
    block,
    selectedServices,
    clientId,
    showConditionsFn,
    sessionId,
    date,
    type,
    telemedicineConfig,
  }) => {
    try {
      loading.value = true;
      errors.value = [];

      // Validate user data
      if (!validateUser(user, phoneCode, phone, accept, showConditionsFn)) {
        loading.value = false;
        return { success: false, errors: errors.value };
      }

      const currentChannel = store.getCurrentAttentionChannel || 'QR';
      const bodyUser = buildUserBody(user);
      let newUser = undefined;

      if (isDataActive()) {
        newUser = {
          ...bodyUser,
          commerceId: commerce.id,
          notificationOn: accept,
          notificationEmailOn: accept,
          acceptTermsAndConditions: accept,
        };
      }

      let body = {
        queueId: queue.id,
        channel: type === 'TELEMEDICINE' ? 'TELEMEDICINE' : currentChannel,
        user: newUser,
        clientId: clientId || user.clientId,
      };

      // Add type if provided
      if (type) {
        body.type = type;
      }

      // Add telemedicine config if provided
      if (telemedicineConfig) {
        body.telemedicineConfig = telemedicineConfig;
      }

      if (block && block.number) {
        body = { ...body, block: convertBlockToPlainObject(block) };
      }

      // For future bookings, send createdAt with the date
      // The backend expects createdAt for scheduled attentions
      if (date) {
        const dateStr = typeof date === 'string' ? date : new DateModel(date).toString();
        // Convert date string to ISO format for createdAt
        const createdAtDate = new Date(dateStr + 'T00:00:00');
        body = {
          ...body,
          createdAt: createdAtDate.toISOString(),
          // Also keep date for backward compatibility if needed
          date: dateStr,
        };
      }

      if (selectedServices && selectedServices.length > 0) {
        const servicesId = selectedServices.map(serv => serv.id);
        const servicesDetails = selectedServices.map(serv => ({
          id: serv.id,
          name: serv.name,
          tag: serv.tag,
          procedures: serv.serviceInfo?.procedures || 1,
        }));
        body = {
          ...body,
          servicesId,
          servicesDetails,
        };
      }

      if (sessionId) {
        body = { ...body, sessionId };
      }

      const attention = await createAttention(body);
      loading.value = false;

      return { success: true, attention, errors: [] };
    } catch (error) {
      loading.value = false;

      // Extract error message from response
      let errorMessage = 'Error desconocido';
      const errorStatus = error.response?.status || error.status || 500;

      // Try multiple ways to extract the error message
      if (error.response?.data) {
        const data = error.response.data;
        if (data.message) {
          errorMessage = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        } else if (data.error) {
          errorMessage = Array.isArray(data.error) ? data.error.join(', ') : data.error;
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.toString && data.toString() !== '[object Object]') {
          errorMessage = data.toString();
        } else {
          // Try to stringify the whole data object
          try {
            errorMessage = JSON.stringify(data);
          } catch {
            errorMessage = 'Error en el servidor';
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Store both status and message
      errors.value = [errorMessage];

      return {
        success: false,
        errors: [...errors.value], // Spread to avoid Proxy issues
        error,
        errorStatus,
        errorMessage,
      };
    }
  };

  return {
    errors,
    loading,
    validateUser,
    buildUserBody,
    convertBlockToPlainObject,
    isDataActive,
    createAttentionRequest,
  };
}
