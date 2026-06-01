# Synqro Homepage DESIGN.md v2

**Status:** Final consolidated design source of truth  
**Primary use:** Stitch homepage generation, design review, and later Next.js/Tailwind implementation  
**Brand:** Synqro  
**Domain:** `www.getsynqro.com`  
**Version:** v2 consolidated  

---

## 0. Purpose of this document

This is the single source of truth for the **actual public Synqro homepage**.

It is **not** a concept deck, brand essay, or design-system showcase page. It should be used to guide:

- Stitch homepage generation
- future visual mockups
- public unauthenticated landing-page implementation
- copy refinement
- motion planning
- design QA

The first public page should make Synqro feel credible, premium, technically capable, and clear within the first three seconds.

---

## 1. Brand and conversion goals

### 1.1 Brand category

Synqro is a **founder-led AI automation studio and consultancy**.

Synqro helps agencies, consulting firms, and service-led SMBs turn scattered tools and manual workflows into connected, AI-assisted operating systems.

### 1.2 Core homepage goal

The homepage should convert credibility into action.

A visitor should quickly understand:

1. Synqro helps businesses connect scattered tools and manual workflows.
2. Synqro builds automation systems, AI agents, reporting dashboards, and internal workflow infrastructure.
3. Synqro does not force companies to replace their existing tools.
4. Synqro uses controlled, human-in-the-loop automation where needed.
5. The first step is a **Free Automation Opportunity Assessment**.

### 1.3 Primary audience

Primary audience:

- agencies
- consulting firms
- service-led SMBs
- solo founders
- small businesses
- operators
- senior managers
- growth/revenue leaders
- department leads

The homepage should avoid sounding like it is only for large enterprises or procurement-heavy organizations.

### 1.4 Positioning statement

> Synqro helps service-led SMBs connect their tools, automate repetitive work, and build AI-assisted workflows that improve operations without disrupting the systems they already use.

### 1.5 Conversion philosophy

The website should not make visitors feel they are “spending money on Synqro.”

The website should make visitors feel they are **investing in the operating infrastructure of their own business**.

Use language around:

- cleaner workflows
- fewer manual bottlenecks
- reusable infrastructure
- scalable operating systems
- better team focus
- controlled automation
- systems that continue creating value after deployment

Avoid language that makes the work feel like a cheap task fix.

---

## 2. Design thesis

Synqro should feel like a **Balanced Premium Systems Studio**.

The visual identity should combine:

- Stripe-style systems storytelling
- Linear/Vercel-style technical polish
- premium automation consultancy confidence
- serious technical systems-studio depth

The page should communicate that Synqro is not selling a generic AI tool, a template workflow, or a basic website. Synqro builds durable automation infrastructure around real business workflows.

The central visual metaphor is:

> scattered tools and manual processes becoming a connected operating layer.

Use the public-facing label:

> **Connected Operating Layer**

---

## 3. Visual principles

### 3.1 Clarity before spectacle

The hero must be clear in three seconds. Motion and visual systems should reinforce the message, not obscure it.

### 3.2 Premium restraint

Use precise spacing, subtle borders, controlled motion, and thoughtful contrast. The site should feel expensive without becoming loud.

### 3.3 Technical confidence

Use labeled workflow diagrams, structured cards, status indicators, and system-like layouts. Avoid purely abstract decoration.

### 3.4 Partnership over vendor energy

Synqro should feel like a long-term automation partner, not a one-off freelancer or tool reseller.

### 3.5 Human-controlled AI

AI should be shown as part of a controlled workflow. Highlight human review, approval checkpoints, routing, secure handling, and auditability.

### 3.6 Realistic proof without fake claims

Use representative workflow examples and internal systems language. Do not fabricate client names, testimonials, case studies, logos, or results.

---

## 4. Color system

Use **hex tokens** for Stitch and early implementation. OKLCH conversion can happen later in production if desired.

### 4.1 Core palette

| Token | Hex | Usage |
|---|---:|---|
| `--bg-ink` | `#070A12` | Main dark hero/background |
| `--bg-navy` | `#0D1220` | Dark section background |
| `--surface-dark` | `#121827` | Dark cards and panels |
| `--surface-dark-soft` | `#182033` | Raised dark surfaces |
| `--surface-light` | `#F8FAFC` | Light section background |
| `--surface-light-soft` | `#EEF2F7` | Light cards/subtle panels |
| `--text-primary-dark` | `#F8FAFC` | Primary text on dark |
| `--text-secondary-dark` | `#94A3B8` | Secondary text on dark |
| `--text-primary-light` | `#0F172A` | Primary text on light |
| `--text-secondary-light` | `#475569` | Secondary text on light |
| `--primary-indigo` | `#6D5DF6` | Primary CTA/action |
| `--primary-purple` | `#8251EE` | Brand accent, glow, key paths |
| `--accent-blue` | `#3B82F6` | Secondary action, path highlights |
| `--success` | `#10B981` | Successful workflow states |
| `--review` | `#F59E0B` | Human review/checkpoint states |
| `--error` | `#EF4444` | Error states, sparingly |
| `--border-dark` | `rgba(255,255,255,0.08)` | Dark section borders |
| `--border-light` | `rgba(15,23,42,0.10)` | Light section borders |

### 4.2 Usage rules

