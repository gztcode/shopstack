-- ===========================================================================
-- ShopStack 电商中台 —— 扩展表结构（扩量到每端 80~100 页所需）
-- ---------------------------------------------------------------------------
-- 本文件由 scripts/extend-proto.py 配套新增，用于支撑新增的 85 个接口。
-- 表名前缀即服务归属，与 01-schema.sql 保持一致。
-- ===========================================================================

USE `shopstack`;

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- 用户表扩展列
-- ---------------------------------------------------------------------------
-- 新增的实名认证与账号安全接口需要这三列。
-- 用 ALTER 而非改 01-schema.sql，保持 01 为原始基线、03 为增量扩展。
--
-- MySQL 8 不支持 ADD COLUMN IF NOT EXISTS，这里用 information_schema 判断
-- 再动态执行，保证脚本可重复运行不报错。

SET @ddl := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'real_name') > 0,
    'SELECT 1',
    'ALTER TABLE `users` ADD COLUMN `real_name` VARCHAR(64) NOT NULL DEFAULT '''' COMMENT ''实名姓名'''
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'realname_status') > 0,
    'SELECT 1',
    'ALTER TABLE `users` ADD COLUMN `realname_status` TINYINT NOT NULL DEFAULT 0 COMMENT ''实名状态 0未认证 1已认证 2审核中 3被拒'''
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_changed_at') > 0,
    'SELECT 1',
    'ALTER TABLE `users` ADD COLUMN `password_changed_at` DATETIME NULL COMMENT ''最近修改密码时间'''
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 用户服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_levels` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`              VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '等级名称',
  `level`             INT NOT NULL DEFAULT 1 COMMENT '等级序号',
  `min_growth`        INT NOT NULL DEFAULT 0 COMMENT '达到该等级所需成长值',
  `max_growth`        INT NOT NULL DEFAULT 0 COMMENT '该等级成长值上限',
  `discount_percent`  INT NOT NULL DEFAULT 100 COMMENT '会员折扣百分比',
  `icon`              VARCHAR(512) NOT NULL DEFAULT '' COMMENT '等级图标',
  `description`       VARCHAR(512) NOT NULL DEFAULT '' COMMENT '等级说明',
  `benefits`          VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '权益列表，JSON 数组',
  `sort`              INT NOT NULL DEFAULT 0,
  `created_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员等级';

CREATE TABLE IF NOT EXISTS `user_growth_logs` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `change`      INT NOT NULL DEFAULT 0 COMMENT '成长值变动，正增负减',
  `balance`     INT NOT NULL DEFAULT 0 COMMENT '变动后成长值',
  `title`       VARCHAR(128) NOT NULL DEFAULT '' COMMENT '变动说明',
  `biz_type`    VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '业务类型',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户成长值流水';

CREATE TABLE IF NOT EXISTS `regions` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id`  BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `name`       VARCHAR(64)  NOT NULL DEFAULT '',
  `code`       VARCHAR(32)  NOT NULL DEFAULT '',
  `level`      TINYINT NOT NULL DEFAULT 1 COMMENT '1省 2市 3区',
  `sort`       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='行政区域';

CREATE TABLE IF NOT EXISTS `user_invoice_templates` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `title`         VARCHAR(128) NOT NULL DEFAULT '' COMMENT '发票抬头',
  `tax_no`        VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '纳税人识别号',
  `type`          VARCHAR(16)  NOT NULL DEFAULT 'personal' COMMENT 'personal | company',
  `email`         VARCHAR(128) NOT NULL DEFAULT '',
  `phone`         VARCHAR(32)  NOT NULL DEFAULT '',
  `address`       VARCHAR(255) NOT NULL DEFAULT '',
  `bank_name`     VARCHAR(128) NOT NULL DEFAULT '',
  `bank_account`  VARCHAR(64)  NOT NULL DEFAULT '',
  `is_default`    TINYINT NOT NULL DEFAULT 0,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户发票抬头模板';

