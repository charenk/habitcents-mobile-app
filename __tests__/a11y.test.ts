import {
  keptHeroLabel,
  weekDotLabel,
  calendarCellLabel,
  arcLabel,
  selectableLabel,
  presetChipLabel,
  editedChipLabel,
  habitCardLabel,
  pulseCellLabel,
  remindToggleLabel,
  settingsRowLabel,
} from '@/utils/a11y';

describe('a11y label builders (spec 09)', () => {
  it('kept hero is one utterance with the money-you-did-not-spend framing', () => {
    expect(keptHeroLabel('$42.00')).toBe("Kept so far, $42.00, money you didn't spend");
  });

  it('week dot names the day and its state, today when no log', () => {
    expect(weekDotLabel('Monday', 'skipped', false)).toBe('Monday, skipped');
    expect(weekDotLabel('Tuesday', 'slipped', false)).toBe('Tuesday, slipped');
    expect(weekDotLabel('Wednesday', 'no-log', true)).toBe('Wednesday, today');
    expect(weekDotLabel('Thursday', 'no-log', false)).toBe('Thursday, no log');
  });

  it('calendar cell reads month, day, and state', () => {
    expect(calendarCellLabel('July', 4, 'skipped')).toBe('July 4, skipped');
    expect(calendarCellLabel('July', 5, 'no-log')).toBe('July 5, no log');
  });

  it('arc reads total of 66 and the chapter', () => {
    expect(arcLabel(30, 'Cruising')).toBe('30 of 66 skips, Cruising');
  });

  it('selectable chip announces selection state', () => {
    expect(selectableLabel('Food', true)).toBe('Food, selected');
    expect(selectableLabel('Food', false)).toBe('Food, not selected');
  });

  it('onboarding preset chip uses the about-price framing, edited uses your-price', () => {
    expect(presetChipLabel('Video streaming', '$12', false)).toBe(
      'Video streaming, about $12 a month, not selected'
    );
    expect(editedChipLabel('Video streaming', '$14', true)).toBe(
      'Video streaming, $14, your price, selected'
    );
  });

  it('habit card header reads rank, class, and tier', () => {
    expect(habitCardLabel(1, 'Govern', 'solid')).toBe('rank 1, Govern, solid');
  });

  it('pulse cell distinguishes spend, zero spend, and outside coverage', () => {
    expect(pulseCellLabel('July 4', 'spend', '$18')).toBe('July 4, $18 spent');
    expect(pulseCellLabel('July 4', 'zero')).toBe('July 4, no spend');
    expect(pulseCellLabel('July 4', 'outside')).toBe('July 4, outside your files');
  });

  it('remind toggle and settings row read their value', () => {
    expect(remindToggleLabel(true)).toBe('remind me the day before, on');
    expect(remindToggleLabel(false)).toBe('remind me the day before, off');
    expect(settingsRowLabel('Currency', 'US dollar')).toBe('Currency, US dollar');
  });

  it('no builder output contains an em dash', () => {
    const samples = [
      keptHeroLabel('$1'),
      weekDotLabel('Monday', 'skipped', false),
      calendarCellLabel('July', 4, 'slipped'),
      arcLabel(10, 'Rhythm'),
      selectableLabel('Food', true),
      presetChipLabel('Music', '$11', false),
      editedChipLabel('Music', '$9', true),
      habitCardLabel(2, 'Influence', 'likely'),
      pulseCellLabel('July 4', 'spend', '$5'),
      remindToggleLabel(true),
      settingsRowLabel('Version', '1.0.0'),
    ];
    for (const s of samples) expect(s).not.toContain('—');
  });
});
