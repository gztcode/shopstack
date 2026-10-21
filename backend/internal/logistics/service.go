package logistics

import (
	"context"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	logisticsv1 "github.com/shopstack/platform/gen/go/logistics/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// Service 承载物流域的业务逻辑。
type Service struct {
	repo *Repo
}

// NewService 构造物流服务。
func NewService(repo *Repo) *Service {
	return &Service{repo: repo}
}

// ---------------------------------------------------------------------------
// 发货单
// ---------------------------------------------------------------------------

// GetShipment 按订单查询发货单与轨迹。
//
// 订单尚未发货时不报错，返回空的发货单与空轨迹，便于前端区分"未发货"。
func (s *Service) GetShipment(ctx context.Context, orderID int64) (*logisticsv1.ListShipmentTracksResponse, error) {
	if orderID <= 0 {
		return nil, errs.New(errs.CodeInvalidParam, "订单 ID 不能为空")
	}
	shipment, err := s.repo.FindShipmentByOrderID(ctx, uint64(orderID))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询发货单失败", err)
	}
	if shipment == nil {
		return &logisticsv1.ListShipmentTracksResponse{
			Shipment: nil,
			Tracks:   []*logisticsv1.ShipmentTrack{},
		}, nil
	}
	tracks, err := s.tracks(ctx, shipment.ID)
	if err != nil {
		return nil, err
	}
	return &logisticsv1.ListShipmentTracksResponse{
		Shipment: shipmentToProto(shipment),
		Tracks:   tracks,
	}, nil
}

// CreateShipment 管理员发货。
//
// 订单存在性只做参数级校验（跨服务查询订单由订单服务负责），
// 同一订单重复发货会被拒绝。
func (s *Service) CreateShipment(ctx context.Context, req *logisticsv1.CreateShipmentRequest) (*logisticsv1.Shipment, error) {
	orderID := req.GetOrderId()
	if orderID <= 0 {
		return nil, errs.New(errs.CodeInvalidParam, "订单号不能为空").
			WithDetail("order_id", "跨服务订单校验由订单服务负责，此处仅校验参数")
	}
	company := strings.TrimSpace(req.GetCompany())
	if company == "" {
		return nil, errs.New(errs.CodeInvalidParam, "快递公司不能为空")
	}
	trackingNo := strings.TrimSpace(req.GetTrackingNo())
	if trackingNo == "" {
		return nil, errs.New(errs.CodeInvalidParam, "运单号不能为空")
	}
	if req.GetFreightCents() < 0 {
		return nil, errs.New(errs.CodeInvalidParam, "运费不能为负数")
	}

	existing, err := s.repo.FindShipmentByOrderID(ctx, uint64(orderID))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询发货单失败", err)
	}
	if existing != nil {
		return nil, errs.New(errs.CodeConflict, "该订单已发货，不能重复发货")
	}

	now := time.Now()
	shipment := &Shipment{
		OrderID:      uint64(orderID),
		TrackingNo:   trackingNo,
		Company:      company,
		CompanyCode:  req.GetCompanyCode(),
		Status:       ShipmentStatusShipped,
		FreightCents: req.GetFreightCents(),
		ItemCount:    1, // proto 未提供商品数量，默认按一件处理
		Remark:       req.GetRemark(),
		ShippedAt:    &now,
	}

	err = s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(shipment).Error; err != nil {
			return err
		}
		return tx.Create(&ShipmentTrack{
			ShipmentID:  shipment.ID,
			TrackingNo:  trackingNo,
			Location:    "仓库",
			Description: "商品已出库",
			OccurredAt:  now,
			Sort:        1,
		}).Error
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "创建发货单失败", err)
	}
	return shipmentToProto(shipment), nil
}

