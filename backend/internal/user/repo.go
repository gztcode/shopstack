package user

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/shopstack/platform/backend/internal/errs"
)

// Repo 封装用户域的数据访问。
type Repo struct {
	db *gorm.DB
}

// NewRepo 构造仓储。
func NewRepo(db *gorm.DB) *Repo { return &Repo{db: db} }

// DB 暴露底层数据库句柄。
func (r *Repo) DB() *gorm.DB { return r.db }

// ---------------------------------------------------------------------------
// 用户
// ---------------------------------------------------------------------------

// CreateUser 新增用户。
func (r *Repo) CreateUser(ctx context.Context, u *User) error {
	if err := r.db.WithContext(ctx).Create(u).Error; err != nil {
		return err
	}
	return nil
}

// FindUserByID 按 ID 查询用户。
func (r *Repo) FindUserByID(ctx context.Context, id uint64) (*User, error) {
	var u User
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeUserNotFound, "用户不存在")
		}
		return nil, err
	}
	return &u, nil
}

// FindUserByUsername 按用户名查询。
func (r *Repo) FindUserByUsername(ctx context.Context, username string) (*User, error) {
	var u User
	if err := r.db.WithContext(ctx).Where("username = ?", username).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeUserNotFound, "用户不存在")
		}
		return nil, err
	}
	return &u, nil
}

// FindUserByPhone 按手机号查询。
func (r *Repo) FindUserByPhone(ctx context.Context, phone string) (*User, error) {
	var u User
	if err := r.db.WithContext(ctx).Where("phone = ? AND phone <> ''", phone).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeUserNotFound, "用户不存在")
		}
		return nil, err
	}
	return &u, nil
}

// FindUserByWeChatOpenID 按微信 openid 查询。
func (r *Repo) FindUserByWeChatOpenID(ctx context.Context, openID string) (*User, error) {
	var u User
	if err := r.db.WithContext(ctx).Where("wechat_openid = ? AND wechat_openid <> ''", openID).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeUserNotFound, "用户不存在")
		}
		return nil, err
	}
	return &u, nil
}

// UsernameExists 判断用户名是否已存在。
func (r *Repo) UsernameExists(ctx context.Context, username string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&User{}).Where("username = ?", username).Count(&count).Error
	return count > 0, err
}

// PhoneExists 判断手机号是否已存在。
func (r *Repo) PhoneExists(ctx context.Context, phone string) (bool, error) {
	if phone == "" {
		return false, nil
	}
	var count int64
	err := r.db.WithContext(ctx).Model(&User{}).Where("phone = ?", phone).Count(&count).Error
	return count > 0, err
}

// UpdateUser 更新用户字段。
func (r *Repo) UpdateUser(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&User{}).Where("id = ?", id).Updates(fields).Error
}

// TouchLogin 更新最近登录时间。
func (r *Repo) TouchLogin(ctx context.Context, id uint64) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&User{}).Where("id = ?", id).
		Update("last_login_at", &now).Error
}

// ListUsers 分页查询用户。
func (r *Repo) ListUsers(ctx context.Context, keyword string, status int, page, pageSize int) ([]User, int64, error) {
	q := r.db.WithContext(ctx).Model(&User{})
	if keyword != "" {
		like := "%" + keyword + "%"
		q = q.Where("username LIKE ? OR nickname LIKE ? OR phone LIKE ?", like, like, like)
	}
	if status > 0 {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []User
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

// CountUsers 统计用户总数。
func (r *Repo) CountUsers(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&User{}).Where("status = ?", UserStatusActive).Count(&count).Error
	return count, err
}

// CountNewUsers 统计指定天数内的新增用户数。
func (r *Repo) CountNewUsers(ctx context.Context, since time.Time) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&User{}).Where("created_at >= ?", since).Count(&count).Error
	return count, err
}

// NewUserTrend 返回按天聚合的新增用户数。
func (r *Repo) NewUserTrend(ctx context.Context, since time.Time) (map[string]int64, error) {
	type row struct {
		Date  string
		Count int64
	}
	var rows []row
	err := r.db.WithContext(ctx).Model(&User{}).
		Select("DATE(created_at) AS date, COUNT(*) AS count").
		Where("created_at >= ?", since).
		Group("DATE(created_at)").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make(map[string]int64, len(rows))
	for _, r := range rows {
		out[r.Date] = r.Count
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// 地址
// ---------------------------------------------------------------------------

// ListAddresses 查询用户地址列表。
func (r *Repo) ListAddresses(ctx context.Context, userID uint64) ([]UserAddress, error) {
	var list []UserAddress
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).
		Order("is_default DESC, id DESC").Find(&list).Error
	return list, err
}

// FindAddress 按 ID 查询地址。
func (r *Repo) FindAddress(ctx context.Context, userID, id uint64) (*UserAddress, error) {
	var a UserAddress
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&a).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "收货地址不存在")
		}
		return nil, err
	}
	return &a, nil
}

