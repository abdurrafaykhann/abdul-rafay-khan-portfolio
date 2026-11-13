import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin sign-in",
  robots: { index: false, follow: false },
};

// Reads the URL (?error=…) on every request; never prerendered.
export const instant = false;

const ERRORS: Record<string, string> = {
  link: "That sign-in link has expired or was already used. Request a new one.",
  denied: "That account is not allowed in.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;
  return (
    <main className="text-mist flex min-h-svh items-center justify-center px-5">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <h1 className="hero-heading text-5xl font-black tracking-tight uppercase">
          Admin
        </h1>
        <LoginForm error={message} />
      </div>
    </main>
  );
}
