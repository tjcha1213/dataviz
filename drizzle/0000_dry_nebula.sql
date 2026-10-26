CREATE TABLE `checkins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`checked_in_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkins_session_name_unique` ON `checkins` (`session_id`,`name_key`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`course` text NOT NULL,
	`class_date` text NOT NULL,
	`created_at` text NOT NULL
);
