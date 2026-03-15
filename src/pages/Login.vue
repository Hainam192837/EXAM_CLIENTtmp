<template>
    <div
        class="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
        <div class="pointer-events-none absolute inset-0 -z-10">
            <div class="absolute -left-24 top-16 h-64 w-64 rounded-full bg-cyan-300/30 blur-3xl"></div>
            <div class="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl"></div>
        </div>

        <div class="mx-auto flex min-h-[80vh] w-full max-w-5xl items-center justify-center">
            <form @submit.prevent="login"
                class="w-full max-w-md rounded-3xl border border-white/60 bg-white/90 p-7 shadow-2xl backdrop-blur sm:p-8">
                <div class="mb-6 text-center">
                    <p class="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-sky-600">Exam Client</p>
                    <h2 class="text-3xl font-bold text-slate-900">Đăng nhập</h2>
                    <p class="mt-2 text-sm text-slate-500">Nhập tài khoản để bắt đầu làm bài thi.</p>
                </div>

                <div class="space-y-4">
                    <label class="block">
                        <span class="mb-1.5 block text-sm font-medium text-slate-700">Tên đăng nhập</span>
                        <input v-model="username" :disabled="isLoggingIn" placeholder="Nhập tên đăng nhập"
                            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
                    </label>

                    <label class="block">
                        <span class="mb-1.5 block text-sm font-medium text-slate-700">Mật khẩu</span>
                        <input v-model="password" :disabled="isLoggingIn" type="password" placeholder="Nhập mật khẩu"
                            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
                    </label>
                </div>

                <button type="submit" :disabled="isLoggingIn"
                    class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white transition focus:outline-none focus:ring-4"
                    :class="isLoggingIn
                        ? 'cursor-not-allowed bg-sky-300 focus:ring-sky-100'
                        : 'bg-sky-600 hover:-translate-y-0.5 hover:bg-sky-700 focus:ring-sky-200'">
                    <span v-if="isLoggingIn" class="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
                    {{ isLoggingIn ? "Đang xác thực..." : "Đăng nhập" }}
                </button>

                <p v-if="error" class="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {{ error }}
                </p>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">

import { ref } from "vue"
import { useRouter } from "vue-router"
import { setAuthSession } from "../services/auth"
import { getActiveExamSessionViaApi } from "../services/examSession"

const router = useRouter()

const username = ref("")
const password = ref("")
const error = ref("")
const isLoggingIn = ref(false)
const AUTH_API = "http://171.244.63.31:8443/api/auth/login/"

type LoginApiResponse = {
    ok: boolean
    status: number
    data?: {
        access_token?: string
    }
}

async function loginByElectronIpc(): Promise<LoginApiResponse> {
    if (!window.electronAPI) {
        throw new Error("Electron API bridge is unavailable")
    }

    const response = await window.electronAPI.request({
        url: AUTH_API,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Exam-App": "exam-client"
        },
        body: {
            username: username.value,
            password: password.value
        }
    })

    return {
        ok: response.ok,
        status: response.status,
        data: response.data as { access_token?: string } | undefined
    }
}

async function loginByFetch(): Promise<LoginApiResponse> {
    const res = await fetch(AUTH_API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Exam-App": "exam-client"
        },
        body: JSON.stringify({
            username: username.value,
            password: password.value
        })
    })

    const data = await res.json()
    return {
        ok: res.ok,
        status: res.status,
        data
    }
}

async function login() {
    if (isLoggingIn.value) {
        return
    }

    error.value = ""
    isLoggingIn.value = true
    try {
        const response = window.electronAPI
            ? await loginByElectronIpc()
            : await loginByFetch()

        const accessToken = response.data?.access_token
        if (accessToken) {
            const sessionAccepted = await setAuthSession(accessToken)
            if (!sessionAccepted) {
                error.value = "Access token khong hop le hoac JWT_SECRET_KEY chua duoc cau hinh"
                return
            }

            const activeSession = await getActiveExamSessionViaApi({ forceRefresh: true })
            if (activeSession) {
                await router.push(`/exam/${activeSession.contestKey}/problems`)
                return
            }

            await router.push("/exams")
        } else {
            error.value = "Sai tài khoản hoặc mật khẩu"
        }
    } catch {
        error.value = "Không kết nối được server"
    } finally {
        isLoggingIn.value = false
    }
}

</script>