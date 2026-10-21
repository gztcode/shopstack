package product

import (
	"context"
	"errors"
	"strings"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	productv1 "github.com/shopstack/platform/gen/go/product/v1"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/errs"
)

// replyTimeLayout 是问答回复时间的存储格式。
const replyTimeLayout = "2006-01-02 15:04:05"

// ProductQuestion 是商品问答模型。
type ProductQuestion struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID    uint64    `gorm:"column:product_id;not null;index" json:"product_id"`
	ProductTitle string    `gorm:"column:product_title;type:varchar(255);not null;default:''" json:"product_title"`
	UserID       uint64    `gorm:"column:user_id;not null;default:0;index" json:"user_id"`
	UserNickname string    `gorm:"column:user_nickname;type:varchar(64);not null;default:''" json:"user_nickname"`
	Content      string    `gorm:"type:text" json:"content"`
	Images       string    `gorm:"type:varchar(1024);not null;default:''" json:"images"`
	Reply        string    `gorm:"type:varchar(1024);not null;default:''" json:"reply"`
	ReplyAt      string    `gorm:"column:reply_at;type:varchar(32);not null;default:''" json:"reply_at"`
	CreatedAt    time.Time `json:"created_at"`
}

// TableName 指定表名。
func (ProductQuestion) TableName() string { return "product_questions" }

