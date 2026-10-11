# The pilot — one manufacturer, one catalogue, sixty days

Four documents in one file:

- **§ 1 The offer sheet** — what you send.
- **§ 2 The measurement plan** — how the pilot is judged. Write this down *before* the
  first dealer logs in, because a number you start recording after the fact is not
  evidence.
- **§ 3 Outreach** — the message and the questions that qualify.
- **§ 4 Pricing rationale** — the reasoning you keep to yourself, with the market anchors.

Every figure in § 1 marked `<…>` is yours to set; § 4 explains how to choose it. Nothing in
this file claims a result the software has not produced yet.

---

## 1. The offer sheet

> **Your cabinets, configured by your dealers, in a browser — priced by your rules, without
> changing your production software.**

**What it is.** A configurator that runs at a web address branded to you. Your dealer opens
a link, chooses from your product families, sets widths and options, and gets a priced
quotation and a bill of materials on the spot — with the prices, parts and edge banding
your rules produce, not a guess.

**What it is not.** It is not a replacement for your design-to-production system, and it
does not cut anything. Quotes it produces are illustrative and are marked as such; your
dealer verifies before anything is ordered.

**What you give us**

| | |
|---|---|
| Catalogue | One product family to start: widths, carcass construction, materials and thicknesses, hardware, edge banding, and how it is priced. A price list and a spec sheet, or two hours with the person who knows. |
| Brand | Your name, tagline, accent colour, logo (HTTPS URL). |
| Dealers | Two or three dealers to invite, and the trade terms each of them buys on. |

**What we deliver**

| | |
|---|---|
| Catalogue document | Your family digitised into a validated catalogue file. If it is wrong, the software refuses to load it rather than quoting from it. |
| Branded instance | Your own deployment and database, configured from a file — no code change, no rebuild, your data separate from anyone else's. |
| Dealer accounts | An access code per dealer, each resolving to that dealer's trade tier. Revoking one is a configuration change. |
| Trade pricing | Each dealer sees their cost from you, the margin they make, and the price they quote their customer at — with a resale discount they control. |
| Documents | Branded printable quotation, CSV bill of materials, and a production BOM export carrying cut sizes, machining and assembly order. |
| Hosting and refresh | We run it. When your price list changes, the catalogue is updated and the price refresh is covered by the annual fee. |

**Timeline**

| Day | |
|---|---|
| 0–5 | Catalogue digitised; you review part names and prices. |
| 5–10 | Corrections; the instance is branded and deployed at your address. |
| 10–14 | Dealer codes issued; a 30-minute walkthrough for whoever trains the dealers. |
| 14–60 | The pilot. You invite your chosen dealers; we measure (§ 2). |
| 60 | Readout: what changed, and a decision to continue, adjust or stop. |

**Price**

| | |
|---|---|
| Setup — catalogue digitisation and deployment | `<setup fee>` for the first product family, `<per additional family>` for each one after. One-off. |
| Platform licence | `<annual fee>` per year, billed annually, covering the instance, hosting, up to `<N>` dealer accounts and one price refresh per quarter. |
| Extra dealer accounts | `<per account per year>`, above the included `<N>`. |
| Add a product family later | `<per additional family>`, one-off, plus its refreshes inside the licence. |

**To start:** a signed order and the catalogue information above. First dealer live within
two weeks of receiving both.

**Payment:** setup on delivery, licence annually in advance. Terms in the accompanying
commercial licence.

---

## 2. The measurement plan

### 2.1 Why before matters

A configurator is easy to *feel* and hard to *prove*. If the baseline is not captured
before the dealers use the tool, everything afterwards is anecdote — and a manufacturer who
buys on your anecdote will not renew. So: **capture the baseline in week 0, in writing.**

### 2.2 The four numbers worth measuring

| Metric | Definition | Baseline source | Pilot source |
|---|---|---|---|
| **Quote turnaround** | Clock time from a dealer receiving an enquiry to sending a priced quote for that enquiry. | The dealer logs their last 10 quotes (dates from email or CRM). | Ask the same dealers to log the same field for quotes made in the tool. Date-stamped by the enquiry email; the tool records when the quote was produced. |
| **Dealer adoption** | Of the dealers invited, how many produced at least one quote in the tool; and how many quotes each produced. | n/a — this is new. | The instance's own access log and quote exports. |
| **Order errors and remakes** | Units remade or credited because the order did not match what was intended. | The manufacturer's own credit/remake log for the last two quarters. | The same log, for the pilot period, for the participating dealers only. |
| **Quote volume and value** | Number of quotes and their value, per dealer, per month. | Dealer's own records for the two months before. | The same, for the pilot. |

### 2.3 Protocol

1. **Week 0 — baseline.** Signed from each participating dealer: their last 10 quotes with
   date received and date quoted; the manufacturer's two-quarter remake/credit log; two
   months of quote counts and values. One page, one hour.
2. **Week 0 — agree the decision rule** (§ 2.4) and who will read the numbers. If the
   manufacturer will not commit to a rule in advance, treat that as information about the
   deal.
3. **Week 1 — go live.** The same dealers. No other change to how they work, so the only
   variable is the tool. Where possible, keep one dealer on the old process as a
   comparison — with two or three dealers this is indicative at best, but it stops the
   whole result being "everyone was watched for a month".
4. **Weekly — check adoption, not outcomes.** If a dealer is not signing in, that is a
   training or incentive problem and it is fixable in week one. Left to week six, the pilot
   has failed for a reason that had nothing to do with the software.
5. **Week 4 and week 8 — read the four numbers** against the baseline, same definitions.
6. **Week 8 (day 60) — readout.** One page: baseline, pilot, delta, and what to do.

