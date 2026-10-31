import { CHECKLIST_TEMPLATES, type ChecklistTemplate } from "../checklists";
import { formatDate } from "../dates";
import { marketConfig, type Market } from "../market";
import { currencySymbol } from "../money";
import type { DocBlock, DocContext, DocOverrides, DocumentTemplate } from "./types";

export const DOCUMENT_DISCLAIMER =
  "Business template for organisation purposes only. It is not a legally validated contract, tax document, insurance or safety certificate. " +
  "Requirements differ by US state and locality and in the UK — review with a qualified adviser before relying on it.";

function v(value: string | null | undefined): string | undefined {
  return value && value.trim() ? value : undefined;
}

function checklistBlocks(template: ChecklistTemplate): DocBlock[] {
  return template.sections.map((s) => ({ type: "checklist" as const, title: s.section, items: s.items }));
}

function checklistDoc(slugOrIdx: string, num: number, markets: Market[], description: string): DocumentTemplate {
  const template = CHECKLIST_TEMPLATES.find((c) => c.slug === slugOrIdx)!;
  return {
    slug: template.slug,
    number: num,
    markets,
    category: "Checklists",
    title: () => template.title,
    description,
    usesClient: true,
    usesJob: true,
    build: (ctx) => [
      {
        type: "fields",
        fields: [
          { label: "Client", value: v(ctx.client?.name) },
          { label: "Service address", value: v(ctx.job?.address ?? ctx.client?.address) },
          { label: "Date", value: v(ctx.job?.date) },
          { label: "Cleaner(s)" },
        ],
      },
      ...checklistBlocks(template),
      { type: "paragraph", id: "notes", text: "Notes / issues found:" },
      { type: "fields", fields: [{ label: "Notes", lines: 3 }] },
      { type: "signature", labels: ["Completed by", "Checked by (optional)"] },
    ],
  };
}

