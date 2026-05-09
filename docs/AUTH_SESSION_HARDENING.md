# Supabase Auth Session Notes

The dashboard uses Supabase SSR cookies as the source of truth for authenticated CRM sessions.

## Required Supabase Redirect URL

Configure this redirect URL in the Supabase dashboard for each deployed environment:

```text
https://<production-domain>/auth/callback
```

For local development, also configure:

```text
http://localhost:3000/auth/callback
```

The `/auth/callback` route exchanges Supabase auth codes server-side with `exchangeCodeForSession(code)`, persists the SSR cookies through the route handler response, and redirects only to safe same-origin app paths.

## Session Ownership

- Middleware refreshes and persists Supabase auth cookies for protected dashboard routes.
- Server Components may read sessions, but failed cookie writes there are not treated as the persistence path.
- Dashboard authorization still comes from `dashboard_users`; active access and role checks remain required after Supabase Auth succeeds.
- Browser code must not use service role keys or local storage as the CRM auth source of truth.
