import { requestBackend, getHeaders } from '../api';
import { signUp } from './auth';
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

export const updateCollaborator = async (id, collaborator) => {
  // Si hay profilePhoto con File, primero hacer upload separado
  if (collaborator.profilePhoto && collaborator.profilePhoto.file instanceof File) {
    try {
      const photoUrl = await uploadProfilePhoto(id, collaborator.profilePhoto.file);
      // Reemplazar profilePhoto con solo la URL
      collaborator.profilePhoto = photoUrl;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      // Continuar sin foto si falla el upload
      delete collaborator.profilePhoto;
    }
  }
  
  return (await requestBackend.patch(`/${entity}/${id}`, collaborator, await getHeaders())).data;
};

export const uploadProfilePhoto = async (id, photoFile) => {
  const formData = new FormData();
  formData.append('photo', photoFile);
  
  const response = await requestBackend.post(
    `/${entity}/${id}/profile-photo`,
    formData,
    {
      ...await getHeaders(),
      'Content-Type': 'multipart/form-data'
    }
  );
  
  return response.data.photoUrl;
};

export const getProfilePhotoSignedUrl = async (id) => {
  try {
    const response = await requestBackend.get(
      `/${entity}/${id}/profile-photo`,
      await getHeaders()
    );
    return response.data.photoUrl;
  } catch (error) {
    console.error('Error getting signed photo URL:', error);
    return null;
  }
};

export const addCollaborator = async collaborator => {
  const created = (await requestBackend.post(`/${entity}`, collaborator, await getHeaders())).data;

  // Replicar comportamiento de alta de negocio: crear usuario de autenticación
  // Solo crear cuenta en Firebase para colaboradores no bots y con email válido
  if (created && created.email && created.bot !== true) {
    await signUp(created.email, created.email);
  }

  return created;
};

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
 * Crear perfil profesional asociado a un colaborador
 * @param {string} collaboratorId - ID del colaborador
 * @param {Object} professionalData - Datos del profesional a crear
 * @returns {Promise<{collaborator: Object, professional: Object}>}
 */
export const createAssociatedProfessional = async (collaboratorId, professionalData) =>
  (
    await requestBackend.post(
      `/${entity}/${collaboratorId}/create-associated-professional`,
      professionalData,
      await getHeaders()
    )
  ).data;