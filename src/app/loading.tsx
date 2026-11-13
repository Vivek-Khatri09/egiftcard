import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="section" aria-busy="true" aria-label="Loading">
      <Skeleton className="mx-auto mb-4 h-10 w-2/3" />
      <Skeleton className="mx-auto mb-12 h-5 w-1/2" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
      </div>
    </div>
  );
}
