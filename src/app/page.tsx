import { HealthCard } from "@/modules/health/HealthCard";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-6">
      <HealthCard />
    </main>
  );
}
