<template>
    <CommonLayout title="Chi tiết bài tập" :showBack="true">
        <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">
            <div class="flex items-center gap-3">
                <span class="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-500"></span>
                Đang tải đề bài...
            </div>
        </div>

        <div v-else-if="error" class="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-red-600 shadow-sm">
            {{ error }}
        </div>

        <div v-else-if="problem" class="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
            <div class="sticky top-20 z-10 -mx-2 mb-4 rounded-2xl border border-slate-200 bg-white/95 px-2 py-3 backdrop-blur sm:-mx-3 sm:px-3">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p class="mb-1 text-sm font-medium uppercase tracking-[0.2em] text-sky-600">Bài {{ problem.code }}</p>
                        <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{{ problem.title }}</h1>
                    </div>

                    <button @click="goToSubmit"
                        class="inline-flex shrink-0 items-center justify-center rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200">
                        Nạp bài
                    </button>
                </div>
            </div>

            <div class="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-3">
                <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Time Limit</p>
                    <p class="mt-1 font-semibold text-slate-900">{{ timeLimitLabel }}</p>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Memory Limit</p>
                    <p class="mt-1 font-semibold text-slate-900">{{ memoryLimitLabel }}</p>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">IO Method</p>
                    <p class="mt-1 font-semibold text-slate-900">{{ ioMethodLabel }}</p>
                </div>
            </div>

            <div v-if="isFileIoMethod" class="mt-4 grid gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 sm:grid-cols-2">
                <div class="rounded-xl border border-indigo-100 bg-white p-3">
                    <p class="text-xs font-semibold uppercase tracking-wide text-indigo-700">File Input</p>
                    <pre class="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-700">{{ ioInputContent }}</pre>
                </div>
                <div class="rounded-xl border border-indigo-100 bg-white p-3">
                    <p class="text-xs font-semibold uppercase tracking-wide text-indigo-700">File Output</p>
                    <pre class="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-700">{{ ioOutputContent }}</pre>
                </div>
            </div>

            <div class="mt-6 rounded-2xl border p-3 text-sm font-medium" :class="problem.status === 'submitted'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                : 'border-amber-100 bg-amber-50 text-amber-700'">
                Trạng thái nạp bài: {{ problem.status === "submitted" ? "Đã nạp" : "Chưa nạp" }}
            </div>

            <div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-700">
                <article
                    ref="statementContainerRef"
                    class="prose prose-slate mt-3 max-w-none prose-p:my-2 prose-p:leading-6"
                    v-html="statementHtml"
                ></article>
            </div>

            <div class="mt-6 flex flex-col gap-3 sm:flex-row">
                <button @click="goBackList"
                    class="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 font-semibold text-sky-700 transition hover:bg-sky-100 focus:outline-none focus:ring-4 focus:ring-sky-100">
                    Quay lại danh sách bài tập
                </button>
            </div>
        </div>

        <div v-else class="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-600 shadow-sm">
            Không tìm thấy bài tập.
        </div>
    </CommonLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
// @ts-ignore - KaTeX auto-render has no direct typings for this entrypoint in current setup.
import renderMathInElement from "katex/contrib/auto-render"
import CommonLayout from "../components/layout/CommonLayout.vue"
import { getExamProblemDetail } from "../services/api"
import type { ExamProblem } from "../types/problem"

const router = useRouter()
const route = useRoute()
const loading = ref(true)
const error = ref("")
const problem = ref<ExamProblem | null>(null)
const statementContainerRef = ref<HTMLElement | null>(null)

const contestKey = computed(() => String(route.params.key || ""))
const problemCode = computed(() => String(route.params.problem || ""))

const statementHtml = computed(() => {
    const raw = problem.value?.statement?.trim() || ""
    if (!raw) {
        return "<p>Chưa có nội dung đề bài</p>"
    }

    const hasHtmlTag = /<\/?[a-z][\s\S]*>/i.test(raw)
    if (hasHtmlTag) {
        return raw
    }

    const escaped = raw
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/\n/g, "<br>")

    return `<p>${escaped}</p>`
})

