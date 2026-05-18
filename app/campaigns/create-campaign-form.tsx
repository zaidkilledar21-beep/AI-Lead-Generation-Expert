"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { useFormState } from "react-dom";
import { createCampaign } from "./actions";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, CheckCircle2, Rocket, Target, Settings, Info, AlertCircle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CrmDateField } from "@/components/ui/crm-date-field";
import { CrmSelect } from "@/components/ui/crm-select";
import { toBandSequenceOptions, toInboxOptions } from "./select-options";

function SubmitButton({ pending }: Readonly<{ pending: boolean }>) {
  return (
    <button 
      className="ui-button ui-button-primary px-8 h-12 text-base font-bold shadow-brand/30 shadow-lg w-full md:w-auto" 
      type="submit" 
      disabled={pending}
    >
      {pending ? (
        <span className="flex items-center gap-2 animate-pulse">Saving...</span>
      ) : (
        <span className="flex items-center gap-2"><Rocket className="w-5 h-5" /> Save Campaign</span>
      )}
    </button>
  );
}

const STEPS = [
  { id: 1, title: "Core Details", icon: Info },
  { id: 2, title: "Targeting", icon: Target },
  { id: 3, title: "Scoring & Sequences", icon: CheckCircle2 },
  { id: 4, title: "Automation & Limits", icon: Settings },
  { id: 5, title: "Review & Save", icon: Rocket }
];

const previewSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  status: z.string(),
  primary_niche: z.string().min(1, "Primary niche is required"),
  target_countries: z.string().min(1, "Target countries are required"),
  run_frequency: z.string(),
  max_leads_per_run: z.string(),
  lead_source: z.string(),
});

type PreviewData = z.infer<typeof previewSchema>;

type CampaignWizardState = {
  name: string;
  status: string;
  description: string;
  assigned_inbox_id: string;
  tags: string;
  notes: string;
  primary_niche: string;
  lead_source: string;
  niche_keywords: string;
  target_countries: string;
  target_cities: string;
  exclude_cities: string;
  language_of_business: string;
  min_score_band_a: string;
  sequence_band_a: string;
  min_score_band_b: string;
  sequence_band_b: string;
  sequence_band_c: string;
  confidence_required: string;
  min_google_rating: string;
  min_review_count: string;
  min_automation_opportunity: string;
  min_ability_to_pay: string;
  min_reachability: string;
  run_frequency: string;
  next_run_at: string;
  max_leads_per_run: string;
  max_candidates_per_day: string;
  max_details_calls_per_day: string;
  max_total_places_calls_per_day: string;
  exclude_chains: boolean;
  exclude_already_discovered: boolean;
  auto_approve_band_b: boolean;
  require_approval_band_a: boolean;
  crawl_website: boolean;
  timezone: string;
};

const initialCampaignState: CampaignWizardState = {
  name: "",
  status: "draft",
  description: "",
  assigned_inbox_id: "",
  tags: "",
  notes: "",
  primary_niche: "",
  lead_source: "google_places",
  niche_keywords: "",
  target_countries: "",
  target_cities: "",
  exclude_cities: "",
  language_of_business: "",
  min_score_band_a: "76",
  sequence_band_a: "",
  min_score_band_b: "51",
  sequence_band_b: "",
  sequence_band_c: "",
  confidence_required: "medium",
  min_google_rating: "3.5",
  min_review_count: "5",
  min_automation_opportunity: "13",
  min_ability_to_pay: "9",
  min_reachability: "6",
  run_frequency: "manual",
  next_run_at: "",
  max_leads_per_run: "100",
  max_candidates_per_day: "75",
  max_details_calls_per_day: "100",
  max_total_places_calls_per_day: "150",
  exclude_chains: false,
  exclude_already_discovered: true,
  auto_approve_band_b: false,
  require_approval_band_a: true,
  crawl_website: true,
  timezone: "Asia/Karachi"
};

