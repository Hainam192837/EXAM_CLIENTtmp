<template>
    <CommonLayout :title="contestDisplayTitle" :showBack="true">
        <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">
            <div class="flex items-center gap-3">
                <span class="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-500"></span>
                Đang tải chi tiết cuộc thi...
            </div>
        </div>

        <div v-else-if="error" class="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-red-600 shadow-sm">
            {{ error }}
        </div>

        <div v-else-if="contest"
            class="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
            <p class="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-sky-600">Chi tiết cuộc thi</p>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{{ contestDisplayTitle }}</h1>

            <div class="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                    <span class="font-semibold text-slate-700">Bắt đầu:</span>
                    {{ formatDate(contest.start_time) }}
                </div>
                <div>
                    <span class="font-semibold text-slate-700">Kết thúc:</span>
                    {{ formatDate(contest.end_time) }}
                </div>
            </div>

            <div class="mt-6 rounded-2xl border px-4 py-3 text-sm" :class="countdownStateClass">
                <span v-if="!hasStarted">Cuộc thi sẽ bắt đầu sau {{ formatDuration(timeUntilStart) }}.</span>
                <span v-else-if="isInProgress">Cuộc thi đang diễn ra. Còn lại {{ formatDuration(timeUntilEnd) }} để làm bài.</span>
                <span v-else>Cuộc thi đã kết thúc.</span>
            </div>

            <div class="mt-7">
                <button @click="goToProblem" :disabled="!isInProgress || isSubmittingJoin"
                    class="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold transition focus:outline-none focus:ring-4"
                    :class="isInProgress && !isSubmittingJoin
                        ? 'border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 focus:ring-sky-100'
                        : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 focus:ring-slate-200'">
                    {{ isSubmittingJoin ? "Đang vào thi..." : "Vào thi" }}
                </button>
            </div>

            <p v-if="submitJoinError" class="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
                {{ submitJoinError }}
            </p>
        </div>

        <div v-else class="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-600 shadow-sm">
            Không tìm thấy cuộc thi.
        </div>

        <AppDialog
            :open="dialogState.open"
            :title="dialogState.title"
            :message="dialogState.message"
            :confirmText="dialogState.confirmText"
            :cancelText="dialogState.cancelText"
            :tone="dialogState.tone"
            @cancel="closeDialog"
            @confirm="onDialogConfirm"
        />

    </CommonLayout>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue"
import { useRouter, useRoute } from "vue-router"
import AppDialog from "../components/AppDialog.vue"
import CommonLayout from "../components/layout/CommonLayout.vue"
import { getContestDetail, joinContest } from "../services/api"
import { getActiveExamSession, getActiveExamSessionViaApi, setActiveExamSession } from "../services/examSession"
import { formatContestTitle, type Contest } from "../types/contest"

type DialogTone = "warning" | "info" | "danger" | "success"
type DialogAction = "" | "go-active-contest" | "join-contest"

const router = useRouter()
const route = useRoute()
const contest = ref<Contest | null>(null)
const loading = ref(true)
const error = ref("")
const nowMs = ref(Date.now())
const isSubmittingJoin = ref(false)
const submitJoinError = ref("")
const dialogState = ref({
    open: false,
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    tone: "warning" as DialogTone,
    action: "" as DialogAction,
    targetContestKey: ""
})
let secondTimer: ReturnType<typeof setInterval> | null = null
let refreshContestTimer: ReturnType<typeof setInterval> | null = null

const contestDisplayTitle = computed(() => {
    if (!contest.value) {
        return "Kiểm tra"
    }
    return formatContestTitle(contest.value)
})

const timeUntilStart = computed(() => {
    if (!contest.value) {
        return 0
    }
    const start = new Date(contest.value.start_time).getTime()
    return Math.max(0, start - nowMs.value)
})

const timeUntilEnd = computed(() => {
    if (!contest.value) {
        return 0
    }
    const end = new Date(contest.value.end_time).getTime()
    return Math.max(0, end - nowMs.value)
})

const hasStarted = computed(() => {
    if (!contest.value) {
        return false
    }
    const start = new Date(contest.value.start_time).getTime()
    return nowMs.value >= start
})

const hasEnded = computed(() => {
    if (!contest.value) {
        return false
    }
    const end = new Date(contest.value.end_time).getTime()
    return nowMs.value >= end
})

const isInProgress = computed(() => hasStarted.value && !hasEnded.value)

const countdownStateClass = computed(() => {
    if (!hasStarted.value) {
        return "border-amber-100 bg-amber-50 text-amber-700"
    }
    if (isInProgress.value) {
        return "border-emerald-100 bg-emerald-50 text-emerald-700"
    }
    return "border-slate-200 bg-slate-100 text-slate-600"
})

