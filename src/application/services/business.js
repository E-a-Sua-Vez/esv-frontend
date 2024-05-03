import { requestBackend, getHeaders } from '../api';
import { addAdministrator } from './administrator';

const entity = 'business';

export const getBusinessById = async id => {
  return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
}

export const getBusinesses = async id => {
  return (await requestBackend.get(`/${entity}/`, await getHeaders())).data;
}

export const getBusinessByKeyName = async keyName => {
  return (await requestBackend.get(`/${entity}/keyName/${keyName}`, await getHeaders())).data;
}

export const updateBusiness = async (id, business) => {
  return (await requestBackend.patch(`/${entity}/${id}`, business, await getHeaders())).data;
}

export const addBusiness = async (business) => {
  let newBusiness = (await requestBackend.post(`/${entity}`, business, await getHeaders())).data;
  const newAdministrator = {
    name: newBusiness.name,
    businessId: newBusiness.id,
    commercesId: [],
    email: newBusiness.email
  };
  await addAdministrator(newAdministrator);
  return newBusiness;
}

export const requestWhatsappConnectionById = async (id, whatsapp) => {
  return (await requestBackend.post(`/${entity}/${id}/resquest/whatsapp-connection/${whatsapp}`, {}, await getHeaders())).data;
}

export const returnWhatsappConnectionById = async (id, instanceId) => {
  return (await requestBackend.post(`/${entity}/${id}/return/whatsapp-connection/${instanceId}`, {}, await getHeaders())).data;
}

export const disconnectWhatsappConnectionById = async (id, instanceId) => {
  return (await requestBackend.post(`/${entity}/${id}/disconnect/whatsapp-connection/${instanceId}`, {}, await getHeaders())).data;
}

export const statusWhatsappConnectionById = async id => {
  return (await requestBackend.get(`/${entity}/${id}/whatsapp-connection/status`, await getHeaders())).data;
}

export const updateWhatsappConnection = async (id, commerce) => {
  return (await requestBackend.patch(`/${entity}/${id}/whatsapp-connection`, commerce, await getHeaders())).data;
}