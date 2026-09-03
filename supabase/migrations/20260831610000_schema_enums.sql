-- UP-SCH-01: enums de domínio (substituir text + CHECK onde aplicável)

DO $$ BEGIN
  CREATE TYPE public.invite_status AS ENUM (
    'PENDING',
    'COMPLETED',
    'EXPIRED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_status AS ENUM (
    'NOVO',
    'CONVITE_ENVIADO',
    'CONVERTIDO'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM (
    'ATIVO',
    'INATIVO',
    'CANCELADO'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_record_status AS ENUM (
    'PENDENTE',
    'PAGO',
    'FALHOU',
    'CANCELADO'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.session_status AS ENUM (
    'SCHEDULED',
    'CANCELLED',
    'COMPLETED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Índices parciais com status = 'text' bloqueiam ALTER TYPE → dropar antes e recriar depois.
DROP INDEX IF EXISTS public.student_invites_token_idx;
DROP INDEX IF EXISTS public.staff_invites_token_idx;
DROP INDEX IF EXISTS public.platform_staff_invites_token_idx;
DROP INDEX IF EXISTS public.class_sessions_academy_starts_idx;
DROP INDEX IF EXISTS public.class_sessions_student_idx;

-- student_invites
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
    WHERE n.nspname = 'public'
      AND c.relname = 'student_invites'
      AND a.attname = 'status'
      AND NOT a.attisdropped
      AND t.typname = 'text'
  ) THEN
    ALTER TABLE public.student_invites
      DROP CONSTRAINT IF EXISTS student_invites_status_check;
    ALTER TABLE public.student_invites
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE public.invite_status
        USING status::public.invite_status,
      ALTER COLUMN status SET DEFAULT 'PENDING';
  END IF;
END $$;

-- staff_invites
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
    WHERE n.nspname = 'public'
      AND c.relname = 'staff_invites'
      AND a.attname = 'status'
      AND NOT a.attisdropped
      AND t.typname = 'text'
  ) THEN
    ALTER TABLE public.staff_invites
      DROP CONSTRAINT IF EXISTS staff_invites_status_check,
      DROP CONSTRAINT IF EXISTS staff_invites_role_check;
    ALTER TABLE public.staff_invites
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE public.invite_status
        USING status::public.invite_status,
      ALTER COLUMN status SET DEFAULT 'PENDING';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
    WHERE n.nspname = 'public'
      AND c.relname = 'staff_invites'
      AND a.attname = 'role'
      AND NOT a.attisdropped
      AND t.typname = 'text'
  ) THEN
    ALTER TABLE public.staff_invites
      ALTER COLUMN role TYPE public.user_role
        USING role::public.user_role;
  END IF;
END $$;

-- platform_staff_invites
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
    WHERE n.nspname = 'public'
      AND c.relname = 'platform_staff_invites'
      AND a.attname = 'status'
      AND NOT a.attisdropped
      AND t.typname = 'text'
  ) THEN
    ALTER TABLE public.platform_staff_invites
      DROP CONSTRAINT IF EXISTS platform_staff_invites_status_check;
    ALTER TABLE public.platform_staff_invites
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE public.invite_status
        USING status::public.invite_status,
      ALTER COLUMN status SET DEFAULT 'PENDING';
  END IF;
END $$;

-- leads
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
    WHERE n.nspname = 'public'
      AND c.relname = 'leads'
      AND a.attname = 'status'
      AND NOT a.attisdropped
      AND t.typname = 'text'
  ) THEN
    ALTER TABLE public.leads
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE public.lead_status
        USING status::public.lead_status,
      ALTER COLUMN status SET DEFAULT 'NOVO';
  END IF;
END $$;

-- student_subscriptions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
    WHERE n.nspname = 'public'
      AND c.relname = 'student_subscriptions'
      AND a.attname = 'status'
      AND NOT a.attisdropped
      AND t.typname = 'text'
  ) THEN
    ALTER TABLE public.student_subscriptions
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE public.subscription_status
        USING status::public.subscription_status,
      ALTER COLUMN status SET DEFAULT 'ATIVO';
  END IF;
END $$;

-- academy_payments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
    WHERE n.nspname = 'public'
      AND c.relname = 'academy_payments'
      AND a.attname = 'status'
      AND NOT a.attisdropped
      AND t.typname = 'text'
  ) THEN
    ALTER TABLE public.academy_payments
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE public.payment_record_status
        USING status::public.payment_record_status,
      ALTER COLUMN status SET DEFAULT 'PENDENTE';
  END IF;
END $$;

-- class_sessions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
    WHERE n.nspname = 'public'
      AND c.relname = 'class_sessions'
      AND a.attname = 'status'
      AND NOT a.attisdropped
      AND t.typname = 'text'
  ) THEN
    ALTER TABLE public.class_sessions
      DROP CONSTRAINT IF EXISTS class_sessions_status_check;
    ALTER TABLE public.class_sessions
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE public.session_status
        USING status::public.session_status,
      ALTER COLUMN status SET DEFAULT 'SCHEDULED';
  END IF;
END $$;

-- planos (catálogo) — policies referenciam status
DROP POLICY IF EXISTS plans_landing_public ON public.academy_plans;
DROP POLICY IF EXISTS plans_professor_operational_read ON public.academy_plans;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
    WHERE n.nspname = 'public'
      AND c.relname = 'academy_plans'
      AND a.attname = 'status'
      AND NOT a.attisdropped
      AND t.typname = 'text'
  ) THEN
    ALTER TABLE public.academy_plans
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE public.academy_status
        USING status::public.academy_status,
      ALTER COLUMN status SET DEFAULT 'ATIVO';
  END IF;
END $$;

CREATE POLICY plans_landing_public ON public.academy_plans
  FOR SELECT TO anon
  USING (public.is_landing_public(academy_id) AND is_public = true AND status = 'ATIVO');

CREATE POLICY plans_professor_operational_read ON public.academy_plans
  FOR SELECT TO authenticated
  USING (
    public.is_scoped_professor(academy_id)
    AND status = 'ATIVO'
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
    WHERE n.nspname = 'public'
      AND c.relname = 'saas_plans'
      AND a.attname = 'status'
      AND NOT a.attisdropped
      AND t.typname = 'text'
  ) THEN
    ALTER TABLE public.saas_plans
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE public.academy_status
        USING status::public.academy_status,
      ALTER COLUMN status SET DEFAULT 'ATIVO';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS student_invites_token_idx
  ON public.student_invites (token)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS staff_invites_token_idx
  ON public.staff_invites (token)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS platform_staff_invites_token_idx
  ON public.platform_staff_invites (token)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS class_sessions_academy_starts_idx
  ON public.class_sessions (academy_id, starts_at)
  WHERE status = 'SCHEDULED';

CREATE INDEX IF NOT EXISTS class_sessions_student_idx
  ON public.class_sessions (student_id, starts_at)
  WHERE status = 'SCHEDULED';
