import { clearActiveExamSession } from "./examSession"

export type AuthPayload = {
    sub: string
    username: string
    iat: number
    exp: number
}

type JwtHeader = {
    alg: string
    typ?: string
}

const TOKEN_KEY = "token"
const USERNAME_KEY = "username"

function base64UrlEncode(input: string): string {
    const bytes = new TextEncoder().encode(input)
    let binary = ""

    for (const byte of bytes) {
        binary += String.fromCharCode(byte)
    }

    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlDecode(input: string): string {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
}

function base64UrlDecodeToBytes(input: string): Uint8Array {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4)
    const binary = atob(padded)
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function parseJwtHeader(token: string): JwtHeader | null {
    const headerPart = token.split(".", 3)[0] ?? ""
    if (!headerPart) {
        return null
    }

    try {
        const header = JSON.parse(base64UrlDecode(headerPart)) as Partial<JwtHeader>
        if (typeof header.alg !== "string") {
            return null
        }
        return {
            alg: header.alg,
            typ: header.typ
        }
    } catch {
        return null
    }
}

function getJwtSecretKeyFromEnv(): string {
    const env = import.meta.env as Record<string, string | undefined>
    return env.JWT_SECRET_KEY || env.VITE_JWT_SECRET_KEY || ""
}

async function verifyJwtHs256Signature(token: string, secret: string): Promise<boolean> {
    const parts = token.split(".")
    if (parts.length !== 3) {
        return false
    }

    const headerPart = parts[0] ?? ""
    const payloadPart = parts[1] ?? ""
    const signaturePart = parts[2] ?? ""
    if (!headerPart || !payloadPart || !signaturePart) {
        return false
    }

    try {
        const encodedData = Uint8Array.from(new TextEncoder().encode(`${headerPart}.${payloadPart}`))
        const signature = Uint8Array.from(base64UrlDecodeToBytes(signaturePart))
        const cryptoKey = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
        )

        return await crypto.subtle.verify("HMAC", cryptoKey, signature, encodedData)
    } catch {
        return false
    }
}

export function createUnsignedJwt(payload: AuthPayload): string {
    const header = {
        alg: "none",
        typ: "JWT"
    }

    return `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}.`
}

export function getAuthToken(): string {
    if (typeof window === "undefined") {
        return ""
    }
    return localStorage.getItem(TOKEN_KEY) || ""
}

export function parseAuthPayload(token: string): AuthPayload | null {
    const payloadPart = token.split(".", 3)[1] ?? ""
    if (!payloadPart) {
        return null
    }

    try {
        const payload = JSON.parse(base64UrlDecode(payloadPart)) as Partial<AuthPayload>
        if (
            typeof payload.sub !== "string"
            || typeof payload.username !== "string"
            || typeof payload.iat !== "number"
            || typeof payload.exp !== "number"
        ) {
            return null
        }
        return payload as AuthPayload
    } catch {
        return null
    }
}

export async function decodeAndVerifyAccessToken(token: string): Promise<AuthPayload | null> {
    const payload = parseAuthPayload(token)
    if (!payload) {
        return null
    }

    const header = parseJwtHeader(token)
    if (!header || header.alg !== "HS256") {
        return null
    }

    const secretKey = getJwtSecretKeyFromEnv()
    if (!secretKey) {
        return null
    }

    const isValidSignature = await verifyJwtHs256Signature(token, secretKey)
    if (!isValidSignature) {
        return null
    }

    return payload
}

export function isTokenExpired(payload: AuthPayload): boolean {
    const nowSeconds = Math.floor(Date.now() / 1000)
    return payload.exp <= nowSeconds
}

export async function setAuthSession(token: string): Promise<boolean> {
    if (typeof window === "undefined") {
        return false
    }

    const payload = await decodeAndVerifyAccessToken(token)
    if (!payload || isTokenExpired(payload)) {
        clearAuthSession()
        return false
    }

    const previousUsername = getCurrentUsername()
    if (previousUsername && previousUsername !== payload.username) {
        clearActiveExamSession()
    }

    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USERNAME_KEY, payload.username)
    return true
}

export function clearAuthSession() {
    if (typeof window === "undefined") {
        return
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
    clearActiveExamSession()
}

export function getCurrentUsername(): string {
    if (typeof window === "undefined") {
        return ""
    }
    return localStorage.getItem(USERNAME_KEY) || ""
}

export async function isAuthenticated(): Promise<boolean> {
    const token = getAuthToken()
    if (!token) {
        return false
    }

    const payload = await decodeAndVerifyAccessToken(token)
    if (!payload || isTokenExpired(payload)) {
        clearAuthSession()
        return false
    }

    return true
}