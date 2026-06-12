# Inlämning 3 - Granskningsfasen

Granskningsrapport – Fas 3

I granskningen har vi gått igenom applikationen utifrån de säkerhetskrav som sattes i
fas 1. Fokus har legat på kommunikationen mellan frontend och backend, hantering av användarinloggning, behörighetskontroll och skydd mot för många anrop.

De verktyg som har varit mest relevanta för projektet är CodeQL och Dependabot. CodeQL används för att hitta riskabla kodmönster, medan Dependabot används för att upptäcka sårbara eller gamla dependencies.
Utöver verktygen har vi även gjort en manuell granskning och tagit hjälp av andra LLM:er, eftersom vissa brister såsom console.log inte alltid upptäcks automatiskt.

En av de tydligaste säkerhetsbristerna är att backend behöver vara den plats där behörighet kontrolleras, till exempel vem som har behörighet att radera meddelanden i appen.
Frontend kan dölja knappar och styra användarflödet, men det räcker inte som säkerhet.
En användare kan alltid skicka anrop direkt mot API:t.
Därför bör routes som ändrar eller raderar data alltid kräva autentisering och kontrollera att användaren äger den data som ändras.
Detta kopplas till OWASP: Broken Access Control.

Vi identifierade även att login-flödet bör skyddas bättre. Felmeddelanden vid misslyckad inloggning bör vara generiska, så att systemet inte avslöjar om användarnamnet eller lösenordet var fel.
Dessutom bör rate limiting införas på login och andra känsliga routes för att minska risken för brute force och DoS-liknande belastning vilket vi kan koppla till
OWASP: Identification and Authentication Failures, eftersom det handlar om att stärka autentiseringsflödet och skydda inloggningen från missbruk.

I frontend bör loggar som skriver ut användardata eller access token tas bort.
Sådana loggar kan vara användbara under utveckling, men i färdig kod innebär de en onödig risk för informationsläckage.

Sammanfattningsvis bedömer vi att applikationen har en fungerande säkerhetsgrund, men att några viktiga förbättringar behövs.
De viktigaste åtgärderna är att stärka behörighetskontrollen i backend, lägga till tydligare server-side validering, införa rate limiting och ta bort onödiga loggar av känslig information.

Vidare så inser vi också vikten av att inte lita fullt ut på AI-verktyg, och att korsreferera information såsom problem och lösningar.
Men även vara uppmärksam även om det inte flaggas för några problem, kan vara att just det verktyget inte flaggar för det specifika problemet.
Därför är det viktigt att inte förlita sig ett specifikt verktyg, och om möjligheten finns, göra manuella tester och be kollegor om stöd.
