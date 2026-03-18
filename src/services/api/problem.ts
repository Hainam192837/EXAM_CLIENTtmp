import type { ExamProblem } from "../../types/problem"
import { requestApi } from "./base"
import { getCurrentUsername } from "../auth"

const submittedProblemsStorageKeyBase = "submittedProblemsByContest"
const submitCooldownStorageKeyBase = "submitCooldownByProblem"
const submitCooldownMs = 10 * 1000
const contestProblemCache = new Map<string, ContestProblemCacheEntry>()
const problemDetailCacheTtlMs = 5 * 60 * 1000
const submissionApiCacheTtlMs = 60 * 1000
const problemVersionCacheTtlMs = 30 * 1000

type ContestProblemCacheEntry = {
    cachedAt: number
    versionUpdate: number | null
    value: ExamProblem[]
}

type ProblemDetailCacheEntry = {
    cachedAt: number
    versionUpdate: number | null
    value: ExamProblem
}

type VersionUpdateCacheEntry = {
    cachedAt: number
    value: number
}

export type SubmissionExistsPayload = {
    has_submission: boolean
    submission_id: number | null
    version_update: number | null
}

export type SubmissionSourcePayload = {
    submission_id: number
    version_update: number | null
    language_key: string
    source: string
}

type SubmissionExistsCacheEntry = {
    cachedAt: number
    value: SubmissionExistsPayload
}

type SubmissionSourceCacheEntry = {
    cachedAt: number
    value: SubmissionSourcePayload
}

const problemDetailCache = new Map<string, ProblemDetailCacheEntry>()
const submissionExistsCache = new Map<string, SubmissionExistsCacheEntry>()
const submissionSourceCache = new Map<string, SubmissionSourceCacheEntry>()
const contestVersionCache = new Map<string, VersionUpdateCacheEntry>()
const problemVersionCache = new Map<string, VersionUpdateCacheEntry>()
let problemCacheOwner = ""

function getProblemCacheOwner() {
    return getCurrentUsername() || "__guest__"
}

function scopedStorageKey(baseKey: string) {
    return `${baseKey}:${getProblemCacheOwner()}`
}

function ensureProblemCacheScope() {
    const owner = getProblemCacheOwner()
    if (owner === problemCacheOwner) {
        return
    }

    contestProblemCache.clear()
    problemDetailCache.clear()
    submissionExistsCache.clear()
    submissionSourceCache.clear()
    contestVersionCache.clear()
    problemVersionCache.clear()
    problemCacheOwner = owner
}

function problemDetailCacheKey(contestKey: string, code: string) {
    return `${contestKey}:${code}`
}

function readSubmittedProblemsMap(): Record<string, string[]> {
    if (typeof window === "undefined") {
        return {}
    }

    const raw = localStorage.getItem(scopedStorageKey(submittedProblemsStorageKeyBase))
    if (!raw) {
        return {}
    }

    try {
        return JSON.parse(raw) as Record<string, string[]>
    } catch {
        return {}
    }
}

function writeSubmittedProblemsMap(data: Record<string, string[]>) {
    if (typeof window === "undefined") {
        return
    }
    localStorage.setItem(scopedStorageKey(submittedProblemsStorageKeyBase), JSON.stringify(data))
}

function sourceCodeStorageKey(contestKey: string, code: string) {
    return `submission:${getProblemCacheOwner()}:${contestKey}:${code}`
}

function submitRateKey(contestKey: string, code: string) {
    return `${contestKey}:${code}`
}

function readSubmitCooldownMap(): Record<string, number> {
    if (typeof window === "undefined") {
        return {}
    }

    const raw = localStorage.getItem(scopedStorageKey(submitCooldownStorageKeyBase))
    if (!raw) {
        return {}
    }

    try {
        return JSON.parse(raw) as Record<string, number>
    } catch {
        return {}
    }
}

function writeSubmitCooldownMap(data: Record<string, number>) {
    if (typeof window === "undefined") {
        return
    }
    localStorage.setItem(scopedStorageKey(submitCooldownStorageKeyBase), JSON.stringify(data))
}

