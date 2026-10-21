-- ===========================================================================
-- ShopStack 电商中台 —— 数据库初始化脚本
-- ---------------------------------------------------------------------------
-- 约定：
--   * 所有金额字段单位为「分」，类型 BIGINT，避免浮点精度问题。
--   * 所有时间字段使用 DATETIME，由应用层统一写入（UTC+8）。
--   * 表名前缀即服务归属：user_/product_/cart_/order_/payment_/
--     inventory_/marketing_/logistics_/notification_
--   * 各微服务逻辑上独占自己的表前缀，共用同一个 MySQL 实例。
-- ===========================================================================

CREATE DATABASE IF NOT EXISTS `shopstack`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `shopstack`;

-- 显式声明客户端字符集，避免初始化脚本按 latin1 二次编码导致中文乱码
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- 用户服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`       VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '登录名',
  `password_hash`  VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'bcrypt 密码',
  `nickname`       VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '昵称',
  `avatar`         VARCHAR(512) NOT NULL DEFAULT '' COMMENT '头像',
  `phone`          VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '手机号',
  `email`          VARCHAR(128) NOT NULL DEFAULT '' COMMENT '邮箱',
  `gender`         TINYINT      NOT NULL DEFAULT 0 COMMENT '0未知 1男 2女',
  `birthday`       DATE         NULL COMMENT '生日',
  `points`         INT          NOT NULL DEFAULT 0 COMMENT '积分',
  `balance_cents`  BIGINT       NOT NULL DEFAULT 0 COMMENT '余额（分）',
  `status`         TINYINT      NOT NULL DEFAULT 1 COMMENT '1正常 2禁用 3冻结',
  `wechat_openid`  VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '微信 openid',
  `last_login_at`  DATETIME     NULL COMMENT '最近登录时间',
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`     DATETIME     NULL COMMENT '软删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_phone` (`phone`),
  KEY `idx_wechat_openid` (`wechat_openid`),
  KEY `idx_status_created` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

CREATE TABLE IF NOT EXISTS `user_addresses` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `receiver`   VARCHAR(64)  NOT NULL DEFAULT '',
  `phone`      VARCHAR(32)  NOT NULL DEFAULT '',
  `province`   VARCHAR(64)  NOT NULL DEFAULT '',
  `city`       VARCHAR(64)  NOT NULL DEFAULT '',
  `district`   VARCHAR(64)  NOT NULL DEFAULT '',
  `detail`     VARCHAR(255) NOT NULL DEFAULT '',
  `postal_code` VARCHAR(16) NOT NULL DEFAULT '',
  `tag`        VARCHAR(16)  NOT NULL DEFAULT '' COMMENT '家/公司/其他',
  `is_default` TINYINT      NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_address_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收货地址';

CREATE TABLE IF NOT EXISTS `user_favorites` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_product` (`user_id`, `product_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品收藏';

CREATE TABLE IF NOT EXISTS `admins` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(64)  NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `real_name`     VARCHAR(64)  NOT NULL DEFAULT '',
  `avatar`        VARCHAR(512) NOT NULL DEFAULT '',
  `email`         VARCHAR(128) NOT NULL DEFAULT '',
  `phone`         VARCHAR(32)  NOT NULL DEFAULT '',
  `status`        TINYINT      NOT NULL DEFAULT 1 COMMENT '1启用 0禁用',
  `last_login_at` DATETIME     NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='后台管理员';

CREATE TABLE IF NOT EXISTS `roles` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(64) NOT NULL,
  `code`        VARCHAR(64) NOT NULL,
  `description` VARCHAR(255) NOT NULL DEFAULT '',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色';

CREATE TABLE IF NOT EXISTS `permissions` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(64)  NOT NULL,
  `code`        VARCHAR(128) NOT NULL,
  `group`       VARCHAR(64)  NOT NULL DEFAULT '' COMMENT 'product/order/user/marketing/system',
  `type`        VARCHAR(16)  NOT NULL DEFAULT 'action' COMMENT 'menu/action',
  `parent_code` VARCHAR(128) NOT NULL DEFAULT '',
  `sort`        INT          NOT NULL DEFAULT 0,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_group` (`group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限';

