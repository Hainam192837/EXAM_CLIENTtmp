<template>
  <div class="flex flex-col min-h-screen bg-[url('/background.png')] bg-cover">
    <router-view />
    <ExamCountdownDock />
  </div>
</template>

<script setup lang="ts">
import ExamCountdownDock from "./components/ExamCountdownDock.vue"
</script>