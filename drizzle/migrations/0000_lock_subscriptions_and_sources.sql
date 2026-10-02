DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;

CREATE OR REPLACE FUNCTION public.downgrade_to_free()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.subscriptions
  SET plan = 'gratuito', expires_at = NULL, started_at = now()
  WHERE user_id = auth.uid() AND status = 'active';
$$;
REVOKE EXECUTE ON FUNCTION public.downgrade_to_free() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.downgrade_to_free() TO authenticated;

DROP POLICY IF EXISTS "Authenticated can view sources" ON public.custom_data_sources;