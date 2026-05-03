"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { signIn } from "./actions";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [state, action] = useFormState(signIn, { error: "" });
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="crm-brand" aria-label="AI Automation CRM">
          <span className="crm-brand-mark">AA</span>
          <span>
            <strong>Outreach CRM</strong>
            <small>Founder access</small>
          </span>
        </div>
        <h1>Sign In</h1>
        <p className="muted">Use the founder dashboard account configured in Supabase Auth.</p>
        <form action={action} className="form">
          <input name="next" type="hidden" value={next} />
          <label>
            <span>Email</span>
            <input name="email" type="email" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" required />
          </label>
          {state.error ? <p className="ui-badge ui-badge-danger">{state.error}</p> : null}
          <SubmitButton />
        </form>
      </section>
    </main>
  );
}

function SubmitButton() {
  const status = useFormStatus();
  return (
    <button className="button" type="submit" disabled={status.pending}>
      {status.pending ? "Signing in..." : "Sign in"}
    </button>
  );
}
