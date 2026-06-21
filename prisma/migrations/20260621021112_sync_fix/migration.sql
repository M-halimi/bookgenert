-- DropIndex
DROP INDEX "analytics_events_created_at_idx";

-- DropIndex
DROP INDEX "analytics_events_event_type_idx";

-- DropIndex
DROP INDEX "api_cache_cache_key_idx";

-- DropIndex
DROP INDEX "book_cache_cache_key_idx";

-- DropIndex
DROP INDEX "book_chapters_book_id_idx";

-- DropIndex
DROP INDEX "book_generation_jobs_created_at_idx";

-- DropIndex
DROP INDEX "book_generation_jobs_status_idx";

-- DropIndex
DROP INDEX "book_mood_mood_id_idx";

-- DropIndex
DROP INDEX "book_mood_score_idx";

-- DropIndex
DROP INDEX "user_books_user_id_idx";

-- DropIndex
DROP INDEX "user_library_user_id_idx";

-- CreateIndex
CREATE INDEX "analytics_events_event_type_created_at_idx" ON "analytics_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "book_generation_jobs_status_created_at_idx" ON "book_generation_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "book_mood_mood_id_score_idx" ON "book_mood"("mood_id", "score");

-- CreateIndex
CREATE INDEX "books_mood_analyzed_description_idx" ON "books"("mood_analyzed", "description");
