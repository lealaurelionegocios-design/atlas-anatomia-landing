# SweetProfit V1

Calcolatore professionale di costi e prezzi per la pasticceria artigianale.
Applicazione web che funziona interamente nel browser: nessun server, nessun account, nessun tracciamento.

**Flusso:** ingredienti → ricette → costi aggiuntivi → prezzo → margini.

Interfaccia in italiano · valuta EUR · struttura pronta per tedesco e francese.

---

## Installazione ed esecuzione

Requisiti: **Node.js 18.18+** (consigliato 20 o 22) e npm.

```bash
cd sweetprofit
npm install

# sviluppo (http://localhost:3000)
npm run dev

# build di produzione (esportazione statica nella cartella out/)
npm run build
npm start            # serve out/ su http://localhost:4173
```

La cartella `out/` è un sito statico: può essere pubblicata su qualsiasi hosting statico
(Netlify, Vercel, GitHub Pages, un server Nginx…) e consegnata al cliente così com'è.
Va servita da un server HTTP (non aprendo `index.html` dal disco).

### Test

```bash
npm test             # 74 test unitari (Vitest): calcoli, unità, arrotondamenti, backup, persistenza
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run test:e2e     # facoltativo: test nel browser sull'app compilata (richiede Playwright + Chromium)
```

Per il test e2e: `npm i -D playwright && npx playwright install chromium`, poi `npm run build && npm run test:e2e`.

---

## Stack

Next.js 15 (App Router, export statico) · React 19 · TypeScript (strict) · Tailwind CSS ·
componenti in stile shadcn/ui (Radix Dialog, CVA) · Lucide · Recharts · Zod · decimal.js ·
IndexedDB (idb) · Vitest · Sonner (notifiche). Font Inter e Fraunces inclusi nel pacchetto (nessuna richiesta a Google Fonts).

## Architettura

```
src/
  lib/
    domain/      tipi, schemi Zod, operazioni pure sui dati, dati dimostrativi
    calc/        motore finanziario (decimal.js): unità, ingredienti, ricette, prezzi, analisi
    storage/     repository IndexedDB + backup/ripristino JSON
    store/       stato React con salvataggio automatico
    i18n/        testi (messages/it.ts) e formattazione numeri/date per lingua
    utils/       parsing numeri "1,80", CSV, id
  components/    UI (ui/), layout (sidebar, header mobile), grafici
  features/      schermate: dashboard, ingredienti, ricette, calcolatore, report, impostazioni, guida
  app/           rotte Next.js
tests/           test Vitest
docs/FORMULE.md  formule, regole di arrotondamento ed esempi verificati
```

- La **logica finanziaria** (`lib/calc`) non dipende da React: è testata in isolamento.
- La **persistenza** passa da un'interfaccia `DataRepository` (`load / save / clear`): in futuro si può
  aggiungere un backend con account, licenza o sincronizzazione senza toccare i calcoli.
- Il **backup** ha `schemaVersion`: le versioni future potranno migrare i vecchi file.

## Schermate

| Rotta | Schermata |
|---|---|
| `/` | Dashboard |
| `/ingredienti/` | Ingredienti |
| `/ricette/` · `/ricette/modifica/?id=…` | Ricette ed editor |
| `/calcolatore/?ricetta=…` | Calcolatore prezzi |
| `/report/` | Report |
| `/impostazioni/` | Impostazioni |
| `/guida/` | Guida rapida |

## Funzionalità implementate

