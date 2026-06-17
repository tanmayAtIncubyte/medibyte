import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6", className)}>
      {children}
    </main>
  );
}
