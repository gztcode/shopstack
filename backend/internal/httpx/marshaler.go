package httpx

import (
	"bytes"
	"encoding/json"
	"io"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protoreflect"
)

// ProtoJSONMarshaler 在 protojson 的基础上把 64 位整数字段输出为 JSON 数字。
//
// 为什么需要它：proto3 的 JSON 映射规范要求 int64/uint64 等 64 位整数序列化为
// **字符串**，以避免 JavaScript 的 53 位精度问题。但对前端而言，金额、ID 这类
// 字段用字符串会引发大量隐式转换与拼接错误。
//
// 本项目的所有 64 位数值（ID、金额分值、库存）都远小于 2^53，因此可以安全地
// 按数字输出。这里按 proto 描述符逐字段判断类型，只转换确为 64 位整数的字段，
// 不会误伤订单号这类「纯数字字符串」的业务字段。
type ProtoJSONMarshaler struct {
	options protojson.MarshalOptions
}

// NewProtoJSONMarshaler 构造带 64 位整数转换的 JSON 编码器。
func NewProtoJSONMarshaler() *ProtoJSONMarshaler {
	return &ProtoJSONMarshaler{
		options: protojson.MarshalOptions{
			EmitUnpopulated: true,
			UseProtoNames:   true,
		},
	}
}

// ContentType 返回响应类型。
func (m *ProtoJSONMarshaler) ContentType(v any) string {
	return "application/json; charset=utf-8"
}

// Marshal 序列化 protobuf 消息。
func (m *ProtoJSONMarshaler) Marshal(v any) ([]byte, error) {
	msg, ok := v.(proto.Message)
	if !ok {
		// 非 protobuf 值（例如错误信息结构）直接用标准库序列化
		return json.Marshal(v)
	}

	raw, err := m.options.Marshal(msg)
	if err != nil {
		return nil, err
	}

	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	var tree any
	if err := decoder.Decode(&tree); err != nil {
		return nil, err
	}

	converted := convertMessageFields(msg.ProtoReflect().Descriptor(), tree)
	return json.Marshal(converted)
}

// Unmarshal 反序列化请求体。
func (m *ProtoJSONMarshaler) Unmarshal(data []byte, v any) error {
	msg, ok := v.(proto.Message)
	if !ok {
		return json.Unmarshal(data, v)
	}
	return protojson.UnmarshalOptions{DiscardUnknown: true}.Unmarshal(data, msg)
}

// NewDecoder 返回请求体解码器。
func (m *ProtoJSONMarshaler) NewDecoder(r io.Reader) runtime.Decoder {
	pb := &runtime.JSONPb{
		MarshalOptions:   m.options,
		UnmarshalOptions: protojson.UnmarshalOptions{DiscardUnknown: true},
	}
	return pb.NewDecoder(r)
}

// NewEncoder 返回响应编码器。
func (m *ProtoJSONMarshaler) NewEncoder(w io.Writer) runtime.Encoder {
	return runtime.EncoderFunc(func(v any) error {
		b, err := m.Marshal(v)
		if err != nil {
			return err
		}
		if _, err := w.Write(b); err != nil {
			return err
		}
		_, err = w.Write([]byte("\n"))
		return err
	})
}

// convertMessageFields 按消息描述符递归处理 JSON 结构。
func convertMessageFields(desc protoreflect.MessageDescriptor, value any) any {
	obj, ok := value.(map[string]any)
	if !ok {
		return value
	}
	fields := desc.Fields()
	for i := 0; i < fields.Len(); i++ {
		fd := fields.Get(i)
		key := string(fd.Name()) // UseProtoNames=true 时 JSON 使用 proto 字段名
		raw, exists := obj[key]
		if !exists {
			continue
		}
		obj[key] = convertField(fd, raw)
	}
	return obj
}

// convertField 转换单个字段。
func convertField(fd protoreflect.FieldDescriptor, raw any) any {
	switch {
	case fd.IsMap():
		mapVal, ok := raw.(map[string]any)
		if !ok {
			return raw
		}
		valueDesc := fd.MapValue()
		for k, v := range mapVal {
			mapVal[k] = convertSingular(valueDesc, v)
		}
		return mapVal

	case fd.IsList():
		list, ok := raw.([]any)
		if !ok {
			return raw
		}
		for i, v := range list {
			list[i] = convertSingular(fd, v)
		}
		return list

	default:
		return convertSingular(fd, raw)
	}
}

// convertSingular 转换单个（非集合）值。
func convertSingular(fd protoreflect.FieldDescriptor, raw any) any {
	switch fd.Kind() {
	case protoreflect.Int64Kind, protoreflect.Uint64Kind,
		protoreflect.Sint64Kind, protoreflect.Fixed64Kind,
		protoreflect.Sfixed64Kind:
		return stringToNumber(raw)

	case protoreflect.MessageKind, protoreflect.GroupKind:
		return convertMessageFields(fd.Message(), raw)

	default:
		return raw
	}
}

// stringToNumber 把 JSON 数字字符串转成 json.Number；非整数字面量原样返回。
func stringToNumber(raw any) any {
	str, ok := raw.(string)
	if !ok || str == "" {
		return raw
	}
	for i := 0; i < len(str); i++ {
		c := str[i]
		if c == '-' {
			if i != 0 {
				return raw
			}
			continue
		}
		if c < '0' || c > '9' {
			return raw
		}
	}
	return json.Number(str)
}
