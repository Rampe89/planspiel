export function getProfile(){

  const profile = {

    path: document.getElementById("path").value,
    field: document.getElementById("field").value,
    living: document.getElementById("living").value,
    family: document.getElementById("family").value

  }

  return profile
}
