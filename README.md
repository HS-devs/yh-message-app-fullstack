# yh-message-app-fullstack
Sarah Tjellander
- Har testat formulera texten på inlämning FAS 1 enligt Markdown guide på Dicso

Nathalie Loyd

Henrik Söderqvist

Server.js app.delete rad 238-251
- Jag har föreslagit en kodändring med förklaring. 

Index.css 
- OKad

Server.js app.get rad 169-180
- Jag har föreslagt en kodändring med förklaring.

Sever.js app.patch rad 211-228
- Lagt till kommentar att meddelanden behöver valideras innan dem sparas i databasen. För undvika att skadlig kod skrivs in.


Backend .env.exemple 
- dubbelkolla att http adressen endast används i utveckling .ent.exempel och inte i produktionskod.
- Inte hittat något, BASE_API använder https. 


Server.js app.post rad 76-98
- Risk: Information Disclosure och Brute Force. Krav: Rate Limiting

Frontend src i alla .jsx - Lagt kommentar i App.jsx
- Klassiskt utvecklarmisstag. Ta bort: console.log helt och hållet.

