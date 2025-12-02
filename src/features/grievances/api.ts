import { desktopApi } from "@/api";
import type { Grievance } from "./types";

export async function fetchGrievances(signal?: AbortSignal) {
  const response = await desktopApi.get<Grievance[]>("/complaints/", {
    signal,
  });
  return response.data;
}
