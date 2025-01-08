ALTER TABLE `urls` ADD `clicks` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `urls` ADD `last_accessed_at` integer;