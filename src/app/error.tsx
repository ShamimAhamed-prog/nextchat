"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-page px-6 text-center">
      <p className="text-[120px] font-bold leading-none text-coral">500</p>
      <h1 className="mt-4 text-[32px] font-bold capitalize text-white">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-base leading-[22px] text-white/70">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-8 inline-flex h-12 items-center rounded-full bg-[linear-gradient(90deg,var(--color-grad-from)_0%,var(--color-grad-to)_100%)] px-8 text-base font-medium text-white transition-opacity hover:opacity-90"
      >
        Try Again
      </button>
    </main>
  );
}