function getSubmitCooldownRemainingInternal(contestKey: string, code: string): number {
    const map = readSubmitCooldownMap()
    const key = submitRateKey(contestKey, code)
    const lastSubmittedAt = map[key] || 0
    const elapsed = Date.now() - lastSubmittedAt
    return Math.max(0, submitCooldownMs - elapsed)
}

function submittedSourceMetaStorageKey(contestKey: string, code: string) {
    return `submission-meta:${getProblemCacheOwner()}:${contestKey}:${code}`
}

function sanitizeVersionPayload(raw: unknown): number | null {
    if (!raw || typeof raw !== "object") {
        return null
    }

    const payload = raw as Record<string, unknown>
    const versionUpdate = payload.version_update
    if (typeof versionUpdate !== "number" || !Number.isFinite(versionUpdate)) {
        return null
    }

    return versionUpdate
}

async function getContestVersionUpdate(contestKey: string, options?: { forceRefresh?: boolean }): Promise<number> {
    const forceRefresh = Boolean(options?.forceRefresh)
    const cached = contestVersionCache.get(contestKey)
    const isFresh = cached ? (Date.now() - cached.cachedAt) < problemVersionCacheTtlMs : false

    if (!forceRefresh && cached && isFresh) {
        return cached.value
    }

    const result = await requestApi<unknown>(`/contest/${contestKey}/version/`, {
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

    contestVersionCache.set(contestKey, {
        cachedAt: Date.now(),
        value: versionUpdate
    })

    return versionUpdate
}

async function getProblemVersionUpdate(contestKey: string, code: string, options?: { forceRefresh?: boolean }): Promise<number> {
    const forceRefresh = Boolean(options?.forceRefresh)
    const versionKey = problemDetailCacheKey(contestKey, code)
    const cached = problemVersionCache.get(versionKey)
    const isFresh = cached ? (Date.now() - cached.cachedAt) < problemVersionCacheTtlMs : false

    if (!forceRefresh && cached && isFresh) {
        return cached.value
    }

    const result = await requestApi<unknown>(`/contest/${contestKey}/problems/${code}/version/`, {
        method: "GET",
        errorMessage: "Không kiểm tra được version bài tập"
    })
    if (result.error) {
        throw new Error(result.error)
    }

    const versionUpdate = sanitizeVersionPayload(result.data)
    if (versionUpdate === null) {
        throw new Error("Dữ liệu version bài tập không hợp lệ")
    }

    problemVersionCache.set(versionKey, {
        cachedAt: Date.now(),
        value: versionUpdate
    })

    return versionUpdate
}

function clearProblemDetailCacheByContest(contestKey: string) {
    for (const key of problemDetailCache.keys()) {
        if (key.startsWith(`${contestKey}:`)) {
            problemDetailCache.delete(key)
        }
    }
}

function clearSubmissionCacheByContest(contestKey: string) {
    for (const key of submissionExistsCache.keys()) {
        if (key.startsWith(`${contestKey}:`)) {
            submissionExistsCache.delete(key)
        }
    }

    for (const key of submissionSourceCache.keys()) {
        if (key.startsWith(`${contestKey}:`)) {
            submissionSourceCache.delete(key)
        }
    }
}

function clearProblemVersionCacheByContest(contestKey: string) {
    for (const key of problemVersionCache.keys()) {
        if (key.startsWith(`${contestKey}:`)) {
            problemVersionCache.delete(key)
        }
    }
}

function clearProblemPersistentCacheByContest(contestKey: string) {
    if (typeof window === "undefined") {
        return
    }

    const owner = getProblemCacheOwner()
    const sourcePrefix = `submission:${owner}:${contestKey}:`
    const sourceMetaPrefix = `submission-meta:${owner}:${contestKey}:`
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i)
        if (!key) {
            continue
        }
        if (key.startsWith(sourcePrefix) || key.startsWith(sourceMetaPrefix)) {
            keysToRemove.push(key)
        }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))

    const submittedMap = readSubmittedProblemsMap()
    if (Object.prototype.hasOwnProperty.call(submittedMap, contestKey)) {
        delete submittedMap[contestKey]
        writeSubmittedProblemsMap(submittedMap)
    }

    const cooldownMap = readSubmitCooldownMap()
    let hasCooldownChanges = false
    for (const key of Object.keys(cooldownMap)) {
        if (key.startsWith(`${contestKey}:`)) {
            delete cooldownMap[key]
            hasCooldownChanges = true
        }
    }
    if (hasCooldownChanges) {
        writeSubmitCooldownMap(cooldownMap)
    }
}

