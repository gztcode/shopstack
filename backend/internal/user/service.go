package user

import (
	"context"
	"strings"
	"time"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	userv1 "github.com/shopstack/platform/gen/go/user/v1"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/client"
	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/thirdparty"
)

// Service 承载用户域的业务逻辑。
type Service struct {
	repo      *Repo
	auth      *auth.Manager
	providers *thirdparty.Providers
	registry  *client.Registry
}

// NewService 构造用户服务。
func NewService(repo *Repo, manager *auth.Manager, providers *thirdparty.Providers, registry *client.Registry) *Service {
	return &Service{repo: repo, auth: manager, providers: providers, registry: registry}
}

// ---------------------------------------------------------------------------
// 注册与登录
// ---------------------------------------------------------------------------

// Register 注册新用户。
func (s *Service) Register(ctx context.Context, req *userv1.RegisterRequest) (*userv1.AuthResponse, error) {
	username := strings.TrimSpace(req.GetUsername())
	if username == "" {
		return nil, errs.Invalid("用户名不能为空")
	}
	if len(req.GetPassword()) < 6 {
		return nil, errs.Invalid("密码长度不能少于 6 位")
	}

	exists, err := s.repo.UsernameExists(ctx, username)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询用户失败", err)
	}
	if exists {
		return nil, errs.New(errs.CodeUserExists, "该用户名已被注册")
	}

	if req.GetPhone() != "" {
		phoneExists, pErr := s.repo.PhoneExists(ctx, req.GetPhone())
		if pErr != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "校验手机号失败", pErr)
		}
		if phoneExists {
			return nil, errs.New(errs.CodePhoneExists, "该手机号已被注册")
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.GetPassword()), bcrypt.DefaultCost)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "密码加密失败", err)
	}

	nickname := strings.TrimSpace(req.GetNickname())
	if nickname == "" {
		nickname = username
	}

	u := &User{
		Username:     username,
		PasswordHash: string(hash),
		Nickname:     nickname,
		Phone:        req.GetPhone(),
		Avatar:       "https://placehold.co/120x120/2A4AD9/FFFFFF?text=" + username,
		Status:       UserStatusActive,
		Points:       100, // 新用户赠送积分
	}
	if err := s.repo.CreateUser(ctx, u); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "创建用户失败", err)
	}

	logger.L().Info("新用户注册", zap.String("用户名", username), zap.Uint64("用户ID", u.ID))
	return s.issueUserToken(ctx, u)
}

// Login 用户名密码登录。
func (s *Service) Login(ctx context.Context, req *userv1.LoginRequest) (*userv1.AuthResponse, error) {
	username := strings.TrimSpace(req.GetUsername())
	if username == "" || req.GetPassword() == "" {
		return nil, errs.Invalid("用户名和密码不能为空")
	}

	u, err := s.repo.FindUserByUsername(ctx, username)
	if err != nil {
		// 账号不存在时也校验密码哈希，避免通过响应时间枚举用户
		_ = bcrypt.CompareHashAndPassword(
			[]byte("$2a$10$D52zg7ZTITdCC5anwsvYGehwsPNau2Eh2jIQ.dDAEj7MYz2oN9SRS"),
			[]byte(req.GetPassword()))
		return nil, errs.New(errs.CodePasswordIncorrect, "用户名或密码错误")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.GetPassword())); err != nil {
		return nil, errs.New(errs.CodePasswordIncorrect, "用户名或密码错误")
	}
	if u.Status != UserStatusActive {
		return nil, errs.New(errs.CodeUserDisabled, "账号已被禁用，请联系客服")
	}

	if err := s.repo.TouchLogin(ctx, u.ID); err != nil {
		logger.L().Warn("更新登录时间失败", zap.Error(err))
	}
	return s.issueUserToken(ctx, u)
}

