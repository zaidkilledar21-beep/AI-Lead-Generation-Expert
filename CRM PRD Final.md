# OUTREACH CRM — PRODUCT REQUIREMENTS DOCUMENT

Internal AI Automation Consultancy CRM Version 2.0 | Uz & Ziki | Final Build Blueprint

1. # PURPOSE & VISION

This document defines the complete product requirements for a purpose-built internal CRM for a two-founder AI automation consultancy running an AI-powered outreach agent.

This CRM is NOT a generic CRM. It is the human control layer on top of the lead-gen agent defined in the Agent PRD. It takes heavy inspiration from HubSpot’s UX patterns — specifically its contact timeline, pipeline board, deal record layout, shared inbox, and campaign management — and applies them to the specific workflow of two founders running outreach at scale.

The CRM has four jobs:

1. Campaign Control — Founders configure and launch lead discovery campaigns from here. The agent reads these configurations and runs discovery accordingly.

   2. Pipeline Management — Full visibility into every lead at every stage, with HubSpot-style board and list views.

   3. Inbox & Reply Management — A shared inbox for both founders, showing every reply with full thread context, AI classification, and one-click actions.

   4. Performance Intelligence — Analytics that tell the founders what is working and what to improve.

Everything the agent does flows through this CRM. Everything the founders decide flows back to the agent through this CRM.

2. # USERS & ACCESS

| User | Role | Access |
| :---- | :---- | :---- |
| Uz | Founder | Full access |
| Ziki | Founder | Full access |

Both founders have identical access. All actions are logged with the founder’s name. No external users. No client-facing views in MVP.

3. # TECH STACK

| Layer | Tool | Notes |
| :---- | :---- | :---- |
| Frontend | Next.js 14 (App Router) | Matches agent dashboard stack |
| Database | Supabase (PostgreSQL) | Single source of truth for agent \+ CRM |
| Auth | Supabase Auth | Email/password. Two accounts created manually. |
| Realtime | Supabase Realtime | Live reply badges, queue counts |
| Hosting | Vercel (Hobby) | Free. Internal URL only. |
| Styling | Tailwind CSS | Utility-first. Dark theme by default. |
| Notifications | Telegram webhook | Instant reply alerts to both founders |
| n8n Trigger | HTTP webhooks | CRM triggers n8n workflows via webhook calls |

Architecture principle: The CRM reads and writes directly to Supabase. Actions that need to trigger agent workflows (re-score, launch campaign, approve outreach) call n8n webhook URLs server-side from Next.js API routes.

4. # URL / ROUTING STRUCTURE

/login	→ Login page (only public route)

/	→ Redirects to /pipeline

/pipeline	→ Pipeline View (list \+ board)

/pipeline/\[lead\_id\]	→ Lead Detail View

/campaigns	→ Campaign Manager

/campaigns/new	→ New Campaign form

/campaigns/\[campaign\_id\]	→ Campaign Detail \+ edit

/inbox	→ Shared Reply Inbox

/review	→ Manual Review Queue

/analytics	→ Analytics Dashboard

/settings	→ Settings

/settings/inboxes	→ Inbox management

/settings/sequences	→ Sequence management

/settings/notifications	→ Notification config

/settings/account	→ Founder profiles

All routes except /login are protected. Unauthenticated users are redirected to /login .

5. # NAVIGATION

Left sidebar (always visible on desktop, collapsible):

\[Logo / Brand\]

Pipeline Campaigns

Inbox	\[badge: unhandled count\] Review Queue	\[badge: pending count\] Analytics

Settings

Top bar:

* Global search (searches business name, email, niche, city)

* Logged-in founder name

* Global pause toggle (red button — pauses ALL outreach immediately)

* Notification bell

Badge counts on Inbox and Review Queue update in realtime via Supabase Realtime.

3. CAMPAIGN MANAGER ( **/campaigns** )

This is the most important new addition to the original brief. Founders configure lead discovery campaigns here. The agent reads these campaign configurations and runs discovery accordingly — no manual inputs required outside this view.

1. ## Campaign List View

Shows all campaigns in a table:

| Column | Description |
| :---- | :---- |
| Campaign Name | User-defined name |
| Status | Active / Paused / Draft / Completed |
| Niche | Target niche |
| Countries | Target countries (tags) |
| Cities | Target cities (tags, optional) |
| Band Target | Which bands this campaign routes into |
| Leads Discovered | Total leads found |
| Leads Scored | Total scored |

| Band A / B | Count of high-quality leads |
| :---- | :---- |
| Last Run | When the agent last ran discovery for this campaign |
| Next Run | Scheduled next run |
| Actions | Edit / Pause / Resume / Duplicate / Delete |

Top of view:

* \+ New Campaign button

  * Filter by status: All / Active / Paused / Draft

  2. New Campaign Form ( **/campaigns/new** )

This form defines exactly what the agent will do for a discovery run. When saved and set to Active, the agent picks it up on its next scheduled run or immediately if triggered manually.

Section A — Campaign Identity

| Field | Type | Required | Notes |
| :---- | :---- | :---- | :---- |
| Campaign Name | Text | Yes | e.g. “Dubai Dental Clinics — May 2025” |
| Description | Textarea | No | Internal notes about this campaign |
| Status | Toggle | Yes | Draft / Active |

Section B — Target Niche & Geography

This is the core of what the agent uses for discovery queries.

| Field | Type | Required | Notes |
| :---- | :---- | :---- | :---- |
|  Primary Niche | Select (dropdown \+ custom text) |  Yes | e.g. “Dental Clinics”, “Accounting Firms”, “Real Estate Agencies” |
| Niche Keywords |  Tag input |  No | Additional search terms: “dentist”, “dental surgery”, “oral clinic” |
| Target Countries |  Multi-select |  Yes | Select from country list. Agent queries each country. |
|  Target Cities |  Tag input |  No | Leave blank to cover all cities in selected countries |
|  |  |  |  |

| Exclude Cities | Tag input | No | Cities to skip |
| :---- | :---- | :---- | :---- |
| Language of Business |  Multi-select |  No |  English / Arabic / French / Spanish / Other |

Niche dropdown presets (configurable, expandable):

Dental Clinics Medical Clinics & GPs Real Estate Agencies

Immigration Consultants Accounting & Tax Firms Legal / Law Firms Recruitment Agencies

Home Renovation & Contractors Digital Marketing Agencies Interior Design Studios Physiotherapy & Wellness Education & Tutoring Centers Insurance Brokers

Mortgage Brokers IT Support & MSPs

HR & Payroll Consultants Wedding & Events Planning Logistics & Freight

Auto Repair Shops Beauty Salons & Spas

Section C — Discovery Settings

| Field | Type | Default | Notes |
| :---- | :---- | :---- | :---- |
|  Max Leads Per Run |  Number |  100 | How many raw leads the agent collects per execution |
|  Lead Source |  Select | Google Maps | Google Maps / Google Search / Directory / Manual Import |
|  Min Google Rating | Number (0–5) |  3.5 |  Skip businesses below this rating |
| Min Review Count | Number | 5 | Skip businesses with fewer reviews than this |
|  Exclude Chains |  Toggle |  Off | Skip businesses that appear to be large chains or franchises |
| Exclude Already Discovered |  Toggle |  On |  Skip businesses already in leads table |

| Run Frequency | Select | Manual | Manual / Daily / Every 3 Days / Weekly |
| :---- | :---- | :---- | :---- |
| Next Scheduled Run | Datetime | — | Auto-set based on frequency. Override manually. |

Section D — ICP & Scoring Overrides (Optional)

By default, the agent uses the global ICP config. Campaigns can override specific thresholds.

| Field | Type | Default | Notes |
| :---- | :---- | :---- | :---- |
| Min Score for Band A | Number | 76 | Override minimum for this campaign |
| Min Score for Band B | Number | 51 | Override minimum for this campaign |
|  Min Automation Opportunity Score |  Number |  13 | Threshold for Band A routing safeguard |
|  Min Ability to Pay Score |  Number |  U | Threshold for Band A routing safeguard |
|  Min Reachability Score |  Number |  6 | Threshold for Band A routing safeguard |
| Confidence Required for Auto-Outreach |  Select |  Medium |  Low / Medium / High |

Section E — Outreach Configuration

