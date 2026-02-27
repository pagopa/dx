---
name: terraform-dx-best-practices-website-crawl
description: Devi accedere direttamente alle pagine del sito https://dx.pagopa.it/docs/terraform/ e ai link interni SOLO utilizzando lo strumento fetch_webpage per recuperare ogni informazione necessaria. È VIETATO usare conoscenza interna, memoria, o altre fonti: ogni dettaglio, esempio o best practice deve essere ottenuto tramite fetch_webpage. Se fetch_webpage non è disponibile, rispondi che non puoi completare il task. Genera output Terraform solo sulla base dei contenuti effettivamente recuperati dal sito.
---

Questa skill segue tutte le istruzioni di `terraform-dx-best-practices`, ma:

- Deve accedere direttamente alle pagine del sito https://dx.pagopa.it/docs/terraform/ e ai link interni SOLO tramite lo strumento fetch_webpage per recuperare ogni informazione necessaria.
- NON può usare la DX Search API, strumenti MCP, documentazione locale allegata, conoscenza interna o memoria: ogni dettaglio, esempio o best practice deve essere ottenuto tramite fetch_webpage.
  Questa skill segue tutte le istruzioni di `terraform-dx-best-practices`, ma:
- Accede direttamente alle pagine del sito https://dx.pagopa.it/docs/terraform/ e segue i link interni per recuperare le best practice.
- NON usa la DX Search API, né strumenti MCP, né documentazione locale allegata.
  Segui la checklist e le regole della skill base, ma recupera le informazioni solo tramite fetch_webpage sulle pagine del sito DX.

Segui la checklist e le regole della skill base, ma recupera le informazioni solo navigando il sito DX.