- Use dark navy/black for the hero and high-impact technical sections.
- Use clean light sections for readability and trust-building.
- Use indigo/purple for brand paths, CTAs, active states, and important system highlights.
- Use blue for secondary connections and technical hover states.
- Use amber only for human review, checkpoints, or caution states.
- Use green only for successful workflow outcomes.
- Use red rarely and only for error-state mockups, not decorative emphasis.

---

## 5. Typography system

### 5.1 Font direction

Use a clean, modern sans-serif that feels premium and software-native.

Preferred stack:

```css
font-family: Inter, Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Technical labels and small metadata may use:

```css
font-family: "JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

If custom fonts are unavailable in Stitch, use system sans. Do not use overly futuristic fonts.

### 5.2 Type scale

| Element | Desktop | Mobile | Notes |
|---|---:|---:|---|
| Hero headline | 64-84px | 42-52px | Tight line height, max 12 words per line where possible |
| Hero subheadline | 18-21px | 16-18px | Max width 680px |
| Section eyebrow | 12-13px | 11-12px | Mono or uppercase tracking |
| Section headline | 40-56px | 30-38px | Strong but readable |
| Section body | 17-19px | 16px | Avoid dense paragraphs |
| Card title | 20-24px | 18-21px | Strong hierarchy |
| Card body | 15-16px | 15px | Short, practical |
| UI/mockup labels | 11-13px | 10-12px | Mono preferred |
| Button text | 15-16px | 15px | Medium weight |

### 5.3 Copy style rules

Use “we” for most copy.

Use “Synqro” for brand-level statements, section intros, and navigation.

Avoid buzzword-heavy phrasing. Be direct, practical, and confident.

---

## 6. Spacing and layout system

### 6.1 Grid

- Use a 12-column desktop grid.
- Max content width: `1180px-1240px`.
- Standard desktop section padding: `96px-128px` vertical.
- Dense hero vertical padding: `96px top / 80px bottom`, adjusted for viewport.
- Light trust/copy sections should breathe more than the hero.

### 6.2 Density rhythm

The homepage should have this density rhythm:

1. **Hero:** dense, immersive, technical.
2. **Problem:** spacious, sharp, readable.
3. **Services:** structured bento/cards.
4. **AI agents:** technical but controlled.
5. **How it works:** spacious timeline.
6. **Representative workflows:** visual and interactive.
7. **Trust/security:** calm and reassuring.
8. **Founder teaser:** compact, credibility-focused.
9. **CTA/contact:** focused and low friction.
10. **FAQ/footer:** clean and utility-driven.

### 6.3 Radius and shape

Use `8px` radius for:

- cards
- buttons
- form fields
- mockup modules
- visual panels

Avoid overly pill-shaped SaaS buttons except for small tags/chips.

### 6.4 Borders and shadows

Dark sections:

```css
border: 1px solid rgba(255,255,255,0.08);
box-shadow: 0 24px 80px rgba(0,0,0,0.35);
```

Light sections:

```css
border: 1px solid rgba(15,23,42,0.10);
box-shadow: 0 20px 50px rgba(15,23,42,0.08);
```

Use glows sparingly. The page should not look like neon cyberpunk.

---

## 7. Component anatomy

### 7.1 Primary button

Purpose: primary conversion.

Text:

> Request Free Assessment

Style:

- solid indigo/purple background
- white text
- 8px radius
- medium weight
- subtle shadow/glow
- hover: slight lift and brighter border/glow

Avoid:

- huge pill buttons
- animated sparkle effects
- cheap gradient shimmer

### 7.2 Secondary button

Text:

> See How It Works

Style:

- transparent or dark surface
- subtle border
- muted text becoming white/primary on hover
- no aggressive fill

### 7.3 Service card

Each service card should include:

- small eyebrow or icon glyph
- title
- one-sentence outcome
- 2-3 capability chips
- optional mini-flow or node accent

Example anatomy:

```text
Workflow Automation
Connect repetitive tasks across your existing tools so work moves without manual handoffs.
[Approvals] [Notifications] [CRM updates]
```

### 7.4 Workflow example card

Each representative workflow example should include:

- workflow title
- input sources
- process layer
- human checkpoint where relevant
- output/action
- business outcome

Use labels. Avoid abstract icons without explanation.

### 7.5 Mockup card

Mockup cards should look like real software but not imply a real client.

Anatomy:

- top bar with neutral label like `Representative workflow`
- content area with labeled steps
- status pills
- small mono metadata
- subtle connection paths
- no fake company names
- no fake ROI
- no official logos

### 7.6 Founder teaser card

Homepage teaser only.

Each founder card should include:

- initials
- name
- role
- one short credibility line
- link or button: `Meet the founders` / `Learn more about Synqro`

Full bios belong on the About page.

### 7.7 Short homepage form

Fields only:

1. Name
2. Work email
3. Company
4. Workflow to improve

Submit button:

> Request Free Assessment

Helper copy:

> Tell us where your workflows are slowing you down. We’ll help identify practical automation opportunities without forcing you to replace the tools you already use.

Do not include on the homepage short form:

- company website
- tools currently involved
- expected investment range
- timeline

Those belong on the full Contact page.

---

## 8. Motion and interaction system

### 8.1 Motion principles

Motion should feel:

- precise
- calm
- premium
- systems-oriented
- synchronized

Use motion to show workflows becoming clearer. Do not animate just because something exists.

### 8.2 Priority animation zones

High-end custom motion is allowed, but only in key places:

1. Hero transformation visual
2. Representative workflow examples
3. How Synqro works timeline

