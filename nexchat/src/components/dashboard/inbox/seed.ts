// Extracted from `inboxEngine.ts`. See `inbox/README.md` for the split.

import { YOU } from "@/lib/people";
import { activity, ago, nid } from "./helpers";
import { slaDeadlineFor } from "./queue";
import { MAX_SEND_ATTEMPTS, type Conversation } from "./types";

export function seedConversations(): Conversation[] {
  const c1QueuedSince = ago(2);
  const c2QueuedSince = ago(12);
  const c3QueuedSince = ago(25);
  const c4QueuedSince = ago(24 * 60);
  return [
    {
      id: "c1",
      queuedSince: c1QueuedSince,
      slaDeadline: slaDeadlineFor("P0", c1QueuedSince),
      customerName: "Tanvir Rahman",
      queueId: "q2",
      requiredSkill: "refunds",
      phone: "+880 1766 988803",
      email: "tanvir.rahman@example.com",
      address: "House 12, Road 5, Dhanmondi, Dhaka",
      passportNid: "NID 1994 7723 0041",
      // Money moved on an unverified identity — exactly the case an agent
      // needs flagged before they act.
      identityStatus: "unverified",
      channel: "WhatsApp",
      pnr: "XKD4RP",
      route: "DAC → CXB",
      bookingState: "Ticketing failed",
      paymentSummary: "BDT 11,600 · bKash · settled 14:22 · ref BK7729X",
      paidAmountBdt: 11600,
      language: "Bangla (types Banglish)",
      status: "assigned",
      assignee: YOU,
      priority: "P0",
      escalationReason: "Paid, not ticketed",
      summary: "Paid BDT 11,600 by bKash at 14:22. Ticketing failed three times and the fare hold lapsed at 14:31. Money captured, no ticket issued. Customer notified proactively and is waiting.",
      intentTrail: [
        { intent: "flight.book", confidence: 0.94 },
        { intent: "payment.status", confidence: 0.88 },
        { intent: "handoff.request", confidence: 1.0 },
      ],
      // "Dispute" puts this one under legal hold (ADM-08): money moved and
      // the customer has raised it, so it can be neither exported nor deleted.
      tags: ["VIP", "Repeat", "Dhaka", "bKash", "Dispute"],
      transcript: [
        {
          id: nid("m"),
          from: "customer",
          text: "Bhai amar taka kete nise but ticket ashe nai",
          time: "14:32",
          translation: "Brother, my money has been taken but the ticket hasn't arrived.",
        },
        {
          id: nid("m"),
          from: "customer",
          text: "",
          time: "14:32",
          // INB-05: a shared pin is a place, not a file with coordinates in it.
          attachment: {
            kind: "location",
            name: "Shared location",
            url: "#",
            sizeLabel: "",
            place: "Hazrat Shahjalal International Airport, Dhaka",
          },
        },
        {
          id: nid("m"),
          from: "bot",
          text: "আমরা বিষয়টি দেখছি — একজন সহকর্মী দ্রুত আপনাকে সাহায্য করবেন।",
          time: "14:33",
          translation: "We're looking into it — a colleague will help you shortly.",
          delivery: { state: "read", attempts: 1 },
        },
        { id: nid("m"), from: "system", text: "Escalated — paid, not ticketed (P0)", time: "14:33" },
      ],
      activity: [
        activity("Fare hold created", "PNR XKD4RP · 12 min TTL", "14:19"),
        activity("Payment received", "bKash · BDT 11,600", "14:22"),
        activity("Ticketing failed ×3", "Backoff exhausted, hold lapsed", "14:31"),
        activity("Escalated to queue", "Paid, not ticketed — P0", "14:33"),
      ],
      unread: 3,
      lastCustomerAt: ago(2),
      channelOptIn: true,
      updatedLabel: "2m ago",
      ownerLeaseActive: true,
      aiThinking: false,
    },
    {
      id: "c2",
      queuedSince: c2QueuedSince,
      slaDeadline: slaDeadlineFor("P2", c2QueuedSince),
      customerName: "Rahat Islam",
      queueId: "q2",
      requiredSkill: "refunds",
      phone: "+60 12 345 6789",
      email: "rahat.islam@example.com",
      address: "Kuala Lumpur, Malaysia",
      passportNid: "Passport BX0472619",
      identityStatus: "verified",
      channel: "WhatsApp",
      pnr: "7QM2LB",
      route: "KUL → DAC",
      bookingState: "Ticketed",
      paymentSummary: "Card · settled",
      paidAmountBdt: 42800,
      language: "Bangla ↔ English (switches mid-sentence)",
      status: "queued",
      priority: "P2",
      escalationReason: "Refund request",
      citedKnowledge: ["refund", "change"],
      summary: "Asking why a refund on a date-change fee hasn't arrived yet. Bot quoted the policy but couldn't action the refund.",
      intentTrail: [
        { intent: "refund.status", confidence: 0.81 },
        { intent: "booking.change", confidence: 0.72 },
      ],
      tags: ["Repeat"],
      transcript: [
        {
          id: nid("m"),
          from: "customer",
          text: "refund er taka kobe pabo? change fee ফেরত পাইনি এখনও",
          time: "10:58",
          translation: "When will I get the refund? I still haven't received the change fee back.",
          // INB-05: WhatsApp reports reactions, so they render as themselves.
          reactions: [{ emoji: "👍", from: "Rahat Islam" }],
        },
        { id: nid("m"), from: "bot", text: "Refunds to card usually take 5–10 business days. I don't see this one processed yet — connecting you to a person.", time: "10:59" },
      ],
      activity: [activity("Escalated to queue", "Refund not received — P2", "10:59")],
      unread: 10,
      lastCustomerAt: ago(12),
      channelOptIn: true,
      updatedLabel: "12m ago",
      ownerLeaseActive: false,
      aiThinking: false,
    },
    {
      id: "c3",
      queuedSince: c3QueuedSince,
      slaDeadline: slaDeadlineFor("P2", c3QueuedSince),
      customerName: "Marci Senter",
      queueId: "q1",
      phone: "+880 1712 000111",
      email: "marci.senter@example.com",
      address: "Gulshan, Dhaka",
      passportNid: "NID 1988 4410 7726",
      identityStatus: "pending",
      // INB-11: a colleague is already looking at this one. The ownership
      // lease stops a collision; presence is what lets an agent see one
      // coming, before two people write the same reply.
      presence: { person: "Shirin Akter", state: "viewing" },
      channel: "Website",
      route: "DAC → ZYL",
      bookingState: "No active booking",
      language: "English",
      status: "queued",
      priority: "P2",
      escalationReason: "Baggage & Fare Policy",
      summary: "Asked about checked baggage on an Economy Saver fare — answered from policy, but wants to confirm before booking a group of 5.",
      citedKnowledge: ["baggage"],
      intentTrail: [{ intent: "policy.baggage", confidence: 0.9 }],
      tags: ["Dhaka"],
      transcript: [
        { id: nid("m"), from: "customer", text: "Booking for 5 people, need to double check baggage before I pay", time: "09:41" },
      ],
      activity: [activity("Escalated to queue", "Baggage & fare policy — P2", "09:41")],
      unread: 1,
      lastCustomerAt: ago(25),
      channelOptIn: true,
      updatedLabel: "25m ago",
      ownerLeaseActive: false,
      aiThinking: false,
    },
    {
      id: "c4",
      queuedSince: c4QueuedSince,
      slaDeadline: slaDeadlineFor("P3", c4QueuedSince),
      customerName: "Chieko Chute",
      queueId: "q1",
      requiredSkill: "reissue",
      phone: "+880 1755 442200",
      email: "chieko.chute@example.com",
      address: "Chittagong",
      passportNid: "NID 2001 6634 9180",
      // The name correction that resolved this thread came from a mismatch.
      identityStatus: "mismatch",
      channel: "Messenger",
      pnr: "3LK8NF",
      route: "CGP → DAC",
      bookingState: "Ticketed",
      paymentSummary: "Nagad · settled",
      paidAmountBdt: 8900,
      language: "Banglish",
      status: "resolved",
      // Resolved 20h ago — inside the 24h "Recently resolved" window.
      resolvedAt: ago(20 * 60),
      priority: "P3",
      escalationReason: "Name correction on e-ticket",
      summary: "Name spelled incorrectly on the e-ticket. Corrected and reissued.",
      intentTrail: [{ intent: "booking.name_correction", confidence: 0.86 }],
      tags: [],
      transcript: [
        {
          id: nid("m"),
          from: "customer",
          text: "amar naam bhul ache ticket e, Cheiko na Chieko",
          time: "Yesterday",
          translation: "My name is wrong on the ticket — it's Chieko, not Cheiko.",
        },
        {
          id: nid("m"),
          from: "agent",
          text: "Fixed and resent — please check your Messenger and email.",
          time: "Yesterday",
          // Messenger is disabled for this tenant, so this one exhausted its
          // three attempts and is waiting on a human — INB-09's
          // "operator-visible terminal failure", present on load rather than
          // only reachable by getting a live send to fail.
          delivery: {
            state: "failed",
            attempts: MAX_SEND_ATTEMPTS,
            terminalReason: "Messenger is disabled for this tenant — nothing can be delivered on it",
          },
        },
      ],
      activity: [
        activity("Escalated to queue", "Name correction — P3", "Yesterday"),
        activity("Resolved", "Name corrected · reissued", "Yesterday"),
        // The entry `FAIL_DELIVERY` would have written. Seeding the delivery
        // state without it left a terminal failure with no audit trail —
        // exactly the invisibility INB-09 exists to prevent.
        activity(
          "Send failed — needs an operator",
          `Messenger is disabled for this tenant — nothing can be delivered on it · ${MAX_SEND_ATTEMPTS}/${MAX_SEND_ATTEMPTS} attempts`,
          "Yesterday",
        ),
      ],
      unread: 0,
      lastCustomerAt: ago(26 * 60),
      channelOptIn: true,
      updatedLabel: "1d ago",
      ownerLeaseActive: false,
      aiThinking: false,
      resolution: { category: "Booking change", reference: "3LK8NF" },
    },
  ];
}
