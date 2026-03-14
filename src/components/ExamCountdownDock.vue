<template>
    <div
        v-if="showDock"
        class="fixed bottom-4 left-4 z-40 rounded-2xl border border-sky-400/30 bg-slate-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur"
    >
        <div class="mb-2 flex items-center justify-between gap-3">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">{{ dockLabel }}</p>
            <button
                type="button"
                class="rounded-md border border-slate-500/60 bg-slate-800/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-700"
                :disabled="isLeaving"
                @click="leaveCurrentExam"
            >
                Rời cuộc thi
            </button>
        </div>
        <p class="mt-1 font-mono text-2xl font-bold tracking-[0.18em] text-cyan-200 sm:text-3xl">{{ digitalClockValue }}</p>
        <p v-if="contestName" class="mt-1 max-w-65 truncate text-xs text-slate-300">{{ contestName }}</p>
    </div>

    <AppDialog
        :open="leaveDialogOpen"
        title="Rời cuộc thi hiện tại"
        message="Bạn có chắc muốn rời cuộc thi hiện tại không?"
        confirmText="Rời cuộc thi"
        cancelText="Ở lại"
        tone="danger"
        @cancel="leaveDialogOpen = false"
        @confirm="confirmLeaveCurrentExam"
    />

    <div
        v-if="leaveError"
        class="fixed right-4 bottom-4 z-50 max-w-sm rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg"
    >
        {{ leaveError }}
    </div>

    <div
        v-if="isLeaving"
        class="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
    >
        <div class="w-full max-w-md rounded-3xl border border-sky-100 bg-white p-6 text-center shadow-2xl sm:p-7">
            <div class="mx-auto inline-flex h-10 w-10 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600"></div>
            <p class="mt-4 text-base font-semibold text-slate-900">Đang rời cuộc thi...</p>
            <p class="mt-1 text-sm text-slate-600">Vui lòng chờ trong giây lát, hệ thống đang cập nhật phiên thi.</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRouter } from "vue-router"
import AppDialog from "./AppDialog.vue"
import { leaveContest } from "../services/api"
import {
    clearActiveExamSession,
    getActiveExamSessionViaApi,
    getActiveExamSessionChangedEventName,
    type ActiveExamSession
} from "../services/examSession"

const router = useRouter()

const session = ref<ActiveExamSession | null>(null)
const nowMs = ref(Date.now())
const leaveDialogOpen = ref(false)
const leaveError = ref("")
const isLeaving = ref(false)
let secondTimer: ReturnType<typeof setInterval> | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null
const activeSessionChangedEventName = getActiveExamSessionChangedEventName()

const contestName = computed(() => session.value?.contestName || "")

const startMs = computed(() => {
    if (!session.value) {
        return 0
    }
    return new Date(session.value.startTime).getTime()
})

const endMs = computed(() => {
    if (!session.value) {
        return 0
    }
    return new Date(session.value.endTime).getTime()
})

const hasStarted = computed(() => Boolean(session.value) && nowMs.value >= startMs.value)
const hasEnded = computed(() => Boolean(session.value) && nowMs.value >= endMs.value)

const showDock = computed(() => {
    if (!session.value) {
        return false
    }

    const hasToken = Boolean(localStorage.getItem("token"))
    return hasToken && !hasEnded.value
})

const countdownMs = computed(() => {
    if (!session.value) {
        return 0
    }
    if (!hasStarted.value) {
        return Math.max(0, startMs.value - nowMs.value)
    }
    return Math.max(0, endMs.value - nowMs.value)
})

const dockLabel = computed(() => {
    if (!session.value) {
        return ""
    }
    if (!hasStarted.value) {
        return "Đếm ngược bắt đầu"
    }
    return "Đếm ngược kết thúc"
})

const digitalClockValue = computed(() => {
    const total = Math.max(0, Math.ceil(countdownMs.value / 1000))
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
})

async function syncSessionFromStorage(forceRefresh = false) {
    const hasToken = Boolean(localStorage.getItem("token"))
    if (!hasToken) {
        session.value = null
        return
    }
    session.value = await getActiveExamSessionViaApi({ forceRefresh })
}

function onStorageChange(event: StorageEvent) {
    if (event.key === "activeExamSession") {
        void syncSessionFromStorage()
    }
}

function onSessionChangedEvent() {
    void syncSessionFromStorage()
}

function leaveCurrentExam() {
    leaveDialogOpen.value = true
}

async function confirmLeaveCurrentExam() {
    if (!session.value || isLeaving.value) {
        leaveDialogOpen.value = false
        return
    }

    const contestKey = session.value.contestKey
    leaveDialogOpen.value = false
    leaveError.value = ""
    isLeaving.value = true

    try {
        await leaveContest(contestKey)
        clearActiveExamSession()
        session.value = null
        router.push("/exams")
    } catch (leaveException) {
        leaveError.value = leaveException instanceof Error
            ? leaveException.message
            : "Không thể rời cuộc thi hiện tại"
    } finally {
        isLeaving.value = false
    }
}

onMounted(() => {
    void syncSessionFromStorage(true)

    secondTimer = setInterval(() => {
        nowMs.value = Date.now()

        if (session.value && hasEnded.value) {
            clearActiveExamSession()
            session.value = null
        }
    }, 1000)

    refreshTimer = setInterval(() => {
        void syncSessionFromStorage(true)
    }, 60 * 1000)

    window.addEventListener("storage", onStorageChange)
    window.addEventListener(activeSessionChangedEventName, onSessionChangedEvent)
})

onUnmounted(() => {
    if (secondTimer) {
        clearInterval(secondTimer)
    }
    if (refreshTimer) {
        clearInterval(refreshTimer)
    }
    window.removeEventListener("storage", onStorageChange)
    window.removeEventListener(activeSessionChangedEventName, onSessionChangedEvent)
})
</script>
