import Stripe from 'stripe';
import { STRIPE_SECRET } from 'src/utils/consts';

export const stripe = new Stripe(STRIPE_SECRET, {
	apiVersion: '2020-08-27'
});