// ListShipments 分页查询发货单。
func (s *Service) ListShipments(ctx context.Context, req *logisticsv1.ListShipmentsRequest) (*logisticsv1.ListShipmentsResponse, error) {
	page, pageSize := normalizePage(req.GetPage())
	list, total, err := s.repo.ListShipments(ctx, ShipmentQuery{
		Status:   req.GetStatus(),
		Keyword:  strings.TrimSpace(req.GetKeyword()),
		OrderID:  req.GetOrderId(),
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询发货单失败", err)
	}
	out := make([]*logisticsv1.Shipment, 0, len(list))
	for i := range list {
		out = append(out, shipmentToProto(&list[i]))
	}
	return &logisticsv1.ListShipmentsResponse{Shipments: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// ListTracks 按发货单或订单查询物流轨迹。
func (s *Service) ListTracks(ctx context.Context, shipmentID, orderID int64) (*logisticsv1.ListShipmentTracksResponse, error) {
	if shipmentID <= 0 && orderID <= 0 {
		return nil, errs.New(errs.CodeInvalidParam, "发货单 ID 与订单 ID 至少提供一个")
	}

	var shipment *Shipment
	var err error
	if shipmentID > 0 {
		shipment, err = s.repo.FindShipmentByID(ctx, uint64(shipmentID))
		if err != nil {
			return nil, err
		}
	} else {
		shipment, err = s.repo.FindShipmentByOrderID(ctx, uint64(orderID))
		if err != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "查询发货单失败", err)
		}
	}
	if shipment == nil {
		return &logisticsv1.ListShipmentTracksResponse{
			Shipment: nil,
			Tracks:   []*logisticsv1.ShipmentTrack{},
		}, nil
	}

	tracks, err := s.tracks(ctx, shipment.ID)
	if err != nil {
		return nil, err
	}
	return &logisticsv1.ListShipmentTracksResponse{
		Shipment: shipmentToProto(shipment),
		Tracks:   tracks,
	}, nil
}

// UpdateStatus 更新发货单状态。
//
// 状态变为已发货或已签收时自动追加一条物流轨迹。
func (s *Service) UpdateStatus(ctx context.Context, req *logisticsv1.UpdateShipmentStatusRequest) (*logisticsv1.Shipment, error) {
	if req.GetId() <= 0 {
		return nil, errs.New(errs.CodeInvalidParam, "发货单 ID 不能为空")
	}
	status := req.GetStatus()
	switch status {
	case ShipmentStatusPending, ShipmentStatusShipped, ShipmentStatusDelivered, ShipmentStatusException:
	default:
		return nil, errs.New(errs.CodeInvalidParam, "发货单状态不合法")
	}

	shipment, err := s.repo.FindShipmentByID(ctx, uint64(req.GetId()))
	if err != nil {
		return nil, err
	}

	now := time.Now()
	fields := map[string]any{"status": int8(status)}
	switch status {
	case ShipmentStatusShipped:
		if shipment.ShippedAt == nil {
			fields["shipped_at"] = &now
		}
	case ShipmentStatusDelivered:
		fields["delivered_at"] = &now
		if shipment.ShippedAt == nil {
			fields["shipped_at"] = &now
		}
	}

	location := strings.TrimSpace(req.GetLocation())
	description := strings.TrimSpace(req.GetDescription())
	if description == "" {
		description = defaultStatusDescription(status)
	}
	if location == "" {
		location = defaultStatusLocation(status)
	}

	err = s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&Shipment{}).Where("id = ?", shipment.ID).Updates(fields).Error; err != nil {
			return err
		}
		if status != ShipmentStatusShipped && status != ShipmentStatusDelivered {
			return nil
		}
		sort, err := s.repo.NextTrackSort(ctx, shipment.ID)
		if err != nil {
			return err
		}
		return tx.Create(&ShipmentTrack{
			ShipmentID:  shipment.ID,
			TrackingNo:  shipment.TrackingNo,
			Location:    location,
			Description: description,
			OccurredAt:  now,
			Sort:        sort,
		}).Error
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新发货单状态失败", err)
	}

	updated, err := s.repo.FindShipmentByID(ctx, shipment.ID)
	if err != nil {
		return nil, err
	}
	return shipmentToProto(updated), nil
}

// ---------------------------------------------------------------------------
// 运费模板
// ---------------------------------------------------------------------------

// ListTemplates 查询运费模板列表。
func (s *Service) ListTemplates(ctx context.Context) (*logisticsv1.ListTemplatesResponse, error) {
	list, err := s.repo.ListTemplates(ctx)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询运费模板失败", err)
	}
	out := make([]*logisticsv1.LogisticTemplate, 0, len(list))
	for i := range list {
		out = append(out, templateToProto(&list[i]))
	}
	return &logisticsv1.ListTemplatesResponse{Templates: out}, nil
}

// SaveTemplate 新增或更新运费模板。
func (s *Service) SaveTemplate(ctx context.Context, req *logisticsv1.SaveTemplateRequest) (*logisticsv1.LogisticTemplate, error) {
	name := strings.TrimSpace(req.GetName())
	if name == "" {
		return nil, errs.New(errs.CodeInvalidParam, "运费模板名称不能为空")
	}
	if req.GetFreightCents() < 0 {
		return nil, errs.New(errs.CodeInvalidParam, "运费不能为负数")
	}
	if req.GetFreeFreightAmountCents() < 0 {
		return nil, errs.New(errs.CodeInvalidParam, "免邮门槛不能为负数")
	}

	t := &LogisticTemplate{
		ID:                     uint64(req.GetId()),
		Name:                   name,
		Company:                req.GetCompany(),
		CompanyCode:            req.GetCompanyCode(),
		FreightCents:           req.GetFreightCents(),
		FreeFreightAmountCents: req.GetFreeFreightAmountCents(),
		Regions:                req.GetRegions(),
		Enabled:                req.GetEnabled(),
		Sort:                   req.GetSort(),
	}
	if err := s.repo.SaveTemplate(ctx, t); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存运费模板失败", err)
	}
	saved, err := s.repo.FindTemplateByID(ctx, t.ID)
	if err != nil {
		return nil, err
	}
	return templateToProto(saved), nil
}

