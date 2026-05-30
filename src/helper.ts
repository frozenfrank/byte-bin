/** Helper function that assumes the value is element is always in the DOM. */
export function getElementById<T = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
