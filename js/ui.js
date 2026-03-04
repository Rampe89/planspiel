export function updateDashboard(state){

  document.getElementById("money").innerText =
    state.money + " €"

  document.getElementById("month").innerText =
    state.month

}
