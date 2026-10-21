package order

import (
	"context"
	"fmt"
	"math/rand"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/timestamppb"

	cartv1 "github.com/shopstack/platform/gen/go/cart/v1"
	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	logisticsv1 "github.com/shopstack/platform/gen/go/logistics/v1"
	marketingv1 "github.com/shopstack/platform/gen/go/marketing/v1"
	orderv1 "github.com/shopstack/platform/gen/go/order/v1"
	productv1 "github.com/shopstack/platform/gen/go/product/v1"
	userv1 "github.com/shopstack/platform/gen/go/user/v1"

	"github.com/shopstack/platform/backend/internal/auth"
	"github.com/shopstack/platform/backend/internal/client"
	"github.com/shopstack/platform/backend/internal/errs"
	"github.com/shopstack/platform/backend/internal/logger"
	"github.com/shopstack/platform/backend/internal/mq"
)

// Service 承载订单域的业务逻辑。
type Service struct {
	repo     *Repo
	registry *client.Registry
	mq       *mq.Client
}

// NewService 构造订单服务。
func NewService(repo *Repo, registry *client.Registry, mqClient *mq.Client) *Service {
	return &Service{repo: repo, registry: registry, mq: mqClient}
}

// ---------------------------------------------------------------------------
// 下单
// ---------------------------------------------------------------------------

// CreateOrder 创建订单。
func (s *Service) CreateOrder(ctx context.Context, req *orderv1.CreateOrderRequest) (*orderv1.Order, error) {
	userID := req.GetUserId()
	if userID <= 0 {
		userID = auth.UserIDFromContext(ctx)
	}
	if userID <= 0 {
		return nil, errs.Unauthorized("请先登录")
	}

	// 1. 解析下单商品
	items, err := s.resolveItems(ctx, userID, req)
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, errs.New(errs.CodeOrderEmpty, "请选择要购买的商品")
	}

	// 2. 读取实时商品信息（价格、库存、名称）
	priced := make([]orderItemView, 0, len(items))
	totalAmount := int64(0)
	totalQuantity := 0

	for _, it := range items {
		info, pErr := s.fetchProduct(ctx, it.productID, it.skuID)
		if pErr != nil {
			return nil, pErr
		}
		priced = append(priced, orderItemView{
			productID: it.productID, skuID: it.skuID, title: info.title,
			specText: info.specText, image: info.image, category: info.categoryID,
			price: info.price, quantity: it.quantity,
		})
		totalAmount += info.price * int64(it.quantity)
		totalQuantity += it.quantity
	}

	// 3. 收货地址
	address, err := s.resolveAddress(ctx, userID, req.GetAddressId())
	if err != nil {
		return nil, err
	}

	// 4. 优惠与运费试算
	preview, err := s.previewCheckout(ctx, userID, req.GetCouponId(), items, totalAmount)
	if err != nil {
		logger.L().Warn("结算试算失败，按无优惠处理", zap.Error(err))
		preview = &marketingv1.PreviewCheckoutResponse{
			TotalAmountCents: totalAmount,
			PayableCents:     totalAmount,
		}
	}

	payable := preview.GetPayableCents()
	if payable <= 0 {
		payable = totalAmount
	}
	if payable < 0 {
		payable = 0
	}

	// 5. 落库
	now := time.Now()
	order := &Order{
		OrderNo:          generateOrderNo(now),
		UserID:           uint64(userID),
		Status:           StatusPendingPayment,
		TotalAmountCents: totalAmount,
		DiscountCents:    preview.GetDiscountCents(),
		FreightCents:     preview.GetFreightCents(),
		PayableCents:     payable,
		ItemCount:        len(priced),
		TotalQuantity:    totalQuantity,
		Receiver:         address.GetReceiver(),
		Phone:            address.GetPhone(),
		Address:          formatAddress(address),
		Remark:           req.GetRemark(),
		PaymentMethod:    req.GetPaymentMethod(),
		CouponID:         uint64(req.GetCouponId()),
		PointsUsed:       int(req.GetPointsUsed()),
	}

	orderItems := make([]OrderItem, 0, len(priced))
	for _, p := range priced {
		orderItems = append(orderItems, OrderItem{
			ProductID:     p.productID,
			SKUID:         p.skuID,
			ProductTitle:  p.title,
			SpecText:      p.specText,
			Image:         p.image,
			PriceCents:    p.price,
			Quantity:      p.quantity,
			SubtotalCents: p.price * int64(p.quantity),
			CategoryID:    p.category,
			ProductCover:  p.image,
		})
	}

	if err := s.repo.CreateOrder(ctx, order, orderItems); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "创建订单失败", err)
	}

	// 6. 记录状态流转
	_ = s.repo.AddStatusLog(ctx, &OrderStatusLog{
		OrderID:    order.ID,
		FromStatus: 0,
		ToStatus:   StatusPendingPayment,
		Action:     "create",
		Operator:   fmt.Sprintf("user:%d", userID),
		Remark:     "用户提交订单",
	})

	// 7. 清理已下单的购物车条目
	s.clearCartItems(ctx, userID, req)

	// 8. 发布订单创建事件（库存预占、通知等）
	s.publishOrderEvent(mq.EventOrderCreated, order, priced)

	logger.L().Info("订单创建成功",
		zap.String("订单号", order.OrderNo),
		zap.Int64("金额", order.PayableCents),
		zap.Int64("用户ID", userID))

	return orderToProto(order), nil
}

