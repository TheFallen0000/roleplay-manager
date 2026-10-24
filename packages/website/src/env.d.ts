/// <reference types="astro/client" />

declare module "virtual:starlight/user-config" {
  const config: {
    pagefind?: boolean
    components?: Record<string, string>
    [key: string]: unknown
  }
  export default config
}

declare module "virtual:starlight/components/*" {
  const component: any
  export default component
}