// LoginWithWeChat 微信小程序登录。
func (s *Service) LoginWithWeChat(ctx context.Context, req *userv1.WeChatLoginRequest) (*userv1.AuthResponse, error) {
	if strings.TrimSpace(req.GetCode()) == "" {
		return nil, errs.Invalid("缺少微信登录凭证")
	}

	wxUser, err := s.providers.WeChat.Code2Session(ctx, req.GetCode())
	if err != nil {
		return nil, errs.Wrap(errs.CodeInvalidParam, "微信登录失败", err)
	}

	u, err := s.repo.FindUserByWeChatOpenID(ctx, wxUser.OpenID)
	if err == nil {
		if u.Status != UserStatusActive {
			return nil, errs.New(errs.CodeUserDisabled, "账号已被禁用，请联系客服")
		}
		if err := s.repo.TouchLogin(ctx, u.ID); err != nil {
			logger.L().Warn("更新登录时间失败", zap.Error(err))
		}
		return s.issueUserToken(ctx, u)
	}

	// 首次微信登录：自动创建账号
	nickname := strings.TrimSpace(req.GetNickname())
	if nickname == "" {
		nickname = "微信用户"
	}
	username := "wx_" + wxUser.OpenID
	if len(username) > 60 {
		username = username[:60]
	}

	hash, hErr := bcrypt.GenerateFromPassword([]byte(wxUser.SessionKey), bcrypt.DefaultCost)
	if hErr != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "密码加密失败", hErr)
	}

	newUser := &User{
		Username:     username,
		PasswordHash: string(hash),
		Nickname:     nickname,
		Avatar:       req.GetAvatar(),
		WeChatOpenID: wxUser.OpenID,
		Status:       UserStatusActive,
		Points:       100,
	}
	if err := s.repo.CreateUser(ctx, newUser); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "创建用户失败", err)
	}

	logger.L().Info("微信新用户注册", zap.String("昵称", nickname), zap.Uint64("用户ID", newUser.ID))
	return s.issueUserToken(ctx, newUser)
}

// RefreshToken 刷新访问令牌。
func (s *Service) RefreshToken(ctx context.Context, req *userv1.RefreshTokenRequest) (*userv1.AuthResponse, error) {
	claims, err := s.auth.ParseRefresh(req.GetRefreshToken())
	if err != nil {
		return nil, err
	}

	if claims.Subject == auth.SubjectAdmin {
		admin, aErr := s.repo.FindAdminByID(ctx, uint64(claims.UserID))
		if aErr != nil {
			return nil, aErr
		}
		return s.issueAdminToken(ctx, admin)
	}

	u, uErr := s.repo.FindUserByID(ctx, uint64(claims.UserID))
	if uErr != nil {
		return nil, uErr
	}
	if u.Status != UserStatusActive {
		return nil, errs.New(errs.CodeUserDisabled, "账号已被禁用，请联系客服")
	}
	return s.issueUserToken(ctx, u)
}

// Logout 退出登录（令牌为无状态 JWT，此处仅记录审计日志）。
func (s *Service) Logout(ctx context.Context) error {
	logger.L().Info("用户退出登录", zap.Int64("用户ID", auth.UserIDFromContext(ctx)))
	return nil
}

func (s *Service) issueUserToken(ctx context.Context, u *User) (*userv1.AuthResponse, error) {
	access, exp, err := s.auth.Generate(auth.SubjectUser, auth.TokenTypeAccess, int64(u.ID), u.Username, nil)
	if err != nil {
		return nil, err
	}
	refresh, _, err := s.auth.Generate(auth.SubjectUser, auth.TokenTypeRefresh, int64(u.ID), u.Username, nil)
	if err != nil {
		return nil, err
	}
	return &userv1.AuthResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    int64(time.Until(exp).Seconds()),
		TokenType:    "Bearer",
		User:         userToProto(u),
	}, nil
}

func (s *Service) issueAdminToken(ctx context.Context, a *Admin) (*userv1.AuthResponse, error) {
	perms, err := s.repo.AdminPermissions(ctx, a.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询管理员权限失败", err)
	}
	access, exp, err := s.auth.Generate(auth.SubjectAdmin, auth.TokenTypeAccess, int64(a.ID), a.Username, perms)
	if err != nil {
		return nil, err
	}
	refresh, _, err := s.auth.Generate(auth.SubjectAdmin, auth.TokenTypeRefresh, int64(a.ID), a.Username, perms)
	if err != nil {
		return nil, err
	}

	roles, err := s.repo.AdminRoles(ctx, a.ID)
	if err != nil {
		logger.L().Warn("查询管理员角色失败", zap.Error(err))
	}
	roleIDs := make([]uint64, 0, len(roles))
	roleNames := make([]string, 0, len(roles))
	for _, r := range roles {
		roleIDs = append(roleIDs, r.ID)
		roleNames = append(roleNames, r.Name)
	}

	return &userv1.AuthResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    int64(time.Until(exp).Seconds()),
		TokenType:    "Bearer",
		Admin: &userv1.Admin{
			Id:        int64(a.ID),
			Username:  a.Username,
			RealName:  a.RealName,
			Avatar:    a.Avatar,
			Email:     a.Email,
			Phone:     a.Phone,
			RoleIds:   int64sToUint64(roleIDs),
			RoleNames: roleNames,
			Status:    int32(a.Status),
		},
		Permissions: perms,
	}, nil
}

