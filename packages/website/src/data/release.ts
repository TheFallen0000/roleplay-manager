import releaseData from "./release.json"

export interface ReleaseAsset {
  name: string
  url: string
  size: number
  sizeLabel: string
}

export interface Release {
  version: string
  tag: string
  publishedAt: string
  htmlUrl: string
  assets: Record<string, ReleaseAsset>
}

export const release = releaseData as Release

export const getAsset = (key: string): ReleaseAsset | undefined =>
  release.assets[key]
