import Link from "next/link";
import Image from "next/image";
import { Card, Badge, Button } from "@/components/ui";
import type { Barber } from "@/lib/data";

/**
 * Reusable barber tile. Copy and the target URL are injected by the caller so
 * this stays a server component (no client dictionary access) and works from
 * both the barbers index and the homepage.
 */
export function BarberCard({
  barber,
  ctaLabel,
  href,
}: {
  barber: Barber;
  ctaLabel: string;
  href: string;
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative flex h-56 items-center justify-center bg-gradient-to-br from-forest/40 via-navy/30 to-surface-raised">
        {barber.photoUrl ? (
          <Image
            src={barber.photoUrl}
            alt={barber.name}
            fill
            sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
            quality={90}
            className="object-cover"
          />
        ) : (
          <span className="font-heading text-5xl font-semibold text-brass/60">
            {barber.name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-heading text-xl font-semibold">{barber.name}</h3>
          {barber.specialties && barber.specialties.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {barber.specialties.slice(0, 3).map((specialty) => (
                <Badge key={specialty} tone="forest">
                  {specialty}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {barber.bio && (
          <p className="line-clamp-2 text-sm leading-6 text-cream-muted">
            {barber.bio}
          </p>
        )}

        <div className="mt-auto pt-2">
          <Link href={href}>
            <Button variant="secondary" size="sm" fullWidth>
              {ctaLabel}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