// orderItemView 是下单时确认的商品快照，用于事件负载。
type orderItemView struct {
	productID uint64
	skuID     uint64
	title     string
	specText  string
	image     string
	category  uint64
	price     int64
	quantity  int
}

// rawItem 是下单前的原始商品条目。
type rawItem struct {
	productID uint64
	skuID     uint64
	quantity  int
}

// resolveItems 解析下单商品来源（直接下单或从购物车结算）。
func (s *Service) resolveItems(ctx context.Context, userID int64, req *orderv1.CreateOrderRequest) ([]rawItem, error) {
	if !req.GetFromCart() {
		items := make([]rawItem, 0, len(req.GetItems()))
		for _, it := range req.GetItems() {
			if it.GetQuantity() <= 0 {
				return nil, errs.Invalid("商品数量必须大于 0")
			}
			items = append(items, rawItem{
				productID: uint64(it.GetProductId()),
				skuID:     uint64(it.GetSkuId()),
				quantity:  int(it.GetQuantity()),
			})
		}
		return items, nil
	}

	conn, err := s.registry.Conn(ctx, "cart")
	if err != nil {
		return nil, errs.Wrap(errs.CodeUnavailable, "购物车服务暂不可用", err)
	}
	cartClient := cartv1.NewCartServiceClient(conn)

	cartResp, err := cartClient.GetCart(ctx, &cartv1.GetCartRequest{UserId: userID})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询购物车失败", err)
	}

	wanted := map[int64]bool{}
	for _, id := range req.GetCartItemIds() {
		wanted[id] = true
	}

	items := make([]rawItem, 0, len(cartResp.GetItems()))
	for _, ci := range cartResp.GetItems() {
		if len(wanted) > 0 && !wanted[ci.GetId()] {
			continue
		}
		if !ci.GetSelected() && len(wanted) == 0 {
			continue
		}
		if !ci.GetAvailable() {
			return nil, errs.New(errs.CodeProductOffShelf, fmt.Sprintf("商品「%s」已失效，请重新选择", ci.GetProductTitle()))
		}
		items = append(items, rawItem{
			productID: uint64(ci.GetProductId()),
			skuID:     uint64(ci.GetSkuId()),
			quantity:  int(ci.GetQuantity()),
		})
	}
	return items, nil
}

// productSnapshot 是下单时读取的商品快照。
type productSnapshot struct {
	title      string
	specText   string
	image      string
	price      int64
	stock      int32
	categoryID uint64
}

// fetchProduct 读取商品的实时价格与库存。
func (s *Service) fetchProduct(ctx context.Context, productID, skuID uint64) (productSnapshot, error) {
	conn, err := s.registry.Conn(ctx, "product")
	if err != nil {
		return productSnapshot{}, errs.Wrap(errs.CodeUnavailable, "商品服务暂不可用", err)
	}
	productClient := productv1.NewProductServiceClient(conn)

	detail, err := productClient.GetProduct(ctx, &productv1.GetProductRequest{Id: int64(productID)})
	if err != nil {
		return productSnapshot{}, errs.Wrap(errs.CodeProductNotFound, "商品不存在或已下架", err)
	}
	if detail.GetProduct().GetStatus() != commonv1.ProductStatus_PRODUCT_STATUS_ON_SHELF {
		return productSnapshot{}, errs.New(errs.CodeProductOffShelf, "商品已下架")
	}

	for _, sku := range detail.GetSkus() {
		if uint64(sku.GetId()) != skuID {
			continue
		}
		return productSnapshot{
			title:      detail.GetProduct().GetTitle(),
			specText:   sku.GetSpecText(),
			image:      firstNonEmpty(sku.GetImage(), detail.GetProduct().GetCover()),
			price:      sku.GetPriceCents(),
			stock:      sku.GetStock(),
			categoryID: uint64(detail.GetProduct().GetCategoryId()),
		}, nil
	}
	return productSnapshot{}, errs.New(errs.CodeSkuNotFound, "商品规格不存在")
}

