import { requestBackend, getHeaders } from '../api';

const entity = 'pdf-template';

/**
 * Servicio para gestionar templates de PDF
 */
export const pdfTemplateService = {
  /**
   * Listar templates
   */
  async listTemplates(documentType, commerceId, scope) {
    const params = new URLSearchParams();
    if (documentType) params.append('documentType', documentType);
    if (commerceId) params.append('commerceId', commerceId);
    if (scope) params.append('scope', scope);

    const queryString = params.toString();
    const url = queryString ? `/${entity}?${queryString}` : `/${entity}`;
    return (await requestBackend.get(url, await getHeaders())).data;
  },

  /**
   * Obtener template por ID
   */
  async getTemplateById(id) {
    return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
  },

  /**
   * Crear template
   */
  async createTemplate(templateData) {
    return (await requestBackend.post(`/${entity}`, templateData, await getHeaders())).data;
  },

  /**
   * Actualizar template
   */
  async updateTemplate(id, templateData) {
    return (await requestBackend.patch(`/${entity}/${id}`, templateData, await getHeaders())).data;
  },

  /**
   * Eliminar template
   */
  async deleteTemplate(id) {
    await requestBackend.delete(`/${entity}/${id}`, await getHeaders());
  },

  /**
   * Establecer template como por defecto
   */
  async setAsDefault(id) {
    return (await requestBackend.post(`/${entity}/${id}/set-default`, {}, await getHeaders())).data;
  },

  /**
   * Generar preview del template
   */
  async generatePreview(id) {
    const response = await requestBackend.post(`/${entity}/${id}/preview`, {}, await getHeaders());
    // El backend retorna { previewUrl: string } que es una URL firmada de S3
    return response.data.previewUrl;
  },
};
