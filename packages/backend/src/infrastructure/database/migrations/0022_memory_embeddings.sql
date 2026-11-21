CREATE TABLE `memory_embeddings` (
	`memory_id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`dimension` integer NOT NULL,
	`vector` blob NOT NULL,
	`text_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`memory_id`) REFERENCES `memories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memory_embeddings_memory_id_unique` ON `memory_embeddings` (`memory_id`);
