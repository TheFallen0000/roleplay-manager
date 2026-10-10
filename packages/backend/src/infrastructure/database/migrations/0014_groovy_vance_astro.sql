ALTER TABLE `conversations` ADD `message_style` text DEFAULT 'bubble' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `character_dialogue_color` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `user_dialogue_color` text;