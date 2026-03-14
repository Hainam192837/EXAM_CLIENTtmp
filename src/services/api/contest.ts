import type { Contest } from "../../types/contest"
import { requestApi } from "./base"
import { getCurrentUsername } from "../auth"

const contestDetailCacheTtlMs = 5 * 60 * 1000
const contestVersionCacheTtlMs = 30 * 1000

type ContestDetailCacheEntry = {
    cachedAt: number
    versionUpdate: number | null
    value: Contest
}

type ContestVersionCacheEntry = {
    cachedAt: number
    value: number
}

const contestDetailCache = new Map<string, ContestDetailCacheEntry>()
const contestVersionCache = new Map<string, ContestVersionCacheEntry>()
let contestCacheOwner = ""

function getContestCacheOwner() {
    return getCurrentUsername() || "__guest__"
}

function ensureContestCacheScope() {
    const owner = getContestCacheOwner()
    if (owner === contestCacheOwner) {
        return
    }

    contestDetailCache.clear()
    contestVersionCache.clear()
    contestCacheOwner = owner
}

function contestDetailCacheKey(contestKey: string) {
    return contestKey
}

function setContestDetailCache(contest: Contest, versionUpdate: number | null = null) {
    contestDetailCache.set(contestDetailCacheKey(contest.key), {
        cachedAt: Date.now(),
        versionUpdate,
        value: { ...contest }
    })
}

function sanitizeContestListItem(raw: unknown): Contest | null {
    if (!raw || typeof raw !== "object") {
        return null
    }

    const payload = raw as Record<string, unknown>
    const pk = payload.pk
    const topic = payload.topic
    if (
        typeof payload.key !== "string"
        || typeof payload.name !== "string"
        || typeof payload.start_time !== "string"
        || typeof payload.end_time !== "string"
    ) {
        return null
    }

    return {
        pk: typeof pk === "number" ? pk : 0,
        key: payload.key,
        name: payload.name,
        topic: typeof topic === "string" ? topic : "",
        start_time: payload.start_time,
        end_time: payload.end_time
    }
}

function sanitizeContestDetail(raw: unknown): Contest | null {
    const base = sanitizeContestListItem(raw)
    if (!base) {
        return null
    }

    const payload = raw as Record<string, unknown>
    if (
        typeof payload.description !== "string"
        || typeof payload.user_count !== "number"
    ) {
        return base
    }

    return {
        ...base,
        description: payload.description,
        user_count: payload.user_count
    }
}

function sanitizeVersionPayload(raw: unknown): number | null {
    if (!raw || typeof raw !== "object") {
        return null
    }

    const payload = raw as Record<string, unknown>
    const version = payload.version_update
    if (typeof version !== "number" || !Number.isFinite(version)) {
        return null
    }

    return version
}

async function getContestVersion(contestKey: string, options?: { forceRefresh?: boolean }): Promise<number> {
    const forceRefresh = Boolean(options?.forceRefresh)
    const cacheKey = contestDetailCacheKey(contestKey)
    const cached = contestVersionCache.get(cacheKey)
    const isFresh = cached ? (Date.now() - cached.cachedAt) < contestVersionCacheTtlMs : false

    if (!forceRefresh && cached && isFresh) {
        return cached.value
    }

    const result = await requestApi<unknown>(`/contests/${contestKey}/version/`, {
        method: "GET",
        errorMessage: "Không kiểm tra được version cuộc thi"
    })
    if (result.error) {
        throw new Error(result.error)
    }

    const versionUpdate = sanitizeVersionPayload(result.data)
    if (versionUpdate === null) {
        throw new Error("Dữ liệu version cuộc thi không hợp lệ")
    }

    contestVersionCache.set(cacheKey, {
        cachedAt: Date.now(),
        value: versionUpdate
    })

    return versionUpdate
}

export async function getContests(): Promise<Contest[]> {
    ensureContestCacheScope()
    const result = await requestApi<unknown>("/contests/", {
        method: "GET",
        errorMessage: "Failed to load contests"
    })
    if (result.error) {
        throw new Error(result.error)
    }

    const contestsRaw = Array.isArray(result.data) ? result.data : []
    const contests = contestsRaw
        .map((item) => sanitizeContestListItem(item))
        .filter((item): item is Contest => Boolean(item))
    contests.forEach((contest) => setContestDetailCache(contest))
    return contests
}

export async function getContestDetail(contestKey: string, options?: { forceRefresh?: boolean }): Promise<Contest | null> {
    ensureContestCacheScope()
    const cacheKey = contestDetailCacheKey(contestKey)
    const cached = contestDetailCache.get(cacheKey)
    const isFresh = cached ? (Date.now() - cached.cachedAt) < contestDetailCacheTtlMs : false
    const forceRefresh = Boolean(options?.forceRefresh)

    if (!forceRefresh && cached && isFresh) {
        return { ...cached.value }
    }

    let latestVersion: number | null = null
    if (!forceRefresh && cached && !isFresh) {
        try {
            latestVersion = await getContestVersion(contestKey, { forceRefresh: true })
            if (cached.versionUpdate !== null && cached.versionUpdate === latestVersion) {
                return { ...cached.value }
            }
        } catch {
            return { ...cached.value }
        }
    }

    if (cached && (!isFresh || forceRefresh)) {
        contestDetailCache.delete(cacheKey)
    }

    const result = await requestApi<unknown>(`/contests/${contestKey}/`, {
        method: "GET",
        errorMessage: "Không tải được chi tiết cuộc thi"
    })
    if (result.status === 404) {
        return null
    }
    if (result.error) {
        throw new Error(result.error)
    }

    const found = sanitizeContestDetail(result.data)
    if (!found) {
        throw new Error("Dữ liệu chi tiết cuộc thi không hợp lệ")
    }

    setContestDetailCache(found, latestVersion)
    return { ...found }
}

export async function getCurrentContest(): Promise<Contest | null> {
    ensureContestCacheScope()
    const result = await requestApi<Contest | null>("/contests/current/", {
        method: "GET",
        errorMessage: "Không thể kiểm tra cuộc thi hiện tại"
    })
    if (result.status === 401) {
        return null
    }
    if (result.error) {
        throw new Error(result.error)
    }

    const data = result.data
    const sanitized = data ? sanitizeContestDetail(data) : null
    if (sanitized) {
        setContestDetailCache(sanitized)
    }
    return sanitized
}

export async function joinContest(contestKey: string, accessCode?: string): Promise<void> {
    ensureContestCacheScope()
    const body = accessCode ? { access_code: accessCode } : {}

    const result = await requestApi<unknown>(`/contests/${contestKey}/join/`, {
        method: "POST",
        body,
        errorMessage: "Không thể tham gia cuộc thi"
    })
    if (result.error) {
        throw new Error(result.error)
    }
}

export async function leaveContest(contestKey: string): Promise<void> {
    ensureContestCacheScope()
    const result = await requestApi<unknown>(`/contests/${contestKey}/leave/`, {
        method: "POST",
        body: {},
        errorMessage: "Không thể rời cuộc thi hiện tại"
    })
    if (result.error) {
        throw new Error(result.error)
    }
}
