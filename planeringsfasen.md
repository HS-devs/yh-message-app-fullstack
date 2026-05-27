# Inlämning 1 - Planeringsfasen

Browser: 0

Frontend: 1

Express/Backend: 1

Databas: 5

<b>Om tillitsgränserna:</b><break></break>

Vi har delat upp systemet med två tydliga tillitsgränser. 
Allt till vänster, Browser/Frontend, körs på användarens egen enhet. 
Det betyder att det är en osäker miljö som vi inte kan kontrollera. 
Användaren kan öppna Developer Tools och ändra i koden om de vill. 
Allt till höger, API-serven och Databasen, körs på vår egen server. Det är vår säkra miljö där vi sätter reglerna.

<b>Pilarna (T & I):</b>

De pilarna som går till höger representerar data som skickas in i systemet. Här har vi satt ett T (Tampering), eftersom det största hotet är att någon manipulerar datan på vägen (t.ex. ändrar i ett HTTP-anrop eller skickar med skadlig kod). De Tillitsgränspilarna till vänster är svaren som går tillbaka. Här har vi satt ett I (Information Disclosure), eftersom risken där är att vi råkar läcka ut känslig data i våra JSON-svar.

<b>Kopplingen till våra säkerhetskrav:</b>

Eftersom vi vet att pilarna hotas av T och I, krävs att all kommunikation sker via krypterad HTTPS. Och eftersom vi vet att vi inte kan lita på Frontend-boxen (eftersom den ligger i den osäkra zonen), har vi lagt ett strikt säkerhetskrav på att Express/Backend måste göra all indatavalidering och behörighetskontroll innan något sparas i Databasen.


<b>1. Identifierade säkerhetsrisker och hotscenarier (Hotmodellering)</b>

Utifrån från vår systemskiss och ESTRID-klassificeringen identifieras följande hotscenarier:


<b>Hot mot pilen "Öppnar" (T - Tampering): Nedladdning av skadlig kod (Man-in-the-Middle)</b>

<b>Scenario:</b> När en användare öppnar applikationen i sin Browser (0) och laddar ner Frontend (1 ESRD) över ett osäkert nätverk, kan en angripare avlyssna och manipulera (Tampering) källkoden. Angriparen byter ut er React-kod mot skadlig kod för att stjäla framtida inloggningsuppgifter.


<b>Hot mot pilen "HTTP-anrop" (T - Tampering): Injektionsattacker mot Express</b>

<b>Scenario:</b> Eftersom data skickas från den osäkra användarmiljön, kan en elak användare manipulera ett HTTP-anrop och skicka med skadliga databasskript (t.ex. SQL-injektion) i meddelandefältet. Om Express skickar detta vidare till Databas (5 E) kan data raderas eller läckas.


<b>Hot inuti boxen "Express/Backend & API" (ED - Elevation of Privilege & Denial of Service)</b>

<b>Scenario (E):</b> En vanlig inloggad användare manipulerar ID-parametern i sitt HTTP-anrop (t.ex. ändrar meddelande-ID i URL:en) för att försöka redigera eller radera en annan användares meddelande, och lyckas därmed höja sina rättigheter (Elevation of Privilege).

<b>Scenario (D):</b> En angripare utnyttjar att API:et är publikt och bombarderar Express-boxen med miljontals automatiska HTTP-anrop (Denial of Service) så att servern överbelastas och kraschar för vanliga användare.


<b>Hot mot pilen "JSON-svar" (I - Information Disclosure): Läckage av känslig data</b>

<b>Scenario:</b> När Express hämtar data från databasen för att skicka tillbaka ett svar, råkar API:et skicka med för mycket information i JSON-objektet (t.ex. lösenordshashar eller interna system-ID:n) som sedan exponeras i användarens Browser.



<b>2. Fyra säkerhetskrav formulerade i kravspecifikationen</b>
För att motverka de identifierade hoten ovan och säkra tillitsgränserna sätts följande krav:

<b>Krav 1: Kryptering i rörelse (Motverkar T och I på dataflödena)</b>
Applikationen ska tvinga fram krypterad HTTPS-kommunikation för alla anrop och svar mellan Browser, Frontend och Express för att förhindra avlyssning och manipulering av data i rörelse.


<b>Krav 2: Indatavalidering på serversidan (Motverkar T i HTTP-anrop)</b>
Express-backenden ska validera och rensa all indata från inkommande HTTP-anrop innan den bearbetas eller skickas vidare till Databasen, för att stoppa injektionsattacker och XSS.


<b>Krav 3: Strikt behörighetskontroll vid dataändring (Motverkar E i Express)</b>
Användaren ska i inloggat läge endast kunna redigera och radera sina egna meddelanden; Express-backenden måste verifiera att den autentiserade användarens ID matchar meddelandets ägar-ID innan ändringen godkänns i Databasen.


<b>Krav 4: Rate Limiting för resursskydd (Motverkar D i Express)</b>
Express/API:et ska begränsa antalet tillåtna HTTP-anrop per IP-adress (t.ex. max 100 anrop per minut) för att skydda applikationen mot DoS överbelastning och automatiserade brute force-attacker.
