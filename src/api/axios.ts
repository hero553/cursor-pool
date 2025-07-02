import axios from 'axios'

const instance = axios.create({
  /** 根据你的后端实际地址调整 */
  baseURL: import.meta.env.DEV ? '/apiv1' : 'http://156.238.250.44:3000/apiv1', 
  timeout: 5000,
})
export default instance