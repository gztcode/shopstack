import '../utils/enums.dart';
import '../utils/json_util.dart';

/// 物流单，对应 shopstack.logistics.v1.Shipment。
class Shipment {
  const Shipment({
    this.id = 0,
    this.orderId = 0,
    this.orderNo = '',
    this.trackingNo = '',
    this.company = '',
    this.companyCode = '',
    this.status = ShipmentStatus.pending,
    this.receiver = '',
    this.phone = '',
    this.address = '',
    this.freightCents = 0,
    this.itemCount = 0,
    this.shippedAt = '',
    this.deliveredAt = '',
    this.createdAt = '',
    this.remark = '',
  });

  final int id;
  final int orderId;
  final String orderNo;
  final String trackingNo;
  final String company;
  final String companyCode;
  final ShipmentStatus status;
  final String receiver;
  final String phone;
  final String address;
  final int freightCents;
  final int itemCount;
  final String shippedAt;
  final String deliveredAt;
  final String createdAt;
  final String remark;

  factory Shipment.fromJson(Map<String, dynamic> json) => Shipment(
        id: JsonUtil.intOf(json, 'id'),
        orderId:
            JsonUtil.intOf(json, 'order_id', JsonUtil.intOf(json, 'orderId')),
        orderNo: JsonUtil.stringOf(json, 'order_no',
            JsonUtil.stringOf(json, 'orderNo')),
        trackingNo: JsonUtil.stringOf(json, 'tracking_no',
            JsonUtil.stringOf(json, 'trackingNo')),
        company: JsonUtil.stringOf(json, 'company'),
        companyCode: JsonUtil.stringOf(json, 'company_code',
            JsonUtil.stringOf(json, 'companyCode')),
        status: parseEnumValue<ShipmentStatus>(
          json['status'],
          ShipmentStatus.values,
          (v) => v.wire,
          (v) => enumKey(v.name),
        ),
        receiver: JsonUtil.stringOf(json, 'receiver'),
        phone: JsonUtil.stringOf(json, 'phone'),
        address: JsonUtil.stringOf(json, 'address'),
        freightCents: JsonUtil.intOf(json, 'freight_cents',
            JsonUtil.intOf(json, 'freightCents')),
        itemCount: JsonUtil.intOf(json, 'item_count',
            JsonUtil.intOf(json, 'itemCount')),
        shippedAt: JsonUtil.stringOf(json, 'shipped_at',
            JsonUtil.stringOf(json, 'shippedAt')),
        deliveredAt: JsonUtil.stringOf(json, 'delivered_at',
            JsonUtil.stringOf(json, 'deliveredAt')),
        createdAt: JsonUtil.stringOf(json, 'created_at',
            JsonUtil.stringOf(json, 'createdAt')),
        remark: JsonUtil.stringOf(json, 'remark'),
      );
}

/// 物流轨迹，对应 shopstack.logistics.v1.ShipmentTrack。
class ShipmentTrack {
  const ShipmentTrack({
    this.id = 0,
    this.shipmentId = 0,
    this.trackingNo = '',
    this.location = '',
    this.description = '',
    this.occurredAt = '',
    this.sort = 0,
  });

  final int id;
  final int shipmentId;
  final String trackingNo;
  final String location;
  final String description;
  final String occurredAt;
  final int sort;

  factory ShipmentTrack.fromJson(Map<String, dynamic> json) => ShipmentTrack(
        id: JsonUtil.intOf(json, 'id'),
        shipmentId: JsonUtil.intOf(json, 'shipment_id',
            JsonUtil.intOf(json, 'shipmentId')),
        trackingNo: JsonUtil.stringOf(json, 'tracking_no',
            JsonUtil.stringOf(json, 'trackingNo')),
        location: JsonUtil.stringOf(json, 'location'),
        description: JsonUtil.stringOf(json, 'description'),
        occurredAt: JsonUtil.stringOf(json, 'occurred_at',
            JsonUtil.stringOf(json, 'occurredAt')),
        sort: JsonUtil.intOf(json, 'sort'),
      );
}

/// 物流查询结果，对应 shopstack.logistics.v1.ListShipmentTracksResponse。
class LogisticsResult {
  const LogisticsResult({
    this.shipment,
    this.tracks = const <ShipmentTrack>[],
  });

  final Shipment? shipment;
  final List<ShipmentTrack> tracks;

  factory LogisticsResult.fromJson(Map<String, dynamic> json) => LogisticsResult(
        shipment: json['shipment'] == null
            ? null
            : Shipment.fromJson(JsonUtil.asMap(json['shipment'])),
        tracks:
            JsonUtil.asMapList(json['tracks']).map(ShipmentTrack.fromJson).toList(),
      );
}
