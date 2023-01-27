import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { env } from '~/env/server.mjs';
import type { Context } from './createContext';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const { router, middleware } = t;

/**
 * Unprotected procedure
 **/
const isAcceptableOrigin = t.middleware(({ ctx: { user, acceptableOrigin }, next }) => {
  if (!acceptableOrigin) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { user, acceptableOrigin } });
});

export const publicProcedure = t.procedure.use(isAcceptableOrigin);

/**
 * Reusable middleware to ensure
 * users are logged in
 */
const isAuthed = t.middleware(({ ctx: { user, acceptableOrigin }, next }) => {
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { user, acceptableOrigin } });
});

/**
 * Protected procedure
 **/
export const protectedProcedure = publicProcedure.use(isAuthed);
