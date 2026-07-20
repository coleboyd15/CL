/* Day counter since April 11, 2026 */
(function (global) {
  // Local midnight of start date (Month is 0-indexed: 3 = April)
  const START = new Date(2026, 3, 11);

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function getDayCount(now) {
    now = now || new Date();
    const start = startOfDay(START);
    const today = startOfDay(now);
    const ms = today.getTime() - start.getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    // Days elapsed since start (0 on April 11, 2026)
    let elapsed = Math.floor(ms / dayMs);
    if (elapsed < 0) {
      // Before start date — show countdown-style zeros
      return {
        elapsed: 0,
        inclusiveDay: 0,
        month: 0,
        dayInMonth: 0,
        beforeStart: true,
        startLabel: "Apr 11, 2026"
      };
    }
    // Inclusive day number (April 11 = Day 1)
    const inclusiveDay = elapsed + 1;
    // 30-day "months" from the start for Month X, Day Y
    const month = Math.floor(elapsed / 30) + 1;
    const dayInMonth = (elapsed % 30) + 1;
    return {
      elapsed,
      inclusiveDay,
      month,
      dayInMonth,
      beforeStart: false,
      startLabel: "Apr 11, 2026"
    };
  }

  function formatCompact(info) {
    info = info || getDayCount();
    if (info.beforeStart) return "Before Day 1";
    return info.elapsed + "d · M" + info.month + " D" + info.dayInMonth;
  }

  function formatLong(info) {
    info = info || getDayCount();
    if (info.beforeStart) return "Starts Apr 11, 2026";
    return (
      info.elapsed +
      " day" +
      (info.elapsed === 1 ? "" : "s") +
      " · Month " +
      info.month +
      ", Day " +
      info.dayInMonth
    );
  }

  function headerHtml() {
    const info = getDayCount();
    const compact = formatCompact(info);
    const full = formatLong(info);
    return `<div class="day-counter" title="${CL.escapeHtml(full)}" aria-label="${CL.escapeHtml(
      full
    )}"><span class="day-counter-main">${CL.escapeHtml(compact)}</span></div>`;
  }

  global.CL = global.CL || {};
  global.CL.daycount = {
    getDayCount,
    formatCompact,
    formatLong,
    headerHtml,
    START
  };
})(window);