Other elements should use restrained reveals and hover states.

### 8.3 Hero timing storyboard

The hero must communicate clarity immediately, then reward attention with motion.

| Time | Motion |
|---:|---|
| `0.0s-0.3s` | Headline, subheadline, and CTA are visible immediately. Do not delay the value proposition. |
| `0.3s-0.8s` | Scattered input nodes fade/slide in with labels: `CRM`, `Email Ops`, `Reports`, `Support`, `Manual Tasks`. |
| `0.8s-1.4s` | Sync paths begin drawing toward the center. Paths should feel precise, not chaotic. |
| `1.4s-1.9s` | `Connected Operating Layer` card forms and sharpens in the center/right visual area. |
| `1.9s-2.3s` | `AI Decision` and `Human Review` checkpoints activate. Human Review receives one amber pulse. |
| `2.3s-2.8s` | Output cards resolve: `Synced Record`, `Approved Draft`, `Updated Dashboard`, `Routed Ticket`. |
| `2.8s-3.2s` | Motion settles. Primary CTA receives subtle emphasis only once. |

### 8.4 Hero hover behavior

- Hovering over input nodes should subtly highlight the connected path.
- Hovering over `Human Review` should reveal a small tooltip or detail: `Approval checkpoint before action`.
- Hovering over `Connected Operating Layer` should brighten the primary path by 10-15%, not trigger a large animation.

### 8.5 Scroll motion

- Sections reveal with a small vertical offset and fade.
- Workflow lines draw when entering viewport.
- Cards should stagger by `80-120ms`, not one-by-one forever.
- Avoid dramatic parallax.

### 8.6 Reduced-motion fallback

If `prefers-reduced-motion: reduce` is enabled:

- no animated path drawing
- no pulsing nodes
- no parallax or floating cards
- show the final connected hero state statically
- keep hover color changes only
- preserve all labels and meaning

---

## 9. Accessibility rules

- Maintain strong contrast on dark and light sections.
- Do not rely only on color to communicate state. Use labels like `Review Required`, `Approved`, `Synced`, `Queued`.
- All form fields need visible labels.
- All buttons and links need focus states.
- Motion must respect reduced-motion preferences.
- Hero visual must not be required to understand the offer. The headline and subheadline must stand alone.
- Do not use tiny low-contrast mono text for essential content.

---

## 10. Homepage section-by-section specification

## 10.1 Section 1: Hero

### Purpose

Communicate Synqro’s value proposition within three seconds and make the brand feel premium, technical, and credible.

### Copy

Eyebrow:

> AI automation studio for service-led SMBs

Headline:

> Turn scattered tools and manual workflows into a connected operating system for your business.

Subheadline:

> We help service-led SMBs connect their tools, automate repetitive work, and build AI-assisted workflows that improve operations without disrupting the systems they already use.

Primary CTA:

> Request Free Assessment

Secondary CTA:

> See How It Works

Trust line below CTA:

> Workflow automation, AI agents, reporting systems, and internal operations infrastructure built around your existing tools.

### Visual composition

Use a large animated hero visual: a hybrid system diagram + polished UI card.

Visual labels:

Inputs:

- CRM
- Email Ops
- Reports
- Support
- Manual Tasks

Core:

- Connected Operating Layer
- AI Decision
- Human Review

Outputs:

- Synced Record
- Approved Draft
- Updated Dashboard
- Routed Ticket

### Desktop layout

- Left: headline, subheadline, CTA stack, trust line.
- Right: large hero system visual occupying 45-55% width.
- Background: dark navy/black with subtle grid and radial indigo glow.

### Mobile layout

- Stack headline first.
- CTA visible before visual.
- Hero visual becomes simplified static/low-motion vertical flow.
- Hide nonessential decorative lines but keep labels.

### Motion

Use the timed hero storyboard in Section 8.3.

### Avoid

- abstract unlabeled glowing node art
- fake product screenshots
- official tool logos
- delayed headline reveal
- heavy parallax

---

## 10.2 Section 2: Problem

### Purpose

Make the visitor feel the pain of fragmented workflows without exaggerating.

### Headline

> Your tools are working. The workflow between them is not.

### Body copy

> Most growing teams already have the tools they need. The problem is the manual work between them: copying data, chasing updates, rebuilding reports, drafting follow-ups, and deciding what needs attention next.

### Supporting points

- Leads, requests, and customer conversations get scattered across inboxes, CRMs, spreadsheets, and dashboards.
- Teams lose time translating context from one tool to another.
- Reporting becomes reactive instead of operational.
- AI gets added as another disconnected layer instead of becoming part of the workflow.

### Visual composition

Use a before/after split:

- Before: scattered cards with broken paths.
- After: cleaner pathway flowing toward `Connected Operating Layer`.

### Desktop layout

Light section. Left text, right simplified before/after visual.

### Mobile layout

Text first, then before/after stacked cards.

### Motion

On scroll, scattered cards gently align into a clean path.

### Avoid

- blaming the client
- fearmongering
- fake statistics

---

## 10.3 Section 3: Services

### Purpose

Explain what Synqro builds at a high level.

### Headline

> Automation systems built around the way your business already works.

### Intro copy

> We design and build practical AI-assisted workflows that connect your tools, reduce repetitive work, and give your team clearer operating visibility.

### Four service cards

#### 1. Workflow Automation

> Connect repetitive tasks across your existing tools so work moves without manual handoffs.

