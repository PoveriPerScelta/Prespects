import { Component, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.scss',
})
export class ContactForm {
  private readonly fb = inject(FormBuilder);

  protected readonly nazioni = NAZIONI;
  protected readonly contactEmail = CONTACT_EMAIL;
  protected readonly etaMinima = ETA_MINIMA;
  protected readonly state = signal<SubmitState>('idle');
  protected readonly mailtoFallback = signal<string>('');

  protected readonly form = this.fb.nonNullable.group({
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
    const occupazioneLabel = this.occupazioneLabel(v);

    // Chiavi in minuscolo: devono corrispondere ai tag {{...}} usati in
    // email-template.html, il template incollato nella dashboard EmailJS.
    const templateParams = {
      from_name: `${v.nome} ${v.cognome}`,
      nome: v.nome,
      cognome: v.cognome,
      eta: v.eta,
      email: v.email,
      telefono: v.telefono,
      nazione: v.nazione,
      provincia: v.provincia,
      citta: v.citta,
      motivo: v.motivoInteresse,
      ramo: v.ramoInteresse,
      occupazione: occupazioneLabel,
      obiettivi: v.obiettivi,
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