| Field | Type | Default | Notes |
| :---- | :---- | :---- | :---- |
| Assign to Sequence (Band A) | Select | Band A — 3 Step | Select from active sequences |
| Assign to Sequence (Band B) | Select | Band B — 4 Step | Select from active sequences |
|  Assign to Sequence (Band C) |  Select | None (nurture only) |  |
| Auto-Approve Band B for Outreach |  Toggle |  Off |  If on, Band B skips approval gate |
| Require Approval for Band A Step 1 |  Toggle |  On |  Always on by default |
|  Assigned Inbox |  Select |  Primary Inbox | Which sending inbox to use for this campaign |

Section F — Campaign Notes & Tags

| Field | Type | Notes |
| :---- | :---- | :---- |
| Internal Tags | Tag input | e.g. “Q2 push”, “high priority”, “test campaign” |
| Notes | Textarea | Any additional context for this campaign |

3. Campaign Detail View ( **/campaigns/\[campaign\_id\]** )

Shows everything about a campaign and its results.

Header:

* Campaign name, status badge, niche, countries

  * Edit / Pause / Resume / Duplicate / Delete buttons

    * Trigger Manual Run button (calls n8n webhook immediately)

Stats bar:

Leads Discovered: 312	Enriched: 298	Scored: 290	Band A: 34	Band B: 87	In out

Tabs:

1. Overview — Campaign config summary (all fields, read-only)

2. Leads — Filterable table of all leads from this campaign (same columns as Pipeline View, pre-filtered to this campaign)

3. Run History — Log of every time the agent ran discovery for this campaign:

| Run Date | Leads Found | Duplicates | Errors | Duration | Triggered By |
| :---- | :---- | :---- | :---- | :---- | :---- |
| 2025-05-01 0U:00 | U4 | 6 | 0 | 4m 12s | Scheduled |
| 2025-04-28 14:32 | 87 | 13 | 2 | 3m 58s | Manual (Uz) |

4. Edit — Editable version of the campaign form

   4. ## Campaign Data Model

create table campaigns (

id uuid primary key default gen\_random\_uuid(), name text not null,

description text,

status text default 'draft',	\-- draft, active, paused, completed primary\_niche text not null,

niche\_keywords jsonb,	\-- array of additional keywords target\_countries jsonb not null,	\-- array of country names target\_cities jsonb,	\-- array of cities (optional) exclude\_cities jsonb,

language\_of\_business jsonb, max\_leads\_per\_run integer default 100, lead\_source text default 'google\_maps', min\_google\_rating numeric default 3.5, min\_review\_count integer default 5, exclude\_chains boolean default false,

exclude\_already\_discovered boolean default true,

run\_frequency text default 'manual', \-- manual, daily, every\_3\_days, weekly next\_run\_at timestamptz,

last\_run\_at timestamptz,

\-- ICP overrides

min\_score\_band\_a integer default 76, min\_score\_band\_b integer default 51, min\_automation\_opportunity integer default 13, min\_ability\_to\_pay integer default 9, min\_reachability integer default 6, confidence\_required text default 'medium',

\-- outreach config

sequence\_band\_a uuid references outreach\_sequences(id), sequence\_band\_b uuid references outreach\_sequences(id), sequence\_band\_c uuid references outreach\_sequences(id), auto\_approve\_band\_b boolean default false, require\_approval\_band\_a boolean default true, assigned\_inbox\_id uuid references inboxes(id),

\-- Meta tags jsonb, notes text,

created\_by text not null,

created\_at timestamptz default now(), updated\_at timestamptz default now()

);

create table campaign\_run\_log (

id uuid primary key default gen\_random\_uuid(),

campaign\_id uuid references campaigns(id) on delete cascade, run\_started\_at timestamptz default now(),

run\_completed\_at timestamptz, leads\_found integer default 0, duplicates\_skipped integer default 0, errors integer default 0, error\_details jsonb,

duration\_seconds integer,

triggered\_by text,	\-- 'scheduled' or founder name n8n\_execution\_id text

);

\-- Add campaign\_id to leads table

alter table leads add column campaign\_id uuid references campaigns(id);

7. PIPELINE VIEW ( **/pipeline** )

Inspired by HubSpot’s contacts index page and deal pipeline board. Combines a filterable list view with an optional Kanban board view.

1. ## View Toggle

Top-right toggle: List View | Board View

Default: List View.

2. ## List View

Summary bar (always visible at top):

Total: 1,240	Band A: 112	Band B: 287	Band C: 401	Band D: 184	Awaiting Review

Filter bar (HubSpot-style, collapsible):

| Filter | Type |
| :---- | :---- |
| Band | Multi-select: A / B / C / D |
|  Status | Multi-select: New / Enriched / Scored / In Sequence / Replied / Paused / Closed Won / Closed Lost / Archived / Unsubscribed |
| Campaign | Dropdown of all campaigns |
| Niche | Dropdown of distinct niches |
| Country | Dropdown of distinct countries |
| Reply Status |  All / No Reply / Has Reply / Positive Reply / Objection |
| Review Status |  All / Pending Review / Reviewed |
| Assigned To |  Uz / Ziki / Unassigned |
| Date Added |  Date range picker |

| Score Range | Dual slider (0–100) |
| :---- | :---- |
| Search | Free text (business name, email, city) |

Saved filters: Founders can save filter combinations and name them (like HubSpot’s saved views). Example saved views:

* “Hot Leads” (Band A, no reply, approved)

* “Today’s Replies” (has reply, last 24h)

* “Pending Approval” (Band A, status \= pending\_approval)

Columns (configurable, defaults below):

| Column | Sortable |
| :---- | :---- |
| Business Name | Yes |
| Niche | Yes |
| Country / City | Yes |
| Band | Yes |
| Score | Yes |
| Confidence | No |
| Status | Yes |
| Campaign | No |
| Outreach Step | No |
| Reply | No |
| Last Activity | Yes |
| Assigned To | No |
| Review | No |

Inline row actions (on hover):

* View Lead (opens detail)

* Approve for Outreach

* Reject / Archive

* Pause Sequence

* Assign to Me

Bulk actions (checkbox select):

* Approve selected for outreach

* Archive selected

* Pause sequences for selected

* Assign to Uz / Ziki

* Export selected as CSV

  3. ## Board View (Kanban)

Inspired by HubSpot’s deal pipeline board. Columns represent lead lifecycle stages.

Columns (left to right):

New → Enriched → Scored → Pending Approval → In Sequence → Replied → Closed Won

Each card shows:

* Business name

* Band badge (color-coded)

* Score

* Niche

* Last activity time

Cards are drag-and-droppable between stages. Dropping a card into a stage updates leads.status in Supabase.

Board is filterable by Campaign, Niche, Country, and Band using the same filter bar.

8. LEAD DETAIL VIEW ( **/pipeline/\[lead\_id\]** )

Inspired by HubSpot’s contact record — a full scrollable profile with a chronological activity timeline.

Layout: Two-column on desktop.

* Left column (40%): Profile, enrichment, score, hypothesis — static context

* Right column (C0%): Activity timeline, actions, drafts — operational view

  1. ## Left Column

Business Profile Card

| Field | Source |
| :---- | :---- |
| Business Name | leads.business\_name |
| Niche | leads.niche |
| Country / City | leads.country , leads.city |
| Website | leads.website (clickable) |
| Email | leads.email (clickable mailto) |
| Phone | leads.phone |
| WhatsApp | leads.whatsapp |
| Decision Maker | leads.decision\_maker\_name \+ role |
| Google Maps | leads.google\_maps\_url (link) |
| Rating | Stars \+ leads.review\_count |
| Status | Status badge |
| Band | Band badge (color-coded) |
| Campaign | campaigns.name (linked) |
| Source | leads.source |
| Assigned To | Dropdown (Uz / Ziki / Unassigned) |
| Added | leads.created\_at |

Edit icon next to each field for inline editing.

ICP Score Panel

Total Score	84 / 100	|	Band: A	|	Confidence: Medium \[████████████████████░░░░\] 84%

Expandable metric breakdown:

| Metric | Score | Bar | Evidence |
| :---- | :---- | :---- | :---- |