// resolveAddress 解析收货地址。
func (s *Service) resolveAddress(ctx context.Context, userID int64, addressID int64) (*commonv1.Address, error) {
	conn, err := s.registry.Conn(ctx, "user")
	if err != nil {
		return nil, errs.Wrap(errs.CodeUnavailable, "用户服务暂不可用", err)
	}
	userClient := userv1.NewUserServiceClient(conn)

	resp, err := userClient.ListAddresses(ctx, &userv1.ListAddressesRequest{UserId: userID})
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询收货地址失败", err)
	}
	addresses := resp.GetAddresses()
	if len(addresses) == 0 {
		return nil, errs.Invalid("请先添加收货地址")
	}
	if addressID > 0 {
		for _, a := range addresses {
			if a.GetId() == addressID {
				return a, nil
			}
		}
		return nil, errs.Invalid("收货地址不存在")
	}
	for _, a := range addresses {
		if a.GetIsDefault() {
			return a, nil
		}
	}
	return addresses[0], nil
}

// previewCheckout 调用营销服务试算优惠与运费。
func (s *Service) previewCheckout(ctx context.Context, userID int64, couponID int64, items []rawItem, totalAmount int64) (*marketingv1.PreviewCheckoutResponse, error) {
	conn, err := s.registry.Conn(ctx, "marketing")
	if err != nil {
		return nil, err
	}
	marketingClient := marketingv1.NewMarketingServiceClient(conn)

	previewItems := make([]*marketingv1.StockItem, 0, len(items))
	for _, it := range items {
		previewItems = append(previewItems, &marketingv1.StockItem{
			SkuId: int64(it.skuID), ProductId: int64(it.productID), Quantity: int32(it.quantity),
		})
	}

	return marketingClient.PreviewCheckout(ctx, &marketingv1.PreviewCheckoutRequest{
		UserId:   userID,
		Items:    previewItems,
		CouponId: couponID,
	})
}

// clearCartItems 下单成功后清理购物车条目。
func (s *Service) clearCartItems(ctx context.Context, userID int64, req *orderv1.CreateOrderRequest) {
	if !req.GetFromCart() {
		return
	}
	conn, err := s.registry.Conn(ctx, "cart")
	if err != nil {
		logger.L().Warn("连接购物车服务失败，跳过清理", zap.Error(err))
		return
	}
	cartClient := cartv1.NewCartServiceClient(conn)
	if len(req.GetCartItemIds()) > 0 {
		for _, id := range req.GetCartItemIds() {
			if _, rErr := cartClient.RemoveCartItem(ctx, &cartv1.RemoveCartItemRequest{
				UserId: userID, Id: id,
			}); rErr != nil {
				logger.L().Warn("清理购物车条目失败", zap.Int64("条目ID", id), zap.Error(rErr))
			}
		}
		return
	}
	if _, cErr := cartClient.ClearCart(ctx, &cartv1.ClearCartRequest{UserId: userID}); cErr != nil {
		logger.L().Warn("清空购物车失败", zap.Error(cErr))
	}
}

// publishOrderEvent 发布订单事件。
func (s *Service) publishOrderEvent(eventType string, order *Order, items []orderItemView) {
	if s.mq == nil {
		return
	}
	payloadItems := make([]map[string]any, 0, len(items))
	for _, it := range items {
		payloadItems = append(payloadItems, map[string]any{
			"sku_id":     it.skuID,
			"product_id": it.productID,
			"quantity":   it.quantity,
			"price":      it.price,
		})
	}
	s.mq.PublishAsync(mq.NewEvent(eventType, "order-service", "", map[string]any{
		"order_id":   int64(order.ID),
		"order_no":   order.OrderNo,
		"user_id":    int64(order.UserID),
		"amount":     order.PayableCents,
		"items":      payloadItems,
		"created_at": order.CreatedAt.Unix(),
	}))
}

