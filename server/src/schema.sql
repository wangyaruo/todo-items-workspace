-- 需求协作板 建表脚本
-- 执行方式：npm run init-db（会先建库再执行本文件）

CREATE TABLE IF NOT EXISTS items (
  id           VARCHAR(36)  NOT NULL,
  type         VARCHAR(16)  NOT NULL COMMENT 'requirement / defect',
  title        VARCHAR(200) NOT NULL,
  description  TEXT         NULL,
  status       VARCHAR(16)  NOT NULL DEFAULT 'pending' COMMENT 'pending / developing / verifying / passed / rework / archived',
  ports        VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '适用端口，逗号分隔：8080 / 8318',
  done_ports   VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '已完成端口，逗号分隔，须为 ports 的子集',
  created_at   DATETIME(3)  NOT NULL,
  updated_at   DATETIME(3)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_type_created (type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attachments (
  id          VARCHAR(36)   NOT NULL,
  item_id     VARCHAR(36)   NOT NULL,
  name        VARCHAR(255)  NOT NULL,
  size        INT UNSIGNED  NOT NULL,
  mime        VARCHAR(120)  NOT NULL,
  url         VARCHAR(500)  NOT NULL COMMENT '文件访问路径，文件本身存服务器磁盘',
  uploaded_at DATETIME(3)   NOT NULL,
  PRIMARY KEY (id),
  KEY idx_att_item (item_id),
  CONSTRAINT fk_att_item FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id              VARCHAR(36) NOT NULL,
  item_id         VARCHAR(36) NOT NULL,
  author          VARCHAR(50) NOT NULL,
  role            VARCHAR(16) NOT NULL COMMENT 'product / developer',
  body            TEXT        NOT NULL,
  created_at      DATETIME(3) NOT NULL,
  deleted_at      DATETIME(3) NULL COMMENT '软删除时间，非空即已删除（留痕，不展示内容）',
  deleted_by      VARCHAR(50) NULL COMMENT '删除人署名',
  deleted_by_role VARCHAR(16) NULL COMMENT '删除人角色 product / developer',
  PRIMARY KEY (id),
  KEY idx_cmt_item (item_id),
  CONSTRAINT fk_cmt_item FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
