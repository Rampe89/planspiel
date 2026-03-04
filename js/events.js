import { events } from "../data/eventsData.js"

export function randomEvent(state){

  const e = events[Math.floor(Math.random()*events.length)]

  if(e.cost){
    state.money += e.cost
  }

  if(e.gain){
    state.money += e.gain
  }

  alert(e.text)

  return state
}
