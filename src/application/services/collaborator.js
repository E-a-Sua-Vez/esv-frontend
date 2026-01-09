import { requestBackend, getHeaders } from '../api';
import { globalStore } from '../../stores/index';

const entity = 'collaborator';

export const getCollaboratorByEmail = async email => {
  const store = globalStore();
  const user = (await requestBackend.get(`/${entity}/email/${email}`, await getHeaders())).data;
  if (user.permissions) {
    await store.setCurrentPermissions(user.permissions);
  }
  return user;
};

export const getCollaboratorByEmailNotToken = async email => {
  const store = globalStore();
  const user = (await requestBackend.get(`/${entity}/email/${email}`)).data;
  if (user.permissions) {
    await store.setCurrentPermissions(user.permissions);
  }
  return user;
};

export const getCollaboratorByEmailSimple = async email =>
  (await requestBackend.get(`/${entity}/email/${email}`, await getHeaders())).data;

export const registerCollaboratorToken = async (id, body) =>
  (await requestBackend.patch(`/${entity}/register-token/${id}`, body, await getHeaders())).data;

export const changeCollaboratorPassword = async (id, body) =>
  (await requestBackend.patch(`/${entity}/change-password/${id}`, body, await getHeaders())).data;

export const getCollaboratorsByCommerceId = async commerceId =>
  (await requestBackend.get(`/${entity}/commerceId/${commerceId}`, await getHeaders())).data;

export const getDetailsCollaboratorsByCommerceId = async commerceId =>
  (await requestBackend.get(`/${entity}/details/commerceId/${commerceId}`, await getHeaders()))
    .data;

export const getCollaboratorById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getCollaboratorDetailsById = async id =>
  (await requestBackend.get(`/${entity}/details/${id}`, await getHeaders())).data;

export const updateCollaborator = async (id, collaborator) =>
  (await requestBackend.patch(`/${entity}/${id}`, collaborator, await getHeaders())).data;

export const addCollaborator = async collaborator =>
  (await requestBackend.post(`/${entity}`, collaborator, await getHeaders())).data;

export const getCollaboratorByCommerceIdEmail = async (commerceId, email) =>
  (await requestBackend.get(`/${entity}/commerceId/${commerceId}/email/${email}`, await getHeaders()))
    .data;

export const updateCollaboratorPermission = async (id, permission) =>
  (
    await requestBackend.patch(
      `/${entity}/${id}/permission`,
      { name: permission.name, value: permission.value },
      await getHeaders()
    )
  ).data;

export const updateModule = async (id, body) =>
  (
    await requestBackend.patch(
      `/${entity}/${id}/module`,
      { moduleId: body.module || body.moduleId },
      await getHeaders()
    )
  ).data;

/**
 * Actualizar firma digital del colaborador
 */
export const updateDigitalSignature = async (collaboratorId, digitalSignature, crm, crmState) =>
  (
    await requestBackend.post(
      `/${entity}/${collaboratorId}/digital-signature`,
      {
        digitalSignature,
        crm,
        crmState,
      },
      await getHeaders()
    )
  ).data;

export const uploadDigitalSignature = async (collaboratorId, file) => {
  const form = new FormData();
  form.append('signature', file);
  return (
    await requestBackend.post(`/${entity}/${collaboratorId}/digital-signature/upload`, form, {
      ...(await getHeaders()),
      headers: { ...(await (await getHeaders()).headers), 'Content-Type': 'multipart/form-data' },
    })
  ).data;
};

/**
 * Obtener URL firmada de la firma digital
 */
export const getDigitalSignatureUrl = async (collaboratorId) => {
  const res = await requestBackend.get(`/${entity}/${collaboratorId}/digital-signature`, await getHeaders());
  return res.data?.signatureUrl || null;
};

// ========== NUEVOS SERVICIOS PARA GESTIÓN MÉDICA ==========

/**
 * Actualizar datos médicos del colaborador
 */
export const updateMedicalData = async (collaboratorId, medicalData) =>
  (
    await requestBackend.post(
      `/${entity}/${collaboratorId}/medical-data`,
      medicalData,
      await getHeaders()
    )
  ).data;

/**
 * Actualizar foto de perfil del colaborador
 */
export const updateProfilePhoto = async (collaboratorId, photoUrl) =>
  (
    await requestBackend.post(
      `/${entity}/${collaboratorId}/profile-photo`,
      { photoUrl },
      await getHeaders()
    )
  ).data;

/**
 * Subir foto de perfil con archivo (multipart/form-data)
 */
export const uploadProfilePhoto = async (collaboratorId, file) => {
  const form = new FormData();
  form.append('photo', file);
  return (
    await requestBackend.post(`/${entity}/${collaboratorId}/profile-photo`, form, {
      ...(await getHeaders()),
      headers: { ...(await (await getHeaders()).headers), 'Content-Type': 'multipart/form-data' },
    })
  ).data;
};

/**
 * Obtener URL firmada de la foto de perfil
 */
export const getProfilePhotoUrl = async (collaboratorId) => {
  const res = await requestBackend.get(`/${entity}/${collaboratorId}/profile-photo`, await getHeaders());
  return res.data?.photoUrl || null;
};

/**
 * Actualizar rol del colaborador
 */
export const updateCollaboratorRole = async (collaboratorId, role) =>
  (
    await requestBackend.patch(
      `/${entity}/${collaboratorId}/role`,
      { role },
      await getHeaders()
    )
  ).data;

/**
 * Obtener colaboradores médicos de un commerce
 */
export const getMedicalCollaboratorsByCommerceId = async (commerceId) =>
  (
    await requestBackend.get(
      `/${entity}/medical/commerce/${commerceId}`,
      await getHeaders()
    )
  ).data;

/**
 * Obtener colaborador para documentos médicos
 */
export const getCollaboratorForMedicalDocuments = async (collaboratorId) =>
  (
    await requestBackend.get(
      `/${entity}/${collaboratorId}/for-documents`,
      await getHeaders()
    )
  ).data;

/**
 * Actualización extendida del colaborador
 */
export const updateCollaboratorExtended = async (collaboratorId, updateData) =>
  (
    await requestBackend.patch(
      `/${entity}/${collaboratorId}/extended`,
      updateData,
      await getHeaders()
    )
  ).data;
