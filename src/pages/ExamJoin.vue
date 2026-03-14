<template>
    <Navbar title="Tham gia cuộc thi" :showBack="true" />
    <div class="relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
        <div class="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-cyan-50 via-white to-sky-50"></div>

        <div class="mx-auto w-full max-w-3xl rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
            <p class="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-sky-600">Join</p>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Bạn đang tham gia cuộc thi {{ contestKey }}</h1>

            <p class="mt-4 text-sm leading-6 text-slate-600">
                Đây là trang khởi đầu phần làm bài. Bạn có thể tiếp tục tích hợp bộ câu hỏi, timer và phần nộp bài tại đây.
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import Navbar from "../components/Navbar.vue"

const route = useRoute()

const contestKey = computed(() => String(route.params.key || ""))
</script>