function clearAllProblemCachesByContest(contestKey: string) {
    contestProblemCache.delete(contestKey)
    contestVersionCache.delete(contestKey)
    clearProblemDetailCacheByContest(contestKey)
    clearSubmissionCacheByContest(contestKey)
    clearProblemVersionCacheByContest(contestKey)
    clearProblemPersistentCacheByContest(contestKey)
}

function sanitizeSubmissionExistsPayload(raw: unknown): SubmissionExistsPayload | null {
    if (!raw || typeof raw !== "object") {
        return null
    }

    const payload = raw as Record<string, unknown>
    const hasSubmission = payload.has_submission
    const submissionId = payload.submission_id
    const versionUpdate = payload.version_update
    if (typeof hasSubmission !== "boolean") {
        return null
    }
    if (!(typeof submissionId === "number" || submissionId === null)) {
        return null
    }
    if (!(typeof versionUpdate === "number" || versionUpdate === null || versionUpdate === undefined)) {
        return null
    }

    return {
        has_submission: hasSubmission,
        submission_id: submissionId,
        version_update: typeof versionUpdate === "number" ? versionUpdate : null
    }
}

function sanitizeSubmissionSourcePayload(raw: unknown): SubmissionSourcePayload | null {
    if (!raw || typeof raw !== "object") {
        return null
    }

    const payload = raw as Record<string, unknown>
    if (
        typeof payload.submission_id !== "number"
        || typeof payload.language_key !== "string"
        || typeof payload.source !== "string"
    ) {
        return null
    }

    const versionUpdateRaw = payload.version_update
    const versionUpdate = typeof versionUpdateRaw === "number" ? versionUpdateRaw : null

    return {
        submission_id: payload.submission_id,
        version_update: versionUpdate,
        language_key: payload.language_key,
        source: payload.source
    }
}

function submissionFingerprint(submissionId: number | null, versionUpdate: number | null) {
    return `${submissionId ?? "none"}:${versionUpdate ?? "none"}`
}

function writeSubmittedSourceMeta(contestKey: string, code: string, payload: SubmissionSourcePayload) {
    if (typeof window === "undefined") {
        return
    }

    localStorage.setItem(submittedSourceMetaStorageKey(contestKey, code), JSON.stringify(payload))
}

function readSubmittedSourceMeta(contestKey: string, code: string): SubmissionSourcePayload | null {
    if (typeof window === "undefined") {
        return null
    }

    const raw = localStorage.getItem(submittedSourceMetaStorageKey(contestKey, code))
    if (!raw) {
        return null
    }

    try {
        return sanitizeSubmissionSourcePayload(JSON.parse(raw))
    } catch {
        return null
    }
}

export async function getSubmissionExists(contestKey: string, code: string, options?: { forceRefresh?: boolean }): Promise<SubmissionExistsPayload> {
    ensureProblemCacheScope()
    const key = problemDetailCacheKey(contestKey, code)
    const forceRefresh = Boolean(options?.forceRefresh)
    const cached = submissionExistsCache.get(key)
    const isFresh = cached ? (Date.now() - cached.cachedAt) < submissionApiCacheTtlMs : false

    if (!forceRefresh && cached && isFresh) {
        return cached.value
    }

    const result = await requestApi<unknown>(`/contest/${contestKey}/problems/${code}/submission/exists/`, {
        method: "GET",
        errorMessage: "Không kiểm tra được trạng thái submission"
    })

    if (result.error) {
        throw new Error(result.error)
    }

    const payload = sanitizeSubmissionExistsPayload(result.data)
    if (!payload) {
        throw new Error("Dữ liệu trạng thái submission không hợp lệ")
    }

    submissionExistsCache.set(key, {
        cachedAt: Date.now(),
        value: payload
    })

    return payload
}

