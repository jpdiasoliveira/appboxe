-- UP-113: agenda de aulas (grupo, individual, eventos) com recorrência

CREATE TYPE public.schedule_session_type AS ENUM ('GROUP', 'INDIVIDUAL', 'EVENT');

CREATE TYPE public.schedule_event_kind AS ENUM (
  'CLASS',
  'SPARRING',
  'CHAMPIONSHIP',
  'SEMINAR',
  'OTHER'
);

CREATE TABLE public.schedule_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_type public.schedule_session_type NOT NULL,
  event_kind public.schedule_event_kind NOT NULL DEFAULT 'CLASS',
  category_id UUID REFERENCES public.training_categories(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  instructor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  color TEXT NOT NULL DEFAULT '#B91C1C',
  recurrence JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.schedule_series(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_type public.schedule_session_type NOT NULL,
  event_kind public.schedule_event_kind NOT NULL DEFAULT 'CLASS',
  category_id UUID REFERENCES public.training_categories(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  instructor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  color TEXT NOT NULL DEFAULT '#B91C1C',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT class_sessions_status_check CHECK (status IN ('SCHEDULED', 'CANCELLED', 'COMPLETED')),
  CONSTRAINT class_sessions_group_requires_category CHECK (
    session_type <> 'GROUP' OR category_id IS NOT NULL
  ),
  CONSTRAINT class_sessions_individual_requires_student CHECK (
    session_type <> 'INDIVIDUAL' OR student_id IS NOT NULL
  ),
  CONSTRAINT class_sessions_time_order CHECK (ends_at > starts_at)
);

CREATE INDEX class_sessions_academy_starts_idx
  ON public.class_sessions (academy_id, starts_at)
  WHERE status = 'SCHEDULED';

CREATE INDEX class_sessions_student_idx
  ON public.class_sessions (student_id, starts_at)
  WHERE status = 'SCHEDULED';

CREATE TRIGGER class_sessions_updated_at
  BEFORE UPDATE ON public.class_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.schedule_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY schedule_series_staff ON public.schedule_series
  FOR ALL TO authenticated
  USING (public.is_academy_staff(academy_id) OR public.is_platform_owner())
  WITH CHECK (public.is_academy_staff(academy_id) OR public.is_platform_owner());

CREATE POLICY class_sessions_staff ON public.class_sessions
  FOR ALL TO authenticated
  USING (public.is_academy_staff(academy_id) OR public.is_platform_owner())
  WITH CHECK (public.is_academy_staff(academy_id) OR public.is_platform_owner());

CREATE OR REPLACE FUNCTION public.get_student_class_sessions(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS SETOF public.class_sessions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cs.*
  FROM public.class_sessions cs
  JOIN public.students s ON s.user_id = auth.uid()
  WHERE cs.academy_id = s.academy_id
    AND cs.status = 'SCHEDULED'
    AND cs.starts_at >= p_from
    AND cs.starts_at < p_to
    AND (
      (cs.session_type = 'INDIVIDUAL' AND cs.student_id = s.id)
      OR (
        cs.session_type = 'GROUP'
        AND cs.category_id IN (
          SELECT sc.training_category_id
          FROM public.student_categories sc
          WHERE sc.student_id = s.id
        )
      )
      OR (
        cs.session_type = 'EVENT'
        AND (
          cs.category_id IS NULL
          OR cs.category_id IN (
            SELECT sc.training_category_id
            FROM public.student_categories sc
            WHERE sc.student_id = s.id
          )
        )
      )
    )
  ORDER BY cs.starts_at;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_class_sessions(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