// ---------------------------------------------------------------------------
// 查询
// ---------------------------------------------------------------------------

// GetOrder 查询订单详情。
func (s *Service) GetOrder(ctx context.Context, orderID, userID int64) (*orderv1.OrderDetail, error) {
	order, err := s.repo.FindOrder(ctx, uint64(orderID))
	if err != nil {
		return nil, err
	}
	if userID > 0 && uint64(userID) != order.UserID {
		return nil, errs.New(errs.CodeForbidden, "无权查看该订单")
	}

	items, err := s.repo.OrderItems(ctx, order.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询订单商品失败", err)
	}
	logs, err := s.repo.StatusLogs(ctx, order.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询订单日志失败", err)
	}

	detail := &orderv1.OrderDetail{
		Order:      orderToProto(order),
		Items:      make([]*orderv1.OrderItem, 0, len(items)),
		Logs:       make([]*orderv1.OrderStatusLog, 0, len(logs)),
		CouponId:   int64(order.CouponID),
		ShipmentId: int64(order.ShipmentID),
	}
	for i := range items {
		detail.Items = append(detail.Items, orderItemToProto(&items[i]))
	}
	for i := range logs {
		detail.Logs = append(detail.Logs, statusLogToProto(&logs[i]))
	}

	// 物流信息
	if conn, cErr := s.registry.Conn(ctx, "logistics"); cErr == nil {
		logisticsClient := logisticsv1.NewLogisticsServiceClient(conn)
		if ship, sErr := logisticsClient.GetShipment(ctx, &logisticsv1.GetShipmentRequest{
			OrderId: orderID, UserId: userID,
		}); sErr == nil && ship.GetShipment() != nil {
			detail.ShipmentId = ship.GetShipment().GetId()
			detail.TrackingNo = ship.GetShipment().GetTrackingNo()
			detail.LogisticsCompany = ship.GetShipment().GetCompany()
			for _, t := range ship.GetTracks() {
				detail.LogisticsTracks = append(detail.LogisticsTracks, t.GetDescription())
			}
		}
	}

	// 可执行操作
	detail.CanCancel = order.Status == StatusPendingPayment
	detail.CanPay = order.Status == StatusPendingPayment
	detail.CanConfirm = order.Status == StatusShipped
	detail.CanRefund = order.Status == StatusPaid || order.Status == StatusShipped || order.Status == StatusCompleted
	detail.CanReview = order.Status == StatusCompleted

	return detail, nil
}

// ListOrders 分页查询订单。
func (s *Service) ListOrders(ctx context.Context, userID int64, status int8, keyword string, start, end time.Time, page *commonv1.PageRequest) (*orderv1.ListOrdersResponse, error) {
	pageNum, pageSize := normalizePage(page)

	list, total, err := s.repo.ListOrders(ctx, uint64(userID), status, keyword, start, end, pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询订单失败", err)
	}

	orders := make([]*orderv1.Order, 0, len(list))
	for i := range list {
		orders = append(orders, orderToProto(&list[i]))
	}

	pendingPayment, _ := s.repo.CountByStatus(ctx, uint64(userID), StatusPendingPayment)
	pendingShipment, _ := s.repo.CountByStatus(ctx, uint64(userID), StatusPaid)
	pendingReceipt, _ := s.repo.CountByStatus(ctx, uint64(userID), StatusShipped)
	refunding, _ := s.repo.CountByStatus(ctx, uint64(userID), StatusRefunding)

	return &orderv1.ListOrdersResponse{
		Orders:               orders,
		Meta:                 buildMeta(pageNum, pageSize, total),
		PendingPaymentCount:  pendingPayment,
		PendingShipmentCount: pendingShipment,
		PendingReceiptCount:  pendingReceipt,
		RefundingCount:       refunding,
	}, nil
}

