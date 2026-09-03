/* Day counter since April 11, 2026
   Months increment only on the 11th of each month (calendar months, not 30-day blocks).
   Apr 11 = M0 D0 · May 11 = M1 D0 · Aug 11 = M4 D0 · Sep 11 = M5 D0
   Between 11ths: months completed + days since the last 11th. */
(function (global) {
  // Local midnight of start date (Month is 0-indexed: 3 = April)
  const START = new Date(2026, 3, 11);
  const dayMs = 24 * 60 * 60 * 1000;

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function lastEleventh(today) {
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    if (d >= 11) return new Date(y, m, 11);
    return new Date(y, m - 1, 11);
  }

  function monthsBetween(from, to) {
    return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  }

  /**
   * Month number increases only on the 11th.
   * Days = whole days since the most recent 11th (0 on the 11th).
   */
  function getDayCount(now) {
    now = now || new Date();
    const start = startOfDay(START);
    const today = startOfDay(now);
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
    const last11 = lastEleventh(today);
    const months = Math.max(0, monthsBetween(start, last11));
    const days = Math.max(0, Math.round((today.getTime() - last11.getTime()) / dayMs));
    return {
      elapsed,
      months,
      days,
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

  const BREAK = new Date(2026, 11, 15); // Dec 15, 2026
  const LD_OVER = new Date(2027, 6, 1); // Jul 1, 2027

  function daysUntil(target, now) {
    now = now || new Date();
    const t = startOfDay(target);
    const today = startOfDay(now);
    return Math.round((t.getTime() - today.getTime()) / dayMs);
  }

  function formatCountdown(n) {
    if (n > 0) return n + "d";
    if (n === 0) return "today";
    return "done";
  }

  function getCountdowns(now) {
    now = now || new Date();
    const anniv = getDayCount(now);
    const breakDays = daysUntil(BREAK, now);
    const ldDays = daysUntil(LD_OVER, now);
    return {
      anniv,
      breakDays,
      ldDays,
      breakLabel: formatCountdown(breakDays),
      ldLabel: formatCountdown(ldDays)
    };
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
    getCountdowns,
    daysUntil,
    formatCountdown,
    START,
    BREAK,
    LD_OVER
  };
})(window);
