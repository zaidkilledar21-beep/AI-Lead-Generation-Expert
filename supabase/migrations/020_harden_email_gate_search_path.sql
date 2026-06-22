-- Keep the email validator safe when called from exposed views and security-definer RPCs.

alter function public.is_usable_lead_email(text)
set search_path = public;
