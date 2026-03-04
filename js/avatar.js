export function generateAvatar(profile) {

  const canvas = document.getElementById("avatar")
  const ctx = canvas.getContext("2d")

  ctx.clearRect(0,0,16,16)

  const skinColors = ["#F2D6CB","#E7C0A6","#D7A27F","#B97E57"]
  const hairColors = ["#111","#663300","#444","#7C3AED"]
  const shirts = ["#2563EB","#16A34A","#F97316","#DB2777"]

  const skin = skinColors[Math.floor(Math.random()*skinColors.length)]
  const hair = hairColors[Math.floor(Math.random()*hairColors.length)]
  const shirt = shirts[Math.floor(Math.random()*shirts.length)]

  function px(x,y,c){
    ctx.fillStyle=c
    ctx.fillRect(x,y,1,1)
  }

  function rect(x,y,w,h,c){
    ctx.fillStyle=c
    ctx.fillRect(x,y,w,h)
  }

  rect(5,2,6,6,skin)
  rect(7,8,2,1,skin)

  px(7,5,"black")
  px(9,5,"black")

  rect(5,2,6,2,hair)

  rect(5,9,6,4,shirt)

  rect(4,10,1,2,skin)
  rect(11,10,1,2,skin)

  rect(5,13,6,3,"#333")
}
