import type {api} from 'src/main/preload'

declare global {
  interface Window {
    skipCheck: boolean
    api: typeof api
  }
}