Chips:

- Approvals
- Notifications
- CRM updates

#### 2. AI Agents

> Build context-aware agents that classify, summarize, score, draft, route, and trigger approved workflow actions.

Chips:

- AI decisions
- Human review
- Record updates

#### 3. Reporting Dashboards

> Turn scattered operational data into dashboards your team can actually use to manage work.

Chips:

- Power BI
- SQL
- KPI tracking

#### 4. Internal Ops Systems

> Create lightweight backend and database systems that support the processes your team depends on.

Chips:

- Supabase
- Vercel
- Databases

### Desktop layout

Dark section with a 2x2 card grid. Cards should be spacious and not overloaded.

### Mobile layout

Single-column cards.

### Motion

Cards reveal in pairs on desktop, one at a time on mobile.

### Avoid

- listing every tool on the homepage
- vague “AI-powered solutions” copy
- service descriptions that sound like a web agency

---

## 10.4 Section 4: AI agents explanation

### Purpose

Define “AI agents” in Synqro’s context without sounding buzzword-heavy.

### Headline

> AI agents that sit inside the workflow, not outside it.

### Body copy

> We build custom AI agents that understand context, make structured decisions, and trigger approved workflow actions. They can classify requests, summarize conversations, score records, draft responses, route work, and update systems with human review where it matters.

### Visual composition

Use an AI Agent Decision Card mockup.

Example labels:

- Context received
- Classification
- Recommended action
- Confidence
- Human review
- Approved output

### Desktop layout

Dark or mixed section. Text on left, AI Agent Decision Card on right.

### Mobile layout

Text first, then card.

### Motion

Decision card fills step-by-step as user scrolls into view.

### Avoid

- chatbot imagery
- robot icons
- implying AI takes uncontrolled action

---

## 10.5 Section 5: How Synqro works

### Purpose

Show the engagement process and make the service feel structured and low-risk.

### Headline

> From workflow audit to operating infrastructure.

### Body copy

> We start by understanding where work slows down, then map, build, test, and maintain automation systems that fit your team’s existing tools and approval patterns.

### Steps

1. **Discover**  
   Understand your current workflow, tools, bottlenecks, and goals.

2. **Assess**  
   Identify automation opportunities and prioritize practical first wins.

3. **Blueprint**  
   Design the workflow logic, data flow, approvals, and implementation plan.

4. **Build**  
   Create automations, AI agents, dashboards, and backend support systems.

5. **Test & Deploy**  
   Validate edge cases, review outputs, and launch with controlled adoption.

6. **Maintain**  
   Monitor, refine, and expand the system as your business evolves.

### Desktop layout

Light section. Horizontal or staggered timeline with six steps.

### Mobile layout

Vertical timeline.

### Motion

Timeline path draws as user scrolls. Current step highlights softly.

### Avoid

- overcomplicated consulting jargon
- making the process feel slow or bureaucratic

---

## 10.6 Section 6: Representative workflow examples

### Purpose

Show concrete automation patterns without pretending they are client case studies.

### Headline

> Representative workflows we can build around your operations.

### Intro copy

> These are example workflow patterns, not fake case studies. Each one shows how Synqro thinks about connecting tools, AI decisions, human review, and measurable outputs.

### Workflow examples

#### 1. CRM lead routing and review

Input:

- new lead
- CRM record
- email context

Process:

- enrich profile
- score fit
- recommend next step

Human checkpoint:

- review priority
- approve outreach path

Output:

- routed lead
- CRM update
- notification

#### 2. Reporting dashboard from scattered sources

Input:

- spreadsheets
- CRM exports
- operational database

Process:

- clean data
- standardize fields
- calculate KPIs

Human checkpoint:

- validate metric definitions

Output:

- reporting dashboard
- refreshable model
- management visibility

#### 3. AI-assisted email draft and approval flow

Input:

- customer context
- CRM notes
- previous messages

Process:

- summarize context
- draft response
- validate tone/rules

Human checkpoint:

- approve or edit before sending

Output:

- approved draft
- logged activity
- follow-up reminder

#### 4. Customer support triage workflow

Input:

- support inbox
- contact form
- existing CRM record

Process:

- classify urgency
- detect intent
- summarize issue
- recommend next action

Human checkpoint:

- review escalation
- approve response
- assign owner

Output:

- routed ticket
- CRM note
- team notification
- dashboard update

### Desktop layout

Dark section with tabs or cards. Each workflow should show a compact visual path.

### Mobile layout

Accordion cards, one workflow per card.

### Motion

When a workflow is selected, input/process/output paths highlight.

### Avoid

- fake client names
- fake before/after metrics
- fake “trusted by” style proof

---

## 10.7 Section 7: Trust and security

### Purpose

Communicate responsible AI implementation and data-handling awareness without claiming certifications.

### Headline

> Automation with control built in.

### Body copy

> Our implementation approach is informed by common security and governance practices, including least-privilege access, data minimization, auditability, secure credential handling, and human-in-the-loop review for sensitive or high-impact actions.

### Adaptability copy

> For clients with specific internal policies, we can map automation design, approval flows, data handling, and documentation to their security, privacy, or compliance requirements.

### Trust cards

1. **Human review where it matters**  
   Approval checkpoints can be built into sensitive workflows before actions are taken.

2. **Secure credential handling**  
   Secrets and access patterns are designed to avoid unsafe sharing and unnecessary exposure.

