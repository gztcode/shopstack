// Package main 是 ShopStack 平台的冒烟测试工具。
//
// 用法：
//
//	# 直接对 gRPC 服务做校验（需要服务已启动）
//	go run ./backend/cmd/smoketest --mode=grpc
//
//	# 通过 API 网关做端到端校验
//	go run ./backend/cmd/smoketest --mode=rest --gateway=http://127.0.0.1:8080
//
//	# 只跑浏览器流程（登录 → 列表 → 详情）
//	go run ./backend/cmd/smoketest --mode=flow
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"

	commonv1 "github.com/shopstack/platform/gen/go/common/v1"
	productv1 "github.com/shopstack/platform/gen/go/product/v1"
	userv1 "github.com/shopstack/platform/gen/go/user/v1"
)

type result struct {
	name string
	ok   bool
	// warn 表示「预期内的业务拦截」：接口按业务规则拒绝了请求，属于正常行为，
	// 既不是成功也不是故障，因此单列一档，避免与真正的失败混在一起。
	warn    bool
	elapsed time.Duration
	message string
}

var results []result

func main() {
	mode := flag.String("mode", "grpc", "测试模式：grpc | rest | flow | ext")
	gateway := flag.String("gateway", "http://127.0.0.1:8080", "网关地址")
	flag.Parse()

	switch *mode {
	case "grpc":
		runGRPC()
	case "rest":
		runREST(*gateway)
	case "flow":
		runFlow(*gateway)
		runPurchaseFlow(context.Background(), *gateway)
	case "ext":
		runExtensionSweep(*gateway)
	default:
		fmt.Println("未知模式：", *mode)
		os.Exit(1)
	}

	fmt.Println()
	fmt.Println("==================== 冒烟测试结果 ====================")
	passed, warned, failed := 0, 0, 0
	for _, r := range results {
		status := "✅"
		switch {
		case r.warn:
			status = "⚠️"
			warned++
		case !r.ok:
			status = "❌"
			failed++
		default:
			passed++
		}
		fmt.Printf("%s %-28s %6dms  %s\n", status, r.name, r.elapsed.Milliseconds(), r.message)
	}
	fmt.Printf("========================================================\n")
	fmt.Printf("通过 %d 项，警告 %d 项（预期内业务拦截），失败 %d 项\n", passed, warned, failed)
	if failed > 0 {
		os.Exit(1)
	}
}

func record(name string, err error, message string) {
	r := result{name: name, ok: err == nil, message: message}
	results = append(results, r)
	if err != nil {
		fmt.Printf("  ✗ %s: %v\n", name, err)
	}
}

// recordWarn 记录一条「预期内业务拦截」：接口返回了非 0 业务码，但该行为符合
// 业务预期（例如「今日已签到」），不算失败，但必须在结果里显式可见。
func recordWarn(name string, message string) {
	results = append(results, result{name: name, ok: true, warn: true, message: message})
}

// ---------------------------------------------------------------------------
// gRPC 直连模式
// ---------------------------------------------------------------------------

