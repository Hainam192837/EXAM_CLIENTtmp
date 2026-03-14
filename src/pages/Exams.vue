<template>
    <CommonLayout title="Danh sách cuộc thi">
        <div class="mb-6 rounded-2xl border border-white/70 bg-white/85 p-5 shadow-lg backdrop-blur sm:p-6">
            <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Chọn cuộc thi</h1>
            <p class="mt-2 text-sm text-slate-600 sm:text-base">Theo dõi thời gian bắt đầu và vào thi ngay khi sẵn sàng.
            </p>
        </div>

        <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">
            <div class="flex items-center gap-3">
                <span class="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-500"></span>
                Đang tải danh sách cuộc thi...
            </div>
        </div>

        <div v-if="error" class="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-red-600 shadow-sm">
            {{ error }}
        </div>

        <div
            v-if="!loading && !error && hasOngoingActiveSession"
            class="mb-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700 shadow-sm"
        >
            Bạn đang tham gia một cuộc thi. Các nút vào thi khác đã được ẩn cho đến khi cuộc thi hiện tại kết thúc hoặc bạn rời cuộc thi.
        </div>

        <div v-if="!loading && !error" class="space-y-4">
            <ContestCard
                v-for="contest in sortedContests"
                :key="contest.key"
                :contest="contest"
                :showAction="shouldShowAction(contest.key)"
                :actionLabel="getActionLabel(contest.key)"
                :isActiveContest="isActiveContest(contest.key)"
                @join="joinContest"
                @countdown-finished="onContestCountdownFinished"
            />
        </div>

        <div v-if="!loading && !error && sortedContests.length === 0"
            class="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-600 shadow-sm">
            Chưa có cuộc thi nào.
        </div>

        <Teleport to="body">
            <Transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div
                    v-if="alertState.open"
                    class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-4 sm:items-center"
                    @click.self="closeAlert"
                >
                    <div class="w-full max-w-lg rounded-3xl border border-amber-100 bg-white p-5 shadow-2xl sm:p-6">
                        <div class="flex items-start gap-3">
                            <div class="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                                <AlertTriangle class="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div class="min-w-0">
                                <h2 class="text-lg font-bold text-slate-900">Không thể mở kỳ thi này</h2>
                                <p class="mt-1 text-sm leading-6 text-slate-600">{{ alertState.message }}</p>
                            </div>
                        </div>

                        <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                @click="closeAlert"
                                class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                            >
                                Đóng
                            </button>
                            <button
                                @click="goToActiveContest"
                                class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 focus:outline-none focus:ring-4 focus:ring-amber-100"
                            >
                                Đến kỳ thi hiện tại
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </CommonLayout>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRouter } from "vue-router"
import { AlertTriangle } from "lucide-vue-next"
import ContestCard from "../components/ContestCard.vue"
import CommonLayout from "../components/layout/CommonLayout.vue"
import { getContests } from "../services/api"
import {
    getActiveExamSessionViaApi,
    getActiveExamSessionChangedEventName,
    type ActiveExamSession
} from "../services/examSession"
import type { Contest } from "../types/contest"
const router = useRouter()
const contests = ref<Contest[]>([])
const loading = ref(true)
const error = ref("")
const nowMs = ref(Date.now())
const activeSession = ref<ActiveExamSession | null>(null)
let secondTimer: ReturnType<typeof setInterval> | null = null
let activeSessionSyncTimer: ReturnType<typeof setInterval> | null = null
let isRefreshingCountdownBoundary = false
const activeSessionChangedEventName = getActiveExamSessionChangedEventName()
const alertState = ref({
    open: false,
    message: "",
    targetContestKey: ""
})

const hasOngoingActiveSession = computed(() => {
    if (!activeSession.value) {
        return false
    }
    const endMs = new Date(activeSession.value.endTime).getTime()
    return Number.isFinite(endMs) && nowMs.value < endMs
})

const sortedContests = computed(() => {
    if (!hasOngoingActiveSession.value || !activeSession.value) {
        return contests.value
    }

    const activeKey = activeSession.value.contestKey
    const activeContests = contests.value.filter((contest) => contest.key === activeKey)
    const remainingContests = contests.value.filter((contest) => contest.key !== activeKey)
    return [...activeContests, ...remainingContests]
})

async function loadContests() {
    try {
        contests.value = await getContests()
    } catch {
        error.value = "Không tải được danh sách cuộc thi"
    } finally {
        loading.value = false
    }
}

async function refreshContestsAfterCountdownBoundary() {
    if (isRefreshingCountdownBoundary) {
        return
    }

    isRefreshingCountdownBoundary = true
    try {
        contests.value = await getContests()
    } catch {
        // Keep current list if boundary refresh fails.
    } finally {
        isRefreshingCountdownBoundary = false
    }
}

function onContestCountdownFinished() {
    void refreshContestsAfterCountdownBoundary()
}

async function syncActiveSession(forceRefresh = false) {
    activeSession.value = await getActiveExamSessionViaApi({ forceRefresh })
}

function onStorageChange(event: StorageEvent) {
    if (event.key === "activeExamSession") {
        void syncActiveSession()
    }
}

function onActiveSessionChanged() {
    void syncActiveSession()
}

function isActiveContest(contestKey: string) {
    return hasOngoingActiveSession.value && activeSession.value?.contestKey === contestKey
}

function shouldShowAction(contestKey: string) {
    if (!hasOngoingActiveSession.value) {
        return true
    }
    return activeSession.value?.contestKey === contestKey
}

function getActionLabel(contestKey: string) {
    if (isActiveContest(contestKey)) {
        return "Tiếp tục thi"
    }
    return "Vào thi"
}

function joinContest(key: string) {
    if (hasOngoingActiveSession.value && activeSession.value && activeSession.value.contestKey !== key) {
        alertState.value = {
            open: true,
            message: `Bạn đã tham gia cuộc thi ${activeSession.value.contestName}. Vui lòng rời cuộc thi hiện tại trước khi xem cuộc thi khác.`,
            targetContestKey: activeSession.value.contestKey
        }
        return
    }

    router.push(`/exam/${key}`)
}

function closeAlert() {
    alertState.value.open = false
}

function goToActiveContest() {
    const contestKey = alertState.value.targetContestKey
    closeAlert()
    if (!contestKey) {
        return
    }
    router.push(`/exam/${contestKey}/problems`)
}

onMounted(() => {
    const token = localStorage.getItem("token")
    if (!token) {
        router.push("/")
        return
    }
    void syncActiveSession(true)
    secondTimer = setInterval(() => {
        nowMs.value = Date.now()
    }, 1000)
    activeSessionSyncTimer = setInterval(() => {
        void syncActiveSession(true)
    }, 30 * 1000)
    window.addEventListener("storage", onStorageChange)
    window.addEventListener(activeSessionChangedEventName, onActiveSessionChanged)
    loadContests()
})

onUnmounted(() => {
    if (secondTimer) {
        clearInterval(secondTimer)
    }
    if (activeSessionSyncTimer) {
        clearInterval(activeSessionSyncTimer)
    }
    window.removeEventListener("storage", onStorageChange)
    window.removeEventListener(activeSessionChangedEventName, onActiveSessionChanged)
})
</script>