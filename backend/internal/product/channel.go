package product

import (
	"context"
	"errors"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	productv1 "github.com/shopstack/platform/gen/go/product/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// 频道类型
const (
	ChannelTypeRecommend = 1 // 推荐
	ChannelTypeNewest    = 2 // 新品
	ChannelTypeHot       = 3 // 热销
	ChannelTypeFlash     = 4 // 限时
	ChannelTypePresale   = 5 // 预售
	ChannelTypeClearance = 6 // 清仓
	ChannelTypeFreeShip  = 7 // 包邮
	ChannelTypeCross     = 8 // 跨境
)

// 频道状态
const (
	ChannelStatusDisabled = 0 // 停用
	ChannelStatusEnabled  = 1 // 启用
)

// channelCodeTags 描述频道编码与商品标签的对应关系。
//
// channels 与 products 之间没有外键或中间表，频道与商品的关联
// 只能落在商品自身的 tags 字段上，因此这里用编码做一级映射。
var channelCodeTags = map[string]string{
	"flash":     "限时",
	"presale":   "预售",
	"clearance": "清仓",
	"freeship":  "包邮",
	"cross":     "跨境",
	"fresh":     "生鲜",
}

// channelTypeTags 是编码缺失时的兜底映射。
var channelTypeTags = map[int8]string{
	ChannelTypeFlash:     "限时",
	ChannelTypePresale:   "预售",
	ChannelTypeClearance: "清仓",
	ChannelTypeFreeShip:  "包邮",
	ChannelTypeCross:     "跨境",
}

// genericChannelNames 是无法定位到具体标签的泛化频道名称。
var genericChannelNames = map[string]bool{
	"推荐": true,
	"新品": true,
	"热销": true,
	"楼层": true,
}

// Channel 是首页频道与楼层模型。
type Channel struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name         string    `gorm:"type:varchar(64);not null;default:''" json:"name"`
	Code         string    `gorm:"type:varchar(64);not null;uniqueIndex:uk_code" json:"code"`
	Icon         string    `gorm:"type:varchar(512);not null;default:''" json:"icon"`
	BannerURL    string    `gorm:"column:banner_url;type:varchar(512);not null;default:''" json:"banner_url"`
	Description  string    `gorm:"type:varchar(512);not null;default:''" json:"description"`
	Sort         int       `gorm:"not null;default:0" json:"sort"`
	Type         int8      `gorm:"tinyint;not null;default:1" json:"type"`
	Status       int8      `gorm:"tinyint;not null;default:1" json:"status"`
	ProductCount int       `gorm:"column:product_count;not null;default:0" json:"product_count"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// TableName 指定表名。
func (Channel) TableName() string { return "channels" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListChannels 分页查询频道。
func (r *Repo) ListChannels(ctx context.Context, keyword string, channelType int32, page, pageSize int) ([]Channel, int64, error) {
	tx := r.db.WithContext(ctx).Model(&Channel{})
	if keyword != "" {
		like := "%" + keyword + "%"
		tx = tx.Where("name LIKE ? OR code LIKE ?", like, like)
	}
	if channelType > 0 {
		tx = tx.Where("type = ?", channelType)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []Channel
	err := tx.Order("sort ASC, id ASC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindChannelByID 按 ID 查询频道。
func (r *Repo) FindChannelByID(ctx context.Context, id uint64) (*Channel, error) {
	var c Channel
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "频道不存在")
		}
		return nil, err
	}
	return &c, nil
}

// FindChannelByCode 按编码查询频道。
func (r *Repo) FindChannelByCode(ctx context.Context, code string) (*Channel, error) {
	var c Channel
	if err := r.db.WithContext(ctx).Where("code = ?", code).First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "频道不存在")
		}
		return nil, err
	}
	return &c, nil
}

// SaveChannel 新增或更新频道。
func (r *Repo) SaveChannel(ctx context.Context, c *Channel) error {
	return r.db.WithContext(ctx).Save(c).Error
}

// DeleteChannel 删除频道。
func (r *Repo) DeleteChannel(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&Channel{}, id).Error
}

// UpdateChannelProductCount 更新频道下的商品数量。
func (r *Repo) UpdateChannelProductCount(ctx context.Context, id uint64, count int) error {
	return r.db.WithContext(ctx).Model(&Channel{}).Where("id = ?", id).
		UpdateColumn("product_count", count).Error
}

// ChannelProductQuery 描述频道商品的查询条件。
type ChannelProductQuery struct {
	Keyword  string
	Tags     []string
	Sort     string
	Page     int
	PageSize int
}

// ListChannelProducts 分页查询频道下的商品。
func (r *Repo) ListChannelProducts(ctx context.Context, q ChannelProductQuery) ([]Product, int64, error) {
	tx := r.channelProductQuery(ctx, q)

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	switch q.Sort {
	case "sales":
		tx = tx.Order("sales_count DESC, id DESC")
	case "price_asc":
		tx = tx.Order("min_price_cents ASC, id DESC")
	case "price_desc":
		tx = tx.Order("min_price_cents DESC, id DESC")
	case "newest":
		tx = tx.Order("id DESC")
	default:
		tx = tx.Order("sales_count DESC, id DESC")
	}

	var list []Product
	err := tx.Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
	return list, total, err
}

// CountChannelProducts 统计频道下的商品数量。
func (r *Repo) CountChannelProducts(ctx context.Context, q ChannelProductQuery) (int64, error) {
	var total int64
	err := r.channelProductQuery(ctx, q).Count(&total).Error
	return total, err
}

// channelProductQuery 构造频道商品的查询条件。
func (r *Repo) channelProductQuery(ctx context.Context, q ChannelProductQuery) *gorm.DB {
	tx := r.db.WithContext(ctx).Model(&Product{}).Where("status = ?", StatusOnShelf)

	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		tx = tx.Where("title LIKE ? OR subtitle LIKE ? OR description LIKE ?", like, like, like)
	}
	if len(q.Tags) > 0 {
		conds := make([]string, 0, len(q.Tags))
		args := make([]any, 0, len(q.Tags))
		for _, tag := range q.Tags {
			conds = append(conds, "FIND_IN_SET(?, tags)")
			args = append(args, tag)
		}
		tx = tx.Where("("+strings.Join(conds, " OR ")+")", args...)
	}
	return tx
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListChannels 分页查询频道。
func (s *Service) ListChannels(ctx context.Context, req *productv1.ListChannelsRequest) (*productv1.ListChannelsResponse, error) {
	page, pageSize := normalizePage(req.GetPage())

	list, total, err := s.repo.ListChannels(ctx,
		strings.TrimSpace(req.GetKeyword()), req.GetType(), page, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询频道失败", err)
	}

	out := make([]*productv1.Channel, 0, len(list))
	for i := range list {
		out = append(out, channelToProto(&list[i]))
	}
	return &productv1.ListChannelsResponse{Channels: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// GetChannel 查询频道详情。
func (s *Service) GetChannel(ctx context.Context, req *productv1.GetChannelRequest) (*productv1.Channel, error) {
	if req.GetId() <= 0 {
		return nil, errs.Invalid("频道 ID 不能为空")
	}
	c, err := s.repo.FindChannelByID(ctx, uint64(req.GetId()))
	if err != nil {
		return nil, err
	}
	return channelToProto(c), nil
}

// ListChannelProducts 查询频道下的商品。
func (s *Service) ListChannelProducts(ctx context.Context, req *productv1.ListChannelProductsRequest) (*productv1.ListChannelProductsResponse, error) {
	if req.GetChannelId() <= 0 {
		return nil, errs.Invalid("频道 ID 不能为空")
	}
	channel, err := s.repo.FindChannelByID(ctx, uint64(req.GetChannelId()))
	if err != nil {
		return nil, err
	}

	page, pageSize := normalizePage(req.GetPage())
	sort := strings.TrimSpace(req.GetSort())
	if sort == "" {
		sort = defaultChannelSort(channel.Type)
	}

	list, total, err := s.repo.ListChannelProducts(ctx, ChannelProductQuery{
		Keyword:  strings.TrimSpace(req.GetKeyword()),
		Tags:     channelProductTags(channel),
		Sort:     sort,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询频道商品失败", err)
	}

	// 频道商品数量按实际匹配结果返回，保证频道页展示的数量与列表一致。
	// 这里只回填响应，不落库：读接口不产生写操作，频道的落库数量在保存频道时维护。
	channel.ProductCount = int(total)

	categoryNames, _ := s.categoryNameMap(ctx)
	products := make([]*productv1.Product, 0, len(list))
	for i := range list {
		products = append(products, s.productToProto(&list[i], categoryNames))
	}

	return &productv1.ListChannelProductsResponse{
		Channel:  channelToProto(channel),
		Products: products,
		Meta:     buildMeta(page, pageSize, total),
	}, nil
}

// SaveChannel 新增或更新频道。
func (s *Service) SaveChannel(ctx context.Context, req *productv1.SaveChannelRequest) (*productv1.Channel, error) {
	return s.saveChannel(ctx, req)
}

// UpdateChannel 更新频道。
//
// 与 SaveChannel 共用同一套落库逻辑，区别只在于必须携带频道 ID，
// 避免把"更新"误当成新增而写入一条重复记录。
func (s *Service) UpdateChannel(ctx context.Context, req *productv1.SaveChannelRequest) (*productv1.Channel, error) {
	if req.GetId() <= 0 {
		return nil, errs.Invalid("频道 ID 不能为空")
	}
	return s.saveChannel(ctx, req)
}

// saveChannel 保存频道的公共逻辑：带 ID 则覆盖原记录，不带 ID 则新增。
func (s *Service) saveChannel(ctx context.Context, req *productv1.SaveChannelRequest) (*productv1.Channel, error) {
	name := strings.TrimSpace(req.GetName())
	if name == "" {
		return nil, errs.Invalid("频道名称不能为空")
	}
	code := strings.TrimSpace(req.GetCode())
	if code == "" {
		return nil, errs.Invalid("频道编码不能为空")
	}

	var c *Channel
	if req.GetId() > 0 {
		existing, err := s.repo.FindChannelByID(ctx, uint64(req.GetId()))
		if err != nil {
			return nil, err
		}
		c = existing
	} else {
		c = &Channel{}
	}

	c.Name = name
	c.Code = code
	c.Icon = req.GetIcon()
	c.BannerURL = req.GetBannerUrl()
	c.Description = req.GetDescription()
	c.Sort = int(req.GetSort())
	c.Type = int8(req.GetType())
	c.Status = int8(req.GetStatus())
	if c.Type == 0 {
		c.Type = ChannelTypeRecommend
	}
	if c.Status == 0 && req.GetId() == 0 {
		c.Status = ChannelStatusEnabled
	}

	if err := s.repo.SaveChannel(ctx, c); err != nil {
		if isDuplicateKeyError(err) {
			return nil, errs.Conflict("频道编码已存在")
		}
		return nil, errs.Wrap(errs.CodeInternalError, "保存频道失败", err)
	}

	// 频道的商品数量是冗余字段，保存时按当前关联规则重新统计一次。
	count, err := s.repo.CountChannelProducts(ctx, ChannelProductQuery{Tags: channelProductTags(c)})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计频道商品数失败", err)
	}
	if err := s.repo.UpdateChannelProductCount(ctx, c.ID, int(count)); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新频道商品数失败", err)
	}

	saved, err := s.repo.FindChannelByID(ctx, c.ID)
	if err != nil {
		return nil, err
	}
	return channelToProto(saved), nil
}

// DeleteChannel 删除频道。
func (s *Service) DeleteChannel(ctx context.Context, id int64) error {
	if id <= 0 {
		return errs.Invalid("频道 ID 不能为空")
	}
	if _, err := s.repo.FindChannelByID(ctx, uint64(id)); err != nil {
		return err
	}
	if err := s.repo.DeleteChannel(ctx, uint64(id)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除频道失败", err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

// channelProductTags 返回频道对应的商品标签过滤条件。
//
// 优先按频道编码匹配，其次按频道类型匹配；
// 都无法定位时退化为使用频道名称（排除"推荐/新品/热销/楼层"等泛化名称）。
func channelProductTags(c *Channel) []string {
	if c == nil {
		return nil
	}
	if tag, ok := channelCodeTags[strings.ToLower(strings.TrimSpace(c.Code))]; ok {
		return []string{tag}
	}
	if tag, ok := channelTypeTags[c.Type]; ok {
		return []string{tag}
	}
	name := strings.TrimSpace(c.Name)
	if name == "" || genericChannelNames[name] {
		return nil
	}
	return []string{name}
}

// defaultChannelSort 返回频道缺省排序策略。
//
// 新品频道按上架时间倒序，其余频道按销量倒序。
func defaultChannelSort(channelType int8) string {
	if channelType == ChannelTypeNewest {
		return "newest"
	}
	return "sales"
}

func channelToProto(c *Channel) *productv1.Channel {
	if c == nil {
		return nil
	}
	return &productv1.Channel{
		Id:           int64(c.ID),
		Name:         c.Name,
		Code:         c.Code,
		Icon:         c.Icon,
		BannerUrl:    c.BannerURL,
		Description:  c.Description,
		Sort:         int32(c.Sort),
		Type:         int32(c.Type),
		Status:       int32(c.Status),
		ProductCount: int32(c.ProductCount),
		CreatedAt:    timestamppb.New(c.CreatedAt),
	}
}

// isDuplicateKeyError 判断错误是否为唯一键冲突。
//
// MySQL 的唯一键冲突错误码为 1062，这里不引入驱动包依赖，直接按错误文本判定。
func isDuplicateKeyError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "Duplicate entry") || strings.Contains(msg, "1062")
}
