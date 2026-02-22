import { ofetch } from "ofetch";
import type { ApiResponse, GPU, LLM, Tool } from "./types.js";

const DEFAULT_BASE_URL = "https://deploybase.ai";
const USER_AGENT = "deploybase-cli/0.1.0";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/** Override with DEPLOYBASE_API_URL env var or --base-url flag */
export function getBaseUrl(override?: string): string {
  return override || process.env.DEPLOYBASE_API_URL || DEFAULT_BASE_URL;
}

let _baseUrl = DEFAULT_BASE_URL;

export function setBaseUrl(url: string) {
  _baseUrl = url;
}

function buildQuery(params: Record<string, unknown>): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "all") continue;
    query[key] = String(value);
  }
  return query;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiFetch<T>(endpoint: string, query: Record<string, string>): Promise<ApiResponse<T>> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await ofetch<ApiResponse<T>>(endpoint, {
        baseURL: _baseUrl,
        query,
        headers: { "User-Agent": USER_AGENT },
        retry: 0, // we handle retries ourselves
      });
    } catch (error: unknown) {
      lastError = error;
      const status = (error as { status?: number })?.status;

      // Retry on 429 (rate limit) or 5xx
      if (status === 429 || (status && status >= 500)) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
      }
      throw error;
    }
  }

  throw lastError;
}

async function fetchAllPages<T>(
  endpoint: string,
  params: Record<string, unknown>,
): Promise<{ data: T[]; total: number; filtered: number }> {
  const all: T[] = [];
  let cursor: number | null = 0;
  let total = 0;
  let filtered = 0;

  while (cursor !== null) {
    const query = buildQuery({ ...params, cursor, size: params.size ?? 50 });
    const res = await apiFetch<T>(endpoint, query);

    all.push(...res.data);
    total = res.meta.totalRowCount;
    filtered = res.meta.filterRowCount;
    cursor = res.nextCursor;
  }

  return { data: all, total, filtered };
}

async function fetchPage<T>(
  endpoint: string,
  params: Record<string, unknown>,
): Promise<{ data: T[]; total: number; filtered: number; nextCursor: number | null }> {
  const query = buildQuery(params);
  const res = await apiFetch<T>(endpoint, query);

  return {
    data: res.data,
    total: res.meta.totalRowCount,
    filtered: res.meta.filterRowCount,
    nextCursor: res.nextCursor,
  };
}

// ── GPU ──────────────────────────────────────────────────────────────

export interface GPUParams {
  provider?: string;
  gpu_model?: string;
  type?: string;
  vram_gb?: string;
  price_hour_usd?: string;
  sort?: string;
  search?: string;
  size?: number;
  cursor?: number;
  all?: boolean;
}

export async function fetchGPUs(params: GPUParams) {
  const endpoint = "/api";
  const p = params as Record<string, unknown>;
  if (params.all) {
    return fetchAllPages<GPU>(endpoint, p);
  }
  return fetchPage<GPU>(endpoint, p);
}

// ── LLM Models ───────────────────────────────────────────────────────

export interface LLMParams {
  provider?: string;
  author?: string;
  modalities?: string;
  contextLength?: string;
  inputPrice?: string;
  outputPrice?: string;
  sort?: string;
  search?: string;
  size?: number;
  cursor?: number;
  all?: boolean;
}

export async function fetchModels(params: LLMParams) {
  const endpoint = "/api/models";
  const p = params as Record<string, unknown>;
  if (params.all) {
    return fetchAllPages<LLM>(endpoint, p);
  }
  return fetchPage<LLM>(endpoint, p);
}

// ── MLops Tools ──────────────────────────────────────────────────────

export interface ToolParams {
  developer?: string;
  category?: string;
  stack?: string;
  oss?: string;
  sort?: string;
  search?: string;
  size?: number;
  cursor?: number;
  all?: boolean;
}

export async function fetchTools(params: ToolParams) {
  const endpoint = "/api/tools";
  const p = params as Record<string, unknown>;
  if (params.all) {
    return fetchAllPages<Tool>(endpoint, p);
  }
  return fetchPage<Tool>(endpoint, p);
}
