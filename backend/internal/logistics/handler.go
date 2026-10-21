package logistics

import (
	"context"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	logisticsv1 "github.com/shopstack/platform/gen/go/logistics/v1"
)

// Handler 实现 LogisticsService。
type Handler struct {
	logisticsv1.UnimplementedLogisticsServiceServer
	service *Service
}

// NewHandler 构造处理器。
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Handler 必须实现 LogisticsService 的全部方法。
var _ logisticsv1.LogisticsServiceServer = (*Handler)(nil)

// GetShipment 查询订单的发货信息。
func (h *Handler) GetShipment(ctx context.Context, req *logisticsv1.GetShipmentRequest) (*logisticsv1.ListShipmentTracksResponse, error) {
	return h.service.GetShipment(ctx, req.GetOrderId())
}

// CreateShipment 创建发货单。
func (h *Handler) CreateShipment(ctx context.Context, req *logisticsv1.CreateShipmentRequest) (*logisticsv1.Shipment, error) {
	return h.service.CreateShipment(ctx, req)
}

// ListShipments 查询发货单列表。
func (h *Handler) ListShipments(ctx context.Context, req *logisticsv1.ListShipmentsRequest) (*logisticsv1.ListShipmentsResponse, error) {
	return h.service.ListShipments(ctx, req)
}

// ListTracks 查询物流轨迹。
func (h *Handler) ListTracks(ctx context.Context, req *logisticsv1.ListShipmentTracksRequest) (*logisticsv1.ListShipmentTracksResponse, error) {
	return h.service.ListTracks(ctx, req.GetShipmentId(), req.GetOrderId())
}

// UpdateStatus 更新发货单状态。
func (h *Handler) UpdateStatus(ctx context.Context, req *logisticsv1.UpdateShipmentStatusRequest) (*logisticsv1.Shipment, error) {
	return h.service.UpdateStatus(ctx, req)
}

// ListTemplates 查询运费模板。
func (h *Handler) ListTemplates(ctx context.Context, _ *logisticsv1.ListTemplatesRequest) (*logisticsv1.ListTemplatesResponse, error) {
	return h.service.ListTemplates(ctx)
}

// SaveTemplate 保存运费模板。
func (h *Handler) SaveTemplate(ctx context.Context, req *logisticsv1.SaveTemplateRequest) (*logisticsv1.LogisticTemplate, error) {
	return h.service.SaveTemplate(ctx, req)
}

// DeleteTemplate 删除运费模板。
func (h *Handler) DeleteTemplate(ctx context.Context, req *logisticsv1.DeleteTemplateRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeleteTemplate(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "运费模板已删除"}, nil
}

// ListLogisticsCompanies 查询快递公司列表。
func (h *Handler) ListLogisticsCompanies(ctx context.Context, req *logisticsv1.ListLogisticsCompaniesRequest) (*logisticsv1.ListLogisticsCompaniesResponse, error) {
	return h.service.ListLogisticsCompanies(ctx, req)
}

// CalculateFreight 运费试算。
func (h *Handler) CalculateFreight(ctx context.Context, req *logisticsv1.CalculateFreightRequest) (*logisticsv1.CalculateFreightResponse, error) {
	return h.service.CalculateFreight(ctx, req)
}

// ListDeliveryRanges 查询配送范围列表。
func (h *Handler) ListDeliveryRanges(ctx context.Context, req *logisticsv1.ListDeliveryRangesRequest) (*logisticsv1.ListDeliveryRangesResponse, error) {
	return h.service.ListDeliveryRanges(ctx, req)
}

// GetShipmentByTrackingNo 按运单号查询发货单。
func (h *Handler) GetShipmentByTrackingNo(ctx context.Context, req *logisticsv1.GetShipmentByTrackingNoRequest) (*logisticsv1.Shipment, error) {
	return h.service.GetShipmentByTrackingNo(ctx, req.GetTrackingNo())
}

// SaveLogisticsCompany 保存快递公司。
func (h *Handler) SaveLogisticsCompany(ctx context.Context, req *logisticsv1.SaveLogisticsCompanyRequest) (*logisticsv1.LogisticsCompany, error) {
	return h.service.SaveLogisticsCompany(ctx, req)
}

// DeleteLogisticsCompany 删除快递公司。
func (h *Handler) DeleteLogisticsCompany(ctx context.Context, req *logisticsv1.DeleteLogisticsCompanyRequest) (*commonv1.OperationResult, error) {
	if err := h.service.DeleteLogisticsCompany(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "快递公司已删除"}, nil
}

// SaveDeliveryRange 保存配送范围。
func (h *Handler) SaveDeliveryRange(ctx context.Context, req *logisticsv1.SaveDeliveryRangeRequest) (*logisticsv1.DeliveryRange, error) {
	return h.service.SaveDeliveryRange(ctx, req)
}

// ListReturnShipments 查询退货运单列表。
func (h *Handler) ListReturnShipments(ctx context.Context, req *logisticsv1.ListShipmentsRequest) (*logisticsv1.ListShipmentsResponse, error) {
	return h.service.ListReturnShipments(ctx, req)
}
