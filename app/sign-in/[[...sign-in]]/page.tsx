import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
      <div className="w-full max-w-md">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          redirectUrl="/chat"
          afterSignInUrl="/chat"
          afterSignUpUrl="/chat"
        />
      </div>
    </div>
  );
}
