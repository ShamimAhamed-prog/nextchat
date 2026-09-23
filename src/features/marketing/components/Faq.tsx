"use client";

import { useState } from "react";
import Container from "@/shared/ui/Container";
import SectionHeading from "@/shared/ui/SectionHeading";

const ITEMS = [
  {
    q: "What is Nexchatgen' AI assistant?",
    a: "A governed AI agent that answers, searches, books and supports across web, WhatsApp, Messenger and Instagram — grounded in your approved fare and policy documents, not the model's memory.",
  },
  {
    q: "Which channels are supported today?",
    a: "The web widget and WhatsApp are live now. Messenger, Instagram and inbound email join in the next release, once cross-channel identity linking is verified.",
  },
  {
    q: "Does the AI ever touch my money directly?",
    a: "No. Every payment happens on a hosted checkout page — no card number, PIN or OTP ever enters the chat. Booking and payment state live in deterministic services the AI can only call through validated tools.",
  },
  {
    q: "What happens when I need a human?",
    a: "Handoff is immediate on request, and automatic the moment risk, low confidence or a money-path exception appears — with the full transcript, booking state and AI summary attached, so nothing has to be repeated.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="pb-24 pt-12">
      <Container className="flex flex-col gap-8">
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently Asked "
          accent="Question"
          bodyWidth={1320}
        >
          Everything you need to know about the product and billing.
        </SectionHeading>

        <div className="flex flex-col gap-4">
          {ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={`rounded-[12px] transition-colors ${
                  isOpen
                    ? "border border-coral bg-white/[0.04]"
                    : "card-hairline bg-white/[0.04]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start justify-between gap-6 px-7 py-6 text-left"
                >
                  <span className="flex flex-col gap-4">
                    <span className="text-xl font-medium capitalize leading-7 text-white">
                      {item.q}
                    </span>
                    {isOpen && item.a ? (
                      <span className="max-w-[1040px] text-base leading-6 text-ink-muted">
                        {item.a}
                      </span>
                    ) : null}
                  </span>

                  <span
                    className={`mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                      isOpen ? "border-coral text-coral" : "border-white/40 text-white"
                    }`}
                    aria-hidden
                  >
                    {isOpen ? "–" : "+"}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
