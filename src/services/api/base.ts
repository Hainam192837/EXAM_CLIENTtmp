const API = "http://171.244.63.31:8443/api"
const EXAM_APP_HEADER_VALUE = "exam-client"
const TOKEN_KEY = "token"
const USERNAME_KEY = "username"
const ACTIVE_EXAM_SESSION_KEY = "activeExamSession"
const ACTIVE_EXAM_SESSION_CHANGED_EVENT = "active-exam-session-changed"

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export type ApiRequestOptions = {
    method?: ApiMethod
    body?: unknown
    errorMessage?: string
}

export type ApiRequestResult<T> = {
    data: T | null
    status: number
    error: string | null
}

function logApiServerError(method: ApiMethod, path: string, status: number, data: unknown, message: string) {
    console.log("[requestApi] server error", {
        method,
        path,
        status,
        message,
        data
    })
}

function buildApiHeaders(token: string | null): Record<string, string> {
    return {
        "X-Exam-App": EXAM_APP_HEADER_VALUE,
        Authorization: `Bearer ${token || ""}`
    }
}

function buildJsonApiHeaders(token: string | null): Record<string, string> {
    return {
        ...buildApiHeaders(token),
        "Content-Type": "application/json"
    }
}

function parseApiErrorMessage(data: unknown, fallback: string): string {
    if (!data || typeof data !== "object") {
        return fallback
    }

    const payload = data as Record<string, unknown>
    const detail = payload.detail
    if (typeof detail === "string" && detail.trim()) {
        return detail
    }

    const message = payload.message
    if (typeof message === "string" && message.trim()) {
        return message
    }

    return fallback
}

function handleUnauthorized(status: number) {
    if (status !== 401 || typeof window === "undefined") {
        return
    }

    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
    localStorage.removeItem(ACTIVE_EXAM_SESSION_KEY)
    window.dispatchEvent(new CustomEvent(ACTIVE_EXAM_SESSION_CHANGED_EVENT))
    if (window.location.hash !== "#/") {
        window.location.hash = "#/"
    }
}

function isPublicPath(path: string): boolean {
    return path === "/auth/login/"
}

export async function requestApi<T>(path: string, options?: ApiRequestOptions): Promise<ApiRequestResult<T>> {
    const method = options?.method || "GET"
    const token = localStorage.getItem("token")
    if (!token && !isPublicPath(path)) {
        handleUnauthorized(401)
        return {
            data: null,
            status: 401,
            error: "Invalid or expired token"
        }
    }

    const hasBody = options?.body !== undefined
    const headers = hasBody ? buildJsonApiHeaders(token) : buildApiHeaders(token)
    const fallbackError = options?.errorMessage || "API request failed"
    const url = `${API}${path}`

    if (window.electronAPI) {
        const response = await window.electronAPI.request({
            url,
            method,
            headers,
            body: hasBody ? options?.body : undefined
        })

        const status = typeof response?.status === "number" ? response.status : 0
        const data = (response?.data ?? null) as T | null
        if (!response?.ok) {
            const errorMessage = parseApiErrorMessage(response?.data, fallbackError)
            logApiServerError(method, path, status, response?.data, errorMessage)
            handleUnauthorized(status)
            return {
                data,
                status,
                error: errorMessage
            }
        }

        return {
            data,
            status,
            error: null
        }
    }

    try {
        const res = await fetch(url, {
            method,
            headers,
            body: hasBody ? JSON.stringify(options?.body) : undefined
        })

        const text = await res.text()
        let parsed: unknown = null
        if (text) {
            try {
                parsed = JSON.parse(text)
            } catch {
                parsed = { raw: text }
            }
        }

        if (!res.ok) {
            const errorMessage = parseApiErrorMessage(parsed, fallbackError)
            logApiServerError(method, path, res.status, parsed, errorMessage)
            handleUnauthorized(res.status)
            return {
                data: (parsed as T | null) ?? null,
                status: res.status,
                error: errorMessage
            }
        }

        return {
            data: (parsed as T | null) ?? null,
            status: res.status,
            error: null
        }
    } catch {
        return {
            data: null,
            status: 0,
            error: fallbackError
        }
    }
}
