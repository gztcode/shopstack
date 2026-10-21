// Package logger 提供基于 zap 的结构化日志能力。
package logger

import (
	"os"
	"path/filepath"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	mu     sync.RWMutex
	logger *zap.Logger
)

func init() {
	// 默认初始化为控制台 INFO 日志，保证任何时候都有可用实例。
	_ = Init("info", "console", "stdout", "")
}

// Init 重新初始化全局 logger。
func Init(level, format, output, filename string) error {
	var zapCfg zap.Config
	if format == "json" {
		zapCfg = zap.NewProductionConfig()
	} else {
		zapCfg = zap.NewDevelopmentConfig()
		zapCfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	if level != "" {
		lvl, err := zap.ParseAtomicLevel(level)
		if err != nil {
			return err
		}
		zapCfg.Level = lvl
	}
	zapCfg.Encoding = format
	if format == "console" {
		zapCfg.EncoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout("2006-01-02 15:04:05.000")
	}

	if output == "file" && filename != "" {
		if err := os.MkdirAll(filepath.Dir(filename), 0o755); err != nil {
			return err
		}
		f, err := os.OpenFile(filename, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
		if err != nil {
			return err
		}
		zapCfg.OutputPaths = []string{filename}
		zapCfg.ErrorOutputPaths = []string{filename}
		_ = f.Close()
	}

	l, err := zapCfg.Build(zap.AddCallerSkip(1))
	if err != nil {
		return err
	}

	mu.Lock()
	defer mu.Unlock()
	if logger != nil {
		_ = logger.Sync()
	}
	logger = l
	return nil
}

// L 返回全局 logger。
func L() *zap.Logger {
	mu.RLock()
	defer mu.RUnlock()
	if logger == nil {
		return zap.NewNop()
	}
	return logger
}

// Sync 刷盘。
func Sync() {
	mu.RLock()
	defer mu.RUnlock()
	if logger != nil {
		_ = logger.Sync()
	}
}
