-- CreateTable
CREATE TABLE "organization" (
    "id" UUID NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actor" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "issuer" VARCHAR(120) NOT NULL,
    "subject" VARCHAR(120) NOT NULL,
    "role" VARCHAR(32) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiary" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "reference" VARCHAR(64) NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "beneficiary_id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "supervisor_id" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "beneficiary_id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "supervisor_id" UUID NOT NULL,
    "state" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "current_revision" INTEGER NOT NULL DEFAULT 1,
    "confirmed_revision" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_revision" (
    "visit_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "visit_at" TIMESTAMPTZ NOT NULL,
    "visit_timezone" VARCHAR(64) NOT NULL,
    "observations" JSONB NOT NULL,
    "note" TEXT,
    "transcript" TEXT,
    "provenance" JSONB,
    "unresolved_acknowledged" JSONB NOT NULL DEFAULT '[]',
    "content_hash" VARCHAR(64) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_by" UUID,
    "confirmed_at" TIMESTAMPTZ,

    CONSTRAINT "visit_revision_pkey" PRIMARY KEY ("visit_id","revision")
);

-- CreateTable
CREATE TABLE "transition_audit" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "actor_id" UUID NOT NULL,
    "from_state" VARCHAR(32) NOT NULL,
    "to_state" VARCHAR(32) NOT NULL,
    "return_reason" TEXT,
    "request_id" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transition_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_record" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "operation" VARCHAR(64) NOT NULL,
    "resource_key" VARCHAR(128) NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "response_status" INTEGER NOT NULL,
    "response_body" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_run" (
    "id" UUID NOT NULL,
    "manifest_hash" VARCHAR(64) NOT NULL,
    "code_version" VARCHAR(64) NOT NULL,
    "prompt_version" VARCHAR(64) NOT NULL,
    "schema_version" VARCHAR(64) NOT NULL,
    "model_version" VARCHAR(64) NOT NULL,
    "seed" INTEGER NOT NULL,
    "conditions" JSONB NOT NULL,
    "counts" JSONB NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "evaluation_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_result" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "scenario_id" VARCHAR(64) NOT NULL,
    "split" VARCHAR(32) NOT NULL,
    "condition" VARCHAR(32) NOT NULL,
    "expected" JSONB NOT NULL,
    "predicted" JSONB NOT NULL,
    "result_class" VARCHAR(32) NOT NULL,
    "denominators" JSONB NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "actor_id_organization_id_key" ON "actor"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "actor_issuer_subject_key" ON "actor"("issuer", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiary_id_organization_id_key" ON "beneficiary"("id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiary_organization_id_reference_key" ON "beneficiary"("organization_id", "reference");

-- CreateIndex
CREATE INDEX "assignment_organization_id_worker_id_active_idx" ON "assignment"("organization_id", "worker_id", "active");

-- CreateIndex
CREATE INDEX "assignment_organization_id_supervisor_id_active_idx" ON "assignment"("organization_id", "supervisor_id", "active");

-- CreateIndex
CREATE INDEX "visit_organization_id_worker_id_state_updated_at_idx" ON "visit"("organization_id", "worker_id", "state", "updated_at");

-- CreateIndex
CREATE INDEX "visit_organization_id_supervisor_id_state_updated_at_idx" ON "visit"("organization_id", "supervisor_id", "state", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "visit_id_organization_id_key" ON "visit"("id", "organization_id");

-- CreateIndex
CREATE INDEX "transition_audit_visit_id_created_at_idx" ON "transition_audit"("visit_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_record_actor_id_operation_resource_key_key_key" ON "idempotency_record"("actor_id", "operation", "resource_key", "key");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_result_run_id_scenario_id_condition_key" ON "evaluation_result"("run_id", "scenario_id", "condition");

-- AddForeignKey
ALTER TABLE "actor" ADD CONSTRAINT "actor_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary" ADD CONSTRAINT "beneficiary_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_beneficiary_id_organization_id_fkey" FOREIGN KEY ("beneficiary_id", "organization_id") REFERENCES "beneficiary"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_worker_id_organization_id_fkey" FOREIGN KEY ("worker_id", "organization_id") REFERENCES "actor"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_supervisor_id_organization_id_fkey" FOREIGN KEY ("supervisor_id", "organization_id") REFERENCES "actor"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit" ADD CONSTRAINT "visit_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit" ADD CONSTRAINT "visit_beneficiary_id_organization_id_fkey" FOREIGN KEY ("beneficiary_id", "organization_id") REFERENCES "beneficiary"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit" ADD CONSTRAINT "visit_worker_id_organization_id_fkey" FOREIGN KEY ("worker_id", "organization_id") REFERENCES "actor"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit" ADD CONSTRAINT "visit_supervisor_id_organization_id_fkey" FOREIGN KEY ("supervisor_id", "organization_id") REFERENCES "actor"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_revision" ADD CONSTRAINT "visit_revision_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transition_audit" ADD CONSTRAINT "transition_audit_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_result" ADD CONSTRAINT "evaluation_result_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "evaluation_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-reviewed checks (SAKHILINE_BUILD.md §7)
ALTER TABLE "visit" ADD CONSTRAINT "visit_state_check" CHECK ("state" IN ('draft','submitted','returned','approved'));
ALTER TABLE "visit" ADD CONSTRAINT "visit_current_revision_check" CHECK ("current_revision" >= 1);
ALTER TABLE "actor" ADD CONSTRAINT "actor_role_check" CHECK ("role" IN ('worker','supervisor'));

-- Immutability trigger on visit_revision
CREATE OR REPLACE FUNCTION check_visit_revision_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.visit_id != NEW.visit_id OR
      OLD.revision != NEW.revision OR
      OLD.visit_at != NEW.visit_at OR
      OLD.visit_timezone != NEW.visit_timezone OR
      OLD.observations::text != NEW.observations::text OR
      COALESCE(OLD.note, '') != COALESCE(NEW.note, '') OR
      COALESCE(OLD.transcript, '') != COALESCE(NEW.transcript, '') OR
      COALESCE(OLD.provenance::text, '') != COALESCE(NEW.provenance::text, '') OR
      OLD.unresolved_acknowledged::text != NEW.unresolved_acknowledged::text OR
      OLD.content_hash != NEW.content_hash OR
      OLD.created_by != NEW.created_by OR
      OLD.created_at != NEW.created_at) THEN
    RAISE EXCEPTION 'visit_revision content columns are immutable';
  END IF;

  -- IS DISTINCT FROM: plain != yields NULL (no raise) when NEW.* is NULL, which would let confirmation be wiped.
  IF OLD.confirmed_by IS NOT NULL AND (OLD.confirmed_by IS DISTINCT FROM NEW.confirmed_by OR OLD.confirmed_at IS DISTINCT FROM NEW.confirmed_at) THEN
    RAISE EXCEPTION 'visit_revision confirmation metadata cannot be modified once set';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_visit_revision_immutable
BEFORE UPDATE ON "visit_revision"
FOR EACH ROW
EXECUTE FUNCTION check_visit_revision_immutable();

CREATE OR REPLACE FUNCTION forbid_visit_revision_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'visit_revision rows cannot be deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_visit_revision_no_delete
BEFORE DELETE ON "visit_revision"
FOR EACH ROW
EXECUTE FUNCTION forbid_visit_revision_delete();

-- Append-only trigger on transition_audit (forbids UPDATE and DELETE)
CREATE OR REPLACE FUNCTION forbid_transition_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'transition_audit is append-only: updates and deletes are forbidden';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transition_audit_no_update
BEFORE UPDATE ON "transition_audit"
FOR EACH ROW
EXECUTE FUNCTION forbid_transition_audit_mutation();

CREATE TRIGGER trg_transition_audit_no_delete
BEFORE DELETE ON "transition_audit"
FOR EACH ROW
EXECUTE FUNCTION forbid_transition_audit_mutation();