CREATE TABLE IF NOT EXISTS `admin_roles` (
  `admin_id` BIGINT UNSIGNED NOT NULL,
  `role_id`  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`admin_id`, `role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员-角色';

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id`       BIGINT UNSIGNED NOT NULL,
  `permission_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色-权限';

-- ---------------------------------------------------------------------------
-- 商品服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `categories` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(64) NOT NULL,
  `parent_id`   BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `icon`        VARCHAR(512) NOT NULL DEFAULT '',
  `description` VARCHAR(255) NOT NULL DEFAULT '',
  `sort`        INT NOT NULL DEFAULT 0,
  `visible`     TINYINT NOT NULL DEFAULT 1,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品分类';

CREATE TABLE IF NOT EXISTS `products` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`           VARCHAR(200) NOT NULL,
  `subtitle`        VARCHAR(255) NOT NULL DEFAULT '',
  `cover`           VARCHAR(512) NOT NULL DEFAULT '',
  `category_id`     BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `min_price_cents` BIGINT NOT NULL DEFAULT 0,
  `max_price_cents` BIGINT NOT NULL DEFAULT 0,
  `sales_count`     INT NOT NULL DEFAULT 0,
  `status`          TINYINT NOT NULL DEFAULT 1 COMMENT '1草稿 2上架 3下架',
  `description`     MEDIUMTEXT,
  `tags`            VARCHAR(255) NOT NULL DEFAULT '' COMMENT '逗号分隔',
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`      DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_category_status` (`category_id`, `status`),
  KEY `idx_sales` (`sales_count`),
  KEY `idx_created` (`created_at`),
  FULLTEXT KEY `ft_title` (`title`, `subtitle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品（SPU）';

CREATE TABLE IF NOT EXISTS `product_skus` (
  `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id`            BIGINT UNSIGNED NOT NULL,
  `sku_code`              VARCHAR(64) NOT NULL DEFAULT '',
  `spec_text`             VARCHAR(255) NOT NULL DEFAULT '' COMMENT '规格文案',
  `specs`                 VARCHAR(512) NOT NULL DEFAULT '{}' COMMENT 'JSON 属性键值',
  `price_cents`           BIGINT NOT NULL DEFAULT 0,
  `original_price_cents`  BIGINT NOT NULL DEFAULT 0,
  `stock`                 INT NOT NULL DEFAULT 0,
  `image`                 VARCHAR(512) NOT NULL DEFAULT '',
  `sort`                  INT NOT NULL DEFAULT 0,
  `sales_count`           INT NOT NULL DEFAULT 0,
  `weight_grams`          INT NOT NULL DEFAULT 0,
  `enabled`               TINYINT NOT NULL DEFAULT 1,
  `created_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sku_code` (`sku_code`),
  KEY `idx_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品规格（SKU）';

CREATE TABLE IF NOT EXISTS `product_images` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `url`        VARCHAR(512) NOT NULL,
  `alt`        VARCHAR(255) NOT NULL DEFAULT '',
  `sort`       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品图集';

CREATE TABLE IF NOT EXISTS `product_attributes` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `name`       VARCHAR(64) NOT NULL,
  `value`      VARCHAR(255) NOT NULL DEFAULT '',
  `sort`       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品参数';

CREATE TABLE IF NOT EXISTS `banners` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`      VARCHAR(128) NOT NULL DEFAULT '',
  `image`      VARCHAR(512) NOT NULL DEFAULT '',
  `link`       VARCHAR(512) NOT NULL DEFAULT '',
  `sort`       INT NOT NULL DEFAULT 0,
  `position`   VARCHAR(64) NOT NULL DEFAULT 'home_banner',
  `visible`    TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_position` (`position`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='轮播位';

CREATE TABLE IF NOT EXISTS `reviews` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id`    BIGINT UNSIGNED NOT NULL,
  `product_title` VARCHAR(200) NOT NULL DEFAULT '',
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `user_nickname` VARCHAR(64) NOT NULL DEFAULT '',
  `user_avatar`   VARCHAR(512) NOT NULL DEFAULT '',
  `rating`        TINYINT NOT NULL DEFAULT 5,
  `content`       TEXT,
  `images`        VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '逗号分隔',
  `sku_id`        BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `sku_text`      VARCHAR(255) NOT NULL DEFAULT '',
  `status`        TINYINT NOT NULL DEFAULT 1 COMMENT '1待审核 2通过 3驳回',
  `admin_reply`  VARCHAR(1024) NOT NULL DEFAULT '',
  `like_count`    INT NOT NULL DEFAULT 0,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product` (`product_id`, `status`),
  KEY `idx_user` (`user_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品评价';

-- ---------------------------------------------------------------------------
-- 购物车服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `cart_items` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `sku_id`     BIGINT UNSIGNED NOT NULL,
  `quantity`   INT NOT NULL DEFAULT 1,
  `selected`   TINYINT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_sku` (`user_id`, `sku_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='购物车条目';

-- ---------------------------------------------------------------------------
-- 订单服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `orders` (
  `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no`           VARCHAR(32) NOT NULL,
  `user_id`            BIGINT UNSIGNED NOT NULL,
  `status`             TINYINT NOT NULL DEFAULT 1 COMMENT '1待付款 2已付款 3待收货 4已完成 5已取消 6退款中 7已退款 8已关闭',
  `total_amount_cents` BIGINT NOT NULL DEFAULT 0,
  `discount_cents`     BIGINT NOT NULL DEFAULT 0,
  `freight_cents`      BIGINT NOT NULL DEFAULT 0,
  `payable_cents`      BIGINT NOT NULL DEFAULT 0,
  `paid_cents`         BIGINT NOT NULL DEFAULT 0,
  `refunded_cents`     BIGINT NOT NULL DEFAULT 0,
  `item_count`         INT NOT NULL DEFAULT 0,
  `total_quantity`     INT NOT NULL DEFAULT 0,
  `receiver`           VARCHAR(64)  NOT NULL DEFAULT '',
  `phone`              VARCHAR(32)  NOT NULL DEFAULT '',
  `address`            VARCHAR(512) NOT NULL DEFAULT '',
  `remark`             VARCHAR(255) NOT NULL DEFAULT '',
  `admin_remark`       VARCHAR(512) NOT NULL DEFAULT '',
  `payment_method`     VARCHAR(32)  NOT NULL DEFAULT '',
  `coupon_id`          BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `shipment_id`        BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `points_used`        INT NOT NULL DEFAULT 0,
  `paid_at`            DATETIME NULL,
  `shipped_at`         DATETIME NULL,
  `completed_at`       DATETIME NULL,
  `cancelled_at`       DATETIME NULL,
  `created_at`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_user_status` (`user_id`, `status`),
  KEY `idx_status_created` (`status`, `created_at`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单';

CREATE TABLE IF NOT EXISTS `order_items` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`        BIGINT UNSIGNED NOT NULL,
  `product_id`      BIGINT UNSIGNED NOT NULL,
  `sku_id`          BIGINT UNSIGNED NOT NULL,
  `product_title`   VARCHAR(200) NOT NULL DEFAULT '',
  `spec_text`       VARCHAR(255) NOT NULL DEFAULT '',
  `image`           VARCHAR(512) NOT NULL DEFAULT '',
  `price_cents`     BIGINT NOT NULL DEFAULT 0,
  `quantity`        INT NOT NULL DEFAULT 1,
  `subtotal_cents`  BIGINT NOT NULL DEFAULT 0,
  `refunded_cents`  BIGINT NOT NULL DEFAULT 0,
  `reviewed`        TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单商品';

CREATE TABLE IF NOT EXISTS `order_status_logs` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`    BIGINT UNSIGNED NOT NULL,
  `from_status` TINYINT NOT NULL DEFAULT 0,
  `to_status`   TINYINT NOT NULL DEFAULT 0,
  `action`      VARCHAR(64) NOT NULL DEFAULT '',
  `operator`    VARCHAR(64) NOT NULL DEFAULT '',
  `remark`      VARCHAR(512) NOT NULL DEFAULT '',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单状态流转日志';

CREATE TABLE IF NOT EXISTS `refunds` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `refund_no`    VARCHAR(32) NOT NULL,
  `order_id`     BIGINT UNSIGNED NOT NULL,
  `order_no`     VARCHAR(32) NOT NULL DEFAULT '',
  `user_id`      BIGINT UNSIGNED NOT NULL,
  `amount_cents` BIGINT NOT NULL DEFAULT 0,
  `reason`       VARCHAR(64)  NOT NULL DEFAULT '',
  `description`  VARCHAR(1024) NOT NULL DEFAULT '',
  `item_ids`     VARCHAR(255) NOT NULL DEFAULT '' COMMENT '逗号分隔',
  `status`       TINYINT NOT NULL DEFAULT 0 COMMENT '0待审核 1通过 2驳回 3已退款',
  `admin_remark` VARCHAR(512) NOT NULL DEFAULT '',
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_refund_no` (`refund_no`),
  KEY `idx_order` (`order_id`),
  KEY `idx_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退款单';

-- ---------------------------------------------------------------------------
-- 支付服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `payments` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_no`       VARCHAR(32) NOT NULL,
  `order_id`         BIGINT UNSIGNED NOT NULL,
  `order_no`         VARCHAR(32) NOT NULL DEFAULT '',
  `user_id`          BIGINT UNSIGNED NOT NULL,
  `amount_cents`     BIGINT NOT NULL DEFAULT 0,
  `refunded_cents`   BIGINT NOT NULL DEFAULT 0,
  `status`           TINYINT NOT NULL DEFAULT 1 COMMENT '1待支付 2成功 3失败 4关闭',
  `channel`          TINYINT NOT NULL DEFAULT 1 COMMENT '1微信 2支付宝 3余额',
  `transaction_id`   VARCHAR(64) NOT NULL DEFAULT '',
  `prepay_id`        VARCHAR(128) NOT NULL DEFAULT '',
  `pay_params`       TEXT COMMENT '唤起支付参数 JSON',
  `fail_reason`      VARCHAR(255) NOT NULL DEFAULT '',
  `paid_at`          DATETIME NULL,
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_no` (`payment_no`),
  KEY `idx_order` (`order_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status_created` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付流水';

CREATE TABLE IF NOT EXISTS `payment_refunds` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `refund_no`      VARCHAR(32) NOT NULL,
  `payment_id`     BIGINT UNSIGNED NOT NULL,
  `order_id`       BIGINT UNSIGNED NOT NULL,
  `amount_cents`   BIGINT NOT NULL DEFAULT 0,
  `status`         TINYINT NOT NULL DEFAULT 0,
  `reason`         VARCHAR(255) NOT NULL DEFAULT '',
  `transaction_id` VARCHAR(64) NOT NULL DEFAULT '',
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_refund_no` (`refund_no`),
  KEY `idx_payment` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付退款记录';

-- ---------------------------------------------------------------------------
-- 库存服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `inventories` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sku_id`          BIGINT UNSIGNED NOT NULL,
  `product_id`      BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `sku_code`        VARCHAR(64) NOT NULL DEFAULT '',
  `spec_text`       VARCHAR(255) NOT NULL DEFAULT '',
  `total_stock`     INT NOT NULL DEFAULT 0,
  `available_stock` INT NOT NULL DEFAULT 0,
  `locked_stock`    INT NOT NULL DEFAULT 0,
  `sold_stock`      INT NOT NULL DEFAULT 0,
  `safety_stock`    INT NOT NULL DEFAULT 0,
  `warehouse`       VARCHAR(64) NOT NULL DEFAULT '默认仓',
  `version`         INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本',
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sku` (`sku_id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_available` (`available_stock`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存';

CREATE TABLE IF NOT EXISTS `inventory_logs` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sku_id`       BIGINT UNSIGNED NOT NULL,
  `product_id`   BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `sku_code`     VARCHAR(64) NOT NULL DEFAULT '',
  `change_type`  TINYINT NOT NULL COMMENT '1入库 2预扣 3释放 4扣减 5调整 6退货入库',
  `quantity`     INT NOT NULL DEFAULT 0,
  `before_stock` INT NOT NULL DEFAULT 0,
  `after_stock`  INT NOT NULL DEFAULT 0,
  `biz_type`     VARCHAR(32) NOT NULL DEFAULT '',
  `biz_id`       VARCHAR(64) NOT NULL DEFAULT '',
  `operator`     VARCHAR(64) NOT NULL DEFAULT '',
  `remark`       VARCHAR(255) NOT NULL DEFAULT '',
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sku` (`sku_id`),
  KEY `idx_biz` (`biz_type`, `biz_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存流水';

-- ---------------------------------------------------------------------------
-- 营销服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `coupons` (
  `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`                 VARCHAR(128) NOT NULL,
  `code`                 VARCHAR(64) NOT NULL,
  `type`                 TINYINT NOT NULL DEFAULT 1 COMMENT '1满减 2折扣 3免运费',
  `face_value_cents`     BIGINT NOT NULL DEFAULT 0,
  `percent`              INT NOT NULL DEFAULT 100,
  `min_amount_cents`     BIGINT NOT NULL DEFAULT 0,
  `max_discount_cents`   BIGINT NOT NULL DEFAULT 0,
  `total_quantity`       BIGINT NOT NULL DEFAULT 0,
  `received_quantity`    BIGINT NOT NULL DEFAULT 0,
  `used_quantity`        BIGINT NOT NULL DEFAULT 0,
  `per_user_limit`       BIGINT NOT NULL DEFAULT 1,
  `start_time`           DATETIME NOT NULL,
  `end_time`             DATETIME NOT NULL,
  `category_id`          BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `enabled`              TINYINT NOT NULL DEFAULT 1,
  `created_at`           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_enabled_time` (`enabled`, `start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='优惠券';

CREATE TABLE IF NOT EXISTS `user_coupons` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `coupon_id`   BIGINT UNSIGNED NOT NULL,
  `status`      TINYINT NOT NULL DEFAULT 1 COMMENT '1未使用 2已使用 3已过期',
  `order_id`    BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `received_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `used_at`     DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_coupon` (`user_id`, `coupon_id`),
  KEY `idx_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户优惠券';

CREATE TABLE IF NOT EXISTS `promotions` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`             VARCHAR(128) NOT NULL,
  `description`      VARCHAR(512) NOT NULL DEFAULT '',
  `type`             TINYINT NOT NULL DEFAULT 1 COMMENT '1满减 2折扣 3秒杀 4拼团',
  `status`           TINYINT NOT NULL DEFAULT 0 COMMENT '0未开始 1进行中 2已结束 3已下线',
  `start_time`       DATETIME NOT NULL,
  `end_time`         DATETIME NOT NULL,
  `min_amount_cents` BIGINT NOT NULL DEFAULT 0,
  `discount_cents`   BIGINT NOT NULL DEFAULT 0,
  `percent`          INT NOT NULL DEFAULT 100,
  `product_id`       BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `limit_per_user`   INT NOT NULL DEFAULT 0,
  `sold_count`       BIGINT NOT NULL DEFAULT 0,
  `banner_image`     VARCHAR(512) NOT NULL DEFAULT '',
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status_time` (`status`, `start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='促销活动';

-- ---------------------------------------------------------------------------
-- 物流服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `shipments` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`       BIGINT UNSIGNED NOT NULL,
  `order_no`       VARCHAR(32) NOT NULL DEFAULT '',
  `tracking_no`    VARCHAR(64) NOT NULL DEFAULT '',
  `company`        VARCHAR(64) NOT NULL DEFAULT '',
  `company_code`   VARCHAR(32) NOT NULL DEFAULT '',
  `status`         TINYINT NOT NULL DEFAULT 1 COMMENT '1待发货 2已发货 3已签收 4异常',
  `receiver`       VARCHAR(64) NOT NULL DEFAULT '',
  `phone`          VARCHAR(32) NOT NULL DEFAULT '',
  `address`        VARCHAR(512) NOT NULL DEFAULT '',
  `freight_cents`  BIGINT NOT NULL DEFAULT 0,
  `item_count`     INT NOT NULL DEFAULT 0,
  `remark`         VARCHAR(512) NOT NULL DEFAULT '',
  `shipped_at`     DATETIME NULL,
  `delivered_at`   DATETIME NULL,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_tracking` (`tracking_no`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发货单';

CREATE TABLE IF NOT EXISTS `shipment_tracks` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shipment_id`  BIGINT UNSIGNED NOT NULL,
  `tracking_no`  VARCHAR(64) NOT NULL DEFAULT '',
  `location`     VARCHAR(128) NOT NULL DEFAULT '',
  `description`  VARCHAR(512) NOT NULL DEFAULT '',
  `occurred_at`  DATETIME NOT NULL,
  `sort`         INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_shipment` (`shipment_id`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物流轨迹';

CREATE TABLE IF NOT EXISTS `logistic_templates` (
  `id`                        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`                      VARCHAR(64) NOT NULL,
  `company`                   VARCHAR(64) NOT NULL DEFAULT '',
  `company_code`              VARCHAR(32) NOT NULL DEFAULT '',
  `freight_cents`             BIGINT NOT NULL DEFAULT 0,
  `free_freight_amount_cents` BIGINT NOT NULL DEFAULT 0,
  `regions`                   VARCHAR(512) NOT NULL DEFAULT '',
  `enabled`                   TINYINT NOT NULL DEFAULT 1,
  `sort`                      INT NOT NULL DEFAULT 0,
  `created_at`                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运费模板';

-- ---------------------------------------------------------------------------
-- 通知服务
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `type`       TINYINT NOT NULL DEFAULT 1 COMMENT '1订单 2物流 3营销 4系统',
  `title`      VARCHAR(200) NOT NULL DEFAULT '',
  `content`    VARCHAR(1024) NOT NULL DEFAULT '',
  `link`       VARCHAR(512) NOT NULL DEFAULT '',
  `biz_id`     BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `read`       TINYINT NOT NULL DEFAULT 0,
  `read_at`    DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_read` (`user_id`, `read`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='站内通知';

CREATE TABLE IF NOT EXISTS `sms_records` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `phone`         VARCHAR(32) NOT NULL,
  `code`          VARCHAR(16) NOT NULL DEFAULT '',
  `scene`         VARCHAR(32) NOT NULL DEFAULT '',
  `status`        TINYINT NOT NULL DEFAULT 1 COMMENT '1成功 0失败',
  `error_message` VARCHAR(512) NOT NULL DEFAULT '',
  `send_count`    INT NOT NULL DEFAULT 1,
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_phone` (`phone`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='短信发送记录';

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id`      BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `admin_name`    VARCHAR(64) NOT NULL DEFAULT '',
  `module`        VARCHAR(64) NOT NULL DEFAULT '',
  `action`        VARCHAR(64) NOT NULL DEFAULT '',
  `target_type`   VARCHAR(64) NOT NULL DEFAULT '',
  `target_id`     VARCHAR(64) NOT NULL DEFAULT '',
  `detail`        TEXT,
  `ip`            VARCHAR(64) NOT NULL DEFAULT '',
  `user_agent`    VARCHAR(512) NOT NULL DEFAULT '',
  `result`        TINYINT NOT NULL DEFAULT 1,
  `error_message` VARCHAR(512) NOT NULL DEFAULT '',
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_module_action` (`module`, `action`),
  KEY `idx_admin` (`admin_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作审计日志';

-- ---------------------------------------------------------------------------
-- 扩展表：积分明细 / 发票 / 素材库 / 系统配置
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_points_logs` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `title`      VARCHAR(128) NOT NULL DEFAULT '' COMMENT '变动说明',
  `change`     INT NOT NULL DEFAULT 0 COMMENT '正数增加，负数减少',
  `balance`    INT NOT NULL DEFAULT 0 COMMENT '变动后余额',
  `biz_type`   VARCHAR(32) NOT NULL DEFAULT '' COMMENT 'register/order/exchange/admin',
  `biz_id`     VARCHAR(64) NOT NULL DEFAULT '',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`, `id`),
  KEY `idx_biz` (`biz_type`, `biz_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分明细';

CREATE TABLE IF NOT EXISTS `user_invoices` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED NOT NULL,
  `order_no`      VARCHAR(32) NOT NULL DEFAULT '',
  `title`         VARCHAR(128) NOT NULL DEFAULT '' COMMENT '发票抬头',
  `tax_no`        VARCHAR(64) NOT NULL DEFAULT '' COMMENT '纳税人识别号',
  `type`          VARCHAR(16) NOT NULL DEFAULT 'personal' COMMENT 'personal/company',
  `email`         VARCHAR(128) NOT NULL DEFAULT '',
  `amount_cents`  BIGINT NOT NULL DEFAULT 0,
  `status`        TINYINT NOT NULL DEFAULT 0 COMMENT '0待开票 1已开票 2已驳回',
  `invoice_url`   VARCHAR(512) NOT NULL DEFAULT '',
  `remark`        VARCHAR(512) NOT NULL DEFAULT '',
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`, `id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发票申请';

CREATE TABLE IF NOT EXISTS `product_materials` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(200) NOT NULL DEFAULT '',
  `url`        VARCHAR(512) NOT NULL DEFAULT '',
  `type`       VARCHAR(16) NOT NULL DEFAULT 'image' COMMENT 'image/video',
  `size`       BIGINT NOT NULL DEFAULT 0 COMMENT '字节数',
  `folder`     VARCHAR(64) NOT NULL DEFAULT 'default',
  `sort`       INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_folder` (`folder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='素材库';

CREATE TABLE IF NOT EXISTS `system_settings` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key`         VARCHAR(128) NOT NULL,
  `value`       VARCHAR(1024) NOT NULL DEFAULT '',
  `name`        VARCHAR(128) NOT NULL DEFAULT '',
  `group`       VARCHAR(64) NOT NULL DEFAULT 'basic',
  `description` VARCHAR(255) NOT NULL DEFAULT '',
  `value_type`  VARCHAR(16) NOT NULL DEFAULT 'string',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_key` (`key`),
  KEY `idx_group` (`group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置';
