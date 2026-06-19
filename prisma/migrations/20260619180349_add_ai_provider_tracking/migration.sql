-- AlterTable
ALTER TABLE "book_generation_jobs" ADD COLUMN     "ai_model" TEXT,
ADD COLUMN     "ai_provider" TEXT;

-- AlterTable
ALTER TABLE "books" ADD COLUMN     "ai_provider" TEXT;
