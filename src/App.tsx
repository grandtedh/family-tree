import { useEffect, useMemo, useState } from "react"
import "./App.css"
import jacquard, { interpretJacquard } from "./wasm-interop/jacquard"
import { familyData } from "../families/familydata"
import relationships from "./wasm-interop/relationships"
import {
  Family,
  getFamilyTree,
  type FamilyTree,
} from "@family-tree/trees/family"

const families = import.meta.glob("@families/*.json")

function App() {
  const [getCoefsFunction, setGetCoefsFunction] = useState<Awaited<
    ReturnType<typeof jacquard>
  > | null>(null)
  const [getRelationshipsFunction, setGetRelationshipsFunction] =
    useState<Awaited<ReturnType<typeof relationships>> | null>(null)

  const [family, setFamily] = useState("")
  const [familyTree, setFamilyTree] = useState<FamilyTree | null>(null)
  const [a, setA] = useState("")
  const [b, setB] = useState("")

  const relationship = useMemo(() => {
    if (!getCoefsFunction) {
      return null
    }
    const coefs = getCoefsFunction(a, b)
    if (!coefs) {
      return null
    }
    return interpretJacquard(coefs)
  }, [getCoefsFunction, a, b])

  const relationshipArray = useMemo(() => {
    if (!getRelationshipsFunction) {
      return null
    }
    const relationships = getRelationshipsFunction(a, b)
    if (!relationships) {
      return null
    }
    return relationships
  }, [getRelationshipsFunction, a, b])

  useEffect(() => {
    async function updateFamilyTree() {
      const fileName = `/families/${family}.json`
      const familyInput =
        families[fileName] !== undefined
          ? await families[fileName]()
          : undefined
      const result = Family.safeParse(
        typeof familyInput === "object" &&
          familyInput !== null &&
          "default" in familyInput
          ? familyInput.default
          : undefined,
      )
      if (!result.success) {
        console.error(result.error)
        setGetCoefsFunction(null)
        setGetRelationshipsFunction(null)
        return
      }
      const { warnings, familyTree } = getFamilyTree(result.data)
      for (const warning of warnings) {
        console.error(`Warning parsing file ${fileName}: ${warning.message}`)
      }
      jacquard(familyTree).then((getCoefsFunction) => {
        setGetCoefsFunction(() => getCoefsFunction)
      })
      relationships(familyTree).then((getRelationshipsFunction) => {
        setGetRelationshipsFunction(() => getRelationshipsFunction)
      })
    }

    updateFamilyTree()
  }, [family])

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
        <p className="counter">{JSON.stringify(relationshipArray)}</p>
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