export async function getSubmissionSource(contestKey: string, code: string, options?: { forceRefresh?: boolean }): Promise<SubmissionSourcePayload | null> {
    ensureProblemCacheScope()
    const key = problemDetailCacheKey(contestKey, code)
    const forceRefresh = Boolean(options?.forceRefresh)

    const existsPayload = await getSubmissionExists(contestKey, code, { forceRefresh })
    if (!existsPayload.has_submission) {
        submissionSourceCache.delete(key)
        if (typeof window !== "undefined") {
            localStorage.removeItem(submittedSourceMetaStorageKey(contestKey, code))
            localStorage.removeItem(sourceCodeStorageKey(contestKey, code))
        }
        return null
    }

    const expectedFingerprint = submissionFingerprint(existsPayload.submission_id, existsPayload.version_update)

    const memoryCached = submissionSourceCache.get(key)
    const isMemoryFresh = memoryCached ? (Date.now() - memoryCached.cachedAt) < submissionApiCacheTtlMs : false
    if (
        !forceRefresh
        && memoryCached
        && isMemoryFresh
        && submissionFingerprint(memoryCached.value.submission_id, memoryCached.value.version_update) === expectedFingerprint
    ) {
        return memoryCached.value
    }

    const storageCached = readSubmittedSourceMeta(contestKey, code)
    if (
        !forceRefresh
        && storageCached
        && submissionFingerprint(storageCached.submission_id, storageCached.version_update) === expectedFingerprint
    ) {
        const cachedAt = memoryCached?.cachedAt || Date.now()
        submissionSourceCache.set(key, {
            cachedAt,
            value: storageCached
        })
        return storageCached
    }

    const result = await requestApi<unknown>(`/contest/${contestKey}/problems/${code}/submission/source/`, {
        method: "GET",
        errorMessage: "Không lấy được source submission"
    })

    if (result.status === 404) {
        return null
    }

    if (result.error) {
        throw new Error(result.error)
    }

    const payload = sanitizeSubmissionSourcePayload(result.data)
    if (!payload) {
        throw new Error("Dữ liệu source submission không hợp lệ")
    }

    payload.version_update = existsPayload.version_update

    submissionSourceCache.set(key, {
        cachedAt: Date.now(),
        value: payload
    })

    if (typeof window !== "undefined") {
        localStorage.setItem(sourceCodeStorageKey(contestKey, code), payload.source)
    }
    writeSubmittedSourceMeta(contestKey, code, payload)

    return payload
}

function cloneProblems(problems: ExamProblem[]): ExamProblem[] {
    return problems.map((problem) => ({ ...problem }))
}

function normalizeStatement(rawStatement: unknown): string | undefined {
    if (rawStatement === null || rawStatement === undefined) {
        return undefined
    }

    if (typeof rawStatement === "string") {
        const trimmed = rawStatement.trim()
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
            try {
                return normalizeStatement(JSON.parse(trimmed))
            } catch {
                return rawStatement
            }
        }
        return rawStatement
    }

    if (Array.isArray(rawStatement)) {
        return rawStatement
            .map((item) => normalizeStatement(item))
            .filter((item): item is string => Boolean(item && item.trim()))
            .join("\n")
    }

    if (typeof rawStatement === "object") {
        const statementObject = rawStatement as Record<string, unknown>

        const directKeys = ["statement", "content", "description", "markdown", "text", "body"]
        for (const key of directKeys) {
            const value = statementObject[key]
            if (typeof value === "string" && value.trim()) {
                return value
            }
        }

        if (Array.isArray(statementObject.blocks)) {
            const fromBlocks = statementObject.blocks
                .map((block) => {
                    if (block && typeof block === "object") {
                        const blockObject = block as Record<string, unknown>
                        return normalizeStatement(blockObject.text ?? blockObject.content ?? blockObject.data)
                    }
                    return normalizeStatement(block)
                })
                .filter((item): item is string => Boolean(item && item.trim()))
                .join("\n")

            if (fromBlocks) {
                return fromBlocks
            }
        }

        if (Array.isArray(statementObject.ops)) {
            const fromOps = statementObject.ops
                .map((op) => (op && typeof op === "object" ? (op as Record<string, unknown>).insert : op))
                .map((insertValue) => (typeof insertValue === "string" ? insertValue : ""))
                .join("")

            if (fromOps.trim()) {
                return fromOps
            }
        }

        return JSON.stringify(rawStatement, null, 2)
    }

    return String(rawStatement)
}