const textFieldNames = [
  "name",
  "status",
  "description",
  "assigned_inbox_id",
  "tags",
  "notes",
  "primary_niche",
  "lead_source",
  "niche_keywords",
  "target_countries",
  "target_cities",
  "exclude_cities",
  "language_of_business",
  "min_score_band_a",
  "sequence_band_a",
  "min_score_band_b",
  "sequence_band_b",
  "sequence_band_c",
  "confidence_required",
  "min_google_rating",
  "min_review_count",
  "min_automation_opportunity",
  "min_ability_to_pay",
  "min_reachability",
  "run_frequency",
  "next_run_at",
  "max_leads_per_run",
  "max_candidates_per_day",
  "max_details_calls_per_day",
  "max_total_places_calls_per_day",
  "timezone"
] as const;

const booleanFieldNames = [
  "exclude_chains",
  "exclude_already_discovered",
  "auto_approve_band_b",
  "require_approval_band_a",
  "crawl_website"
] as const;

type TextFieldName = (typeof textFieldNames)[number];
type BooleanFieldName = (typeof booleanFieldNames)[number];

function buildCampaignFormData(values: CampaignWizardState) {
  const formData = new FormData();
  textFieldNames.forEach((field) => formData.set(field, values[field]));
  booleanFieldNames.forEach((field) => formData.set(field, values[field] ? "on" : "off"));
  return formData;
}

function toPreviewData(values: CampaignWizardState): PreviewData {
  return {
    name: values.name,
    status: values.status,
    primary_niche: values.primary_niche,
    target_countries: values.target_countries,
    run_frequency: values.run_frequency,
    max_leads_per_run: values.max_leads_per_run,
    lead_source: values.lead_source
  };
}