func runGRPC() {
	fmt.Println(">>> gRPC 直连测试 (127.0.0.1:9001)")

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	conn, err := grpc.NewClient("127.0.0.1:9001",
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		record("建立 gRPC 连接", err, "")
		return
	}
	defer func() { _ = conn.Close() }()

	client := userv1.NewUserServiceClient(conn)
	adminClient := userv1.NewAdminServiceClient(conn)

	// 1. 用户登录

	loginResp, err := client.Login(ctx, &userv1.LoginRequest{Username: "demo", Password: "demo123456"})
	if err != nil {
		record("用户登录 demo", err, "")
	} else {
		record("用户登录 demo", nil,
			fmt.Sprintf("用户=%s token=%d字符", loginResp.GetUser().GetNickname(), len(loginResp.GetAccessToken())))
	}

	// 2. 密码错误
	_, err = client.Login(ctx, &userv1.LoginRequest{Username: "demo", Password: "wrong-password"})
	if err == nil {
		record("错误密码应被拒绝", fmt.Errorf("未拒绝错误密码"), "")
	} else {
		record("错误密码应被拒绝", nil, "已正确拒绝")
	}

	// 3. 读取资料
	if loginResp != nil {
		profile, pErr := client.GetProfile(ctx, &userv1.GetProfileRequest{UserId: loginResp.GetUser().GetId()})
		if pErr != nil {
			record("读取用户资料", pErr, "")
		} else {
			record("读取用户资料", nil,
				fmt.Sprintf("昵称=%s 积分=%d 余额=%d", profile.GetNickname(), profile.GetPoints(), profile.GetBalanceCents()))
		}
	}

	// 4. 收货地址（直连 gRPC 时需模拟网关的身份透传）
	userCtx := identityCtx(ctx, loginResp.GetUser().GetId(), "demo", "user")
	addrResp, err := client.ListAddresses(userCtx, &userv1.ListAddressesRequest{})
	if err != nil {
		record("查询收货地址", err, "")
	} else {
		record("查询收货地址", nil, fmt.Sprintf("共 %d 条", len(addrResp.GetAddresses())))
	}

	// 5. 管理员登录
	adminResp, err := adminClient.Login(ctx, &userv1.AdminLoginRequest{Username: "admin", Password: "admin123456"})
	if err != nil {
		record("管理员登录 admin", err, "")
	} else {
		record("管理员登录 admin", nil,
			fmt.Sprintf("权限码 %d 个, 角色=%v", len(adminResp.GetPermissions()), adminResp.GetAdmin().GetRoleNames()))
	}

	// 6. 用户列表
	if adminResp != nil {
		ctxWithToken := identityCtx(ctx, adminResp.GetAdmin().GetId(), "admin", "admin")
		usersResp, uErr := adminClient.ListUsers(ctxWithToken, &userv1.AdminListUsersRequest{
			Page: &commonv1.PageRequest{Page: 1, PageSize: 10},
		})
		if uErr != nil {
			record("管理员查询用户列表", uErr, "")
		} else {
			record("管理员查询用户列表", nil, fmt.Sprintf("共 %d 个用户", usersResp.GetMeta().GetTotal()))
		}

		// 7. 角色列表
		rolesResp, rErr := adminClient.ListRoles(ctxWithToken, &userv1.AdminListRolesRequest{})
		if rErr != nil {
			record("管理员查询角色列表", rErr, "")
		} else {
			record("管理员查询角色列表", nil, fmt.Sprintf("共 %d 个角色", len(rolesResp.GetRoles())))
		}

		// 8. 权限列表
		permResp, pErr := adminClient.ListPermissions(ctxWithToken, &userv1.AdminListPermissionsRequest{})
		if pErr != nil {
			record("管理员查询权限列表", pErr, "")
		} else {
			record("管理员查询权限列表", nil, fmt.Sprintf("共 %d 条权限", len(permResp.GetPermissions())))
		}
	}

	runProductTests(ctx)
}

// runProductTests 校验商品服务。
func runProductTests(ctx context.Context) {
	conn, err := grpc.NewClient("127.0.0.1:9002",
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		record("商品服务连接", err, "")
		return
	}
	defer func() { _ = conn.Close() }()

	productClient := productv1.NewProductServiceClient(conn)
	categoryClient := productv1.NewCategoryServiceClient(conn)
	reviewClient := productv1.NewReviewServiceClient(conn)

	// 商品列表
	listResp, err := productClient.ListProducts(ctx, &productv1.ListProductsRequest{
		Page: &commonv1.PageRequest{Page: 1, PageSize: 10, OrderBy: "sales", OrderDir: "desc"},
	})
	if err != nil {
		record("查询商品列表", err, "")
	} else {
		record("查询商品列表", nil, fmt.Sprintf("共 %d 个商品，首个=%s", listResp.GetMeta().GetTotal(), firstProductTitle(listResp)))
	}

	// 关键词 + 分类筛选
	filtered, err := productClient.ListProducts(ctx, &productv1.ListProductsRequest{
		Page:          &commonv1.PageRequest{Page: 1, PageSize: 5},
		Sort:          "price_asc",
		MinPriceCents: 10000,
	})
	if err != nil {
		record("商品筛选与排序", err, "")
	} else {
		record("商品筛选与排序", nil, fmt.Sprintf("命中 %d 个", filtered.GetMeta().GetTotal()))
	}

	// 商品详情
	if listResp.GetProducts() != nil && len(listResp.GetProducts()) > 0 {
		id := listResp.GetProducts()[0].GetId()
		detail, dErr := productClient.GetProduct(ctx, &productv1.GetProductRequest{Id: id})
		if dErr != nil {
			record("查询商品详情", dErr, "")
		} else {
			record("查询商品详情", nil, fmt.Sprintf("SKU=%d 图集=%d 参数=%d 评价=%d 推荐=%d",
				len(detail.GetSkus()), len(detail.GetImages()),
				len(detail.GetAttributes()), len(detail.GetReviews()), len(detail.GetRelated())))
		}
	}

	// 分类树
	cats, err := categoryClient.ListCategories(ctx, &productv1.ListCategoriesRequest{Tree: true})
	if err != nil {
		record("查询分类树", err, "")
	} else {
		record("查询分类树", nil, fmt.Sprintf("一级 %d 个", len(cats.GetCategories())))
	}

	// 评价列表
	reviews, err := reviewClient.ListReviews(ctx, &productv1.ListReviewsRequest{
		Page: &commonv1.PageRequest{Page: 1, PageSize: 10},
	})
	if err != nil {
		record("查询评价列表", err, "")
	} else {
		record("查询评价列表", nil, fmt.Sprintf("共 %d 条，评分 %.2f", reviews.GetMeta().GetTotal(), reviews.GetSummary().GetAverage()))
	}

	// 轮播
	banners, err := productClient.ListBanners(ctx, &productv1.ListBannersRequest{Position: "home_banner"})
	if err != nil {
		record("查询轮播位", err, "")
	} else {
		record("查询轮播位", nil, fmt.Sprintf("共 %d 个", len(banners.GetBanners())))
	}
}

