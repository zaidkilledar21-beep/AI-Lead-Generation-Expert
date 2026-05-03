"use client";

import { useState, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createCampaign } from "./actions";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, CheckCircle2, Rocket, Target, Settings, Info, AlertCircle } from "lucide-react";
import { z } from "zod";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button 
      className="ui-button ui-button-primary px-8 h-12 text-base font-bold shadow-brand/30 shadow-lg w-full md:w-auto" 
      type="submit" 
      disabled={pending}
    >
      {pending ? (
        <span className="flex items-center gap-2 animate-pulse">Launching...</span>
      ) : (
        <span className="flex items-center gap-2"><Rocket className="w-5 h-5" /> Launch Campaign</span>
      )}
    </button>
  );
}

const STEPS = [
  { id: 1, title: "Core Details", icon: Info },
  { id: 2, title: "Targeting", icon: Target },
  { id: 3, title: "Scoring & Sequences", icon: CheckCircle2 },
  { id: 4, title: "Automation & Limits", icon: Settings },
  { id: 5, title: "Review & Launch", icon: Rocket }
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

export function CreateCampaignForm() {
  const [state, action] = useFormState(createCampaign, { error: null as string | null });
  const [currentStep, setCurrentStep] = useState(1);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Basic validation before advancing
  const handleNext = () => {
    if (formRef.current) {
      setValidationError(null);
      // Trigger HTML5 validation for inputs in the current view
      const inputs = formRef.current.querySelectorAll(`[data-step="${currentStep}"] input[required], [data-step="${currentStep}"] select[required], [data-step="${currentStep}"] textarea[required]`);
      let isValid = true;
      inputs.forEach((input) => {
        if (!(input as HTMLInputElement).checkValidity()) {
          (input as HTMLInputElement).reportValidity();
          isValid = false;
        }
      });

      if (isValid) {
        if (currentStep === 4) {
          // On last step before review, validate with Zod and generate preview data
          const formData = new FormData(formRef.current);
          const data = {
            name: formData.get("name") as string,
            status: formData.get("status") as string,
            primary_niche: formData.get("primary_niche") as string,
            target_countries: formData.get("target_countries") as string,
            run_frequency: formData.get("run_frequency") as string,
            max_leads_per_run: formData.get("max_leads_per_run") as string,
            lead_source: formData.get("lead_source") as string,
          };
          
          const result = previewSchema.safeParse(data);
          if (!result.success) {
            setValidationError(result.error.issues[0].message);
            return;
          }
          setPreviewData(result.data);
        }
        
        setCurrentStep(s => Math.min(STEPS.length, s + 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrev = () => {
    setValidationError(null);
    setCurrentStep(s => Math.max(1, s - 1));
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
        <form action={action} ref={formRef} className="form">
          <input name="timezone" type="hidden" value="Asia/Karachi" />
          
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
                    <input name="name" required placeholder="Dubai Dental Clinics - May" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Status</span>
                    <select name="status" defaultValue="draft" className="field cursor-pointer">
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </select>
                  </label>
                  <label className="field-group col-span-2 md:col-span-1 lg:col-span-2">
                    <span className="field-label">Description</span>
                    <textarea name="description" rows={3} placeholder="Internal notes, campaign intent, exclusions." className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Assigned inbox</span>
                    <input name="assigned_inbox_id" placeholder="Inbox UUID or leave blank" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Internal tags</span>
                    <input name="tags" placeholder="e.g. Q2 push, high priority" className="field" />
                  </label>
                  <label className="field-group col-span-2 md:col-span-1 lg:col-span-2">
                    <span className="field-label">Notes</span>
                    <textarea name="notes" rows={2} placeholder="Anything the founders need to remember about this campaign." className="field" />
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
                    <input name="primary_niche" required placeholder="Dental Clinics" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Lead source</span>
                    <select name="lead_source" defaultValue="google_maps" className="field cursor-pointer">
                      <option value="google_maps">Google Maps</option>
                      <option value="google_search">Google Search</option>
                      <option value="directory">Directory</option>
                      <option value="manual_import">Manual Import</option>
                    </select>
                  </label>
                  <label className="field-group col-span-2 md:col-span-1 lg:col-span-2">
                    <span className="field-label">Niche keywords</span>
                    <textarea name="niche_keywords" rows={2} placeholder={"dentist\ndental surgery\northodontist"} className="field" />
                  </label>
                  <label className="field-group col-span-2 md:col-span-1 lg:col-span-2">
                    <span className="field-label">Target countries *</span>
                    <textarea name="target_countries" rows={2} required placeholder={"UAE\nSaudi Arabia"} className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Target cities</span>
                    <textarea name="target_cities" rows={3} placeholder={"Dubai\nAbu Dhabi"} className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Exclude cities</span>
                    <textarea name="exclude_cities" rows={3} placeholder="Sharjah" className="field" />
                  </label>
                  <label className="field-group col-span-2 md:col-span-1 lg:col-span-2">
                    <span className="field-label">Business languages</span>
                    <input name="language_of_business" placeholder="English, Arabic" className="field" />
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
                    <input name="min_score_band_a" type="number" min="0" max="100" defaultValue="76" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Sequence for Band A</span>
                    <input name="sequence_band_a" placeholder="UUID or leave blank" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Min score for Band B</span>
                    <input name="min_score_band_b" type="number" min="0" max="100" defaultValue="51" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Sequence for Band B</span>
                    <input name="sequence_band_b" placeholder="UUID or leave blank" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Sequence for Band C</span>
                    <input name="sequence_band_c" placeholder="UUID or leave blank" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Confidence required</span>
                    <select name="confidence_required" defaultValue="medium" className="field cursor-pointer">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>

                  <div className="col-span-2 md:col-span-1 lg:col-span-2 mt-4">
                    <h3 className="text-sm font-semibold mb-3 text-brand-light">Granular Scoring Thresholds</h3>
                  </div>
                  
                  <label className="field-group">
                    <span className="field-label">Min Google rating</span>
                    <input name="min_google_rating" type="number" min="0" max="5" step="0.1" defaultValue="3.5" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Min review count</span>
                    <input name="min_review_count" type="number" min="0" defaultValue="5" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Min automation opportunity</span>
                    <input name="min_automation_opportunity" type="number" min="0" max="20" defaultValue="13" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Min ability to pay</span>
                    <input name="min_ability_to_pay" type="number" min="0" max="15" defaultValue="9" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Min reachability</span>
                    <input name="min_reachability" type="number" min="0" max="10" defaultValue="6" className="field" />
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
                    <select name="run_frequency" defaultValue="manual" className="field cursor-pointer">
                      <option value="manual">Manual</option>
                      <option value="daily">Daily</option>
                      <option value="every_3_days">Every 3 days</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </label>
                  <label className="field-group">
                    <span className="field-label">Next scheduled run</span>
                    <input name="next_run_at" type="datetime-local" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Max leads per run</span>
                    <input name="max_leads_per_run" type="number" min="1" max="1000" defaultValue="100" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Max candidates/day</span>
                    <input name="max_candidates_per_day" type="number" min="1" max="75" defaultValue="75" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Max Places details calls/day</span>
                    <input name="max_details_calls_per_day" type="number" min="1" max="100" defaultValue="100" className="field" />
                  </label>
                  <label className="field-group">
                    <span className="field-label">Max total Places calls/day</span>
                    <input name="max_total_places_calls_per_day" type="number" min="1" max="150" defaultValue="150" className="field" />
                  </label>
                </div>

                <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                  <h3 className="text-sm font-semibold mb-4 text-white/80">Operational Flags</h3>
                  <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input name="exclude_chains" type="checkbox" className="w-4 h-4 accent-brand rounded border-white/20" />
                    <span className="text-sm">Exclude chains & franchises</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input name="exclude_already_discovered" type="checkbox" defaultChecked className="w-4 h-4 accent-brand rounded border-white/20" />
                    <span className="text-sm">Exclude already discovered leads globally</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input name="auto_approve_band_b" type="checkbox" className="w-4 h-4 accent-brand rounded border-white/20" />
                    <span className="text-sm">Auto-approve Band B leads</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input name="require_approval_band_a" type="checkbox" defaultChecked className="w-4 h-4 accent-brand rounded border-white/20" />
                    <span className="text-sm">Require manual approval for Band A</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input name="crawl_website" type="checkbox" defaultChecked className="w-4 h-4 accent-brand rounded border-white/20" />
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
                  <h2 className="text-xl font-bold">Review & Launch</h2>
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
                    <h3 className="text-lg font-bold text-white">Ready to Deploy</h3>
                    <p className="text-brand-light/80 text-sm max-w-md mx-auto mt-2">
                      The campaign parameters have been validated. Once launched, the ingestion engine will immediately begin execution if status is active.
                    </p>
                  </div>
                </div>

                {state?.error ? (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-3">
                    <Info className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{state.error}</p>
                  </div>
                ) : null}

                {validationError ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-4 rounded-lg mb-6 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{validationError}</p>
                  </div>
                ) : null}

                <div className="flex justify-center">
                  <SubmitButton />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mt-12 pt-6 border-t border-white/10">
            <button 
              type="button" 
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="ui-button ui-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            
            {currentStep < STEPS.length && (
              <button 
                type="button" 
                onClick={handleNext}
                className="ui-button bg-white text-black hover:bg-gray-200 shadow-lg"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
