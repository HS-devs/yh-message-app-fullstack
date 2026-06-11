import "dotenv/config"
import helmet from "helmet"
import cors from "cors"
import express from "express"
import mongoose from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { Message } from "./models/Message.js"
import { User } from "./models/User.js"
import { authenticateUser } from "./middleware/auth.js"
import "./config/db.js"
import listEndpoints from "express-list-endpoints"

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set in .env")

const PORT = process.env.PORT || "3000"
const app = express()
app.use(helmet())
app.use(cors({
  origin: "*",
}))
app.use(express.json())

app.get("/", (req, res) => {
  res.send(listEndpoints(app))
})

app.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body

    if (!username || username.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Username must be at least 2 characters" })
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.trim() }]
    })

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? "email" : "username"
      return res.status(400).json({
        success: false,
        message: `A user with this ${field} already exists`
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new User({ username: username.trim(), email, password: hashedPassword })
    await user.save()

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    )

    res.status(201).json({
      success: true,
      message: "User created successfully",
      response: {
        username: user.username,
        id: user._id,
        accessToken,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Could not create user",
      error: error,
    })
  }
})

app.post("/login", async (req, res) => {
  try {
    const { login, password } = req.body
    const user = await User.findOne({
      $or: [{ username: login }, { email: login }]
    })

    // 1. SKAPA EN DUMMY-HASH: Den används bara om användaren INTE hittas.
    const dummyHash = "$2b$10$AzR7R.JvG7p0H2A9kYvOLeEa8yI1yZpE8fXfH1g7m7f8i9o0p1q2r"

    // 2. VÄLJ STRÄNG ATT JÄMFÖRA MED: Finns användaren? Ta dess riktiga hash. Finns den inte? Ta dummy-hashen.
    const hashToCompare = user ? user.password : dummyHash

    // 3. KÖR BCRYPT: Detta tar alltid ~80-100ms och stoppar timing-attacker
    const passwordMatch = await bcrypt.compare(password, hashToCompare)

    // 4. KONTROLLERA OM NÅGOT GICK FEL: 
    // Om användaren inte fanns ELLER om lösenordet inte matchade, skicka samma fel.
    if (!user || !passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password",
        response: null,
      })
    }

    // 5. LYCKAD INLOGGNING: Hit kommer koden BARA om både användaren fanns OCH lösenordet var rätt!
    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    )

    res.status(200).json({
      success: true,
      message: "Login successful",
      response: {
        username: user.username,
        id: user._id,
        accessToken,
      },
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
})


    // SÄKERHETSFÖRBÄTTRING: Generellt felmeddelande för inloggning
    // Ändra felmeddelande för att inte avslöja om det var användarnamnet eller lösenordet som var felaktigt.
    // Detta är en säkerhetsåtgärd för att förhindra att angripare får information om vilka användarnamn som finns i systemet.
    // Vi returnerar samma felmeddelande oavsett om det var användarnamnet eller lösenordet som var fel.
    // Exempel på ändrat felmeddelande: message: "Invalid login or password"
    //Dataläcka med felmeddelande. FRÅN FAS 1: Hot mot pilen "JSON-svar" (I - Information Disclosure): Läckage av känslig data.
    // Angriparen får reda på om användaren redan finns eller inte eftersom svaret är "Password is incorrect" eller "No account found with that username or email". 
    // För att undvika detta bör vi använda ett generellt felmeddelande som inte avslöjar vilken del av inloggningen som misslyckades.
    // Givet val för angripare att använda Brute Force/Denail of Service (DoS) i STRIDE, där de kan försöka gissa lösenordet genom att göra många inloggningsförsök.
    // Lägga till en Rate Limiter som en spärr specifikt för inloggningen (Krav 4 FRÅN FAS 1). Max 5 försök/15 min per IP-adress.
    
//const rateLimit = require("express-rate-limit");

// 1. Skapa spärr:
// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, 
//   max: 5, 
//   message: { success: false, message: "Too many login attempts, please try again later." }
// });

// 2. APPLICERA SPÄRR: Lägg till 'loginLimiter' i endpointen
// app.post("/login", loginLimiter, async (req, res) => {
//   try {
//     const { login, password } = req.body
//     const user = await User.findOne({
//       $or: [{ username: login }, { email: login }]
//     })

