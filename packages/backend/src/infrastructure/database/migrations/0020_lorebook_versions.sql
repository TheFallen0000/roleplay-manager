CREATE TABLE `lorebook_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`lorebook_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`name` text,
	`description` text,
	`scan_depth` integer DEFAULT 4 NOT NULL,
	`token_budget` integer DEFAULT 400 NOT NULL,
	`recursive_scanning` integer DEFAULT 0 NOT NULL,
	`entries_json` text NOT NULL,
	`source_key` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lorebook_versions_book_version_idx` ON `lorebook_versions` (`lorebook_id`,`version_number`);--> statement-breakpoint
CREATE INDEX `lorebook_versions_source_key_idx` ON `lorebook_versions` (`source_key`);--> statement-breakpoint
CREATE TABLE `__lorebook_entries_backup` AS SELECT * FROM `lorebook_entries`;--> statement-breakpoint
CREATE TABLE `__new_lorebooks` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text,
	`name` text,
	`description` text,
	`scan_depth` integer DEFAULT 4 NOT NULL,
	`token_budget` integer DEFAULT 400 NOT NULL,
	`recursive_scanning` integer DEFAULT 0 NOT NULL,
	`extensions` text,
	`unknown_fields` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`origin_id` text,
	`current_version_id` text,
	`deleted_at` integer,
	FOREIGN KEY (`current_version_id`) REFERENCES `lorebook_versions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_lorebooks` (`id`, `character_id`, `name`, `description`, `scan_depth`, `token_budget`, `recursive_scanning`, `extensions`, `unknown_fields`, `created_at`, `updated_at`, `origin_id`, `current_version_id`, `deleted_at`)
SELECT `id`, `character_id`, `name`, `description`, `scan_depth`, `token_budget`, `recursive_scanning`, `extensions`, `unknown_fields`, `created_at`, `updated_at`, NULL, NULL, NULL FROM `lorebooks`;--> statement-breakpoint
DROP TABLE `lorebooks`;--> statement-breakpoint
ALTER TABLE `__new_lorebooks` RENAME TO `lorebooks`;--> statement-breakpoint
INSERT INTO `lorebook_entries` SELECT * FROM `__lorebook_entries_backup`;--> statement-breakpoint
DROP TABLE `__lorebook_entries_backup`;--> statement-breakpoint
CREATE INDEX `lorebooks_origin_idx` ON `lorebooks` (`origin_id`);--> statement-breakpoint
ALTER TABLE `character_versions` ADD `lorebook_version_id` text REFERENCES `lorebook_versions`(`id`) ON UPDATE no action ON DELETE restrict;--> statement-breakpoint
CREATE INDEX `character_versions_lorebook_version_idx` ON `character_versions` (`lorebook_version_id`);
