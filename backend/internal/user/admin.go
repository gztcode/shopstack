package user

import (
	"context"
	"strings"
	"time"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	orderv1 "github.com/shopstack/platform/gen/go/order/v1"
	productv1 "github.com/shopstack/platform/gen/go/product/v1"
	userv1 "github.com/shopstack/platform/gen/go/user/v1"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/logger"
)

// AdminLogin 管理员登录。
func (s *Service) AdminLogin(ctx context.Context, req *userv1.AdminLoginRequest) (*userv1.AuthResponse, error) {
	username := strings.TrimSpace(req.GetUsername())
	if username == "" || req.GetPassword() == "" {
		return nil, errs.Invalid("用户名和密码不能为空")
	}

	admin, err := s.repo.FindAdminByUsername(ctx, username)
	if err != nil {
		return nil, errs.New(errs.CodePasswordIncorrect, "用户名或密码错误")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.GetPassword())); err != nil {
		return nil, errs.New(errs.CodePasswordIncorrect, "用户名或密码错误")
	}
	if admin.Status != 1 {
		return nil, errs.New(errs.CodeUserDisabled, "账号已被禁用")
	}

	if err := s.repo.TouchAdminLogin(ctx, admin.ID); err != nil {
		logger.L().Warn("更新管理员登录时间失败", zap.Error(err))
	}
	logger.L().Info("管理员登录", zap.String("账号", username), zap.Uint64("管理员ID", admin.ID))
	return s.issueAdminToken(ctx, admin)
}

// AdminGetProfile 获取管理员资料。
func (s *Service) AdminGetProfile(ctx context.Context, adminID int64) (*userv1.Admin, error) {
	admin, err := s.repo.FindAdminByID(ctx, uint64(adminID))
	if err != nil {
		return nil, err
	}
	roles, err := s.repo.AdminRoles(ctx, admin.ID)
	if err != nil {
		logger.L().Warn("查询管理员角色失败", zap.Error(err))
	}
	roleIDs := make([]uint64, 0, len(roles))
	roleNames := make([]string, 0, len(roles))
	for _, r := range roles {
		roleIDs = append(roleIDs, r.ID)
		roleNames = append(roleNames, r.Name)
	}
	return &userv1.Admin{
		Id:          int64(admin.ID),
		Username:    admin.Username,
		RealName:    admin.RealName,
		Avatar:      admin.Avatar,
		Email:       admin.Email,
		Phone:       admin.Phone,
		RoleIds:     int64sToUint64(roleIDs),
		RoleNames:   roleNames,
		Status:      int32(admin.Status),
		CreatedAt:   tsPtr(&admin.CreatedAt),
		LastLoginAt: tsPtr(admin.LastLoginAt),
	}, nil
}

// AdminUpdateProfile 更新管理员资料。
func (s *Service) AdminUpdateProfile(ctx context.Context, req *userv1.AdminUpdateProfileRequest) (*userv1.Admin, error) {
	fields := map[string]any{}
	if req.GetRealName() != "" {
		fields["real_name"] = req.GetRealName()
	}
	if req.GetAvatar() != "" {
		fields["avatar"] = req.GetAvatar()
	}
	if req.GetEmail() != "" {
		fields["email"] = req.GetEmail()
	}
	if req.GetPhone() != "" {
		fields["phone"] = req.GetPhone()
	}
	if len(fields) > 0 {
		if err := s.repo.UpdateAdmin(ctx, uint64(req.GetAdminId()), fields); err != nil {
			return nil, errs.Wrap(errs.CodeInternalError, "更新管理员资料失败", err)
		}
	}
	return s.AdminGetProfile(ctx, req.GetAdminId())
}

// AdminListUsers 分页查询用户。
func (s *Service) AdminListUsers(ctx context.Context, req *userv1.AdminListUsersRequest) (*userv1.AdminListUsersResponse, error) {
	pageNum, pageSize := normalizePage(req.GetPage())
	users, total, err := s.repo.ListUsers(ctx, req.GetKeyword(), int(req.GetStatus()), pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询用户失败", err)
	}
	out := make([]*userv1.User, 0, len(users))
	for i := range users {
		out = append(out, userToProto(&users[i]))
	}
	return &userv1.AdminListUsersResponse{
		Users: out,
		Meta:  buildMeta(pageNum, pageSize, total),
	}, nil
}