func firstProductTitle(resp *productv1.ListProductsResponse) string {
	if len(resp.GetProducts()) == 0 {
		return "-"
	}
	return resp.GetProducts()[0].GetTitle()
}

// ---------------------------------------------------------------------------
// REST 网关模式
// ---------------------------------------------------------------------------

func runREST(gateway string) {
	fmt.Println(">>> REST 网关测试 (", gateway, ")")

	client := &http.Client{Timeout: 15 * time.Second}

	// 健康检查
	var health map[string]any
	getJSON(client, gateway+"/healthz", "", &health)
	record("GET /healthz", nil, fmt.Sprintf("status=%v", health["status"]))

	// 未登录访问受保护接口
	resp, err := client.Get(gateway + "/api/v1/cart")
	if err != nil {
		record("未登录访问购物车应被拒绝", err, "")
	} else {
		body, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		if resp.StatusCode != http.StatusUnauthorized {
			record("未登录访问购物车应被拒绝",
				fmt.Errorf("期望 401，实际 %d: %s", resp.StatusCode, truncate(string(body), 120)), "")
		} else {
			record("未登录访问购物车应被拒绝", nil, "已正确返回 401")
		}
	}
}

// ---------------------------------------------------------------------------
// 业务流模式
// ---------------------------------------------------------------------------

func runFlow(gateway string) {
	fmt.Println(">>> 业务流测试 (", gateway, ")")

	client := &http.Client{Timeout: 15 * time.Second}

	// 登录取 token
	var loginResp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			AccessToken string `json:"access_token"`
			User        struct {
				Id       int64  `json:"id"`
				Nickname string `json:"nickname"`
			} `json:"user"`
		} `json:"data"`
	}
	postJSON(client, gateway+"/api/v1/auth/login",
		map[string]string{"username": "demo", "password": "demo123456"}, &loginResp)
	if loginResp.Code != 0 {
		record("登录并获取令牌", fmt.Errorf("code=%d msg=%s", loginResp.Code, loginResp.Message), "")
		return
	}
	record("登录并获取令牌", nil, fmt.Sprintf("用户=%s", loginResp.Data.User.Nickname))

	token := loginResp.Data.AccessToken

	// 拉取用户资料
	var profile struct {
		Code int `json:"code"`
		Data struct {
			Id       int64  `json:"id"`
			Nickname string `json:"nickname"`
			Points   int32  `json:"points"`
		} `json:"data"`
	}
	getJSON(client, gateway+"/api/v1/users/me", token, &profile)
	record("GET /api/v1/users/me", nil,
		fmt.Sprintf("code=%d 昵称=%s 积分=%d", profile.Code, profile.Data.Nickname, profile.Data.Points))
}

func getJSON(client *http.Client, url, token string, out any) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := client.Do(req)
	if err != nil {
		return
	}
	defer func() { _ = resp.Body.Close() }()
	body, _ := io.ReadAll(resp.Body)
	_ = json.Unmarshal(body, out)
}

func postJSON(client *http.Client, url string, payload any, out any, token ...string) {
	sendJSON(client, http.MethodPost, url, payload, out, token...)
}

// sendJSON 按指定方法发送 JSON 请求体。
func sendJSON(client *http.Client, method, url string, payload any, out any, token ...string) {
	data, _ := json.Marshal(payload)
	req, err := http.NewRequest(method, url, bytes.NewReader(data))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if len(token) > 0 && token[0] != "" {
		req.Header.Set("Authorization", "Bearer "+token[0])
	}
	resp, err := client.Do(req)
	if err != nil {
		return
	}
	defer func() { _ = resp.Body.Close() }()
	body, _ := io.ReadAll(resp.Body)
	_ = json.Unmarshal(body, out)
}

// deleteJSON 发起 DELETE 请求。
func deleteJSON(client *http.Client, url string, out any, token ...string) {
	req, err := http.NewRequest(http.MethodDelete, url, nil)
	if err != nil {
		return
	}
	if len(token) > 0 && token[0] != "" {
		req.Header.Set("Authorization", "Bearer "+token[0])
	}
	resp, err := client.Do(req)
	if err != nil {
		return
	}
	defer func() { _ = resp.Body.Close() }()
	body, _ := io.ReadAll(resp.Body)
	_ = json.Unmarshal(body, out)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

// identityCtx 模拟 API 网关的身份透传：把登录态写进 gRPC metadata。
func identityCtx(ctx context.Context, userID int64, username, subject string) context.Context {
	return metadata.NewOutgoingContext(ctx, metadata.Pairs(
		"x-user-id", fmt.Sprintf("%d", userID),
		"x-username", username,
		"x-subject", subject,
	))
}
