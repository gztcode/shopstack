/// 地址编辑草稿（用于路由参数传递）。
class AddressDraft {
  const AddressDraft({
    this.id = 0,
    this.receiver = '',
    this.phone = '',
    this.province = '',
    this.city = '',
    this.district = '',
    this.detail = '',
    this.postalCode = '',
    this.tag = '',
    this.isDefault = false,
  });

  final int id;
  final String receiver;
  final String phone;
  final String province;
  final String city;
  final String district;
  final String detail;
  final String postalCode;
  final String tag;
  final bool isDefault;

  bool get isEdit => id > 0;
}
