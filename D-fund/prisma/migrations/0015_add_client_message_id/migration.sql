-- AddColumn clientMessageId to messages (nullable, unique)
ALTER TABLE "messages" ADD COLUMN "clientMessageId" TEXT;
CREATE UNIQUE INDEX "messages_clientMessageId_key" ON "messages"("clientMessageId");
