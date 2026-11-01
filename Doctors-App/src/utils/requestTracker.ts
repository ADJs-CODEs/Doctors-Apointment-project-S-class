// Counts the work in flight (API requests and page changes) so the top loading bar can
// show "something is loading" without every screen moving it by hand. The bar starts
// when the count goes from 0 to 1 and finishes only when it's back to 0, so parallel
// work can't make it jump backwards or restart.

/**
 * busy: whether anything is loading.
 * immediate: show the bar right away (a click the user just made) instead of waiting
 * to see whether a background request is quick enough to skip the bar.
 */
type Listener = (busy: boolean, immediate: boolean) => void;

let inFlight = 0;
const listeners = new Set<Listener>();

const notify = (immediate: boolean) =>
  listeners.forEach((listener) => listener(inFlight > 0, immediate));

export const requestTracker = {
  start({ immediate = false }: { immediate?: boolean } = {}) {
    inFlight += 1;
    if (inFlight === 1 || immediate) notify(immediate);
  },
  finish() {
    inFlight = Math.max(0, inFlight - 1);
    if (inFlight === 0) notify(false);
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
