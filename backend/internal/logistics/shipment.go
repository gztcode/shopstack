package logistics

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"

	logisticsv1 "github.com/shopstack/platform/gen/go/logistics/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// returnAfterSale 是售后工单的只读投影，用于识别退货运单。
//
// 物流域只读取订单域落库的售后工单，不做任何写入。
type returnAfterSale struct {
	ID      uint64 `gorm:"column:id;primaryKey" json:"id"`
	OrderID uint64 `gorm:"column:order_id" json:"order_id"`
	Type    int8   `gorm:"column:type" json:"type"`
}

// TableName 指定表名。
func (returnAfterSale) TableName() string { return "after_sales" }

// 售后类型：退货退款与换货会产生退货运单。
const (
	returnAfterSaleTypeReturn   = 2
	returnAfterSaleTypeExchange = 3
)

// returnShipmentKeywords 是发货单备注中代表退件的关键字。
var returnShipmentKeywords = []string{"退货", "退件", "退回"}

// FindShipmentByTrackingNo 按运单号查询发货单。
func (r *Repo) FindShipmentByTrackingNo(ctx context.Context, trackingNo string) (*Shipment, error) {
	var s Shipment
	if err := r.db.WithContext(ctx).Where("tracking_no = ?", trackingNo).First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeShipmentNotFound, "运单号不存在")
		}
		return nil, err
	}
	return &s, nil
}

// ListReturnShipments 分页查询退货运单。
//
// 退货运单的判定：发货单所属订单存在「退货退款」或「换货」售后单，
// 或者发货单备注中标记了退货、退件、退回等关键字。
func (r *Repo) ListReturnShipments(ctx context.Context, q ShipmentQuery) ([]Shipment, int64, error) {
	tx := r.db.WithContext(ctx).Model(&Shipment{})

	afterSaleOrders := r.db.WithContext(ctx).Model(&returnAfterSale{}).
		Select("order_id").
		Where("type IN ?", []int8{returnAfterSaleTypeReturn, returnAfterSaleTypeExchange})

	conditions := []string{"order_id IN (?)", "remark LIKE ?"}
	args := []any{afterSaleOrders, "%" + returnShipmentKeywords[0] + "%"}
	for _, keyword := range returnShipmentKeywords[1:] {
		conditions = append(conditions, "remark LIKE ?")
		args = append(args, "%"+keyword+"%")
	}
	tx = tx.Where(strings.Join(conditions, " OR "), args...)

	if q.Status > 0 {
		tx = tx.Where("status = ?", q.Status)
	}
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		tx = tx.Where("tracking_no LIKE ? OR order_no LIKE ?", like, like)
	}
	if q.OrderID > 0 {
		tx = tx.Where("order_id = ?", q.OrderID)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Shipment
	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
	return list, total, err
}

// GetShipmentByTrackingNo 按运单号查询发货单。
func (s *Service) GetShipmentByTrackingNo(ctx context.Context, trackingNo string) (*logisticsv1.Shipment, error) {
	trackingNo = strings.TrimSpace(trackingNo)
	if trackingNo == "" {
		return nil, errs.New(errs.CodeInvalidParam, "运单号不能为空")
	}
	shipment, err := s.repo.FindShipmentByTrackingNo(ctx, trackingNo)
	if err != nil {
		return nil, err
	}
	return shipmentToProto(shipment), nil
}

// ListReturnShipments 查询退货运单列表。
func (s *Service) ListReturnShipments(ctx context.Context, req *logisticsv1.ListShipmentsRequest) (*logisticsv1.ListShipmentsResponse, error) {
	page, pageSize := normalizePage(req.GetPage())
	list, total, err := s.repo.ListReturnShipments(ctx, ShipmentQuery{
		Status:   req.GetStatus(),
		Keyword:  strings.TrimSpace(req.GetKeyword()),
		OrderID:  req.GetOrderId(),
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询退货运单失败", err)
	}
	out := make([]*logisticsv1.Shipment, 0, len(list))
	for i := range list {
		out = append(out, shipmentToProto(&list[i]))
	}
	return &logisticsv1.ListShipmentsResponse{Shipments: out, Meta: buildMeta(page, pageSize, total)}, nil
}
