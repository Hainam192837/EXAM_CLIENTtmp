import { createRouter, createWebHashHistory } from "vue-router"

import { isAuthenticated } from "../services/auth"
import { getActiveExamSessionViaApi } from "../services/examSession"

const routes = [
  { path:"/", component:() => import("../pages/Login.vue"), meta: { guestOnly: true } },
  { path:"/exams", component:() => import("../pages/Exams.vue"), meta: { requiresAuth: true } },
  { path:"/exam/:key", component:() => import("../pages/Exam.vue"), meta: { requiresAuth: true } },
  { path:"/exam/:key/problems", component:() => import("../pages/ExamProblemList.vue"), meta: { requiresAuth: true } },
  { path:"/exam/:key/problems/:problem", component:() => import("../pages/ExamProblem.vue"), meta: { requiresAuth: true } },
  { path:"/exam/:key/problems/:problem/submit", component:() => import("../pages/ExamSubmit.vue"), meta: { requiresAuth: true } },
  { path:"/exam/:key/join", component:() => import("../pages/ExamJoin.vue"), meta: { requiresAuth: true } }
]

const router = createRouter({
  history:createWebHashHistory(),
  routes
})

router.beforeEach(async (to) => {
  const authed = await isAuthenticated()

  if (to.meta.requiresAuth && !authed) {
    return "/"
  }

  if (to.meta.guestOnly && authed) {
    return "/exams"
  }

  if (!authed) {
    return true
  }

  const targetContestKey = typeof to.params.key === "string" ? to.params.key : ""
  if (!targetContestKey) {
    return true
  }

  const activeSession = await getActiveExamSessionViaApi()
  const isExamRoute = Boolean(targetContestKey)
  const isAllowedRouteWhenLocked = to.path === "/exams" || to.path === "/"

  if (
    activeSession
    && isExamRoute
    && activeSession.contestKey !== targetContestKey
    && !isAllowedRouteWhenLocked
  ) {
    return `/exam/${activeSession.contestKey}/problems`
  }

  return true
})

export default router