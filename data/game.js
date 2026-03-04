import { getProfile } from "./js/interview.js"
import { generateAvatar } from "./js/avatar.js"
import { createGame, nextMonth } from "./js/gameEngine.js"
import { randomEvent } from "./js/events.js"

let state

document.getElementById("start").addEventListener("click",()=>{

  const profile = getProfile()

  generateAvatar(profile)

  state = createGame(profile)

  console.log(state)

})


document.getElementById("nextMonth").addEventListener("click",()=>{

  state = nextMonth(state)

  state = randomEvent(state)

  console.log(state)

})