function normalizeProblem(problem: ExamProblem): ExamProblem {
    return {
        ...problem,
        statement: normalizeStatement(problem.statement)
    }
}

function mergeSubmittedStatus(contestKey: string, baseProblems: ExamProblem[]): ExamProblem[] {
    const submitted = new Set(readSubmittedProblemsMap()[contestKey] || [])

    return baseProblems.map((problem) => ({
        ...problem,
        status: submitted.has(problem.code) ? "submitted" : problem.status
    }))
}

async function syncSubmittedStatusFromServer(contestKey: string, baseProblems: ExamProblem[]): Promise<ExamProblem[]> {
    if (baseProblems.length === 0) {
        return baseProblems
    }

    const submittedMap = readSubmittedProblemsMap()
    const mergedSubmitted = new Set(submittedMap[contestKey] || [])
    let hasAnyServerResult = false

    await Promise.all(baseProblems.map(async (problem) => {
        try {
            const exists = await getSubmissionExists(contestKey, problem.code)
            hasAnyServerResult = true
            if (exists.has_submission) {
                mergedSubmitted.add(problem.code)
            } else {
                mergedSubmitted.delete(problem.code)
            }
        } catch {
            // Keep local state for this problem when status API is temporarily unavailable.
        }
    }))

    if (hasAnyServerResult) {
        submittedMap[contestKey] = Array.from(mergedSubmitted)
        writeSubmittedProblemsMap(submittedMap)
    }

    return baseProblems.map((problem) => ({
        ...problem,
        status: mergedSubmitted.has(problem.code) ? "submitted" : problem.status
    }))
}

async function fetchContestProblems(contestKey: string): Promise<ExamProblem[]> {
    console.log("[problem.list] loading...", { contestKey, endpoint: `/contest/${contestKey}/problems/` })
    const result = await requestApi<unknown>(`/contest/${contestKey}/problems/`, {
        method: "GET",
        errorMessage: "Failed to load contest problems"
    })
    if (result.error) {
        console.log("[problem.list] request error:", {
            contestKey,
            status: result.status,
            error: result.error
        })
        throw new Error(result.error)
    }

    const data = result.data

    const problemList = Array.isArray(data)
        ? data
        : ((data as { results?: unknown[] } | null)?.results || [])

    console.log("[problem.list] loaded", {
        contestKey,
        status: result.status,
        total: problemList.length
    })

    return cloneProblems(problemList as ExamProblem[]).map((problem) => normalizeProblem(problem))
}

export async function getExamProblems(contestKey: string): Promise<ExamProblem[]> {
    ensureProblemCacheScope()
    const cached = contestProblemCache.get(contestKey)
    if (cached) {
        const isFresh = (Date.now() - cached.cachedAt) < problemDetailCacheTtlMs
        if (isFresh) {
            const merged = mergeSubmittedStatus(contestKey, cached.value)
            return syncSubmittedStatusFromServer(contestKey, merged)
        }

        try {
            const latestVersion = await getContestVersionUpdate(contestKey, { forceRefresh: true })
            if (cached.versionUpdate !== null && cached.versionUpdate === latestVersion) {
                const merged = mergeSubmittedStatus(contestKey, cached.value)
                return syncSubmittedStatusFromServer(contestKey, merged)
            }

            clearAllProblemCachesByContest(contestKey)
        } catch {
            const merged = mergeSubmittedStatus(contestKey, cached.value)
            return syncSubmittedStatusFromServer(contestKey, merged)
        }
    }

    const fetchedProblems = await fetchContestProblems(contestKey)
    let latestVersion: number | null = null
    try {
        latestVersion = await getContestVersionUpdate(contestKey)
    } catch {
        latestVersion = null
    }

    contestProblemCache.set(contestKey, {
        cachedAt: Date.now(),
        versionUpdate: latestVersion,
        value: fetchedProblems
    })
    const merged = mergeSubmittedStatus(contestKey, fetchedProblems)
    return syncSubmittedStatusFromServer(contestKey, merged)
}