// ---------------------------------------------------------------------------
// 资料
// ---------------------------------------------------------------------------

// GetProfile 获取用户资料。
func (s *Service) GetProfile(ctx context.Context, userID int64) (*userv1.User, error) {
	u, err := s.repo.FindUserByID(ctx, uint64(userID))
	if err != nil {
		return nil, err
	}
	out := userToProto(u)
	s.fillUserGrowth(ctx, out, userID)
	return out, nil
}

// UpdateProfile 更新用户资料。
func (s *Service) UpdateProfile(ctx context.Context, req *userv1.UpdateProfileRequest) (*userv1.User, error) {
	fields := map[string]any{}
	if req.GetNickname() != "" {
		fields["nickname"] = req.GetNickname()
	}
	if req.GetAvatar() != "" {
		fields["avatar"] = req.GetAvatar()
	}
	if req.GetEmail() != "" {
		fields["email"] = req.GetEmail()
	}
	if req.GetGender() != commonv1.Gender_GENDER_UNSPECIFIED {
		fields["gender"] = int8(req.GetGender())
	}
	if req.GetBirthday() != "" {
		if t, err := time.Parse("2006-01-02", req.GetBirthday()); err == nil {
			fields["birthday"] = t
		}
	}
	if len(fields) == 0 {
		return s.GetProfile(ctx, req.GetUserId())
	}
	if err := s.repo.UpdateUser(ctx, uint64(req.GetUserId()), fields); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新用户资料失败", err)
	}
	return s.GetProfile(ctx, req.GetUserId())
}

// ChangePassword 修改密码。
func (s *Service) ChangePassword(ctx context.Context, req *userv1.ChangePasswordRequest) error {
	if len(req.GetNewPassword()) < 6 {
		return errs.Invalid("新密码长度不能少于 6 位")
	}
	u, err := s.repo.FindUserByID(ctx, uint64(auth.UserIDFromContext(ctx)))
	if err != nil {
		return err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.GetOldPassword())); err != nil {
		return errs.New(errs.CodePasswordIncorrect, "原密码不正确")
	}
	hash, hErr := bcrypt.GenerateFromPassword([]byte(req.GetNewPassword()), bcrypt.DefaultCost)
	if hErr != nil {
		return errs.Wrap(errs.CodeInternalError, "密码加密失败", hErr)
	}
	now := time.Now()
	return s.repo.UpdateUser(ctx, u.ID, map[string]any{
		"password_hash":       string(hash),
		"password_changed_at": &now,
	})
}

// ---------------------------------------------------------------------------
// 地址
// ---------------------------------------------------------------------------

// ListAddresses 查询收货地址。
func (s *Service) ListAddresses(ctx context.Context, userID int64) (*userv1.ListAddressesResponse, error) {
	list, err := s.repo.ListAddresses(ctx, uint64(userID))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询地址失败", err)
	}
	out := make([]*commonv1.Address, 0, len(list))
	for i := range list {
		out = append(out, addressToProto(&list[i]))
	}
	return &userv1.ListAddressesResponse{Addresses: out}, nil
}

