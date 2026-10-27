import type { PhoneAccessNoticeDTO } from "@workspace/shared/types/phone-access"

import type { PhoneAccessNoticeStore } from "../../../domain/ports/phone-access-notice"

export class GetPhoneAccessNoticeUseCase {
  constructor(private readonly notices: PhoneAccessNoticeStore) {}

  execute(): PhoneAccessNoticeDTO | null {
    const notice = this.notices.latest()
    if (!notice) return null

    return {
      mode: notice.mode,
      minutes: notice.minutes,
      at: new Date(notice.at).toISOString(),
    }
  }
}
