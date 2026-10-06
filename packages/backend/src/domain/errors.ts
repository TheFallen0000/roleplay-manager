export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 422,
  ) {
    super(message)
    this.name = "DomainError"
  }
}

export class NotFoundError extends DomainError {
  constructor(code: string, message: string) {
    super(code, message, 404)
    this.name = "NotFoundError"
  }
}

export class CharacterNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("CHARACTER_NOT_FOUND", `Character with id '${id}' not found.`)
    this.name = "CharacterNotFoundError"
  }
}

export class CharacterVersionNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("CHARACTER_VERSION_NOT_FOUND", `Character version with id '${id}' not found.`)
    this.name = "CharacterVersionNotFoundError"
  }
}

export class PlayerCharacterNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("PLAYER_CHARACTER_NOT_FOUND", `Player character with id '${id}' not found.`)
    this.name = "PlayerCharacterNotFoundError"
  }
}

export class NoChangesDetectedError extends DomainError {
  constructor(message = "No changes detected for the character.") {
    super("NO_CHANGES_DETECTED", message)
    this.name = "NoChangesDetectedError"
  }
}

export class CharacterValidationError extends DomainError {
  constructor(message: string) {
    super("CHARACTER_VALIDATION_ERROR", message)
    this.name = "CharacterValidationError"
  }
}

export class ConversationNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("CONVERSATION_NOT_FOUND", `Conversation with id '${id}' not found.`)
    this.name = "ConversationNotFoundError"
  }
}

export class MessageNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("MESSAGE_NOT_FOUND", `Message with id '${id}' not found.`)
    this.name = "MessageNotFoundError"
  }
}

export class ProviderUnavailableError extends DomainError {
  constructor(message = "The provider is not available.") {
    super("PROVIDER_CONNECTION_FAILED", message, 502)
    this.name = "ProviderUnavailableError"
  }
}

export class InvalidVersionForCharacterError extends DomainError {
  constructor(versionId: string, characterId: string) {
    super(
      "INVALID_VERSION_FOR_CHARACTER",
      `Version '${versionId}' does not belong to character '${characterId}'.`,
    )
    this.name = "InvalidVersionForCharacterError"
  }
}

export class CharacterAssetNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("CHARACTER_ASSET_NOT_FOUND", `Character asset with id '${id}' not found.`)
    this.name = "CharacterAssetNotFoundError"
  }
}

export class CharacterAssetValidationError extends DomainError {
  constructor(message: string) {
    super("CHARACTER_ASSET_VALIDATION_ERROR", message, 400)
    this.name = "CharacterAssetValidationError"
  }
}

export class TunnelNotAvailableError extends DomainError {
  constructor() {
    super(
      "TUNNEL_NOT_AVAILABLE",
      "Tailscale is not installed on this machine.",
      409,
    )
    this.name = "TunnelNotAvailableError"
  }
}

export class TunnelNotConnectedError extends DomainError {
  constructor() {
    super(
      "TUNNEL_NOT_CONNECTED",
      "Tailscale is not running or is signed out on this machine.",
      409,
    )
    this.name = "TunnelNotConnectedError"
  }
}

export class TunnelCommandError extends DomainError {
  constructor(message: string) {
    super("TUNNEL_COMMAND_FAILED", message, 502)
    this.name = "TunnelCommandError"
  }
}

export class TunnelServeNotEnabledError extends DomainError {
  constructor(consentUrl: string) {
    super(
      "TUNNEL_SERVE_NOT_ENABLED",
      `Tailscale Serve is not enabled on this tailnet. Enable it at ${consentUrl}`,
      409,
    )
    this.name = "TunnelServeNotEnabledError"
  }
}
