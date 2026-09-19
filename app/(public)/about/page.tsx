import type { Metadata } from "next";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "About",
  description:
    "The story of Mosisa Barber Shop — a traditional Addis Ababa barbershop with modern service.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">About</h1>

      <Card className="mt-8 p-7">
        <p className="leading-7 text-cream-muted">
          Mosisa Barber Shop is a classic, traditional barbershop with a modern
          approach to service. We respect the craft: sharp fades, clean beard
          work, straight-razor finishes, and a chair that's ready when you
          arrive.
        </p>
        <p className="mt-4 leading-7 text-cream-muted">
          We're a small team of barbers who take pride in individual work —
          many of our customers travel across the city for a specific barber.
          Browse their profiles, see their specialties, and book directly with
          the one whose style fits you.
        </p>
        <p className="mt-4 leading-7 text-cream-muted">
          Book online in under a minute, or just walk in. Either way, you'll
          get the same honest cut.
        </p>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Craft",
            body: "Traditional technique, modern standards. Every cut is finished properly.",
          },
          {
            title: "Your barber, your call",
            body: "Pick a specific barber and book their chair directly — no surprises.",
          },
          {
            title: "Effortless booking",
            body: "Reserve online in under a minute. Manage or reschedule from a simple link.",
          },
        ].map((item) => (
          <Card key={item.title} className="p-5">
            <p className="font-heading text-lg font-semibold text-brass-strong">
              {item.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-cream-muted">
              {item.body}
            </p>
          </Card>
        ))}
      </div>
    </main>
  );
}
