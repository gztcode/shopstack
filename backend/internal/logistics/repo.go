package logistics

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/shopstack/platform/backend/internal/errs"
)

// Repo 封装物流域的数据访问。
type Repo struct {
	db *gorm.DB
}

// NewRepo 构造仓储。
func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }

// DB 暴露底层数据库句柄。
func (r *Repo) DB() *gorm.DB { return r.db }

// ---------------------------------------------------------------------------
// 发货单
// ---------------------------------------------------------------------------

// ShipmentQuery 是发货单列表的查询条件。
type ShipmentQuery struct {
	Status   int32
	Keyword  string
	OrderID  int64
	Page     int
	PageSize int
}

// ListShipments 分页查询发货单。
func (r *Repo) ListShipments(ctx context.Context, q ShipmentQuery) ([]Shipment, int64, error) {
	tx := r.db.WithContext(ctx).Model(&Shipment{})
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

// FindShipmentByOrderID 按订单 ID 查询发货单。
func (r *Repo) FindShipmentByOrderID(ctx context.Context, orderID uint64) (*Shipment, error) {
	var s Shipment
	if err := r.db.WithContext(ctx).Where("order_id = ?", orderID).First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

// FindShipmentByID 按 ID 查询发货单。
func (r *Repo) FindShipmentByID(ctx context.Context, id uint64) (*Shipment, error) {
	var s Shipment
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeShipmentNotFound, "发货单不存在")
		}
		return nil, err
	}
	return &s, nil
}

// CreateShipment 新增发货单。
func (r *Repo) CreateShipment(ctx context.Context, s *Shipment) error {
	return r.db.WithContext(ctx).Create(s).Error
}

// UpdateShipmentStatus 更新发货单状态。
func (r *Repo) UpdateShipmentStatus(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&Shipment{}).Where("id = ?", id).Updates(fields).Error
}

// ---------------------------------------------------------------------------
// 物流轨迹
// ---------------------------------------------------------------------------

// CreateTrack 新增物流轨迹。
func (r *Repo) CreateTrack(ctx context.Context, t *ShipmentTrack) error {
	return r.db.WithContext(ctx).Create(t).Error
}

// ListTracks 按发货单 ID 查询轨迹，按 sort、发生时间升序。
func (r *Repo) ListTracks(ctx context.Context, shipmentID uint64) ([]ShipmentTrack, error) {
	var list []ShipmentTrack
	err := r.db.WithContext(ctx).Where("shipment_id = ?", shipmentID).
		Order("sort ASC, occurred_at ASC, id ASC").Find(&list).Error
	return list, err
}

// NextTrackSort 返回下一条轨迹的排序号。
func (r *Repo) NextTrackSort(ctx context.Context, shipmentID uint64) (int32, error) {
	var maxSort int32
	err := r.db.WithContext(ctx).Model(&ShipmentTrack{}).
		Where("shipment_id = ?", shipmentID).
		Select("COALESCE(MAX(sort), 0)").Scan(&maxSort).Error
	if err != nil {
		return 0, err
	}
	return maxSort + 1, nil
}

// ---------------------------------------------------------------------------
// 运费模板
// ---------------------------------------------------------------------------

// ListTemplates 查询全部运费模板。
func (r *Repo) ListTemplates(ctx context.Context) ([]LogisticTemplate, error) {
	var list []LogisticTemplate
	err := r.db.WithContext(ctx).Order("sort ASC, id ASC").Find(&list).Error
	return list, err
}

// FindTemplateByID 按 ID 查询运费模板。
func (r *Repo) FindTemplateByID(ctx context.Context, id uint64) (*LogisticTemplate, error) {
	var t LogisticTemplate
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "运费模板不存在")
		}
		return nil, err
	}
	return &t, nil
}

// SaveTemplate 新增或更新运费模板。
func (r *Repo) SaveTemplate(ctx context.Context, t *LogisticTemplate) error {
	if t.ID == 0 {
		return r.db.WithContext(ctx).Create(t).Error
	}
	return r.db.WithContext(ctx).Model(&LogisticTemplate{}).Where("id = ?", t.ID).
		Updates(map[string]any{
			"name":                      t.Name,
			"company":                   t.Company,
			"company_code":              t.CompanyCode,
			"freight_cents":             t.FreightCents,
			"free_freight_amount_cents": t.FreeFreightAmountCents,
			"regions":                   t.Regions,
			"enabled":                   t.Enabled,
			"sort":                      t.Sort,
		}).Error
}

// DeleteTemplate 删除运费模板。
func (r *Repo) DeleteTemplate(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&LogisticTemplate{}, id).Error
}
