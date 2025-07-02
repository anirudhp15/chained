// Environment-aware auth configuration
// Production Convex deployment should use production Clerk domain
// Development Convex deployment should use development Clerk domain

const getClerkDomain = () => {
  // Check if we're in a production Convex deployment by looking at the deployment context
  // This is more reliable than NODE_ENV in Convex context
  if (typeof process !== "undefined" && process.env.CONVEX_CLOUD_URL) {
    // If the Convex URL contains the production deployment ID, use production Clerk
    if (process.env.CONVEX_CLOUD_URL.includes("canny-nightingale-595")) {
      return "https://clerk.chained.chat";
    }
  }

  // Default to development Clerk domain
  return "https://absolute-shepherd-88.clerk.accounts.dev";
};

export default {
  providers: [
    {
      domain: "https://clerk.chained.chat",
      applicationID: "convex",
    },
  ],
};
