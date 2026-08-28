-- Tables missing from INSTALL/matecat.sql (an old 2020-era snapshot whose phinxlog
-- stops at 2020-09). These come from later migrations; the base .sql was hand-updated
-- for most of them but missed these. Created here (idempotent) so both a fresh
-- `docker compose up` and the running DB have them. Source migrations:
--   20240520104800_create_filters_xliff_config_template_table.php
--   20210729110000_create_table_files_tag.php  (creates `files_parts`)
--   20250417183000_create_table_mt_qe_templates.php

CREATE TABLE IF NOT EXISTS `filters_config_templates` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `uid` bigint(20) NOT NULL,
    `json` TEXT DEFAULT NULL,
    `xml` TEXT DEFAULT NULL,
    `yaml` TEXT DEFAULT NULL,
    `ms_excel` TEXT DEFAULT NULL,
    `ms_word` TEXT DEFAULT NULL,
    `ms_powerpoint` TEXT DEFAULT NULL,
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` timestamp NULL DEFAULT NULL,
    `modified_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `uid_name_idx` (`uid` ASC, `name` ASC)
);

CREATE TABLE IF NOT EXISTS `xliff_config_templates` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `uid` bigint(20) NOT NULL,
    `rules` TEXT DEFAULT NULL,
    `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` timestamp NULL DEFAULT NULL,
    `modified_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `uid_name_idx` (`uid` ASC, `name` ASC)
);

CREATE TABLE IF NOT EXISTS `files_parts` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    `id_file` bigint(20) NOT NULL,
    `tag_key` varchar(45) NOT NULL,
    `tag_value` varchar(255) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `id_file_idx` (`id_file`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `mt_qe_templates` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) CHARACTER SET latin1 DEFAULT NULL,
    `uid` bigint(20) NOT NULL,
    `rules` varchar(2048) NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modified_at` timestamp NULL DEFAULT NULL,
    `deleted_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uid_name_idx` (`uid`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
