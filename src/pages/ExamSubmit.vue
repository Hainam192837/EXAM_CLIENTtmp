<template>
    <CommonLayout title="Nạp bài" :showBack="true">
        <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">
            <div class="flex items-center gap-3">
                <span class="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-500"></span>
                Đang tải thông tin bài tập...
            </div>
        </div>

        <div v-else-if="error" class="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-red-600 shadow-sm">
            {{ error }}
        </div>

        <div v-else-if="problem" class="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
            <p class="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-sky-600">Bài {{ problem.code }}</p>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Nạp bài - {{ problem.title }}</h1>

            <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label class="text-sm font-semibold text-slate-800" for="language-select">Ngôn ngữ</label>
                <div ref="languageDropdownRef" class="relative mt-2">
                    <button
                        id="language-select"
                        type="button"
                        class="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white/95 px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        aria-haspopup="listbox"
                        :aria-expanded="isLanguageDropdownOpen"
                        @click="toggleLanguageDropdown"
                    >
                        <span>{{ selectedLanguageLabel }}</span>
                        <svg
                            class="h-4 w-4 text-slate-500 transition duration-200"
                            :class="isLanguageDropdownOpen ? 'rotate-180 text-sky-600' : ''"
                            viewBox="0 0 20 20"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </button>

                    <transition
                        enter-active-class="transition ease-out duration-120"
                        enter-from-class="translate-y-1 opacity-0"
                        enter-to-class="translate-y-0 opacity-100"
                        leave-active-class="transition ease-in duration-100"
                        leave-from-class="translate-y-0 opacity-100"
                        leave-to-class="translate-y-1 opacity-0"
                    >
                        <div
                            v-if="isLanguageDropdownOpen"
                            class="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                            role="listbox"
                            aria-labelledby="language-select"
                        >
                            <button
                                v-for="language in languageOptions"
                                :key="language.value"
                                type="button"
                                class="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium transition"
                                :class="selectedLanguage === language.value
                                    ? 'bg-sky-50 text-sky-700'
                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'"
                                role="option"
                                :aria-selected="selectedLanguage === language.value"
                                @click="selectLanguage(language.value)"
                            >
                                <span>{{ language.label }}</span>
                                <span v-if="selectedLanguage === language.value" class="text-sky-600">✓</span>
                            </button>
                        </div>
                    </transition>
                </div>
                <p class="mt-2 text-xs text-slate-500">Chọn ngôn ngữ phù hợp với mã nguồn bạn sẽ nạp.</p>
            </div>

            <div class="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p class="text-sm font-medium text-sky-800">Chọn file mã nguồn</p>
                <input
                    type="file"
                    accept=".txt,.cpp,.cc,.c,.h,.hpp,.py,.java,.js,.ts,.go,.rs,.cs"
                    class="mt-3 block w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-slate-700"
                    @change="onFileChange"
                />
                <p class="mt-2 text-xs text-slate-600">Nếu upload file, nội dung sẽ tự động ghi đè code hiện tại trong khung soạn thảo.</p>
                <p v-if="selectedFileName" class="mt-2 text-xs font-medium text-sky-700">File đã chọn: {{ selectedFileName }}</p>
            </div>

            <div class="mt-5">
                <p class="mb-2 text-sm font-semibold text-slate-800">Khung soạn thảo bài nạp</p>
                <VueMonacoEditor
                    v-model:value="sourceCode"
                    :language="selectedLanguage"
                    theme="vs-dark"
                    :options="editorOptions"
                    height="420px"
                    class="h-105 overflow-hidden rounded-2xl border border-slate-200"
                />
            </div>

            <div class="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                    @click="handleSubmit"
                    :disabled="isSubmitDisabled"
                    class="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold text-white transition focus:outline-none focus:ring-4"
                    :class="isSubmitDisabled
                        ? 'cursor-not-allowed bg-slate-300 focus:ring-slate-200'
                        : 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-200'"
                >
                    {{ submitButtonLabel }}
                </button>

                <button
                    @click="goBackDetail"
                    class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                >
                    Quay lại chi tiết bài
                </button>
            </div>

            <p v-if="submitMessage" class="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                {{ submitMessage }}
            </p>

            <p v-if="submitError" class="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
                {{ submitError }}
            </p>
        </div>
    </CommonLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { VueMonacoEditor } from "@guolao/vue-monaco-editor"