| Automation Opportunity | 17/20 | ████䡢 | “Manual WhatsApp booking, no online scheduler” |
| :---- | :---- | :---: | :---- |
| Lead / Customer Volume | 13/15 | ████䡢 | “142 Google reviews, multi-location” |
| Digital & Workflow Gap | 14/15 | █████ | “No booking link, contact form only” |
| Revenue / Ability to Pay | 12/15 | ████䡢 | “Premium dental niche, multi-location” |
| Niche Fit | U/10 | █████ | “Dental — excellent fit” |
| Reachability | 8/10 | ████䡢 | “Business email found” |
| Operational Complexity | 8/10 | ████䡢 | “3 locations, multiple service lines” |
| Growth / Activity | 3/5 | ███䡢䡢 | “Recent reviews, some inactivity” |

Missing data per metric shown in grey below the evidence. Manual review warning banner if applicable:

⚠ Manual Review Required — Low confidence despite high score

Automation Hypothesis Card

| Field | Value |
| :---- | :---- |
| Pain Point | “No automated missed-call recovery” |
| Manual Workflow | “All bookings via phone / WhatsApp” |
| Suggested Solution | “Missed-call SMS follow-up \+ appointment reminder flow” |
| Business Impact | “Recover 20–35% of after-hours inquiries” |
| Outreach Hook | “Clinics with WhatsApp-only booking lose inquiries after hours” |
| Confidence | Medium badge |

Enrichment Card (collapsible)

Shows all enrichment fields from lead\_enrichment — services (as tags), detected tools, booking link found (yes/no), contact form found, chat widget, social links (icons), enrichment confidence, last enriched timestamp.

2. ## Right Column — Activity Timeline

Inspired by HubSpot’s contact timeline. Every action, email, reply, and note appears in a single chronological feed.

Timeline item types:

| Type | Icon | Color |
| :---- | :---- | :---- |
| Email Sent |  ![][image1] | Blue |
| Email Blocked |  ![][image2] | Grey |
| Reply Received |  ![][image3] | Green (positive) / Yellow (neutral) / Red (negative) |
| Sequence Paused |  ![][image4] | Orange |
| Sequence Resumed |  ![][image5] | Green |
| Lead Approved |  ![][image6] | Green |
| Lead Rejected |  ![][image7] | Red |
| Band Changed |  ![][image8] | Purple |
| Note Added |  ![][image9] | Grey |
| Status Changed |  ![][image10] | Grey |
| Review Completed |  ![][image11] | Blue |

Email sent item (expanded):

![][image12]	Step 1 — Sent 2 May 2025 at 09:14

From: [zaid@yourbrand.com](mailto:zaid@yourbrand.com) → [hello@alnoorclinic.ae](mailto:hello@alnoorclinic.ae) Subject: Your booking flow — quick thought \[Expand to read full message body\]  
Status: Sent ✓

Reply received item (expanded):

![][image13]		Reply — Received 2 May 2025 at 14:37 From: [hello@alnoorclinic.ae](mailto:hello@alnoorclinic.ae)  
Intent: Positive Interest ![][image14]	Sentiment: Positive

\[Full reply body, expanded by default for unhandled replies\]

AI Suggested Next Action: "Respond with pricing and a call link" AI Draft Reply: \[copyable text\]

\[Mark Handled\] \[Closed Won\] \[Book Call\]

Note item:

![][image15]	Note — Ziki, 1 May 2025 at 17:30

"Spoke to Zaid — this clinic is in our target area. Priority outreach."

3. ## Email Draft Panel

If an email draft is pending approval, it appears as a pinned banner at the top of the right column:

![][image16] Email Draft Pending Approval — Step 1, Band A Subject: Your booking flow — quick thought

Preview: Noticed something about how your clinic handles new patient inquiries. \[Full message body\]  
Word Count: 95/120 ✓	Personalization: booking flow, WhatsApp contact, business name ✓

Validation: All checks passed ✓

\[Approve & Send\]	\[Edit Before Sending\]	\[Reject Draft\]

4. ## Action Bar (sticky at bottom of right column)

\[Approve for outreach\] \[Pause Sequence\] \[Add Note\] \[Mark Closed Won\] \[Mark Closed Lost\]

“More” dropdown contains: Unsubscribe, Re-score, Move Band, View in Supabase (dev only).

5. ## Empty States

   * No enrichment data: “This lead hasn’t been enriched yet. \[Trigger Enrichment\]”

     * No score: “This lead hasn’t been scored yet. \[Trigger Scoring\]”

     * No outreach: “No outreach sent yet for this lead.”

     * No replies: “No replies received.”

9. INBOX VIEW ( **/inbox** )

A shared inbox for both founders — inspired by HubSpot’s conversations inbox. Every reply from the agent’s outreach appears here.

Layout: Two-pane (like Gmail / HubSpot conversations).

* Left pane (35%): Reply list

* Right pane (C5%): Full thread \+ actions

1. ## Left Pane

Tabs at top:

All | Unhandled (5) | Positive | Neutral | objections | ooo | Bounced

Each reply item shows:

* Business name (bold if unhandled)

* Reply excerpt (first 100 chars)

* Intent badge (color-coded)

* Time received (relative: “2h ago”)

* Assigned to (avatar initials)

* Unread dot if unhandled

Sort: Newest first by default. Toggle to oldest first.

Search: Search by business name or reply text.

2. ## Right Pane — Thread View

Shows the full conversation thread: every email sent \+ the reply received, in chronological order. At the top: business name, band badge, score, niche — linked to Lead Detail.

Thread items:

Sent emails shown as right-aligned bubbles (like iMessage from “you”). Replies shown as left-aligned bubbles (from them).

Below the reply:

Intent: Positive Interest	Sentiment: Positive

Summary: "Prospect confirmed they handle bookings manually and asked about our process." Suggested Next Action: "Send pricing and calendar link"

AI Draft Reply:

───────────────────────────────────────────────── Hi \[Name\],

Thanks for getting back to me. Happy to walk you through exactly how it works for clinics like yours...

───────────────────────────────────────────────── \[Copy Draft\]

\[Mark Handled\] \[Assign to Ziki\] \[Mark Closed Won\] \[Mark Closed Lost\] \[View Full Lead\]

3. ## Realtime

New replies appear in the left pane instantly via Supabase Realtime (no refresh needed). Nav badge updates instantly.

Both founders see the same inbox. If one founder marks a reply as handled, it disappears from the Unhandled tab for both.

10. MANUAL REVIEW QUEUE ( **/review** )

Everything the agent has flagged for human judgment before proceeding. Purpose: Clear this queue daily. If it’s empty, the agent is running smoothly. Items grouped by priority:

## Urgent (action required before outreach can proceed)

| Item | Source | Action |
| :---- | :---- | :---- |
|  Band A lead pending approval | manual\_review\_queue reason \= band\_a\_approval | Approve / Reject |
|  Email draft pending approval |  email\_drafts status \= pending | Approve / Reject |
| Positive reply unhandled \> 4 hours |  reply\_events intent \= positive\_interest |  Handle |

## ![][image17] Needs Attention

| Item | Source | Action |
| :---- | :---- | :---- |
| Neutral question reply | reply\_events intent \= neutral\_question | Handle |
|  Ambiguous reply | reply\_events intent \= manual\_review\_required |  Handle |
| High score / low confidence lead | manual\_review\_queue reason \= low\_confidence | Approve / Reject |
| Objection reply | reply\_events intent \= objection | Handle |

## Low Priority

| Item | Source | Action |
| :---- | :---- | :---- |
| Lead with missing critical data | manual\_review\_queue reason \= missing\_data | Enrich / Skip |
| Band D lead flagged for review | manual\_review\_queue reason \= band\_d\_review | Archive / Keep |

Each queue item card shows:

* Business name, band badge, score

* Reason for review (one sentence)

* Reply excerpt (if applicable)

* Automation hypothesis (one line)

* Time in queue (“waiting 2h 14m”)

* Quick action buttons inline

Bulk actions:

* Approve all Band A high-confidence leads

* Archive all Band D pending items

Queue count badge in nav updates in realtime.

11. ANALYTICS VIEW ( **/analytics** )

Date range filter (always visible at top):

Last 7 Days | Last 30 Days | Last 90 Days | All Time | Custom Range

All charts and tables respond to the selected date range.

1. ## Top KPI Bar

