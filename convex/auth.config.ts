export default {
  providers: [
    {
      domain:
        process.env.NODE_ENV === "production"
          ? "https://clerk.chained.chat"
          : "https://absolute-shepherd-88.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
