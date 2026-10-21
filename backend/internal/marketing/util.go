package marketing

import (
	"context"
	"errors"
	"strings"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/errs"
)

// resolveUserID 优先使用请求携带的用户 ID，缺省时回退到网关注入的登录身份。
func resolveUserID(ctx context.Context, requested int64) int64 {
	if requested > 0 {
		return requested
	}
	return auth.UserIDFromContext(ctx)
}

// isDuplicateKey 判断错误是否为唯一键冲突。
//
// MySQL 的唯一键冲突错误码为 1062，这里不引入驱动包依赖，直接按错误文本判定。
func isDuplicateKey(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "Duplicate entry") || strings.Contains(msg, "1062")
}

// isForeignKeyViolation 判断错误是否为外键约束冲突。
//
// MySQL 的外键冲突错误码为 1451，这里同样不引入驱动包依赖，按错误文本判定。
func isForeignKeyViolation(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "1451") || strings.Contains(msg, "foreign key constraint")
}

// asBizError 把任意错误还原为业务错误。
func asBizError(err error, target **errs.Error) bool {
	return errors.As(err, target)
}
