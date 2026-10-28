import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import sitemap from "@astrojs/sitemap"

export default defineConfig({
  site: "https://roleplay-manager.com",
  output: "static",
  security: {
    // The static site only serves its own assets. The bootstrap script is
    // external (`/site-bootstrap.js`), so script-src can stay on 'self';
    // Starlight still needs inline style elements and React-style attributes.
    csp: {
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "img-src 'self' data:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "media-src 'self'",
        "manifest-src 'self'",
        "worker-src 'self' blob:",
        "form-action 'self'",
      ],
      scriptDirective: { resources: ["'self'"] },
      styleDirective: {
        resources: [
          { resource: "'self'", kind: "element" },
          { resource: "'unsafe-inline'", kind: "element" },
          { resource: "'unsafe-inline'", kind: "attribute" },
        ],
      },
    },
  },
  integrations: [
    starlight({
      title: "Roleplay Manager",
      description:
        "Documentation for Roleplay Manager: installation, AI providers, characters, memory, branches, phone access and backups.",
      logo: {
        src: "./src/assets/brand/face-96.png",
        alt: "Roleplay Manager",
      },
      favicon: "/favicon-32x32.png",
      locales: {
        root: { label: "English", lang: "en" },
        es: { label: "Español" },
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/TheFallen0000/roleplay-manager",
        },
      ],
      editLink: {
        baseUrl:
          "https://github.com/TheFallen0000/roleplay-manager/edit/master/",
      },
      lastUpdated: false,
      credits: false,
      disable404Route: true,
      customCss: ["./src/styles/starlight.css"],
      components: {
        Header: "./src/components/starlight/Header.astro",
      },
      sidebar: [
        {
          label: "Getting started",
          translations: { es: "Empezar" },
          items: [
            {
              slug: "docs/getting-started/what-is-roleplay-manager",
              label: "What is Roleplay Manager?",
              translations: { es: "¿Qué es Roleplay Manager?" },
            },
            {
              label: "Installation",
              translations: { es: "Instalación" },
              items: [
                {
                  slug: "docs/getting-started/installation/windows",
                  label: "Windows",
                  translations: { es: "Windows" },
                },
                {
                  slug: "docs/getting-started/installation/linux-macos",
                  label: "Linux and macOS",
                  translations: { es: "Linux y macOS" },
                },
              ],
            },
            {
              slug: "docs/getting-started/first-steps",
              label: "First steps",
              translations: { es: "Primeros pasos" },
            },
          ],
        },
        {
          label: "Guides",
          translations: { es: "Guías" },
          items: [
            {
              slug: "docs/guides/providers",
              label: "AI providers",
              translations: { es: "Proveedores de IA" },
            },
            {
              slug: "docs/guides/characters-and-branches",
              label: "Characters and branches",
              translations: { es: "Personajes y ramas" },
            },
            {
              slug: "docs/guides/memory-and-summaries",
              label: "Memory and summaries",
              translations: { es: "Memoria y resúmenes" },
            },
            {
              slug: "docs/guides/phone-access",
              label: "Phone access",
              translations: { es: "Acceso desde el teléfono" },
            },
            {
              slug: "docs/guides/data-and-updates",
              label: "Data and updates",
              translations: { es: "Datos y actualizaciones" },
            },
          ],
        },
        {
          label: "Reference",
          translations: { es: "Referencia" },
          items: [
            {
              slug: "docs/reference/troubleshooting",
              label: "Troubleshooting",
              translations: { es: "Solución de problemas" },
            },
            {
              slug: "docs/reference/glossary",
              label: "Glossary",
              translations: { es: "Glosario" },
            },
          ],
        },
        {
          label: "Contributing",
          translations: { es: "Contribuir" },
          items: [
            {
              slug: "docs/contributing/development",
              label: "Development",
              translations: { es: "Desarrollo" },
            },
          ],
        },
      ],
    }),
    sitemap(),
  ],
})
