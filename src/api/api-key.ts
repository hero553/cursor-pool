import axios from './axios'

/** 获取api key 对应的账号信息 */
export function getApiKeyByKey(key: string) {
  return axios.get(`/api-key/by-key?key=${key}`)
}

/** 获取账户信息 */
export function getAccountsByApiKey(key: string) {
  return axios.get(`/api-key/accounts-by-key?key=${key}`)
}