// Descrizione breve e due punti di attenzione per ogni esercizio del catalogo.
// d: cosa si fa; t: cosa curare durante l'esecuzione.
const INFO = {
  'c-panca-piana': { d: 'Disteso sulla panca, abbassi il bilanciere al petto e lo spingi verso l\'alto.', t: ['Scapole strette indietro e piedi ben piantati a terra, per una base stabile.', 'Porta il bilanciere poco sotto i capezzoli, con i gomiti a circa 45° dal busto.'] },
  'c-panca-inclinata': { d: 'Su panca inclinata a 30-45°, spingi i manubri dall\'altezza del petto verso l\'alto.', t: ['Petto alto e scapole indietro: così lavora la parte alta del petto.', 'Scendi controllando finché i gomiti sono poco sotto la linea delle spalle.'] },
  'c-croci': { d: 'Disteso sulla panca, apri le braccia a semicerchio con i manubri e le richiudi sopra il petto.', t: ['Gomiti leggermente piegati e fissi per tutto il movimento.', 'Scendi finché senti allungare il petto, senza andare oltre la linea delle spalle.'] },
  'c-chest-press': { d: 'Alla macchina, da seduto, spingi le maniglie in avanti all\'altezza del petto.', t: ['Regola il sedile in modo che le maniglie siano a metà petto.', 'Schiena appoggiata e scapole indietro; in fondo non bloccare del tutto i gomiti.'] },
  'c-panca-inclinata-macchina': { d: 'Versione guidata della panca inclinata: spingi in alto e in avanti, per la parte alta del petto.', t: ['Regola il sedile in modo che le maniglie partano all\'altezza delle clavicole.', 'Spingi senza staccare la schiena dallo schienale e torna giù lentamente.'] },
  'c-vertical-chest-press': { d: 'Macchina per la spinta in avanti da seduto, con lo schienale verticale.', t: ['Maniglie all\'altezza del petto e polsi dritti, in linea con gli avambracci.', 'Petto in fuori e spalle basse: non farle salire verso le orecchie.'] },
  'c-incline-press': { d: 'Macchina per la spinta inclinata, che concentra il lavoro sulla parte alta del petto.', t: ['Segui la traiettoria della macchina senza inarcare la zona lombare.', 'Controlla il ritorno in 2-3 secondi, senza far sbattere i pesi.'] },
  'c-croci-seduto': { d: 'Alla macchina, da seduto, chiudi le braccia davanti al petto come in un abbraccio.', t: ['Regola il sedile in modo che le braccia siano all\'altezza delle spalle o poco sotto.', 'Stringi il petto quando le maniglie si avvicinano e riapri lentamente.'] },
  'c-croci-in-piedi': { d: 'In piedi tra due cavi alti, porti le maniglie in basso e in avanti fino a farle incontrare.', t: ['Un piede avanti e busto leggermente inclinato, per restare stabile.', 'Gomiti morbidi e fissi: il movimento parte dalle spalle, non dalle braccia.'] },
  'c-piegamenti': { d: 'A terra, con il corpo dritto dalla testa ai talloni, pieghi le braccia fino a sfiorare il pavimento con il petto.', t: ['Addome e glutei contratti: il bacino non deve cadere né salire.', 'Mani poco più larghe delle spalle, gomiti verso dietro e non aperti in fuori.'] },
  'c-dip': { d: 'Alle parallele, scendi piegando le braccia e risali spingendo.', t: ['Busto inclinato in avanti per il petto, più dritto per i tricipiti.', 'Scendi fino a gomiti a circa 90°, senza far salire le spalle verso le orecchie.'] },
  'c-lat-machine': { d: 'Da seduto, tiri la barra verso la parte alta del petto.', t: ['Petto in fuori e busto appena inclinato indietro, senza dondolare.', 'Pensa a portare i gomiti verso i fianchi: tira con la schiena, non con le braccia.'] },
  'c-diverging-lat-pull': { d: 'Trazione verso il basso alla macchina con maniglie separate, che seguono un arco naturale.', t: ['Parti con le braccia ben distese, per allungare i dorsali.', 'Tira i gomiti in basso e indietro e stringi le scapole alla fine del movimento.'] },
  'c-trazioni': { d: 'Appeso alla sbarra, sali fino a portare il mento sopra la sbarra.', t: ['Parti a braccia distese, con le scapole già attive e senza slanci.', 'Gambe ferme e addome contratto, per non dondolare.'] },
  'c-rematore': { d: 'Con il busto inclinato in avanti, tiri il bilanciere verso l\'ombelico.', t: ['Schiena dritta e ginocchia leggermente piegate per tutto l\'esercizio.', 'Stringi le scapole in alto e scendi controllando, senza strattoni.'] },
  'c-pulley': { d: 'Da seduto, tiri la maniglia del cavo basso verso l\'addome.', t: ['Busto fermo e dritto: non dondolare avanti e indietro per tirare.', 'Spalle basse e gomiti vicini al corpo, scapole strette alla fine.'] },
  'c-stacco': { d: 'Sollevi il bilanciere da terra fino a stare in piedi, spingendo con le gambe.', t: ['Schiena neutra e bilanciere vicino alle gambe per tutta la salita.', 'Spingi il pavimento con i piedi e chiudi con i glutei, senza piegarti all\'indietro in alto.'] },
  'c-lento-avanti': { d: 'Spingi il bilanciere dalle spalle fin sopra la testa.', t: ['Glutei e addome contratti, per non inarcare la schiena.', 'In alto le braccia finiscono in linea con le orecchie.'] },
  'c-alzate-laterali': { d: 'In piedi, sollevi i manubri di lato fino all\'altezza delle spalle.', t: ['Gomiti leggermente piegati: guidano il movimento più delle mani.', 'Non superare l\'altezza delle spalle e non aiutarti con slanci del busto.'] },
  'c-lateral-raise': { d: 'Versione alla macchina delle alzate laterali: le braccia salgono di lato contro i cuscinetti.', t: ['Allinea le spalle con il perno della macchina.', 'Sali fino all\'altezza delle spalle e scendi lentamente, senza alzarle verso le orecchie.'] },
  'c-converging-shoulder-press': { d: 'Macchina per la spinta sopra la testa, con le maniglie che si avvicinano salendo.', t: ['Regola il sedile in modo che le maniglie partano all\'altezza delle spalle.', 'Schiena appoggiata: spingi senza inarcare la zona lombare.'] },
  'c-trapezio-macchina': { d: 'Sollevi le spalle verso le orecchie a braccia distese, come un\'alzata di spalle.', t: ['Braccia rilassate e dritte: si muovono solo le spalle.', 'Tieni la contrazione un secondo in alto, senza ruotare le spalle.'] },
  'c-curl-bilanciere': { d: 'In piedi, pieghi i gomiti portando il bilanciere verso le spalle.', t: ['Gomiti fermi ai fianchi: si muovono solo gli avambracci.', 'Niente slanci con la schiena; scendi fino a braccia quasi distese.'] },
  'c-curl-martello': { d: 'Curl con i manubri in presa neutra, con i palmi rivolti verso il corpo.', t: ['Polsi dritti e pollici verso l\'alto per tutto il movimento.', 'Sali e scendi controllando, senza far oscillare i manubri.'] },
  'c-pushdown': { d: 'Al cavo alto, spingi la barra o la corda verso il basso distendendo le braccia.', t: ['Gomiti incollati ai fianchi: si muovono solo gli avambracci.', 'Distendi del tutto in basso e risali fino a circa 90°.'] },
  'c-pushdown-doppio': { d: 'Pushdown con due cavi, uno per mano, per lavorare i tricipiti in modo simmetrico.', t: ['Gomiti fermi ai fianchi e busto leggermente in avanti.', 'In basso distendi bene e allarga un po\' le mani per stringere i tricipiti.'] },
  'c-french-press': { d: 'Disteso sulla panca, pieghi i gomiti portando il peso verso la fronte, poi lo risali.', t: ['Gomiti puntati in alto e fermi: non devono aprirsi verso l\'esterno.', 'Scendi lentamente, con il peso che passa vicino alla testa.'] },
  'c-squat': { d: 'Con il bilanciere sulle spalle, scendi piegando anche e ginocchia e risali.', t: ['Ginocchia nella direzione delle punte dei piedi, talloni sempre a terra.', 'Petto alto e schiena neutra; scendi almeno a cosce parallele se la mobilità lo permette.'] },
  'c-rack-squat': { d: 'Squat al rack, partendo dal bilanciere appoggiato sui supporti.', t: ['Regola i supporti poco sotto l\'altezza delle spalle.', 'Come nello squat: ginocchia in linea con i piedi e schiena neutra.'] },
  'c-hack-squat': { d: 'Squat alla macchina inclinata, con la schiena appoggiata al cuscino.', t: ['Piedi al centro della pedana, alla larghezza delle spalle.', 'Scendi controllando, senza staccare la zona lombare dallo schienale.'] },
  'c-leg-press': { d: 'Da seduto, spingi la pedana con i piedi distendendo le gambe.', t: ['Non bloccare del tutto le ginocchia alla fine della spinta.', 'Scendi solo finché la zona lombare resta appoggiata allo schienale.'] },
  'c-affondi': { d: 'Con i manubri, fai un passo avanti e scendi portando il ginocchio dietro verso terra.', t: ['Busto dritto e ginocchio davanti sopra il piede, non oltre la punta.', 'Risali spingendo sul tallone della gamba davanti.'] },
  'c-leg-extension': { d: 'Da seduto, distendi le ginocchia sollevando il rullo con le caviglie.', t: ['Ginocchio allineato al perno della macchina.', 'Fermati un attimo in alto e scendi lentamente.'] },
  'c-leg-curl': { d: 'Pieghi le ginocchia portando il rullo verso i glutei, per i muscoli dietro la coscia.', t: ['Bacino fermo e appoggiato: non sollevarlo per aiutarti.', 'Ritorno lento, senza far sbattere i pesi.'] },
  'c-stacco-rumeno': { d: 'A gambe quasi tese, scendi con il bilanciere lungo le cosce spingendo il bacino indietro.', t: ['Il movimento parte dalle anche: sedere indietro e schiena neutra.', 'Scendi finché senti tirare dietro le cosce, di solito poco sotto le ginocchia.'] },
  'c-hip-thrust': { d: 'Con la schiena appoggiata alla panca, sollevi il bacino con il peso sulle anche.', t: ['In alto busto e cosce in linea, con i glutei contratti.', 'Mento verso il petto e costole basse, per non inarcare la schiena.'] },
  'c-calf': { d: 'In piedi, sali sulle punte dei piedi e scendi lentamente.', t: ['Usa tutta l\'escursione: talloni giù, poi su più che puoi.', 'Ginocchia distese ma non bloccate, movimento lento.'] },
  'c-crunch': { d: 'Disteso, avvicini il petto al bacino arrotolando la parte alta della schiena.', t: ['Non tirare la testa con le mani: lo sguardo resta verso il soffitto.', 'Espira salendo e tieni la zona lombare a terra.'] },
  'c-plank': { d: 'In appoggio su avambracci e punte dei piedi, mantieni il corpo dritto e fermo.', t: ['Bacino in linea con spalle e talloni, né alto né basso.', 'Addome e glutei contratti, respirando in modo regolare.'] },
  'c-leg-raise': { d: 'Appeso alla sbarra, sollevi le gambe davanti al corpo.', t: ['Parti da fermo con l\'addome contratto, senza dondolare.', 'Alla fine solleva anche il bacino, per la parte bassa dell\'addome.'] },
};

// Esercizi creati nell'app di cui si conosce il movimento dal nome.
const NAMED_INFO = {
  'curl macchinario': { d: 'Curl alla macchina, con le braccia appoggiate al cuscino.', t: ['Ascelle contro il bordo del cuscino e gomiti in linea con il perno della macchina.', 'Distendi quasi del tutto in basso e scendi lentamente.'] },
};

export function exerciseInfo(ex) {
  if (!ex) return null;
  return INFO[ex.exerciseId ?? ex.id] || NAMED_INFO[(ex.name || '').trim().toLowerCase()] || null;
}

export function infoBlock(ex, open = false) {
  const info = exerciseInfo(ex);
  if (!info) return '';
  return `<details class="howto" ${open ? 'open' : ''}><summary>Come si fa</summary>
    <p>${info.d}</p><ul>${info.t.map((x) => `<li>${x}</li>`).join('')}</ul></details>`;
}