// GetOrderCount 查询各状态订单数量。
func (s *Service) GetOrderCount(ctx context.Context, userID int64) (*orderv1.OrderCountResponse, error) {
	pendingPayment, _ := s.repo.CountByStatus(ctx, uint64(userID), StatusPendingPayment)
	pendingShipment, _ := s.repo.CountByStatus(ctx, uint64(userID), StatusPaid)
	pendingReceipt, _ := s.repo.CountByStatus(ctx, uint64(userID), StatusShipped)
	refunding, _ := s.repo.CountByStatus(ctx, uint64(userID), StatusRefunding)
	return &orderv1.OrderCountResponse{
		PendingPayment:  pendingPayment,
		PendingShipment: pendingShipment,
		PendingReceipt:  pendingReceipt,
		Refunding:       refunding,
	}, nil
}

// ---------------------------------------------------------------------------
// 状态流转
// ---------------------------------------------------------------------------

// CancelOrder 取消订单。
func (s *Service) CancelOrder(ctx context.Context, orderID, userID int64, reason string) (*orderv1.Order, error) {
	order, err := s.repo.FindOrder(ctx, uint64(orderID))
	if err != nil {
		return nil, err
	}
	if userID > 0 && uint64(userID) != order.UserID {
		return nil, errs.New(errs.CodeForbidden, "无权操作该订单")
	}
	if order.Status != StatusPendingPayment {
		return nil, errs.New(errs.CodeOrderStatusInvalid, "只有待付款订单可以取消")
	}

	now := time.Now()
	if err := s.repo.UpdateOrderFields(ctx, order.ID, map[string]any{
		"status":       StatusCancelled,
		"cancelled_at": &now,
	}); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "取消订单失败", err)
	}
	_ = s.repo.AddStatusLog(ctx, &OrderStatusLog{
		OrderID: order.ID, FromStatus: order.Status, ToStatus: StatusCancelled,
		Action: "cancel", Operator: fmt.Sprintf("user:%d", userID), Remark: reason,
	})

	s.publishSimpleEvent(mq.EventOrderCancelled, order)

	updated, err := s.repo.FindOrder(ctx, order.ID)
	if err != nil {
		return nil, err
	}
	return orderToProto(updated), nil
}

// MarkPaid 标记订单已支付（由支付成功事件驱动）。
func (s *Service) MarkPaid(ctx context.Context, orderID int64, transactionID string) error {
	order, err := s.repo.FindOrder(ctx, uint64(orderID))
	if err != nil {
		return err
	}
	if order.Status != StatusPendingPayment {
		// 幂等：已支付的订单直接返回
		if order.Status == StatusPaid || order.Status == StatusShipped || order.Status == StatusCompleted {
			return nil
		}
		// 终态订单（已取消、已退款）收到迟到的支付成功事件属于业务上不可恢复的情况，
		// 记录后直接返回，不作为错误抛出。
		//
		// 为什么不能报错：这类事件经由消息队列重投，若持续报错会变成毒消息，
		// 无限重投并堵住队头，把后续正常事件全部饿死。
		if order.Status == StatusCancelled || order.Status == StatusRefunded {
			logger.L().Warn("订单处于终态，忽略迟到的支付成功事件",
				zap.Int64("订单ID", orderID),
				zap.Int("订单状态", int(order.Status)))
			return nil
		}
		return errs.New(errs.CodeOrderStatusInvalid, "订单状态不允许支付")
	}

	now := time.Now()
	if err := s.repo.UpdateOrderFields(ctx, order.ID, map[string]any{
		"status":     StatusPaid,
		"paid_cents": order.PayableCents,
		"paid_at":    &now,
	}); err != nil {
		return errs.Wrap(errs.CodeInternalError, "更新订单状态失败", err)
	}
	_ = s.repo.AddStatusLog(ctx, &OrderStatusLog{
		OrderID: order.ID, FromStatus: order.Status, ToStatus: StatusPaid,
		Action: "pay", Operator: "system", Remark: "支付成功，交易号 " + transactionID,
	})

	s.publishSimpleEvent(mq.EventOrderPaid, order)
	return nil
}

