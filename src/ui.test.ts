import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  await import('./main');
});

describe('notebook interactions', () => {
  it('starts in Traditional Chinese and switches interface language without losing the track', () => {
    expect(document.documentElement.lang).toBe('zh-Hant');
    expect(document.querySelector('h1')!.textContent).toContain('每個轉彎');
    const language = document.getElementById('language') as HTMLSelectElement;
    language.value = 'en'; language.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.documentElement.lang).toBe('en');
    expect(document.querySelector('h1')!.textContent).toContain('Every turn');
    expect(localStorage.getItem('switchback-language')).toBe('en');
    expect(document.querySelector('.point-id')!.textContent).toContain('401');
  });
  it('preserves the range input node during repeated input so native dragging is not interrupted', () => {
    const slider = document.getElementById('point-slider') as HTMLInputElement;
    slider.focus();
    for (const value of ['10', '50', '150']) {
      slider.value = value; slider.dispatchEvent(new Event('input', { bubbles: true }));
      expect(document.getElementById('point-slider')).toBe(slider);
      expect(document.activeElement).toBe(slider);
    }
    expect(document.querySelector('.point-id strong')!.textContent).toContain('151');
  });
  it('keeps methods open when changing units and clamps crossed range inputs', () => {
    const methods = document.querySelector('.methods') as HTMLDetailsElement;
    methods.open = true;
    document.getElementById('imperial')!.click();
    expect((document.querySelector('.methods') as HTMLDetailsElement).open).toBe(true);
    const first = document.getElementById('range-start') as HTMLInputElement;
    first.value = '400'; first.dispatchEvent(new Event('change', { bubbles: true }));
    const last = document.getElementById('range-end') as HTMLInputElement;
    last.value = '10'; last.dispatchEvent(new Event('change', { bubbles: true }));
    expect((document.getElementById('range-start') as HTMLInputElement).value).toBe('10');
    expect((document.getElementById('range-end') as HTMLInputElement).value).toBe('10');
  });
  it('retains the current data after a rejected file and localizes the error across language changes', async () => {
    const input = document.getElementById('file-input') as HTMLInputElement;
    const badFile = new File(['<html/>'], 'bad.gpx', { type: 'application/xml' });
    Object.defineProperty(badFile, 'text', { value: async () => '<html/>' });
    Object.defineProperty(input, 'files', { value: [badFile] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(document.getElementById('notice')!.textContent).toContain('請使用 GPX'));
    expect(document.querySelector('.point-id')!.textContent).toContain('401');
    const language = document.getElementById('language') as HTMLSelectElement;
    language.value = 'en'; language.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.getElementById('notice')!.textContent).toContain('Expected a GPX');
  });
});