const timeLimitLabel = computed(() => {
    const value = problem.value?.time_limit
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return "N/A"
    }
    if (value >= 1000 && value % 1000 === 0) {
        return `${value / 1000}s`
    }
    return `${value}s`
})

const memoryLimitLabel = computed(() => {
    const value = problem.value?.memory_limit
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return "N/A"
    }
    if (value >= 1024 && value % 1024 === 0) {
        return `${value / 1024} MB`
    }
    return `${value} KB`
})

const ioMethodLabel = computed(() => {
    const method = problem.value?.io_method?.method
    if (!method) {
        return "N/A"
    }
    if (method === "standard") {
        return "Standard Input/Output"
    }
    if (method === "file") {
        return "File Input/Output"
    }
    return "Unknown"
})

const isFileIoMethod = computed(() => problem.value?.io_method?.method === "file")

const ioInputContent = computed(() => {
    const raw = problem.value?.io_method?.input
    if (!raw || !raw.trim()) {
        return "N/A"
    }
    return raw
})

const ioOutputContent = computed(() => {
    const raw = problem.value?.io_method?.output
    if (!raw || !raw.trim()) {
        return "N/A"
    }
    return raw
})

function renderArithmatexInStatement() {
    const container = statementContainerRef.value
    if (!container) {
        return
    }

    const mathNodes = container.querySelectorAll(".arithmatex")
    mathNodes.forEach((node) => {
        renderMathInElement(node as HTMLElement, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "\\[", right: "\\]", display: true },
                { left: "\\(", right: "\\)", display: false }
            ],
            throwOnError: false
        })
    })
}

async function copyText(content: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(content)
        return true
    } catch {
        const textarea = document.createElement("textarea")
        textarea.value = content
        textarea.setAttribute("readonly", "true")
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()

        const copied = document.execCommand("copy")
        document.body.removeChild(textarea)
        return copied
    }
}

function attachCopyButtonsToPreBlocks() {
    const container = statementContainerRef.value
    if (!container) {
        return
    }

    const codeBlocks = container.querySelectorAll("pre")
    codeBlocks.forEach((pre) => {
        const preElement = pre as HTMLElement
        if (preElement.dataset.copyEnabled === "true") {
            return
        }

        preElement.dataset.copyEnabled = "true"
        preElement.style.position = "relative"

        const button = document.createElement("button")
        button.type = "button"
        button.textContent = "Copy"
        button.className = "absolute right-2 top-2 rounded-md border border-slate-200 bg-white/90 px-2 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"

        button.addEventListener("click", async () => {
            const codeNode = preElement.querySelector("code")
            const content = (codeNode?.textContent || preElement.textContent || "").trimEnd()
            if (!content) {
                return
            }

            const copied = await copyText(content)
            button.textContent = copied ? "Copied" : "Failed"
            setTimeout(() => {
                button.textContent = "Copy"
            }, 1200)
        })

        preElement.appendChild(button)
    })
}

async function loadProblem() {
    try {
        problem.value = await getExamProblemDetail(contestKey.value, problemCode.value)
        if (!problem.value) {
            error.value = "Không tìm thấy bài tập"
        }
    } catch {
        error.value = "Không tải được nội dung đề bài"
    } finally {
        loading.value = false
    }
}

function goBackList() {
    router.push(`/exam/${contestKey.value}/problems`)
}

function goToSubmit() {
    router.push(`/exam/${contestKey.value}/problems/${problemCode.value}/submit`)
}

watch(statementHtml, async () => {
    await nextTick()
    renderArithmatexInStatement()
    attachCopyButtonsToPreBlocks()
})

onMounted(() => {
    const token = localStorage.getItem("token")
    if (!token) {
        router.push("/")
        return
    }
    if (!problemCode.value) {
        router.push(`/exam/${route.params.key}`)
        return
    }
    loadProblem()
})
</script>
