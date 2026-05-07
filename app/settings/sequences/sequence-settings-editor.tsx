"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CrmSelect } from "@/components/ui/crm-select";
import {
  archiveSequenceAction,
  archiveSequenceStepAction,
  createSequenceAction,
  createSequenceStepAction,
  updateSequenceAction,
  updateSequenceStepAction
} from "../actions";

const dependencyWarning =
  "This sequence is assigned to active campaigns. Archiving it may prevent draft generation for those campaigns.";

type SequenceStep = {
  id: string;
  sequence_id: string;
  step_number: number;
  delay_days: number;
  template_type?: string | null;
  prompt_guidance?: string | null;
  active?: boolean | null;
  archived?: boolean | null;
};

type Sequence = {
  id: string;
  name: string;
  description?: string | null;
  band?: string | null;
  active?: boolean | null;
  archived?: boolean | null;
  outreach_steps?: SequenceStep[];
  activeCampaignCount: number;
};

function statusTone(sequence: Sequence) {
  if (sequence.archived) return "muted" as const;
  if (sequence.active) return "success" as const;
  return "warning" as const;
}

function statusLabel(sequence: Sequence) {
  if (sequence.archived) return "Archived";
  if (sequence.active) return "Active";
  return "Inactive";
}

function FormError({ message }: Readonly<{ message: string | null }>) {
  return message ? <p className="text-sm text-red-300">{message}</p> : null;
}

