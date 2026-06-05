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

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No account found with that username or email",
        response: null,
      })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
        response: null,
      })
    }

    // Ändra felmeddelande för att inte avslöja om det var användarnamnet eller lösenordet som var felaktigt.
    // Detta är en säkerhetsåtgärd för att förhindra att angripare får information om vilka användarnamn som finns i systemet.
    // Vi returnerar samma felmeddelande oavsett om det var användarnamnet eller lösenordet som var fel.
    // Exempel på ändrat felmeddelande: message: "Invalid login or password"

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


app.delete("/messages/:id", async (req, res) => { 
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: "Message not found" })
    }

    // Hit kommer koden BARA om kontrollen nedan var godkänd
    await message.deleteOne()
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ error: "Could not delete message" })
  }
})

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