// 3. MODIFIERAT FELMEDDELANDE 1: Säg inte att kontot saknas utan generellt meddelande:
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid username, email or password",
//         response: null,
//       })
//     }

//     const passwordMatch = await bcrypt.compare(password, user.password)

// (!passwordMatch) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid username, email or password",
//         response: null,
//       })
//     }


    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    )

    res.json({
      success: true,
      message: "Logged in successfully",
      response: {
        username: user.username,
        id: user._id,
        accessToken,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error,
    })
  }
})

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id)

app.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: "desc" })
      .limit(20)
      .populate("user", "username")
      .exec()
    res.json(messages)
  } catch (error) {
    res.status(500).json({ message: "Could not fetch messages" })
  }
})
//Rate Limiting för resursskydd, gäller Denial of Service (överbelastning) i STRIDE. En angripare kan skicka detta anrop 50 000 gånger i sekunden och krascha servern.
//Vi bör lägga till en blockering (en limiter) som stoppar en angripare från att göra för många anrop per minut.
//Vi föreslår att använda Rate Limiting-middleware (express-rate-limit)
//Node.js använder standardverktyget express-rate-limit för att lösa detta. Det läggs till högst upp i filen, och sedan appliceras det på endpoint.

// 1. Importera verktyget för hastighetsbegränsning (detta görs över app.get)
// const rateLimit = require("express-rate-limit");

// 2. Definiera reglerna: Max 100 anrop per 15 minuter från samma IP (detta läggs under Const rateLimit)
// const messageLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minuter i millisekunder
//   max: 100, // Begränsa varje IP till 100 anrop per fönster
//   message: { error: "Too many requests, please try again later." }
// });

// 3. Lägg till 'messageLimiter' som ett filter i din existerande app.get-kod 
// app.get("/messages", messageLimiter, async (req, res) => {



app.post("/messages", authenticateUser, async (req, res) => {
  const message = new Message({ message: req.body.message, user: req.user._id })
  try {
    const saved = await message.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: "Could not save message", errors: err.errors })
  }
})

app.patch("/messages/:id", authenticateUser, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: "Message not found" })

    if (message.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only edit your own messages" })
    }

    message.message = req.body.editedMessage
    await message.save()
    const updated = await message.populate("user", "username")
    res.json(updated)
  } catch (error) {
    res.status(400).json({ error: "Could not update message" })
  }
})

// För att säkerställa att endast ägaren av ett meddelande kan redigera det, kontrollerade vi att i PATCH-routen för uppdatering av meddelanden.
// Detta fanns redan och den jämför den inloggade användarens ID (från JWT-token) med det userId som är kopplat till meddelandet i databasen.

// Dock saknas Krav 2 (Indatavalidering) FRÅN FAS 1 i både app.post och app.patch: 
// Meddelanden valideras inte i båda endpoints. Via meddelanden kan en angripare skicka skadlig kod som sparas blint rakt in i databasen.
// Applikationen är helt öppen för XSS. Modifiera koden så meddelandet städas innan den skickas till databasen.


app.delete("/messages/:id", async (req, res) => { 
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: "Message not found" })
    }

    await message.deleteOne()
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ error: "Could not delete message" })
  }
})

// Hit kommer koden BARA om kontrollen nedan var godkänd (flyttad text)
//Strikt behörighetskontroll vid dataändring. Motverkar E (Elevation of Privilege) i STRIDE inom Express. 
// Koden raderar meddelandet utan att kontrollera vem användaren är. 
// Vi måste modifiera koden så att den jämför den inloggade användarens ID med meddelandets userId innan raderingen tillåts.
// 1. Vi lägger till "authenticateUser" här för att tvinga fram inloggning och få fram användarens ID
// 2. NY KONTROLL: Vi jämför meddelandets ägare med den inloggade användaren.
    // Vi gör om ID till text (.toString()) för att datorn ska kunna jämföra dem korrekt.
    // if (message.user.toString() !== req.user.userId.toString()) {
    //   // Om det INTE är samma person, stoppar vi anropet med felkod 403 (Förbjudet)
    //   return res.status(403).json({ error: "You are not authorized to delete this message" })


app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
