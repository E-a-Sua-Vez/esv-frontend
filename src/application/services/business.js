import { requestBackend, getHeaders } from '../api';
import { addAdministrator } from './administrator';

export const getBusinessById = async id => {
  return (await requestBackend.get(`/business/${id}`, await getHeaders())).data;
}

export const getBusinesses = async id => {
  return (await requestBackend.get(`/business/`, await getHeaders())).data;
}

export const getBusinessByKeyName = async keyName => {
  return (await requestBackend.get(`/business/keyName/${keyName}`, await getHeaders())).data;
}

export const updateBusiness = async (id, business) => {
  return (await requestBackend.patch(`/business/${id}`, business, await getHeaders())).data;
}

export const addBusiness = async (business) => {
  let newBusiness = (await requestBackend.post(`/business`, business, await getHeaders())).data;
  const newAdministrator = {
    name: newBusiness.name,
    businessId: newBusiness.id,
    commercesId: [],
    email: newBusiness.email
  };
  await addAdministrator(newAdministrator);
  return newBusiness;

}