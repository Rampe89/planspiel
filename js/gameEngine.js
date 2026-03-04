import { jobs } from "../data/jobs.js"
import { livingCosts } from "../data/livingCosts.js"

export function createGame(profile){

  const income = jobs[profile.field][profile.path]

  const rent = livingCosts[profile.living]

  return {

    month:1,
    money:500,
    income:income,
    rent:rent,
    savings:0

  }
}


export function nextMonth(state){

  state.month++

  state.money += state.income

  state.money -= state.rent

  return state

}
