import type { ImageMetadata } from "astro"

import chatMobileEn from "../assets/screenshots/en/chat-mobile.webp"
import chatAltEn from "../assets/screenshots/en/chat-visual-novel-alt.webp"
import chatDesktopEn from "../assets/screenshots/en/chat-visual-novel-desktop.webp"
import welcomeEn from "../assets/screenshots/en/welcome-sakura-desktop.webp"
import chatMobileEs from "../assets/screenshots/es/chat-mobile.webp"
import chatAltEs from "../assets/screenshots/es/chat-visual-novel-alt.webp"
import chatDesktopEs from "../assets/screenshots/es/chat-visual-novel-desktop.webp"
import libraryEs from "../assets/screenshots/es/library-dark-desktop.webp"
import welcomeEs from "../assets/screenshots/es/welcome-sakura-desktop.webp"
import type { Locale } from "../i18n"

export interface LocaleScreenshots {
  hero: ImageMetadata
  chat: ImageMetadata
  themes: ImageMetadata
  phone: ImageMetadata
  feature: ImageMetadata
  library?: ImageMetadata
}

export const screenshots: Record<Locale, LocaleScreenshots> = {
  en: {
    hero: chatDesktopEn,
    chat: chatAltEn,
    themes: welcomeEn,
    phone: chatMobileEn,
    feature: chatAltEn,
  },
  es: {
    hero: chatDesktopEs,
    chat: chatAltEs,
    themes: welcomeEs,
    phone: chatMobileEs,
    feature: libraryEs,
    library: libraryEs,
  },
}
