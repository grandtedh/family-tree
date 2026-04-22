import { useEffect, useMemo, useState } from "react"
import "@family-tree/App.css"
import jacquard, { interpretJacquard } from "@family-tree/wasm-interop/jacquard"
import relationships, {
  relationshipToString,
} from "@family-tree/wasm-interop/relationships"
import {
  Family,
  type FamilyTree,
  getFamilyTree,
} from "@family-tree/trees/family"

const families = import.meta.glob<{ default: {} }>("@families/*.json", {
  eager: true,
})

function App() {
  const [getCoefsFunction, setGetCoefsFunction] = useState<Awaited<
    ReturnType<typeof jacquard>
  > | null>(null)
  const [getRelationshipsFunction, setGetRelationshipsFunction] =
    useState<Awaited<ReturnType<typeof relationships>> | null>(null)

  const [family, setFamily] = useState("")
  const [familyTree, setFamilyTree] = useState<FamilyTree | null>(null)
  const [aId, setA] = useState("")
  const a = familyTree?.get(aId) ?? null
  const [bId, setB] = useState("")
  const b = familyTree?.get(bId) ?? null

  const relationship = useMemo(() => {
    if (!getCoefsFunction) {
      return null
    }
    const coefs = getCoefsFunction(aId, bId)
    if (!coefs) {
      return null
    }
    return interpretJacquard(coefs)
  }, [getCoefsFunction, aId, bId])

  const relationshipArray = useMemo(() => {
    if (!getRelationshipsFunction) {
      return null
    }
    const relationships = getRelationshipsFunction(aId, bId)
    if (!relationships) {
      return null
    }
    return relationships
      .sort((a, b) => Math.abs(a.removal) - Math.abs(b.removal))
      .sort((a, b) => Math.abs(a.cousinship) - Math.abs(b.cousinship))
  }, [getRelationshipsFunction, aId, bId])

  useEffect(() => {
    const fileName = `/families/${family}.json`
    if (!(fileName in families)) {
      return
    }
    const result = Family.safeParse(families[fileName]?.default)
    if (!result.success) {
      console.error(result.error)
      setGetCoefsFunction(null)
      setGetRelationshipsFunction(null)
      return
    }
    const { warnings, familyTree } = getFamilyTree(result.data)
    if (warnings.length > 0) {
      console.error(`${warnings.length} warning(s) while parsing ${fileName}`)
    }
    for (const warning of warnings) {
      console.error(`Warning parsing file ${fileName}: ${warning.message}`)
    }
    setFamilyTree(familyTree)
  }, [family])

  useEffect(() => {
    if (familyTree === null) {
      return
    }
    jacquard(familyTree).then((getCoefsFunction) => {
      setGetCoefsFunction(() => getCoefsFunction)
    })
    relationships(familyTree).then((getRelationshipsFunction) => {
      setGetRelationshipsFunction(() => getRelationshipsFunction)
    })
  }, [familyTree])

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
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            placeholder="Family"
          />
          <input
            value={aId}
            onChange={(e) => setA(e.target.value)}
            placeholder="A input"
          />
          <input
            value={bId}
            onChange={(e) => setB(e.target.value)}
            placeholder="B input"
          />
        </div>
        <p className="counter">{JSON.stringify(relationship)}</p>
        <p className="counter">{JSON.stringify(relationshipArray)}</p>
        <p className="counter">
          {a === null
            ? ""
            : relationshipArray
                ?.map((relationship) => relationshipToString(relationship, a))
                .join(", ")}
        </p>
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
