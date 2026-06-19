-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authors" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "summary" TEXT,
    "tagline" TEXT,
    "cover_image" TEXT,
    "cover_prompt" TEXT,
    "category" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "page_count" INTEGER,
    "publish_year" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "external_id" VARCHAR(255),
    "episodes" JSONB,
    "mood_analyzed" BOOLEAN NOT NULL DEFAULT false,
    "final_summary" TEXT,
    "main_concepts" JSONB,
    "key_lessons" JSONB,
    "key_insights" JSONB,
    "implementation_guide" TEXT,
    "generation_time_ms" INTEGER,
    "ai_model_used" TEXT,
    "cache_hit" BOOLEAN NOT NULL DEFAULT false,
    "generation_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "author_id" UUID,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_chapters" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "title" JSONB NOT NULL,
    "content" JSONB NOT NULL,
    "hook" JSONB,
    "keyTakeaway" JSONB,
    "key_ideas" JSONB,
    "actionable_tips" JSONB,
    "important_quotes" JSONB,
    "practical_examples" JSONB,
    "cliffhanger" JSONB,
    "word_count" INTEGER,
    "summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_summaries" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "short_summary" JSONB,
    "detailed_summary" JSONB,
    "main_concepts" JSONB,
    "key_lessons" JSONB,
    "important_insights" JSONB,
    "implementation_guide" JSONB,
    "action_plan" JSONB,
    "key_takeaways" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_embeddings" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "title_fingerprint" TEXT NOT NULL,
    "keyword_fingerprint" TEXT,
    "search_vector" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_cache" (
    "id" UUID NOT NULL,
    "cache_key" VARCHAR(500) NOT NULL,
    "title" TEXT NOT NULL,
    "book_id" UUID,
    "data" JSONB NOT NULL,
    "content_type" VARCHAR(50) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "token_count" INTEGER,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_generation_jobs" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 10,
    "error_message" TEXT,
    "result_id" UUID,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "estimated_completion_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_writing_drafts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID,
    "topic" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "style" TEXT,
    "audience" TEXT,
    "length" TEXT,
    "content" JSONB,
    "outline" JSONB,
    "table_of_contents" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_writing_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "book_id" UUID,
    "user_id" UUID,
    "category" TEXT,
    "metadata" JSONB,
    "value" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_library" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_library_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moods" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "keywords" JSONB NOT NULL,
    "related_moods" JSONB NOT NULL,
    "ai_rules" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_mood" (
    "book_id" UUID NOT NULL,
    "mood_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_mood_pkey" PRIMARY KEY ("book_id","mood_id")
);

-- CreateTable
CREATE TABLE "user_books" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "is_saved" BOOLEAN NOT NULL DEFAULT false,
    "is_liked" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_cache" (
    "id" UUID NOT NULL,
    "cache_key" VARCHAR(255) NOT NULL,
    "data" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "authors_name_key" ON "authors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "books_slug_key" ON "books"("slug");

-- CreateIndex
CREATE INDEX "books_title_idx" ON "books"("title");

-- CreateIndex
CREATE INDEX "books_category_idx" ON "books"("category");

-- CreateIndex
CREATE INDEX "books_source_idx" ON "books"("source");

-- CreateIndex
CREATE INDEX "books_author_id_idx" ON "books"("author_id");

-- CreateIndex
CREATE INDEX "books_created_at_idx" ON "books"("created_at");

-- CreateIndex
CREATE INDEX "books_generation_status_idx" ON "books"("generation_status");

-- CreateIndex
CREATE INDEX "book_chapters_book_id_idx" ON "book_chapters"("book_id");

-- CreateIndex
CREATE INDEX "book_chapters_chapter_number_idx" ON "book_chapters"("chapter_number");

-- CreateIndex
CREATE UNIQUE INDEX "book_chapters_book_id_chapter_number_key" ON "book_chapters"("book_id", "chapter_number");

-- CreateIndex
CREATE UNIQUE INDEX "book_summaries_book_id_key" ON "book_summaries"("book_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_embeddings_book_id_key" ON "book_embeddings"("book_id");

-- CreateIndex
CREATE INDEX "book_embeddings_title_fingerprint_idx" ON "book_embeddings"("title_fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "book_cache_cache_key_key" ON "book_cache"("cache_key");

-- CreateIndex
CREATE INDEX "book_cache_expires_at_idx" ON "book_cache"("expires_at");

-- CreateIndex
CREATE INDEX "book_cache_cache_key_idx" ON "book_cache"("cache_key");

-- CreateIndex
CREATE INDEX "book_cache_content_type_idx" ON "book_cache"("content_type");

-- CreateIndex
CREATE INDEX "book_cache_title_idx" ON "book_cache"("title");

-- CreateIndex
CREATE INDEX "book_generation_jobs_status_idx" ON "book_generation_jobs"("status");

-- CreateIndex
CREATE INDEX "book_generation_jobs_created_at_idx" ON "book_generation_jobs"("created_at");

-- CreateIndex
CREATE INDEX "book_generation_jobs_title_idx" ON "book_generation_jobs"("title");

-- CreateIndex
CREATE INDEX "user_writing_drafts_user_id_idx" ON "user_writing_drafts"("user_id");

-- CreateIndex
CREATE INDEX "user_writing_drafts_status_idx" ON "user_writing_drafts"("status");

-- CreateIndex
CREATE INDEX "analytics_events_event_type_idx" ON "analytics_events"("event_type");

-- CreateIndex
CREATE INDEX "analytics_events_book_id_idx" ON "analytics_events"("book_id");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_idx" ON "analytics_events"("user_id");

-- CreateIndex
CREATE INDEX "analytics_events_category_idx" ON "analytics_events"("category");

-- CreateIndex
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events"("created_at");

-- CreateIndex
CREATE INDEX "user_library_user_id_idx" ON "user_library"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_library_user_id_book_id_key" ON "user_library"("user_id", "book_id");

-- CreateIndex
CREATE INDEX "book_mood_mood_id_idx" ON "book_mood"("mood_id");

-- CreateIndex
CREATE INDEX "book_mood_score_idx" ON "book_mood"("score");

-- CreateIndex
CREATE INDEX "user_books_user_id_idx" ON "user_books"("user_id");

-- CreateIndex
CREATE INDEX "user_books_book_id_idx" ON "user_books"("book_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_books_user_id_book_id_key" ON "user_books"("user_id", "book_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_cache_cache_key_key" ON "api_cache"("cache_key");

-- CreateIndex
CREATE INDEX "api_cache_expires_at_idx" ON "api_cache"("expires_at");

-- CreateIndex
CREATE INDEX "api_cache_cache_key_idx" ON "api_cache"("cache_key");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_chapters" ADD CONSTRAINT "book_chapters_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_summaries" ADD CONSTRAINT "book_summaries_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_embeddings" ADD CONSTRAINT "book_embeddings_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_writing_drafts" ADD CONSTRAINT "user_writing_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_writing_drafts" ADD CONSTRAINT "user_writing_drafts_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_library" ADD CONSTRAINT "user_library_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_mood" ADD CONSTRAINT "book_mood_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_mood" ADD CONSTRAINT "book_mood_mood_id_fkey" FOREIGN KEY ("mood_id") REFERENCES "moods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_books" ADD CONSTRAINT "user_books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_books" ADD CONSTRAINT "user_books_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
