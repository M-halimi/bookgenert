-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

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
    "category" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "page_count" INTEGER,
    "publish_year" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "external_id" TEXT,
    "episodes" JSONB,
    "mood_analyzed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "author_id" UUID,
    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "authors_name_key" ON "authors"("name");
CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");
CREATE UNIQUE INDEX "books_slug_key" ON "books"("slug");
CREATE INDEX "books_title_idx" ON "books"("title");
CREATE INDEX "books_category_idx" ON "books"("category");
CREATE INDEX "books_source_idx" ON "books"("source");
CREATE INDEX "books_author_id_idx" ON "books"("author_id");
CREATE INDEX "books_created_at_idx" ON "books"("created_at");
CREATE INDEX "book_mood_mood_id_idx" ON "book_mood"("mood_id");
CREATE INDEX "book_mood_score_idx" ON "book_mood"("score");
CREATE INDEX "user_books_user_id_idx" ON "user_books"("user_id");
CREATE INDEX "user_books_book_id_idx" ON "user_books"("book_id");
CREATE UNIQUE INDEX "user_books_user_id_book_id_key" ON "user_books"("user_id", "book_id");
CREATE UNIQUE INDEX "api_cache_cache_key_key" ON "api_cache"("cache_key");
CREATE INDEX "api_cache_expires_at_idx" ON "api_cache"("expires_at");
CREATE INDEX "api_cache_cache_key_idx" ON "api_cache"("cache_key");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "book_mood" ADD CONSTRAINT "book_mood_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_mood" ADD CONSTRAINT "book_mood_mood_id_fkey" FOREIGN KEY ("mood_id") REFERENCES "moods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_books" ADD CONSTRAINT "user_books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_books" ADD CONSTRAINT "user_books_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
