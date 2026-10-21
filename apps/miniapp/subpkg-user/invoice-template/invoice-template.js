/**
 * 发票抬头模板
 * ---------------------------------------------------------------
 * 接口：GET    /api/v1/users/invoice-templates
 *       POST   /api/v1/users/invoice-templates
 *       DELETE /api/v1/users/invoice-templates/{id}
 */
const api = require('../../utils/api');

Page({
  data: {
    loading: true,
    saving: false,
    templates: [],
    /** 是否处于新增 / 编辑表单 */
    editing: false,
    editId: 0,
    title: '',
    taxNo: '',
    email: '',
    type: 'company',
  },

  onShow() {
    this.loadTemplates();
  },

  /**
   * 加载抬头模板。
   */
  loadTemplates() {
    this.setData({ loading: true });
    api
      .listInvoiceTemplates()
      .then((data) => {
        this.setData({ loading: false, templates: (data && data.templates) || [] });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '抬头模板加载失败', icon: 'none' });
      });
  },

  /**
   * 打开新增表单。
   */
  onAdd() {
    this.setData({
      editing: true,
      editId: 0,
      title: '',
      taxNo: '',
      email: '',
      type: 'company',
    });
  },

  /**
   * 打开编辑表单。
   */
  onEdit(e) {
    const id = Number(e.currentTarget.dataset.id);
    const item = this.data.templates.filter((tpl) => tpl.id === id)[0];
    if (!item) {
      return;
    }
    this.setData({
      editing: true,
      editId: item.id,
      title: item.title,
      taxNo: item.tax_no,
      email: item.email,
      type: item.type,
    });
  },

  /**
   * 关闭表单。
   */
  onCancel() {
    this.setData({ editing: false });
  },

  /**
   * 输入抬头名称。
   */
  onInputTitle(e) {
    this.setData({ title: e.detail.value });
  },

  /**
   * 输入税号。
   */
  onInputTaxNo(e) {
    this.setData({ taxNo: e.detail.value });
  },

  /**
   * 输入邮箱。
   */
  onInputEmail(e) {
    this.setData({ email: e.detail.value });
  },

  /**
   * 切换抬头类型。
   */
  onTypeTap(e) {
    this.setData({ type: e.currentTarget.dataset.type });
  },

  /**
   * 保存抬头模板。
   */
  onSave() {
    if (this.data.saving) {
      return;
    }
    if (!this.data.title.trim()) {
      wx.showToast({ title: '请填写抬头名称', icon: 'none' });
      return;
    }
    if (this.data.type === 'company' && !this.data.taxNo.trim()) {
      wx.showToast({ title: '企业抬头需要填写税号', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    api
      .saveInvoiceTemplate({
        id: this.data.editId || undefined,
        title: this.data.title.trim(),
        tax_no: this.data.taxNo.trim(),
        email: this.data.email.trim(),
        type: this.data.type,
        is_default: false,
      })
      .then(() => {
        this.setData({ saving: false, editing: false });
        wx.showToast({ title: '保存成功', icon: 'success' });
        this.loadTemplates();
      })
      .catch((error) => {
        this.setData({ saving: false });
        wx.showToast({ title: (error && error.message) || '保存失败', icon: 'none' });
      });
  },

  /**
   * 删除抬头模板。
   */
  onDelete(e) {
    const id = Number(e.currentTarget.dataset.id);
    wx.showModal({
      title: '删除抬头',
      content: '确定删除该发票抬头模板吗？',
      confirmColor: '#F04438',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        api
          .deleteInvoiceTemplate(id)
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'none' });
            this.loadTemplates();
          })
          .catch((error) => {
            wx.showToast({ title: (error && error.message) || '删除失败', icon: 'none' });
          });
      },
    });
  },
});
