"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signIn } from "./actions";

export default function LoginPage() {
  const [state, action] = useFormState(signIn, { error: "" });

  return (
    <section className="section" style={{ maxWidth: 420 }}>
      <h1>Sign In</h1>
      <p className="muted">Use the founder dashboard account configured in Supabase Auth.</p>
      <form action={action} className="card">
        <label>
          <span className="muted">Email</span>
          <input name="email" type="email" required style={inputStyle} />
        </label>
        <label>
          <span className="muted">Password</span>
          <input name="password" type="password" required style={inputStyle} />
        </label>
        {state.error ? <p className="badge danger">{state.error}</p> : null}
        <SubmitButton />
      </form>
    </section>
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

const inputStyle = {
  display: "block",
  margin: "6px 0 14px",
  padding: "10px",
  width: "100%"
};
