/* Day counter since April 11, 2026 */
(function (global) {
  // Local midnight of start date (Month is 0-indexed: 3 = April)
  const START = new Date(2026, 3, 11);
  const MONTH_LEN = 30;

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /**
   * elapsed = whole days since Apr 11 (0 on that day).
   * Month/Day = complete 30-day months + remaining days (not floor(elapsed/30)+1).
   * Example: 100 days → M3 D10; 101 days → M3 D11.
   */
  function getDayCount(now) {
    now = now || new Date();
    const start = startOfDay(START);
    const today = startOfDay(now);
    const dayMs = 24 * 60 * 60 * 1000;
    let elapsed = Math.round((today.getTime() - start.getTime()) / dayMs);
    if (elapsed < 0) {
      return {
        elapsed: 0,
        months: 0,
        days: 0,
        month: 0,
        dayInMonth: 0,
        beforeStart: true,
        startLabel: "Apr 11, 2026"
      };
    }
    const months = Math.floor(elapsed / MONTH_LEN);
    const days = elapsed % MONTH_LEN;
    return {
      elapsed,
      months,
      days,
      // aliases used by older callers
      month: months,
      dayInMonth: days,
      beforeStart: false,
      startLabel: "Apr 11, 2026"
    };
  }

  function formatCompact(info) {
    info = info || getDayCount();
    if (info.beforeStart) return "Before start";
    return info.elapsed + "d · M" + info.months + " D" + info.days;
  }

  function formatLong(info) {
    info = info || getDayCount();
    if (info.beforeStart) return "Starts Apr 11, 2026";
    return (
      info.elapsed +
      " day" +
      (info.elapsed === 1 ? "" : "s") +
      " · Month " +
      info.months +
      ", Day " +
      info.days
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
