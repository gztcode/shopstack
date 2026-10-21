// Package errs 定义统一的业务错误码与错误处理。
//
// 业务错误在 gRPC 链路中通过 google.rpc.ErrorInfo 附加信息传递，
// 网关据此还原出 {code, message} 结构，前端拿到的响应体保持一致。
package errs

import (
	"errors"
	"fmt"

	"google.golang.org/genproto/googleapis/rpc/errdetails"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ErrorDomain 是 ErrorInfo 的领域标识。
const ErrorDomain = "shopstack"

// 业务错误码区间划分：
//
//	0        成功
//	1000-1999 通用/参数/认证
//	2000-2999 用户
//	3000-3999 商品
//	4000-4999 购物车
//	5000-5999 订单
//	6000-6999 支付
//	7000-7999 库存
//	8000-8999 营销
//	9000-9999 物流/通知
const (
	CodeSuccess = 0

	CodeInternalError = 1000
	CodeInvalidParam  = 1001
	CodeNotFound      = 1002
	CodeUnauthorized  = 1003
	CodeForbidden     = 1004
	CodeConflict      = 1005
	CodeTooManyReq    = 1006
	CodeUnavailable   = 1007
	CodeTimeout       = 1008
)

const (
	CodeUserNotFound      = 2000
	CodeUserDisabled      = 2001
	CodePasswordIncorrect = 2002
	CodeUserExists        = 2003
	CodePhoneExists       = 2004
	CodeTokenInvalid      = 2005
	CodeTokenExpired      = 2006
	CodePermissionDenied  = 2007
)

const (
	CodeProductNotFound   = 3000
	CodeProductOffShelf   = 3001
	CodeSkuNotFound       = 3002
	CodeCategoryExists    = 3003
	CodeChannelNotFound   = 3004
	CodeReviewTagNotFound = 3005
	CodeGuaranteeNotFound = 3006
	CodeQuestionNotFound  = 3007
)

const (
	CodeCartItemNotFound = 4000
	CodeCartEmpty        = 4001
)

const (
	CodeOrderNotFound        = 5000
	CodeOrderStatusInvalid   = 5001
	CodeOrderCancelFailed    = 5002
	CodeRefundNotFound       = 5003
	CodeOrderEmpty           = 5004
	CodeAfterSaleNotFound    = 5005
	CodeRefundReasonNotFound = 5006
)

const (
	CodePaymentNotFound    = 6000
	CodePaymentFailed      = 6001
	CodePaymentDuplicated  = 6002
	CodeRefundFailed       = 6003
	CodeRechargeNotFound   = 6004
	CodePayChannelNotFound = 6005
)

const (
	CodeStockNotFound      = 7000
	CodeStockInsufficient  = 7001
	CodeStockLocked        = 7002
	CodeWarehouseNotFound  = 7003
	CodeStockCheckNotFound = 7004
)

const (
	CodeCouponNotFound     = 8000
	CodeCouponUnavailable  = 8001
	CodeCouponExpired      = 8002
	CodePromotionInvalid   = 8003
	CodePromotionNotFound  = 8004
	CodeGroupBuyNotFound   = 8005
	CodeTaskNotFound       = 8006
	CodeTaskCompleted      = 8007
	CodeTaskAlreadyClaimed = 8008
	CodeSignedToday        = 8009
)

const (
	CodeShipmentNotFound         = 9000
	CodeLogisticsError           = 9001
	CodeNotificationFail         = 9002
	CodeLogisticsCompanyNotFound = 9003
	CodeDeliveryRangeNotFound    = 9004
	CodeTemplateNotFound         = 9005
)

// Error 是可携带业务码的业务错误。
type Error struct {
	Code    int
	Msg     string
	HTTP    int
	cause   error
	Details map[string]string
}

func (e *Error) Error() string {
	if e.cause != nil {
		return fmt.Sprintf("[%d] %s: %v", e.Code, e.Msg, e.cause)
	}
	return fmt.Sprintf("[%d] %s", e.Code, e.Msg)
}

func (e *Error) Unwrap() error { return e.cause }

// WithCause 附加底层错误。
func (e *Error) WithCause(err error) *Error {
	e.cause = err
	return e
}

// WithDetail 附加上下文信息。
func (e *Error) WithDetail(key, value string) *Error {
	if e.Details == nil {
		e.Details = map[string]string{}
	}
	e.Details[key] = value
	return e
}

// WithHTTP 指定映射的 HTTP 状态码。
func (e *Error) WithHTTP(code int) *Error {
	e.HTTP = code
	return e
}

// GRPCStatus 实现 gRPC status 接口，把业务码与详情透传到调用方。
func (e *Error) GRPCStatus() *status.Status {
	st := status.New(codes.Code(e.grpcCode()), e.Msg)
	info := &errdetails.ErrorInfo{
		Reason:   fmt.Sprintf("CODE_%d", e.Code),
		Domain:   ErrorDomain,
		Metadata: e.Details,
	}
	if e.Details == nil {
		info.Metadata = map[string]string{}
	}
	withDetails, err := st.WithDetails(info)
	if err != nil {
		return st
	}
	return withDetails
}

func (e *Error) grpcCode() codes.Code {
	switch e.HTTP {
	case 400:
		return codes.InvalidArgument
	case 401:
		return codes.Unauthenticated
	case 403:
		return codes.PermissionDenied
	case 404:
		return codes.NotFound
	case 409:
		return codes.Aborted
	case 429:
		return codes.ResourceExhausted
	case 503:
		return codes.Unavailable
	case 504:
		return codes.DeadlineExceeded
	default:
		if e.Code >= 2000 && e.Code < 9000 {
			return codes.FailedPrecondition
		}
		return codes.Internal
	}
}

// New 创建一个业务错误。
func New(code int, msg string) *Error {
	return &Error{Code: code, Msg: msg, HTTP: 400}
}

// Newf 创建一个带格式化的业务错误。
func Newf(code int, format string, args ...any) *Error {
	return &Error{Code: code, Msg: fmt.Sprintf(format, args...), HTTP: 400}
}

// Wrap 包装底层错误为业务错误。
func Wrap(code int, msg string, cause error) *Error {
	return &Error{Code: code, Msg: msg, HTTP: 500, cause: cause}
}

// 常用错误构造器 -------------------------------------------------------------

func Internal(msg string) *Error { return &Error{Code: CodeInternalError, Msg: msg, HTTP: 500} }
func Invalid(msg string) *Error  { return &Error{Code: CodeInvalidParam, Msg: msg, HTTP: 400} }
func NotFound(msg string) *Error { return &Error{Code: CodeNotFound, Msg: msg, HTTP: 404} }
func Unauthorized(msg string) *Error {
	return &Error{Code: CodeUnauthorized, Msg: msg, HTTP: 401}
}
func Forbidden(msg string) *Error { return &Error{Code: CodeForbidden, Msg: msg, HTTP: 403} }
func Conflict(msg string) *Error  { return &Error{Code: CodeConflict, Msg: msg, HTTP: 409} }

// FromError 把任意错误转换成业务错误。
func FromError(err error) *Error {
	if err == nil {
		return nil
	}
	var bizErr *Error
	if errors.As(err, &bizErr) {
		return bizErr
	}
	st, ok := status.FromError(err)
	if ok && st.Code() != codes.Unknown {
		// 尝试从 ErrorInfo 还原业务码
		for _, d := range st.Details() {
			if info, ok := d.(*errdetails.ErrorInfo); ok && info.GetDomain() == ErrorDomain {
				code := 0
				if _, err := fmt.Sscanf(info.GetReason(), "CODE_%d", &code); err == nil {
					return &Error{Code: code, Msg: st.Message(), HTTP: httpFromGRPC(st.Code())}
				}
			}
		}
		return &Error{Code: CodeInternalError, Msg: st.Message(), HTTP: httpFromGRPC(st.Code())}
	}
	return &Error{Code: CodeInternalError, Msg: err.Error(), HTTP: 500, cause: err}
}

func httpFromGRPC(c codes.Code) int {
	switch c {
	case codes.InvalidArgument:
		return 400
	case codes.Unauthenticated:
		return 401
	case codes.PermissionDenied:
		return 403
	case codes.NotFound:
		return 404
	case codes.Aborted, codes.AlreadyExists, codes.FailedPrecondition:
		return 409
	case codes.ResourceExhausted:
		return 429
	case codes.Unavailable:
		return 503
	case codes.DeadlineExceeded:
		return 504
	default:
		return 500
	}
}

// IsCode 判断错误是否为指定业务码。
func IsCode(err error, code int) bool {
	bizErr := FromError(err)
	return bizErr != nil && bizErr.Code == code
}
