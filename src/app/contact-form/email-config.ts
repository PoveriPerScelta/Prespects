/**
 * Configurazione invio email — nessun backend da hostare, servizio gratuito.
 *
 * Il form usa EmailJS (https://www.emailjs.com): invia l'email direttamente
 * dal browser via chiamata JavaScript, senza nessun server intermedio da
 * mettere online. Piano gratuito: 200 invii al mese, nessuna carta di
 * credito richiesta.
 *
 * A differenza di alternative più semplici (es. Formspree, Web3Forms),
 * EmailJS è l'unico servizio gratuito che permette di disegnare un vero
 * template HTML personalizzato per l'email che arriva a Serenella — quindi
 * è l'unico che può "rispecchiare lo stile del form" nella mail stessa.
 * Il template pronto da incollare è in `email-template.html` in questa
 * stessa cartella.
 *
 * Passi per attivare l'invio (10 minuti):
 *
 *  1. Vai su https://www.emailjs.com e crea un account gratuito.
 *  2. "Email Services" → "Add New Service" → collega Gmail (o un altro
 *     provider) inserendo serenella.pelosi02@gmail.com. Copia il
 *     "Service ID" generato.
 *  3. "Email Templates" → "Create New Template". Nell'editor clicca sul
 *     pulsante "Code Editor" (in alto a destra, </>), cancella il
 *     contenuto di default e incolla per intero il contenuto del file
 *     `email-template.html` di questa cartella.
 *  4. Sempre nella pagina del template, in alto, imposta:
 *       - "To Email": serenella.pelosi02@gmail.com
 *       - "Reply To": {{email}}
 *       - "Subject": Nuova candidatura — {{nome}} {{cognome}}
 *     Salva e copia il "Template ID".
 *  5. "Account" → "General" → copia la "Public Key".
 *  6. Incolla i tre valori qui sotto al posto dei placeholder, poi
 *     ricompila/ripubblica il sito (npm run build).
 *  7. (Consigliato) In "Account" → "Security" → "Allowed origins" inserisci
 *     il dominio dove pubblicherai il form, così la Public Key funziona
 *     solo dal tuo sito e non può essere riusata da altri.
 *
 * Finché i placeholder non vengono sostituiti, il form mostra comunque un
 * messaggio d'errore gentile con un link "scrivici via email" di riserva,
 * così nessuna candidatura va persa.
 */
export const EMAILJS_SERVICE_ID = 'REPLACE_WITH_YOUR_EMAILJS_SERVICE_ID';
export const EMAILJS_TEMPLATE_ID = 'REPLACE_WITH_YOUR_EMAILJS_TEMPLATE_ID';
export const EMAILJS_PUBLIC_KEY = 'REPLACE_WITH_YOUR_EMAILJS_PUBLIC_KEY';

export const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

export const CONTACT_EMAIL = 'serenella.pelosi02@gmail.com';
