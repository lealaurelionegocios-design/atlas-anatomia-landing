# SweetProfit — Formule e regole di calcolo

Tutta la logica finanziaria è in `src/lib/calc/` ed è indipendente dall'interfaccia.
Ogni formula è coperta da test in `tests/`.

## 1. Aritmetica e arrotondamenti

| Regola | Dettaglio |
|---|---|
| Importi inseriti | Salvati in **centesimi interi** (`180` = 1,80 €). La conversione testo → centesimi usa `decimal.js` (es. "0,29" → 29, senza l'errore 28,999… della virgola mobile). |
| Calcoli intermedi | `decimal.js` con 40 cifre significative. **Nessun arrotondamento intermedio.** |
| Importi mostrati | Arrotondati al centesimo, *half up* (2,505 → 2,51). |
| Costi unitari mostrati | 4–5 decimali sotto 0,10 € (0,0018 €/g), altrimenti 2–4. |
| Prezzo suggerito | Unico valore arrotondato "davvero": al multiplo scelto (0,01 / 0,05 / 0,10 / 0,50 / 1,00 €), **per eccesso** (predefinito, il margine reale non scende mai sotto l'obiettivo) oppure al più vicino. Dopo l'arrotondamento margine e ricarico vengono **ricalcolati sul prezzo reale**. |
| Percentuali | Salvate come numeri "per cento" (50 = 50%). |

## 2. Ingredienti

```
Costo per unità base = Prezzo pagato ÷ (Quantità acquistata × fattore unità)
```

Unità base: g (per g/kg), ml (per ml/l), pz. Fattori: kg = 1000 g, l = 1000 ml.

Esempio: Farina 00, 1 kg, 1,80 € → 1,80 ÷ 1000 = **0,0018 €/g**.

**Peso ↔ volume** solo se l'ingrediente ha una densità (g/ml): `g = ml × densità`.
Senza densità la riga di ricetta viene segnalata come "densità richiesta" e il suo costo è escluso.
I pezzi non si convertono mai in peso o volume.

Quando prezzo, quantità o unità di acquisto cambiano, il prezzo precedente viene aggiunto allo
**storico prezzi** (usato nel report "Andamento prezzi").

## 3. Ricetta

```
Costo riga          = quantità usata (convertita nell'unità base) × costo per unità base
Ingredienti         = Σ costi riga
Scarti              = Ingredienti × % scarto
Manodopera          = minuti ÷ 60 × costo orario
Voce "per unità"    = importo × resa
Voce "per ricetta"  = importo
Costo totale        = Ingredienti + Scarti + Manodopera + Confezionamento + Altre spese
Costo per unità     = Costo totale ÷ resa
```

- Resa ≤ 0 o non numerica → costo per unità **non calcolabile** (nessuna divisione per zero).
- Valori negativi, ingredienti mancanti, unità incompatibili → la ricetta è marcata "costo incompleto"
  e la voce non valida è esclusa dal totale (mai conteggiata come zero in silenzio: l'avviso è visibile).
- Il costo è sempre ricalcolato dai dati correnti: cambiando il prezzo di un ingrediente si aggiornano
  **tutte** le ricette che lo usano.

## 4. Prezzo (Calcolatore)

Definizioni:

- **Costo pieno per unità (K)** = costo per unità della ricetta + costi fissi aggiuntivi ÷ resa.
  I costi fissi del calcolatore (affitto, utenze…) sono separati dai costi della ricetta: non vanno ripetuti.
- **m** = margine desiderato, **f** = commissioni sulla vendita, **v** = IVA (frazioni, es. 0,5).
- Le commissioni (POS, piattaforme) sono calcolate sul **prezzo pagato dal cliente** (IVA inclusa).

```
Prezzo netto (IVA esclusa)  P = K ÷ (1 − m − f × (1 + v))
Prezzo al cliente           G = P × (1 + v)       → poi arrotondato
```

Senza IVA si riduce alla formula classica `Prezzo = Costo ÷ (1 − Margine − Commissioni)`.
Se `m + f × (1 + v) ≥ 100%` nessun prezzo può coprire i costi: viene mostrato un errore.

Valutazione di un prezzo G (suggerito o alternativo):

```
Netto          P = G ÷ (1 + v)
IVA            = G − P
Commissioni    = G × f
Contribuzione  = P − K − Commissioni
Margine %      = Contribuzione ÷ P × 100
Ricarico %     = (P − K) ÷ K × 100
```

**Margine ≠ ricarico**: costo 5 €, prezzo 10 € → margine 50%, ricarico 100%.

La **contribuzione** non è l'utile netto: non comprende imposte sul reddito né costi non inseriti.
Nessuna aliquota IVA è preimpostata (predefinito 0%): l'utente inserisce quella del proprio caso.

## 5. Dashboard e report

| Indicatore | Calcolo |
|---|---|
| Costo medio per ricetta | media dei costi totali (un lotto) delle ricette con resa valida |
| Prezzo medio suggerito | media dei prezzi al cliente suggeriti (margine obiettivo di ogni ricetta, impostazioni correnti) |
| Margine pianificato | media dei margini obiettivo |
| Margine più alto/basso | margine al prezzo attuale se impostato, altrimenti al prezzo suggerito (l'interfaccia indica quale) |
| Ingredienti che pesano di più | somma del costo di ogni ingrediente in tutte le ricette (una preparazione ciascuna) e quota sul totale |

Non vengono mostrati incassi o utili realizzati: l'app non registra vendite.

## 6. Esempi verificati (dati dimostrativi)

Impostazioni: margine da ricetta, commissioni 0%, IVA 0%, costi fissi 0, arrotondamento 0,10 € per eccesso.

**Torta alle Fragole** — resa 12 fette

| Voce | Calcolo | € |
|---|---|---|
| Farina 00 200 g | 200 × 0,0018 | 0,36 |
| Zucchero 200 g | 200 × 0,0015 | 0,30 |
| Uova 4 pz | 4 × 0,40 | 1,60 |
| Burro 100 g | 100 × 0,01 | 1,00 |
| Latte 500 ml | 500 × 0,0014 | 0,70 |
| Fragole 500 g | 500 × 0,007 | 3,50 |
| Panna 250 ml | 250 × 0,005 | 1,25 |
| Lievito 16 g | 16 × 0,01 | 0,16 |
| **Ingredienti** | | **8,87** |
| Scarti 5% | 8,87 × 0,05 | 0,4435 |
| Manodopera | 90/60 × 12 | 18,00 |
| Vassoio e scatola | per ricetta | 2,00 |
| Energia forno | per ricetta | 0,80 |
| **Totale** | | **30,1135** |
| **Per fetta** | 30,1135 ÷ 12 | **2,5095 → 2,51** |
| Prezzo al 60% | 2,5095 ÷ 0,40 = 6,2736 | **6,30** |
| Margine al prezzo attuale 4,50 | (4,50 − 2,5095) ÷ 4,50 | 44,2% |

**Tiramisù** — resa 8 porzioni: ingredienti 9,22 (mascarpone 4,50 + uova 1,60 + zucchero 0,15 +
savoiardi 2,40 + caffè 0,45 + cacao 0,12) + manodopera 8,00 + coppette 0,35 × 8 = 2,80 →
totale **20,02**, per porzione **2,5025**; al 55%: 5,5611 → **5,60**; margine a 5,00 € = **49,95%**.

**Cupcake al Cioccolato** — resa 12: ingredienti 6,213 + scarti 3% 0,18639 + manodopera 12,00 +
scatoline 0,40 × 12 = 4,80 → totale **23,19939**, per pezzo **1,9333**; al 50%: 3,8666 → **3,90**;
margine a 3,50 € = **44,8%**.

Tutti questi valori sono verificati da `tests/demo.test.ts`.