// questionUser 是用户表在商品域的只读投影，用于补全提问人昵称。
//
// 该表由用户服务维护，商品域只做读取，不参与其结构维护。
type questionUser struct {
	ID        uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	Nickname  string         `gorm:"column:nickname;type:varchar(64);not null;default:''" json:"nickname"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName 指定表名。
func (questionUser) TableName() string { return "users" }

// ---------------------------------------------------------------------------
// 仓储
// ---------------------------------------------------------------------------

// QuestionQuery 描述问答查询条件。
type QuestionQuery struct {
	ProductID uint64
	Keyword   string
	Page      int
	PageSize  int
}

// ListQuestions 分页查询商品问答。
func (r *Repo) ListQuestions(ctx context.Context, q QuestionQuery) ([]ProductQuestion, int64, error) {
	tx := r.db.WithContext(ctx).Model(&ProductQuestion{})
	if q.ProductID > 0 {
		tx = tx.Where("product_id = ?", q.ProductID)
	}
	if q.Keyword != "" {
		like := "%" + q.Keyword + "%"
		tx = tx.Where("content LIKE ? OR product_title LIKE ? OR user_nickname LIKE ?", like, like, like)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []ProductQuestion
	err := tx.Order("id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&list).Error
	return list, total, err
}

// FindQuestionByID 按 ID 查询商品问答。
func (r *Repo) FindQuestionByID(ctx context.Context, id uint64) (*ProductQuestion, error) {
	var q ProductQuestion
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&q).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "商品问答不存在")
		}
		return nil, err
	}
	return &q, nil
}

// CreateQuestion 新增商品问答。
func (r *Repo) CreateQuestion(ctx context.Context, q *ProductQuestion) error {
	return r.db.WithContext(ctx).Create(q).Error
}

// UpdateQuestion 更新商品问答。
func (r *Repo) UpdateQuestion(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&ProductQuestion{}).Where("id = ?", id).Updates(fields).Error
}

// FindUserNickname 查询用户昵称。
func (r *Repo) FindUserNickname(ctx context.Context, id uint64) (string, error) {
	var u questionUser
	if err := r.db.WithContext(ctx).Select("id", "nickname").Where("id = ?", id).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", err
	}
	return u.Nickname, nil
}

// ---------------------------------------------------------------------------
// 服务
// ---------------------------------------------------------------------------

// ListProductQuestions 查询商品下的问答（前台公开）。
func (s *Service) ListProductQuestions(ctx context.Context, req *productv1.ListProductQuestionsRequest) (*productv1.ListProductQuestionsResponse, error) {
	if req.GetProductId() <= 0 {
		return nil, errs.Invalid("商品 ID 不能为空")
	}
	if _, err := s.repo.FindProduct(ctx, uint64(req.GetProductId())); err != nil {
		return nil, err
	}

	page, pageSize := normalizePage(req.GetPage())
	list, total, err := s.repo.ListQuestions(ctx, QuestionQuery{
		ProductID: uint64(req.GetProductId()),
		Page:      page,
		PageSize:  pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询商品问答失败", err)
	}

	out := make([]*productv1.ProductQuestion, 0, len(list))
	for i := range list {
		out = append(out, questionToProto(&list[i]))
	}
	return &productv1.ListProductQuestionsResponse{Questions: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// CreateQuestion 用户对商品提问。
func (s *Service) CreateQuestion(ctx context.Context, req *productv1.CreateQuestionRequest) (*productv1.ProductQuestion, error) {
	userID := resolveUserID(ctx, 0)
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录后再提问")
	}
	content := strings.TrimSpace(req.GetContent())
	if content == "" {
		return nil, errs.Invalid("提问内容不能为空")
	}

	product, err := s.repo.FindProduct(ctx, uint64(req.GetProductId()))
	if err != nil {
		return nil, err
	}

	nickname, err := s.repo.FindUserNickname(ctx, uint64(userID))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询用户信息失败", err)
	}

	q := &ProductQuestion{
		ProductID:    product.ID,
		ProductTitle: product.Title,
		UserID:       uint64(userID),
		UserNickname: nickname,
		Content:      content,
		Images:       strings.Join(req.GetImages(), ","),
	}
	if err := s.repo.CreateQuestion(ctx, q); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "提问失败", err)
	}
	return questionToProto(q), nil
}

// ListQuestions 后台问答列表。
func (s *Service) ListQuestions(ctx context.Context, req *productv1.ListQuestionsRequest) (*productv1.ListQuestionsResponse, error) {
	page, pageSize := normalizePage(req.GetPage())

	list, total, err := s.repo.ListQuestions(ctx, QuestionQuery{
		ProductID: uint64(req.GetProductId()),
		Keyword:   strings.TrimSpace(req.GetKeyword()),
		Page:      page,
		PageSize:  pageSize,
	})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询商品问答失败", err)
	}

	out := make([]*productv1.ProductQuestion, 0, len(list))
	for i := range list {
		out = append(out, questionToProto(&list[i]))
	}
	return &productv1.ListQuestionsResponse{Questions: out, Meta: buildMeta(page, pageSize, total)}, nil
}

// AnswerQuestion 后台回答商品提问。
func (s *Service) AnswerQuestion(ctx context.Context, req *productv1.AnswerQuestionRequest) (*productv1.ProductQuestion, error) {
	if req.GetId() <= 0 {
		return nil, errs.Invalid("问答 ID 不能为空")
	}
	reply := strings.TrimSpace(req.GetReply())
	if reply == "" {
		return nil, errs.Invalid("回答内容不能为空")
	}
	if _, err := s.repo.FindQuestionByID(ctx, uint64(req.GetId())); err != nil {
		return nil, err
	}

	fields := map[string]any{
		"reply":    reply,
		"reply_at": time.Now().Format(replyTimeLayout),
	}
	if err := s.repo.UpdateQuestion(ctx, uint64(req.GetId()), fields); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "回答商品问答失败", err)
	}

	saved, err := s.repo.FindQuestionByID(ctx, uint64(req.GetId()))
	if err != nil {
		return nil, err
	}
	return questionToProto(saved), nil
}

// ---------------------------------------------------------------------------
// 辅助
// ---------------------------------------------------------------------------

// resolveUserID 优先使用请求携带的用户 ID，缺省时回退到网关注入的登录身份。
func resolveUserID(ctx context.Context, requested int64) int64 {
	if requested > 0 {
		return requested
	}
	return auth.UserIDFromContext(ctx)
}

func questionToProto(q *ProductQuestion) *productv1.ProductQuestion {
	if q == nil {
		return nil
	}
	images := []string{}
	if q.Images != "" {
		for _, p := range strings.Split(q.Images, ",") {
			if p = strings.TrimSpace(p); p != "" {
				images = append(images, p)
			}
		}
	}
	return &productv1.ProductQuestion{
		Id:           int64(q.ID),
		ProductId:    int64(q.ProductID),
		ProductTitle: q.ProductTitle,
		UserId:       int64(q.UserID),
		UserNickname: q.UserNickname,
		Content:      q.Content,
		Images:       images,
		Reply:        q.Reply,
		ReplyAt:      q.ReplyAt,
		CreatedAt:    timestamppb.New(q.CreatedAt),
	}
}
