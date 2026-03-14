<template>
    <div class="flex min-h-screen flex-col">
        <Navbar :title="title" :showBack="showBack" />
        <div class="relative w-full flex-1 overflow-visible px-4 pt-8 pb-32 sm:px-6 sm:pb-36 lg:px-8">
            <div class="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-cyan-50/40 via-white/30 to-sky-50/40">
            </div>

            <div class="mx-auto w-full container ">
                <slot />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import Navbar from "../Navbar.vue"
const props = defineProps<{
    title: string
    showBack?: boolean
}>()
</script>