CREATE TABLE `request_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`http_method` text DEFAULT 'N/A' NOT NULL,
	`url` text DEFAULT 'N/A' NOT NULL,
	`user_agent` text DEFAULT 'N/A' NOT NULL,
	`ip` text DEFAULT 'N/A' NOT NULL,
	`timestamp` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
