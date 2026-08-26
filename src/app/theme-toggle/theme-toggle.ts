import { Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type ThemePref = 'light' | 'dark';

const STORAGE_KEY = 'theme-preference';

/**
 * Tasto flottante per passare manualmente tra tema chiaro e scuro.
 *
 * Di default il sito segue il tema del dispositivo (nessun attributo
 * impostato, decide solo il CSS via prefers-color-scheme). Cliccando il
 * tasto si fissa una preferenza esplicita — salvata così resta anche al
 * prossimo giro — che vince sempre sul sistema finché non viene cambiata
 * di nuovo.
 */
@Component({
  selector: 'app-theme-toggle',
  imports: [],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /* jsdom (l'ambiente dei test unitari) ha window/document ma non implementa
     matchMedia: isPlatformBrowser da solo non basta a garantirne la
     presenza, va controllata a parte. */
  private readonly darkQuery =
    this.isBrowser && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

  /** null = nessuna scelta esplicita, segue il sistema. */
  protected readonly override = signal<ThemePref | null>(this.isBrowser ? this.readSaved() : null);

  private readonly systemPrefersDark = signal(this.darkQuery?.matches ?? false);

  protected readonly isDarkNow = computed(() => {
    const pref = this.override();
    return pref ? pref === 'dark' : this.systemPrefersDark();
  });

  constructor() {
    this.darkQuery?.addEventListener('change', (event) => this.systemPrefersDark.set(event.matches));

    effect(() => {
      if (!this.isBrowser) return;
      const pref = this.override();
      if (pref) {
        document.documentElement.setAttribute('data-theme', pref);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    });
  }

  protected toggle(): void {
    if (!this.isBrowser) return;
    const next: ThemePref = this.isDarkNow() ? 'light' : 'dark';
    this.override.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* localStorage non disponibile (es. navigazione privata): il tema
         scelto resta comunque attivo per questa sessione, solo non viene
         ricordato al prossimo avvio. */
    }
  }

  private readSaved(): ThemePref | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'dark' || saved === 'light' ? saved : null;
    } catch {
      return null;
    }
  }
}
