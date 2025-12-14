"use client";

import React, { useMemo, useState } from "react";

type FileItem = {
  title: string;
  topic: string; // NEW
  description: string;
  attachment?: File | null;
  uploadedStoredName?: string;
};

type SectionItem = {
  title: string;
  description: string;
  files: FileItem[];
};

type OrderPayload = {
  name: string;
  tagline: string;
  linkedin: string;
  email: string;
  contactNumber: string;

  about: string;     // NEW
  skills: string[];  // NEW

  sections: SectionItem[];
  colorCodes: string[];
  hostingOption: "self_hosted" | "need_help";
  otherComments: string;
};

export default function Page() {
  const [form, setForm] = useState<OrderPayload>({
    name: "",
    tagline: "",
    linkedin: "",
    email: "",
    contactNumber: "",
    about: "",
    skills: [],

    sections: [
      {
        title: "Projects",
        description: "Your best work and what impact it had.",
        files: [
          {
            title: "Project / Report 1",
            topic: "What is the broad topic",
            description: "What it is + what you achieved.",
            attachment: null,
          },
        ],
      },
    ],

    // default to your palette
    colorCodes: ["#ffffff", "#cfd2d6", "#d4af37"],
    hostingOption: "self_hosted",
    otherComments: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; id?: string; error?: string } | null>(
    null
  );

  const canSubmit = useMemo(() => form.name.trim() && form.email.trim(), [form.name, form.email]);

  function update<K extends keyof OrderPayload>(key: K, value: OrderPayload[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function updateSection(idx: number, patch: Partial<SectionItem>) {
    setForm((p) => {
      const next = [...p.sections];
      next[idx] = { ...next[idx], ...patch };
      return { ...p, sections: next };
    });
  }

  function addSection() {
    setForm((p) => ({
      ...p,
      sections: [
        ...p.sections,
        {
          title: "New Section",
          description: "",
          files: [{ title: "", topic: "", description: "", attachment: null }],
        },
      ],
    }));
  }


  function removeSection(idx: number) {
    setForm((p) => {
      const next = p.sections.filter((_, i) => i !== idx);
      return { ...p, sections: next.length ? next : p.sections };
    });
  }

  function updateFile(sectionIdx: number, fileIdx: number, patch: Partial<FileItem>) {
    setForm((p) => {
      const sections = [...p.sections];
      const sec = sections[sectionIdx];
      const files = [...sec.files];
      files[fileIdx] = { ...files[fileIdx], ...patch };
      sections[sectionIdx] = { ...sec, files };
      return { ...p, sections };
    });
  }

  function addFile(sectionIdx: number) {
    setForm((p) => {
      const sections = [...p.sections];
      const sec = sections[sectionIdx];
      sections[sectionIdx] = {
        ...sec,
        files: [...sec.files, { title: "", topic: "", description: "", attachment: null }],
      };
      return { ...p, sections };
    });
  }

  function removeFile(sectionIdx: number, fileIdx: number) {
    setForm((p) => {
      const sections = [...p.sections];
      const sec = sections[sectionIdx];
      const files = sec.files.filter((_, i) => i !== fileIdx);
      sections[sectionIdx] = { ...sec, files: files.length ? files : sec.files };
      return { ...p, sections };
    });
  }

  function addColorCode() {
    setForm((p) => ({ ...p, colorCodes: [...p.colorCodes, "#cfd2d6"] }));
  }

  function updateColorCode(idx: number, value: string) {
    setForm((p) => {
      const next = [...p.colorCodes];
      next[idx] = value;
      return { ...p, colorCodes: next };
    });
  }

  function removeColorCode(idx: number) {
    setForm((p) => {
      const next = p.colorCodes.filter((_, i) => i !== idx);
      return { ...p, colorCodes: next.length ? next : p.colorCodes };
    });
  }

  function setFileAttachment(sectionIdx: number, fileIdx: number, file: File | null) {
  setForm((p) => {
    const sections = [...p.sections];
    const sec = sections[sectionIdx];
    const files = [...sec.files];

    files[fileIdx] = {
      ...files[fileIdx],
      attachment: file,
      uploadedStoredName: "", // reset if changed
    };

    sections[sectionIdx] = { ...sec, files };
    return { ...p, sections };
  });
}

  async function submit() {
    setSubmitting(true);
    setResult(null);

    try {
      // 1) strip out File objects before saving order JSON
      const cleanPayload = {
        ...form,
        sections: form.sections.map((sec) => ({
          ...sec,
          files: sec.files.map(({ attachment, ...rest }) => rest),
        })),
      };

      // 2) create order
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to submit.");

      const orderId = data.id;

      // 3) upload each attached file tied to its section/file entry
      for (let s = 0; s < form.sections.length; s++) {
        for (let f = 0; f < form.sections[s].files.length; f++) {
          const item = form.sections[s].files[f];
          if (!item.attachment) continue;

          const fd = new FormData();
          fd.append("orderId", orderId);
          fd.append("sectionIdx", String(s));
          fd.append("fileIdx", String(f));
          fd.append("file", item.attachment);

          const upRes = await fetch("/api/upload-file", { method: "POST", body: fd });
          const upData = await upRes.json();
          if (!upRes.ok) throw new Error(upData?.error || "File upload failed");

          // optional: save stored filename in state
          setForm((p) => {
            const sections = [...p.sections];
            const sec = sections[s];
            const files = [...sec.files];
            files[f] = { ...files[f], uploadedStoredName: upData.storedName };
            sections[s] = { ...sec, files };
            return { ...p, sections };
          });
        }
      }

      setResult({ ok: true, id: orderId });
    } catch (e: any) {
      setResult({ ok: false, error: e?.message || "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-900">
      {/* top glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-[#d4af37]/15 blur-3xl" />
        <div className="absolute top-40 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-[#cfd2d6]/35 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">

        {/* HERO */}
        <section className="mt-8">
          <div className="rounded-3xl border border-[#cfd2d6] bg-white shadow-sm overflow-hidden">
            <div className="p-8">
              <p className="text-xs font-semibold tracking-[0.22em] uppercase text-zinc-500">
                Welcome to Hong's Portfolio Generator
              </p>

              <h1 className="mt-3 text-3xl md:text-4xl font-bold leading-tight">
                <span className="text-[#d4af37]">STAND OUT FROM OTHER JOB APPLICANTS </span>
                WITH YOUR OWN PORTFOLIO WEBSITE
              </h1>

              <p className="mt-4 text-zinc-600 max-w-xl">
                Don't leave your job application to chance.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a
                  href="https://tang-en-ci-nathan-portfolio.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl border border-[#cfd2d6] bg-white px-5 py-3 font-semibold hover:bg-zinc-50"
                >
                  View Sample Portfolio
                </a>

                <a
                  href="#order"
                  className="inline-flex items-center justify-center rounded-2xl bg-[#d4af37] px-5 py-3 font-semibold text-black hover:opacity-90"
                >
                  Order Now
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* OUR PROMISES */}
        <section className="mt-8">
          <div className="rounded-3xl border border-[#cfd2d6] bg-white shadow-sm overflow-hidden">
            <div className="p-8">

              <h2 className="mt-3 text-3xl md:text-4xl font-bold leading-tight">
                <span className="text-[#d4af37]">Our Promises </span>
              </h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Stat k="Key Deliverable" v="Portfolio Website" note="Custom Made for You" />
                <Stat k="Quick Delivery" v="2–3 Days" note="After Order is Received" />
                <Stat k="Payment On Delivery" v="$50" note="Fixed Price after PayNow" />
                <Stat k="Quality Assured" v="Unlimited Revisions" note="Payment Only on Completion" />
              </div>
            </div>

          </div>
        </section>

        {/* ORDER FORM */}
        <section
          id="order"
          className="mt-10 rounded-3xl border border-[#cfd2d6] bg-white shadow-sm overflow-hidden"
        >
          <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <h2 className="mt-3 text-3xl md:text-4xl font-bold leading-tight">
                  <span className="text-[#d4af37]">Get Your Own Portfolio Website Now </span>
                </h2>
                <p className="mt-4 text-zinc-600">
                  Simply enter your details below to order your own portfolio website. Make sure you enter your correct email address so that we can contact you.
                </p>
              </div>
            </div>

            {/* CONTACT */}
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Name" value={form.name} onChange={(v) => update("name", v)} required />
              <Field label="Tagline" value={form.tagline} onChange={(v) => update("tagline", v)} placeholder="e.g., Analyst • Builder • Problem-solver" />
              <Field label="LinkedIn Profile" value={form.linkedin} onChange={(v) => update("linkedin", v)} placeholder="https://www.linkedin.com/in/..." />
              <Field label="Email Address" value={form.email} onChange={(v) => update("email", v)} required />
              <Field label="Contact Number" value={form.contactNumber} onChange={(v) => update("contactNumber", v)} placeholder="+65 ..." />
            </div>

            {/* ABOUT + SKILLS (top of form) */}
            <div className="mt-6 grid gap-6">
              {/* About */}
              <div>
                <label className="text-sm font-semibold">About</label>
                <p className="mt-1 text-sm text-zinc-600">
                  2–5 lines: who you are, what you do, what you’re looking for.
                </p>
                <textarea
                  className="mt-2 w-full min-h-[120px] rounded-3xl border border-[#cfd2d6] bg-white p-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
                  value={form.about}
                  onChange={(e) => update("about", e.target.value)}
                  placeholder="E.g., I’m a final-year student interested in product and analytics. I’ve led projects in..."
                />
              </div>

              {/* Skills */}
              <div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <label className="text-sm font-semibold">Skills</label>
                    <p className="mt-1 text-sm text-zinc-600">
                      Add keywords recruiters search for (e.g., Excel, Python, SQL, Public Speaking).
                    </p>
                  </div>

                  <button
                    type="button"
                    className="rounded-2xl border border-[#cfd2d6] bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                    onClick={() => update("skills", [...form.skills, ""])}
                  >
                    + Add skill
                  </button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {form.skills.map((s, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        className="h-11 w-full rounded-2xl border border-[#cfd2d6] bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
                        value={s}
                        onChange={(e) => {
                          const next = [...form.skills];
                          next[idx] = e.target.value;
                          update("skills", next);
                        }}
                        placeholder="e.g., Python"
                      />
                      <button
                        type="button"
                        className="rounded-2xl border border-[#cfd2d6] bg-[#fafafa] px-4 text-sm font-semibold hover:bg-zinc-100"
                        onClick={() => update("skills", form.skills.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTIONS */}
            <div className="mt-10">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold">Sections</h3>
                <button
                  type="button"
                  onClick={addSection}
                  className="rounded-2xl bg-[#d4af37] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                >
                  + Add section
                </button>
              </div>

              <div className="mt-4 grid gap-4">
                {form.sections.map((sec, sIdx) => (
                  <div key={sIdx} className="rounded-3xl border border-[#cfd2d6] bg-[#fafafa] p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="grid gap-4 md:grid-cols-2 flex-1">
                        <Field
                          label={`Section ${sIdx + 1} Title`}
                          value={sec.title}
                          onChange={(v) => updateSection(sIdx, { title: v })}
                        />
                        <Field
                          label={`Section ${sIdx + 1} Description`}
                          value={sec.description}
                          onChange={(v) => updateSection(sIdx, { description: v })}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSection(sIdx)}
                        className="rounded-2xl border border-[#cfd2d6] bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                      >
                        Remove section
                      </button>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Files in this section</div>
                        <button
                          type="button"
                          onClick={() => addFile(sIdx)}
                          className="rounded-2xl border border-[#cfd2d6] bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                        >
                          + Add file
                        </button>
                      </div>

                      <div className="mt-3 grid gap-3">
                        {sec.files.map((f, fIdx) => (
                          <div key={fIdx} className="rounded-3xl border border-[#cfd2d6] bg-white p-5">
                            <div className="grid gap-4 md:grid-cols-2">
                              <Field
                                label={`File ${fIdx + 1} Title`}
                                value={f.title}
                                onChange={(v) => updateFile(sIdx, fIdx, { title: v })}
                                placeholder="e.g. Customer Churn Analysis"
                              />

                              <Field
                                label="Topic"
                                value={f.topic}
                                onChange={(v) => updateFile(sIdx, fIdx, { topic: v })}
                                placeholder="e.g. Data Analytics, Marketing, Research"
                              />
                            </div>

                            <div className="mt-4">
                              <label className="text-sm font-semibold">Description</label>
                              <textarea
                                className="mt-2 w-full min-h-[120px] rounded-2xl border border-[#cfd2d6] bg-white p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
                                value={f.description}
                                onChange={(e) => updateFile(sIdx, fIdx, { description: e.target.value })}
                                placeholder="What was the problem? What did you do? What was the outcome?"
                              />
                            </div>

                            {/* Upload for this file entry */}
                            <div className="mt-4">
                              <label className="text-sm font-semibold">Upload (optional)</label>
                              <div className="mt-2 flex flex-col gap-2">
                                <input
                                  type="file"
                                  accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg"
                                  className="block w-full rounded-2xl border border-[#cfd2d6] bg-white p-3 text-sm"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setFileAttachment(sIdx, fIdx, file);
                                  }}
                                />

                                {f.attachment && (
                                  <div className="rounded-2xl border border-[#cfd2d6] bg-[#fafafa] p-3 text-sm text-zinc-700 flex items-center justify-between gap-3">
                                    <span className="truncate">{f.attachment.name}</span>
                                    <button
                                      type="button"
                                      className="rounded-xl border border-[#cfd2d6] bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-50"
                                      onClick={() => setFileAttachment(sIdx, fIdx, null)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeFile(sIdx, fIdx)}
                                className="rounded-2xl border border-[#cfd2d6] bg-[#fafafa] px-4 py-2 text-sm font-semibold hover:bg-zinc-100"
                              >
                                Remove file
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLORS */}
            <div className="mt-10">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold">Choose your own colour scheme for your website to stand out even more</h3>
                <button
                  type="button"
                  onClick={addColorCode}
                  className="rounded-2xl border border-[#cfd2d6] bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                >
                  + Add colour code
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {form.colorCodes.map((c, idx) => (
                  <div key={idx} className="rounded-3xl border border-[#cfd2d6] bg-[#fafafa] p-5">
                    <label className="text-xs font-semibold tracking-wide text-zinc-600">
                      Colour Code {idx + 1}
                    </label>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        className="h-10 w-12 rounded-xl border border-[#cfd2d6] bg-white"
                        type="color"
                        value={isValidHexColor(c) ? c : "#000000"}
                        onChange={(e) => updateColorCode(idx, e.target.value)}
                        aria-label={`Pick color ${idx + 1}`}
                      />
                      <input
                        className="h-10 w-full rounded-2xl border border-[#cfd2d6] bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
                        value={c}
                        onChange={(e) => updateColorCode(idx, e.target.value)}
                        placeholder="#d4af37"
                      />
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeColorCode(idx)}
                        className="rounded-2xl border border-[#cfd2d6] bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* HOSTING */}
            <div className="mt-10">
              <h3 className="text-lg font-bold">Choose whether you want to host your website yourself or for us to do it for you</h3>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <ChoiceCard
                  selected={form.hostingOption === "self_hosted"}
                  title="Self-Hosted Domain"
                  desc="Simply purchase your own domain, and we will teach you how to host your portfolio website."
                  onClick={() => update("hostingOption", "self_hosted")}
                />
                <ChoiceCard
                  selected={form.hostingOption === "need_help"}
                  title="HPG Hosted Domain"
                  desc="Let us know what domain name you would like, we will host it for you for free."
                  onClick={() => update("hostingOption", "need_help")}
                />
              </div>
            </div>

            {/* OTHER */}
            <div className="mt-10">
              <label className="text-sm font-semibold">Other comments</label>
              <textarea
                className="mt-2 w-full min-h-[140px] rounded-3xl border border-[#cfd2d6] bg-white p-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
                value={form.otherComments}
                onChange={(e) => update("otherComments", e.target.value)}
                placeholder="Target role, preferred tone, what to highlight, anything to avoid, etc."
              />
            </div>

            {/* SUBMIT */}
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                disabled={!canSubmit || submitting}
                onClick={submit}
                className={[
                  "rounded-2xl px-5 py-3 font-semibold",
                  !canSubmit || submitting
                    ? "bg-[#cfd2d6] text-zinc-600"
                    : "bg-[#d4af37] text-black hover:opacity-90",
                ].join(" ")}
              >
                {submitting ? "Submitting..." : "Submit order"}
              </button>

              {result?.ok && (
                <div className="rounded-3xl border border-[#cfd2d6] bg-white p-5">
                  <div className="font-semibold">Submitted!</div>
                  <div className="mt-1 text-sm text-zinc-700">
                    Order ID: <span className="font-mono">{result.id}</span>
                  </div>
                  <div className="mt-2 text-sm text-zinc-600">
                    Next: I’ll review your details and send a preview link. Payment is{" "}
                    <span className="font-semibold text-[#d4af37]">$50 via PayNow after completion</span>.
                  </div>
                </div>
              )}

              {result?.ok === false && (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
                  <div className="font-semibold">Submission failed</div>
                  <div className="mt-1 text-sm text-zinc-700">{result.error}</div>
                </div>
              )}
            </div>
          </div>

                </section>
        
        {/* Testimonials */}
        <section className="mt-10 rounded-3xl border border-[#cfd2d6] bg-white shadow-sm overflow-hidden card-hover">
          <div className="p-8">
            <h2 className="mt-3 text-3xl md:text-4xl font-bold leading-tight">
              <span className="text-[#d4af37]">Our Testimonials</span>
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <TestimonialCard
                quote="Having a portfolio website made my applications feel much more professional. Recruiters actually clicked through my work."
                name="Business Analytics Student"
                role="Final-year Undergraduate"
              />

              <TestimonialCard
                quote="The structure helped me explain my projects clearly instead of dumping PDFs. It really improved how my experience came across."
                name="Marketing Associate"
                role="Early-career Professional"
              />

              <TestimonialCard
                quote="I didn’t know how to present my work before. The portfolio made it easy for interviewers to understand what I actually did."
                name="Engineering Graduate"
                role="Job Seeker"
              />
            </div>
          </div>
        </section>

        {/* FAQs (after Order Form) */}
        <section className="mt-10 rounded-3xl border border-[#cfd2d6] bg-white shadow-sm overflow-hidden card-hover">
          <div className="p-8">
            <h2 className="mt-3 text-3xl md:text-4xl font-bold leading-tight">
              <span className="text-[#d4af37]">Frequently Asked Questions</span>
            </h2>

            <div className="mt-6">
              <FAQAccordion />
            </div>
          </div>
        </section>

        {/* Footer (separate section after FAQs) */}
        <section className="mt-10">
          <div className="h-px bg-gradient-to-r from-transparent via-[#cfd2d6] to-transparent" />
          <footer className="p-6 text-center text-sm text-zinc-500">
            © {new Date().getFullYear()} — Hong&apos;s Portfolio Generator
          </footer>
        </section>
      </div>

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/6592222341" // replace with your number
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-[#25D366] shadow-lg hover:scale-105 transition"
        aria-label="Chat on WhatsApp"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          fill="white"
          className="h-7 w-7"
        >
          <path d="M16.002 3.2c-7.062 0-12.8 5.738-12.8 12.8 0 2.258.592 4.467 1.715 6.417L3.2 28.8l6.6-1.72a12.74 12.74 0 006.202 1.602h.002c7.06 0 12.796-5.738 12.796-12.8 0-7.062-5.736-12.8-12.798-12.8zm0 22.8h-.002a10.76 10.76 0 01-5.486-1.502l-.392-.232-3.92 1.02 1.048-3.822-.256-.392a10.722 10.722 0 01-1.644-5.712c0-5.976 4.864-10.84 10.848-10.84 5.978 0 10.844 4.864 10.844 10.84 0 5.978-4.866 10.84-10.84 10.84zm6.048-7.952c-.33-.166-1.95-.962-2.252-1.072-.302-.11-.522-.166-.742.166-.22.33-.852 1.072-1.046 1.292-.194.22-.388.248-.718.082-.33-.166-1.392-.514-2.652-1.64-.98-.872-1.64-1.95-1.834-2.28-.194-.33-.02-.508.146-.674.15-.148.33-.388.496-.582.166-.194.22-.33.33-.55.11-.22.056-.414-.028-.58-.084-.166-.742-1.788-1.016-2.452-.266-.64-.536-.554-.742-.564l-.634-.012c-.22 0-.58.082-.882.414-.302.33-1.156 1.128-1.156 2.752 0 1.624 1.186 3.194 1.352 3.414.166.22 2.336 3.568 5.66 5.002.792.342 1.41.546 1.892.698.796.252 1.52.216 2.094.132.638-.096 1.95-.798 2.226-1.57.276-.772.276-1.434.194-1.57-.084-.136-.302-.22-.634-.386z" />
        </svg>
      </a>

    </main>
  );
}


function Stat({ k, v, note }: { k: string; v: string; note: string }) {
  return (
    <div className="rounded-3xl border border-[#cfd2d6] bg-[#fafafa] p-4">
      <div className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{k}</div>
      <div className="mt-1 text-xl font-bold">{v}</div>
      <div className="mt-1 text-xs text-zinc-600">{note}</div>
    </div>
  );
}

function MiniLine({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-[#cfd2d6] bg-white p-4">
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-zinc-600 mt-1">{desc}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold">
        {label} {required ? <span className="text-[#d4af37]">*</span> : null}
      </label>
      <input
        className="h-11 rounded-2xl border border-[#cfd2d6] bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function ChoiceCard({
  selected,
  title,
  desc,
  onClick,
}: {
  selected: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-left rounded-3xl border p-5 transition",
        selected
          ? "border-[#d4af37] bg-[#d4af37]/10"
          : "border-[#cfd2d6] bg-white hover:bg-zinc-50",
      ].join(" ")}
    >
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm text-zinc-600">{desc}</div>
    </button>
  );
}

function isValidHexColor(x: string) {
  return /^#([0-9a-fA-F]{6})$/.test(x.trim());
}

function FAQAccordion() {
  // 👉 Edit these
  const faqs = [
    {
      q: "What should I include in my portfolio?",
      a: "Focus on your strongest work rather than everything you’ve done. A good portfolio usually includes a short introduction, 2–5 key projects or experiences, and clear descriptions of your role, approach, and outcomes.",
    },
    {
      q: "How should I write my project descriptions?",
      a: `Keep descriptions concise and outcome-focused. A simple structure works best: What was the problem or objective? What did you do specifically? What was the result or impact? Quantifying results (e.g. “improved efficiency by 20%”) helps your portfolio stand out.`,
    },
    {
      q: "How should I organise my portfolio sections?",
      a: "Put your strongest and most relevant work first. Recruiters often scan quickly, so lead with what best matches the role you’re applying for, followed by supporting or secondary projects.",
    },
    {
      q: "What types of files should I upload?",
      a: "You can upload PDFs, slides, documents, images, or screenshots. Reports, presentation decks, certificates, and visual outputs are all suitable. If a file is large or technical, a short explanation alongside it is helpful.",
    },
    {
      q: "How many files should I upload per project or section?",
      a: "Quality matters more than quantity. One to three well-chosen files per project is usually sufficient. Too many files can overwhelm readers.",
    },    
    {
      q: "Can I customise my own portfolio website?",
      a: "By default, we build your portfolio using a clean, standard template that is optimised for recruiters. If you’d like additional customisation (layout changes, extra sections, special styling, or unique features), feel free to contact us to discuss the available options.",
    },
    {
      q: "How long does it take to receive my portfolio website?",
      a: "The standard delivery time is 2–3 working days after we receive all required details and materials. More customised requests may take slightly longer, depending on scope.",
    },
    {
      q: "What do I need to prepare before ordering?",
      a: "You’ll need basic personal details, a short tagline, and any materials you want to showcase (reports, slides, certificates, or images). If you’re unsure what to include, you can submit first and refine later.",
    },
    {
      q: "How will I receive my portfolio website?",
      a: "You’ll receive a live preview link to review your portfolio website. Once finalised, we will share the deployment files or hosting link, depending on your selected hosting option.",
    },
    {
      q: "Do I need my own domain or hosting?",
      a: "Not necessarily. You can either use your own domain and hosting, or request help from us to deploy and host your portfolio website.",
    },
    {
      q: "How does payment work?",
      a: "Payment is $50 via PayNow, and is only required after the portfolio website is completed and you’ve reviewed the preview.",
    },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="grid gap-3">
      {faqs.map((item, idx) => {
        const isOpen = openIdx === idx;

        return (
          <div
            key={idx}
            className={[
              "rounded-3xl border bg-[#fafafa] transition card-hover",
              isOpen ? "border-[#d4af37]" : "border-[#cfd2d6]",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
            >
              <span className="font-semibold">{item.q}</span>

              <span
                className={[
                  "inline-flex h-9 w-9 items-center justify-center rounded-2xl border bg-white transition",
                  isOpen ? "border-[#d4af37]" : "border-[#cfd2d6]",
                ].join(" ")}
                aria-hidden="true"
              >
                <span className="text-[#d4af37] font-bold">{isOpen ? "−" : "+"}</span>
              </span>
            </button>

            <div
              className={[
                "grid transition-all duration-200 ease-out px-5",
                isOpen ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr] pb-0",
              ].join(" ")}
            >
              <div className="overflow-hidden">
                <p className="text-sm text-zinc-600 leading-relaxed">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TestimonialCard({
  quote,
  name,
  role,
}: {
  quote: string;
  name: string;
  role: string;
}) {
  return (
    <div className="rounded-3xl border border-[#cfd2d6] bg-[#fafafa] p-6 card-hover h-full flex flex-col">
      <p className="text-sm text-zinc-700 leading-relaxed flex-1">
        “{quote}”
      </p>

      <div className="mt-4 pt-4 border-t border-[#cfd2d6]">
        <div className="font-semibold">{name}</div>
        <div className="text-sm text-zinc-600">{role}</div>
      </div>
    </div>
  );
}
