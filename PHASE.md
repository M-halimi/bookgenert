# BookFlix — Implementation Phases

## Phase 0: Scaffold
- [x] `npx create-next-app@14 bookflix` with TypeScript + App Router
- [x] Install: `tailwindcss @tailwindcss/postcss alpinejs @alpinejs/persist @anthropic-ai/sdk`
- [x] Clean boilerplate (remove default page content, favicon, fonts, page.module.css)

## Phase 1: Core Library
- [x] `lib/utils.ts` — slugify, formatReadTime
- [x] `lib/openlibrary.ts` — searchBooks(), getBookDetails()
- [x] `lib/claude.ts` — generateEpisodes() via Anthropic SDK

## Phase 2: API Route
- [x] `app/api/generate/route.ts` — POST handler, Claude system prompt guardrails, JSON validation

## Phase 3: UI Components
- [x] `components/ui/Navbar.tsx` — Server component, links
- [x] `components/ui/SearchBar.tsx` — Client, Open Library search
- [x] `components/ui/ProgressBar.tsx` — Client, visual 0-6
- [x] `components/library/FilterChips.tsx` — Category filter buttons
- [x] `components/library/BookCard.tsx` — Server, cover/title/category
- [x] `components/reader/EpisodeCard.tsx` — Server, lock/done/current
- [x] `components/reader/ReaderEngine.tsx` — Typing effect + localStorage persist

## Phase 4: Pages & Layout
- [x] `app/layout.tsx` — Root layout, Alpine CDN, Navbar
- [x] `app/globals.css` — Tailwind v4 `@import "tailwindcss"`
- [x] `app/page.tsx` — Home hero + SearchBar
- [x] `app/explore/page.tsx` — Library grid with category filtering
- [x] `app/book/[slug]/page.tsx` — Episode list + ProgressBar + Claude generation trigger
- [x] `app/read/[slug]/[ep]/page.tsx` — Reader page with typing effect

## Phase 5: Config & Polish
- [x] `postcss.config.mjs` — Tailwind v4 PostCSS setup
- [x] `.env.local` — ANTHROPIC_API_KEY placeholder
- [x] Default SVG book cover placeholder
- [x] Loading skeletons on book and reader pages
- [x] Error state with retry button on generation failure

## Build Status
- [x] Production build passes (`npm run build` ✅)