// DeleteTemplate 删除运费模板。
func (s *Service) DeleteTemplate(ctx context.Context, id int64) error {
	if id <= 0 {
		return errs.New(errs.CodeInvalidParam, "运费模板 ID 不能为空")
	}
	if _, err := s.repo.FindTemplateByID(ctx, uint64(id)); err != nil {
		return err
	}
	if err := s.repo.DeleteTemplate(ctx, uint64(id)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除运费模板失败", err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// 内部辅助
// ---------------------------------------------------------------------------

// tracks 读取发货单的轨迹列表。
func (s *Service) tracks(ctx context.Context, shipmentID uint64) ([]*logisticsv1.ShipmentTrack, error) {
	list, err := s.repo.ListTracks(ctx, shipmentID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询物流轨迹失败", err)
	}
	out := make([]*logisticsv1.ShipmentTrack, 0, len(list))
	for i := range list {
		out = append(out, trackToProto(&list[i]))
	}
	return out, nil
}

// defaultStatusDescription 返回状态变更的默认文案。
func defaultStatusDescription(status int32) string {
	switch status {
	case ShipmentStatusPending:
		return "等待商家发货"
	case ShipmentStatusShipped:
		return "包裹已发出"
	case ShipmentStatusDelivered:
		return "包裹已签收"
	case ShipmentStatusException:
		return "物流异常"
	default:
		return "物流状态已更新"
	}
}

// defaultStatusLocation 返回状态变更的默认地点。
func defaultStatusLocation(status int32) string {
	switch status {
	case ShipmentStatusPending:
		return "仓库"
	case ShipmentStatusShipped:
		return "发货仓"
	case ShipmentStatusDelivered:
		return "收货地"
	case ShipmentStatusException:
		return "中转站"
	default:
		return ""
	}
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func shipmentToProto(s *Shipment) *logisticsv1.Shipment {
	if s == nil {
		return nil
	}
	out := &logisticsv1.Shipment{
		Id:           int64(s.ID),
		OrderId:      int64(s.OrderID),
		OrderNo:      s.OrderNo,
		TrackingNo:   s.TrackingNo,
		Company:      s.Company,
		CompanyCode:  s.CompanyCode,
		Status:       commonv1.ShipmentStatus(s.Status),
		Receiver:     s.Receiver,
		Phone:        s.Phone,
		Address:      s.Address,
		FreightCents: s.FreightCents,
		ItemCount:    s.ItemCount,
		Remark:       s.Remark,
		CreatedAt:    timestamppb.New(s.CreatedAt),
	}
	if s.ShippedAt != nil {
		out.ShippedAt = timestamppb.New(*s.ShippedAt)
	}
	if s.DeliveredAt != nil {
		out.DeliveredAt = timestamppb.New(*s.DeliveredAt)
	}
	return out
}

func trackToProto(t *ShipmentTrack) *logisticsv1.ShipmentTrack {
	if t == nil {
		return nil
	}
	return &logisticsv1.ShipmentTrack{
		Id:          int64(t.ID),
		ShipmentId:  int64(t.ShipmentID),
		TrackingNo:  t.TrackingNo,
		Location:    t.Location,
		Description: t.Description,
		OccurredAt:  timestamppb.New(t.OccurredAt),
		Sort:        t.Sort,
	}
}

func templateToProto(t *LogisticTemplate) *logisticsv1.LogisticTemplate {
	if t == nil {
		return nil
	}
	return &logisticsv1.LogisticTemplate{
		Id:                     int64(t.ID),
		Name:                   t.Name,
		Company:                t.Company,
		CompanyCode:            t.CompanyCode,
		FreightCents:           t.FreightCents,
		FreeFreightAmountCents: t.FreeFreightAmountCents,
		Enabled:                t.Enabled,
		Sort:                   t.Sort,
		Regions:                t.Regions,
	}
}

func normalizePage(page *commonv1.PageRequest) (int, int) {
	pageNum := int(page.GetPage())
	pageSize := int(page.GetPageSize())
	if pageNum <= 0 {
		pageNum = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return pageNum, pageSize
}

func buildMeta(page, pageSize int, total int64) *commonv1.PageMeta {
	totalPages := int64(0)
	if pageSize > 0 {
		totalPages = (total + int64(pageSize) - 1) / int64(pageSize)
	}
	return &commonv1.PageMeta{
		Page: int32(page), PageSize: int32(pageSize),
		Total: total, TotalPages: int32(totalPages),
	}
}
