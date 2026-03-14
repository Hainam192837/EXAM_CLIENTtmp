export interface ContestListItem {
  pk: number
  key: string
  name: string
  topic: string
  start_time: string
  end_time: string
}

export interface ContestDetail extends ContestListItem {
  description: string
  user_count: number
}

export type Contest = ContestListItem & Partial<Pick<ContestDetail, "description" | "user_count">>

export function formatContestTitle(contest: Pick<Contest, "name" | "topic">): string {
  return `${contest.name} - ${contest.topic}`
}