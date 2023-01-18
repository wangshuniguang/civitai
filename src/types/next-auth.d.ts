import { ModelFileFormat } from '@prisma/client';
import { DefaultSession } from 'next-auth';

interface ExtendedUser {
  id: number;
  showNsfw: boolean;
  blurNsfw: boolean;
  username?: string;
  tos?: boolean;
  isModerator?: boolean;
  email?: string;
  preferredModelFormat?: ModelFileFormat;
  preferredPrunedModel?: boolean;
  subscription?: string;
  stripeCustomer?: string;
}

declare module 'next-auth' {
  interface DefaultUser extends ExtendedUser {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }

  interface SessionUser extends ExtendedUser, DefaultSession['user'] {}
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user?: ExtendedUser & DefaultSession['user'];
    error?: string;
  }
}
