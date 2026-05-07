"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";

export function ActionFeedbackForm({
  action,
  successMessage,
  className,
  children
}: Readonly<{
  action: (formData: FormData) => Promise<unknown>;
  successMessage: string;
  className?: string;
  children: ReactNode;
}>) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(null);

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setFeedback(null);
        startTransition(async () => {
          try {
            await action(formData);
            setFeedback({ tone: "success", message: successMessage });
          } catch (error) {
            setFeedback({ tone: "danger", message: error instanceof Error ? error.message : "Action failed." });
          }
        });
      }}
    >
      <fieldset disabled={isPending} className="contents">
        {children}
      </fieldset>
      {feedback ? (
        <p className={`mt-2 text-sm ${feedback.tone === "success" ? "text-emerald-300" : "text-red-300"}`}>
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
}