const TEMPLATES: DocumentTemplate[] = [
  {
    slug: "client-intake-form",
    number: 1,
    markets: ["US", "UK"],
    category: "Forms",
    title: () => "Client Intake Form",
    description: "Collect contact details, property information and cleaning preferences from a new client.",
    usesClient: true,
    build: (ctx) => {
      const t = marketConfig(ctx.business.market).terms;
      return [
        {
          type: "paragraph",
          id: "intro",
          text: `Thank you for choosing {{business_name}}. Please complete this form so we can plan your cleaning around your home and preferences.`,
        },
        {
          type: "fields",
          title: "Contact details",
          fields: [
            { label: "Full name", value: v(ctx.client?.name) },
            { label: "Phone", value: v(ctx.client?.phone) },
            { label: "Email", value: v(ctx.client?.email) },
            { label: "Preferred contact method" },
          ],
        },
        {
          type: "fields",
          title: "Property",
          fields: [
            { label: "Service address", value: v(ctx.client?.address), lines: 2 },
            { label: `${t.postalCode}` },
            { label: "Property type (house, apartment/flat, other)" },
            { label: "Bedrooms / bathrooms" },
            { label: "Pets in the home" },
            { label: "Parking or access notes (do not write alarm codes or key locations here)", lines: 2 },
          ],
        },
        {
          type: "fields",
          title: "Service preferences",
          fields: [
            { label: "Service requested (standard, deep, one-off, regular)" },
            { label: "Preferred days / times" },
            { label: "Areas to prioritise or avoid", value: v(ctx.client?.service_preferences), lines: 2 },
            { label: "Product preferences or allergies", lines: 2 },
            { label: "How did you hear about us?" },
          ],
        },
        {
          type: "paragraph",
          id: "privacy",
          text: `We use these details only to provide and administer your cleaning service. You can ask us to update or delete your information at any time by contacting {{business_email}}.`,
        },
        { type: "signature", labels: ["Client signature", "Date"] },
      ];
    },
  },
  {
    slug: "cleaning-estimate",
    number: 2,
    markets: ["US", "UK"],
    category: "Sales",
    title: (m) => `Cleaning ${marketConfig(m).terms.quote}`,
    description: "A printable estimate/quote layout. For a priced document from your data, use Quotes & Estimates.",
    usesClient: true,
    build: (ctx) => {
      const t = marketConfig(ctx.business.market).terms;
      const sym = currencySymbol(ctx.business.currency);
      return [
        {
          type: "fields",
          title: "Prepared for",
          fields: [
            { label: "Client", value: v(ctx.client?.name) },
            { label: "Service address", value: v(ctx.client?.address), lines: 2 },
            { label: `${t.quote} date`, value: formatDate(ctx.today, ctx.business.date_format) },
            { label: "Valid until" },
          ],
        },
        { type: "table", title: "Services", columns: ["Description", "Qty", `Unit price (${sym})`, `Amount (${sym})`], rows: [], blankRows: 6 },
        { type: "fields", fields: [{ label: `Total (${sym})` }] },
        {
          type: "paragraph",
          id: "terms",
          text: `This ${t.quote.toLowerCase()} is based on the information provided and the scope described above. If the condition or size of the property differs significantly, we will discuss any change before starting work. No taxes are included unless shown as a separate line.`,
        },
        { type: "signature", labels: ["Accepted by (client)", "Date"] },
      ];
    },
  },
  {
    slug: "service-invoice",
    number: 3,
    markets: ["US", "UK"],
    category: "Billing",
    title: () => "Service Invoice",
    description: "A printable invoice layout. For numbered invoices linked to jobs and payments, use Invoices.",
    usesClient: true,
    build: (ctx) => {
      const sym = currencySymbol(ctx.business.currency);
      return [
        {
          type: "fields",
          title: "Bill to",
          fields: [
            { label: "Client", value: v(ctx.client?.name) },
            { label: "Billing address", value: v(ctx.client?.address), lines: 2 },
            { label: "Invoice number" },
            { label: "Invoice date", value: formatDate(ctx.today, ctx.business.date_format) },
            { label: "Due date" },
          ],
        },
        { type: "table", title: "Services provided", columns: ["Date", "Description", `Amount (${sym})`], rows: [], blankRows: 6 },
        { type: "fields", fields: [{ label: `Total due (${sym})` }, { label: "Amount paid" }, { label: "Balance" }] },
        {
          type: "paragraph",
          id: "payment",
          text: `Payment is due within {{payment_terms_days}} days of the invoice date. Accepted payment methods: [list your methods]. {{invoice_footer}}`,
        },
        {
          type: "notice",
          text: "Sales tax / VAT is not calculated by this template. If you are registered for tax, add the legally required details and amounts for your jurisdiction.",
        },
      ];
    },
  },
  {
    slug: "booking-confirmation",
    number: 4,
    markets: ["US", "UK"],
    category: "Client communication",
    title: () => "Booking Confirmation",
    description: "Confirm the date, time, scope and price of a booked clean. Can be filled from a scheduled job.",
    usesClient: true,
    usesJob: true,
    build: (ctx) => [
      {
        type: "paragraph",
        id: "intro",
        text: `Dear {{client_first_name}}, thank you for booking with {{business_name}}. Here are the details of your appointment.`,
      },
      {
        type: "fields",
        title: "Appointment",
        fields: [
          { label: "Service", value: v(ctx.job?.serviceLabel) },
          { label: "Date", value: v(ctx.job?.date) },
          { label: "Arrival time", value: v(ctx.job?.time) },
          { label: "Estimated duration", value: v(ctx.job?.duration) },
          { label: "Service address", value: v(ctx.job?.address ?? ctx.client?.address), lines: 2 },
          { label: "Agreed price", value: v(ctx.job?.price) },
        ],
      },
      {
        type: "paragraph",
        id: "prep",
        text: "To help us make the most of the visit, please clear surfaces of personal items where possible and let us know about pets, parking or anything we should avoid.",
      },
      {
        type: "paragraph",
        id: "changes",
        text: `Need to reschedule? Please contact us at least 24 hours in advance on {{business_phone}} or {{business_email}}. [Add your own cancellation policy here.]`,
      },
    ],
  },
  checklistDoc("standard-cleaning-checklist", 5, ["US", "UK"], "Room-by-room checklist for regular cleans."),
  checklistDoc("deep-cleaning-checklist", 6, ["US", "UK"], "Detailed checklist for deep and first-time cleans."),
  checklistDoc("move-in-move-out-checklist", 7, ["US"], "Checklist for vacant-property move-in / move-out cleans (US)."),
  checklistDoc("end-of-tenancy-checklist", 8, ["UK"], "Checklist for end of tenancy cleans (UK). Not a deposit guarantee."),
  {
    slug: "client-welcome-guide",
    number: 9,
    markets: ["US", "UK"],
    category: "Client communication",
    title: () => "Client Welcome Guide",
    description: "Explain how your service works: what's included, scheduling, payments and how to reach you.",
    usesClient: true,
    build: (ctx) => {
      const t = marketConfig(ctx.business.market).terms;
      return [
        {
          type: "paragraph",
          id: "welcome",
          text: `Welcome to {{business_name}}! We're glad to have you. This guide explains how our service works so every visit runs smoothly.`,
        },
        { type: "heading", text: "What's included" },
        {
          type: "paragraph",
          id: "included",
          text: "Our standard clean covers kitchens, bathrooms, living areas and bedrooms: surfaces, floors, dusting of reachable areas and emptying bins. Extras such as inside the oven or fridge, interior windows or laundry can be added on request.",
        },
        { type: "heading", text: "Scheduling" },
        {
          type: "paragraph",
          id: "scheduling",
          text: "We confirm every booking in advance. If you need to change a visit, please let us know as early as possible. [Add your cancellation and lockout policy.]",
        },
        { type: "heading", text: "Access to your home" },
        {
          type: "paragraph",
          id: "access",
          text: "We agree access arrangements with you directly. For your security we never write alarm codes or key locations on paperwork.",
        },
        { type: "heading", text: "Payment" },
        {
          type: "paragraph",
          id: "payment",
          text: `We send an invoice after each clean (or as agreed). Payment is due within {{payment_terms_days}} days. Accepted methods: [cash, ${t.check.toLowerCase()}, bank transfer, payment app].`,
        },
        { type: "heading", text: "Feedback" },
        {
          type: "paragraph",
          id: "feedback",
          text: "If anything isn't right, tell us within 24 hours and we'll do our best to put it right on our next visit or arrange a return visit.",
        },
        {
          type: "fields",
          title: "Contact us",
          fields: [
            { label: "Name", value: v(ctx.business.owner_name) },
            { label: "Phone", value: v(ctx.business.phone) },
            { label: "Email", value: v(ctx.business.email) },
          ],
        },
      ];
    },
  },
  {
    slug: "service-scope-worksheet",
    number: 10,
    markets: ["US", "UK"],
    category: "Sales",
    title: () => "Service Scope Worksheet",
    description: "Walk through the property with the client and agree exactly what is and isn't included.",
    usesClient: true,
    build: (ctx) => {
      const t = marketConfig(ctx.business.market).terms;
      return [
        {
          type: "fields",
          fields: [
            { label: "Client", value: v(ctx.client?.name) },
            { label: "Property address", value: v(ctx.client?.address), lines: 2 },
            { label: "Walkthrough date", value: formatDate(ctx.today, ctx.business.date_format) },
          ],
        },
        {
          type: "table",
          title: "Rooms and areas",
          columns: ["Area", "Included (Y/N)", "Frequency", "Notes"],
          rows: [
            ["Kitchen", "", "", ""],
            ["Bathrooms", "", "", ""],
            ["Bedrooms", "", "", ""],
            ["Living / dining", "", "", ""],
            ["Hallways & stairs", "", "", ""],
            ["Laundry / utility", "", "", ""],
          ],
          blankRows: 2,
        },
        {
          type: "checklist",
          title: "Optional extras",
          items: [
            "Inside oven",
            "Inside fridge / freezer",
            "Interior windows",
            "Inside cabinets / cupboards",
            "Laundry and folding",
            "Bed linen change",
            "Balcony / patio sweep",
          ],
        },
        {
          type: "checklist",
          title: "Not included (agree before quoting)",
          items: ["Biohazards or mould remediation", "Exterior windows above ground level", "Heavy lifting / moving furniture", "Pest infestations"],
        },
        { type: "fields", fields: [{ label: `Estimated hours` }, { label: "Number of cleaners" }, { label: `Notes for the ${t.quote.toLowerCase()}`, lines: 3 }] },
        { type: "signature", labels: ["Client", "Business representative"] },
      ];
    },
  },
  {
    slug: "customer-follow-up-messages",
    number: 11,
    markets: ["US", "UK"],
    category: "Client communication",
    title: () => "Customer Follow-Up Messages",
    description: "Ready-to-edit messages for after the first clean, unanswered quotes, payment reminders and rebooking.",
    usesClient: true,
    build: (ctx) => {
      const t = marketConfig(ctx.business.market).terms;
      return [
        {
          type: "messages",
          items: [
            {
              id: "after-first-clean",
              title: "After the first clean",
              body: `Hi {{client_first_name}}, thank you for having us today! I hope everything feels fresh. If there's anything you'd like done differently next time, just reply to this message. — {{signature}}`,
            },
            {
              id: "quote-follow-up",
              title: `${t.quote} follow-up`,
              body: `Hi {{client_first_name}}, just checking whether you had any questions about the ${t.quote.toLowerCase()} we sent. We'd be happy to adjust the scope or find a date that suits you. — {{signature}}`,
            },
            {
              id: "payment-reminder",
              title: "Friendly payment reminder",
              body: `Hi {{client_first_name}}, a quick reminder that invoice [number] for [amount] was due on [date]. If you've already paid, thank you and please ignore this message. — {{signature}}`,
            },
            {
              id: "rebook",
              title: "Rebooking reminder",
              body: `Hi {{client_first_name}}, it's been a few weeks since your last clean. Would you like to book your next visit? We have availability on [days]. — {{signature}}`,
            },
            {
              id: "reschedule",
              title: "Rescheduling notice",
              body: `Hi {{client_first_name}}, unfortunately we need to move your clean on [date]. Could [new date/time] work instead? Sorry for the inconvenience. — {{signature}}`,
            },
          ],
        },
        {
          type: "notice",
          text: "Send marketing-style messages only to clients who agreed to receive them. Follow TCPA/CAN-SPAM rules in the US and PECR/UK GDPR in the UK.",
        },
      ];
    },
  },
  {
    slug: "review-request-messages",
    number: 12,
    markets: ["US", "UK"],
    category: "Client communication",
    title: () => "Review Request Messages",
    description: "Short, honest messages asking happy clients for a review. Never offer rewards for positive reviews.",
    usesClient: true,
    build: () => {
      return [
        {
          type: "messages",
          items: [
            {
              id: "text-review",
              title: "Text message",
              body: `Hi {{client_first_name}}, thanks again for choosing {{business_name}}! If you have a minute, an honest review would really help our small business: [review link]. — {{signature}}`,
            },
            {
              id: "email-review",
              title: "Email",
              body: `Hi {{client_first_name}},\n\nThank you for letting us look after your home. Reviews help other local families find a cleaner they can trust. If you're happy to share your experience — good or bad — you can leave a review here: [review link].\n\nThank you,\n{{signature}}`,
            },
            {
              id: "in-person",
              title: "After a visit (in person)",
              body: `"If you're happy with today's clean, we'd really appreciate a quick review — I can send you the link by text."`,
            },
          ],
        },
        {
          type: "notice",
          text: "Ask for honest reviews only. Incentivised or fake reviews can breach FTC rules in the US and the Digital Markets, Competition and Consumers Act / CMA guidance in the UK.",
        },
      ];
    },
  },
];

