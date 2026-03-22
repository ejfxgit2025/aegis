import { pushEvent } from './events.ts';

export async function triggerEvent(payload: any) {
  return pushEvent(payload);
}
