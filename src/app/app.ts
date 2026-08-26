import { Component } from '@angular/core';

import { ContactForm } from './contact-form/contact-form';
import { ThemeToggle } from './theme-toggle/theme-toggle';

@Component({
  selector: 'app-root',
  imports: [ContactForm, ThemeToggle],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
