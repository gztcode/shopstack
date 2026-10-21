/**
 * 任务详情
 * ---------------------------------------------------------------
 * 接口：GET  /api/v1/marketing/tasks/{id}
 *       POST /api/v1/marketing/tasks/{id}/claim
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
    claiming: false,
    taskId: 0,
    task: null,
  },

  onLoad(options) {
    const taskId = Number((options && options.id) || 0);
    this.setData({ taskId: taskId });
  },

  onShow() {
    this.loadTask();
  },

  /**
   * 加载任务详情。
   */
  loadTask() {
    if (!this.data.taskId) {
      this.setData({ loading: false });
      return;
    }
    this.setData({ loading: true });
    api
      .getTask(this.data.taskId)
      .then((data) => {
        if (!data) {
          this.setData({ loading: false, task: null });
          return;
        }
        const target = data.target_count || 1;
        this.setData({
          loading: false,
          task: {
            task_id: data.task_id,
            name: data.name,
            description: data.description,
            icon: data.icon || '📋',
            reward_points: data.reward_points || 0,
            progress: data.progress || 0,
            target: target,
            progress_text: (data.progress || 0) + '/' + target,
            percent: Math.min(100, Math.round(((data.progress || 0) / target) * 100)),
            completed: !!data.completed,
            claimed: !!data.claimed,
            status_text: data.claimed ? '已领奖' : (data.completed ? '可领奖' : '进行中'),
            action_text: data.claimed ? '已完成' : '去完成',
            link: TYPE_LINKS[data.type] || '/pages/index/index',
          },
        });
      })
      .catch((error) => {
        this.setData({ loading: false });
        wx.showToast({ title: (error && error.message) || '任务加载失败', icon: 'none' });
      });
  },

  /**
   * 领取任务奖励。
   */
  onClaim() {
    if (this.data.claiming) {
      return;
    }
    this.setData({ claiming: true });
    api
      .claimTaskReward(this.data.taskId)
      .then((result) => {
        this.setData({ claiming: false });
        if (result && result.claimed) {
          wx.showToast({ title: '奖励已到账 +' + (result.reward_points || 0) + ' 积分', icon: 'none' });
        } else {
          wx.showToast({ title: '奖励已领取', icon: 'none' });
        }
        this.loadTask();
      })
      .catch((error) => {
        this.setData({ claiming: false });
        wx.showToast({ title: (error && error.message) || '领取失败', icon: 'none' });
      });
  },

  /**
   * 前往任务对应的页面。
   */
  onGoLink() {
    const link = this.data.task && this.data.task.link;
    if (!link) {
      return;
    }
    wx.navigateTo({ url: link });
  },

  /**
   * 返回任务中心。
   */
  onGoList() {
    wx.navigateTo({ url: '/subpkg-order/task-center/task-center' });
  },
});
