package user

import (
	"context"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	userv1 "github.com/shopstack/platform/gen/go/user/v1"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/errs"
)

// currentUserID 优先取请求中显式传入的用户 ID，其次取上下文中的登录态。
func currentUserID(ctx context.Context, explicit int64) int64 {
	if explicit > 0 {
		return explicit
	}
	return auth.UserIDFromContext(ctx)
}

// resolveOwnedUserID 解析用户私有数据的目标用户 ID，并校验归属。
//
// 请求显式携带 user_id 时必须与当前登录用户一致，避免越权访问他人数据；
// 后台管理员身份允许跨用户查询。
func resolveOwnedUserID(ctx context.Context, explicit int64) (int64, error) {
	ctxID := auth.UserIDFromContext(ctx)
	if ctxID <= 0 {
		return 0, errs.Unauthorized("请先登录")
	}
	if explicit > 0 && explicit != ctxID && auth.SubjectFromContext(ctx) != auth.SubjectAdmin {
		return 0, errs.New(errs.CodeForbidden, "无权访问其他用户的数据")
	}
	if explicit > 0 {
		return explicit, nil
	}
	return ctxID, nil
}

// resolveScopedUserID 解析列表类接口的用户范围。
//
// 普通用户只能看自己的数据；后台管理员未指定 user_id 时返回 0，表示「不限用户」，
// 列表据此返回全量数据（如后台查看全部成长值流水）。
func resolveScopedUserID(ctx context.Context, explicit int64) (int64, error) {
	if explicit > 0 {
		return resolveOwnedUserID(ctx, explicit)
	}
	if auth.SubjectFromContext(ctx) == auth.SubjectAdmin {
		if auth.UserIDFromContext(ctx) <= 0 {
			return 0, errs.Unauthorized("请先登录")
		}
		return 0, nil
	}
	return resolveOwnedUserID(ctx, 0)
}

// ---------------------------------------------------------------------------
// UserHandler —— 实现 UserService
// ---------------------------------------------------------------------------

// UserHandler 实现面向 C 端用户的 gRPC 接口。
type UserHandler struct {
	userv1.UnimplementedUserServiceServer
	service *Service
}

// NewUserHandler 构造用户端处理器。
func NewUserHandler(service *Service) *UserHandler {
	return &UserHandler{service: service}
}

// Register 注册新用户。
func (h *UserHandler) Register(ctx context.Context, req *userv1.RegisterRequest) (*userv1.AuthResponse, error) {
	return h.service.Register(ctx, req)
}

// Login 用户登录。
func (h *UserHandler) Login(ctx context.Context, req *userv1.LoginRequest) (*userv1.AuthResponse, error) {
	return h.service.Login(ctx, req)
}

// LoginWithWeChat 微信登录。
func (h *UserHandler) LoginWithWeChat(ctx context.Context, req *userv1.WeChatLoginRequest) (*userv1.AuthResponse, error) {
	return h.service.LoginWithWeChat(ctx, req)
}

// RefreshToken 刷新令牌。
func (h *UserHandler) RefreshToken(ctx context.Context, req *userv1.RefreshTokenRequest) (*userv1.AuthResponse, error) {
	return h.service.RefreshToken(ctx, req)
}

// Logout 退出登录。
func (h *UserHandler) Logout(ctx context.Context, _ *commonv1.Empty) (*commonv1.OperationResult, error) {
	if err := h.service.Logout(ctx); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "已退出登录"}, nil
}

// GetProfile 获取当前用户资料。
func (h *UserHandler) GetProfile(ctx context.Context, req *userv1.GetProfileRequest) (*userv1.User, error) {
	userID := currentUserID(ctx, req.GetUserId())
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	return h.service.GetProfile(ctx, userID)
}

// UpdateProfile 更新当前用户资料。
func (h *UserHandler) UpdateProfile(ctx context.Context, req *userv1.UpdateProfileRequest) (*userv1.User, error) {
	userID := currentUserID(ctx, req.GetUserId())
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	req.UserId = userID
	return h.service.UpdateProfile(ctx, req)
}

// ChangePassword 修改密码。
func (h *UserHandler) ChangePassword(ctx context.Context, req *userv1.ChangePasswordRequest) (*commonv1.OperationResult, error) {
	if err := h.service.ChangePassword(ctx, req); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "密码修改成功"}, nil
}

