// src/server/db/client.ts
import { PrismaClient } from '@prisma/client';
import { env } from '~/env/server.mjs';
import Stripe from 'stripe';

declare global {
  // eslint-disable-next-line no-var, vars-on-top
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var, vars-on-top
  // var stripe: Stripe | undefined;
}

export let prisma: PrismaClient;
if (env.NODE_ENV === 'production') {
  prisma = new PrismaClient({ log: ['error'] });
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({ log: ['query', 'error', 'warn'] });
  }
  prisma = global.prisma;
}

// const getStripe = async () =>
//   new Stripe(env.STRIPE_SECRET_KEY, {
//     typescript: true,
//     apiVersion: '2022-11-15',
//   });
// export let stripe: Stripe;
// if (!global.stripe) {
//   global.stripe = await getStripe();
//   stripe = global.stripe;
// }
