DROP INDEX `memories_title_unique`;--> statement-breakpoint
ALTER TABLE `memories` ADD `type` text DEFAULT 'fact' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `memories_conversation_actor_title_unique` ON `memories` (`conversation_id`,`actor`,`title`);--> statement-breakpoint
ALTER TABLE `memory_change_proposals` ADD `type` text DEFAULT 'fact' NOT NULL;