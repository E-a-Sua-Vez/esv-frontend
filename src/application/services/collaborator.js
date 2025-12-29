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
  (await requestBackend.get(`/${entity}/commerce/${commerceId}`, await getHeaders())).data;

export const getDetailsCollaboratorsByCommerceId = async commerceId =>
  (await requestBackend.get(`/${entity}/details/commerceId/${commerceId}`, await getHeaders())).data;

export const getCollaboratorById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getCollaboratorDetailsById = async id =>
  (await requestBackend.get(`/${entity}/details/${id}`, await getHeaders())).data;

export const updateCollaborator = async (id, collaborator) =>
  (await requestBackend.patch(`/${entity}/${id}`, collaborator, await getHeaders())).data;

export const addCollaborator = async collaborator =>
  (await requestBackend.post(`/${entity}`, collaborator, await getHeaders())).data;

export const getCollaboratorByCommerceIdEmail = async (commerceId, email) =>
  (await requestBackend.get(`/${entity}/commerce/${commerceId}/email/${email}`, await getHeaders()))
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