// SaveAddress 新增或更新地址。
func (r *Repo) SaveAddress(ctx context.Context, a *UserAddress) error {
	return r.db.WithContext(ctx).Save(a).Error
}

// ClearDefaultAddress 清除用户的默认地址标记。
func (r *Repo) ClearDefaultAddress(ctx context.Context, userID uint64) error {
	return r.db.WithContext(ctx).Model(&UserAddress{}).
		Where("user_id = ? AND is_default = ?", userID, true).
		Update("is_default", false).Error
}

// DeleteAddress 删除地址。
func (r *Repo) DeleteAddress(ctx context.Context, userID, id uint64) error {
	return r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Delete(&UserAddress{}).Error
}

// ---------------------------------------------------------------------------
// 收藏
// ---------------------------------------------------------------------------

// IsFavorited 判断是否已收藏。
func (r *Repo) IsFavorited(ctx context.Context, userID, productID uint64) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&UserFavorite{}).
		Where("user_id = ? AND product_id = ?", userID, productID).Count(&count).Error
	return count > 0, err
}

// AddFavorite 添加收藏（幂等）。
func (r *Repo) AddFavorite(ctx context.Context, userID, productID uint64) error {
	exists, err := r.IsFavorited(ctx, userID, productID)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	return r.db.WithContext(ctx).Create(&UserFavorite{
		UserID:    userID,
		ProductID: productID,
	}).Error
}

// RemoveFavorite 取消收藏。
func (r *Repo) RemoveFavorite(ctx context.Context, userID, productID uint64) error {
	return r.db.WithContext(ctx).Where("user_id = ? AND product_id = ?", userID, productID).
		Delete(&UserFavorite{}).Error
}

// ListFavoriteIDs 查询用户收藏的商品 ID 列表。
func (r *Repo) ListFavoriteIDs(ctx context.Context, userID uint64) ([]uint64, error) {
	var ids []uint64
	err := r.db.WithContext(ctx).Model(&UserFavorite{}).
		Where("user_id = ?", userID).Order("id DESC").Pluck("product_id", &ids).Error
	return ids, err
}

// ---------------------------------------------------------------------------
// 管理员 / 角色 / 权限
// ---------------------------------------------------------------------------

// FindAdminByUsername 按用户名查询管理员。
func (r *Repo) FindAdminByUsername(ctx context.Context, username string) (*Admin, error) {
	var a Admin
	if err := r.db.WithContext(ctx).Where("username = ?", username).First(&a).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeUserNotFound, "管理员不存在")
		}
		return nil, err
	}
	return &a, nil
}

// FindAdminByID 按 ID 查询管理员。
func (r *Repo) FindAdminByID(ctx context.Context, id uint64) (*Admin, error) {
	var a Admin
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&a).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeUserNotFound, "管理员不存在")
		}
		return nil, err
	}
	return &a, nil
}

// TouchAdminLogin 更新管理员最近登录时间。
func (r *Repo) TouchAdminLogin(ctx context.Context, id uint64) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&Admin{}).Where("id = ?", id).
		Update("last_login_at", &now).Error
}

// UpdateAdmin 更新管理员字段。
func (r *Repo) UpdateAdmin(ctx context.Context, id uint64, fields map[string]any) error {
	return r.db.WithContext(ctx).Model(&Admin{}).Where("id = ?", id).Updates(fields).Error
}

// AdminRoleIDs 返回管理员拥有的角色 ID。
func (r *Repo) AdminRoleIDs(ctx context.Context, adminID uint64) ([]uint64, error) {
	var ids []uint64
	err := r.db.WithContext(ctx).Model(&AdminRole{}).
		Where("admin_id = ?", adminID).Pluck("role_id", &ids).Error
	return ids, err
}

