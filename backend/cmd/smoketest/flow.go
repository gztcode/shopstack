package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	cartv1 "github.com/shopstack/platform/gen/go/cart/v1"
	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	orderv1 "github.com/shopstack/platform/gen/go/order/v1"
	paymentv1 "github.com/shopstack/platform/gen/go/payment/v1"
	productv1 "github.com/shopstack/platform/gen/go/product/v1"
)

// runPurchaseFlow 走通「浏览 → 加购 → 下单 → 支付 → 查订单」的完整链路。
func runPurchaseFlow(ctx context.Context, gateway string) {
	fmt.Println(">>> 完整购买流程测试 (", gateway, ")")

	client := &http.Client{Timeout: 20 * time.Second}

	// 1. 登录
	var login struct {
		Code int    `json:"code"`
		Msg  string `json:"message"`
		Data struct {
			AccessToken string `json:"access_token"`
			User        struct {
				Id int64 `json:"id"`
			} `json:"user"`
		} `json:"data"`
	}
	postJSON(client, gateway+"/api/v1/auth/login",
		map[string]string{"username": "demo", "password": "demo123456"}, &login)
	if login.Code != 0 {
		record("登录", fmt.Errorf("code=%d msg=%s", login.Code, login.Msg), "")
		return
	}
	token := login.Data.AccessToken
	record("登录 demo 用户", nil, fmt.Sprintf("用户ID=%d", login.Data.User.Id))

	// 2. 拉取商品列表，挑一个可售商品
	var listResp struct {
		Code int `json:"code"`
		Data struct {
			Products []struct {
				Id            int64  `json:"id"`
				Title         string `json:"title"`
				MinPriceCents int64  `json:"min_price_cents"`
				StockTotal    int32  `json:"stock_total"`
			} `json:"products"`
		} `json:"data"`
	}
	getJSON(client, gateway+"/api/v1/products?page.page=1&page.page_size=5", "", &listResp)
	if listResp.Code != 0 || len(listResp.Data.Products) == 0 {
		record("查询商品列表", fmt.Errorf("code=%d", listResp.Code), "")
		return
	}
	record("查询商品列表", nil, fmt.Sprintf("取到 %d 个商品", len(listResp.Data.Products)))

	// 3. 查商品详情，拿一个可用 SKU
	productID := listResp.Data.Products[0].Id
	var detail struct {
		Code int `json:"code"`
		Data struct {
			Product struct {
				Title string `json:"title"`
			} `json:"product"`
			Skus []struct {
				Id         int64 `json:"id"`
				PriceCents int64 `json:"price_cents"`
				Stock      int32 `json:"stock"`
				Enabled    bool  `json:"enabled"`
			} `json:"skus"`
		} `json:"data"`
	}
	getJSON(client, fmt.Sprintf("%s/api/v1/products/%d", gateway, productID), "", &detail)
	var skuID int64
	var price int64
	for _, sku := range detail.Data.Skus {
		if sku.Enabled && sku.Stock > 0 {
			skuID = sku.Id
			price = sku.PriceCents
			break
		}
	}
	if skuID == 0 {
		record("挑选可售 SKU", fmt.Errorf("没有可用 SKU"), "")
		return
	}
	record("商品详情", nil, fmt.Sprintf("商品=%s SKU=%d 单价=%.2f 元", detail.Data.Product.Title, skuID, float64(price)/100))

	// 4. 加入购物车
	var addResp struct {
		Code int    `json:"code"`
		Msg  string `json:"message"`
		Data struct {
			Items []struct {
				Id       int64 `json:"id"`
				SkuId    int64 `json:"sku_id"`
				Quantity int32 `json:"quantity"`
			} `json:"items"`
			SelectedAmountCents int64 `json:"selected_amount_cents"`
		} `json:"data"`
	}
	postJSON(client, gateway+"/api/v1/cart/items", map[string]any{
		"product_id": productID, "sku_id": skuID, "quantity": 2, "selected": true,
	}, &addResp, token)
	if addResp.Code != 0 {
		record("加入购物车", fmt.Errorf("code=%d msg=%s", addResp.Code, addResp.Msg), "")
		return
	}
	var cartItemID int64
	for _, item := range addResp.Data.Items {
		if item.SkuId == skuID {
			cartItemID = item.Id
		}
	}
	record("加入购物车", nil, fmt.Sprintf("条目ID=%d 选中金额=%.2f 元", cartItemID, float64(addResp.Data.SelectedAmountCents)/100))

	// 5. 结算下单
	var createResp struct {
		Code int    `json:"code"`
		Msg  string `json:"message"`
		Data struct {
			Id           int64  `json:"id"`
			OrderNo      string `json:"order_no"`
			PayableCents int64  `json:"payable_cents"`
			Status       string `json:"status"`
		} `json:"data"`
	}
	postJSON(client, gateway+"/api/v1/orders", map[string]any{
		"from_cart": true, "cart_item_ids": []int64{cartItemID}, "payment_method": "wechat",
	}, &createResp, token)
	if createResp.Code != 0 {
		record("提交订单", fmt.Errorf("code=%d msg=%s", createResp.Code, createResp.Msg), "")
		return
	}
	record("提交订单", nil, fmt.Sprintf("订单号=%s 应付=%.2f 元 状态=%s",
		createResp.Data.OrderNo, float64(createResp.Data.PayableCents)/100, createResp.Data.Status))

	// 6. 创建支付单
	var payResp struct {
		Code int    `json:"code"`
		Msg  string `json:"message"`
		Data struct {
			Id        int64             `json:"id"`
			PaymentNo string            `json:"payment_no"`
			Status    string            `json:"status"`
			PayParams map[string]string `json:"pay_params"`
		} `json:"data"`
	}
	postJSON(client, gateway+"/api/v1/payments", map[string]any{
		"order_id": createResp.Data.Id, "channel": 1,
	}, &payResp, token)
	if payResp.Code != 0 {
		record("创建支付单", fmt.Errorf("code=%d msg=%s", payResp.Code, payResp.Msg), "")
	} else {
		record("创建支付单", nil, fmt.Sprintf("支付单号=%s 状态=%s", payResp.Data.PaymentNo, payResp.Data.Status))
	}

	// 7. 轮询支付结果（Mock 通道会自动结算）
	var finalStatus string
	for i := 0; i < 10; i++ {
		time.Sleep(600 * time.Millisecond)
		var q struct {
			Code int `json:"code"`
			Data struct {
				Status string `json:"status"`
			} `json:"data"`
		}
		getJSON(client, fmt.Sprintf("%s/api/v1/payments/query?order_id=%d", gateway, createResp.Data.Id), token, &q)
		finalStatus = q.Data.Status
		if finalStatus == "PAYMENT_STATUS_SUCCESS" {
			break
		}
	}
	record("支付状态轮询", nil, "最终状态="+finalStatus)

	// 8. 订单状态应变为已付款
	time.Sleep(800 * time.Millisecond)
	var orderResp struct {
		Code int `json:"code"`
		Data struct {
			Order struct {
				OrderNo   string `json:"order_no"`
				Status    string `json:"status"`
				PaidCents int64  `json:"paid_cents"`
				ItemCount int32  `json:"item_count"`
			} `json:"order"`
			Logs []struct {
				Action string `json:"action"`
				Remark string `json:"remark"`
			} `json:"logs"`
		} `json:"data"`
	}
	getJSON(client, fmt.Sprintf("%s/api/v1/orders/%d", gateway, createResp.Data.Id), token, &orderResp)
	logDesc := ""
	for _, l := range orderResp.Data.Logs {
		logDesc += l.Action + " "
	}
	record("订单状态流转", nil, fmt.Sprintf("状态=%s 已付=%.2f 元 轨迹=[%s]",
		orderResp.Data.Order.Status, float64(orderResp.Data.Order.PaidCents)/100, logDesc))

	if orderResp.Data.Order.Status != "ORDER_STATUS_PAID" {
		record("订单应变为已付款", fmt.Errorf("实际状态=%s", orderResp.Data.Order.Status), "")
	} else {
		record("订单应变为已付款", nil, "已付款")
	}

	// 9. 购物车应已清空对应条目
	var cartResp struct {
		Code int `json:"code"`
		Data struct {
			Items []struct {
				Id int64 `json:"id"`
			} `json:"items"`
		} `json:"data"`
	}
	getJSON(client, gateway+"/api/v1/cart", token, &cartResp)
	record("购物车清理", nil, fmt.Sprintf("剩余 %d 个条目", len(cartResp.Data.Items)))
}

// postJSONWithToken 发送带令牌的 POST 请求。
func postJSONWithToken(client *http.Client, url string, payload any, out any, token string) {
	postJSON(client, url, payload, out, token)
}

var _ = json.Marshal
var _ = io.ReadAll
var _ = commonv1.PageRequest{}
var _ = cartv1.Cart{}
var _ = orderv1.Order{}
var _ = paymentv1.Payment{}
var _ = productv1.Product{}
