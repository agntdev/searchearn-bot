// Shared types and helpers for the Search & Earn bot.
// Durable data lives in ctx.session.data (backed by the toolkit's storage).

export interface UserRecord {
  id: number;
  username?: string;
  referral_code: string;
  registration_time: number;
  balance_cents: number;
  search_history: SearchEntry[];
  referral_ids: number[];
  theme: "light" | "dark";
}

export interface ReferralRecord {
  referrer_id: number;
  referred_user_id: number;
  timestamp: number;
  status: "pending" | "credited" | "rejected";
}

export interface SearchEntry {
  query: string;
  timestamp: number;
  result_count: number;
}

export interface WithdrawalRequest {
  id: string;
  user_id: number;
  amount_cents: number;
  method: string;
  details: string;
  status: "pending" | "approved" | "rejected" | "paid";
  created_at: number;
  admin_notes: string;
}

export interface BotData {
  users: Record<number, UserRecord>;
  referrals: Record<number, ReferralRecord>;
  search_entries: SearchEntry[];
  withdrawals: Record<string, WithdrawalRequest>;
}

export function emptyData(): BotData {
  return { users: {}, referrals: {}, search_entries: [], withdrawals: {} };
}

export function generateReferralCode(userId: number): string {
  return `ref_${userId}_${Date.now().toString(36)}`;
}

export function generateWithdrawalId(): string {
  return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function centsToUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function now(): number {
  return Date.now();
}

export function getAdminId(): number | undefined {
  const v = typeof process === "undefined" ? undefined : process.env.ADMIN_CHAT_ID;
  return v ? Number(v) : undefined;
}

// Simple content index for search results.
const CONTENT_INDEX = [
  { id: 1, title: "Getting Started with TypeScript", tags: ["typescript", "programming", "beginner"] },
  { id: 2, title: "Node.js Performance Tips", tags: ["node", "javascript", "performance"] },
  { id: 3, title: "Building Telegram Bots with grammY", tags: ["telegram", "bot", "grammy", "javascript"] },
  { id: 4, title: "Redis for Beginners", tags: ["redis", "database", "caching"] },
  { id: 5, title: "Async JavaScript Patterns", tags: ["javascript", "async", "promises"] },
  { id: 6, title: "Docker Deployment Guide", tags: ["docker", "deployment", "devops"] },
  { id: 7, title: "CSS Grid Layout Tutorial", tags: ["css", "layout", "frontend"] },
  { id: 8, title: "React Hooks Deep Dive", tags: ["react", "hooks", "frontend"] },
  { id: 9, title: "Python Data Analysis with Pandas", tags: ["python", "data", "pandas"] },
  { id: 10, title: "GraphQL API Design", tags: ["graphql", "api", "backend"] },
  { id: 11, title: "Web Security Best Practices", tags: ["security", "web", "best-practices"] },
  { id: 12, title: "Git Branching Strategies", tags: ["git", "branching", "workflow"] },
];

export function searchContent(query: string): Array<{ id: number; title: string }> {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return CONTENT_INDEX.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.tags.some((t) => t.includes(q)),
  ).map(({ id, title }) => ({ id, title }));
}