// MarkShipped 标记订单已发货。
func (s *Service) MarkShipped(ctx context.Context, orderID int64, shipmentID int64) error {
	order, err := s.repo.FindOrder(ctx, uint64(orderID))
	if err != nil {
		return err
	}
	if order.Status != StatusPaid {
		return errs.New(errs.CodeOrderStatusInvalid, "只有已付款订单可以发货")
	}
	now := time.Now()
	fields := map[string]any{
		"status":     StatusShipped,
		"shipped_at": &now,
	}
	if shipmentID > 0 {
		fields["shipment_id"] = uint64(shipmentID)
	}
	if err := s.repo.UpdateOrderFields(ctx, order.ID, fields); err != nil {
		return errs.Wrap(errs.CodeInternalError, "更新订单状态失败", err)
	}
	_ = s.repo.AddStatusLog(ctx, &OrderStatusLog{
		OrderID: order.ID, FromStatus: order.Status, ToStatus: StatusShipped,
		Action: "ship", Operator: "admin", Remark: "商品已发货",
	})
	return nil
}

// ConfirmReceipt 确认收货。
func (s *Service) ConfirmReceipt(ctx context.Context, orderID, userID int64) (*orderv1.Order, error) {
	order, err := s.repo.FindOrder(ctx, uint64(orderID))
	if err != nil {
		return nil, err
	}
	if userID > 0 && uint64(userID) != order.UserID {
		return nil, errs.New(errs.CodeForbidden, "无权操作该订单")
	}
	if order.Status != StatusShipped {
		return nil, errs.New(errs.CodeOrderStatusInvalid, "只有待收货订单可以确认收货")
	}

	now := time.Now()
	if err := s.repo.UpdateOrderFields(ctx, order.ID, map[string]any{
		"status":       StatusCompleted,
		"completed_at": &now,
	}); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "确认收货失败", err)
	}
	_ = s.repo.AddStatusLog(ctx, &OrderStatusLog{
		OrderID: order.ID, FromStatus: order.Status, ToStatus: StatusCompleted,
		Action: "confirm", Operator: fmt.Sprintf("user:%d", userID), Remark: "用户确认收货",
	})

	updated, err := s.repo.FindOrder(ctx, order.ID)
	if err != nil {
		return nil, err
	}
	return orderToProto(updated), nil
}

// ApplyRefund 申请退款。
func (s *Service) ApplyRefund(ctx context.Context, orderID, userID int64, itemIDs []int64, amount int64, reason, description string) (*orderv1.Refund, error) {
	order, err := s.repo.FindOrder(ctx, uint64(orderID))
	if err != nil {
		return nil, err
	}
	if userID > 0 && uint64(userID) != order.UserID {
		return nil, errs.New(errs.CodeForbidden, "无权操作该订单")
	}
	if order.Status != StatusPaid && order.Status != StatusShipped && order.Status != StatusCompleted {
		return nil, errs.New(errs.CodeOrderStatusInvalid, "当前订单状态不支持申请退款")
	}
	if strings.TrimSpace(reason) == "" {
		return nil, errs.Invalid("请选择退款原因")
	}
	if amount <= 0 || amount > order.PayableCents-order.RefundedCents {
		return nil, errs.Invalid("退款金额不合法")
	}

	ids := make([]string, 0, len(itemIDs))
	for _, id := range itemIDs {
		ids = append(ids, strconv.FormatInt(id, 10))
	}

	refund := &Refund{
		RefundNo:    generateRefundNo(time.Now()),
		OrderID:     order.ID,
		OrderNo:     order.OrderNo,
		UserID:      order.UserID,
		AmountCents: amount,
		Reason:      reason,
		Description: description,
		ItemIDs:     strings.Join(ids, ","),
		Status:      RefundPending,
	}
	if err := s.repo.CreateRefund(ctx, refund); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "创建退款单失败", err)
	}

	if err := s.repo.UpdateOrderFields(ctx, order.ID, map[string]any{"status": StatusRefunding}); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新订单状态失败", err)
	}
	_ = s.repo.AddStatusLog(ctx, &OrderStatusLog{
		OrderID: order.ID, FromStatus: order.Status, ToStatus: StatusRefunding,
		Action: "refund_apply", Operator: fmt.Sprintf("user:%d", userID),
		Remark: "申请退款：" + reason,
	})

	return refundToProto(refund), nil
}

// ListRefunds 分页查询退款单。
func (s *Service) ListRefunds(ctx context.Context, status int8, userID int64, keyword string, page *commonv1.PageRequest) (*orderv1.ListRefundsResponse, error) {
	pageNum, pageSize := normalizePage(page)
	list, total, err := s.repo.ListRefunds(ctx, status, uint64(userID), keyword, pageNum, pageSize)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询退款单失败", err)
	}
	out := make([]*orderv1.Refund, 0, len(list))
	for i := range list {
		out = append(out, refundToProto(&list[i]))
	}
	return &orderv1.ListRefundsResponse{Refunds: out, Meta: buildMeta(pageNum, pageSize, total)}, nil
}

