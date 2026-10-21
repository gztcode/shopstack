// Package httpx 提供网关层的 HTTP 基础设施：统一响应信封、错误处理与中间件。
package httpx

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/genproto/googleapis/rpc/errdetails"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/server"
)

// Envelope 是网关对前端暴露的统一响应结构。
//
//	{
//	  "code": 0,          // 业务码，0 表示成功
//	  "message": "ok",    // 提示信息，失败时可直接展示
//	  "data": { ... },    // 业务数据
//	  "trace_id": "..."   // 链路追踪 ID
//	}
type Envelope struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
	TraceID string          `json:"trace_id,omitempty"`
}

// SuccessEnvelope 构造成功响应。
func SuccessEnvelope(data any, traceID string) Envelope {
	raw, err := json.Marshal(data)
	if err != nil {
		raw = []byte("null")
	}
	return Envelope{Code: 0, Message: "ok", Data: raw, TraceID: traceID}
}

// ErrorEnvelope 构造错误响应。
func ErrorEnvelope(code int, message, traceID string) Envelope {
	return Envelope{Code: code, Message: message, Data: json.RawMessage("null"), TraceID: traceID}
}

// WriteJSON 直接写出 JSON 响应。
func WriteJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

// ---------------------------------------------------------------------------
// Marshaler
// ---------------------------------------------------------------------------

// EnvelopeMarshaler 在 JSON 编码时自动把业务数据包裹进统一信封。
//
// UseProtoNames=true 表示 JSON 字段名与 .proto 中的字段名完全一致（snake_case），
// 这样接口契约可以直接从 proto 文件阅读，前端也无需在两套命名之间做心智映射。
type EnvelopeMarshaler struct {
	*ProtoJSONMarshaler
}

// NewEnvelopeMarshaler 构造统一信封编码器。
func NewEnvelopeMarshaler() *EnvelopeMarshaler {
	return &EnvelopeMarshaler{ProtoJSONMarshaler: NewProtoJSONMarshaler()}
}

// ContentType 返回响应类型。
func (m *EnvelopeMarshaler) ContentType(v any) string {
	return "application/json; charset=utf-8"
}

// Marshal 在编码业务数据时套上统一信封。
//
// 注意：grpc-gateway 的 ForwardResponseMessage 走的是 Marshal 而非 NewEncoder，
// 因此信封必须在这里包装才能生效。请求体的反序列化走 Unmarshal，不受影响。
func (m *EnvelopeMarshaler) Marshal(v any) ([]byte, error) {
	raw, err := m.ProtoJSONMarshaler.Marshal(v)
	if err != nil {
		return nil, err
	}
	env := Envelope{Code: 0, Message: "ok", Data: json.RawMessage(raw)}
	return json.Marshal(env)
}

// ---------------------------------------------------------------------------
// 错误处理
// ---------------------------------------------------------------------------

// ErrorHandler 把 gRPC 错误转换为统一信封格式。
//
// 业务错误码通过 google.rpc.ErrorInfo 附加信息在服务间透传，
// 这里还原成 {code, message} 结构返回给前端。
func ErrorHandler(ctx context.Context, mux *runtime.ServeMux, marshaler runtime.Marshaler,
	w http.ResponseWriter, r *http.Request, err error) {

	bizErr := errs.FromError(err)
	traceID := server.TraceIDFromContext(ctx)

	httpStatus := bizErr.HTTP
	if httpStatus == 0 {
		httpStatus = runtime.HTTPStatusFromCode(status.Code(err))
	}
	if httpStatus < 100 || httpStatus > 599 {
		httpStatus = http.StatusInternalServerError
	}

	w.Header().Del("Trailer")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(httpStatus)

	env := ErrorEnvelope(bizErr.Code, bizErr.Msg, traceID)
	b, marshalErr := json.Marshal(env)
	if marshalErr != nil {
		http.Error(w, `{"code":1000,"message":"服务内部错误"}`, http.StatusInternalServerError)
		return
	}
	_, _ = w.Write(b)
	_, _ = w.Write([]byte("\n"))
}

// BusinessCodeFromStatus 从 gRPC 状态中解析业务错误码。
func BusinessCodeFromStatus(st *status.Status) (int, string) {
	for _, d := range st.Details() {
		if info, ok := d.(*errdetails.ErrorInfo); ok && info.GetDomain() == errs.ErrorDomain {
			if code, ok := parseBusinessCode(info.GetReason()); ok {
				return code, st.Message()
			}
		}
	}
	if st.Code() == codes.OK {
		return 0, st.Message()
	}
	return errs.CodeInternalError, st.Message()
}

// parseBusinessCode 解析形如 "CODE_1001" 的业务码。
func parseBusinessCode(reason string) (int, bool) {
	const prefix = "CODE_"
	if !strings.HasPrefix(reason, prefix) {
		return 0, false
	}
	code, err := strconv.Atoi(strings.TrimPrefix(reason, prefix))
	if err != nil {
		return 0, false
	}
	return code, true
}
