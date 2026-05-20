import { createAuthRouteHandler } from '@abd/satellite-sdk';

const handler = createAuthRouteHandler({
  appId: 'quiz',
  clientId: process.env.AUTH_CLIENT_ID!,
  clientSecret: process.env.AUTH_CLIENT_SECRET!,
  jwtSecret: process.env.AUTH_JWT_SECRET!,
});

export { handler as GET, handler as POST };
