<template>
    <nav class="sticky top-0 z-20 border-b border-white/60 bg-white/85 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
        <div class="container mx-auto flex items-center justify-between">
            <!-- LEFT -->
            <div class="flex items-center gap-3">
                <button v-if="showBack" @click="goBack"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-slate-900">
                    <span aria-hidden="true">
                        <svg class="w-6 h-6 text-gray-800" aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M5 12h14M5 12l4-4m-4 4 4 4" />
                        </svg>
                    </span>
                </button>
                <span class="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl uppercase">
                    {{ title }}
                </span>
            </div>
            <!-- RIGHT -->
            <div class="flex items-center gap-3 sm:gap-4">
                <span class="inline-flex max-w-52 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 pr-3 text-sm font-medium text-slate-700 shadow-sm">
                    <span class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <svg class="h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                            <path fill-rule="evenodd" d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4h-4Z" clip-rule="evenodd"/>
                        </svg>
                    </span>
                    <span class="truncate">{{ username }}</span>
                </span>
                <button @click="logout"
                    class="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100 hover:text-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-100 active:translate-y-0">
                    <svg class="h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H8m12 0-4 4m4-4-4-4M9 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h2"/>
                    </svg>
                    Đăng xuất
                </button>
            </div>
        </div>
    </nav>
</template>
<script setup lang="ts">
import { useRouter } from "vue-router"
import { computed } from "vue"
import { clearAuthSession, getCurrentUsername } from "../services/auth"
const router = useRouter()
const props = defineProps<{
    title: string
    showBack?: boolean
}>()
const username = computed(() => {
    return getCurrentUsername()
})
function goBack() {
    router.back()
}
function logout() {
    clearAuthSession()
    router.push("/")
}
</script>