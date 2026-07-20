-- Audit de fiabilité — correctifs structurels (2026-07-20)

-- 1. Supprimer l'index dupliqué sur users.email
--    @unique crée déjà "users_email_key" (index unique) ; @@index([email]) créait
--    un second index non-unique redondant qui consommait de l'espace inutilement.
DROP INDEX IF EXISTS "users_email_idx";

-- 2. Message.receiver : Cascade → SetNull
--    Auparavant, supprimer un compte utilisateur supprimait en cascade TOUS les
--    messages où il était destinataire, détruisant l'historique de l'expéditeur.
--    Avec SetNull, les messages sont conservés avec receiverId = NULL.
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_receiverId_fkey";
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_receiverId_fkey"
  FOREIGN KEY ("receiverId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Index composite Task[userId, status]
--    Couvre la requête la plus fréquente : "mes tâches actives/todo"
--    WHERE userId = X AND status IN (...)
CREATE INDEX IF NOT EXISTS "tasks_userId_status_idx" ON "tasks"("userId", "status");

-- 4. Index composite Opportunity[status, expirationDate]
--    Couvre le job cron d'expiration :
--    WHERE status = 'ACTIVE' AND expirationDate < NOW()
CREATE INDEX IF NOT EXISTS "opportunities_status_expirationDate_idx"
  ON "opportunities"("status", "expirationDate");
