import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  // Debug logging for production
  if (typeof window !== "undefined") {
    console.log("Clerk Environment Variables:", {
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
        ? "✅ Set"
        : "❌ Missing",
      signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      environment: process.env.NODE_ENV,
    });
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 to-gray-900 p-4">
      <div className="w-full max-w-md">
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-gray-900/90 border border-gray-700/50 shadow-2xl",
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
}
