-- AlterTable
ALTER TABLE "users" ADD COLUMN "birth_date" DATE;

-- CreateTable
CREATE TABLE "birthday_greeting_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "channels" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "birthday_greeting_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "birthday_greeting_logs_year_sent_at_idx" ON "birthday_greeting_logs"("year", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "birthday_greeting_logs_user_id_year_key" ON "birthday_greeting_logs"("user_id", "year");

-- AddForeignKey
ALTER TABLE "birthday_greeting_logs" ADD CONSTRAINT "birthday_greeting_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
