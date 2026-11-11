CREATE TABLE `lorebook_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`lorebook_id` text NOT NULL,
	`name` text,
	`source_id` text,
	`keys` text NOT NULL,
	`secondary_keys` text DEFAULT '[]' NOT NULL,
	`comment` text,
	`content` text NOT NULL,
	`constant` integer DEFAULT 0 NOT NULL,
	`selective` integer DEFAULT 0 NOT NULL,
	`selective_logic` integer DEFAULT 0 NOT NULL,
	`insertion_order` integer DEFAULT 100 NOT NULL,
	`position` text DEFAULT 'after_char' NOT NULL,
	`raw_position` text,
	`priority` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`case_sensitive` integer DEFAULT 0 NOT NULL,
	`whole_words` integer DEFAULT 0 NOT NULL,
	`order` integer NOT NULL,
	`extensions` text,
	`unknown_fields` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lorebook_entries_lorebook_idx` ON `lorebook_entries` (`lorebook_id`,`order`);--> statement-breakpoint
CREATE TABLE `lorebooks` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`name` text,
	`description` text,
	`scan_depth` integer DEFAULT 4 NOT NULL,
	`token_budget` integer DEFAULT 400 NOT NULL,
	`recursive_scanning` integer DEFAULT 0 NOT NULL,
	`extensions` text,
	`unknown_fields` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lorebooks_character_idx` ON `lorebooks` (`character_id`);--> statement-breakpoint
ALTER TABLE `character_versions` ADD `personality` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `scenario` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `mes_example` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `alternate_greetings` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `creator_notes` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `creator` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `card_character_version` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `gender` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `pronouns` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `tagline` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `system_prompt` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `post_history_instructions` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `extensions` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `unknown_fields` text;--> statement-breakpoint
ALTER TABLE `character_versions` ADD `unknown_root_fields` text;