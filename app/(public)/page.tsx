import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <Card className="max-w-2xl px-8 py-14">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-brass">
          Addis Ababa
        </p>
        <h1 className="mt-4 font-heading text-4xl font-bold leading-tight sm:text-5xl">
          Mosisa Barber Shop
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-cream-muted">
          Classic cuts, honest craft. Online booking is coming soon — this is
          the design-system stage of the build.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/book" className="w-full sm:w-44">
            <Button variant="secondary" fullWidth disabled>
              Book Now (soon)
            </Button>
          </Link>
          <Link href="/services" className="w-full sm:w-44">
            <Button variant="secondary" fullWidth disabled>
              View Services
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}

