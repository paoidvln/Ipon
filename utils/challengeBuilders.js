function buildWeek52() {
  const entries = [];
  for (let i = 1; i <= 52; i++) {
    entries.push({ amount: i * 10, saved: false, savedAt: null });
  }
  return entries;
}

function buildEnv100() {
  const amounts = [];
  for (let i = 1; i <= 100; i++) amounts.push(i);
  // Shuffle so the envelope's position doesn't reveal its amount.
  for (let i = amounts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [amounts[i], amounts[j]] = [amounts[j], amounts[i]];
  }
  return amounts.map(amount => ({ amount, saved: false, savedAt: null }));
}

function buildCustom(goal, count) {
  const per = goal / count;
  const entries = [];
  for (let i = 0; i < count; i++) {
    entries.push({ amount: per, saved: false, savedAt: null });
  }
  return entries;
}

function goalOf(entries) {
  return entries.reduce((sum, e) => sum + e.amount, 0);
}

module.exports = { buildWeek52, buildEnv100, buildCustom, goalOf };
