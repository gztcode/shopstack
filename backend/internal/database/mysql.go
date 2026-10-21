// Package database 封装 GORM 数据库连接与迁移。
package database

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"

	shoplogger "github.com/shopstack/platform/backend/internal/logger"
)

// Options 控制数据库连接行为。
type Options struct {
	MaxIdle     int
	MaxOpen     int
	MaxLifetime time.Duration
	LogLevel    string
	AutoMigrate bool
	Models      []any
}

// New 建立数据库连接并执行可选的自动迁移。
func New(dsn string, opts Options) (*gorm.DB, error) {
	if opts.MaxIdle <= 0 {
		opts.MaxIdle = 10
	}
	if opts.MaxOpen <= 0 {
		opts.MaxOpen = 100
	}
	if opts.MaxLifetime <= 0 {
		opts.MaxLifetime = time.Hour
	}
	level := logger.Warn
	switch opts.LogLevel {
	case "debug", "info":
		level = logger.Info
	case "error":
		level = logger.Error
	case "silent":
		level = logger.Silent
	}

	gormCfg := &gorm.Config{
		Logger: logger.Default.LogMode(level),
		NamingStrategy: schema.NamingStrategy{
			SingularTable: false,
		},
		SkipDefaultTransaction: true,
		PrepareStmt:            true,
	}

	db, err := gorm.Open(mysql.Open(dsn), gormCfg)
	if err != nil {
		return nil, fmt.Errorf("连接数据库失败: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("获取连接池失败: %w", err)
	}
	sqlDB.SetMaxIdleConns(opts.MaxIdle)
	sqlDB.SetMaxOpenConns(opts.MaxOpen)
	sqlDB.SetConnMaxLifetime(opts.MaxLifetime)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("数据库连通性检查失败: %w", err)
	}

	if opts.AutoMigrate && len(opts.Models) > 0 {
		if err := db.AutoMigrate(opts.Models...); err != nil {
			return nil, fmt.Errorf("自动迁移失败: %w", err)
		}
		shoplogger.L().Info("数据库自动迁移完成", zap.Int("模型数", len(opts.Models)))
	}

	return db, nil
}

// Close 关闭连接池。
func Close(db *gorm.DB) error {
	if db == nil {
		return nil
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// Tx 在事务中执行 fn，异常时自动回滚。
func Tx(ctx context.Context, db *gorm.DB, fn func(tx *gorm.DB) error) error {
	return db.WithContext(ctx).Transaction(fn)
}
