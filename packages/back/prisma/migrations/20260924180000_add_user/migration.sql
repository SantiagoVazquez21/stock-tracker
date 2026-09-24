-- DropIndex
DROP INDEX "Watch_symbol_key";

-- AlterTable
ALTER TABLE "Watch" ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Watch_userId_symbol_key" ON "Watch"("userId", "symbol");

-- AddForeignKey
ALTER TABLE "Watch" ADD CONSTRAINT "Watch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security en la tabla nueva (convención del proyecto: toda tabla
-- nueva nace con RLS, para no quedar expuesta por la API pública de Supabase).
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
