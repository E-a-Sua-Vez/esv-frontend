import { requestBackend, getHeaders } from '../api';

const entity = 'documents';

export const getDocumentByCommerceId = async commerceId => {
  return (await requestBackend.get(`/${entity}/commerceId/${commerceId}`, await getHeaders())).data;
}

export const getDocumentOptions = async () => {
  return (await requestBackend.get(`/${entity}/options/all`, await getHeaders())).data;
}

export const addDocument = async (document, file) => {
  const options = { ...await getHeaders() };
  options.headers['Content-Type'] = 'multipart/form-data';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('commerceId', document.commerceId);
  formData.append('name', document.name);
  formData.append('format', document.format);
  return (await requestBackend.post(`/${entity}`, formData, options)).data;
}

export const getDocumentByOption = async (commerceId, option) => {
  return (await requestBackend.get(`/${entity}/commerceId/${commerceId}/option/${option}`, await getHeaders())).data;
}

export const getDocument = async (commerceId, reportType) => {
  const options = { responseType: 'blob', ...await getHeaders() };
  return (await requestBackend.get(`/${entity}/${commerceId}/${reportType}`, options)).data;
}

export const updateDocument = async (id, document) => {
  return (await requestBackend.patch(`/${entity}/${id}`, document, await getHeaders())).data;
}