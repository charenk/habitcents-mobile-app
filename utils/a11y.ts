/**
 * Accessibility label builders (P2-5, spec 09).
 *
 * Pure functions that compose the VoiceOver labels the matrix in
 * docs/design-package-phase2/09-p2-5-accessibility-matrix.md specifies. Kept
 * separate from components so the exact spoken wording is unit-tested and
 * consistent across the two surfaces a control can appear on.
 *
 * Rules honored here: leak / skip / kept / slip vocabulary, sentence case, no
 * em dashes. Amounts arrive already formatted by useCurrency().format (never
 * re-formatted here), so zero-decimal currencies stay correct.
 */

import type { DayState } from '@/types/habit';

/** Kept hero: one utterance, read on settle only (spec 09 §2, row "Kept hero"). */
export function keptHeroLabel(formattedAmount: string): string {
  return `Kept so far, ${formattedAmount}, money you didn't spend`;
}

/** A week-strip dot: "{weekday}, {state}" (spec 09 §2, "Check-in card"). */
export function weekDotLabel(weekday: string, state: DayState, isToday: boolean): string {
  const stateWord =
    state === 'skipped' ? 'skipped' : state === 'slipped' ? 'slipped' : isToday ? 'today' : 'no log';
  return `${weekday}, ${stateWord}`;
}

/** A history-calendar cell: "{month} {day}, {state}" (spec 09 §2, "History calendar"). */
export function calendarCellLabel(month: string, day: number, state: DayState): string {
  const stateWord = state === 'skipped' ? 'skipped' : state === 'slipped' ? 'slipped' : 'no log';
  return `${month} ${day}, ${stateWord}`;
}

/** The long arc ring: "{total} of 66 skips, {chapter}" (spec 09 §2, "Long arc"). */
export function arcLabel(totalSkips: number, chapterName: string): string {
  return `${totalSkips} of 66 skips, ${chapterName}`;
}

/** A selectable chip: "{name}, {selected/not selected}" (spec 09 §2, "Log form", "Onboarding chips"). */
export function selectableLabel(name: string, selected: boolean): string {
  return `${name}, ${selected ? 'selected' : 'not selected'}`;
}

/** An onboarding preset chip at its preset price (spec 09 §2, "Onboarding chips + bands"). */
export function presetChipLabel(name: string, formattedPreset: string, selected: boolean): string {
  return `${name}, about ${formattedPreset} a month, ${selected ? 'selected' : 'not selected'}`;
}

/** An onboarding preset chip after the user edits its price (spec 09 §2). */
export function editedChipLabel(name: string, formattedExact: string, selected: boolean): string {
  return `${name}, ${formattedExact}, your price, ${selected ? 'selected' : 'not selected'}`;
}

/** A Leak Scan habit card header: "rank {n}, {class}, {tier}" (spec 09 §2, "Habit cards"). */
export function habitCardLabel(rank: number, className: string, tierName: string): string {
  return `rank ${rank}, ${className}, ${tierName}`;
}

/** A SpendPulse cell (spec 09 §2, "SpendPulse"): spent / no spend / outside coverage are distinct. */
export function pulseCellLabel(
  dateLabel: string,
  kind: 'spend' | 'zero' | 'outside',
  formattedAmount?: string
): string {
  if (kind === 'outside') return `${dateLabel}, outside your files`;
  if (kind === 'zero') return `${dateLabel}, no spend`;
  return `${dateLabel}, ${formattedAmount ?? ''} spent`.trim();
}

/** A reminder toggle row: "remind me the day before, {on/off}" (spec 09 §2, "Projection"). */
export function remindToggleLabel(on: boolean): string {
  return `remind me the day before, ${on ? 'on' : 'off'}`;
}

/** A settings row that carries a value: "{label}, {value}" (spec 09 §2, "Settings"). */
export function settingsRowLabel(label: string, value: string): string {
  return `${label}, ${value}`;
}
