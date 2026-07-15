-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_appointments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'booked',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME,
    CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_appointments" ("created_at", "customer_name", "customer_phone", "end_time", "id", "service_id", "start_time", "status") SELECT "created_at", "customer_name", "customer_phone", "end_time", "id", "service_id", "start_time", "status" FROM "appointments";
DROP TABLE "appointments";
ALTER TABLE "new_appointments" RENAME TO "appointments";
CREATE TABLE "new_call_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "summary" TEXT,
    "intent" TEXT,
    "duration" INTEGER,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME
);
INSERT INTO "new_call_logs" ("duration", "id", "intent", "phone", "summary", "timestamp", "transcript") SELECT "duration", "id", "intent", "phone", "summary", "timestamp", "transcript" FROM "call_logs";
DROP TABLE "call_logs";
ALTER TABLE "new_call_logs" RENAME TO "call_logs";
CREATE TABLE "new_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME
);
INSERT INTO "new_messages" ("created_at", "customer_name", "customer_phone", "id", "reason") SELECT "created_at", "customer_name", "customer_phone", "id", "reason" FROM "messages";
DROP TABLE "messages";
ALTER TABLE "new_messages" RENAME TO "messages";
CREATE TABLE "new_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" DATETIME
);
INSERT INTO "new_services" ("created_at", "duration_minutes", "id", "name", "price") SELECT "created_at", "duration_minutes", "id", "name", "price" FROM "services";
DROP TABLE "services";
ALTER TABLE "new_services" RENAME TO "services";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
