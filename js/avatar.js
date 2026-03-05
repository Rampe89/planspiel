export function generateAvatar(profile) {

  // We draw the avatar in a 16x16 "pixel space" and scale it up crisply.
  // The old version relied on CSS scaling which can look blurry in browsers.
  const canvas = document.getElementById("avatar")
  const ctx = canvas.getContext("2d")

  const BASE = 16
  const SCALE = 12              // 16 * 12 = 192px (matches CSS)
  const OUT = BASE * SCALE

  // Ensure the canvas resolution matches the displayed size.
  if (canvas.width !== OUT || canvas.height !== OUT) {
    canvas.width = OUT
    canvas.height = OUT
  }

  // Offscreen buffer for nearest-neighbor scaling
  const off = document.createElement("canvas")
  off.width = BASE
  off.height = BASE
  const octx = off.getContext("2d")
  octx.clearRect(0, 0, BASE, BASE)

  const skinColors = ["#F2D6CB","#E7C0A6","#D7A27F","#B97E57"]
  const hairColors = ["#111","#663300","#444","#7C3AED"]
  const shirts = ["#2563EB","#16A34A","#F97316","#DB2777"]

  const skin = skinColors[Math.floor(Math.random()*skinColors.length)]
  const hair = hairColors[Math.floor(Math.random()*hairColors.length)]
  const shirt = shirts[Math.floor(Math.random()*shirts.length)]

  function px(x,y,c){
    octx.fillStyle=c
    octx.fillRect(x,y,1,1)
  }

  function rect(x,y,w,h,c){
    octx.fillStyle=c
    octx.fillRect(x,y,w,h)
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

  // Draw scaled to main canvas with smoothing disabled
  ctx.clearRect(0, 0, OUT, OUT)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(off, 0, 0, OUT, OUT)
}
