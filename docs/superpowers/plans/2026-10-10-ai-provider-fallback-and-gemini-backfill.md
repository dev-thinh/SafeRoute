# AI Provider Fallback & Gemini Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI news extraction highly available through Gemini 3.8 -> Groq -> rule-based fallback, while later upgrading fallback-derived articles with Gemini when quota returns.

**Architecture:** Provider retries handle transient failures locally. Circuit breakers open only for quota/rate-limit or permanent provider configuration errors, not ordinary lost connection or 5xx after retries. News articles store extraction metadata so Groq/rule-based results can be reprocessed by Gemini in small cron batches.

**Tech Stack:** Node.js, Express, TypeScript, PostgreSQL JSONB metadata, node-cron, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-06-system-optimization-and-resilience.md`

## Global Constraints

- Work only on branch `dev`; do not commit or push directly to `main` / `master`.
- Preserve existing fallback availability: if Gemini and Groq both fail, rule-based extraction must still return a safe minimal result.
- Follow TDD: write failing tests before production changes.
- Verify with `npm --workspace=server run build` and `npm --workspace=server test`.
- Do not add new runtime dependencies.

---

### Task 1: Provider Failure Policy & Extraction Metadata

**Files:**
- Modify: `server/src/services/geminiExtractor.ts`
- Test: `server/tests/geminiExtractor.test.ts`

**Interfaces:**
- `extractFloodEventsWithGemini(articleText): Promise<ExtractedFloodData>`
- `ExtractedFloodData.extractionProvider?: 'gemini' | 'groq' | 'rule_based'`
- `ExtractedFloodData.extractionModel?: string`
- `ExtractedFloodData.extractionQuality?: 'primary' | 'fallback_ai' | 'rule_based'`
- `ExtractedFloodData.needsGeminiReanalysis?: boolean`
- `isCircuitBreakerOpen(providerName: 'Gemini' | 'Groq'): boolean`
- `getCircuitBreakerCooldownMs(providerName: 'Gemini' | 'Groq'): number`

- [ ] **Step 1: Write failing tests**
  - Add tests asserting rule-based extraction is marked `rule_based` and needs Gemini reanalysis.
  - Add tests asserting a non-quota transient failure does not open Gemini circuit breaker.
  - Add tests asserting a quota-style failure opens Gemini circuit breaker with parsed retry delay.

- [ ] **Step 2: Run targeted tests to verify they fail**
  - Run: `npm --workspace=server test -- tests/geminiExtractor.test.ts`
  - Expected: FAIL because metadata helpers/policy do not exist yet.

- [ ] **Step 3: Implement minimal provider metadata and breaker policy**
  - Add metadata fields to returned extraction results.
  - Only open provider circuit breaker for quota/rate-limit/permanent config errors.
  - Keep transient retry behavior unchanged: two retry attempts with exponential backoff.

- [ ] **Step 4: Run targeted tests to verify pass**
  - Run: `npm --workspace=server test -- tests/geminiExtractor.test.ts`
  - Expected: PASS.

### Task 2: Article Metadata Persistence & Gemini Backfill

**Files:**
- Modify: `server/src/services/newsCrawler.ts`
- Modify: `server/src/db/newsRepo.ts`
- Modify: `server/src/services/cronService.ts`
- Test: `server/tests/newsCrawler.test.ts`

**Interfaces:**
- `ScrapedArticle.extractionProvider?: 'gemini' | 'groq' | 'rule_based'`
- `ScrapedArticle.extractionModel?: string`
- `ScrapedArticle.extractionQuality?: 'primary' | 'fallback_ai' | 'rule_based'`
- `ScrapedArticle.needsGeminiReanalysis?: boolean`
- `ScrapedArticle.geminiReanalysisAttempts?: number`
- `getArticlesNeedingGeminiReanalysis(limit?: number): Promise<ScrapedArticle[]>`
- `reanalyzeFallbackArticlesWithGemini(limit?: number): Promise<{ attempted: number; upgraded: number; skipped: number }>`

- [ ] **Step 1: Write failing tests**
  - Add tests that fallback-derived articles are marked for Gemini reanalysis.
  - Add tests that Gemini-derived articles are not marked.
  - Add tests for selecting reanalysis candidates from article metadata.

- [ ] **Step 2: Run targeted tests to verify they fail**
  - Run: `npm --workspace=server test -- tests/newsCrawler.test.ts`
  - Expected: FAIL because metadata/backfill helpers do not exist yet.

- [ ] **Step 3: Implement minimal persistence and backfill**
  - Persist extraction metadata inside `raw_ai_response`.
  - Read metadata back into `ScrapedArticle`.
  - Add batch reanalysis function that skips when Gemini breaker is open and updates articles on successful Gemini extraction.
  - Schedule a small cron batch every 30 minutes.

- [ ] **Step 4: Run targeted tests to verify pass**
  - Run: `npm --workspace=server test -- tests/newsCrawler.test.ts`
  - Expected: PASS.

### Task 3: Full Verification

**Files:**
- All modified backend files.

- [ ] **Step 1: Run backend build**
  - Run: `npm --workspace=server run build`
  - Expected: PASS.

- [ ] **Step 2: Run backend test suite**
  - Run: `npm --workspace=server test`
  - Expected: PASS.

