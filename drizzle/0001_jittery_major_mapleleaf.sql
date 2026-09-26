CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(160) NOT NULL,
	`user` varchar(160) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`metadata` text NOT NULL,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `connector_registry` (
	`id` int AUTO_INCREMENT NOT NULL,
	`department` varchar(120) NOT NULL,
	`status` varchar(20) NOT NULL,
	`lastHeartbeat` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `connector_registry_id` PRIMARY KEY(`id`),
	CONSTRAINT `connector_registry_department_unique` UNIQUE(`department`)
);
--> statement-breakpoint
CREATE TABLE `routing_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestType` varchar(120) NOT NULL,
	`departments` json NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	CONSTRAINT `routing_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sanyog_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trackingId` varchar(32) NOT NULL,
	`citizenMasterId` varchar(128) NOT NULL,
	`citizenName` varchar(160) NOT NULL,
	`requestType` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`location` json NOT NULL,
	`attachments` json NOT NULL,
	`departments` json NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`priority` enum('Low','Medium','High') NOT NULL DEFAULT 'Medium',
	`duplicateFlag` int NOT NULL DEFAULT 0,
	`statusPerDepartment` json NOT NULL,
	`overallStatus` varchar(40) NOT NULL,
	`slaDueAt` timestamp NOT NULL,
	CONSTRAINT `sanyog_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `sanyog_requests_trackingId_unique` UNIQUE(`trackingId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `department` varchar(120);