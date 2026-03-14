export interface ExamProblem {
  code: string
  title: string
  order: number
  points: number
  time_limit: number
  memory_limit: number
  status?: "submitted" | "pending"
  statement?: string
  allowed_languages?: string[]
  io_method?: {
    method: "standard" | "file" | "unknown"
    input?: string
    output?: string
  }
}
