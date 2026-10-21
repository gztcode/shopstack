/**
 * 管理员资料弹窗
 */
import { useEffect } from 'react'
import { Form, Input, Modal } from 'antd'
import { updateAdminProfile } from '@/api/admin'
import { useAuthStore } from '@/store/auth'
import { validateForm } from '@/utils/form'
import type { UpdateAdminProfileRequest } from '@/types'
import { useMessage } from '@/hooks/useMessage'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

/** 个人信息弹窗 */
export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const message = useMessage()
  const [form] = Form.useForm<UpdateAdminProfileRequest>()
  const admin = useAuthStore((state) => state.admin)
  const setAdmin = useAuthStore((state) => state.setAdmin)

  useEffect(() => {
    if (open && admin) {
      form.setFieldsValue({
        admin_id: admin.id,
        real_name: admin.real_name,
        email: admin.email,
        phone: admin.phone,
      })
    }
  }, [open, admin, form])

  const handleOk = async () => {
    const values = await validateForm(form)
    if (values === null) return
    try {
      const result = await updateAdminProfile({ ...values, admin_id: admin?.id ?? 0 })
      setAdmin({ ...(admin as NonNullable<typeof admin>), ...result })
      message.success('个人信息已更新')
      onClose()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    }
  }

  return (
    <Modal
      title="个人信息"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item label="登录账号">
          <Input value={admin?.username} disabled />
        </Form.Item>
        <Form.Item label="角色">
          <Input value={admin?.role_names?.join('、') || '—'} disabled />
        </Form.Item>
        <Form.Item
          label="姓名"
          name="real_name"
          rules={[{ required: true, message: '请输入姓名' }, { max: 32, message: '最多 32 个字符' }]}
        >
          <Input placeholder="请输入姓名" />
        </Form.Item>
        <Form.Item
          label="邮箱"
          name="email"
          rules={[{ type: 'email', message: '邮箱格式不正确' }]}
        >
          <Input placeholder="请输入邮箱" />
        </Form.Item>
        <Form.Item
          label="手机号"
          name="phone"
          rules={[{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }]}
        >
          <Input placeholder="请输入手机号" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
