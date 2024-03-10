import { requestViaCep } from '../viacep';

export const getAddressBR = async cep => {
  return (await requestViaCep.get(`/${cep}/json`)).data;
}