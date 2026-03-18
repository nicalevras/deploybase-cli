import { createRequire } from "node:module";
import { ofetch } from "ofetch";
import type { ApiResponse, FacetRow, GPU, LLM } from "./types.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const DEFAULT_BASE_URL = process.env.DEPLOYBASE_API_URL;
const USER_AGENT = `deploybase-cli/${pkg.version}`;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_PAGES = 100;

/** Override with --base-url flag */
export function getBaseUrl(override?: string): string {
  return override || DEFAULT_BASE_URL;
}

let _baseUrl = DEFAULT_BASE_URL;

export function setBaseUrl(url: string) {
  _baseUrl = url;
}

function buildQuery(params: Record<string, unknown>): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query[key] = String(value);
  }
  return query;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function wrapNetworkError(error: unknown): Error {
  const msg = error instanceof Error ? error.message : String(error);
  const status = (error as { status?: number })?.status;

  if (status === 429) return new Error("Rate limited by the API. Please wait and try again.");
  if (status && status >= 500) return new Error("The Deploybase API is temporarily unavailable. Try again shortly.");
  if (status === 404) return new Error("API endpoint not found. You may need to update deploybase.");
  if (msg.includes("ENOTFOUND") || msg.includes("EAI_AGAIN"))
    return new Error("Could not reach the Deploybase API. Check your internet connection.");
  if (msg.includes("ECONNREFUSED"))
    return new Error("Connection refused by the Deploybase API. The service may be down.");
  if (msg.includes("ETIMEDOUT") || msg.includes("timeout") || msg.includes("AbortError"))
    return new Error("Request timed out. Check your connection or try again.");
  return new Error(msg);
}

async function apiFetch<T>(endpoint: string, query: Record<string, string>): Promise<ApiResponse<T>> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await ofetch<ApiResponse<T>>(endpoint, {
        baseURL: _baseUrl,
        query,
        headers: { "User-Agent": USER_AGENT },
        retry: 0,
        timeout: REQUEST_TIMEOUT_MS,
      });
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;

      // Retry on 429 (rate limit) or 5xx
      if (status === 429 || (status && status >= 500)) {
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
      }
      throw wrapNetworkError(error);
    }
  }

  // Unreachable — loop always returns or throws — but satisfies TypeScript
  throw new Error("Unexpected: all retries exhausted");
}

async function fetchAllPages<T>(
  endpoint: string,
  params: Record<string, unknown>,
): Promise<{ data: T[]; total: number; filtered: number; facets: Record<string, { rows: FacetRow[] }> }> {
  const all: T[] = [];
  let cursor: number | undefined;
  let total = 0;
  let filtered = 0;
  let facets: Record<string, { rows: FacetRow[] }> = {};
  let pages = 0;

  while (pages < MAX_PAGES) {
    const query = buildQuery({
      ...params,
      ...(cursor !== undefined && { cursor }),
      size: params.size ?? 50,
    });
    const res = await apiFetch<T>(endpoint, query);

    all.push(...res.data);
    total = res.meta.totalRowCount;
    filtered = res.meta.filterRowCount;
    if (pages === 0 && res.meta.facets) facets = res.meta.facets;
    pages++;

    if (res.nextCursor === null) break;
    cursor = res.nextCursor;
  }

  return { data: all, total, filtered, facets };
}

// ── GPU ──────────────────────────────────────────────────────────────

export interface GPUParams {
  provider?: string;
  gpu_model?: string;
  type?: string;
  sort?: string;
  search?: string;
}

export async function fetchGPUs(params: GPUParams) {
  return fetchAllPages<GPU>("/api", params as Record<string, unknown>);
}

// ── LLM Models ───────────────────────────────────────────────────────

export interface LLMParams {
  provider?: string;
  author?: string;
  modalities?: string;
  modalityDirections?: string;
  sort?: string;
  search?: string;
}

export async function fetchModels(params: LLMParams) {
  return fetchAllPages<LLM>("/api/models", params as Record<string, unknown>);
}

/** Fetch facet values with a minimal request */
export async function fetchLlmFacets(): Promise<{ providers: string[]; authors: string[] }> {
  const query = buildQuery({ size: "1" });
  const res = await apiFetch<LLM>("/api/models", query);
  const facets = res.meta.facets || {};
  return {
    providers: (facets.provider?.rows || []).map((r) => r.value),
    authors: (facets.author?.rows || []).map((r) => r.value),
  };
}

export async function fetchGpuFacets(): Promise<{ providers: string[]; gpuModels: string[] }> {
  const query = buildQuery({ size: "1" });
  const res = await apiFetch<GPU>("/api", query);
  const facets = res.meta.facets || {};
  return {
    providers: (facets.provider?.rows || []).map((r) => r.value),
    gpuModels: (facets.gpu_model?.rows || []).map((r) => r.value),
  };
}

