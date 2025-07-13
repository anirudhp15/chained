// Environment variable validation
export function checkRequiredEnvVars() {
  const requiredVars = [
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "XAI_API_KEY",
    "GOOGLE_API_KEY",
    "TAVILY_API_KEY",
    "NEXT_PUBLIC_CONVEX_URL",
    "CONVEX_DEPLOYMENT",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn("⚠️  Missing environment variables:", missingVars.join(", "));
    console.warn("Some features may not work properly.");
  }

  // Check specifically for Google API key since it's newly added
  if (!process.env.GOOGLE_API_KEY) {
    console.warn("⚠️  GOOGLE_API_KEY not found - Gemini models will not work");
  }

  return missingVars.length === 0;
}
