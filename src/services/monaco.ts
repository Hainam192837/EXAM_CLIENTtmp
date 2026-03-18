type MonacoEnv = {
  getWorker: (_: string, label: string) => Worker
}

type MonacoGlobal = typeof globalThis & {
  MonacoEnvironment?: MonacoEnv
}

type WorkerFactory = new () => Worker

let monacoSetupPromise: Promise<void> | null = null

export function ensureMonacoConfigured(): Promise<void> {
  if (monacoSetupPromise) {
    return monacoSetupPromise
  }

  monacoSetupPromise = (async () => {
    await Promise.all([
      import("monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution.js"),
      import("monaco-editor/esm/vs/basic-languages/python/python.contribution.js"),
      import("monaco-editor/esm/vs/basic-languages/java/java.contribution.js"),
      import("monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js"),
      import("monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js"),
      import("monaco-editor/esm/vs/basic-languages/go/go.contribution.js"),
      import("monaco-editor/esm/vs/basic-languages/rust/rust.contribution.js"),
      import("monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution.js")
    ])

    const [
      { loader },
      monaco,
      editorWorkerModule,
      jsonWorkerModule,
      cssWorkerModule,
      htmlWorkerModule,
      tsWorkerModule
    ] = await Promise.all([
      import("@guolao/vue-monaco-editor"),
      import("monaco-editor/esm/vs/editor/editor.api.js"),
      import("monaco-editor/esm/vs/editor/editor.worker?worker"),
      import("monaco-editor/esm/vs/language/json/json.worker?worker"),
      import("monaco-editor/esm/vs/language/css/css.worker?worker"),
      import("monaco-editor/esm/vs/language/html/html.worker?worker"),
      import("monaco-editor/esm/vs/language/typescript/ts.worker?worker")
    ])

    const editorWorker = editorWorkerModule.default as WorkerFactory
    const jsonWorker = jsonWorkerModule.default as WorkerFactory
    const cssWorker = cssWorkerModule.default as WorkerFactory
    const htmlWorker = htmlWorkerModule.default as WorkerFactory
    const tsWorker = tsWorkerModule.default as WorkerFactory

    ;(globalThis as MonacoGlobal).MonacoEnvironment = {
      getWorker(_, label) {
        if (label === "json") {
          return new jsonWorker()
        }
        if (label === "css" || label === "scss" || label === "less") {
          return new cssWorker()
        }
        if (label === "html" || label === "handlebars" || label === "razor") {
          return new htmlWorker()
        }
        if (label === "typescript" || label === "javascript") {
          return new tsWorker()
        }
        return new editorWorker()
      }
    }

    loader.config({
      monaco
    })
  })()

  return monacoSetupPromise
}
