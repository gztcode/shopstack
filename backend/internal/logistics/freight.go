package logistics

import (
	"context"
	"strconv"
	"strings"

	logisticsv1 "github.com/shopstack/platform/gen/go/logistics/v1"

	"github.com/shopstack/platform/backend/internal/errs"
)

// 默认运费规则：没有可用的运费模板时兜底，与结算域的默认规则保持一致。
const (
	defaultFreightCents           = 1000
	defaultFreeFreightAmountCents = 9900
)

// allRegionsKeyword 表示适用于所有地区的配置。
const allRegionsKeyword = "全国"

// majorRegions 是快递大区名称集合。
var majorRegions = map[string]bool{
	"华北":  true,
	"东北":  true,
	"华东":  true,
	"华中":  true,
	"华南":  true,
	"西南":  true,
	"西北":  true,
	"港澳台": true,
	"海外":  true,
}

// provinceRegions 是省份到快递大区的映射，用于按大区配置配送范围时匹配地区。
var provinceRegions = map[string]string{
	"北京": "华北", "天津": "华北", "河北": "华北", "山西": "华北", "内蒙古": "华北",
	"辽宁": "东北", "吉林": "东北", "黑龙江": "东北",
	"上海": "华东", "江苏": "华东", "浙江": "华东", "安徽": "华东",
	"福建": "华东", "江西": "华东", "山东": "华东",
	"河南": "华中", "湖北": "华中", "湖南": "华中",
	"广东": "华南", "广西": "华南", "海南": "华南",
	"重庆": "西南", "四川": "西南", "贵州": "西南", "云南": "西南", "西藏": "西南",
	"陕西": "西北", "甘肃": "西北", "青海": "西北", "宁夏": "西北", "新疆": "西北",
	"香港": "港澳台", "澳门": "港澳台", "台湾": "港澳台",
}

// provinceRegionsAlias 是带行政区后缀的省份别名。
var provinceRegionsAlias = map[string]string{
	"北京市": "华北", "天津市": "华北", "河北省": "华北", "山西省": "华北", "内蒙古自治区": "华北",
	"辽宁省": "东北", "吉林省": "东北", "黑龙江省": "东北",
	"上海市": "华东", "江苏省": "华东", "浙江省": "华东", "安徽省": "华东",
	"福建省": "华东", "江西省": "华东", "山东省": "华东",
	"河南省": "华中", "湖北省": "华中", "湖南省": "华中",
	"广东省": "华南", "广西壮族自治区": "华南", "海南省": "华南",
	"重庆市": "西南", "四川省": "西南", "贵州省": "西南", "云南省": "西南", "西藏自治区": "西南",
	"陕西省": "西北", "甘肃省": "西北", "青海省": "西北", "宁夏回族自治区": "西北", "新疆维吾尔自治区": "西北",
	"香港特别行政区": "港澳台", "澳门特别行政区": "港澳台", "台湾省": "港澳台",
}

// CalculateFreight 运费试算。
//
// 规则：
//  1. 模板：指定 template_id 时使用该模板，否则取排序最靠前的启用模板；
//     没有启用模板时使用默认运费规则（满 9900 分免运费，否则 1000 分）。
//  2. 配送范围：优先使用命中收货地区的配送范围配置（运费与免邮门槛），
//     没有命中时回退到模板自身的运费与免邮门槛。
//  3. 件数：首件按基础运费计费，续件按同价追加，因此运费 = 基础运费 × 件数。
//  4. 免邮：免邮门槛大于 0 且商品金额达到门槛时免运费；基础运费为 0 时同样免运费。
func (s *Service) CalculateFreight(ctx context.Context, req *logisticsv1.CalculateFreightRequest) (*logisticsv1.CalculateFreightResponse, error) {
	if req.GetAmountCents() < 0 {
		return nil, errs.New(errs.CodeInvalidParam, "商品金额不能为负数")
	}
	quantity := int(req.GetQuantity())
	if quantity < 0 {
		return nil, errs.New(errs.CodeInvalidParam, "商品件数不能为负数")
	}
	if quantity == 0 {
		quantity = 1
	}

	template, err := s.resolveFreightTemplate(ctx, req.GetTemplateId())
	if err != nil {
		return nil, err
	}
	if template == nil {
		return defaultFreightQuote(req.GetAmountCents(), quantity), nil
	}

	baseFreight := template.FreightCents
	freeThreshold := template.FreeFreightAmountCents
	remark := "使用运费模板「" + template.Name + "」"

	ranges, err := s.repo.ListEnabledDeliveryRanges(ctx, template.ID)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询配送范围失败", err)
	}
	for i := range ranges {
		if !matchRegions(ranges[i].Regions, req.GetRegion()) {
			continue
		}
		baseFreight = ranges[i].FreightCents
		freeThreshold = ranges[i].FreeFreightAmountCents
		remark += "，命中配送范围「" + ranges[i].Regions + "」"
		break
	}

	if quantity > 1 {
		remark += "，基础运费 " + formatInt64(baseFreight) + " 分 × " + strconv.Itoa(quantity) + " 件"
	} else {
		remark += "，基础运费 " + formatInt64(baseFreight) + " 分"
	}

	freight := baseFreight * int64(quantity)
	free := false
	switch {
	case freeThreshold > 0 && req.GetAmountCents() >= freeThreshold:
		freight = 0
		free = true
		remark += "，商品金额达到免邮门槛 " + formatInt64(freeThreshold) + " 分，免运费"
	case baseFreight == 0:
		free = true
		remark += "，该地区免运费"
	}

	return &logisticsv1.CalculateFreightResponse{
		FreightCents:           freight,
		FreeFreightAmountCents: freeThreshold,
		Free:                   free,
		TemplateName:           template.Name,
		Remark:                 remark,
	}, nil
}

