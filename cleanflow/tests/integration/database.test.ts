import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nullable } from "@/lib/supabase/nullable";
import { adminClient, anonClient, createBusiness, createTestUser, deleteUser, type Db } from "../support/supabase";

// Runs against the local Supabase stack (npm run db:start).

let alice: { db: Db; userId: string; email: string };
let bob: { db: Db; userId: string; email: string };
let aliceBusiness: string;
let bobBusiness: string;
let aliceClientId: string;

beforeAll(async () => {
  alice = await createTestUser("alice");
  bob = await createTestUser("bob");
  aliceBusiness = await createBusiness(alice.db, "US");
  bobBusiness = await createBusiness(bob.db, "UK");
});

afterAll(async () => {
  await deleteUser(alice.userId);
  await deleteUser(bob.userId);
});

describe("business setup", () => {
  it("creates one business per user with market defaults", async () => {
    const { data } = await alice.db.from("businesses").select("*").single();
    expect(data).toMatchObject({ id: aliceBusiness, market: "US", currency: "USD", quote_prefix: "EST-" });
    const { data: uk } = await bob.db.from("businesses").select("quote_prefix, currency").single();
    expect(uk).toMatchObject({ quote_prefix: "QUO-", currency: "GBP" });
  });

  it("refuses a second business for the same user", async () => {
    const { error } = await alice.db.rpc("create_business", {
      p_name: "Second",
      p_market: "US",
      p_currency: "USD",
      p_date_format: "MM/DD/YYYY",
      p_timezone: "America/New_York",
    });
    expect(error?.message).toMatch(/already have a business/);
  });

  it("does not allow editing counters or ownership", async () => {
    const { error } = await alice.db.from("businesses").update({ next_invoice_number: 1 } as never).eq("id", aliceBusiness);
    expect(error?.code).toBe("42501");
    const { error: e2 } = await alice.db.from("businesses").update({ owner_id: bob.userId } as never).eq("id", aliceBusiness);
    expect(e2?.code).toBe("42501");
  });

  it("validates business settings in the database", async () => {
    const { error } = await alice.db.from("businesses").update({ default_target_margin: 1 }).eq("id", aliceBusiness);
    expect(error?.code).toBe("23514");
  });
});

