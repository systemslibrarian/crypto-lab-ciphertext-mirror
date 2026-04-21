export type MlKemLevel = 512 | 768 | 1024

export type MirrorState = 'glowing' | 'cracked' | 'clouded' | 'hardened'

export type RealityContent = {
  paper: string
  whatPaperShows: string
  whatSimModels: string[]
  whatSimDoesNotModel: string[]
}

export type ScholarMeta = {
  title: string
  year: number
  eprintId: string
  authorLine: string
  url: string
}
