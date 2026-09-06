import Container from "./Container";
import SectionHeading from "./SectionHeading";
import Logo from "./Logo";

/**
 * These four cards used to be PNG exports inherited from the generic template
 * this page was adapted from — gradient posters with the old product's
 * wordmark and caption baked into the pixels, which is why the section sat
 * unrendered. They are drawn in code now: the gradients are CSS, the mark is
 * the shared `Logo`, and the captions are real text. The brand can only ever
 * come from one place again, the copy is selectable and translatable, and the
 * section costs no image bytes at all (the originals were 4.8 MB of the 34 MB
 * asset budget).
 */
const CARDS = [
  {
    channel: "Web widget",
    line: "Answers the traveller already on your site, without a page change",
    // Teal → ink, the coolest of the four, matching the original card order.
    gradient:
      "linear-gradient(155deg, #0d3b3f 0%, #10262c 46%, #0a1417 100%)",
    bloom: "#1fb6a6",
  },
  {
    channel: "WhatsApp",
    line: "Books and reissues right in the thread they message from",
    gradient:
      "linear-gradient(155deg, #c9491f 0%, #a3213f 52%, #6d1330 100%)",
    bloom: "#ff8a3d",
  },
  {
    channel: "Messenger & Instagram",
    line: "One history, whichever inbox it started in",
    gradient:
      "linear-gradient(155deg, #12356b 0%, #0e2350 48%, #07132c 100%)",
    bloom: "#3d7bff",
  },
  {
    channel: "Agent console",
    line: "A human picks up with the handover package attached",
    gradient:
      "linear-gradient(155deg, #3a0f2e 0%, #24102b 50%, #120a18 100%)",
    bloom: "#ff5e5e",
  },
];

export default function Ecommerce() {
  return (
    <section id="channels" className="py-12">
      <Container>
        <div className="flex flex-col gap-8 rounded-panel bg-panel px-8 py-12">
          <SectionHeading
            eyebrow="In The Wild"
            title="Where Takeoff Travels shows up "
            accent="for travellers"
          >
            The same conversation, wherever the traveller already is — the
            web widget, WhatsApp, and the agent console behind them.
          </SectionHeading>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CARDS.map((c) => (
              <article
                key={c.channel}
                className="relative flex h-[454px] flex-col items-center justify-center overflow-hidden rounded-[16px] px-7 text-center"
                style={{ background: c.gradient }}
              >
                {/* The soft off-centre bloom the exported posters all had */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full blur-[80px]"
                  style={{ background: c.bloom, opacity: 0.55 }}
                />

                <div className="relative flex flex-col items-center gap-6">
                  <Logo href={null} mono />
                  {/* Three lines reserved: the shortest line would otherwise
                      centre its card higher and break the row of wordmarks. */}
                  <p className="min-h-[84px] text-lg font-semibold leading-7 text-white">
                    {c.line}
                  </p>
                  <span className="rounded-full border border-white/30 px-4 py-1.5 text-sm font-medium text-white/90">
                    {c.channel}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
