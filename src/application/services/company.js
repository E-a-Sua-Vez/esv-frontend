import { requestBackend, getHeaders } from '../api';

const entity = 'company';

export const getCompanyByCommerce = async id => {
    return (await requestBackend.get(`/${entity}/commerce/${id}`, await getHeaders())).data;
}

export const getCompanyById = async id => {
    return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
}

export const getCompanysById = async ids => {
    if (ids && ids.length > 0) {
        return (await requestBackend.get(`/${entity}/list/${ids}`, await getHeaders())).data;
    }
}

export const updateCompany = async (id, service) => {
    return (await requestBackend.patch(`/${entity}/${id}`, service, await getHeaders())).data;
}

export const addCompany = async (service) => {
    return (await requestBackend.post(`/${entity}`, service, await getHeaders())).data;
}

export const getActiveCompaniesByCommerceId = async commerceId => {
    return (await requestBackend.get(`/${entity}/commerceId/${commerceId}/active`, await getHeaders())).data;
}

export const getActiveCompaniesByCommerceIdAnyType = async (commerceId, type) => {
    return (await requestBackend.get(`/${entity}/commerceId/${commerceId}/type/${type}`, await getHeaders())).data;
}