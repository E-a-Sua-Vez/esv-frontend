import { requestBackend, getHeaders } from '../api';

export const getQueueByCommerce = async id => {
    let commerce = (await requestBackend.get(`/commerce/${id}`, await getHeaders())).data;
    commerce.queues = (await requestBackend.get(`/queue/commerce/${id}`, await getHeaders())).data;
    return commerce;
}

export const getQueueById = async id => {
    return (await requestBackend.get(`/queue/${id}`, await getHeaders())).data;
}

export const updateQueue = async (id, queue) => {
    return (await requestBackend.patch(`/queue/${id}`, queue, await getHeaders())).data;
}

export const addQueue = async (queue) => {
    return (await requestBackend.post(`/queue`, queue, await getHeaders())).data;
}