async function loadContestDetail(forceRefresh = false) {
    try {
        const key = String(route.params.key || "")
        contest.value = await getContestDetail(key, { forceRefresh })
        if (!contest.value) {
            error.value = "Không tìm thấy cuộc thi"
        }
    } catch {
        error.value = "Không tải được thông tin cuộc thi"
    } finally {
        loading.value = false
    }
}

function formatDuration(ms: number) {
    const total = Math.floor(ms / 1000)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return `${h}h ${m}m ${s}s`
}

function formatDate(input: string) {
    return new Date(input).toLocaleString("vi-VN")
}

function closeDialog() {
    dialogState.value.open = false
}

function openBlockedContestDialog(contestName: string, contestKey: string) {
    dialogState.value = {
        open: true,
        title: "Bạn đang ở kỳ thi khác",
        message: `Bạn đang tham gia cuộc thi ${contestName}. Vui lòng rời cuộc thi hiện tại trước khi vào cuộc thi khác.`,
        confirmText: "Đến kỳ thi hiện tại",
        cancelText: "Ở lại trang này",
        tone: "warning",
        action: "go-active-contest",
        targetContestKey: contestKey
    }
}

function openJoinContestDialog(contestName: string) {
    dialogState.value = {
        open: true,
        title: "Xác nhận tham gia",
        message: `Bạn có chắc muốn tham gia cuộc thi \"${contestName}\"?`,
        confirmText: "Tham gia",
        cancelText: "Hủy",
        tone: "info",
        action: "join-contest",
        targetContestKey: ""
    }
}

async function joinCurrentContest() {
    if (!contest.value || isSubmittingJoin.value) {
        return
    }

    const key = contest.value.key
    isSubmittingJoin.value = true
    submitJoinError.value = ""

    try {
        await joinContest(key)
        if (!contest.value) {
            return
        }

        // Persist local active session immediately for fast UI updates (countdown dock).
        setActiveExamSession(contest.value)

        // Re-sync with backend to avoid stale guard decisions right after join.
        const activeSession = await getActiveExamSessionViaApi({ forceRefresh: true })
        const targetContestKey = activeSession?.contestKey || key
        const targetPath = `/exam/${targetContestKey}/problems`

        try {
            await router.push(targetPath)
        } catch {
            // Fallback navigation if router push is interrupted.
            window.location.hash = `#${targetPath}`
        }
    } catch (joinError) {
        submitJoinError.value = joinError instanceof Error
            ? joinError.message
            : "Không thể tham gia cuộc thi"
    } finally {
        isSubmittingJoin.value = false
    }
}

function continueCurrentContest() {
    if (!contest.value) {
        return
    }
    submitJoinError.value = ""
    router.push(`/exam/${contest.value.key}/problems`)
}

function onDialogConfirm() {
    const action = dialogState.value.action
    const targetContestKey = dialogState.value.targetContestKey
    closeDialog()

    if (action === "go-active-contest") {
        if (!targetContestKey) {
            return
        }
        router.push(`/exam/${targetContestKey}/problems`)
        return
    }

    if (action === "join-contest") {
        void joinCurrentContest()
    }
}

async function goToProblem() {
    if (!contest.value || !isInProgress.value) {
        return
    }

    const localActiveSession = getActiveExamSession()
    if (localActiveSession && localActiveSession.contestKey === contest.value.key) {
        continueCurrentContest()
        return
    }

    const activeSession = await getActiveExamSessionViaApi()
    if (activeSession && activeSession.contestKey !== contest.value.key) {
        openBlockedContestDialog(activeSession.contestName, activeSession.contestKey)
        return
    }

    const isAlreadyInCurrentContest = activeSession?.contestKey === contest.value.key
    if (!isAlreadyInCurrentContest) {
        openJoinContestDialog(formatContestTitle(contest.value))
        return
    }

    continueCurrentContest()
}

async function refreshContestTiming() {
    try {
        await loadContestDetail(true)
    } catch {
        // Keep current local contest data if periodic refresh fails.
    }
}

onMounted(() => {
    const token = localStorage.getItem("token")
    if (!token) {
        router.push("/")
        return
    }
    loadContestDetail()
    secondTimer = setInterval(() => {
        nowMs.value = Date.now()
    }, 1000)
    refreshContestTimer = setInterval(() => {
        refreshContestTiming()
    }, 60 * 1000)
})

onUnmounted(() => {
    if (secondTimer) {
        clearInterval(secondTimer)
    }
    if (refreshContestTimer) {
        clearInterval(refreshContestTimer)
    }
})
</script>