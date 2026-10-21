import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/address_draft.dart';
import '../../providers/user_provider.dart';
import '../../widgets/demo_banner.dart';

/// 地址新增 / 编辑页。
class AddressEditPage extends ConsumerStatefulWidget {
  const AddressEditPage({super.key, this.address});

  final AddressDraft? address;

  @override
  ConsumerState<AddressEditPage> createState() => _AddressEditPageState();
}

class _AddressEditPageState extends ConsumerState<AddressEditPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _receiverController;
  late final TextEditingController _phoneController;
  late final TextEditingController _provinceController;
  late final TextEditingController _cityController;
  late final TextEditingController _districtController;
  late final TextEditingController _detailController;
  late final TextEditingController _postalCodeController;
  String _tag = '家';
  bool _isDefault = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final draft = widget.address;
    _receiverController = TextEditingController(text: draft?.receiver ?? '');
    _phoneController = TextEditingController(text: draft?.phone ?? '');
    _provinceController = TextEditingController(text: draft?.province ?? '');
    _cityController = TextEditingController(text: draft?.city ?? '');
    _districtController = TextEditingController(text: draft?.district ?? '');
    _detailController = TextEditingController(text: draft?.detail ?? '');
    _postalCodeController = TextEditingController(text: draft?.postalCode ?? '');
    _tag = (draft?.tag.isNotEmpty ?? false) ? draft!.tag : '家';
    _isDefault = draft?.isDefault ?? false;
  }

  @override
  void dispose() {
    _receiverController.dispose();
    _phoneController.dispose();
    _provinceController.dispose();
    _cityController.dispose();
    _districtController.dispose();
    _detailController.dispose();
    _postalCodeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.address?.isEdit ?? false;
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? '编辑地址' : '新增地址')),
      body: Column(
        children: [
          const DemoBanner(),
          Expanded(
            child: Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                children: [
                  _field(_receiverController, '收货人', '请输入收货人姓名'),
                  _field(_phoneController, '手机号', '请输入手机号',
                      keyboard: TextInputType.phone),
                  _field(_provinceController, '省份', '如：浙江省'),
                  _field(_cityController, '城市', '如：杭州市'),
                  _field(_districtController, '区/县', '如：西湖区'),
                  _field(_detailController, '详细地址', '街道、门牌号等',
                      maxLines: 2),
                  _field(_postalCodeController, '邮编', '选填'),
                  const SizedBox(height: 8),
                  const Text(
                    '地址标签',
                    style: TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      for (final tag in const ['家', '公司', '其他'])
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(tag),
                            selected: _tag == tag,
                            onSelected: (_) => setState(() => _tag = tag),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SwitchListTile(
                    value: _isDefault,
                    onChanged: (value) => setState(() => _isDefault = value),
                    title: const Text('设为默认地址',
                        style: TextStyle(fontSize: 14)),
                    contentPadding: EdgeInsets.zero,
                    activeThumbColor: AppTheme.brand,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor:
                                  AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Text('保存'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label,
    String hint, {
    TextInputType? keyboard,
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboard,
        maxLines: maxLines,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
        ),
        validator: (value) {
          final text = value?.trim() ?? '';
          if (text.isEmpty) return '请填写$label';
          if (label == '手机号' && text.length < 6) return '手机号格式不正确';
          return null;
        },
      ),
    );
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    await ref.read(userActionsProvider).saveAddress(
          id: widget.address?.id ?? 0,
          receiver: _receiverController.text.trim(),
          phone: _phoneController.text.trim(),
          province: _provinceController.text.trim(),
          city: _cityController.text.trim(),
          district: _districtController.text.trim(),
          detail: _detailController.text.trim(),
          postalCode: _postalCodeController.text.trim(),
          tag: _tag,
          isDefault: _isDefault,
        );
    if (!mounted) return;
    setState(() => _saving = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(widget.address?.isEdit ?? false ? '地址已更新' : '地址已添加')),
    );
    context.pop();
  }
}