CREATE TABLE IF NOT EXISTS `user_notification_settings` (
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `order_notice`     TINYINT NOT NULL DEFAULT 1,
  `logistics_notice` TINYINT NOT NULL DEFAULT 1,
  `marketing_notice` TINYINT NOT NULL DEFAULT 0,
  `system_notice`    TINYINT NOT NULL DEFAULT 1,
  `sms_notice`       TINYINT NOT NULL DEFAULT 1,
  `email_notice`     TINYINT NOT NULL DEFAULT 0,
  `wechat_notice`    TINYINT NOT NULL DEFAULT 0,
  `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户通知订阅偏好';

CREATE TABLE IF NOT EXISTS `user_feedbacks` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `user_nickname` VARCHAR(64)  NOT NULL DEFAULT '',
  `type`          TINYINT NOT NULL DEFAULT 4 COMMENT '1功能建议 2使用问题 3投诉 4其他',
  `content`       TEXT NOT NULL,
  `images`        VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '图片地址，JSON 数组',
  `contact`       VARCHAR(64)  NOT NULL DEFAULT '',
  `status`        TINYINT NOT NULL DEFAULT 0 COMMENT '0待处理 1处理中 2已处理 3已关闭',
  `reply`         VARCHAR(1024) NOT NULL DEFAULT '',
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at`  DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户意见反馈';

CREATE TABLE IF NOT EXISTS `help_articles` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id`   BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `category_name` VARCHAR(64)  NOT NULL DEFAULT '',
  `title`         VARCHAR(128) NOT NULL DEFAULT '',
  `content`       TEXT NOT NULL,
  `sort`          INT NOT NULL DEFAULT 0,
  `enabled`       TINYINT NOT NULL DEFAULT 1,
  `view_count`    INT NOT NULL DEFAULT 0,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帮助中心文章';

-- ---------------------------------------------------------------------------
-- 商品服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `channels` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(64)  NOT NULL DEFAULT '',
  `code`           VARCHAR(64)  NOT NULL DEFAULT '',
  `icon`           VARCHAR(512) NOT NULL DEFAULT '',
  `banner_url`     VARCHAR(512) NOT NULL DEFAULT '',
  `description`    VARCHAR(512) NOT NULL DEFAULT '',
  `sort`           INT NOT NULL DEFAULT 0,
  `type`           TINYINT NOT NULL DEFAULT 1 COMMENT '1推荐 2新品 3热销 4限时 5预售 6清仓 7包邮 8跨境 9楼层',
  `status`         TINYINT NOT NULL DEFAULT 1,
  `product_count`  INT NOT NULL DEFAULT 0,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='首页频道与楼层';

CREATE TABLE IF NOT EXISTS `review_tags` (
  `id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`     VARCHAR(64) NOT NULL DEFAULT '',
  `sort`     INT NOT NULL DEFAULT 0,
  `enabled`  TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评价标签';

CREATE TABLE IF NOT EXISTS `guarantees` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(64)  NOT NULL DEFAULT '',
  `icon`        VARCHAR(512) NOT NULL DEFAULT '',
  `description` VARCHAR(512) NOT NULL DEFAULT '',
  `sort`        INT NOT NULL DEFAULT 0,
  `enabled`     TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品保障项';

CREATE TABLE IF NOT EXISTS `product_questions` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id`     BIGINT UNSIGNED NOT NULL,
  `product_title`  VARCHAR(255) NOT NULL DEFAULT '',
  `user_id`        BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `user_nickname`  VARCHAR(64)  NOT NULL DEFAULT '',
  `content`        TEXT NOT NULL,
  `images`         VARCHAR(1024) NOT NULL DEFAULT '' COMMENT 'JSON 数组',
  `reply`          VARCHAR(1024) NOT NULL DEFAULT '',
  `reply_at`       VARCHAR(32)  NOT NULL DEFAULT '',
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product` (`product_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品问答';

-- ---------------------------------------------------------------------------
-- 营销服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `sign_in_records` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         BIGINT UNSIGNED NOT NULL,
  `sign_date`       DATE NOT NULL,
  `continuous_days` INT NOT NULL DEFAULT 1 COMMENT '连续签到天数',
  `points_awarded`  INT NOT NULL DEFAULT 0,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`, `sign_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户签到记录';

CREATE TABLE IF NOT EXISTS `sign_in_configs` (
  `id`                     BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `enabled`                TINYINT NOT NULL DEFAULT 1 COMMENT '是否开启签到活动',
  `points_awarded`         INT NOT NULL DEFAULT 5 COMMENT '每日签到基础积分',
  `continuous_step`        INT NOT NULL DEFAULT 1 COMMENT '连续签到每多一天额外积分',
  `max_points`             INT NOT NULL DEFAULT 20 COMMENT '单次签到积分上限',
  `continuous_days_required` INT NOT NULL DEFAULT 7 COMMENT '连续签到奖励所需天数',
  `calendar_days`          INT NOT NULL DEFAULT 7 COMMENT '签到日历展示天数',
  `description`            VARCHAR(255) NOT NULL DEFAULT '' COMMENT '配置说明',
  `updated_at`             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='签到活动配置（单行表，id 固定为 1）';

CREATE TABLE IF NOT EXISTS `marketing_tasks` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`             VARCHAR(64)  NOT NULL DEFAULT '',
  `description`      VARCHAR(512) NOT NULL DEFAULT '',
  `type`             TINYINT NOT NULL DEFAULT 1 COMMENT '1浏览 2下单 3分享 4评价 5签到 6邀请',
  `target_count`     INT NOT NULL DEFAULT 1,
  `reward_points`    INT NOT NULL DEFAULT 0,
  `reward_coupon_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `sort`             INT NOT NULL DEFAULT 0,
  `enabled`          TINYINT NOT NULL DEFAULT 1,
  `icon`             VARCHAR(512) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='营销任务定义';

CREATE TABLE IF NOT EXISTS `user_tasks` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `task_id`          BIGINT UNSIGNED NOT NULL,
  `progress`         INT NOT NULL DEFAULT 0,
  `completed`        TINYINT NOT NULL DEFAULT 0,
  `claimed`          TINYINT NOT NULL DEFAULT 0,
  `completed_at`     DATETIME NULL DEFAULT NULL,
  `claimed_at`       DATETIME NULL DEFAULT NULL,
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_task` (`user_id`, `task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户任务进度';

CREATE TABLE IF NOT EXISTS `group_buys` (
  `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`                  VARCHAR(128) NOT NULL DEFAULT '',
  `description`           VARCHAR(512) NOT NULL DEFAULT '',
  `promotion_id`          BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `product_id`            BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `product_title`         VARCHAR(255) NOT NULL DEFAULT '',
  `product_image`         VARCHAR(512) NOT NULL DEFAULT '',
  `price_cents`           BIGINT NOT NULL DEFAULT 0,
  `original_price_cents`  BIGINT NOT NULL DEFAULT 0,
  `required_members`      INT NOT NULL DEFAULT 3 COMMENT '成团所需人数',
  `joined_members`        INT NOT NULL DEFAULT 0,
  `group_size`            INT NOT NULL DEFAULT 20 COMMENT '团总人数上限',
  `status`                TINYINT NOT NULL DEFAULT 0 COMMENT '0未开始 1进行中 2已结束 3已下线',
  `start_time`            DATETIME NOT NULL,
  `end_time`              DATETIME NOT NULL,
  `banner_image`          VARCHAR(512) NOT NULL DEFAULT '',
  `created_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status_time` (`status`, `start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='拼团活动';

CREATE TABLE IF NOT EXISTS `group_buy_members` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_buy_id`  BIGINT UNSIGNED NOT NULL,
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `user_nickname` VARCHAR(64)  NOT NULL DEFAULT '',
  `joined_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group` (`group_buy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='拼团成员';

CREATE TABLE IF NOT EXISTS `promotion_sessions` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `promotion_id` BIGINT UNSIGNED NOT NULL,
  `name`         VARCHAR(64) NOT NULL DEFAULT '',
  `start_time`   DATETIME NOT NULL,
  `end_time`     DATETIME NOT NULL,
  `stock`        INT NOT NULL DEFAULT 0,
  `sold_count`   INT NOT NULL DEFAULT 0,
  `status`       TINYINT NOT NULL DEFAULT 0 COMMENT '0未开始 1进行中 2已结束',
  PRIMARY KEY (`id`),
  KEY `idx_promotion` (`promotion_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动场次（秒杀场等）';

-- ---------------------------------------------------------------------------
-- 订单服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `after_sales` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `after_sale_no`  VARCHAR(64)  NOT NULL DEFAULT '',
  `order_id`       BIGINT UNSIGNED NOT NULL,
  `order_no`       VARCHAR(64)  NOT NULL DEFAULT '',
  `user_id`        BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `user_nickname`  VARCHAR(64)  NOT NULL DEFAULT '',
  `type`           TINYINT NOT NULL DEFAULT 1 COMMENT '1仅退款 2退货退款 3换货',
  `amount_cents`   BIGINT NOT NULL DEFAULT 0,
  `reason`         VARCHAR(128) NOT NULL DEFAULT '',
  `description`    VARCHAR(512) NOT NULL DEFAULT '',
  `item_ids`       VARCHAR(512) NOT NULL DEFAULT '' COMMENT '退款商品项，JSON 数组',
  `status`         TINYINT NOT NULL DEFAULT 0 COMMENT '0待审核 1审核通过 2审核驳回 3已退款 4已完成',
  `admin_remark`   VARCHAR(512) NOT NULL DEFAULT '',
  `refund_id`      BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at`   DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_no` (`after_sale_no`),
  KEY `idx_status` (`status`, `id`),
  KEY `idx_user` (`user_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='售后工单';

CREATE TABLE IF NOT EXISTS `refund_reasons` (
  `id`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`     VARCHAR(64) NOT NULL DEFAULT '',
  `type`     TINYINT NOT NULL DEFAULT 1 COMMENT '1仅退款 2退货退款 3换货',
  `sort`     INT NOT NULL DEFAULT 0,
  `enabled`  TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退款原因';

-- ---------------------------------------------------------------------------
-- 物流服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `logistics_companies` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(64)  NOT NULL DEFAULT '',
  `code`         VARCHAR(32)  NOT NULL DEFAULT '',
  `logo`         VARCHAR(512) NOT NULL DEFAULT '',
  `phone`        VARCHAR(32)  NOT NULL DEFAULT '',
  `enabled`      TINYINT NOT NULL DEFAULT 1,
  `sort`         INT NOT NULL DEFAULT 0,
  `supports_cod` TINYINT NOT NULL DEFAULT 0 COMMENT '是否支持货到付款',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='快递公司';

CREATE TABLE IF NOT EXISTS `delivery_ranges` (
  `id`                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_id`              BIGINT UNSIGNED NOT NULL,
  `regions`                  VARCHAR(512) NOT NULL DEFAULT '' COMMENT '适用地区，逗号分隔',
  `freight_cents`            BIGINT NOT NULL DEFAULT 0,
  `free_freight_amount_cents` BIGINT NOT NULL DEFAULT 0,
  `enabled`                  TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_template` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运费模板配送范围';

-- ---------------------------------------------------------------------------
-- 库存服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `warehouses` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`       VARCHAR(32)  NOT NULL DEFAULT '',
  `name`       VARCHAR(64)  NOT NULL DEFAULT '',
  `address`    VARCHAR(255) NOT NULL DEFAULT '',
  `contact`    VARCHAR(64)  NOT NULL DEFAULT '',
  `phone`      VARCHAR(32)  NOT NULL DEFAULT '',
  `enabled`    TINYINT NOT NULL DEFAULT 1,
  `sort`       INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='仓库';

CREATE TABLE IF NOT EXISTS `inbound_orders` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `inbound_no`      VARCHAR(64)  NOT NULL DEFAULT '',
  `warehouse_id`    BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `warehouse_name`  VARCHAR(64)  NOT NULL DEFAULT '',
  `supplier`        VARCHAR(128) NOT NULL DEFAULT '',
  `status`          TINYINT NOT NULL DEFAULT 0 COMMENT '0待入库 1已入库 2已取消',
  `total_quantity`  INT NOT NULL DEFAULT 0,
  `remark`          VARCHAR(512) NOT NULL DEFAULT '',
  `operator`        VARCHAR(64)  NOT NULL DEFAULT '',
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_no` (`inbound_no`),
  KEY `idx_status` (`status`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单';

CREATE TABLE IF NOT EXISTS `inbound_order_items` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `inbound_id`  BIGINT UNSIGNED NOT NULL,
  `sku_id`      BIGINT UNSIGNED NOT NULL,
  `sku_code`    VARCHAR(64)  NOT NULL DEFAULT '',
  `spec_text`   VARCHAR(128) NOT NULL DEFAULT '',
  `quantity`    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_inbound` (`inbound_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='入库单明细';

CREATE TABLE IF NOT EXISTS `outbound_orders` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `outbound_no`     VARCHAR(64)  NOT NULL DEFAULT '',
  `warehouse_id`    BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `warehouse_name`  VARCHAR(64)  NOT NULL DEFAULT '',
  `order_id`        BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `order_no`        VARCHAR(64)  NOT NULL DEFAULT '',
  `status`          TINYINT NOT NULL DEFAULT 0 COMMENT '0待出库 1已出库 2已取消',
  `total_quantity`  INT NOT NULL DEFAULT 0,
  `remark`          VARCHAR(512) NOT NULL DEFAULT '',
  `operator`        VARCHAR(64)  NOT NULL DEFAULT '',
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_no` (`outbound_no`),
  KEY `idx_status` (`status`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库单';

CREATE TABLE IF NOT EXISTS `outbound_order_items` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `outbound_id`  BIGINT UNSIGNED NOT NULL,
  `sku_id`       BIGINT UNSIGNED NOT NULL,
  `sku_code`     VARCHAR(64)  NOT NULL DEFAULT '',
  `spec_text`    VARCHAR(128) NOT NULL DEFAULT '',
  `quantity`     INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_outbound` (`outbound_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出库单明细';

CREATE TABLE IF NOT EXISTS `stock_checks` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `check_no`        VARCHAR(64)  NOT NULL DEFAULT '',
  `warehouse_id`    BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `warehouse_name`  VARCHAR(64)  NOT NULL DEFAULT '',
  `status`          TINYINT NOT NULL DEFAULT 0 COMMENT '0盘点中 1已完成 2已取消',
  `total_count`     INT NOT NULL DEFAULT 0,
  `diff_count`      INT NOT NULL DEFAULT 0,
  `remark`          VARCHAR(512) NOT NULL DEFAULT '',
  `operator`        VARCHAR(64)  NOT NULL DEFAULT '',
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_no` (`check_no`),
  KEY `idx_status` (`status`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存盘点单';

CREATE TABLE IF NOT EXISTS `stock_check_items` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `stock_check_id`   BIGINT UNSIGNED NOT NULL,
  `sku_id`           BIGINT UNSIGNED NOT NULL,
  `sku_code`         VARCHAR(64)  NOT NULL DEFAULT '',
  `spec_text`        VARCHAR(128) NOT NULL DEFAULT '',
  `book_quantity`    INT NOT NULL DEFAULT 0 COMMENT '账面数量',
  `actual_quantity`  INT NOT NULL DEFAULT 0 COMMENT '实盘数量',
  `diff_quantity`    INT NOT NULL DEFAULT 0 COMMENT '差异数量',
  PRIMARY KEY (`id`),
  KEY `idx_check` (`stock_check_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存盘点明细';

-- ---------------------------------------------------------------------------
-- 支付服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `pay_channels` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(64)  NOT NULL DEFAULT '',
  `channel`    TINYINT NOT NULL DEFAULT 1 COMMENT '对应 common.PaymentChannel',
  `code`       VARCHAR(32)  NOT NULL DEFAULT '',
  `icon`       VARCHAR(512) NOT NULL DEFAULT '',
  `enabled`    TINYINT NOT NULL DEFAULT 1,
  `sort`       INT NOT NULL DEFAULT 0,
  `config`     TEXT NOT NULL COMMENT '渠道配置 JSON',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付渠道';

CREATE TABLE IF NOT EXISTS `balance_logs` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `change`     BIGINT NOT NULL DEFAULT 0 COMMENT '余额变动，单位分',
  `balance`    BIGINT NOT NULL DEFAULT 0 COMMENT '变动后余额',
  `title`      VARCHAR(128) NOT NULL DEFAULT '',
  `biz_type`   VARCHAR(32)  NOT NULL DEFAULT '',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户余额流水';

CREATE TABLE IF NOT EXISTS `recharge_orders` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `recharge_no`    VARCHAR(64)  NOT NULL DEFAULT '',
  `user_id`        BIGINT UNSIGNED NOT NULL,
  `amount_cents`   BIGINT NOT NULL DEFAULT 0,
  `bonus_cents`    BIGINT NOT NULL DEFAULT 0 COMMENT '赠送金额',
  `status`         TINYINT NOT NULL DEFAULT 0 COMMENT '0待支付 1已支付 2已取消',
  `channel`        TINYINT NOT NULL DEFAULT 1,
  `payment_no`     VARCHAR(64)  NOT NULL DEFAULT '',
  `paid_at`        DATETIME NULL DEFAULT NULL,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_no` (`recharge_no`),
  KEY `idx_user` (`user_id`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='余额充值单';

-- ---------------------------------------------------------------------------
-- 通知服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `notification_templates` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`       VARCHAR(64)  NOT NULL DEFAULT '',
  `name`       VARCHAR(64)  NOT NULL DEFAULT '',
  `type`       TINYINT NOT NULL DEFAULT 1,
  `title`      VARCHAR(255) NOT NULL DEFAULT '',
  `content`    TEXT NOT NULL,
  `link`       VARCHAR(512) NOT NULL DEFAULT '',
  `enabled`    TINYINT NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='站内通知模板';

CREATE TABLE IF NOT EXISTS `sms_templates` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`       VARCHAR(64)  NOT NULL DEFAULT '',
  `name`       VARCHAR(64)  NOT NULL DEFAULT '',
  `content`    TEXT NOT NULL,
  `enabled`    TINYINT NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='短信模板';

CREATE TABLE IF NOT EXISTS `sensitive_words` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `word`       VARCHAR(128) NOT NULL DEFAULT '',
  `category`   TINYINT NOT NULL DEFAULT 4 COMMENT '1违规词 2辱骂 3广告 4其他',
  `status`     TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_word` (`word`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='敏感词库';