| Leads Discovered | Leads Scored | Band A+B | Emails Sent | Reply Rate | Positive Rate |
| :---- | ----- | :---: | :---- | :---- | :---: |
| 1,240 | 984 | 399 | 418 | 6.2% | 1.4% |

Each KPI shows delta vs previous period:

Emails Sent: 418 ▲ \+23% vs last period

2. ## Outreach Volume (Line Chart)

Emails sent per day over selected period. Shows warmup ramp. Both founders’ sends shown as one line (combined).

3. ## Reply Breakdown (Donut Chart)

Distribution of reply intent classifications. Hover to see count per type.

4. ## Performance by Campaign (Table)

|  Campaign |  Niche |  Countries |  Leads | Band A/B |  Sent |  Replies | Reply Rate |  Positive |  Calls |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | ----- | :---- | :---- |
| Dubai Dental — May |  Dental |  UAE |  312 |  121 |  87 |  U |  10.3% |  3 |  1 |
| Toronto Accounting |  Accounting |  Canada |  204 |  88 |  61 |  4 |  6.6% |  1 |  0 |

Sortable by any column. Click row to go to campaign detail.

5. ## Performance by Niche (Bar Chart)

Reply rate and positive reply rate per niche. Horizontal bar chart. Sorted by positive reply rate descending.

## 11.C Performance by Country (Bar Chart)

Same as niche breakdown, but by country.

7. ## Sequence Step Funnel (Table)

| Sequence | Step | Sent | Replies | Reply Rate |
| :---- | :---- | :---- | :---- | :---- |
|  |  |  |  |  |

| Band A — 3 Step | Step 1 | U4 | 7 | 7.4% |
| :---- | :---- | :---- | :---- | :---- |
| Band A — 3 Step | Step 2 | 83 | 3 | 3.6% |
| Band A — 3 Step | Step 3 | 61 | 1 | 1.6% |
| Band B — 4 Step | Step 1 | 147 | U | 6.1% |

8. ## Weekly Snapshot Card

This Week vs Last Week:

New Leads	\+34 ▲	Emails Sent	\+87 ▲	Replies	\+6 ▲	Positive	\+2 ▲	Calls	\+1

12. SETTINGS VIEW ( **/settings** )

    1. Inbox Management ( **/settings/inboxes** )

Table of all inboxes:

|  Email |  Provider | Daily Limit | Sent Today | Warmup Stage |  Status |  Actions |
| :---- | :---- | :---- | :---- | :---- | ----- | :---- |
|  [zaid@brand.com](mailto:zaid@brand.com) | Google Workspace |  20 |  14 |  Week 3 |  Active | Edit / Pause |

Actions per inbox:

* Edit daily send limit

  * Pause / Resume

    * View warmup stage

    * Reset daily count (emergency use) Add new inbox button.

Note on **current\_daily\_sent** : This field is computed at query time as count(outreach\_events where sent\_at \>= today) — not stored as a counter. This prevents desync issues.

2. ## Global Outreach Controls

| Control | Type | Default |
| :---- | :---- | :---- |

| Global Pause | Toggle (big red) | Off |
| :---- | :---- | :---- |
| Pause Band A | Toggle | Off |
| Pause Band B | Toggle | Off |
| Pause Band C | Toggle | Off |
| Pause Band D | Toggle | Off |
| Daily Global Max (all inboxes combined) | Number | 50 |
| Band A Requires Approval | Toggle | On |
| Band B Requires Approval | Toggle | Off |

Global pause immediately stops the agent from sending any email. Agent checks this flag before every send.

3. Sequence Management ( **/settings/sequences** )

Table of all sequences in outreach\_sequences :

| Name | Band | Niche | Steps | Active | Actions |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Band A — 3 Step | A | Any | 3 | Yes | View / Edit / Pause |
| Band B — 4 Step | B | Any | 4 | Yes | View / Edit / Pause |

Click to expand and see steps with delay days, template type, and personalization flag. Edit steps (future, MVP \= view only).

4. Notification Settings ( **/settings/notifications** )

| Setting | Type |
| :---- | :---- |
| Telegram Bot Token | Text input (masked) |
| Telegram Chat ID (Uz) | Text input |
| Telegram Chat ID (Ziki) | Text input |
| Notify on: Positive Reply | Checkbox |
| Notify on: Neutral Reply | Checkbox |
| Notify on: Objection | Checkbox |

| Notify on: Band A Pending Approval | Checkbox |
| :---- | :---- |
| Notify on: Campaign Completed | Checkbox |
| Test Notification | Button (sends test message to both) |

5. Founder Accounts ( **/settings/account** )

   * Display name (used in action logs)

     * Email address

     * Change password

     * Timezone preference (used for timestamps in UI)

13. # COMPLETE DATA MODEL (CRM ADDITIONS)

All tables below are additions to the schema already defined in the Agent PRD. Do not duplicate existing tables.

\-- Campaign tables (defined in Section 6.4 above)

\-- campaigns

\-- campaign\_run\_log

\-- alter table leads add column campaign\_id

\-- Lead additions alter table leads

add column notes text,

add column notes\_updated\_at timestamptz, add column notes\_updated\_by text,

add column assigned\_to text,

add column closed\_at timestamptz, add column closed\_by text,

add column band\_override text,

add column band\_override\_reason text, add column band\_override\_by text,

add column band\_override\_at timestamptz,

add column approved\_for\_outreach boolean default false, add column approved\_by text,

add column approved\_at timestamptz,

add column campaign\_id uuid references campaigns(id);

\-- CRM action log

create table crm\_action\_log (

id uuid primary key default gen\_random\_uuid(), lead\_id uuid references leads(id) on delete set null,

campaign\_id uuid references campaigns(id) on delete set null,

action\_type text not null, action\_detail jsonb, performed\_by text not null,

performed\_at timestamptz default now()

);

\-- Action types:

\-- approved\_for\_outreach, rejected, archived, paused\_sequence, resumed\_sequence,

\-- marked\_closed\_won, marked\_closed\_lost, marked\_unsubscribed, reply\_handled,

\-- band\_overridden, note\_added, email\_draft\_approved, email\_draft\_rejected,

\-- manual\_review\_completed, campaign\_created, campaign\_launched, campaign\_paused,

\-- inbox\_paused, global\_pause\_toggled, assigned\_to\_founder

\-- Global settings

create table global\_settings ( key text primary key,

value text not null,

updated\_at timestamptz default now(), updated\_by text

);

\-- Seed data for global\_settings:

insert into global\_settings (key, value, updated\_by) values ('global\_outreach\_paused', 'false', 'system'), ('band\_a\_paused', 'false', 'system'),

('band\_b\_paused', 'false', 'system'),

('band\_c\_paused', 'false', 'system'),

('band\_d\_paused', 'false', 'system'),

('daily\_global\_max', '50', 'system'), ('band\_a\_approval\_required', 'true', 'system'), ('band\_b\_approval\_required', 'false', 'system');

\-- Saved pipeline filters (HubSpot-style saved views) create table saved\_filters (

id uuid primary key default gen\_random\_uuid(), name text not null,

filters jsonb not null, created\_by text not null, is\_shared boolean default true,

created\_at timestamptz default now()

);

14. # SUPABASE VIEWS (Query Performance)

Define these Supabase views so the frontend never needs to write complex joins inline.

\-- Pipeline list view — main data join for pipeline table create view pipeline\_view as

select

l.id, l.business\_name, l.niche, l.country, l.city,

l.email, l.phone, l.status, l.assigned\_to,

l.approved\_for\_outreach, l.created\_at, l.campaign\_id,

c.name as campaign\_name, ls.total\_score,

ls.band, ls.confidence,

ls.manual\_review\_required, oq.status as outreach\_status, oq.current\_step, oq.next\_send\_at,

(select count(\*) from outreach\_events oe where oe.lead\_id \= l.id) as emails\_sent,

(select max(sent\_at) from outreach\_events oe where oe.lead\_id \= l.id) as last\_email\_sent\_ (select count(\*) from reply\_events re where re.lead\_id \= l.id) as reply\_count,