import CommonLayout from "../components/layout/CommonLayout.vue"
import {
    getExamProblemDetail,
    getSubmissionSource,
    getSubmitCooldownRemainingMs,
    getSubmittedSourceCode,
    submitExamProblem
} from "../services/api"
import type { ExamProblem } from "../types/problem"

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref("")
const isSubmitting = ref(false)
const submitMessage = ref("")
const submitError = ref("")
const sourceCode = ref("")
const selectedFileName = ref("")
const selectedLanguage = ref("cpp")
const isLanguageDropdownOpen = ref(false)
const languageDropdownRef = ref<HTMLElement | null>(null)
const problem = ref<ExamProblem | null>(null)
const cooldownRemainingMs = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const languageOptions = [
    { label: "C++", value: "cpp" },
    { label: "C", value: "c" },
    { label: "Python", value: "python" },
    { label: "Java", value: "java" },
    { label: "JavaScript", value: "javascript" },
    { label: "TypeScript", value: "typescript" },
    { label: "Go", value: "go" },
    { label: "Rust", value: "rust" },
    { label: "C#", value: "csharp" },
    { label: "Text", value: "plaintext" }
]

const DEFAULT_TAB_SIZE = 4
const DEFAULT_INSERT_SPACES = true

const editorOptions = {
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbersMinChars: 3,
    roundedSelection: false,
    scrollBeyondLastLine: false,
    detectIndentation: false,
    insertSpaces: DEFAULT_INSERT_SPACES,
    tabSize: DEFAULT_TAB_SIZE,
    wordWrap: "on"
}

const contestKey = computed(() => String(route.params.key || ""))
const problemCode = computed(() => String(route.params.problem || ""))
const selectedLanguageLabel = computed(() => {
    return languageOptions.find((language) => language.value === selectedLanguage.value)?.label || "Chọn ngôn ngữ"
})
const cooldownSeconds = computed(() => Math.ceil(cooldownRemainingMs.value / 1000))
const isCooldownActive = computed(() => cooldownRemainingMs.value > 0)
const isSubmitDisabled = computed(() => isSubmitting.value || !sourceCode.value.trim() || isCooldownActive.value)
const submitButtonLabel = computed(() => {
    if (isSubmitting.value) {
        return "Đang nạp..."
    }
    if (isCooldownActive.value) {
        return `Chờ ${cooldownSeconds.value}s`
    }
    return "Nạp bài"
})

function refreshCooldownState() {
    if (!contestKey.value || !problemCode.value) {
        cooldownRemainingMs.value = 0
        return
    }
    cooldownRemainingMs.value = getSubmitCooldownRemainingMs(contestKey.value, problemCode.value)
}

function toggleLanguageDropdown() {
    isLanguageDropdownOpen.value = !isLanguageDropdownOpen.value
}

function selectLanguage(value: string) {
    selectedLanguage.value = value
    isLanguageDropdownOpen.value = false
}

function handleDocumentClick(event: MouseEvent) {
    const target = event.target as Node | null
    if (!target || !languageDropdownRef.value) {
        return
    }

    if (!languageDropdownRef.value.contains(target)) {
        isLanguageDropdownOpen.value = false
    }
}

async function loadProblem() {
    try {
        problem.value = await getExamProblemDetail(contestKey.value, problemCode.value)
        if (!problem.value) {
            error.value = "Không tìm thấy bài tập"
            return
        }

        // Show local cached source immediately while waiting for server sync.
        sourceCode.value = getSubmittedSourceCode(contestKey.value, problemCode.value)

        try {
            const submissionSource = await getSubmissionSource(contestKey.value, problemCode.value)
            if (submissionSource) {
                sourceCode.value = submissionSource.source
                selectedLanguage.value = inferLanguageFromBackendKey(submissionSource.language_key)
            }
        } catch {
            // Do not block submit page when source sync API is unavailable.
            submitError.value = "Không đồng bộ được source cũ từ server. Bạn vẫn có thể tiếp tục nạp bài."
        }
    } catch {
        error.value = "Không tải được dữ liệu bài tập"
    } finally {
        loading.value = false
    }
}

