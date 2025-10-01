export type MarkdownContent = {
  date: string;
  total_tasks: number;
  estimated_time: string;
  high_priority_task_count: number;
  schedule: Schedule[];
};

export interface Schedule {
  startTime: string;
  endTime: string;
  title: string;
  activity: string;
  type: "event" | "task";
  priority?: "high" | "medium" | "low";
}
