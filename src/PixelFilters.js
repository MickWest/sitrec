// For a webworker based filter, see

function filterNoise(p) {
  const len = p.length;
  for (let i = 0; i < len / 4; i++) {
    // p[i*4 + 0] += Math.random()*100
    // p[i*4 + 1] += Math.random()*100
    // p[i*4 + 2] += Math.random()*100
    p[i * 4 + 0] += 50;
  }
}
