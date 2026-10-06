ALTER TABLE `conversations` ADD `background_image_asset_id` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `background_fit` text DEFAULT 'cover' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `background_scrim` integer DEFAULT 0 NOT NULL;