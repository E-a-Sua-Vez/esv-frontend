import { requestBackend, getHeaders } from '../api';

const entity = 'queue';

export const getQueueByCommerce = async id => {
    return (await requestBackend.get(`/commerce/${id}`, await getHeaders())).data;
}

export const getQueueById = async id => {
    return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
}

export const getQueuesByCommerceId = async commerceId => {
    return (await requestBackend.get(`/${entity}/commerce/${commerceId}`, await getHeaders())).data;
}

export const getGroupedQueueByCommerceId = async commerceId => {
    return (await requestBackend.get(`/${entity}/grouped/commerce/${commerceId}`, await getHeaders())).data;
}

export const updateQueue = async (id, queue) => {
    return (await requestBackend.patch(`/${entity}/${id}`, queue, await getHeaders())).data;
}

export const addQueue = async (queue) => {
    return (await requestBackend.post(`/${entity}`, queue, await getHeaders())).data;
}