// AdminUpdateUserStatus 启用/禁用用户。
func (s *Service) AdminUpdateUserStatus(ctx context.Context, req *userv1.AdminUpdateUserStatusRequest) error {
	status := int8(req.GetStatus())
	if status != UserStatusActive && status != UserStatusDisabled && status != UserStatusFrozen {
		return errs.Invalid("非法的用户状态")
	}
	if err := s.repo.UpdateUser(ctx, uint64(req.GetUserId()), map[string]any{"status": status}); err != nil {
		return errs.Wrap(errs.CodeInternalError, "更新用户状态失败", err)
	}
	logger.L().Info("管理员修改用户状态",
		zap.Int64("用户ID", req.GetUserId()),
		zap.Int8("状态", status),
		zap.Int64("操作人", auth.UserIDFromContext(ctx)))
	return nil
}

// AdminListRoles 查询角色列表。
func (s *Service) AdminListRoles(ctx context.Context) (*userv1.AdminListRolesResponse, error) {
	roles, err := s.repo.ListRoles(ctx)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询角色失败", err)
	}

	codesByRole, err := s.repo.RoleCodesByIDs(ctx, roleIDsOf(roles))
	if err != nil {
		logger.L().Warn("查询角色权限失败", zap.Error(err))
	}

	out := make([]*userv1.Role, 0, len(roles))
	for i := range roles {
		count, _ := s.repo.RoleUserCount(ctx, roles[i].ID)
		out = append(out, &userv1.Role{
			Id:              int64(roles[i].ID),
			Name:            roles[i].Name,
			Code:            roles[i].Code,
			Description:     roles[i].Description,
			PermissionCodes: codesByRole[roles[i].ID],
			UserCount:       int32(count),
			CreatedAt:       tsPtr(&roles[i].CreatedAt),
		})
	}
	return &userv1.AdminListRolesResponse{Roles: out}, nil
}

func roleIDsOf(roles []Role) []uint64 {
	ids := make([]uint64, 0, len(roles))
	for _, r := range roles {
		ids = append(ids, r.ID)
	}
	return ids
}

// AdminSaveRole 新增或更新角色。
func (s *Service) AdminSaveRole(ctx context.Context, req *userv1.SaveRoleRequest) (*userv1.Role, error) {
	if strings.TrimSpace(req.GetName()) == "" {
		return nil, errs.Invalid("角色名称不能为空")
	}
	if strings.TrimSpace(req.GetCode()) == "" {
		return nil, errs.Invalid("角色标识不能为空")
	}

	role := &Role{
		ID:          uint64(req.GetId()),
		Name:        req.GetName(),
		Code:        req.GetCode(),
		Description: req.GetDescription(),
	}
	permIDs := make([]uint64, 0, len(req.GetPermissionIds()))
	for _, pid := range req.GetPermissionIds() {
		permIDs = append(permIDs, uint64(pid))
	}

	if err := s.repo.SaveRole(ctx, role, permIDs); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "保存角色失败", err)
	}

	codes, _ := s.repo.RoleCodesByIDs(ctx, []uint64{role.ID})
	logger.L().Info("管理员保存角色",
		zap.String("角色", role.Code),
		zap.Int64("操作人", auth.UserIDFromContext(ctx)))
	return &userv1.Role{
		Id:              int64(role.ID),
		Name:            role.Name,
		Code:            role.Code,
		Description:     role.Description,
		PermissionIds:   req.GetPermissionIds(),
		PermissionCodes: codes[role.ID],
		CreatedAt:       tsPtr(&role.CreatedAt),
	}, nil
}

// AdminDeleteRole 删除角色。
func (s *Service) AdminDeleteRole(ctx context.Context, id int64) error {
	role, err := s.repo.FindRole(ctx, uint64(id))
	if err != nil {
		return err
	}
	if role.Code == "super_admin" {
		return errs.Forbidden("超级管理员角色不允许删除")
	}
	if err := s.repo.DeleteRole(ctx, uint64(id)); err != nil {
		return errs.Wrap(errs.CodeInternalError, "删除角色失败", err)
	}
	return nil
}