export function documentTemplates(market?: Market | string): DocumentTemplate[] {
  if (!market) return TEMPLATES;
  const m: Market = market === "UK" ? "UK" : "US";
  return TEMPLATES.filter((t) => t.markets.includes(m));
}

export function documentTemplate(slug: string): DocumentTemplate | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}

/** Applies saved text overrides to editable blocks (paragraphs and messages). */
export function applyOverrides(blocks: DocBlock[], overrides: DocOverrides | null | undefined): DocBlock[] {
  if (!overrides) return blocks;
  return blocks.map((b) => {
    if (b.type === "paragraph" && b.id && typeof overrides[b.id] === "string") return { ...b, text: overrides[b.id] };
    if (b.type === "messages") {
      return { ...b, items: b.items.map((m) => (typeof overrides[m.id] === "string" ? { ...m, body: overrides[m.id] } : m)) };
    }
    return b;
  });
}

/** Lists the editable text slots of a built document. */
export function editableSlots(blocks: DocBlock[]): Array<{ id: string; label: string; text: string }> {
  const slots: Array<{ id: string; label: string; text: string }> = [];
  for (const b of blocks) {
    if (b.type === "paragraph" && b.id) slots.push({ id: b.id, label: b.id.replace(/-/g, " "), text: b.text });
    if (b.type === "messages") for (const m of b.items) slots.push({ id: m.id, label: m.title, text: m.body });
  }
  return slots;
}