// SetRefundStatus 审核退款单。
func (s *Service) SetRefundStatus(ctx context.Context, id int64, status int8, adminRemark string) (*orderv1.Refund, error) {
	refund, err := s.repo.FindRefund(ctx, uint64(id))
	if err != nil {
		return nil, err
	}
	if refund.Status != RefundPending {
		return nil, errs.New(errs.CodeOrderStatusInvalid, "该退款单已处理")
	}
	if status != RefundApproved && status != RefundRejected {
		return nil, errs.Invalid("非法的退款状态")
	}

	now := time.Now()
	fields := map[string]any{"status": status, "processed_at": &now}
	if adminRemark != "" {
		fields["admin_remark"] = adminRemark
	}
	if err := s.repo.UpdateRefundFields(ctx, refund.ID, fields); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新退款单失败", err)
	}

	order, oErr := s.repo.FindOrder(ctx, refund.OrderID)
	if oErr == nil {
		action := "refund_reject"
		remark := "退款申请被驳回"
		newStatus := order.Status
		if status == RefundApproved {
			action = "refund_approved"
			remark = "退款申请已通过"
			newStatus = StatusRefunded
		}
		_ = s.repo.UpdateOrderFields(ctx, order.ID, map[string]any{
			"status":         newStatus,
			"refunded_cents": order.RefundedCents + refund.AmountCents,
		})
		_ = s.repo.AddStatusLog(ctx, &OrderStatusLog{
			OrderID: order.ID, FromStatus: order.Status, ToStatus: newStatus,
			Action: action, Operator: "admin", Remark: remark,
		})
		if status == RefundApproved {
			s.publishSimpleEvent(mq.EventOrderRefunded, order)
		}
	}

	updated, err := s.repo.FindRefund(ctx, refund.ID)
	if err != nil {
		return nil, err
	}
	return refundToProto(updated), nil
}

// UpdateOrderRemark 更新订单备注。
func (s *Service) UpdateOrderRemark(ctx context.Context, orderID int64, remark string) (*orderv1.Order, error) {
	order, err := s.repo.FindOrder(ctx, uint64(orderID))
	if err != nil {
		return nil, err
	}
	if err := s.repo.UpdateOrderFields(ctx, order.ID, map[string]any{"admin_remark": remark}); err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "更新订单备注失败", err)
	}
	_ = s.repo.AddStatusLog(ctx, &OrderStatusLog{
		OrderID: order.ID, FromStatus: order.Status, ToStatus: order.Status,
		Action: "remark", Operator: "admin", Remark: remark,
	})
	updated, err := s.repo.FindOrder(ctx, order.ID)
	if err != nil {
		return nil, err
	}
	return orderToProto(updated), nil
}

// ListOrderLogs 查询订单状态流转日志。
func (s *Service) ListOrderLogs(ctx context.Context, orderID int64) (*orderv1.ListOrderLogsResponse, error) {
	logs, err := s.repo.StatusLogs(ctx, uint64(orderID))
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询订单日志失败", err)
	}
	out := make([]*orderv1.OrderStatusLog, 0, len(logs))
	for i := range logs {
		out = append(out, statusLogToProto(&logs[i]))
	}
	return &orderv1.ListOrderLogsResponse{Logs: out}, nil
}

// publishSimpleEvent 发布只含订单基础信息的事件。
func (s *Service) publishSimpleEvent(eventType string, order *Order) {
	if s.mq == nil {
		return
	}
	items, err := s.repo.OrderItems(context.Background(), order.ID)
	if err != nil {
		logger.L().Warn("读取订单商品失败，事件负载将缺少商品明细", zap.Error(err))
	}
	payloadItems := make([]map[string]any, 0, len(items))
	for i := range items {
		payloadItems = append(payloadItems, map[string]any{
			"sku_id":     items[i].SKUID,
			"product_id": items[i].ProductID,
			"quantity":   items[i].Quantity,
		})
	}
	s.mq.PublishAsync(mq.NewEvent(eventType, "order-service", "", map[string]any{
		"order_id": int64(order.ID),
		"order_no": order.OrderNo,
		"user_id":  int64(order.UserID),
		"amount":   order.PayableCents,
		"items":    payloadItems,
		"status":   int32(order.Status),
	}))
}

