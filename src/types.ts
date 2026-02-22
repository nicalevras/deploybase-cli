// ── API Response Envelope ────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T[];
  meta: {
    totalRowCount: number;
    filterRowCount: number;
  };
  prevCursor: number | null;
  nextCursor: number | null;
}

// ── GPU Types ────────────────────────────────────────────────────────

export interface GPU {
  uuid: string;
  provider: string;
  gpu_model?: string;
  gpu_count?: number;
  vram_gb?: number;
  vcpus?: number | string;
  system_ram_gb?: number;
  price_hour_usd?: number;
  price_usd?: number;
  type?: string;
  item?: string;
  sku?: string;
  source_url?: string;
  observed_at?: string;
}

// ── LLM Model Types ─────────────────────────────────────────────────

export interface LLM {
  id: string;
  slug: string;
  provider: string;
  name: string | null;
  shortName: string | null;
  author: string | null;
  description: string | null;
  contextLength: number | null;
  inputModalities: string[];
  outputModalities: string[];
  promptPrice: number | null;
  completionPrice: number | null;
  throughput: number | null;
  maxCompletionTokens: number | null;
  scrapedAt: string;
}

// ── MLops Tool Types ─────────────────────────────────────────────────

export interface Tool {
  id: string;
  name: string | null;
  developer: string | null;
  description: string | null;
  category: string | null;
  price: string | null;
  license: string | null;
  url: string | null;
  stack: string | null;
  oss: string | null;
}
