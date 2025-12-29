import { requestBackend, getHeaders } from '../api';

const entity = 'form';

export const createForm = async body =>
  (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;

export const getFormsByClient = async (commerceId, clientId) =>
  (
    await requestBackend.get(
      `/${entity}/commerceId/${commerceId}/clientId/${clientId}`,
      await getHeaders()
    )
  ).data;

export const getFormsByClientAndType = async (commerceId, clientId, type) =>
  (
    await requestBackend.get(
      `/${entity}/commerceId/${commerceId}/clientId/${clientId}/type/${type}`,
      await getHeaders()
    )
  ).data;

export const markFormAsLoadedToProntuario = async (formId, userId) =>
  (
    await requestBackend.patch(
      `/${entity}/${formId}/load-to-prontuario`,
      { userId },
      await getHeaders()
    )
  ).data;