(select intent\_classification from reply\_events re where re.lead\_id \= l.id order by reply (select exists(select 1 from reply\_events re where re.lead\_id \= l.id and re.requires\_huma (select exists(select 1 from manual\_review\_queue mrq where mrq.lead\_id \= l.id and mrq.rev

from leads l

left join campaigns c on l.campaign\_id \= c.id left join lead\_scores ls on ls.lead\_id \= l.id left join outreach\_queue oq on oq.lead\_id \= l.id;

\-- Analytics summary per campaign create view campaign\_analytics as select

c.id as campaign\_id, c.name, c.primary\_niche, c.target\_countries, c.status,

count(distinct l.id) as total\_leads,

count(distinct l.id) filter (where ls.band in ('A', 'B')) as band\_ab\_count, count(distinct oe.id) as emails\_sent,

count(distinct re.id) as replies,

count(distinct re.id) filter (where re.intent\_classification \= 'positive\_interest') as po from campaigns c

left join leads l on l.campaign\_id \= c.id left join lead\_scores ls on ls.lead\_id \= l.id

left join outreach\_events oe on oe.lead\_id \= l.id left join reply\_events re on re.lead\_id \= l.id

group by c.id, c.name, c.primary\_niche, c.target\_countries, c.status;

15. # REALTIME SUBSCRIPTIONS

The frontend subscribes to the following Supabase Realtime channels on mount:

| Channel | Event | What Updates |
| :---- | :---- | :---- |
| reply\_events | INSERT | Inbox unhandled count, nav badge, left pane list |
| manual\_review\_queue | INSERT, UPDATE | Review queue nav badge, queue list |
| outreach\_queue | UPDATE | Lead detail outreach status |
| email\_drafts | INSERT | Review queue badge (new draft pending) |
| global\_settings | UPDATE | Global pause toggle state syncs across both founders |

# 1C. KEYBOARD SHORTCUTS

For a tool used daily by two founders, keyboard shortcuts save hours per week.

| Shortcut | Action |
| :---- | :---- |
| G P | Go to Pipeline |
| G C | Go to Campaigns |
| G I | Go to Inbox |
| G R | Go to Review Queue |
| G A | Go to Analytics |
| A | Approve (on focused lead or queue item) |
| X | Reject / Archive (on focused lead) |
| N | Add Note (on Lead Detail) |
| H | Mark Reply Handled (in Inbox) |
| J | Next item (in list/inbox) |
| K | Previous item (in list/inbox) |
| Enter | Open focused item |
| Esc | Close modal / go back |
| Cmd/Ctrl \+ K | Global search |

|  |  |
| :---- | :---- |
| Cmd/Ctrl \+ P | Global pause toggle |

Keyboard shortcut reference shown as ? button in bottom-right corner.

17. # EMPTY STATES

Every view needs a defined empty state so the app never looks broken.

| View | Empty State Message | Action |
| :---- | :---- | :---- |
|  Pipeline (no leads) | “No leads yet. Create your first campaign to start discovery.” | \[Create Campaign\] |
| Pipeline (filters active, no results) |  “No leads match these filters.” |  \[Clear Filters\] |
| Inbox (no replies) | “No replies yet. Your outreach is running.” | — |
| Review Queue (empty) | “You’re all caught up. No items need review.” | — |
|  Analytics (no data) | “Not enough data yet. Analytics will populate after your first outreach.” |  — |
|  Campaign leads (empty) |  “This campaign hasn’t discovered any leads yet.” | \[Trigger Manual Run\] |

18. # LOADING STATES

| Component | Loading Behavior |
| :---- | :---- |
| Pipeline list | Skeleton rows (5 placeholder rows while data loads) |
| Lead Detail | Skeleton cards per panel section |
| Score breakdown | Animated bar fills on load |
| Timeline | Skeleton timeline items |
| Analytics charts | Spinner inside chart container |
| Campaign run trigger | Button shows spinner \+ “Running…” during n8n call |

19. # ACCEPTANCE CRITERIA

## Campaign Manager

* Founders can create a campaign with all fields in Section 6.2

  * Campaign config is saved to campaigns table

  * “Trigger Manual Run” button calls n8n webhook with campaign config payload

  * n8n reads campaign config and runs discovery accordingly

  * Run history is logged in campaign\_run\_log

  * Campaign stats bar reflects real counts from joined tables

  * Leads are associated with their source campaign via campaign\_id

  * Active campaigns with scheduled frequency trigger automatically

## Pipeline View

* All leads visible with correct columns

  * All filters work correctly and can be combined

  * Saved filters save and load correctly

  * Board view shows correct columns with accurate counts

  * Drag-and-drop on board updates leads.status in Supabase

  * Bulk actions work on selected leads

  * Summary bar shows accurate real-time counts

## Lead Detail View

* Full profile, enrichment, score, hypothesis visible

  * Activity timeline shows all events in chronological order

  * Email draft approval / rejection works and triggers n8n send

  * All action bar buttons update Supabase and log to crm\_action\_log

  * Notes save with founder name and timestamp

  * Band override saves with reason and logs to action log

  * Empty states shown when sections have no data

## Inbox View

* All replies visible in left pane

  * Filter tabs show correct counts

  * Full thread visible in right pane

  * AI draft is copyable

  * Mark Handled updates reply\_events for both founders simultaneously

  * New replies appear in realtime without refresh

  * Nav badge count is accurate

## Review Queue

* All pending review types appear correctly grouped by priority

  * Quick approve / reject works from queue card

  * Queue badge in nav is accurate and updates in realtime

  * Completed items leave the queue immediately

## Analytics

* All KPIs show accurate data from Supabase

  * Date range filter changes all charts and tables

  * Delta vs previous period shown on KPI bar

  * Campaign performance table sortable

  * Empty state shown when date range has no data

## Settings

* Global pause toggle pauses all outreach immediately (agent reads flag before every send)

  * Per-band pause toggles work independently

  * Inbox daily limit editable and respected by agent

  * Notification test button sends real Telegram message to both founders

  * Saved filter management works

## General

* Both founders can log in with separate accounts

  * All actions logged to crm\_action\_log with founder name

  * No service role key exposed in frontend code

  * All routes protected — unauthenticated users redirected to /login

  * Keyboard shortcuts work across views

  * Responsive layout — usable on tablet, readable on mobile

20. # BUILD PHASES

| Phase | Deliverable | Priority | Blocking? |
| :---- | :---- | :---- | :---- |
| 1 | Schema additions \+ Supabase views | P0 | Yes |
| 2 | Auth — login, protected routes, 2 accounts | P0 | Yes |
| 3 | Campaign Manager — create, list, trigger run | P0 | Yes |
| 4 | Pipeline — list view, filters, summary bar | P0 | Yes |
| 5 | Lead Detail — profile, score, timeline, actions | P0 | Yes |
| 6 | Manual Review Queue | P0 | Yes |
| 7 | Inbox — reply list, thread view, mark handled | P1 | No |
| 8 | Email draft approval panel | P1 | No |
| U | Realtime subscriptions (badges, inbox) | P1 | No |
| 10 | Settings — global pause, inbox, notifications | P1 | No |
| 11 | Pipeline board view (Kanban) | P1 | No |
| 12 | Analytics — all charts and tables | P2 | No |
| 13 | Saved filters | P2 | No |
| 14 | Keyboard shortcuts | P2 | No |
| 15 | Bulk actions | P2 | No |
| 16 | Campaign run history tab | P2 | No |

P0 \= required before first live outreach. P1 \= required within first two weeks of outreach. P2 \= useful improvements, not blocking.

21. # OUT OF SCOPE FOR MVP

    * Mobile app (responsive layout is required, native app is not)

    * Email compose and send from CRM (founders reply from Gmail)

    * A/B test management

    * Proposal generation

    * Client onboarding workflows

    * Invoice or payment tracking

    * White-label or multi-tenant

    * Public-facing pages

    * AI chat assistant inside CRM

    * Sequence step editor (view only in MVP)

    * LinkedIn or WhatsApp channel management

22. # DESIGN DIRECTION

Theme: Dark mode by default. Both founders will spend long sessions in this tool.

Aesthetic inspiration: Bloomberg Terminal meets Linear.app. Dense information, precise typography, functional color use. Not flashy. Extremely readable.

Color system:

| Token | Hex | Usage |
| :---- | :---- | :---- |
| Background | \#0F1117 | Page background |
| Surface | \#1A1D27 | Cards, panels |
| Border | \#2A2D3A | Card borders, dividers |
| Text Primary | \#E8EAED | Main text |
| Text Secondary | \#8B9099 | Labels, metadata |
| Band A | \#22C55E | Green — high priority |
| Band B | \#3B82F6 | Blue — good fit |
| Band C | \#EAB308 | Yellow — moderate |
| Band D | \#6B7280 | Grey — low priority |
| Positive Reply | \#22C55E | Green |
| Neutral Reply | \#94A3B8 | Grey-blue |
| Objection | \#F59E0B | Amber |
|  |  |  |

| Not Interested | \#EF4444 | Red |
| :---- | :---- | :---- |
| Urgent Badge | \#EF4444 | Red |
| Accent / CTA | \#6366F1 | Indigo — primary buttons |
| Global Pause | \#EF4444 | Red — always visible |

Typography: Monospace or technical sans-serif. Suggested: JetBrains Mono for data/code values,

IBM Plex Sans for UI text. Both available on Google Fonts.

Component style:

* Tables are the default. Cards only for single-item detail panels.

* Badges are pill-shaped, color-coded per system above.

* Buttons are minimal: outlined secondary, solid primary.

* No rounded corners larger than 6px.

* Score bars are horizontal, thin (4px height), filled with band color.

* Timeline items have a left border stripe matching event type color.

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAABHklEQVR4XtWSy0rDQBSG5xX0EXxtFcVVrRYVQsGliyaphqSE5n6bhFyEXN/gd85AuihCdSM48DGcc/7//LMYxv7n2e8dTNOEYRhO0ve9vMdxhGntwJqmwfZjJwYd2rY9Sde12OgGyMfKsgShKGt8ikZd13JA9zFNU2Nxv0RVVdLD8jwHkWWZGDyAFyU457I3QzXnGS6vrqVunjMqiDRNkSQJbm7vkMQxYgHVdMdxhLfNu9TMkIdFUQQiDEOoqio3KutXeJ4L13XhCR5XzyiKApqmSd3sYb7vC6EnB5Q0L3p6UaBuTSyWK1kT9AoKID3BHMeBruvSFATBARJblvltn4LIxwzDAKXTE38KpZKP2bZ9JrZd/BaRfH784f7ufAGHOgfsccXAIAAAAABJRU5ErkJggg==>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAACEklEQVR4Xq2SXUiTYRTHj4PNPgYyQnPlnE6Y2sxcpi5ZfpSNgkIy04QEF3aRFERCeue680IJgu6KCIJgiIJiH4YFQmajiy2z0C1XvK9737ZXyYtIsu3f46p370Sv7HfzwDn//znPec5D9L+A261Z7u18Ix7ZjR8vhrHqf4+ViVGItQYIpWmxtfx6jwyfTfjW044oMwXu9GK6sw3c3T78mpvGT+9r8AbCek+c+XTC94F7iNzuwYOCVLMy9yyXjg9nUHRl8D74PQSGSk5yXc4Z6ZwV0s0OLPffgPesbcMOvvpSLLbXQbreHJCDH4wpWLpYh4cmdZmnMguLV87Af60lNuPq0Cq8NJpDFUuXTiBk3ZkozhWp4bNnyYHJQ7sQaSpHuLUGQVfbNlnI8NfmQDxmTJi/FBC8CrPbQprQKQvC9cWY73bGZCHjXXk6xOqElmbzCQG7PmnOp4Wkn7JlItJgxezVxui/+KejJny16RLaSbYCwaKCr9WRIQf/MmHVQWqugNBSibH92uowu/KcSbGyMT3rzLr7LjeuKnxxHuWRgW84COn8YXjsBoSK1XiVqTCzvWkeawkLrADndCB4y1Wi8NOALfv0UJEOYsl2jDMdgsGkR4zzJI3wkRUQ9qkgnMwHf6EKC448iAdS8bkwBc+1m/ywNUIjIzveNtVwHvZN/WY2ivnP6TESxvcSwi/dSXvfEr8BScwChBuK+rgAAAAASUVORK5CYII=>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAByklEQVR4XoVTO2sCQRC+v5EuVVqbNHb+jpTpQ6zSWVlqNIqNYKFi8K2VgsoVEiJRBIMiGHwiii/wxAe+ney34Q41rw+G3Zv5vtnZ2TlBOIPX672Mx+PpTCazyeVyxNZdLBZ7C4VC9+dcBSx422g0aDab0eFwoGPs93vabrfU6XQokUg8nwh9Pt9doVCg5XL5TSgD/vV6TfV6nZLJpKiIi8UiDYdDTvhNDCA2nU6p2WwSF7rd7mtkgxPlyQl+MsTn8zn1+33y+/0PQiAQeB+NRrTZbBQCbLfbKXfFHsC6Wq1oPB5TKpVaCpFIZC9JEieBjJI0Gg0nq9VqXhE7hVQqFfdBDH46nSY0S8J90QyIgVarxffVapV/Y5/NZvkqi0VRJMFisTyVy2Veiny6XLZsxz48ZbfbJVZxizctHA4TOo4Ei8WC3x9EJJMNPgjb7TZheGw22xUXm0wmKRqNUq1Wo8FgQJPJhBOPDb5er0f5fJ6CweDXU8kwm81Ol8uFCaJSqcSHAc2DYfIqlQqPGQyG1xMh4HA4HiG22+3E+vBhNBrdLKFotVpf9Hq9U6fT3ZxrFLCfYYxy2F1OS/oPrGF5j8dDWq324jz2Fz4Bq4hZGji6HHcAAAAASUVORK5CYII=>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAABhklEQVR4XpWTWUuCURCGz08MuosiiijJIsolFxStbLEFtTIzsgwNTclo78KlTKGCsCSliKz+yHTeyfNBV9rAy3xn5nlgbj4hZHUZl2/73Ntk8KdbBhx4eKLXGnjJVhqUr35T/rmNSA48PDGynKLUbZ0OirW2Ax6eMAXPyZu+0zKbKNFsvEDeVHMmO96eWOEPB08Y1o7JuVfkOKJFKlcbhJpLlHk2L7sq7BULT4z7DskeyXFs21kqVT9/5f0bnqGrwl6x8MToUoImNy85ptAFFZ8+GJyO5ng2Hc1qMvaKhSeGF2JkDJ5yJtZP6KbyzqBr54pnbtlVYa9YeELn2aVxf4YzJk+5fnxj0Bk+45lz60yTsVcsPDHgCssTkhz9YoLyD3UGbcEMz+zBI03GXrHwRJ9jQ54Q5+jmY5S/rzFoWU3zDF0V9oqFJ3qsARqc2eUMNbslkKKBqQh/o+Nt9iW1PQJPdBkW5Qlb/w480aFzfPU7Q/TfwOOfo1Pvfu02r8hT/C0DDjy8HyVHedHkpj4iAAAAAElFTkSuQmCC>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAABdElEQVR4XpWTTUsCURRA308M2kkRZphYQqKWFkr2QfkVjoiZ0ahlmY0UWUahZaIQLgQxKoIiamlkZbTt9u4bHTIU9cJZzJ1z4DIwhNCR6V15uXUDdFy8I+ihjx0ZMnluzktPkLl+gUy5C6iHPnZk3CWAkL+Dvdxt16CPHTH4TsAeLzBsQgES2SI4o5fgqO/agR3ReRNg2cwxjHwWqrVvwHFH02AMivtWYEe07n2Y4S8YhkAKXt+/WNwYbywF03xGchpgRzTOXZhaO2VMeJM0rjXF4vxANJkFg1/0EOyI2hYBve+YoeEO28TiBI/ykosdUS2GQMsdMNROASrVz/8Nm1zpkX7huORiR0ZmA/SEGEO5tA2Vt4+mKJYugsq2IzkNsCNy8yo9YZuhmA83xY6tM1AvR6T3f8GODJo8oFwIMRRzPFyVH8AeTrLn0fq+FdgRmc5BT1jvGexIn8r8PGzxQ69gx36O/jHr/cDkCj2F6wh66GP3C92/g4n0ViJKAAAAAElFTkSuQmCC>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAABYElEQVR4Xo2QsUtCURTGv+emURmvHLK26r9waWnMhrb6I8TFdgWHaImGpiA0KAgRJTGqJ6FlZkOBSUOEOUVDtNZwuudcn++JaR343cf9zved894DuBKBMnb8NJZaoNHU/EC4zz7xS20GGrGXOG204hT7B+JTfs4B6QkKN9dpubk2kLBiqbFKi/dhWlFe9nMOyJs0eTM3FKNiEn2RlPd6WjTOAblxQtk/lOTDlgT33tKOzjlkvYRL32AuoFeqgmU4OueQ8RBKHjKtKfIVRsgo6rtN+70twZmr2R5dcshATQQFK0E9/ps3aA1neqv1YRHOO5oN53AM3VDUPmtijlQjEqy/1vXrFh1PF87hSB2nHQrOgORdUp6h25DTd8M5HEJPtsk7P4iL7z19G87hQB0nvSSeE3prNdTX68I57ENPd5MDRR+j/bobzmEbLTb3kf1Fc8M5qV08yTfwH/wL9rFf1Q+UvM7tbxlrbQAAAABJRU5ErkJggg==>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAA80lEQVR4XoVRSwrCUAwM4qZYz+PmLe0B9BTi1gtY1668n4Kg9VdBpWqVQs08TUkf6hsYmmRmkpYSMYput/9stUrUPsAHv20eUdTLiUrLdrtwvDVAFy9ydObipnj/sSA3Zqh9yFnhxEWmeHUWoNc6/JU4JmoeeXBRzIwZQcNTz+GDvwoLdp+tFcOw1kN3MzXMiGJsd7nyBQXbRqNI2SxE73q+4tjpxHsOuDwEwf/LOzZscenDuapB6G7GAhc3bBAu6P2NeOo5fLVgwhvXLAhxUevotQ6/FVJPUDDlv6B9yNGEaJB4ggJ5A/iRs0MUS09QAJ8EX5Mw487g+uCSAAAAAElFTkSuQmCC>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAACAElEQVR4Xo2T7U9SYRjGn3+x5pcUC19mktBmvDg4hQSk5UHqoIJHwo4CpqC4DBptAibNxdpMe9EtPzT60MvENVs1fGlXz33K48m12bP9tufc9/U7u3a2wxg/TT1BX4vnLqzS7KlQrtke7CePXRBGxMLaO5RevUfp5X/Ac5Q/7xoKMXMghfTTTaTKGzo2kVh6g8nCOpJP9PPfUJ48Zg/nMDBbwUC6gr5UBb5kGT++fYX+7NS2IaWWIFLuD+Qx6/AC3JNlDKZXsPr6LQ726qpQ3z9E9fPuXy+xR4tqliCPdd/JwBkrory2pYVskUcQxosa3viytnPGCuqMPGYJTMMSyuLn4YEWuJd/gR45r+MxHKN5WKSH6p1m5LFLtxK4LD3A9/o+vMoiTIMZ2MLZf3JlJAfH0BwEOQvyWOcNBd3SvIo5mEFXIK09H+GOzGP52arWTJBzII+1e8Z4hRm0+ePqgup3iTPq7AiDR0Hty/HHM3onQB5ruRbhFZIw3UxoSzE2h87+pDrv6EtgamFR233a2UW7fwLksWZnCB1+RaXRJaP6saYFeQ/dHTAIMmy3p3GRZ8lj56wirxA95noUrb1jWFnfQvXDNkrPN2BwhdHGZ/pcI/fYGZNbaXWP4iTGq2EYnMMw8nond8RZU+999edoMHvjTY4gryKdCuUazL4p8n4B28KLUuZF61kAAAAASUVORK5CYII=>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAACg0lEQVR4XlWSy2sTURTGu3HrQsGVtVShf4DgzoV07cKlWBSlUKhu3LbopqAWQbF1I5QWFMSkeQq1wWqbpDHNs5NMHk1ikpkkM5NXk6a1JLRJyOe5F5q2Fw4z9/G733fOuQMDNIrFImq1Gvb29ng0Gg0eJ/OTqNfr2N3dhaqqYBwfdQKbzSY6nQ7a7TY/0Gq10Gq2wEa32+XrvV4Ph4eHtF89A9ONpWIJKyurSKfTsNl+4tfvdfrPYH19A06nk6+7XH9QLpdRrZ6BmWVN07gCU2dDkmWuFAqF+Jy5EcUIt8/S7MNsQ1EUSJIEmSCdXo9cLofj4yMEg0GEwyJ8Ph/8fj8K9M2Teh+u0CSRTPCCmC1WbtHtdsPj8cBgNPFiGulrX1sDTEZgaYmducjhEtkIh8JIJpOIRqMo5PNkW8L+fgPVSgVfDWuQdIOYN4h4O/cR2ptZmMbHGxxWyXKD5UJ5/zs4QDabRZ4uUFUFSqEA1TwMeIchGm/Dqv+C6ZdTrAwXOKwoBfi8XgiCAJZCjVpRLhWhUT8V83Vg+xYQGYX8bRDLMyMYe/jkNGeZLNo3NriSzWbjOVt/uCAuXgYCN4HUXeT11yB+uoTXs3PYicdO4UwmTX3WeK7VSpkUFZRXCfJcBcQ7KCwPQVgYwdPJCeRI6BycJdi1uQmLxQyHwwG7cwtH4WlAGIViGEJs4QoeP3pARRWoHpnzcIrapNPp6IWtIJVKwvl9HtXgB/itL5D4fAMzr94jn5MhS1kwoRh1pA8nduJw2O38AIux+/fgs0xh8d0zTEw+70PZTAbpvylEI+IpvB0M0G0Rbicei8FMD8Hr2UIysYM4qbC9eCzKg4EBv4/D/wH/QZxy3FFbKgAAAABJRU5ErkJggg==>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAA9klEQVR4XtWRTW7CMBCFva56Gk7SXQ9Q1mxZVb1FFyQhDtwAcYo2vy30EGUZJXEo0mNmHKcEIbGOpU+eeX7PY8lKjXcdDz+TNgvQfq0HHL9pZ6Rfockj2R0SNpkPU1jBFBGaTMPcMA8gnzKpJ4F7NLm+6kOoOg2weX3B9m0KQ4Y6C9EUWmoJSIhq1plOl/DffoU4jh/4+e1u3YcEDuXDgCAXLWly4kPPn/E+e0JFr6hJtBMujaHo7szWAYcX4KdzY3drYspPTyYM9a5OfSjg95Gni8HRmaqEaubyzEGZ/q/rxDtVJAipgy9gzUP5sfjXO60Pj2udAYC5s5WktMjcAAAAAElFTkSuQmCC>

[image11]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAACHklEQVR4Xs2QXUuTARiG3yAiUFMPJLIsppVhiSGptDIVSWkpO9A1Kx2VTMsWoUYWKHtTJFR6l9JS8yOd2lxO8QPMLzQsTLAspyPThnWwA4uo0wK7mnUQ2x+o6/i+7ufhFoT/ihNJyQZFsgJ1egZn1Bo0WTnfs85qyzxzbsgPRZhOuqSmuk5qquop0OZTIVbQ3dVHc0MTytR0VCqVt6cnhO7aKtNqcmiutaBTn6emuAB9dgpFGXGoo4OZnprlQW2tqyANN3HfjoArmWlq7LPvmBzsZ/HlFGtrayzMzpF5PIHr6cGck/vjcHzAUCURKz/2t0ClUDA3bWOd0swkKnVKjOWlnE5MJDniIId3bqMsw4+RXgtWcxf5Fy8THRkZK4QEbNndbmzBueLkp0sWTx3laloS6vh4UqOiOCKTsdfLn4d53jRUFtNr6eGOWEbEgfAvQkxo4I+hx/18fOv4fflaQhD3svcTFxJCTOB2wn19SQnzYsTgw/iTQTobWzGUiFzSXEAQRXFTtb6c6fFJvq5+5tuqE3OOH8MlPijDvKnKDWB5dA93tQLPxiZokaoRdTo+2e1/VncVbOxqbWPh1WtWlt5zWxnEmH4zcy0+zPe4PtFu4MXTCYasPUg3iyjMzXNffJ2BToutr8OMbWaGpcVl7LYFbG/meT46xrC1m/LCAqztj254em5YTaaBtrp6TMb7NEoSkv4Wkljq8Mz9O34BTHA2awgTzccAAAAASUVORK5CYII=>

[image12]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAABCklEQVR4Xr2Sy0rEQBBF+1sFv8IfUXCl7gdRt+O4SSI4jnmR98skDEnoJJAPuHaVM0FEhCy04dDF7bq3GrqF+PfVSnkyTdPZErpOngrHcTGOI/q+/xUpJe/DMOB19wZR1zXW60d0XYe2bWeappn5qt/dP6CqKoiyLFEUBVarW7xXexZ/oq4rXF3fcC95RJ7nINI0xbNhICtKrrMsY6jOlXZ+cTnr1C+SJAERRRFc14VtWwjCGL7vM1Rvty/QNA1hGCKOY0YEQcANuq5zGgUYqnZcn3nabFijcDIfAwVNMdQV6ZBCjkGE53mfUw86TaQB5FHP4XDDEmzbhjBNc2dZ1n4JymN9/0h/vz4Ac+bsD21ND3UAAAAASUVORK5CYII=>

[image13]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAABiklEQVR4XnVSy2rCQBQNdN99/6V7v6M/0Ir0AwRduHLhRhR0484XLiJKFCQ7xXYjgkjEgLG+JUGFaqKezp0ybRL0wGEmuffMPffOSJIPhULhpdls6p1OB+12G4qiGMVi8S2fzz/4czkajYY1Ho9xOp3gxvV6heM4ME0TdJhHVKvVvpfLJc7ns0fkBh2w2+3Q7Xb/xb1eD4fDgQeJt0D/bduGruu/wlwu924YBrd4uVx4Aq23SDnr9RqVSkWWSqXS13a7/RMRybL4pj1VolX02mq1QFN0hJAYCoUwmUygaRoikQi3GQgEeEwIVVWFlEqlVJrm8Xj02BIV3NXJ6mq1QrVataVwOPzIrgKLxQL7/Z4nC6GbJKJq/X4f2Wz2lQ8oHo+bVH40GoFs09jpEEHLsrDZbDAcDsFa894ls0wWMBgMQFOezWac8/kc0+mU9yzLMmKx2LNHyMojnU4jk8mAPTGwR4F6vY5yuYxkMoloNKp4BAJklWywnj/9sbtgd/mRSCS0YDD45I/dww8FlQ0AGXDpaQAAAABJRU5ErkJggg==>

[image14]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAA7ElEQVR4XpWSPw/BYBCHf/cm4gsws/kWHcwWs+9hqBRDJSLxN4IIg4RIGMRisLPbfAsJs5y76sCbkPYuT3O9/p68aVPArgFcrMDYheisu19leqaBLbh0L3FFuhy2zrpLHpMcZL6ktvEzlwwXpQvPwk80Yzqf8hqcf+TZuTl/0Yxm31ITbvaS5dw1FwnNqgNMwelzmlOnVCQ0qw5oSZw4JGKhDmghlz1iETg0JKZNTMQB6nBpJTcxUCf4sDSn4PhIzPW0sEzV+DR7L/8iGVOz/x7PNKgvDyfC2EJ3I5E8S/oqT965JcFuiMy6s2MvN9slMjZQIJIAAAAASUVORK5CYII=>

[image15]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAACMUlEQVR4XlWRy05TURSG+xS+gEZl4khHXl7AiEMTp0yMQ+PQqCnGgcNGCQkhNEiKRCsEkDKgFtCmSEtbOD09LdAWsFfonbZwevvc+xBbXclKzt57ff//rxyTSVQ6naZQKFAsFimVSr2W578t309OTkgmk0jGqEI+T7VapdVqoes6tVpNDBdot9t0u12azabx3WzqAj7ug0Whls8XyOVyPQE5eH52hhaJ0Gg0aIu7RqNuzPTAvHD0b/kvVIWjpkWMqJteL51Ox4gYje5SqVSQa/XAY6EiIRlTlnSSLt1uh3q9jn5+zulplbLVisNi6YPZbBaPZ4NUKoXb7cbn8xEMBnG5XKyurfFldhmX08mSZQxmZpixWF4YYCaTYX5+HofDQVrAkx+nSCQSLC5+Y9q+gu4wsWW7xecFJ9NmM3t2+2sDlMNzs7NMTFiplMuUS0WyQix+VKGxaILAPYgOsvDuBg8HH/SjHh4kjFiVcomyaCkUimbQlyR0h3bgLr7Ry0y+GmB9bbUP7u/vcZzLcnR4iPynqhantSwg/206AvKPXcVmHuC7c4WwGuqD8XiMr3Y75uE32Gw2Rj68hx+XRLz7BMauM/nyCo8eD3GQiP8PRrQwGx6PsVtOOCfW31JWxglP3eTT8DXx5jageCyGGvoH1MIqqeRv5K7BQIC58ecsWZ/x9MkQHvdPYmIV2ft7uyg7231wy+cVSooRQ1NVRkdHCCnbxjmk7Fy8CSdVUfBu/jLAP7oRQzYR7wY6AAAAAElFTkSuQmCC>

[image16]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAACH0lEQVR4XrXRXUiTURgH8ENXXXSRfcwoKiu3JVtvFM0pY72atpUsbFGpUIixhCVuRS5tbCOTjfZlbUJmc26JX9U0hJKKwC6KyM3V9ibbKpixchhkUBEWxL83A0UJoose+MHhPOfPw8Mh5H/U+Pb1nycP7Xk0qaq4NqGtvriwT74AmfzsjRAIhOBnrUXbN8D8FviQSfB+0xJMsN6x56qHXzEvyKGkEAi3zJIWy3B7GkhnEIxTaxDnZYBZSnDvB3B3GomZ0IP4FCURi0AXFCISZeD3d0Jffwa66HekVxI4zB0wPU7jAvMJ56MfYQhP/Z5aHYi5ysvKId9bgmAojED/AJzNTsh7x5BaRtBw0oL9PaOsEEq7gyjtCqKiJ7ibHLgZ9yiVShTL5HgRS8DtboHd7oDIOoQ3ywk0R7TIM/cj3zyAfMsvtyCxDlaSsi7mikKhAF1YhFj8JTp8ftTpdBDqe/Ganag+qAZV176AR0NqAhGbXCaDdCeNsVgcHq8X5xobkXPah2ecRdhXaYBAc3lO7Yx60jz8qqGApiHKzWN3HEVf33UYjSbwNVfBZR/lqC9hs9o154SLvXM3Ed/TVK1UvAPbtlJgnofR3tYKk0EPXk0reMeds7isbJUTG47ZkVXlsJJkMrl4OJRYcWdkZJV38P5qratzna7JxpXtysXhEjEkQs78T/9bGdUKRIYsOKsq+reg5ZQSqSctuGE7+sfgT05qRNyjNLF0AAAAAElFTkSuQmCC>

[image17]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAYAAAByUDbMAAABiElEQVR4XqWTQUsCYRCGZ48eOkXQVQIv+SOCfkS3fkJHoVsQdCjwVIcwolOUh/IUERERlIekDJfSVDQlYbVyJU3M+KZ5VxPcjHR34OHjm5nnZRd2iQZUfIl8qVUtmt8iLu0TG4edE3f0Mbc7AysV1HQjQvwR93O7tMjqbYOVGbJO3NHHHHt2t1fFIHmetokb1+OsXlaYa4K5/BvpY4497MOzZ1Fhh7ilTzG/BoSFIQhY+/D6grLrWrp5M8Zcnmc25oZH9uHBt4KSa+StnhDz8yxzaWZ0xIOPHMptarHPhDxVwS9MO8DP8JFD5QNilZlgzk06Bj5yqHYqr5jxuAY5VL+QsLTw6ALxkUP1c7mkhKQLxEcOmUdyeXAPcsjY1WIqIY1758BHDuVD5G1dSVN3DnzkWB9uJUxpdScDPOGIwKuEu3/AT70fyzAuIHRYZB9eXxCqGCZPQ34LddsN/QfsYR+ePatX1QjpX1EREPoHmGPP7g6syh75zAhFm2fE7cuOjBN39DG3O6hvzrxfn2ZlaY4AAAAASUVORK5CYII=>