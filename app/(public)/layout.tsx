import Link from "next/link";
import { NavMenu } from "@/components/NavMenu";
import { getActiveBarbers, getWorkingHours } from "@/lib/data";

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

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Footer data is fetched defensively; footer degrades gracefully.
  const [barbers, hours] = await Promise.all([
    getActiveBarbers(),
    getWorkingHours(),
  ]);

  return (
    <>
      <NavMenu />
      <div className="flex-1">{children}</div>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:grid-cols-3">
          <div>
            <p className="font-heading text-lg font-semibold">
              Mosisa<span className="text-brass">.</span>
            </p>
            <p className="mt-2 text-sm leading-6 text-cream-muted">
              Classic cuts, honest craft. Addis Ababa.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cream-muted">
              Barbers
            </p>
            <ul className="mt-3 space-y-1.5">
              {barbers.length === 0 ? (
                <li className="text-sm text-cream-muted/60">
                  Coming soon
                </li>
              ) : (
                barbers.map((barber) => (
                  <li key={barber.id}>
                    <Link
                      href={`/barbers/${barber.slug}`}
                      className="text-sm text-cream-muted transition-colors hover:text-brass-strong"
                    >
                      {barber.name}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cream-muted">
              Hours
            </p>
            <ul className="mt-3 space-y-1.5">
              {hours.length === 0 ? (
                <li className="text-sm text-cream-muted/60">
                  Open daily — details soon
                </li>
              ) : (
                hours.map((row) => (
                  <li
                    key={row.id}
                    className="flex justify-between gap-4 text-sm text-cream-muted"
                  >
                    <span>{DAY_NAMES[row.dayOfWeek]}</span>
                    <span className="text-cream">
                      {formatTime(row.startTime)} – {formatTime(row.endTime)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-line py-4 text-center text-xs text-cream-muted/60">
          © {new Date().getFullYear()} Mosisa Barber Shop
        </div>
      </footer>
    </>
  );
}
