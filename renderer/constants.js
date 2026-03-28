// 用途：集中存放前端共享常量、模板和格式化工具。
export const TMPL = {
  FromItem: {
    SysId: 1,
    ItemKey: '',
    ItemName: '',
    ItemUrl: '',
    ItemPrice: 0,
    PromotionPrice: 0,
    CouponPrice: null,
    ItemPicUrl: '',
    SortId: 0,
    SortName: '',
    SortPath: '',
    Province: '',
    ProvinceName: '',
    City: '',
    CityName: '',
    Nums: 0,
    FreeShipping: 0,
    OuterCode: null,
    Barcode: null,
    Sellpoint: null,
    Weight: null,
    Size: null,
    IsReturn: null,
    IsTicket: null,
    IsRepair: null,
    SubStock: null,
    OnSell: 1,
    ArticleNumber: null,
    QualificationCode: null,
    IndustrialCode: null,
    SellerAccount: null,
    IsConsign: null,
    SellNums: 0,
    ShortTitle: null,
    SellingPoint: null,
    ItemRemark: null,
    Details: null,
    PurchaseLimit: null,
    LimitCount: 0,
    WhiteBaseImageUrl: null,
    TransparentImageUrl: null,
    RefundRule: null,
    MainVideoUrl: null,
  },
  FromContent: { PcDesc: '' },
  FromPics: [],
  FromProperties: [],
  FromSkus: [],
}

export const FG = [
  {
    name: '商品基础',
    fields: [
      { key: 'ItemName', label: '商品标题' },
      { key: 'ShortTitle', label: '短标题' },
      { key: 'ItemUrl', label: '商品链接' },
      { key: 'ItemKey', label: '商品 ID' },
      { key: 'ItemPicUrl', label: '主图链接' },
      { key: 'MainVideoUrl', label: '主图视频' },
    ],
  },
  {
    name: '价格与库存',
    fields: [
      { key: 'ItemPrice', label: '价格' },
      { key: 'PromotionPrice', label: '促销价' },
      { key: 'CouponPrice', label: '券后价' },
      { key: 'Nums', label: '总库存' },
      { key: 'LimitCount', label: '限购数量' },
      { key: 'PurchaseLimit', label: '限购说明' },
    ],
  },
  {
    name: '分类信息',
    fields: [
      { key: 'SortId', label: '类目 ID' },
      { key: 'SortName', label: '类目名称' },
      { key: 'SortPath', label: '类目路径' },
    ],
  },
  {
    name: '发货地',
    fields: [
      { key: 'Province', label: '省份代码' },
      { key: 'ProvinceName', label: '省份名称' },
      { key: 'City', label: '城市代码' },
      { key: 'CityName', label: '城市名称' },
    ],
  },
]

export const NUMS = new Set([
  'SysId',
  'ItemPrice',
  'PromotionPrice',
  'CouponPrice',
  'SortId',
  'Nums',
  'FreeShipping',
  'OnSell',
  'SellNums',
  'LimitCount',
])

export const CFG_DEFAULTS = {
  cos_secret_id: '',
  cos_secret_key: '',
  cos_bucket: '',
  cos_region: 'ap-guangzhou',
  cos_prefix: '',
  ai_base_url: 'https://api.openai.com/v1',
  ai_api_key: '',
  ai_model: 'gpt-3.5-turbo',
  ai_temperature: 0.9,
  ai_max_tokens: 2048,
}

export const COS_REGIONS = [
  'ap-guangzhou',
  'ap-shanghai',
  'ap-beijing',
  'ap-chengdu',
  'ap-nanjing',
  'ap-hongkong',
  'ap-singapore',
]

export const PROXY_IMAGE_HOST_KEYWORDS = [
  'alicdn.com',
  'tbcdn.cn',
  'taobaocdn.com',
  '1688pic.com',
]

export const COS_HOST_KEYWORDS = [
  'myqcloud.com',
]

export const DETAIL_WRAPPER_START = '<div style="width:750px;margin:0 auto;">'
export const DETAIL_WRAPPER_END = '</div>'

export function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

export function formatBytes(size) {
  const value = Number(size) || 0
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}