### 2.4 Decision rule, agreed in advance

| Outcome | Read |
|---|---|
| Quote turnaround down by **30% or more**, and at least **3 quotes per dealer per month** with no remake increase | Roll out at the quoted annual fee, and add the next product family. |
| Turnaround improved but adoption below **3 quotes per dealer per month** | The tool is fine and the incentive is not. Fix adoption for 30 more days before any money changes hands. |
| No turnaround improvement, or remakes up | The catalogue is wrong or the workflow does not fit. Fix it, or stop. Either is worth knowing at day 60. |

### 2.5 What this cannot show, stated up front

- **Small n.** Four dealers over eight weeks is a signal, not a study. Do not present it as
  one.
- **No proof of causality.** The tool did not *cause* a sale; it made quoting faster, or it
  did not.
- **Attribution.** "Quotes went up" is not "my tool caused quotes to go up". Without a
  control group, the honest claim is *"quote turnaround fell from X to Y for these dealers
  over these eight weeks, measured the same way"* — which is a real claim, and it is enough.
- **Watch for the denominator moving.** More quotes at the same conversion rate is not more
  orders. Track value, not just count.
- **And the one to refuse:** there is no evidence that a kitchen configurator reduces
  returns. Do not claim it.

---

## 3. Outreach

**The message.** Short, specific, and never about the software:

> We've built a browser configurator that runs your catalogue, your rules and your dealer
> pricing — your dealers configure and get a priced quote without installing anything.
> It doesn't touch your production software.
>
> I'm looking for one manufacturer to run a 60-day pilot on a single product family.
> If it halves your dealers' quote turnaround, it's worth `<annual fee>` a year to keep.
>
> Worth 15 minutes to see whether your catalogue would work in it?

**Who to ask.** Not the marketing department. The person who quotes jobs: an
owner-operator at a cabinet shop, a dealer principal, a national sales manager. Anyone who
has to answer "how much for these cabinets?" on a Tuesday afternoon.

**The six questions that qualify the buyer.** If they cannot answer 1–3 in detail, they are
not the buyer yet:

1. How does a dealer get a price today — step by step, and how long does it take?
2. Who types it, and where does the price come from?
3. How often does the price list change, and who updates it?
4. What does a dealer get wrong most often, and what does that cost you?
5. How many dealers do you have, and how many actually sell the line?
6. If a dealer got a quote in five minutes instead of a day, what would change?

**What to show.** The studio, the door opening on the selected cabinet, the quote, the
production BOM — and then the dealer sign-in, because *"your dealer's price, not ours"* is
the part no competitor at this price offers.

---

## 4. Pricing rationale (internal — not for the client)

### 4.1 Why not one-time

A one-time fee sells the software and gives away the recurring work, which is the
**price refresh**. Catalogue prices change every year; a catalogue that goes stale
silently mis-quotes, which is the worst failure this product has. Sell the *catalogue*
as the subscription and the *deployment* as the one-off.

### 4.2 The anchors

| Product | Entry price | What it is |
|---|---|---|
| Zakeke | $69.90 → $129.90/mo | Branding removal starts at the higher tier. |
| Kickflip | $59/mo | +$49/mo to remove "Powered by Kickflip". |
| Angle 3D | $39–199/mo | PDF export and quotes only at $199/mo. |
| TimberCloud | $199/mo for 3 users, +$30/user | The closest thing to a dealer browser portal. |
| Roomle | €8,500/yr | White-label is enterprise-only. |
| Combeenation | from €800/mo + €10,000 implementation | Typical project €30k–60k. |
| Mozaik | $125–325/mo per seat | Manufacturer-side design software. |
| KCD Software | $99–295/mo + $1,995 startup | Manufacturer-side. |
| Cabinet Vision | $226–332/mo, 12-month minimum | Manufacturer-side. |
| Microvellum | ~$50,000 with 40 hours of training (reported) | Manufacturer-side, installed. |

*Sources: vendor pricing pages for Zakeke, Kickflip, Angle 3D, Roomle, Combeenation,
Mozaik, KCD and Cabinet Vision as published at the time of writing; WOODWEB forum report
for Microvellum. Re-check before quoting a client.*

Two things follow. **Embedding is the cheap part; white-labelling and quote/BOM export are
the premium features** — and those are exactly what this product does. And **$500 one-time
is two and a half months of the cheapest browser competitor**, while carrying the catalogue
work forever.

### 4.3 Suggested structure

| | Suggested | Why |
|---|---|---|
| Setup | **$2,500** first family; **$900** each additional | Roughly 1–3 days of digitisation and review per family, priced as services rather than as software. |
| Licence | **$2,900/yr** | Between TimberCloud's $2,388/yr and Roomle's €8,500/yr, and less than one Cabinet Vision seat. One sale's margin covers it: at trade terms a single kitchen carries ~$1,500 of dealer margin, so *one* extra kitchen a year pays for it. |
| Dealers included | **10** | A dealer portal the manufacturer cannot put its dealers on is not a portal. |
| Extra dealers | **$120/yr each** | Makes the dealer count a growth story rather than a limit. |
| Refresh | Included, one per quarter | This is the recurring work. Do not give it away with a one-time fee. |

Say the number as a whole ("$2,900 a year, first catalogue digitised for $2,500") and never
lead with the monthly equivalent — $242/mo invites comparison with a $59/mo widget that does
none of the production work.

### 4.4 The week you are actually in

1. Send § 3 to five people who quote kitchens for a living.
2. Take two 15-minute calls.
3. Pick one, offer the 60-day pilot on one family.
4. Only then write more code.

The software is demo-able today. What is missing is a person who would pay — and the pilot
is how you find out whether the price is right before it is a mistake rather than after.