// ListAddresses 查询收货地址。
func (h *UserHandler) ListAddresses(ctx context.Context, req *userv1.ListAddressesRequest) (*userv1.ListAddressesResponse, error) {
	userID := currentUserID(ctx, req.GetUserId())
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	return h.service.ListAddresses(ctx, userID)
}

// SaveAddress 保存收货地址。
func (h *UserHandler) SaveAddress(ctx context.Context, req *userv1.SaveAddressRequest) (*commonv1.Address, error) {
	userID := currentUserID(ctx, req.GetUserId())
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	req.UserId = userID
	return h.service.SaveAddress(ctx, req)
}

// DeleteAddress 删除收货地址。
func (h *UserHandler) DeleteAddress(ctx context.Context, req *userv1.DeleteAddressRequest) (*commonv1.OperationResult, error) {
	userID := currentUserID(ctx, req.GetUserId())
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	if err := h.service.DeleteAddress(ctx, userID, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "地址已删除"}, nil
}

// SetDefaultAddress 设置默认地址。
func (h *UserHandler) SetDefaultAddress(ctx context.Context, req *userv1.SetDefaultAddressRequest) (*commonv1.OperationResult, error) {
	userID := currentUserID(ctx, req.GetUserId())
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	if err := h.service.SetDefaultAddress(ctx, userID, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "已设为默认地址"}, nil
}

// ListFavorites 查询收藏列表。
func (h *UserHandler) ListFavorites(ctx context.Context, req *userv1.ListFavoritesRequest) (*userv1.ListFavoritesResponse, error) {
	userID := currentUserID(ctx, req.GetUserId())
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	return h.service.ListFavorites(ctx, userID, req.GetPage())
}

// ToggleFavorite 切换收藏。
func (h *UserHandler) ToggleFavorite(ctx context.Context, req *userv1.ToggleFavoriteRequest) (*userv1.ToggleFavoriteResponse, error) {
	userID := currentUserID(ctx, req.GetUserId())
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	favorited, err := h.service.ToggleFavorite(ctx, userID, req.GetProductId())
	if err != nil {
		return nil, err
	}
	return &userv1.ToggleFavoriteResponse{Favorited: favorited}, nil
}

// ListPointsLogs 查询积分明细。
func (h *UserHandler) ListPointsLogs(ctx context.Context, req *userv1.ListPointsLogsRequest) (*userv1.ListPointsLogsResponse, error) {
	return h.service.ListPointsLogs(ctx, req.GetUserId(), req.GetPage())
}

// ListInvoices 查询发票申请。
func (h *UserHandler) ListInvoices(ctx context.Context, req *userv1.ListInvoicesRequest) (*userv1.ListInvoicesResponse, error) {
	userID := req.GetUserId()
	if userID <= 0 {
		userID = auth.UserIDFromContext(ctx)
	}
	return h.service.ListInvoices(ctx, userID, req.GetStatus(), req.GetPage())
}

// CreateInvoice 申请开票。
func (h *UserHandler) CreateInvoice(ctx context.Context, req *userv1.CreateInvoiceRequest) (*userv1.Invoice, error) {
	return h.service.CreateInvoice(ctx, req)
}

// ---------------------------------------------------------------------------
// 会员等级 / 成长值 / 行政区域
// ---------------------------------------------------------------------------

// GetUserLevel 查询当前用户的会员等级与升级进度。
func (h *UserHandler) GetUserLevel(ctx context.Context, req *userv1.GetUserLevelRequest) (*userv1.UserLevelInfo, error) {
	userID, err := resolveOwnedUserID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	return h.service.GetUserLevel(ctx, userID)
}

// ListUserLevels 查询全部会员等级。
func (h *UserHandler) ListUserLevels(ctx context.Context, _ *userv1.ListUserLevelsRequest) (*userv1.ListUserLevelsResponse, error) {
	return h.service.ListUserLevels(ctx)
}

// ListGrowthLogs 查询成长值流水。
//
// 普通用户看自己的，后台管理员可查看全量。
func (h *UserHandler) ListGrowthLogs(ctx context.Context, req *userv1.ListGrowthLogsRequest) (*userv1.ListGrowthLogsResponse, error) {
	userID, err := resolveScopedUserID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	return h.service.ListGrowthLogs(ctx, userID, req.GetPage())
}

// ListRegions 查询行政区域。
func (h *UserHandler) ListRegions(ctx context.Context, req *userv1.ListRegionsRequest) (*userv1.ListRegionsResponse, error) {
	return h.service.ListRegions(ctx, req)
}

