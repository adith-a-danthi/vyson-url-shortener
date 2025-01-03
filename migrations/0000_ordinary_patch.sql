CREATE TABLE `urls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`short_code` text(255) NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `urls_short_code_unique` ON `urls` (`short_code`);