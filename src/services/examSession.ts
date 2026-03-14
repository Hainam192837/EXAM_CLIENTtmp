import { formatContestTitle, type Contest } from "../types/contest"
import { getCurrentContest } from "./api"

export type ActiveExamSession = {
    contestKey: string
    contestName: string
    startTime: string
    endTime: string
    joinedAt: number
}

const ACTIVE_EXAM_SESSION_KEY = "activeExamSession"
const ACTIVE_EXAM_SESSION_CHANGED_EVENT = "active-exam-session-changed"
const ACTIVE_EXAM_SESSION_API_CHECK_TTL_MS = 15 * 1000

type ActiveSessionApiCacheEntry = {
    checkedAt: number
    value: ActiveExamSession | null
}

let activeSessionApiCache: ActiveSessionApiCacheEntry | null = null
let activeSessionApiRequest: Promise<ActiveExamSession | null> | null = null

function isSameSession(a: ActiveExamSession | null, b: ActiveExamSession | null): boolean {
    if (!a && !b) {
        return true
    }
    if (!a || !b) {
        return false
    }

    return (
        a.contestKey === b.contestKey
        && a.contestName === b.contestName
        && a.startTime === b.startTime
        && a.endTime === b.endTime
        && a.joinedAt === b.joinedAt
    )
}

function emitActiveExamSessionChanged() {
    if (typeof window === "undefined") {
        return
    }
    window.dispatchEvent(new CustomEvent(ACTIVE_EXAM_SESSION_CHANGED_EVENT))
}

export function setActiveExamSession(contest: Contest) {
    const current = getActiveExamSession()
    const payload: ActiveExamSession = {
        contestKey: contest.key,
        contestName: formatContestTitle(contest),
        startTime: contest.start_time,
        endTime: contest.end_time,
        joinedAt: Date.now()
    }

    if (isSameSession(current, payload)) {
        return
    }

    localStorage.setItem(ACTIVE_EXAM_SESSION_KEY, JSON.stringify(payload))
    activeSessionApiCache = null
    emitActiveExamSessionChanged()
}

export function getActiveExamSession(): ActiveExamSession | null {
    const raw = localStorage.getItem(ACTIVE_EXAM_SESSION_KEY)
    if (!raw) {
        return null
    }

    try {
        const parsed = JSON.parse(raw) as Partial<ActiveExamSession>
        if (
            typeof parsed.contestKey !== "string"
            || typeof parsed.contestName !== "string"
            || typeof parsed.startTime !== "string"
            || typeof parsed.endTime !== "string"
            || typeof parsed.joinedAt !== "number"
        ) {
            return null
        }

        return {
            contestKey: parsed.contestKey,
            contestName: parsed.contestName,
            startTime: parsed.startTime,
            endTime: parsed.endTime,
            joinedAt: parsed.joinedAt
        }
    } catch {
        return null
    }
}

export function clearActiveExamSession() {
    const hadSession = Boolean(localStorage.getItem(ACTIVE_EXAM_SESSION_KEY))
    localStorage.removeItem(ACTIVE_EXAM_SESSION_KEY)
    activeSessionApiCache = null
    if (hadSession) {
        emitActiveExamSessionChanged()
    }
}

export function getActiveExamSessionChangedEventName() {
    return ACTIVE_EXAM_SESSION_CHANGED_EVENT
}

export async function getActiveExamSessionViaApi(options?: { forceRefresh?: boolean }): Promise<ActiveExamSession | null> {
    if (typeof window === "undefined") {
        return null
    }

    const forceRefresh = Boolean(options?.forceRefresh)
    const current = getActiveExamSession()
    const now = Date.now()

    const token = localStorage.getItem("token") || ""
    if (!token) {
        if (current) {
            clearActiveExamSession()
        }
        activeSessionApiCache = {
            checkedAt: Date.now(),
            value: null
        }
        return null
    }

    const hasFreshCache = Boolean(
        !forceRefresh
        && activeSessionApiCache
        && (now - activeSessionApiCache.checkedAt) < ACTIVE_EXAM_SESSION_API_CHECK_TTL_MS
    )

    if (hasFreshCache && activeSessionApiCache) {
        return activeSessionApiCache.value
    }

    if (!forceRefresh && activeSessionApiRequest) {
        return activeSessionApiRequest
    }

    activeSessionApiRequest = (async () => {
        const currentContest = await getCurrentContest()
        if (!currentContest) {
            if (current) {
                clearActiveExamSession()
            }
            activeSessionApiCache = {
                checkedAt: now,
                value: null
            }
            return null
        }

        const endMs = new Date(currentContest.end_time).getTime()
        if (Number.isFinite(endMs) && endMs <= now) {
            if (current) {
                clearActiveExamSession()
            }
            activeSessionApiCache = {
                checkedAt: now,
                value: null
            }
            return null
        }

        const resolved: ActiveExamSession = {
            contestKey: currentContest.key,
            contestName: formatContestTitle(currentContest),
            startTime: currentContest.start_time,
            endTime: currentContest.end_time,
            joinedAt: current && current.contestKey === currentContest.key ? current.joinedAt : now
        }

        if (!isSameSession(current, resolved)) {
            localStorage.setItem(ACTIVE_EXAM_SESSION_KEY, JSON.stringify(resolved))
            emitActiveExamSessionChanged()
        }
        activeSessionApiCache = {
            checkedAt: now,
            value: resolved
        }
        return resolved
    })()

    try {
        return await activeSessionApiRequest
    } catch {
        // Keep current local session if API check is temporarily unavailable.
        return current
    } finally {
        activeSessionApiRequest = null
    }
}
