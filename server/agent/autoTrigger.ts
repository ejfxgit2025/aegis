import { triggerEvent } from './trigger.ts';

export async function autoTriggerEvent() {
  await triggerEvent({
    type: 'api_payment',
    to: '0x000000000000000000000000000000000000dEaD',
    amount: 1 // fixed demo amount — no random spam
  });
}
