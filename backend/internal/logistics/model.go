// Package logistics 实现发货单、物流轨迹与运费模板相关的业务能力。
package logistics

import (
	"time"
)

// 发货单状态
const (
	ShipmentStatusPending   = 1 // 待发货
	ShipmentStatusShipped   = 2 // 已发货
	ShipmentStatusDelivered = 3 // 已签收
	ShipmentStatusException = 4 // 异常
)

// Shipment 是发货单模型。
type Shipment struct {
	ID           uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	OrderID      uint64     `gorm:"bigint unsigned;not null;index:idx_order" json:"order_id"`
	OrderNo      string     `gorm:"type:varchar(32);not null;default:''" json:"order_no"`
	TrackingNo   string     `gorm:"type:varchar(64);not null;default:'';index:idx_tracking" json:"tracking_no"`
	Company      string     `gorm:"type:varchar(64);not null;default:''" json:"company"`
	CompanyCode  string     `gorm:"type:varchar(32);not null;default:''" json:"company_code"`
	Status       int8       `gorm:"tinyint;not null;default:1;index:idx_status" json:"status"`
	Receiver     string     `gorm:"type:varchar(64);not null;default:''" json:"receiver"`
	Phone        string     `gorm:"type:varchar(32);not null;default:''" json:"phone"`
	Address      string     `gorm:"type:varchar(512);not null;default:''" json:"address"`
	FreightCents int64      `gorm:"bigint;not null;default:0" json:"freight_cents"`
	ItemCount    int32      `gorm:"int;not null;default:0" json:"item_count"`
	Remark       string     `gorm:"type:varchar(512);not null;default:''" json:"remark"`
	ShippedAt    *time.Time `gorm:"type:datetime" json:"shipped_at"`
	DeliveredAt  *time.Time `gorm:"type:datetime" json:"delivered_at"`
	CreatedAt    time.Time  `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt    time.Time  `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// TableName 指定表名。
func (Shipment) TableName() string { return "shipments" }

// ShipmentTrack 是物流轨迹模型。
type ShipmentTrack struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	ShipmentID  uint64    `gorm:"bigint unsigned;not null;index:idx_shipment,priority:1" json:"shipment_id"`
	TrackingNo  string    `gorm:"type:varchar(64);not null;default:''" json:"tracking_no"`
	Location    string    `gorm:"type:varchar(128);not null;default:''" json:"location"`
	Description string    `gorm:"type:varchar(512);not null;default:''" json:"description"`
	OccurredAt  time.Time `gorm:"type:datetime;not null" json:"occurred_at"`
	Sort        int32     `gorm:"int;not null;default:0;index:idx_shipment,priority:2" json:"sort"`
}

// TableName 指定表名。
func (ShipmentTrack) TableName() string { return "shipment_tracks" }

// LogisticTemplate 是运费模板模型。
type LogisticTemplate struct {
	ID                     uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	Name                   string `gorm:"type:varchar(64);not null" json:"name"`
	Company                string `gorm:"type:varchar(64);not null;default:''" json:"company"`
	CompanyCode            string `gorm:"type:varchar(32);not null;default:''" json:"company_code"`
	FreightCents           int64  `gorm:"bigint;not null;default:0" json:"freight_cents"`
	FreeFreightAmountCents int64  `gorm:"bigint;not null;default:0" json:"free_freight_amount_cents"`
	Regions                string `gorm:"type:varchar(512);not null;default:''" json:"regions"`
	// 布尔字段刻意不声明 gorm default：GORM 遇到带默认值的零值字段会
	// 强制写入数据库默认值，导致「显式保存为 false」被悄悄改回 true。
	// 数据库列本身仍保留 DEFAULT 1，兼容直接写 SQL 的场景。
	Enabled   bool      `gorm:"tinyint;not null" json:"enabled"`
	Sort      int32     `gorm:"int;not null;default:0" json:"sort"`
	CreatedAt time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"type:datetime;not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// TableName 指定表名。
func (LogisticTemplate) TableName() string { return "logistic_templates" }
