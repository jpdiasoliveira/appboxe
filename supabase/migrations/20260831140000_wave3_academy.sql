-- Wave 3: Portal Academia

CREATE TYPE plan_period AS ENUM ('MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');
CREATE TYPE payment_method AS ENUM ('CARTAO', 'PIX', 'BOLETO');

CREATE TABLE public.academy_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  period plan_period NOT NULL DEFAULT 'MENSAL',
  max_categories INT NOT NULL DEFAULT 3,
  is_public BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.training_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#B91C1C',
  status TEXT NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  cpf TEXT,
  phone TEXT,
  status student_status NOT NULL DEFAULT 'ATIVO',
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, academy_id)
);

CREATE TABLE public.student_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academy_plan_id UUID NOT NULL REFERENCES public.academy_plans(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_billing_date DATE,
  status TEXT NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.student_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  training_category_id UUID NOT NULL REFERENCES public.training_categories(id) ON DELETE CASCADE,
  UNIQUE (student_id, training_category_id)
);

CREATE TABLE public.academy_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_subscription_id UUID REFERENCES public.student_subscriptions(id),
  amount NUMERIC(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status invoice_status NOT NULL DEFAULT 'PENDENTE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.academy_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.academy_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  method payment_method NOT NULL DEFAULT 'PIX',
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ATIVO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, academy_id)
);

CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  training_category_id UUID NOT NULL REFERENCES public.training_categories(id) ON DELETE CASCADE,
  class_date DATE NOT NULL DEFAULT CURRENT_DATE,
  present BOOLEAN NOT NULL DEFAULT true,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, training_category_id, class_date)
);

CREATE TRIGGER academy_plans_updated_at
  BEFORE UPDATE ON public.academy_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.academy_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Staff roles (exceto ASSISTANT em financeiro)
CREATE OR REPLACE FUNCTION public.is_academy_staff(p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_academy_role(p_academy_id, ARRAY['SCHOOL_OWNER','PROFESSOR','ASSISTANT']::user_role[]);
$$;

CREATE OR REPLACE FUNCTION public.can_view_academy_finance(p_academy_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_academy_role(p_academy_id, ARRAY['SCHOOL_OWNER','PROFESSOR']::user_role[]);
$$;

-- academy_plans
CREATE POLICY plans_staff ON public.academy_plans
  FOR ALL TO authenticated
  USING (public.is_academy_staff(academy_id) OR public.is_platform_owner())
  WITH CHECK (public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[]) OR public.is_platform_owner());

CREATE POLICY plans_student_read ON public.academy_plans
  FOR SELECT TO authenticated
  USING (academy_id IN (SELECT public.user_academy_ids()) AND is_public = true);

-- training_categories
CREATE POLICY categories_staff ON public.training_categories
  FOR ALL TO authenticated
  USING (public.is_academy_staff(academy_id) OR public.is_platform_owner())
  WITH CHECK (public.is_academy_staff(academy_id) OR public.is_platform_owner());

-- students
CREATE POLICY students_staff ON public.students
  FOR ALL TO authenticated
  USING (public.is_academy_staff(academy_id) OR public.is_platform_owner())
  WITH CHECK (public.is_academy_staff(academy_id) OR public.is_platform_owner());

CREATE POLICY students_self ON public.students
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- subscriptions
CREATE POLICY subs_staff ON public.student_subscriptions
  FOR ALL TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE academy_id IN (SELECT public.user_academy_ids()))
    AND (public.is_academy_staff((SELECT academy_id FROM public.students WHERE id = student_id)) OR public.is_platform_owner())
  );

CREATE POLICY subs_self ON public.student_subscriptions
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- student_categories
CREATE POLICY stu_cat_staff ON public.student_categories
  FOR ALL TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students s WHERE public.is_academy_staff(s.academy_id))
  );

-- academy_invoices — ASSISTANT DENIED
CREATE POLICY invoices_finance ON public.academy_invoices
  FOR ALL TO authenticated
  USING (public.can_view_academy_finance(academy_id) OR public.is_platform_owner())
  WITH CHECK (public.can_view_academy_finance(academy_id) OR public.is_platform_owner());

CREATE POLICY invoices_student_self ON public.academy_invoices
  FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- academy_payments — ASSISTANT DENIED
CREATE POLICY payments_finance ON public.academy_payments
  FOR ALL TO authenticated
  USING (
    invoice_id IN (
      SELECT i.id FROM public.academy_invoices i
      WHERE public.can_view_academy_finance(i.academy_id) OR public.is_platform_owner()
    )
  );

-- instructors
CREATE POLICY instructors_staff ON public.instructors
  FOR ALL TO authenticated
  USING (public.is_academy_staff(academy_id) OR public.is_platform_owner())
  WITH CHECK (
    public.has_academy_role(academy_id, ARRAY['SCHOOL_OWNER']::user_role[]) OR public.is_platform_owner()
  );

-- attendance
CREATE POLICY attendance_staff ON public.attendance_records
  FOR ALL TO authenticated
  USING (public.is_academy_staff(academy_id) OR public.is_platform_owner())
  WITH CHECK (public.is_academy_staff(academy_id) OR public.is_platform_owner());

GRANT EXECUTE ON FUNCTION public.is_academy_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_academy_finance(UUID) TO authenticated;