async function onFileChange(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) {
        return
    }

    selectedFileName.value = file.name
    const content = await file.text()
    sourceCode.value = content
    selectedLanguage.value = inferLanguageFromFilename(file.name)
}

async function handleSubmit() {
    if (!sourceCode.value.trim() || !problem.value) {
        return
    }

    refreshCooldownState()
    if (isCooldownActive.value) {
        submitError.value = `Mỗi bài tập chỉ được nạp lại sau 10 giây. Vui lòng chờ ${cooldownSeconds.value}s.`
        return
    }

    const languageKey = toLanguageKey(selectedLanguage.value)
    if (!languageKey) {
        submitError.value = "Ngôn ngữ hiện tại chưa hỗ trợ submit. Vui lòng chọn ngôn ngữ khác."
        return
    }

    isSubmitting.value = true
    submitMessage.value = ""
    submitError.value = ""
    try {
        await submitExamProblem(contestKey.value, problemCode.value, sourceCode.value, languageKey)
        submitMessage.value = `Nạp bài thành công với ngôn ngữ ${selectedLanguageLabel.value}.`
        refreshCooldownState()
    } catch (submitException) {
        submitError.value = submitException instanceof Error
            ? submitException.message
            : "Không thể nạp bài. Vui lòng thử lại."
        refreshCooldownState()
    } finally {
        isSubmitting.value = false
    }
}

function toLanguageKey(language: string): string {
    const keyMap: Record<string, string> = {
        cpp: "CPP17",
        c: "C",
        python: "PY3",
        java: "JAVA",
        javascript: "JS",
        typescript: "TS",
        go: "GO",
        rust: "RUST",
        csharp: "CS",
        plaintext: ""
    }

    return keyMap[language] || ""
}

function inferLanguageFromBackendKey(languageKey: string): string {
    const normalized = languageKey.toUpperCase()
    const map: Record<string, string> = {
        CPP17: "cpp",
        CPP20: "cpp",
        CPP14: "cpp",
        C: "c",
        PY3: "python",
        PYTHON3: "python",
        JAVA: "java",
        JS: "javascript",
        JAVASCRIPT: "javascript",
        TS: "typescript",
        TYPESCRIPT: "typescript",
        GO: "go",
        GOLANG: "go",
        RUST: "rust",
        RS: "rust",
        CS: "csharp",
        CSHARP: "csharp"
    }

    return map[normalized] || "plaintext"
}

function inferLanguageFromFilename(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() || ""
    const map: Record<string, string> = {
        c: "c",
        cc: "cpp",
        cpp: "cpp",
        cxx: "cpp",
        h: "c",
        hpp: "cpp",
        py: "python",
        java: "java",
        js: "javascript",
        ts: "typescript",
        go: "go",
        rs: "rust",
        cs: "csharp",
        txt: "plaintext"
    }
    return map[ext] || "plaintext"
}

function goBackDetail() {
    router.push(`/exam/${contestKey.value}/problems/${problemCode.value}`)
}

onMounted(() => {
    const token = localStorage.getItem("token")
    if (!token) {
        router.push("/")
        return
    }

    if (!contestKey.value || !problemCode.value) {
        router.push("/exams")
        return
    }

    loadProblem()
    refreshCooldownState()
    cooldownTimer = setInterval(() => {
        refreshCooldownState()
    }, 250)
    document.addEventListener("click", handleDocumentClick)
})

onUnmounted(() => {
    if (cooldownTimer) {
        clearInterval(cooldownTimer)
    }
    document.removeEventListener("click", handleDocumentClick)
})
</script>
