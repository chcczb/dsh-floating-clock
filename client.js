window.__ModuleLoader__.load({
  id: '@local/floating-clock',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    const NS = 'floatingClock';
    const STORE_KEY = '@local/floating-clock:settings:v1';
    const SCHEDULE_KEY = '@local/floating-clock:schedules:v1';

    const DICTS = {
      en: {
        'clock.aria': 'Clock, click to open calendar',
        'action.settings': 'Settings',
        'action.back': 'Back to clock',
        'calendar.title': 'Calendar',
        'calendar.today': 'Today',
        'calendar.prev': 'Previous month',
        'calendar.next': 'Next month',
        'settings.title': 'Settings',
        'settings.size': 'Display size',
        'settings.sizeHint': 'Scales the clock and calendar proportionally',
        'settings.bgOpacity': 'Background opacity',
        'settings.bgOpacityHint': 'Applies to the calendar and schedule panel backgrounds',
        'settings.blink': 'Blinking colon',
        'settings.blinkHint': 'Blinks once per second',
        'settings.hour24': '24-hour format',
        'settings.hour24Hint': 'Show 14:30 instead of 02:30 PM',
        'settings.resetPosition': 'Reset position',
        'settings.resetPositionHint': 'Move the floating clock back to its default corner',
        'settings.reset': 'Reset',
        'schedule.title': 'Schedule',
        'schedule.add': 'Add entry',
        'schedule.time': 'Time',
        'schedule.content': 'Content',
        'schedule.save': 'Save',
        'schedule.delete': 'Delete',
        'schedule.close': 'Close',
        'schedule.empty': 'No entries yet',
        'schedule.countSuffix': 'entries',
        'alarm.title': 'Alarm',
        'alarm.lead': 'Alarm lead time',
        'alarm.leadHint': 'How long before the entry time the alarm appears, up to 30 minutes',
        'alarm.now': 'Now',
        'alarm.custom': 'Custom',
        'alarm.minutesShort': 'm',
        'alarm.minutesUnit': 'min',
        'alarm.clickToStop': 'Click to stop the bell',
        'alarm.missed': 'missed',
      },
      zh: {
        'clock.aria': '时钟，点击打开日历',
        'action.settings': '设置',
        'action.back': '返回时钟',
        'calendar.title': '日历',
        'calendar.today': '今天',
        'calendar.prev': '上个月',
        'calendar.next': '下个月',
        'settings.title': '设置',
        'settings.size': '显示大小',
        'settings.sizeHint': '时钟与日历内容等比缩放',
        'settings.bgOpacity': '背景透明度',
        'settings.bgOpacityHint': '作用于日历与日程弹窗的背景',
        'settings.blink': '冒号闪烁',
        'settings.blinkHint': '每 1 秒闪烁一次',
        'settings.hour24': '24 小时制',
        'settings.hour24Hint': '显示 14:30 而不是 02:30 PM',
        'settings.resetPosition': '重置位置',
        'settings.resetPositionHint': '将悬浮时钟移回默认位置',
        'settings.reset': '重置',
        'schedule.title': '日程',
        'schedule.add': '添加日程',
        'schedule.time': '时间',
        'schedule.content': '内容',
        'schedule.save': '保存',
        'schedule.delete': '删除',
        'schedule.close': '关闭',
        'schedule.empty': '暂无日程',
        'schedule.countSuffix': '条日程',
        'alarm.title': '闹钟',
        'alarm.lead': '提前提醒',
        'alarm.leadHint': '闹钟比日程时间提前多久出现，最多 30 分钟',
        'alarm.now': '立即',
        'alarm.custom': '自定义',
        'alarm.minutesShort': '分',
        'alarm.minutesUnit': '分钟',
        'alarm.clickToStop': '点击停止跳动',
        'alarm.missed': '条未点提醒',
      },
    };

    const DEFAULT_SETTINGS = { scale: 1, blink: true, h24: true, pos: null, bgOpacity: 1, alarm: { custom: false, lead: 0 } };

    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const pad2 = (n) => (n < 10 ? '0' + n : String(n));

    function normalizeSettings(input) {
      const parsed = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
      const next = Object.assign({}, DEFAULT_SETTINGS, parsed);
      next.scale = clamp(Number(next.scale) || 1, 0.6, 2);
      next.bgOpacity = clamp(Number(next.bgOpacity) || 1, 0.2, 1);
      next.blink = next.blink !== false;
      next.h24 = next.h24 !== false;
      if (next.pos && typeof next.pos !== 'object') next.pos = null;
      const al = next.alarm && typeof next.alarm === 'object' ? next.alarm : {};
      next.alarm = { custom: !!al.custom, lead: clamp(Math.round(Number(al.lead) || 0), 0, 30) };
      return next;
    }

    function loadSettings() {
      try {
        const raw = window.localStorage.getItem(STORE_KEY);
        if (!raw) return Object.assign({}, DEFAULT_SETTINGS);
        return normalizeSettings(JSON.parse(raw));
      } catch (e) {
        return Object.assign({}, DEFAULT_SETTINGS);
      }
    }

    function saveSettings(settings) {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(settings));
      } catch (e) { /* storage unavailable; settings stay in memory */ }
    }

    function normalizeSchedules(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
      const out = {};
      for (const k of Object.keys(input)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(input[k])) continue;
        const rows = [];
        for (const item of input[k]) {
          if (!item || typeof item !== 'object') continue;
          const time = typeof item.time === 'string' && /^\d{2}:\d{2}$/.test(item.time) ? item.time : null;
          const text = typeof item.text === 'string' ? item.text.slice(0, 200) : '';
          if (time && text) {
            const row = { id: typeof item.id === 'string' && item.id ? item.id : newId(), time: time, text: text };
            if (item.acked === true) row.acked = true;
            if (item.missed === true) row.missed = true;
            rows.push(row);
          }
        }
        if (rows.length) out[k] = rows;
      }
      return out;
    }

    function loadSchedules() {
      try {
        const raw = window.localStorage.getItem(SCHEDULE_KEY);
        if (!raw) return {};
        return normalizeSchedules(JSON.parse(raw));
      } catch (e) {
        return {};
      }
    }

    function saveSchedules(map) {
      try {
        window.localStorage.setItem(SCHEDULE_KEY, JSON.stringify(map));
      } catch (e) { /* storage unavailable; schedules stay in memory */ }
    }

    function dateKeyOf(c) {
      return c.y + '-' + pad2(c.m + 1) + '-' + pad2(c.d);
    }

    function byTime(a, b) {
      return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
    }

    function newId() {
      return 'fc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    }

    /* Pure time rule: any un-acked entry past its window (time + 5 min) is unread.
       Returns a new map when something changed, otherwise null. */
    function markMissedInMap(map, nowMs) {
      const nextMap = Object.assign({}, map);
      let changed = false;
      for (const key of Object.keys(map)) {
        const kp = key.split('-');
        const y = Number(kp[0]);
        const mo = Number(kp[1]);
        const da = Number(kp[2]);
        if (!y || !mo || !da) continue;
        const list = map[key];
        let listChanged = false;
        const nextList = list.map((row) => {
          if (row.missed || row.acked) return row;
          const tp = row.time.split(':');
          const endMs = new Date(y, mo - 1, da, Number(tp[0]) || 0, (Number(tp[1]) || 0) + 5).getTime();
          if (nowMs >= endMs) {
            listChanged = true;
            return Object.assign({}, row, { missed: true });
          }
          return row;
        });
        if (listChanged) {
          changed = true;
          nextMap[key] = nextList;
        }
      }
      return changed ? nextMap : null;
    }

    /* ---------- durable Host-side store (survives port/browser changes) ---------- */
    function storeUrl() {
      try {
        return new URL('plugins/floating-clock-store', document.baseURI).href;
      } catch (e) {
        return '/plugins/floating-clock-store';
      }
    }

    function hostLoad() {
      try {
        return fetch(storeUrl(), { method: 'GET', headers: { accept: 'application/json' } })
          .then((r) => (r.ok ? r.json() : null))
          .then((doc) => (doc && typeof doc === 'object' ? doc : null))
          .catch(() => null);
      } catch (e) {
        return Promise.resolve(null);
      }
    }

    function hostSave(doc) {
      try {
        fetch(storeUrl(), {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(doc),
          keepalive: true,
        }).catch(() => { /* host store unavailable; localStorage still holds the data */ });
      } catch (e) { /* transport unavailable */ }
    }

    function formatParts(date, h24) {
      let hh = date.getHours();
      let suffix = '';
      if (!h24) {
        suffix = hh < 12 ? 'AM' : 'PM';
        hh = hh % 12;
        if (hh === 0) hh = 12;
      }
      return { hh: pad2(hh), mm: pad2(date.getMinutes()), suffix };
    }

    function buildMonthGrid(year, month, weekStart) {
      const first = new Date(year, month, 1);
      const offset = (first.getDay() - weekStart + 7) % 7;
      const cells = [];
      for (let i = 0; i < 42; i++) {
        const d = new Date(year, month, 1 - offset + i);
        cells.push({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate() });
      }
      return cells;
    }

    function makeFmt(id, opts) {
      try {
        return new Intl.DateTimeFormat(id || undefined, opts);
      } catch (e) {
        try {
          return new Intl.DateTimeFormat(undefined, opts);
        } catch (e2) {
          return null;
        }
      }
    }

    function pickLocaleId(v) {
      if (!v) return null;
      if (typeof v === 'string') return v;
      if (typeof v === 'object') return v.id || v.tag || v.locale || v.language || null;
      return null;
    }

    function activeLocaleId(locale) {
      if (!locale) return null;
      try {
        const snap = locale.getSnapshot ? locale.getSnapshot() : (locale.getLocale ? locale.getLocale() : null);
        if (!snap) return null;
        return pickLocaleId(snap) || pickLocaleId(snap.active) || pickLocaleId(snap.activeLocale)
          || pickLocaleId(snap.current) || pickLocaleId(snap.locale);
      } catch (e) {
        return null;
      }
    }

    function weekStartFor(id, lang) {
      if (id && typeof id === 'string') {
        try {
          const wi = new Intl.Locale(id).weekInfo;
          const fd = wi && typeof wi.firstDay === 'number' ? wi.firstDay : null;
          if (fd) return fd % 7; /* CLDR: 1 = Monday .. 7 = Sunday */
        } catch (e) { /* fall through to heuristic */ }
      }
      return lang === 'zh' ? 1 : 0;
    }

    const CSS = [
      '@keyframes fc-blink { 0% { opacity: 1 } 50% { opacity: 0 } }',
      '@keyframes fc-bounce { 0%, 100% { transform: translateY(0) } 25% { transform: translateY(-18%) } 55% { transform: translateY(10%) } 80% { transform: translateY(-5%) } }',
      '.fc-root { position: fixed; z-index: 30; display: flex; flex-direction: column; align-items: flex-start; gap: calc(var(--fc-s) * 6px); }',
      '.fc-pill {',
      '  box-sizing: border-box; display: flex; align-items: center;',
      '  padding: calc(var(--fc-s) * 6px) calc(var(--fc-s) * 13px);',
      '  background: var(--dsw-alias-bg-overlay);',
      '  border: 1px solid var(--dsw-alias-border-l1);',
      '  border-radius: calc(var(--fc-s) * 10px);',
      '  box-shadow: 0 calc(var(--fc-s) * 3px) calc(var(--fc-s) * 12px) rgba(0, 0, 0, 0.18);',
      '  color: var(--dsw-alias-label-primary);',
      '  font-size: calc(var(--fc-s) * 22px); font-weight: 600; line-height: 1.15;',
      '  font-variant-numeric: tabular-nums; font-family: inherit;',
      '  cursor: pointer; user-select: none; touch-action: none;',
      '}',
      '.fc-pill:hover { border-color: var(--dsw-alias-border-l2); }',
      '.fc-colon { padding: 0 calc(var(--fc-s) * 1px); }',
      '.fc-colon-blink { animation: fc-blink 1s step-end infinite; }',
      '.fc-suffix {',
      '  font-size: calc(var(--fc-s) * 11px); font-weight: 500;',
      '  color: var(--dsw-alias-label-secondary); margin-left: calc(var(--fc-s) * 5px);',
      '}',
      '.fc-panel {',
      '  position: fixed; z-index: 31; box-sizing: border-box;',
      '  width: calc(var(--fc-s) * 312px); padding: calc(var(--fc-s) * 14px);',
      '  background: transparent;',
      '  border: 1px solid var(--dsw-alias-border-l1);',
      '  border-radius: calc(var(--fc-s) * 12px);',
      '  box-shadow: 0 calc(var(--fc-s) * 8px) calc(var(--fc-s) * 28px) rgba(0, 0, 0, 0.24);',
      '  color: var(--dsw-alias-label-primary); font-family: inherit;',
      '}',
      '.fc-panel::before, .fc-sched::before {',
      '  content: ""; position: absolute; inset: 0; z-index: -1; border-radius: inherit;',
      '  background: linear-gradient(var(--dsw-alias-bg-overlay), var(--dsw-alias-bg-overlay)), var(--dsw-alias-bg-base);',
      '  opacity: var(--fc-bgop, 1);',
      '  backdrop-filter: blur(calc(var(--fc-s) * 10px));',
      '}',
      '.fc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: calc(var(--fc-s) * 8px); }',
      '.fc-head-day { font-size: calc(var(--fc-s) * 18px); font-weight: 600; }',
      '.fc-head-dow { font-size: calc(var(--fc-s) * 12px); color: var(--dsw-alias-label-secondary); margin-top: calc(var(--fc-s) * 2px); }',
      '.fc-head-actions { display: flex; gap: calc(var(--fc-s) * 4px); flex: none; }',
      '.fc-icon-btn {',
      '  width: calc(var(--fc-s) * 28px); height: calc(var(--fc-s) * 28px);',
      '  display: flex; align-items: center; justify-content: center;',
      '  background: transparent; border: 1px solid transparent;',
      '  border-radius: calc(var(--fc-s) * 6px);',
      '  color: var(--dsw-alias-label-secondary); cursor: pointer; padding: 0;',
      '}',
      '.fc-icon-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
      '.fc-icon-btn.fc-active { color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-interactive-bg-hover); }',
      '.fc-nav { display: flex; align-items: center; gap: calc(var(--fc-s) * 4px); margin-top: calc(var(--fc-s) * 10px); }',
      '.fc-nav-title { font-size: calc(var(--fc-s) * 13.5px); font-weight: 600; padding: 0 calc(var(--fc-s) * 4px); }',
      '.fc-spacer { flex: 1; }',
      '.fc-today-btn {',
      '  font-size: calc(var(--fc-s) * 12px); padding: calc(var(--fc-s) * 4px) calc(var(--fc-s) * 10px);',
      '  border-radius: calc(var(--fc-s) * 6px); border: 1px solid var(--dsw-alias-border-l2);',
      '  background: transparent; color: var(--dsw-alias-label-primary); cursor: pointer; font-family: inherit;',
      '}',
      '.fc-today-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }',
      '.fc-grid { display: grid; grid-template-columns: repeat(7, 1fr); margin-top: calc(var(--fc-s) * 8px); }',
      '.fc-dow {',
      '  font-size: calc(var(--fc-s) * 11.5px); color: var(--dsw-alias-label-secondary);',
      '  text-align: center; height: calc(var(--fc-s) * 26px); line-height: calc(var(--fc-s) * 26px);',
      '}',
      '.fc-cell { display: flex; align-items: center; justify-content: center; height: calc(var(--fc-s) * 36px); }',
      '.fc-day {',
      '  width: calc(var(--fc-s) * 30px); height: calc(var(--fc-s) * 30px);',
      '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
      '  border-radius: 50%; border: 1px solid transparent; background: transparent;',
      '  font-size: calc(var(--fc-s) * 12.5px); color: inherit; cursor: pointer; padding: 0;',
      '  font-variant-numeric: tabular-nums; font-family: inherit;',
      '}',
      '.fc-day:hover { background: var(--dsw-alias-interactive-bg-hover); }',
      '.fc-day.fc-out { color: var(--dsw-alias-label-tertiary); }',
      '.fc-day.fc-sel { border-color: var(--dsw-alias-brand-primary); }',
      '.fc-day.fc-today { background: var(--dsw-alias-button-primary-fill); color: #fff; font-weight: 600; }',
      '.fc-day.fc-today:hover { background: var(--dsw-alias-button-primary-hover); }',
      '.fc-day-num { line-height: 1.15; }',
      '.fc-day-badge { display: flex; align-items: center; gap: calc(var(--fc-s) * 1.5px); height: calc(var(--fc-s) * 8px); margin-top: calc(var(--fc-s) * 0.5px); }',
      '.fc-day-dot { width: calc(var(--fc-s) * 4px); height: calc(var(--fc-s) * 4px); border-radius: 50%; background: var(--dsw-alias-state-success-primary); flex: none; }',
      '.fc-day-count { font-size: calc(var(--fc-s) * 7.5px); line-height: 1; color: inherit; opacity: 0.9; font-variant-numeric: tabular-nums; }',
      '.fc-set { margin-top: calc(var(--fc-s) * 10px); }',
      '.fc-set-row {',
      '  display: flex; align-items: center; justify-content: space-between;',
      '  gap: calc(var(--fc-s) * 12px); padding: calc(var(--fc-s) * 9px) calc(var(--fc-s) * 2px);',
      '}',
      '.fc-set-row + .fc-set-row { border-top: 1px solid var(--dsw-alias-border-l1); }',
      '.fc-set-text { flex: 1; min-width: 0; }',
      '.fc-set-label { font-size: calc(var(--fc-s) * 13px); font-weight: 500; }',
      '.fc-set-hint { font-size: calc(var(--fc-s) * 11px); color: var(--dsw-alias-label-secondary); margin-top: calc(var(--fc-s) * 2px); }',
      '.fc-set-inline { display: flex; align-items: center; gap: calc(var(--fc-s) * 8px); flex: none; }',
      '.fc-set-value {',
      '  font-size: calc(var(--fc-s) * 12px); color: var(--dsw-alias-label-secondary);',
      '  font-variant-numeric: tabular-nums; min-width: calc(var(--fc-s) * 38px); text-align: right;',
      '}',
      '.fc-range { width: calc(var(--fc-s) * 110px); accent-color: var(--dsw-alias-brand-primary); }',
      '.fc-switch {',
      '  position: relative; flex: none;',
      '  width: calc(var(--fc-s) * 40px); height: calc(var(--fc-s) * 20px);',
      '  border-radius: calc(var(--fc-s) * 10px);',
      '  background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l2);',
      '  cursor: pointer; padding: 0;',
      '}',
      '.fc-switch[aria-checked="true"] { background: var(--dsw-alias-button-primary-fill); border-color: transparent; }',
      '.fc-knob {',
      '  position: absolute; top: calc(var(--fc-s) * 2px); left: calc(var(--fc-s) * 2px);',
      '  width: calc(var(--fc-s) * 14px); height: calc(var(--fc-s) * 14px);',
      '  border-radius: 50%; background: var(--dsw-alias-label-secondary);',
      '  transition: left 0.15s ease, background 0.15s ease;',
      '}',
      '.fc-switch[aria-checked="true"] .fc-knob { left: calc(var(--fc-s) * 22px); background: #fff; }',
      '.fc-btn {',
      '  font-size: calc(var(--fc-s) * 12px); padding: calc(var(--fc-s) * 5px) calc(var(--fc-s) * 12px);',
      '  border-radius: calc(var(--fc-s) * 6px); border: 1px solid var(--dsw-alias-border-l2);',
      '  background: transparent; color: var(--dsw-alias-label-primary); cursor: pointer; font-family: inherit;',
      '}',
      '.fc-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }',
      '.fc-sched {',
      '  position: fixed; z-index: 32; box-sizing: border-box;',
      '  width: calc(var(--fc-s) * 252px); padding: calc(var(--fc-s) * 10px);',
      '  background: transparent;',
      '  border: 1px solid var(--dsw-alias-border-l1);',
      '  border-radius: calc(var(--fc-s) * 10px);',
      '  box-shadow: 0 calc(var(--fc-s) * 8px) calc(var(--fc-s) * 24px) rgba(0, 0, 0, 0.26);',
      '  color: var(--dsw-alias-label-primary); font-family: inherit;',
      '}',
      '.fc-sched-head { display: flex; align-items: center; justify-content: space-between; gap: calc(var(--fc-s) * 6px); font-size: calc(var(--fc-s) * 12.5px); font-weight: 600; margin-bottom: calc(var(--fc-s) * 6px); }',
      '.fc-sched-list { display: flex; flex-direction: column; gap: calc(var(--fc-s) * 2px); max-height: calc(var(--fc-s) * 220px); overflow-y: auto; }',
      '.fc-sched-row { display: flex; align-items: center; gap: calc(var(--fc-s) * 6px); padding: calc(var(--fc-s) * 3px) calc(var(--fc-s) * 4px); border-radius: calc(var(--fc-s) * 6px); font-size: calc(var(--fc-s) * 12px); }',
      '.fc-sched-row:hover { background: var(--dsw-alias-interactive-bg-hover); }',
      '.fc-sched-time { font-variant-numeric: tabular-nums; font-weight: 600; flex: none; }',
      '.fc-sched-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.fc-sched-empty { font-size: calc(var(--fc-s) * 11.5px); color: var(--dsw-alias-label-secondary); padding: calc(var(--fc-s) * 4px); }',
      '.fc-sched-add { display: flex; align-items: center; gap: calc(var(--fc-s) * 5px); padding: calc(var(--fc-s) * 4px) calc(var(--fc-s) * 2px); }',
      '.fc-sched-footer { display: flex; padding: calc(var(--fc-s) * 4px) calc(var(--fc-s) * 2px) 0; }',
      '.fc-sched-time-input, .fc-sched-text-input {',
      '  font-size: calc(var(--fc-s) * 11.5px); font-family: inherit; box-sizing: border-box;',
      '  padding: calc(var(--fc-s) * 3px) calc(var(--fc-s) * 4px);',
      '  border: 1px solid var(--dsw-alias-border-l2); border-radius: calc(var(--fc-s) * 5px);',
      '  background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary);',
      '}',
      '.fc-sched-time-input { width: calc(var(--fc-s) * 78px); flex: none; }',
      '.fc-sched-text-input { flex: 1; min-width: 0; }',
      '.fc-mini-btn {',
      '  flex: none; width: calc(var(--fc-s) * 20px); height: calc(var(--fc-s) * 20px);',
      '  display: flex; align-items: center; justify-content: center;',
      '  border-radius: calc(var(--fc-s) * 5px); border: 1px solid transparent;',
      '  background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; padding: 0;',
      '}',
      '.fc-mini-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-state-error-primary); }',
      '.fc-mini-btn.fc-confirm:hover { color: var(--dsw-alias-state-success-primary); }',
      '.fc-mini-btn.fc-plain:hover { color: var(--dsw-alias-label-primary); }',
      '.fc-mini-btn:disabled { opacity: 0.4; cursor: default; }',
      '.fc-mini-btn:disabled:hover { background: transparent; color: var(--dsw-alias-label-secondary); }',
      '.fc-alarms { display: flex; flex-direction: column; gap: calc(var(--fc-s) * 4px); }',
      '.fc-alarm {',
      '  display: flex; align-items: center; gap: calc(var(--fc-s) * 6px);',
      '  max-width: calc(var(--fc-s) * 280px);',
      '  padding: calc(var(--fc-s) * 5px) calc(var(--fc-s) * 10px);',
      '  background: var(--dsw-alias-bg-overlay);',
      '  border: 1px solid var(--dsw-alias-state-warn-primary);',
      '  border-radius: calc(var(--fc-s) * 9px);',
      '  box-shadow: 0 calc(var(--fc-s) * 3px) calc(var(--fc-s) * 10px) rgba(0, 0, 0, 0.18);',
      '  font-size: calc(var(--fc-s) * 12.5px); color: var(--dsw-alias-label-primary); font-family: inherit;',
      '  cursor: pointer; user-select: none;',
      '}',
      '.fc-alarm.fc-done { border-color: var(--dsw-alias-state-success-primary); cursor: default; }',
      '.fc-alarm-icon { display: inline-flex; flex: none; color: var(--dsw-alias-state-warn-primary); }',
      '.fc-alarm-icon.fc-ring { animation: fc-bounce 0.7s ease-in-out infinite; }',
      '.fc-alarm.fc-done .fc-alarm-icon { color: var(--dsw-alias-state-success-primary); }',
      '.fc-alarm-time { font-weight: 600; font-variant-numeric: tabular-nums; flex: none; }',
      '.fc-alarm-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.fc-set-col { flex-direction: column; align-items: stretch; gap: calc(var(--fc-s) * 6px); }',
      '.fc-chips { display: flex; flex-wrap: wrap; align-items: center; gap: calc(var(--fc-s) * 4px); }',
      '.fc-chip {',
      '  font-size: calc(var(--fc-s) * 11px); font-family: inherit;',
      '  padding: calc(var(--fc-s) * 3px) calc(var(--fc-s) * 9px);',
      '  border-radius: calc(var(--fc-s) * 999px);',
      '  border: 1px solid var(--dsw-alias-border-l2);',
      '  background: transparent; color: var(--dsw-alias-label-primary); cursor: pointer;',
      '}',
      '.fc-chip:hover { background: var(--dsw-alias-interactive-bg-hover); }',
      '.fc-chip.fc-chip-on { background: var(--dsw-alias-button-primary-fill); border-color: transparent; color: #fff; }',
      '.fc-num-input {',
      '  width: calc(var(--fc-s) * 52px); box-sizing: border-box; font-family: inherit;',
      '  font-size: calc(var(--fc-s) * 11.5px); padding: calc(var(--fc-s) * 3px) calc(var(--fc-s) * 4px);',
      '  border: 1px solid var(--dsw-alias-border-l2); border-radius: calc(var(--fc-s) * 5px);',
      '  background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary);',
      '}',
      '.fc-set-unit { font-size: calc(var(--fc-s) * 11px); color: var(--dsw-alias-label-secondary); }',
      '.fc-day-dot-red { background: var(--dsw-alias-state-error-primary); }',
      '.fc-sched-missed { width: calc(var(--fc-s) * 6px); height: calc(var(--fc-s) * 6px); border-radius: 50%; background: var(--dsw-alias-state-error-primary); flex: none; }',
      '.fc-pill:focus-visible, .fc-icon-btn:focus-visible, .fc-day:focus-visible,',
      '.fc-today-btn:focus-visible, .fc-btn:focus-visible, .fc-switch:focus-visible,',
      '.fc-mini-btn:focus-visible, .fc-sched-time-input:focus-visible, .fc-sched-text-input:focus-visible,',
      '.fc-chip:focus-visible, .fc-num-input:focus-visible, .fc-alarm:focus-visible {',
      '  outline: 2px solid var(--dsw-focus-ring-color); outline-offset: 1px;',
      '}',
    ].join('\n');

    function gearIcon(sz) {
      const teeth = [];
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        teeth.push(h('line', {
          key: 'fc-tooth-' + i,
          x1: 12 + 6.2 * Math.cos(a), y1: 12 + 6.2 * Math.sin(a),
          x2: 12 + 9.2 * Math.cos(a), y2: 12 + 9.2 * Math.sin(a),
        }));
      }
      return h('svg', {
        width: sz, height: sz, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.7, strokeLinecap: 'round', 'aria-hidden': true,
      }, [h('circle', { key: 'fc-gear-hub', cx: 12, cy: 12, r: 3 }),
          h('circle', { key: 'fc-gear-body', cx: 12, cy: 12, r: 6.2 })].concat(teeth));
    }

    function backIcon(sz) {
      return h('svg', {
        width: sz, height: sz, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
      }, h('path', { d: 'M20 12H4M10 18l-6-6 6-6' }));
    }

    function chevronIcon(sz, dir) {
      return h('svg', {
        width: sz, height: sz, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
      }, h('path', { d: dir === 'left' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7' }));
    }

    function checkIcon(sz) {
      return h('svg', {
        width: sz, height: sz, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
      }, h('path', { d: 'M4 12.5l5 5L20 6.5' }));
    }

    function plusIcon(sz) {
      return h('svg', {
        width: sz, height: sz, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true,
      }, h('path', { d: 'M12 5v14M5 12h14' }));
    }

    function minusIcon(sz) {
      return h('svg', {
        width: sz, height: sz, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true,
      }, h('path', { d: 'M5 12h14' }));
    }

    function closeIcon(sz) {
      return h('svg', {
        width: sz, height: sz, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true,
      }, h('path', { d: 'M6 6l12 12M18 6L6 18' }));
    }

    function alarmIcon(sz) {
      return h('svg', {
        width: sz, height: sz, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
      },
        h('circle', { cx: 12, cy: 13, r: 7.5 }),
        h('path', { d: 'M12 9.5V13l2.4 1.8' }),
        h('path', { d: 'M5.2 5L2.6 7.2' }),
        h('path', { d: 'M18.8 5l2.6 2.2' }),
        h('path', { d: 'M7.2 19.9L5.8 21.5' }),
        h('path', { d: 'M16.8 19.9l1.4 1.6' }));
    }

    function FloatingClock(props) {
      const ctx = props.ctx;

      /* ---------- settings (persisted in localStorage) ---------- */
      const [settings, setSettings] = useState(loadSettings);
      const settingsRef = useRef(settings);
      const updateSettings = useCallback((patch) => {
        const next = Object.assign({}, settingsRef.current, patch);
        settingsRef.current = next;
        saveSettings(next);
        setSettings(next);
        pushToHost();
      }, []);
      const scale = clamp(Number(settings.scale) || 1, 0.6, 2);
      const blink = settings.blink !== false;
      const h24 = settings.h24 !== false;
      const alarmLead = clamp(Math.round(Number(settings.alarm && settings.alarm.lead) || 0), 0, 30);
      const alarmCustom = !!(settings.alarm && settings.alarm.custom);
      const bgOpacity = clamp(Number(settings.bgOpacity) || 1, 0.2, 1);
      const bgOpVar = String(bgOpacity);

      /* ---------- locale ---------- */
      const locale = useMemo(() => {
        try {
          return ctx && typeof ctx.get === 'function' ? ctx.get('locale') : undefined;
        } catch (e) {
          return undefined;
        }
      }, [ctx]);
      const [locRev, setLocRev] = useState(0);
      const tRef = useRef(null);
      useEffect(() => {
        if (!locale) return undefined;
        const disposers = [];
        try {
          const d = locale.register(NS, { en: DICTS.en, zh: DICTS.zh });
          if (typeof d === 'function') disposers.push(d);
        } catch (e) { /* keep local fallback dictionaries */ }
        try {
          tRef.current = locale.bind(NS);
        } catch (e) {
          tRef.current = null;
        }
        let unsub = null;
        try {
          unsub = locale.subscribe(() => setLocRev((v) => v + 1));
        } catch (e) { /* no live updates without subscribe */ }
        setLocRev((v) => v + 1);
        return () => {
          tRef.current = null;
          try { if (unsub) unsub(); } catch (e) { /* already disposed */ }
          for (const d of disposers) {
            try { d(); } catch (e) { /* already disposed */ }
          }
        };
      }, [locale]);

      const rawLocaleId = useMemo(() => activeLocaleId(locale), [locale, locRev]);
      const lang = String(rawLocaleId || '').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
      const t = useCallback((key) => {
        let v = null;
        try {
          if (tRef.current) v = tRef.current(key);
        } catch (e) { /* fall through */ }
        if (typeof v === 'string' && v && v !== key) return v;
        const dict = lang === 'zh' ? DICTS.zh : DICTS.en;
        return dict[key] || key;
      }, [lang, locRev]);

      const intlId = typeof rawLocaleId === 'string' && rawLocaleId ? rawLocaleId : (lang === 'zh' ? 'zh-CN' : 'en-US');
      const weekStart = useMemo(() => weekStartFor(rawLocaleId, lang), [rawLocaleId, lang]);
      const fmtMonthTitle = useMemo(() => makeFmt(intlId, { year: 'numeric', month: 'long' }), [intlId]);
      const fmtHeadDay = useMemo(() => makeFmt(intlId, { year: 'numeric', month: 'long', day: 'numeric' }), [intlId]);
      const fmtHeadDow = useMemo(() => makeFmt(intlId, { weekday: 'long' }), [intlId]);
      const fmtFullDate = useMemo(() => makeFmt(intlId, { year: 'numeric', month: 'long', day: 'numeric' }), [intlId]);
      const fmtDowNarrow = useMemo(() => makeFmt(intlId, { weekday: 'narrow' }), [intlId]);

      /* ---------- clock tick, aligned to second boundaries ---------- */
      const [now, setNow] = useState(() => new Date());
      useEffect(() => {
        let cancelled = false;
        let timer = 0;
        const tick = () => {
          if (cancelled) return;
          setNow(new Date());
          timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 4);
        };
        timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 4);
        return () => {
          cancelled = true;
          if (timer) window.clearTimeout(timer);
        };
      }, []);
      const blinkDelay = useRef('-' + (Date.now() % 1000) + 'ms').current;
      const parts = formatParts(now, h24);

      /* ---------- view state ---------- */
      const [open, setOpen] = useState(false);
      const [tab, setTab] = useState('calendar');
      const [cursor, setCursor] = useState(() => {
        const d = new Date();
        return { y: d.getFullYear(), m: d.getMonth() };
      });
      const [selected, setSelected] = useState(() => {
        const d = new Date();
        return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
      });

      /* ---------- per-day schedules (persisted in localStorage) ---------- */
      const [schedMap, setSchedMap] = useState(loadSchedules);
      const schedMapRef = useRef(schedMap);
      const updateSched = useCallback((key, fn) => {
        const list = fn(schedMapRef.current[key] || []);
        const next = Object.assign({}, schedMapRef.current);
        if (!list || list.length === 0) delete next[key];
        else next[key] = list;
        schedMapRef.current = next;
        saveSchedules(next);
        setSchedMap(next);
        pushToHost();
      }, []);

      /* ---------- Host store sync: debounced push, flush on hide/unmount, initial load ---------- */
      const hostPushTimer = useRef(0);
      const pushToHost = useCallback(() => {
        if (hostPushTimer.current) window.clearTimeout(hostPushTimer.current);
        hostPushTimer.current = window.setTimeout(() => {
          hostPushTimer.current = 0;
          hostSave({ version: 1, settings: settingsRef.current, schedules: schedMapRef.current });
        }, 300);
      }, []);

      useEffect(() => {
        const flush = () => {
          /* closing Harness: back-fill overdue unreads and force-flush to the Host store */
          const mm = markMissedInMap(schedMapRef.current, Date.now());
          if (mm) {
            schedMapRef.current = mm;
            saveSchedules(mm);
          }
          if (hostPushTimer.current) {
            window.clearTimeout(hostPushTimer.current);
            hostPushTimer.current = 0;
          }
          hostSave({ version: 1, settings: settingsRef.current, schedules: schedMapRef.current });
        };
        window.addEventListener('pagehide', flush);
        return () => {
          window.removeEventListener('pagehide', flush);
          flush();
        };
      }, []);

      useEffect(() => {
        let cancelled = false;
        hostLoad().then((doc) => {
          if (cancelled) return;
          const hostSettings = doc ? doc.settings : null;
          const hostSchedules = doc ? doc.schedules : null;
          if (hostSettings || hostSchedules) {
            if (hostSettings) {
              const s = normalizeSettings(hostSettings);
              settingsRef.current = s;
              saveSettings(s);
              setSettings(s);
            }
            if (hostSchedules) {
              const m = normalizeSchedules(hostSchedules);
              schedMapRef.current = m;
              saveSchedules(m);
              setSchedMap(m);
            }
          } else {
            let hasLocal = false;
            try {
              hasLocal = !!(window.localStorage.getItem(STORE_KEY) || window.localStorage.getItem(SCHEDULE_KEY));
            } catch (e) {
              hasLocal = false;
            }
            if (hasLocal) hostSave({ version: 1, settings: settingsRef.current, schedules: schedMapRef.current });
          }
          const mm = markMissedInMap(schedMapRef.current, Date.now());
          if (mm) {
            schedMapRef.current = mm;
            saveSchedules(mm);
            setSchedMap(mm);
            hostSave({ version: 1, settings: settingsRef.current, schedules: mm });
          }
        });
        return () => { cancelled = true; };
      }, []);
      const [schedView, setSchedView] = useState(null);
      const [draft, setDraft] = useState(null);
      const schedPopRef = useRef(null);

      /* ---------- window size ---------- */
      const [winSize, setWinSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
      useEffect(() => {
        const onResize = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      /* ---------- position (draggable, persisted) ---------- */
      const [dragPos, setDragPos] = useState(null);
      const pillRef = useRef(null);
      const panelRef = useRef(null);
      const dragRef = useRef(null);

      const defaultPos = useMemo(() => ({
        x: Math.max(8, winSize.w - Math.round(110 * scale) - 20),
        y: Math.max(8, Math.round(winSize.h * 0.16)),
      }), [winSize, scale]);

      const rawPos = dragPos || (settings.pos && typeof settings.pos.x === 'number' ? settings.pos : null) || defaultPos;
      const effPos = {
        x: clamp(rawPos.x, 4, Math.max(4, winSize.w - 60)),
        y: clamp(rawPos.y, 4, Math.max(4, winSize.h - 34)),
      };

      const openPanel = useCallback(() => {
        const d = new Date();
        setCursor({ y: d.getFullYear(), m: d.getMonth() });
        setSelected({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate() });
        setTab('calendar');
        setOpen(true);
      }, []);

      const openRef = useRef(open);
      useEffect(() => {
        openRef.current = open;
      }, [open]);
      const toggleOpen = useCallback(() => {
        if (openRef.current) setOpen(false);
        else openPanel();
      }, [openPanel]);

      const handlePointerDown = useCallback((e) => {
        if (e.button !== undefined && e.button !== 0) return;
        const el = pillRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        dragRef.current = {
          id: e.pointerId, sx: e.clientX, sy: e.clientY,
          ox: rect.left, oy: rect.top, w: rect.width, h: rect.height,
          moved: false, x: rect.left, y: rect.top,
        };
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* capture unsupported */ }
      }, []);

      const handlePointerMove = useCallback((e) => {
        const d = dragRef.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.sx;
        const dy = e.clientY - d.sy;
        if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
        if (!d.moved) {
          d.moved = true;
          setOpen(false); /* close the panel while dragging */
        }
        d.x = clamp(d.ox + dx, 4, Math.max(4, window.innerWidth - d.w - 4));
        d.y = clamp(d.oy + dy, 4, Math.max(4, window.innerHeight - d.h - 4));
        setDragPos({ x: d.x, y: d.y });
      }, []);

      const handlePointerUp = useCallback((e) => {
        const d = dragRef.current;
        if (!d || d.id !== e.pointerId) return;
        dragRef.current = null;
        try {
          if (pillRef.current) pillRef.current.releasePointerCapture(e.pointerId);
        } catch (err) { /* already released */ }
        if (d.moved) {
          updateSettings({ pos: { x: d.x, y: d.y } });
          setDragPos(null);
        } else {
          toggleOpen();
        }
      }, [toggleOpen, updateSettings]);

      /* ---------- panel placement near the pill ---------- */
      const [panelPos, setPanelPos] = useState(null);
      useEffect(() => {
        if (!open) {
          setPanelPos(null);
          return undefined;
        }
        const compute = () => {
          const el = pillRef.current;
          const rect = el ? el.getBoundingClientRect() : {
            left: effPos.x, top: effPos.y,
            right: effPos.x + 100 * scale, bottom: effPos.y + 38 * scale,
          };
          const margin = 8;
          const estH = (tab === 'settings' ? 420 : 400) * scale;
          const style = {};
          const centerRight = (rect.left + rect.right) / 2 > window.innerWidth / 2;
          if (centerRight) style.right = Math.max(margin, Math.round(window.innerWidth - rect.right)) + 'px';
          else style.left = Math.max(margin, Math.round(rect.left)) + 'px';
          const belowSpace = window.innerHeight - rect.bottom;
          if (belowSpace < estH && rect.top > belowSpace) {
            style.bottom = Math.round(window.innerHeight - rect.top + margin) + 'px';
          } else {
            style.top = Math.round(rect.bottom + margin) + 'px';
          }
          setPanelPos(style);
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
      }, [open, tab, scale, effPos.x, effPos.y]);

      /* ---------- close on outside click / Escape ---------- */
      useEffect(() => {
        if (!open) {
          setSchedView(null);
          return undefined;
        }
        const onDown = (e) => {
          const pop = schedPopRef.current;
          const panel = panelRef.current;
          const pill = pillRef.current;
          const inPop = pop && pop.contains(e.target);
          const inPanel = panel && panel.contains(e.target);
          const inPill = pill && pill.contains(e.target);
          const inRoot = !!(e.target.closest && e.target.closest('.fc-root'));
          if (schedView && !inPop) setSchedView(null);
          if (!inPanel && !inPill && !inPop && !inRoot) setOpen(false);
        };
        const onKey = (e) => {
          if (e.key !== 'Escape') return;
          if (schedView) setSchedView(null);
          else setOpen(false);
        };
        document.addEventListener('pointerdown', onDown, true);
        document.addEventListener('keydown', onKey);
        return () => {
          document.removeEventListener('pointerdown', onDown, true);
          document.removeEventListener('keydown', onKey);
        };
      }, [open, schedView]);

      /* ---------- expire un-acked reminders into red missed dots ----------
         Pure time rule evaluated on every tick over every stored date, so
         windows that elapsed while the Host or the page was offline are
         back-filled on the first tick after startup. */
      useEffect(() => {
        const nextMap = markMissedInMap(schedMapRef.current, now.getTime());
        if (nextMap) {
          schedMapRef.current = nextMap;
          saveSchedules(nextMap);
          setSchedMap(nextMap);
          pushToHost();
        }
      }, [now, pushToHost]);

      /* ---------- calendar helpers ---------- */
      const cells = useMemo(() => buildMonthGrid(cursor.y, cursor.m, weekStart), [cursor.y, cursor.m, weekStart]);

      const dowLabels = useMemo(() => {
        const fallbackChars = lang === 'zh' ? ['日', '一', '二', '三', '四', '五', '六'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const out = [];
        for (let i = 0; i < 7; i++) {
          const dow = (weekStart + i) % 7;
          let label = null;
          if (fmtDowNarrow) {
            try {
              label = fmtDowNarrow.format(new Date(2024, 0, 7 + dow)); /* 2024-01-07 is a Sunday */
            } catch (e) {
              label = null;
            }
          }
          out.push(label || fallbackChars[dow]);
        }
        return out;
      }, [weekStart, fmtDowNarrow, lang]);

      const shiftMonth = useCallback((delta) => {
        setCursor((c) => {
          const d = new Date(c.y, c.m + delta, 1);
          return { y: d.getFullYear(), m: d.getMonth() };
        });
      }, []);

      const goToday = useCallback(() => {
        const d = new Date();
        setCursor({ y: d.getFullYear(), m: d.getMonth() });
        setSelected({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate() });
      }, []);

      const pickDay = useCallback((c) => {
        setSelected({ y: c.y, m: c.m, d: c.d });
        setCursor((cur) => (c.y !== cur.y || c.m !== cur.m ? { y: c.y, m: c.m } : cur));
      }, []);

      const openScheduleFor = useCallback((e, c, mode) => {
        if (e && e.preventDefault) e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const key = dateKeyOf(c);
        const rows = (schedMapRef.current[key] || []).length;
        const w = 252 * scale;
        const estH = Math.min(300, 96 + rows * 30) * scale;
        let left = rect.right + 6;
        if (left + w > window.innerWidth - 8) left = rect.left - w - 6;
        left = clamp(left, 8, Math.max(8, window.innerWidth - w - 8));
        let top = rect.bottom + 6;
        if (top + estH > window.innerHeight - 8) top = Math.max(8, rect.top - estH - 6);
        const label = fmtFullDate ? fmtFullDate.format(new Date(c.y, c.m, c.d)) : key;
        setDraft(null);
        setSchedView({ key: key, label: label, mode: mode, style: { left: Math.round(left) + 'px', top: Math.round(top) + 'px' } });
      }, [scale, fmtFullDate]);

      const commitDraft = useCallback(() => {
        if (!draft || !schedView) return;
        const time = draft.time || '';
        const text = (draft.text || '').trim();
        if (!/^\d{2}:\d{2}$/.test(time) || !text) return;
        const key = schedView.key;
        updateSched(key, (list) => list.concat([{ id: newId(), time: time, text: text }]));
        setDraft(null);
      }, [draft, schedView, updateSched]);

      const ackAlarm = useCallback((row) => {
        if (row.acked) return;
        const d = new Date();
        const key = dateKeyOf({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate() });
        updateSched(key, (l) => l.map((x) => (x.id === row.id ? Object.assign({}, x, { acked: true }) : x)));
      }, [updateSched]);

      /* ---------- derived display strings ---------- */
      const todayY = now.getFullYear();
      const todayM = now.getMonth();
      const todayD = now.getDate();

      const headDayText = fmtHeadDay ? fmtHeadDay.format(now) : todayY + '-' + pad2(todayM + 1) + '-' + pad2(todayD);
      const headDowText = fmtHeadDow
        ? fmtHeadDow.format(now)
        : (lang === 'zh' ? ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()]
          : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]);
      const monthTitleText = fmtMonthTitle
        ? fmtMonthTitle.format(new Date(cursor.y, cursor.m, 1))
        : cursor.y + '/' + pad2(cursor.m + 1);

      const isz = Math.max(12, Math.round(15 * scale));
      const csz = Math.max(11, Math.round(14 * scale));

      /* ---------- active alarm reminders (today, within lead..+5min window) ---------- */
      const todayKey = dateKeyOf({ y: todayY, m: todayM, d: todayD });
      const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const activeReminders = (schedMap[todayKey] || []).filter((row) => {
        const p = row.time.split(':');
        const schedSec = (Number(p[0]) || 0) * 3600 + (Number(p[1]) || 0) * 60;
        return nowSec >= schedSec - alarmLead * 60 && nowSec < schedSec + 300;
      }).sort(byTime);

      /* ---------- settings view ---------- */
      const switchRow = (label, hint, checked, onChange) => h('div', { className: 'fc-set-row' },
        h('div', { className: 'fc-set-text' },
          h('div', { className: 'fc-set-label' }, label),
          hint ? h('div', { className: 'fc-set-hint' }, hint) : null),
        h('button', {
          type: 'button', role: 'switch', 'aria-checked': checked ? 'true' : 'false',
          'aria-label': label, className: 'fc-switch', onClick: () => onChange(!checked),
        }, h('span', { className: 'fc-knob' })));

      const settingsBody = h('div', { className: 'fc-set' },
        h('div', { className: 'fc-set-row' },
          h('div', { className: 'fc-set-text' },
            h('div', { className: 'fc-set-label' }, t('settings.size')),
            h('div', { className: 'fc-set-hint' }, t('settings.sizeHint'))),
          h('div', { className: 'fc-set-inline' },
            h('input', {
              className: 'fc-range', type: 'range', min: 60, max: 200, step: 5,
              value: Math.round(scale * 100), 'aria-label': t('settings.size'),
              onChange: (e) => updateSettings({ scale: clamp(Number(e.target.value) / 100 || 1, 0.6, 2) }),
            }),
            h('span', { className: 'fc-set-value' }, Math.round(scale * 100) + '%'))),
        h('div', { className: 'fc-set-row' },
          h('div', { className: 'fc-set-text' },
            h('div', { className: 'fc-set-label' }, t('settings.bgOpacity')),
            h('div', { className: 'fc-set-hint' }, t('settings.bgOpacityHint'))),
          h('div', { className: 'fc-set-inline' },
            h('input', {
              className: 'fc-range', type: 'range', min: 20, max: 100, step: 5,
              value: Math.round(bgOpacity * 100), 'aria-label': t('settings.bgOpacity'),
              onChange: (e) => updateSettings({ bgOpacity: clamp(Number(e.target.value) / 100 || 1, 0.2, 1) }),
            }),
            h('span', { className: 'fc-set-value' }, Math.round(bgOpacity * 100) + '%'))),
        switchRow(t('settings.blink'), t('settings.blinkHint'), blink, (v) => updateSettings({ blink: v })),
        switchRow(t('settings.hour24'), t('settings.hour24Hint'), h24, (v) => updateSettings({ h24: v })),
        h('div', { className: 'fc-set-row fc-set-col' },
          h('div', { className: 'fc-set-text' },
            h('div', { className: 'fc-set-label' }, t('alarm.lead')),
            h('div', { className: 'fc-set-hint' }, t('alarm.leadHint'))),
          h('div', { className: 'fc-chips' },
            [0, 1, 5, 10].map((v) => h('button', {
              type: 'button', key: 'fc-lead-' + v,
              className: 'fc-chip' + (!alarmCustom && alarmLead === v ? ' fc-chip-on' : ''),
              onClick: () => updateSettings({ alarm: { custom: false, lead: v } }),
            }, v === 0 ? t('alarm.now') : v + t('alarm.minutesShort'))),
            h('button', {
              type: 'button', className: 'fc-chip' + (alarmCustom ? ' fc-chip-on' : ''),
              onClick: () => updateSettings({ alarm: { custom: true, lead: clamp(alarmLead || 5, 1, 30) } }),
            }, t('alarm.custom')),
            alarmCustom ? h('span', { className: 'fc-set-inline' },
              h('input', {
                className: 'fc-num-input', type: 'number', min: 1, max: 30, step: 1,
                value: alarmLead, 'aria-label': t('alarm.custom'),
                onChange: (e) => updateSettings({ alarm: { custom: true, lead: clamp(Math.round(Number(e.target.value) || 0), 1, 30) } }),
              }),
              h('span', { className: 'fc-set-unit' }, t('alarm.minutesUnit'))) : null)),
        h('div', { className: 'fc-set-row' },
          h('div', { className: 'fc-set-text' },
            h('div', { className: 'fc-set-label' }, t('settings.resetPosition')),
            h('div', { className: 'fc-set-hint' }, t('settings.resetPositionHint'))),
          h('button', {
            type: 'button', className: 'fc-btn',
            onClick: () => updateSettings({ pos: null }),
          }, t('settings.reset'))));

      /* ---------- calendar view ---------- */
      const calendarBody = h('div', null,
        h('div', { className: 'fc-nav' },
          h('button', {
            type: 'button', className: 'fc-icon-btn', 'aria-label': t('calendar.prev'),
            title: t('calendar.prev'), onClick: () => shiftMonth(-1),
          }, chevronIcon(csz, 'left')),
          h('span', { className: 'fc-nav-title' }, monthTitleText),
          h('button', {
            type: 'button', className: 'fc-icon-btn', 'aria-label': t('calendar.next'),
            title: t('calendar.next'), onClick: () => shiftMonth(1),
          }, chevronIcon(csz, 'right')),
          h('span', { className: 'fc-spacer' }),
          h('button', { type: 'button', className: 'fc-today-btn', onClick: goToday }, t('calendar.today'))),
        h('div', { className: 'fc-grid' }, dowLabels.map((label, i) => h('div', { className: 'fc-dow', key: 'fc-dow-' + i }, label))),
        h('div', { className: 'fc-grid' }, cells.map((c) => {
          const isOut = c.m !== cursor.m;
          const isToday = c.y === todayY && c.m === todayM && c.d === todayD;
          const isSel = c.y === selected.y && c.m === selected.m && c.d === selected.d;
          const cls = 'fc-day' + (isOut ? ' fc-out' : '') + (isToday ? ' fc-today' : '') + (isSel ? ' fc-sel' : '');
          const cellDate = new Date(c.y, c.m, c.d);
          const mList = schedMap[dateKeyOf(c)] || [];
          const cnt = mList.length;
          const missedCnt = mList.filter((r) => r.missed && !r.acked).length;
          const activeCnt = cnt - missedCnt;
          const aria = (fmtFullDate ? fmtFullDate.format(cellDate) : c.y + '-' + pad2(c.m + 1) + '-' + pad2(c.d))
            + (cnt > 0 ? ', ' + cnt + ' ' + t('schedule.countSuffix') : '')
            + (missedCnt > 0 ? ', ' + missedCnt + ' ' + t('alarm.missed') : '');
          return h('div', { className: 'fc-cell', key: 'fc-c-' + c.y + '-' + c.m + '-' + c.d },
            h('button', {
              type: 'button', className: cls, 'aria-label': aria,
              onClick: (e) => { pickDay(c); openScheduleFor(e, c, 'view'); },
              onContextMenu: (e) => openScheduleFor(e, c, 'edit'),
            },
              h('span', { className: 'fc-day-num' }, c.d),
              cnt > 0 ? h('span', { className: 'fc-day-badge' },
                activeCnt > 0 ? h('span', { className: 'fc-day-dot' }) : null,
                activeCnt > 0 ? h('span', { className: 'fc-day-count' }, activeCnt) : null,
                missedCnt > 0 ? h('span', { className: 'fc-day-dot fc-day-dot-red' }) : null,
                missedCnt > 0 ? h('span', { className: 'fc-day-count' }, missedCnt) : null) : null));
        })));

      /* ---------- render ---------- */
      const msz = Math.max(10, Math.round(12 * scale));
      const schedRows = schedView ? (schedMap[schedView.key] || []).slice().sort(byTime) : [];
      const canCommit = !!draft && /^\d{2}:\d{2}$/.test(draft.time || '') && (draft.text || '').trim().length > 0;

      return h(React.Fragment, null,
        h('style', null, CSS),
        h('div', {
          className: 'fc-root',
          style: { left: effPos.x + 'px', top: effPos.y + 'px', '--fc-s': String(scale) },
        },
          h('div', {
            ref: pillRef, className: 'fc-pill', role: 'button', tabIndex: 0,
            'aria-label': t('clock.aria'), title: t('clock.aria'),
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onPointerCancel: handlePointerUp,
            onKeyDown: (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleOpen();
              }
            },
          },
            h('span', null, parts.hh),
            h('span', {
              className: blink ? 'fc-colon fc-colon-blink' : 'fc-colon',
              style: blink ? { animationDelay: blinkDelay } : undefined,
            }, ':'),
            h('span', null, parts.mm),
            parts.suffix ? h('span', { className: 'fc-suffix' }, parts.suffix) : null),
          activeReminders.length ? h('div', { className: 'fc-alarms' },
            activeReminders.map((row) => h('div', {
              key: row.id,
              className: 'fc-alarm' + (row.acked ? ' fc-done' : ''),
              role: 'button', tabIndex: 0,
              title: row.acked ? row.text : t('alarm.clickToStop'),
              'aria-label': t('alarm.title') + ': ' + row.time + ' ' + row.text,
              onClick: () => ackAlarm(row),
              onKeyDown: (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  ackAlarm(row);
                }
              },
            },
              h('span', { className: 'fc-alarm-icon' + (row.acked ? '' : ' fc-ring') }, alarmIcon(isz)),
              h('span', { className: 'fc-alarm-time' }, row.time),
              h('span', { className: 'fc-alarm-text' }, row.text)))) : null),
        open ? h('div', {
          ref: panelRef, className: 'fc-panel', role: 'dialog',
          'aria-label': tab === 'settings' ? t('settings.title') : t('calendar.title'),
          style: Object.assign({ '--fc-s': String(scale), '--fc-bgop': bgOpVar }, panelPos || { visibility: 'hidden' }),
        },
          h('div', { className: 'fc-head' },
            h('div', null,
              h('div', { className: 'fc-head-day' }, headDayText),
              h('div', { className: 'fc-head-dow' }, headDowText)),
            h('div', { className: 'fc-head-actions' },
              h('button', {
                type: 'button',
                className: 'fc-icon-btn' + (tab === 'settings' ? ' fc-active' : ''),
                'aria-label': t('action.settings'), title: t('action.settings'),
                onClick: () => setTab((prev) => (prev === 'settings' ? 'calendar' : 'settings')),
              }, gearIcon(isz)),
              h('button', {
                type: 'button', className: 'fc-icon-btn',
                'aria-label': t('action.back'), title: t('action.back'),
                onClick: () => setOpen(false),
              }, backIcon(isz)))),
          tab === 'settings' ? settingsBody : calendarBody) : null,
        open && schedView ? h('div', {
          ref: schedPopRef, className: 'fc-sched', role: 'dialog',
          'aria-label': t('schedule.title'),
          style: Object.assign({ '--fc-s': String(scale), '--fc-bgop': bgOpVar }, schedView.style),
        },
          h('div', { className: 'fc-sched-head' },
            h('span', null, schedView.label),
            h('button', {
              type: 'button', className: 'fc-mini-btn fc-plain',
              'aria-label': t('schedule.close'), title: t('schedule.close'),
              onClick: () => setSchedView(null),
            }, closeIcon(msz))),
          h('div', { className: 'fc-sched-list' },
            schedRows.length === 0 && !draft ? h('div', { className: 'fc-sched-empty' }, t('schedule.empty')) : null,
            schedRows.map((row, i) => h('div', { className: 'fc-sched-row', key: 'fc-s-' + schedView.key + '-' + i },
              row.missed && !row.acked ? h('span', { className: 'fc-sched-missed', title: t('alarm.missed') }) : null,
              h('span', { className: 'fc-sched-time' }, row.time),
              h('span', { className: 'fc-sched-text', title: row.text }, row.text),
              schedView.mode === 'edit' ? h('button', {
                type: 'button', className: 'fc-mini-btn',
                'aria-label': t('schedule.delete'), title: t('schedule.delete'),
                onClick: () => updateSched(schedView.key, (l) => l.filter((x) => x !== row)),
              }, minusIcon(msz)) : null)),
            draft ? h('div', {
              className: 'fc-sched-add',
              onBlur: (e) => {
                /* clicking anywhere outside the empty draft row discards it */
                const rt = e.relatedTarget;
                if (rt && e.currentTarget.contains(rt)) return;
                if (!(draft.time || '').trim() && !(draft.text || '').trim()) setDraft(null);
              },
            },
              h('input', {
                className: 'fc-sched-time-input', type: 'time', value: draft.time, autoFocus: true,
                'aria-label': t('schedule.time'),
                onChange: (e) => setDraft({ time: e.target.value, text: draft.text }),
                onKeyDown: (e) => { if (e.key === 'Enter') commitDraft(); },
              }),
              h('input', {
                className: 'fc-sched-text-input', type: 'text', value: draft.text,
                placeholder: t('schedule.content'), 'aria-label': t('schedule.content'), maxLength: 200,
                onChange: (e) => setDraft({ time: draft.time, text: e.target.value }),
                onKeyDown: (e) => { if (e.key === 'Enter') commitDraft(); },
              }),
              h('button', {
                type: 'button', className: 'fc-mini-btn fc-confirm',
                'aria-label': t('schedule.save'), title: t('schedule.save'),
                disabled: !canCommit, onClick: commitDraft,
              }, checkIcon(msz))) : null),
          schedView.mode === 'edit' ? h('div', { className: 'fc-sched-footer' },
            h('button', {
              type: 'button', className: 'fc-mini-btn fc-plain',
              'aria-label': t('schedule.add'), title: t('schedule.add'),
              onClick: () => setDraft({ time: '', text: '' }),
            }, plusIcon(msz))) : null) : null);
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay', id: 'floating-clock', order: 10,
        }, (props) => h(FloatingClock, Object.assign({}, props, { ctx }))));
      },
    };
  },
});