// ---------------------------------------------------------------------------
// 发票抬头模板 / 通知设置 / 账号安全
// ---------------------------------------------------------------------------

// ListInvoiceTemplates 查询当前用户的发票抬头模板。
func (h *UserHandler) ListInvoiceTemplates(ctx context.Context, req *userv1.ListInvoiceTemplatesRequest) (*userv1.ListInvoiceTemplatesResponse, error) {
	userID, err := resolveOwnedUserID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	return h.service.ListInvoiceTemplates(ctx, userID)
}

// SaveInvoiceTemplate 新增或更新发票抬头模板。
func (h *UserHandler) SaveInvoiceTemplate(ctx context.Context, req *userv1.SaveInvoiceTemplateRequest) (*userv1.InvoiceTemplate, error) {
	userID, err := resolveOwnedUserID(ctx, 0)
	if err != nil {
		return nil, err
	}
	return h.service.SaveInvoiceTemplate(ctx, userID, req)
}

// DeleteInvoiceTemplate 删除发票抬头模板。
func (h *UserHandler) DeleteInvoiceTemplate(ctx context.Context, req *userv1.DeleteInvoiceTemplateRequest) (*commonv1.OperationResult, error) {
	userID, err := resolveOwnedUserID(ctx, 0)
	if err != nil {
		return nil, err
	}
	if err := h.service.DeleteInvoiceTemplate(ctx, userID, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "发票抬头模板已删除"}, nil
}

// GetNotificationSettings 查询当前用户的通知订阅偏好。
func (h *UserHandler) GetNotificationSettings(ctx context.Context, req *userv1.GetNotificationSettingsRequest) (*userv1.UserNotificationSettings, error) {
	userID, err := resolveOwnedUserID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	return h.service.GetNotificationSettings(ctx, userID)
}

// UpdateNotificationSettings 更新当前用户的通知订阅偏好。
func (h *UserHandler) UpdateNotificationSettings(ctx context.Context, req *userv1.UpdateNotificationSettingsRequest) (*userv1.UserNotificationSettings, error) {
	userID, err := resolveOwnedUserID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	return h.service.UpdateNotificationSettings(ctx, userID, req)
}

// GetAccountSecurity 查询当前用户的账号安全视图。
func (h *UserHandler) GetAccountSecurity(ctx context.Context, req *userv1.GetAccountSecurityRequest) (*userv1.AccountSecurityInfo, error) {
	userID, err := resolveOwnedUserID(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}
	return h.service.GetAccountSecurity(ctx, userID)
}

// RealNameAuth 提交实名认证。
func (h *UserHandler) RealNameAuth(ctx context.Context, req *userv1.RealNameAuthRequest) (*userv1.User, error) {
	userID, err := resolveOwnedUserID(ctx, 0)
	if err != nil {
		return nil, err
	}
	return h.service.RealNameAuth(ctx, userID, req)
}

// SubmitFeedback 提交意见反馈。
func (h *UserHandler) SubmitFeedback(ctx context.Context, req *userv1.SubmitFeedbackRequest) (*commonv1.OperationResult, error) {
	userID, err := resolveOwnedUserID(ctx, 0)
	if err != nil {
		return nil, err
	}
	if err := h.service.SubmitFeedback(ctx, userID, req); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "反馈已提交，感谢你的支持"}, nil
}

// ---------------------------------------------------------------------------
// 帮助中心
// ---------------------------------------------------------------------------

// ListHelpArticles 查询帮助中心文章。
func (h *UserHandler) ListHelpArticles(ctx context.Context, req *userv1.ListHelpArticlesRequest) (*userv1.ListHelpArticlesResponse, error) {
	return h.service.ListHelpArticles(ctx, req)
}

// GetHelpArticle 查询帮助文章详情。
func (h *UserHandler) GetHelpArticle(ctx context.Context, req *userv1.GetHelpArticleRequest) (*userv1.HelpArticle, error) {
	return h.service.GetHelpArticle(ctx, req.GetId())
}

// ---------------------------------------------------------------------------
// AdminHandler —— 实现 AdminService
// ---------------------------------------------------------------------------

// AdminHandler 实现面向后台管理端的 gRPC 接口。
type AdminHandler struct {
	userv1.UnimplementedAdminServiceServer
	service *Service
}

// NewAdminHandler 构造后台管理端处理器。
func NewAdminHandler(service *Service) *AdminHandler {
	return &AdminHandler{service: service}
}

