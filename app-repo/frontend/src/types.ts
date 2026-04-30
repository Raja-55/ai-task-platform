export type TaskStatus = "pending" | "running" | "success" | "failed";
export type Operation = "uppercase" | "lowercase" | "reverse" | "word_count";

export type TaskListItem = {
  id: string;
  title: string;
  operation: Operation;
  status: TaskStatus;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type TaskDetail = {
  id: string;
  title: string;
  inputText: string;
  operation: Operation;
  status: TaskStatus;
  result: unknown;
  logs: Array<{ ts: string; level: "info" | "error"; message: string }>;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};
