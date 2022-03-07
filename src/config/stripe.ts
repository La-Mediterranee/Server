import Stripe from 'stripe';
import { STRIPE_SECRET } from '../utils/consts.js';

export const stripe = new Stripe(STRIPE_SECRET, {
	apiVersion: '2020-08-27',
});