// AdminListPermissions 查询权限列表。
func (s *Service) AdminListPermissions(ctx context.Context) (*userv1.AdminListPermissionsResponse, error) {
	list, err := s.repo.ListPermissions(ctx)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询权限失败", err)
	}
	out := make([]*userv1.Permission, 0, len(list))
	for _, p := range list {
		out = append(out, &userv1.Permission{
			Id:         int64(p.ID),
			Name:       p.Name,
			Code:       p.Code,
			Group:      p.Group,
			Type:       p.Type,
			ParentCode: p.ParentCode,
			Sort:       int32(p.Sort),
		})
	}
	return &userv1.AdminListPermissionsResponse{Permissions: out}, nil
}

// AdminDashboardOverview 汇总后台看板数据。
//
// 用户相关的统计来自本服务，订单与商品相关的统计通过 gRPC 调用
// 订单服务与商品服务获取，保持服务边界不被破坏。
func (s *Service) AdminDashboardOverview(ctx context.Context, days int32) (*userv1.AdminDashboardOverviewResponse, error) {
	if days <= 0 {
		days = 30
	}
	since := time.Now().AddDate(0, 0, -int(days))

	totalUsers, err := s.repo.CountUsers(ctx)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计用户数失败", err)
	}
	newUsers, err := s.repo.CountNewUsers(ctx, since)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计新增用户失败", err)
	}

	resp := &userv1.AdminDashboardOverviewResponse{
		TotalUsers:    totalUsers,
		NewUsers:      newUsers,
		Trend:         []*userv1.AdminTrendPoint{},
		CategoryStats: []*userv1.AdminCategoryStat{},
		TopProducts:   []*userv1.AdminTopProduct{},
	}

	// 商品统计
	if conn, cErr := s.registry.Conn(ctx, "product"); cErr == nil {
		productClient := productv1.NewProductServiceClient(conn)
		if list, lErr := productClient.ListProducts(ctx, &productv1.ListProductsRequest{
			Page: &commonv1.PageRequest{Page: 1, PageSize: 1},
		}); lErr == nil {
			resp.TotalProducts = list.GetMeta().GetTotal()
		}
		if list, lErr := productClient.ListProducts(ctx, &productv1.ListProductsRequest{
			Page:   &commonv1.PageRequest{Page: 1, PageSize: 1},
			Status: int32(productStatusOnShelf),
		}); lErr == nil {
			resp.OnShelfProducts = list.GetMeta().GetTotal()
		}
	} else {
		logger.L().Warn("获取商品服务失败，看板商品统计为空", zap.Error(cErr))
	}

	// 订单统计
	if conn, oErr := s.registry.Conn(ctx, "order"); oErr == nil {
		orderClient := orderv1.NewOrderServiceClient(conn)
		stats, sErr := orderClient.AdminOrderStats(ctx, &orderv1.AdminOrderStatsRequest{Days: days})
		if sErr != nil {
			logger.L().Warn("获取订单统计失败，看板订单统计为空", zap.Error(sErr))
		} else {
			resp.TotalOrders = stats.GetTotalOrders()
			resp.PaidOrders = stats.GetPaidOrders()
			resp.PendingShipment = stats.GetPendingShipment()
			resp.TotalRevenueCents = stats.GetTotalRevenueCents()
			resp.TodayRevenueCents = stats.GetTodayRevenueCents()
			resp.PendingRefunds = stats.GetRefunding()

			for _, t := range stats.GetTrend() {
				resp.Trend = append(resp.Trend, &userv1.AdminTrendPoint{
					Date:         t.GetDate(),
					OrderCount:   t.GetOrderCount(),
					RevenueCents: t.GetRevenueCents(),
					NewUsers:     t.GetNewUsers(),
				})
			}
			for _, c := range stats.GetCategoryStats() {
				resp.CategoryStats = append(resp.CategoryStats, &userv1.AdminCategoryStat{
					CategoryId:   c.GetCategoryId(),
					CategoryName: c.GetCategoryName(),
					SalesCount:   c.GetSalesCount(),
					RevenueCents: c.GetRevenueCents(),
				})
			}
			for _, p := range stats.GetTopProducts() {
				resp.TopProducts = append(resp.TopProducts, &userv1.AdminTopProduct{
					ProductId:    p.GetProductId(),
					Title:        p.GetTitle(),
					Cover:        p.GetCover(),
					SalesCount:   p.GetSalesCount(),
					RevenueCents: p.GetRevenueCents(),
				})
			}
		}
	} else {
		logger.L().Warn("获取订单服务失败，看板订单统计为空", zap.Error(oErr))
	}

	return resp, nil
}

// 商品上架状态常量
const productStatusOnShelf = 2
