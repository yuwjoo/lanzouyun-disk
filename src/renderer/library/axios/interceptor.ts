// // import {RESPONSE_CODE} from '@/types/request'
// import type {AxiosResponse, InternalAxiosRequestConfig} from 'axios'

// /**
//  * @description: 请求拦截
//  */
// export function requestInterceptor(
//   config: InternalAxiosRequestConfig
// ): InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig> {
//   // config.headers['Authorization'] = `Bearer  ${useUserStore().token}`
//   return config
// }

// /**
//  * @description: 响应拦截
//  */
// export function responseInterceptor(response: AxiosResponse): AxiosResponse | Promise<AxiosResponse> {
//   const res = response.data

//   if (res.code === RESPONSE_CODE.OK) {
//     return res
//   }

//   handleError(res)

//   if (res.code === RESPONSE_CODE.UNAUTHORIZED) {
//     localStorage.clear()
//     useRouter().replace('/login')
//   }

//   throw res
// }

// /**
//  * @description: 处理异常
//  */
// export function handleError(error: any) {
//   ElMessage({type: 'error', message: error.message || error.msg || '网络繁忙！'})
// }

export {};