export async function getExamProblemDetail(contestKey: string, code: string): Promise<ExamProblem | null> {
    ensureProblemCacheScope()
    const detailKey = problemDetailCacheKey(contestKey, code)
    const detailCached = problemDetailCache.get(detailKey)
    const isDetailCacheFresh = detailCached
        ? (Date.now() - detailCached.cachedAt) < problemDetailCacheTtlMs
        : false

    if (detailCached && isDetailCacheFresh) {
        const mergedCached = mergeSubmittedStatus(contestKey, [detailCached.value])
        return mergedCached[0] || null
    }

    if (detailCached && !isDetailCacheFresh) {
        try {
            const latestVersion = await getProblemVersionUpdate(contestKey, code, { forceRefresh: true })
            if (detailCached.versionUpdate !== null && detailCached.versionUpdate === latestVersion) {
                const mergedCached = mergeSubmittedStatus(contestKey, [detailCached.value])
                return mergedCached[0] || null
            }
        } catch {
            const mergedCached = mergeSubmittedStatus(contestKey, [detailCached.value])
            return mergedCached[0] || null
        }

        problemDetailCache.delete(detailKey)
    }

    const result = await requestApi<unknown>(`/contest/${contestKey}/problems/${code}/`, {
        method: "GET",
        errorMessage: "Không tải được chi tiết bài tập"
    })
    if (result.error) {
        return null
    }

    const data = result.data

    if (!data || Array.isArray(data) || typeof data !== "object") {
        return null
    }

    const detail = normalizeProblem({ ...(data as ExamProblem) })
    let latestVersion: number | null = null
    try {
        latestVersion = await getProblemVersionUpdate(contestKey, code)
    } catch {
        latestVersion = null
    }

    problemDetailCache.set(detailKey, {
        cachedAt: Date.now(),
        versionUpdate: latestVersion,
        value: detail
    })

    const merged = mergeSubmittedStatus(contestKey, [detail])
    return merged[0] || null
}

export async function submitExamProblem(
    contestKey: string,
    code: string,
    sourceCode: string,
    languageKey: string
): Promise<void> {
    ensureProblemCacheScope()
    const remaining = getSubmitCooldownRemainingInternal(contestKey, code)
    if (remaining > 0) {
        const remainingSeconds = Math.ceil(remaining / 1000)
        throw new Error(`Mỗi bài tập chỉ được nạp lại sau 10 giây. Vui lòng chờ ${remainingSeconds}s.`)
    }

    const body = {
        language_key: languageKey,
        source: sourceCode
    }

    const result = await requestApi<unknown>(`/contest/${contestKey}/problems/${code}/submit/`, {
        method: "POST",
        body,
        errorMessage: "Không thể nạp bài"
    })
    if (result.error) {
        throw new Error(result.error)
    }

    const map = readSubmittedProblemsMap()
    const current = new Set(map[contestKey] || [])
    current.add(code)
    map[contestKey] = Array.from(current)
    writeSubmittedProblemsMap(map)

    const cooldownMap = readSubmitCooldownMap()
    cooldownMap[submitRateKey(contestKey, code)] = Date.now()
    writeSubmitCooldownMap(cooldownMap)

    if (typeof window !== "undefined") {
        localStorage.setItem(sourceCodeStorageKey(contestKey, code), sourceCode)
    }

    const submitResult = result.data as Record<string, unknown> | null
    const submissionId = typeof submitResult?.submission_id === "number" ? submitResult.submission_id : Date.now()
    const sourcePayload: SubmissionSourcePayload = {
        submission_id: submissionId,
        version_update: null,
        language_key: languageKey,
        source: sourceCode
    }
    const cacheKey = problemDetailCacheKey(contestKey, code)
    submissionSourceCache.set(cacheKey, {
        cachedAt: Date.now(),
        value: sourcePayload
    })
    writeSubmittedSourceMeta(contestKey, code, sourcePayload)
    submissionExistsCache.set(cacheKey, {
        cachedAt: Date.now(),
        value: {
            has_submission: true,
            submission_id: submissionId,
            version_update: null
        }
    })
}

export function getSubmitCooldownRemainingMs(contestKey: string, code: string): number {
    ensureProblemCacheScope()
    return getSubmitCooldownRemainingInternal(contestKey, code)
}

export function getSubmittedSourceCode(contestKey: string, code: string): string {
    ensureProblemCacheScope()
    if (typeof window === "undefined") {
        return ""
    }
    return localStorage.getItem(sourceCodeStorageKey(contestKey, code)) || ""
}
