/**
 * 任务中心
 * ---------------------------------------------------------------
 * 接口：GET /api/v1/marketing/tasks
 * 任务类型 type：1 浏览 2 下单 3 分享 4 评价 5 签到 6 邀请
 */
const api = require('../../utils/api');

/** 任务类型 -> 前往完成的任务页面 */
const TYPE_LINKS = {
  1: '/pages/index/index',
  2: '/pages/index/index',
  3: '/subpkg-order/promotion-list/promotion-list',
  4: '/subpkg-shop/my-reviews/my-reviews',
  5: '/pages/sign-in/sign-in',
  6: '/subpkg-order/task-center/task-center',
};

Page({
  data: {
    loading: true,
    tasks: [],
    completedCount: 0,
    totalCount: 0,
  },

  onShow() {
    this.loadTasks();
  },

  /**
   * 加载任务列表。
   */
  loadTasks() {
    this.setData({ loading: true });
    api
      .listTasks()
      .then((data) => {
        const list = (data && data.tasks) || [];
        this.setData({
          loading: false,
          completedCount: list.filter((task) => task.claimed).length,
          totalCount: list.length,
          tasks: list.map((task) => this.mapTask(task)),
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '任务加载失败', icon: 'none' });
      });
  },

  /**
   * 转换为页面展示结构。
   * @param {object} task UserTask
   * @returns {object}
   */
  mapTask(task) {
    const target = task.target_count || 1;
    const progress = Math.min(100, Math.round(((task.progress || 0) / target) * 100));
    let statusText = '进行中';
    let actionText = '去完成';
    if (task.claimed) {
      statusText = '已领奖';
      actionText = '查看详情';
    } else if (task.completed) {
      statusText = '可领奖';
      actionText = '领奖励';
    }
    return {
      task_id: task.task_id,
      name: task.name,
      description: task.description,
      icon: task.icon || '📋',
      reward_points: task.reward_points || 0,
      progress_text: (task.progress || 0) + '/' + target,
      percent: progress,
      claimed: !!task.claimed,
      completed: !!task.completed,
      status_text: statusText,
      action_text: actionText,
      link: TYPE_LINKS[task.type] || '/pages/index/index',
    };
  },

  /**
   * 进入任务详情。
   */
  onTaskTap(e) {
    const taskId = e.currentTarget.dataset.taskId;
    wx.navigateTo({ url: '/subpkg-order/task-detail/task-detail?id=' + taskId });
  },

  /**
   * 前往任务对应的活动页面。
   */
  onGoLink(e) {
    const link = e.currentTarget.dataset.link;
    if (!link) {
      return;
    }
    wx.navigateTo({ url: link });
  },

  /**
   * 空状态引导：去签到。
   */
  onGoSignIn() {
    wx.navigateTo({ url: '/pages/sign-in/sign-in' });
  },
});