// AdminRoles 返回管理员的角色列表。
func (r *Repo) AdminRoles(ctx context.Context, adminID uint64) ([]Role, error) {
	var roles []Role
	err := r.db.WithContext(ctx).
		Joins("JOIN admin_roles ar ON ar.role_id = roles.id").
		Where("ar.admin_id = ?", adminID).Find(&roles).Error
	return roles, err
}

// AdminPermissions 返回管理员的全部权限码。
func (r *Repo) AdminPermissions(ctx context.Context, adminID uint64) ([]string, error) {
	var codes []string
	err := r.db.WithContext(ctx).Model(&Permission{}).
		Select("permissions.code").
		Joins("JOIN role_permissions rp ON rp.permission_id = permissions.id").
		Joins("JOIN admin_roles ar ON ar.role_id = rp.role_id").
		Where("ar.admin_id = ?", adminID).
		Group("permissions.code").
		Order("MIN(permissions.sort) ASC").Pluck("permissions.code", &codes).Error
	return codes, err
}

// ListRoles 返回全部角色。
func (r *Repo) ListRoles(ctx context.Context) ([]Role, error) {
	var roles []Role
	err := r.db.WithContext(ctx).Order("id ASC").Find(&roles).Error
	return roles, err
}

// FindRole 按 ID 查询角色。
func (r *Repo) FindRole(ctx context.Context, id uint64) (*Role, error) {
	var role Role
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&role).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.New(errs.CodeNotFound, "角色不存在")
		}
		return nil, err
	}
	return &role, nil
}

// RoleCodesByIDs 返回指定角色的权限码。
func (r *Repo) RoleCodesByIDs(ctx context.Context, roleIDs []uint64) (map[uint64][]string, error) {
	if len(roleIDs) == 0 {
		return map[uint64][]string{}, nil
	}
	type row struct {
		RoleID uint64
		Code   string
	}
	var rows []row
	err := r.db.WithContext(ctx).Model(&Permission{}).
		Select("rp.role_id AS role_id, permissions.code AS code").
		Joins("JOIN role_permissions rp ON rp.permission_id = permissions.id").
		Where("rp.role_id IN ?", roleIDs).
		Order("permissions.sort ASC").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make(map[uint64][]string, len(roleIDs))
	for _, rw := range rows {
		out[rw.RoleID] = append(out[rw.RoleID], rw.Code)
	}
	return out, nil
}

// RolePermissionIDs 返回角色拥有的权限 ID。
func (r *Repo) RolePermissionIDs(ctx context.Context, roleID uint64) ([]uint64, error) {
	var ids []uint64
	err := r.db.WithContext(ctx).Model(&RolePermission{}).
		Where("role_id = ?", roleID).Pluck("permission_id", &ids).Error
	return ids, err
}

// RoleUserCount 统计角色下的管理员数量。
func (r *Repo) RoleUserCount(ctx context.Context, roleID uint64) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&AdminRole{}).
		Where("role_id = ?", roleID).Count(&count).Error
	return count, err
}

// SaveRole 新增或更新角色及其权限关联（事务内完成）。
func (r *Repo) SaveRole(ctx context.Context, role *Role, permissionIDs []uint64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if role.ID == 0 {
			if err := tx.Create(role).Error; err != nil {
				return err
			}
		} else if err := tx.Model(&Role{}).Where("id = ?", role.ID).
			Updates(map[string]any{
				"name":        role.Name,
				"code":        role.Code,
				"description": role.Description,
			}).Error; err != nil {
			return err
		}

		if err := tx.Where("role_id = ?", role.ID).Delete(&RolePermission{}).Error; err != nil {
			return err
		}
		if len(permissionIDs) == 0 {
			return nil
		}
		rows := make([]RolePermission, 0, len(permissionIDs))
		for _, pid := range permissionIDs {
			rows = append(rows, RolePermission{RoleID: role.ID, PermissionID: pid})
		}
		return tx.Create(&rows).Error
	})
}

// DeleteRole 删除角色及其权限关联。
func (r *Repo) DeleteRole(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("role_id = ?", id).Delete(&RolePermission{}).Error; err != nil {
			return err
		}
		if err := tx.Where("role_id = ?", id).Delete(&AdminRole{}).Error; err != nil {
			return err
		}
		return tx.Delete(&Role{}, id).Error
	})
}

// ListPermissions 返回全部权限。
func (r *Repo) ListPermissions(ctx context.Context) ([]Permission, error) {
	var list []Permission
	err := r.db.WithContext(ctx).Order("sort ASC, id ASC").Find(&list).Error
	return list, err
}
