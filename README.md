# Palestra

Web app personale per creare schede di allenamento, registrare carichi e ripetizioni e vedere i progressi. Funziona offline. I dati restano sul dispositivo (IndexedDB) e non finiscono mai nel repository.

## Avvio sul PC

```bash
python -m http.server 8642 --bind 127.0.0.1
```

Poi apri http://localhost:8642

## Pubblicazione e aggiornamenti

Ogni `git push` su `main` avvia il workflow in `.github/workflows/deploy.yml`, che pubblica il sito su GitHub Pages e assegna una nuova versione al service worker. L'app installata mostra "Nuova versione disponibile" alla riapertura. I dati non vengono toccati, purché l'indirizzo del sito resti lo stesso.

Se aggiungi un file JavaScript o CSS, inseriscilo anche nell'elenco `FILES` di `sw.js`.
