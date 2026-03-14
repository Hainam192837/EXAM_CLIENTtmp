<template>
	<CommonLayout title="Danh sách bài tập" :showBack="true">
		<div class="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p class="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-sky-600">Bài tập kỳ thi</p>
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{{ contestName }}</h1>
					<p class="mt-2 text-sm text-slate-600">Theo dõi trạng thái nộp bài và mở từng đề để đọc chi tiết.</p>
				</div>

				<button
					@click="goToExams"
					class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
				>
					Quay lại danh sách kỳ thi
				</button>
			</div>

			<div class="mt-6 grid gap-3 sm:grid-cols-4">
				<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
					<p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Tổng bài</p>
					<p class="mt-1 text-2xl font-bold text-slate-900">{{ problems.length }}</p>
				</div>
				<div class="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
					<p class="text-xs font-semibold uppercase tracking-widest text-indigo-700">Tổng điểm</p>
					<p class="mt-1 text-2xl font-bold text-indigo-700">{{ totalPoints }}</p>
				</div>
				<div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
					<p class="text-xs font-semibold uppercase tracking-widest text-emerald-700">Đã nộp</p>
					<p class="mt-1 text-2xl font-bold text-emerald-700">{{ submittedCount }}</p>
				</div>
				<div class="rounded-2xl border border-amber-100 bg-amber-50 p-4">
					<p class="text-xs font-semibold uppercase tracking-widest text-amber-700">Chưa nộp</p>
					<p class="mt-1 text-2xl font-bold text-amber-700">{{ pendingCount }}</p>
				</div>
			</div>
		</div>

		<div v-if="loading" class="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">
			<div class="flex items-center gap-3">
				<span class="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-sky-200 border-t-sky-500"></span>
				Đang tải danh sách bài tập...
			</div>
		</div>

		<div v-else-if="error" class="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-red-600 shadow-sm">
			{{ error }}
		</div>

		<div v-else-if="problems.length === 0"
			class="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-600 shadow-sm">
			Kỳ thi này chưa có bài tập.
		</div>

		<div v-else class="mt-6 space-y-3">
			<div v-for="problem in problems" :key="problem.code"
				class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-5">
				<div>
					<p class="text-sm font-semibold uppercase tracking-wide text-sky-600">Bài {{ problem.code }}</p>
					<div class="mt-1 flex flex-wrap items-center gap-2">
						<h2 class="text-lg font-semibold text-slate-900">{{ problem.title }}</h2>
						<span class="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
							{{ displayPoints(problem.points) }} điểm
						</span>
					</div>
				</div>

				<div class="flex items-center gap-3">
					<span class="rounded-full px-3 py-1 text-sm font-medium" :class="problem.status === 'submitted'
						? 'bg-emerald-50 text-emerald-700'
						: 'bg-amber-50 text-amber-700'">
						{{ problem.status === "submitted" ? "Da nop" : "Chua nop" }}
					</span>
					<button @click="openProblem(problem.code)"
						class="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 font-semibold text-sky-700 transition hover:bg-sky-100 focus:outline-none focus:ring-4 focus:ring-sky-100">
						Xem đề
					</button>
					<button v-if="problem.status === 'submitted'" @click="editSubmitted(problem.code)"
						class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus:ring-4 focus:ring-emerald-100">
						Chinh sua bai nop
					</button>
				</div>
			</div>
		</div>
	</CommonLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import CommonLayout from "../components/layout/CommonLayout.vue"
import { getContestDetail, getExamProblems } from "../services/api"
import { formatContestTitle, type Contest } from "../types/contest"
import type { ExamProblem } from "../types/problem"

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref("")
const problems = ref<ExamProblem[]>([])
const contest = ref<Contest | null>(null)

const contestKey = computed(() => String(route.params.key || ""))
const contestName = computed(() => {
	if (contest.value) {
		return formatContestTitle(contest.value)
	}
	return `Kỳ thi ${contestKey.value}`
})
const submittedCount = computed(() => problems.value.filter((problem) => problem.status === "submitted").length)
const pendingCount = computed(() => problems.value.length - submittedCount.value)
const totalPoints = computed(() => problems.value.reduce((sum, problem) => sum + displayPoints(problem.points), 0))

function displayPoints(points: number | undefined): number {
	return typeof points === "number" && Number.isFinite(points) ? points : 0
}

async function loadProblems() {
	try {
		problems.value = await getExamProblems(contestKey.value)

		try {
			contest.value = await getContestDetail(contestKey.value)
		} catch {
			contest.value = null
		}
	} catch {
		error.value = "Khong tai duoc danh sach bai tap"
	} finally {
		loading.value = false
	}
}

function openProblem(code: string) {
	router.push(`/exam/${contestKey.value}/problems/${code}`)
}

function editSubmitted(code: string) {
	router.push(`/exam/${contestKey.value}/problems/${code}/submit`)
}

function goToExams() {
	router.push("/exams")
}

onMounted(() => {
	const token = localStorage.getItem("token")
	if (!token) {
		router.push("/")
		return
	}
	loadProblems()
})
</script>
