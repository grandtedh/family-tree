import { useEffect, useState } from "react"
import reactLogo from "./assets/react.svg"
import viteLogo from "./assets/vite.svg"
import heroImg from "./assets/hero.png"
import "./App.css"
import { familyTree, getAncestorTree, getRelationships } from "./family-tree"
import createModule from "../wasm/dist/jacquard.js"

function App() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    async function invokeModule() {
      const module = await createModule()
      const treeInput = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50]
      const ptr = module._malloc(10 * 2)
      module.HEAPU16.set(treeInput, ptr / 2)

      const jacquard = module.cwrap('jacquard', 'number' , ['number', 'number'])
      const outPtr = jacquard(ptr, 5)
      module._free(ptr)
      const outArray = module.HEAPF64.slice(outPtr / 8, outPtr / 8 + 9)
      module._free(outPtr)
      return outArray
    }

    invokeModule().then(value => console.log(value)
    )
    const ancestorTree = getAncestorTree(familyTree)

    const relationships = getRelationships(ancestorTree, "Max", "Ashley")
    console.log(relationships)
    console.log(relationships[0]!.left!.child === relationships[1]!.left!.child)
    console.log(
      relationships[0]!.right!.child === relationships[1]!.right!.child,
    )
  })

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
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
            <li>
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
            </li>
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
