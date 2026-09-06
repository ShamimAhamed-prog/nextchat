import Container from "./Container";
import SectionHeading from "./SectionHeading";

const CARDS = [
  {
    n: "01",
    title: "Fragmented Channels",
    body: "Messages land in separate tools, agents repeat questions, and booking context gets copied by hand between them.",
  },
  {
    n: "02",
    title: "Drowned Urgency",
    body: "A routine baggage question sits in the same queue as a payment failure or a flight departing in six hours.",
  },
  {
    n: "03",
    title: "Ungoverned Automation",
    body: "Automation without a governed handoff just makes the fragmentation faster — it doesn't fix it.",
  },
];

export default function Problem() {
  return (
    <section className="py-16">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          eyebrow="Problem"
          title="You are losing sales because of missed "
          accent="messages and late replies"
        >
          That leads to ...
        </SectionHeading>

        <div className="grid gap-12 md:grid-cols-3">
          {CARDS.map((c) => (
            <article
              key={c.n}
              className="card-hairline flex flex-col gap-[46px] rounded-card bg-card p-6"
            >
              <span className="card-hairline inline-flex h-9 w-9 items-center justify-center rounded-lg font-[family-name:var(--font-inter)] text-base text-white">
                {c.n}
              </span>

              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold leading-[29px]">{c.title}</h3>
                <p className="text-base leading-6 text-white">{c.body}</p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
