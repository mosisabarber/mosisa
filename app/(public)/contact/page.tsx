import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { getWorkingHours } from "@/lib/data";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Find Mosisa Barber Shop in Addis Ababa — address, opening hours and phone.",
};

export const revalidate = 60;

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export default async function ContactPage() {
  const hours = await getWorkingHours();

  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">Contact</h1>
      <p className="mt-3 text-sm leading-6 text-cream-muted">
        Questions, group bookings, or just want to talk through a style first?
        Reach out or drop by.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-cream-muted">
            Visit
          </p>
          <p className="mt-3 leading-7">
            Mosisa Barber Shop
            <br />
            Addis Ababa, Ethiopia
            <br />
            <span className="text-cream-muted">
              (full street address to be added)
            </span>
          </p>
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-cream-muted">
            Call / message
          </p>
          <p className="mt-3 leading-7">
            <span className="text-cream-muted">
              Phone and WhatsApp details to be added
            </span>
          </p>
          <p className="mt-3 text-sm leading-6 text-cream-muted">
            For booking issues, use the management link from your confirmation
            message — it works without any login.
          </p>
        </Card>
      </div>

      <Card className="mt-4 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-cream-muted">
          Opening hours
        </p>
        {hours.length === 0 ? (
          <p className="mt-3 text-sm text-cream-muted">
            Open daily — exact hours to be posted soon.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {hours.map((row) => (
              <li
                key={row.id}
                className="flex justify-between gap-4 text-sm"
              >
                <span className="text-cream-muted">
                  {DAY_NAMES[row.dayOfWeek]}
                </span>
                <span>
                  {formatTime(row.startTime)} – {formatTime(row.endTime)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