3. **Least-privilege workflow design**  
   Automations should only access what they need to perform their intended function.

4. **Documentation and handover**  
   Workflows can be documented for continuity, training, and future maintenance.

### Desktop layout

Light or muted section with calm cards and subtle lock/checkpoint visuals.

### Mobile layout

Stacked trust cards.

### Motion

Minimal. Trust sections should feel stable, not flashy.

### Avoid

- saying “ISO certified”
- saying “SOC 2 compliant”
- saying “GDPR compliant” as a blanket claim
- overpromising security posture

---

## 10.8 Section 8: Founder teaser

### Purpose

Show that Synqro is founder-led by operators with relevant experience, without overloading the homepage.

### Headline

> Built by operators, not template sellers.

### Body copy

> Synqro is founder-led by people who have worked inside data systems, reporting workflows, CRM operations, revenue processes, and automation-heavy business environments.

### Founder cards

#### Zaid Killedar

Role:

> Co-founder, Automation & Data Systems

Teaser:

> Leads Synqro’s automation and data systems work, combining BI, SQL, dashboarding, backend workflow design, and automation logic.

#### Uzair Ahmed

Role:

> Co-founder, AI Workflow Strategy & CRM Operations

Teaser:

> Leads Synqro’s AI workflow strategy and CRM operations, with experience across marketing operations, lifecycle email systems, HubSpot RevOps, and revenue workflow design.

CTA:

> Learn more about Synqro

### Desktop layout

Two compact founder cards with initials. Link to About page.

### Mobile layout

Stacked cards.

### Motion

Subtle reveal only.

### Avoid

- full biographies on homepage
- founder photos unless professional photos exist
- overclaiming client results

---

## 10.9 Section 9: Short CTA/contact form

### Purpose

Convert serious visitors into assessment requests with low friction.

### Headline

> Start with a Free Automation Opportunity Assessment.

### Body copy

> Tell us where your workflows are slowing you down. We’ll help identify practical automation opportunities, quick wins, and the systems that could create the most operational leverage for your business.

### Form fields

1. Name
2. Work email
3. Company
4. Workflow to improve

### Submit button

> Request Free Assessment

### Helper copy

> This helps us shape the right first automation investment for your business.

### Form handling note

The form will later send to an n8n webhook and notify:

> uzair@getsynqro.com

### Desktop layout

Dark CTA section. Left: assessment value. Right: compact form card.

### Mobile layout

Text first, form below.

### Motion

Minimal. Form should feel stable and trustworthy.

### Avoid

- long intake form on homepage
- “budget” language
- aggressive scarcity copy
- cheap “free consultation” energy

---

## 10.10 Section 10: FAQ

### Purpose

Remove friction and answer practical questions.

### Layout

Accordion list. Light section or dark muted section.

### FAQ copy

#### What kind of workflows can Synqro automate?

We can help automate workflows across CRM operations, lead handling, reporting, customer support triage, email operations, internal requests, approvals, data syncing, and repetitive admin processes. The best fit is usually a workflow your team repeats often and already manages across multiple tools.

#### Do we need to replace our existing tools?

No. Synqro is designed around the tools your team already uses. We usually focus on connecting systems, reducing manual handoffs, and adding automation or AI-assisted decision points where they create practical value.

#### How does the free assessment work?

We review the workflow you want to improve, understand the tools involved, identify bottlenecks, and outline practical automation opportunities. The goal is to help you understand where automation can create the highest leverage before committing to a build.

#### Can humans review AI-generated actions?

Yes. Human-in-the-loop review is a core part of how we design sensitive workflows. AI can classify, summarize, draft, score, or recommend actions while humans approve important outputs before anything moves forward.

#### What tools do you integrate with?

We can work with CRMs, databases, spreadsheets, reporting tools, email systems, APIs, workflow automation platforms, and custom backend systems. Common implementation tools may include n8n, Supabase, Vercel, MongoDB, SQL, Power BI, Cloudflare, and AI APIs where appropriate.

#### Do you offer ongoing support?

Yes. Synqro is built around long-term automation partnership. We can monitor, maintain, improve, and expand workflows over time through ongoing support and retainer-style engagements.

#### How long does a first automation project take?

It depends on the workflow, tools, data quality, and approval requirements. A focused first workflow can often be scoped into a short build sprint, while larger systems may require phased implementation.

### Mobile behavior

Accordion items stacked. Only one item may be open at a time if space is tight.

### Avoid

- vague “AI can do anything” answers
- fake guarantees
- technical jargon without business context

---

## 10.11 Section 11: Footer

### Purpose

Provide simple navigation, credibility, and contact details.

### Footer content

Logo:

> synqro

Short line:

> AI automation systems for service-led SMBs.

Links:

- Home
- Services
- Process
- About
- Contact

Contact:

> uzair@getsynqro.com

Small tools/supporting text chips:

- Workflow automation
- AI agents
- Reporting dashboards
- CRM operations
- Databases
- APIs

Optional legal placeholder:

- Privacy
- Terms

### Avoid

- big logo wall
- fake partner logos
- fake trust badges

---

## 11. Mockup module specifications

All mockups must be realistic but clearly representative. They must not imply fake client work.

Use neutral labels:

- Representative workflow
- Example automation map
- Internal operating system concept
- Automation assessment preview

Do not use:

- fake client names
- fake ROI numbers
- official logos
- copied branded UI
- fake testimonials
- “trusted by” sections

---

