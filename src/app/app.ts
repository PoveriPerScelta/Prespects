import { Component } from '@angular/core';

import { ContactForm } from './contact-form/contact-form';

@Component({
  selector: 'app-root',
  imports: [ContactForm],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
