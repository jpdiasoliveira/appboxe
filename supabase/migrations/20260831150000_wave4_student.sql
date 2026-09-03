-- Wave 4: Portal Aluno — payment methods + RLS aluno

CREATE TABLE public.student_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  gateway TEXT NOT NULL DEFAULT 'pagarme',
  gateway_token TEXT NOT NULL,
  brand TEXT,
  last_four TEXT,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_payment_methods ENABLE ROW LEVEL SECURITY;

-- Aluno gerencia próprios cartões tokenizados (PCI — só token, nunca PAN)
CREATE POLICY payment_methods_self ON public.student_payment_methods
  FOR ALL TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  )
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

-- Aluno: categorias próprias
CREATE POLICY stu_cat_self ON public.student_categories
  FOR ALL TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  )
  WITH CHECK (
    student_id IN (
      SELECT st.id FROM public.students st
      WHERE st.user_id = auth.uid()
    )
  );

-- Aluno: criar/atualizar assinatura (troca de plano)
CREATE POLICY subs_self_write ON public.student_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY subs_self_update ON public.student_subscriptions
  FOR UPDATE TO authenticated
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  )
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

-- Aluno: atualizar próprio perfil estudante (telefone)
CREATE POLICY students_self_update ON public.students
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Aluno: ler planos públicos já coberto em wave3
