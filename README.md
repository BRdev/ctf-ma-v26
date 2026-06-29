# CTF Walkthrough: Operation: Save the BBQ!

Dit document bevat de volledige walkthrough en oplossingen (spoilers) voor de docent om de CTF applicatie te begeleiden. 

## Starten van de Applicatie

1. Open een terminal in de projectmap.
2. Run `npm install` (als dat nog niet is gebeurd).
3. Run `node server.js` of `npm start` om de server te starten.
4. Ga naar `http://localhost:3000` in uw browser.

## Studenten Login & Unieke Flags

Wanneer een student naar de applicatie gaat, vullen ze hun studentnummer in (bijv. `123456`). De applicatie genereert vervolgens unieke flags op basis van dit nummer en een server-side geheim. Hierdoor is de flag van student A (`FLAG{123456_a1b2c3_RECON}`) anders dan die van student B (`FLAG{987654_x9y8z7_RECON}`).

## Oplossingen per Challenge

### Challenge 1: Reconnaissance (Information Disclosure)

**Doel:** Leerlingen moeten kijken naar broncode die verborgen is voor het blote oog.
**Oplossing:**
1. Ga naar Challenge 1.
2. Druk op `F12` of `Rechtermuisklik -> Paginabron bekijken` (View Page Source).
3. Onderaan in de HTML-code zien ze een commentaar staan met hun unieke flag:
   `<!-- Your unique flag is: FLAG{...} -->`

### Challenge 2: Broken Authentication (SQL Injection)

**Doel:** Inloggen als de administrator ("bbq_master") door middel van een SQL Injection.
**Oplossing:**
1. Ga naar Challenge 2.
2. Vul bij `Username:` de volgende payload in: `' OR username='bbq_master' --` (of een vergelijkbare werkende SQLi payload).
3. Vul bij `Password:` een willekeurige waarde in (maakt niet uit, de query negeert dit door de `--` (comment)).
4. Klik op Login. Ze zijn nu ingelogd als `bbq_master` en zien de flag op het scherm verschijnen.

### Challenge 3: Insecure Direct Object Reference (IDOR)

**Doel:** Begrijpen dat URL-parameters direct toegang kunnen geven tot objecten als autorisatie niet goed is ingeregeld.
**Oplossing:**
1. Ga naar Challenge 3.
2. De standaard weergave laat zien dat je op `/challenge/3?user_id=1` of `3` zit.
3. Pas de URL parameter aan naar `?user_id=2` in de adresbalk en druk op Enter.
4. Je ziet nu het profiel van de "bbq_master" inclusief de geheime informatie en de flag.

### Challenge 4: Path Traversal (LFI)

**Doel:** Bestanden lezen die niet via de normale web-paden toegankelijk zouden moeten zijn.
**Oplossing:**
1. Ga naar Challenge 4.
2. In het formulier zien ze dat het bestand `menu.txt` wordt opgehaald via de parameter `?file=menu.txt`.
3. In de tekst op de pagina staat een hint: zoek naar `secret_bbq_recipe.txt` in de parent directory.
4. Vul bij het invoerveld in: `../secret_bbq_recipe.txt` en klik op "Fetch File".
5. De applicatie gaat een map omhoog (`..`) en leest het geheime bestand waar de laatste flag in staat.

### 5. Insecure Data Storage / Cryptographic Failures

**Doel:** Begrijpen dat Base64 codering geen encryptie is en makkelijk gemanipuleerd kan worden.
**Oplossing:**
1. Ga naar Challenge 5.
2. Open Developer Tools (F12) en ga naar `Application` -> `Cookies` (of `Storage` in Firefox).
3. Zoek de cookie genaamd `role`. De waarde is `Z3Vlc3Q=` (wat "guest" is in Base64).
4. Decodeer "admin" naar Base64. Dit wordt `YWRtaW4=`.
5. Verander de waarde van de `role` cookie naar `YWRtaW4=`.
6. Klik op de knop "Refresh Page" op de pagina. Je bent nu admin en ziet de flag.

### 6. Client-Side Validation Bypass

**Doel:** Begrijpen dat validatie of prijzen in verborgen HTML-velden aan de client-side nooit te vertrouwen zijn.
**Oplossing:**
1. Ga naar Challenge 6.
2. Inspecteer het formulier met Developer Tools (Rechtermuisklik op de knop -> Inspecteren).
3. Zoek de verborgen input: `<input type="hidden" name="price" value="50">`.
4. Dubbelklik op de `value="50"` en verander dit naar `-50` of `0`.
5. Klik op "Buy Ticket".
6. Omdat de server de negatieve of 0 waarde accepteert (en je 0 credits hebt), is de aankoop "succesvol" en krijg je de flag.

## Flags Inleveren & Controleren

Studenten kunnen hun flags plakken op de "Mission Hub" (Dashboard) om direct feedback te krijgen of deze correct is. Zodra alle flags daar gevalideerd zijn, weten ze zeker dat ze de juiste oplossingen hebben om in te leveren in Simulise!

### Docent Controle Tool

Omdat de flags cryptografisch zijn versleuteld met het studentnummer (`FLAG{studentId_hash_CHALLENGE}`), kunnen ze niet worden afgekeken. Om u als docent te helpen controleren of een ingeleverde flag in Simulise legitiem is, kunt u het `verify_flags.js` script gebruiken:

1. Open uw terminal in de projectmap.
2. Voer het script uit met de ingeleverde flag:
   ```bash
   node verify_flags.js FLAG{123456_a1b2c3_RECON}
   ```
3. Het script controleert direct of de flag wiskundig klopt bij dat specifieke studentnummer.