export const PLACEHOLDERS = [
  "client_first_name",
  "client_name",
  "business_name",
  "owner_name",
  "business_phone",
  "business_email",
  "payment_terms_days",
  "invoice_footer",
  "signature",
] as const;

/** Replaces {{placeholders}} with business/client values (or readable blanks). */
export function fillPlaceholders(text: string, ctx: DocContext): string {
  const b = ctx.business;
  const clientName = ctx.client?.name?.trim();
  const owner = b.owner_name?.trim() || "[Your name]";
  const values: Record<string, string> = {
    client_first_name: clientName ? clientName.split(/\s+/)[0] : "[Client name]",
    client_name: clientName || "[Client name]",
    business_name: b.name,
    owner_name: owner,
    business_phone: b.phone?.trim() || "[phone]",
    business_email: b.email?.trim() || "[email]",
    payment_terms_days: String(b.payment_terms_days),
    invoice_footer: b.invoice_footer?.trim() ?? "",
    signature: `${owner}, ${b.name}`,
  };
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => values[key] ?? match).trim();
}

/** Builds a document: template → saved overrides → placeholders filled. */
export function renderDocument(template: DocumentTemplate, ctx: DocContext, overrides?: DocOverrides | null): DocBlock[] {
  return applyOverrides(template.build(ctx), overrides).map((b) => {
    if (b.type === "paragraph") return { ...b, text: fillPlaceholders(b.text, ctx) };
    if (b.type === "messages") return { ...b, items: b.items.map((m) => ({ ...m, body: fillPlaceholders(m.body, ctx) })) };
    return b;
  });
}
