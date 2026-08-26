import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { NAZIONI } from './countries';
import {
  CONTACT_EMAIL,
  EMAILJS_ENDPOINT,
  EMAILJS_PUBLIC_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
} from './email-config';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const ETA_MINIMA = 18;

/**
 * Sotto questa soglia dal caricamento pagina, un submit è quasi certamente
 * un bot (nessuna persona reale compila 13 campi in meno di così) — non c'è
 * backend a cui appoggiarsi, quindi questo e la honeypot sotto sono le due
 * difese lato client disponibili. Non fermano un attacco mirato — chi legge
 * il sorgente le aggira in un minuto — ma azzerano lo spam automatico "a
 * strascico", che è la minaccia reale per un form pubblico come questo.
 */
const SOGLIA_ANTI_BOT_MS = 3000;

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.scss',
})
export class ContactForm implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly nazioni = NAZIONI;
  protected readonly contactEmail = CONTACT_EMAIL;
  protected readonly etaMinima = ETA_MINIMA;
  protected readonly state = signal<SubmitState>('idle');
  protected readonly mailtoFallback = signal<string>('');

  /** Osserva le .section per rivelarle mentre si scorre; vedi setupScrollReveal(). */
  private revealObserver?: IntersectionObserver;

  /** Istante di creazione del componente, per la trappola anti-bot sul tempo. */
  private readonly caricatoAlle = Date.now();

  protected readonly form = this.fb.nonNullable.group({
    // Honeypot: invisibile a occhio umano (e saltata dagli screen reader),
    // ma un form-filler automatico che scandaglia il DOM la trova e la
    // compila. Nome volutamente "plausibile" ma non tra quelli che
    // l'autocompilazione del browser riempie da sola (evita falsi positivi
    // su utenti reali con password manager aggressivi).
    paginaWeb: [''],
    nome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    cognome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    eta: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(ETA_MINIMA),
      Validators.max(99),
    ]),
    email: ['', [Validators.required, Validators.email]],
    telefono: [
      '',
      [Validators.required, Validators.pattern(/^[+\d][\d\s./-]{6,}$/)],
    ],
    nazione: ['Italia', [Validators.required]],
    provincia: ['', [Validators.required, Validators.maxLength(60)]],
    citta: ['', [Validators.required, Validators.maxLength(60)]],
    motivoInteresse: ['', [Validators.required, Validators.minLength(15)]],
    ramoInteresse: ['', [Validators.required, Validators.minLength(15)]],
    occupazione: this.fb.control<'studente' | 'lavoratore' | ''>('', [Validators.required]),
    professione: [''],
    percorsoStudi: [''],
    obiettivi: ['', [Validators.required, Validators.minLength(15)]],
    privacy: [false, [Validators.requiredTrue]],
  });

  constructor() {
    this.form.controls.occupazione.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        const professione = this.form.controls.professione;
        const percorsoStudi = this.form.controls.percorsoStudi;

        if (value === 'lavoratore') {
          professione.addValidators([Validators.required, Validators.minLength(2)]);
        } else {
          professione.clearValidators();
          professione.setValue('');
        }
        professione.updateValueAndValidity();

        if (value === 'studente') {
          percorsoStudi.addValidators([Validators.required, Validators.minLength(2)]);
        } else {
          percorsoStudi.clearValidators();
          percorsoStudi.setValue('');
        }
        percorsoStudi.updateValueAndValidity();
      });

    // Rivela le sezioni del form con una lieve dissolvenza+risalita mentre
    // si scorre, invece di mostrarle già tutte pronte dall'inizio. Si
    // riattiva ad ogni ritorno alla vista "idle" — il primo caricamento e
    // ogni "Invia un'altra candidatura" — perché in quel momento il form
    // torna nel DOM con sezioni nuove di zecca, mai osservate prima.
    effect(() => {
      if (this.state() !== 'idle' || !isPlatformBrowser(this.platformId)) return;
      afterNextRender(() => this.setupScrollReveal(), { injector: this.injector });
    });
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
  }

  /**
   * Nessun setTimeout/setInterval: IntersectionObserver segnala da solo
   * quando una .section entra nello schermo. Le sezioni sono già visibili
   * di default in CSS — solo dopo aver aggiunto .reveal-ready sull'host
   * (qui sotto, subito prima di iniziare a osservare) lo stile "nascosta
   * finché non entra in vista" si attiva davvero. Così, se questo metodo
   * non venisse mai chiamato per qualunque motivo, il form resterebbe
   * comunque interamente visibile invece di restare vuoto in attesa di un
   * evento che non arriva.
   */
  private setupScrollReveal(): void {
    this.revealObserver?.disconnect();

    const host = this.elementRef.nativeElement;
    const sections = host.querySelectorAll<HTMLElement>('.section');
    if (!sections.length) return;

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver !== 'function') {
      return;
    }

    host.classList.add('reveal-ready');

    this.revealObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );

    sections.forEach((section) => this.revealObserver!.observe(section));
  }

  protected get isLavoratore(): boolean {
    return this.form.controls.occupazione.value === 'lavoratore';
  }

  protected get isStudente(): boolean {
    return this.form.controls.occupazione.value === 'studente';
  }

  /** True solo quando l'età è invalida specificamente perché sotto la soglia minima. */
  protected get etaTroppoBassa(): boolean {
    const eta = this.form.controls.eta;
    return this.fieldInvalid('eta') && !!eta.errors?.['min'];
  }

  protected fieldInvalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  protected errorFor(name: keyof typeof this.form.controls): string | null {
    if (!this.fieldInvalid(name)) return null;
    const errors = this.form.controls[name].errors;
    if (!errors) return null;
    if (errors['required'] || errors['requiredTrue']) return 'Campo obbligatorio.';
    if (errors['email']) return 'Inserisci un indirizzo email valido.';
    if (errors['minlength']) return `Servono almeno ${errors['minlength'].requiredLength} caratteri.`;
    if (errors['maxlength']) return `Massimo ${errors['maxlength'].requiredLength} caratteri.`;
    if (errors['min']) return `Il valore minimo è ${errors['min'].min}.`;
    if (errors['max']) return `Il valore massimo è ${errors['max'].max}.`;
    if (errors['pattern']) return 'Formato non valido.';
    return 'Valore non valido.';
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.state() === 'submitting') {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    // Bot silenzioso: honeypot compilata o submit troppo rapido dal
    // caricamento pagina. Mostriamo comunque il successo — un messaggio
    // d'errore direbbe a un bot che è stato scoperto, senza alcun beneficio
    // per noi — semplicemente non inviamo nulla.
    const eTropoVeloce = Date.now() - this.caricatoAlle < SOGLIA_ANTI_BOT_MS;
    if (v.paginaWeb || eTropoVeloce) {
      this.state.set('success');
      this.form.reset({ nazione: 'Italia', occupazione: '', privacy: false });
      return;
    }

    const occupazioneLabel = this.occupazioneLabel(v);

    // Le mail HTML non sfuggono da sole { { } }/<...>: un candidato che
    // scrivesse "<b>ciao</b>" nella motivazione altrimenti spezzerebbe il
    // layout del template (o, nel peggiore dei casi, ci inserirebbe un link
    // camuffato) nella mail che arriva a Serenella. Qui neutralizziamo i
    // caratteri HTML sui soli campi liberi prima di passarli a EmailJS —
    // il link mailto: di riserva non ne ha bisogno, è testo semplice.
    const nomeSicuro = escapeHtml(v.nome);
    const cognomeSicuro = escapeHtml(v.cognome);

    // Chiavi in minuscolo: devono corrispondere ai tag {{...}} usati in
    // email-template.html, il template incollato nella dashboard EmailJS.
    const templateParams = {
      from_name: `${nomeSicuro} ${cognomeSicuro}`,
      nome: nomeSicuro,
      cognome: cognomeSicuro,
      eta: v.eta,
      email: v.email,
      telefono: v.telefono,
      nazione: v.nazione,
      provincia: escapeHtml(v.provincia),
      citta: escapeHtml(v.citta),
      motivo: escapeHtml(v.motivoInteresse),
      ramo: escapeHtml(v.ramoInteresse),
      occupazione: escapeHtml(occupazioneLabel),
      obiettivi: escapeHtml(v.obiettivi),
    };

    this.mailtoFallback.set(this.buildMailto(v, occupazioneLabel));
    this.state.set('submitting');

    try {
      const response = await fetch(EMAILJS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: templateParams,
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(detail || `Richiesta fallita con stato ${response.status}`);
      }

      this.state.set('success');
      this.form.reset({ nazione: 'Italia', occupazione: '', privacy: false });
    } catch {
      this.state.set('error');
    }
  }

  protected startOver(): void {
    this.state.set('idle');
  }

  private occupazioneLabel(v: ReturnType<typeof this.form.getRawValue>): string {
    if (v.occupazione === 'lavoratore') return `Lavoratore/trice — ${v.professione}`;
    if (v.occupazione === 'studente') return `Studente/essa — ${v.percorsoStudi}`;
    return '';
  }

  /**
   * mailto: apre il client email dell'utente con un testo già pronto.
   * Nota: i client di posta NON renderizzano HTML/CSS nel corpo di un link
   * mailto (è una limitazione dello standard, non del nostro codice), quindi
   * qui "lo stile del sito" si traduce in un testo semplice ma curato nella
   * forma — separatori eleganti, maiuscole per le sezioni, spaziatura pulita
   * — invece del template HTML a colori usato per l'invio automatico via
   * EmailJS (email-template.html).
   */
  private buildMailto(v: ReturnType<typeof this.form.getRawValue>, occupazioneLabel: string): string {
    const riga = '───────────────────────────';
    const body = [
      '✦ NUOVA CANDIDATURA — INIZIA IL TUO PERCORSO ✦',
      riga,
      '',
      `${v.nome} ${v.cognome}  ·  ${v.eta} anni`,
      `${v.email}  ·  ${v.telefono}`,
      '',
      riga,
      'DA DOVE VIENE',
      riga,
      `Nazione: ${v.nazione}`,
      `Provincia: ${v.provincia}`,
      `Città/Paese: ${v.citta}`,
      '',
      riga,
      'OCCUPAZIONE',
      riga,
      occupazioneLabel,
      '',
      riga,
      'MOTIVO DI INTERESSE',
      riga,
      v.motivoInteresse ?? '',
      '',
      riga,
      'RAMO DI MAGGIORE INTERESSE',
      riga,
      v.ramoInteresse ?? '',
      '',
      riga,
      'OBIETTIVI',
      riga,
      v.obiettivi ?? '',
    ].join('\n');

    const subject = encodeURIComponent(`Candidatura percorso — ${v.nome} ${v.cognome}`);
    return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${encodeURIComponent(body)}`;
  }
}

/**
 * Neutralizza i caratteri HTML prima di mandare un testo libero dentro il
 * template email (che li interpola così come sono, senza escaping
 * automatico). Non è un problema di XSS in senso stretto — nessun client
 * di posta esegue script — ma senza questo un candidato potrebbe comunque
 * rompere il layout della mail o infilarci un link camuffato.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
