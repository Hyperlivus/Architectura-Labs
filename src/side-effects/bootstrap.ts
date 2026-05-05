import { registerMessageNotificationBroadcaster } from './notifications/message-notification-broadcaster';

let started = false;

export function registerSideEffectHandlers(): void {
  if (started) {
    return;
  }
  started = true;
  registerMessageNotificationBroadcaster();
}
