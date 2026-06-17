import { formatAddressLines } from "@/lib/address";

export function AddressBlock({
  review,
  className = "",
}: {
  review: {
    city: string;
    district?: string | null;
    street_or_complex?: string | null;
    building_number?: string | null;
    apartment_number?: string | null;
    address_public?: string | null;
  };
  className?: string;
}) {
  const addr = formatAddressLines(review);

  return (
    <dl className={`grid gap-1 text-sm text-zinc-600 sm:grid-cols-2 ${className}`.trim()}>
      <div>
        <dt className="inline text-zinc-500">Город: </dt>
        <dd className="inline">{addr.city}</dd>
      </div>
      <div>
        <dt className="inline text-zinc-500">Район: </dt>
        <dd className="inline">{addr.district}</dd>
      </div>
      <div>
        <dt className="inline text-zinc-500">Улица/ж.к.: </dt>
        <dd className="inline">{addr.street}</dd>
      </div>
      <div>
        <dt className="inline text-zinc-500">Дом/блок: </dt>
        <dd className="inline">{addr.building}</dd>
      </div>
      {review.apartment_number?.trim() && (
        <div>
          <dt className="inline text-zinc-500">Квартира: </dt>
          <dd className="inline">{addr.apartment}</dd>
        </div>
      )}
    </dl>
  );
}
