import { requestBackend, getHeaders } from '../api';

const entity = 'lgpd-data-portability';

/**
 * Gerar arquivo de portabilidade de dados
 */
export const generateDataPortabilityFile = async (commerceId, clientId) =>
  (
    await requestBackend.post(
      `/${entity}/${commerceId}/${clientId}/generate`,
      {},
      await getHeaders()
    )
  ).data;

/**
 * Download do arquivo de portabilidade
 */
export const downloadDataPortabilityFile = async (commerceId, clientId) => {
  const response = await requestBackend.get(`/${entity}/${commerceId}/${clientId}/download`, {
    ...(await getHeaders()),
    responseType: 'blob',
  });
  return response.data;
};


