import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-page px-6 text-center">
      <p className="text-[120px] font-bold leading-none text-coral">404</p>
      <h1 className="mt-4 text-[32px] font-bold capitalize text-white">
        Page Not Found
      </h1>
      <p className="mt-3 max-w-md text-base leading-[22px] text-white/70">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center rounded-full bg-[linear-gradient(90deg,var(--color-grad-from)_0%,var(--color-grad-to)_100%)] px-8 text-base font-medium text-white transition-opacity hover:opacity-90"
      >
        Back to Home
      </Link>
    </main>
  );
}
