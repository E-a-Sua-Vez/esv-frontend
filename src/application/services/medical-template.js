import { requestBackend, getHeaders } from '../api';

const entity = 'medical-template';

export const createTemplate = async body =>
  (await requestBackend.post(`/${entity}/`, body, await getHeaders())).data;

export const updateTemplate = async (id, body) =>
  (await requestBackend.patch(`/${entity}/${id}`, body, await getHeaders())).data;

export const getTemplateById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const searchTemplates = async (commerceId, doctorId, searchDto) => {
  const params = new URLSearchParams();
  if (searchDto.searchTerm) params.append('searchTerm', searchDto.searchTerm);
  if (searchDto.type) params.append('type', searchDto.type);
  if (searchDto.category) params.append('category', searchDto.category);
  if (searchDto.scope) params.append('scope', searchDto.scope);
  if (searchDto.tag) params.append('tag', searchDto.tag);
  if (searchDto.favoritesOnly) params.append('favoritesOnly', searchDto.favoritesOnly);
  if (searchDto.page) params.append('page', searchDto.page);
  if (searchDto.limit) params.append('limit', searchDto.limit);
  return (
    await requestBackend.get(
      `/${entity}/commerce/${commerceId}/doctor/${doctorId}/search?${params}`,
      await getHeaders()
    )
  ).data;
};

export const processTemplate = async (templateId, variables) =>
  (await requestBackend.post(`/${entity}/process`, { templateId, variables }, await getHeaders()))
    .data;

export const toggleFavorite = async id =>
  (await requestBackend.post(`/${entity}/${id}/favorite`, {}, await getHeaders())).data;

export const deleteTemplate = async id =>
  (await requestBackend.delete(`/${entity}/${id}`, await getHeaders())).data;

export const getMostUsedTemplates = async (commerceId, doctorId, limit = 10) => {
  const params = limit ? `?limit=${limit}` : '';
  return (
    await requestBackend.get(
      `/${entity}/commerce/${commerceId}/doctor/${doctorId}/most-used${params}`,
      await getHeaders()
    )
  ).data;
};
