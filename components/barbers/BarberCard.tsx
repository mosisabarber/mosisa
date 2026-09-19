import Link from "next/link";
import { Card, Badge, Button } from "@/components/ui";
import type { Barber } from "@/lib/data";

export function BarberCard({ barber }: { barber: Barber }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative flex h-56 items-center justify-center bg-gradient-to-br from-forest/40 via-navy/30 to-surface-raised">
        {barber.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={barber.photoUrl}
            alt={barber.name}
            className="h-full w-full object-cover"
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
          <Link href={`/barbers/${barber.slug}`}>
            <Button variant="secondary" size="sm" fullWidth>
              View profile & book
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
