package user

import (
	"context"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	userv1 "github.com/shopstack/platform/gen/go/user/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// HelpArticle 是帮助中心文章模型。
type HelpArticle struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	CategoryID   uint64    `gorm:"column:category_id;not null;default:0;index" json:"category_id"`
	CategoryName string    `gorm:"column:category_name;type:varchar(64);not null;default:''" json:"category_name"`
	Title        string    `gorm:"type:varchar(128);not null;default:''" json:"title"`
	Content      string    `gorm:"type:text;not null" json:"content"`
	Sort         int       `gorm:"not null;default:0" json:"sort"`
	Enabled      bool      `gorm:"not null;default:true" json:"enabled"`
	ViewCount    int       `gorm:"column:view_count;not null;default:0" json:"view_count"`
	CreatedAt    time.Time `json:"created_at"`
}

// TableName 指定表名。
func (HelpArticle) TableName() string { return "help_articles" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// ListHelpArticles 分页查询已发布的帮助文章。
func (r *Repo) ListHelpArticles(ctx context.Context, categoryID uint64, keyword string, page, pageSize int) ([]HelpArticle, int64, error) {
	q := r.db.WithContext(ctx).Model(&HelpArticle{}).Where("enabled = ?", true)
	if categoryID > 0 {
		q = q.Where("category_id = ?", categoryID)
	}
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("title LIKE ? OR content LIKE ?", like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []HelpArticle
	err := q.Order("category_id ASC, sort ASC, id ASC").
		Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// FindHelpArticle 按 ID 查询帮助文章。
func (r *Repo) FindHelpArticle(ctx context.Context, id uint64) (*HelpArticle, error) {
	var a HelpArticle
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&a).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "帮助文章不存在")
		}
		return nil, err
	}
	return &a, nil
}

// IncrementHelpArticleViews 增加文章浏览量。
func (r *Repo) IncrementHelpArticleViews(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Model(&HelpArticle{}).Where("id = ?", id).
		UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListHelpArticles 分页查询帮助中心文章。
func (s *Service) ListHelpArticles(ctx context.Context, req *userv1.ListHelpArticlesRequest) (*userv1.ListHelpArticlesResponse, error) {
	pageNum, pageSize := normalizePage(req.GetPage())
	categoryID := uint64(0)
	if req.GetCategoryId() > 0 {
		categoryID = uint64(req.GetCategoryId())
	}
	list, total, err := s.repo.ListHelpArticles(ctx, categoryID, strings.TrimSpace(req.GetKeyword()), pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询帮助文章失败", err)
	}
	out := make([]*userv1.HelpArticle, 0, len(list))
	for i := range list {
		out = append(out, helpArticleToProto(&list[i]))
	}
	return &userv1.ListHelpArticlesResponse{Articles: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
}

// GetHelpArticle 查询帮助文章详情，同时累加浏览量。
func (s *Service) GetHelpArticle(ctx context.Context, id int64) (*userv1.HelpArticle, error) {
	if id <= 0 {
		return nil, errs.Invalid("文章 ID 不合法")
	}
	article, err := s.repo.FindHelpArticle(ctx, uint64(id))
	if err != nil {
		return nil, err
	}
	if !article.Enabled {
		return nil, errs.New(errs.CodeNotFound, "帮助文章不存在")
	}
	if err := s.repo.IncrementHelpArticleViews(ctx, article.ID); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新文章浏览量失败", err)
	}
	article.ViewCount++
	return helpArticleToProto(article), nil
}
