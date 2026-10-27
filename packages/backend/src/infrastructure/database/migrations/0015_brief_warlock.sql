CREATE INDEX `character_assets_character_idx` ON `character_assets` (`character_id`);--> statement-breakpoint
CREATE INDEX `character_cards_version_position_idx` ON `character_cards` (`version_id`,`position`);--> statement-breakpoint
CREATE INDEX `character_versions_character_number_idx` ON `character_versions` (`character_id`,`version_number`);--> statement-breakpoint
CREATE INDEX `conversations_updated_at_idx` ON `conversations` (`updated_at`);--> statement-breakpoint
CREATE INDEX `conversations_version_id_idx` ON `conversations` (`version_id`);--> statement-breakpoint
CREATE INDEX `conversations_provider_instance_idx` ON `conversations` (`provider_instance_id`);--> statement-breakpoint
CREATE INDEX `memories_conversation_priority_idx` ON `memories` (`conversation_id`,`priority`);--> statement-breakpoint
CREATE INDEX `memory_proposals_conversation_status_idx` ON `memory_change_proposals` (`conversation_id`,`status`);--> statement-breakpoint
CREATE INDEX `messages_conversation_position_idx` ON `messages` (`conversation_id`,`position`);--> statement-breakpoint
CREATE INDEX `summaries_conversation_created_idx` ON `summaries` (`conversation_id`,`created_at`);