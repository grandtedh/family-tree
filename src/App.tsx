import { useEffect, useMemo, useState } from "react"
import "./App.css"
import jacquard, { interpretJacquard } from "./wasm-interop/jacquard"
import { familyData } from "../families/familydata"
import relationships from "./wasm-interop/relationships"

const ids: Record<string, number> = {}
// const names = [""]
for (let i = 0; i < familyData.length; i++) {
  ids[familyData[i]!.name.trim()] = i + 1
  // names.push(familyData[i]!.name.trim())
}
const tree: [number, number][] = [[0, 0]]
for (const person of familyData) {
  tree.push([
    ids[person.mother.trim()] ?? 0,
    ids[person.father.split("&")[0]!.trim()] ?? 0,
  ])
}
for (let i = 0; i < tree.length; i++) {
  const descent = tree[i]!
  if (descent[0] && !descent[1]) {
    descent[1] = tree.length
    tree.push([0, 0])
  } else if (descent[1] && !descent[0]) {
    descent[0] = tree.length
    tree.push([0, 0])
  }
}

function App() {
  const [getCoefsFunction, setGetCoefsFunction] = useState<Awaited<
    ReturnType<typeof jacquard>
  > | null>(null)
  const [getRelationshipsFunction, setGetRelationshipsFunction] =
    useState<Awaited<ReturnType<typeof relationships>> | null>(null)

  const [a, setA] = useState("")
  const [b, setB] = useState("")

  const relationship =
    getCoefsFunction !== null && ids[a] && ids[b]
      ? interpretJacquard(getCoefsFunction(ids[a], ids[b]))
      : null

  const relationshipArray =
    getRelationshipsFunction !== null && ids[a] && ids[b]
      ? getRelationshipsFunction(ids[a], ids[b])
      : null

  useEffect(() => {
    jacquard(tree).then((getCoefsFunction) => {
      setGetCoefsFunction(() => getCoefsFunction)
    })
    relationships(tree).then((getRelationshipsFunction) => {
      setGetRelationshipsFunction(() => getRelationshipsFunction)
    })
  }, [])

  if (relationshipArray) {
    console.log(relationshipArray)
  }

  return (
    <>
      <section id="center">
        {/* <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div> */}
        <div>
          <h1>Get started</h1>
          <input
            value={a}
            onChange={(e) => setA(e.target.value)}
            placeholder="A input"
          />
          <input
            value={b}
            onChange={(e) => setB(e.target.value)}
            placeholder="B input"
          />
        </div>
        <p className="counter">{JSON.stringify(relationship)}</p>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            {/* <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li> */}
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
