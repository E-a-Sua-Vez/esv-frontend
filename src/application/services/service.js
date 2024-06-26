import { requestBackend, getHeaders } from '../api';

const entity = 'service';

export const getServiceByCommerce = async id => {
    return (await requestBackend.get(`/${entity}/commerce/${id}`, await getHeaders())).data;
}

export const getServiceById = async id => {
    return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
}

export const getServicesById = async ids => {
    if (ids && ids.length > 0) {
        return (await requestBackend.get(`/${entity}/list/${ids}`, await getHeaders())).data;
    }
}

export const updateService = async (id, service) => {
    return (await requestBackend.patch(`/${entity}/${id}`, service, await getHeaders())).data;
}

export const addService = async (service) => {
    return (await requestBackend.post(`/${entity}`, service, await getHeaders())).data;
}

export const getActiveServicesByCommerceId = async commerceId => {
    return (await requestBackend.get(`/${entity}/commerceId/${commerceId}/active`, await getHeaders())).data;
}