## 11.1 Mockup module 1: Automation Opportunity Assessment preview

### Purpose

Show the value of the free assessment and make it feel structured.

### Layout

A polished report-style card with:

- header: `Automation Opportunity Assessment`
- three columns: `Workflow`, `Friction`, `Automation Opportunity`
- priority tags: `High`, `Medium`, `Review`
- bottom recommendation card

### Safe dummy content

| Workflow | Friction | Automation Opportunity |
|---|---|---|
| Lead intake | Manual CRM updates | Auto-create lead record and route for review |
| Reporting | Spreadsheet consolidation | Scheduled dashboard refresh |
| Support triage | Inbox sorting | Classify urgency and assign owner |

Bottom card:

> Recommended first build: customer support triage workflow with human approval checkpoint.

### Animation

Rows fade in sequentially. Priority tag highlights softly.

### Do not include

- ROI percentages
- fake dollar savings
- fake client names
- official tool logos

---

## 11.2 Mockup module 2: Workflow Map — Customer Support Triage

### Purpose

Show how Synqro maps fragmented customer support intake into a controlled workflow.

### Layout

Four-lane horizontal flow on desktop, vertical flow on mobile:

1. Input
2. AI/process layer
3. Human checkpoint
4. Output

### Sample labels

Input:

- Support inbox
- Contact form
- Existing CRM record

AI/process layer:

- Classify urgency
- Detect intent
- Summarize issue
- Recommend next action

Human checkpoint:

- Review escalation
- Approve response
- Assign owner

Output:

- Routed ticket
- CRM note
- Team notification
- Dashboard update

### Safe dummy content

Use generic examples only:

- `Billing question`
- `Urgency: medium`
- `Recommended owner: support lead`
- `Action: draft response + update CRM note`

### Animation

Input cards appear first. Path moves left-to-right through process layer. Amber checkpoint pulses once. Output cards lock into place.

### Do not include

- real customer names
- fake support volume
- fake SLA metrics
- Zendesk/HubSpot/Salesforce logos

---

## 11.3 Mockup module 3: AI Agent Decision Card

### Purpose

Explain AI agents as structured decision helpers, not chatbots.

### Layout

A dark card with:

- `Context received`
- `Decision type`
- `Confidence`
- `Recommended action`
- `Human review required`
- `Approved output`

### Safe dummy content

```text
Context received: New inbound request + CRM record
Decision type: Classify and route
Confidence: 86%
Recommended action: Assign to operations lead
Human review: Required before notification
Approved output: CRM note + team alert
```

### Animation

Fields fill top-to-bottom. Confidence ring or bar animates once. Human Review pill turns amber.

### Do not include

- autonomous sending without approval
- creepy AI avatar
- fake named customer

---

## 11.4 Mockup module 4: Human Approval Queue

### Purpose

Show control, review, and safe adoption.

### Layout

A queue/table card with rows:

- item
- AI recommendation
- status
- action buttons

### Safe dummy content

| Item | AI Recommendation | Status | Actions |
|---|---|---|---|
| Support escalation | Route to support lead | Review Required | Approve / Edit |
| Email follow-up | Draft ready | Pending Review | Approve / Edit |
| CRM update | Sync contact status | Ready | Approve |

### Animation

Rows slide in. One amber review state pulses once. Buttons lift subtly on hover.

### Do not include

- fake customer data
- fake email addresses
- real company names

---

## 11.5 Mockup module 5: Reporting Dashboard Snapshot

### Purpose

Show that Synqro can turn scattered operational data into useful visibility.

### Layout

A dashboard card with:

- headline: `Operations Snapshot`
- small KPI cards
- trend chart
- source chips
- refresh state

### Safe dummy content

KPI labels only, no fake extreme claims:

- `Open requests`
- `Pending review`
- `Synced records`
- `Workflow exceptions`

Source chips:

- CRM
- Inbox
- Spreadsheet
- Database

Refresh state:

> Last synced: today

### Animation

KPI cards count in subtly or fade in. Chart line draws once.

### Do not include

- fake revenue growth
- official tool logos
- client-specific metrics

---

## 12. Responsive behavior

### 12.1 Desktop

- Use 12-column grid.
- Hero can use split layout with large right-side visual.
- Dense hero is acceptable.
- Lower sections need more whitespace and calmer pacing.

### 12.2 Tablet

- Convert hero to stacked two-row layout if needed.
- Keep hero visual visible but slightly simplified.
- Service cards become 2-column grid.
- Workflow examples may become tabs or stacked cards.

### 12.3 Mobile

- Headline and CTA appear before visual.
- Hero visual becomes vertical and simplified.
- Hide decorative grid complexity.
- Keep labels visible.
- All card grids become single-column.
- Timeline becomes vertical.
- FAQ accordion becomes full-width.
- Short form fields stack with full-width submit button.

### 12.4 Reduced motion

- Show final hero connected state statically.
- Remove pulsing and path drawing.
- Keep hover/focus states simple.
- Keep content order and labels intact.

---

## 13. Copyright and trademark safety rules

Do not use:

- official logos unless licensed or explicitly approved
- copied UI from tools like HubSpot, Salesforce, Slack, Gmail, n8n, Supabase, Vercel, Power BI, or any third-party product
- branded screenshots
- fake client logos
- fake “trusted by” walls
- fake testimonials
- fake case study names
- fake metrics or ROI claims

Allowed:

