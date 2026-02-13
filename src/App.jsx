import React, { useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_MEMES = [
  { title: "Cuddle mode: ON 😽", src: "/date1.jpeg" },
  { title: "A heart just for you 💗", src: "/date2.png" },
  { title: "Officially your Valentine 😝", src: "/date3.jpeg" },
]

const POP_EMOJIS = ["💗", "💖", "💘", "💕", "✨", "🌹", "🌸", "🫶"]

function clamp(n, min, max){
  return Math.max(min, Math.min(max, n))
}

function pick(arr){
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function App(){
  const cardRef = useRef(null)
  const playRef = useRef(null)
  const noBtnRef = useRef(null)
  const popIdRef = useRef(0)

  const [reduceMotion, setReduceMotion] = useState(false)

  const [stage, setStage] = useState("ask") // ask | date
  const [noPos, setNoPos] = useState({ left: 20, top: 118 })
  const [noHoverCount, setNoHoverCount] = useState(0)
  const [noModalOpen, setNoModalOpen] = useState(false)
  const [memes, setMemes] = useState(DEFAULT_MEMES)
  const [loadingMemes, setLoadingMemes] = useState(false)

  // Starts normal next to Yes, then becomes shy and starts dodging.
  const [noIsShy, setNoIsShy] = useState(false)

  // Decorative micro-interactions
  const [pops, setPops] = useState([]) // floating hearts/sparkles
  const [selectedMeme, setSelectedMeme] = useState(null)

  const hoverGoal = 5

  const ambientHearts = useMemo(() => {
    // Pre-baked random values so the background feels “alive” but stable.
    return Array.from({ length: 12 }, (_, id) => {
      const d = 14 + Math.random() * 16
      return {
        id,
        x: Math.random() * 100,
        s: 0.55 + Math.random() * 1.05,
        d,
        delay: -Math.random() * d,
      }
    })
  }, [])

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)")
    if(!mq) return

    const update = () => setReduceMotion(!!mq.matches)
    update()

    // Safari fallback
    if(mq.addEventListener) mq.addEventListener("change", update)
    else mq.addListener(update)

    return () => {
      if(mq.removeEventListener) mq.removeEventListener("change", update)
      else mq.removeListener(update)
    }
  }, [])

  function toCardCoords(clientX, clientY){
    const card = cardRef.current
    if(!card) return { x: 0, y: 0 }
    const r = card.getBoundingClientRect()
    return { x: clientX - r.left, y: clientY - r.top }
  }

  function addPop({ x, y, emoji, dx = 0, dy = -120, scale = 1, duration = 900 }){
    if(reduceMotion) return
    const id = popIdRef.current++

    const rot = (Math.random() * 80 - 40).toFixed(2) + "deg"
    const item = { id, x, y, emoji, dx, dy, scale, duration, rot }

    setPops((p) => [...p, item].slice(-42))

    window.setTimeout(() => {
      setPops((p) => p.filter((pp) => pp.id !== id))
    }, duration + 120)
  }

  function tapAtClient(clientX, clientY){
    const { x, y } = toCardCoords(clientX, clientY)
    addPop({
      x,
      y,
      emoji: pick(["💗", "✨", "💖"]),
      dx: (Math.random() * 60 - 30),
      dy: -(80 + Math.random() * 80),
      scale: 0.75 + Math.random() * 0.55,
      duration: 700 + Math.random() * 450,
    })
  }

  function burstAtClient(clientX, clientY, intensity = 14){
    const { x, y } = toCardCoords(clientX, clientY)
    for(let i = 0; i < intensity; i++){
      const angle = Math.random() * Math.PI * 2
      const dist = 40 + Math.random() * 140
      const dx = Math.cos(angle) * dist
      const dy = Math.sin(angle) * dist - (60 + Math.random() * 120)

      addPop({
        x,
        y,
        emoji: pick(POP_EMOJIS),
        dx,
        dy,
        scale: 0.75 + Math.random() * 1.25,
        duration: 900 + Math.random() * 520,
      })
    }
  }

  function randomizeNoPosition(){
    const play = playRef.current
    const btn = noBtnRef.current
    if(!play || !btn) return

    const pr = play.getBoundingClientRect()
    const br = btn.getBoundingClientRect()

    const pad = 12
    const maxLeft = Math.max(pad, pr.width - br.width - pad)
    const maxTop  = Math.max(pad, pr.height - br.height - pad)

    const left = clamp(Math.random() * maxLeft, pad, maxLeft)
    const top  = clamp(Math.random() * maxTop,  pad, maxTop)

    setNoPos({ left, top })
  }

  function resetAskState(){
    setStage("ask")
    setNoModalOpen(false)
    setSelectedMeme(null)
    setNoHoverCount(0)
    setNoIsShy(false)
    setTimeout(() => randomizeNoPosition(), 60)
  }

  function triggerNoMeme(){
    setNoModalOpen(true)
    setNoHoverCount(0) // reset counter as requested
  }

  function onNoHover(){
    if(!noIsShy) setNoIsShy(true)

    // Leave a tiny “oops” sparkle trail where the button *used* to be.
    const btn = noBtnRef.current
    if(btn && !reduceMotion){
      const br = btn.getBoundingClientRect()
      burstAtClient(br.left + br.width / 2, br.top + br.height / 2, 6)
    }

    randomizeNoPosition()
    setNoHoverCount((c) => {
      const next = c + 1
      if(next >= hoverGoal){
        setTimeout(() => triggerNoMeme(), 0)
        return 0
      }
      return next
    })
  }

  async function onYes(e){
    // Big romantic “confetti” burst 💞
    if(e?.clientX != null && e?.clientY != null){
      burstAtClient(e.clientX, e.clientY, 18)
    }else{
      // Keyboard fallback: burst near the top-middle of the play area
      const play = playRef.current
      if(play){
        const pr = play.getBoundingClientRect()
        burstAtClient(pr.left + pr.width / 2, pr.top + pr.height * 0.25, 16)
      }
    }

    setStage("date")
    setNoModalOpen(false)

    // Fetch from backend (Mongo-backed when configured), but gracefully fall back
    setLoadingMemes(true)
    try{
      const res = await fetch("/api/memes", { headers: { "Accept": "application/json" } })
      if(res.ok){
        const data = await res.json()
        if(Array.isArray(data) && data.length){
          setMemes(data)
        }
      }
    }catch(e){
      // ignore
    }finally{
      setLoadingMemes(false)
    }
  }

  // On first load, pre-compute a random position for when "No" starts running away.
  useEffect(() => {
    const t = setTimeout(() => randomizeNoPosition(), 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close modals on Esc
  useEffect(() => {
    function onKey(e){
      if(e.key === "Escape"){
        setNoModalOpen(false)
        setSelectedMeme(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="container">
      <div
        ref={cardRef}
        className="card"
        onPointerDown={(e) => {
          // Small hearts anywhere you tap/click (pure ✨ vibes ✨)
          if(reduceMotion) return
          if(e.pointerType === "mouse" && e.button !== 0) return
          // Don’t spam if user is selecting text
          if(window.getSelection?.()?.toString?.()) return
          tapAtClient(e.clientX, e.clientY)
        }}
      >
        {/* Decorative layers */}
        <div className="sparkles" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <div className="heartsBg" aria-hidden="true">
          {ambientHearts.map((h) => (
            <span
              key={h.id}
              className="heart"
              style={{
                "--x": `${h.x}%`,
                "--s": h.s,
                "--d": `${h.d}s`,
                "--delay": `${h.delay}s`,
              }}
            />
          ))}
        </div>
        <div className="pops" aria-hidden="true">
          {pops.map((p) => (
            <span
              key={p.id}
              className="pop"
              style={{
                left: p.x,
                top: p.y,
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
                "--rot": p.rot,
                "--scale": p.scale,
                "--dur": `${p.duration}ms`,
              }}
            >
              {p.emoji}
            </span>
          ))}
        </div>

        {/* Main content */}
        <div className="cardInner">
          <div className="header">
            <div className="brand">
              <div className="badge">🐱</div>
              <div>
                <h1>Will you be my Valentine?</h1>
                <div className="sub">Dip note: NO button is extremely shy🥰.</div>
              </div>
            </div>

            <div className="lovePill" aria-hidden="true">
              💌 crafted with love
            </div>
          </div>

          <div className="hero">
            <div className="illustration">
              <div className="roseFloat rose1">🌹</div>
              <div className="roseFloat rose2">🌹</div>
              <div className="roseFloat rose3">💗</div>

              <div className="cuteRow" aria-label="cat with roses">
                <span>🐱</span><span>🌹</span><span>🌹</span><span>💘</span>
              </div>
              <div className="caption">A tiny cat brought roses. Please say yes. It practiced all week.</div>

              <div className="banner" style={{ marginTop: 16 }}>
                <div>
                  <div className="bigLove">
                    {stage === "ask" ? "Melo, will you be my Valentine, please? 🥺" : "OAAAG!! 💞"}
                  </div>
                  <div className="smallLove">
                    {stage === "ask"
                      ? "P.S. The “No” button starts brave… then panics."
                      : "Tap a meme for a bigger look (and more hearts)."}
                  </div>
                </div>
                <div style={{ fontSize: 26 }} aria-hidden="true">✨💗🌹</div>
              </div>
            </div>

            <div className="playArea" ref={playRef}>
              {stage === "ask" ? (
                <>
                  <div className="question">So… what do you say? 💌</div>

                  <div className="buttons">
                    <button className="btn btnYes" onClick={onYes}>
                      Yes 💖
                    </button>

                    {/* Starts normal next to Yes, then becomes shy and moves around */}
                    {!noIsShy ? (
                      <button
                        ref={noBtnRef}
                        className="btn btnNo"
                        onMouseEnter={onNoHover}
                        onClick={triggerNoMeme}
                        aria-label="No button (it will try to escape)"
                      >
                        No 🙃
                      </button>
                    ) : null}
                  </div>

                  {noIsShy ? (
                    <div className="noWrap" style={{ left: noPos.left, top: noPos.top }}>
                      <button
                        ref={noBtnRef}
                        className="btn btnNo"
                        onMouseEnter={onNoHover}
                        onClick={triggerNoMeme}
                        aria-label="No button (it will try to escape)"
                      >
                        No 🙃
                      </button>
                    </div>
                  ) : null}

                  <div className="hint">Tip: tap anywhere for tiny hearts ✨</div>
                </>
              ) : (
                <>
                  <div className="dateTopRow">
                    <button className="btn btnNo" onClick={resetAskState}>
                      ← Back
                    </button>

                    <div className="dateTopText">
                      <div className="dateTopTitle">It’s a date!! 💞</div>
                      <div className="dateTopSub">
                        {loadingMemes ? "Loading cuteness…" : "Pick your favorite vibe ;D (tap to zoom)"}
                      </div>
                    </div>
                  </div>

                  <div className="bigGallery" aria-label="valentine meme gallery">
                    {memes.slice(0, 3).map((m, idx) => (
                      <button
                        key={idx}
                        className="bigMemeCard"
                        type="button"
                        onClick={() => setSelectedMeme(m)}
                        aria-label={m.title}
                        title={m.title}
                      >
                        <img src={m.src} alt={m.title} loading="lazy" />
                        <div className="bigMemeCaption">{m.title}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="footerNote">
            Made with love, sparkles, and a cat who takes romance very seriously. 😝😝💗
          </div>
        </div>

        {/* Modal: “No” meme */}
        {noModalOpen && (
          <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="No-button meme">
            <div className="modal">
              <div className="modalTop">
                <div className="modalTitle">The “No” button has been captured. 😼</div>
                <button className="closeBtn" onClick={() => setNoModalOpen(false)}>Close</button>
              </div>
              <img src="/nope.jpeg" alt="Funny cat meme (triggered by No button)" />
              <div className="modalBottom">Okay okay… that was dramatic. Still yes? 💌</div>
            </div>
          </div>
        )}

        {/* Modal: selected meme zoom */}
        {selectedMeme && (
          <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Selected meme">
            <div className="modal">
              <div className="modalTop">
                <div className="modalTitle">{selectedMeme.title}</div>
                <button className="closeBtn" onClick={() => setSelectedMeme(null)}>Close</button>
              </div>
              <img src={selectedMeme.src} alt={selectedMeme.title} />
              <div className="modalBottom">A little souvenir of our date night 💞</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
