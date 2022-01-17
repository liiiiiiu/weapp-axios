import axios from '../../weapp-axios'

// index.js
// 获取应用实例
const app = getApp()

Page({
  data: {
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    canIUseGetUserProfile: false,
    canIUseOpenData: wx.canIUse('open-data.type.userAvatarUrl') && wx.canIUse('open-data.type.userNickName') // 如需尝试获取用户信息可改为false
  },
  // 事件处理函数
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  async onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }

    console.log('axios', axios)
    const axios4 = axios.create({ baseURL: 'wss://cdnsource.funpet.cn:22346'})
    console.log('axios4', axios4)
    axios.interceptors.request.use(function (config) {
      config.baseURL = 'https://api.wmdb.tv/api/v1'
      // 在发送请求之前做些什么
      console.log('请求被拦截了111')
      return config;
    }, function (error) {
      // 对请求错误做些什么
      return Promise.reject(error);
    })
    axios.interceptors.response.use(function (response) {
      // 对响应数据做点什么
      console.log('响应被拦截了222')
      return response;
    }, function (error) {
      // 对响应错误做点什么
      return Promise.reject(error);
    })

    axios.downloadFile({
      url: '/top',
      params: {
        type: 'Imdb',
        skip: 1,
        limit: 10,
        lang: 'Cn',
        page: 2
      },
      task: {
        onProgressUpdate: res => {
        }
      },
    })

    const axios1 = axios.request({
      params: {
        type: 'Imdb',
        skip: 1,
        limit: 10,
        lang: 'Cn',
        page: 2
      },
      url: '/top',
      baseURL: 'https://api.wmdb.tv/api/v1/',
      method: 'get',
    })
    const axios2 = axios.request({
      params: {
        type: 'Imdb',
        skip: 1,
        limit: 10,
        lang: 'Cn',
        page: 2
      },
      url: '/top',
      baseURL: 'https://api.wmdb.tv/api/v1/',
      method: 'get',
    })
    const axios3 = axios.request({
      params: {
        type: 'Imdb',
        skip: 1,
        limit: 10,
        lang: 'Cn',
        page: 2
      },
      url: '/top',
      baseURL: 'https://api.wmdb.tv/api/v1/',
      method: 'get',
    })
    const axisoAll = await axios.all([axios1, axios2, axios3])
    console.log('axisoAll', axisoAll)

    axios4.connectSocket({
      task: {
        onOpen: (res, task) => {
          // onOpen(res, task)
        },
        
        onMessage: res => {
          // onMessage(res)
        },

        onClose: res => {
          // onClose(res)
        },

        onError: res => {
          // onError(res)
        },

        send: task => {
          send(task)
        },

        close: task => {
          close(task)
        },
      },
    })

    function onOpen(res, task) {
      console.log('onOpen', res, task)
      // task.close()
    }
    function onMessage(res) {
      console.log('onMessage', res)
    }
    function onClose(res) {
      console.log('onClose', res)
    }
    function send(task) {
      // task.send({})
    }
    function close(res) {
      // task.close({})
    }
  },
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  getUserInfo(e) {
    // 不推荐使用getUserInfo获取用户信息，预计自2021年4月13日起，getUserInfo将不再弹出弹窗，并直接返回匿名的用户个人信息
    console.log(e)
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  }
})
