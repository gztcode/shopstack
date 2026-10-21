package inventory

import (
	"context"
	"errors"
	"math/rand"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	inventoryv1 "github.com/shopstack/platform/gen/go/inventory/v1"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/errs"
)

// Warehouse 是仓库模型。
type Warehouse struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Code      string    `gorm:"column:code;type:varchar(32);not null;uniqueIndex" json:"code"`
	Name      string    `gorm:"column:name;type:varchar(64);not null" json:"name"`
	Address   string    `gorm:"column:address;type:varchar(255);not null" json:"address"`
	Contact   string    `gorm:"column:contact;type:varchar(64);not null" json:"contact"`
	Phone     string    `gorm:"column:phone;type:varchar(32);not null" json:"phone"`
	Enabled   bool      `gorm:"column:enabled;not null" json:"enabled"`
	Sort      int       `gorm:"column:sort;not null;default:0" json:"sort"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName 指定表名。
func (Warehouse) TableName() string { return "warehouses" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListWarehouses 分页查询仓库列表。
func (r *Repo) ListWarehouses(ctx context.Context, keyword string, page, pageSize int) ([]Warehouse, int64, error) {
	q := r.db.WithContext(ctx).Model(&Warehouse{})
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("code LIKE ? OR name LIKE ? OR address LIKE ? OR contact LIKE ?", like, like, like, like)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Warehouse
	err := q.Order("sort ASC, id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindWarehouseByID 按 ID 查询仓库。
func (r *Repo) FindWarehouseByID(ctx context.Context, id uint64) (*Warehouse, error) {
	if id == 0 {
		return nil, errs.New(errs.CodeInvalidParam, "仓库 ID 不能为空")
	}
	var w Warehouse
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&w).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "仓库不存在")
		}
		return nil, err
	}
	return &w, nil
}

// FindWarehouseByCode 按仓库编码查询仓库。
func (r *Repo) FindWarehouseByCode(ctx context.Context, code string) (*Warehouse, error) {
	var w Warehouse
	if err := r.db.WithContext(ctx).Where("code = ?", code).First(&w).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "仓库不存在")
		}
		return nil, err
	}
	return &w, nil
}

// CreateWarehouse 新增仓库。
func (r *Repo) CreateWarehouse(ctx context.Context, w *Warehouse) error {
	if err := r.db.WithContext(ctx).Create(w).Error; err != nil {
		if isDuplicateKey(err) {
			return errs.New(errs.CodeConflict, "仓库编码已存在")
		}
		return err
	}
	return nil
}

// UpdateWarehouse 更新仓库。
func (r *Repo) UpdateWarehouse(ctx context.Context, id uint64, fields map[string]any) error {
	res := r.db.WithContext(ctx).Model(&Warehouse{}).Where("id = ?", id).Updates(fields)
	if res.Error != nil {
		if isDuplicateKey(res.Error) {
			return errs.New(errs.CodeConflict, "仓库编码已存在")
		}
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errs.New(errs.CodeNotFound, "仓库不存在")
	}
	return nil
}

// DeleteWarehouse 删除仓库。
func (r *Repo) DeleteWarehouse(ctx context.Context, id uint64) error {
	res := r.db.WithContext(ctx).Delete(&Warehouse{}, "id = ?", id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errs.New(errs.CodeNotFound, "仓库不存在")
	}
	return nil
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListWarehouses 分页查询仓库列表。
func (s *Service) ListWarehouses(ctx context.Context, keyword string, page *commonv1.PageRequest) (*inventoryv1.ListWarehousesResponse, error) {
	pageNum, pageSize := normalizePage(page)
	list, total, err := s.repo.ListWarehouses(ctx, strings.TrimSpace(keyword), pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询仓库失败", err)
	}
	out := make([]*inventoryv1.Warehouse, 0, len(list))
	for i := range list {
		out = append(out, warehouseToProto(&list[i]))
	}
	return &inventoryv1.ListWarehousesResponse{Warehouses: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
}

// SaveWarehouse 新增或更新仓库。
//
// id 为 0 时新增，否则按 ID 更新。
func (s *Service) SaveWarehouse(ctx context.Context, req *inventoryv1.SaveWarehouseRequest) (*inventoryv1.Warehouse, error) {
	code := strings.TrimSpace(req.GetCode())
	name := strings.TrimSpace(req.GetName())
	if code == "" {
		return nil, errs.New(errs.CodeInvalidParam, "仓库编码不能为空")
	}
	if name == "" {
		return nil, errs.New(errs.CodeInvalidParam, "仓库名称不能为空")
	}

	fields := map[string]any{
		"code":    code,
		"name":    name,
		"address": strings.TrimSpace(req.GetAddress()),
		"contact": strings.TrimSpace(req.GetContact()),
		"phone":   strings.TrimSpace(req.GetPhone()),
		"enabled": req.GetEnabled(),
		"sort":    int(req.GetSort()),
	}

	if req.GetId() > 0 {
		if _, err := s.repo.FindWarehouseByID(ctx, uint64(req.GetId())); err != nil {
			return nil, err
		}
		if err := s.repo.UpdateWarehouse(ctx, uint64(req.GetId()), fields); err != nil {
			return nil, err
		}
		updated, err := s.repo.FindWarehouseByID(ctx, uint64(req.GetId()))
		if err != nil {
			return nil, err
		}
		return warehouseToProto(updated), nil
	}

	w := &Warehouse{
		Code:    code,
		Name:    name,
		Address: fields["address"].(string),
		Contact: fields["contact"].(string),
		Phone:   fields["phone"].(string),
		Enabled: req.GetEnabled(),
		Sort:    int(req.GetSort()),
	}
	if err := s.repo.CreateWarehouse(ctx, w); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存仓库失败", err)
	}
	return warehouseToProto(w), nil
}

// DeleteWarehouse 删除仓库。
func (s *Service) DeleteWarehouse(ctx context.Context, id int64) error {
	if id <= 0 {
		return errs.New(errs.CodeInvalidParam, "仓库 ID 不能为空")
	}
	return s.repo.DeleteWarehouse(ctx, uint64(id))
}

// ---------------------------------------------------------------------------
// 转换辅助
// ---------------------------------------------------------------------------

func warehouseToProto(w *Warehouse) *inventoryv1.Warehouse {
	if w == nil {
		return nil
	}
	return &inventoryv1.Warehouse{
		Id:        int64(w.ID),
		Code:      w.Code,
		Name:      w.Name,
		Address:   w.Address,
		Contact:   w.Contact,
		Phone:     w.Phone,
		Enabled:   w.Enabled,
		Sort:      int32(w.Sort),
		CreatedAt: timestamppb.New(w.CreatedAt),
	}
}

// generateMoveNo 生成入库单 / 出库单 / 盘点单的单号。
func generateMoveNo(prefix string, t time.Time) string {
	return prefix + t.Format("20060102150405") + itoa(rand.Intn(1000000))
}

// itoa 把非负整数转换为字符串。
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	buf := [20]byte{}
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}

// isDuplicateKey 判断数据库错误是否为唯一键冲突。
func isDuplicateKey(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "Duplicate entry")
}

// operatorName 取当前操作人名称。
func operatorName(ctx context.Context) string {
	name := strings.TrimSpace(auth.UsernameFromContext(ctx))
	if name == "" {
		return "admin"
	}
	return name
}
