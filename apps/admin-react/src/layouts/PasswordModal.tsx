/**
 * 修改密码弹窗
 */
import { useState } from 'react'
import { Form, Input, Modal } from 'antd'
import { changePassword } from '@/api/admin'
import { validateForm } from '@/utils/form'
import { useMessage } from '@/hooks/useMessage'

interface PasswordModalProps {
  open: boolean
  onClose: () => void
}

interface PasswordFormValues {
  old_password: string
  new_password: string
  confirm_password: string
}

/** 修改密码弹窗 */
export default function PasswordModal({ open, onClose }: PasswordModalProps) {
  const message = useMessage()
  const [form] = Form.useForm<PasswordFormValues>()
  const [submitting, setSubmitting] = useState(false)

  const handleOk = async () => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      await changePassword({ old_password: values.old_password, new_password: values.new_password })
      message.success('密码修改成功，请牢记新密码')
      form.resetFields()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="修改密码"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={submitting}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          label="当前密码"
          name="old_password"
          rules={[{ required: true, message: '请输入当前密码' }]}
        >
          <Input.Password placeholder="请输入当前密码" autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          label="新密码"
          name="new_password"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码至少 6 位' },
          ]}
        >
          <Input.Password placeholder="请输入新密码" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="确认新密码"
          name="confirm_password"
          dependencies={['new_password']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue('new_password') === value
                  ? Promise.resolve()
                  : Promise.reject(new Error('两次输入的密码不一致')),
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入新密码" autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
