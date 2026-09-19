import Link from "next/link";
import { Button, Card } from "@/components/ui";

/**
 * Shown when a management token is unknown or malformed (§4 security: tokens
 * are unguessable; this state must not reveal any appointment details).
 */
export default function ManageNotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Card>
        <h1 className="font-heading text-2xl font-bold">
          This link doesn&apos;t work
        </h1>
        <p className="mt-3 text-sm leading-6 text-cream-muted">
          The appointment link is incomplete, or it has been replaced by a newer
          one. Check the latest email or SMS from us and use the most recent
          link.
        </p>
        <p className="mt-3 text-sm leading-6 text-cream-muted">
          Can&apos;t find it? Call the shop and we&apos;ll look up your booking.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link href="/book">
            <Button className="w-full">Book an appointment</Button>
          </Link>
          <Link href="/contact">
            <Button variant="secondary" className="w-full">
              Contact the shop
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}