// Counts the API requests in flight so the top loading bar can show "something is
// loading" without every screen moving it by hand. The bar starts when the count goes
// from 0 to 1 and finishes only when it's back to 0, so parallel requests can't make it
// jump backwards or restart.

type Listener = (busy: boolean) => void;

let inFlight = 0;
const listeners = new Set<Listener>();

const notify = () => listeners.forEach((listener) => listener(inFlight > 0));

export const requestTracker = {
  start() {
    inFlight += 1;
    if (inFlight === 1) notify();
  },
  finish() {
    inFlight = Math.max(0, inFlight - 1);
    if (inFlight === 0) notify();
  },
  /** Calls `listener(true)` when loading starts and `listener(false)` when it ends. */
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
