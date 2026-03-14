<template>
    <div
        class="group flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
            <div class="text-lg font-semibold text-slate-900 sm:text-xl">
                {{ contestTitle }}
            </div>
            <div class="mt-1 text-sm text-slate-500">
                <span
                    v-if="countdownLabel === 'start'"
                    class="inline-flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700"
                >
                    <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    Bắt đầu sau {{ formatTime(countdownMs) }}
                </span>
                <span
                    v-else-if="countdownLabel === 'end'"
                    class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700"
                >
                    <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    Kết thúc sau {{ formatTime(countdownMs) }}
                </span>
                <span v-else class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                    <span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                    Đã kết thúc
                </span>
            </div>
            <div v-if="isActiveContest" class="mt-2">
                <span class="inline-flex items-center gap-2 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                    <span class="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
                    Cuộc thi đang tham gia
                </span>
            </div>
        </div>

        <div
            v-if="showAction && countdownLabel === 'start'"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 font-semibold text-amber-700 sm:px-5"
        >
            <Lock class="h-4 w-4" aria-hidden="true" />
            <span>Mở sau {{ formatTime(countdownMs) }}</span>
        </div>

        <button v-else-if="showAction" @click="$emit('join', contest.key)"
            class="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200 sm:px-5">
            {{ actionLabel }}
        </button>
    </div>
</template>
<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue"
import { Lock } from "lucide-vue-next"
import { formatContestTitle, type Contest } from "../types/contest"

const props = defineProps<{
    contest: Contest
    showAction?: boolean
    actionLabel?: string
    isActiveContest?: boolean
}>()

const emit = defineEmits<{
    (e: "join", key: string): void
    (e: "countdown-finished", key: string): void
}>()

const countdownMs = ref(0)
const countdownLabel = ref<"start" | "end" | "ended">("ended")
const lastPhase = ref<"before-start" | "in-progress" | "ended">("ended")
const contestTitle = computed(() => formatContestTitle(props.contest))
let timer: ReturnType<typeof setInterval> | null = null

function updateCountdown() {
    const start = new Date(props.contest.start_time).getTime()
    const end = new Date(props.contest.end_time).getTime()
    const now = Date.now()

    let phase: "before-start" | "in-progress" | "ended" = "ended"
    if (now < start) {
        phase = "before-start"
        countdownLabel.value = "start"
        countdownMs.value = Math.max(0, start - now)
    } else if (now < end) {
        phase = "in-progress"
        countdownLabel.value = "end"
        countdownMs.value = Math.max(0, end - now)
    } else {
        phase = "ended"
        countdownLabel.value = "ended"
        countdownMs.value = 0
    }

    if (lastPhase.value !== phase && lastPhase.value !== "ended") {
        emit("countdown-finished", props.contest.key)
    }
    lastPhase.value = phase
}

function formatTime(ms: number) {
    const total = Math.floor(ms / 1000)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}
onMounted(() => {
    updateCountdown()
    timer = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
    if (timer) {
        clearInterval(timer)
    }
})
</script>