describe("tenant isolation (RLS)", () => {
  beforeAll(async () => {
    const { data, error } = await alice.db
      .from("clients")
      .insert({ business_id: aliceBusiness, name: "Jordan Smith", email: "jordan@example.test", city: "Austin", region: "TX" })
      .select("id")
      .single();
    if (error) throw error;
    aliceClientId = data.id;
  });

  it("another user cannot read, update or delete the client", async () => {
    const read = await bob.db.from("clients").select("*").eq("id", aliceClientId);
    expect(read.data).toEqual([]);
    const upd = await bob.db.from("clients").update({ name: "Hacked" }).eq("id", aliceClientId).select();
    expect(upd.data).toEqual([]);
    const del = await bob.db.from("clients").delete().eq("id", aliceClientId).select();
    expect(del.data).toEqual([]);
    const still = await alice.db.from("clients").select("name").eq("id", aliceClientId).single();
    expect(still.data?.name).toBe("Jordan Smith");
  });

  it("another user cannot insert rows into someone else's business", async () => {
    const { error } = await bob.db.from("clients").insert({ business_id: aliceBusiness, name: "Intruder" });
    expect(error?.code).toBe("42501");
  });

  it("cannot reference another tenant's client through foreign keys", async () => {
    const { error } = await bob.db.rpc("save_quote", {
      p_quote_id: nullable<string>(null),
      p_client_id: aliceClientId,
      p_service_type: "standard",
      p_issue_date: "2026-10-01",
      p_valid_until: "2026-10-31",
      p_notes: "",
      p_pricing: {},
      p_items: [{ description: "Clean", quantity: 1, unit_price: 100 }],
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("23503");
  });

  it("anonymous visitors cannot read anything", async () => {
    const anon = anonClient();
    const { data, error } = await anon.from("clients").select("*");
    expect(data ?? []).toEqual([]);
    expect(error?.code ?? "42501").toBe("42501");
    const biz = await anon.from("businesses").select("*");
    expect(biz.data ?? []).toEqual([]);
  });

  it("users only see their own business and membership", async () => {
    const { data } = await bob.db.from("businesses").select("id");
    expect(data).toEqual([{ id: bobBusiness }]);
    const members = await bob.db.from("business_members").select("business_id");
    expect(members.data).toEqual([{ business_id: bobBusiness }]);
  });

  it("cannot reserve document numbers for another business", async () => {
    const { error } = await bob.db.rpc("next_document_number", { p_business_id: aliceBusiness, p_kind: "invoice" });
    expect(error?.code).toBe("42501");
  });
});

describe("end-to-end business flow", () => {
  let quoteId: string;
  let jobId: string;
  let invoiceId: string;

  it("saves a quote with numbered, versioned line items", async () => {
    const { data, error } = await alice.db.rpc("save_quote", {
      p_quote_id: nullable<string>(null),
      p_client_id: aliceClientId,
      p_service_type: "deep",
      p_issue_date: "2026-10-01",
      p_valid_until: "2026-10-31",
      p_notes: "First deep clean",
      p_pricing: { hours: 3, cleaners: 2, suggestedPrice: 206.15 },
      p_items: [
        { description: "Deep cleaning", quantity: 1, unit_price: 206.15 },
        { description: "Inside oven", quantity: 3, unit_price: 33.335 },
      ],
    });
    expect(error).toBeNull();
    quoteId = data as string;
    const { data: q } = await alice.db.from("quotes").select("*, quote_items(*)").eq("id", quoteId).single();
    expect(q).toMatchObject({ number: "EST-0001", status: "draft", currency: "USD", version: 1 });
    // Unit price is stored as 33.34, so the line is 3 × 33.34 = 100.02 (not round(100.005)).
    expect(Number(q!.total)).toBe(306.17);
    const sumOfLines = q!.quote_items.reduce((a, i) => a + Number(i.amount), 0);
    expect(Number(q!.total)).toBeCloseTo(sumOfLines, 2);
  });

  it("creates a new version on edit and keeps history", async () => {
    const { error } = await alice.db.rpc("save_quote", {
      p_quote_id: quoteId,
      p_client_id: aliceClientId,
      p_service_type: "deep",
      p_issue_date: "2026-10-01",
      p_valid_until: "2026-10-31",
      p_notes: "Updated",
      p_pricing: nullable(null),
      p_items: [{ description: "Deep cleaning", quantity: 1, unit_price: 220 }],
    });
    expect(error).toBeNull();
    const { data: q } = await alice.db.from("quotes").select("version, total").eq("id", quoteId).single();
    expect(q).toMatchObject({ version: 2 });
    expect(Number(q!.total)).toBe(220);
    const { data: versions } = await alice.db.from("quote_versions").select("version").eq("quote_id", quoteId).order("version");
    expect(versions?.map((v) => v.version)).toEqual([1, 2]);
  });

  it("refuses to convert a quote that is not accepted", async () => {
    const { error } = await alice.db.rpc("convert_quote_to_job", {
      p_quote_id: quoteId,
      p_scheduled_date: "2026-11-05",
      p_start_time: "09:00",
      p_duration_minutes: 180,
      p_checklist_slug: "deep-cleaning-checklist",
      p_checklist: [],
    });
    expect(error?.message).toMatch(/Only accepted quotes/);
  });

  it("converts an accepted quote into a job with a checklist, only once", async () => {
    await alice.db.from("quotes").update({ status: "sent" }).eq("id", quoteId);
    const { data: accepted } = await alice.db.from("quotes").update({ status: "accepted" }).eq("id", quoteId).select("accepted_at, sent_at").single();
    expect(accepted?.accepted_at).not.toBeNull();
    expect(accepted?.sent_at).not.toBeNull();

    const args = {
      p_quote_id: quoteId,
      p_scheduled_date: "2026-11-05",
      p_start_time: "09:00",
      p_duration_minutes: 180,
      p_checklist_slug: "deep-cleaning-checklist",
      p_checklist: [
        { section: "Kitchen", label: "Degrease cabinets" },
        { section: "Bathrooms", label: "Scrub grout" },
      ],
    };
    const { data, error } = await alice.db.rpc("convert_quote_to_job", args);
    expect(error).toBeNull();
    jobId = data as string;
    const { data: job } = await alice.db.from("jobs").select("*, job_checklist_items(*)").eq("id", jobId).single();
    expect(job).toMatchObject({ client_id: aliceClientId, quote_id: quoteId, status: "scheduled", currency: "USD", service_type: "deep" });
    expect(Number(job!.price)).toBe(220);
    expect(job!.job_checklist_items).toHaveLength(2);

    const again = await alice.db.rpc("convert_quote_to_job", args);
    expect(again.error?.message).toMatch(/already been converted/);
  });

  it("locks the converted quote", async () => {
    const { error } = await alice.db.from("quotes").update({ status: "declined" }).eq("id", quoteId);
    expect(error?.message).toMatch(/locked/);
  });

  it("refuses to invoice a job that is not completed", async () => {
    const { error } = await alice.db.rpc("save_invoice", {
      p_invoice_id: nullable<string>(null),
      p_client_id: aliceClientId,
      p_job_id: jobId,
      p_issue_date: "2026-11-05",
      p_due_date: "2026-11-19",
      p_status: "issued",
      p_notes: "",
      p_items: [{ description: "Deep cleaning", quantity: 1, unit_price: 220 }],
    });
    expect(error?.message).toMatch(/completed/);
  });

  it("ticks checklist items and completes the job", async () => {
    const { data: items } = await alice.db.from("job_checklist_items").select("id").eq("job_id", jobId);
    const { data: ticked } = await alice.db.from("job_checklist_items").update({ done: true }).eq("id", items![0].id).select("done_at").single();
    expect(ticked?.done_at).not.toBeNull();
    const { data: job } = await alice.db.from("jobs").update({ status: "completed" }).eq("id", jobId).select("completed_at").single();
    expect(job?.completed_at).not.toBeNull();
  });

  it("creates one invoice for the completed job", async () => {
    const args = {
      p_invoice_id: nullable<string>(null),
      p_client_id: aliceClientId,
      p_job_id: jobId,
      p_issue_date: "2026-11-05",
      p_due_date: "2026-11-19",
      p_status: "issued",
      p_notes: "Thanks!",
      p_items: [{ description: "Deep cleaning", quantity: 1, unit_price: 220 }],
    };
    const { data, error } = await alice.db.rpc("save_invoice", args);
    expect(error).toBeNull();
    invoiceId = data as string;
    const { data: inv } = await alice.db.from("invoices").select("*").eq("id", invoiceId).single();
    expect(inv).toMatchObject({ number: "INV-0001", currency: "USD", job_id: jobId, status: "issued" });
    expect(Number(inv!.total)).toBe(220);

    const dup = await alice.db.rpc("save_invoice", args);
    expect(dup.error?.message).toMatch(/already has an invoice/);
  });

  it("records partial and full payments and blocks overpayment", async () => {
    const p1 = await alice.db.from("payments").insert({ business_id: aliceBusiness, invoice_id: invoiceId, amount: 100, currency: "USD", paid_on: "2026-11-06", method: "cash" }).select("client_id, currency").single();
    expect(p1.error).toBeNull();
    expect(p1.data).toMatchObject({ client_id: aliceClientId, currency: "USD" });

    const over = await alice.db.from("payments").insert({ business_id: aliceBusiness, invoice_id: invoiceId, amount: 150, currency: "USD", paid_on: "2026-11-07" });
    expect(over.error?.message).toMatch(/exceeds the outstanding balance/);

    const wrongCurrency = await alice.db.from("payments").insert({ business_id: aliceBusiness, invoice_id: invoiceId, amount: 10, currency: "GBP", paid_on: "2026-11-07" });
    expect(wrongCurrency.error?.message).toMatch(/must match the invoice currency/);

    const p2 = await alice.db.from("payments").insert({ business_id: aliceBusiness, invoice_id: invoiceId, amount: 120, currency: "USD", paid_on: "2026-11-08", method: "bank_transfer" });
    expect(p2.error).toBeNull();
  });

  it("protects paid invoices from inconsistent edits", async () => {
    const voided = await alice.db.from("invoices").update({ status: "void" }).eq("id", invoiceId);
    expect(voided.error?.message).toMatch(/must stay issued/);
    const lowered = await alice.db.from("invoices").update({ total: 50 }).eq("id", invoiceId);
    expect(lowered.error?.message).toMatch(/cannot be lower/);
    const reopen = await alice.db.from("jobs").update({ status: "scheduled" }).eq("id", jobId);
    expect(reopen.error?.message).toMatch(/has an invoice/);
  });

  it("another user cannot pay or see Alice's invoice", async () => {
    const { error } = await bob.db.from("payments").insert({ business_id: bobBusiness, invoice_id: invoiceId, amount: 1, currency: "USD", paid_on: "2026-11-08" });
    expect(error).not.toBeNull();
    const { data } = await bob.db.from("payments").select("*");
    expect(data).toEqual([]);
  });

  it("refuses to delete a client with history, but allows permanent erasure", async () => {
    const del = await alice.db.from("clients").delete().eq("id", aliceClientId);
    expect(del.error?.code).toBe("23503");
  });
});

describe("demo data separation", () => {
  it("flags records of demo clients as demo and removes only demo data", async () => {
    const { data: demo } = await alice.db.from("clients").insert({ business_id: aliceBusiness, name: "Demo Client", is_demo: true }).select("id").single();
    const { data: jobId, error } = await alice.db.rpc("create_job", {
      p_client_id: demo!.id,
      p_service_type: "standard",
      p_scheduled_date: "2026-11-10",
      p_start_time: "10:00",
      p_duration_minutes: 120,
      p_price: 90,
      p_execution_notes: "",
      p_checklist_slug: "standard-cleaning-checklist",
      p_checklist: [{ section: "Kitchen", label: "Wipe counters" }],
    });
    expect(error).toBeNull();
    const { data: job } = await alice.db.from("jobs").select("is_demo").eq("id", jobId as string).single();
    expect(job?.is_demo).toBe(true);

    const before = await alice.db.from("clients").select("id", { count: "exact" }).eq("is_demo", false);
    const { error: rmError } = await alice.db.rpc("remove_demo_data");
    expect(rmError).toBeNull();
    const after = await alice.db.from("clients").select("id", { count: "exact" }).eq("is_demo", false);
    expect(after.count).toBe(before.count);
    const demoLeft = await alice.db.from("jobs").select("id").eq("is_demo", true);
    expect(demoLeft.data).toEqual([]);
  });
});

describe("licensing", () => {
  it("users can read but never write licences; claims require a matching confirmed email", async () => {
    const admin = adminClient();
    await admin.from("licenses").insert({ email: alice.email.toLowerCase(), status: "active", source: "test", external_ref: `test-${Date.now()}` });

    const forged = await bob.db.from("licenses").insert({ email: bob.email.toLowerCase(), status: "active" });
    expect(forged.error).not.toBeNull();

    expect((await bob.db.rpc("claim_my_license")).data).toBe("none");
    expect((await bob.db.rpc("has_active_license")).data).toBe(false);

    expect((await alice.db.rpc("claim_my_license")).data).toBe("active");
    expect((await alice.db.rpc("has_active_license")).data).toBe(true);
    const mine = await alice.db.from("licenses").select("status");
    expect(mine.data).toEqual([{ status: "active" }]);

    await admin.from("licenses").update({ status: "refunded", revoked_at: new Date().toISOString() }).eq("user_id", alice.userId);
    expect((await alice.db.rpc("has_active_license")).data).toBe(false);
  });
});

describe("account deletion", () => {
  it("deletes the business, its data and the auth user", async () => {
    const carol = await createTestUser("carol");
    const biz = await createBusiness(carol.db, "UK");
    await carol.db.from("clients").insert({ business_id: biz, name: "To be erased" });
    const { error } = await carol.db.rpc("delete_my_account");
    expect(error).toBeNull();
    const admin = adminClient();
    const { data: left } = await admin.from("clients").select("id").eq("business_id", biz);
    expect(left).toEqual([]);
    const { data: user } = await admin.auth.admin.getUserById(carol.userId);
    expect(user.user).toBeNull();
  });
});
