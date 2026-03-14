<template>
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
                v-if="open"
                class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-4 sm:items-center"
                @click.self="onBackdropClick"
            >
                <div class="w-full max-w-lg rounded-3xl border bg-white p-5 shadow-2xl sm:p-6" :class="panelClass">
                    <div class="flex items-start gap-3">
                        <div
                            class="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base font-bold"
                            :class="badgeClass"
                        >
                            <component :is="toneIcon" class="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div class="min-w-0">
                            <h2 class="text-lg font-bold text-slate-900">{{ title }}</h2>
                            <p class="mt-1 text-sm leading-6 text-slate-600">{{ message }}</p>
                        </div>
                    </div>

                    <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            v-if="cancelText"
                            @click="$emit('cancel')"
                            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                        >
                            {{ cancelText }}
                        </button>
                        <button
                            @click="$emit('confirm')"
                            class="rounded-xl border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4"
                            :class="confirmButtonClass"
                        >
                            {{ confirmText }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { AlertTriangle, CircleCheck, CircleX, Info } from "lucide-vue-next"

type DialogTone = "warning" | "info" | "danger" | "success"

const props = withDefaults(defineProps<{
    open: boolean
    title: string
    message: string
    confirmText: string
    cancelText?: string
    tone?: DialogTone
    closeOnBackdrop?: boolean
}>(), {
    cancelText: "",
    tone: "warning",
    closeOnBackdrop: true
})

const emit = defineEmits<{
    confirm: []
    cancel: []
}>()

const panelClass = computed(() => {
    if (props.tone === "danger") {
        return "border-rose-100"
    }
    if (props.tone === "success") {
        return "border-emerald-100"
    }
    if (props.tone === "info") {
        return "border-sky-100"
    }
    return "border-amber-100"
})

const badgeClass = computed(() => {
    if (props.tone === "danger") {
        return "bg-rose-100 text-rose-700"
    }
    if (props.tone === "success") {
        return "bg-emerald-100 text-emerald-700"
    }
    if (props.tone === "info") {
        return "bg-sky-100 text-sky-700"
    }
    return "bg-amber-100 text-amber-700"
})

const confirmButtonClass = computed(() => {
    if (props.tone === "danger") {
        return "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-100"
    }
    if (props.tone === "success") {
        return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-100"
    }
    if (props.tone === "info") {
        return "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 focus:ring-sky-100"
    }
    return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 focus:ring-amber-100"
})

const toneIcon = computed(() => {
    if (props.tone === "danger") {
        return CircleX
    }
    if (props.tone === "success") {
        return CircleCheck
    }
    if (props.tone === "info") {
        return Info
    }
    return AlertTriangle
})

function onBackdropClick() {
    if (!props.closeOnBackdrop) {
        return
    }
    emit("cancel")
}
</script>
