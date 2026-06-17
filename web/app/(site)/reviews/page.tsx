import { ErrorState } from "@/components/ErrorState";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewFilters } from "@/components/ReviewFilters";
import { getApprovedReviews } from "@/lib/reviews";
import { getCatalogCities } from "@/lib/catalog";

export const metadata = {
  title: "Каталог отзывов",
};

type PageProps = {
  searchParams: Promise<{
    city?: string;
    address?: string;
    target_type?: string;
    rating?: string;
  }>;
};

export default async function ReviewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { data, error } = await getApprovedReviews(params);
  const cities = await getCatalogCities();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold text-zinc-900">Каталог отзывов</h1>
        <p className="mt-2 text-zinc-600">
          Только одобренные модератором отзывы. Без приватных данных и
          вложений.
        </p>
      </div>

      <div className="mt-8">
        <ReviewFilters
          city={params.city}
          address={params.address}
          cities={cities.map((c) => c.name)}
          target_type={params.target_type}
          rating={params.rating}
        />
      </div>

      <div className="mt-8">
        {error ? (
          <ErrorState message={error} retryHref="/reviews" />
        ) : data.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center text-zinc-600">
            <p className="font-medium text-zinc-800">Отзывов пока нет</p>
            <p className="mt-2 text-sm">
              Попробуйте изменить фильтры или загляните позже.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {data.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
