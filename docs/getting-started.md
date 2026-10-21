# 启动指南

本文按「从零到跑通」的顺序写，覆盖环境准备、启动、验证、常见问题排查。

## 目录

- [环境要求](#环境要求)
- [第一步：中间件](#第一步中间件)
- [第二步：后端服务](#第二步后端服务)
- [第三步：验证](#第三步验证)
- [第四步：前端](#第四步前端)
- [常用命令](#常用命令)
- [配置说明](#配置说明)
- [常见问题排查](#常见问题排查)
- [生产部署](#生产部署)

---

## 环境要求

| 依赖 | 版本 | 必需 | 说明 |
| --- | --- | --- | --- |
| Go | 1.25+ | ✅ | 后端 |
| Node.js | 20+ | ✅ | 前端构建、设计令牌生成 |
| Docker | 任意 | 建议 | MySQL / Redis / RabbitMQ |
| MySQL | 8.0 | ✅ | 首次启动自动建表灌种子 |
| Redis | 7+ | ✅ | 缓存、分布式锁、验证码 |
| RabbitMQ | 3.13+ | ✅ | 事件总线 |
| Flutter | 3.24+ | 可选 | 移动端 |
| 微信开发者工具 | 最新版 | 可选 | 小程序 |

Go 依赖走 `goproxy.cn`（国内网络更稳）：

```bash
export GOPROXY=https://goproxy.cn,direct
export GOFLAGS=-mod=mod
```

Protobuf 工具链（首次准备）：

```bash
# 安装 buf
go install github.com/bufbuild/buf/cmd/buf@v1.47.2

# 安装 Go 插件
go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.36.5
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1
go install github.golang.org/grpc/cmd/protoc-gen-grpc-gateway@v2.27.1

export PATH="$HOME/go/bin:$PATH"
```

---

## 第一步：中间件

### 方式 A：Docker Compose（推荐）

```bash
cd shopstack
docker compose -f deploy/docker-compose.yml up -d mysql redis rabbitmq nacos
docker compose -f deploy/docker-compose.yml ps
```

等健康检查全部 `healthy` 再继续。Nacos 是可选的，只做服务发现；不启动也能跑（服务发现降级为静态地址）。

> **Apple Silicon 注意**：`nacos/nacos-server:2.3.2` 及更早版本没有 `linux/arm64` 镜像，M 系列芯片上拉不下来。compose 里已固定为 **v2.4.3**（支持 arm64）。如果你的机器是 x86，也可以用 2.3.2，但需要先改 `deploy/docker-compose.yml` 里的 `image`。
>
> Nacos 镜像较大，首次拉取会比较久。如果完全不需要服务发现，直接跳过它即可：
> ```bash
> docker compose -f deploy/docker-compose.yml up -d mysql redis rabbitmq
> ```

### 验证 Nacos 是否工作

```bash
# 查看已注册实例
curl "http://127.0.0.1:8848/nacos/v1/ns/instance/list?serviceName=user-service&groupName=DEFAULT_GROUP&namespaceId=public"
```

服务启动日志里出现「实例已注册到 Nacos」即成功。网关日志里出现「Nacos 服务发现失败，回退静态地址」说明 Nacos 没连上——此时系统仍能正常工作（自动回退到配置里的静态地址），只是没走服务发现。

### 方式 B：单独起容器（开发机常用）

```bash
cd shopstack

docker run -d --name shopstack-mysql \
  -e MYSQL_ROOT_PASSWORD=root123456 \
  -e MYSQL_DATABASE=shopstack \
  -e MYSQL_USER=shopstack -e MYSQL_PASSWORD=shopstack \
  -p 3306:3306 \
  -v "$PWD/deploy/mysql/init:/docker-entrypoint-initdb.d:ro" \
  mysql:8.0 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

docker run -d --name shopstack-redis -p 6379:6379 redis:7-alpine

docker run -d --name shopstack-rabbit -p 5672:5672 -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=shopstack -e RABBITMQ_DEFAULT_PASS=shopstack \
  rabbitmq:3.13-management-alpine
```

> **MySQL 初始化脚本只在数据卷为空时执行一次。** 改了 `deploy/mysql/init/*.sql` 想重新灌数据，必须先删卷重建：
> ```bash
> docker rm -f shopstack-mysql && docker volume prune -f
> ```
> 或手动重灌：
> ```bash
> docker exec -i shopstack-mysql mysql -uroot -proot123456 shopstack < deploy/mysql/init/01-schema.sql
> docker exec -i shopstack-mysql mysql -uroot -proot123456 shopstack < deploy/mysql/init/02-seed.sql
> ```

### 连接信息

| 组件 | 地址 | 账号 | 密码 |
| --- | --- | --- | --- |
| MySQL | `127.0.0.1:3306` | `shopstack` / `root` | `shopstack` / `root123456` |
| Redis | `127.0.0.1:6379` | 无 | 无 |
| RabbitMQ | `127.0.0.1:5672` | `shopstack` | `shopstack` |
| RabbitMQ 控制台 | http://127.0.0.1:15672 | `shopstack` | `shopstack` |
| Nacos | `127.0.0.1:8848` | 无 | 无 |

---

## 第二步：后端服务

### 方式 A：Docker Compose

```bash
cd shopstack
docker compose -f deploy/docker-compose.yml up -d --build
```

首次会构建 10 个镜像（9 服务 + 网关），`Dockerfile` 是多阶段的，构建参数 `--build-arg SERVICE=xxx` 决定编哪个入口。

### 方式 B：本地跑二进制

```bash
cd shopstack
./scripts/dev-up.sh
```

脚本会：

1. 把 9 个服务 + 网关编译到 `/tmp/shopstack-bin/`
2. 依次在 9001-9009 启动，日志写 `/tmp/shopstack-logs/<name>.log`
3. 网关监听 8080

停止：`./scripts/dev-down.sh`

### 方式 C：手动跑单个服务

```bash
cd shopstack/backend   # 必须在 backend 目录，否则找不到 configs/*.yaml

export SHOP_MYSQL_PORT=3306
export SHOP_REDIS_ADDR=127.0.0.1:6379
export SHOP_RABBITMQ_URL=amqp://shopstack:shopstack@127.0.0.1:5672/
export SHOP_LOG_LEVEL=info

SHOP_GRPC_ADDR=":9001" SHOP_SERVICE_NAME="user-service" go run ./cmd/user-service
```

> ⚠️ **必须在 `backend/` 目录下启动**，否则运行时读不到 `configs/*.yaml`。也可以用 `SHOP_CONFIG=/abs/path/to.yaml` 显式指定。

### 服务端口

| 服务 | 端口 | 服务 | 端口 |
| --- | --- | --- | --- |
| user-service | 9001 | inventory-service | 9006 |
| product-service | 9002 | marketing-service | 9007 |
| cart-service | 9003 | logistics-service | 9008 |
| order-service | 9004 | notification-service | 9009 |
| payment-service | 9005 | **api-gateway** | **8080** |

---

## 第三步：验证

```bash
# 1. 进程存活
curl http://127.0.0.1:8080/healthz

# 2. 下游全部就绪（会列出 9 个服务的连接状态）
curl http://127.0.0.1:8080/readyz
```

`/readyz` 期望输出：

```json
{
  "ready": true,
  "services": {
    "user": "IDLE", "product": "IDLE", "cart": "IDLE", "order": "IDLE",
    "payment": "IDLE", "inventory": "IDLE", "marketing": "IDLE",
    "logistics": "IDLE", "notification": "IDLE"
  }
}
```

### 冒烟测试

```bash
cd shopstack

# gRPC 直连（14 项）
go run ./backend/cmd/smoketest --mode=grpc

# 完整购买链路（经网关，12 项）
go run ./backend/cmd/smoketest --mode=flow --gateway=http://127.0.0.1:8080

# 全接口巡检（经网关，210 项，覆盖全部 203 个接口）
go run ./backend/cmd/smoketest --mode=ext --gateway=http://127.0.0.1:8080
```

`--mode=flow` 走：登录 → 查商品 → 选 SKU → 加购 → 下单 → 创建支付单 → 轮询支付 → 校验订单变已付款 → 校验购物车清空。

`--mode=ext` 逐个巡检所有读接口与写接口，任意一个接口的路由、鉴权或下游有问题都会立刻报出来；
同时校验「库存内部接口必须被网关拒绝」这条安全规则。

判定分三档：业务码 0 记 ✅ 通过；业务码在用例声明的 `allowCodes` 白名单内（业务规则主动拦截，
如「今日已签到」）记 ⚠️ 警告；其余业务码记 ❌ 失败。巡检覆盖 proto 声明的全部 203 个 HTTP 路由，
写用例使用每次运行专属的唯一值，因此可重复执行。

> 巡检一轮约 200 次请求，网关按 IP 限流每分钟 600 次。连续跑多轮时会自动等待限流窗口重置后继续。

### 手工验证一条业务

```bash
# 登录拿令牌
TOKEN=$(curl -s -X POST http://127.0.0.1:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"demo123456"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['access_token'])")

# 查商品
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:8080/api/v1/products?page.page=1&page.page_size=3" | python3 -m json.tool
```

---

## 第四步：前端

### Web 用户端（Vue3）

```bash
cd apps/web-vue
npm install
npm run dev        # 默认 http://localhost:5173
```

Vite 代理把 `/api` 转到 `http://localhost:8080`。后端不在 8080 时：

```bash
# .env.local
VITE_GATEWAY_URL=http://127.0.0.1:8090
```

### Web 后台管理（React）

```bash
cd apps/admin-react
npm install
npm run dev        # 默认 http://localhost:5174
```

```bash
# .env.local
VITE_API_BASE_URL=http://127.0.0.1:8090
```

演示账号：`admin` / `admin123456`。

### 微信小程序

1. 打开微信开发者工具 → 导入项目 → 目录选 `apps/miniapp`
2. AppID 填自己的（用测试号也行）
3. `utils/request.js` 里把 baseURL 改成实际网关地址
4. 详情 → 本地设置 → 勾选「不校验合法域名」（开发期）

### Flutter

```bash
cd apps/flutter
flutter pub get
flutter run
```

API 地址在 `lib/core/constants/` 里配，可用 `--dart-define` 覆盖：

```bash
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:8090
```

---

## 常用命令

```bash
# 重新生成 proto 代码
cd proto && buf dep update && buf lint && buf generate

# 重新生成设计令牌（改了 tokens.json 之后）
node design-tokens/build.mjs

# 重新生成 API 文档（改了 proto 之后）
node scripts/gen-api-docs.mjs

# 后端编译 + 静态检查
go build ./backend/... && go vet ./backend/...

# 全部前端构建
cd apps/web-vue && npm run build
cd apps/admin-react && npm run build
cd apps/flutter && flutter build web

# 停掉本地进程
./scripts/dev-down.sh

# 清空所有容器与数据
docker compose -f deploy/docker-compose.yml down -v
```

---

## 配置说明

配置优先级：**环境变量 > YAML 文件 > 默认值**。

`backend/configs/<service>.yaml` 是基础配置，容器里用 `SHOP_` 前缀的环境变量覆盖。常用环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SHOP_MYSQL_HOST` | `127.0.0.1` | MySQL 主机 |
| `SHOP_MYSQL_PORT` | `3306` | MySQL 端口 |
| `SHOP_MYSQL_USER` / `SHOP_MYSQL_PASSWORD` | `shopstack` | MySQL 账号 |
| `SHOP_MYSQL_DATABASE` | `shopstack` | 库名 |
| `SHOP_REDIS_ADDR` | `127.0.0.1:6379` | Redis 地址 |
| `SHOP_RABBITMQ_URL` | `amqp://shopstack:shopstack@127.0.0.1:5672/` | MQ 地址 |
| `SHOP_NACOS_ENABLED` | `false` | 是否启用 Nacos |
| `SHOP_NACOS_ADDR` | `127.0.0.1:8848` | Nacos 地址 |
| `SHOP_GRPC_ADDR` | `:900X` | gRPC 监听地址 |
| `SHOP_HTTP_ADDR` | `:8080` | 网关监听地址 |
| `SHOP_JWT_SECRET` | `shopstack-dev-secret-change-me` | 用户令牌密钥 |
| `SHOP_ADMIN_JWT_SECRET` | `shopstack-dev-admin-secret-change-me` | 管理员令牌密钥 |
| `SHOP_LOG_LEVEL` | `info` | 日志级别 |

### 第三方服务（不配置也能跑）

| 变量 | 作用 | 不配置时 |
| --- | --- | --- |
| `SHOP_WECHAT_APP_ID` / `SHOP_WECHAT_APP_SECRET` | 微信登录 | Mock：由 code 派生稳定 openid |
| `SHOP_WECHAT_MCH_ID` / `SHOP_WECHAT_API_KEY` / `SHOP_WECHAT_NOTIFY_URL` | 微信支付 | Mock：自动结算成功 |
| `SHOP_SMS_PROVIDER` / `SHOP_SMS_ACCESS_KEY` / `SHOP_SMS_SECRET` / `SHOP_SMS_SIGN_NAME` | 短信通道 | Mock：验证码直接返回 |
| `SHOP_OSS_PROVIDER` / `SHOP_OSS_ENDPOINT` / `SHOP_OSS_BUCKET` / `SHOP_OSS_ACCESS_KEY` / `SHOP_OSS_SECRET_KEY` | 对象存储 | Mock：返回占位图 URL |

---

## 常见问题排查

### 后端启动报找不到配置文件

```
failed to read config: open configs/user-service.yaml: no such file or directory
```

**必须在 `backend/` 目录下启动**，或设置 `SHOP_CONFIG` 指向 yaml 的绝对路径。

### 端口 8080 被占用

本机可能有其它服务（如 `books-api`）占着 8080。**不要 kill 无关进程**，换个端口即可：

```bash
cd backend
SHOP_HTTP_ADDR=":8090" SHOP_SERVICE_NAME="gateway" go run ./cmd/gateway
```

前端同步改代理目标（`VITE_API_BASE_URL` / `VITE_GATEWAY_URL`）。项目默认值仍保持 8080。

### `/readyz` 某个服务不是 IDLE

说明该服务没起来或连不上。依次检查：

1. 服务进程是否存活：`ps aux | grep shopstack-bin`
2. 服务日志：`tail -50 /tmp/shopstack-logs/<name>.log`
3. 中间件是否可达（MySQL/Redis/RabbitMQ 容器是否 running）

### MySQL 中文乱码

初始化脚本必须带 `SET NAMES utf8mb4;`。若已经建过库，重灌：

```bash
docker exec -i shopstack-mysql mysql -uroot -proot123456 shopstack < deploy/mysql/init/01-schema.sql
docker exec -i shopstack-mysql mysql -uroot -proot123456 shopstack < deploy/mysql/init/02-seed.sql
```

### 网关返回 401

- 确认带了 `Authorization: Bearer <token>`
- 确认令牌没过期（有效期见 `backend/configs/gateway.yaml`）
- 后台接口要用 `/api/v1/admin/auth/login` 拿的令牌（管理员密钥与用户密钥不同）
- 公开路径只有 `/api/v1/auth/*`、`/api/v1/admin/auth/login`、`/healthz`、`/readyz`

### 库存扣减失败 / 库存不足

`inventory` 表 `available` 为 0。种子数据有 22 条库存记录，重灌种子可恢复。

### MQ 事件没到下游

- 确认 RabbitMQ 容器 healthy
- 确认**每类事件一个独立队列**（共享队列会轮询投递，导致事件被别的服务消费掉）
- 看消费方日志：`/tmp/shopstack-logs/notification.log` 等

### 前端一直显示「演示数据模式」

说明后端没连通或接口报错。检查浏览器 Network 面板里的响应体——后端返回的 `message` 字段会直接说明原因。前端不会因为后端挂掉而白屏，这是刻意设计。

---

## 生产部署

```bash
cd shopstack

# 1. 改掉默认密钥
#    编辑 deploy/docker-compose.yml 的 SHOP_JWT_SECRET / SHOP_ADMIN_JWT_SECRET

# 2. 构建并启动
docker compose -f deploy/docker-compose.yml up -d --build

# 3. 验证
curl http://127.0.0.1:8080/readyz
```

生产环境建议：

- 用 `deploy/nginx/` 的配置做反向代理，TLS 终结在 Nginx
- MySQL / Redis / RabbitMQ 不对外暴露端口，只在 `shopstack` 内部网络可达
- 用环境变量注入密钥，不要写进 compose 文件
- 后端服务只暴露 gRPC 端口，网关是唯一对外入口
- MySQL 定时备份 `shopstack` 库
