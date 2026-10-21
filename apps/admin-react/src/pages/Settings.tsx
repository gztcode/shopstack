/**
 * 系统设置
 */
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Form, Input, InputNumber, Select, Space, Switch, Typography } from 'antd'
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { listSystemSettings, updateSystemSettings } from '@/api/setting'
import { useApiQuery } from '@/hooks/useApi'
import { formatDateTime } from '@/utils/format'
import { validateForm } from '@/utils/form'
import type { SystemSetting } from '@/types'
import PageContainer from '@/components/PageContainer'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { useMessage } from '@/hooks/useMessage'

/** 表单值：字符串 / 数字 / 布尔（按 value_type 决定控件） */
type SettingFormValues = Record<string, string | number | boolean>

/** 分组中文名 */
const GROUP_LABELS: Record<string, string> = {
  basic: '站点信息',
  order: '订单',
  points: '积分',
  sms: '短信',
}

/** 系统设置页 */
export default function Settings() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<SettingFormValues>()
  const [group, setGroup] = useState<string | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

  const allQuery = useApiQuery(['settings', 'all'], () => listSystemSettings())
  const groupQuery = useApiQuery(['settings', group], () => listSystemSettings(group), {
    enabled: !!group,
  })
  const all = allQuery.data?.settings ?? []
  const settings = group ? (groupQuery.data?.settings ?? []) : all

  const groupOptions = useMemo(() => {
    const groups = Array.from(new Set(all.map((item) => item.group)))
    return groups.map((item) => ({ label: GROUP_LABELS[item] ?? item, value: item }))
  }, [all])

  /** 把配置项的字符串值转换为表单控件需要的类型 */
  const toFormValue = (setting: SystemSetting): string | number | boolean => {
    if (setting.value_type === 'bool') return setting.value === 'true'
    if (setting.value_type === 'number') return Number(setting.value || 0)
    return setting.value
  }

  useEffect(() => {
    const values: SettingFormValues = {}
    settings.forEach((setting) => {
      values[setting.key] = toFormValue(setting)
    })
    form.setFieldsValue(values)
  }, [settings, form])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['settings'] })
  }

  const handleSave = async () => {
    const values = await validateForm(form)
    if (values === null) return

    // 只提交当前分组已存在的配置键，服务端会忽略未知键
    const payload: Record<string, string> = {}
    settings.forEach((setting) => {
      const value = values[setting.key]
      if (value === undefined || value === null) return
      payload[setting.key] =
        setting.value_type === 'bool' ? String(Boolean(value)) : String(value)
    })

    if (Object.keys(payload).length === 0) {
      message.warning('没有需要保存的变更')
      return
    }

    setSubmitting(true)
    try {
      await updateSystemSettings({ group: group ?? 'basic', values: payload })
      message.success('设置已保存')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const renderControl = (setting: SystemSetting) => {
    if (setting.value_type === 'bool') {
      return <Switch />
    }
    if (setting.value_type === 'number') {
      return <InputNumber style={{ width: 220 }} />
    }
    if (setting.value_type === 'json') {
      return (
        <Input.TextArea
          rows={4}
          style={{ fontFamily: 'monospace' }}
          placeholder="请输入合法的 JSON"
        />
      )
    }
    return <Input style={{ width: 320 }} />
  }

  const renderRules = (setting: SystemSetting) => {
    if (setting.value_type === 'json') {
      return [
        {
          validator: async (_: unknown, value: string) => {
            if (!value) return
            try {
              JSON.parse(value)
            } catch {
              throw new Error('JSON 格式不正确')
            }
          },
        },
      ]
    }
    if (setting.value_type === 'number') {
      return [{ type: 'number' as const, message: '请输入数字' }]
    }
    return []
  }

  return (
    <PageContainer title="系统设置" description="按分组维护站点、订单、积分与短信配置">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <TableToolbar
          title="配置项"
          description={
            group
              ? `当前分组：${GROUP_LABELS[group] ?? group}（${settings.length} 项）`
              : `共 ${all.length} 项配置，选择分组后可单独保存`
          }
          extra={
            <Space>
              <Select
                allowClear
                placeholder="全部分组"
                style={{ width: 180 }}
                options={groupOptions}
                value={group}
                onChange={(value) => setGroup(value as string | undefined)}
              />
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                刷新
              </Button>
              <Button type="primary" icon={<SaveOutlined />} loading={submitting} onClick={handleSave}>
                保存设置
              </Button>
            </Space>
          }
        />

        <Form form={form} layout="vertical" key={group ?? 'all'}>
          {settings.length === 0 ? (
            <Typography.Text type="secondary">当前分组暂无配置项</Typography.Text>
          ) : (
            settings.map((setting) => (
              <Form.Item
                key={setting.key}
                label={
                  <Space size={8}>
                    <span>{setting.name}</span>
                    <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                      {setting.key}
                    </Typography.Text>
                  </Space>
                }
                extra={
                  <Space direction="vertical" size={0}>
                    {setting.description ? <span>{setting.description}</span> : null}
                    <span>更新于 {formatDateTime(setting.updated_at)}</span>
                  </Space>
                }
                name={setting.key}
                rules={renderRules(setting)}
                valuePropName={setting.value_type === 'bool' ? 'checked' : 'value'}
              >
                {renderControl(setting)}
              </Form.Item>
            ))
          )}
        </Form>
      </Card>
    </PageContainer>
  )
}
