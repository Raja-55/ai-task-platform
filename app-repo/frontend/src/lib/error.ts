import type { AxiosError } from "axios";

const getErrorField = (data: unknown): string | null => {
  if (!data || typeof data !== "object") return null;
  const rec = data as Record<string, unknown>;
  return typeof rec.error === "string" ? rec.error : null;
};

export const errorMessageFromAxios = (err: AxiosError): string => {
  return getErrorField(err.response?.data) ?? err.message ?? "Request failed";
};
