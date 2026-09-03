-- Professor pode criar e editar turmas próprias; dono continua com gestão completa.

CREATE POLICY categories_professor_insert ON public.training_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.is_scoped_professor(academy_id));

CREATE POLICY categories_professor_update ON public.training_categories
  FOR UPDATE TO authenticated
  USING (
    public.is_scoped_professor(academy_id)
    AND id IN (SELECT public.instructor_category_ids(academy_id))
  )
  WITH CHECK (
    public.is_scoped_professor(academy_id)
    AND id IN (SELECT public.instructor_category_ids(academy_id))
  );

-- Vincula automaticamente o professor à turma que ele criou (trigger roda como definer).
CREATE OR REPLACE FUNCTION public.auto_link_creator_professor_to_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_scoped_professor(NEW.academy_id) AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.instructor_training_categories (academy_id, training_category_id, user_id)
    VALUES (NEW.academy_id, NEW.id, auth.uid())
    ON CONFLICT (user_id, training_category_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS training_categories_auto_link_professor ON public.training_categories;

CREATE TRIGGER training_categories_auto_link_professor
  AFTER INSERT ON public.training_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_creator_professor_to_category();