function positiveIntegerInRange(value: string, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

function numberInRange(value: string, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max;
}

function validateStep(step: number, values: CampaignWizardState): string | null {
  if (step === 1) {
    if (!values.name.trim()) return "Campaign name is required.";
    return null;
  }

  if (step === 2) {
    if (!values.primary_niche.trim()) return "Primary niche is required.";
    if (!values.target_countries.trim()) return "Target countries are required.";
    if (!values.lead_source.trim()) return "Lead source is required.";
    return null;
  }

  if (step === 3) {
    if (!numberInRange(values.min_score_band_a, 0, 100)) return "Min score for Band A must be between 0 and 100.";
    if (!numberInRange(values.min_score_band_b, 0, 100)) return "Min score for Band B must be between 0 and 100.";
    if (Number(values.min_score_band_b) > Number(values.min_score_band_a)) return "Min score for Band B cannot exceed Band A.";
    if (!numberInRange(values.min_google_rating, 0, 5)) return "Min Google rating must be between 0 and 5.";
    if (!numberInRange(values.min_review_count, 0, Number.MAX_SAFE_INTEGER)) return "Min review count must be zero or greater.";
    if (!numberInRange(values.min_automation_opportunity, 0, 20)) return "Min automation opportunity must be between 0 and 20.";
    if (!numberInRange(values.min_ability_to_pay, 0, 15)) return "Min ability to pay must be between 0 and 15.";
    if (!numberInRange(values.min_reachability, 0, 10)) return "Min reachability must be between 0 and 10.";
    return null;
  }

  if (step === 4) {
    if (!values.run_frequency.trim()) return "Run frequency is required.";
    if (!positiveIntegerInRange(values.max_leads_per_run, 1, 1000)) return "Max leads per run must be between 1 and 1000.";
    if (!positiveIntegerInRange(values.max_candidates_per_day, 1, 75)) return "Max candidates per day must be between 1 and 75.";
    if (!positiveIntegerInRange(values.max_details_calls_per_day, 1, 100)) return "Max Places details calls per day must be between 1 and 100.";
    if (!positiveIntegerInRange(values.max_total_places_calls_per_day, 1, 150)) return "Max total Places calls per day must be between 1 and 150.";
    return null;
  }

  return [1, 2, 3, 4].map((stepNumber) => validateStep(stepNumber, values)).find(Boolean) ?? null;
}

export function CreateCampaignForm({
  sequences = [],
  inboxes = [],
  profiles = []
}: Readonly<{
  sequences?: Array<{ id: string; name?: string | null; band?: string | null; active?: boolean }>;
  inboxes?: Array<{ id: string; email_address?: string | null; provider?: string | null; active?: boolean }>;
  profiles?: Array<{ user_id: string }>;
}>) {
  const [state, action] = useFormState(createCampaign, { error: null as string | null });
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState(1);
  const [formValues, setFormValues] = useState<CampaignWizardState>(initialCampaignState);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const activeInboxes = inboxes.filter((inbox) => inbox.active === true);
  const activeSequences = sequences.filter((sequence) => sequence.active === true);
  const inboxOptions = toInboxOptions(activeInboxes);
  const bandAOptions = toBandSequenceOptions(activeSequences, "A");
  const bandBOptions = toBandSequenceOptions(activeSequences, "B");
  const bandCOptions = toBandSequenceOptions(activeSequences, "C");
  const updateField = (name: TextFieldName, value: string) => {
    setFormValues((current) => ({ ...current, [name]: value }));
    setValidationError(null);
  };

  const updateTextInput = (name: TextFieldName) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateField(name, event.target.value);
  };

  const updateBooleanField = (name: BooleanFieldName) => (event: ChangeEvent<HTMLInputElement>) => {
    setFormValues((current) => ({ ...current, [name]: event.target.checked }));
    setValidationError(null);
  };

  const handleNext = () => {
    setValidationError(null);
    const error = validateStep(currentStep, formValues);
    if (error) {
      setValidationError(error);
      return;
    }

    if (currentStep === 4) {
      const result = previewSchema.safeParse(toPreviewData(formValues));
      if (!result.success) {
        setValidationError(result.error.issues[0].message);
        return;
      }
      setPreviewData(result.data);
    }

    setCurrentStep((step) => Math.min(STEPS.length, step + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrev = () => {
    setValidationError(null);
    setCurrentStep(s => Math.max(1, s - 1));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    const error = validateStep(5, formValues);
    if (error) {
      setValidationError(error);
      return;
    }

    const result = previewSchema.safeParse(toPreviewData(formValues));
    if (!result.success) {
      setValidationError(result.error.issues[0].message);
      return;
    }

    setPreviewData(result.data);
    setValidationError(null);
    const formData = buildCampaignFormData(formValues);
    startTransition(() => {
      action(formData);
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Wizard Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/5 rounded-full z-0" />
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand rounded-full z-0 transition-all duration-500 ease-in-out"
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          />
          
          {STEPS.map((step) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  currentStep >= step.id 
                    ? "bg-brand text-white shadow-lg shadow-brand/30 border-2 border-brand-light" 
                    : "bg-neutral-bg3 text-muted border-2 border-white/10"
                }`}
              >
                <step.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider absolute -bottom-6 w-max text-center ${
                currentStep >= step.id ? "text-white" : "text-muted"
              }`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel mt-16 p-6 md:p-8">
        <form onSubmit={handleSubmit} className="form">
          
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div 
                key="step1" data-step="1"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-white/10 pb-4 mb-6">
                  <h2 className="text-xl font-bold">Core Details</h2>
                  <p className="text-muted text-sm mt-1">Define the fundamental identity of this campaign.</p>
                </div>
                
                <div className="form-grid">
                  <label className="field-group">
                    <span className="field-label">Campaign name *</span>
                    <input name="name" required value={formValues.name} onChange={updateTextInput("name")} placeholder="Dubai Dental Clinics - May" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Status</span>
                    <CrmSelect
                      name="status"
                      defaultValue={formValues.status}
                      onValueChange={(value) => updateField("status", value)}
                      options={[
                        { value: "draft", label: "Draft", description: "Save configuration without running discovery." },
                        { value: "active", label: "Active", description: "Active campaigns are eligible for scheduled or manual n8n discovery runs." },
                        { value: "paused", label: "Paused", description: "Keep the configuration but block execution." }
                      ]}
                    />
                  </label>
                  <label className="field-group col-span-2 md:col-span-1 lg:col-span-2">
                    <span className="field-label">Description</span>
                    <textarea name="description" rows={3} value={formValues.description} onChange={updateTextInput("description")} placeholder="Internal notes, campaign intent, exclusions." className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Assigned inbox</span>
                    <CrmSelect
                      name="assigned_inbox_id"
                      defaultValue={formValues.assigned_inbox_id}
                      onValueChange={(value) => updateField("assigned_inbox_id", value)}
                      placeholder="No fixed inbox"
                      emptyState="No sender inboxes configured."
                      options={inboxOptions}
                    />
                    {inboxOptions.length === 0 ? <p className="text-xs text-white/45">No sender inboxes configured. Add and activate one in Settings before locking campaign delivery.</p> : null}
                  </label>
                  <label className="field-group">
                    <span className="field-label">Internal tags</span>
                    <input name="tags" value={formValues.tags} onChange={updateTextInput("tags")} placeholder="e.g. Q2 push, high priority" className="field" />
                  </label>
                  <label className="field-group col-span-2 md:col-span-1 lg:col-span-2">
                    <span className="field-label">Notes</span>
                    <textarea name="notes" rows={2} value={formValues.notes} onChange={updateTextInput("notes")} placeholder="Anything the founders need to remember about this campaign." className="field" />
                  </label>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div 
                key="step2" data-step="2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-white/10 pb-4 mb-6">
                  <h2 className="text-xl font-bold">Targeting Parameters</h2>
                  <p className="text-muted text-sm mt-1">Configure where and who the agents should look for.</p>
                </div>

                <div className="form-grid">
                  <label className="field-group">
                    <span className="field-label">Primary niche *</span>
                    <input name="primary_niche" required value={formValues.primary_niche} onChange={updateTextInput("primary_niche")} placeholder="Dental Clinics" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Lead source</span>
                    <CrmSelect
                      name="lead_source"
                      defaultValue={formValues.lead_source}
                      onValueChange={(value) => updateField("lead_source", value)}
                      options={[
                        { value: "google_places", label: "Google Places", description: "Primary source for local business discovery." },
                        { value: "manual_import", label: "Manual Import", description: "Reserved for uploaded or hand-curated leads." }
                      ]}
                    />
                  </label>
                  <label className="field-group col-span-2 md:col-span-1 lg:col-span-2">
                    <span className="field-label">Niche keywords</span>
                    <textarea name="niche_keywords" rows={2} value={formValues.niche_keywords} onChange={updateTextInput("niche_keywords")} placeholder={"dentist\ndental surgery\northodontist"} className="field" />
                  </label>
                  <label className="field-group col-span-2 md:col-span-1 lg:col-span-2">
                    <span className="field-label">Target countries *</span>
                    <textarea name="target_countries" rows={2} required value={formValues.target_countries} onChange={updateTextInput("target_countries")} placeholder={"UAE\nSaudi Arabia"} className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Target cities</span>
                    <textarea name="target_cities" rows={3} value={formValues.target_cities} onChange={updateTextInput("target_cities")} placeholder={"Dubai\nAbu Dhabi"} className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Exclude cities</span>
                    <textarea name="exclude_cities" rows={3} value={formValues.exclude_cities} onChange={updateTextInput("exclude_cities")} placeholder="Sharjah" className="field" />
                  </label>
                  <label className="field-group col-span-2 md:col-span-1 lg:col-span-2">
                    <span className="field-label">Business languages</span>
                    <input name="language_of_business" value={formValues.language_of_business} onChange={updateTextInput("language_of_business")} placeholder="English, Arabic" className="field" />
                  </label>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div 
                key="step3" data-step="3"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-white/10 pb-4 mb-6">
                  <h2 className="text-xl font-bold">Scoring & Sequences</h2>
                  <p className="text-muted text-sm mt-1">Define how leads are qualified and which sequences they receive.</p>
                </div>

                <div className="form-grid">
                  <label className="field-group">
                    <span className="field-label">Min score for Band A</span>
                    <input name="min_score_band_a" type="number" min="0" max="100" value={formValues.min_score_band_a} onChange={updateTextInput("min_score_band_a")} className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Sequence for Band A</span>
                    <CrmSelect
                      name="sequence_band_a"
                      defaultValue={formValues.sequence_band_a}
                      onValueChange={(value) => updateField("sequence_band_a", value)}
                      placeholder="Default workflow routing"
                      emptyState="No active Band A sequences found."
                      options={bandAOptions}
                    />
                    {bandAOptions.length === 0 ? <p className="text-xs text-white/45">No active sequences found. Activate at least one outreach sequence to assign Band A routing.</p> : null}
                  </label>
                  <label className="field-group">
                    <span className="field-label">Min score for Band B</span>
                    <input name="min_score_band_b" type="number" min="0" max="100" value={formValues.min_score_band_b} onChange={updateTextInput("min_score_band_b")} className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Sequence for Band B</span>
                    <CrmSelect
                      name="sequence_band_b"
                      defaultValue={formValues.sequence_band_b}
                      onValueChange={(value) => updateField("sequence_band_b", value)}
                      placeholder="Default workflow routing"
                      emptyState="No active Band B sequences found."
                      options={bandBOptions}
                    />
                    {bandBOptions.length === 0 ? <p className="text-xs text-white/45">No active sequences found. Activate at least one outreach sequence to assign Band B routing.</p> : null}
                  </label>
                  <label className="field-group">
                    <span className="field-label">Sequence for Band C</span>
                    <CrmSelect
                      name="sequence_band_c"
                      defaultValue={formValues.sequence_band_c}
                      onValueChange={(value) => updateField("sequence_band_c", value)}
                      placeholder="Default workflow routing"
                      emptyState="No active Band C sequences found."
                      options={bandCOptions}
                    />
                    {bandCOptions.length === 0 ? <p className="text-xs text-white/45">No active sequences found. Activate at least one outreach sequence to assign Band C routing.</p> : null}
                  </label>
                  <label className="field-group">
                    <span className="field-label">Confidence required</span>
                    <CrmSelect
                      name="confidence_required"
                      defaultValue={formValues.confidence_required}
                      onValueChange={(value) => updateField("confidence_required", value)}
                      options={[
                        { value: "low", label: "Low", description: "Allow lower-confidence candidates through scoring." },
                        { value: "medium", label: "Medium", description: "Balanced default for current workflow." },
                        { value: "high", label: "High", description: "Only admit stronger confidence signals." }
                      ]}
                    />
                  </label>

                  <div className="col-span-2 md:col-span-1 lg:col-span-2 mt-4">
                    <h3 className="text-sm font-semibold mb-3 text-brand-light">Granular Scoring Thresholds</h3>
                  </div>
                  
                  <label className="field-group">
                    <span className="field-label">Min Google rating</span>
                    <input name="min_google_rating" type="number" min="0" max="5" step="0.1" value={formValues.min_google_rating} onChange={updateTextInput("min_google_rating")} className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Min review count</span>
                    <input name="min_review_count" type="number" min="0" value={formValues.min_review_count} onChange={updateTextInput("min_review_count")} className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Min automation opportunity</span>
                    <input name="min_automation_opportunity" type="number" min="0" max="20" value={formValues.min_automation_opportunity} onChange={updateTextInput("min_automation_opportunity")} className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Min ability to pay</span>
                    <input name="min_ability_to_pay" type="number" min="0" max="15" value={formValues.min_ability_to_pay} onChange={updateTextInput("min_ability_to_pay")} className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Min reachability</span>
                    <input name="min_reachability" type="number" min="0" max="10" value={formValues.min_reachability} onChange={updateTextInput("min_reachability")} className="field" />
                  </label>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div 
                key="step4" data-step="4"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-white/10 pb-4 mb-6">
                  <h2 className="text-xl font-bold">Automation & Limits</h2>
                  <p className="text-muted text-sm mt-1">Set velocity constraints and operational flags.</p>
                </div>

                <div className="form-grid mb-8">
                  <label className="field-group">
                    <span className="field-label">Run frequency</span>
                    <CrmSelect
                      name="run_frequency"
                      defaultValue={formValues.run_frequency}
                      onValueChange={(value) => updateField("run_frequency", value)}
                      options={[
                        { value: "manual", label: "Manual", description: "Founders trigger discovery explicitly." },
                        { value: "daily", label: "Daily", description: "Run discovery each day." },
                        { value: "every_3_days", label: "Every 3 days", description: "Reduce volume and pacing pressure." },
                        { value: "weekly", label: "Weekly", description: "Low-frequency discovery cycle." }
                      ]}
                    />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Next scheduled run</span>
                    <CrmDateField name="next_run_at" type="datetime-local" defaultValue={formValues.next_run_at} onChange={(event) => updateField("next_run_at", event.target.value)} placeholder="Select date and time" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Max leads per run</span>
                    <input name="max_leads_per_run" type="number" min="1" max="1000" value={formValues.max_leads_per_run} onChange={updateTextInput("max_leads_per_run")} className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Max candidates/day</span>
                    <input name="max_candidates_per_day" type="number" min="1" max="75" value={formValues.max_candidates_per_day} onChange={updateTextInput("max_candidates_per_day")} className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Max Places details calls/day</span>
                    <input name="max_details_calls_per_day" type="number" min="1" max="100" value={formValues.max_details_calls_per_day} onChange={updateTextInput("max_details_calls_per_day")} className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Max total Places calls/day</span>
                    <input name="max_total_places_calls_per_day" type="number" min="1" max="150" value={formValues.max_total_places_calls_per_day} onChange={updateTextInput("max_total_places_calls_per_day")} className="field" />
                  </label>
                </div>

                <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                  <h3 className="text-sm font-semibold mb-4 text-white/80">Operational Flags</h3>
                  <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input name="exclude_chains" type="checkbox" checked={formValues.exclude_chains} onChange={updateBooleanField("exclude_chains")} className="w-4 h-4 accent-brand rounded border-white/20" />
                    <span className="text-sm">Exclude chains & franchises</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input name="exclude_already_discovered" type="checkbox" checked={formValues.exclude_already_discovered} onChange={updateBooleanField("exclude_already_discovered")} className="w-4 h-4 accent-brand rounded border-white/20" />
                    <span className="text-sm">Exclude already discovered leads globally</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input name="auto_approve_band_b" type="checkbox" checked={formValues.auto_approve_band_b} onChange={updateBooleanField("auto_approve_band_b")} className="w-4 h-4 accent-brand rounded border-white/20" />
                    <span className="text-sm">Auto-approve Band B leads</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input name="require_approval_band_a" type="checkbox" checked={formValues.require_approval_band_a} onChange={updateBooleanField("require_approval_band_a")} className="w-4 h-4 accent-brand rounded border-white/20" />
                    <span className="text-sm">Require manual approval for Band A</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input name="crawl_website" type="checkbox" checked={formValues.crawl_website} onChange={updateBooleanField("crawl_website")} className="w-4 h-4 accent-brand rounded border-white/20" />
                    <span className="text-sm">Deep crawl websites during discovery phase</span>
                  </label>
                </div>
              </motion.div>
            )}

            {currentStep === 5 && (
              <motion.div 
                key="step5" data-step="5"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-white/10 pb-4 mb-6">
                  <h2 className="text-xl font-bold">Review & Save</h2>
                  <p className="text-muted text-sm mt-1">Verify campaign configurations before writing to the database.</p>
                </div>

                {previewData && (
                  <div className="bg-black/30 border border-white/10 rounded-xl p-6 mb-8 backdrop-blur-md">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-brand" /> Run Preview
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-muted">Campaign Name</p>
                        <p className="font-semibold text-white">{previewData.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted">Status</p>
                        <p className="font-semibold text-white capitalize flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${previewData.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                          {previewData.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted">Primary Niche & Source</p>
                        <p className="font-semibold text-white">{previewData.primary_niche} via {previewData.lead_source.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted">Target Regions</p>
                        <p className="font-semibold text-white truncate">{previewData.target_countries.split('\n').join(', ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted">Run Frequency</p>
                        <p className="font-semibold text-white capitalize">{previewData.run_frequency.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted">Max Leads Per Run</p>
                        <p className="font-semibold text-white">{previewData.max_leads_per_run}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-brand/10 border border-brand/20 p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-4 mb-8">
                  <Rocket className="w-12 h-12 text-brand animate-pulse" />
                  <div>
                    <h3 className="text-lg font-bold text-white">Ready to Save</h3>
                    <p className="text-brand-light/80 text-sm max-w-md mx-auto mt-2">
                      Active campaigns are eligible for scheduled or manual n8n discovery runs.
                    </p>
                  </div>
                </div>

                {profiles.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/65">
                    No founder profiles are configured yet. Inbox assignment and ownership surfaces will remain limited until at least one founder profile exists.
                  </div>
                ) : null}

                {state?.error ? (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-3">
                    <Info className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{state.error}</p>
                  </div>
                ) : null}

                <div className="flex justify-center">
                  <SubmitButton pending={isPending} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {validationError ? (
            <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-4 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{validationError}</p>
            </div>
          ) : null}

          <div className="flex items-center justify-between mt-12 pt-6 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            
            {currentStep < STEPS.length && (
              <Button
                type="button"
                onClick={handleNext}
                className="shadow-lg shadow-brand/20"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
