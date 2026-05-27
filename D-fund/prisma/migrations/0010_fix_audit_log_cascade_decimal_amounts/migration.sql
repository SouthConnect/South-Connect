-- Fix AdminAuditLog: adminId becomes nullable, ON DELETE SET NULL
-- Prevents audit trail from being deleted when an admin account is removed.
ALTER TABLE "admin_audit_logs" DROP CONSTRAINT "admin_audit_logs_adminId_fkey";
ALTER TABLE "admin_audit_logs" ALTER COLUMN "adminId" DROP NOT NULL;
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Fix monetary fields: Float (double precision) → Decimal(12,2)
-- Eliminates floating-point rounding errors on financial amounts.
ALTER TABLE "opportunities"
  ALTER COLUMN "price"           TYPE DECIMAL(12,2) USING "price"::DECIMAL(12,2),
  ALTER COLUMN "referralAmount"  TYPE DECIMAL(12,2) USING "referralAmount"::DECIMAL(12,2);

ALTER TABLE "referral_codes"
  ALTER COLUMN "amount"          TYPE DECIMAL(12,2) USING "amount"::DECIMAL(12,2),
  ALTER COLUMN "potentialAmount" TYPE DECIMAL(12,2) USING "potentialAmount"::DECIMAL(12,2);
