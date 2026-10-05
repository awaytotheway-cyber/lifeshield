import { SkeletonCardList } from "@/components/ui/Skeleton";

type StaticSkeletonProps = {
  rows?: number;
};

/**
 * Ghost layout used on Results, Plan and most list screens while data loads.
 *
 * Kept as a named export because many screens already import it. It now
 * delegates to the shimmering SkeletonCardList so every one of those screens
 * gets the design system's loading treatment; the shimmer drops itself when
 * the phone asks for reduced motion, which is what "static" originally meant.
 *
 * New screens should import SkeletonCardList from "@/components/ui/Skeleton".
 */
export function StaticSkeleton({ rows = 3 }: StaticSkeletonProps) {
  return <SkeletonCardList rows={rows} />;
}
