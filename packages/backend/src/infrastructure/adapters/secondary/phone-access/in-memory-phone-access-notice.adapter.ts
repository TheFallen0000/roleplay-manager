import type {
  PhoneAccessNotice,
  PhoneAccessNoticeStore,
} from "../../../../domain/ports/phone-access-notice"

/** Keeps only the most recent automatic disable notice. */
export class InMemoryPhoneAccessNoticeStore implements PhoneAccessNoticeStore {
  private notice: PhoneAccessNotice | null = null

  record(notice: PhoneAccessNotice): void {
    this.notice = notice
  }

  latest(): PhoneAccessNotice | null {
    return this.notice
  }
}
