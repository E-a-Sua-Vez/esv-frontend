import { requestBackend, getHeaders } from '../api';

const entity = 'digital-signature';

/**
 * Validar certificado digital ICP-Brasil
 */
export const validateCertificate = async certificatePem =>
  (
    await requestBackend.post(
      `/${entity}/validate-certificate`,
      { certificatePem },
      await getHeaders(),
    )
  ).data;

/**
 * Assinar documento com certificado digital ICP-Brasil
 */
export const signDocument = async (documentContent, certificatePem, privateKeyPem, password) =>
  (
    await requestBackend.post(
      `/${entity}/sign`,
      { documentContent, certificatePem, privateKeyPem, password },
      await getHeaders()
    )
  ).data;

/**
 * Verificar assinatura digital
 */
export const verifySignature = async (documentContent, signatureBase64, certificatePem) =>
  (
    await requestBackend.post(
      `/${entity}/verify`,
      { documentContent, signatureBase64, certificatePem },
      await getHeaders()
    )
  ).data;