// resolveFreightTemplate 解析运费试算使用的模板。
//
// 返回 nil 表示没有可用的启用模板，调用方按默认规则兜底。
func (s *Service) resolveFreightTemplate(ctx context.Context, templateID int64) (*LogisticTemplate, error) {
	if templateID > 0 {
		template, err := s.repo.FindTemplateByID(ctx, uint64(templateID))
		if err != nil {
			return nil, err
		}
		if !template.Enabled {
			return nil, errs.New(errs.CodeInvalidParam, "运费模板已停用")
		}
		return template, nil
	}
	templates, err := s.repo.ListEnabledTemplates(ctx)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternalError, "查询运费模板失败", err)
	}
	if len(templates) == 0 {
		return nil, nil
	}
	return &templates[0], nil
}

// defaultFreightQuote 没有启用模板时的默认运费试算结果。
func defaultFreightQuote(amountCents int64, quantity int) *logisticsv1.CalculateFreightResponse {
	freight := int64(defaultFreightCents) * int64(quantity)
	remark := "未配置启用的运费模板，使用默认运费规则"
	free := false
	if amountCents >= defaultFreeFreightAmountCents {
		freight = 0
		free = true
		remark += "，商品金额达到默认免邮门槛 " + formatInt64(defaultFreeFreightAmountCents) + " 分，免运费"
	}
	return &logisticsv1.CalculateFreightResponse{
		FreightCents:           freight,
		FreeFreightAmountCents: defaultFreeFreightAmountCents,
		Free:                   free,
		Remark:                 remark,
	}
}

// matchRegions 判断配送范围配置是否命中请求的收货地区。
//
// 命中规则：
//   - 配置为「全国」时命中任意地区；
//   - 配置与请求地名单词完全一致时命中；
//   - 配置是大区、请求是省份（或反之）时按快递大区归属命中。
func matchRegions(scope, request string) bool {
	scopeTokens := splitRegions(scope)
	requestTokens := splitRegions(request)
	if len(scopeTokens) == 0 || len(requestTokens) == 0 {
		return false
	}
	for _, s := range scopeTokens {
		if s == allRegionsKeyword || s == "全部" {
			return true
		}
		for _, r := range requestTokens {
			if s == r {
				return true
			}
			regionS, okS := lookupRegion(s)
			regionR, okR := lookupRegion(r)
			if okS && okR && regionS == regionR {
				return true
			}
		}
	}
	return false
}

// splitRegions 把地区字符串拆分成词元，支持中英文逗号、分号、顿号、斜杠与空格分隔。
func splitRegions(value string) []string {
	replacer := strings.NewReplacer(",", " ", "，", " ", ";", " ", "；", " ", "、", " ", "/", " ", "|", " ")
	fields := strings.Fields(replacer.Replace(value))
	out := make([]string, 0, len(fields))
	for _, f := range fields {
		f = strings.TrimSpace(f)
		if f == "" {
			continue
		}
		out = append(out, f)
	}
	return out
}

// lookupRegion 返回地区词元所属的快递大区。
//
// 省份按后缀归一化（「浙江省」视为「浙江」），大区名称返回自身。
func lookupRegion(token string) (string, bool) {
	token = strings.TrimSpace(token)
	if token == "" {
		return "", false
	}
	if region, ok := provinceRegions[token]; ok {
		return region, true
	}
	if region, ok := provinceRegionsAlias[token]; ok {
		return region, true
	}
	if majorRegions[token] {
		return token, true
	}
	for _, suffix := range []string{"特别行政区", "自治区", "省", "市"} {
		if !strings.HasSuffix(token, suffix) || len(token) <= len(suffix) {
			continue
		}
		base := strings.TrimSuffix(token, suffix)
		if region, ok := provinceRegions[base]; ok {
			return region, true
		}
		if majorRegions[base] {
			return base, true
		}
	}
	return "", false
}
