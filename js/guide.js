// Spiegazione in parole semplici dei parametri usati nelle statistiche.
const TERMS = [
  ['Allenamento', [
    ['Volume', 'Il lavoro totale: per ogni serie fatta si moltiplicano i kg per le ripetizioni, poi si somma tutto. Esempio: 3 serie da 10 ripetizioni con 60 kg danno 1800 kg. Negli esercizi a corpo libero (trazioni, dip, piegamenti) conta anche il tuo peso corporeo, se lo hai inserito in Statistiche. Per i piegamenti ne conta circa due terzi, perché le mani ne sostengono solo una parte.'],
    ['Durata', 'Il tempo da quando tocchi “Inizia” a quando tocchi “Termina”.'],
    ['Serie', 'Le serie che hai spuntato, rispetto a quelle previste dalla scheda (per esempio 16 / 17).'],
    ['Ripetizioni', 'Il totale delle ripetizioni di tutte le serie fatte.'],
    ['Carico medio', 'Quanti kg hai sollevato in media a ogni ripetizione: il volume diviso per le ripetizioni. Ha senso confrontarlo tra allenamenti dello stesso giorno della scheda, perché dipende dagli esercizi che fai.'],
    ['Recupero medio', 'Il tempo medio tra una serie spuntata e la successiva dello stesso esercizio. Comprende anche il tempo per eseguire la serie. Le pause oltre 15 minuti non vengono contate. È preciso solo se spunti ogni serie appena la finisci.'],
    ['Densità', 'Quanto lavoro fai al minuto: il volume diviso per la durata. Sale se fai lo stesso lavoro in meno tempo.'],
    ['Completamento', 'La percentuale di serie fatte rispetto a quelle previste dalla scheda.'],
  ]],
  ['Esercizio', [
    ['Carico max', 'Il peso più alto che hai usato in una serie. Negli esercizi a corpo libero è il tuo peso più l\'eventuale zavorra.'],
    ['1RM stimato', 'Una stima del peso che riusciresti a sollevare per una sola ripetizione, calcolata dalle serie che fai (formula di Epley: kg × (1 + ripetizioni ÷ 30)). Serve a confrontare serie diverse: 80 kg × 5 e 70 kg × 10 danno valori simili. È solo una stima, meno affidabile sopra le 10 ripetizioni.'],
    ['Serie migliore', 'La serie con il 1RM stimato più alto. Negli esercizi a corpo libero, quella con più ripetizioni.'],
    ['Volume max', 'Il volume più alto che hai fatto su quell\'esercizio in un solo allenamento.'],
  ]],
  ['Confronti e record', [
    ['Frecce e percentuali', 'Il confronto con la volta precedente. Per l\'allenamento intero è l\'ultima volta che hai fatto lo stesso giorno della scheda, per un esercizio l\'ultima volta che l\'hai fatto. ▲ verde vuol dire che sei migliorato, ▼ rosso che sei calato. La durata è in grigio, perché metterci di più o di meno non è né un bene né un male.'],
    ['Nuovi record', 'Compaiono quando superi il tuo valore migliore di sempre su un esercizio: carico max, 1RM stimato o volume. Negli esercizi a corpo libero contano le ripetizioni in una serie. La prima volta che fai un esercizio non c\'è ancora nulla da battere.'],
    ['Serie per muscolo', 'Quante serie hai fatto per ogni gruppo muscolare. Mostra come distribuisci il lavoro e se trascuri qualche muscolo.'],
    ['Non in scheda', 'Nel menu dei progressi indica gli esercizi che hai fatto almeno una volta ma che oggi non sono in nessuna scheda.'],
  ]],
  ['Durante l\'allenamento', [
    ['Suggerimento di carico', 'Se l\'ultima volta hai fatto tutte le ripetizioni previste in ogni serie, l\'app ti propone di aumentare: 1 kg sotto i 20 kg, altrimenti circa il 5% arrotondato a 2,5 kg. Negli esercizi senza carico propone una ripetizione in più. Decidi tu se applicarlo.'],
    ['Timer di recupero', 'Parte quando spunti una serie e ti avvisa alla fine. Durata e attivazione si cambiano in Dati e impostazioni, con l\'icona in alto nella pagina Schede.'],
    ['Zavorra (+Kg)', 'Negli esercizi a corpo libero la colonna “+Kg” è il peso che aggiungi, per esempio con una cintura. Lasciala a 0 se non usi zavorra.'],
  ]],
];

export function guideView(main) {
  main.innerHTML = `
    <header class="top"><button class="icon-btn" data-back aria-label="Indietro">←</button><h1>Come leggere le statistiche</h1></header>
    ${TERMS.map(([title, rows]) => `
      <section class="card"><h2>${title}</h2>
        <dl class="guide">${rows.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl>
      </section>`).join('')}`;
  main.querySelector('[data-back]').onclick = () => {
    if (history.length > 1) history.back();
    else location.hash = '#/statistiche';
  };
}