export function SequenceSettingsEditor({ sequences }: Readonly<{ sequences: Sequence[] }>) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(action: (formData: FormData) => Promise<unknown>, formData: FormData, reset?: HTMLFormElement) {
    setError(null);
    startTransition(async () => {
      try {
        await action(formData);
        reset?.reset();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Sequence update failed");
      }
    });
  }

  function submitForm(action: (formData: FormData) => Promise<unknown>) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submit(action, new FormData(event.currentTarget), event.currentTarget);
    };
  }

  function archiveSequence(sequence: Sequence) {
    if (sequence.activeCampaignCount > 0 && !window.confirm(dependencyWarning)) return;
    const formData = new FormData();
    formData.set("sequence_id", sequence.id);
    if (sequence.activeCampaignCount > 0) formData.set("confirmAssignedArchive", "true");
    submit(archiveSequenceAction, formData);
  }

  function archiveStep(step: SequenceStep) {
    const formData = new FormData();
    formData.set("step_id", step.id);
    formData.set("sequence_id", step.sequence_id);
    submit(archiveSequenceStepAction, formData);
  }

  function toggleSequence(sequence: Sequence) {
    const formData = new FormData();
    formData.set("sequence_id", sequence.id);
    formData.set("name", sequence.name);
    formData.set("description", sequence.description ?? "");
    formData.set("band", sequence.band ?? "B");
    formData.set("active", sequence.active ? "false" : "true");
    formData.set("archived", sequence.archived ? "true" : "false");
    submit(updateSequenceAction, formData);
  }

  return (
    <div className="grid gap-6">
      <FormError message={error} />
      <section className="panel">
        <div className="panel-header"><h2>Create sequence</h2></div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submitForm(createSequenceAction)}>
            <label>
              <span>Name</span>
              <input name="name" required placeholder="Band B standard follow-up" />
            </label>
            <label>
              <span>Band</span>
              <CrmSelect
                name="band"
                defaultValue="B"
                options={[
                  { value: "A", label: "Band A" },
                  { value: "B", label: "Band B" },
                  { value: "C", label: "Band C" }
                ]}
              />
            </label>
            <label className="form-span-2">
              <span>Description</span>
              <textarea name="description" rows={3} placeholder="Internal usage notes for this sequence." />
            </label>
            <input type="hidden" name="active" value="false" />
            <input type="hidden" name="archived" value="false" />
            <div className="self-end">
              <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Create sequence"}</Button>
            </div>
          </form>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Sequence library</h2>
          <span className="muted">{sequences.length} sequences</span>
        </div>
        <div className="panel-body grid gap-4">
          {sequences.map((sequence) => {
            const steps = sequence.outreach_steps ?? [];
            const visibleSteps = steps.filter((step) => !step.archived);
            return (
              <article key={sequence.id} className="record-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-white">{sequence.name}</h3>
                      <Badge tone={statusTone(sequence)}>{statusLabel(sequence)}</Badge>
                      <Badge tone="info">{sequence.band ?? "--"}</Badge>
                    </div>
                    <p className="muted mt-2">{sequence.description ?? "No description"}</p>
                    {sequence.activeCampaignCount > 0 ? (
                      <p className="mt-2 text-sm text-amber-300">{sequence.activeCampaignCount} active campaign assignment(s)</p>
                    ) : null}
                  </div>
                  <div className="button-row">
                    {!sequence.archived ? (
                      <Button type="button" variant="secondary" disabled={isPending} onClick={() => toggleSequence(sequence)}>
                        {sequence.active ? "Deactivate" : "Activate"}
                      </Button>
                    ) : null}
                    {!sequence.archived ? (
                      <Button type="button" variant="danger" disabled={isPending} onClick={() => archiveSequence(sequence)}>
                        Archive
                      </Button>
                    ) : null}
                  </div>
                </div>

                <details className="mt-4">
                  <summary className="ui-button ui-button-secondary w-fit cursor-pointer">Edit sequence</summary>
                  <form className="form mt-4" onSubmit={submitForm(updateSequenceAction)}>
                    <input type="hidden" name="sequence_id" value={sequence.id} />
                    <div className="form-grid">
                      <label>
                        <span>Name</span>
                        <input name="name" required defaultValue={sequence.name} />
                      </label>
                      <label>
                        <span>Band</span>
                        <CrmSelect
                          name="band"
                          defaultValue={sequence.band ?? "B"}
                          options={[
                            { value: "A", label: "Band A" },
                            { value: "B", label: "Band B" },
                            { value: "C", label: "Band C" }
                          ]}
                        />
                      </label>
                      <label>
                        <span>State</span>
                        <CrmSelect
                          name="active"
                          defaultValue={sequence.active ? "true" : "false"}
                          options={[
                            { value: "true", label: "Active" },
                            { value: "false", label: "Inactive" }
                          ]}
                        />
                      </label>
                      <label>
                        <span>Archive flag</span>
                        <CrmSelect
                          name="archived"
                          defaultValue={sequence.archived ? "true" : "false"}
                          options={[
                            { value: "false", label: "Not archived" },
                            { value: "true", label: "Archived" }
                          ]}
                        />
                      </label>
                      <label className="form-span-2">
                        <span>Description</span>
                        <textarea name="description" rows={3} defaultValue={sequence.description ?? ""} />
                      </label>
                    </div>
                    <Button type="submit" variant="secondary" disabled={isPending}>Save sequence</Button>
                  </form>
                </details>

                <div className="mt-5 grid gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-white">Steps</h4>
                    <span className="muted">{visibleSteps.length} active/history-visible step(s)</span>
                  </div>
                  <form className="form-grid" onSubmit={submitForm(createSequenceStepAction)}>
                    <input type="hidden" name="sequence_id" value={sequence.id} />
                    <input type="hidden" name="active" value="true" />
                    <label>
                      <span>Step</span>
                      <input name="step_number" type="number" min="1" required defaultValue={visibleSteps.length + 1} />
                    </label>
                    <label>
                      <span>Delay days</span>
                      <input name="delay_days" type="number" min="0" required defaultValue="0" />
                    </label>
                    <label>
                      <span>Template type</span>
                      <input name="template_type" placeholder="initial_email" />
                    </label>
                    <label>
                      <span>Prompt guidance</span>
                      <input name="prompt_guidance" placeholder="Mention the lead's strongest workflow gap." />
                    </label>
                    <div className="self-end">
                      <Button type="submit" variant="secondary" disabled={isPending}>Add step</Button>
                    </div>
                  </form>

                  <div className="grid gap-3">
                    {visibleSteps.map((step) => (
                      <details key={step.id} className="record-card bg-black/20">
                        <summary className="cursor-pointer">
                          Step {step.step_number} - {step.delay_days}d - {step.template_type ?? step.prompt_guidance ?? "No template"}
                          {step.active ? null : <span className="muted"> - inactive</span>}
                        </summary>
                        <form className="form mt-4" onSubmit={submitForm(updateSequenceStepAction)}>
                          <input type="hidden" name="step_id" value={step.id} />
                          <input type="hidden" name="sequence_id" value={sequence.id} />
                          <div className="form-grid">
                            <label>
                              <span>Step number</span>
                              <input name="step_number" type="number" min="1" required defaultValue={step.step_number} />
                            </label>
                            <label>
                              <span>Delay days</span>
                              <input name="delay_days" type="number" min="0" required defaultValue={step.delay_days} />
                            </label>
                            <label>
                              <span>Template type</span>
                              <input name="template_type" defaultValue={step.template_type ?? ""} />
                            </label>
                            <label>
                              <span>Active</span>
                              <CrmSelect
                                name="active"
                                defaultValue={step.active ? "true" : "false"}
                                options={[
                                  { value: "true", label: "Active" },
                                  { value: "false", label: "Inactive" }
                                ]}
                              />
                            </label>
                            <label className="form-span-2">
                              <span>Prompt guidance</span>
                              <textarea name="prompt_guidance" rows={3} defaultValue={step.prompt_guidance ?? ""} />
                            </label>
                          </div>
                          <div className="button-row">
                            <Button type="submit" variant="secondary" disabled={isPending}>Save step</Button>
                            <Button type="button" variant="danger" disabled={isPending} onClick={() => archiveStep(step)}>
                              Archive step
                            </Button>
                          </div>
                        </form>
                      </details>
                    ))}
                    {visibleSteps.length === 0 ? <p className="muted">No active or editable steps. Add a step before activating this sequence.</p> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
