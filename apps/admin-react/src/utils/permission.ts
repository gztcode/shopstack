/**
 * 权限判定工具
 * 权限码来源于 deploy/mysql/init/02-seed.sql 的 permissions 表
 */

/** 权限码常量 */
export const PERMISSIONS = {
  productView: 'product:view',
  productCreate: 'product:create',
  productUpdate: 'product:update',
  productDelete: 'product:delete',
  categoryView: 'category:view',
  categoryUpdate: 'category:update',
  reviewAudit: 'review:audit',
  orderView: 'order:view',
  orderShip: 'order:ship',
  orderUpdate: 'order:update',
  refundAudit: 'refund:audit',
  paymentView: 'payment:view',
  userView: 'user:view',
  userUpdate: 'user:update',
  inventoryView: 'inventory:view',
  inventoryAdjust: 'inventory:adjust',
  marketingView: 'marketing:view',
  couponUpdate: 'coupon:update',
  promotionUpdate: 'promotion:update',
  contentView: 'content:view',
  bannerUpdate: 'banner:update',
  logisticsView: 'logistics:view',
  systemRole: 'system:role',
  systemAudit: 'system:audit',
  systemDashboard: 'system:dashboard',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

/** 是否拥有某个权限码 */
export function hasPermission(permissions: string[] | undefined, code: string): boolean {
  if (!permissions || permissions.length === 0) return false
  return permissions.includes(code)
}

/** 是否拥有其中任意一个权限码 */
export function hasAnyPermission(permissions: string[] | undefined, codes: string[]): boolean {
  if (!permissions || permissions.length === 0) return false
  return codes.some((code) => permissions.includes(code))
}

/** 是否拥有全部权限码 */
export function hasAllPermissions(permissions: string[] | undefined, codes: string[]): boolean {
  if (!permissions || permissions.length === 0) return false
  return codes.every((code) => permissions.includes(code))
}
