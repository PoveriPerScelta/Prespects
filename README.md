# FormProspects

Form di contatto "Inizia il Tuo Percorso" — candidature per un percorso di
crescita personale e network marketing. Frontend puro Angular, nessun
backend da hostare: l'invio email è gestito da [EmailJS](https://www.emailjs.com)
(vedi [email-config.ts](src/app/contact-form/email-config.ts) per la
configurazione e le istruzioni di setup).

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.0.

## Pubblicazione su GitHub Pages

Il deploy è automatico: ogni push sul branch `main` fa partire il workflow
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), che builda
il sito e lo pubblica su GitHub Pages. Non serve lanciare nessun comando
manuale, basta:

1. **Nel repository su GitHub** ([PoveriPerScelta/Prospects](https://github.com/PoveriPerScelta/Prospects))
   → Settings → Pages → alla voce "Build and deployment" → "Source" scegli
   **GitHub Actions** (va fatto una sola volta, la prima volta).
2. Push su `main` → dopo qualche minuto il sito è live su
   **https://poveriperscelta.github.io/Prospects/**.

Puoi seguire l'avanzamento del deploy nella tab **Actions** del repository.

⚠️ **Importante per EmailJS**: vai su EmailJS → Account → Security →
Allowed origins e aggiungi `https://poveriperscelta.github.io`, così la
Public Key funziona solo dal sito pubblicato.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
