// Saved preferences and progress in localStorage, under 'dt-' keys.
// Optional: when storage is blocked the game still works, it just forgets.
export const store = {
  get(k, d) { try { const v = localStorage.getItem('dt-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('dt-' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};