**Ingredienti**
- Nome, categoria, quantità e unità di acquisto (g, kg, ml, l, pz), prezzo pagato, fornitore, note, data aggiornamento.
- Costo per unità base calcolato in automatico con anteprima della formula (es. `1,80 € ÷ 1000 g = 0,0018 €/g`).
- Densità facoltativa per convertire peso ↔ volume; senza densità nessuna conversione.
- Modifica, duplicazione, eliminazione con conferma (bloccata se l'ingrediente è usato in una ricetta, con elenco delle ricette).
- Ricerca per nome/fornitore, filtro per categoria, conteggio ricette che lo usano.
- Storico prezzi automatico ad ogni variazione.

**Ricette**
- Nome, categoria, resa e unità di resa, ingredienti dall'archivio con quantità e unità compatibili.
- Manodopera (minuti × costo orario), confezionamento e altre spese per ricetta o per unità, % scarti.
- Riepilogo costi in tempo reale: ingredienti, scarti, manodopera, confezionamento, altre spese, totale, costo per unità.
- Margine obiettivo e prezzo attuale per ricetta.
- Creazione di un nuovo ingrediente direttamente dall'editor.
- Avviso di modifiche non salvate; ricerca, filtro, ordinamento, duplicazione, eliminazione con conferma.
- Ricalcolo automatico quando cambia il prezzo di un ingrediente.

**Calcolatore prezzi**
- Resa simulabile, margine (campo + cursore), commissioni %, IVA %, costi fissi aggiuntivi, arrotondamento.
- Prezzo suggerito (esatto e arrotondato), prezzo netto, IVA, commissioni, contribuzione per unità e per ricetta.
- Margine e ricarico distinti e spiegati; composizione grafica del prezzo.
- Confronto con un prezzo alternativo (differenza, avvisi sotto costo / sotto obiettivo).
- Salvataggio di margine e prezzo nella ricetta.

**Dashboard** — numero ricette, costo medio per ricetta, prezzo medio suggerito, margine pianificato,
ricette con margine più alto e più basso, grafico dei costi per unità, azioni rapide, promemoria backup.

**Report** — costi per ricetta, margini simulati, ingredienti che pesano di più, prezzi a confronto
a diversi margini, andamento prezzi ingredienti. Ogni sezione esportabile in CSV (separatore `;`,
compatibile con Excel in italiano); stampa con impaginazione dedicata.

**Impostazioni** — nome attività, valuta (EUR), lingua, margine/costo orario/commissioni/IVA/costi fissi
predefiniti, arrotondamento, backup JSON, ripristino con validazione e conferma, caricamento/rimozione
dei dati di esempio, eliminazione totale con conferma digitata ("ELIMINA").

**Guida rapida** — 5 passi interattivi con mini-esercizi che usano lo stesso motore di calcolo.

**Trasversali** — salvataggio automatico locale con indicatore di stato, validazione dei moduli con
messaggi chiari, stati vuoti curati, conferme per le azioni distruttive, dati di esempio marcati
"Esempio", navigazione da tastiera (link "Vai al contenuto", focus visibili, dialoghi accessibili,
Esc chiude il menu), layout responsive (tabelle → schede su mobile, menu a scomparsa).

## Dati dimostrativi

Al primo avvio vengono caricati 15 ingredienti e 3 ricette (Torta alle Fragole, Tiramisù,
Cupcake al Cioccolato) con prezzi **fittizi**, marcati come "Esempio". Un banner permette di rimuoverli;
gli ingredienti di esempio usati nelle ricette dell'utente vengono mantenuti.
I calcoli sono verificati in `tests/demo.test.ts` e documentati in `docs/FORMULE.md`.

## Privacy e dati

- I dati sono salvati **solo nel browser** del dispositivo in uso (IndexedDB).
- Cancellare i dati di navigazione, usare la navigazione privata o cambiare browser/dispositivo può far
  perdere i dati: l'app lo spiega e raccomanda backup periodici (data dell'ultimo backup sempre visibile).
- Nessun login, pagamento, analytics o tracciamento di terze parti. Nessuna sincronizzazione tra dispositivi.

## Localizzazione (tedesco, francese)

1. Copiare `src/lib/i18n/messages/it.ts` in `de.ts` / `fr.ts` e tradurre i valori: il tipo `Messages`
   segnala in compilazione ogni chiave mancante.
2. Registrare la lingua in `src/lib/i18n/index.ts` (`LOCALES`, con codice Intl `de-DE` / `fr-FR`).
3. Estendere `locale` in `Settings` e nello schema Zod, abilitare il selettore lingua nelle Impostazioni
   e chiamare `setFormatLocale` (numeri e date sono già formattati con `Intl`).
4. I dati dimostrativi (nomi di ingredienti e ricette) sono in `src/lib/domain/demo.ts`.

## Limitazioni note (V1)

- **Solo locale**: nessun account, licenza o sincronizzazione; i dati vivono in un solo browser.
- **Solo italiano** nell'interfaccia; tedesco e francese sono predisposti ma non tradotti.
- **Nessuna registrazione delle vendite**: margini e contribuzioni sono simulazioni, non risultati reali.
- **Imposte**: si gestisce un'unica aliquota IVA sul prezzo di vendita; non sono gestite imposte sul reddito,
  regimi speciali, IVA a credito sugli acquisti o aliquote diverse per prodotto. Verificare con un commercialista.
- **Prezzi ingredienti IVA**: l'app usa il prezzo pagato così come inserito (l'utente decide se IVA inclusa o esclusa).
- **Commissioni**: una sola percentuale sul prezzo al cliente; nessuna commissione fissa per transazione.
- **Costi fissi**: ripartiti come importo per ricetta inserito dall'utente; nessuna ripartizione automatica
  su volumi di produzione mensili.
- **Ricette composte** (una ricetta usata come ingrediente di un'altra, es. crema pasticcera) non sono supportate:
  si possono inserire come ingrediente con il loro costo.
- **Storico prezzi**: registrato solo dalle modifiche fatte nell'app (nessuna importazione di listini).
- **Conversioni**: solo g/kg, ml/l, pz; peso ↔ volume solo con densità inserita; nessuna unità anglosassone.
- **Numeri**: il punto è interpretato come separatore decimale se non c'è una virgola ("1.800" = 1,8).
- Una ricarica forzata della pagina nell'istante esatto di un salvataggio potrebbe perdere l'ultima modifica
  (il salvataggio parte immediatamente ed è indicato da "Salvataggio…/Salvato").
- Tema solo chiaro (nessuna modalità scura).