- plain text chips such as `CRM`, `Email Ops`, `Reports`, `Support`, `Databases`, `APIs`
- generic tool-name text chips where useful, such as `n8n`, `Supabase`, `Vercel`, `SQL`, `Power BI`, with no official logos
- representative UI cards clearly not tied to a fake client
- abstract workflow diagrams with labels

---

## 14. Do / don’t list

### Do

- Make the value proposition clear within three seconds.
- Use labels in system visuals.
- Frame automation as an investment into the client’s operating infrastructure.
- Show human-in-the-loop controls.
- Use realistic representative mockups.
- Make the site feel premium, technical, and credible.
- Keep motion polished and purposeful.
- Use lower sections to breathe after the dense hero.
- Keep CTA language high-value, not cheap.

### Don’t

- Build a generic AI agency page.
- Use robot illustrations, brain icons, sparkles, or neon cyberpunk visuals.
- Create fake client proof.
- Overload the homepage with tools.
- Make the short form too long.
- Use official logos without permission.
- Claim certifications or compliance status Synqro does not have.
- Delay the hero headline behind animation.
- Use motion that harms readability.

---

## 15. Stitch handoff rules

Stitch should build the **actual public Synqro homepage**, not a design-system documentation page.

Stitch should not reproduce headings like “Design System,” “Mockup Module,” “Wireframe,” or “Critique Checklist” on the public page.

Stitch should create a high-fidelity homepage prototype using:

- the exact section order in this document
- the hero headline and subheadline
- the primary and secondary CTAs
- the Connected Operating Layer hero visual
- the four service pillars
- the five mockup module directions
- the short homepage form fields only
- the trust/security copy direction
- the founder teaser scope
- the FAQ copy
- the footer content

Use premium motion and visual hierarchy, but keep clarity first.

---

## 16. Stitch master prompt v3

Paste the following into Stitch.

```text
Build the actual public homepage for Synqro, not a design-system documentation page.

Brand:
Synqro is a founder-led AI automation studio and consultancy. Synqro helps agencies, consulting firms, and service-led SMBs turn scattered tools and manual workflows into connected, AI-assisted operating systems.

Visual direction:
Balanced Premium Systems Studio. The design should feel like Stripe-style systems storytelling combined with Linear/Vercel-style technical polish. It should feel premium, precise, technically confident, clear, and expensive. Avoid generic AI agency templates.

Primary emotional targets:
clarity, partnership, technical confidence, premium.

Logo/wordmark:
Use lowercase “synqro”. Use a subtle sync/network mark if needed. Avoid lightning bolts, brains, robots, and spark icons.

Core hero headline:
Turn scattered tools and manual workflows into a connected operating system for your business.

Hero subheadline:
We help service-led SMBs connect their tools, automate repetitive work, and build AI-assisted workflows that improve operations without disrupting the systems they already use.

Primary CTA:
Request Free Assessment

Secondary CTA:
See How It Works

Build this section order:
1. Hero
2. Problem
3. Services
4. AI agents explanation
5. How Synqro works
6. Representative workflow examples
7. Trust/security
8. Founder teaser
9. Short CTA/contact form
10. FAQ
11. Footer

Hero requirements:
Use a large immersive dark hero with a hybrid animated system diagram and polished UI cards. The visual should show scattered tools/manual workflows becoming a Connected Operating Layer. Use clear labels:
Inputs: CRM, Email Ops, Reports, Support, Manual Tasks.
Core: Connected Operating Layer, AI Decision, Human Review.
Outputs: Synced Record, Approved Draft, Updated Dashboard, Routed Ticket.

The hero must be clear within three seconds. Headline, subheadline, and CTAs must be visible immediately. Do not hide the value proposition behind animation.

Hero motion storyboard:
0.0s-0.3s: headline, subheadline, and CTA visible immediately.
0.3s-0.8s: scattered nodes fade/slide in with labels: CRM, Email Ops, Reports, Support, Manual Tasks.
0.8s-1.4s: sync paths draw toward the center.
1.4s-1.9s: Connected Operating Layer card forms and sharpens.
1.9s-2.3s: AI Decision and Human Review checkpoints activate.
2.3s-2.8s: output cards resolve: Synced Record, Approved Draft, Updated Dashboard, Routed Ticket.
2.8s-3.2s: motion settles and CTA receives subtle emphasis once.

Use reduced-motion fallback: show final connected state statically and remove pulsing/path drawing.

Color system:
Near black/navy: #070A12
Deep navy: #0D1220
Raised dark surface: #121827
Light sections: #F8FAFC
Primary indigo: #6D5DF6
Purple accent: #8251EE
Blue accent: #3B82F6
Muted dark text: #94A3B8
Dark text on light: #0F172A
Success: #10B981
Review/amber: #F59E0B
Error: #EF4444, used sparingly
Use subtle borders, mostly rgba(255,255,255,0.08) on dark sections.

Typography:
Use a clean modern sans-serif such as Inter, Geist, or system UI. Use monospace only for small labels/status chips. Avoid futuristic fonts.

Layout:
Dark dense hero. Lower sections should breathe more. Use alternating dark and light sections. Use 8px radius for cards, buttons, forms, and mockups. Avoid fully pill-shaped SaaS buttons.

Services section:
Include four cards:
Workflow Automation — Connect repetitive tasks across existing tools so work moves without manual handoffs.
AI Agents — Build context-aware agents that classify, summarize, score, draft, route, and trigger approved workflow actions.
Reporting Dashboards — Turn scattered operational data into dashboards teams can use to manage work.
Internal Ops Systems — Create lightweight backend and database systems that support critical processes.

AI agents section:
Headline: AI agents that sit inside the workflow, not outside it.
Explain that Synqro builds custom AI agents that understand context, make structured decisions, and trigger approved workflow actions with human review where it matters.

How it works section:
Use these steps: Discover, Assess, Blueprint, Build, Test & Deploy, Maintain.

Representative workflow examples:
Include four examples:
1. CRM lead routing and review
2. Reporting dashboard from scattered sources
3. AI-assisted email draft and approval flow
4. Customer support triage workflow

Include these five mockup modules somewhere in the homepage design:
1. Automation Opportunity Assessment preview
2. Workflow Map: Customer Support Triage
3. AI Agent Decision Card
4. Human Approval Queue
5. Reporting Dashboard Snapshot

Customer Support Triage workflow map must show:
Input: Support inbox, Contact form, Existing CRM record.
AI/process layer: Classify urgency, Detect intent, Summarize issue, Recommend next action.
Human checkpoint: Review escalation, Approve response, Assign owner.
Output: Routed ticket, CRM note, Team notification, Dashboard update.

Trust/security section:
Headline: Automation with control built in.
Copy direction: Synqro’s implementation approach is informed by common security and governance practices, including least-privilege access, data minimization, auditability, secure credential handling, and human-in-the-loop review for sensitive or high-impact actions. Also mention that Synqro can map automation design, approval flows, data handling, and documentation to client-specific security, privacy, and compliance requirements.
Do not claim certifications.

Founder teaser:
Show compact founder cards only, not full bios.
Zaid Killedar — Co-founder, Automation & Data Systems. Leads automation and data systems work combining BI, SQL, dashboarding, backend workflow design, and automation logic.
Uzair Ahmed — Co-founder, AI Workflow Strategy & CRM Operations. Leads AI workflow strategy and CRM operations across marketing operations, lifecycle email systems, HubSpot RevOps, and revenue workflow design.
Include a link: Learn more about Synqro.

Homepage short form:
Use only these fields:
Name
Work email
Company
Workflow to improve
Button: Request Free Assessment
Do not include company website, tools currently involved, expected investment range, or timeline on the homepage. Those belong on the full Contact page later.

FAQ:
Include these questions and concise answers:
What kind of workflows can Synqro automate?
Do we need to replace our existing tools?
How does the free assessment work?
Can humans review AI-generated actions?
What tools do you integrate with?
Do you offer ongoing support?
How long does a first automation project take?

Footer:
Use lowercase synqro wordmark, short line “AI automation systems for service-led SMBs,” links to Home, Services, Process, About, Contact, and contact email uzair@getsynqro.com. If tools/capabilities appear, use small text chips only, no official logos.

Copyright/trademark restrictions:
Do not use official logos, copied UI from third-party tools, fake client logos, fake testimonials, fake case studies, fake client names, fake ROI numbers, or fake “trusted by” sections. Use text chips and representative UI only.

Visual restrictions:
No cartoon robots, AI sparkle clichés, brain icons, neon cyberpunk dashboards, stock business people, generic SaaS gradients, or cheap automation agency visuals.

Responsive behavior:
Desktop: split hero with large right-side visual, 12-column grid.
Tablet: stack if needed, keep visual simplified.
Mobile: headline and CTA first, simplified vertical hero visual below, single-column cards, vertical timeline, full-width form fields.

Quality bar:
The site must feel like a $10,000 website: premium, polished, precise, animated, credible, and clear. It should not feel like a generic AI automation agency template.
```

