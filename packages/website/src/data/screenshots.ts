import type { ImageMetadata } from "astro"

import chatMobileAliceEn from "../assets/screenshots/en/chat-mobile-alice.webp"
import chatMobileEn from "../assets/screenshots/en/chat-mobile.webp"
import chatAltEn from "../assets/screenshots/en/chat-visual-novel-alt.webp"
import libraryEn from "../assets/screenshots/en/library-dark-desktop.webp"
import welcomeEn from "../assets/screenshots/en/welcome-sakura-desktop.webp"
import chatMobileAliceEs from "../assets/screenshots/es/chat-mobile-alice.webp"
import chatMobileEs from "../assets/screenshots/es/chat-mobile.webp"
import chatAltEs from "../assets/screenshots/es/chat-visual-novel-alt.webp"
import libraryEs from "../assets/screenshots/es/library-dark-desktop.webp"
import welcomeEs from "../assets/screenshots/es/welcome-sakura-desktop.webp"
import type { Locale } from "../i18n"

export interface LocaleScreenshots {
  welcome: ImageMetadata
  library: ImageMetadata
  chat: ImageMetadata
  galleryPhone: ImageMetadata
  phone: ImageMetadata
  feature: ImageMetadata
}

export const screenshots: Record<Locale, LocaleScreenshots> = {
  en: {
    welcome: welcomeEn,
    library: libraryEn,
    chat: chatAltEn,
    galleryPhone: chatMobileAliceEn,
    phone: chatMobileEn,
    feature: libraryEn,
  },
  es: {
    welcome: welcomeEs,
    library: libraryEs,
    chat: chatAltEs,
    galleryPhone: chatMobileAliceEs,
    phone: chatMobileEs,
    feature: libraryEs,
  },
}
