import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
      <div className="w-full max-w-md">
        <SignIn
          appearance={{
            baseTheme: undefined,
            variables: {
              colorPrimary: "#3b82f6",
              colorBackground: "#111827",
              colorInputBackground: "#1f2937",
              colorInputText: "#f9fafb",
              colorText: "#f9fafb",
              colorTextSecondary: "#d1d5db",
              colorTextOnPrimaryBackground: "#ffffff",
              colorDanger: "#ef4444",
              colorSuccess: "#10b981",
              colorWarning: "#f59e0b",
              colorNeutral: "#6b7280",
              fontFamily: '"Inter", sans-serif',
              fontSize: "14px",
              borderRadius: "8px",
              spacingUnit: "1rem",
            },
            elements: {
              rootBox: {
                width: "100%",
                maxWidth: "400px",
                margin: "0 auto",
              },
              card: {
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "12px",
                boxShadow:
                  "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                padding: "2rem",
              },
              headerTitle: {
                color: "#f9fafb",
                fontSize: "24px",
                fontWeight: "600",
                textAlign: "center",
                marginBottom: "0.5rem",
              },
              headerSubtitle: {
                color: "#d1d5db",
                fontSize: "14px",
                textAlign: "center",
                marginBottom: "2rem",
              },
              socialButtonsBlockButton: {
                backgroundColor: "#374151",
                border: "1px solid #4b5563",
                borderRadius: "8px",
                color: "#f9fafb",
                fontSize: "14px",
                fontWeight: "500",
                padding: "12px 16px",
                marginBottom: "8px",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "#4b5563",
                  borderColor: "#6b7280",
                  transform: "translateY(-1px)",
                },
                "&:focus": {
                  backgroundColor: "#4b5563",
                  borderColor: "#3b82f6",
                  outline: "2px solid #3b82f6",
                  outlineOffset: "2px",
                },
              },
              socialButtonsBlockButtonText: {
                color: "#f9fafb",
                fontSize: "14px",
                fontWeight: "500",
              },
              socialButtonsBlockButtonArrow: {
                display: "none",
              },
              dividerLine: {
                backgroundColor: "#4b5563",
                height: "1px",
                margin: "1.5rem 0",
              },
              dividerText: {
                color: "#9ca3af",
                fontSize: "12px",
                fontWeight: "500",
                backgroundColor: "#1f2937",
                padding: "0 1rem",
              },
              formFieldInput: {
                backgroundColor: "#374151",
                border: "1px solid #4b5563",
                borderRadius: "8px",
                color: "#f9fafb",
                fontSize: "14px",
                padding: "12px 16px",
                transition: "all 0.2s ease",
                "&:focus": {
                  borderColor: "#3b82f6",
                  outline: "2px solid #3b82f6",
                  outlineOffset: "2px",
                  backgroundColor: "#4b5563",
                },
                "&::placeholder": {
                  color: "#9ca3af",
                },
              },
              formFieldLabel: {
                color: "#f9fafb",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "6px",
              },
              formButtonPrimary: {
                backgroundColor: "#3b82f6",
                border: "none",
                borderRadius: "8px",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "600",
                padding: "12px 24px",
                width: "100%",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "#2563eb",
                  transform: "translateY(-1px)",
                },
                "&:focus": {
                  backgroundColor: "#2563eb",
                  outline: "2px solid #3b82f6",
                  outlineOffset: "2px",
                },
              },
              footerActionLink: {
                color: "#3b82f6",
                fontSize: "14px",
                fontWeight: "500",
                textDecoration: "none",
                "&:hover": {
                  color: "#2563eb",
                  textDecoration: "underline",
                },
              },
              footerActionText: {
                color: "#d1d5db",
                fontSize: "14px",
                textAlign: "center",
                marginTop: "1.5rem",
              },
              formFieldSuccessText: {
                color: "#10b981",
                fontSize: "12px",
                marginTop: "4px",
              },
              formFieldErrorText: {
                color: "#ef4444",
                fontSize: "12px",
                marginTop: "4px",
              },
              identityPreviewText: {
                color: "#f9fafb",
                fontSize: "14px",
              },
              identityPreviewEditButton: {
                color: "#3b82f6",
                fontSize: "12px",
                fontWeight: "500",
                "&:hover": {
                  color: "#2563eb",
                },
              },
            },
          }}
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
