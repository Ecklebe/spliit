-- CreateTable
CREATE TABLE "InstanceSettings" (
    "id" TEXT NOT NULL,
    "requireLoginToCreateGroups" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InstanceSettings_pkey" PRIMARY KEY ("id")
);

-- Seed the single settings row - the app always reads/writes this exact
-- row (see src/lib/instance-settings.ts); it must exist from the moment
-- this migration runs, not be synthesized in application code.
INSERT INTO "InstanceSettings" ("id", "requireLoginToCreateGroups")
VALUES ('singleton', false);
