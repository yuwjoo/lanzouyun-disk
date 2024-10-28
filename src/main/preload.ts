/**
 * preload 运行在渲染进程
 */
export const api = {
  logout: async () => {},
}
;(global as any).api = api

// contextBridge.exposeInMainWorld('api', api)