---

## 17. Stitch output critique checklist

Use this checklist after Stitch generates a prototype.

### Clarity

- Is the value proposition clear within three seconds?
- Does the hero explain what Synqro does without requiring scrolling?
- Are labels used in the hero visual?
- Is “Connected Operating Layer” visible and understandable?

### Premium quality

- Does the site feel expensive and polished?
- Is spacing precise?
- Are lower sections spacious after the dense hero?
- Does the typography feel modern and serious?
- Are buttons and cards refined rather than template-like?

### Technical confidence

- Do mockups look like real workflow systems without pretending to be client work?
- Do visuals show inputs, process, human review, and outputs?
- Is AI shown as controlled workflow logic rather than a chatbot gimmick?

### Motion

- Does hero motion feel synchronized and purposeful?
- Is motion subtle, premium, and memorable?
- Does it avoid gimmicky parallax or excessive bouncing?
- Is there a reduced-motion fallback?

### Credibility and ethics

- No fake client logos.
- No fake testimonials.
- No fake metrics.
- No fake case studies.
- No official logos without permission.
- No copied branded UI.

### Conversion

- Is the CTA visible in the hero?
- Does “Request Free Assessment” feel high-value, not cheap?
- Is the homepage form short and easy?
- Does the site frame automation as an investment in the visitor’s business?

### Mobile

- Does the mobile hero remain clear?
- Are labels readable?
- Are forms easy to complete?
- Do cards stack cleanly?
- Is motion simplified appropriately?

---

## 18. Final implementation notes

The first build should prioritize the homepage.

Future pages to define later:

- Services
- Process
- About
- Contact

The homepage should include enough information to stand alone, but it should not attempt to become the entire site.

The public site may later live as unauthenticated public routes inside the existing Next.js repository, but the first design/prototype can be produced independently in Stitch.

