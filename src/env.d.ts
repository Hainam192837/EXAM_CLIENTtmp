/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly JWT_SECRET_KEY?: string
  readonly VITE_JWT_SECRET_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

type ElectronApiRequest = {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: unknown
}

type ElectronApiResponse = {
  ok: boolean
  status: number
  data?: unknown
  error?: string
}

type BrowserDetectionPayload = {
  processes: string[]
  terminated?: Array<{
    processName: string
    closed: boolean
  }>
  at: number
}

interface Window {
  electronAPI?: {
    request: (request: ElectronApiRequest) => Promise<ElectronApiResponse>
    onBrowserDetected?: (callback: (payload: BrowserDetectionPayload) => void) => (() => void)
  }
}

declare module "*.vue" {
  import type { DefineComponent } from "vue"
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module "katex/contrib/auto-render" {
  type Delimiter = {
    left: string
    right: string
    display: boolean
  }

  type AutoRenderOptions = {
    delimiters?: Delimiter[]
    throwOnError?: boolean
  }

  const renderMathInElement: (element: HTMLElement, options?: AutoRenderOptions) => void
  export default renderMathInElement
}

declare module "katex/dist/contrib/auto-render.mjs" {
  type Delimiter = {
    left: string
    right: string
    display: boolean
  }

  type AutoRenderOptions = {
    delimiters?: Delimiter[]
    throwOnError?: boolean
  }

  const renderMathInElement: (element: HTMLElement, options?: AutoRenderOptions) => void
  export default renderMathInElement
}

declare module "monaco-editor/esm/vs/editor/editor.api.js" {
  export * from "monaco-editor"
}