// Login 管理员登录。
func (h *AdminHandler) Login(ctx context.Context, req *userv1.AdminLoginRequest) (*userv1.AuthResponse, error) {
	return h.service.AdminLogin(ctx, req)
}

// GetProfile 获取管理员资料。
func (h *AdminHandler) GetProfile(ctx context.Context, req *userv1.GetProfileRequest) (*userv1.Admin, error) {
	adminID := currentUserID(ctx, req.GetUserId())
	if adminID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	return h.service.AdminGetProfile(ctx, adminID)
}

// UpdateProfile 更新管理员资料。
func (h *AdminHandler) UpdateProfile(ctx context.Context, req *userv1.AdminUpdateProfileRequest) (*userv1.Admin, error) {
	adminID := currentUserID(ctx, req.GetAdminId())
	if adminID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}
	req.AdminId = adminID
	return h.service.AdminUpdateProfile(ctx, req)
}

// ListUsers 用户列表。
func (h *AdminHandler) ListUsers(ctx context.Context, req *userv1.AdminListUsersRequest) (*userv1.AdminListUsersResponse, error) {
	return h.service.AdminListUsers(ctx, req)
}

// UpdateUserStatus 修改用户状态。
func (h *AdminHandler) UpdateUserStatus(ctx context.Context, req *userv1.AdminUpdateUserStatusRequest) (*commonv1.OperationResult, error) {
	if err := h.service.AdminUpdateUserStatus(ctx, req); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "用户状态已更新"}, nil
}

// ListRoles 角色列表。
func (h *AdminHandler) ListRoles(ctx context.Context, _ *userv1.AdminListRolesRequest) (*userv1.AdminListRolesResponse, error) {
	return h.service.AdminListRoles(ctx)
}

// SaveRole 保存角色。
func (h *AdminHandler) SaveRole(ctx context.Context, req *userv1.SaveRoleRequest) (*userv1.Role, error) {
	return h.service.AdminSaveRole(ctx, req)
}

// DeleteRole 删除角色。
func (h *AdminHandler) DeleteRole(ctx context.Context, req *userv1.DeleteRoleRequest) (*commonv1.OperationResult, error) {
	if err := h.service.AdminDeleteRole(ctx, req.GetId()); err != nil {
		return nil, err
	}
	return &commonv1.OperationResult{Success: true, Message: "角色已删除"}, nil
}

// ListPermissions 权限列表。
func (h *AdminHandler) ListPermissions(ctx context.Context, _ *userv1.AdminListPermissionsRequest) (*userv1.AdminListPermissionsResponse, error) {
	return h.service.AdminListPermissions(ctx)
}

// DashboardOverview 后台看板。
func (h *AdminHandler) DashboardOverview(ctx context.Context, req *userv1.AdminDashboardOverviewRequest) (*userv1.AdminDashboardOverviewResponse, error) {
	return h.service.AdminDashboardOverview(ctx, req.GetDays())
}

// ListInvoices 后台发票列表（user_id=0 表示全部）。
func (h *AdminHandler) ListInvoices(ctx context.Context, req *userv1.ListInvoicesRequest) (*userv1.ListInvoicesResponse, error) {
	return h.service.ListInvoices(ctx, req.GetUserId(), req.GetStatus(), req.GetPage())
}

// SetInvoiceStatus 处理发票申请。
func (h *AdminHandler) SetInvoiceStatus(ctx context.Context, req *userv1.SetInvoiceStatusRequest) (*userv1.Invoice, error) {
	return h.service.SetInvoiceStatus(ctx, req.GetId(), int8(req.GetStatus()), req.GetInvoiceUrl(), req.GetRemark())
}

// ListFeedbacks 后台分页查询用户反馈。
func (h *AdminHandler) ListFeedbacks(ctx context.Context, req *userv1.ListFeedbacksRequest) (*userv1.ListFeedbacksResponse, error) {
	return h.service.AdminListFeedbacks(ctx, req)
}

// SetFeedbackStatus 处理用户反馈。
func (h *AdminHandler) SetFeedbackStatus(ctx context.Context, req *userv1.SetFeedbackStatusRequest) (*userv1.Feedback, error) {
	return h.service.AdminSetFeedbackStatus(ctx, req)
}

// SaveUserLevel 新增或更新会员等级。
func (h *AdminHandler) SaveUserLevel(ctx context.Context, req *userv1.SaveUserLevelRequest) (*userv1.UserLevel, error) {
	return h.service.AdminSaveUserLevel(ctx, req)
}
