import { requestBackend, getHeaders } from '../api';

const entity = 'package';

export const getAvailablePackageByClient = async (commerceId, clientId) => {
  return (await requestBackend.get(`/${entity}/commerceId/${commerceId}/clientId/${clientId}`, await getHeaders())).data;
}