// SaveAddress 新增或更新收货地址。
func (s *Service) SaveAddress(ctx context.Context, req *userv1.SaveAddressRequest) (*commonv1.Address, error) {
	if strings.TrimSpace(req.GetReceiver()) == "" {
		return nil, errs.Invalid("收货人不能为空")
	}
	if strings.TrimSpace(req.GetPhone()) == "" {
		return nil, errs.Invalid("联系电话不能为空")
	}
	if strings.TrimSpace(req.GetDetail()) == "" {
		return nil, errs.Invalid("详细地址不能为空")
	}

	userID := uint64(req.GetUserId())
	addr := &UserAddress{
		ID:         uint64(req.GetId()),
		UserID:     userID,
		Receiver:   req.GetReceiver(),
		Phone:      req.GetPhone(),
		Province:   req.GetProvince(),
		City:       req.GetCity(),
		District:   req.GetDistrict(),
		Detail:     req.GetDetail(),
		PostalCode: req.GetPostalCode(),
		Tag:        req.GetTag(),
		IsDefault:  req.GetIsDefault(),
	}

	if addr.ID == 0 {
		// 首个地址自动设为默认
		existing, err := s.repo.ListAddresses(ctx, userID)
		if err != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "查询地址失败", err)
		}
		if len(existing) == 0 {
			addr.IsDefault = true
		}
	}

	if err := s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if addr.IsDefault {
			if err := tx.Model(&UserAddress{}).Where("user_id = ?", userID).
				Update("is_default", false).Error; err != nil {
				return err
			}
		}
		return tx.Save(addr).Error
	}); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存地址失败", err)
	}

	return addressToProto(addr), nil
}

// DeleteAddress 删除收货地址。
func (s *Service) DeleteAddress(ctx context.Context, userID, id int64) error {
	if err := s.repo.DeleteAddress(ctx, uint64(userID), uint64(id)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除地址失败", err)
	}
	return nil
}

// SetDefaultAddress 设置默认地址。
func (s *Service) SetDefaultAddress(ctx context.Context, userID, id int64) error {
	if _, err := s.repo.FindAddress(ctx, uint64(userID), uint64(id)); err != nil {
		return err
	}
	if err := s.repo.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&UserAddress{}).Where("user_id = ?", userID).
			Update("is_default", false).Error; err != nil {
			return err
		}
		return tx.Model(&UserAddress{}).Where("id = ? AND user_id = ?", id, userID).
			Update("is_default", true).Error
	}); err != nil {
		return errs.Wrap(errs.CodeInternalError, "设置默认地址失败", err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// 收藏
// ---------------------------------------------------------------------------

// ToggleFavorite 切换收藏状态。
func (s *Service) ToggleFavorite(ctx context.Context, userID, productID int64) (bool, error) {
	favorited, err := s.repo.IsFavorited(ctx, uint64(userID), uint64(productID))
	if err != nil {
		return false, errs.Wrap(errs.CodeInternalError, "查询收藏状态失败", err)
	}
	if favorited {
		if err := s.repo.RemoveFavorite(ctx, uint64(userID), uint64(productID)); err != nil {
			return false, errs.Wrap(errs.CodeInternalError, "取消收藏失败", err)
		}
		return false, nil
	}
	if err := s.repo.AddFavorite(ctx, uint64(userID), uint64(productID)); err != nil {
		return false, errs.Wrap(errs.CodeInternalError, "添加收藏失败", err)
	}
	return true, nil
}

// ListFavorites 查询收藏列表。
//
// 收藏项的商品标题与封面由商品服务提供，这里先返回可用的基础信息，
// 商品详情由前端按 product_id 二次拉取。
func (s *Service) ListFavorites(ctx context.Context, userID int64, page *commonv1.PageRequest) (*userv1.ListFavoritesResponse, error) {
	ids, err := s.repo.ListFavoriteIDs(ctx, uint64(userID))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询收藏失败", err)
	}

	pageNum, pageSize := normalizePage(page)
	total := int64(len(ids))
	start := (pageNum - 1) * pageSize
	if start > len(ids) {
		start = len(ids)
	}
	end := start + pageSize
	if end > len(ids) {
		end = len(ids)
	}

	items := make([]*userv1.FavoriteProduct, 0, end-start)
	for _, pid := range ids[start:end] {
		items = append(items, &userv1.FavoriteProduct{
			Id:        int64(pid),
			ProductId: int64(pid),
			CreatedAt: timestamppb.New(time.Now()),
		})
	}

	return &userv1.ListFavoritesResponse{
		Products: items,
		Meta:     buildMeta(pageNum, pageSize, total),
	}, nil
}
