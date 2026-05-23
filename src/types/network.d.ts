// Network Information API — not yet in lib.dom.d.ts
interface NetworkInformation {
  effectiveType?: string
  saveData?:      boolean
  addEventListener(type: string, listener: () => void): void
  removeEventListener(type: string, listener: () => void): void
}

declare global {
  interface Navigator {
    readonly connection?: NetworkInformation
  }
}

export {}
