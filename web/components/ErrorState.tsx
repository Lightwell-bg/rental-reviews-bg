import { Button } from "@/components/Button";

export function ErrorState({
  message,
  retryHref,
}: {
  message: string;
  retryHref?: string;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="font-medium text-red-800">Ошибка</p>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      {retryHref && (
        <div className="mt-4">
          <Button href={retryHref} variant="secondary">
            Попробовать снова
          </Button>
        </div>
      )}
    </div>
  );
}
