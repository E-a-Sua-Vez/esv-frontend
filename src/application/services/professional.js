import { requestBackend, getHeaders } from '../api';

const entity = 'professional';

export const getProfessionalById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getProfessionalsByBusiness = async businessId =>
  (await requestBackend.get(`/${entity}/business/${businessId}`, await getHeaders())).data;

export const getProfessionalsByCommerce = async commerceId =>
  (await requestBackend.get(`/${entity}/commerce/${commerceId}`, await getHeaders())).data;

export const getActiveProfessionalsByCommerce = async commerceId =>
  (await requestBackend.get(`/${entity}/commerce/${commerceId}/active`, await getHeaders())).data;

export const getProfessionalsById = async ids => {
  if (ids && ids.length > 0) {
    return (await requestBackend.get(`/${entity}/list/${ids}`, await getHeaders())).data;
  }
};

export const getAvailableProfessionalsForService = async (serviceId, commerceId) =>
  (
    await requestBackend.get(
      `/${entity}/service/${serviceId}/available?commerceId=${commerceId}`,
      await getHeaders(),
    )
  ).data;

export const createProfessional = async professional =>
  (await requestBackend.post(`/${entity}`, professional, await getHeaders())).data;

export const addProfessional = async professional =>
  (await requestBackend.post(`/${entity}`, professional, await getHeaders())).data;

export const updateProfessional = async professional => {
  // Si hay profilePhoto con File en personalInfo, primero hacer upload separado
  if (
    professional.personalInfo?.profilePhoto &&
    professional.personalInfo.profilePhoto instanceof File
  ) {
    try {
      const response = await uploadProfilePhoto(
        professional.id,
        professional.personalInfo.profilePhoto,
      );
      professional.personalInfo.profilePhoto = response.photoUrl;
    } catch (e) {
      console.error('Error uploading profile photo:', e);
      // Continuar sin photo si falla el upload
    }
  }

  // Si hay digitalSignature con File en personalInfo, primero hacer upload separado
  if (
    professional.personalInfo?.digitalSignature &&
    professional.personalInfo.digitalSignature instanceof File
  ) {
    try {
      const response = await uploadDigitalSignature(
        professional.id,
        professional.personalInfo.digitalSignature,
      );
      professional.personalInfo.digitalSignature = response.signatureUrl;
    } catch (e) {
      console.error('Error uploading digital signature:', e);
      // Continuar sin signature si falla el upload
    }
  }

  return (
    await requestBackend.patch(`/${entity}/${professional.id}`, professional, await getHeaders())
  ).data;
};

export const getProfessionalsByCommerceId = async commerceId =>
  (await requestBackend.get(`/${entity}/commerce/${commerceId}`, await getHeaders())).data;

/**
 * Upload profile photo for professional
 */
export const uploadProfilePhoto = async (professionalId, file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return (
    await requestBackend.post(
      `/${entity}/${professionalId}/profile-photo`,
      formData,
      await getHeaders('multipart/form-data')
    )
  ).data;
};

/**
 * Upload digital signature for professional
 */
export const uploadDigitalSignature = async (professionalId, file) => {
  const formData = new FormData();
  formData.append('signature', file);
  return (
    await requestBackend.post(
      `/${entity}/${professionalId}/digital-signature`,
      formData,
      await getHeaders('multipart/form-data')
    )
  ).data;
};

/**
 * Get signed URL for profile photo
 */
export const getProfilePhotoUrl = async professionalId =>
  (await requestBackend.get(`/${entity}/${professionalId}/profile-photo`, await getHeaders())).data;

/**
 * Get signed URL for digital signature
 */
export const getDigitalSignatureUrl = async professionalId =>
  (await requestBackend.get(`/${entity}/${professionalId}/digital-signature`, await getHeaders()))
    .data;

/**
 * Actualizar datos médicos del profesional
 */
export const updateMedicalData = async (professionalId, medicalData) =>
  (
    await requestBackend.patch(
      `/${entity}/${professionalId}/medical-data`,
      medicalData,
      await getHeaders()
    )
  ).data;

/**
 * Obtener profesionales médicos de un commerce
 */
export const getMedicalProfessionalsByCommerceId = async commerceId =>
  (await requestBackend.get(`/${entity}/medical/commerce/${commerceId}`, await getHeaders())).data;

/**
 * Obtener profesional para documentos médicos
 */
export const getProfessionalForMedicalDocuments = async professionalId =>
  (await requestBackend.get(`/${entity}/${professionalId}/for-documents`, await getHeaders())).data;

/**
 * Obtener profesional por collaborador ID
 */
export const getProfessionalByCollaboratorId = async collaboratorId =>
  (await requestBackend.get(`/${entity}/by-collaborator/${collaboratorId}`, await getHeaders()))
    .data;
