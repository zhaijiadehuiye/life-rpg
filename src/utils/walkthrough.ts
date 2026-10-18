const KEY = 'life-os:walkthrough'
export function walkthroughStep(): number | null {
  try { const value = sessionStorage.getItem(KEY); const number = Number(value); return value !== null && Number.isInteger(number) && number >= 0 && number < 4 ? number : null } catch { return null }
}
export function setWalkthroughStep(step: number | null) {
  try { if (step === null) sessionStorage.removeItem(KEY); else sessionStorage.setItem(KEY, String(step)) } catch { /* The guide also works without session persistence. */ }
  window.dispatchEvent(new CustomEvent('life-os:walkthrough', { detail: step }))
}