// ---------------------------------------------------------------------------
// 经营统计
// ---------------------------------------------------------------------------

// AdminOrderStats 订单侧经营统计。
func (s *Service) AdminOrderStats(ctx context.Context, days int32) (*orderv1.AdminOrderStatsResponse, error) {
	if days <= 0 {
		days = 30
	}
	since := time.Now().AddDate(0, 0, -int(days))
	todayStart := time.Now().Truncate(24 * time.Hour)

	counts, err := s.repo.CountsByStatus(ctx, since)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计订单失败", err)
	}
	revenue, err := s.repo.RevenueSum(ctx, since)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计成交额失败", err)
	}
	todayRevenue, err := s.repo.RevenueSum(ctx, todayStart)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计今日成交额失败", err)
	}
	todayCount, _ := s.repo.CountByStatus(ctx, 0, 0)

	trend, err := s.repo.DailyTrend(ctx, since)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计趋势失败", err)
	}
	categoryStats, err := s.repo.CategorySales(ctx, since)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计分类销售失败", err)
	}
	topProducts, err := s.repo.TopProducts(ctx, since, 10)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "统计热销商品失败", err)
	}

	resp := &orderv1.AdminOrderStatsResponse{
		TotalOrders:       counts[StatusPendingPayment] + counts[StatusPaid] + counts[StatusShipped] + counts[StatusCompleted] + counts[StatusCancelled] + counts[StatusRefunding] + counts[StatusRefunded] + counts[StatusClosed],
		PaidOrders:        counts[StatusPaid] + counts[StatusShipped] + counts[StatusCompleted],
		PendingPayment:    counts[StatusPendingPayment],
		PendingShipment:   counts[StatusPaid],
		PendingReceipt:    counts[StatusShipped],
		Refunding:         counts[StatusRefunding],
		Cancelled:         counts[StatusCancelled],
		Completed:         counts[StatusCompleted],
		TotalRevenueCents: revenue,
		TodayRevenueCents: todayRevenue,
		TodayOrders:       todayCount,
		Trend:             make([]*orderv1.OrderTrendPoint, 0, len(trend)),
		CategoryStats:     make([]*orderv1.OrderCategoryStat, 0, len(categoryStats)),
		TopProducts:       make([]*orderv1.OrderTopProduct, 0, len(topProducts)),
	}
	for _, t := range trend {
		resp.Trend = append(resp.Trend, &orderv1.OrderTrendPoint{
			Date: t.Date, OrderCount: t.OrderCount, RevenueCents: t.RevenueCents,
		})
	}
	for _, c := range categoryStats {
		resp.CategoryStats = append(resp.CategoryStats, &orderv1.OrderCategoryStat{
			CategoryId: int64(c.CategoryID), CategoryName: c.CategoryName,
			SalesCount: c.SalesCount, RevenueCents: c.RevenueCents,
		})
	}
	for _, p := range topProducts {
		resp.TopProducts = append(resp.TopProducts, &orderv1.OrderTopProduct{
			ProductId: int64(p.ProductID), Title: p.Title, Cover: p.Cover,
			SalesCount: p.SalesCount, RevenueCents: p.RevenueCents,
		})
	}
	return resp, nil
}

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

// generateOrderNo 生成订单号：yyyyMMddHHmmss + 6 位随机数。
func generateOrderNo(t time.Time) string {
	return t.Format("20060102150405") + randomDigits(6)
}

// generateRefundNo 生成退款单号。
func generateRefundNo(t time.Time) string {
	return "R" + t.Format("20060102150405") + randomDigits(4)
}

// randInt 返回 [0, n) 区间内的随机整数。
func randInt(n int) int {
	if n <= 0 {
		return 0
	}
	return rand.Intn(n)
}

func randomDigits(n int) string {
	const digits = "0123456789"
	buf := make([]byte, n)
	for i := range buf {
		buf[i] = digits[randInt(len(digits))]
	}
	return string(buf)
}

func formatAddress(a *commonv1.Address) string {
	if a == nil {
		return ""
	}
	parts := []string{a.GetProvince(), a.GetCity(), a.GetDistrict(), a.GetDetail()}
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p != "" {
			out = append(out, p)
		}
	}
	return strings.Join(out, " ")
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

var _ = timestamppb.New
