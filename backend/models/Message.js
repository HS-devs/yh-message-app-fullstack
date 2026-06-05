import mongoose from "mongoose"

const messageSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Skapa en begränsning på längden av meddelandet.
// Detta är en säkerhetsåtgärd för att förhindra att användare skickar mycket långa meddelanden,
// som i sin tur kan orsaka prestandaproblem eller överbelasta databasen.

export const Message = mongoose.model("Message", messageSchema)
