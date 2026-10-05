CREATE TABLE `player_characters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `player_character_id` text REFERENCES player_characters(id) ON DELETE SET NULL;